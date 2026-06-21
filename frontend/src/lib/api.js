const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000');
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
  suggestions: (type, query) => request(`/api/suggestions/${encodeURIComponent(type)}?q=${encodeURIComponent(query || '')}`),
  createProduct: (product) => request('/api/inventory', { method: 'POST', body: JSON.stringify(product) }),
  salesOrders: () => request('/api/sales-orders'),
  createSalesOrder: (customerName, lines) => request('/api/sales-orders', { method: 'POST', body: JSON.stringify({ customerName, lines }) }),
  confirmSalesOrder: (id) => request(`/api/sales-orders/${id}/confirm`, { method: 'POST' }),
  deliverSalesOrder: (id, payload) => request(`/api/sales-orders/${id}/deliver`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelSalesOrder: (id) => request(`/api/sales-orders/${id}/cancel`, { method: 'POST' }),
  createAuditLog: (payload) => request('/api/audit-logs', { method: 'POST', body: JSON.stringify(payload) }),
  auditLogs: () => request('/api/audit-logs'),
  staff: () => request('/api/staff'),
  saveStaff: (id, payload) => request(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStaff: (id) => request(`/api/staff/${id}`, { method: 'DELETE' }),
  module: (name) => request(`/api/modules/${name}`),
  createModule: (name, record) => request(`/api/modules/${name}`, { method: 'POST', body: JSON.stringify(record) }),
  updateModule: (name, id, record) => request(`/api/modules/${name}/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  deleteModule: (name, id) => request(`/api/modules/${name}/${id}`, { method: 'DELETE' }),
  produceMO: (id) => request(`/api/manufacturing/${id}/produce`, { method: 'POST' }),
  getSettings: () => request('/api/settings'),
  companyProfile: () => request('/api/company-profile'),
  saveSettings: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
};
