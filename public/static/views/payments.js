/**
 * Payments View (Single-Viewport Compact Paper Form Design)
 * Left Pane: Searchable Payment Voucher List
 * Right Pane: 100% Viewport Fit Multi-Column Voucher Form
 */
import { Icons, Spinner, showToast, escapeHtml, formatDate, formatCurrency, AuditMetadataBlock } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderPaymentList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const allPayments = await api.get('/payments');
    renderPaymentForm(null, allPayments);
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load payments'}</div>`;
  }
}

export async function renderPaymentForm(id = null, preloadedList = null) {
  const app = document.getElementById('app');
  const isEdit = !!id;

  let allPayments = preloadedList || [];
  if (allPayments.length === 0) {
    try {
      allPayments = await api.get('/payments');
    } catch (e) {
      console.warn('Failed to load payments list', e);
    }
  }

  let payment = {};
  if (isEdit) {
    try {
      payment = await api.get(`/payments/${id}`);
    } catch (err) {
      showToast(err.message || 'Failed to load payment record', 'error');
    }
  }

  const allocatedBillId = payment.allocations?.[0]?.billId || '';

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
        <div>
          <h2 style="font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.creditCard} Payment & Receipt Vouchers
          </h2>
          <p style="font-size: 0.725rem; color: var(--muted-foreground); margin: 0;">
            Record party payment receipts, cheque/DD clearing details, courier tracking, and bill settlements.
          </p>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button id="btn-export-payments" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
            ${Icons.download} Export
          </button>
          <button id="btn-new-payment" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
            + New Voucher
          </button>
        </div>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable Payment List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-payments" class="compact-input" placeholder="Search party, instrument, bank..." />
            <span id="payment-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">${allPayments.length}</span>
          </div>
          <div class="split-pane-list-body" id="payments-list-items">
            ${allPayments.length === 0 ? `
              <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
                No payment vouchers found. Click "+ New Voucher" to create.
              </div>
            ` : allPayments.map(p => `
              <div class="split-pane-list-item ${String(p.id) === String(id) ? 'selected' : ''}" data-id="${p.id}">
                <div style="font-weight: 700; font-size: 0.825rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
                  <span>Ref #${p.id} (${escapeHtml(p.partyName || 'Party')})</span>
                  <span style="font-size: 0.725rem; font-weight: 700; color: var(--primary);">₹${formatCurrency(p.amount)}</span>
                </div>
                <div style="font-size: 0.725rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  Method: ${escapeHtml(p.instrumentType || 'CHEQUE')} ${p.instrumentNo ? `(${escapeHtml(p.instrumentNo)})` : ''}
                </div>
                <div style="font-size: 0.675rem; color: var(--muted-foreground); display: flex; justify-content: space-between; margin-top: 0.15rem;">
                  <span>${formatDate(p.paymentDate)}</span>
                  <span>Bank: ${escapeHtml(p.depositedBank || 'Cash')}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="payment-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.875rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} ${isEdit ? `EDIT PAYMENT VOUCHER #${payment.id}` : 'NEW PAYMENT VOUCHER'}
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.675rem;">${isEdit ? 'Editing' : 'New Record'}</span>
          </div>

          <form id="payment-form" class="paper-form-body">
            <input type="hidden" id="payment-id" value="${payment.id || ''}" />

            <div class="form-grid-3">
              <div class="compact-group">
                <label class="compact-label">Party Name*</label>
                <input type="text" id="partySearch" class="compact-input" required value="${escapeHtml(payment.partyName || '')}" placeholder="Search party..." />
                <input type="hidden" id="partyId" value="${payment.partyId || ''}" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Payment Date*</label>
                <input type="date" id="paymentDate" class="compact-input" required value="${payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Voucher Amount (₹)*</label>
                <input type="number" step="0.01" id="amount" class="compact-input" required value="${payment.amount || ''}" placeholder="e.g. 50000.00" />
              </div>
            </div>

            <!-- INSTRUMENT & BANKING DETAILS -->
            <div class="form-grid-4">
              <div class="compact-group">
                <label class="compact-label">Payment Method*</label>
                <select id="instrumentType" class="compact-select">
                  <option value="CHEQUE" ${payment.instrumentType === 'CHEQUE' ? 'selected' : ''}>CHEQUE</option>
                  <option value="DD" ${payment.instrumentType === 'DD' ? 'selected' : ''}>DEMAND DRAFT (DD)</option>
                  <option value="NEFT" ${payment.instrumentType === 'NEFT' ? 'selected' : ''}>NEFT / RTGS / IMPS</option>
                  <option value="CASH" ${payment.instrumentType === 'CASH' ? 'selected' : ''}>CASH</option>
                  <option value="UPI" ${payment.instrumentType === 'UPI' ? 'selected' : ''}>UPI / ONLINE</option>
                </select>
              </div>
              <div class="compact-group">
                <label class="compact-label">Cheque / Ref No.</label>
                <input type="text" id="instrumentNo" class="compact-input" value="${escapeHtml(payment.instrumentNo || '')}" placeholder="Cheque or UTR No." />
              </div>
              <div class="compact-group">
                <label class="compact-label">Instrument Date</label>
                <input type="date" id="instrumentDate" class="compact-input" value="${payment.instrumentDate ? new Date(payment.instrumentDate).toISOString().split('T')[0] : ''}" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Deposit Bank</label>
                <input type="text" id="depositedBank" class="compact-input" value="${escapeHtml(payment.depositedBank || '')}" placeholder="Bank Account Name" />
              </div>
            </div>

            <!-- COURIER & LOGISTICS DETAILS -->
            <div class="form-grid-3">
              <div class="compact-group">
                <label class="compact-label">Courier Service</label>
                <input type="text" id="courierName" class="compact-input" value="${escapeHtml(payment.courierName || '')}" placeholder="e.g. DTDC / Tirupati" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Courier Docket / Tracking No.</label>
                <input type="text" id="courierReceiptNo" class="compact-input" value="${escapeHtml(payment.courierReceiptNo || '')}" placeholder="Tracking No." />
              </div>
              <div class="compact-group">
                <label class="compact-label">Courier Charges (₹)</label>
                <input type="number" step="0.01" id="courierCharges" class="compact-input" value="${payment.courierCharges || ''}" placeholder="e.g. 150.00" />
              </div>
            </div>

            <!-- BILL ALLOCATION -->
            <div class="compact-group" style="margin-top: 0.3rem;">
              <label class="compact-label">Allocate to Outstanding Bill</label>
              <input type="text" id="billSearch" class="compact-input" value="${allocatedBillId ? `Bill #${allocatedBillId}` : ''}" placeholder="Search outstanding bills for party..." />
              <input type="hidden" id="billId" value="${allocatedBillId}" />
            </div>

            <div class="form-grid-2" style="margin-top: 0.3rem;">
              <div class="compact-group">
                <label class="compact-label">Primary Remarks</label>
                <input type="text" id="remarks1" class="compact-input" value="${escapeHtml(payment.remarks1 || '')}" placeholder="Voucher description..." />
              </div>
              <div class="compact-group">
                <label class="compact-label">Secondary Remarks</label>
                <input type="text" id="remarks2" class="compact-input" value="${escapeHtml(payment.remarks2 || '')}" placeholder="Additional notes..." />
              </div>
            </div>

            ${isEdit ? AuditMetadataBlock(payment) : ''}
          </form>

          <div class="paper-form-footer">
            ${isEdit ? `
              <button type="button" id="btn-delete-payment" class="danger" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.trash} Delete
              </button>
              <button type="button" id="btn-print-payment" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.printer} Print Voucher
              </button>
            ` : ''}
            <button type="button" id="btn-reset-payment" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset
            </button>
            <button type="submit" form="payment-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} ${isEdit ? 'Update' : 'Save'} Voucher (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  attachPartyAutocomp('partySearch', (name, party) => {
    if (party) {
      document.getElementById('partyId').value = party.id;
    }
  });

  // Split pane handlers
  document.querySelectorAll('.split-pane-list-item').forEach(item => {
    item.addEventListener('click', () => {
      renderPaymentForm(item.getAttribute('data-id'), allPayments);
    });
  });

  document.getElementById('search-payments').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
  });

  document.getElementById('btn-new-payment').addEventListener('click', () => renderPaymentForm(null, allPayments));
  document.getElementById('btn-reset-payment')?.addEventListener('click', () => renderPaymentForm(null, allPayments));

  if (isEdit) {
    document.getElementById('btn-delete-payment')?.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this payment voucher?')) return;
      try {
        await api.del(`/api/payments/${payment.id}`);
        showToast('Payment voucher deleted', 'success');
        renderPaymentForm(null);
      } catch (err) {
        showToast(err.message || 'Failed to delete payment voucher', 'error');
      }
    });
  }

  // Form submit handler
  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      partyId: parseInt(document.getElementById('partyId').value || '1', 10),
      paymentDate: document.getElementById('paymentDate').value,
      amount: document.getElementById('amount').value,
      instrumentType: document.getElementById('instrumentType').value,
      instrumentNo: document.getElementById('instrumentNo').value.trim() || null,
      instrumentDate: document.getElementById('instrumentDate').value || null,
      depositedBank: document.getElementById('depositedBank').value.trim() || null,
      courierReceiptNo: document.getElementById('courierReceiptNo').value.trim() || null,
      courierCharges: document.getElementById('courierCharges').value || null,
      remarks1: document.getElementById('remarks1').value.trim() || null,
      remarks2: document.getElementById('remarks2').value.trim() || null,
      billId: document.getElementById('billId').value ? parseInt(document.getElementById('billId').value, 10) : null,
    };

    try {
      if (isEdit) {
        await api.put(`/api/payments/${payment.id}`, payload);
        showToast('Payment voucher updated successfully', 'success');
      } else {
        await api.post('/api/payments', payload);
        showToast('New payment voucher saved successfully', 'success');
      }
      renderPaymentForm(null);
    } catch (err) {
      showToast(err.message || 'Failed to save payment voucher', 'error');
    }
  });
}
