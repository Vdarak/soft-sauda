/**
 * Contracts View — Sauda Register List + Create/Edit form
 * 
 * WS1: Payment Terms (Discount vs Credit) with dynamic text preview
 * WS3: Pending Delivery Counts — shows dispatched/pending per contract
 * WS6: Quick filter bar + Jump to Sauda #
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';

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

/** Build payment term text */
function paymentTermText(c) {
  if (!c.paymentDays && !c.paymentPercent) return '';
  if (c.paymentTermType === 'CREDIT') {
    return `Credit for ${c.paymentDays || 0} days`;
  }
  return `${c.paymentPercent || 0}% discount within ${c.paymentDays || 0} days`;
}

export async function renderContractList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  const params = ctx && ctx.location && ctx.location.search ? new URLSearchParams(ctx.location.search) : new URLSearchParams();
  const page = parseInt(params.get('page') || '1', 10);
  const statusFilter = params.get('status') || 'ALL';
  const limit = 50;

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
        <td style="text-align:right">
          <a href="/contracts/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    // Filter button builder
    const filterBtn = (label, value) => {
      const active = statusFilter === value;
      return `<a href="/contracts?status=${value}" data-route><button class="${active ? 'primary' : 'secondary'}" style="font-size:0.75rem;padding:0.25rem 0.75rem">${label}</button></a>`;
    };

    app.innerHTML = `
      ${PageHeader({
        title: 'Sauda Register',
        subtitle: 'View and manage trade contracts',
        actions: `<button class="secondary" id="export-contracts-btn" style="margin-right:0.5rem">📥 Export Excel</button><a href="/contracts/new" data-route><button class="primary">${Icons.plus} New Sauda</button></a>`
      })}
      <div style="margin-bottom:0.75rem;display:flex;gap:0.375rem;flex-wrap:wrap;align-items:center">
        ${filterBtn('All', 'ALL')}
        ${filterBtn('Active', 'ACTIVE')}
        ${filterBtn('Delivery Pending', 'DELIVERY_PENDING')}
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

    // Attach search engine — fully client-side
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-contracts', document.querySelector('#contracts-table tbody'), data, renderRows);
    });

    // Export button handler
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
  let contract = {};

  if (isEdit) {
    try { contract = await api.get(`/contracts/${id}`); } catch (err) {
      app.innerHTML = `<div class="alert danger">${err.message}</div>`;
      return;
    }
  }

  const line = contract.lines?.[0] || {};
  const ptType = contract.paymentTermType || 'DISCOUNT';

  app.innerHTML = `
    ${PageHeader({
      title: isEdit ? `Edit Sauda #${contract.saudaNo}` : 'New Sauda',
      backHref: '/contracts'
    })}
    <div class="table-container" style="padding:1.5rem">
      <form id="contract-form">
        <h3 style="margin:0 0 1rem;font-size:0.875rem">Contract Details</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'saudaNo', label: 'Sauda No.', value: contract.saudaNo || '', type: 'number', required: true })}
          ${FormGroup({ id: 'saudaBook', label: 'Sauda Book', value: contract.saudaBook || 'Main Book' })}
          ${FormGroup({ id: 'saudaDate', label: 'Date', value: contract.saudaDate ? new Date(contract.saudaDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
          ${FormGroup({ id: 'deliveryTerm', label: 'Delivery Term', value: contract.deliveryTerm || '' })}
        </div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Trade Parties</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'sellerName', label: 'Seller', value: contract.sellerName || '', required: true, placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'buyerName', label: 'Buyer', value: contract.buyerName || '', required: true, placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'sellerBroker', label: 'Seller Broker', value: contract.sellerBroker || '', placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'buyerBroker', label: 'Buyer Broker', value: contract.buyerBroker || '', placeholder: 'Start typing to search...' })}
        </div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Commodity & Pricing</h3>
        <div class="form-grid">
          ${FormGroup({ id: 'commodity', label: 'Commodity', value: line.commodityName || '', required: true, placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'brand', label: 'Brand', value: line.brand || '' })}
          ${FormGroup({ id: 'numberOfLorries', label: 'Number of Lorries', value: line.numberOfLorries || '', type: 'number' })}
          ${FormGroup({ id: 'weight', label: 'Weight (Quintals)', value: line.weightQuintals || '', type: 'number' })}
          ${FormGroup({ id: 'rate', label: 'Rate (₹)', value: line.rate || '', type: 'number' })}
        </div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Payment Terms</h3>
        <div style="display:flex;gap:1.5rem;align-items:center;margin-bottom:1rem">
          <label style="display:flex;align-items:center;gap:0.375rem;cursor:pointer;font-size:0.875rem">
            <input type="radio" name="paymentTermType" value="DISCOUNT" ${ptType === 'DISCOUNT' ? 'checked' : ''}>
            Discount
          </label>
          <label style="display:flex;align-items:center;gap:0.375rem;cursor:pointer;font-size:0.875rem">
            <input type="radio" name="paymentTermType" value="CREDIT" ${ptType === 'CREDIT' ? 'checked' : ''}>
            Credit
          </label>
        </div>
        <div class="form-grid" id="payment-fields">
          <div class="form-group" id="discount-percent-group">
            <label for="paymentPercent">Discount %</label>
            <input type="number" id="paymentPercent" name="paymentPercent" value="${contract.paymentPercent || ''}" step="0.01" placeholder="e.g. 3">
          </div>
          ${FormGroup({ id: 'paymentDays', label: 'Days', value: contract.paymentDays || '', type: 'number', placeholder: 'e.g. 2' })}
        </div>
        <div id="payment-preview" style="margin-top:0.5rem;padding:0.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:0.5rem;font-size:0.8125rem;color:var(--primary)"></div>

        <h3 style="margin:1.5rem 0 1rem;font-size:0.875rem">Remarks</h3>
        ${FormGroup({ id: 'remarks', label: 'Custom Remarks', value: contract.customRemarks || '', type: 'textarea' })}

        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Sauda</button>
          <a href="/contracts" data-route><button type="button" class="secondary">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach autocomp to all party fields + commodity field
  attachPartyAutocomp('sellerName');
  attachPartyAutocomp('buyerName');
  attachPartyAutocomp('sellerBroker');
  attachPartyAutocomp('buyerBroker');
  attachCommodityAutocomp('commodity');

  // Payment Terms — toggle and preview
  const updatePaymentPreview = () => {
    const type = document.querySelector('input[name="paymentTermType"]:checked')?.value || 'DISCOUNT';
    const pct = document.getElementById('paymentPercent')?.value || '';
    const days = document.getElementById('paymentDays')?.value || '';
    const preview = document.getElementById('payment-preview');
    const discountGroup = document.getElementById('discount-percent-group');

    if (type === 'CREDIT') {
      discountGroup.style.display = 'none';
      preview.innerHTML = days ? `<strong>Payment Term:</strong> Credit for ${days} days without discount` : '<em>Enter number of days</em>';
    } else {
      discountGroup.style.display = '';
      preview.innerHTML = (pct && days) ? `<strong>Payment Term:</strong> ${pct}% discount within ${days} days` : '<em>Enter discount % and days</em>';
    }
  };

  document.querySelectorAll('input[name="paymentTermType"]').forEach(r => r.addEventListener('change', updatePaymentPreview));
  document.getElementById('paymentPercent')?.addEventListener('input', updatePaymentPreview);
  document.getElementById('paymentDays')?.addEventListener('input', updatePaymentPreview);
  updatePaymentPreview(); // Initial render

  document.getElementById('contract-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving…';

    const fd = collectFormData('contract-form');
    try {
      if (isEdit) { await api.put(`/contracts/${id}`, fd); showToast('Contract updated'); }
      else { await api.post('/contracts', fd); showToast('Contract created'); }
      await api.get('/contracts', { forceRefresh: true });
      window.history.pushState({}, '', '/contracts');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });
}
