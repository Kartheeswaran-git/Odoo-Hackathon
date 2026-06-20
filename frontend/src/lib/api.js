const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'shiv-furniture-access-token';

export function setSession(session) { if (session?.access_token) localStorage.setItem(TOKEN_KEY, session.access_token); }
export function clearSession() { localStorage.removeItem(TOKEN_KEY); }
export function getToken() { return localStorage.getItem(TOKEN_KEY); }

export async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (name, email, password) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => request('/api/auth/me'),
  inventory: () => request('/api/inventory'),
  salesOrders: () => request('/api/sales-orders'),
  createSalesOrder: (customerName, lines) => request('/api/sales-orders', { method: 'POST', body: JSON.stringify({ customerName, lines }) }),
  staff: () => request('/api/staff'),
  saveStaff: (id, payload) => request(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStaff: (id) => request(`/api/staff/${id}`, { method: 'DELETE' }),
  module: (name) => request(`/api/modules/${name}`),
  createModule: (name, record) => request(`/api/modules/${name}`, { method: 'POST', body: JSON.stringify(record) }),
  deleteModule: (name, id) => request(`/api/modules/${name}/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/api/settings'),
  saveSettings: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
};
