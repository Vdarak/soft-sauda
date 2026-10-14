/**
 * Party Master View (Single-Viewport Compact Paper Form Design)
 * Optimized for 5,600+ records using 60 FPS Virtual Scrolling,
 * In-Memory Multi-Token Instant Search, and Single Event Delegation.
 */

import { Icons, Spinner, showToast, escapeHtml, AuditMetadataBlock, confirmDialog } from '../components/ui.js';
import { VirtualList } from '../components/virtual-list.js';
import * as api from '../lib/api.js';
import { attachCityAutocomp, attachBankAutocomp } from '../lib/autocomplete.js';

let vl = null;
let allParties = [];
let currentParties = [];
let selectedPartyId = null;
let currentTab = 'general';

export async function renderPartyList(ctx, initialSelectId = null) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    allParties = await api.get('/parties');
    // Precompute lowercase search index for instant filtering (~2ms)
    allParties.forEach(p => {
      p._search = `${p.name || ''} ${p.place || ''} ${p.phone || ''} ${p.mobile || ''} ${p.smsMobile || ''} ${p.designation || ''}`.toLowerCase();
    });
    currentParties = allParties;

    const defaultId = initialSelectId || (allParties.length > 0 ? allParties[0].id : null);
    mountPartyView(defaultId);
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load parties'}</div>`;
  }
}

export async function renderPartyForm(id = null, preloadedList = null) {
  if (document.getElementById('parties-list-items') && vl) {
    if (id === 'new' || !id) {
      resetPartyForm();
    } else {
      selectParty(id);
      vl.scrollToId(id);
    }
    return;
  }

  if (preloadedList && preloadedList.length > 0) {
    allParties = preloadedList;
    allParties.forEach(p => {
      p._search = `${p.name || ''} ${p.place || ''} ${p.phone || ''} ${p.mobile || ''} ${p.smsMobile || ''} ${p.designation || ''}`.toLowerCase();
    });
    currentParties = allParties;
    mountPartyView(id || (allParties.length > 0 ? allParties[0].id : null));
  } else {
    renderPartyList(null, id);
  }
}

