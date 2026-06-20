const express = require('express');
const axios = require('axios');
const pool = require('../db/postgres');
const authMiddleware = require('../middleware/authMiddleware');
const { generateReadme } = require('../services/openai');

const router = express.Router();

const GITHUB_API = 'https://api.github.com';
const README_MAX_REPO_SIZE_KB = 5120; // skip README fetch if repo > 5 MB

function makeGithubHeaders(userToken) {
  const token = userToken || process.env.GITHUB_TOKEN;
  return {
    'User-Agent': 'Repo2Reputation/1.0',
    'Accept': 'application/vnd.github.v3+json',
    ...(token && { Authorization: `token ${token}` }),
  };
}

async function getGithubInfo(userId) {
  const result = await pool.query(
    'SELECT github_username, github_access_token FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || {};
}

async function getGithubAccounts(userId) {
  const result = await pool.query(
    `SELECT id, github_username, access_token, is_primary
     FROM github_accounts
     WHERE user_id = $1
     ORDER BY is_primary DESC, connected_at ASC`,
    [userId]
  );
  return result.rows;
}

async function fetchReadme(owner, repo, userToken) {
  try {
    const response = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: makeGithubHeaders(userToken),
    });
    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

function mapGithubRepo(r, accountUsername) {
  return {
    externalRepoId:  String(r.id),
    name:            r.name,
    fullName:        r.full_name,
    description:     r.description || null,
    private:         r.private,
    language:        r.language || null,
    starsCount:      r.stargazers_count,
    forksCount:      r.forks_count,
    topics:          r.topics || [],
    defaultBranch:   r.default_branch,
    repoCreatedAt:   r.created_at,
    repoUpdatedAt:   r.updated_at,
    sizeKb:          r.size,
    accountUsername,
  };
}

// GET /api/repos — list GitHub repos across all connected accounts
router.get('/', authMiddleware, async (req, res) => {
  const { id } = req.user;
  const sort = req.query.sort || 'updated';

  try {
    // Try github_accounts first (multi-account); fall back to users table
    let accounts = await getGithubAccounts(id);

    if (!accounts.length) {
      const info = await getGithubInfo(id);
      if (!info.github_username) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_GITHUB_CONNECTED', message: 'GitHub account not connected.' },
        });
      }
      accounts = [{ github_username: info.github_username, access_token: info.github_access_token, is_primary: true }];
    }

    // Fetch from all accounts in parallel (up to 100 repos each)
    const perAccountResults = await Promise.all(
      accounts.map(async (account) => {
        try {
          const apiUrl = account.access_token
            ? `${GITHUB_API}/user/repos`
            : `${GITHUB_API}/users/${account.github_username}/repos`;
          const response = await axios.get(apiUrl, {
            headers: makeGithubHeaders(account.access_token),
            params: { per_page: 100, sort, type: 'owner' },
          });
          return response.data.map(r => mapGithubRepo(r, account.github_username));
        } catch (err) {
          console.error(`[repos] fetch failed for ${account.github_username}:`, err.message);
          return [];
        }
      })
    );

    const repos = perAccountResults
      .flat()
      .sort((a, b) => new Date(b.repoUpdatedAt) - new Date(a.repoUpdatedAt));

    return res.status(200).json({
      success: true,
      data: repos,
      meta: { count: repos.length, accountCount: accounts.length },
    });
  } catch (err) {
    console.error('[repos] list error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch repositories.' } });
  }
});

