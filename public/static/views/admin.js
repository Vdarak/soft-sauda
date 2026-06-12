/**
 * Admin Panel Views — User Management (CRUD) and Audit Log Viewer
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate } from '../components/ui.js';
import * as api from '../lib/api.js';

// Format audit changes detail to a readable text or list
function renderAuditChanges(changes) {
  if (!changes) return '-';
  try {
    return Object.entries(changes)
      .map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}`)
      .join(', ');
  } catch {
    return escapeHtml(JSON.stringify(changes));
  }
}

// Format date with time for audit logs
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * USER MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────── */

export async function renderUserList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/users');
    const companies = JSON.parse(localStorage.getItem('ss_companies') || '[]');

    const renderRows = (items) => items.map(u => {
      // Map company ids to company names
      const companyNames = (u.companyIds || [])
        .map(cid => companies.find(c => c.id === cid)?.name || `ID ${cid}`)
        .join(', ') || 'None';

      const userRole = u.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

      return `
        <tr>
          <td>
            <div style="font-weight:600">${escapeHtml(u.username)}</div>
            <div style="font-size:0.6875rem;color:var(--muted-foreground)">ID: #${u.id}</div>
          </td>
          <td>${escapeHtml(u.displayName || '-')}</td>
          <td>
            <span class="badge ${u.role === 'ADMIN' ? 'badge-active' : 'badge-inactive'}">${userRole}</span>
          </td>
          <td style="font-size: 0.75rem;">${escapeHtml(companyNames)}</td>
          <td>${Badge(u.isActive ? 'Active' : 'Inactive', u.isActive ? 'active' : 'draft')}</td>
          <td>${u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</td>
          <td style="text-align:right" onclick="event.stopPropagation()">
            <div style="display:inline-flex; gap:0.25rem; justify-content:flex-end;">
              <a href="/admin/users/${u.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
              ${u.id !== 1 ? `<button class="small danger delete-user-row-btn" data-id="${u.id}">${Icons.trash}</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    app.innerHTML = `
      ${PageHeader({
        title: 'User Management',
        subtitle: 'Configure application users, roles, and company access privileges',
        actions: `<a href="/admin/users/new" data-route><button class="primary">${Icons.plus} New User</button></a>`
      })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-users" placeholder="Search users by name, role or company..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'users-table',
        count: data.length,
        headers: [
          { label: 'Username' },
          { label: 'Display Name' },
          { label: 'Role' },
          { label: 'Company Access' },
          { label: 'Status' },
          { label: 'Last Login' },
          { label: 'Actions', style: 'text-align:right; width: 120px' }
        ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-users', document.querySelector('#users-table tbody'), data, renderRows);
    });

    // Delete user handler
    app.querySelectorAll('.delete-user-row-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
          await api.del(`/users/${id}`);
          showToast('User deleted successfully');
          renderUserList(ctx);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'User Management' })}<div class="alert danger">${err.message}</div>`;
  }
}