function mountPartyView(initialId) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
        <div>
          <h2 style="font-size: 1.05rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.users} Party Master
          </h2>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <span class="badge" id="party-mode-badge" style="font-size: 0.7rem;">ALTER PARTY</span>
          <button id="btn-export-parties" class="secondary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            ${Icons.download} Export
          </button>
          <button id="btn-new-party" class="primary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            + New Party
          </button>
        </div>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Virtual Scrolled Party List -->
        <div class="split-pane-list" style="width: 280px; display: flex; flex-direction: column;">
          <div class="split-pane-list-header">
            <input type="text" id="search-parties" class="compact-input" placeholder="Search party, place, phone..." />
            <span id="party-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">
              ${allParties.length.toLocaleString()}
            </span>
          </div>
          <div class="split-pane-list-body" id="parties-list-items" style="flex: 1; position: relative; overflow-y: auto;">
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form Layout -->
        <div class="split-pane-form" id="party-form-pane">
          <form id="party-form" class="paper-form-body" style="gap: 0.35rem;">
            <input type="hidden" id="party-id" value="" />

            <!-- PARTY TYPE CHECKBOXES -->
            <div style="background: var(--muted); padding: 0.35rem 0.6rem; border-radius: 4px; border: 1px solid var(--border); display: flex; align-items: center; gap: 1.25rem;">
              <span class="compact-label" style="font-weight: 700; color: var(--foreground); margin: 0;">Party Type:</span>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_BUYER" value="BUYER" checked /> Buyer
              </label>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_SELLER" value="SELLER" checked /> Seller
              </label>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_BUYER_BROKER" value="BUYER_BROKER" /> Buyer Broker
              </label>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_SELLER_BROKER" value="SELLER_BROKER" /> Seller Broker
              </label>
            </div>

            <!-- INTERACTIVE TABS BAR -->
            <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
              <div style="display: flex; gap: 0.4rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; margin-bottom: 0.35rem;">
                <button type="button" id="tab-general" class="party-tab-btn primary" style="height: 24px; font-size: 0.725rem; padding: 0 0.6rem;">General Info</button>
                <button type="button" id="tab-delivery" class="party-tab-btn secondary" style="height: 24px; font-size: 0.725rem; padding: 0 0.6rem;">Delivery Address</button>
                <button type="button" id="tab-bank" class="party-tab-btn secondary" style="height: 24px; font-size: 0.725rem; padding: 0 0.6rem;">Bank & Other Details</button>
              </div>

              <!-- TAB 1: GENERAL INFO PANEL -->
              <div id="panel-general" class="party-tab-panel" style="display: block;">
                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Party Name*</label>
                    <input type="text" id="name" class="compact-input" required placeholder="e.g. A MADHAVAN NADAR" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Address</label>
                    <input type="text" id="address" class="compact-input" placeholder="e.g. A-87 MARKET YARD" />
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Land Mark</label>
                    <input type="text" id="landMark" class="compact-input" placeholder="Near Market Yard" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Place (City)* / Pincode</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="place" class="compact-input" required placeholder="e.g. Latur" style="flex: 1;" />
                      <input type="text" id="pincode" class="compact-input" placeholder="413512" style="width: 80px;" />
                    </div>
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">State Name / CST NO</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="stateName" class="compact-input" value="Maharashtra" style="flex: 1;" />
                      <input type="text" id="cstNo" class="compact-input" placeholder="CST No" style="width: 100px;" />
                    </div>
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">GSTIN / Credit Limit</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="gstin" class="compact-input" placeholder="27ABCDE1234F1Z5" style="flex: 1;" />
                      <input type="number" id="creditLimit" class="compact-input" value="0" placeholder="0" style="width: 80px;" />
                    </div>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="compact-group">
                    <label class="compact-label">Phone (Office) / Mobile (SMS)</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="phone" class="compact-input" placeholder="Office phone" style="flex: 1;" />
                      <input type="text" id="mobile" class="compact-input" placeholder="Primary Mobile" style="flex: 1;" />
                    </div>
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Vat TIN / CST TIN</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="vatTin" class="compact-input" placeholder="VAT TIN" style="flex: 1;" />
                      <input type="text" id="cstTin" class="compact-input" placeholder="CST TIN" style="flex: 1;" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 2: DELIVERY ADDRESS PANEL -->
              <div id="panel-delivery" class="party-tab-panel" style="display: none;">
                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Delivery Address Line 1</label>
                    <input type="text" id="delivAddressLine" class="compact-input" placeholder="Godown / Factory Address" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Delivery City</label>
                    <input type="text" id="delivCity" class="compact-input" placeholder="City name" />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="compact-group">
                    <label class="compact-label">Delivery State</label>
                    <input type="text" id="delivState" class="compact-input" placeholder="State" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Pincode</label>
                    <input type="text" id="delivPincode" class="compact-input" placeholder="Pincode" />
                  </div>
                </div>

                <div id="additional-deliv-container" style="margin-top: 0.4rem; padding-top: 0.3rem; border-top: 1px dashed var(--border); display: none;">
                  <span class="compact-label" id="additional-deliv-label" style="font-weight: 600; font-size: 0.65rem; color: var(--muted-foreground);">Additional Delivery Addresses:</span>
                  <div id="additional-deliv-list" style="display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.2rem;"></div>
                </div>
              </div>

              <!-- TAB 3: BANK & OTHER DETAILS PANEL -->
              <div id="panel-bank" class="party-tab-panel" style="display: none;">
                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Bank Name</label>
                    <input type="text" id="bankName" class="compact-input" placeholder="e.g. State Bank of India" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Account Number</label>
                    <input type="text" id="accountNo" class="compact-input" placeholder="Account No" />
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="compact-group">
                    <label class="compact-label">IFSC Code</label>
                    <input type="text" id="ifscCode" class="compact-input" placeholder="SBIN0001234" style="text-transform: uppercase;" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Branch Name</label>
                    <input type="text" id="branch" class="compact-input" placeholder="Branch location" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">PAN Number</label>
                    <input type="text" id="panNo" class="compact-input" placeholder="ABCDE1234F" style="text-transform: uppercase;" />
                  </div>
                </div>

                <div id="additional-bank-container" style="margin-top: 0.4rem; padding-top: 0.3rem; border-top: 1px dashed var(--border); display: none;">
                  <span class="compact-label" id="additional-bank-label" style="font-weight: 600; font-size: 0.65rem; color: var(--muted-foreground);">Additional Bank Accounts:</span>
                  <div id="additional-bank-list" style="display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.2rem;"></div>
                </div>
              </div>
            </div>

            <!-- CONTACT PERSONS (SMS & EMAILS) LIST -->
            <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
              <span class="compact-label" style="font-weight: 700; color: var(--foreground); margin-bottom: 0.25rem;">Contact Persons (SMS & Emails)</span>
              ${[1, 2, 3, 4].map(idx => `
                <div class="form-grid-3" style="margin-bottom: 0.2rem;">
                  <input type="text" class="compact-input contact-name" data-idx="${idx}" placeholder="${idx}. Contact Name" />
                  <input type="text" class="compact-input contact-phone" data-idx="${idx}" placeholder="Mobile No" />
                  <input type="email" class="compact-input contact-email" data-idx="${idx}" placeholder="Email ID" />
                </div>
              `).join('')}
            </div>

            <div id="party-audit-container"></div>
          </form>

          <!-- FOOTER TOOLBAR -->
          <div class="paper-form-footer">
            <button type="button" id="btn-delete-party" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} F5 - Delete
            </button>
            <button type="button" id="btn-reset-party" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset
            </button>
            <button type="submit" form="party-form" id="btn-save-party" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} F3 - Alter Party
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Tab switching logic
  attachTabs();

  // Attach City Autocomplete
  attachCityAutocomp('place');

  // Attach Bank Name Autocomplete with auto-fill for IFSC and Branch
  attachBankAutocomp('bankName', (name, bank) => {
    if (bank) {
      const ifscEl = document.getElementById('ifscCode');
      const branchEl = document.getElementById('branch');
      if (ifscEl && bank.ifscCode) ifscEl.value = bank.ifscCode;
      if (branchEl && bank.branch) branchEl.value = bank.branch;
    }
  });

  // Initialize VirtualList
  const container = document.getElementById('parties-list-items');
  vl = new VirtualList({
    container,
    itemHeight: 48,
    buffer: 6,
    items: currentParties,
    selectedId: initialId,
    getItemId: p => p.id,
    renderItem: (p, isSelected) => `
      <div class="split-pane-list-item ${isSelected ? 'selected' : ''}" data-id="${p.id}" style="height: 48px; box-sizing: border-box; justify-content: center; padding: 0.25rem 0.5rem;">
        <div style="font-weight: 700; font-size: 0.8rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 0.5rem;">${escapeHtml(p.name)}</span>
          <span style="font-size: 0.675rem; color: var(--primary); flex-shrink: 0;">${escapeHtml(p.place || '')}</span>
        </div>
        <div style="font-size: 0.7rem; color: var(--muted-foreground); overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          ${escapeHtml(p.designation || 'Trader')} ${p.phone ? '• ' + escapeHtml(p.phone) : ''}
        </div>
      </div>
    `,
    onSelect: (id) => {
      selectParty(parseInt(id, 10));
    },
    emptyMessage: 'No parties found. Click "+ New Party" to create one.'
  });

  // Instant in-memory search
  const searchInput = document.getElementById('search-parties');
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      currentParties = allParties;
      document.getElementById('party-count').textContent = allParties.length.toLocaleString();
    } else {
      const tokens = q.split(/\s+/).filter(Boolean);
      currentParties = allParties.filter(p => {
        const str = p._search || (p._search = `${p.name || ''} ${p.place || ''} ${p.phone || ''} ${p.mobile || ''} ${p.smsMobile || ''} ${p.designation || ''}`.toLowerCase());
        return tokens.every(tok => str.includes(tok));
      });
      document.getElementById('party-count').textContent = `${currentParties.length.toLocaleString()} of ${allParties.length.toLocaleString()}`;
    }
    vl.setItems(currentParties, true);
  });

  // Top Buttons
  document.getElementById('btn-new-party').addEventListener('click', resetPartyForm);
  document.getElementById('btn-reset-party').addEventListener('click', resetPartyForm);
  document.getElementById('btn-export-parties').addEventListener('click', exportPartiesCSV);

  // Form submit & delete
  attachFormActions();

  // Load initial party
  if (initialId && initialId !== 'new') {
    selectParty(parseInt(initialId, 10));
    vl.scrollToId(initialId);
  } else {
    resetPartyForm();
  }
}

