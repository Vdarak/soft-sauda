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

export async function renderCityForm() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${PageHeader({ title: 'New City', backHref: '/cities' })}
    <div class="table-container" style="padding:1.5rem">
      <form id="city-form">
        <div class="form-grid">
          ${FormGroup({ id: 'name', label: 'City Name', value: '', required: true, placeholder: 'e.g. Bikaner' })}
          ${FormGroup({ id: 'districtName', label: 'District', value: '', required: true, placeholder: 'e.g. Bikaner' })}
          ${FormGroup({ id: 'stateName', label: 'State', value: '', required: true, placeholder: 'e.g. Rajasthan' })}
          ${FormGroup({ id: 'pincode', label: 'Pincode', value: '', placeholder: 'e.g. 334001' })}
          ${FormGroup({ id: 'stdCode', label: 'STD Code', value: '', placeholder: 'e.g. 0151' })}
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">Create City</button>
          <a href="/cities" data-route><button type="button" class="secondary">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach autocomplete for city name input to inherit details if city already exists
  attachCityAutocomp('name', (name, city) => {
    if (city) {
      const distInput = document.getElementById('districtName');
      const stateInput = document.getElementById('stateName');
      const pinInput = document.getElementById('pincode');
      const stdInput = document.getElementById('stdCode');
      if (distInput && city.districtName) distInput.value = city.districtName;
      if (stateInput && city.stateName) stateInput.value = city.stateName;
      if (pinInput && city.pincode) pinInput.value = city.pincode;
      if (stdInput && city.stdCode) stdInput.value = city.stdCode;
    }
  });

  // Attach autocomplete to districtName to search existing districts and auto-populate stateName
  const distEl = document.getElementById('districtName');
  if (distEl) {
    autocomp(distEl, {
      onQuery: async (val) => {
        if (!val || val.trim() === '') return [];
        const q = val.toLowerCase();
        const allCities = await getCitiesList();
        const matchingDistricts = new Set();
        allCities.forEach(c => {
          if (c.districtName && c.districtName.toLowerCase().includes(q)) {
            matchingDistricts.add(c.districtName);
          }
        });
        return Array.from(matchingDistricts).slice(0, 15);
      },
      onSelect: async (val) => {
        distEl.value = val;
        const allCities = await getCitiesList();
        const matched = allCities.find(c => c.districtName && c.districtName.toLowerCase() === val.toLowerCase());
        if (matched && matched.stateName) {
          const stateInput = document.getElementById('stateName');
          if (stateInput) stateInput.value = matched.stateName;
        }
        return val;
      }
    });
  }

  document.getElementById('city-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

    const fd = collectFormData('city-form');
    try {
      await api.post('/cities', fd);
      showToast('City created');
      window.history.pushState({}, '', '/cities');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = ogHtml;
      showToast(err.message, 'error');
    }
  });
}
