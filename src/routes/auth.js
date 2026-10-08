const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==========================
// POST /api/auth/register
// ==========================
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'faculty', 'recruiter']).withMessage('Invalid role'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, role, roll_number, department_id, year_of_study, cgpa, phone } = req.body;

  try {
    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, roll_number, department_id, year_of_study, cgpa, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, role, roll_number, department_id, created_at`,
      [name, email, password_hash, role, roll_number || null, department_id || null,
       year_of_study || null, cgpa || null, phone || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ==========================
// POST /api/auth/login
// ==========================
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT u.*, d.name as department_name, d.code as department_code
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roll_number: user.roll_number,
        department: user.department_name,
        department_code: user.department_code,
        cgpa: user.cgpa,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ==========================
// GET /api/auth/me
// ==========================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.roll_number, u.year_of_study, u.cgpa,
              u.phone, u.avatar_url, u.linkedin_url, u.resume_url, u.is_verified,
              u.created_at, d.name as department_name, d.code as department_code
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// PUT /api/auth/profile
// ==========================
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, phone, linkedin_url, cgpa } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET name=$1, phone=$2, linkedin_url=$3, cgpa=$4, updated_at=NOW()
       WHERE id=$5 RETURNING id, name, email, phone, linkedin_url, cgpa`,
      [name, phone, linkedin_url, cgpa, req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