// GET /api/repos/imported — list repos already imported into the DB for this user
router.get('/imported', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const [rows, countRow] = await Promise.all([
      pool.query(
        `SELECT id, name, full_name, description, primary_language, stars_count,
                forks_count, topics, sync_status, imported_at, repo_updated_at
         FROM repositories
         WHERE user_id = $1
         ORDER BY imported_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM repositories WHERE user_id = $1', [userId]),
    ]);

    return res.status(200).json({
      success: true,
      data: rows.rows,
      meta: { page, limit, total: parseInt(countRow.rows[0].count) },
    });
  } catch (err) {
    console.error('[repos] imported list error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch imported repositories.' } });
  }
});

// POST /api/repos/import — fetch selected repos from GitHub and persist to DB
router.post('/import', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { repoFullNames } = req.body;

  if (!Array.isArray(repoFullNames) || repoFullNames.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'repoFullNames must be a non-empty array of "owner/repo" strings.' },
    });
  }

  let accounts;
  try {
    accounts = await getGithubAccounts(userId);
    if (!accounts.length) {
      const info = await getGithubInfo(userId);
      if (!info.github_username) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_GITHUB_CONNECTED', message: 'GitHub account not connected.' },
        });
      }
      accounts = [{ github_username: info.github_username, access_token: info.github_access_token, is_primary: true }];
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error.' } });
  }

  const results = [];

  for (const fullName of repoFullNames) {
    const parts = fullName.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      results.push({ fullName, status: 'failed', error: 'Invalid format — use "owner/repo".' });
      continue;
    }
    const [owner, repoName] = parts;

    // Pick the account whose username matches the repo owner; fall back to primary
    const matchingAccount =
      accounts.find(a => a.github_username.toLowerCase() === owner.toLowerCase()) ||
      accounts.find(a => a.is_primary) ||
      accounts[0];
    const ghInfo = { github_access_token: matchingAccount?.access_token };

    // Create import job record (repository_id linked after successful fetch)
    let jobId;
    try {
      const jobResult = await pool.query(
        `INSERT INTO import_jobs (user_id, status, started_at, created_at)
         VALUES ($1, 'running', NOW(), NOW()) RETURNING id`,
        [userId]
      );
      jobId = jobResult.rows[0].id;
    } catch (err) {
      results.push({ fullName, status: 'failed', error: 'Could not create import job.' });
      continue;
    }

    try {
      // Fetch repo details from GitHub
      const { data: repo } = await axios.get(`${GITHUB_API}/repos/${owner}/${repoName}`, {
        headers: makeGithubHeaders(ghInfo.github_access_token),
      });

      // Fetch README only when repo is small enough to stay within rate limits
      const readmeContent = repo.size < README_MAX_REPO_SIZE_KB
        ? await fetchReadme(owner, repoName, ghInfo.github_access_token)
        : null;

      // Upsert into repositories — update on re-import
      const repoResult = await pool.query(
        `INSERT INTO repositories (
           user_id, provider, external_repo_id, name, full_name, description,
           private, default_branch, primary_language, stars_count, forks_count,
           topics, readme_content, repo_created_at, repo_updated_at,
           imported_at, sync_status, created_at, updated_at
         ) VALUES (
           $1, 'github', $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, NOW(), 'synced', NOW(), NOW()
         )
         ON CONFLICT (provider, external_repo_id) DO UPDATE SET
           name             = EXCLUDED.name,
           full_name        = EXCLUDED.full_name,
           description      = EXCLUDED.description,
           primary_language = EXCLUDED.primary_language,
           stars_count      = EXCLUDED.stars_count,
           forks_count      = EXCLUDED.forks_count,
           topics           = EXCLUDED.topics,
           readme_content   = EXCLUDED.readme_content,
           repo_updated_at  = EXCLUDED.repo_updated_at,
           imported_at      = NOW(),
           sync_status      = 'synced',
           updated_at       = NOW()
         RETURNING id`,
        [
          userId,
          String(repo.id),
          repo.name,
          repo.full_name,
          repo.description || null,
          repo.private,
          repo.default_branch,
          repo.language || null,
          repo.stargazers_count,
          repo.forks_count,
          JSON.stringify(repo.topics || []),
          readmeContent,
          repo.created_at,
          repo.updated_at,
        ]
      );

      const repositoryId = repoResult.rows[0].id;

      // Link job to repository and mark succeeded
      await pool.query(
        `UPDATE import_jobs
         SET repository_id = $1, status = 'succeeded', progress_pct = 100, completed_at = NOW()
         WHERE id = $2`,
        [repositoryId, jobId]
      );

      results.push({
        fullName,
        status: 'succeeded',
        jobId,
        repositoryId,
        readmeFetched: readmeContent !== null,
      });
    } catch (err) {
      const errorMessage = err.response?.status === 404
        ? 'Repository not found on GitHub.'
        : err.response?.status === 403
        ? 'GitHub API rate limit exceeded.'
        : err.message;

      await pool.query(
        `UPDATE import_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
        [errorMessage, jobId]
      );

      results.push({ fullName, status: 'failed', jobId, error: errorMessage });
    }
  }

  const allSucceeded  = results.every(r => r.status === 'succeeded');
  const anySucceeded  = results.some(r => r.status === 'succeeded');

  return res.status(200).json({
    success: anySucceeded,
    data: {
      results,
      overallStatus: allSucceeded ? 'succeeded' : anySucceeded ? 'partial' : 'failed',
    },
  });
});

