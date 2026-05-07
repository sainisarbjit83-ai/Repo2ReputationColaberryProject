const express = require('express');
const axios = require('axios');
const pool = require('../db/postgres');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  const { id } = req.user;

  try {
    const result = await pool.query(
      'SELECT id, email, name, role, github_username FROM users WHERE id = $1',
      [id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/me/github — connect a GitHub username to the account
router.patch('/me/github', authMiddleware, async (req, res) => {
  const { id } = req.user;
  const { githubUsername } = req.body;

  if (!githubUsername || typeof githubUsername !== 'string' || !githubUsername.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'githubUsername is required.' }
    });
  }

  const username = githubUsername.trim();

  try {
    await axios.get(`https://api.github.com/users/${username}`, {
      headers: { 'User-Agent': 'Repo2Reputation/1.0' }
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'GITHUB_USER_NOT_FOUND', message: `GitHub user "${username}" does not exist.` }
      });
    }
    return res.status(502).json({
      success: false,
      error: { code: 'PROVIDER_ERROR', message: 'Could not verify GitHub username. Try again.' }
    });
  }

  try {
    await pool.query(
      'UPDATE users SET github_username = $1, updated_at = NOW() WHERE id = $2',
      [username, id]
    );
    return res.status(200).json({ success: true, data: { githubUsername: username } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'This GitHub username is already connected to another account.' }
      });
    }
    console.error('[users] github connect error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to connect GitHub username.' } });
  }
});

module.exports = router;
