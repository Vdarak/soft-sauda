/**
 * Deliveries View — List + Create/Edit form
 * 
 * WS2: Loading Days column, Bill No column, unified Lorry/Truck label
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { clientCache } from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';
import { autocomp } from '../vendor/autocomp.js';


/** Compute days between two dates */
function daysBetween(d1, d2) {
  if (!d1 || !d2) return '-';
  const a = new Date(d1);
  const b = new Date(d2);
  const diff = Math.abs(b - a);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function renderDeliveryList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get('/deliveries');

    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">Disp #${c.dispatchNo || c.id}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Sauda: ${c.saudaNo || '-'}</div>
        </td>
        <td>${formatDate(c.dispatchDate)}</td>
        <td style="font-weight:500">${escapeHtml(c.truckNo || '-')}</td>
        <td>${escapeHtml(c.billNo || '-')}</td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.transporterName || '-')}</div>
        </td>
        <td style="text-align:center;font-weight:600;color:var(--primary)">${daysBetween(c.saudaDate, c.dispatchDate)}</td>
        <td style="text-align:center">${Badge(c.status || 'PENDING', c.status === 'DELIVERED' ? 'active' : 'draft')}</td>
        <td style="text-align:right" onclick="event.stopPropagation()">
          <div style="display:inline-flex; gap:0.25rem; justify-content:flex-end;">
            <a href="/deliveries/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${c.id}" data-entity="deliveries">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Deliveries', actions: `<button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button><button class="secondary" id="export-deliveries-btn" style="margin-right:0.5rem">${Icons.download} Export Excel</button><a href="/deliveries/new" data-route><button class="primary">${Icons.plus} New Delivery</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-deliveries" placeholder="Search deliveries..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'deliveries-table',
        count: data.length,
        headers: [
          { label: 'Reference' },
          { label: 'Date' },
          { label: 'Lorry/Truck No.' },
          { label: 'Bill No.' },
          { label: 'Transport' },
          { label: 'Loading Days', style: 'text-align:center' },
          { label: 'Status', style: 'text-align:center' },
          { label: 'Actions', style: 'text-align:right' }
        ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-deliveries', document.querySelector('#deliveries-table tbody'), data, renderRows);
    });

    // Export button handler
    document.getElementById('export-deliveries-btn')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/deliveries/export', 'deliveries'));
    });
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Deliveries' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderDeliveryForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  app.innerHTML = Spinner();

  try {
    const allDeliveries = await api.get('/deliveries');
    let delivery = { lines: [], charges: [] };

    if (isEdit) {
      delivery = await api.get(`/deliveries/${id}`);
    }

    app.innerHTML = `
      <div class="dual-pane-container">
        <!-- Left Sidebar: SELECT DELIVERY TO ALTER -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT DELIVERY TO ALTER</h3>
            <input type="text" id="alter-delivery-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-deliveries-list" style="flex: 1; overflow-y: auto;">
            ${allDeliveries.map(d => `
              <div class="alter-list-item ${d.id == id ? 'active-item' : ''}" data-id="${d.id}">
                <div class="title">Disp #${d.dispatchNo || d.id}</div>
                <div class="subtitle">Truck: ${escapeHtml(d.truckNo || '-')} (${formatDate(d.dispatchDate)})</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane: Master Form -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          ${PageHeader({ title: isEdit ? 'Edit Delivery' : 'New Delivery', backHref: '/deliveries' })}
          
          <form id="delivery-form">
            <h3 style="margin:0 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Link Contract (Sauda) & Status</h3>
            <div class="form-grid" style="align-items: end;">
              ${FormGroup({ id: 'saudaNo', label: 'Sauda Number', value: delivery.saudaNo || '', required: true, placeholder: 'Search Sauda by number, party or commodity...' })}
              
              <div class="form-group" style="margin-bottom: 0.25rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.8125rem;">Delivery Status</label>
                <div style="display: flex; gap: 1rem; align-items: center; background: var(--background); padding: 0.5rem 0.875rem; border-radius: 0.375rem; border: 1px solid var(--border); height: 38px; flex-wrap: wrap; min-width: max-content;">
                  <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                    <input type="checkbox" class="status-checkbox" value="PENDING" ${delivery.status === 'PENDING' ? 'checked' : ''}> Pending
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                    <input type="checkbox" class="status-checkbox" value="DISPATCHED" ${delivery.status === 'DISPATCHED' || !delivery.status ? 'checked' : ''}> Dispatched
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                    <input type="checkbox" class="status-checkbox" value="DELIVERED" ${delivery.status === 'DELIVERED' ? 'checked' : ''}> Delivered
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                    <input type="checkbox" class="status-checkbox" value="CANCELLED" ${delivery.status === 'CANCELLED' ? 'checked' : ''}> Cancelled
                  </label>
                  <input type="hidden" id="status" name="status" value="${delivery.status || 'DISPATCHED'}">
                </div>
              </div>
            </div>
            
            <!-- Contract Metadata Preview (populated dynamically) -->
            <div id="contract-metadata-box" style="display:none; margin: 1rem 0; padding:1rem; background:var(--faint); border:1px solid var(--border); border-radius:0.5rem;">
              <h4 style="margin:0 0 0.5rem; font-size:0.75rem; text-transform:uppercase; color:var(--muted-foreground)">Sauda Details Summary</h4>
              <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <div><span style="font-size:0.75rem; color:var(--muted-foreground)">Seller:</span> <div id="meta-seller" style="font-weight:600">-</div></div>
                <div><span style="font-size:0.75rem; color:var(--muted-foreground)">Buyer:</span> <div id="meta-buyer" style="font-weight:600; color:var(--primary)">-</div></div>
                <div><span style="font-size:0.75rem; color:var(--muted-foreground)">Seller Broker:</span> <div id="meta-seller-broker" style="font-weight:500">-</div></div>
                <div><span style="font-size:0.75rem; color:var(--muted-foreground)">Buyer Broker:</span> <div id="meta-buyer-broker" style="font-weight:500">-</div></div>
                <div><span style="font-size:0.75rem; color:var(--muted-foreground)">Sauda Date:</span> <div id="meta-sauda-date" style="font-weight:500">-</div></div>
              </div>
            </div>

            <h3 style="margin:1.5rem 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Delivery Details</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'dispatchDate', label: 'Dispatch Date', value: delivery.dispatchDate ? new Date(delivery.dispatchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date', required: true })}
              ${FormGroup({ id: 'truckNo', label: 'Lorry/Truck No.', value: delivery.truckNo || '', required: true, placeholder: 'e.g. MH-12-AB-1234' })}
              ${FormGroup({ id: 'billNo', label: 'Bill No.', value: delivery.billNo || '', placeholder: 'Seller bill number' })}
              ${FormGroup({ id: 'carrierBillDate', label: 'Carrier Bill Date', value: delivery.carrierBillDate ? new Date(delivery.carrierBillDate).toISOString().split('T')[0] : '', type: 'date' })}
              ${FormGroup({ id: 'transporterName', label: 'Transporter', value: delivery.transporterName || '', placeholder: 'Search transporter...', required: true })}
              ${FormGroup({ id: 'advancePaymentCollected', label: 'Advance Payment Collected (₹)', value: delivery.advancePaymentCollected || '', type: 'number', placeholder: 'e.g. 5000' })}
            </div>

            <h3 style="margin:1.5rem 0 0.5rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Delivery Line Items</h3>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 1.5rem;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: var(--faint);">
                    <th style="padding: 0.5rem 0.75rem; text-align: left;">Commodity</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 150px;">Contracted Qty (Qtl)</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 150px;">Dispatched Bags *</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 150px;">Dispatched Weight (Qtl) *</th>
                  </tr>
                </thead>
                <tbody id="delivery-lines-body">
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 1rem; color: var(--muted-foreground);">
                      Please enter a valid Sauda Number above to load contract items.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style="margin:1.5rem 0 0.5rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Freight & Charges Adjustments</h3>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.75rem;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: var(--faint);">
                    <th style="padding: 0.5rem 0.75rem; text-align: left;">Charge Type *</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 250px;">Amount (₹) *</th>
                    <th style="width: 60px;"></th>
                  </tr>
                </thead>
                <tbody id="delivery-charges-body">
                  <!-- Dynamic charges rows -->
                </tbody>
              </table>
            </div>
            <button type="button" id="btn-add-charge" class="secondary small" style="margin-bottom: 1.5rem;">+ Add Charge Adjustment</button>

            <!-- Dynamic summary breakdown -->
            <div id="freight-summary-box" style="margin: 1.5rem 0; padding:1.25rem; background:var(--faint); border:1px solid var(--border); border-radius:0.5rem; display:flex; flex-direction:column; gap:0.5rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.8125rem;">
                <span>Total Dispatched Weight:</span>
                <span id="sum-disp-weight" style="font-weight:600;">0.000 Qtl</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.8125rem;">
                <span>Additions (Freight + VAT):</span>
                <span id="sum-charges-add" style="font-weight:600; color:var(--success, #10b981);">₹ 0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.8125rem;">
                <span>Deductions (Advance + Less):</span>
                <span id="sum-charges-less" style="font-weight:600; color:var(--danger, #ef4444);">₹ 0.00</span>
              </div>
              <hr style="border:0; border-top:1px solid var(--border); margin:0.5rem 0;">
              <div style="display:flex; justify-content:space-between; font-size:1rem; font-weight:700; color:var(--primary);">
                <span>Net Freight Payable:</span>
                <span id="sum-net-freight">₹ 0.00</span>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Delivery</button>
              ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
              <a href="/deliveries" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Attach party autocomplete on transporter name
    attachPartyAutocomp('transporterName');

    const linesBody = document.getElementById('delivery-lines-body');
    const chargesBody = document.getElementById('delivery-charges-body');

    function recalcTotals() {
      // 1. Sum dispatched weight
      let totalWeight = 0;
      document.querySelectorAll('.line-disp-weight').forEach(el => {
        totalWeight += parseFloat(el.value || '0');
      });
      document.getElementById('sum-disp-weight').innerText = totalWeight.toFixed(3) + ' Qtl';
      
      // 2. Sum charges
      let additions = 0;
      let deductions = 0;
      
      document.querySelectorAll('.charge-row').forEach(row => {
        const type = row.querySelector('.charge-type-select').value;
        const amt = parseFloat(row.querySelector('.charge-amount').value || '0');
        if (type === 'FREIGHT' || type === 'VAT') {
          additions += amt;
        } else if (type === 'ADVANCE' || type === 'LESS') {
          deductions += amt;
        }
      });
      
      document.getElementById('sum-charges-add').innerText = formatCurrency(additions);
      document.getElementById('sum-charges-less').innerText = formatCurrency(deductions);
      
      const netFreight = additions - deductions;
      document.getElementById('sum-net-freight').innerText = formatCurrency(netFreight);
    }

    const addChargeRow = (charge = {}) => {
      const tr = document.createElement('tr');
      tr.className = 'charge-row';
      const type = charge.chargeType || 'FREIGHT';
      const amt = charge.amount ? parseFloat(charge.amount) : '';
      
      tr.innerHTML = `
        <td style="padding: 0.375rem 0.75rem;">
          <select class="charge-type-select" style="width: 100%;">
            <option value="FREIGHT" ${type === 'FREIGHT' ? 'selected' : ''}>FREIGHT (+)</option>
            <option value="VAT" ${type === 'VAT' ? 'selected' : ''}>VAT (+)</option>
            <option value="ADVANCE" ${type === 'ADVANCE' ? 'selected' : ''}>ADVANCE (-)</option>
            <option value="LESS" ${type === 'LESS' ? 'selected' : ''}>LESS (-)</option>
          </select>
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="number" step="0.01" class="charge-amount" value="${amt}" required style="width: 100%; text-align: right;" placeholder="₹ Amount">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-charge danger small" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">×</button>
        </td>
      `;
      
      tr.querySelector('.charge-amount').addEventListener('input', recalcTotals);
      tr.querySelector('.charge-type-select').addEventListener('change', recalcTotals);
      tr.querySelector('.btn-remove-charge').addEventListener('click', () => {
        tr.remove();
        recalcTotals();
      });
      
      chargesBody.appendChild(tr);
    };

    // Populate charges
    if (delivery.charges && delivery.charges.length > 0) {
      delivery.charges.forEach(c => addChargeRow(c));
    } else {
      // Prepopulate some default charges rows for ease of use
      addChargeRow({ chargeType: 'FREIGHT' });
      addChargeRow({ chargeType: 'ADVANCE' });
    }

    document.getElementById('btn-add-charge')?.addEventListener('click', () => addChargeRow());

    // Load contract details and populate metadata preview & line items
    async function findAndLoadContract(saudaNoVal) {
      if (!saudaNoVal) {
        document.getElementById('contract-metadata-box').style.display = 'none';
        linesBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 1rem; color: var(--muted-foreground);">
              Please enter a valid Sauda Number above to load contract items.
            </td>
          </tr>
        `;
        recalcTotals();
        return;
      }

      try {
        const contractsList = clientCache.get('/contracts') || await api.get('/contracts');
        const contract = contractsList.find(c => String(c.saudaNo) === String(saudaNoVal));

        if (contract) {
          // Populating metadata box
          document.getElementById('contract-metadata-box').style.display = 'block';
          document.getElementById('meta-seller').innerText = contract.sellerName || '-';
          document.getElementById('meta-buyer').innerText = contract.buyerName || '-';
          document.getElementById('meta-seller-broker').innerText = contract.sellerBroker || '-';
          document.getElementById('meta-buyer-broker').innerText = contract.buyerBroker || '-';
          document.getElementById('meta-sauda-date').innerText = formatDate(contract.saudaDate);

          // Fetch exact contract lines details if not fully nested (warmup has them nested under lines)
          let cLines = contract.lines || [];
          if (cLines.length === 0 || !cLines[0].id) {
            // fetch contract detail via API to be absolutely sure we get exact line IDs
            const fullContract = await api.get(`/contracts/${contract.id}`);
            cLines = fullContract.lines || [];
          }

          // Smart transporter auto-fill: check if there are past deliveries for this contract and copy the transporter
          const deliveriesList = clientCache.get('/deliveries') || [];
          const pastDelivery = deliveriesList.find(d => {
            return d.lines && d.lines.some(dl => {
              return cLines.some(cl => cl.id === dl.contractLineId);
            });
          });
          if (pastDelivery && pastDelivery.transporterName) {
            const transInput = document.getElementById('transporterName');
            if (transInput && !transInput.value.trim()) {
              transInput.value = pastDelivery.transporterName;
            }
          }

          // Render lines table rows
          if (cLines.length > 0) {
            linesBody.innerHTML = cLines.map((cLine) => {
              // Check if there is an existing delivery line already linked to this contract line
              const match = (delivery.lines || []).find(dl => dl.contractLineId === cLine.id);
              const bagsVal = match ? parseFloat(match.dispatchedBags || '0') : '';
              const wtVal = match ? parseFloat(match.dispatchedWeight || '0') : '';
              return `
                <tr class="delivery-line-row">
                  <input type="hidden" class="line-contract-line-id" value="${cLine.id}">
                  <td style="padding: 0.5rem 0.75rem; font-weight: 600;">${escapeHtml(cLine.commodityName)}</td>
                  <td style="padding: 0.5rem 0.75rem; text-align: right; color: var(--muted-foreground);">${cLine.weightQuintals || cLine.weight || '0'}</td>
                  <td style="padding: 0.375rem 0.75rem;">
                    <input type="number" class="line-disp-bags" value="${bagsVal}" style="width: 100%; text-align: right;" placeholder="Bags" required>
                  </td>
                  <td style="padding: 0.375rem 0.75rem;">
                    <input type="number" step="0.001" class="line-disp-weight" value="${wtVal}" style="width: 100%; text-align: right;" placeholder="Qtl" required>
                  </td>
                </tr>
              `;
            }).join('');

            // Listeners for line inputs
            document.querySelectorAll('.line-disp-weight').forEach(el => el.addEventListener('input', recalcTotals));
            recalcTotals();
          } else {
            linesBody.innerHTML = `
              <tr>
                <td colspan="4" style="text-align: center; padding: 1rem; color: var(--danger);">
                  Contract has no trade lines. Cannot dispatch.
                </td>
              </tr>
            `;
            recalcTotals();
          }
        } else {
          // contract not found
          document.getElementById('contract-metadata-box').style.display = 'none';
          linesBody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 1rem; color: var(--muted-foreground);">
                Sauda contract #${saudaNoVal} not found in database.
              </td>
            </tr>
          `;
          recalcTotals();
        }
      } catch (err) {
        console.error('findAndLoadContract error:', err);
        recalcTotals();
      }
    }

    // Bind Sauda No input event
    const saudaInput = document.getElementById('saudaNo');
    let lookupTimeout = null;
    saudaInput.addEventListener('input', (e) => {
      clearTimeout(lookupTimeout);
      lookupTimeout = setTimeout(() => {
        findAndLoadContract(e.target.value);
      }, 300);
    });

    // Attach searchable autocomplete to Sauda Number field
    if (saudaInput) {
      autocomp(saudaInput, {
        onQuery: async (val) => {
          if (!val || val.trim() === '') return [];
          const q = val.toLowerCase();
          const contractsList = clientCache.get('/contracts') || await api.get('/contracts');
          const matches = contractsList.filter(c => {
            return String(c.saudaNo).toLowerCase().includes(q) ||
                   (c.buyerName && c.buyerName.toLowerCase().includes(q)) ||
                   (c.sellerName && c.sellerName.toLowerCase().includes(q)) ||
                   (c.commodityName && c.commodityName.toLowerCase().includes(q));
          }).slice(0, 15);
          saudaInput._matches = matches;
          return matches.map(c => `Sauda #${c.saudaNo} - ${c.buyerName} vs ${c.sellerName} (${c.commodityName})`);
        },
        onSelect: (val) => {
          let matched = null;
          if (saudaInput._matches) {
            matched = saudaInput._matches.find(c => {
              const label = `Sauda #${c.saudaNo} - ${c.buyerName} vs ${c.sellerName} (${c.commodityName})`;
              return label === val;
            });
          }
          if (matched) {
            saudaInput.value = matched.saudaNo;
            findAndLoadContract(matched.saudaNo);
            return String(matched.saudaNo);
          }
          return val;
        }
      });
    }

    // Bind status checkboxes to act like radio buttons and set hidden input
    const checkboxes = document.querySelectorAll('.status-checkbox');
    const statusHidden = document.getElementById('status');
    if (checkboxes && statusHidden) {
      checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            checkboxes.forEach(other => {
              if (other !== e.target) other.checked = false;
            });
            statusHidden.value = e.target.value;
          } else {
            // Prevent unchecking the only checked item
            e.target.checked = true;
          }
        });
      });
    }

    // If saudaNo is pre-populated (e.g. in edit mode), load details immediately
    if (saudaInput.value) {
      findAndLoadContract(saudaInput.value);
    }

    // Submit handler
    document.getElementById('delivery-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

      const fd = collectFormData('delivery-form');
      
      // Compile lines data
      const lineRows = Array.from(document.querySelectorAll('.delivery-line-row'));
      const lines = lineRows.map(row => {
        return {
          contractLineId: row.querySelector('.line-contract-line-id').value,
          dispatchedBags: row.querySelector('.line-disp-bags').value.trim() || null,
          dispatchedWeight: row.querySelector('.line-disp-weight').value.trim(),
        };
      }).filter(l => l.contractLineId && l.dispatchedWeight);

      if (lines.length === 0) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast('Please add at least one complete delivery line item (bags and weight)', 'error');
        return;
      }

      // Compile charges data
      const chargeRows = Array.from(document.querySelectorAll('.charge-row'));
      const charges = chargeRows.map(row => {
        return {
          chargeType: row.querySelector('.charge-type-select').value,
          amount: row.querySelector('.charge-amount').value.trim(),
        };
      }).filter(c => c.chargeType && c.amount);

      fd.lines = lines;
      fd.charges = charges;

      try {
        if (isEdit) {
          await api.put(`/deliveries/${id}`, fd);
          showToast('Delivery updated');
        } else {
          await api.post('/deliveries', fd);
          showToast('Delivery created');
        }
        
        window.history.pushState({}, '', '/deliveries');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

    if (isEdit) {
      document.getElementById('btn-delete').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to delete this delivery?')) return;
        const btn = e.target.closest('button');
        const ogHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
        try {
          await api.del(`/deliveries/${id}`);
          window.history.pushState({}, '', '/deliveries');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = ogHtml;
          alert(err.message);
        }
      });
    }

    // Sidebar search filter
    document.getElementById('alter-delivery-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const items = document.querySelectorAll('#alter-deliveries-list .alter-list-item');
      items.forEach(item => {
        const txt = item.textContent.toLowerCase();
        item.style.display = txt.includes(q) ? '' : 'none';
      });
    });

    // Handle click on sidebar item to navigate without full page load
    document.getElementById('alter-deliveries-list')?.addEventListener('click', (e) => {
      const item = e.target.closest('.alter-list-item');
      if (!item) return;
      const targetId = item.getAttribute('data-id');
      window.history.pushState({}, '', `/deliveries/${targetId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}