function attachTabs() {
  const tabGeneral = document.getElementById('tab-general');
  const tabDelivery = document.getElementById('tab-delivery');
  const tabBank = document.getElementById('tab-bank');

  const panelGeneral = document.getElementById('panel-general');
  const panelDelivery = document.getElementById('panel-delivery');
  const panelBank = document.getElementById('panel-bank');

  const switchTab = (tabName) => {
    currentTab = tabName;
    const btnMap = { general: tabGeneral, delivery: tabDelivery, bank: tabBank };
    const pnlMap = { general: panelGeneral, delivery: panelDelivery, bank: panelBank };

    [tabGeneral, tabDelivery, tabBank].forEach(btn => {
      btn?.classList.remove('primary');
      btn?.classList.add('secondary');
    });
    btnMap[tabName]?.classList.remove('secondary');
    btnMap[tabName]?.classList.add('primary');

    [panelGeneral, panelDelivery, panelBank].forEach(panel => {
      if (panel) panel.style.display = 'none';
    });
    if (pnlMap[tabName]) pnlMap[tabName].style.display = 'block';
  };

  tabGeneral?.addEventListener('click', () => switchTab('general'));
  tabDelivery?.addEventListener('click', () => switchTab('delivery'));
  tabBank?.addEventListener('click', () => switchTab('bank'));
}

