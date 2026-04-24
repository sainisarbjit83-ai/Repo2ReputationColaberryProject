const pool = require('../db/postgres');
const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const loginRateLimiter = require('../middleware/loginRateLimiter');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 💾 Insert into DB
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
      [email, hashedPassword]
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: 'User registered successfully',
      user
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

const isValid = await bcrypt.compare(password, user.password);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid email or password.' });
}

  const token = jwt.sign(
    {  id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.status(200).json({ message: 'Login successful.', token });
});

module.exports = router;
