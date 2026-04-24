/**
 * Deliveries View — List + Create/Edit form
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderDeliveryList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get(`/deliveries?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;

    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">Disp #${c.dispatchNo}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Sauda: ${c.saudaNo}</div>
        </td>
        <td>${formatDate(c.dispatchDate)}</td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.transporterName || '-')}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">LR: ${c.lrNo || '-'}</div>
        </td>
        <td style="text-align:center">${Badge(c.status || 'PENDING', c.status === 'DELIVERED' ? 'active' : 'draft')}</td>
        <td style="text-align:right">
          <a href="/deliveries/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Deliveries', actions: `<a href="/deliveries/new" data-route><button class="primary">${Icons.plus} New Delivery</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-deliveries" placeholder="Search deliveries..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'deliveries-table',
        count: data.length,
        headers: [ { label: 'Reference' }, { label: 'Date' }, { label: 'Transport' }, { label: 'Status', style: 'text-align:center' }, { label: '', style: 'text-align:right' } ],
        rows: renderRows(data)
      })}
    `;

    if (hasMore) {
      const loadMore = document.createElement('div');
      loadMore.innerHTML = `<div style="text-align:center;margin-top:1rem"><a href="/deliveries?page=${page + 1}" data-route><button class="secondary">Load More</button></a></div>`;
      app.appendChild(loadMore);
    }
    
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-deliveries', document.querySelector('#deliveries-table tbody'), data, renderRows, '/deliveries');
    });
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Deliveries' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderDeliveryForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let delivery = {};
  if (isEdit) {
    try { delivery = await api.get(`/deliveries/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; }
  }

  const line = delivery.lines?.[0] || {};
  app.innerHTML = `
    ${PageHeader({ title: isEdit ? 'Edit Delivery' : 'New Delivery', backHref: '/deliveries' })}
    <div class="table-container" style="padding:1.5rem">
      <form id="delivery-form">
        <div class="form-grid">
          ${FormGroup({ id: 'dispatchDate', label: 'Dispatch Date', value: delivery.dispatchDate ? new Date(delivery.dispatchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
          ${FormGroup({ id: 'truckNo', label: 'Truck No.', value: delivery.truckNo || '' })}
          ${FormGroup({ id: 'transporterName', label: 'Transporter', value: delivery.transporterName || '', placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'contractLineId', label: 'Contract Line ID', value: line.contractLineId || '', type: 'number', required: true })}
          ${FormGroup({ id: 'dispatchedWeight', label: 'Dispatched Weight', value: line.dispatchedWeight || '', type: 'number', required: true })}
          ${FormGroup({ id: 'dispatchedBags', label: 'Dispatched Bags', value: line.dispatchedBags || '', type: 'number' })}
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Delivery</button>
          ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
          <a href="/deliveries" data-route><button type="button" class="secondary">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach party autocomplete on transporter name
  attachPartyAutocomp('transporterName');

  document.getElementById('delivery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const fd = collectFormData('delivery-form');
    try {
      if (isEdit) { await api.put(`/deliveries/${id}`, fd); showToast('Delivery updated'); }
      else { await api.post('/deliveries', fd); showToast('Delivery created'); }
      
      await api.get('/deliveries?page=1&limit=50', { forceRefresh: true });
      window.history.pushState({}, '', '/deliveries');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });

  if (isEdit) {
    document.getElementById('btn-delete').addEventListener('click', async (e) => {
      if (!confirm('Are you sure you want to delete this delivery?')) return;
      const btn = e.target.closest('button');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
      try {
        await api.del(`/deliveries/${id}`);
        await api.get('/deliveries?page=1&limit=50', { forceRefresh: true });
        window.history.pushState({}, '', '/deliveries');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        alert(err.message);
      }
    });
  }
}