async function selectParty(id) {
  selectedPartyId = id;
  vl.setSelectedId(id);

  let p = allParties.find(item => item.id === id);
  if (!p) return;

  // If detailed attributes (e.g. taxIds, bankDetails, deliveryAddresses) missing, fetch on demand
  if (!p.taxIds || !p.deliveryAddresses) {
    try {
      const full = await api.get(`/api/parties/${id}`);
      if (full && selectedPartyId === id) {
        Object.assign(p, full);
      }
    } catch (_) {}
  }

  loadPartyIntoForm(p, true);
}

function loadPartyIntoForm(party, isEdit) {
  document.getElementById('party-id').value = party.id || '';
  document.getElementById('party-mode-badge').textContent = isEdit ? 'ALTER PARTY' : 'ADD PARTY';
  document.getElementById('btn-save-party').innerHTML = `${Icons.save} ${isEdit ? 'F3 - Alter Party' : 'F2 - Add Party'}`;
  document.getElementById('btn-delete-party').style.display = isEdit ? 'inline-block' : 'none';

  // Active roles
  const activeRoles = party.roles?.map(r => r.role || r) || ['BUYER', 'SELLER'];
  ['BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER'].forEach(r => {
    const cb = document.querySelector(`input[name="role_${r}"]`);
    if (cb) cb.checked = activeRoles.includes(r);
  });

  // General fields
  document.getElementById('name').value = party.name || '';
  document.getElementById('address').value = party.address || '';
  document.getElementById('landMark').value = party.landmark || party.landMark || '';
  document.getElementById('place').value = party.place || '';
  document.getElementById('pincode').value = party.pinCode || party.pincode || '';
  document.getElementById('stateName').value = party.stateName || party.state_name || 'Maharashtra';
  document.getElementById('creditLimit').value = party.creditLimit || party.credit_limit || '0';
  document.getElementById('phone').value = party.phone || '';
  document.getElementById('mobile').value = party.smsMobile || party.sms_mobile || party.mobile || '';

  // Tax IDs
  const gstin = party.taxIds?.find(t => t.taxType === 'GSTIN')?.taxValue || '';
  const vatTin = party.taxIds?.find(t => t.taxType === 'VAT_TIN')?.taxValue || '';
  const cstTin = party.taxIds?.find(t => t.taxType === 'CST_TIN')?.taxValue || '';
  const cstNo = party.taxIds?.find(t => t.taxType === 'CST_NO')?.taxValue || '';
  const panNo = party.taxIds?.find(t => t.taxType === 'PAN')?.taxValue
    || (gstin && gstin.trim().length === 15 ? gstin.trim().slice(2, 12) : '')
    || party.pan || party.panNo || '';

  document.getElementById('gstin').value = gstin;
  document.getElementById('vatTin').value = vatTin;
  document.getElementById('cstTin').value = cstTin;
  document.getElementById('cstNo').value = cstNo;

  // Delivery Address
  const primaryDeliv = party.deliveryAddresses?.[0] || {};
  document.getElementById('delivAddressLine').value = primaryDeliv.addressLine || primaryDeliv.address_line || party.address || '';
  document.getElementById('delivCity').value = primaryDeliv.city || party.place || '';
  document.getElementById('delivState').value = primaryDeliv.state || party.stateName || 'Maharashtra';
  document.getElementById('delivPincode').value = primaryDeliv.pincode || primaryDeliv.pin_code || party.pinCode || '';

  const addDelivContainer = document.getElementById('additional-deliv-container');
  const addDelivList = document.getElementById('additional-deliv-list');
  if (party.deliveryAddresses && party.deliveryAddresses.length > 1) {
    addDelivContainer.style.display = 'block';
    document.getElementById('additional-deliv-label').textContent = `Additional Delivery Addresses (${party.deliveryAddresses.length - 1}):`;
    addDelivList.innerHTML = party.deliveryAddresses.slice(1).map(a => `
      <div style="font-size: 0.7rem; background: var(--card); padding: 0.2rem 0.4rem; border-radius: 3px; border: 1px solid var(--border); display: flex; gap: 0.5rem; justify-content: space-between;">
        <span>${escapeHtml(a.addressLine || a.address_line || '')}</span>
        <span>${escapeHtml([a.city, a.state, a.pincode || a.pin_code].filter(Boolean).join(', '))}</span>
      </div>
    `).join('');
  } else {
    addDelivContainer.style.display = 'none';
    addDelivList.innerHTML = '';
  }

  // Bank Details
  const primaryBank = party.bankDetails?.[0] || {};
  document.getElementById('bankName').value = primaryBank.bankName || primaryBank.bank_name || '';
  document.getElementById('accountNo').value = primaryBank.accountNo || primaryBank.account_no || '';
  document.getElementById('ifscCode').value = primaryBank.ifscCode || primaryBank.ifsc_code || '';
  document.getElementById('branch').value = primaryBank.branch || '';
  document.getElementById('panNo').value = panNo;

  const addBankContainer = document.getElementById('additional-bank-container');
  const addBankList = document.getElementById('additional-bank-list');
  if (party.bankDetails && party.bankDetails.length > 1) {
    addBankContainer.style.display = 'block';
    document.getElementById('additional-bank-label').textContent = `Additional Bank Accounts (${party.bankDetails.length - 1}):`;
    addBankList.innerHTML = party.bankDetails.slice(1).map(b => `
      <div style="font-size: 0.7rem; background: var(--card); padding: 0.2rem 0.4rem; border-radius: 3px; border: 1px solid var(--border); display: flex; gap: 0.5rem; justify-content: space-between;">
        <span><strong>${escapeHtml(b.bankName || b.bank_name || 'Bank')}</strong> ${b.branch ? `(${escapeHtml(b.branch)})` : ''}</span>
        <span>A/C: <code>${escapeHtml(b.accountNo || b.account_no || '-')}</code></span>
        <span>IFSC: <code>${escapeHtml(b.ifscCode || b.ifsc_code || '-')}</code></span>
      </div>
    `).join('');
  } else {
    addBankContainer.style.display = 'none';
    addBankList.innerHTML = '';
  }

  // Contact Persons (1-4)
  [1, 2, 3, 4].forEach(idx => {
    const c = party.contacts?.[idx - 1] || {};
    const nameEl = document.querySelector(`.contact-name[data-idx="${idx}"]`);
    const phoneEl = document.querySelector(`.contact-phone[data-idx="${idx}"]`);
    const emailEl = document.querySelector(`.contact-email[data-idx="${idx}"]`);
    if (nameEl) nameEl.value = c.contactName || c.contact_name || c.name || '';
    if (phoneEl) phoneEl.value = c.contactNumber || c.contact_number || c.phone || '';
    if (emailEl) emailEl.value = c.emailId || c.email_id || c.email || '';
  });

  // Audit block
  const auditContainer = document.getElementById('party-audit-container');
  if (isEdit && party.createdAt) {
    auditContainer.innerHTML = AuditMetadataBlock(party);
  } else {
    auditContainer.innerHTML = '';
  }
}

