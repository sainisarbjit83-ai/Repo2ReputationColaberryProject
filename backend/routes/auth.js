'use strict';
const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/postgres');

const router = express.Router();

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL     = 'https://github.com/login/oauth/access_token';
const GITHUB_API           = 'https://api.github.com';
const OAUTH_SCOPES         = 'read:user user:email repo';
const SESSION_DAYS         = 7;

// GET /api/auth/github — redirect to GitHub OAuth authorization page
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope:        OAUTH_SCOPES,
    state:        crypto.randomBytes(16).toString('hex'),
  });
  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`);
});

// GET /api/auth/github/callback — exchange code, upsert user, issue JWT, redirect to frontend
router.get('/github/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error || !code) {
    return res.redirect(`${frontendUrl}/auth/callback?error=access_denied`);
  }

  try {
    // 1. Exchange code for GitHub access token
    const tokenRes = await axios.post(GITHUB_TOKEN_URL, {
      client_id:     process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      validateStatus: () => true, // handle all status codes ourselves
    });

    if (tokenRes.status !== 200 || !tokenRes.data.access_token) {
      console.error('[auth/github] token exchange failed — status:', tokenRes.status, 'body:', tokenRes.data);
      return res.redirect(`${frontendUrl}/auth/callback?error=token_exchange_failed`);
    }

    const accessToken = tokenRes.data.access_token;

    const ghHeaders = { Authorization: `token ${accessToken}`, 'User-Agent': 'Repo2Reputation/1.0' };

    // 2. Fetch profile + emails in parallel
    const [profileRes, emailsRes] = await Promise.all([
      axios.get(`${GITHUB_API}/user`, { headers: ghHeaders }),
      axios.get(`${GITHUB_API}/user/emails`, { headers: ghHeaders }).catch(() => ({ data: [] })),
    ]);

    const profile        = profileRes.data;
    const githubId       = String(profile.id);
    const githubUsername = profile.login;
    const name           = profile.name || profile.login;
    const avatarUrl      = profile.avatar_url;

    // Pick best email: verified primary non-noreply → any primary → profile email → generated
    const emails = Array.isArray(emailsRes.data) ? emailsRes.data : [];
    const primaryEmail =
      emails.find(e => e.primary && e.verified && !e.email.includes('noreply'))?.email ||
      emails.find(e => e.primary)?.email ||
      profile.email ||
      `${githubId}+${githubUsername}@users.noreply.github.com`;

    // 3. Upsert user: match by github_user_id first, then by email (to link existing accounts)
    let userId;
    const byGithubId = await pool.query('SELECT id FROM users WHERE github_user_id = $1', [githubId]);

    if (byGithubId.rows[0]) {
      userId = byGithubId.rows[0].id;
      await pool.query(
        `UPDATE users
         SET github_username = $1, name = $2, avatar_url = $3,
             github_access_token = $4, last_login_at = NOW(), updated_at = NOW()
         WHERE id = $5`,
        [githubUsername, name, avatarUrl, accessToken, userId]
      );
    } else {
      const byEmail = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [primaryEmail]);
      if (byEmail.rows[0]) {
        userId = byEmail.rows[0].id;
        await pool.query(
          `UPDATE users
           SET github_user_id = $1, github_username = $2, name = $3,
               avatar_url = $4, github_access_token = $5,
               last_login_at = NOW(), updated_at = NOW()
           WHERE id = $6`,
          [githubId, githubUsername, name, avatarUrl, accessToken, userId]
        );
      } else {
        const created = await pool.query(
          `INSERT INTO users (email, github_user_id, github_username, name, avatar_url, github_access_token, last_login_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [primaryEmail, githubId, githubUsername, name, avatarUrl, accessToken]
        );
        userId = created.rows[0].id;
      }
    }

    // 4. Create session (7-day expiry — matches JWT)
    const refreshTokenHash = crypto.createHash('sha256')
      .update(crypto.randomBytes(64))
      .digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    const sessionResult = await pool.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, refreshTokenHash, req.ip, req.headers['user-agent'], expiresAt]
    );
    const sessionId = sessionResult.rows[0].id;

    // 5. Issue JWT
    const token = jwt.sign(
      { id: userId, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: `${SESSION_DAYS}d` }
    );

    // 6. Redirect to frontend callback page with token
    return res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);

  } catch (err) {
    console.error('[auth/github/callback] error:', err.message);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=server_error`);
  }
});

// POST /api/auth/logout — revoke session
router.post('/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(400).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.sessionId) {
      await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1`, [decoded.sessionId]);
    }
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch {
    return res.status(200).json({ message: 'Logged out' });
  }
});

module.exports = router;
