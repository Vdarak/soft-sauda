/**
 * Commodities View — List + Dual-Pane Create/Edit form with packaging & specs grids
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';

export async function renderCommodityList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/commodities');

    const renderRows = (items) => items.map(c => `
      <tr style="cursor:pointer" onclick="window.location.href='/commodities/${c.id}'; window.dispatchEvent(new PopStateEvent('popstate'))">
        <td>
          <div style="font-weight:600">${escapeHtml(c.name)}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${escapeHtml(c.shortName || '-')}</div>
        </td>
        <td>${escapeHtml(c.hsnCode || '-')}</td>
        <td>${escapeHtml(c.unit || '-')}</td>
        <td style="text-align:right" onclick="event.stopPropagation()">
          <a href="/commodities/${c.id}" data-route><button class="small">${Icons.edit} Alter</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ 
        title: 'Commodity Master', 
        actions: `<button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button><a href="/commodities/new" data-route><button class="primary">${Icons.plus} New Commodity</button></a>` 
      })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-commodities" placeholder="Search commodities..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'commodities-table',
        count: data.length,
        headers: [ { label: 'Commodity Name' }, { label: 'HSN Code' }, { label: 'Unit' }, { label: '', style: 'text-align:right' } ],
        rows: renderRows(data)
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
  
  app.innerHTML = Spinner();

  try {
    const allCommodities = await api.get('/commodities');
    
    // Fetch groups lookup (defaulting to empty if none)
    let groups = [];
    try {
      groups = await api.get('/search/packaging'); // wait, let's load groups if any or mock options
    } catch { }
    if (!groups || groups.length === 0) {
      groups = [
        { value: 1, label: 'Grains & Pulses' },
        { value: 2, label: 'Oil Seeds' },
        { value: 3, label: 'Spices' },
        { value: 4, label: 'Cotton & Fibres' },
      ];
    }

    let commodity = { packaging: [], specifications: [] };

    if (isEdit) {
      commodity = await api.get(`/commodities/${id}`);
    }

    let packagingRows = commodity.packaging || [];
    let specsRows = commodity.specifications || [];

    const packingTypeOptions = ['Bags', 'Katta', 'Bori', 'Tons', 'Tins'];
    const brokerageTypeOptions = ['Per Quintal', 'Fixed Amount', 'Percentage'];
    const minMaxOptions = ['Min', 'Max'];

    function renderPackagingGrid() {
      return packagingRows.map((p, i) => `
        <tr class="pack-row-item">
          <td>
            <select data-pack-idx="${i}" data-field="packingType" class="pack-input" style="padding: 0.25rem;">
              <option value="">Select...</option>
              ${packingTypeOptions.map(opt => `<option value="${opt}" ${p.packingType === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </td>
          <td><input type="number" step="0.001" value="${p.packingWeight || 0}" data-pack-idx="${i}" data-field="packingWeight" class="pack-input" placeholder="Size 1"></td>
          <td><input type="number" step="0.001" value="${p.packingWeight2 || ''}" data-pack-idx="${i}" data-field="packingWeight2" class="pack-input" placeholder="Size 2"></td>
          <td>
            <div style="display: flex; gap: 0.25rem;">
              <input type="number" step="0.01" value="${p.sellerBrokerageRate || ''}" data-pack-idx="${i}" data-field="sellerBrokerageRate" class="pack-input" style="width: 70px;" placeholder="Rate">
              <select data-pack-idx="${i}" data-field="sellerBrokerageType" class="pack-input" style="padding: 0.25rem;">
                <option value="">Type...</option>
                ${brokerageTypeOptions.map(opt => `<option value="${opt}" ${p.sellerBrokerageType === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
          </td>
          <td>
            <div style="display: flex; gap: 0.25rem;">
              <input type="number" step="0.01" value="${p.buyerBrokerageRate || ''}" data-pack-idx="${i}" data-field="buyerBrokerageRate" class="pack-input" style="width: 70px;" placeholder="Rate">
              <select data-pack-idx="${i}" data-field="buyerBrokerageType" class="pack-input" style="padding: 0.25rem;">
                <option value="">Type...</option>
                ${brokerageTypeOptions.map(opt => `<option value="${opt}" ${p.buyerBrokerageType === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
          </td>
          <td><button type="button" class="small danger remove-pack" data-idx="${i}">×</button></td>
        </tr>
      `).join('');
    }

    function renderSpecsGrid() {
      return specsRows.map((s, i) => `
        <tr>
          <td><input type="text" value="${escapeHtml(s.specification || '')}" data-spec-idx="${i}" data-field="specification" class="spec-input" placeholder="e.g. Moisture"></td>
          <td><input type="number" step="0.01" value="${s.specValue || ''}" data-spec-idx="${i}" data-field="specValue" class="spec-input" placeholder="e.g. 8.5"></td>
          <td>
            <select data-spec-idx="${i}" data-field="minMax" class="spec-input" style="padding: 0.25rem;">
              <option value="">Rule...</option>
              ${minMaxOptions.map(opt => `<option value="${opt}" ${s.minMax === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </td>
          <td><input type="text" value="${escapeHtml(s.remarks || '')}" data-spec-idx="${i}" data-field="remarks" class="spec-input" placeholder="Notes"></td>
          <td><button type="button" class="small danger remove-spec" data-idx="${i}">×</button></td>
        </tr>
      `).join('');
    }

    app.innerHTML = `
      <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; height: calc(100vh - 100px); align-items: stretch;">
        
        <!-- Left Sidebar: SELECT COMMODITY TO ALTER -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT COMMODITY TO ALTER</h3>
            <input type="text" id="alter-commodity-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-commodities-list" style="flex: 1; overflow-y: auto;">
            ${allCommodities.map(c => `
              <div class="alter-list-item ${c.id == id ? 'active-item' : ''}" data-id="${c.id}" style="padding: 0.625rem 1rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s;">
                <div style="font-size: 0.8125rem; font-weight: 600; color: ${c.id == id ? 'var(--primary)' : 'inherit'};">${escapeHtml(c.name)}</div>
                <div style="font-size: 0.6875rem; color: var(--muted-foreground);">${escapeHtml(c.shortName || '-')}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane: Master Form -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          ${PageHeader({
            title: isEdit ? `Alter Commodity: ${commodity.name}` : 'New Commodity record',
            subtitle: isEdit ? `Edit specifications for Commodity ID #${id}` : 'Create a new catalog item',
            backHref: '/commodities'
          })}

          <form id="commodity-form">
            <h3 style="margin: 0 0 1rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Basic details</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'name', label: 'Commodity Name', value: commodity.name || '', required: true })}
              ${FormGroup({ id: 'shortName', label: 'Short Name', value: commodity.shortName || '' })}
              ${FormGroup({ id: 'groupId', label: 'Group Category', type: 'select', value: commodity.groupId || '', options: groups })}
              ${FormGroup({ id: 'hsnCode', label: 'HSN Code', value: commodity.hsnCode || '' })}
              ${FormGroup({ id: 'unit', label: 'Default UOM', value: commodity.unit || '', placeholder: 'Qtl, MT, Kg' })}
              ${FormGroup({ id: 'description', label: 'Description / Bio', value: commodity.description || '', type: 'textarea' })}
            </div>

            <h3 style="margin: 1.5rem 0 0.75rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Packaging configuration</h3>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.75rem;">
              <table id="packaging-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: var(--faint);">
                    <th style="padding: 0.5rem 0.75rem;">Package Type</th>
                    <th style="padding: 0.5rem 0.75rem;">Packing Weight 1</th>
                    <th style="padding: 0.5rem 0.75rem;">Packing Weight 2</th>
                    <th style="padding: 0.5rem 0.75rem;">Seller Brokerage</th>
                    <th style="padding: 0.5rem 0.75rem;">Buyer Brokerage</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody id="pack-tbody">${renderPackagingGrid()}</tbody>
              </table>
            </div>
            <button type="button" id="add-pack" class="secondary small" style="margin-bottom: 1.5rem;">+ Add Package Row</button>

            <h3 style="margin: 1.5rem 0 0.75rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Quality parameters & Specs</h3>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.75rem;">
              <table id="specs-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: var(--faint);">
                    <th style="padding: 0.5rem 0.75rem;">Specification</th>
                    <th style="padding: 0.5rem 0.75rem;">Target Value %</th>
                    <th style="padding: 0.5rem 0.75rem;">Tolerance Rule</th>
                    <th style="padding: 0.5rem 0.75rem;">Remarks</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody id="specs-tbody">${renderSpecsGrid()}</tbody>
              </table>
            </div>
            <button type="button" id="add-spec" class="secondary small" style="margin-bottom: 1.5rem;">+ Add Quality Spec Row</button>

            <div class="form-actions">
              <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Commodity</button>
              ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
              <a href="/commodities" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Add style rules
    const style = document.createElement('style');
    style.innerHTML = `
      .alter-list-item:hover { background: var(--muted); }
      .active-item { background: rgba(34, 197, 94, 0.08) !important; border-left: 3px solid var(--primary); }
    `;
    document.head.appendChild(style);

    // Bind left sidebar search filter
    document.getElementById('alter-commodity-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.alter-list-item').forEach(el => {
        const txt = el.textContent.toLowerCase();
        el.style.display = txt.includes(q) ? '' : 'none';
      });
    });

    // Bind left sidebar click transitions
    document.querySelectorAll('.alter-list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const clickedId = e.currentTarget.getAttribute('data-id');
        window.history.pushState({}, '', `/commodities/${clickedId}`);
        renderCommodityForm(clickedId);
      });
    });

    // Dynamic grid row addition
    document.getElementById('add-pack').addEventListener('click', () => {
      packagingRows.push({ packingType: '', packingWeight: '0', packingWeight2: '', sellerBrokerageRate: '', sellerBrokerageType: '', buyerBrokerageRate: '', buyerBrokerageType: '' });
      document.getElementById('pack-tbody').innerHTML = renderPackagingGrid();
    });

    document.getElementById('add-spec').addEventListener('click', () => {
      specsRows.push({ specification: '', specValue: '', minMax: '', remarks: '' });
      document.getElementById('specs-tbody').innerHTML = renderSpecsGrid();
    });

    // Inline inputs grid listener updates
    app.addEventListener('input', (e) => {
      if (e.target.classList.contains('pack-input')) {
        const idx = parseInt(e.target.dataset.packIdx, 10);
        packagingRows[idx][e.target.dataset.field] = e.target.value;
      }
      if (e.target.classList.contains('spec-input')) {
        const idx = parseInt(e.target.dataset.specIdx, 10);
        specsRows[idx][e.target.dataset.field] = e.target.value;
      }
    });

    app.addEventListener('change', (e) => {
      if (e.target.classList.contains('pack-input')) {
        const idx = parseInt(e.target.dataset.packIdx, 10);
        packagingRows[idx][e.target.dataset.field] = e.target.value;
      }
      if (e.target.classList.contains('spec-input')) {
        const idx = parseInt(e.target.dataset.specIdx, 10);
        specsRows[idx][e.target.dataset.field] = e.target.value;
      }
    });

    // Delegate removes
    app.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-pack')) {
        packagingRows.splice(parseInt(e.target.dataset.idx, 10), 1);
        document.getElementById('pack-tbody').innerHTML = renderPackagingGrid();
      }
      if (e.target.classList.contains('remove-spec')) {
        specsRows.splice(parseInt(e.target.dataset.idx, 10), 1);
        document.getElementById('specs-tbody').innerHTML = renderSpecsGrid();
      }
    });

    // Submit trigger
    document.getElementById('commodity-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving...';

      const fd = collectFormData('commodity-form');
      fd.packaging = packagingRows.filter(p => p.packingType);
      fd.specifications = specsRows.filter(s => s.specification);

      try {
        if (isEdit) {
          await api.put(`/commodities/${id}`, fd);
          showToast('Commodity updated');
        } else {
          await api.post('/commodities', fd);
          showToast('Commodity created');
        }
        
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
        btn.innerHTML = '<span class="spinner"></span> Deleting...';
        try {
          await api.del(`/commodities/${id}`);
          window.history.pushState({}, '', '/commodities');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = ogHtml;
          alert(err.message);
        }
      });
    }

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to load: ${err.message}</div>`;
  }
}
