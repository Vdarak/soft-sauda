/**
 * Party Master View (Parity with Legacy ERP Screenshot 2)
 * Single-Viewport Compact Paper Form Design with Interactive Tabs
 */
import { Icons, Badge, Spinner, showToast, escapeHtml, AuditMetadataBlock } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachCityAutocomp } from '../lib/autocomplete.js';

export async function renderPartyList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const allParties = await api.get('/parties');
    renderPartyForm(null, allParties);
  } catch (err) {
    app.innerHTML = `<div class="alert danger">${err.message || 'Failed to load parties'}</div>`;
  }
}

export async function renderPartyForm(id = null, preloadedList = null) {
  const app = document.getElementById('app');
  const isEdit = !!id;

  let allParties = preloadedList || [];
  if (allParties.length === 0) {
    try {
      allParties = await api.get('/parties');
    } catch (e) {
      console.warn('Failed to load parties list', e);
    }
  }

  let party = {};
  if (isEdit) {
    try {
      party = await api.get(`/parties/${id}`);
    } catch (err) {
      showToast(err.message || 'Failed to load party record', 'error');
    }
  }

  const gstin = party.taxIds?.find(t => t.taxType === 'GSTIN')?.taxValue || '';
  const vatTin = party.taxIds?.find(t => t.taxType === 'VAT_TIN')?.taxValue || '';
  const cstTin = party.taxIds?.find(t => t.taxType === 'CST_TIN')?.taxValue || '';
  const cstNo = party.taxIds?.find(t => t.taxType === 'CST_NO')?.taxValue || '';
  const panNo = party.taxIds?.find(t => t.taxType === 'PAN')?.taxValue || '';

  const bankDetails = party.bankDetails?.[0] || {};
  const delivAddr = party.deliveryAddresses?.[0] || {};

  const activeRoles = party.roles?.map(r => r.role) || ['BUYER', 'SELLER'];

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
        <div>
          <h2 style="font-size: 1.05rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            ${Icons.users} Party Master
          </h2>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <span class="badge" style="font-size: 0.7rem;">${isEdit ? 'ALTER PARTY' : 'ADD PARTY'}</span>
          <button id="btn-export-parties" class="secondary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            ${Icons.download} Export
          </button>
          <button id="btn-new-party" class="primary" style="height: 26px; font-size: 0.75rem; padding: 0 0.5rem;">
            + New Party
          </button>
        </div>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable Party List (Matching Screenshot 2) -->
        <div class="split-pane-list" style="width: 280px;">
          <div class="split-pane-list-header">
            <input type="text" id="search-parties" class="compact-input" placeholder="Select Account To Alter..." />
            <span id="party-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">${allParties.length}</span>
          </div>
          <div class="split-pane-list-body" id="parties-list-items">
            ${allParties.length === 0 ? `
              <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
                No parties found. Click "+ New Party" to add one.
              </div>
            ` : allParties.map(p => `
              <div class="split-pane-list-item ${String(p.id) === String(id) ? 'selected' : ''}" data-id="${p.id}">
                <div style="font-weight: 700; font-size: 0.8rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
                  <span>${escapeHtml(p.name)}</span>
                  <span style="font-size: 0.675rem; color: var(--primary);">${escapeHtml(p.place || '')}</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--muted-foreground);">
                  ${escapeHtml(p.designation || 'Trader')} ${p.phone ? '• ' + escapeHtml(p.phone) : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form Layout (Parity with Legacy ERP Screenshot 2) -->
        <div class="split-pane-form" id="party-form-pane">
          <form id="party-form" class="paper-form-body" style="gap: 0.35rem;">
            <input type="hidden" id="party-id" value="${party.id || ''}" />

            <!-- PARTY TYPE CHECKBOXES (MATCHING SCREENSHOT 2) -->
            <div style="background: var(--muted); padding: 0.35rem 0.6rem; border-radius: 4px; border: 1px solid var(--border); display: flex; align-items: center; gap: 1.25rem;">
              <span class="compact-label" style="font-weight: 700; color: var(--foreground); margin: 0;">Party Type:</span>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_BUYER" value="BUYER" ${activeRoles.includes('BUYER') ? 'checked' : ''} /> Buyer
              </label>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_SELLER" value="SELLER" ${activeRoles.includes('SELLER') ? 'checked' : ''} /> Seller
              </label>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_BUYER_BROKER" value="BUYER_BROKER" ${activeRoles.includes('BUYER_BROKER') ? 'checked' : ''} /> Buyer Broker
              </label>
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.775rem; cursor: pointer;">
                <input type="checkbox" name="role_SELLER_BROKER" value="SELLER_BROKER" ${activeRoles.includes('SELLER_BROKER') ? 'checked' : ''} /> Seller Broker
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
                    <input type="text" id="name" class="compact-input" required value="${escapeHtml(party.name || '')}" placeholder="e.g. A MADHAVAN NADAR" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Address</label>
                    <input type="text" id="address" class="compact-input" value="${escapeHtml(party.address || '')}" placeholder="e.g. A-87 MARKET YARD" />
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Land Mark</label>
                    <input type="text" id="landMark" class="compact-input" value="${escapeHtml(party.landMark || '')}" placeholder="Near Market Yard" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Place (City)* / Pincode</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="place" class="compact-input" required value="${escapeHtml(party.place || '')}" placeholder="e.g. Latur" style="flex: 1;" />
                      <input type="text" id="pincode" class="compact-input" value="${escapeHtml(party.pincode || '')}" placeholder="413512" style="width: 80px;" />
                    </div>
                  </div>
                </div>

                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">State Name / CST NO</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="stateName" class="compact-input" value="${escapeHtml(party.stateName || 'Maharashtra')}" style="flex: 1;" />
                      <input type="text" id="cstNo" class="compact-input" value="${escapeHtml(cstNo)}" placeholder="CST No" style="width: 100px;" />
                    </div>
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">GSTIN / Credit Limit</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="gstin" class="compact-input" value="${escapeHtml(gstin)}" placeholder="27ABCDE1234F1Z5" style="flex: 1;" />
                      <input type="number" id="creditLimit" class="compact-input" value="${party.creditLimit || '0'}" placeholder="0" style="width: 80px;" />
                    </div>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="compact-group">
                    <label class="compact-label">Phone (Office) / Mobile (SMS)</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="phone" class="compact-input" value="${escapeHtml(party.phone || '')}" placeholder="Office phone" style="flex: 1;" />
                      <input type="text" id="mobile" class="compact-input" value="${escapeHtml(party.mobile || '')}" placeholder="Primary Mobile" style="flex: 1;" />
                    </div>
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Vat TIN / CST TIN</label>
                    <div style="display: flex; gap: 0.25rem;">
                      <input type="text" id="vatTin" class="compact-input" value="${escapeHtml(vatTin)}" placeholder="VAT TIN" style="flex: 1;" />
                      <input type="text" id="cstTin" class="compact-input" value="${escapeHtml(cstTin)}" placeholder="CST TIN" style="flex: 1;" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 2: DELIVERY ADDRESS PANEL -->
              <div id="panel-delivery" class="party-tab-panel" style="display: none;">
                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Delivery Address Line 1</label>
                    <input type="text" id="delivAddressLine" class="compact-input" value="${escapeHtml(delivAddr.addressLine || '')}" placeholder="Godown / Factory Address" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Delivery City</label>
                    <input type="text" id="delivCity" class="compact-input" value="${escapeHtml(delivAddr.city || '')}" placeholder="City name" />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="compact-group">
                    <label class="compact-label">Delivery State</label>
                    <input type="text" id="delivState" class="compact-input" value="${escapeHtml(delivAddr.state || '')}" placeholder="State" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Pincode</label>
                    <input type="text" id="delivPincode" class="compact-input" value="${escapeHtml(delivAddr.pincode || '')}" placeholder="Pincode" />
                  </div>
                </div>
              </div>

              <!-- TAB 3: BANK & OTHER DETAILS PANEL -->
              <div id="panel-bank" class="party-tab-panel" style="display: none;">
                <div class="form-grid-2" style="margin-bottom: 0.25rem;">
                  <div class="compact-group">
                    <label class="compact-label">Bank Name</label>
                    <input type="text" id="bankName" class="compact-input" value="${escapeHtml(bankDetails.bankName || '')}" placeholder="e.g. State Bank of India" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Account Number</label>
                    <input type="text" id="accountNo" class="compact-input" value="${escapeHtml(bankDetails.accountNo || '')}" placeholder="Account No" />
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="compact-group">
                    <label class="compact-label">IFSC Code</label>
                    <input type="text" id="ifscCode" class="compact-input" value="${escapeHtml(bankDetails.ifscCode || '')}" placeholder="SBIN0001234" style="text-transform: uppercase;" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">Branch Name</label>
                    <input type="text" id="branch" class="compact-input" value="${escapeHtml(bankDetails.branch || '')}" placeholder="Branch location" />
                  </div>
                  <div class="compact-group">
                    <label class="compact-label">PAN Number</label>
                    <input type="text" id="panNo" class="compact-input" value="${escapeHtml(panNo)}" placeholder="ABCDE1234F" style="text-transform: uppercase;" />
                  </div>
                </div>
              </div>
            </div>

            <!-- CONTACT PERSONS (SMS & EMAILS) LIST (MATCHING SCREENSHOT 2) -->
            <div style="background: var(--muted); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);">
              <span class="compact-label" style="font-weight: 700; color: var(--foreground); margin-bottom: 0.25rem;">Contact Persons (SMS & Emails)</span>
              
              ${[1, 2, 3, 4].map(idx => {
                const c = party.contacts?.[idx - 1] || {};
                return `
                  <div class="form-grid-3" style="margin-bottom: 0.2rem;">
                    <input type="text" class="compact-input contact-name" data-idx="${idx}" value="${escapeHtml(c.name || '')}" placeholder="${idx}. Contact Name" />
                    <input type="text" class="compact-input contact-phone" data-idx="${idx}" value="${escapeHtml(c.phone || '')}" placeholder="Mobile No" />
                    <input type="email" class="compact-input contact-email" data-idx="${idx}" value="${escapeHtml(c.email || '')}" placeholder="Email ID" />
                  </div>
                `;
              }).join('')}
            </div>

            ${isEdit ? AuditMetadataBlock(party) : ''}
          </form>

          <!-- FOOTER TOOLBAR (MATCHING SCREENSHOT 2) -->
          <div class="paper-form-footer">
            ${isEdit ? `
              <button type="button" id="btn-delete-party" class="danger" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
                ${Icons.trash} F5 - Delete
              </button>
            ` : ''}
            <button type="button" id="btn-reset-party" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset
            </button>
            <button type="submit" form="party-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} ${isEdit ? 'F3 - Alter Party' : 'F2 - Add Party'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach tab switching logic
  const tabGeneral = document.getElementById('tab-general');
  const tabDelivery = document.getElementById('tab-delivery');
  const tabBank = document.getElementById('tab-bank');

  const panelGeneral = document.getElementById('panel-general');
  const panelDelivery = document.getElementById('panel-delivery');
  const panelBank = document.getElementById('panel-bank');

  const switchTab = (activeBtn, activePanel) => {
    [tabGeneral, tabDelivery, tabBank].forEach(btn => {
      btn.classList.remove('primary');
      btn.classList.add('secondary');
    });
    activeBtn.classList.remove('secondary');
    activeBtn.classList.add('primary');

    [panelGeneral, panelDelivery, panelBank].forEach(panel => {
      panel.style.display = 'none';
    });
    activePanel.style.display = 'block';
  };

  tabGeneral?.addEventListener('click', () => switchTab(tabGeneral, panelGeneral));
  tabDelivery?.addEventListener('click', () => switchTab(tabDelivery, panelDelivery));
  tabBank?.addEventListener('click', () => switchTab(tabBank, panelBank));

  attachCityAutocomp('place');

  // Split-pane selection & search handlers
  document.querySelectorAll('.split-pane-list-item').forEach(item => {
    item.addEventListener('click', () => {
      renderPartyForm(item.getAttribute('data-id'), allParties);
    });
  });

  document.getElementById('search-parties').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? 'block' : 'none';
    });
  });

  document.getElementById('btn-new-party').addEventListener('click', () => renderPartyForm(null, allParties));
  document.getElementById('btn-reset-party')?.addEventListener('click', () => renderPartyForm(null, allParties));

  if (isEdit) {
    document.getElementById('btn-delete-party')?.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to delete Party profile #${party.name}?`)) return;
      try {
        await api.del(`/api/parties/${party.id}`);
        showToast('Party profile deleted', 'success');
        renderPartyForm(null);
      } catch (err) {
        showToast(err.message || 'Failed to delete party', 'error');
      }
    });
  }

  // Form submit handler
  document.getElementById('party-form').addEventListener('submit', async (e) => {
    e.preventDefault();

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
        contacts.push({ name: name || undefined, phone: phone || undefined, email: email || undefined });
      }
    });

    const delivAddressLine = document.getElementById('delivAddressLine')?.value.trim();
    const delivCity = document.getElementById('delivCity')?.value.trim();
    const delivState = document.getElementById('delivState')?.value.trim();
    const delivPincode = document.getElementById('delivPincode')?.value.trim();

    const deliveryAddresses = delivAddressLine ? [{
      addressLine: delivAddressLine,
      city: delivCity || null,
      state: delivState || null,
      pincode: delivPincode || null,
    }] : [];

    const bankName = document.getElementById('bankName')?.value.trim();
    const accountNo = document.getElementById('accountNo')?.value.trim();
    const ifscCode = document.getElementById('ifscCode')?.value.trim();
    const branch = document.getElementById('branch')?.value.trim();

    const bankDetailsPayload = bankName ? [{
      bankName,
      accountNo: accountNo || null,
      ifscCode: ifscCode || null,
      branch: branch || null,
    }] : [];

    const panVal = document.getElementById('panNo')?.value.trim();

    const taxIds = [
      { taxType: 'GSTIN', taxValue: document.getElementById('gstin').value.trim() },
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
        await api.put(`/api/parties/${party.id}`, payload);
        showToast('Party profile updated successfully', 'success');
      } else {
        await api.post('/api/parties', payload);
        showToast('New party created successfully', 'success');
      }
      renderPartyForm(null);
    } catch (err) {
      showToast(err.message || 'Failed to save party profile', 'error');
    }
  });
}
