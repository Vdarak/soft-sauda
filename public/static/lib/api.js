/**
 * API Client — Thin fetch wrapper for all backend communication
 * 
 * Features:
 * - Automatic JWT token injection
 * - JSON parsing
 * - Error handling with toast notifications
 */

const API_BASE = '/api';

/** Get stored JWT token */
function getToken() {
  return localStorage.getItem('ss_token');
}

/** Set JWT token */
export function setToken(token) {
  localStorage.setItem('ss_token', token);
}

/** Clear auth state */
export function clearAuth() {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
}

/** Check if user is authenticated */
export function isAuthenticated() {
  return !!getToken();
}

/** Build request headers */
function headers(contentType = 'application/json') {
  const h = {};
  if (contentType) h['Content-Type'] = contentType;
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/** Generic fetch helper */
async function request(method, path, body = null) {
  const opts = { method, headers: headers() };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

/** GET request */
export async function get(path) {
  return request('GET', path);
}

/** POST request */
export async function post(path, body) {
  return request('POST', path, body);
}

/** PUT request */
export async function put(path, body) {
  return request('PUT', path, body);
}

/** DELETE request */
export async function del(path) {
  return request('DELETE', path);
}

/** Login — authenticates and stores token, then pre-warms the cache */
export async function login(username, password) {
  const data = await post('/auth/login', { username, password });
  setToken(data.token);
  localStorage.setItem('ss_user', data.username);
  // Fire-and-forget: tell server to pre-cache all data
  triggerWarmup();
  return data;
}

/** 
 * Fire-and-forget cache warmup. Called after login and on page load.
 * The server pre-fetches all list data in parallel so subsequent
 * API calls hit the cache and respond instantly.
 */
export function triggerWarmup() {
  fetch('/api/warmup').catch(() => {});
}
