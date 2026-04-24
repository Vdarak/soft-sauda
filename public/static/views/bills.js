/**
 * Bills View — List + Create/Edit form with ledger posting
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderBillList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get(`/bills?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;
    
    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">${c.billNo}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${formatDate(c.billDate)}</div>
        </td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.partyName)}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Basis: ${c.billBasis}</div>
        </td>
        <td style="text-align:right" class="mono">${formatCurrency(c.totalAmount)}</td>
        <td style="text-align:right">
          <a href="/bills/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Bills', actions: `<a href="/bills/new" data-route><button class="primary">${Icons.plus} New Bill</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem">
        <div class="form-group" style="margin:0; flex:1; max-width:300px; position:relative">
          <input type="text" id="search-bills" placeholder="Search bills..." style="padding-left:2rem; width:100%">
          <div style="position:absolute; left:0.6rem; top:0.5rem; color:var(--muted-foreground)">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'bills-table',
        count: data.length,
        headers: [ { label: 'Bill No & Date' }, { label: 'Party & Basis' }, { label: 'Amount', align: 'right' }, { label: '', align: 'right' } ],
        rows: renderRows(data),
        pagination: { page, hasMore, route: '/bills' }
      })}
    `;
    
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-bills', document.querySelector('#bills-table tbody'), data, renderRows);
    });
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Bills' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderBillForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let bill = {};
  if (isEdit) { try { bill = await api.get(`/bills/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; } }

  app.innerHTML = `
    ${PageHeader({ title: isEdit ? `Edit Bill: ${bill.billNo}` : 'New Bill', backHref: '/bills' })}
    <div class="table-container" style="padding:1.5rem">
      <form id="bill-form">
        <div class="form-grid">
          ${FormGroup({ id: 'billNo', label: 'Bill Number', value: bill.billNo || '', required: true })}
          ${FormGroup({ id: 'billDate', label: 'Bill Date', value: bill.billDate ? new Date(bill.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
          ${FormGroup({ id: 'partyName', label: 'Party', value: bill.partyName || '', required: true, placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'basis', label: 'Basis', value: bill.basis || '', type: 'select', options: [{ value: 'DIRECT', label: 'Direct' }, { value: 'CONTRACT', label: 'Contract' }, { value: 'DELIVERY', label: 'Delivery' }] })}
          ${FormGroup({ id: 'totalAmount', label: 'Total Amount (₹)', value: bill.totalAmount || '', type: 'number', required: true })}
          ${FormGroup({ id: 'creditDays', label: 'Credit Days', value: bill.creditDays || '', type: 'number' })}
          ${FormGroup({ id: 'description', label: 'Description', value: bill.lines?.[0]?.description || '', type: 'textarea' })}
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Bill</button>
          ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
          <a href="/bills" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach party autocomplete
  attachPartyAutocomp('partyName');

  document.getElementById('bill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const fd = collectFormData('bill-form');
    try {
      if (isEdit) { await api.put(`/bills/${id}`, fd); showToast('Bill updated'); }
      else { await api.post('/bills', fd); showToast('Bill created & posted to ledger'); }
      
      await api.get('/bills?page=1&limit=50', { forceRefresh: true });
      window.history.pushState({}, '', '/bills'); window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });

  if (isEdit) {
    document.getElementById('btn-delete').addEventListener('click', async (e) => {
      if (!confirm('Are you sure you want to delete this bill?')) return;
      const btn = e.target.closest('button');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
      try {
        await api.del(`/bills/${id}`);
        await api.get('/bills?page=1&limit=50', { forceRefresh: true });
        window.history.pushState({}, '', '/bills');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        alert(err.message);
      }
    });
  }
}
