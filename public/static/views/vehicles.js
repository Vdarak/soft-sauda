/**
 * Vehicle Master View (Single-Viewport Compact Paper Form Design)
 * Left Pane: Searchable Vehicle List
 * Right Pane: Dense 100% Viewport Fit Paper Form
 */

import * as api from '../lib/api.js';
import { showToast, Icons } from '../components/ui.js';

export async function renderVehicleList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.truck} Vehicle Master Management
          </h2>
          <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">
            Manage truck vehicle types, standard capacities, and min/max weight tolerances.
          </p>
        </div>
        <button id="btn-add-veh" class="primary" style="height: 30px; font-size: 0.8rem; padding: 0 0.75rem;">
          + Add New Vehicle Type
        </button>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-veh" class="compact-input" placeholder="Search vehicle types..." />
            <span id="veh-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">0</span>
          </div>
          <div class="split-pane-list-body" id="veh-list-items">
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.85rem;">
              Loading vehicle types...
            </div>
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="veh-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} VEHICLE TYPE RECORD
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.7rem;">New Record</span>
          </div>

          <form id="veh-form" class="paper-form-body">
            <input type="hidden" id="veh-id" value="" />

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Vehicle Type Name*</label>
                <input type="text" id="veh-type" class="compact-input" required placeholder="e.g. 10 Wheeler / 14 Wheeler / LCV" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Standard Capacity Weight (Qtl)</label>
                <input type="number" step="0.001" id="veh-std-wght" class="compact-input" placeholder="e.g. 250.000" />
              </div>
            </div>

            <div class="compact-group">
              <label class="compact-label">Approx Weight Display Text</label>
              <input type="text" id="veh-approx-text" class="compact-input" placeholder="e.g. 25 - 28 Metric Tons" />
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Min Weight Tolerance (Qtl)</label>
                <input type="number" step="0.001" id="veh-min-wght" class="compact-input" placeholder="e.g. 240.000" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Max Weight Tolerance (Qtl)</label>
                <input type="number" step="0.001" id="veh-max-wght" class="compact-input" placeholder="e.g. 290.000" />
              </div>
            </div>
          </form>

          <div class="paper-form-footer">
            <button type="button" id="btn-delete-veh" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} Delete
            </button>
            <button type="button" id="btn-reset-veh" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset Form
            </button>
            <button type="submit" form="veh-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} Save Vehicle (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let allVehicles = [];
  let selectedId = null;

  async function loadVehicles() {
    try {
      allVehicles = await api.get('/api/vehicles');
      renderList(allVehicles);
    } catch (err) {
      showToast(err.message || 'Failed to load vehicles', 'error');
    }
  }

  function renderList(list) {
    const listEl = document.getElementById('veh-list-items');
    document.getElementById('veh-count').textContent = list.length;

    if (list.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          No vehicle types found. Click "+ Add New Vehicle Type" to create.
        </div>
      `;
      return;
    }

    listEl.innerHTML = list.map(v => `
      <div class="split-pane-list-item ${selectedId === v.id ? 'selected' : ''}" data-id="${v.id}">
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
          <span>${escapeHtml(v.vehicleType)}</span>
          <span style="font-size: 0.7rem; font-weight: 600; color: var(--primary);">
            ${v.standardWeight ? escapeHtml(v.standardWeight) + ' Qtl' : ''}
          </span>
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground);">
          ${v.approxWeightText ? escapeHtml(v.approxWeightText) : 'No weight details'}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        selectVehicle(id);
      });
    });
  }

  function selectVehicle(id) {
    selectedId = id;
    const v = allVehicles.find(item => item.id === id);
    if (!v) return;

    document.getElementById('veh-id').value = v.id;
    document.getElementById('veh-type').value = v.vehicleType || '';
    document.getElementById('veh-std-wght').value = v.standardWeight || '';
    document.getElementById('veh-approx-text').value = v.approxWeightText || '';
    document.getElementById('veh-min-wght').value = v.minWeight || '';
    document.getElementById('veh-max-wght').value = v.maxWeight || '';

    document.getElementById('form-title').textContent = `📄 EDIT VEHICLE TYPE #${v.id}`;
    document.getElementById('form-status-badge').textContent = 'Editing';
    document.getElementById('btn-delete-veh').style.display = 'inline-block';

    renderList(allVehicles);
  }

  function resetForm() {
    selectedId = null;
    document.getElementById('veh-id').value = '';
    document.getElementById('veh-form').reset();
    document.getElementById('form-title').textContent = '📄 VEHICLE TYPE RECORD';
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-veh').style.display = 'none';
    renderList(allVehicles);
    document.getElementById('veh-type').focus();
  }

  document.getElementById('btn-add-veh').addEventListener('click', resetForm);
  document.getElementById('btn-reset-veh').addEventListener('click', resetForm);

  document.getElementById('search-veh').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allVehicles.filter(v => 
      (v.vehicleType && v.vehicleType.toLowerCase().includes(q)) ||
      (v.approxWeightText && v.approxWeightText.toLowerCase().includes(q))
    );
    renderList(filtered);
  });

  document.getElementById('veh-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('veh-id').value;
    const payload = {
      vehicleType: document.getElementById('veh-type').value.trim(),
      standardWeight: document.getElementById('veh-std-wght').value || null,
      approxWeightText: document.getElementById('veh-approx-text').value.trim() || null,
      minWeight: document.getElementById('veh-min-wght').value || null,
      maxWeight: document.getElementById('veh-max-wght').value || null,
    };

    try {
      if (id) {
        await api.put(`/api/vehicles/${id}`, payload);
        showToast('Vehicle type updated successfully', 'success');
      } else {
        await api.post('/api/vehicles', payload);
        showToast('New vehicle type added successfully', 'success');
      }
      resetForm();
      await loadVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to save vehicle type', 'error');
    }
  });

  document.getElementById('btn-delete-veh').addEventListener('click', async () => {
    if (!selectedId) return;
    if (!confirm('Are you sure you want to delete this vehicle type?')) return;

    try {
      await api.del(`/api/vehicles/${selectedId}`);
      showToast('Vehicle type deleted', 'success');
      resetForm();
      await loadVehicles();
    } catch (err) {
      showToast(err.message || 'Failed to delete vehicle type', 'error');
    }
  });

  await loadVehicles();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
