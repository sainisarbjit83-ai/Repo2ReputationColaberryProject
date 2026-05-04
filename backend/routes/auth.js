const pool = require('../db/postgres');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const loginRateLimiter = require('../middleware/loginRateLimiter');
const crypto = require('crypto');



// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // 1. Required fields FIRST
if (!email || !password) {
  return res.status(400).json({ error: 'Email and password required' });
}
// 2. Email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}

// 3. Password strength
if (password.length < 6) {
  return res.status(400).json({ error: 'Password must be at least 6 characters' });
}

    try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    return res.status(201).json({
      message: 'User registered',
      user: result.rows[0]
    });

  } catch (err) {
  console.error(err);

  // Duplicate email (Postgres unique violation)
  if (err.code === '23505') {
    return res.status(400).json({ error: 'Email already exists' });
  }

  return res.status(500).json({ error: 'Server error' });
}
});
// POST /api/auth/login
router.post('/login',loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessionResult = await pool.query(
      'INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [user.id, refreshTokenHash, req.ip, req.headers['user-agent'], expiresAt]
    );

    const sessionId = sessionResult.rows[0].id;

    const token = jwt.sign(
      { id: user.id, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({ message: 'Login successful', accessToken: token, refreshToken: rawRefreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});



// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  try {
    const debug = await pool.query(
      'SELECT * FROM sessions WHERE refresh_token_hash = $1',
      [refreshTokenHash]
    );
    console.log('[logout] refreshTokenHash:', refreshTokenHash);
    console.log('[logout] matching session rows:', debug.rows);

    const result = await pool.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE refresh_token_hash = $1
       RETURNING *`,
      [refreshTokenHash]
    );
    console.log('updated rows:', result.rows);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  try {
    const result = await pool.query(
      `SELECT * FROM sessions
       WHERE refresh_token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [refreshTokenHash]
    );

    const session = result.rows[0];
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const accessToken = jwt.sign(
      { id: session.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
