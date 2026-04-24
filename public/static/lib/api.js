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

export const clientCache = new Map();

/** Generic fetch helper */
async function request(method, path, body = null) {
  // If GET and cached, return instantly
  if (method === 'GET' && clientCache.has(path)) {
    return clientCache.get(path);
  }

  const opts = { method, headers: headers() };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  // Cache population: If this is a list response, cache every child item!
  if (method === 'GET') {
    if (Array.isArray(data)) {
      const basePath = path.split('?')[0]; // e.g. "/contracts"
      data.forEach(item => {
        if (item && item.id) {
          clientCache.set(`${basePath}/${item.id}`, item);
        }
      });
    } else if (path.includes('/') && !path.includes('?')) {
       // Also cache standard specific GETs (like /contracts/5) if randomly hit
       clientCache.set(path, data);
    }
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

/** Login — authenticates and stores token, then fetches unified payload */
export async function login(username, password) {
  const data = await post('/auth/login', { username, password });
  setToken(data.token);
  localStorage.setItem('ss_user', data.username);
  // Await the giant payload so the dashboard redirect happens after cache is seeded
  await triggerWarmup();
  return data;
}

/** 
 * Fetches the Giant Synchronous Payload.
 * Populates both list and detail routes in the client cache instantly.
 */
export async function triggerWarmup() {
  try {
    // 1. Check if we already downloaded the mega payload in this session
    let payload = null;
    const cachedPayload = sessionStorage.getItem('gcc_mega_payload');
    
    if (cachedPayload) {
      payload = JSON.parse(cachedPayload);
    } else {
      // 2. Otherwise fetch it and save to session storage
      const res = await fetch('/api/warmup', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.payload) {
        payload = data.payload;
        sessionStorage.setItem('gcc_mega_payload', JSON.stringify(payload));
      }
    }

    // 3. Inject payload into RAM map
    if (payload) {
      for (const [route, arrayData] of Object.entries(payload)) {
        clientCache.set(route, arrayData);
        if (Array.isArray(arrayData)) {
          const basePath = route.split('?')[0];
          arrayData.forEach(item => {
            if (item && item.id) {
              clientCache.set(`${basePath}/${item.id}`, item);
            }
          });
        }
      }
      console.log('[GCC Cache] Unified Payload Loaded:', clientCache.size, 'entries instantly available.');
    }
  } catch (err) {
    console.error('Warmup failed:', err);
  }
}
