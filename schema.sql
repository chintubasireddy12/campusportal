-- ============================================================
-- NeoPatna Campus Management Portal - Database Schema
-- Run this SQL file in psql or pgAdmin to initialize the DB
-- ============================================================

-- Drop existing tables (safe reset)
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================
-- DEPARTMENTS
-- ========================
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  hod_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- USERS (Students, Faculty, Admin, Recruiter)
-- ========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin', 'recruiter')),
  roll_number VARCHAR(30) UNIQUE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  year_of_study INT CHECK (year_of_study BETWEEN 1 AND 5),
  cgpa DECIMAL(4,2) CHECK (cgpa BETWEEN 0 AND 10),
  phone VARCHAR(15),
  avatar_url VARCHAR(255),
  linkedin_url VARCHAR(255),
  resume_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- COURSES
-- ========================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
  credits INT DEFAULT 3,
  semester INT CHECK (semester BETWEEN 1 AND 8),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- EVENTS / NOTICES
-- ========================
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  venue VARCHAR(200),
  event_type VARCHAR(50) DEFAULT 'general' CHECK (event_type IN ('general', 'academic', 'cultural', 'sports', 'technical', 'placement')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'academic', 'exam', 'placement', 'scholarship', 'urgent')),
  attachment_url VARCHAR(255),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- JOBS / PLACEMENTS
-- ========================
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  company_logo_url VARCHAR(255),
  description TEXT NOT NULL,
  requirements TEXT,
  location VARCHAR(150),
  job_type VARCHAR(30) DEFAULT 'full-time' CHECK (job_type IN ('full-time', 'internship', 'part-time', 'contract')),
  package_lpa DECIMAL(6,2),
  min_cgpa DECIMAL(4,2) DEFAULT 0,
  eligible_departments TEXT[], -- array of department codes
  deadline DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- JOB APPLICATIONS
-- ========================
CREATE TABLE job_applications (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  resume_url VARCHAR(255),
  applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- ========================
-- INDEXES FOR PERFORMANCE
-- ========================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_jobs_deadline ON jobs(deadline);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);
CREATE INDEX idx_applications_student ON job_applications(student_id);
CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);
CREATE INDEX idx_events_event_date ON events(event_date);

-- ========================
-- SEED DATA
-- ========================

-- Departments
INSERT INTO departments (name, code, hod_name, description) VALUES
('Computer Science & Engineering', 'CSE', 'Dr. Rajesh Kumar', 'Department of CSE focusing on software and hardware systems'),
('Electronics & Communication', 'ECE', 'Dr. Priya Sharma', 'Department of ECE with focus on communication systems'),
('Mechanical Engineering', 'ME', 'Dr. Anil Singh', 'Mechanical engineering and industrial design'),
('Civil Engineering', 'CE', 'Dr. Sunita Verma', 'Infrastructure and structural engineering'),
('Electrical Engineering', 'EE', 'Dr. Mohan Das', 'Power systems and electrical machines'),
('Information Technology', 'IT', 'Dr. Ravi Gupta', 'IT systems and software development');

-- Admin User (password: Admin@123)
INSERT INTO users (name, email, password_hash, role, is_active, is_verified) VALUES
('Admin NeoPatna', 'admin@neopatna.ac.in', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE, TRUE);

-- Notice data
INSERT INTO notices (title, content, category, is_pinned, created_at) VALUES
('Welcome to NeoPatna Campus Portal', 'Dear students and faculty, welcome to the official campus management portal of NIT Patna. All academic and administrative activities will be managed through this portal.', 'general', TRUE, NOW()),
('End Semester Examinations Schedule', 'End semester examinations for Even Semester 2024 will commence from November 15, 2024. Admit cards can be downloaded from the portal.', 'exam', TRUE, NOW() - INTERVAL '2 days'),
('Campus Placement Drive - TCS & Infosys', 'TCS and Infosys will be visiting campus for placements in December 2024. Eligible students (CSE, IT, ECE, EE) with CGPA >= 7.0 must register through the portal.', 'placement', FALSE, NOW() - INTERVAL '5 days'),
('PhD Admission 2024-25', 'Applications are invited for PhD program in all departments. Last date to apply: October 31, 2024.', 'academic', FALSE, NOW() - INTERVAL '7 days');

-- Events
INSERT INTO events (title, description, event_date, event_time, venue, event_type) VALUES
('Technothlon 2024', 'Annual technical fest of NIT Patna with competitions, workshops and paper presentations', NOW()::DATE + 15, '09:00:00', 'Main Auditorium', 'technical'),
('Convocation Ceremony 2024', 'Annual convocation ceremony for graduating batch of 2024', NOW()::DATE + 30, '10:00:00', 'Open Air Theatre', 'academic'),
('Sports Meet 2024', 'Inter-department annual sports meet with track, field and indoor sports', NOW()::DATE + 10, '08:00:00', 'Sports Ground', 'sports'),
('Industry Talk - Google Engineer', 'Talk by Google SWE on system design and career guidance', NOW()::DATE + 5, '14:00:00', 'Seminar Hall A', 'placement');

-- Jobs
INSERT INTO jobs (title, company_name, description, requirements, location, job_type, package_lpa, min_cgpa, eligible_departments, deadline) VALUES
('Software Engineer', 'Google India', 'Join Google as a Software Engineer and work on cutting-edge products used by billions of people.', '- B.Tech in CS/IT/ECE\n- Strong DSA skills\n- Experience with distributed systems\n- Good communication skills', 'Bangalore / Hyderabad', 'full-time', 25.00, 7.5, ARRAY['CSE','IT','ECE'], NOW()::DATE + 20),
('Data Scientist Intern', 'Microsoft', 'Work on AI/ML projects at Microsoft Research India as a summer intern for 6 months.', '- Strong Python skills\n- Knowledge of ML frameworks (TensorFlow/PyTorch)\n- Statistical analysis skills\n- Min CGPA 7.0', 'Hyderabad', 'internship', 3.00, 7.0, ARRAY['CSE','IT'], NOW()::DATE + 15),
('Frontend Developer', 'Flipkart', 'Build and maintain consumer-facing web applications for Flipkart platform.', '- Proficiency in React.js\n- CSS/SCSS expertise\n- REST API integration experience', 'Bangalore', 'full-time', 12.00, 6.5, ARRAY['CSE','IT','ECE'], NOW()::DATE + 25),
('Embedded Systems Engineer', 'Bosch', 'Work on embedded software for automotive control units at Bosch India.', '- Knowledge of C/C++ embedded programming\n- Microcontroller experience\n- RTOS knowledge preferred', 'Pune / Bangalore', 'full-time', 8.50, 6.0, ARRAY['ECE','EE','ME'], NOW()::DATE + 18),
('Civil Engineer (Infrastructure)', 'L&T Construction', 'Work on large-scale infrastructure and construction projects across India.', '- B.Tech Civil Engineering\n- Knowledge of AutoCAD, STAAD Pro\n- Site management experience', 'Multiple Locations', 'full-time', 6.00, 6.0, ARRAY['CE'], NOW()::DATE + 30);

COMMENT ON TABLE users IS 'Campus users: students, faculty, admin, recruiters';
COMMENT ON TABLE jobs IS 'Campus placement job postings';
COMMENT ON TABLE job_applications IS 'Student job applications tracking';