function resetPartyForm() {
  selectedPartyId = null;
  vl.setSelectedId(null);

  document.getElementById('party-id').value = '';
  document.getElementById('party-form').reset();
  document.getElementById('party-mode-badge').textContent = 'ADD PARTY';
  document.getElementById('btn-save-party').innerHTML = `${Icons.save} F2 - Add Party`;
  document.getElementById('btn-delete-party').style.display = 'none';

  // Defaults
  const buyerCb = document.querySelector('input[name="role_BUYER"]');
  const sellerCb = document.querySelector('input[name="role_SELLER"]');
  if (buyerCb) buyerCb.checked = true;
  if (sellerCb) sellerCb.checked = true;
  document.getElementById('stateName').value = 'Maharashtra';
  document.getElementById('creditLimit').value = '0';

  document.getElementById('additional-deliv-container').style.display = 'none';
  document.getElementById('additional-deliv-list').innerHTML = '';
  document.getElementById('additional-bank-container').style.display = 'none';
  document.getElementById('additional-bank-list').innerHTML = '';
  document.getElementById('party-audit-container').innerHTML = '';

  document.getElementById('name').focus();
}

function attachFormActions() {
  // Delete handler
  document.getElementById('btn-delete-party').addEventListener('click', async () => {
    if (!selectedPartyId) return;
    const current = allParties.find(p => p.id === selectedPartyId);
    const partyName = current?.name || `#${selectedPartyId}`;

    if (!(await confirmDialog(`Are you sure you want to delete Party profile ${partyName}?`))) return;

    try {
      await api.del(`/api/parties/${selectedPartyId}`);
      showToast('Party profile deleted', 'success');
      allParties = allParties.filter(p => p.id !== selectedPartyId);
      currentParties = currentParties.filter(p => p.id !== selectedPartyId);
      document.getElementById('party-count').textContent = allParties.length.toLocaleString();
      vl.setItems(currentParties);
      if (allParties.length > 0) {
        selectParty(allParties[0].id);
      } else {
        resetPartyForm();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete party', 'error');
    }
  });

  // Submit handler
  document.getElementById('party-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('party-id').value;
    const isEdit = !!id;

    const roles = [];
    ['BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER'].forEach(r => {
      const cb = document.querySelector(`input[name="role_${r}"]`);
      if (cb && cb.checked) roles.push(r);
    });

    const contacts = [];
    [1, 2, 3, 4].forEach(idx => {
      const name = document.querySelector(`.contact-name[data-idx="${idx}"]`)?.value.trim();
      const phone = document.querySelector(`.contact-phone[data-idx="${idx}"]`)?.value.trim();
      const email = document.querySelector(`.contact-email[data-idx="${idx}"]`)?.value.trim();
      if (name || phone || email) {
        contacts.push({
          contactName: name || 'Contact Person',
          contactNumber: phone || '-',
          emailId: email || null,
          name,
          phone,
          email
        });
      }
    });

    const delivAddressLine = document.getElementById('delivAddressLine')?.value.trim();
    const delivCity = document.getElementById('delivCity')?.value.trim();
    const delivState = document.getElementById('delivState')?.value.trim();
    const delivPincode = document.getElementById('delivPincode')?.value.trim();

    const existingParty = isEdit ? allParties.find(p => String(p.id) === String(id)) : null;

    const deliveryAddresses = delivAddressLine ? [{
      addressLine: delivAddressLine,
      city: delivCity || null,
      state: delivState || null,
      pincode: delivPincode || null,
    }, ...(existingParty?.deliveryAddresses?.slice(1) || [])] : (existingParty?.deliveryAddresses || []);

    const bankName = document.getElementById('bankName')?.value.trim();
    const accountNo = document.getElementById('accountNo')?.value.trim();
    const ifscCode = document.getElementById('ifscCode')?.value.trim().toUpperCase();
    const branch = document.getElementById('branch')?.value.trim();

    const primaryBank = (bankName || accountNo || ifscCode) ? [{
      bankName: bankName || 'Bank',
      accountNo: accountNo || '-',
      ifscCode: ifscCode || null,
      branch: branch || null,
    }] : [];

    const bankDetailsPayload = [
      ...primaryBank,
      ...(existingParty?.bankDetails?.slice(1) || [])
    ];

    const panVal = document.getElementById('panNo')?.value.trim().toUpperCase();

    const taxIds = [
      { taxType: 'GSTIN', taxValue: document.getElementById('gstin').value.trim().toUpperCase() },
      { taxType: 'VAT_TIN', taxValue: document.getElementById('vatTin').value.trim() },
      { taxType: 'CST_TIN', taxValue: document.getElementById('cstTin').value.trim() },
      { taxType: 'CST_NO', taxValue: document.getElementById('cstNo').value.trim() },
    ];
    if (panVal) taxIds.push({ taxType: 'PAN', taxValue: panVal });

    const payload = {
      name: document.getElementById('name').value.trim(),
      address: document.getElementById('address').value.trim() || null,
      landMark: document.getElementById('landMark').value.trim() || null,
      place: document.getElementById('place').value.trim(),
      pincode: document.getElementById('pincode').value.trim() || null,
      stateName: document.getElementById('stateName').value.trim() || null,
      phone: document.getElementById('phone').value.trim() || null,
      mobile: document.getElementById('mobile').value.trim() || null,
      creditLimit: document.getElementById('creditLimit').value || '0',
      roles,
      taxIds: taxIds.filter(t => t.taxValue !== ''),
      contacts,
      deliveryAddresses,
      bankDetails: bankDetailsPayload,
    };

    try {
      if (isEdit) {
        const updated = await api.put(`/api/parties/${id}`, payload);
        const idx = allParties.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) {
          Object.assign(allParties[idx], payload, updated);
          allParties[idx]._search = `${allParties[idx].name || ''} ${allParties[idx].place || ''} ${allParties[idx].phone || ''} ${allParties[idx].mobile || ''} ${allParties[idx].smsMobile || ''} ${allParties[idx].designation || ''}`.toLowerCase();
        }
        showToast('Party profile updated successfully', 'success');
        vl.setItems(currentParties);
        selectParty(parseInt(id, 10));
      } else {
        const created = await api.post('/api/parties', payload);
        const newParty = { ...payload, ...created };
        newParty._search = `${newParty.name || ''} ${newParty.place || ''} ${newParty.phone || ''} ${newParty.mobile || ''} ${newParty.smsMobile || ''} ${newParty.designation || ''}`.toLowerCase();
        allParties.unshift(newParty);
        currentParties = allParties;
        document.getElementById('party-count').textContent = allParties.length.toLocaleString();
        vl.setItems(currentParties, true);
        selectParty(newParty.id);
        showToast('New party created successfully', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to save party profile', 'error');
    }
  });
}

function exportPartiesCSV() {
  if (allParties.length === 0) {
    showToast('No parties to export', 'error');
    return;
  }
  const headers = ['ID', 'Name', 'Place', 'State', 'Phone', 'Mobile', 'GSTIN', 'Credit Limit'];
  const rows = allParties.map(p => {
    const gstin = p.taxIds?.find(t => t.taxType === 'GSTIN')?.taxValue || '';
    return [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.place || '').replace(/"/g, '""')}"`,
      `"${(p.stateName || '').replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      `"${p.mobile || p.smsMobile || ''}"`,
      `"${gstin}"`,
      p.creditLimit || '0'
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `parties_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
