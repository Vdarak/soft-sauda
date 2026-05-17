/**
 * City Master View — List + Create form
 * WS4: City / District / State / Pincode Master
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';

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
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'City Master', actions: `<a href="/cities/new" data-route><button class="primary">${Icons.plus} New City</button></a>` })}
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
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">Create City</button>
          <a href="/cities" data-route><button type="button" class="secondary">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

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
