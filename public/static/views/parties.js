/**
 * Parties View — List + Dual-Pane Create/Edit form with Contacts sub-grid
 */
import { Icons, Badge, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachCityAutocomp } from '../lib/autocomplete.js';


/** Render standard party list */
export async function renderPartyList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();

  try {
    const data = await api.get('/parties');

    const renderRows = (items) => items.map(p => `
      <tr style="cursor:pointer" onclick="window.location.href='/parties/${p.id}'; window.dispatchEvent(new PopStateEvent('popstate'))">
        <td>
          <div style="font-weight:600">${escapeHtml(p.name)}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">${escapeHtml(p.place || 'No location')}</div>
        </td>
        <td>${escapeHtml(p.phone || p.phoneRes || '-')}</td>
        <td>${escapeHtml(p.designation || '-')}</td>
        <td>${Badge(p.isActive ? 'Active' : 'Inactive', p.isActive ? 'active' : 'inactive')}</td>
        <td style="text-align:right" onclick="event.stopPropagation()">
          <a href="/parties/${p.id}" data-route><button class="small">${Icons.edit} Alter</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ 
        title: 'Party Master', 
        actions: `
          <button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button>
          <button class="secondary" id="export-parties-btn" style="margin-right:0.5rem">${Icons.download} Export Excel</button>
          <a href="/parties/new" data-route><button class="primary">${Icons.plus} New Party</button></a>
        ` 
      })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-parties" placeholder="Search parties..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'parties-table',
        count: data.length,
        headers: [ { label: 'Party Details' }, { label: 'Contact' }, { label: 'Designation' }, { label: 'Status' }, { label: '', style: 'text-align:right' } ],
        rows: renderRows(data)
      })}
    `;

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-parties', document.querySelector('#parties-table tbody'), data, renderRows);
    });

    document.getElementById('export-parties-btn')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/parties/export', 'parties'));
    });
  } catch (err) {
    app.innerHTML = `${PageHeader({ title: 'Parties' })}<div class="alert danger">${err.message}</div>`;
  }
}

