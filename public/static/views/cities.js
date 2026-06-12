/**
 * City Master View — List + Create form
 * WS4: City / District / State / Pincode Master
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { autocomp } from '../vendor/autocomp.js';
import { attachCityAutocomp, getCitiesList } from '../lib/autocomplete.js';


export async function renderCityList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/cities');

    const renderRows = (items) => items.map(c => `
      <tr>
        <td style="font-weight:600">${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.districtName || '-')}</td>
        <td>${escapeHtml(c.stateName || '-')}</td>
        <td>${escapeHtml(c.pincode || '-')}</td>
        <td>${escapeHtml(c.stdCode || '-')}</td>
        <td style="text-align:right" onclick="event.stopPropagation()">
          <div style="display:inline-flex; gap:0.25rem; justify-content:flex-end;">
            <a href="/cities/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${c.id}" data-entity="cities">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'City Master', actions: `<button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button><a href="/cities/new" data-route><button class="primary">${Icons.plus} New City</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-cities" placeholder="Search cities..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'cities-table',
        count: data.length,
        headers: [
          { label: 'City' },
          { label: 'District' },
          { label: 'State' },
          { label: 'Pincode' },
          { label: 'STD Code' },
          { label: 'Actions', style: 'text-align:right' },
        ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-cities', document.querySelector('#cities-table tbody'), data, renderRows);
    });
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'City Master' })}<div class="alert danger">${err.message}</div>`;
  }
}

export async function renderCityForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;

  app.innerHTML = Spinner();

  try {
    const allCities = await api.get('/cities');
    let city = {};

    if (isEdit) {
      city = await api.get(`/cities/${id}`);
    }

    app.innerHTML = `
      <a href="/cities" data-route style="display:inline-flex; align-items:center; gap:0.375rem; font-size:0.8125rem; color:var(--muted-foreground); text-decoration:none; padding:0.75rem 0 0.25rem; margin-bottom:0.25rem;">${Icons.arrowLeft} Back to Cities</a>
      <div class="dual-pane-container">

        <!-- Left Sidebar -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT CITY</h3>
            <input type="text" id="alter-city-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-cities-list" style="flex: 1; overflow-y: auto;">
            ${allCities.map(c => `
              <div class="alter-list-item ${c.id == id ? 'active-item' : ''}" data-id="${c.id}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                  <div class="title" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(c.name)}</div>
                  <div style="font-size:0.625rem; color:var(--muted-foreground); white-space:nowrap; padding-top:0.1rem; flex-shrink:0;">#${c.id}</div>
                </div>
                <div class="subtitle">${escapeHtml(c.stateName || '-')}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          <form id="city-form">
            <div class="form-grid">
              ${FormGroup({ id: 'name', label: 'City Name', value: city.name || '', required: true, placeholder: 'e.g. Bikaner' })}
              ${FormGroup({ id: 'districtName', label: 'District', value: city.districtName || '', required: true, placeholder: 'e.g. Bikaner' })}
              ${FormGroup({ id: 'stateName', label: 'State', value: city.stateName || '', required: true, placeholder: 'e.g. Rajasthan' })}
              ${FormGroup({ id: 'pincode', label: 'Pincode', value: city.pincode || '', placeholder: 'e.g. 334001' })}
              ${FormGroup({ id: 'stdCode', label: 'STD Code', value: city.stdCode || '', placeholder: 'e.g. 0151' })}
            </div>
            <div class="form-actions" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
              <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} City</button>
              ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash} Delete</button>` : ''}
              <a href="/cities" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Styles
    const style = document.createElement('style');
    style.innerHTML = `
      .alter-list-item:hover { background: var(--muted); cursor: pointer; }
      .active-item { background: rgba(34, 197, 94, 0.08) !important; border-left: 3px solid var(--primary); }
    `;
    document.head.appendChild(style);

    // Left sidebar search
    document.getElementById('alter-city-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.alter-list-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    // Left sidebar clicks
    document.querySelectorAll('.alter-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const clickedId = el.getAttribute('data-id');
        window.history.pushState({}, '', `/cities/${clickedId}`);
        renderCityForm(clickedId);
      });
    });

    // City name autocomplete
    attachCityAutocomp('name', (name, c) => {
      if (c) {
        const distInput = document.getElementById('districtName');
        const stateInput = document.getElementById('stateName');
        const pinInput = document.getElementById('pincode');
        const stdInput = document.getElementById('stdCode');
        if (distInput && c.districtName) distInput.value = c.districtName;
        if (stateInput && c.stateName) stateInput.value = c.stateName;
        if (pinInput && c.pincode) pinInput.value = c.pincode;
        if (stdInput && c.stdCode) stdInput.value = c.stdCode;
      }
    });

    // District autocomplete
    const distEl = document.getElementById('districtName');
    if (distEl) {
      autocomp(distEl, {
        onQuery: async (val) => {
          if (!val || val.trim() === '') return [];
          const q = val.toLowerCase();
          const list = await getCitiesList();
          const seen = new Set();
          list.forEach(c => { if (c.districtName && c.districtName.toLowerCase().includes(q)) seen.add(c.districtName); });
          return Array.from(seen).slice(0, 15);
        },
        onSelect: async (val) => {
          distEl.value = val;
          const list = await getCitiesList();
          const matched = list.find(c => c.districtName && c.districtName.toLowerCase() === val.toLowerCase());
          if (matched?.stateName) {
            const stateInput = document.getElementById('stateName');
            if (stateInput) stateInput.value = matched.stateName;
          }
          return val;
        }
      });
    }

    // Form submit
    document.getElementById('city-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';
      const fd = collectFormData('city-form');
      try {
        if (isEdit) {
          await api.put(`/cities/${id}`, fd);
          showToast('City updated');
        } else {
          await api.post('/cities', fd);
          showToast('City created');
        }
        window.history.pushState({}, '', '/cities');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

    if (isEdit) {
      document.getElementById('btn-delete')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this city?')) return;
        try {
          await api.del(`/cities/${id}`);
          showToast('City deleted');
          window.history.pushState({}, '', '/cities');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}
