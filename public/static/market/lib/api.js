/**
 * Marketplace API client — isolated from the ERP. Uses its own token
 * (`mkt_token`) and only ever talks to /api/market/*. Never imports ERP code.
 */
const API = '/api/market';

export function getToken() {
  return localStorage.getItem('mkt_token');
}
export function setSession(token, member) {
  localStorage.setItem('mkt_token', token);
  localStorage.setItem('mkt_member', JSON.stringify(member || {}));
}
export function getMember() {
  try {
    return JSON.parse(localStorage.getItem('mkt_member') || 'null');
  } catch {
    return null;
  }
}
export function clearSession() {
  localStorage.removeItem('mkt_token');
  localStorage.removeItem('mkt_member');
}
export function isAuthed() {
  return !!getToken();
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

async function handle(res) {
  if (res.status === 401) {
    // Token expired/invalid — drop it so the UI falls back to signed-out state.
    clearSession();
  }
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const d = await res.json();
      msg = d.error || msg;
    } catch {
      /* non-JSON error */
    }
    const e = new Error(msg);
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function get(path) {
  return handle(await fetch(API + path, { headers: headers() }));
}
export async function post(path, body) {
  return handle(await fetch(API + path, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) }));
}
export async function del(path) {
  return handle(await fetch(API + path, { method: 'DELETE', headers: headers() }));
}
