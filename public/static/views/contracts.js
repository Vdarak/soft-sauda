/**
 * Contracts View — Sauda Register (Parity with Legacy ERP Screenshot 3)
 */
import { Icons, Spinner, showToast, escapeHtml, formatDate, formatCurrency, AuditMetadataBlock, upgradeAllSelects, confirmDialog, VirtualList } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp, attachCityAutocomp } from '../lib/autocomplete.js';

export async function renderContractList() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const allContracts = await api.get('/contracts?book=SD&limit=9999');
    const defaultId = allContracts.length > 0 ? allContracts[0].id : null;
    renderContractForm(defaultId, allContracts, 'SD');
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load contracts'}</div>`;
  }
}

export async function renderContractForm(id = null, preloadedList = null, currentBook = 'SD') {
  const app = document.getElementById('app');

  let [allContractsData, allCommodities, allVehicles] = await Promise.all([
    preloadedList && preloadedList.length > 0 ? Promise.resolve(preloadedList) : api.get(`/contracts?book=${currentBook}&limit=9999`).catch(() => []),
    api.get('/commodities').catch(() => []),
    api.get('/vehicles').catch(() => []),
  ]);

  let allContracts = allContractsData || [];
  if (!Array.isArray(allCommodities)) allCommodities = [];
  if (!Array.isArray(allVehicles)) allVehicles = [];

  const defaultVehicles = ['TAURAS', 'CONTAINER', 'TRAILOR', 'MOTOR', 'TURBO', 'BAGS', 'TONS', 'FULL BG RACK', 'BG WAGON', 'BOX'];
  const vehicleOptionsSet = new Set(defaultVehicles);
  allVehicles.forEach(v => {
    const name = typeof v === 'string' ? v : (v.vehicleType || v.name);
    if (name) vehicleOptionsSet.add(name);
  });
  const vehicleOptions = Array.from(vehicleOptionsSet);

  // If no ID specified but we have contracts, automatically select the first contract so the form is never blank
  if (!id && allContracts.length > 0) {
    id = allContracts[0].id;
  }
  const isEdit = !!id;

  let contract = { lines: [] };
  if (isEdit) {
    try {
      // Force refresh if cached version doesn't have lines array (list endpoint caches without lines)
      const cached = api.clientCache.get(`/contracts/${id}`);
      const needsRefresh = !cached || !Array.isArray(cached.lines);
      contract = await api.get(`/contracts/${id}`, { forceRefresh: needsRefresh });
    } catch (err) {
      showToast(err.message || 'Failed to load contract record', 'error');
    }
  }

  let contractSpecs = (contract.specifications && Array.isArray(contract.specifications))
    ? contract.specifications.map(s => ({ specName: s.specName || '', specValue: s.specValue != null ? String(s.specValue) : '', minMax: s.minMax || '', remarks: s.remarks || '' }))
    : [];
  let contractDocs = (contract.documents && Array.isArray(contract.documents))
    ? contract.documents.map(d => ({ narration: d.narration || '', sortOrder: d.sortOrder || 0 }))
    : [];
  let contractTermsList = (contract.terms && Array.isArray(contract.terms))
    ? contract.terms.map(t => ({ narration: t.narration || '', sortOrder: t.sortOrder || 0 }))
    : [];

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
        <div class="split-pane-list" style="width: 290px; display: flex; flex-direction: column;">
          <div class="split-pane-list-header" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.4rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
              <select id="filter-contract-book" class="compact-select" style="font-size: 0.75rem; font-weight: 700; height: 26px; padding: 0 0.35rem; flex: 1;">
                <option value="SD" ${currentBook === 'SD' ? 'selected' : ''}>Sauda (SD)</option>
                <option value="DLV" ${currentBook === 'DLV' ? 'selected' : ''}>Delivery (DLV)</option>
                <option value="ALL" ${currentBook === 'ALL' ? 'selected' : ''}>All Books</option>
              </select>
              <span id="sauda-count" style="font-size: 0.725rem; font-weight: 700; color: var(--primary); white-space: nowrap;">${allContracts.length}</span>
            </div>
            <input type="text" id="search-contracts" class="compact-input" placeholder="Search Sauda No, Buyer, Seller..." />
          </div>
          <div class="split-pane-list-body" id="contracts-list-items" style="flex: 1; position: relative; overflow-y: auto;">
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
                      <option value="SD" ${contract.saudaPrefix === 'SD' || !contract.saudaPrefix ? 'selected' : ''}>SD</option>
                      <option value="DLV" ${contract.saudaPrefix === 'DLV' ? 'selected' : ''}>DLV</option>
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
                    <tr style="background: var(--muted); color: var(--muted-foreground); font-weight: 700; border-bottom: 1px solid var(--border);">
                      <th style="padding: 0.25rem 0.2rem; text-align: center; width: 32px;">Sno</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: left; min-width: 185px;">Particulars/Commodity</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 55px;">Qty. Nos.</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: left; width: 130px;">Quantity Details</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 55px;">Pack</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 85px;">Quintals</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 90px;">Bargain Rate</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 110px;">Amount</th>
                      <th style="padding: 0.25rem 0.35rem; text-align: right; width: 75px;">Sl.Brok Rate</th>
                      <th style="padding: 0.25rem 0.3rem; text-align: left; width: 68px;">Type</th>
                      <th style="width: 25px; padding: 0.2rem 0.1rem;"></th>
                    </tr>
                  </thead>
                  <tbody id="lines-grid-body">
                    <!-- Lines injected dynamically -->
                  </tbody>
                  <tfoot>
                    <tr style="border-top: 1px solid var(--border); background: var(--card);">
                      <td style="padding: 0.3rem 0.2rem;"></td>
                      <td style="padding: 0.3rem 0.35rem;"></td>
                      <td style="padding: 0.3rem 0.35rem;"></td>
                      <td style="padding: 0.3rem 0.35rem;"></td>
                      <td style="padding: 0.3rem 0.2rem; text-align: right;">
                        <div id="tot-bags-box" class="summary-lilac-box">0</div>
                      </td>
                      <td style="padding: 0.3rem 0.2rem; text-align: right;">
                        <div id="tot-wght-box" class="summary-lilac-box">0.00</div>
                      </td>
                      <td style="padding: 0.3rem 0.35rem;"></td>
                      <td style="padding: 0.3rem 0.2rem; text-align: right;">
                        <div id="tot-amt-box" class="summary-lilac-box">0.00</div>
                      </td>
                      <td style="padding: 0.3rem 0.35rem;"></td>
                      <td style="padding: 0.3rem 0.3rem;"></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
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

                <div style="display: flex; gap: 0.25rem; margin-top: 0.4rem;">
                  <button type="button" id="btn-overlay-tax" class="secondary" style="flex: 1; height: 26px; font-size: 0.68rem; padding: 0 0.25rem;">
                    Tax Details
                  </button>
                  <button type="button" id="btn-overlay-spec" class="secondary" style="flex: 1; height: 26px; font-size: 0.68rem; padding: 0 0.25rem;">
                    Specification <span id="badge-spec-count" class="badge" style="font-size: 0.65rem; padding: 0 0.25rem; margin-left: 0.15rem; ${contractSpecs.length ? '' : 'display:none;'}">${contractSpecs.length}</span>
                  </button>
                  <button type="button" id="btn-overlay-doc" class="secondary" style="flex: 1; height: 26px; font-size: 0.68rem; padding: 0 0.25rem;">
                    Documentation <span id="badge-doc-count" class="badge" style="font-size: 0.65rem; padding: 0 0.25rem; margin-left: 0.15rem; ${contractDocs.length ? '' : 'display:none;'}">${contractDocs.length}</span>
                  </button>
                  <button type="button" id="btn-overlay-terms" class="secondary" style="flex: 1; height: 26px; font-size: 0.68rem; padding: 0 0.25rem;">
                    Terms <span id="badge-terms-count" class="badge" style="font-size: 0.65rem; padding: 0 0.25rem; margin-left: 0.15rem; ${contractTermsList.length ? '' : 'display:none;'}">${contractTermsList.length}</span>
                  </button>
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

      <!-- ═════════════════════════════════════════════════════════════ -->
      <!-- MODAL: SPECIFICATIONS OVERLAY (Quality Parameters)             -->
      <!-- ═════════════════════════════════════════════════════════════ -->
      <dialog id="modal-specifications" style="width: min(95vw, 680px); max-height: 88vh; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 16px 36px rgba(0,0,0,0.25); padding: 0; background: var(--card); color: var(--card-foreground); overflow: hidden;">
        <div style="display: flex; flex-direction: column; max-height: 88vh;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--muted);">
            <div>
              <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span style="display: inline-flex; color: var(--primary);">${Icons.clipboard}</span> Quality Specifications (Sauda Specs)
              </h3>
              <div style="font-size: 0.725rem; color: var(--muted-foreground); margin-top: 0.1rem;">Define moisture, admixture, and purity parameters for this contract</div>
            </div>
            <button type="button" id="btn-close-specs" class="ghost" style="padding: 0.2rem 0.5rem; display: flex; align-items: center; cursor: pointer;">${Icons.x}</button>
          </div>
          
          <div style="padding: 0.75rem 1rem; overflow-y: auto; flex: 1;">
            <!-- QUICK CHIPS -->
            <div style="margin-bottom: 0.6rem;">
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground); margin-right: 0.4rem;">Quick Add:</span>
              <span style="display: inline-flex; flex-wrap: wrap; gap: 0.3rem;">
                <button type="button" class="btn-chip-spec small secondary" data-name="MOISTURE" data-val="10.00" data-mm="MAX" data-rem="Above 10% rejectable">+ Moisture 10%</button>
                <button type="button" class="btn-chip-spec small secondary" data-name="FOREIGN MATTER" data-val="2.00" data-mm="MAX" data-rem="Dust & stones max 2%">+ Foreign Matter 2%</button>
                <button type="button" class="btn-chip-spec small secondary" data-name="DAMAGED GRAINS" data-val="3.00" data-mm="MAX" data-rem="Insect / fungal damage">+ Damaged 3%</button>
                <button type="button" class="btn-chip-spec small secondary" data-name="BROKEN GRAINS" data-val="4.00" data-mm="MAX" data-rem="Split / fragments">+ Broken 4%</button>
                <button type="button" class="btn-chip-spec small secondary" data-name="ADMIXTURE" data-val="2.00" data-mm="MAX" data-rem="Other pulses/seeds">+ Admixture 2%</button>
                <button type="button" class="btn-chip-spec small secondary" data-name="OIL CONTENT" data-val="18.00" data-mm="MIN" data-rem="Basis 18%">+ Oil 18% MIN</button>
              </span>
            </div>

            <!-- SPECS TABLE -->
            <div style="border: 1px solid var(--border); border-radius: 4px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                <thead>
                  <tr style="background: var(--muted); font-weight: 700;">
                    <th style="padding: 0.3rem 0.4rem; text-align: center; width: 35px;">#</th>
                    <th style="padding: 0.3rem 0.4rem; text-align: left;">Parameter / Spec Name</th>
                    <th style="padding: 0.3rem 0.4rem; text-align: right; width: 85px;">Value (%)</th>
                    <th style="padding: 0.3rem 0.4rem; text-align: center; width: 80px;">Min / Max</th>
                    <th style="padding: 0.3rem 0.4rem; text-align: left;">Remarks / Rejection Criteria</th>
                    <th style="width: 30px;"></th>
                  </tr>
                </thead>
                <tbody id="specs-grid-body">
                  <!-- Injected dynamically -->
                </tbody>
              </table>
            </div>

            <button type="button" id="btn-add-spec-row" class="secondary small" style="margin-top: 0.5rem;">
              + Add Specification Line
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-top: 1px solid var(--border); background: var(--muted);">
            <button type="button" id="btn-clear-specs" class="danger small ghost">Clear All</button>
            <button type="button" id="btn-save-specs" class="primary small">Done & Apply</button>
          </div>
        </div>
      </dialog>

      <!-- ═════════════════════════════════════════════════════════════ -->
      <!-- MODAL: DOCUMENTATION OVERLAY (Dispatch & Billing Notes)        -->
      <!-- ═════════════════════════════════════════════════════════════ -->
      <dialog id="modal-documentation" style="width: min(95vw, 640px); max-height: 88vh; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 16px 36px rgba(0,0,0,0.25); padding: 0; background: var(--card); color: var(--card-foreground); overflow: hidden;">
        <div style="display: flex; flex-direction: column; max-height: 88vh;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--muted);">
            <div>
              <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span style="display: inline-flex; color: var(--primary);">${Icons.fileText}</span> Documentation & Dispatch Instructions
              </h3>
              <div style="font-size: 0.725rem; color: var(--muted-foreground); margin-top: 0.1rem;">Lorry receipt, weighment slip, certificate and invoice terms</div>
            </div>
            <button type="button" id="btn-close-docs" class="ghost" style="padding: 0.2rem 0.5rem; display: flex; align-items: center; cursor: pointer;">${Icons.x}</button>
          </div>

          <div style="padding: 0.75rem 1rem; overflow-y: auto; flex: 1;">
            <!-- QUICK CHIPS -->
            <div style="margin-bottom: 0.6rem;">
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground); margin-right: 0.4rem;">Quick Add:</span>
              <span style="display: inline-flex; flex-wrap: wrap; gap: 0.3rem;">
                <button type="button" class="btn-chip-doc small secondary" data-text="Weight slip from authorized weighbridge mandatory with driver copy">+ Weighbridge Slip</button>
                <button type="button" class="btn-chip-doc small secondary" data-text="Quality and moisture test certificate by accredited surveyor required">+ Quality Certificate</button>
                <button type="button" class="btn-chip-doc small secondary" data-text="Original GST Tax Invoice and active E-Way bill must accompany truck">+ Invoice & E-Way Bill</button>
                <button type="button" class="btn-chip-doc small secondary" data-text="Lorry Receipt (LR) consignment note copy to be submitted">+ LR Copy</button>
                <button type="button" class="btn-chip-doc small secondary" data-text="Fumigation certificate mandatory before unloading">+ Fumigation Cert</button>
              </span>
            </div>

            <!-- DOCS LIST -->
            <div id="docs-grid-body" style="display: flex; flex-direction: column; gap: 0.4rem;">
              <!-- Injected dynamically -->
            </div>

            <button type="button" id="btn-add-doc-row" class="secondary small" style="margin-top: 0.6rem;">
              + Add Document Instruction
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-top: 1px solid var(--border); background: var(--muted);">
            <button type="button" id="btn-clear-docs" class="danger small ghost">Clear All</button>
            <button type="button" id="btn-save-docs" class="primary small">Done & Apply</button>
          </div>
        </div>
      </dialog>

      <!-- ═════════════════════════════════════════════════════════════ -->
      <!-- MODAL: CONTRACT TERMS OVERLAY (Trade Clauses)                 -->
      <!-- ═════════════════════════════════════════════════════════════ -->
      <dialog id="modal-terms" style="width: min(95vw, 680px); max-height: 88vh; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 16px 36px rgba(0,0,0,0.25); padding: 0; background: var(--card); color: var(--card-foreground); overflow: hidden;">
        <div style="display: flex; flex-direction: column; max-height: 88vh;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--muted);">
            <div>
              <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span style="display: inline-flex; color: var(--primary);">${Icons.bookOpen}</span> Contract Terms & Conditions Clauses
              </h3>
              <div style="font-size: 0.725rem; color: var(--muted-foreground); margin-top: 0.1rem;">Select standardized contract clauses or write custom terms</div>
            </div>
            <button type="button" id="btn-close-terms" class="ghost" style="padding: 0.2rem 0.5rem; display: flex; align-items: center; cursor: pointer;">${Icons.x}</button>
          </div>

          <div style="padding: 0.75rem 1rem; overflow-y: auto; flex: 1;">
            <!-- TEMPLATE CLAUSES SELECTOR -->
            <div style="display: flex; gap: 0.4rem; margin-bottom: 0.75rem; background: var(--muted); padding: 0.4rem; border-radius: 4px;">
              <select id="select-term-template" class="compact-select" style="flex: 1;">
                <option value="">-- Choose Standard Trade Clause --</option>
                <option value="Payment within 7 days from lorry receipt at buyer mill premises via RTGS/NEFT.">Payment: 7 days credit from delivery</option>
                <option value="Weighment and quality final as per destination mill weighbridge and laboratory analysis.">Quality/Weighment: Final at destination mill</option>
                <option value="Transit insurance is covered by buyer; seller is not liable for loss or damage during transit.">Insurance: Covered by buyer</option>
                <option value="Contract subject to APMC market committee regulations and local court jurisdiction only.">Jurisdiction: Local court jurisdiction</option>
                <option value="Force Majeure clause applies in case of natural calamity, strike, or transportation disruption.">Force Majeure: Standard clause</option>
                <option value="Late delivery will attract penalty of ₹ 25 per quintal per week of delay.">Late Delivery: Penalty clause</option>
              </select>
              <button type="button" id="btn-add-term-template" class="secondary small" style="white-space: nowrap;">+ Add Clause</button>
            </div>

            <!-- TERMS LIST -->
            <div id="terms-grid-body" style="display: flex; flex-direction: column; gap: 0.4rem;">
              <!-- Injected dynamically -->
            </div>

            <button type="button" id="btn-add-term-custom" class="secondary small" style="margin-top: 0.6rem;">
              + Add Custom Clause
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-top: 1px solid var(--border); background: var(--muted);">
            <button type="button" id="btn-clear-terms" class="danger small ghost">Clear All</button>
            <button type="button" id="btn-save-terms" class="primary small">Done & Apply</button>
          </div>
        </div>
      </dialog>

      <!-- ═════════════════════════════════════════════════════════════ -->
      <!-- MODAL: TAX DETAILS OVERLAY                                    -->
      <!-- ═════════════════════════════════════════════════════════════ -->
      <dialog id="modal-tax" style="width: min(95vw, 560px); max-height: 88vh; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 16px 36px rgba(0,0,0,0.25); padding: 0; background: var(--card); color: var(--card-foreground); overflow: hidden;">
        <div style="display: flex; flex-direction: column; max-height: 88vh;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--muted);">
            <div>
              <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span style="display: inline-flex; color: var(--primary);">${Icons.calculator}</span> Tax & Statutory Calculation
              </h3>
              <div style="font-size: 0.725rem; color: var(--muted-foreground); margin-top: 0.1rem;">GST type, applicable rates, and TCS summary</div>
            </div>
            <button type="button" id="btn-close-tax" class="ghost" style="padding: 0.2rem 0.5rem; display: flex; align-items: center; cursor: pointer;">${Icons.x}</button>
          </div>

          <div style="padding: 0.85rem 1rem; overflow-y: auto; flex: 1;" id="tax-details-content">
            <!-- Dynamically populated -->
          </div>

          <div style="display: flex; justify-content: flex-end; padding: 0.6rem 1rem; border-top: 1px solid var(--border); background: var(--muted);">
            <button type="button" id="btn-done-tax" class="primary small">Close</button>
          </div>
        </div>
      </dialog>
    </div>
  `;

  // Upgrade all native selects to custom styled dropdowns
  upgradeAllSelects();

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
    let totBags = 0;
    let totWght = 0;
    let totAmt = 0;

    linesBody.querySelectorAll('tr').forEach(tr => {
      const pack = parseFloat(tr.querySelector('.line-pack')?.value || '0');
      const wt = parseFloat(tr.querySelector('.line-weight')?.value || '0');
      const rate = parseFloat(tr.querySelector('.line-rate')?.value || '0');
      const amt = wt * rate;
      const bags = pack > 0 ? (wt * 100) / pack : 0;

      totBags += bags;
      totWght += wt;
      totAmt += amt;
    });

    const bagsBox = document.getElementById('tot-bags-box');
    if (bagsBox) bagsBox.textContent = totBags > 0 ? Math.round(totBags).toString() : '0';

    const wghtBox = document.getElementById('tot-wght-box');
    if (wghtBox) wghtBox.textContent = totWght.toFixed(2);

    const amtBox = document.getElementById('tot-amt-box');
    if (amtBox) amtBox.textContent = totAmt.toFixed(2);

    const qtyEl = document.getElementById('tot-qty');
    if (qtyEl) qtyEl.textContent = Math.round(totBags).toString();
    const wEl = document.getElementById('tot-wght');
    if (wEl) wEl.textContent = totWght.toFixed(2);
    const aEl = document.getElementById('tot-amt');
    if (aEl) aEl.textContent = formatCurrency(totAmt);
  };

  let activeDropdownPortal = null;
  const closeAllDropdowns = () => {
    if (activeDropdownPortal) {
      activeDropdownPortal.remove();
      activeDropdownPortal = null;
    }
  };

  document.addEventListener('mousedown', (e) => {
    if (activeDropdownPortal && !activeDropdownPortal.contains(e.target) && !e.target.closest('.custom-dropdown-container')) {
      closeAllDropdowns();
    }
  });

  window.addEventListener('scroll', () => {
    if (activeDropdownPortal && activeDropdownPortal._reposition) {
      activeDropdownPortal._reposition();
    }
  }, true);

  window.addEventListener('resize', () => {
    if (activeDropdownPortal && activeDropdownPortal._reposition) {
      activeDropdownPortal._reposition();
    }
  }, true);

  function attachDropdownField(inputEl, getOptions, onSelect) {
    function positionPortal(box) {
      const rect = inputEl.getBoundingClientRect();
      const minWidth = Math.max(rect.width, 130);
      box.style.width = minWidth + 'px';
      box.style.left = rect.left + 'px';

      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 200 && rect.top > 200) {
        box.style.bottom = (window.innerHeight - rect.top) + 'px';
        box.style.top = 'auto';
      } else {
        box.style.top = rect.bottom + 'px';
        box.style.bottom = 'auto';
      }
    }

    function renderList() {
      closeAllDropdowns();

      const box = document.createElement('div');
      box.className = 'autocomp custom-dropdown-portal';
      box.style.position = 'fixed';
      box.style.zIndex = '999999';
      box.style.maxHeight = '200px';
      box.style.overflowY = 'auto';
      box.style.background = 'var(--card)';
      box.style.border = '1px solid var(--border)';
      box.style.borderRadius = 'var(--radius-small)';
      box.style.boxShadow = 'var(--shadow-md)';
      box._reposition = () => positionPortal(box);

      document.body.appendChild(box);
      activeDropdownPortal = box;
      positionPortal(box);

      function updateItems(filterText = '') {
        const q = (filterText || '').toLowerCase().trim();
        const rawOptions = typeof getOptions === 'function' ? getOptions() : getOptions;
        const items = rawOptions.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : { value: opt.value || opt.name, label: opt.label || opt.name || opt.value });

        const filtered = q ? items.filter(it => it.label.toLowerCase().includes(q)) : items;

        box.innerHTML = '';
        if (filtered.length === 0) {
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'autocomp-item';
          emptyDiv.style.color = 'var(--muted-foreground)';
          emptyDiv.style.cursor = 'default';
          emptyDiv.textContent = 'No matching options';
          box.appendChild(emptyDiv);
          return;
        }

        filtered.forEach(it => {
          const rowDiv = document.createElement('div');
          const isSel = inputEl.value.trim().toUpperCase() === it.value.toUpperCase();
          rowDiv.className = 'autocomp-item' + (isSel ? ' autocomp-sel' : '');
          rowDiv.textContent = it.label;
          rowDiv.addEventListener('mousedown', (e) => {
            e.preventDefault();
            inputEl.value = it.value;
            closeAllDropdowns();
            if (onSelect) onSelect(it.value, it);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          });
          box.appendChild(rowDiv);
        });
      }

      updateItems(inputEl.getAttribute('readonly') ? '' : inputEl.value);

      inputEl._onInputFilter = () => {
        updateItems(inputEl.value);
        positionPortal(box);
      };
    }

    inputEl.addEventListener('focus', () => renderList());
    inputEl.addEventListener('click', () => {
      if (!activeDropdownPortal) renderList();
    });
    inputEl.addEventListener('input', () => {
      if (inputEl._onInputFilter) {
        inputEl._onInputFilter();
      } else {
        renderList();
      }
    });

    inputEl.addEventListener('blur', () => {
      setTimeout(() => {
        if (activeDropdownPortal) closeAllDropdowns();
      }, 180);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDropdowns();
      } else if (e.key === 'ArrowDown') {
        if (!activeDropdownPortal) renderList();
      }
    });
  }

  const addLineRow = (line = {}) => {
    const idx = linesBody.querySelectorAll('tr').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'sauda-line-row';

    const selectedComm = (line.commodityName || line.commodity || '').trim();
    const selectedBrand = (line.brand || line.quantityDetails || '').trim();
    const selectedType = (line.brokerageType || line.type || 'PQtl').trim();
    const weightVal = line.weightQuintals != null ? line.weightQuintals : (line.weight != null ? line.weight : '');
    const rateVal = line.rate != null ? line.rate : '';
    const initialAmt = (parseFloat(weightVal || '0') * parseFloat(rateVal || '0')).toFixed(2);

    tr.innerHTML = `
      <input type="hidden" class="line-id" value="${line.id || ''}">
      <td class="line-sno" style="padding: 0.2rem; text-align: center; font-weight: 700; color: var(--foreground);">${idx}</td>
      <td style="padding: 0.2rem;">
        <div class="custom-dropdown-container" style="position: relative; width: 100%;">
          <input type="text" id="line_comm_${idx}" class="compact-input line-commodity" value="${escapeHtml(selectedComm)}" placeholder="Select Commodity..." autocomplete="off" style="padding-right: 18px; cursor: pointer; text-overflow: ellipsis;" />
          <span style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); font-size: 0.55rem; color: var(--muted-foreground); pointer-events: none; opacity: 0.7;">▼</span>
        </div>
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" class="compact-input line-qty" value="${line.numberOfLorries != null ? line.numberOfLorries : (line.qtyNos != null ? line.qtyNos : '1')}" style="text-align: right;" placeholder="1" min="1" />
      </td>
      <td style="padding: 0.2rem;">
        <div class="custom-dropdown-container" style="position: relative; width: 100%;">
          <input type="text" id="line_brand_${idx}" class="compact-input line-brand" value="${escapeHtml(selectedBrand)}" placeholder="Details / Vehicle..." autocomplete="off" style="padding-right: 18px; cursor: pointer; text-overflow: ellipsis;" />
          <span style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); font-size: 0.55rem; color: var(--muted-foreground); pointer-events: none; opacity: 0.7;">▼</span>
        </div>
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="any" class="compact-input line-pack" value="${line.packWeight != null ? parseFloat(line.packWeight) : (line.pack != null ? parseFloat(line.pack) : '50')}" style="text-align: right;" placeholder="50" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="0.001" class="compact-input line-weight" value="${weightVal}" style="text-align: right;" placeholder="250.00" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="0.01" class="compact-input line-rate" value="${rateVal}" style="text-align: right;" placeholder="8151.00" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="text" class="compact-input line-amount" value="${line.amount ? parseFloat(line.amount).toFixed(2) : (parseFloat(initialAmt) > 0 ? initialAmt : '0.00')}" readonly style="text-align: right; font-weight: 700; color: var(--foreground); background: var(--muted);" />
      </td>
      <td style="padding: 0.2rem;">
        <input type="number" step="0.01" class="compact-input line-brok" value="${line.sellerBrokerageRate != null ? line.sellerBrokerageRate : (line.slBrokRate != null ? line.slBrokRate : '20.00')}" style="text-align: right;" placeholder="20.00" />
      </td>
      <td style="padding: 0.2rem;">
        <div class="custom-dropdown-container" style="position: relative; width: 100%;">
          <input type="text" id="line_type_${idx}" class="compact-input line-type" value="${escapeHtml(selectedType)}" placeholder="PQtl" autocomplete="off" readonly style="padding-right: 18px; cursor: pointer; text-align: center;" />
          <span style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); font-size: 0.55rem; color: var(--muted-foreground); pointer-events: none; opacity: 0.7;">▼</span>
        </div>
      </td>
      <td style="text-align: center; padding: 0.2rem 0.1rem;">
        <button type="button" class="btn-remove-line danger small" style="padding: 0 0.25rem; height: 20px; font-size: 0.65rem;" title="Remove row">×</button>
      </td>
    `;

    const recalcRow = () => {
      const wt = parseFloat(tr.querySelector('.line-weight').value || '0');
      const rate = parseFloat(tr.querySelector('.line-rate').value || '0');
      const amt = wt * rate;
      tr.querySelector('.line-amount').value = amt > 0 ? amt.toFixed(2) : '0.00';
      recalculateGrandTotals();
    };

    tr.querySelector('.line-qty').addEventListener('input', recalcRow);
    tr.querySelector('.line-pack').addEventListener('input', recalcRow);
    tr.querySelector('.line-weight').addEventListener('input', recalcRow);
    tr.querySelector('.line-rate').addEventListener('input', recalcRow);
    tr.querySelector('.line-brok').addEventListener('input', recalcRow);

    // Attach custom autocomplete-styled dropdowns
    attachDropdownField(tr.querySelector('.line-commodity'), () => {
      return allCommodities.map(c => c.name || c);
    }, () => recalcRow());

    attachDropdownField(tr.querySelector('.line-brand'), () => {
      return vehicleOptions;
    }, () => recalcRow());

    attachDropdownField(tr.querySelector('.line-type'), () => {
      return ['PQtl', 'PBag', '%', 'Fix'];
    }, () => recalcRow());

    tr.querySelector('.btn-remove-line').addEventListener('click', () => {
      tr.remove();
      linesBody.querySelectorAll('tr').forEach((row, i) => {
        const sno = row.querySelector('.line-sno');
        if (sno) sno.textContent = i + 1;
      });
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

  // Trigger initial totals calculation
  recalculateGrandTotals();

  document.getElementById('btn-add-line').addEventListener('click', () => addLineRow());

  // Virtual List setup for 60 FPS smooth scrolling
  const vl = new VirtualList({
    container: document.getElementById('contracts-list-items'),
    itemHeight: 56,
    buffer: 6,
    items: allContracts,
    selectedId: id,
    getItemId: c => c.id,
    renderItem: (c, isSelected) => `
      <div class="split-pane-list-item ${isSelected ? 'selected' : ''}" data-id="${c.id}" style="height: 56px; box-sizing: border-box; justify-content: center; padding: 0.25rem 0.5rem;">
        <div style="font-weight: 700; font-size: 0.8rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 0.5rem;">#${c.saudaNo} (${escapeHtml(c.saudaBook || 'SD')})</span>
          <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary); flex-shrink: 0;">${formatCurrency(c.amount)}</span>
        </div>
        <div style="font-size: 0.7rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(c.buyerName || 'Buyer')} vs ${escapeHtml(c.sellerName || 'Seller')}
        </div>
        <div style="font-size: 0.65rem; color: var(--muted-foreground); display: flex; justify-content: space-between; margin-top: 0.1rem; overflow: hidden; white-space: nowrap;">
          <span>${formatDate(c.saudaDate)}</span>
          ${c.commodityName ? `<span style="font-weight: 600; color: var(--foreground); overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.commodityName)}</span>` : ''}
        </div>
      </div>
    `,
    onSelect: (selectedId) => {
      const bookVal = document.getElementById('filter-contract-book')?.value || currentBook;
      renderContractForm(selectedId, allContracts, bookVal);
    },
    emptyMessage: 'No contracts found. Click "+ New Sauda" to create.'
  });

  if (id) {
    vl.scrollToId(id);
  }

  // Precompute lowercase search index for instant in-memory filtering
  allContracts.forEach(c => {
    if (!c._search) {
      c._search = `${c.saudaNo || ''} ${c.saudaBook || ''} ${c.buyerName || ''} ${c.sellerName || ''} ${c.commodityName || ''}`.toLowerCase();
    }
  });

  // Instant in-memory search + debounced fallback
  let searchTimeout = null;
  document.getElementById('search-contracts').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const countEl = document.getElementById('sauda-count');
    if (!q) {
      if (countEl) countEl.textContent = allContracts.length.toLocaleString();
      vl.setItems(allContracts, true);
      return;
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const localFiltered = allContracts.filter(c => {
      const str = c._search || (c._search = `${c.saudaNo || ''} ${c.saudaBook || ''} ${c.buyerName || ''} ${c.sellerName || ''} ${c.commodityName || ''}`.toLowerCase());
      return tokens.every(tok => str.includes(tok));
    });

    if (countEl) countEl.textContent = `${localFiltered.length.toLocaleString()} of ${allContracts.length.toLocaleString()}`;
    vl.setItems(localFiltered, true);

    // Debounced server search if query might be outside preloaded limit
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const bookVal = document.getElementById('filter-contract-book')?.value || currentBook;
      try {
        const results = await api.get(`/contracts?q=${encodeURIComponent(q)}&book=${bookVal}&limit=9999`);
        results.forEach(c => {
          c._search = `${c.saudaNo || ''} ${c.saudaBook || ''} ${c.buyerName || ''} ${c.sellerName || ''} ${c.commodityName || ''}`.toLowerCase();
        });
        if (countEl) countEl.textContent = `${results.length.toLocaleString()} found`;
        vl.setItems(results, true);
      } catch (err) {
        console.warn('Search contracts failed:', err);
      }
    }, 400);
  });

  // Book filter change handler
  document.getElementById('filter-contract-book')?.addEventListener('change', async (e) => {
    const newBook = e.target.value;
    const res = await api.get(`/contracts?book=${newBook}&limit=9999`);
    const firstId = res.length > 0 ? res[0].id : null;
    renderContractForm(firstId, res, newBook);
  });



  document.getElementById('btn-new-sauda').addEventListener('click', () => renderContractForm(null, allContracts, currentBook));
  document.getElementById('btn-reset-contract')?.addEventListener('click', () => renderContractForm(null, allContracts, currentBook));

  // Modal Badges Updater
  const updateBadges = () => {
    const bSpec = document.getElementById('badge-spec-count');
    if (bSpec) {
      bSpec.textContent = contractSpecs.length;
      bSpec.style.display = contractSpecs.length > 0 ? 'inline-block' : 'none';
    }
    const bDoc = document.getElementById('badge-doc-count');
    if (bDoc) {
      bDoc.textContent = contractDocs.length;
      bDoc.style.display = contractDocs.length > 0 ? 'inline-block' : 'none';
    }
    const bTerms = document.getElementById('badge-terms-count');
    if (bTerms) {
      bTerms.textContent = contractTermsList.length;
      bTerms.style.display = contractTermsList.length > 0 ? 'inline-block' : 'none';
    }
  };

  // 1. Specifications Modal Logic
  const modalSpecs = document.getElementById('modal-specifications');
  const specsBody = document.getElementById('specs-grid-body');

  const renderSpecsRows = () => {
    specsBody.innerHTML = '';
    contractSpecs.forEach((spec, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 0.25rem; text-align: center; font-weight: 700;">${i + 1}</td>
        <td style="padding: 0.25rem;">
          <input type="text" class="compact-input spec-name" value="${escapeHtml(spec.specName || '')}" placeholder="MOISTURE / PURITY" required style="font-weight: 600;" />
        </td>
        <td style="padding: 0.25rem;">
          <input type="number" step="0.01" class="compact-input spec-val" value="${spec.specValue || ''}" placeholder="0.00" style="text-align: right;" />
        </td>
        <td style="padding: 0.25rem;">
          <select class="compact-select spec-minmax">
            <option value="" ${!spec.minMax ? 'selected' : ''}>-</option>
            <option value="MAX" ${spec.minMax === 'MAX' ? 'selected' : ''}>MAX</option>
            <option value="MIN" ${spec.minMax === 'MIN' ? 'selected' : ''}>MIN</option>
            <option value="BASIS" ${spec.minMax === 'BASIS' ? 'selected' : ''}>BASIS</option>
          </select>
        </td>
        <td style="padding: 0.25rem;">
          <input type="text" class="compact-input spec-rem" value="${escapeHtml(spec.remarks || '')}" placeholder="Remarks / rejection rule" />
        </td>
        <td style="padding: 0.25rem; text-align: center;">
          <button type="button" class="btn-remove-spec danger small" style="padding: 0 0.3rem; height: 22px; display: inline-flex; align-items: center; justify-content: center;">${Icons.trash}</button>
        </td>
      `;
      tr.querySelector('.btn-remove-spec').addEventListener('click', () => {
        tr.remove();
      });
      specsBody.appendChild(tr);
    });
  };

  const addSpecRow = (s = { specName: '', specValue: '', minMax: 'MAX', remarks: '' }) => {
    contractSpecs.push(s);
    renderSpecsRows();
  };

  document.getElementById('btn-overlay-spec')?.addEventListener('click', () => {
    renderSpecsRows();
    modalSpecs?.showModal();
  });
  document.getElementById('btn-close-specs')?.addEventListener('click', () => modalSpecs?.close());
  document.getElementById('btn-add-spec-row')?.addEventListener('click', () => addSpecRow());
  document.getElementById('btn-clear-specs')?.addEventListener('click', () => {
    contractSpecs = [];
    renderSpecsRows();
  });
  document.querySelectorAll('.btn-chip-spec').forEach(btn => {
    btn.addEventListener('click', () => {
      addSpecRow({
        specName: btn.getAttribute('data-name'),
        specValue: btn.getAttribute('data-val'),
        minMax: btn.getAttribute('data-mm'),
        remarks: btn.getAttribute('data-rem') || '',
      });
    });
  });
  document.getElementById('btn-save-specs')?.addEventListener('click', () => {
    const rows = specsBody.querySelectorAll('tr');
    const updated = [];
    rows.forEach(tr => {
      const name = tr.querySelector('.spec-name')?.value.trim();
      if (name) {
        updated.push({
          specName: name,
          specValue: tr.querySelector('.spec-val')?.value || '',
          minMax: tr.querySelector('.spec-minmax')?.value || '',
          remarks: tr.querySelector('.spec-rem')?.value.trim() || '',
        });
      }
    });
    contractSpecs = updated;
    updateBadges();
    modalSpecs?.close();
    showToast(`Saved ${contractSpecs.length} specification parameter(s)`);
  });

  // 2. Documentation Modal Logic
  const modalDocs = document.getElementById('modal-documentation');
  const docsBody = document.getElementById('docs-grid-body');

  const renderDocsRows = () => {
    docsBody.innerHTML = '';
    if (contractDocs.length === 0) {
      docsBody.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.75rem; text-align: center; padding: 1rem;">No documentation notes added yet. Use quick chips or click "+ Add Document Instruction".</div>';
      return;
    }
    contractDocs.forEach((doc, i) => {
      const div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 0.35rem; align-items: center;';
      div.innerHTML = `
        <span style="font-weight: 700; font-size: 0.75rem; width: 22px; text-align: center;">${i + 1}.</span>
        <input type="text" class="compact-input doc-text" value="${escapeHtml(doc.narration || '')}" placeholder="e.g. Weighbridge slip mandatory..." style="flex: 1;" />
        <button type="button" class="btn-remove-doc danger small" style="padding: 0 0.35rem; height: 24px; display: inline-flex; align-items: center; justify-content: center;">${Icons.trash}</button>
      `;
      div.querySelector('.btn-remove-doc').addEventListener('click', () => {
        div.remove();
      });
      docsBody.appendChild(div);
    });
  };

  const addDocRow = (narration = '') => {
    if (contractDocs.length === 0 && docsBody.children.length === 1 && !docsBody.querySelector('.doc-text')) {
      docsBody.innerHTML = '';
    }
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 0.35rem; align-items: center;';
    const count = docsBody.querySelectorAll('.doc-text').length;
    div.innerHTML = `
      <span style="font-weight: 700; font-size: 0.75rem; width: 22px; text-align: center;">${count + 1}.</span>
      <input type="text" class="compact-input doc-text" value="${escapeHtml(narration)}" placeholder="e.g. Weighbridge slip mandatory..." style="flex: 1;" />
      <button type="button" class="btn-remove-doc danger small" style="padding: 0 0.35rem; height: 24px; display: inline-flex; align-items: center; justify-content: center;">${Icons.trash}</button>
    `;
    div.querySelector('.btn-remove-doc').addEventListener('click', () => {
      div.remove();
    });
    docsBody.appendChild(div);
  };

  document.getElementById('btn-overlay-doc')?.addEventListener('click', () => {
    renderDocsRows();
    modalDocs?.showModal();
  });
  document.getElementById('btn-close-docs')?.addEventListener('click', () => modalDocs?.close());
  document.getElementById('btn-add-doc-row')?.addEventListener('click', () => addDocRow());
  document.getElementById('btn-clear-docs')?.addEventListener('click', () => {
    contractDocs = [];
    renderDocsRows();
  });
  document.querySelectorAll('.btn-chip-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      addDocRow(btn.getAttribute('data-text') || '');
    });
  });
  document.getElementById('btn-save-docs')?.addEventListener('click', () => {
    const inputs = docsBody.querySelectorAll('.doc-text');
    const updated = [];
    inputs.forEach((inp, idx) => {
      const val = inp.value.trim();
      if (val) updated.push({ narration: val, sortOrder: idx });
    });
    contractDocs = updated;
    updateBadges();
    modalDocs?.close();
    showToast(`Saved ${contractDocs.length} documentation note(s)`);
  });

  // 3. Terms Modal Logic
  const modalTerms = document.getElementById('modal-terms');
  const termsBody = document.getElementById('terms-grid-body');

  const renderTermsRows = () => {
    termsBody.innerHTML = '';
    if (contractTermsList.length === 0) {
      termsBody.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.75rem; text-align: center; padding: 1rem;">No custom clauses added yet. Choose a template or click "+ Add Custom Clause".</div>';
      return;
    }
    contractTermsList.forEach((t, i) => {
      const div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 0.35rem; align-items: center;';
      div.innerHTML = `
        <span style="font-weight: 700; font-size: 0.75rem; width: 22px; text-align: center;">${i + 1}.</span>
        <textarea class="compact-input term-text" rows="2" style="flex: 1; resize: vertical;" placeholder="Contract clause...">${escapeHtml(t.narration || '')}</textarea>
        <button type="button" class="btn-remove-term danger small" style="padding: 0 0.35rem; height: 26px; display: inline-flex; align-items: center; justify-content: center;">${Icons.trash}</button>
      `;
      div.querySelector('.btn-remove-term').addEventListener('click', () => {
        div.remove();
      });
      termsBody.appendChild(div);
    });
  };

  const addTermRow = (narration = '') => {
    if (contractTermsList.length === 0 && termsBody.children.length === 1 && !termsBody.querySelector('.term-text')) {
      termsBody.innerHTML = '';
    }
    const count = termsBody.querySelectorAll('.term-text').length;
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 0.35rem; align-items: center;';
    div.innerHTML = `
      <span style="font-weight: 700; font-size: 0.75rem; width: 22px; text-align: center;">${count + 1}.</span>
      <textarea class="compact-input term-text" rows="2" style="flex: 1; resize: vertical;" placeholder="Contract clause...">${escapeHtml(narration)}</textarea>
      <button type="button" class="btn-remove-term danger small" style="padding: 0 0.35rem; height: 26px; display: inline-flex; align-items: center; justify-content: center;">${Icons.trash}</button>
    `;
    div.querySelector('.btn-remove-term').addEventListener('click', () => {
      div.remove();
    });
    termsBody.appendChild(div);
  };

  document.getElementById('btn-overlay-terms')?.addEventListener('click', () => {
    renderTermsRows();
    modalTerms?.showModal();
  });
  document.getElementById('btn-close-terms')?.addEventListener('click', () => modalTerms?.close());
  document.getElementById('btn-add-term-custom')?.addEventListener('click', () => addTermRow());
  document.getElementById('btn-add-term-template')?.addEventListener('click', () => {
    const sel = document.getElementById('select-term-template');
    if (sel && sel.value) {
      addTermRow(sel.value);
      sel.value = '';
    }
  });
  document.getElementById('btn-clear-terms')?.addEventListener('click', () => {
    contractTermsList = [];
    renderTermsRows();
  });
  document.getElementById('btn-save-terms')?.addEventListener('click', () => {
    const inputs = termsBody.querySelectorAll('.term-text');
    const updated = [];
    inputs.forEach((inp, idx) => {
      const val = inp.value.trim();
      if (val) updated.push({ narration: val, sortOrder: idx });
    });
    contractTermsList = updated;
    updateBadges();
    modalTerms?.close();
    showToast(`Saved ${contractTermsList.length} contract clause(s)`);
  });

  // 4. Tax Details Modal Logic
  const modalTax = document.getElementById('modal-tax');
  const taxContent = document.getElementById('tax-details-content');

  document.getElementById('btn-overlay-tax')?.addEventListener('click', () => {
    let totAmt = 0;
    linesBody.querySelectorAll('tr').forEach(tr => {
      const aStr = tr.querySelector('.line-amount')?.value.replace(/[^0-9.]/g, '') || '0';
      totAmt += parseFloat(aStr) || 0;
    });

    const seller = document.getElementById('sellerName')?.value || 'Seller';
    const buyer = document.getElementById('buyerName')?.value || 'Buyer';
    const origin = document.getElementById('originStation')?.value || '-';
    const dest = document.getElementById('destinationStation')?.value || '-';
    const isInterState = origin.trim() && dest.trim() && origin.trim().toLowerCase() !== dest.trim().toLowerCase();

    const gstRate = 5;
    const gstAmt = (totAmt * gstRate) / 100;
    const cgstAmt = isInterState ? 0 : gstAmt / 2;
    const sgstAmt = isInterState ? 0 : gstAmt / 2;
    const igstAmt = isInterState ? gstAmt : 0;
    const tcsAmt = (totAmt * 0.1) / 100;

    taxContent.innerHTML = `
      <div style="background: var(--muted); padding: 0.6rem 0.8rem; border-radius: 4px; margin-bottom: 0.75rem; font-size: 0.775rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <span style="color: var(--muted-foreground);">Contract Base Value:</span>
          <strong>${formatCurrency(totAmt)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <span style="color: var(--muted-foreground);">Origin → Destination:</span>
          <span>${escapeHtml(origin)} → ${escapeHtml(dest)} (${isInterState ? 'Inter-State IGST' : 'Intra-State CGST+SGST'})</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--muted-foreground);">Trade Parties:</span>
          <span>${escapeHtml(seller)} vs ${escapeHtml(buyer)}</span>
        </div>
      </div>

      <div style="border: 1px solid var(--border); border-radius: 4px; overflow: hidden; font-size: 0.75rem;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--muted); font-weight: 700;">
              <th style="padding: 0.35rem 0.5rem; text-align: left;">Tax Component</th>
              <th style="padding: 0.35rem 0.5rem; text-align: center; width: 70px;">Rate</th>
              <th style="padding: 0.35rem 0.5rem; text-align: right; width: 110px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${isInterState ? `
              <tr style="border-top: 1px solid var(--border);">
                <td style="padding: 0.35rem 0.5rem;">Integrated GST (IGST)</td>
                <td style="padding: 0.35rem 0.5rem; text-align: center;">5%</td>
                <td style="padding: 0.35rem 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(igstAmt)}</td>
              </tr>
            ` : `
              <tr style="border-top: 1px solid var(--border);">
                <td style="padding: 0.35rem 0.5rem;">Central GST (CGST)</td>
                <td style="padding: 0.35rem 0.5rem; text-align: center;">2.5%</td>
                <td style="padding: 0.35rem 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(cgstAmt)}</td>
              </tr>
              <tr style="border-top: 1px solid var(--border);">
                <td style="padding: 0.35rem 0.5rem;">State GST (SGST)</td>
                <td style="padding: 0.35rem 0.5rem; text-align: center;">2.5%</td>
                <td style="padding: 0.35rem 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(sgstAmt)}</td>
              </tr>
            `}
            <tr style="border-top: 1px solid var(--border); background: var(--card);">
              <td style="padding: 0.35rem 0.5rem;">TCS u/s 206C(1H) (Above ₹50L)</td>
              <td style="padding: 0.35rem 0.5rem; text-align: center;">0.1%</td>
              <td style="padding: 0.35rem 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(tcsAmt)}</td>
            </tr>
            <tr style="border-top: 2px solid var(--border); background: #e0e7ff; color: #1e1b4b; font-weight: 700;">
              <td style="padding: 0.4rem 0.5rem;">Total Invoice Value (Est.)</td>
              <td style="padding: 0.4rem 0.5rem; text-align: center;">-</td>
              <td style="padding: 0.4rem 0.5rem; text-align: right;">${formatCurrency(totAmt + gstAmt + tcsAmt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    modalTax?.showModal();
  });
  document.getElementById('btn-close-tax')?.addEventListener('click', () => modalTax?.close());
  document.getElementById('btn-done-tax')?.addEventListener('click', () => modalTax?.close());

  if (isEdit) {
    document.getElementById('btn-print-contract')?.addEventListener('click', () => {
      window.open(`/api/pdf/contract/${contract.saudaNo}`, '_blank');
    });
    document.getElementById('btn-delete-contract')?.addEventListener('click', async () => {
      if (!(await confirmDialog(`Are you sure you want to delete Sauda #${contract.saudaNo}?`))) return;
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
      const comm = tr.querySelector('.line-commodity')?.value.trim();
      if (!comm) return; // skip rows with no commodity selected

      const brand = tr.querySelector('.line-brand')?.value.trim() || null;
      const qtyNos = tr.querySelector('.line-qty')?.value ? parseInt(tr.querySelector('.line-qty').value, 10) : 1;
      const pack = tr.querySelector('.line-pack')?.value ? parseFloat(tr.querySelector('.line-pack').value) : 50;
      const wt = parseFloat(tr.querySelector('.line-weight')?.value || '0');
      const rate = parseFloat(tr.querySelector('.line-rate')?.value || '0');
      const bags = pack > 0 ? Math.round((wt * 100) / pack) : null;
      const brok = tr.querySelector('.line-brok')?.value ? parseFloat(tr.querySelector('.line-brok').value) : null;
      const brokType = tr.querySelector('.line-type')?.value || 'PQtl';

      lines.push({
        id: tr.querySelector('.line-id')?.value || undefined,
        commodity: comm,
        commodityName: comm,
        brand: brand,
        quantityDetails: brand,
        numberOfLorries: qtyNos,
        qtyNos: qtyNos,
        packWeight: pack,
        pack: pack,
        quantityBags: bags,
        weightQuintals: wt,
        weight: wt,
        rate: rate,
        amount: (wt * rate).toFixed(2),
        sellerBrokerageRate: brok,
        slBrokRate: brok,
        brokerageType: brokType,
        type: brokType,
      });
    });

    if (lines.length === 0) {
      showToast('Please select a commodity for at least one line item', 'error');
      return;
    }

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
      specifications: contractSpecs,
      documents: contractDocs,
      terms: contractTermsList,
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
