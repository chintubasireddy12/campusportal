const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json({ success: true, departments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/departments/:id/students
router.get('/:id/students', authenticateToken, authorizeRole('admin', 'faculty'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, roll_number, year_of_study, cgpa, phone, is_active
       FROM users WHERE department_id = $1 AND role = 'student' ORDER BY name`,
      [req.params.id]
    );
    res.json({ success: true, students: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users - Admin only
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `SELECT u.id, u.name, u.email, u.role, u.roll_number, u.cgpa,
                        u.is_active, u.created_at, d.name as department_name
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE 1=1`;
    const params = [];
    let pIdx = 1;

    if (role) { query += ` AND u.role = $${pIdx++}`; params.push(role); }
    if (search) {
      query += ` AND (u.name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR u.roll_number ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/dashboard/stats - Dashboard statistics (admin)
router.get('/dashboard/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [students, faculty, jobs, applications, events, notices] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'student'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'faculty'"),
      pool.query('SELECT COUNT(*) FROM jobs WHERE is_active = TRUE'),
      pool.query('SELECT COUNT(*) FROM job_applications'),
      pool.query('SELECT COUNT(*) FROM events WHERE is_active = TRUE AND event_date >= CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM notices WHERE is_active = TRUE')
    ]);

    // Recent applications by status
    const appStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM job_applications
      GROUP BY status
    `);

    // Top companies by application count
    const topJobs = await pool.query(`
      SELECT j.company_name, j.title, COUNT(ja.id) as applications
      FROM jobs j LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE j.is_active = TRUE
      GROUP BY j.id, j.company_name, j.title
      ORDER BY applications DESC LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        students: parseInt(students.rows[0].count),
        faculty: parseInt(faculty.rows[0].count),
        active_jobs: parseInt(jobs.rows[0].count),
        total_applications: parseInt(applications.rows[0].count),
        upcoming_events: parseInt(events.rows[0].count),
        active_notices: parseInt(notices.rows[0].count),
        application_status: appStats.rows,
        top_jobs: topJobs.rows
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
