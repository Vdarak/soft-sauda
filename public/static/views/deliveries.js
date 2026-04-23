/**
 * Deliveries View — List + Create/Edit form
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderDeliveryList() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/deliveries');
    const rows = data.map(d => `
      <tr>
        <td>${formatDate(d.dispatchDate)}</td>
        <td style="font-weight:600">${escapeHtml(d.truckNo || '-')}</td>
        <td>${escapeHtml(d.transporterName || '-')}</td>
        <td style="text-align:center">${Badge(d.status || 'DISPATCHED', d.status === 'DISPATCHED' ? 'active' : 'draft')}</td>
        <td style="text-align:right" class="mono">${d.lines?.[0] ? `${d.lines[0].dispatchedWeight} Qtl` : '-'}</td>
        <td style="text-align:right"><a href="/deliveries/${d.id}" data-route><button class="small">${Icons.edit} Edit</button></a></td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({
        title: 'Deliveries',
        subtitle: 'Track dispatched shipments',
        actions: `<a href="/deliveries/new" data-route><button class="primary">${Icons.plus} New Delivery</button></a>`
      })}
      ${DataTable({
        id: 'deliveries-table', title: 'Delivery Register', count: data.length,
        headers: [{ label: 'Date' }, { label: 'Truck No.' }, { label: 'Transporter' }, { label: 'Status', align: 'center' }, { label: 'Weight', align: 'right' }, { label: '', align: 'right' }],
        rows
      })}
    `;
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Deliveries' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderDeliveryForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let delivery = {};
  if (isEdit) {
    app.innerHTML = Spinner();
    try { delivery = await api.get(`/deliveries/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; }
  }

  const line = delivery.lines?.[0] || {};
  app.innerHTML = `
    ${PageHeader({ title: isEdit ? 'Edit Delivery' : 'New Delivery', backHref: '/deliveries' })}
    <div class="table-container" style="padding:1.5rem">
      <form id="delivery-form">
        <div class="form-grid">
          ${FormGroup({ id: 'dispatchDate', label: 'Dispatch Date', value: delivery.dispatchDate ? new Date(delivery.dispatchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
          ${FormGroup({ id: 'truckNo', label: 'Truck No.', value: delivery.truckNo || '' })}
          ${FormGroup({ id: 'transporterName', label: 'Transporter', value: delivery.transporterName || '', placeholder: 'Start typing to search...' })}
          ${FormGroup({ id: 'contractLineId', label: 'Contract Line ID', value: line.contractLineId || '', type: 'number', required: true })}
          ${FormGroup({ id: 'dispatchedWeight', label: 'Dispatched Weight', value: line.dispatchedWeight || '', type: 'number', required: true })}
          ${FormGroup({ id: 'dispatchedBags', label: 'Dispatched Bags', value: line.dispatchedBags || '', type: 'number' })}
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Delivery</button>
          <a href="/deliveries" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach party autocomplete on transporter name
  attachPartyAutocomp('transporterName');

  document.getElementById('delivery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = collectFormData('delivery-form');
    try {
      if (isEdit) { await api.put(`/deliveries/${id}`, fd); showToast('Delivery updated'); }
      else { await api.post('/deliveries', fd); showToast('Delivery created'); }
      window.history.pushState({}, '', '/deliveries');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) { showToast(err.message, 'error'); }
  });
}
