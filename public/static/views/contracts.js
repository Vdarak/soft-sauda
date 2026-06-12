/**
 * Contracts View — Sauda Register List + Create/Edit form
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData, AuditMetadataBlock } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp, attachCommodityAutocomp, attachCityAutocomp } from '../lib/autocomplete.js';

/** Build delivery progress badge HTML */
function deliveryBadge(c) {
  const lorries = c.numberOfLorries || 0;
  const dispatched = c.dispatchedCount || 0;
  const delivered = c.deliveredCount || 0;
  const total = dispatched + delivered;

  if (lorries === 0 && total === 0) {
    return Badge(c.status || 'ACTIVE', c.status === 'ACTIVE' ? 'active' : 'draft');
  }

  if (lorries > 0 && total >= lorries) {
    return `<span class="badge badge-active" style="font-size:0.6875rem">✓ All ${lorries} Delivered</span>`;
  }

  let parts = [];
  if (total > 0) parts.push(`<span class="badge badge-active" style="font-size:0.625rem">${total} Dispatched</span>`);
  const pending = lorries > 0 ? Math.max(0, lorries - total) : 0;
  if (pending > 0) parts.push(`<span class="badge badge-draft" style="font-size:0.625rem">${pending} Pending</span>`);
  if (parts.length === 0) return Badge(c.status || 'ACTIVE', 'active');
  return parts.join(' ');
}

export async function renderContractList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  const params = ctx && ctx.location && ctx.location.search ? new URLSearchParams(ctx.location.search) : new URLSearchParams();
  const page = parseInt(params.get('page') || '1', 10);
  const statusFilter = params.get('status') || 'ALL';

  try {
    const allContracts = await api.get('/contracts');
    const data = statusFilter !== 'ALL'
      ? allContracts.filter(c => c.status === statusFilter)
      : allContracts;
    
    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <span class="badge badge-active">#${c.saudaNo}</span>
          <span style="margin-left:0.5rem;font-weight:600">${escapeHtml(c.saudaBook || '')}</span>
          <div style="font-size:0.6875rem;color:var(--muted-foreground);margin-top:0.25rem">${formatDate(c.saudaDate)}</div>
        </td>
        <td>
          <div style="font-size:0.6875rem"><strong style="color:var(--muted-foreground)">SELLER</strong> ${escapeHtml(c.sellerName)}</div>
          <div style="font-size:0.6875rem"><strong style="color:var(--muted-foreground)">BUYER</strong> <span style="color:var(--primary)">${escapeHtml(c.buyerName)}</span></div>
        </td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.commodityName)}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${c.weight} Qtls${c.numberOfLorries ? ` · ${c.numberOfLorries} Lorries` : ''}</div>
        </td>
        <td style="text-align:right" class="mono">${formatCurrency(c.amount)}</td>
        <td style="text-align:center">${deliveryBadge(c)}</td>
        <td style="text-align:right" onclick="event.stopPropagation()">
          <div style="display:inline-flex; gap:0.25rem; justify-content:flex-end;">
            <a href="/contracts/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${c.id}" data-entity="contracts">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const filterBtn = (label, value) => {
      const active = statusFilter === value;
      return `<a href="/contracts?status=${value}" data-route><button class="filter-pill ${active ? 'active' : ''}">${label}</button></a>`;
    };

    app.innerHTML = `
      ${PageHeader({
        title: 'Sauda Register',
        subtitle: 'View and manage trade contracts',
        actions: `<button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button><button class="secondary" id="export-contracts-btn" style="margin-right:0.5rem">${Icons.download} Export Excel</button><a href="/contracts/new" data-route><button class="primary">${Icons.plus} New Sauda</button></a>`
      })}
      <div class="filter-pills">
        ${filterBtn('All', 'ALL')}
        ${filterBtn('Active', 'ACTIVE')}
        ${filterBtn('Completed', 'COMPLETED')}
      </div>
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-contracts" placeholder="Search contracts..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'contracts-table',
        title: 'Contracts',
        count: data.length,
        headers: [
          { label: 'Sauda Details' },
          { label: 'Trade Parties' },
          { label: 'Commodity' },
          { label: 'Amount', style: 'text-align:right' },
          { label: 'Delivery Status', style: 'text-align:center' },
          { label: 'Actions', style: 'text-align:right; width: 100px' }
        ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-contracts', document.querySelector('#contracts-table tbody'), data, renderRows);
    });

    document.getElementById('export-contracts-btn')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/contracts/export', 'sauda_register'));
    });
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Contracts' })}<div class="alert danger">${err.message}</div>`;
  }
}

