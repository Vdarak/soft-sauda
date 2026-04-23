/**
 * UI Components — Reusable template functions that return HTML strings
 * Uses Oat.ink semantic HTML patterns (styled automatically by oat.css)
 */

/* ── SVG Icons (inline, no framework needed) ── */
export const Icons = {
  fileText:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  users:       '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  box:         '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  truck:       '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  receipt:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>',
  creditCard:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
  bookOpen:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  home:        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  plus:        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>',
  search:      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>',
  edit:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  sun:         '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  moon:        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  arrowLeft:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  logout:      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
};

/* ── Badge Component ── */
export function Badge(text, type = 'default') {
  const cls = type === 'active' ? 'badge-active' : type === 'draft' ? 'badge-draft' : 'badge-inactive';
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

/* ── Stats Card Component ── */
export function StatsCard({ icon, value, label, desc, href }) {
  const tag = href ? 'a' : 'div';
  const hrefAttr = href ? ` href="${href}" data-route` : '';
  return `<${tag} class="stat-card"${hrefAttr}>
    <div class="stat-icon">${icon}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${escapeHtml(label)}</div>
    ${desc ? `<div class="stat-desc">${escapeHtml(desc)}</div>` : ''}
  </${tag}>`;
}

/* ── Data Table Component ── */
export function DataTable({ id, title, count, headers, rows, emptyMessage = 'No data found.' }) {
  return `<div class="table-container">
    ${title ? `<div class="table-header">
      <h2>${escapeHtml(title)}${count !== undefined ? ` (${count})` : ''}</h2>
    </div>` : ''}
    <div style="overflow-x:auto">
      <table id="${id || ''}">
        <thead><tr>${headers.map(h =>
          `<th${h.align ? ` style="text-align:${h.align}"` : ''}>${escapeHtml(h.label)}</th>`
        ).join('')}</tr></thead>
        <tbody>
          ${rows.length === 0 
            ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:2rem;color:var(--muted-foreground)">${emptyMessage}</td></tr>`
            : rows.join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ── Form Group Component ── */
export function FormGroup({ id, label, type = 'text', value = '', required = false, placeholder = '', options = null }) {
  let input;
  if (type === 'select' && options) {
    input = `<select id="${id}" name="${id}"${required ? ' required' : ''}>
      <option value="">Select...</option>
      ${options.map(o => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
    </select>`;
  } else if (type === 'textarea') {
    input = `<textarea id="${id}" name="${id}" placeholder="${placeholder}"${required ? ' required' : ''} rows="3">${escapeHtml(value)}</textarea>`;
  } else {
    input = `<input type="${type}" id="${id}" name="${id}" value="${escapeHtml(value)}" placeholder="${placeholder}"${required ? ' required' : ''}>`;
  }

  return `<div class="form-group">
    <label for="${id}">${escapeHtml(label)}${required ? ' *' : ''}</label>
    ${input}
  </div>`;
}

/* ── Page Header Component ── */
export function PageHeader({ title, subtitle, backHref, actions = '' }) {
  return `<div class="page-header">
    <div>
      ${backHref ? `<a href="${backHref}" data-route style="display:inline-flex;align-items:center;gap:0.25rem;font-size:0.75rem;color:var(--muted-foreground);margin-bottom:0.25rem">${Icons.arrowLeft} Back</a>` : ''}
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="color:var(--muted-foreground);font-size:0.8125rem;margin-top:0.125rem">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div class="actions">${actions}</div>
  </div>`;
}

/* ── Toast Notifications ── */
let toastTimeout;
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.className = type === 'error' ? 'alert danger' : 'alert success';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) container.remove();
  }, 3000);
}

/* ── Spinner Component ── */
export function Spinner() {
  return `<div class="loading-overlay"><div class="spinner"></div></div>`;
}

/* ── HTML Escaping (XSS prevention) ── */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Date formatting ── */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Currency formatting ── */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹ 0';
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ── Collect form data as object ── */
export function collectFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const fd = new FormData(form);
  const data = {};
  for (const [key, val] of fd.entries()) {
    data[key] = val;
  }
  return data;
}
