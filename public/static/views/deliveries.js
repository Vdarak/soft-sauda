/**
 * Deliveries View (Parity with Legacy ERP Screenshot 1)
 * Single-Viewport Compact Paper Form Design
 */
import { Icons, Badge, Spinner, showToast, escapeHtml, formatDate, formatCurrency, AuditMetadataBlock, upgradeAllSelects, confirmDialog, VirtualList } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachTransporterAutocomp, attachBrokerAutocomp, attachVehicleAutocomp } from '../lib/autocomplete.js';

export async function renderDeliveryList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const allDeliveries = await api.get('/deliveries?limit=9999');
    const defaultId = allDeliveries.length > 0 ? allDeliveries[0].id : null;
    renderDeliveryForm(defaultId, allDeliveries);
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load deliveries'}</div>`;
  }
}

export async function renderDeliveryForm(id = null, preloadedList = null) {
  const app = document.getElementById('app');

  let allDeliveries = preloadedList || [];
  if (allDeliveries.length === 0) {
    try {
      allDeliveries = await api.get('/deliveries?limit=9999');
    } catch (e) {
      console.warn('Failed to load deliveries list', e);
    }
  }

  // Auto-select first delivery if none specified
  if (!id && allDeliveries.length > 0) {
    id = allDeliveries[0].id;
  }
  const isEdit = !!id;

  let delivery = { lines: [], charges: [] };
  if (isEdit) {
    try {
      // Force refresh if cached version lacks lines array (list endpoint caches without lines)
      const cached = api.clientCache.get(`/deliveries/${id}`);
      const needsRefresh = !cached || !Array.isArray(cached.lines);
      delivery = await api.get(`/deliveries/${id}`, { forceRefresh: needsRefresh });
    } catch (err) {
      showToast(err.message || 'Failed to load delivery record', 'error');
    }
  }

  const firstLine = delivery.lines?.[0] || {};
  const lineComm = firstLine.commodityName || delivery.commodityName || '';
  const lineBags = firstLine.dispatchedBags || delivery.dispatchedBags || '';
  const lineWght = firstLine.dispatchedWeight || delivery.dispatchedWeight || '';
  const lineRate = firstLine.rate || delivery.rate || '';
  const lineAmt = firstLine.amount || delivery.amount || (parseFloat(lineWght || 0) * parseFloat(lineRate || 0)) || 0;

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
        <div>
          <h2 style="font-size: 1.05rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.truck} Delivery Form
          </h2>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <span class="badge" style="font-size: 0.7rem;">${isEdit ? 'ALTER MODE' : 'ADD MODE'}</span>
          <button id="btn-export-deliveries" class="secondary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            ${Icons.download} Export
          </button>
          <button id="btn-new-delivery" class="primary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            + New Dispatch
          </button>
        </div>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable Delivery List -->
        <div class="split-pane-list" style="width: 290px; display: flex; flex-direction: column;">
          <div class="split-pane-list-header" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.4rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.75rem; font-weight: 700;">Dispatches</span>
              <span id="deliv-count" style="font-size: 0.725rem; font-weight: 700; color: var(--primary);">${allDeliveries.length}</span>
            </div>
            <input type="text" id="search-deliveries" class="compact-input" placeholder="Search motor no, bill, buyer..." />
          </div>
          <div class="split-pane-list-body" id="deliveries-list-items" style="flex: 1; position: relative; overflow-y: auto;">
          </div>

        </div>

        <!-- RIGHT PANE: Compact Paper Form Layout (Parity with Legacy ERP Screenshot 1) -->
        <div class="split-pane-form" id="delivery-form-pane">
          <form id="delivery-form" class="paper-form-body" style="gap: 0.35rem;">
            <input type="hidden" id="delivery-id" value="${delivery.id || ''}" />

            <!-- TOP BLOCK: CONTRACT & PARTIES LINK -->
            <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
              <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                <div class="compact-group">
                  <label class="compact-label">Contract No.*</label>
                  <input type="text" id="contractNo" class="compact-input" required value="${delivery.saudaNo || ''}" placeholder="Type Contract No..." />
                  <input type="hidden" id="contractLineId" value="${delivery.lines?.[0]?.contractLineId || '1'}" />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Delivery Date*</label>
                  <input type="date" id="dispatchDate" class="compact-input" required value="${delivery.dispatchDate ? new Date(delivery.dispatchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" />
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                <div class="compact-group">
                  <label class="compact-label">Buyer</label>
                  <input type="text" id="buyerName" class="compact-input" value="${escapeHtml(delivery.buyerName || '')}" placeholder="Buyer firm..." />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Seller</label>
                  <input type="text" id="sellerName" class="compact-input" value="${escapeHtml(delivery.sellerName || '')}" placeholder="Seller firm..." />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="compact-group">
                  <label class="compact-label">Buyer Broker</label>
                  <input type="text" id="buyerBroker" class="compact-input" value="${escapeHtml(delivery.buyerBroker || '')}" placeholder="Buyer broker..." />
                </div>
                <div class="compact-group">
                  <label class="compact-label">Seller Broker</label>
                  <input type="text" id="sellerBroker" class="compact-input" value="${escapeHtml(delivery.sellerBroker || '')}" placeholder="Seller broker..." />
                </div>
              </div>
            </div>

            <!-- MIDDLE BLOCK: DISPATCH COMMODITY GRID -->
            <div>
              <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--background);">
                <table id="deliv-grid-table" style="width: 100%; border-collapse: collapse; font-size: 0.725rem;">
                  <thead>
                    <tr style="background: var(--muted); color: var(--muted-foreground); font-weight: 700;">
                      <th style="padding: 0.25rem 0.35rem; text-align: center; width: 35px;">Sno</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: left;">Commodity*</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: left; width: 100px;">Quantity Details</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 55px;">Qty</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 85px;">Bags (Katta)</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 55px;">Packing</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 85px;">Wght (Qtl)*</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 90px;">Bargain Rate</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 110px;">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody id="deliv-grid-body">
                    <!-- Dispatch Commodity Line -->
                    <tr class="deliv-line-row">
                      <td style="padding: 0.2rem; text-align: center; font-weight: 700;">1</td>
                      <td style="padding: 0.2rem;">
                        <input type="text" id="line_commodity" class="compact-input" value="${escapeHtml(delivery.lines?.[0]?.commodityName || 'CHANA MIX.')}" required placeholder="CHANA..." />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="text" id="line_details" class="compact-input" value="${escapeHtml(delivery.lines?.[0]?.details || 'TAURAS')}" placeholder="Details..." />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="number" id="line_qty" class="compact-input" value="1" style="text-align: right;" />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="number" id="line_bags" class="compact-input" value="${delivery.lines?.[0]?.dispatchedBags || '606'}" style="text-align: right;" placeholder="606" />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="number" id="line_pack" class="compact-input" value="50" style="text-align: right;" placeholder="50" />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="number" step="0.001" id="line_weight" class="compact-input" value="${delivery.lines?.[0]?.dispatchedWeight || '310.40'}" required style="text-align: right;" placeholder="310.40" />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="number" step="0.01" id="line_rate" class="compact-input" value="${delivery.lines?.[0]?.rate || '5375.00'}" style="text-align: right;" placeholder="5375.00" />
                      </td>
                      <td style="padding: 0.2rem;">
                        <input type="text" id="line_amount" class="compact-input" value="1668400.00" readonly style="text-align: right; font-weight: 700; color: var(--primary);" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- TOTALS BAR (MATCHING SCREENSHOT 1) -->
              <div style="display: flex; justify-content: space-between; align-items: center; background: #e0e7ff; color: #1e1b4b; padding: 0.3rem 0.6rem; border-radius: 4px; margin-top: 0.25rem; font-weight: 700; font-size: 0.775rem;">
                <div>Total Bags: <span id="deliv-tot-bags">606</span></div>
                <div>Total Weight: <span id="deliv-tot-wght">310.40</span> Qtl</div>
                <div>Total Amount: <span id="deliv-tot-amt">1,668,400.00</span></div>
              </div>
            </div>

            <!-- BOTTOM SPLIT BLOCK (BILLING & DEDUCTIONS ON LEFT, CALCULATIONS & TOTALS ON RIGHT) -->
            <div class="form-grid-2">
              <!-- LEFT PANEL -->
              <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
                <div class="form-grid-3" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Bill Number</label>
                    <input type="text" id="billNo" class="compact-input" value="${escapeHtml(delivery.billNo || '39')}" placeholder="Bill No" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Bill Date</label>
                    <input type="date" id="billDate" class="compact-input" value="${delivery.billDate ? new Date(delivery.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Motor No.*</label>
                    <input type="text" id="truckNo" class="compact-input" required value="${escapeHtml(delivery.truckNo || 'RJ14GG3024')}" style="text-transform: uppercase;" />
                  </div>
                </div>

                <div class="form-grid-3" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Transport</label>
                    <input type="text" id="transporterName" class="compact-input" value="${escapeHtml(delivery.transporterName || '')}" placeholder="Transporter..." />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Freight (₹)</label>
                    <input type="number" step="0.01" id="freightCharges" class="compact-input" value="${delivery.freightCharges || '0.00'}" placeholder="0.00" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Freight Advance</label>
                    <input type="number" step="0.01" id="freightAdvance" class="compact-input" value="${delivery.freightAdvance || '0.00'}" placeholder="0.00" />
                  </div>
                </div>

                <!-- ADDITIONS & DEDUCTIONS MATRIX (VAT, BARDANA, ETC.) -->
                <div style="border-top: 1px solid var(--border); padding-top: 0.3rem; margin-top: 0.25rem;">
                  <span class="compact-label" style="font-weight: 700;">Additions & Deductions</span>
                  <div class="form-grid-2" style="margin-top: 0.2rem; margin-bottom: 0.2rem;">
                    <div style="display: flex; gap: 0.2rem;">
                      <input type="text" class="compact-input" value="VAT" style="width: 70px;" />
                      <input type="number" step="0.01" class="compact-input" value="0.00" style="flex: 1; text-align: right;" />
                    </div>
                    <div style="display: flex; gap: 0.2rem;">
                      <input type="text" class="compact-input" value="Less 1" style="width: 70px;" />
                      <input type="number" step="0.01" class="compact-input" value="0.00" style="flex: 1; text-align: right;" />
                    </div>
                  </div>
                  <div class="form-grid-2">
                    <div style="display: flex; gap: 0.2rem;">
                      <input type="text" class="compact-input" value="BARDANA" style="width: 70px;" />
                      <input type="number" step="0.01" class="compact-input" value="0.00" style="flex: 1; text-align: right;" />
                    </div>
                    <div style="display: flex; gap: 0.2rem;">
                      <input type="text" class="compact-input" value="Less 2" style="width: 70px;" />
                      <input type="number" step="0.01" class="compact-input" value="0.00" style="flex: 1; text-align: right;" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- RIGHT PANEL -->
              <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <label class="compact-label" style="font-weight: 700;">Remarks</label>
                  <input type="text" id="remarks" class="compact-input" value="${escapeHtml(delivery.customRemarks || '')}" placeholder="Dispatch remarks..." style="margin-bottom: 0.4rem;" />

                  <div class="compact-group" style="margin-bottom: 0.3rem;">
                    <label class="compact-label">Bargain Amt (Calculations)</label>
                    <input type="text" id="bargainAmtCalc" class="compact-input" value="1668400.00" readonly style="font-weight: 700; font-size: 0.9rem; color: #1e1b4b; background: #e0e7ff;" />
                  </div>

                  <div class="compact-group">
                    <label class="compact-label">Bill Amount (Party Bill)</label>
                    <input type="text" id="billAmtParty" class="compact-input" value="0.00" readonly style="font-weight: 700; font-size: 0.9rem;" />
                  </div>
                </div>

                <div class="compact-group" style="margin-top: 0.4rem;">
                  <label class="compact-label">Delivery Status</label>
                  <select id="status" class="compact-select">
                    <option value="PENDING" ${delivery.status === 'PENDING' ? 'selected' : ''}>PENDING (In-Transit)</option>
                    <option value="DELIVERED" ${delivery.status === 'DELIVERED' ? 'selected' : ''}>DELIVERED (Fulfilled)</option>
                    <option value="CANCELLED" ${delivery.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>

            ${isEdit ? AuditMetadataBlock(delivery) : ''}
          </form>

          <!-- FOOTER TOOLBAR -->
          <div class="paper-form-footer">
            ${isEdit ? `
              <button type="button" id="btn-delete-delivery" class="danger" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.trash} F5 - Delete
              </button>
              <button type="button" id="btn-print-delivery" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.printer} Print Slip
              </button>
            ` : ''}
            <button type="button" id="btn-reset-delivery" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset
            </button>
            <button type="submit" form="delivery-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} F6 - Save Delivery
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Upgrade all native selects to custom styled dropdowns
  upgradeAllSelects();

  // Live calculation for middle grid
  const recalcDelivery = () => {
    const qty = parseFloat(document.getElementById('line_qty')?.value || '1');
    const bags = parseFloat(document.getElementById('line_bags')?.value || '0');
    const wght = parseFloat(document.getElementById('line_weight')?.value || '0');
    const rate = parseFloat(document.getElementById('line_rate')?.value || '0');
    const amt = wght * rate;

    document.getElementById('line_amount').value = amt.toFixed(2);
    document.getElementById('deliv-tot-bags').textContent = bags;
    document.getElementById('deliv-tot-wght').textContent = wght.toFixed(2);
    document.getElementById('deliv-tot-amt').textContent = formatCurrency(amt);
    document.getElementById('bargainAmtCalc').value = amt.toFixed(2);
  };

  ['line_qty', 'line_bags', 'line_weight', 'line_rate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', recalcDelivery);
  });

  // Trigger initial calculation
  recalcDelivery();

  // Attach transporter autocomplete
  attachTransporterAutocomp('transporterName');

  // Attach buyer/seller broker autocomplete (filtered by broker roles)
  attachBrokerAutocomp('buyerBroker', 'BUYER_BROKER');
  attachBrokerAutocomp('sellerBroker', 'SELLER_BROKER');

  // Attach vehicle type autocomplete for Quantity Details field
  attachVehicleAutocomp('line_details');

  // Split pane handlers
  const bindListItems = () => {
    document.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const selectedId = item.getAttribute('data-id');
        renderDeliveryForm(selectedId, allDeliveries);
      });
    });
  };
  // Virtual List setup for 60 FPS smooth scrolling
  const vl = new VirtualList({
    container: document.getElementById('deliveries-list-items'),
    itemHeight: 54,
    buffer: 6,
    items: allDeliveries,
    selectedId: id,
    getItemId: d => d.id,
    renderItem: (d, isSelected) => `
      <div class="split-pane-list-item ${isSelected ? 'selected' : ''}" data-id="${d.id}" style="height: 54px; box-sizing: border-box; justify-content: center; padding: 0.25rem 0.5rem;">
        <div style="font-weight: 700; font-size: 0.8rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 0.5rem;">Disp #${d.dispatchNo || d.id} ${d.truckNo ? `(${escapeHtml(d.truckNo)})` : ''}</span>
          <span style="font-size: 0.65rem; flex-shrink: 0;">${Badge(d.status || 'PENDING', d.status === 'DELIVERED' ? 'active' : 'draft')}</span>
        </div>
        <div style="font-size: 0.7rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(d.buyerName || 'Buyer')} vs ${escapeHtml(d.sellerName || 'Seller')}
        </div>
        <div style="font-size: 0.65rem; color: var(--muted-foreground); display: flex; justify-content: space-between; margin-top: 0.1rem; overflow: hidden; white-space: nowrap;">
          <span>Date: ${formatDate(d.dispatchDate)}</span>
          ${d.commodityName ? `<span style="font-weight: 600; color: var(--foreground); overflow: hidden; text-overflow: ellipsis;">${escapeHtml(d.commodityName)} (${d.dispatchedWeight || 0} Qtl)</span>` : ''}
        </div>
      </div>
    `,
    onSelect: (selectedId) => {
      renderDeliveryForm(selectedId, allDeliveries);
    },
    emptyMessage: 'No dispatches found. Click "+ New Dispatch" to record one.'
  });

  if (id) {
    vl.scrollToId(id);
  }

  // Precompute lowercase search index
  allDeliveries.forEach(d => {
    if (!d._search) {
      d._search = `${d.dispatchNo || ''} ${d.truckNo || ''} ${d.buyerName || ''} ${d.sellerName || ''} ${d.commodityName || ''} ${d.status || ''}`.toLowerCase();
    }
  });

  // Instant in-memory search + debounced server fallback
  let searchTimeout = null;
  document.getElementById('search-deliveries')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const countEl = document.getElementById('deliv-count');
    if (!q) {
      if (countEl) countEl.textContent = allDeliveries.length.toLocaleString();
      vl.setItems(allDeliveries, true);
      return;
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const localFiltered = allDeliveries.filter(d => {
      const str = d._search || (d._search = `${d.dispatchNo || ''} ${d.truckNo || ''} ${d.buyerName || ''} ${d.sellerName || ''} ${d.commodityName || ''} ${d.status || ''}`.toLowerCase());
      return tokens.every(tok => str.includes(tok));
    });

    if (countEl) countEl.textContent = `${localFiltered.length.toLocaleString()} of ${allDeliveries.length.toLocaleString()}`;
    vl.setItems(localFiltered, true);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      try {
        const results = await api.get(`/deliveries?q=${encodeURIComponent(q)}&limit=9999`);
        results.forEach(d => {
          d._search = `${d.dispatchNo || ''} ${d.truckNo || ''} ${d.buyerName || ''} ${d.sellerName || ''} ${d.commodityName || ''} ${d.status || ''}`.toLowerCase();
        });
        if (countEl) countEl.textContent = `${results.length.toLocaleString()} found`;
        vl.setItems(results, true);
      } catch (err) {
        console.warn('Search deliveries failed:', err);
      }
    }, 400);
  });



  document.getElementById('btn-new-delivery').addEventListener('click', () => renderDeliveryForm(null, allDeliveries));
  document.getElementById('btn-reset-delivery')?.addEventListener('click', () => renderDeliveryForm(null, allDeliveries));

  if (isEdit) {
    document.getElementById('btn-delete-delivery')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Are you sure you want to delete this dispatch record?'))) return;
      try {
        await api.del(`/api/deliveries/${delivery.id}`);
        showToast('Dispatch record deleted', 'success');
        renderDeliveryForm(null);
      } catch (err) {
        showToast(err.message || 'Failed to delete dispatch record', 'error');
      }
    });
  }

  // Form submit handler
  document.getElementById('delivery-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      dispatchDate: document.getElementById('dispatchDate').value,
      truckNo: document.getElementById('truckNo').value.trim().toUpperCase(),
      transporterName: document.getElementById('transporterName').value.trim() || null,
      freightCharges: document.getElementById('freightCharges').value || null,
      freightAdvance: document.getElementById('freightAdvance').value || null,
      billNo: document.getElementById('billNo').value.trim() || null,
      billDate: document.getElementById('billDate').value || null,
      status: document.getElementById('status').value,
      contractLineId: parseInt(document.getElementById('contractLineId').value || '1', 10),
      dispatchedBags: document.getElementById('line_bags').value || null,
      dispatchedWeight: document.getElementById('line_weight').value,
    };

    try {
      if (isEdit) {
        await api.put(`/api/deliveries/${delivery.id}`, payload);
        showToast('Dispatch record updated successfully', 'success');
      } else {
        await api.post('/api/deliveries', payload);
        showToast('New dispatch recorded successfully', 'success');
      }
      renderDeliveryForm(null);
    } catch (err) {
      showToast(err.message || 'Failed to save dispatch record', 'error');
    }
  });
}
