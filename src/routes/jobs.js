const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/resumes');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only PDF and Word documents are allowed'));
    }
    cb(null, true);
  }
});

// ==========================
// GET /api/jobs - List all active jobs (public)
// ==========================
router.get('/', async (req, res) => {
  const { type, search, department, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = `
      SELECT j.*, u.name as posted_by_name,
             COUNT(ja.id) as application_count
      FROM jobs j
      LEFT JOIN users u ON j.posted_by = u.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE j.is_active = TRUE AND j.deadline >= CURRENT_DATE
    `;
    const params = [];
    let pIdx = 1;

    if (type) { query += ` AND j.job_type = $${pIdx++}`; params.push(type); }
    if (search) {
      query += ` AND (j.title ILIKE $${pIdx} OR j.company_name ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }
    if (department) {
      query += ` AND $${pIdx} = ANY(j.eligible_departments)`;
      params.push(department);
      pIdx++;
    }

    query += ` GROUP BY j.id, u.name ORDER BY j.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) FROM jobs WHERE is_active = TRUE AND deadline >= CURRENT_DATE`;
    const countResult = await pool.query(countQuery);

    res.json({
      success: true,
      jobs: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// GET /api/jobs/:id - Get single job
// ==========================
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, u.name as posted_by_name,
              COUNT(ja.id) as application_count
       FROM jobs j
       LEFT JOIN users u ON j.posted_by = u.id
       LEFT JOIN job_applications ja ON j.id = ja.job_id
       WHERE j.id = $1
       GROUP BY j.id, u.name`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// POST /api/jobs - Create job (admin/recruiter)
// ==========================
router.post('/', authenticateToken, authorizeRole('admin', 'recruiter'), async (req, res) => {
  const {
    title, company_name, description, requirements, location,
    job_type, package_lpa, min_cgpa, eligible_departments, deadline
  } = req.body;

  if (!title || !company_name || !description || !deadline) {
    return res.status(400).json({ success: false, message: 'Title, company, description, and deadline are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs (title, company_name, description, requirements, location,
        job_type, package_lpa, min_cgpa, eligible_departments, deadline, posted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [title, company_name, description, requirements, location, job_type || 'full-time',
       package_lpa || null, min_cgpa || 0, eligible_departments || [], deadline, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Job posted successfully', job: result.rows[0] });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// PUT /api/jobs/:id - Update job (admin/recruiter)
// ==========================
router.put('/:id', authenticateToken, authorizeRole('admin', 'recruiter'), async (req, res) => {
  const { title, company_name, description, requirements, location,
    job_type, package_lpa, min_cgpa, eligible_departments, deadline, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE jobs SET title=$1, company_name=$2, description=$3, requirements=$4,
        location=$5, job_type=$6, package_lpa=$7, min_cgpa=$8, eligible_departments=$9,
        deadline=$10, is_active=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, company_name, description, requirements, location, job_type, package_lpa,
       min_cgpa, eligible_departments, deadline, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// DELETE /api/jobs/:id - Delete job (admin only)
// ==========================
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE jobs SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Job deactivated successfully' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// POST /api/jobs/:id/apply - Apply for a job (student only)
// ==========================
router.post('/:id/apply', authenticateToken, authorizeRole('student'), upload.single('resume'), async (req, res) => {
  const { cover_letter } = req.body;
  const jobId = req.params.id;
  const studentId = req.user.id;

  try {
    // Check if job exists and is active
    const jobResult = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE AND deadline >= CURRENT_DATE',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or deadline passed' });
    }

    const job = jobResult.rows[0];

    // Check eligibility (CGPA)
    const studentResult = await pool.query(
      'SELECT cgpa, department_id FROM users WHERE id = $1',
      [studentId]
    );

    const student = studentResult.rows[0];
    if (student.cgpa && job.min_cgpa && parseFloat(student.cgpa) < parseFloat(job.min_cgpa)) {
      return res.status(400).json({
        success: false,
        message: `Minimum CGPA of ${job.min_cgpa} required. Your CGPA: ${student.cgpa}`
      });
    }

    // Check duplicate application
    const existing = await pool.query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND student_id = $2',
      [jobId, studentId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already applied for this job' });
    }

    const resume_url = req.file ? `/uploads/resumes/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO job_applications (job_id, student_id, cover_letter, resume_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [jobId, studentId, cover_letter || null, resume_url]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: result.rows[0]
    });
  } catch (err) {
    console.error('Apply job error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// GET /api/jobs/:id/applications - Get applications for a job (admin/recruiter)
// ==========================
router.get('/:id/applications', authenticateToken, authorizeRole('admin', 'recruiter'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ja.*, u.name as student_name, u.email, u.roll_number, u.cgpa,
              u.phone, u.linkedin_url, d.name as department_name
       FROM job_applications ja
       JOIN users u ON ja.student_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE ja.job_id = $1
       ORDER BY ja.applied_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, applications: result.rows });
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// PUT /api/jobs/:jobId/applications/:appId - Update application status (admin/recruiter)
// ==========================
router.put('/:jobId/applications/:appId', authenticateToken, authorizeRole('admin', 'recruiter'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['applied', 'shortlisted', 'interview', 'selected', 'rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      `UPDATE job_applications SET status=$1, updated_at=NOW()
       WHERE id=$2 AND job_id=$3 RETURNING *`,
      [status, req.params.appId, req.params.jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================
// GET /api/jobs/student/applications - Get my applications (student)
// ==========================
router.get('/student/my-applications', authenticateToken, authorizeRole('student'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ja.*, j.title, j.company_name, j.job_type, j.package_lpa, j.deadline, j.location
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE ja.student_id = $1
       ORDER BY ja.applied_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, applications: result.rows });
  } catch (err) {
    console.error('My applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
