/**
 * Bills View (Single-Viewport Compact Paper Form Design)
 * Left Pane: Searchable Bill Register List
 * Right Pane: 100% Viewport Fit Multi-Column Invoice Form
 */
import { Icons, Badge, Spinner, showToast, escapeHtml, formatDate, formatCurrency, AuditMetadataBlock } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderBillList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const allBills = await api.get('/reports/bill-register?sortBy=date');
    renderBillForm(null, allBills);
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load bills'}</div>`;
  }
}

export async function renderBillForm(id = null, preloadedList = null) {
  const app = document.getElementById('app');
  const isEdit = !!id;

  let allBills = preloadedList || [];
  if (allBills.length === 0) {
    try {
      allBills = await api.get('/reports/bill-register?sortBy=date');
    } catch (e) {
      console.warn('Failed to load bills list', e);
    }
  }

  let bill = { lines: [] };
  if (isEdit) {
    try {
      bill = await api.get(`/bills/${id}`);
    } catch (err) {
      showToast(err.message || 'Failed to load bill record', 'error');
    }
  }

  const nextBillNo = `BL-${allBills.length > 0 ? (1000 + allBills.length + 1) : 1001}`;

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
        <div>
          <h2 style="font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.receipt} Bill Register & Invoicing
          </h2>
          <p style="font-size: 0.725rem; color: var(--muted-foreground); margin: 0;">
            Generate sales bills, link delivery weighbridges or contract saudas, and track outstanding ledger balances.
          </p>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button id="btn-export-bills" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
            ${Icons.download} Export
          </button>
          <button id="btn-new-bill" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
            + New Bill
          </button>
        </div>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable Bill List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-bills" class="compact-input" placeholder="Search bill no, party, place..." />
            <span id="bill-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">${allBills.length}</span>
          </div>
          <div class="split-pane-list-body" id="bills-list-items">
            ${allBills.length === 0 ? `
              <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
                No bills found. Click "+ New Bill" to generate one.
              </div>
            ` : allBills.map(b => `
              <div class="split-pane-list-item ${String(b.id) === String(id) ? 'selected' : ''}" data-id="${b.id}">
                <div style="font-weight: 700; font-size: 0.825rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
                  <span>${escapeHtml(b.billNo)} (${escapeHtml(b.basis || 'CONTRACT')})</span>
                  <span style="font-size: 0.725rem; font-weight: 700; color: var(--primary);">₹${formatCurrency(b.totalAmount)}</span>
                </div>
                <div style="font-size: 0.725rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(b.partyName || 'Party')} ${b.place ? '• ' + escapeHtml(b.place) : ''}
                </div>
                <div style="font-size: 0.675rem; color: var(--muted-foreground); display: flex; justify-content: space-between; margin-top: 0.15rem;">
                  <span>${formatDate(b.billDate)}</span>
                  <span>Bal: ₹${formatCurrency(b.balanceAmount)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="bill-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.875rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} ${isEdit ? `EDIT BILL #${bill.billNo}` : 'NEW INVOICE RECORD'}
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.675rem;">${isEdit ? 'Editing' : 'New Record'}</span>
          </div>

          <form id="bill-form" class="paper-form-body">
            <input type="hidden" id="bill-id" value="${bill.id || ''}" />

            <div class="form-grid-4">
              <div class="compact-group">
                <label class="compact-label">Invoice / Bill No.*</label>
                <input type="text" id="billNo" class="compact-input" required value="${bill.billNo || nextBillNo}" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Bill Date*</label>
                <input type="date" id="billDate" class="compact-input" required value="${bill.billDate ? new Date(bill.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Billing Basis*</label>
                <select id="basis" class="compact-select">
                  <option value="CONTRACT" ${bill.basis === 'CONTRACT' ? 'selected' : ''}>CONTRACT (Direct Sauda)</option>
                  <option value="DELIVERY" ${bill.basis === 'DELIVERY' ? 'selected' : ''}>DELIVERY (Dispatch Weighbridge)</option>
                </select>
              </div>
              <div class="compact-group">
                <label class="compact-label">Credit Days</label>
                <input type="number" id="creditDays" class="compact-input" value="${bill.creditDays || '15'}" placeholder="e.g. 15" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Party Name (Billed Customer)*</label>
                <input type="text" id="partySearch" class="compact-input" required value="${escapeHtml(bill.partyName || '')}" placeholder="Search party..." />
                <input type="hidden" id="partyId" value="${bill.partyId || ''}" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Link Reference Record</label>
                <input type="text" id="referenceSearch" class="compact-input" value="${bill.lines?.[0]?.referenceId ? `Ref #${bill.lines[0].referenceId}` : ''}" placeholder="Type Sauda No or Dispatch No..." />
                <input type="hidden" id="referenceId" value="${bill.lines?.[0]?.referenceId || ''}" />
              </div>
            </div>

            <!-- INVOICE LINE ITEMS GRID -->
            <div style="margin-top: 0.4rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                <span class="compact-label" style="font-weight: 700; color: var(--foreground);">Invoice Charges & Line Items</span>
                <button type="button" id="btn-add-bill-line" class="secondary" style="height: 24px; font-size: 0.75rem; padding: 0 0.5rem;">+ Add Line</button>
              </div>
              <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--background);">
                <table id="bill-lines-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                  <thead>
                    <tr style="background: var(--muted); color: var(--muted-foreground); font-weight: 700;">
                      <th style="padding: 0.3rem 0.5rem; text-align: left;">Line Description*</th>
                      <th style="padding: 0.3rem 0.5rem; text-align: right; width: 140px;">Amount (₹)*</th>
                      <th style="width: 30px;"></th>
                    </tr>
                  </thead>
                  <tbody id="bill-lines-body">
                    <!-- Lines injected dynamically -->
                  </tbody>
                </table>
              </div>
            </div>

            <div class="form-grid-2" style="margin-top: 0.4rem;">
              <div class="compact-group">
                <label class="compact-label">Total Invoice Amount (₹)*</label>
                <input type="number" step="0.01" id="totalAmount" class="compact-input" required value="${bill.totalAmount || ''}" readonly style="font-weight: 700; font-size: 0.9rem; color: var(--primary);" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Balance Outstanding Amount (₹)</label>
                <input type="number" step="0.01" id="balanceAmount" class="compact-input" value="${bill.balanceAmount || ''}" readonly style="font-weight: 700; font-size: 0.9rem;" />
              </div>
            </div>

            ${isEdit ? AuditMetadataBlock(bill) : ''}
          </form>

          <div class="paper-form-footer">
            ${isEdit ? `
              <button type="button" id="btn-delete-bill" class="danger" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.trash} Delete
              </button>
              <button type="button" id="btn-print-bill" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.printer} Print Bill PDF
              </button>
            ` : ''}
            <button type="button" id="btn-reset-bill" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset
            </button>
            <button type="submit" form="bill-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} ${isEdit ? 'Update' : 'Save'} Bill (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  attachPartyAutocomp('partySearch', (name, party) => {
    if (party) document.getElementById('partyId').value = party.id;
  });

  const linesBody = document.getElementById('bill-lines-body');
  const totalInput = document.getElementById('totalAmount');
  const balInput = document.getElementById('balanceAmount');

  const calcBillTotal = () => {
    let tot = 0;
    linesBody.querySelectorAll('.bill-line-amount').forEach(inp => {
      tot += parseFloat(inp.value || '0');
    });
    totalInput.value = tot.toFixed(2);
    if (!isEdit) balInput.value = tot.toFixed(2);
  };

  const addBillLineRow = (line = {}) => {
    const tr = document.createElement('tr');
    tr.className = 'bill-line-row';
    tr.innerHTML = `
      <td style="padding: 0.2rem 0.3rem;">
        <input type="text" class="compact-input bill-line-desc" value="${escapeHtml(line.description || '')}" required placeholder="Description..." />
      </td>
      <td style="padding: 0.2rem 0.3rem;">
        <input type="number" step="0.01" class="compact-input bill-line-amount" value="${line.amount || ''}" required style="text-align: right; font-weight: 700;" placeholder="0.00" />
      </td>
      <td style="text-align: center; padding: 0.2rem 0.1rem;">
        <button type="button" class="btn-remove-bill-line danger small" style="padding: 0 0.3rem; height: 22px; font-size: 0.7rem;">×</button>
      </td>
    `;

    tr.querySelector('.bill-line-amount').addEventListener('input', calcBillTotal);
    tr.querySelector('.btn-remove-bill-line').addEventListener('click', () => {
      tr.remove();
      calcBillTotal();
    });

    linesBody.appendChild(tr);
  };

  if (bill.lines && bill.lines.length > 0) {
    bill.lines.forEach(l => addBillLineRow(l));
  } else {
    addBillLineRow({ description: 'Commodity Sales Invoice Charge', amount: bill.totalAmount || '' });
  }

  document.getElementById('btn-add-bill-line').addEventListener('click', () => addBillLineRow());

  // Split pane handlers
  document.querySelectorAll('.split-pane-list-item').forEach(item => {
    item.addEventListener('click', () => renderBillForm(item.getAttribute('data-id'), allBills));
  });

  document.getElementById('search-bills').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
  });

  document.getElementById('btn-new-bill').addEventListener('click', () => renderBillForm(null, allBills));
  document.getElementById('btn-reset-bill')?.addEventListener('click', () => renderBillForm(null, allBills));

  if (isEdit) {
    document.getElementById('btn-print-bill')?.addEventListener('click', () => {
      window.open(`/api/pdf/bill/${bill.id}`, '_blank');
    });
    document.getElementById('btn-delete-bill')?.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to delete Bill #${bill.billNo}?`)) return;
      try {
        await api.del(`/api/bills/${bill.id}`);
        showToast('Bill deleted successfully', 'success');
        renderBillForm(null);
      } catch (err) {
        showToast(err.message || 'Failed to delete bill', 'error');
      }
    });
  }

  // Form submit handler
  document.getElementById('bill-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const lineRows = document.querySelectorAll('.bill-line-row');
    if (lineRows.length === 0) {
      showToast('Please add at least one line item', 'error');
      return;
    }

    const lines = [];
    lineRows.forEach(tr => {
      lines.push({
        description: tr.querySelector('.bill-line-desc').value.trim(),
        amount: tr.querySelector('.bill-line-amount').value,
      });
    });

    const payload = {
      billNo: document.getElementById('billNo').value.trim(),
      billDate: document.getElementById('billDate').value,
      basis: document.getElementById('basis').value,
      partyId: parseInt(document.getElementById('partyId').value || '1', 10),
      totalAmount: document.getElementById('totalAmount').value,
      balanceAmount: document.getElementById('balanceAmount').value || document.getElementById('totalAmount').value,
      creditDays: parseInt(document.getElementById('creditDays').value || '15', 10),
      lines,
    };

    try {
      if (isEdit) {
        await api.put(`/api/bills/${bill.id}`, payload);
        showToast('Bill updated successfully', 'success');
      } else {
        await api.post('/api/bills', payload);
        showToast('New bill generated successfully', 'success');
      }
      renderBillForm(null);
    } catch (err) {
      showToast(err.message || 'Failed to save bill record', 'error');
    }
  });
}
