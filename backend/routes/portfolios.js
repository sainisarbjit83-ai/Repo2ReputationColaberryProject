const express = require('express');
const pool = require('../db/postgres');
const authMiddleware = require('../middleware/authMiddleware');
const { generatePortfolioNarrative } = require('../services/openai');
const { generatePortfolioPdf } = require('../services/pdfGenerator');

const router = express.Router();

function generateSlug(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

// POST /api/portfolios — create a portfolio with selected repos
router.post('/', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { title, repositoryIds } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'title is required.' },
    });
  }

  if (!Array.isArray(repositoryIds) || repositoryIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'repositoryIds must be a non-empty array.' },
    });
  }

  try {
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

    const analysisCheck = await pool.query(
      `SELECT DISTINCT repository_id FROM (
         SELECT repository_id FROM analyses
         WHERE repository_id = ANY($1::uuid[]) AND status = 'completed'
         UNION
         SELECT repository_id FROM deep_analyses
         WHERE repository_id = ANY($1::uuid[]) AND status IN ('completed', 'partial')
       ) AS analyzed`,
      [repositoryIds]
    );

    const analyzedIds = analysisCheck.rows.map(r => r.repository_id);
    const unanalyzed = repositoryIds.filter(id => !analyzedIds.includes(id));

    if (unanalyzed.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ANALYSES_INCOMPLETE',
          message: 'All selected repositories must have completed analyses before creating a portfolio.',
          unanalyzedIds: unanalyzed,
        },
      });
    }

    const slug = generateSlug(title.trim());
    const contentJson = { repository_ids: repositoryIds };

    const result = await pool.query(
      `INSERT INTO portfolios (user_id, title, slug, status, visibility, content_json, created_at, updated_at)
       VALUES ($1, $2, $3, 'draft', 'private', $4, NOW(), NOW())
       RETURNING id, title, slug, status, visibility, content_json, created_at`,
      [userId, title.trim(), slug, JSON.stringify(contentJson)]
    );

    const p = result.rows[0];
    return res.status(201).json({
      success: true,
      data: {
        portfolioId:   p.id,
        title:         p.title,
        slug:          p.slug,
        status:        p.status,
        visibility:    p.visibility,
        repositoryIds: p.content_json.repository_ids,
        createdAt:     p.created_at,
      },
    });
  } catch (err) {
    console.error('[portfolios] create error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create portfolio.' } });
  }
});

