/**
 * Bills View — List + Create/Edit form with ledger posting & reference auto-fills
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData, AuditMetadataBlock } from '../components/ui.js';
import * as api from '../lib/api.js';
import { clientCache } from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';
import { autocomp } from '../vendor/autocomp.js';

function attachReferenceAutocomplete(inputId, basis, onSelectCb) {
  const el = document.getElementById(inputId);
  if (!el) return;
  
  autocomp(el, {
    onQuery: async (val) => {
      if (!val || val.trim() === '') return [];
      const q = val.toLowerCase();
      
      const billsList = clientCache.get('/bills') || await api.get('/bills');
      if (basis === 'CONTRACT') {
        const contractsList = clientCache.get('/contracts') || await api.get('/contracts');
        const billedContractIds = new Set(
          billsList.filter(b => b.basis === 'CONTRACT').flatMap(b => b.lines || []).map(l => l.referenceId).filter(Boolean)
        );
        const matches = contractsList.filter(c => {
          if (billedContractIds.has(c.id)) return false;
          return String(c.saudaNo).includes(q) || (c.buyerName && c.buyerName.toLowerCase().includes(q)) || (c.sellerName && c.sellerName.toLowerCase().includes(q));
        });
        el._matches = matches;
        return matches.map(c => `Sauda #${c.saudaNo} - ${c.buyerName} vs ${c.sellerName} (Amt: ₹${c.amount})`);
      } else {
        const deliveriesList = clientCache.get('/deliveries') || await api.get('/deliveries');
        const billedDeliveryIds = new Set(
          billsList.filter(b => b.basis === 'DELIVERY').flatMap(b => b.lines || []).map(l => l.referenceId).filter(Boolean)
        );
        const matches = deliveriesList.filter(d => {
          if (billedDeliveryIds.has(d.id)) return false;
          return String(d.id).includes(q) || (d.truckNo && d.truckNo.toLowerCase().includes(q)) || (d.transporterName && d.transporterName.toLowerCase().includes(q));
        });
        el._matches = matches;
        return matches.map(d => `Disp #${d.id} - Truck: ${d.truckNo || '-'} - Transporter: ${d.transporterName || '-'} (Sauda: #${d.saudaNo || '-'})`);
      }
    },
    onSelect: (val) => {
      el.value = val;
      let matchedObj = null;
      if (el._matches) {
        matchedObj = el._matches.find(m => {
          if (basis === 'CONTRACT') {
            return val.startsWith(`Sauda #${m.saudaNo}`);
          } else {
            return val.startsWith(`Disp #${m.id}`);
          }
        });
      }
      if (onSelectCb) onSelectCb(val, matchedObj);
      return val;
    }
  });
}

export async function renderBillList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    let sortBy = 'date'; // default sorting
    const baseData = await api.get('/reports/bill-register?sortBy=date');

    const sortData = (list, by) => {
      const sorted = [...list];
      if (by === 'city') {
        sorted.sort((a, b) => (a.place || '').localeCompare(b.place || '') || new Date(a.billDate).getTime() - new Date(b.billDate).getTime());
      } else if (by === 'proprietor') {
        sorted.sort((a, b) => (a.partyName || '').localeCompare(b.partyName || '') || new Date(a.billDate).getTime() - new Date(b.billDate).getTime());
      } else if (by === 'type') {
        sorted.sort((a, b) => (a.basis || '').localeCompare(b.basis || '') || new Date(a.billDate).getTime() - new Date(b.billDate).getTime());
      } else {
        sorted.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
      }
      return sorted;
    };

    let data = sortData(baseData, sortBy);

    const renderRows = (items) => items.map(b => `
      <tr>
        <td style="font-weight: 600;">${escapeHtml(b.billNo)}</td>
        <td>${formatDate(b.billDate)}</td>
        <td style="font-weight: 500;">${escapeHtml(b.partyName)}</td>
        <td>${escapeHtml(b.place || '-')}</td>
        <td>
          <span class="badge badge-active" style="font-size: 0.6875rem;">${b.basis}</span>
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--primary);" class="mono">${formatCurrency(b.totalAmount)}</td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display:inline-flex; gap:0.25rem; justify-content:flex-end;">
            <a href="/bills/${b.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small secondary print-row-btn" data-id="${b.id}" data-entity="bills">${Icons.printer}</button>
            <button class="small danger delete-row-btn" data-id="${b.id}" data-entity="bills">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const updateView = (billsList) => {
      const container = document.getElementById('bills-table-container');
      if (!container) return;

      const totalAmount = billsList.reduce((sum, b) => sum + parseFloat(b.totalAmount || '0'), 0);

      container.innerHTML = `
        <div style="overflow-x:auto">
          <table id="bills-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Bill Date</th>
                <th>Billed Party</th>
                <th>Station / City</th>
                <th>Basis</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${billsList.length === 0 
                ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted-foreground)">No bills found.</td></tr>`
                : renderRows(billsList).join('')}
            </tbody>
            ${billsList.length > 0 ? `
              <tfoot>
                <tr style="font-weight: bold; background: var(--faint); border-top: 2px solid var(--border);">
                  <td colspan="5">Total</td>
                  <td style="text-align: right;" class="mono">${formatCurrency(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      `;

      import('../components/ui.js').then(ui => {
        ui.attachTableSearch('search-bills', document.querySelector('#bills-table tbody'), billsList, renderRows);
      });
    };

    app.innerHTML = `
      ${PageHeader({ 
        title: 'Bills (Register)', 
        subtitle: 'Manage billing invoices and audit register logs',
        actions: `
          <button class="secondary" id="btn-print-bills">${Icons.printer} Print List (P)</button>
          <button class="secondary" id="btn-export-bills">${Icons.download} Export Excel</button>
          <a href="/bills/batch-billing" data-route><button class="secondary">${Icons.settings} Batch Billing</button></a>
          <a href="/bills/new" data-route><button class="primary">${Icons.plus} New Bill</button></a>
        ` 
      })}
      
      <!-- Filter Pills for Sorting -->
      <div class="filter-pills">
        <button class="filter-pill active" data-sort="date">Date Wise</button>
        <button class="filter-pill" data-sort="city">City / Station Wise</button>
        <button class="filter-pill" data-sort="proprietor">Proprietor Wise</button>
        <button class="filter-pill" data-sort="type">Billing Basis Wise</button>
      </div>

      <!-- Main Content Area -->
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
        <div style="margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem; width:100%">
          <div class="form-group" style="margin:0; flex:1; position:relative">
            <input type="text" id="search-bills" placeholder="Search bills..." style="padding-left:2.5rem; width:100%">
            <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
          </div>
        </div>

        <div id="bills-table-container" class="table-container" style="background: var(--card);">
          <!-- Render bills table here -->
        </div>
      </div>
    `;

    updateView(data);

    // Bind Sorting changes
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        // Toggle active class on pills
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');

        sortBy = btn.getAttribute('data-sort');
        const container = document.getElementById('bills-table-container');
        if (container) {
          container.innerHTML = `<div style="padding: 2rem; text-align: center;"><span class="spinner"></span> Sorting bills...</div>`;
        }
        try {
          const sortedData = sortData(baseData, sortBy);
          updateView(sortedData);
        } catch (err) {
          if (container) {
            container.innerHTML = `<div class="alert danger">${escapeHtml(err.message)}</div>`;
          }
        }
      });
    });

    // Export Excel handler
    document.getElementById('btn-export-bills')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => {
        ui.exportToExcel(`/reports/bill-register?sortBy=${sortBy}`, `bill_register_${sortBy}`);
      });
    });

    // Print handler
    document.getElementById('btn-print-bills')?.addEventListener('click', () => {
      window.print();
    });

  } catch (err) { 
    app.innerHTML = `${PageHeader({ title: 'Bills' })}<div class="alert danger">${err.message}</div>`; 
  }
}

export async function renderBillForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  app.innerHTML = Spinner();

  try {
    const allBills = await api.get('/bills');
    let bill = {};
    if (isEdit) {
      bill = await api.get(`/bills/${id}`);
    }

    // Pre-resolve initial reference text if editing
    let initialRefText = '';
    const firstLine = bill.lines?.[0] || {};
    const refId = firstLine.referenceId;
    if (isEdit && refId && (bill.basis === 'CONTRACT' || bill.basis === 'DELIVERY')) {
      if (bill.basis === 'CONTRACT') {
        const contractsList = clientCache.get('/contracts') || await api.get('/contracts');
        const contract = contractsList.find(c => c.id === refId);
        if (contract) {
          initialRefText = `Sauda #${contract.saudaNo} - ${contract.buyerName} vs ${contract.sellerName} (Amt: ₹${contract.amount})`;
        }
      } else {
        const deliveriesList = clientCache.get('/deliveries') || await api.get('/deliveries');
        const delivery = deliveriesList.find(d => d.id === refId);
        if (delivery) {
          initialRefText = `Disp #${delivery.id} - Truck: ${delivery.truckNo || '-'} - Transporter: ${delivery.transporterName || '-'} (Sauda: #${delivery.saudaNo || '-'})`;
        }
      }
    }

    app.innerHTML = `
      <a href="/bills" data-route style="display:inline-flex; align-items:center; gap:0.375rem; font-size:0.8125rem; color:var(--muted-foreground); text-decoration:none; padding:0.75rem 0 0.25rem; margin-bottom:0.25rem;">${Icons.arrowLeft} Back to Bills</a>
      <div class="dual-pane-container">
        <!-- Left Sidebar -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT BILL</h3>
            <input type="text" id="alter-bill-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-bills-list" style="flex: 1; overflow-y: auto;">
            ${allBills.map(b => `
              <div class="alter-list-item ${b.id == id ? 'active-item' : ''}" data-id="${b.id}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                  <div class="title" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Bill #${b.billNo}</div>
                  <div style="font-size:0.625rem; color:var(--muted-foreground); white-space:nowrap; padding-top:0.1rem; flex-shrink:0;">#${b.id}</div>
                </div>
                <div class="subtitle">${escapeHtml(b.partyName || 'Direct')} (${formatDate(b.billDate)})</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane: Master Form -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          
          <form id="bill-form">
            <div class="form-grid">
              ${FormGroup({ id: 'billNo', label: 'Bill Number', value: bill.billNo || '', required: true })}
              ${FormGroup({ id: 'billDate', label: 'Bill Date', value: bill.billDate ? new Date(bill.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
              ${FormGroup({ id: 'basis', label: 'Basis', value: bill.basis || 'DIRECT', type: 'select', options: [{ value: 'DIRECT', label: 'Direct' }, { value: 'CONTRACT', label: 'Contract' }, { value: 'DELIVERY', label: 'Delivery' }] })}
              
              <div class="form-group" id="reference-group" style="display: none;">
                <label for="referenceSearch" id="reference-label">Reference No / ID *</label>
                <input type="text" id="referenceSearch" value="${initialRefText}" placeholder="Type to search unbilled references...">
                <input type="hidden" id="referenceId" name="referenceId" value="${refId || ''}">
              </div>

              ${FormGroup({ id: 'partyName', label: 'Party', value: bill.partyName || '', required: true, placeholder: 'Start typing to search...' })}
              ${FormGroup({ id: 'totalAmount', label: 'Total Amount (₹)', value: bill.totalAmount || '', type: 'number', required: true })}
              ${FormGroup({ id: 'creditDays', label: 'Credit Days', value: bill.creditDays || '', type: 'number' })}
              ${FormGroup({ id: 'description', label: 'Description', value: firstLine.description || '', type: 'textarea' })}
            </div>
            ${isEdit ? AuditMetadataBlock(bill) : ''}

            <div class="form-actions">
              <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Bill</button>
              ${isEdit ? `<button type="button" class="secondary" id="btn-print-bill">${Icons.printer} Print</button>` : ''}
              ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
              <a href="/bills" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Attach party autocomplete
    attachPartyAutocomp('partyName');

    const basisSelect = document.getElementById('basis');
    const refGroup = document.getElementById('reference-group');
    const refLabel = document.getElementById('reference-label');
    const refSearch = document.getElementById('referenceSearch');
    const refIdInput = document.getElementById('referenceId');

    const updateReferenceVisibility = () => {
      const val = basisSelect.value;
      if (val === 'DIRECT') {
        refGroup.style.display = 'none';
        refIdInput.value = '';
        refSearch.value = '';
      } else {
        refGroup.style.display = '';
        refLabel.textContent = val === 'CONTRACT' ? 'Contract Reference (Sauda) *' : 'Delivery Reference (Dispatch) *';
        
        // Attach autocomplete based on select
        attachReferenceAutocomplete('referenceSearch', val, (text, item) => {
          if (item) {
            refIdInput.value = item.id;
            
            if (val === 'CONTRACT') {
              document.getElementById('partyName').value = item.buyerName || '';
              document.getElementById('totalAmount').value = item.amount || '';
              document.getElementById('creditDays').value = item.paymentDays || '';
              document.getElementById('description').value = `Sauda Contract #${item.saudaNo} - ${item.commodityName || 'Grains'} wt: ${item.weight || '0'} Qtl`;
            } else {
              // Delivery
              let deliveryAmount = 0;
              let descParts = [];
              let buyerName = '';
              let creditDays = '';
              
              if (item.lines && item.lines.length > 0) {
                item.lines.forEach(line => {
                  const wt = parseFloat(line.dispatchedWeight || '0');
                  const rate = parseFloat(line.rate || '0');
                  deliveryAmount += wt * rate;
                  descParts.push(`${line.commodityName || 'Commodity'} (${wt} Qtl @ ₹${rate})`);
                });
                
                const firstLine = item.lines[0];
                const contractsList = clientCache.get('/contracts') || [];
                const contract = contractsList.find(c => String(c.saudaNo) === String(firstLine.saudaNo));
                if (contract) {
                  buyerName = contract.buyerName;
                  creditDays = contract.paymentDays || '';
                }
              }
              
              document.getElementById('partyName').value = buyerName;
              document.getElementById('totalAmount').value = deliveryAmount.toFixed(2);
              document.getElementById('creditDays').value = creditDays;
              document.getElementById('description').value = `Lorry Dispatch #${item.id} Truck: ${item.truckNo || '-'} - ${descParts.join(', ')}`;
            }
          }
        });
      }
    };

    basisSelect.addEventListener('change', () => {
      refIdInput.value = '';
      refSearch.value = '';
      updateReferenceVisibility();
    });

    // Initial load execution
    updateReferenceVisibility();

    document.getElementById('bill-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

      const fd = collectFormData('bill-form');
      // referenceSearch is search-only
      delete fd.referenceSearch;

      try {
        if (isEdit) {
          await api.put(`/bills/${id}`, fd);
          showToast('Bill updated');
        } else {
          await api.post('/bills', fd);
          showToast('Bill created & posted to ledger');
        }
        
        window.history.pushState({}, '', '/bills');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

    if (isEdit) {
      document.getElementById('btn-print-bill')?.addEventListener('click', () => {
        if (id) window.open(`/api/pdf/bill/${id}`, '_blank');
      });

      document.getElementById('btn-delete').addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        const ogHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
        try {
          await api.del(`/bills/${id}`);
          window.history.pushState({}, '', '/bills');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = ogHtml;
          alert(err.message);
        }
      });
    }

    // Sidebar search filter
    document.getElementById('alter-bill-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const items = document.querySelectorAll('#alter-bills-list .alter-list-item');
      items.forEach(item => {
        const txt = item.textContent.toLowerCase();
        item.style.display = txt.includes(q) ? '' : 'none';
      });
    });

    // Handle click on sidebar item to navigate without full page load
    document.getElementById('alter-bills-list')?.addEventListener('click', (e) => {
      const item = e.target.closest('.alter-list-item');
      if (!item) return;
      const targetId = item.getAttribute('data-id');
      window.history.pushState({}, '', `/bills/${targetId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}
