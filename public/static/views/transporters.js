/**
 * Transporter Master View (Single-Viewport Compact Paper Form Design)
 * Left Pane: Searchable Transporter List
 * Right Pane: Dense 100% Viewport Fit Paper Form
 */

import * as api from '../lib/api.js';
import { showToast, Icons } from '../components/ui.js';

export async function renderTransporterList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.truck} Transporter Master Management
          </h2>
          <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">
            Manage transport companies, PAN details, mobile contacts, and dispatch addresses.
          </p>
        </div>
        <button id="btn-add-trpt" class="primary" style="height: 30px; font-size: 0.8rem; padding: 0 0.75rem;">
          + Add New Transporter
        </button>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-trpt" class="compact-input" placeholder="Search transporters or PAN..." />
            <span id="trpt-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">0</span>
          </div>
          <div class="split-pane-list-body" id="trpt-list-items">
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.85rem;">
              Loading transporters...
            </div>
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="trpt-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} TRANSPORTER MASTER RECORD
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.7rem;">New Record</span>
          </div>

          <form id="trpt-form" class="paper-form-body">
            <input type="hidden" id="trpt-id" value="" />

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Transporter Name*</label>
                <input type="text" id="trpt-name" class="compact-input" required placeholder="e.g. VRL Logistics Ltd" />
              </div>
              <div class="compact-group">
                <label class="compact-label">PAN Number</label>
                <input type="text" id="trpt-pan" class="compact-input" placeholder="e.g. ABCDE1234F" style="text-transform: uppercase;" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Address Line 1</label>
                <input type="text" id="trpt-add1" class="compact-input" placeholder="Plot / Building / Street" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Address Line 2</label>
                <input type="text" id="trpt-add2" class="compact-input" placeholder="Area / Landmark" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Pincode</label>
                <input type="text" id="trpt-pin" class="compact-input" placeholder="e.g. 431601" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Email Address</label>
                <input type="email" id="trpt-email" class="compact-input" placeholder="e.g. dispatch@vrl.com" />
              </div>
            </div>

            <div class="form-grid-3">
              <div class="compact-group">
                <label class="compact-label">Contact Person</label>
                <input type="text" id="trpt-contact" class="compact-input" placeholder="Manager Name" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Mobile Number</label>
                <input type="text" id="trpt-mobile" class="compact-input" placeholder="Primary Mobile" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Office Phone</label>
                <input type="text" id="trpt-pho" class="compact-input" placeholder="Office Phone" />
              </div>
            </div>
          </form>

          <div class="paper-form-footer">
            <button type="button" id="btn-delete-trpt" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} Delete
            </button>
            <button type="button" id="btn-reset-trpt" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset Form
            </button>
            <button type="submit" form="trpt-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} Save Transporter (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let allTransporters = [];
  let selectedId = null;

  async function loadTransporters() {
    try {
      allTransporters = await api.get('/api/transporters');
      renderList(allTransporters);
    } catch (err) {
      showToast(err.message || 'Failed to load transporters', 'error');
    }
  }

  function renderList(list) {
    const listEl = document.getElementById('trpt-list-items');
    document.getElementById('trpt-count').textContent = list.length;

    if (list.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          No transporters found. Click "+ Add New Transporter" to create.
        </div>
      `;
      return;
    }

    listEl.innerHTML = list.map(t => `
      <div class="split-pane-list-item ${selectedId === t.id ? 'selected' : ''}" data-id="${t.id}">
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
          <span>${escapeHtml(t.name)}</span>
          <span style="font-size: 0.7rem; font-weight: 600; color: var(--primary);">${escapeHtml(t.panNo || '')}</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground);">
          ${escapeHtml(t.contactPerson || '')} ${t.mobile ? '• Mobile: ' + escapeHtml(t.mobile) : ''}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        selectTransporter(id);
      });
    });
  }

  function selectTransporter(id) {
    selectedId = id;
    const t = allTransporters.find(item => item.id === id);
    if (!t) return;

    document.getElementById('trpt-id').value = t.id;
    document.getElementById('trpt-name').value = t.name || '';
    document.getElementById('trpt-pan').value = t.panNo || '';
    document.getElementById('trpt-add1').value = t.address1 || '';
    document.getElementById('trpt-add2').value = t.address2 || '';
    document.getElementById('trpt-pin').value = t.pincode || '';
    document.getElementById('trpt-email').value = t.email || '';
    document.getElementById('trpt-contact').value = t.contactPerson || '';
    document.getElementById('trpt-mobile').value = t.mobile || '';
    document.getElementById('trpt-pho').value = t.phoneOffice || '';

    document.getElementById('form-title').textContent = `📄 EDIT TRANSPORTER RECORD #${t.id}`;
    document.getElementById('form-status-badge').textContent = 'Editing';
    document.getElementById('btn-delete-trpt').style.display = 'inline-block';

    renderList(allTransporters);
  }

  function resetForm() {
    selectedId = null;
    document.getElementById('trpt-id').value = '';
    document.getElementById('trpt-form').reset();
    document.getElementById('form-title').textContent = '📄 TRANSPORTER MASTER RECORD';
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-trpt').style.display = 'none';
    renderList(allTransporters);
    document.getElementById('trpt-name').focus();
  }

  document.getElementById('btn-add-trpt').addEventListener('click', resetForm);
  document.getElementById('btn-reset-trpt').addEventListener('click', resetForm);

  document.getElementById('search-trpt').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allTransporters.filter(t => 
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.panNo && t.panNo.toLowerCase().includes(q)) ||
      (t.contactPerson && t.contactPerson.toLowerCase().includes(q))
    );
    renderList(filtered);
  });

  document.getElementById('trpt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('trpt-id').value;
    const payload = {
      name: document.getElementById('trpt-name').value.trim(),
      panNo: document.getElementById('trpt-pan').value.trim().toUpperCase() || null,
      address1: document.getElementById('trpt-add1').value.trim() || null,
      address2: document.getElementById('trpt-add2').value.trim() || null,
      pincode: document.getElementById('trpt-pin').value.trim() || null,
      email: document.getElementById('trpt-email').value.trim() || null,
      contactPerson: document.getElementById('trpt-contact').value.trim() || null,
      mobile: document.getElementById('trpt-mobile').value.trim() || null,
      phoneOffice: document.getElementById('trpt-pho').value.trim() || null,
    };

    try {
      if (id) {
        await api.put(`/api/transporters/${id}`, payload);
        showToast('Transporter updated successfully', 'success');
      } else {
        await api.post('/api/transporters', payload);
        showToast('New transporter added successfully', 'success');
      }
      resetForm();
      await loadTransporters();
    } catch (err) {
      showToast(err.message || 'Failed to save transporter', 'error');
    }
  });

  document.getElementById('btn-delete-trpt').addEventListener('click', async () => {
    if (!selectedId) return;
    if (!confirm('Are you sure you want to delete this transporter?')) return;

    try {
      await api.del(`/api/transporters/${selectedId}`);
      showToast('Transporter record deleted', 'success');
      resetForm();
      await loadTransporters();
    } catch (err) {
      showToast(err.message || 'Failed to delete transporter', 'error');
    }
  });

  await loadTransporters();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
