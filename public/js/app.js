// ============================================
// NeoPatna Campus Portal - Global JS Utility
// ============================================

const API_BASE = '/api';

// ===========================
// TOKEN / AUTH HELPERS
// ===========================
const Auth = {
  getToken: () => localStorage.getItem('campus_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('campus_user')); }
    catch { return null; }
  },
  setAuth: (token, user) => {
    localStorage.setItem('campus_token', token);
    localStorage.setItem('campus_user', JSON.stringify(user));
  },
  clearAuth: () => {
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_user');
  },
  isLoggedIn: () => !!localStorage.getItem('campus_token'),
  hasRole: (role) => {
    const user = Auth.getUser();
    return user && user.role === role;
  }
};

// ===========================
// API FETCH HELPER
// ===========================
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      if (res.status === 401) {
        Auth.clearAuth();
        showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => window.location.href = '/login', 1500);
      }
      throw new Error(data.message || 'Unauthorized');
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err.name !== 'Error') {
      showToast('Network error. Please check your connection.', 'error');
    }
    throw err;
  }
}

// ===========================
// TOAST NOTIFICATIONS
// ===========================
let toastContainer = null;

function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed; top: 80px; right: 1rem; z-index: 9999;
      display: flex; flex-direction: column; gap: 0.5rem; max-width: 350px;
    `;
    document.body.appendChild(toastContainer);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = {
    success: '#f0fdf4;border-color:#bbf7d0;color:#166534',
    error: '#fef2f2;border-color:#fecaca;color:#991b1b',
    warning: '#fffbeb;border-color:#fde68a;color:#92400e',
    info: '#eff6ff;border-color:#bfdbfe;color:#1e40af'
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    background:${colors[type].split(';')[0].replace('background:', '')};
    border:1px solid ${colors[type].split(';')[1].replace('border-color:', '')};
    color:${colors[type].split(';')[2].replace('color:', '')};
    padding:0.75rem 1rem; border-radius:8px; font-size:0.875rem;
    display:flex; align-items:center; gap:0.5rem;
    box-shadow:0 4px 12px rgba(0,0,0,0.15); animation:slideIn 0.3s ease;
    cursor:pointer; word-break:break-word;
  `;
  toast.innerHTML = `${icons[type]} <span>${message}</span>`;
  toast.onclick = () => toast.remove();

  const style = document.createElement('style');
  style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
  if (!document.getElementById('toast-style')) {
    style.id = 'toast-style';
    document.head.appendChild(style);
  }

  toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ===========================
// MODAL HELPERS
// ===========================
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ===========================
// FORMAT HELPERS
// ===========================
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = (now - then) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function daysUntil(dateStr) {
  const now = new Date();
  const deadline = new Date(dateStr);
  const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '<span class="text-danger">Closed</span>';
  if (diff === 0) return '<span class="text-danger">Today</span>';
  if (diff <= 7) return `<span class="text-danger">${diff}d left</span>`;
  return `<span class="text-success">${diff}d left</span>`;
}

function getJobTypeTag(type) {
  const map = {
    'full-time': 'tag-blue',
    'internship': 'tag-purple',
    'part-time': 'tag-orange',
    'contract': 'tag-gray'
  };
  return `<span class="tag ${map[type] || 'tag-gray'}">${type}</span>`;
}

function getStatusBadge(status) {
  return `<span class="status-badge status-${status}">${status}</span>`;
}

// ===========================
// NAVBAR ACTIVE STATE
// ===========================
function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
}

// ===========================
// NAVBAR USER STATE
// ===========================
function updateNavbar() {
  const user = Auth.getUser();
  const guestNav = document.getElementById('guest-nav');
  const userNav = document.getElementById('user-nav');
  const userNameEl = document.getElementById('nav-user-name');

  if (user && Auth.isLoggedIn()) {
    if (guestNav) guestNav.style.display = 'none';
    if (userNav) userNav.style.display = 'flex';
    if (userNameEl) userNameEl.textContent = user.name.split(' ')[0];
  } else {
    if (guestNav) guestNav.style.display = 'flex';
    if (userNav) userNav.style.display = 'none';
  }
}

function logout() {
  Auth.clearAuth();
  showToast('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/', 1000);
}

// ===========================
// LOADER
// ===========================
function showLoader(container) {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>`;
}

function showEmptyState(container, icon, message, sub = '') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3 style="margin-bottom:0.5rem;color:#1e293b">${message}</h3>
      ${sub ? `<p style="font-size:0.875rem">${sub}</p>` : ''}
    </div>`;
}

// ===========================
// DEPARTMENT LOADER
// ===========================
async function loadDepartments(selectEl) {
  try {
    const { data } = await apiFetch('/departments');
    if (data.success) {
      data.departments.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep.id;
        opt.textContent = `${dep.code} - ${dep.name}`;
        selectEl.appendChild(opt);
      });
    }
  } catch {}
}

// Run on all pages
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  setActiveNavLink();
});
