/**
 * Payments View — List + Create/Edit form with bill allocation and outstanding auto-fills
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { clientCache } from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';
import { autocomp } from '../vendor/autocomp.js';


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

    const totalAmount = data.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0);
    const footerHtml = `
      <tfoot>
        <tr style="font-weight: bold; background: var(--faint);">
          <td colspan="2">Total</td>
          <td style="text-align: right;" class="mono">${formatCurrency(totalAmount)}</td>
          <td></td>
        </tr>
      </tfoot>
    `;

    app.innerHTML = `
      ${PageHeader({ title: 'Payments', actions: `
        <button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button>
        <button class="secondary" id="btn-export-payments" style="margin-right:0.5rem">${Icons.download} Export Excel</button>
        <a href="/payments/new" data-route><button class="primary">${Icons.plus} New Payment</button></a>
      ` })}
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
        rows: renderRows(data),
        footer: footerHtml
      })}
    `;

    document.getElementById('btn-export-payments')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/payments/export', 'payments'));
    });

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
            <label for="billSearch">Allocate to Outstanding Bill *</label>
            <input type="text" id="billSearch" placeholder="-- Search Party First --" style="width: 100%;" required readonly>
            <input type="hidden" id="billId" name="billId" value="${allocatedBillId}" required>
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

  let activePartyBills = [];

  const loadPartyBills = async (partyId, selectedBillId = null) => {
    const billSearch = document.getElementById('billSearch');
    const billIdInput = document.getElementById('billId');
    if (!billSearch || !billIdInput) return;
    
    billSearch.placeholder = 'Loading outstanding bills...';
    billSearch.readOnly = true;
    
    try {
      const billsList = clientCache.get('/bills') || await api.get('/bills');
      activePartyBills = billsList.filter(b => {
        const isTarget = b.partyId === partyId;
        const hasBalance = parseFloat(b.balanceAmount || '0') > 0;
        const isCurrent = selectedBillId && String(b.id) === String(selectedBillId);
        return isTarget && (hasBalance || isCurrent);
      });
      
      if (activePartyBills.length === 0) {
        billSearch.placeholder = 'No outstanding bills found for this party';
        billSearch.value = '';
        billIdInput.value = '';
        return;
      }
      
      billSearch.placeholder = 'Type to search outstanding bills...';
      billSearch.readOnly = false;
      
      if (selectedBillId) {
        const matchedBill = activePartyBills.find(b => String(b.id) === String(selectedBillId));
        if (matchedBill) {
          billSearch.value = `Bill #${matchedBill.billNo} - Date: ${formatDate(matchedBill.billDate)} - Balance: ₹${matchedBill.balanceAmount}`;
          billIdInput.value = selectedBillId;
        }
      } else {
        billSearch.value = '';
        billIdInput.value = '';
      }
    } catch (err) {
      billSearch.placeholder = 'Error loading bills';
      console.error(err);
    }
  };

  // Party autocomplete with auto-fill outstanding bills callback
  attachPartyAutocomp('partySearch', (name, party) => {
    if (party) {
      loadPartyBills(party.id);
    } else {
      activePartyBills = [];
      const bs = document.getElementById('billSearch');
      const bi = document.getElementById('billId');
      if (bs) {
        bs.placeholder = '-- Search Party First --';
        bs.value = '';
        bs.readOnly = true;
      }
      if (bi) {
        bi.value = '';
      }
    }
  });

  const billSearch = document.getElementById('billSearch');
  const billIdInput = document.getElementById('billId');
  const amountInput = document.getElementById('amount');

  if (billSearch) {
    autocomp(billSearch, {
      onQuery: async (val) => {
        if (!val || val.trim() === '') return [];
        const q = val.toLowerCase();
        const matches = activePartyBills.filter(b => {
          return String(b.billNo).toLowerCase().includes(q) || 
                 formatDate(b.billDate).toLowerCase().includes(q) ||
                 String(b.balanceAmount).includes(q);
        });
        billSearch._matches = matches;
        return matches.map(b => `Bill #${b.billNo} - Date: ${formatDate(b.billDate)} - Balance: ₹${b.balanceAmount}`);
      },
      onSelect: (val) => {
        let matched = null;
        if (billSearch._matches) {
          matched = billSearch._matches.find(b => {
            const label = `Bill #${b.billNo} - Date: ${formatDate(b.billDate)} - Balance: ₹${b.balanceAmount}`;
            return label === val;
          });
        }
        if (matched) {
          billIdInput.value = matched.id;
          if (amountInput && !amountInput.value.trim()) {
            amountInput.value = parseFloat(matched.balanceAmount).toFixed(2);
          }
          const displayVal = `Bill #${matched.billNo} - Date: ${formatDate(matched.billDate)} - Balance: ₹${matched.balanceAmount}`;
          billSearch.value = displayVal;
          return displayVal;
        }
        return val;
      }
    });

    billSearch.addEventListener('input', (e) => {
      if (!e.target.value.trim()) {
        billIdInput.value = '';
      }
    });
  }

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