// GET /api/repos/import/:jobId — check the status of an import job
router.get('/import/:jobId', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { jobId } = req.params;

  try {
    const result = await pool.query(
      `SELECT ij.id, ij.status, ij.progress_pct, ij.error_message,
              ij.started_at, ij.completed_at,
              r.name AS repo_name, r.full_name AS repo_full_name
       FROM import_jobs ij
       LEFT JOIN repositories r ON r.id = ij.repository_id
       WHERE ij.id = $1 AND ij.user_id = $2`,
      [jobId, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Import job not found.' } });
    }

    const job = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress_pct,
        repoName: job.repo_name,
        repoFullName: job.repo_full_name,
        errorMessage: job.error_message,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      },
    });
  } catch (err) {
    console.error('[repos] job status error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch job status.' } });
  }
});

// POST /api/repos/:repositoryId/generate-readme — generate a README draft from analysis data
router.post('/:repositoryId/generate-readme', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { repositoryId } = req.params;
  const { mediaUrls = [] } = req.body; // [{ label: string, url: string }]

  try {
    const repoResult = await pool.query(
      `SELECT id, name, full_name, description, primary_language, topics
       FROM repositories WHERE id = $1 AND user_id = $2`,
      [repositoryId, userId]
    );

    if (!repoResult.rows[0]) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Repository not found.' } });
    }

    const repo = repoResult.rows[0];

    const [analysisResult, deepResult] = await Promise.all([
      pool.query(
        `SELECT skills_json, summary_json, confidence_score
         FROM analyses
         WHERE repository_id = $1 AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1`,
        [repositoryId]
      ),
      pool.query(
        `SELECT intelligence_json, inference_json, code_intelligence_json
         FROM deep_analyses
         WHERE repository_id = $1 AND status IN ('completed', 'partial')
         ORDER BY completed_at DESC LIMIT 1`,
        [repositoryId]
      ),
    ]);

    if (!analysisResult.rows[0] && !deepResult.rows[0]) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_ANALYSIS', message: 'Run an analysis on this repository before generating a README.' },
      });
    }

    const deep    = deepResult.rows[0] || {};
    const intel   = deep.intelligence_json;
    const infer   = deep.inference_json;
    const codeInt = deep.code_intelligence_json;

    const row = analysisResult.rows[0] || {};
    const analysis = {
      technologies:             row.skills_json   || [],
      summary:                  row.summary_json?.text,
      what_it_does:             row.summary_json?.what_it_does,
      highlights:               row.summary_json?.highlights,
      key_takeaways:            row.summary_json?.key_takeaways || [],
      probableDomain:           intel?.businessValue?.probableDomain           || null,
      operationalCapabilities:  intel?.businessValue?.operationalCapabilities  || [],
      technicalDifferentiation: intel?.portfolioNarrative?.technicalDifferentiation || [],
      impactStatements:         intel?.resume?.impactStatements                || [],
      patternsInferred:         infer?.patternsInferred                        || [],
      architecturePatterns:     codeInt?.architecturePatterns                  || [],
    };

    const readme = await generateReadme(repo, analysis, mediaUrls);
    return res.status(200).json({ success: true, data: { readme } });
  } catch (err) {
    console.error('[repos] generate-readme error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate README.' } });
  }
});

module.exports = router;
