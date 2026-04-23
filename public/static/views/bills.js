/**
 * Bills View — List + Create/Edit form with ledger posting
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderBillList() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  try {
    const data = await api.get('/bills');
    const rows = data.map(b => `
      <tr>
        <td><span style="font-weight:700">${escapeHtml(b.billNo)}</span><div style="font-size:0.6875rem;color:var(--muted-foreground)">${formatDate(b.billDate)}</div></td>
        <td>${escapeHtml(b.partyName || '-')}</td>
        <td>${escapeHtml(b.basis || '-')}</td>
        <td style="text-align:right" class="mono">${formatCurrency(b.totalAmount)}</td>
        <td style="text-align:right;font-weight:700;color:${Number(b.balanceAmount) > 0 ? 'var(--warning)' : 'var(--success)'}" class="mono">${formatCurrency(b.balanceAmount)}</td>
        <td style="text-align:right"><a href="/bills/${b.id}" data-route><button class="small">${Icons.edit} Edit</button></a></td>
      </tr>
    `);
    app.innerHTML = `
      ${PageHeader({ title: 'Bills', subtitle: 'Invoice register', actions: `<a href="/bills/new" data-route><button class="primary">${Icons.plus} New Bill</button></a>` })}
      ${DataTable({ id: 'bills-table', title: 'Bill Register', count: data.length,
        headers: [{ label: 'Bill No.' }, { label: 'Party' }, { label: 'Basis' }, { label: 'Amount', align: 'right' }, { label: 'Balance', align: 'right' }, { label: '', align: 'right' }],
        rows })}
    `;
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Bills' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderBillForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let bill = {};
  if (isEdit) { app.innerHTML = Spinner(); try { bill = await api.get(`/bills/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; } }

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
          <a href="/bills" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach party autocomplete
  attachPartyAutocomp('partyName');

  document.getElementById('bill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = collectFormData('bill-form');
    try {
      if (isEdit) { await api.put(`/bills/${id}`, fd); showToast('Bill updated'); }
      else { await api.post('/bills', fd); showToast('Bill created & posted to ledger'); }
      window.history.pushState({}, '', '/bills'); window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) { showToast(err.message, 'error'); }
  });
}
