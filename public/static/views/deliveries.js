/**
 * Deliveries View — List + Create/Edit form
 * 
 * WS2: Loading Days column, Bill No column, unified Lorry/Truck label
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

/** Compute days between two dates */
function daysBetween(d1, d2) {
  if (!d1 || !d2) return '-';
  const a = new Date(d1);
  const b = new Date(d2);
  const diff = Math.abs(b - a);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function renderDeliveryList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get('/deliveries');

    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">Disp #${c.dispatchNo || c.id}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Sauda: ${c.saudaNo || '-'}</div>
        </td>
        <td>${formatDate(c.dispatchDate)}</td>
        <td style="font-weight:500">${escapeHtml(c.truckNo || '-')}</td>
        <td>${escapeHtml(c.billNo || '-')}</td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.transporterName || '-')}</div>
        </td>
        <td style="text-align:center;font-weight:600;color:var(--primary)">${daysBetween(c.saudaDate, c.dispatchDate)}</td>
        <td style="text-align:center">${Badge(c.status || 'PENDING', c.status === 'DELIVERED' ? 'active' : 'draft')}</td>
        <td style="text-align:right">
          <a href="/deliveries/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Deliveries', actions: `<button class="secondary" id="export-deliveries-btn" style="margin-right:0.5rem">📥 Export Excel</button><a href="/deliveries/new" data-route><button class="primary">${Icons.plus} New Delivery</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-deliveries" placeholder="Search deliveries..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'deliveries-table',
        count: data.length,
        headers: [
          { label: 'Reference' },
          { label: 'Date' },
          { label: 'Lorry/Truck No.' },
          { label: 'Bill No.' },
          { label: 'Transport' },
          { label: 'Loading Days', style: 'text-align:center' },
          { label: 'Status', style: 'text-align:center' },
          { label: '', style: 'text-align:right' }
        ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-deliveries', document.querySelector('#deliveries-table tbody'), data, renderRows);
    });

    // Export button handler
    document.getElementById('export-deliveries-btn')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/deliveries/export', 'deliveries'));
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
          ${FormGroup({ id: 'truckNo', label: 'Lorry/Truck No.', value: delivery.truckNo || '' })}
          ${FormGroup({ id: 'billNo', label: 'Bill No.', value: delivery.billNo || '', placeholder: 'Seller bill number' })}
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
