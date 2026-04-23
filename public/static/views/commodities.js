/**
 * Commodities View — List + Create/Edit form with packaging & specs grids
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderCommodityList() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/commodities');
    const rows = data.map(c => `
      <tr>
        <td><div style="font-weight:600">${escapeHtml(c.name)}</div>${c.shortName ? `<div style="font-size:0.6875rem;color:var(--muted-foreground)">${escapeHtml(c.shortName)}</div>` : ''}</td>
        <td>${escapeHtml(c.hsnCode || '-')}</td>
        <td>${escapeHtml(c.unit || '-')}</td>
        <td style="text-align:right">
          <a href="/commodities/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({
        title: 'Commodities',
        subtitle: 'Manage commodity master data',
        actions: `<a href="/commodities/new" data-route><button class="primary">${Icons.plus} New Commodity</button></a>`
      })}
      ${DataTable({
        id: 'commodities-table',
        title: 'Commodity Register',
        count: data.length,
        headers: [
          { label: 'Name' },
          { label: 'HSN Code' },
          { label: 'Unit' },
          { label: '', align: 'right' },
        ],
        rows,
        emptyMessage: 'No commodities found.'
      })}
    `;
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Commodities' })}<div class="alert danger">${err.message}</div>`;
  }
}

export async function renderCommodityForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let commodity = { packaging: [], specifications: [] };

  if (isEdit) {
    app.innerHTML = Spinner();
    try { commodity = await api.get(`/commodities/${id}`); } catch (err) {
      app.innerHTML = `<div class="alert danger">${err.message}</div>`;
      return;
    }
  }

  let packagingRows = commodity.packaging || [];
  let specsRows = commodity.specifications || [];

  function renderPackagingGrid() {
    return packagingRows.map((p, i) => `
      <tr>
        <td><input type="text" value="${escapeHtml(p.packingType || '')}" data-pack-idx="${i}" data-field="packingType" class="pack-input"></td>
        <td><input type="number" value="${p.packingWeight || 0}" data-pack-idx="${i}" data-field="packingWeight" class="pack-input"></td>
        <td><input type="text" value="${p.sellerBrokerageRate || ''}" data-pack-idx="${i}" data-field="sellerBrokerageRate" class="pack-input"></td>
        <td><input type="text" value="${p.buyerBrokerageRate || ''}" data-pack-idx="${i}" data-field="buyerBrokerageRate" class="pack-input"></td>
        <td><button type="button" class="small danger remove-pack" data-idx="${i}">×</button></td>
      </tr>
    `).join('');
  }

  function renderSpecsGrid() {
    return specsRows.map((s, i) => `
      <tr>
        <td><input type="text" value="${escapeHtml(s.specification || '')}" data-spec-idx="${i}" data-field="specification" class="spec-input"></td>
        <td><input type="text" value="${escapeHtml(s.specValue || '')}" data-spec-idx="${i}" data-field="specValue" class="spec-input"></td>
        <td><input type="text" value="${escapeHtml(s.minMax || '')}" data-spec-idx="${i}" data-field="minMax" class="spec-input"></td>
        <td><input type="text" value="${escapeHtml(s.remarks || '')}" data-spec-idx="${i}" data-field="remarks" class="spec-input"></td>
        <td><button type="button" class="small danger remove-spec" data-idx="${i}">×</button></td>
      </tr>
    `).join('');
  }

  app.innerHTML = `
    ${PageHeader({
      title: isEdit ? `Edit: ${commodity.name}` : 'New Commodity',
      backHref: '/commodities'
    })}
    <div class="table-container" style="padding:1.5rem">
      <form id="commodity-form">
        <div class="form-grid">
          ${FormGroup({ id: 'name', label: 'Commodity Name', value: commodity.name || '', required: true })}
          ${FormGroup({ id: 'shortName', label: 'Short Name', value: commodity.shortName || '' })}
          ${FormGroup({ id: 'hsnCode', label: 'HSN Code', value: commodity.hsnCode || '' })}
          ${FormGroup({ id: 'unit', label: 'Unit', value: commodity.unit || '', placeholder: 'Qtl, Kg, MT' })}
          ${FormGroup({ id: 'description', label: 'Description', value: commodity.description || '', type: 'textarea' })}
        </div>

        <h3 style="margin:1.5rem 0 0.75rem;font-size:0.875rem">Packaging</h3>
        <table id="packaging-table"><thead><tr><th>Type</th><th>Weight</th><th>Seller Brkg</th><th>Buyer Brkg</th><th></th></tr></thead>
          <tbody id="pack-tbody">${renderPackagingGrid()}</tbody>
        </table>
        <button type="button" id="add-pack" class="small" style="margin-top:0.5rem">${Icons.plus} Add Row</button>

        <h3 style="margin:1.5rem 0 0.75rem;font-size:0.875rem">Specifications</h3>
        <table id="specs-table"><thead><tr><th>Specification</th><th>Value</th><th>Min/Max</th><th>Remarks</th><th></th></tr></thead>
          <tbody id="specs-tbody">${renderSpecsGrid()}</tbody>
        </table>
        <button type="button" id="add-spec" class="small" style="margin-top:0.5rem">${Icons.plus} Add Row</button>

        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Commodity</button>
          <a href="/commodities" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Event bindings
  document.getElementById('add-pack').addEventListener('click', () => {
    packagingRows.push({ packingType: '', packingWeight: '0' });
    document.getElementById('pack-tbody').innerHTML = renderPackagingGrid();
  });

  document.getElementById('add-spec').addEventListener('click', () => {
    specsRows.push({ specification: '', specValue: '' });
    document.getElementById('specs-tbody').innerHTML = renderSpecsGrid();
  });

  // Delegate remove buttons
  app.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-pack')) {
      packagingRows.splice(parseInt(e.target.dataset.idx), 1);
      document.getElementById('pack-tbody').innerHTML = renderPackagingGrid();
    }
    if (e.target.classList.contains('remove-spec')) {
      specsRows.splice(parseInt(e.target.dataset.idx), 1);
      document.getElementById('specs-tbody').innerHTML = renderSpecsGrid();
    }
  });

  // Sync inline inputs to array
  app.addEventListener('input', (e) => {
    if (e.target.classList.contains('pack-input')) {
      const idx = parseInt(e.target.dataset.packIdx);
      packagingRows[idx][e.target.dataset.field] = e.target.value;
    }
    if (e.target.classList.contains('spec-input')) {
      const idx = parseInt(e.target.dataset.specIdx);
      specsRows[idx][e.target.dataset.field] = e.target.value;
    }
  });

  document.getElementById('commodity-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = collectFormData('commodity-form');
    fd.packaging = packagingRows;
    fd.specifications = specsRows;

    try {
      if (isEdit) { await api.put(`/commodities/${id}`, fd); showToast('Commodity updated'); }
      else { await api.post('/commodities', fd); showToast('Commodity created'); }
      window.history.pushState({}, '', '/commodities');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) { showToast(err.message, 'error'); }
  });
}
