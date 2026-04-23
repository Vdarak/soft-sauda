/**
 * Parties View — List + Create/Edit form
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';

/** Render party list */
export async function renderPartyList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get(`/parties?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;

    const rows = data.map(p => `
      <tr>
        <td>
          <div style="font-weight:600">${escapeHtml(p.name)}</div>
          ${p.designation ? `<div style="font-size:0.6875rem;color:var(--muted-foreground)">${escapeHtml(p.designation)}</div>` : ''}
        </td>
        <td>${escapeHtml(p.place || '-')}</td>
        <td>${escapeHtml(p.phone || '-')}</td>
        <td style="text-align:right" class="mono">${p.creditLimit ? `₹ ${Number(p.creditLimit).toLocaleString('en-IN')}` : '-'}</td>
        <td style="text-align:center">${Badge(p.isActive !== false ? 'Active' : 'Inactive', p.isActive !== false ? 'active' : 'inactive')}</td>
        <td style="text-align:right">
          <a href="/parties/${p.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({
        title: 'Party Directory',
        subtitle: 'Manage companies, clients, and brokers',
        actions: `<a href="/parties/new" data-route><button class="primary">${Icons.plus} New Party</button></a>`
      })}
      ${DataTable({
        id: 'parties-table',
        title: 'Registered Parties',
        count: data.length,
        headers: [
          { label: 'Party Name' },
          { label: 'Location' },
          { label: 'Contact' },
          { label: 'Credit Limit', align: 'right' },
          { label: 'Status', align: 'center' },
          { label: '', align: 'right' },
        ],
        rows,
        emptyMessage: 'No parties registered yet. <a href="/parties/new" data-route>Add your first party</a>.',
        pagination: { page, hasMore, route: '/parties' }
      })}
    `;
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Parties' })}<div class="alert danger">${err.message}</div>`;
  }
}

/** Render party form (new or edit) */
export async function renderPartyForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let party = {};

  if (isEdit) {
    app.innerHTML = Spinner();
    try {
      party = await api.get(`/parties/${id}`);
    } catch (err) {
      app.innerHTML = `<div class="alert danger">Failed to load party: ${err.message}</div>`;
      return;
    }
  }

  // Extract tax IDs
  const gstin = party.taxIds?.find(t => t.taxType === 'GSTIN')?.taxValue || '';
  const vatTin = party.taxIds?.find(t => t.taxType === 'VAT_TIN')?.taxValue || '';
  const cstTin = party.taxIds?.find(t => t.taxType === 'CST_TIN')?.taxValue || '';
  const cstNo = party.taxIds?.find(t => t.taxType === 'CST_NO')?.taxValue || '';

  app.innerHTML = `
    ${PageHeader({
      title: isEdit ? `Edit: ${party.name || 'Party'}` : 'New Party',
      subtitle: isEdit ? `Party #${id}` : 'Create a new party record',
      backHref: '/parties'
    })}

    <div class="table-container" style="padding:1.5rem">
      <form id="party-form">
        <h3 style="margin:0 0 1rem;font-size:0.875rem">Basic Information</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'name', label: 'Party Name', value: party.name || '', required: true, placeholder: 'Company / Person name' })}
          ${FormGroup({ id: 'designation', label: 'Designation / Type', value: party.designation || '', placeholder: 'e.g. Buyer, Seller, Broker' })}
          ${FormGroup({ id: 'phone', label: 'Phone', value: party.phone || '', type: 'tel', placeholder: '+91 ...' })}
          ${FormGroup({ id: 'emailIds', label: 'Email', value: party.emailIds || '', type: 'email', placeholder: 'info@example.com' })}
        </div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Address</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'address', label: 'Address', value: party.address || '', placeholder: 'Street address' })}
          ${FormGroup({ id: 'landmark', label: 'Landmark', value: party.landmark || '' })}
          ${FormGroup({ id: 'place', label: 'City / Place', value: party.place || '' })}
          ${FormGroup({ id: 'stateName', label: 'State', value: party.stateName || '' })}
          ${FormGroup({ id: 'pinCode', label: 'PIN Code', value: party.pinCode || '' })}
        </div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Business Details</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'creditLimit', label: 'Credit Limit (₹)', value: party.creditLimit || '', type: 'number' })}
          ${FormGroup({ id: 'mill', label: 'Mill / Factory', value: party.mill || '' })}
          ${FormGroup({ id: 'fax', label: 'Fax', value: party.fax || '' })}
          ${FormGroup({ id: 'smsMobile', label: 'SMS Mobile', value: party.smsMobile || '', type: 'tel' })}
        </div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Tax Information</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'gstin', label: 'GSTIN', value: gstin, placeholder: '22AAAAA0000A1Z5' })}
          ${FormGroup({ id: 'vatTin', label: 'VAT TIN', value: vatTin })}
          ${FormGroup({ id: 'cstTin', label: 'CST TIN', value: cstTin })}
          ${FormGroup({ id: 'cstNo', label: 'CST No.', value: cstNo })}
        </div>

        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update Party' : 'Create Party'}</button>
          <a href="/parties" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Bind form submit
  document.getElementById('party-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = collectFormData('party-form');

    try {
      if (isEdit) {
        await api.put(`/parties/${id}`, formData);
        showToast('Party updated successfully');
      } else {
        await api.post('/parties', formData);
        showToast('Party created successfully');
      }
      window.history.pushState({}, '', '/parties');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
