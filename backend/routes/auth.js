const pool = require('../db/postgres');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const loginRateLimiter = require('../middleware/loginRateLimiter');



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
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
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

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
