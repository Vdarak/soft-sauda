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

// Hydrate from sessionStorage to prevent re-fetching on F5 (Refresh)
try {
  const cacheTime = sessionStorage.getItem('ss_cache_time');
  // 15 minute cache expiry
  if (cacheTime && (Date.now() - parseInt(cacheTime)) < 15 * 60 * 1000) {
    const cachedData = sessionStorage.getItem('ss_mega_payload');
    if (cachedData) {
      const arr = JSON.parse(cachedData);
      arr.forEach(([k, v]) => clientCache.set(k, v));
    }
  } else {
    sessionStorage.removeItem('ss_mega_payload');
    sessionStorage.removeItem('ss_cache_time');
  }
} catch(e) {}

function persistCache() {
  try {
    sessionStorage.setItem('ss_mega_payload', JSON.stringify(Array.from(clientCache.entries())));
    sessionStorage.setItem('ss_cache_time', Date.now().toString());
  } catch(e) {}
}

/** Update clientCache in-place for write operations (POST, PUT, DELETE) */
function updateLocalCache(method, path, responseData, requestBody) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return;
  const entity = parts[0]; // e.g. "contracts", "parties"
  const listKey = `/${entity}`;
  const id = parts[1] ? parseInt(parts[1], 10) : null;

  if (method === 'POST') {
    // Merge response data (has generated ID/dates) with request body (has full values)
    const createdItem = { ...requestBody, ...responseData };
    if (createdItem && createdItem.id) {
      clientCache.set(`${listKey}/${createdItem.id}`, createdItem);
      const list = clientCache.get(listKey);
      if (Array.isArray(list)) {
        list.unshift(createdItem);
        clientCache.set(listKey, list);
      }
    }
  } else if (method === 'PUT') {
    const updatedItem = { ...requestBody, ...responseData };
    if (updatedItem && updatedItem.id) {
      clientCache.set(`${listKey}/${updatedItem.id}`, updatedItem);
      const list = clientCache.get(listKey);
      if (Array.isArray(list)) {
        const idx = list.findIndex(item => item.id === updatedItem.id);
        if (idx !== -1) {
          list[idx] = updatedItem;
        } else {
          list.unshift(updatedItem);
        }
        clientCache.set(listKey, list);
      }
    }
  } else if (method === 'DELETE') {
    const deletedId = id || (responseData && responseData.id);
    if (deletedId) {
      clientCache.delete(`${listKey}/${deletedId}`);
      let list = clientCache.get(listKey);
      if (Array.isArray(list)) {
        list = list.filter(item => item.id !== deletedId);
        clientCache.set(listKey, list);
      }
    }
  }

  // Custom schema mappings for parties/contracts line items if needed
  if (entity === 'parties' && (method === 'POST' || method === 'PUT')) {
    const item = clientCache.get(`${listKey}/${responseData.id}`);
    if (item && requestBody) {
      if (requestBody.roles) {
        item.roles = requestBody.roles.map(r => ({ role: r }));
      }
      item.taxIds = [
        { taxType: 'GSTIN', taxValue: requestBody.gstin },
        { taxType: 'VAT_TIN', taxValue: requestBody.vatTin },
        { taxType: 'CST_TIN', taxValue: requestBody.cstTin },
        { taxType: 'CST_NO', taxValue: requestBody.cstNo },
      ].filter(t => t.taxValue);
    }
  }

  persistCache();
}

/** Generic fetch helper */
async function request(method, path, body = null, options = {}) {
  // If GET and cached, return instantly
  if (method === 'GET' && clientCache.has(path) && !options.forceRefresh) {
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
    clientCache.set(path, data);
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
    persistCache();
  } else {
    // Perform local in-place update first, then background warmup silently
    updateLocalCache(method, path, data, body);
    triggerWarmup({ forceRefresh: true })
      .then(() => {
        // Dispatch event so active view re-renders with fresh computed metrics
        window.dispatchEvent(new PopStateEvent('popstate'));
      })
      .catch(err => console.error('[api.js] Background warmup failed:', err));
  }

  return data;
}

/** GET request */
export async function get(path, options = {}) {
  return request('GET', path, null, options);
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
export async function triggerWarmup(options = {}) {
  try {
    // 1. Check if we already downloaded the mega payload in this session
    let payload = null;
    let cachedPayload = null;
    
    if (!options.forceRefresh) {
      cachedPayload = sessionStorage.getItem('gcc_mega_payload');
    }
    
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
