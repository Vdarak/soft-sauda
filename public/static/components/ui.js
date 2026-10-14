/**
 * UI Components — Reusable template functions that return HTML strings
 * Uses Oat.ink semantic HTML patterns (styled automatically by oat.css)
 */

/* ── SVG Icons (inline, no framework needed) ── */
import { get } from '../lib/api.js';

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
  download:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  printer:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>',
  settings:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  trash:       '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  bank:        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7 12 2"/></svg>',
  tag:         '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l11 11 9-9-10-10z"/><circle cx="7" cy="7" r="2"/></svg>',
  dollar:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  fileCode:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
  refresh:     '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  save:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  phone:       '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  lock:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  building:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
  wheat:       '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 10-10"/><path d="m16 8-4 4"/><path d="M18 6a4 4 0 0 0-4 4v2"/><path d="M8 16a4 4 0 0 0 4-4v-2"/><path d="M15 2a4 4 0 0 0-4 4v2"/><path d="M6 11a4 4 0 0 0 4-4V5"/></svg>',
  droplet:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>',
  factory:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>',
  clock:       '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  alertTriangle:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  star:        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFilled:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  x:           '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  clipboard:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  calculator:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>',
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
export function DataTable({ id, title, count, headers, rows, emptyMessage = 'No data found.', pagination = null, footer = '' }) {
  let paginationHtml = '';
  if (pagination) {
    const { page, hasMore, route } = pagination;
    paginationHtml = `<div class="pagination-controls" style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0.5rem;border-top:1px solid var(--border)">
      <div style="font-size:0.75rem;color:var(--muted-foreground)">Page ${page}</div>
      <div style="display:flex;gap:0.25rem">
        <a ${page > 1 ? `href="${route}?page=${page - 1}" data-route` : ''}><button class="small" ${page <= 1 ? 'disabled' : ''}>${Icons.arrowLeft} Prev</button></a>
        <a ${hasMore ? `href="${route}?page=${page + 1}" data-route` : ''}><button class="small" ${!hasMore ? 'disabled' : ''}>Next <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:0.2rem"><path d="m9 18 6-6-6-6"/></svg></button></a>
      </div>
    </div>`;
  }

  return `<div class="table-container">
    ${title ? `<div class="table-header">
      <h2>${escapeHtml(title)}${count !== undefined ? ` (${count})` : ''}</h2>
    </div>` : ''}
    <div style="overflow-x:auto">
      <table id="${id || ''}">
        <thead><tr>${headers.map(h => {
          let styleAttr = '';
          if (h.style) {
            styleAttr = ` style="${h.style}"`;
          } else if (h.align) {
            styleAttr = ` style="text-align:${h.align}"`;
          }
          return `<th${styleAttr}>${escapeHtml(h.label)}</th>`;
        }).join('')}</tr></thead>
        <tbody>
          ${rows.length === 0 
            ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:1rem;color:var(--muted-foreground);font-size:0.75rem">${emptyMessage}</td></tr>`
            : rows.join('')}
        </tbody>
        ${footer}
      </table>
    </div>
    ${paginationHtml}
  </div>`;
}

/* ── Form Group Component ── */
export function FormGroup({ id, label, type = 'text', value = '', required = false, placeholder = '', options = null }) {
  let input;
  if (type === 'select' && options) {
    input = `<select id="${id}" name="${id}" class="compact-select"${required ? ' required' : ''}>
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

