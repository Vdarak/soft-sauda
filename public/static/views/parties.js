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

    const renderRows = (items) => items.map(p => `
      <tr>
        <td>
          <div style="font-weight:600">${escapeHtml(p.name)}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${escapeHtml(p.city || p.place || 'No location')}</div>
        </td>
        <td>${escapeHtml(p.contactName || p.phone || '-')}</td>
        <td>${Badge(p.isActive ? 'Active' : 'Inactive', p.isActive ? 'active' : 'inactive')}</td>
        <td style="text-align:right">
          <a href="/parties/${p.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Party Master', actions: `<a href="/parties/new" data-route><button class="primary">${Icons.plus} New Party</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-parties" placeholder="Search parties..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'parties-table',
        count: data.length,
        headers: [ { label: 'Party Details' }, { label: 'Contact' }, { label: 'Status' }, { label: '', style: 'text-align:right' } ],
        rows: renderRows(data)
      })}
    `;

    if (hasMore) {
      const loadMore = document.createElement('div');
      loadMore.innerHTML = `<div style="text-align:center;margin-top:1rem"><a href="/parties?page=${page + 1}" data-route><button class="secondary">Load More</button></a></div>`;
      app.appendChild(loadMore);
    }
    
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-parties', document.querySelector('#parties-table tbody'), data, renderRows, '/parties');
    });
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
          ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
          <a href="/parties" data-route><button type="button" class="secondary">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Bind form submit
  document.getElementById('party-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const formData = collectFormData('party-form');

    try {
      if (isEdit) {
        await api.put(`/parties/${id}`, formData);
        showToast('Party updated successfully');
      } else {
        await api.post('/parties', formData);
        showToast('Party created successfully');
      }
      
      await api.get('/parties?page=1&limit=50', { forceRefresh: true });
      window.history.pushState({}, '', '/parties');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });

  if (isEdit) {
    document.getElementById('btn-delete').addEventListener('click', async (e) => {
      if (!confirm('Are you sure you want to delete this party?')) return;
      const btn = e.target.closest('button');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
      try {
        await api.del(`/parties/${id}`);
        await api.get('/parties?page=1&limit=50', { forceRefresh: true });
        window.history.pushState({}, '', '/parties');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        alert(err.message);
      }
    });
  }
}
