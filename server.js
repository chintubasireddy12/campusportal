require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =====================
// API ROUTES
// =====================
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/jobs', require('./src/routes/jobs'));
app.use('/api/notices', require('./src/routes/notices'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api', require('./src/routes/campus'));

// =====================
// FRONTEND ROUTES (SPA)
// =====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/jobs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'jobs.html')));
app.get('/notices', (req, res) => res.sendFile(path.join(__dirname, 'public', 'notices.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// =====================
// 404 HANDLER
// =====================
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// =====================
// ERROR HANDLER
// =====================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎓 NeoPatna Campus Portal`);
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
