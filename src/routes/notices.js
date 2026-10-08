const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/notices - Get all notices
router.get('/', async (req, res) => {
  const { category, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `SELECT n.*, u.name as created_by_name
                 FROM notices n LEFT JOIN users u ON n.created_by = u.id
                 WHERE n.is_active = TRUE`;
    const params = [];
    let pIdx = 1;

    if (category) {
      query += ` AND n.category = $${pIdx++}`;
      params.push(category);
    }

    query += ` ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notices WHERE is_active = TRUE' + (category ? ` AND category = '${category}'` : '')
    );

    res.json({
      success: true,
      notices: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error('Get notices error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/notices/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.name as created_by_name
       FROM notices n LEFT JOIN users u ON n.created_by = u.id
       WHERE n.id = $1 AND n.is_active = TRUE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    res.json({ success: true, notice: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/notices - Create notice (admin/faculty)
router.post('/', authenticateToken, authorizeRole('admin', 'faculty'), async (req, res) => {
  const { title, content, category, is_pinned } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO notices (title, content, category, is_pinned, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, content, category || 'general', is_pinned || false, req.user.id]
    );

    res.status(201).json({ success: true, notice: result.rows[0] });
  } catch (err) {
    console.error('Create notice error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/notices/:id - Update notice (admin/faculty)
router.put('/:id', authenticateToken, authorizeRole('admin', 'faculty'), async (req, res) => {
  const { title, content, category, is_pinned } = req.body;
  try {
    const result = await pool.query(
      `UPDATE notices SET title=$1, content=$2, category=$3, is_pinned=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, content, category, is_pinned, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notice: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/notices/:id - Delete notice (admin)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE notices SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
