/**
 * Contracts View — Sauda Register (Parity with Legacy ERP Screenshot 3)
 * Single-Viewport Compact Paper Form Design
 */
import { Icons, Badge, Spinner, showToast, escapeHtml, formatDate, formatCurrency, AuditMetadataBlock } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp, attachCityAutocomp } from '../lib/autocomplete.js';

export async function renderContractList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const allContracts = await api.get('/contracts');
    renderContractForm(null, allContracts);
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load contracts'}</div>`;
  }
}

export async function renderContractForm(id = null, preloadedList = null) {
  const app = document.getElementById('app');
  const isEdit = !!id;

  let allContracts = preloadedList || [];
  if (allContracts.length === 0) {
    try {
      allContracts = await api.get('/contracts');
    } catch (e) {
      console.warn('Failed to load contracts list', e);
    }
  }

  let contract = { lines: [] };
  if (isEdit) {
    try {
      contract = await api.get(`/contracts/${id}`);
    } catch (err) {
      showToast(err.message || 'Failed to load contract record', 'error');
    }
  }

  const nextNo = allContracts.length > 0 ? (Math.max(...allContracts.map(c => parseInt(c.saudaNo || '0', 10))) + 1) : 1001;

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
        <div>
          <h2 style="font-size: 1.05rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.fileText} Contract(Sauda) Form
          </h2>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <span class="badge" style="font-size: 0.7rem;">${isEdit ? 'ALTER MODE' : 'ADD MODE'}</span>
          <button id="btn-export-contracts" class="secondary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            ${Icons.download} Export
          </button>
          <button id="btn-new-sauda" class="primary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            + New Sauda
          </button>
        </div>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable Sauda Register List -->
        <div class="split-pane-list" style="width: 280px;">
          <div class="split-pane-list-header">
            <input type="text" id="search-contracts" class="compact-input" placeholder="Search Sauda No, Buyer, Seller..." />
            <span id="sauda-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">${allContracts.length}</span>
          </div>
          <div class="split-pane-list-body" id="contracts-list-items">
            ${allContracts.length === 0 ? `
              <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
                No contracts found. Click "+ New Sauda" to create.
              </div>
            ` : allContracts.map(c => `
              <div class="split-pane-list-item ${String(c.id) === String(id) ? 'selected' : ''}" data-id="${c.id}">
                <div style="font-weight: 700; font-size: 0.8rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
                  <span>#${c.saudaNo} (${escapeHtml(c.saudaBook || 'SD')})</span>
                  <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary);">₹${formatCurrency(c.amount)}</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(c.buyerName || 'Buyer')} vs ${escapeHtml(c.sellerName || 'Seller')}
                </div>
                <div style="font-size: 0.65rem; color: var(--muted-foreground); display: flex; justify-content: space-between; margin-top: 0.1rem;">
                  <span>${formatDate(c.saudaDate)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form Layout (Parity with Legacy ERP Screenshot 3) -->
        <div class="split-pane-form" id="contract-form-pane">
          <form id="contract-form" class="paper-form-body" style="gap: 0.35rem;">
            <input type="hidden" id="contract-id" value="${contract.id || ''}" />

            <!-- TOP BLOCK: IDENTIFICATION & STAKEHOLDERS -->
            <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
              <div class="form-grid-2" style="margin-bottom: 0.3rem;">
                <div class="compact-group">
                  <label class="compact-label">Sauda Number*</label>
                  <div style="display: flex; gap: 0.25rem;">
                    <select id="saudaPrefix" class="compact-select" style="width: 70px;">
                      <option value="SD" ${contract.saudaPrefix === 'SD' ? 'selected' : ''}>SD</option>
                      <option value="SB" ${contract.saudaPrefix === 'SB' ? 'selected' : ''}>SB</option>
                      <option value="PU" ${contract.saudaPrefix === 'PU' ? 'selected' : ''}>PU</option>
                    </select>
                    <input type="number" id="saudaNo" class="compact-input" required value="${contract.saudaNo || nextNo}" style="flex: 1;" />
                  </div>
                </div>
                <div class="compact-group">
                  <label class="compact-label">Sauda Date*</label>
                  <input type="date" id="saudaDate" class="compact-input" required value="${contract.saudaDate ? new Date(contract.saudaDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" />
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                <div class="compact-group">
                  <label class="compact-label">Seller (Supplier)*</label>
                  <input type="text" id="sellerName" class="compact-input" required value="${escapeHtml(contract.sellerName || '')}" placeholder="Search seller..." />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Seller Contact</label>
                  <input type="text" id="sellerContact" class="compact-input" value="${escapeHtml(contract.sellerContact || '')}" placeholder="Contact person / Phone" />
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                <div class="compact-group">
                  <label class="compact-label">Seller Broker</label>
                  <input type="text" id="sellerBroker" class="compact-input" value="${escapeHtml(contract.sellerBroker || '')}" placeholder="Search seller broker..." />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Broker Contact</label>
                  <input type="text" id="sellerBrokerContact" class="compact-input" value="" placeholder="Broker phone" />
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                <div class="compact-group">
                  <label class="compact-label">Buyer (Customer)*</label>
                  <input type="text" id="buyerName" class="compact-input" required value="${escapeHtml(contract.buyerName || '')}" placeholder="Search buyer..." />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Buyer Contact</label>
                  <input type="text" id="buyerContact" class="compact-input" value="${escapeHtml(contract.buyerContact || '')}" placeholder="Contact person / Phone" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="compact-group">
                  <label class="compact-label">Buyer Broker</label>
                  <input type="text" id="buyerBroker" class="compact-input" value="${escapeHtml(contract.buyerBroker || '')}" placeholder="Search buyer broker..." />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Broker Contact</label>
                  <input type="text" id="buyerBrokerContact" class="compact-input" value="" placeholder="Broker phone" />
                </div>
              </div>
            </div>

            <!-- MIDDLE BLOCK: COMMODITIES GRID TABLE -->
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2rem;">
                <span class="compact-label" style="font-weight: 700; color: var(--foreground);">Commodity Line Items</span>
                <button type="button" id="btn-add-line" class="secondary" style="height: 22px; font-size: 0.7rem; padding: 0 0.4rem;">+ Add Line</button>
              </div>
              <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--background);">
                <table id="lines-grid-table" style="width: 100%; border-collapse: collapse; font-size: 0.725rem;">
                  <thead>
                    <tr style="background: var(--muted); color: var(--muted-foreground); font-weight: 700;">
                      <th style="padding: 0.25rem 0.35rem; text-align: center; width: 35px;">Sno</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: left;">Particulars / Commodity*</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 60px;">Qty Nos</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: left; width: 100px;">Details / Brand</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 65px;">Pack</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 85px;">Quintals*</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 90px;">Bargain Rate*</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 110px;">Amount (₹)</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 75px;">St Brok Rate</th>
                      <th style="width: 25px;"></th>
                    </tr>
                  </thead>
                  <tbody id="lines-grid-body">
                    <!-- Lines injected dynamically -->
                  </tbody>
                </table>
              </div>
              <!-- TOTALS BAR (MATCHING SCREENSHOT 3) -->
              <div style="display: flex; justify-content: space-between; align-items: center; background: #e0e7ff; color: #1e1b4b; padding: 0.3rem 0.6rem; border-radius: 4px; margin-top: 0.25rem; font-weight: 700; font-size: 0.775rem;">
                <div>Total Qty: <span id="tot-qty">0</span></div>
                <div>Total Quintals: <span id="tot-wght">0.00</span> Qtl</div>
                <div>Total Amount: ₹ <span id="tot-amt">0.00</span></div>
              </div>
            </div>

            <!-- BOTTOM SPLIT BLOCK (LOGISTICS & TERMS ON LEFT, OTHER TERMS & REMARKS ON RIGHT) -->
            <div class="form-grid-2">
              <!-- LEFT PANEL -->
              <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Delivery Till Date</label>
                    <input type="date" id="deliveryDeadlineDate" class="compact-input" value="${contract.deliveryDeadlineDate ? new Date(contract.deliveryDeadlineDate).toISOString().split('T')[0] : ''}" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Delivery Term</label>
                    <input type="text" id="deliveryTerm" class="compact-input" value="${escapeHtml(contract.deliveryTerm || '')}" placeholder="e.g. MILL DELIVERY" />
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Approx Weight (Qtl)</label>
                    <input type="number" step="0.001" id="approxWeight" class="compact-input" value="${contract.approxWeight || ''}" placeholder="e.g. 300" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Qty Tolerance %</label>
                    <input type="number" step="0.1" id="quantityTolerance" class="compact-input" value="${contract.quantityTolerance || ''}" placeholder="e.g. 2.0" />
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Origin Station</label>
                    <input type="text" id="originStation" class="compact-input" value="${escapeHtml(contract.originStation || '')}" placeholder="Loading place" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Destination Station</label>
                    <input type="text" id="destinationStation" class="compact-input" value="${escapeHtml(contract.destinationStation || '')}" placeholder="Unloading place" />
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Payment Mode</label>
                    <select id="paymentTermType" class="compact-select">
                      <option value="DISCOUNT" ${contract.paymentTermType === 'DISCOUNT' ? 'selected' : ''}>Discount Scheme</option>
                      <option value="CREDIT" ${contract.paymentTermType === 'CREDIT' ? 'selected' : ''}>Credit Period</option>
                      <option value="PAYMENT" ${contract.paymentTermType === 'PAYMENT' ? 'selected' : ''}>Immediate Payment</option>
                    </select>
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Discount % / Credit Days</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="number" step="0.01" id="cashDiscountPercent" class="compact-input" value="${contract.cashDiscountPercent || contract.paymentPercent || ''}" placeholder="%" style="flex: 1;" />
                      <input type="number" id="paymentDays" class="compact-input" value="${contract.paymentDays || ''}" placeholder="Days" style="flex: 1;" />
                    </div>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="compact-group">
                    <label class="compact-label">PO Number</label>
                    <input type="text" id="poNumber" class="compact-input" value="${escapeHtml(contract.poNumber || '')}" placeholder="PO Ref" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">PO Date</label>
                    <input type="date" id="poDate" class="compact-input" value="${contract.poDate ? new Date(contract.poDate).toISOString().split('T')[0] : ''}" />
                  </div>
                </div>
              </div>

              <!-- RIGHT PANEL -->
              <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <label class="compact-label" style="font-weight: 700;">Other Terms & Conditions</label>
                  <textarea id="termsAndConditions" class="compact-input" style="height: 60px !important; resize: vertical; margin-bottom: 0.3rem;" placeholder="Enter contract clause terms...">${escapeHtml(contract.termsAndConditions || '')}</textarea>

                  <label class="compact-label" style="font-weight: 700;">Internal Remarks</label>
                  <input type="text" id="remarks" class="compact-input" value="${escapeHtml(contract.customRemarks || '')}" placeholder="Staff notes..." />
                </div>

                <div style="display: flex; gap: 0.3rem; margin-top: 0.4rem;">
                  <button type="button" class="secondary" style="flex: 1; height: 24px; font-size: 0.7rem;">Tax Details</button>
                  <button type="button" class="secondary" style="flex: 1; height: 24px; font-size: 0.7rem;">Specification</button>
                  <button type="button" class="secondary" style="flex: 1; height: 24px; font-size: 0.7rem;">Documentation</button>
                </div>
              </div>
            </div>

            ${isEdit ? AuditMetadataBlock(contract) : ''}
          </form>

          <!-- FOOTER TOOLBAR -->
          <div class="paper-form-footer">
            ${isEdit ? `
              <button type="button" id="btn-delete-contract" class="danger" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.trash} F5 - Delete
              </button>
              <button type="button" id="btn-print-contract" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.printer} Print PDF
              </button>
            ` : ''}
            <button type="button" id="btn-reset-contract" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset
            </button>
            <button type="submit" form="contract-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} F6 - Save Sauda
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Autocomplete bindings
  attachPartyAutocomp('sellerName', (name, party) => {
    if (party && party.place) {
      const originInput = document.getElementById('originStation');
      if (originInput && !originInput.value.trim()) originInput.value = party.place;
    }
  });
  attachPartyAutocomp('buyerName', (name, party) => {
    if (party && party.place) {
      const destInput = document.getElementById('destinationStation');
      if (destInput && !destInput.value.trim()) destInput.value = party.place;
    }
  });
  attachPartyAutocomp('sellerBroker');
  attachPartyAutocomp('buyerBroker');
  attachCityAutocomp('originStation');
  attachCityAutocomp('destinationStation');

  // Commodity Lines Grid Manager with Totals Bar Calculation
  const linesBody = document.getElementById('lines-grid-body');

  const recalculateGrandTotals = () => {
    let totQty = 0;
    let totWght = 0;
    let totAmt = 0;

    linesBody.querySelectorAll('tr').forEach(tr => {
      const q = parseFloat(tr.querySelector('.line-qty')?.value || '0');
      const w = parseFloat(tr.querySelector('.line-weight')?.value || '0');
      const aStr = tr.querySelector('.line-amount')?.value.replace(/[^0-9.]/g, '') || '0';
      const a = parseFloat(aStr);

      totQty += q;
      totWght += w;
      totAmt += a;
    });

    document.getElementById('tot-qty').textContent = totQty;
    document.getElementById('tot-wght').textContent = totWght.toFixed(2);
    document.getElementById('tot-amt').textContent = formatCurrency(totAmt);
  };

  const addLineRow = (line = {}) => {
    const idx = linesBody.querySelectorAll('tr').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'sauda-line-row';
    tr.innerHTML = `
      <input type="hidden" class="line-id" value="${line.id || ''}">
      <td style="padding: 0.2rem; text-align: center; font-weight: 700;">${idx}</td>
      <td style="padding: 0.2rem;">
        <input type="text" id="line_comm_${idx}" class="compact-input line-commodity" value="${escapeHtml(line.commodityName || '')}" required placeholder="CHANA / SOYBEAN..." />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" class="compact-input line-qty" value="${line.numberOfLorries || '1'}" style="text-align: right;" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="text" class="compact-input line-brand" value="${escapeHtml(line.brand || '')}" placeholder="TAURAS / BRAND" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" class="compact-input line-bags" value="${line.quantityBags ? parseFloat(line.quantityBags) : ''}" style="text-align: right;" placeholder="50" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="0.001" class="compact-input line-weight" value="${line.weightQuintals || ''}" required style="text-align: right;" placeholder="310.40" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="0.01" class="compact-input line-rate" value="${line.rate || ''}" required style="text-align: right;" placeholder="5375.00" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="text" class="compact-input line-amount" value="${line.amount ? formatCurrency(line.amount) : '0.00'}" readonly style="text-align: right; font-weight: 700; color: var(--primary);" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="0.01" class="compact-input line-brok" value="${line.sellerBrokerageRate || '10.00'}" style="text-align: right;" placeholder="10.00" />
      </td>
      <td style="text-align: center; padding: 0.2rem 0.1rem;">
        <button type="button" class="btn-remove-line danger small" style="padding: 0 0.25rem; height: 20px; font-size: 0.65rem;">×</button>
      </td>
    `;

    const recalcRow = () => {
      const wt = parseFloat(tr.querySelector('.line-weight').value || '0');
      const rate = parseFloat(tr.querySelector('.line-rate').value || '0');
      const amt = wt * rate;
      tr.querySelector('.line-amount').value = formatCurrency(amt);
      recalculateGrandTotals();
    };

    tr.querySelector('.line-qty').addEventListener('input', recalcRow);
    tr.querySelector('.line-weight').addEventListener('input', recalcRow);
    tr.querySelector('.line-rate').addEventListener('input', recalcRow);
    tr.querySelector('.btn-remove-line').addEventListener('click', () => {
      tr.remove();
      recalculateGrandTotals();
    });

    linesBody.appendChild(tr);
    recalculateGrandTotals();
  };

  if (contract.lines && contract.lines.length > 0) {
    contract.lines.forEach(l => addLineRow(l));
  } else {
    addLineRow();
  }

  document.getElementById('btn-add-line').addEventListener('click', () => addLineRow());

  // Split-pane selection & filter handlers
  document.querySelectorAll('.split-pane-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const selectedId = item.getAttribute('data-id');
      renderContractForm(selectedId, allContracts);
    });
  });

  document.getElementById('search-contracts').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
  });

  document.getElementById('btn-new-sauda').addEventListener('click', () => renderContractForm(null, allContracts));
  document.getElementById('btn-reset-contract')?.addEventListener('click', () => renderContractForm(null, allContracts));

  if (isEdit) {
    document.getElementById('btn-print-contract')?.addEventListener('click', () => {
      window.open(`/api/pdf/contract/${contract.saudaNo}`, '_blank');
    });
    document.getElementById('btn-delete-contract')?.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to delete Sauda #${contract.saudaNo}?`)) return;
      try {
        await api.del(`/api/contracts/${contract.id}`);
        showToast('Sauda deleted successfully', 'success');
        renderContractForm(null);
      } catch (err) {
        showToast(err.message || 'Failed to delete sauda', 'error');
      }
    });
  }

  // Form submit handler
  document.getElementById('contract-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const lineRows = document.querySelectorAll('.sauda-line-row');
    if (lineRows.length === 0) {
      showToast('Please add at least one commodity line item', 'error');
      return;
    }

    const lines = [];
    lineRows.forEach(tr => {
      lines.push({
        id: tr.querySelector('.line-id').value || undefined,
        commodityName: tr.querySelector('.line-commodity').value.trim(),
        brand: tr.querySelector('.line-brand').value.trim() || null,
        numberOfLorries: tr.querySelector('.line-qty').value ? parseInt(tr.querySelector('.line-qty').value, 10) : null,
        quantityBags: tr.querySelector('.line-bags').value || null,
        weightQuintals: tr.querySelector('.line-weight').value,
        rate: tr.querySelector('.line-rate').value,
      });
    });

    const payload = {
      saudaPrefix: document.getElementById('saudaPrefix').value,
      saudaNo: parseInt(document.getElementById('saudaNo').value, 10),
      saudaDate: document.getElementById('saudaDate').value,
      sellerName: document.getElementById('sellerName').value.trim(),
      buyerName: document.getElementById('buyerName').value.trim(),
      sellerBroker: document.getElementById('sellerBroker').value.trim() || null,
      buyerBroker: document.getElementById('buyerBroker').value.trim() || null,
      originStation: document.getElementById('originStation').value.trim() || null,
      destinationStation: document.getElementById('destinationStation').value.trim() || null,
      deliveryDeadlineDate: document.getElementById('deliveryDeadlineDate').value || null,
      deliveryTerm: document.getElementById('deliveryTerm').value.trim() || null,
      approxWeight: document.getElementById('approxWeight').value || null,
      quantityTolerance: document.getElementById('quantityTolerance').value || null,
      paymentTermType: document.getElementById('paymentTermType').value,
      cashDiscountPercent: document.getElementById('cashDiscountPercent').value || null,
      paymentDays: document.getElementById('paymentDays').value ? parseInt(document.getElementById('paymentDays').value, 10) : null,
      poNumber: document.getElementById('poNumber').value.trim() || null,
      poDate: document.getElementById('poDate').value || null,
      termsAndConditions: document.getElementById('termsAndConditions').value.trim() || null,
      customRemarks: document.getElementById('remarks').value.trim() || null,
      lines,
    };

    try {
      if (isEdit) {
        await api.put(`/api/contracts/${contract.id}`, payload);
        showToast('Sauda contract updated successfully', 'success');
      } else {
        await api.post('/api/contracts', payload);
        showToast('New Sauda contract created successfully', 'success');
      }
      renderContractForm(null);
    } catch (err) {
      showToast(err.message || 'Failed to save Sauda contract', 'error');
    }
  });
}
