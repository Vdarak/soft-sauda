/**
 * Contracts View — Sauda Register List + Create/Edit form
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp, attachCommodityAutocomp } from '../lib/autocomplete.js';

export async function renderContractList() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/contracts');
    const rows = data.map(c => `
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
      ${DataTable({
        id: 'contracts-table',
        title: 'Contracts',
        count: data.length,
        headers: [
          { label: 'Sauda Details' },
          { label: 'Trade Parties' },
          { label: 'Commodity' },
          { label: 'Value', align: 'right' },
          { label: 'Status', align: 'center' },
          { label: '', align: 'right' },
        ],
        rows,
      })}
    `;
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Contracts' })}<div class="alert danger">${err.message}</div>`;
  }
}

export async function renderContractForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let contract = {};

  if (isEdit) {
    app.innerHTML = Spinner();
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
          <a href="/contracts" data-route><button type="button">Cancel</button></a>
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