export async function renderContractForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  
  app.innerHTML = Spinner();

  try {
    let contract = { lines: [] };
    let autoSaudaNo = 1;

    // Fetch all contracts for the sidebar selector
    const allContracts = await api.get('/contracts');

    if (isEdit) {
      contract = await api.get(`/contracts/${id}`);
    } else {
      if (allContracts && allContracts.length > 0) {
        autoSaudaNo = Math.max(...allContracts.map(c => c.saudaNo || 0)) + 1;
      }
    }

    const lines = contract.lines || [];
    const ptType = contract.paymentTermType || 'DISCOUNT';

    app.innerHTML = `
      <div class="dual-pane-container">
        <!-- Left Sidebar: SELECT SAUDA TO ALTER -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT SAUDA TO ALTER</h3>
            <input type="text" id="alter-contract-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-contracts-list" style="flex: 1; overflow-y: auto;">
            ${allContracts.map(c => `
              <div class="alter-list-item ${c.id == id ? 'active-item' : ''}" data-id="${c.id}">
                <div class="title">Sauda #${c.saudaNo} (${escapeHtml(c.saudaBook || 'Main Book')})</div>
                <div class="subtitle">${escapeHtml(c.buyerName)} vs ${escapeHtml(c.sellerName)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane: Master Form -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          ${PageHeader({
            title: isEdit ? `Alter Sauda Record` : 'New Sauda Contract',
            backHref: '/contracts'
          })}

          <form id="contract-form">
            <h3 style="margin:0 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Contract Details</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'saudaPrefix', label: 'Sauda Prefix', value: contract.saudaPrefix || 'SD' })}
              ${FormGroup({ id: 'saudaNo', label: 'Sauda Number', value: contract.saudaNo || autoSaudaNo, type: 'number', required: true })}
              ${FormGroup({ id: 'saudaBook', label: 'Sauda Book', value: contract.saudaBook || 'Main Book' })}
              ${FormGroup({ id: 'saudaDate', label: 'Sauda Date', value: contract.saudaDate ? new Date(contract.saudaDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
            </div>

            <div class="form-grid" style="margin-top: 1rem;">
              ${FormGroup({ id: 'originStation', label: 'Origin Station', value: contract.originStation || '' })}
              ${FormGroup({ id: 'destinationStation', label: 'Destination Station', value: contract.destinationStation || '' })}
              ${FormGroup({ id: 'deliveryDeadlineDate', label: 'Delivery Deadline Date', value: contract.deliveryDeadlineDate ? new Date(contract.deliveryDeadlineDate).toISOString().split('T')[0] : '', type: 'date' })}
              ${FormGroup({ id: 'quantityTolerance', label: 'Quantity Tolerance %', value: contract.quantityTolerance || '', type: 'number' })}
            </div>

            <h3 style="margin:1.5rem 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Trade Stakeholders</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'sellerName', label: 'Seller (Seller)', value: contract.sellerName || '', required: true, placeholder: 'Search seller...' })}
              ${FormGroup({ id: 'buyerName', label: 'Buyer (Buyer)', value: contract.buyerName || '', required: true, placeholder: 'Search buyer...' })}
              ${FormGroup({ id: 'sellerBroker', label: 'Seller Broker', value: contract.sellerBroker || '', placeholder: 'Search broker...' })}
              ${FormGroup({ id: 'buyerBroker', label: 'Buyer Broker', value: contract.buyerBroker || '', placeholder: 'Search broker...' })}
            </div>

            <!-- Commodity multi-line grid -->
            <h3 style="margin:1.5rem 0 0.5rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Sauda Line Items (Commodities)</h3>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.75rem;">
              <table id="lines-grid-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: var(--faint);">
                    <th style="padding: 0.5rem 0.75rem;">Commodity *</th>
                    <th style="padding: 0.5rem 0.75rem;">Brand</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 80px;">Lorries</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 100px;">Bags</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 110px;">Weight (Qtl) *</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 110px;">Rate (₹) *</th>
                    <th style="padding: 0.5rem 0.75rem; text-align: right; width: 130px;">Amount</th>
                    <th style="width: 40px;"></th>
                  </tr>
                </thead>
                <tbody id="lines-grid-body">
                  <!-- Dynamic rows -->
                </tbody>
              </table>
            </div>
            <button type="button" id="btn-add-line" class="secondary small" style="margin-bottom: 1.5rem;">+ Add Sauda Line Item</button>

            <h3 style="margin:1.5rem 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Payment Terms & Form Trackers</h3>
            <div style="display:flex;gap:1.5rem;align-items:center;margin-bottom:1rem">
              <label style="display:flex;align-items:center;gap:0.375rem;cursor:pointer;font-size:0.8125rem">
                <input type="radio" name="paymentTermType" value="DISCOUNT" ${ptType === 'DISCOUNT' ? 'checked' : ''}>
                Discount Scheme
              </label>
              <label style="display:flex;align-items:center;gap:0.375rem;cursor:pointer;font-size:0.8125rem">
                <input type="radio" name="paymentTermType" value="CREDIT" ${ptType === 'CREDIT' ? 'checked' : ''}>
                Credit Period
              </label>
              <label style="display:flex;align-items:center;gap:0.375rem;cursor:pointer;font-size:0.8125rem">
                <input type="radio" name="paymentTermType" value="PAYMENT" ${ptType === 'PAYMENT' ? 'checked' : ''}>
                Immediate Payment
              </label>
            </div>
          <div class="form-grid" id="payment-fields">
            <div class="form-group" id="discount-percent-group">
              <label for="paymentPercent">Discount %</label>
              <input type="number" id="paymentPercent" name="paymentPercent" value="${contract.paymentPercent || ''}" step="0.01" placeholder="e.g. 3">
            </div>
            ${FormGroup({ id: 'paymentDays', label: 'Payment / Credit Days', value: contract.paymentDays || '', type: 'number', placeholder: 'e.g. 15' })}
            ${FormGroup({ id: 'taxFormRequired', label: 'Tax Form Required', value: contract.taxFormRequired || '', placeholder: 'e.g. C-Form' })}
            ${FormGroup({ id: 'deliveryTerm', label: 'Delivery Term Detail', value: contract.deliveryTerm || '' })}
          </div>
          <div id="payment-preview" style="margin-top:0.5rem; margin-bottom: 1.5rem; padding:0.75rem 1rem; background:var(--background); border:1px solid var(--border); border-radius:0.5rem; font-size:0.8125rem; color:var(--primary)"></div>

          <h3 style="margin:1.5rem 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">PO details & Logistics</h3>
          <div class="form-grid">
            ${FormGroup({ id: 'poNumber', label: 'PO Number', value: contract.poNumber || '' })}
            ${FormGroup({ id: 'poDate', label: 'PO Date', value: contract.poDate ? new Date(contract.poDate).toISOString().split('T')[0] : '', type: 'date' })}
            ${FormGroup({ id: 'approxWeight', label: 'Approximate Weight (Qtl)', value: contract.approxWeight || '', type: 'number' })}
          </div>

          <h3 style="margin:1.5rem 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Terms & Conditions Matrix</h3>
          ${FormGroup({ id: 'termsAndConditions', label: 'Terms & Conditions Notes', type: 'textarea', value: contract.termsAndConditions || '', placeholder: 'Enter any contract specific terms...' })}

          <h3 style="margin:1.5rem 0 1rem;font-size:0.8125rem;text-transform:uppercase;color:var(--muted-foreground);">Remarks</h3>
          ${FormGroup({ id: 'remarks', label: 'Internal Custom Remarks', value: contract.customRemarks || '', type: 'textarea' })}

          ${isEdit ? AuditMetadataBlock(contract) : ''}

          <div class="form-actions">
            <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Sauda</button>
            ${isEdit ? `<button type="button" class="secondary" id="btn-print-contract">${Icons.printer} Print PDF</button>` : ''}
            ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
            <a href="/contracts" data-route><button type="button" class="secondary">Cancel</button></a>
          </div>
        </form>
      </div>
    </div>
    `;

    // Attach Autocomplete to Trade stakeholders with auto-fill callbacks
    attachPartyAutocomp('sellerName', (name, party) => {
      if (party && party.place) {
        const originInput = document.getElementById('originStation');
        if (originInput && !originInput.value.trim()) {
          originInput.value = party.place;
        }
      }
    });
    attachPartyAutocomp('buyerName', (name, party) => {
      if (party) {
        if (party.place) {
          const destInput = document.getElementById('destinationStation');
          if (destInput && !destInput.value.trim()) {
            destInput.value = party.place;
          }
        }
        // Autofill credit terms/days if available
        if (party.creditLimit) {
          // Can default credit terms/days here if necessary
        }
      }
    });
    attachPartyAutocomp('sellerBroker');
    attachPartyAutocomp('buyerBroker');

    // Attach city autocomplete to Origin & Destination Stations
    attachCityAutocomp('originStation');
    attachCityAutocomp('destinationStation');


    const linesBody = document.getElementById('lines-grid-body');

    // Attach new line row function
    const addLineRow = (line = {}) => {
      const idx = linesBody.querySelectorAll('tr').length;
      const tr = document.createElement('tr');
      tr.className = 'sauda-line-row';
      tr.innerHTML = `
        <input type="hidden" class="line-id" value="${line.id || ''}">
        <td style="padding: 0.375rem 0.75rem; min-width: 180px; position: relative;">
          <input type="text" id="line_comm_${idx}" class="line-commodity" value="${escapeHtml(line.commodityName || '')}" required style="width: 100%;" placeholder="Type commodity...">
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="text" class="line-brand" value="${escapeHtml(line.brand || '')}" style="width: 100%;" placeholder="Brand">
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="number" class="line-lorries" value="${line.numberOfLorries || ''}" style="width: 100%; text-align: right;" placeholder="Qty">
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="number" class="line-bags" value="${line.quantityBags ? parseFloat(line.quantityBags) : ''}" style="width: 100%; text-align: right;" placeholder="Bags">
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="number" step="0.001" class="line-weight" value="${line.weightQuintals || ''}" required style="width: 100%; text-align: right;" placeholder="Qtl">
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="number" step="0.01" class="line-rate" value="${line.rate || ''}" required style="width: 100%; text-align: right;" placeholder="₹">
        </td>
        <td style="padding: 0.375rem 0.75rem;">
          <input type="text" class="line-amount" value="${line.amount ? formatCurrency(line.amount) : '₹ 0'}" readonly style="width: 100%; text-align: right; font-weight: 600; border: none; background: transparent;">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-line danger small" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">×</button>
        </td>
      `;

      // Bind dynamic calculation handlers
      const recalcRow = () => {
        const wt = parseFloat(tr.querySelector('.line-weight').value || '0');
        const rate = parseFloat(tr.querySelector('.line-rate').value || '0');
        const amt = wt * rate;
        tr.querySelector('.line-amount').value = formatCurrency(amt);
      };

      tr.querySelector('.line-weight').addEventListener('input', recalcRow);
      tr.querySelector('.line-rate').addEventListener('input', recalcRow);
      tr.querySelector('.btn-remove-line').addEventListener('click', () => {
        tr.remove();
      });

      linesBody.appendChild(tr);

      // Attach commodity autocomplete with automatic calculations
      attachCommodityAutocomp(`line_comm_${idx}`, (name, comm) => {
        if (comm) {
          const brandInput = tr.querySelector('.line-brand');
          if (brandInput && !brandInput.value.trim()) {
            brandInput.value = comm.shortName || '';
          }
          if (comm.packaging && comm.packaging.length > 0) {
            const defaultPack = comm.packaging[0];
            const weightVal = parseFloat(defaultPack.packingWeight || '0');
            const wtInput = tr.querySelector('.line-weight');
            const bagsInput = tr.querySelector('.line-bags');
            if (wtInput && bagsInput) {
              const recalcBags = () => {
                const wt = parseFloat(wtInput.value || '0');
                if (wt && weightVal) {
                  bagsInput.value = Math.round((wt * 100) / weightVal);
                }
              };
              wtInput.addEventListener('input', recalcBags);
              recalcBags();
            }
          }
        }
      });
    };

    // Populate existing lines
    lines.forEach(l => addLineRow(l));
    if (lines.length === 0) addLineRow(); // minimum one line row

    document.getElementById('btn-add-line').addEventListener('click', () => addLineRow());

    // Payment Term Toggle/Preview handlers
    const updatePaymentPreview = () => {
      const type = document.querySelector('input[name="paymentTermType"]:checked')?.value || 'DISCOUNT';
      const pct = document.getElementById('paymentPercent')?.value || '';
      const days = document.getElementById('paymentDays')?.value || '';
      const preview = document.getElementById('payment-preview');
      const discountGroup = document.getElementById('discount-percent-group');

      if (type === 'CREDIT') {
        discountGroup.style.display = 'none';
        preview.innerHTML = days ? `<strong>Payment Term:</strong> Credit period of ${days} days` : '<em>Enter credit period days</em>';
      } else if (type === 'PAYMENT') {
        discountGroup.style.display = 'none';
        preview.innerHTML = `<strong>Payment Term:</strong> Immediate payment on execution`;
      } else {
        discountGroup.style.display = '';
        preview.innerHTML = (pct && days) ? `<strong>Payment Term:</strong> ${pct}% discount if paid within ${days} days` : '<em>Enter discount % and cash days</em>';
      }
    };

    document.querySelectorAll('input[name="paymentTermType"]').forEach(r => r.addEventListener('change', updatePaymentPreview));
    document.getElementById('paymentPercent')?.addEventListener('input', updatePaymentPreview);
    document.getElementById('paymentDays')?.addEventListener('input', updatePaymentPreview);
    updatePaymentPreview(); // Initial render

    if (isEdit) {
      document.getElementById('btn-print-contract')?.addEventListener('click', () => {
        if (contract && contract.saudaNo) {
          window.open(`/api/pdf/contract/${contract.saudaNo}`, '_blank');
        }
      });
      document.getElementById('btn-delete')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this contract?')) {
          try {
            await api.del(`/contracts/${id}`);
            showToast('Sauda contract deleted');
            window.history.pushState({}, '', '/contracts');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    }

    // Submit handler
    document.getElementById('contract-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving…';

      const fd = collectFormData('contract-form');

      // Compile lines data
      const lineRows = Array.from(linesBody.querySelectorAll('.sauda-line-row'));
      const linesData = lineRows.map(row => {
        const idVal = row.querySelector('.line-id').value;
        const comm = row.querySelector('.line-commodity').value.trim();
        const brand = row.querySelector('.line-brand').value.trim() || null;
        const lorries = row.querySelector('.line-lorries').value.trim() || null;
        const bags = row.querySelector('.line-bags').value.trim() || null;
        const weight = row.querySelector('.line-weight').value.trim();
        const rate = row.querySelector('.line-rate').value.trim();

        return {
          id: idVal ? parseInt(idVal, 10) : null,
          commodity: comm,
          brand,
          numberOfLorries: lorries ? parseInt(lorries, 10) : null,
          quantityBags: bags ? parseFloat(bags) : null,
          weight: weight ? parseFloat(weight) : 0,
          rate: rate ? parseFloat(rate) : 0,
        };
      }).filter(l => l.commodity && l.weight && l.rate);

      if (linesData.length === 0) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast('Please add at least one complete sauda item', 'error');
        return;
      }

      fd.lines = linesData;

      try {
        if (isEdit) {
          await api.put(`/contracts/${id}`, fd);
          showToast('Sauda contract updated');
        } else {
          await api.post('/contracts', fd);
          showToast('Sauda contract created');
        }
        
        window.history.pushState({}, '', '/contracts');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

    // Handle click on sidebar item to navigate without full page load
    document.getElementById('alter-contracts-list')?.addEventListener('click', (e) => {
      const item = e.target.closest('.alter-list-item');
      if (!item) return;
      const targetId = item.getAttribute('data-id');
      window.history.pushState({}, '', `/contracts/${targetId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Sidebar search filter
    document.getElementById('alter-contract-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const items = document.querySelectorAll('#alter-contracts-list .alter-list-item');
      items.forEach(item => {
        const txt = item.textContent.toLowerCase();
        item.style.display = txt.includes(q) ? '' : 'none';
      });
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}
