// ============================================================
// auth.js — Login & Register form logic
// ============================================================
import { apiPost, setSession, redirectIfAuthed } from './api.js';

// ─── Shared helpers ───────────────────────────────────────────

/**
 * Show an error banner on the form.
 * @param {HTMLElement} el - the .form-error element
 * @param {string} msg
 */
const showError = (el, msg) => {
  el.textContent = '⚠ ' + msg;
  el.classList.add('visible');
};

const hideError = (el) => el.classList.remove('visible');

/**
 * Show a success banner.
 */
const showSuccess = (el, msg) => {
  el.textContent = '✓ ' + msg;
  el.classList.add('visible');
};

/**
 * Set button to loading/idle state.
 */
const setLoading = (btn, loading) => {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
};

// ─── Password strength ────────────────────────────────────────
const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
};

const updateStrengthUI = (bars, label, pw) => {
  const score = getStrength(pw);
  const levels = ['', 'weak', 'weak', 'medium', 'strong'];
  const labels = ['', 'Weak', 'Weak', 'Medium', 'Strong'];
  const colors = ['', '#ef4444', '#ef4444', '#f59e0b', '#10b981'];

  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < score) bar.classList.add(levels[score]);
  });

  label.textContent = pw.length > 0 ? `Password strength: ${labels[score]}` : '';
  label.style.color = colors[score];
};

// ─── Toggle password visibility ───────────────────────────────
const initPasswordToggle = (toggleBtn, inputEl) => {
  if (!toggleBtn || !inputEl) return;
  toggleBtn.addEventListener('click', () => {
    const isText = inputEl.type === 'text';
    inputEl.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? '👁' : '🙈';
  });
};

// ─── LOGIN PAGE ───────────────────────────────────────────────
const initLoginPage = () => {
  // Redirect if already logged in
  if (redirectIfAuthed()) return;

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-password');
  const submitBtn = document.getElementById('login-submit');
  const errorBanner = document.getElementById('login-error');

  if (!form) return; // Not on login page

  initPasswordToggle(toggleBtn, passwordInput);

  // Clear error on input
  [emailInput, passwordInput].forEach((el) => {
    el.addEventListener('input', () => hideError(errorBanner));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errorBanner);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError(errorBanner, 'Please fill in all fields');
      return;
    }

    setLoading(submitBtn, true);
    try {
      const data = await apiPost('/auth/login', { email, password });
      setSession(data.token, data.user);
      // Small delay to let user see success
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(errorBanner, err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
};

// ─── REGISTER PAGE ────────────────────────────────────────────
const initRegisterPage = () => {
  if (redirectIfAuthed()) return;

  const form = document.getElementById('register-form');
  const usernameInput = document.getElementById('reg-username');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const toggleBtn = document.getElementById('toggle-reg-password');
  const submitBtn = document.getElementById('register-submit');
  const errorBanner = document.getElementById('register-error');
  const successBanner = document.getElementById('register-success');
  const strengthBars = document.querySelectorAll('.strength-bar');
  const strengthLabel = document.querySelector('.strength-label');

  if (!form) return; // Not on register page

  initPasswordToggle(toggleBtn, passwordInput);

  // Live password strength
  passwordInput?.addEventListener('input', () => {
    updateStrengthUI([...strengthBars], strengthLabel, passwordInput.value);
    hideError(errorBanner);
  });

  // Clear errors on other inputs
  [usernameInput, emailInput, confirmInput].forEach((el) => {
    el?.addEventListener('input', () => hideError(errorBanner));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errorBanner);
    successBanner?.classList.remove('visible');

    const username = usernameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    const confirm = confirmInput?.value;
    const role = document.querySelector('input[name="role"]:checked')?.value || 'technician';

    // Client-side validation
    if (!username || !email || !password || !confirm) {
      showError(errorBanner, 'Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      showError(errorBanner, 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      showError(errorBanner, 'Password must be at least 8 characters');
      return;
    }

    setLoading(submitBtn, true);
    try {
      const data = await apiPost('/auth/register', { username, email, password, role });
      setSession(data.token, data.user);
      showSuccess(successBanner, 'Account created! Redirecting to dashboard…');
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 1200);
    } catch (err) {
      showError(errorBanner, err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
};

// ─── Auto-detect which page we're on and init ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
});
