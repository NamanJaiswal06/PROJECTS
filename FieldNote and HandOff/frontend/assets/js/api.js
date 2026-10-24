// ============================================================
// api.js — Fetch wrapper with automatic Bearer token injection
// ============================================================

const API_BASE = 'http://localhost:5000/api';

/**
 * Get stored JWT from localStorage.
 * @returns {string|null}
 */
const getToken = () => localStorage.getItem('fn_token');

/**
 * Store JWT + user profile after login/register.
 * @param {string} token
 * @param {object} user
 */
const setSession = (token, user) => {
  localStorage.setItem('fn_token', token);
  localStorage.setItem('fn_user', JSON.stringify(user));
};

/**
 * Clear session data on logout.
 */
const clearSession = () => {
  localStorage.removeItem('fn_token');
  localStorage.removeItem('fn_user');
};

/**
 * Get stored user profile.
 * @returns {object|null}
 */
const getUser = () => {
  const raw = localStorage.getItem('fn_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

/**
 * Core fetch wrapper — injects Authorization header automatically.
 *
 * @param {string} path  - API path (e.g. '/auth/login')
 * @param {object} options - fetch options override
 * @returns {Promise<object>} parsed JSON response
 * @throws {Error} with server error message
 */
const api = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
};

// ─── Convenience methods ──────────────────────────────────────

const apiGet = (path) => api(path, { method: 'GET' });

const apiPost = (path, body) =>
  api(path, { method: 'POST', body: JSON.stringify(body) });

const apiPatch = (path, body) =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) });

const apiDelete = (path) => api(path, { method: 'DELETE' });

// ─── Auth guard — redirect to login if no token ───────────────
const requireAuth = () => {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
};

// ─── Redirect authenticated users away from auth pages ───────
const redirectIfAuthed = () => {
  if (getToken()) {
    window.location.href = '/dashboard.html';
    return true;
  }
  return false;
};

export {
  api, apiGet, apiPost, apiPatch, apiDelete,
  getToken, setSession, clearSession, getUser,
  requireAuth, redirectIfAuthed,
};
