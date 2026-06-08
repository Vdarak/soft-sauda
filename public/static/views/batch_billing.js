/**
 * Batch Bill Generation Utility View
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderBatchBilling() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    // Retrieve parties and commodities for checkboxes
    const allParties = await api.get('/parties');
    const allCommodities = await api.get('/commodities');

    const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultTo = new Date().toISOString().split('T')[0];

    app.innerHTML = `
      ${PageHeader({ title: 'Batch Bill Generation', subtitle: 'Process unbilled contracts and shipments in bulk', backHref: '/bills' })}

      <div class="form-grid" style="grid-template-columns: 1fr 2fr; gap: 1.5rem; margin-bottom: 2rem;">
        <!-- Left Pane: Configuration & Filters -->
        <div class="table-container" style="padding: 1.5rem; height: fit-content; background: var(--card);">
          <h3 style="margin-top: 0; margin-bottom: 1rem; font-size: 0.875rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Configuration</h3>
          
          <form id="batch-config-form">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${FormGroup({ id: 'fromDate', label: 'From Date', type: 'date', value: defaultFrom })}
              ${FormGroup({ id: 'toDate', label: 'To Date', type: 'date', value: defaultTo })}
              ${FormGroup({ id: 'billDate', label: 'Issuing Bill Date', type: 'date', value: defaultTo })}
              ${FormGroup({ id: 'creditDays', label: 'Default Credit Days', type: 'number', value: '', placeholder: 'e.g. 30' })}

              <div>
                <label style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground);">Billing Basis</label>
                <div style="display: flex; gap: 1rem; margin-top: 0.25rem;">
                  <label style="display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.8125rem;">
                    <input type="radio" name="basis" value="DELIVERY" checked> Delivery Based
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.8125rem;">
                    <input type="radio" name="basis" value="CONTRACT"> Contract Based
                  </label>
                </div>
              </div>

              <div>
                <label style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground);">Billing Scope</label>
                <div style="display: flex; gap: 1rem; margin-top: 0.25rem;">
                  <label style="display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.8125rem;">
                    <input type="radio" name="scope" value="BUYER_WISE" checked> Buyer Invoice
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.8125rem;">
                    <input type="radio" name="scope" value="SELLER_WISE"> Seller Invoice
                  </label>
                </div>
              </div>

              <!-- Party checklist filter -->
              <div>
                <label style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground);">Billed Accounts (Parties)</label>
                <input type="text" id="party-search-checklist" placeholder="Search parties..." style="margin: 0.25rem 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; width: 100%;">
                <div id="parties-checklist-container" style="max-height: 120px; overflow-y: auto; border: 1px solid var(--border); padding: 0.5rem; border-radius: 0.375rem; display: flex; flex-direction: column; gap: 0.25rem; background: var(--background);">
                  ${allParties.map(p => `
                    <label class="party-check-item" style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; cursor: pointer;">
                      <input type="checkbox" name="selectedParties" value="${p.id}" checked>
                      <span>${escapeHtml(p.name)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Commodity checklist filter -->
              <div>
                <label style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground);">Commodities</label>
                <input type="text" id="commodity-search-checklist" placeholder="Search commodities..." style="margin: 0.25rem 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; width: 100%;">
                <div id="commodities-checklist-container" style="max-height: 100px; overflow-y: auto; border: 1px solid var(--border); padding: 0.5rem; border-radius: 0.375rem; display: flex; flex-direction: column; gap: 0.25rem; background: var(--background);">
                  ${allCommodities.map(c => `
                    <label class="commodity-check-item" style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; cursor: pointer;">
                      <input type="checkbox" name="selectedCommodities" value="${c.id}" checked>
                      <span>${escapeHtml(c.name)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <button type="button" id="btn-load-candidates" class="secondary" style="width: 100%; justify-content: center;">Load Candidates</button>
            </div>
          </form>
        </div>

        <!-- Right Pane: Candidate Grid -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="table-container" style="background: var(--card);">
            <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
              <h2>Candidate Transactions</h2>
              <div>
                <button class="secondary small" id="btn-select-all">Select All</button>
                <button class="secondary small" id="btn-select-none">Clear Selection</button>
              </div>
            </div>
            <div style="overflow-x: auto; max-height: 480px;">
              <table id="candidates-table">
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">✓</th>
                    <th>Date</th>
                    <th>Ref details</th>
                    <th>Billed Party</th>
                    <th>Commodity</th>
                    <th style="text-align: right;">Weight (Qtl)</th>
                    <th style="text-align: right;">Rate (₹)</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody id="candidates-body">
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem; color: var(--muted-foreground);">
                      Configure options on the left and click "Load Candidates"
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Process button bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.75rem;">
            <div style="font-size: 0.875rem; font-weight: 500;">
              Selected: <span id="selected-count" style="color: var(--primary); font-weight: 700;">0</span> item(s)
            </div>
            <button class="primary" id="btn-proceed" style="gap: 0.5rem;" disabled>
              ${Icons.plus} Generate Bills (F6)
            </button>
          </div>
        </div>
      </div>
    `;

    // Local checklist search handlers
    document.getElementById('party-search-checklist')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.party-check-item').forEach(el => {
        const txt = el.querySelector('span').textContent.toLowerCase();
        el.style.display = txt.includes(q) ? 'flex' : 'none';
      });
    });

    document.getElementById('commodity-search-checklist')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.commodity-check-item').forEach(el => {
        const txt = el.querySelector('span').textContent.toLowerCase();
        el.style.display = txt.includes(q) ? 'flex' : 'none';
      });
    });

    let candidatesList = [];

    // Load Candidates click handler
    const loadCandidates = async () => {
      const fromDate = document.getElementById('fromDate').value;
      const toDate = document.getElementById('toDate').value;
      const basis = document.querySelector('input[name="basis"]:checked').value;
      const scope = document.querySelector('input[name="scope"]:checked').value;

      // Extract checked values
      const partyIds = Array.from(document.querySelectorAll('input[name="selectedParties"]:checked')).map(el => el.value);
      const commodityIds = Array.from(document.querySelectorAll('input[name="selectedCommodities"]:checked')).map(el => el.value);

      if (partyIds.length === 0) {
        showToast('Please select at least one party', 'error');
        return;
      }
      if (commodityIds.length === 0) {
        showToast('Please select at least one commodity', 'error');
        return;
      }

      const tbody = document.getElementById('candidates-body');
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;"><span class="spinner" style="display:inline-block"></span> Loading...</td></tr>`;

      try {
        const partiesFilter = partyIds.length === allParties.length ? 'ALL' : partyIds.join(',');
        const commoditiesFilter = commodityIds.length === allCommodities.length ? 'ALL' : commodityIds.join(',');

        const queryUrl = `/utilities/batch-billing?basis=${basis}&fromDate=${fromDate}&toDate=${toDate}&parties=${partiesFilter}&commodities=${commoditiesFilter}`;
        candidatesList = await api.get(queryUrl, { forceRefresh: true });

        renderCandidatesGrid(candidatesList, basis, scope);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">${escapeHtml(err.message)}</td></tr>`;
      }
    };

    document.getElementById('btn-load-candidates')?.addEventListener('click', loadCandidates);

    // Grid selection handlers
    document.getElementById('btn-select-all')?.addEventListener('click', () => {
      document.querySelectorAll('.candidate-row-select').forEach(el => el.checked = true);
      updateSelectedCount();
    });

    document.getElementById('btn-select-none')?.addEventListener('click', () => {
      document.querySelectorAll('.candidate-row-select').forEach(el => el.checked = false);
      updateSelectedCount();
    });

    // Submit handler
    document.getElementById('btn-proceed')?.addEventListener('click', async () => {
      const selectedBoxes = Array.from(document.querySelectorAll('.candidate-row-select:checked'));
      if (selectedBoxes.length === 0) return;

      const selectedIds = selectedBoxes.map(el => parseInt(el.getAttribute('data-id'), 10));
      const basis = document.querySelector('input[name="basis"]:checked').value;
      const scope = document.querySelector('input[name="scope"]:checked').value;
      const billDate = document.getElementById('billDate').value;
      const creditDays = document.getElementById('creditDays').value;

      const btn = document.getElementById('btn-proceed');
      const origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Generating...';

      try {
        const res = await api.post('/utilities/batch-billing', {
          basis,
          scope,
          billDate,
          creditDays,
          selectedIds,
        });

        showToast(`Invoices generated successfully: ${res.count} bills generated!`, 'success');
        // Reload list
        await loadCandidates();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
        showToast(err.message, 'error');
      }
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}

function renderCandidatesGrid(items, basis, scope) {
  const tbody = document.getElementById('candidates-body');
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 3rem; color: var(--muted-foreground);">No unbilled transactions found matching filters.</td></tr>`;
    updateSelectedCount();
    return;
  }

  tbody.innerHTML = items.map((item, idx) => {
    const id = basis === 'DELIVERY' ? item.deliveryId : item.contractId;
    const refDate = basis === 'DELIVERY' ? item.dispatchDate : item.saudaDate;
    const refDetails = basis === 'DELIVERY' ? `Disp: #${item.deliveryId} (Sauda: #${item.saudaNo})` : `Sauda: #${item.saudaNo} (${item.saudaBook})`;
    const billedParty = scope === 'SELLER_WISE' ? item.sellerName : item.buyerName;
    const wt = basis === 'DELIVERY' ? item.dispatchedWeight : item.weightQuintals;
    const rate = item.rate;
    const amount = parseFloat(wt) * parseFloat(rate);

    return `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="candidate-row-select" data-id="${id}">
        </td>
        <td>${formatDate(refDate)}</td>
        <td style="font-weight: 500;">${escapeHtml(refDetails)}</td>
        <td>${escapeHtml(billedParty)}</td>
        <td style="font-weight: 600;">${escapeHtml(item.commodityName)}</td>
        <td style="text-align: right;" class="mono">${wt}</td>
        <td style="text-align: right;" class="mono">${formatCurrency(rate).replace('₹ ', '')}</td>
        <td style="text-align: right; font-weight: 600;" class="mono">${formatCurrency(amount)}</td>
      </tr>
    `;
  }).join('');

  // Bind checkbox changes
  document.querySelectorAll('.candidate-row-select').forEach(el => {
    el.addEventListener('change', updateSelectedCount);
  });

  updateSelectedCount();
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.candidate-row-select:checked').length;
  document.getElementById('selected-count').textContent = count;
  
  const proceedBtn = document.getElementById('btn-proceed');
  if (proceedBtn) {
    proceedBtn.disabled = count === 0;
  }
}
