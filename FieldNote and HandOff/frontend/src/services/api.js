// ==========================================================================
// API SERVICE CLIENT — FieldNote & HandOff
// Communicates with backend API running on http://localhost:5000/api (proxied via Vite)
// ==========================================================================

const API_BASE = '/api';

/** Token management */
export const getToken = () => localStorage.getItem('fn_token');

export const setSession = (token, user) => {
  localStorage.setItem('fn_token', token);
  localStorage.setItem('fn_user', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('fn_token');
  localStorage.removeItem('fn_user');
};

export const getUser = () => {
  const raw = localStorage.getItem('fn_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

/**
 * Core fetch wrapper with Bearer authentication
 */
export const apiFetch = async (path, options = {}) => {
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }

  return data;
};

// ─── AUTH ENDPOINTS ──────────────────────────────────────────────────────────

export const loginUser = (email, password) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const registerUser = (userData) =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

export const getMe = () => apiFetch('/auth/me');

// ─── EQUIPMENT ENDPOINTS ──────────────────────────────────────────────────────

export const getAllEquipment = () => apiFetch('/equipment');

export const getEquipmentById = (id) => apiFetch(`/equipment/${id}`);

export const getEquipmentHistory = (id) => apiFetch(`/equipment/${id}/history`);

// ─── INCIDENTS ENDPOINTS ──────────────────────────────────────────────────────

export const createIncident = (incidentData) =>
  apiFetch('/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData),
  });

export const getIncidentsByUnit = (unitId) => apiFetch(`/incidents/${unitId}`);

// ─── HANDOFFS ENDPOINTS ───────────────────────────────────────────────────────

export const createHandoff = (handoffData) =>
  apiFetch('/handoffs', {
    method: 'POST',
    body: JSON.stringify(handoffData),
  });

export const getLatestHandoff = (unitId) => apiFetch(`/handoffs/${unitId}`);

export const getAllHandoffs = (unitId) => apiFetch(`/handoffs/${unitId}/all`);

// ─── MEMORY (QDRANT RAG) ──────────────────────────────────────────────────────

export const searchMemory = (query, equipmentId = null, limit = 5) =>
  apiFetch('/memory/search', {
    method: 'POST',
    body: JSON.stringify({ query, equipmentId, limit }),
  });

// ─── AI VOICE AGENT ───────────────────────────────────────────────────────────

export const sendAgentTurn = (payload) =>
  apiFetch('/agent/turn', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getAgentSession = (sessionId) =>
  apiFetch(`/agent/session/${sessionId}`);

export const clearAgentSession = (sessionId) =>
  apiFetch(`/agent/session/${sessionId}`, { method: 'DELETE' });
