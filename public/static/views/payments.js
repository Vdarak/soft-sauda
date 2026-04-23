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

    const rows = data.map(p => `
      <tr>
        <td>${formatDate(p.paymentDate)}</td>
        <td style="font-weight:600">${escapeHtml(p.partyName || '-')}</td>
        <td>${escapeHtml(p.instrumentType || '-')}</td>
        <td>${escapeHtml(p.instrumentNo || '-')}</td>
        <td style="text-align:right" class="mono">${formatCurrency(p.amount)}</td>
        <td style="text-align:right"><a href="/payments/${p.id}" data-route><button class="small">${Icons.edit} Edit</button></a></td>
      </tr>
    `);
    app.innerHTML = `
      ${PageHeader({ title: 'Payments', subtitle: 'Payment register', actions: `<a href="/payments/new" data-route><button class="primary">${Icons.plus} New Payment</button></a>` })}
      ${DataTable({ id: 'payments-table', title: 'Payments', count: data.length,
        headers: [{ label: 'Date' }, { label: 'Party' }, { label: 'Method' }, { label: 'Ref No.' }, { label: 'Amount', align: 'right' }, { label: '', align: 'right' }],
        rows,
        pagination: { page, hasMore, route: '/payments' }
      })}
    `;
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Payments' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderPaymentForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let payment = {};
  if (isEdit) { app.innerHTML = Spinner(); try { payment = await api.get(`/payments/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; } }

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
          <a href="/payments" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Party autocomplete (helps user find the right party before entering bill ID)
  attachPartyAutocomp('partySearch');

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = collectFormData('payment-form');
    // Remove the search-only field
    delete fd.partySearch;

    try {
      if (isEdit) { await api.put(`/payments/${id}`, fd); showToast('Payment updated'); }
      else { await api.post('/payments', fd); showToast('Payment recorded & bill balance updated'); }
      window.history.pushState({}, '', '/payments'); window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) { showToast(err.message, 'error'); }
  });
}
