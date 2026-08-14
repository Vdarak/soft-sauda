/**
 * Bank Master View (Single-Viewport Compact Paper Form Design)
 * Left Pane: Searchable Bank List
 * Right Pane: Dense 100% Viewport Fit Paper Form
 */

import * as api from '../lib/api.js';
import { showToast, Icons } from '../components/ui.js';

export async function renderBankList() {
  const app = document.getElementById('app');

  // Single-viewport container layout
  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.bank} Bank Master Management
          </h2>
          <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">
            Manage bank accounts, IFSC codes, branches, and clearing centers for payments.
          </p>
        </div>
        <button id="btn-add-bank" class="primary" style="height: 30px; font-size: 0.8rem; padding: 0 0.75rem;">
          + Add New Bank
        </button>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-banks" class="compact-input" placeholder="Search banks or IFSC..." />
            <span id="bank-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">0</span>
          </div>
          <div class="split-pane-list-body" id="banks-list-items">
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.85rem;">
              Loading banks...
            </div>
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="bank-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} BANK MASTER RECORD
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.7rem;">New Record</span>
          </div>

          <form id="bank-form" class="paper-form-body">
            <input type="hidden" id="bank-id" value="" />

            <div class="compact-group">
              <label class="compact-label">Bank Name*</label>
              <input type="text" id="bank-name" class="compact-input" required placeholder="e.g. State Bank of India" />
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Branch Name</label>
                <input type="text" id="bank-branch" class="compact-input" placeholder="e.g. Main Branch, Nanded" />
              </div>
              <div class="compact-group">
                <label class="compact-label">IFSC Code</label>
                <input type="text" id="bank-ifsc" class="compact-input" placeholder="e.g. SBIN0001234" style="text-transform: uppercase;" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">MICR Code</label>
                <input type="text" id="bank-micr" class="compact-input" placeholder="e.g. 431002002" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Clearing Center / Location</label>
                <input type="text" id="bank-center" class="compact-input" placeholder="e.g. Nanded Clearing House" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Address Line 1</label>
                <input type="text" id="bank-address" class="compact-input" placeholder="Plot / Street / Area" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Address Line 2</label>
                <input type="text" id="bank-address1" class="compact-input" placeholder="Landmark / City" />
              </div>
            </div>

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Contact Person / Phone</label>
                <input type="text" id="bank-contact" class="compact-input" placeholder="Manager Name or Phone No." />
              </div>
              <div class="compact-group">
                <label class="compact-label">District Name</label>
                <input type="text" id="bank-district" class="compact-input" placeholder="e.g. Nanded" />
              </div>
            </div>
          </form>

          <div class="paper-form-footer">
            <button type="button" id="btn-delete-bank" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} Delete
            </button>
            <button type="button" id="btn-reset-bank" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset Form
            </button>
            <button type="submit" form="bank-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} Save Bank (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>`;

  // State & Fetch
  let allBanks = [];
  let selectedBankId = null;

  async function loadBanks() {
    try {
      allBanks = await api.get('/api/banks');
      renderList(allBanks);
    } catch (err) {
      showToast(err.message || 'Failed to load banks', 'error');
    }
  }

  function renderList(banks) {
    const listEl = document.getElementById('banks-list-items');
    document.getElementById('bank-count').textContent = banks.length;

    if (banks.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          No banks found. Click "+ Add New Bank" to create one.
        </div>
      `;
      return;
    }

    listEl.innerHTML = banks.map(b => `
      <div class="split-pane-list-item ${selectedBankId === b.id ? 'selected' : ''}" data-id="${b.id}">
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
          <span>${escapeHtml(b.bankName)}</span>
          <span style="font-size: 0.7rem; font-weight: 600; color: var(--primary);">${escapeHtml(b.ifscCode || '')}</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground);">
          ${escapeHtml(b.branch || 'Main Branch')} ${b.center ? '• ' + escapeHtml(b.center) : ''}
        </div>
      </div>
    `).join('');

    // Bind click events
    listEl.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        selectBank(id);
      });
    });
  }

  function selectBank(id) {
    selectedBankId = id;
    const bank = allBanks.find(b => b.id === id);
    if (!bank) return;

    document.getElementById('bank-id').value = bank.id;
    document.getElementById('bank-name').value = bank.bankName || '';
    document.getElementById('bank-branch').value = bank.branch || '';
    document.getElementById('bank-ifsc').value = bank.ifscCode || '';
    document.getElementById('bank-micr').value = bank.micrCode || '';
    document.getElementById('bank-center').value = bank.center || '';
    document.getElementById('bank-address').value = bank.address || '';
    document.getElementById('bank-address1').value = bank.address1 || '';
    document.getElementById('bank-contact').value = bank.contactPerson || '';
    document.getElementById('bank-district').value = bank.districtName || '';

    document.getElementById('form-title').innerHTML = `${Icons.fileText} EDIT BANK RECORD #${bank.id}`;
    document.getElementById('form-status-badge').textContent = 'Editing';
    document.getElementById('btn-delete-bank').style.display = 'inline-block';

    renderList(allBanks);
  }

  function resetForm() {
    selectedBankId = null;
    document.getElementById('bank-id').value = '';
    document.getElementById('bank-form').reset();
    document.getElementById('form-title').innerHTML = `${Icons.fileText} BANK MASTER RECORD`;
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-bank').style.display = 'none';
    renderList(allBanks);
    document.getElementById('bank-name').focus();
  }

  // Event Listeners
  document.getElementById('btn-add-bank').addEventListener('click', resetForm);
  document.getElementById('btn-reset-bank').addEventListener('click', resetForm);

  document.getElementById('search-banks').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allBanks.filter(b => 
      (b.bankName && b.bankName.toLowerCase().includes(q)) ||
      (b.ifscCode && b.ifscCode.toLowerCase().includes(q)) ||
      (b.branch && b.branch.toLowerCase().includes(q))
    );
    renderList(filtered);
  });

  document.getElementById('bank-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('bank-id').value;
    const payload = {
      bankName: document.getElementById('bank-name').value.trim(),
      branch: document.getElementById('bank-branch').value.trim() || null,
      ifscCode: document.getElementById('bank-ifsc').value.trim().toUpperCase() || null,
      micrCode: document.getElementById('bank-micr').value.trim() || null,
      center: document.getElementById('bank-center').value.trim() || null,
      address: document.getElementById('bank-address').value.trim() || null,
      address1: document.getElementById('bank-address1').value.trim() || null,
      contactPerson: document.getElementById('bank-contact').value.trim() || null,
      districtName: document.getElementById('bank-district').value.trim() || null,
    };

    try {
      if (id) {
        await api.put(`/api/banks/${id}`, payload);
        showToast('Bank details updated successfully', 'success');
      } else {
        await api.post('/api/banks', payload);
        showToast('New bank added successfully', 'success');
      }
      resetForm();
      await loadBanks();
    } catch (err) {
      showToast(err.message || 'Failed to save bank record', 'error');
    }
  });

  document.getElementById('btn-delete-bank').addEventListener('click', async () => {
    if (!selectedBankId) return;
    if (!confirm('Are you sure you want to delete this bank record?')) return;

    try {
      await api.del(`/api/banks/${selectedBankId}`);
      showToast('Bank record deleted', 'success');
      resetForm();
      await loadBanks();
    } catch (err) {
      showToast(err.message || 'Failed to delete bank record', 'error');
    }
  });

  // Initial load
  await loadBanks();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
