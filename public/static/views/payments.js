/**
 * Payments View — List + Create/Edit form
 * 
 * Payment form has party autocomplete. When a party is selected,
 * their outstanding bills are listed for allocation.
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderPaymentList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get(`/payments?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;

    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">${c.receiptNo || '-'}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${formatDate(c.paymentDate)}</div>
        </td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.partyName || '')}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Type: ${c.paymentType}</div>
        </td>
        <td>${escapeHtml(c.bankName || 'Cash')}</td>
        <td style="text-align:right" class="mono">${formatCurrency(c.amount)}</td>
        <td style="text-align:right">
          <a href="/payments/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Payments', actions: `<a href="/payments/new" data-route><button class="primary">${Icons.plus} New Receipt</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem">
        <div class="form-group" style="margin:0; flex:1; max-width:300px; position:relative">
          <input type="text" id="search-payments" placeholder="Search payments..." style="padding-left:2rem; width:100%">
          <div style="position:absolute; left:0.6rem; top:0.5rem; color:var(--muted-foreground)">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'payments-table',
        count: data.length,
        headers: [ { label: 'Receipt & Date' }, { label: 'Party' }, { label: 'Bank' }, { label: 'Amount', align: 'right' }, { label: '', align: 'right' } ],
        rows: renderRows(data),
        pagination: { page, hasMore, route: '/payments' }
      })}
    `;
    
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-payments', document.querySelector('#payments-table tbody'), data, renderRows);
    });
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Payments' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderPaymentForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let payment = {};
  if (isEdit) { try { payment = await api.get(`/payments/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; } }

  app.innerHTML = `
    ${PageHeader({ title: isEdit ? 'Edit Payment' : 'New Payment', backHref: '/payments' })}
    <div class="table-container" style="padding:1.5rem">
      <form id="payment-form">
        <div class="form-grid">
          ${FormGroup({ id: 'partySearch', label: 'Party', value: payment.partyName || '', placeholder: 'Start typing to search...', required: !isEdit })}
          ${FormGroup({ id: 'billId', label: 'Bill ID', value: payment.allocations?.[0]?.billId || '', type: 'number', required: true })}
          ${FormGroup({ id: 'paymentDate', label: 'Payment Date', value: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
          ${FormGroup({ id: 'amount', label: 'Amount (₹)', value: payment.amount || '', type: 'number', required: true })}
          ${FormGroup({ id: 'instrumentType', label: 'Payment Method', value: payment.instrumentType || '', type: 'select', options: [{ value: 'CASH', label: 'Cash' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'RTGS', label: 'RTGS/NEFT' }, { value: 'UPI', label: 'UPI' }] })}
          ${FormGroup({ id: 'instrumentNo', label: 'Reference No.', value: payment.instrumentNo || '' })}
          ${FormGroup({ id: 'depositedBank', label: 'Deposited Bank', value: payment.depositedBank || '' })}
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Payment</button>
          ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
          <a href="/payments" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Party autocomplete (helps user find the right party before entering bill ID)
  attachPartyAutocomp('partySearch');

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const fd = collectFormData('payment-form');
    // Remove the search-only field
    delete fd.partySearch;

    try {
      if (isEdit) { await api.put(`/payments/${id}`, fd); showToast('Payment updated'); }
      else { await api.post('/payments', fd); showToast('Payment recorded & bill balance updated'); }
      
      await api.get('/payments?page=1&limit=50', { forceRefresh: true });
      window.history.pushState({}, '', '/payments'); window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });

  if (isEdit) {
    document.getElementById('btn-delete').addEventListener('click', async (e) => {
      if (!confirm('Are you sure you want to delete this payment?')) return;
      const btn = e.target.closest('button');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
      try {
        await api.del(`/payments/${id}`);
        await api.get('/payments?page=1&limit=50', { forceRefresh: true });
        window.history.pushState({}, '', '/payments');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        alert(err.message);
      }
    });
  }
}
