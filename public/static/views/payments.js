/**
 * Payments View — List + Create/Edit form with bill allocation and outstanding auto-fills
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { clientCache } from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderPaymentList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get('/payments');
    
    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">Ref #${c.id}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${formatDate(c.paymentDate)}</div>
        </td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.partyName || 'Unknown')}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Method: ${c.instrumentType} ${c.instrumentNo ? `(${c.instrumentNo})` : ''}</div>
        </td>
        <td style="text-align:right" class="mono">${formatCurrency(c.amount)}</td>
        <td style="text-align:right">
          <a href="/payments/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Payments', actions: `<a href="/payments/new" data-route><button class="primary">${Icons.plus} New Payment</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-payments" placeholder="Search payments..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'payments-table',
        count: data.length,
        headers: [ { label: 'Reference & Date' }, { label: 'Party & Method' }, { label: 'Amount', style: 'text-align:right' }, { label: '', style: 'text-align:right' } ],
        rows: renderRows(data)
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
  if (isEdit) {
    try {
      payment = await api.get(`/payments/${id}`);
    } catch (err) {
      app.innerHTML = `<div class="alert danger">${err.message}</div>`;
      return;
    }
  }

  const allocatedBillId = payment.allocations?.[0]?.billId || '';

  app.innerHTML = `
    ${PageHeader({ title: isEdit ? 'Edit Payment' : 'New Payment', backHref: '/payments' })}
    <div class="table-container" style="padding:1.5rem">
      <form id="payment-form">
        <div class="form-grid">
          ${FormGroup({ id: 'partySearch', label: 'Party', value: payment.partyName || '', placeholder: 'Start typing to search...', required: !isEdit })}
          
          <div class="form-group">
            <label for="billId">Allocate to Outstanding Bill *</label>
            <select id="billId" name="billId" style="width: 100%;" required>
              <option value="">-- Search Party First --</option>
            </select>
          </div>

          ${FormGroup({ id: 'paymentDate', label: 'Payment Date', value: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
          ${FormGroup({ id: 'amount', label: 'Amount (₹)', value: payment.amount || '', type: 'number', required: true })}
          ${FormGroup({ id: 'instrumentType', label: 'Payment Method', value: payment.instrumentType || '', type: 'select', options: [{ value: 'CASH', label: 'Cash' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'RTGS', label: 'RTGS/NEFT' }, { value: 'UPI', label: 'UPI' }] })}
          ${FormGroup({ id: 'instrumentNo', label: 'Reference No.', value: payment.instrumentNo || '' })}
          ${FormGroup({ id: 'depositedBank', label: 'Deposited Bank', value: payment.depositedBank || '' })}
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Payment</button>
          ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
          <a href="/payments" data-route><button type="button" class="secondary">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  const billSelect = document.getElementById('billId');

  const loadPartyBills = async (partyId, selectedBillId = null) => {
    if (!billSelect) return;
    billSelect.innerHTML = '<option value="">Loading outstanding bills...</option>';
    
    try {
      const billsList = clientCache.get('/bills') || await api.get('/bills');
      const partyBills = billsList.filter(b => {
        const isTarget = b.partyId === partyId;
        const hasBalance = parseFloat(b.balanceAmount || '0') > 0;
        const isCurrent = selectedBillId && String(b.id) === String(selectedBillId);
        return isTarget && (hasBalance || isCurrent);
      });
      
      if (partyBills.length === 0) {
        billSelect.innerHTML = '<option value="">No outstanding bills found for this party</option>';
        return;
      }
      
      billSelect.innerHTML = '<option value="">-- Select Bill to Allocate --</option>' + 
        partyBills.map(b => {
          const selectedAttr = (selectedBillId && String(b.id) === String(selectedBillId)) ? 'selected' : '';
          return `<option value="${b.id}" ${selectedAttr}>Bill #${b.billNo} - Date: ${formatDate(b.billDate)} - Balance: ₹${b.balanceAmount}</option>`;
        }).join('');
        
      billSelect._bills = partyBills;
    } catch (err) {
      billSelect.innerHTML = '<option value="">Error loading bills</option>';
      console.error(err);
    }
  };

  // Party autocomplete with auto-fill outstanding bills callback
  attachPartyAutocomp('partySearch', (name, party) => {
    if (party) {
      loadPartyBills(party.id);
    } else {
      billSelect.innerHTML = '<option value="">-- Search Party First --</option>';
    }
  });

  // Autofill amount on select change
  billSelect?.addEventListener('change', (e) => {
    const billId = e.target.value;
    const bills = e.target._bills || [];
    const matchedBill = bills.find(b => String(b.id) === String(billId));
    if (matchedBill) {
      const amountInput = document.getElementById('amount');
      if (amountInput) {
        amountInput.value = parseFloat(matchedBill.balanceAmount).toFixed(2);
      }
    }
  });

  // Load initial bills dropdown in Edit mode
  if (isEdit && payment.partyId) {
    loadPartyBills(payment.partyId, allocatedBillId);
  }

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const fd = collectFormData('payment-form');
    // Remove search-only field
    delete fd.partySearch;

    try {
      if (isEdit) {
        await api.put(`/payments/${id}`, fd);
        showToast('Payment updated');
      } else {
        await api.post('/payments', fd);
        showToast('Payment recorded & bill balance updated');
      }
      
      await api.get('/payments', { forceRefresh: true });
      window.history.pushState({}, '', '/payments');
      window.dispatchEvent(new PopStateEvent('popstate'));
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
        await api.get('/payments', { forceRefresh: true });
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