// GET /api/portfolios — list the authenticated user's portfolios
router.get('/', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;

  try {
    const result = await pool.query(
      `SELECT id, title, slug, status, visibility, content_json, published_at, created_at, updated_at
       FROM portfolios
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    const portfolios = result.rows.map(p => ({
      portfolioId:     p.id,
      title:           p.title,
      slug:            p.slug,
      status:          p.status,
      visibility:      p.visibility,
      repositoryCount: (p.content_json?.repository_ids || []).length,
      narrativeStatus: p.content_json?.narrative_status || null,
      publishedAt:     p.published_at,
      createdAt:       p.created_at,
      updatedAt:       p.updated_at,
    }));

    return res.status(200).json({ success: true, data: portfolios });
  } catch (err) {
    console.error('[portfolios] list error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch portfolios.' } });
  }
});

// GET /api/portfolios/public/:slug — no auth, recruiter-facing view
router.get('/public/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const portfolioResult = await pool.query(
      `SELECT id, title, slug, content_json, published_at
       FROM portfolios
       WHERE slug = $1 AND status = 'published' AND visibility = 'public'`,
      [slug]
    );

    if (!portfolioResult.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const portfolio = portfolioResult.rows[0];
    const repositoryIds = portfolio.content_json?.repository_ids || [];

    const reposResult = await pool.query(
      `SELECT r.id AS repo_id, r.name, r.full_name, r.description,
              r.primary_language, r.stars_count, r.forks_count, r.topics,
              a.confidence_score, a.skills_json, a.summary_json
       FROM repositories r
       LEFT JOIN LATERAL (
         SELECT confidence_score, skills_json, summary_json
         FROM analyses
         WHERE repository_id = r.id AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1
       ) a ON true
       WHERE r.id = ANY($1::uuid[])`,
      [repositoryIds]
    );

    const repoMedia = portfolio.content_json?.repo_media || {};

    const repos = reposResult.rows.map(r => ({
      name:        r.name,
      fullName:    r.full_name,
      description: r.description,
      language:    r.primary_language,
      stars:       r.stars_count,
      forks:       r.forks_count,
      topics:      r.topics,
      gifUrl:      repoMedia[r.repo_id]?.gifUrl || null,
      analysis: r.skills_json ? {
        confidenceScore: r.confidence_score,
        technologies:    r.skills_json,
        summary:         r.summary_json?.text,
        whatItDoes:      r.summary_json?.what_it_does,
        highlights:      r.summary_json?.highlights,
        confidenceLabel: r.summary_json?.confidence_label,
      } : null,
    }));

    const narrative = portfolio.content_json?.narrative || {};
    const profile   = portfolio.content_json?.profile   || {};

    return res.status(200).json({
      success: true,
      data: {
        title:                portfolio.title,
        slug:                 portfolio.slug,
        headline:             narrative.headline             || null,
        narrative:            narrative.narrative            || null,
        topSkills:            narrative.top_skills           || [],
        projects:             narrative.projects             || [],
        engineeringStrengths: narrative.engineering_strengths || [],
        careerSignals:        narrative.career_signals        || [],
        profile,
        publishedAt: portfolio.published_at,
        repos,
      },
    });
  } catch (err) {
    console.error('[portfolios] public get error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch portfolio.' } });
  }
});

// GET /api/portfolios/public/:slug/pdf — generate and return a PDF resume (no auth)
router.get('/public/:slug/pdf', async (req, res) => {
  const { slug } = req.params;

  try {
    const portfolioResult = await pool.query(
      `SELECT id, title, slug, content_json
       FROM portfolios
       WHERE slug = $1 AND status = 'published' AND visibility = 'public'`,
      [slug]
    );

    if (!portfolioResult.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const portfolio = portfolioResult.rows[0];
    const repositoryIds = portfolio.content_json?.repository_ids || [];

    const reposResult = await pool.query(
      `SELECT r.id AS repo_id, r.name, r.full_name,
              a.skills_json, a.summary_json
       FROM repositories r
       LEFT JOIN LATERAL (
         SELECT skills_json, summary_json
         FROM analyses
         WHERE repository_id = r.id AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1
       ) a ON true
       WHERE r.id = ANY($1::uuid[])`,
      [repositoryIds]
    );

    const narrative = portfolio.content_json?.narrative || {};
    const githubUsername = reposResult.rows.find(r => r.full_name)?.full_name?.split('/')?.[0] || null;

    const repos = reposResult.rows.map(r => ({
      name: r.name,
      fullName: r.full_name,
      analysis: r.skills_json ? {
        technologies: r.skills_json,
        whatItDoes:   r.summary_json?.what_it_does,
      } : null,
    }));

    const pdfBuffer = await generatePortfolioPdf({
      title:          portfolio.title,
      headline:       narrative.headline   || null,
      narrative:      narrative.narrative  || null,
      topSkills:      narrative.top_skills || [],
      projects:       narrative.projects   || [],
      repos,
      githubUsername,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-resume.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('[portfolios] pdf error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate PDF.' } });
  }
});

// GET /api/portfolios/:id — single portfolio with repos and their analyses
router.get('/:id', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    const portfolioResult = await pool.query(
      `SELECT id, title, slug, status, visibility, content_json, published_at, created_at, updated_at
       FROM portfolios WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!portfolioResult.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const portfolio = portfolioResult.rows[0];
    const repositoryIds = portfolio.content_json?.repository_ids || [];

    const reposResult = await pool.query(
      `SELECT r.id AS repo_id, r.name, r.full_name, r.description,
              r.primary_language, r.stars_count, r.topics,
              a.id AS analysis_id, a.status AS analysis_status,
              a.confidence_score, a.skills_json, a.summary_json
       FROM repositories r
       LEFT JOIN LATERAL (
         SELECT id, status, confidence_score, skills_json, summary_json
         FROM analyses
         WHERE repository_id = r.id AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1
       ) a ON true
       WHERE r.id = ANY($1::uuid[]) AND r.user_id = $2`,
      [repositoryIds, userId]
    );

    const repos = reposResult.rows.map(r => ({
      repositoryId: r.repo_id,
      name:         r.name,
      fullName:     r.full_name,
      description:  r.description,
      language:     r.primary_language,
      stars:        r.stars_count,
      topics:       r.topics,
      analysis: r.analysis_id ? {
        analysisId:      r.analysis_id,
        status:          r.analysis_status,
        confidenceScore: r.confidence_score,
        technologies:    r.skills_json,
        summary:         r.summary_json?.text,
        whatItDoes:      r.summary_json?.what_it_does,
        highlights:      r.summary_json?.highlights,
        confidenceLabel: r.summary_json?.confidence_label,
      } : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        portfolioId:     portfolio.id,
        title:           portfolio.title,
        slug:            portfolio.slug,
        status:          portfolio.status,
        visibility:      portfolio.visibility,
        narrative:       portfolio.content_json?.narrative || null,
        narrativeStatus: portfolio.content_json?.narrative_status || null,
        profile:         portfolio.content_json?.profile   || {},
        publishedAt:     portfolio.published_at,
        createdAt:       portfolio.created_at,
        updatedAt:       portfolio.updated_at,
        repos,
      },
    });
  } catch (err) {
    console.error('[portfolios] get error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch portfolio.' } });
  }
});

