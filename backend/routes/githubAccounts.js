'use strict';
const express = require('express');
const pool = require('../db/postgres');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/github-accounts — list all connected GitHub accounts for the current user
router.get('/', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  try {
    const result = await pool.query(
      `SELECT id, github_user_id, github_username, github_email, avatar_url, is_primary, connected_at
       FROM github_accounts
       WHERE user_id = $1
       ORDER BY is_primary DESC, connected_at ASC`,
      [userId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[github-accounts] list error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/github-accounts/:id — disconnect a secondary GitHub account
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id: userId } = req.user;
  const { id: accountId } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, is_primary FROM github_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );
    const account = result.rows[0];
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    if (account.is_primary) {
      return res.status(400).json({ success: false, error: 'Cannot disconnect your primary GitHub account' });
    }

    await pool.query('DELETE FROM github_accounts WHERE id = $1', [accountId]);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[github-accounts] delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
