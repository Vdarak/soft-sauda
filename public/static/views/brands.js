/**
 * Brand Master View (Single-Viewport Compact Paper Form Design)
 * Left Pane: Searchable Brand List
 * Right Pane: Dense 100% Viewport Fit Paper Form
 */

import * as api from '../lib/api.js';
import { showToast, Icons, confirmDialog } from '../components/ui.js';

export async function renderBrandList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.tag} Brand Master Management
          </h2>
          <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">
            Manage commercial brands, registered trademarks, and trademark registration numbers.
          </p>
        </div>
        <button id="btn-add-brand" class="primary" style="height: 30px; font-size: 0.8rem; padding: 0 0.75rem;">
          + Add New Brand
        </button>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-brands" class="compact-input" placeholder="Search brands..." />
            <span id="brand-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">0</span>
          </div>
          <div class="split-pane-list-body" id="brand-list-items">
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.85rem;">
              Loading brands...
            </div>
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="brand-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} BRAND MASTER RECORD
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.7rem;">New Record</span>
          </div>

          <form id="brand-form" class="paper-form-body">
            <input type="hidden" id="brand-id" value="" />

            <div class="compact-group">
              <label class="compact-label">Brand Name*</label>
              <input type="text" id="brand-name" class="compact-input" required placeholder="e.g. Mahakosh / Gemini / Fortune" />
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Trademark Registered?</label>
                <div style="display: flex; gap: 1.25rem; padding: 0.35rem 0; align-items: center;">
                  <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; cursor: pointer; font-weight: 500;">
                    <input type="radio" name="brand-reg" value="true" style="accent-color: var(--primary); width: 15px; height: 15px;" /> Yes
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; cursor: pointer; font-weight: 500;">
                    <input type="radio" name="brand-reg" value="false" checked style="accent-color: var(--primary); width: 15px; height: 15px;" /> No
                  </label>
                </div>
              </div>
              <div class="compact-group">
                <label class="compact-label">Registration / Trademark No.</label>
                <input type="text" id="brand-regno" class="compact-input" placeholder="e.g. TM-4820192" />
              </div>
            </div>
          </form>

          <div class="paper-form-footer">
            <button type="button" id="btn-delete-brand" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} Delete
            </button>
            <button type="button" id="btn-reset-brand" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset Form
            </button>
            <button type="submit" form="brand-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} Save Brand (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let allBrands = [];
  let selectedId = null;

  async function loadBrands() {
    try {
      allBrands = await api.get('/api/brands');
      renderList(allBrands);
    } catch (err) {
      showToast(err.message || 'Failed to load brands', 'error');
    }
  }

  function renderList(list) {
    const listEl = document.getElementById('brand-list-items');
    document.getElementById('brand-count').textContent = list.length;

    if (list.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          No brands found. Click "+ Add New Brand" to create one.
        </div>
      `;
      return;
    }

    listEl.innerHTML = list.map(b => `
      <div class="split-pane-list-item ${selectedId === b.id ? 'selected' : ''}" data-id="${b.id}">
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
          <span>${escapeHtml(b.name)}</span>
          <span style="font-size: 0.7rem; font-weight: 600; color: ${b.isRegistered ? 'var(--primary)' : 'var(--muted-foreground)'};">
            ${b.isRegistered ? '® Registered' : 'Unregistered'}
          </span>
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground);">
          ${b.regNo ? 'Reg No: ' + escapeHtml(b.regNo) : 'No Reg No.'}
        </div>
      </div>
    `).join('');
  }

  // Event delegation on list container (zero per-item listeners)
  const listEl = document.getElementById('brand-list-items');
  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.split-pane-list-item');
    if (item) {
      const id = parseInt(item.getAttribute('data-id'), 10);
      selectBrand(id);
    }
  });

  function selectBrand(id) {
    selectedId = id;
    const b = allBrands.find(item => item.id === id);
    if (!b) return;

    // Toggle selected class in-place
    listEl.querySelectorAll('.split-pane-list-item').forEach(el => {
      if (parseInt(el.getAttribute('data-id'), 10) === id) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    document.getElementById('brand-id').value = b.id;
    document.getElementById('brand-name').value = b.name || '';
    // Set trademark registered radio
    const regVal = String(b.isRegistered || false);
    const radios = document.querySelectorAll('input[name="brand-reg"]');
    radios.forEach(r => r.checked = r.value === regVal);
    document.getElementById('brand-regno').value = b.regNo || '';

    document.getElementById('form-title').innerHTML = `${Icons.fileText} EDIT BRAND RECORD #${b.id}`;
    document.getElementById('form-status-badge').textContent = 'Editing';
    document.getElementById('btn-delete-brand').style.display = 'inline-block';
  }

  function resetForm() {
    selectedId = null;
    document.getElementById('brand-id').value = '';
    document.getElementById('brand-form').reset();
    // Reset radio to 'No'
    const radios = document.querySelectorAll('input[name="brand-reg"]');
    radios.forEach(r => r.checked = r.value === 'false');
    document.getElementById('form-title').innerHTML = `${Icons.fileText} BRAND MASTER RECORD`;
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-brand').style.display = 'none';

    // Remove selected class in-place
    listEl.querySelectorAll('.split-pane-list-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('brand-name').focus();
  }

  document.getElementById('btn-add-brand').addEventListener('click', resetForm);
  document.getElementById('btn-reset-brand').addEventListener('click', resetForm);

  document.getElementById('search-brands').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allBrands.filter(b => 
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.regNo && b.regNo.toLowerCase().includes(q))
    );
    renderList(filtered);
  });

  document.getElementById('brand-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('brand-id').value;
    const payload = {
      name: document.getElementById('brand-name').value.trim(),
      isRegistered: document.querySelector('input[name="brand-reg"]:checked')?.value === 'true',
      regNo: document.getElementById('brand-regno').value.trim() || null,
    };

    try {
      if (id) {
        await api.put(`/api/brands/${id}`, payload);
        showToast('Brand updated successfully', 'success');
      } else {
        await api.post('/api/brands', payload);
        showToast('New brand added successfully', 'success');
      }
      resetForm();
      await loadBrands();
    } catch (err) {
      showToast(err.message || 'Failed to save brand', 'error');
    }
  });

  document.getElementById('btn-delete-brand').addEventListener('click', async () => {
    if (!selectedId) return;
    if (!(await confirmDialog('Are you sure you want to delete this brand?'))) return;

    try {
      await api.del(`/api/brands/${selectedId}`);
      showToast('Brand record deleted', 'success');
      resetForm();
      await loadBrands();
    } catch (err) {
      showToast(err.message || 'Failed to delete brand', 'error');
    }
  });

  await loadBrands();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