/** Render party form in dual-pane view */
export async function renderPartyForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  
  app.innerHTML = Spinner();

  try {
    const allParties = await api.get('/parties');
    let party = {};

    if (isEdit) {
      party = await api.get(`/parties/${id}`);
    }

    const gstin = party.taxIds?.find(t => t.taxType === 'GSTIN')?.taxValue || '';
    const vatTin = party.taxIds?.find(t => t.taxType === 'VAT_TIN')?.taxValue || '';
    const cstTin = party.taxIds?.find(t => t.taxType === 'CST_TIN')?.taxValue || '';
    const cstNo = party.taxIds?.find(t => t.taxType === 'CST_NO')?.taxValue || '';

    // Extract roles
    const activeRoles = party.roles?.map(r => r.role) || [];

    app.innerHTML = `
      <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; height: calc(100vh - 100px); align-items: stretch;">
        
        <!-- Left Sidebar: SELECT ACCOUNT TO ALTER -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT ACCOUNT TO ALTER</h3>
            <input type="text" id="alter-party-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-parties-list" style="flex: 1; overflow-y: auto;">
            ${allParties.map(p => `
              <div class="alter-list-item ${p.id == id ? 'active-item' : ''}" data-id="${p.id}" style="padding: 0.625rem 1rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s;">
                <div style="font-size: 0.8125rem; font-weight: 600; color: ${p.id == id ? 'var(--primary)' : 'inherit'};">${escapeHtml(p.name)}</div>
                <div style="font-size: 0.6875rem; color: var(--muted-foreground);">${escapeHtml(p.place || 'No location')}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane: Master Form -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          ${PageHeader({
            title: isEdit ? `Alter Account: ${party.name}` : 'New Party Account',
            subtitle: isEdit ? `Edit details for Party ID #${id}` : 'Create a new client/broker database record',
            backHref: '/parties'
          })}

          <form id="party-form">
            <!-- Roles Selector Grid -->
            <h3 style="margin: 0 0 0.75rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Party Type / Roles</h3>
            <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; background: var(--background); padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border); flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                <input type="checkbox" name="roles" value="BUYER" ${activeRoles.includes('BUYER') ? 'checked' : ''}> Buyer
              </label>
              <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                <input type="checkbox" name="roles" value="SELLER" ${activeRoles.includes('SELLER') ? 'checked' : ''}> Seller
              </label>
              <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                <input type="checkbox" name="roles" value="BUYER_BROKER" ${activeRoles.includes('BUYER_BROKER') ? 'checked' : ''}> Buyer Broker
              </label>
              <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; cursor: pointer;">
                <input type="checkbox" name="roles" value="SELLER_BROKER" ${activeRoles.includes('SELLER_BROKER') ? 'checked' : ''}> Seller Broker
              </label>
            </div>

            <h3 style="margin: 0 0 1rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Basic Information</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'name', label: 'Party Name', value: party.name || '', required: true, placeholder: 'Company name' })}
              ${FormGroup({ id: 'designation', label: 'Designation / Note', value: party.designation || '', placeholder: 'e.g. Grain Merchant' })}
              ${FormGroup({ id: 'phone', label: 'Office Phone', value: party.phone || '', type: 'tel', placeholder: '+91...' })}
              ${FormGroup({ id: 'phoneRes', label: 'Residential Phone', value: party.phoneRes || '', type: 'tel', placeholder: 'Home phone' })}
              ${FormGroup({ id: 'emailIds', label: 'Emails (comma-separated)', value: party.emailIds || '', type: 'email', placeholder: 'sales@example.com' })}
            </div>

            <h3 style="margin: 1.5rem 0 1rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Address</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'address', label: 'Address Details', type: 'textarea', value: party.address || '', placeholder: 'Street address details' })}
              ${FormGroup({ id: 'landmark', label: 'Landmark', value: party.landmark || '' })}
              ${FormGroup({ id: 'place', label: 'Station / City', value: party.place || '', placeholder: 'Place lookup' })}
              ${FormGroup({ id: 'stateName', label: 'State', value: party.stateName || '' })}
              ${FormGroup({ id: 'pinCode', label: 'PIN Code', value: party.pinCode || '' })}
            </div>

            <h3 style="margin: 1.5rem 0 1rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Tax & Business details</h3>
            <div class="form-grid">
              ${FormGroup({ id: 'creditLimit', label: 'Credit Limit (₹)', value: party.creditLimit || '', type: 'number' })}
              ${FormGroup({ id: 'mill', label: 'Mill Name', value: party.mill || '' })}
              ${FormGroup({ id: 'fax', label: 'Fax Number', value: party.fax || '' })}
              ${FormGroup({ id: 'smsMobile', label: 'Automated SMS Mobile', value: party.smsMobile || '', type: 'tel' })}
              ${FormGroup({ id: 'gstin', label: 'GSTIN', value: gstin, placeholder: '22AAAAA0000A1Z5' })}
              ${FormGroup({ id: 'vatTin', label: 'VAT TIN', value: vatTin })}
              ${FormGroup({ id: 'cstTin', label: 'CST TIN', value: cstTin })}
              ${FormGroup({ id: 'cstNo', label: 'CST Number', value: cstNo })}
            </div>

            <!-- Contacts Sub-Table Grid -->
            <h3 style="margin: 1.5rem 0 0.5rem; font-size: 0.8125rem; text-transform: uppercase; color: var(--muted-foreground);">Key Contact Persons (Up to 4)</h3>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 1rem;">
              <table id="contacts-grid" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: var(--faint);">
                    <th style="padding: 0.5rem 0.75rem;">Name *</th>
                    <th style="padding: 0.5rem 0.75rem;">Number *</th>
                    <th style="padding: 0.5rem 0.75rem;">Email</th>
                    <th style="padding: 0.5rem 0.75rem;">Designation</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody id="contacts-grid-body">
                  <!-- Dynamic rows go here -->
                </tbody>
              </table>
            </div>
            <button type="button" id="btn-add-contact" class="secondary small" style="margin-bottom: 1.5rem;">+ Add Contact Row</button>

            <div class="form-actions">
              <button type="submit" class="primary">${isEdit ? 'Update Party' : 'Create Party'}</button>
              ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
              <a href="/parties" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Add styles for active item
    const style = document.createElement('style');
    style.innerHTML = `
      .alter-list-item:hover { background: var(--muted); }
      .active-item { background: rgba(34, 197, 94, 0.08) !important; border-left: 3px solid var(--primary); }
    `;
    document.head.appendChild(style);

    // Bind city autocomplete for auto-filling state and pincode
    attachCityAutocomp('place', (name, city) => {
      if (city) {
        const stateInput = document.getElementById('stateName');
        const pinInput = document.getElementById('pinCode');
        if (stateInput && city.stateName) stateInput.value = city.stateName;
        if (pinInput && city.pincode) pinInput.value = city.pincode;
      }
    });

    // Bind left sidebar search filter

    document.getElementById('alter-party-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.alter-list-item').forEach(el => {
        const txt = el.textContent.toLowerCase();
        el.style.display = txt.includes(q) ? '' : 'none';
      });
    });

    // Bind left sidebar clicks
    document.querySelectorAll('.alter-list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const clickedId = e.currentTarget.getAttribute('data-id');
        window.history.pushState({}, '', `/parties/${clickedId}`);
        renderPartyForm(clickedId);
      });
    });

    // Populate existing contacts
    const contactsBody = document.getElementById('contacts-grid-body');
    const existingContacts = party.contacts || [];

    const addContactRow = (contact = {}) => {
      const rowCount = contactsBody.querySelectorAll('tr').length;
      if (rowCount >= 4) {
        showToast('Maximum 4 contact persons allowed per party', 'error');
        return;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 0.375rem 0.75rem;"><input type="text" class="contact-name" value="${escapeHtml(contact.contactName || '')}" required style="width: 100%;" placeholder="e.g. John Doe"></td>
        <td style="padding: 0.375rem 0.75rem;"><input type="text" class="contact-number" value="${escapeHtml(contact.contactNumber || '')}" required style="width: 100%;" placeholder="e.g. 9876543210"></td>
        <td style="padding: 0.375rem 0.75rem;"><input type="email" class="contact-email" value="${escapeHtml(contact.emailId || '')}" style="width: 100%;" placeholder="e.g. john@example.com"></td>
        <td style="padding: 0.375rem 0.75rem;"><input type="text" class="contact-designation" value="${escapeHtml(contact.designation || '')}" style="width: 100%;" placeholder="e.g. Director"></td>
        <td style="text-align: center;"><button type="button" class="btn-remove-contact danger small" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">×</button></td>
      `;

      tr.querySelector('.btn-remove-contact').addEventListener('click', () => tr.remove());
      contactsBody.appendChild(tr);
    };

    existingContacts.forEach(c => addContactRow(c));
    if (existingContacts.length === 0) addContactRow(); // Render at least one blank row

    document.getElementById('btn-add-contact').addEventListener('click', () => addContactRow());

    // Bind form submit
    document.getElementById('party-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving...';

      const formData = collectFormData('party-form');

      // Extract roles checkboxes
      const roles = Array.from(document.querySelectorAll('input[name="roles"]:checked')).map(el => el.value);
      formData.roles = roles;

      // Extract contacts table rows
      const contactRows = Array.from(contactsBody.querySelectorAll('tr'));
      const contacts = contactRows.map(row => ({
        contactName: row.querySelector('.contact-name').value.trim(),
        contactNumber: row.querySelector('.contact-number').value.trim(),
        emailId: row.querySelector('.contact-email').value.trim() || null,
        designation: row.querySelector('.contact-designation').value.trim() || null,
      })).filter(c => c.contactName && c.contactNumber);

      formData.contacts = contacts;

      try {
        if (isEdit) {
          await api.put(`/parties/${id}`, formData);
          showToast('Party updated successfully');
        } else {
          await api.post('/parties', formData);
          showToast('Party created successfully');
        }
        
        window.history.pushState({}, '', '/parties');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

    if (isEdit) {
      document.getElementById('btn-delete').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to delete this party?')) return;
        const btn = e.target.closest('button');
        const ogHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Deleting...';
        try {
          await api.del(`/parties/${id}`);
          window.history.pushState({}, '', '/parties');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = ogHtml;
          alert(err.message);
        }
      });
    }

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}
