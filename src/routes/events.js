const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/events - Get all events
router.get('/', async (req, res) => {
  const { type, upcoming } = req.query;
  try {
    let query = `SELECT e.*, u.name as created_by_name
                 FROM events e LEFT JOIN users u ON e.created_by = u.id
                 WHERE e.is_active = TRUE`;
    const params = [];
    let pIdx = 1;

    if (type) { query += ` AND e.event_type = $${pIdx++}`; params.push(type); }
    if (upcoming === 'true') { query += ` AND e.event_date >= CURRENT_DATE`; }

    query += ` ORDER BY e.event_date ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, events: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/events - Create event (admin/faculty)
router.post('/', authenticateToken, authorizeRole('admin', 'faculty'), async (req, res) => {
  const { title, description, event_date, event_time, venue, event_type } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ success: false, message: 'Title and event date are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, event_time, venue, event_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, event_date, event_time || null, venue, event_type || 'general', req.user.id]
    );
    res.status(201).json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/events/:id - Delete event (admin)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE events SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