export async function renderUserForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  app.innerHTML = Spinner();

  try {
    const allCompanies = JSON.parse(localStorage.getItem('ss_companies') || '[]');
    let user = { companyIds: [], isActive: true, role: 'EMPLOYEE' };

    if (isEdit) {
      user = await api.get(`/users/${id}`);
    }

    const companyCheckboxes = allCompanies.map(c => `
      <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; font-size:0.875rem; cursor:pointer;">
        <input type="checkbox" name="companyIds" value="${c.id}" ${(user.companyIds || []).includes(c.id) ? 'checked' : ''}>
        ${escapeHtml(c.name)} (${c.shortCode})
      </label>
    `).join('');

    app.innerHTML = `
      <div class="table-container" style="background: var(--card); padding: 1.5rem; max-width: 600px; margin: 2rem auto;">
        ${PageHeader({
          title: isEdit ? 'Edit User Details' : 'Create User Account',
          backHref: '/admin/users'
        })}

        <form id="user-form" style="margin-top: 1.5rem;">
          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${FormGroup({
              id: 'username',
              label: 'Username',
              value: user.username || '',
              required: true,
              placeholder: 'e.g. jsmith (alphanumeric)'
            })}

            <div class="form-group">
              <label for="password">Password ${isEdit ? '(leave blank to keep current)' : '*'}</label>
              <input type="password" id="password" name="password" ${isEdit ? '' : 'required'} placeholder="${isEdit ? '••••••••' : 'Enter account password'}">
            </div>

            ${FormGroup({
              id: 'displayName',
              label: 'Display Name',
              value: user.displayName || '',
              required: true,
              placeholder: 'e.g. John Smith'
            })}

            ${FormGroup({
              id: 'role',
              label: 'Role Privilege',
              type: 'select',
              value: user.role,
              required: true,
              options: [
                { value: 'EMPLOYEE', label: 'Employee (CRUD with Audit hidden)' },
                { value: 'ADMIN', label: 'Administrator (Full Access)' }
              ]
            })}

            <div class="form-group">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" name="isActive" id="isActive" ${user.isActive ? 'checked' : ''}>
                Is Active Account
              </label>
            </div>

            <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
              <label style="font-weight: 600; margin-bottom: 0.75rem; display: block;">Granted Divisions (Companies)</label>
              <div style="background: var(--background); padding: 0.75rem 1rem; border-radius: 0.375rem; border: 1px solid var(--border);">
                ${companyCheckboxes}
              </div>
              <p style="font-size:0.75rem; color:var(--muted-foreground); margin-top:0.5rem;">Admins automatically bypass this restriction and have access to all divisions.</p>
            </div>

            <div class="form-actions" style="margin-top: 1rem;">
              <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} User</button>
              <a href="/admin/users" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </div>
        </form>
      </div>
    `;

    // Submit handler
    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving…';

      // Gather company access checks
      const checkedCompanies = Array.from(e.target.querySelectorAll('input[name="companyIds"]:checked'))
        .map(input => parseInt(input.value, 10));

      const payload = {
        username: document.getElementById('username').value.trim(),
        displayName: document.getElementById('displayName').value.trim(),
        role: document.getElementById('role').value,
        isActive: document.getElementById('isActive').checked,
        companyIds: checkedCompanies,
      };

      const pwd = document.getElementById('password').value;
      if (pwd && pwd.trim() !== '') {
        payload.password = pwd;
      }

      try {
        if (isEdit) {
          await api.put(`/users/${id}`, payload);
          showToast('User account updated');
        } else {
          await api.post('/users', payload);
          showToast('User account created');
        }

        window.history.pushState({}, '', '/admin/users');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to load user form: ${err.message}</div>`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AUDIT LOG VIEWER
 * ─────────────────────────────────────────────────────────────────────────── */

export async function renderAuditLogs(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/audit-logs');

    const renderRows = (items) => items.map(log => {
      const userStr = log.displayName ? `${escapeHtml(log.displayName)} (@${escapeHtml(log.username)})` : `@${escapeHtml(log.username || 'unknown')}`;
      const actionClass = log.action === 'CREATE' ? 'badge-active' : log.action === 'UPDATE' ? 'badge-inactive' : 'badge-draft';

      return `
        <tr>
          <td><span class="badge badge-inactive">#${log.id}</span></td>
          <td>${userStr}</td>
          <td>
            <span class="badge ${actionClass}">${log.action}</span>
          </td>
          <td><strong>${escapeHtml(log.entityType.toUpperCase())}</strong></td>
          <td>${log.entityId ? `#${log.entityId}` : '-'}</td>
          <td style="font-size:0.75rem; max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(JSON.stringify(log.changes || {}))}">
            ${renderAuditChanges(log.changes)}
          </td>
          <td>${log.companyName ? escapeHtml(log.companyName) : '<span style="color:var(--muted-foreground)">System (Global)</span>'}</td>
          <td class="mono" style="font-size:0.75rem">${formatDateTime(log.createdAt)}</td>
          <td>${escapeHtml(log.ipAddress || '-')}</td>
        </tr>
      `;
    });

    app.innerHTML = `
      ${PageHeader({
        title: 'Audit Log Trail',
        subtitle: 'System activities, data modifications, and security log entries (Last 200 operations)',
        actions: `<button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print Trail</button><button class="secondary" id="export-audit-btn">${Icons.download} Export Trail</button>`
      })}
      
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-audit" placeholder="Search audit trails by user, action, division or records..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>

      ${DataTable({
        id: 'audit-table',
        count: data.length,
        headers: [
          { label: 'Log ID' },
          { label: 'Operator User' },
          { label: 'Action' },
          { label: 'Record Domain' },
          { label: 'Record ID' },
          { label: 'Audit Details (Modifications)' },
          { label: 'Division Context' },
          { label: 'Date & Time' },
          { label: 'IP Address' }
        ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-audit', document.querySelector('#audit-table tbody'), data, renderRows);
    });

    document.getElementById('export-audit-btn')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/audit-logs', 'audit_logs_trail'));
    });

  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Audit Trail' })}<div class="alert danger">${err.message}</div>`;
  }
}
