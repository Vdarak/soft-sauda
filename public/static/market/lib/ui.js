/**
 * Marketplace UI helpers — formatting, escaping, toasts, navigation.
 * Self-contained; no ERP imports.
 */

/** Programmatic SPA navigation (tinyrouter listens for popstate). */
export function go(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Indian-format currency, e.g. ₹2,650. */
export function inr(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (isNaN(v)) return '—';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Quintal quantity, e.g. "500 q". */
export function qty(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (isNaN(v)) return '—';
  return v.toLocaleString('en-IN') + ' q';
}

/** Relative "time ago". */
export function ago(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}

/** HTML-escape untrusted text before interpolation. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let toastTimer;
export function toast(message, type = 'info') {
  let el = document.getElementById('mkt-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mkt-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'mkt-toast mkt-toast-' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/** Mount HTML into the app container. */
export function mount(html) {
  document.getElementById('app').innerHTML = html;
}