/* ── Instant Table Search & Highlight ── */
export function attachTableSearch(inputId, tbodyElementOrId, data, renderRowsCb) {
  const input = document.getElementById(inputId);
  const tbody = typeof tbodyElementOrId === 'string' ? document.getElementById(tbodyElementOrId) : tbodyElementOrId;
  if (!input || !tbody) return;

  let debounceTimer;

  input.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();

    clearTimeout(debounceTimer);

    if (!q) {
      tbody.innerHTML = renderRowsCb(data).join('');
      return;
    }

    debounceTimer = setTimeout(() => {
      const filtered = data.filter(item =>
        Object.values(item).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No entries found</td></tr>`;
        return;
      }

      tbody.innerHTML = renderRowsCb(filtered).join('');

      // Highlight matching text nodes
      const walker = document.createTreeWalker(tbody, NodeFilter.SHOW_TEXT, null, false);
      const nodesToReplace = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().includes(q)) nodesToReplace.push(node);
      }
      nodesToReplace.forEach(n => {
        const span = document.createElement('span');
        const regex = new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        span.innerHTML = n.nodeValue.replace(regex, '<mark>$1</mark>');
        n.parentNode.replaceChild(span, n);
      });
    }, 80);
  });
}

/* ── Date formatting (dd/mm/yyyy - Indian Standard) ── */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dateStr, includeSeconds = false) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  if (includeSeconds) {
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
  }
  return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
}

/* ── Currency formatting ── */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹\u00A00';
  return `₹\u00A0${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ── Compact currency (e.g. ₹ 1.56 CR, ₹ 45.2 L) ── */
export function formatCurrencyCompact(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹\u00A00';
  if (num >= 1e7) return `₹\u00A0${(num / 1e7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00A0CR`;
  if (num >= 1e5) return `₹\u00A0${(num / 1e5).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00A0L`;
  return `₹\u00A0${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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

/* ── Full-data Excel/CSV Export ── */
export async function exportToExcel(apiPath, filename = 'export') {
  try {
    showToast('Preparing export...');
    const data = await get(apiPath);
    if (!data || data.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    // Build CSV from array of objects
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        // Wrap in quotes if contains comma, newline, or quotes
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export downloaded!');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

/* ── Audit Metadata Block (Admin Only) ── */
export function AuditMetadataBlock(record) {
  const isAdmin = localStorage.getItem('ss_role') === 'ADMIN';
  if (!isAdmin || !record) return '';

  const createdBy = record.createdByDisplayName || record.createdByUsername || 'System';
  const createdAt = record.createdAt ? formatDateTime(record.createdAt) : '-';
  const updatedBy = record.updatedByDisplayName || record.updatedByUsername || createdBy;
  const updatedAt = record.updatedAt ? formatDateTime(record.updatedAt) : createdAt;

  return `
    <div class="audit-metadata-block" style="margin-top: 2rem; padding: 1rem; background: var(--faint); border: 1px dashed var(--border); border-radius: 0.5rem; font-size: 0.75rem; color: var(--muted-foreground); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; clear: both;">
      <div>
        <strong>Created By:</strong> ${escapeHtml(createdBy)}<br>
        <strong>Created At:</strong> ${createdAt}
      </div>
      <div>
        <strong>Last Modified By:</strong> ${escapeHtml(updatedBy)}<br>
        <strong>Last Modified At:</strong> ${updatedAt}
      </div>
    </div>
  `;
}

/**
 * Upgrade a native <select> element to a custom styled dropdown.
 * Replaces the select with a custom box that matches the autocomplete dropdown styling.
 * 
 * @param {HTMLSelectElement} selectEl - The native select element to upgrade
 * @returns {object} - { wrapper, getValue, setValue } for programmatic control
 */
export function upgradeSelect(selectEl) {
  if (!selectEl || selectEl._upgraded) return null;
  selectEl._upgraded = true;
  
  const options = Array.from(selectEl.options).map(opt => ({
    value: opt.value,
    text: opt.textContent,
    selected: opt.selected,
  }));
  
  const selectedOpt = options.find(o => o.selected) || options[0] || { value: '', text: '' };
  
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  wrapper.style.cssText = selectEl.style.cssText;
  wrapper.style.position = 'relative';
  
  // Create display button
  const display = document.createElement('div');
  display.className = 'custom-select-display compact-input';
  display.style.cssText = 'cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none;';
  display.innerHTML = `<span class="custom-select-text">${escapeHtml(selectedOpt.text)}</span><span style="font-size: 0.6rem; opacity: 0.6;">▼</span>`;
  display.tabIndex = 0;
  
  // Create dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomp custom-select-dropdown';
  dropdown.style.cssText = 'display: none; position: absolute; width: 100%; top: 100%; left: 0; z-index: 9999; max-height: 200px; overflow-y: auto;';
  
  // Hidden input to store value (for form submission)
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = selectEl.name;
  hiddenInput.id = selectEl.id;
  hiddenInput.value = selectedOpt.value;
  
  // Copy data-* attributes from original select to hidden input (for event delegation)
  Array.from(selectEl.attributes).forEach(attr => {
    if (attr.name.startsWith('data-')) {
      hiddenInput.setAttribute(attr.name, attr.value);
    }
  });
  
  // Copy relevant classes for event delegation (pack-input, spec-input, etc.)
  selectEl.classList.forEach(cls => {
    if (cls !== 'compact-select' && cls !== 'no-custom') {
      hiddenInput.classList.add(cls);
      wrapper.classList.add(cls);
    }
  });
  
  function renderOptions() {
    dropdown.innerHTML = '';
    options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'autocomp-item' + (opt.value === hiddenInput.value ? ' autocomp-sel' : '');
      item.textContent = opt.text;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        hiddenInput.value = opt.value;
        display.querySelector('.custom-select-text').textContent = opt.text;
        dropdown.style.display = 'none';
        // Fire change event
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      dropdown.appendChild(item);
    });
  }
  
  renderOptions();
  
  // Toggle dropdown
  display.addEventListener('click', () => {
    const isOpen = dropdown.style.display !== 'none';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) renderOptions();
  });
  
  // Close on blur
  display.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });
  
  // Keyboard navigation
  display.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      display.click();
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });
  
  wrapper.appendChild(display);
  wrapper.appendChild(dropdown);
  wrapper.appendChild(hiddenInput);
  
  // Replace native select
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  selectEl.style.display = 'none';
  selectEl.removeAttribute('id');
  selectEl.removeAttribute('name');
  
  return {
    wrapper,
    getValue: () => hiddenInput.value,
    setValue: (val) => {
      hiddenInput.value = val;
      const opt = options.find(o => o.value === val);
      if (opt) display.querySelector('.custom-select-text').textContent = opt.text;
    },
  };
}

/**
 * Upgrade all native <select> elements with class 'compact-select' to custom dropdowns.
 * Call this after DOM rendering to replace all selects at once.
 */
export function upgradeAllSelects(container = document) {
  container.querySelectorAll('select.compact-select:not(.no-custom)').forEach(sel => {
    if (sel.closest('#lines-grid-table')) return;
    upgradeSelect(sel);
  });
}

/**
 * Custom styled confirmation dialog — replaces native confirm().
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 * 
 * Usage:  if (!(await confirmDialog('Delete this record?'))) return;
 * 
 * @param {string} message - The confirmation message to display
 * @param {object} [opts] - Options: { title, confirmText, cancelText, danger }
 * @returns {Promise<boolean>}
 */
export function confirmDialog(message, opts = {}) {
  const {
    title = 'Confirm Action',
    confirmText = 'Yes, Delete',
    cancelText = 'Cancel',
    danger = true,
  } = opts;

  return new Promise((resolve) => {
    // Prevent duplicates
    const existing = document.getElementById('gcc-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gcc-confirm-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.12s ease-out;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--card, #fff); color: var(--foreground, #111);
      border: 1px solid var(--border, #e2e2e2);
      border-radius: 10px; padding: 1.5rem 1.75rem;
      min-width: 340px; max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      animation: slideUp 0.15s ease-out;
    `;

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;">
        <div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: ${danger ? 'var(--danger, #e53e3e)' : 'var(--primary, #3b82f6)'};
          opacity: 0.12; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        "></div>
        <div style="
          position: relative; left: -42px; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
               stroke="${danger ? 'var(--danger, #e53e3e)' : 'var(--primary, #3b82f6)'}" 
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${danger 
              ? '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'
              : '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'
            }
          </svg>
        </div>
        <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0 0 0 -36px;">${escapeHtml(title)}</h3>
      </div>
      <p style="font-size: 0.825rem; color: var(--muted-foreground, #666); margin: 0 0 1.25rem 0; line-height: 1.5;">
        ${escapeHtml(message)}
      </p>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
        <button id="gcc-confirm-cancel" style="
          height: 34px; padding: 0 1rem; font-size: 0.8rem; font-weight: 600;
          border: 1px solid var(--border, #ddd); border-radius: 6px;
          background: var(--background, #fff); color: var(--foreground, #333);
          cursor: pointer; transition: all 0.15s;
        ">${escapeHtml(cancelText)}</button>
        <button id="gcc-confirm-ok" style="
          height: 34px; padding: 0 1rem; font-size: 0.8rem; font-weight: 600;
          border: none; border-radius: 6px;
          background: ${danger ? 'var(--danger, #e53e3e)' : 'var(--primary, #3b82f6)'};
          color: #fff; cursor: pointer; transition: all 0.15s;
        ">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Focus the cancel button by default (safer)
    const cancelBtn = document.getElementById('gcc-confirm-cancel');
    const okBtn = document.getElementById('gcc-confirm-ok');
    cancelBtn.focus();

    function cleanup(result) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.1s';
      setTimeout(() => overlay.remove(), 100);
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => cleanup(false));
    okBtn.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', handler); }
      if (e.key === 'Enter') { cleanup(true); document.removeEventListener('keydown', handler); }
    });
  });
}

export { VirtualList } from './virtual-list.js';
