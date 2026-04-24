/**
 * Commodities View — List + Create/Edit form with packaging & specs grids
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderCommodityList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get(`/commodities?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;

    const renderRows = (items) => items.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">${escapeHtml(c.name)}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${escapeHtml(c.shortName || '-')}</div>
        </td>
        <td>${escapeHtml(c.hsnCode || '-')}</td>
        <td>${escapeHtml(c.unit || '-')}</td>
        <td style="text-align:right">
          <a href="/commodities/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Commodity Master', actions: `<a href="/commodities/new" data-route><button class="primary">${Icons.plus} New Commodity</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem">
        <div class="form-group" style="margin:0; flex:1; max-width:300px; position:relative">
          <input type="text" id="search-commodities" placeholder="Search commodities..." style="padding-left:2rem; width:100%">
          <div style="position:absolute; left:0.6rem; top:0.5rem; color:var(--muted-foreground)">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'commodities-table',
        count: data.length,
        headers: [ { label: 'Commodity Name' }, { label: 'HSN Code' }, { label: 'Unit' }, { label: '', align: 'right' } ],
        rows: renderRows(data),
        pagination: { page, hasMore, route: '/commodities' }
      })}
    `;
    
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-commodities', document.querySelector('#commodities-table tbody'), data, renderRows);
    });
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Commodities' })}<div class="alert danger">${err.message}</div>`;
  }
}

export async function renderCommodityForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let commodity = { packaging: [], specifications: [] };

  if (isEdit) {
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
          ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
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
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const fd = collectFormData('commodity-form');
    fd.packaging = packagingRows;
    fd.specifications = specsRows;

    try {
      if (isEdit) { await api.put(`/commodities/${id}`, fd); showToast('Commodity updated'); }
      else { await api.post('/commodities', fd); showToast('Commodity created'); }
      
      await api.get('/commodities?page=1&limit=50', { forceRefresh: true });
      window.history.pushState({}, '', '/commodities');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });

  if (isEdit) {
    document.getElementById('btn-delete').addEventListener('click', async (e) => {
      if (!confirm('Are you sure you want to delete this commodity?')) return;
      const btn = e.target.closest('button');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
      try {
        await api.del(`/commodities/${id}`);
        await api.get('/commodities?page=1&limit=50', { forceRefresh: true });
        window.history.pushState({}, '', '/commodities');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        alert(err.message);
      }
    });
  }
}