// POST /api/portfolios/:id/generate-narrative — trigger AI narrative generation
router.post('/:id/generate-narrative', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    const portfolioResult = await pool.query(
      `SELECT id, content_json FROM portfolios WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!portfolioResult.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const portfolio = portfolioResult.rows[0];
    const repositoryIds = portfolio.content_json?.repository_ids || [];

    if (repositoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_REPOS', message: 'Portfolio has no repositories.' },
      });
    }

    const reposResult = await pool.query(
      `SELECT r.name, r.description,
              a.skills_json, a.summary_json,
              da.inference_json, da.intelligence_json
       FROM repositories r
       LEFT JOIN LATERAL (
         SELECT skills_json, summary_json
         FROM analyses
         WHERE repository_id = r.id AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1
       ) a ON true
       LEFT JOIN LATERAL (
         SELECT inference_json, intelligence_json
         FROM deep_analyses
         WHERE repository_id = r.id AND status IN ('completed', 'partial')
         ORDER BY completed_at DESC LIMIT 1
       ) da ON true
       WHERE r.id = ANY($1::uuid[]) AND r.user_id = $2 AND a.skills_json IS NOT NULL`,
      [repositoryIds, userId]
    );

    if (reposResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_ANALYSES', message: 'No completed analyses found for this portfolio.' },
      });
    }

    // Mark as generating immediately so the frontend can start polling
    const updatedContent = {
      ...portfolio.content_json,
      narrative_status: 'generating',
    };

    await pool.query(
      `UPDATE portfolios SET content_json = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updatedContent), id]
    );

    // Build input array for the narrative service.
    // Prioritises deep analysis intelligence when available; falls back to legacy analysis.
    const analyses = reposResult.rows.map(r => ({
      repoName:     r.name,
      description:  r.description,
      technologies: r.skills_json || [],
      summary:      r.summary_json?.text || '',
      whatItDoes:   r.summary_json?.what_it_does || '',
      highlights:   r.summary_json?.highlights || {},
      inference:    r.inference_json    || null,
      intelligence: r.intelligence_json || null,
    }));

    // Run generation in background — non-blocking
    setImmediate(async () => {
      try {
        const result = await generatePortfolioNarrative(analyses);

        const completedContent = {
          ...updatedContent,
          narrative:        result,
          narrative_status: 'completed',
        };

        await pool.query(
          `UPDATE portfolios SET content_json = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(completedContent), id]
        );

        console.log(`[portfolios] narrative completed for portfolio ${id}`);
      } catch (err) {
        console.error(`[portfolios] narrative failed for portfolio ${id}:`, err.message);

        const failedContent = { ...updatedContent, narrative_status: 'failed' };
        await pool.query(
          `UPDATE portfolios SET content_json = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(failedContent), id]
        );
      }
    });

    return res.status(202).json({
      success: true,
      data: { portfolioId: id, narrativeStatus: 'generating' },
    });
  } catch (err) {
    console.error('[portfolios] generate-narrative error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to start narrative generation.' } });
  }
});

