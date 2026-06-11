/**
 * Ledger View — Journal entries list + manual entry form
 * 
 * The account field uses party autocomplete so users can type a party name
 * instead of remembering raw IDs.
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderLedgerList(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  const page = ctx && ctx.location && ctx.location.search ? parseInt(new URLSearchParams(ctx.location.search).get('page') || '1', 10) : 1;
  const limit = 50;

  try {
    const data = await api.get('/ledger');
    
    const renderRows = (items) => items.map(c => `
      <tr>
        <td>${formatDate(c.voucherDate)}</td>
        <td>
          <div style="font-weight:600">${escapeHtml(c.accountName || '')}</div>
          <div style="font-size:0.6875rem;color:var(--muted-foreground)">Ref: ${c.refNo || '-'}</div>
        </td>
        <td>${escapeHtml(c.particulars || '')}</td>
        <td style="text-align:right" class="mono">${c.drCr === 'Dr' ? formatCurrency(c.amount) : '-'}</td>
        <td style="text-align:right" class="mono">${c.drCr === 'Cr' ? formatCurrency(c.amount) : '-'}</td>
        <td style="text-align:right" onclick="event.stopPropagation()">
          <div style="display:inline-flex; gap:0.25rem; justify-content:flex-end;">
            <a href="/ledger/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
            <button class="small danger delete-row-btn" data-id="${c.id}" data-entity="ledger">${Icons.trash}</button>
          </div>
        </td>
      </tr>
    `);

    const totalDr = data.reduce((sum, c) => sum + (c.drCr === 'Dr' ? parseFloat(c.amount || '0') : 0), 0);
    const totalCr = data.reduce((sum, c) => sum + (c.drCr === 'Cr' ? parseFloat(c.amount || '0') : 0), 0);
    const footerHtml = `
      <tfoot>
        <tr style="font-weight: bold; background: var(--faint);">
          <td colspan="3">Total</td>
          <td style="text-align: right;" class="mono">${formatCurrency(totalDr)}</td>
          <td style="text-align: right;" class="mono">${formatCurrency(totalCr)}</td>
          <td></td>
        </tr>
      </tfoot>
    `;

    app.innerHTML = `
      ${PageHeader({ title: 'Ledger', actions: `
        <button class="secondary" onclick="window.print()" style="margin-right:0.5rem">${Icons.printer} Print List</button>
        <button class="secondary" id="btn-export-ledger" style="margin-right:0.5rem">${Icons.download} Export Excel</button>
        <a href="/ledger/new" data-route><button class="primary">${Icons.plus} New Entry</button></a>
      ` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; width:100%">
        <div class="form-group" style="margin:0; flex:1; position:relative">
          <input type="text" id="search-ledger" placeholder="Search ledger entries..." style="padding-left:2.5rem; width:100%">
          <div style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--muted-foreground); display:flex; align-items:center">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'ledger-table',
        count: data.length,
        headers: [ { label: 'Date' }, { label: 'Account' }, { label: 'Particulars' }, { label: 'Debit', style: 'text-align:right' }, { label: 'Credit', style: 'text-align:right' }, { label: '', style: 'text-align:right' } ],
        rows: renderRows(data),
        footer: footerHtml
      })}
    `;

    document.getElementById('btn-export-ledger')?.addEventListener('click', () => {
      import('../components/ui.js').then(ui => ui.exportToExcel('/ledger/export', 'ledger'));
    });

    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-ledger', document.querySelector('#ledger-table tbody'), data, renderRows);
    });
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Ledger' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderLedgerForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  app.innerHTML = Spinner();

  try {
    const allLedger = await api.get('/ledger');
    let entry = {};
    if (isEdit) {
      entry = await api.get(`/ledger/${id}`);
    }

    app.innerHTML = `
      <div class="dual-pane-container">
        <!-- Left Sidebar: SELECT LEDGER ENTRY TO ALTER -->
        <div class="table-container" style="background: var(--card); display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 0.75rem; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em;">SELECT ENTRY TO ALTER</h3>
            <input type="text" id="alter-ledger-search" placeholder="Quick search..." style="font-size: 0.8125rem; padding: 0.375rem 0.75rem; width: 100%;">
          </div>
          <div id="alter-ledger-list" style="flex: 1; overflow-y: auto;">
            ${allLedger.map(c => `
              <div class="alter-list-item ${c.id == id ? 'active-item' : ''}" data-id="${c.id}">
                <div class="title">${escapeHtml(c.accountName || 'Entry')}</div>
                <div class="subtitle">Particulars: ${escapeHtml(c.particulars || '-')} (${formatDate(c.voucherDate)})</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Pane: Master Form -->
        <div class="table-container" style="background: var(--card); padding: 1.5rem; overflow-y: auto; height: 100%;">
          ${PageHeader({ title: isEdit ? 'Edit Entry' : 'New Journal Entry', backHref: '/ledger' })}
          
          <form id="ledger-form">
            <div class="form-grid">
              ${FormGroup({ id: 'transactionDate', label: 'Date', value: entry.transactionDate ? new Date(entry.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], type: 'date' })}
              ${FormGroup({ id: 'accountName', label: 'Account (Party)', value: entry.accountName || '', required: true, placeholder: 'Start typing to search...' })}
              <input type="hidden" id="accountId" name="accountId" value="${entry.accountId || ''}">
              ${FormGroup({ id: 'debit', label: 'Debit (₹)', value: entry.debit || '', type: 'number' })}
              ${FormGroup({ id: 'credit', label: 'Credit (₹)', value: entry.credit || '', type: 'number' })}
              ${FormGroup({ id: 'narration', label: 'Narration', value: entry.narration || '', type: 'textarea' })}
              ${FormGroup({ id: 'voucherRef', label: 'Voucher Ref', value: entry.sourceId || '', type: 'number' })}
            </div>
            <div class="form-actions">
              <button type="submit" class="primary">${isEdit ? 'Update' : 'Create'} Entry</button>
              ${isEdit ? `<button type="button" class="danger" id="btn-delete">${Icons.trash || 'Delete'}</button>` : ''}
              <a href="/ledger" data-route><button type="button" class="secondary">Cancel</button></a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Attach party autocomplete — when selected, resolve the party ID from the local cache
    attachPartyAutocomp('accountName', (selectedName) => {
      const partiesList = api.clientCache.get('/parties') || [];
      const match = partiesList.find(p => p.name === selectedName);
      if (match) {
        document.getElementById('accountId').value = match.id;
      }
    });

    document.getElementById('ledger-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Saving...';

      const fd = collectFormData('ledger-form');
      // Use the resolved accountId from the hidden input
      fd.accountId = document.getElementById('accountId').value || fd.accountId;
      // Remove the display field
      delete fd.accountName;

      if (!fd.accountId) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast('Please select a valid party account', 'error');
        return;
      }

      try {
        if (isEdit) {
          await api.put(`/ledger/${id}`, fd);
          showToast('Entry updated');
        } else {
          await api.post('/ledger', fd);
          showToast('Journal entry created');
        }
        
        window.history.pushState({}, '', '/ledger');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        showToast(err.message, 'error');
      }
    });

    if (isEdit) {
      document.getElementById('btn-delete').addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to delete this ledger entry?')) return;
        const btn = e.target.closest('button');
        const ogHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;display:inline-block;border-color:currentColor;border-top-color:transparent"></span> Deleting...';
        try {
          await api.del(`/ledger/${id}`);
          window.history.pushState({}, '', '/ledger');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = ogHtml;
          alert(err.message);
        }
      });
    }

    // Sidebar search filter
    document.getElementById('alter-ledger-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const items = document.querySelectorAll('#alter-ledger-list .alter-list-item');
      items.forEach(item => {
        const txt = item.textContent.toLowerCase();
        item.style.display = txt.includes(q) ? '' : 'none';
      });
    });

    // Handle click on sidebar item to navigate without full page load
    document.getElementById('alter-ledger-list')?.addEventListener('click', (e) => {
      const item = e.target.closest('.alter-list-item');
      if (!item) return;
      const targetId = item.getAttribute('data-id');
      window.history.pushState({}, '', `/ledger/${targetId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

  } catch (err) {
    app.innerHTML = `<div class="alert danger">Failed to initialize: ${err.message}</div>`;
  }
}
