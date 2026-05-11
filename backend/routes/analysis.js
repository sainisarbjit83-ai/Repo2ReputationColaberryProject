const express = require('express');
const pool = require('../db/postgres');
const authMiddleware = require('../middleware/authMiddleware');
const { analyzeRepository } = require('../services/openai');

const router = express.Router();

// Runs in background after response is sent — processes each queued analysis
async function processAnalyses(analysisIds) {
  for (const analysisId of analysisIds) {
    try {
      const result = await pool.query(
        `SELECT a.id, a.repository_id,
                r.name, r.description, r.primary_language, r.topics,
                r.stars_count, r.forks_count, r.readme_content
         FROM analyses a
         JOIN repositories r ON r.id = a.repository_id
         WHERE a.id = $1`,
        [analysisId]
      );

      const repo = result.rows[0];
      if (!repo) continue;

      await pool.query(
        `UPDATE analyses SET status = 'running' WHERE id = $1`,
        [analysisId]
      );

      const analysis = await analyzeRepository(repo);

      const skills   = analysis.skills   || [];
      const domains  = analysis.domains  || [];
      const summary  = analysis.summary  || '';
      const confidence = parseFloat(analysis.overall_confidence) || 0;

      await pool.query(
        `UPDATE analyses SET
           status           = 'completed',
           model_version    = 'gpt-4o-mini',
           confidence_score = $1,
           skills_json      = $2,
           domains_json     = $3,
           summary_json     = $4,
           completed_at     = NOW()
         WHERE id = $5`,
        [
          confidence,
          JSON.stringify(skills),
          JSON.stringify(domains),
          JSON.stringify({ text: summary }),
          analysisId,
        ]
      );

      // Store evidence refs for each skill claim
      for (const skill of skills) {
        await pool.query(
          `INSERT INTO evidence_refs (analysis_id, claim_type, claim_key, source_path, confidence, created_at)
           VALUES ($1, 'skill', $2, $3, $4, NOW())`,
          [analysisId, skill.name, skill.evidence || 'Repository metadata', skill.confidence]
        );
      }

      console.log(`[analysis] completed ${analysisId} — ${skills.length} skills found`);
    } catch (err) {
      console.error(`[analysis] failed ${analysisId}:`, err.message);
      await pool.query(
        `UPDATE analyses SET status = 'failed', completed_at = NOW() WHERE id = $1`,
        [analysisId]
      );
    }
  }
}

// POST /api/analysis/run — queue analysis for selected repos
router.post('/run', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { repositoryIds } = req.body;

  if (!Array.isArray(repositoryIds) || repositoryIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'repositoryIds must be a non-empty array.' },
    });
  }

  try {
    // Verify all repos belong to this user
    const repoCheck = await pool.query(
      `SELECT id FROM repositories WHERE id = ANY($1::uuid[]) AND user_id = $2`,
      [repositoryIds, userId]
    );

    if (repoCheck.rows.length !== repositoryIds.length) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'One or more repositories not found or not owned by you.' },
      });
    }

    const analyses = [];

    for (const repositoryId of repositoryIds) {
      // If already running or queued, return existing job
      const existing = await pool.query(
        `SELECT id, status FROM analyses
         WHERE repository_id = $1 AND status IN ('queued', 'running', 'completed')
         ORDER BY created_at DESC LIMIT 1`,
        [repositoryId]
      );

      if (existing.rows[0]) {
        analyses.push({
          analysisId:   existing.rows[0].id,
          repositoryId,
          status:       existing.rows[0].status,
        });
        continue;
      }

      const inserted = await pool.query(
        `INSERT INTO analyses (repository_id, status, created_at)
         VALUES ($1, 'queued', NOW()) RETURNING id`,
        [repositoryId]
      );

      analyses.push({ analysisId: inserted.rows[0].id, repositoryId, status: 'queued' });
    }

    // Kick off background processing — non-blocking
    const toProcess = analyses.filter(a => a.status === 'queued').map(a => a.analysisId);
    if (toProcess.length > 0) {
      setImmediate(() => processAnalyses(toProcess));
    }

    return res.status(202).json({ success: true, data: { analyses } });
  } catch (err) {
    console.error('[analysis] run error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to start analysis.' } });
  }
});

// GET /api/analysis/repo/:repositoryId — latest analysis for a repo
router.get('/repo/:repositoryId', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { repositoryId } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.id, a.status, a.confidence_score, a.skills_json,
              a.domains_json, a.summary_json, a.model_version,
              a.created_at, a.completed_at
       FROM analyses a
       JOIN repositories r ON r.id = a.repository_id
       WHERE a.repository_id = $1 AND r.user_id = $2
       ORDER BY a.created_at DESC LIMIT 1`,
      [repositoryId, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No analysis found for this repository.' },
      });
    }

    const a = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        analysisId:      a.id,
        status:          a.status,
        confidenceScore: a.confidence_score,
        skills:          a.skills_json,
        domains:         a.domains_json,
        summary:         a.summary_json?.text,
        modelVersion:    a.model_version,
        createdAt:       a.created_at,
        completedAt:     a.completed_at,
      },
    });
  } catch (err) {
    console.error('[analysis] repo get error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch analysis.' } });
  }
});

// GET /api/analysis/:analysisId — poll status + results for one analysis
router.get('/:analysisId', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { analysisId } = req.params;

  try {
    const result = await pool.query(
      `SELECT a.id, a.status, a.confidence_score, a.skills_json,
              a.domains_json, a.summary_json, a.model_version,
              a.created_at, a.completed_at,
              r.name AS repo_name, r.id AS repository_id
       FROM analyses a
       JOIN repositories r ON r.id = a.repository_id
       WHERE a.id = $1 AND r.user_id = $2`,
      [analysisId, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Analysis not found.' },
      });
    }

    const a = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        analysisId:      a.id,
        repositoryId:    a.repository_id,
        repoName:        a.repo_name,
        status:          a.status,
        confidenceScore: a.confidence_score,
        skills:          a.skills_json,
        domains:         a.domains_json,
        summary:         a.summary_json?.text,
        modelVersion:    a.model_version,
        createdAt:       a.created_at,
        completedAt:     a.completed_at,
      },
    });
  } catch (err) {
    console.error('[analysis] get error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch analysis.' } });
  }
});

module.exports = router;
