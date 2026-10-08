# 🎓 NeoPatna - Campus Management Portal

A full-featured campus management portal inspired by **NIT Patna (NeoPatna)**, built with Node.js, Express, PostgreSQL, and vanilla HTML/CSS/JS frontend.

---

## 📋 Features

| Module | Features |
|--------|----------|
| **Authentication** | Register, Login, JWT tokens, Role-based access |
| **Placements** | Browse jobs, Apply with resume, Track applications |
| **Notices** | Campus announcements, Pinned notices, Categories |
| **Events** | Campus calendar, Event management |
| **Admin Panel** | Stats dashboard, User management, Application tracking |
| **Roles** | Student, Faculty, Admin, Recruiter |

## 🏗️ Project Structure

```
campus-portal/
├── server.js                   # Express server entry point
├── schema.sql                  # PostgreSQL database schema + seed data
├── .env                        # Environment variables
├── public/
│   ├── index.html              # Homepage
│   ├── login.html              # Login page
│   ├── register.html           # Multi-step registration
│   ├── jobs.html               # Placements page
│   ├── dashboard.html          # User dashboard
│   ├── notices.html            # Notices page
│   ├── admin.html              # Admin panel
│   ├── 404.html                # Error page
│   ├── css/
│   │   └── style.css           # Main stylesheet (NIT Patna theme)
│   └── js/
│       └── app.js              # Global JavaScript utilities
├── src/
│   ├── config/
│   │   └── database.js         # PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth.js             # JWT auth + role middleware
│   └── routes/
│       ├── auth.js             # Authentication routes
│       ├── jobs.js             # Jobs + Applications routes
│       ├── notices.js          # Notices routes
│       ├── events.js           # Events routes
│       └── campus.js           # Dashboard + Users + Departments
└── uploads/                    # Resume uploads folder
```

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- PostgreSQL v13+
- npm

### 1. Setup Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE campus_portal;"

# Run the schema (creates tables + seed data)
psql -U postgres -d campus_portal -f schema.sql
```

### 2. Configure Environment

Edit `.env` file with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_portal
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_secret_key_here
PORT=3000
```

### 3. Install & Run

```bash
npm install
npm start
# or for development with auto-reload:
npm install -g nodemon
npm run dev
```

### 4. Open Browser

Visit **http://localhost:3000**

---

## 🔐 Default Accounts

After running `schema.sql`, the admin account is seeded:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@neopatna.ac.in | *set via register or SQL update* |

> **Note**: The seeded admin password hash in schema.sql is for `password`. 
> Register new accounts through the `/register` page for testing.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (auth required) |
| PUT | `/api/auth/profile` | Update profile |

### Jobs
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/jobs` | Public |
| GET | `/api/jobs/:id` | Public |
| POST | `/api/jobs` | Admin/Recruiter |
| PUT | `/api/jobs/:id` | Admin/Recruiter |
| DELETE | `/api/jobs/:id` | Admin |
| POST | `/api/jobs/:id/apply` | Student |
| GET | `/api/jobs/:id/applications` | Admin/Recruiter |
| PUT | `/api/jobs/:jobId/applications/:appId` | Admin/Recruiter |
| GET | `/api/jobs/student/my-applications` | Student |

### Notices
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/notices` | Public |
| POST | `/api/notices` | Admin/Faculty |
| DELETE | `/api/notices/:id` | Admin |

### Events
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/events` | Public |
| POST | `/api/events` | Admin/Faculty |
| DELETE | `/api/events/:id` | Admin |

### Campus / Admin
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/departments` | Public |
| GET | `/api/users` | Admin |
| GET | `/api/dashboard/stats` | Admin |

---

## 🎨 Design System

- **Primary Color**: Navy Blue (`#1a3a6b`) — NIT Patna theme
- **Accent**: Gold (`#e8a000`)
- **Font**: Segoe UI / System Sans-Serif
- **Components**: Cards, Modals, Toast notifications, Sidebar, Tables

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File Upload | Multer |
| Validation | express-validator |
| Frontend | Vanilla HTML + CSS + JavaScript |

---

## 🧪 Testing the Application

1. Register as a **Student** → Apply for jobs on `/jobs`
2. Register as a **Recruiter** → Post jobs (green admin bar appears)
3. Login as **Admin** → Visit `/admin` for full management panel
4. View applications, update status (Shortlisted/Interview/Selected/Rejected)

---

## 📝 TODO / Extensions

- [ ] Email notifications on application status change
- [ ] PDF resume preview
- [ ] Student results/marks module
- [ ] Timetable management
- [ ] Library management
- [ ] Fee payment integration
- [ ] Real-time notifications (Socket.io)
