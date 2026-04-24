/**
 * Contracts View — Sauda Register List + Create/Edit form
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';

export async function renderContractList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get(`/contracts?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;
    
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
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${c.weight} Qtls</div>
        </td>
        <td style="text-align:right" class="mono">${formatCurrency(c.amount)}</td>
        <td style="text-align:center">${Badge(c.status || 'ACTIVE', c.status === 'ACTIVE' ? 'active' : 'draft')}</td>
        <td style="text-align:right">
          <a href="/contracts/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({
        title: 'Sauda Register',
        subtitle: 'View and manage trade contracts',
        actions: `<a href="/contracts/new" data-route><button class="primary">${Icons.plus} New Sauda</button></a>`
      })}
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
          { label: 'Status', style: 'text-align:center' },
          { label: 'Actions', style: 'text-align:right; width: 100px' }
        ],
        rows: renderRows(data)
      })}
    `;

    if (hasMore) {
      const loadMore = document.createElement('div');
      loadMore.innerHTML = `<div style="text-align:center;margin-top:1rem"><a href="/contracts?page=${page + 1}" data-route><button class="secondary">Load More</button></a></div>`;
      app.appendChild(loadMore);
    }

    // Attach search engine with API path for hybrid querying
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-contracts', document.querySelector('#contracts-table tbody'), data, renderRows, '/contracts');
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
          ${FormGroup({ id: 'weight', label: 'Weight (Quintals)', value: line.weightQuintals || '', type: 'number' })}
          ${FormGroup({ id: 'rate', label: 'Rate (₹)', value: line.rate || '', type: 'number' })}
        </div>

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

  document.getElementById('contract-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = collectFormData('contract-form');

    try {
      if (isEdit) { await api.put(`/contracts/${id}`, fd); showToast('Contract updated'); }
      else { await api.post('/contracts', fd); showToast('Contract created'); }
      window.history.pushState({}, '', '/contracts');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) { showToast(err.message, 'error'); }
  });
}