// PATCH /api/portfolios/:id — update editable fields: narrative content + profile
router.patch('/:id', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { headline, narrative, top_skills, projects, profile } = req.body;

  const hasNarrativeField = headline !== undefined || narrative !== undefined
    || top_skills !== undefined || projects !== undefined;
  const hasProfileField = profile !== undefined;

  if (!hasNarrativeField && !hasProfileField) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Provide at least one field to update.' },
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, content_json FROM portfolios WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const current = result.rows[0].content_json;

    // Deep-merge only the supplied narrative fields — untouched fields are preserved
    const updatedNarrative = {
      ...(current?.narrative || {}),
      ...(headline   !== undefined && { headline }),
      ...(narrative  !== undefined && { narrative }),
      ...(top_skills !== undefined && { top_skills }),
      ...(projects   !== undefined && { projects }),
    };

    // Merge profile — overwrite only supplied keys
    const updatedProfile = hasProfileField
      ? { ...(current?.profile || {}), ...profile }
      : (current?.profile || {});

    const updatedContent = { ...current, narrative: updatedNarrative, profile: updatedProfile };

    await pool.query(
      `UPDATE portfolios SET content_json = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updatedContent), id]
    );

    return res.status(200).json({
      success: true,
      data: { portfolioId: id, narrative: updatedNarrative, profile: updatedProfile },
    });
  } catch (err) {
    console.error('[portfolios] patch error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update portfolio.' } });
  }
});

// PATCH /api/portfolios/:id/media — save per-repo GIF/image URLs
router.patch('/:id/media', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { repoMedia } = req.body; // { [repoId]: { gifUrl: '...' } }

  if (!repoMedia || typeof repoMedia !== 'object') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'repoMedia must be an object.' } });
  }

  try {
    const result = await pool.query(
      `SELECT id, content_json FROM portfolios WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const updated = { ...result.rows[0].content_json, repo_media: repoMedia };
    await pool.query(
      `UPDATE portfolios SET content_json = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updated), id]
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[portfolios] media update error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save media.' } });
  }
});

// PATCH /api/portfolios/:id/publish — publish portfolio and make it public
router.patch('/:id/publish', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    const portfolioResult = await pool.query(
      `SELECT id, slug, content_json FROM portfolios WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!portfolioResult.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found.' } });
    }

    const portfolio = portfolioResult.rows[0];
    const narrativeStatus = portfolio.content_json?.narrative_status;

    if (narrativeStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NARRATIVE_REQUIRED',
          message: 'Narrative generation must be completed before publishing. Current status: ' + (narrativeStatus || 'not started'),
        },
      });
    }

    await pool.query(
      `UPDATE portfolios
       SET status = 'published', visibility = 'public', published_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        portfolioId: id,
        slug:        portfolio.slug,
        status:      'published',
        visibility:  'public',
        publicUrl:   `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portfolio/${portfolio.slug}`,
      },
    });
  } catch (err) {
    console.error('[portfolios] publish error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to publish portfolio.' } });
  }
});

module.exports = router;
