/**
 * Bank Master View (Single-Viewport Compact Paper Form Design)
 * Optimized for 49,000+ records using the reusable VirtualList component,
 * In-Memory Multi-Token Instant Search, and Single Event Delegation.
 */

import * as api from '../lib/api.js';
import { showToast, Icons, confirmDialog } from '../components/ui.js';
import { VirtualList } from '../components/virtual-list.js';

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
        <!-- LEFT PANE: Virtual Scrolled Searchable List -->
        <div class="split-pane-list" style="width: 320px; display: flex; flex-direction: column;">
          <div class="split-pane-list-header">
            <input type="text" id="search-banks" class="compact-input" placeholder="Search banks, branch or IFSC..." />
            <span id="bank-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">Loading...</span>
          </div>
          <div class="split-pane-list-body" id="banks-list-items" style="position: relative; overflow-y: auto; flex: 1;">
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

  // State
  let allBanks = [];
  let currentBanks = [];
  let selectedBankId = null;

  // Initialize reusable VirtualList component
  const listEl = document.getElementById('banks-list-items');
  const vl = new VirtualList({
    container: listEl,
    itemHeight: 48,
    buffer: 6,
    items: currentBanks,
    selectedId: selectedBankId,
    getItemId: b => b.id,
    renderItem: (b, isSelected) => `
      <div class="split-pane-list-item ${isSelected ? 'selected' : ''}" data-id="${b.id}" style="height: 48px; box-sizing: border-box; justify-content: center; padding: 0.25rem 0.5rem;">
        <div style="font-weight: 700; font-size: 0.825rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 0.5rem;">${escapeHtml(b.bankName)}</span>
          <span style="font-size: 0.675rem; font-weight: 600; color: var(--primary); flex-shrink: 0;">${escapeHtml(b.ifscCode || '')}</span>
        </div>
        <div style="font-size: 0.725rem; color: var(--muted-foreground); overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          ${escapeHtml(b.branch || 'Main Branch')} ${b.center ? '• ' + escapeHtml(b.center) : ''}
        </div>
      </div>
    `,
    onSelect: (id) => {
      selectBank(parseInt(id, 10));
    },
    emptyMessage: 'No banks found. Click "+ Add New Bank" to create one.'
  });

  // Fast in-place bank selection (no full DOM rebuild)
  async function selectBank(id) {
    selectedBankId = id;
    vl.setSelectedId(id);

    const bank = allBanks.find(b => b.id === id);
    if (!bank) return;

    // Populate form fields
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

    // If detail attributes (address, micr) were not in summary list, fetch on-demand
    if (bank.address === undefined && bank.id) {
      try {
        const full = await api.get(`/api/banks/${id}`);
        if (full && selectedBankId === id) {
          Object.assign(bank, full);
          document.getElementById('bank-micr').value = full.micrCode || '';
          document.getElementById('bank-address').value = full.address || '';
          document.getElementById('bank-address1').value = full.address1 || '';
          document.getElementById('bank-contact').value = full.contactPerson || '';
          document.getElementById('bank-district').value = full.districtName || '';
        }
      } catch (_) {}
    }
  }

  function resetForm() {
    selectedBankId = null;
    vl.setSelectedId(null);

    document.getElementById('bank-id').value = '';
    document.getElementById('bank-form').reset();
    document.getElementById('form-title').innerHTML = `${Icons.fileText} BANK MASTER RECORD`;
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-bank').style.display = 'none';

    document.getElementById('bank-name').focus();
  }

  // Load all banks with server cache
  async function loadBanks() {
    try {
      allBanks = await api.get('/api/banks?all=true');
      // Precompute lowercase search index for instant filtering (~10ms)
      allBanks.forEach(b => {
        b._search = `${b.bankName || ''} ${b.ifscCode || ''} ${b.branch || ''} ${b.center || ''}`.toLowerCase();
      });
      currentBanks = allBanks;
      document.getElementById('bank-count').textContent = allBanks.length.toLocaleString();
      vl.setItems(currentBanks);

      if (allBanks.length > 0 && !selectedBankId) {
        selectBank(allBanks[0].id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load banks', 'error');
    }
  }

  // Instant in-memory multi-token search
  const searchInput = document.getElementById('search-banks');
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      currentBanks = allBanks;
      document.getElementById('bank-count').textContent = allBanks.length.toLocaleString();
    } else {
      const tokens = q.split(/\s+/).filter(Boolean);
      currentBanks = allBanks.filter(b => {
        const searchStr = b._search || (b._search = `${b.bankName || ''} ${b.ifscCode || ''} ${b.branch || ''} ${b.center || ''}`.toLowerCase());
        return tokens.every(tok => searchStr.includes(tok));
      });
      document.getElementById('bank-count').textContent = `${currentBanks.length.toLocaleString()} of ${allBanks.length.toLocaleString()}`;
    }
    vl.setItems(currentBanks, true);
  });

  // Buttons
  document.getElementById('btn-add-bank').addEventListener('click', resetForm);
  document.getElementById('btn-reset-bank').addEventListener('click', resetForm);

  // Form submit handler (in-place array updates for instant UI feedback)
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
        const updated = await api.put(`/api/banks/${id}`, payload);
        const idx = allBanks.findIndex(b => String(b.id) === String(id));
        if (idx !== -1) {
          Object.assign(allBanks[idx], payload, updated);
          allBanks[idx]._search = `${allBanks[idx].bankName || ''} ${allBanks[idx].ifscCode || ''} ${allBanks[idx].branch || ''} ${allBanks[idx].center || ''}`.toLowerCase();
        }
        showToast('Bank details updated successfully', 'success');
        vl.setItems(currentBanks);
      } else {
        const created = await api.post('/api/banks', payload);
        const newBank = { ...payload, ...created };
        newBank._search = `${newBank.bankName || ''} ${newBank.ifscCode || ''} ${newBank.branch || ''} ${newBank.center || ''}`.toLowerCase();
        allBanks.unshift(newBank);
        selectedBankId = newBank.id;
        currentBanks = allBanks;
        document.getElementById('bank-count').textContent = allBanks.length.toLocaleString();
        vl.setItems(currentBanks, true);
        showToast('New bank added successfully', 'success');
      }
      if (selectedBankId) selectBank(selectedBankId);
    } catch (err) {
      showToast(err.message || 'Failed to save bank record', 'error');
    }
  });

  // Delete button
  document.getElementById('btn-delete-bank').addEventListener('click', async () => {
    if (!selectedBankId) return;
    if (!(await confirmDialog('Are you sure you want to delete this bank record?'))) return;

    try {
      await api.del(`/api/banks/${selectedBankId}`);
      showToast('Bank record deleted', 'success');
      allBanks = allBanks.filter(b => b.id !== selectedBankId);
      currentBanks = currentBanks.filter(b => b.id !== selectedBankId);
      document.getElementById('bank-count').textContent = allBanks.length.toLocaleString();
      resetForm();
      vl.setItems(currentBanks);
      if (allBanks.length > 0) selectBank(allBanks[0].id);
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
