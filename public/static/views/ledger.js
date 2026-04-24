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
    const data = await api.get(`/ledger?page=${page}&limit=${limit}`);
    const hasMore = data.length === limit;
    
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
        <td style="text-align:right">
          <a href="/ledger/${c.id}" data-route><button class="small">${Icons.edit} Edit</button></a>
        </td>
      </tr>
    `);

    app.innerHTML = `
      ${PageHeader({ title: 'Ledger', actions: `<a href="/ledger/new" data-route><button class="primary">${Icons.plus} New Entry</button></a>` })}
      <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem">
        <div class="form-group" style="margin:0; flex:1; max-width:300px; position:relative">
          <input type="text" id="search-ledger" placeholder="Search ledger entries..." style="padding-left:2rem; width:100%">
          <div style="position:absolute; left:0.6rem; top:0.5rem; color:var(--muted-foreground)">${Icons.search}</div>
        </div>
      </div>
      ${DataTable({
        id: 'ledger-table',
        count: data.length,
        headers: [ { label: 'Date' }, { label: 'Account' }, { label: 'Particulars' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }, { label: '', align: 'right' } ],
        rows: renderRows(data),
        pagination: { page, hasMore, route: '/ledger' }
      })}
    `;
    
    import('../components/ui.js').then(ui => {
      ui.attachTableSearch('search-ledger', document.querySelector('#ledger-table tbody'), data, renderRows);
    });
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Ledger' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderLedgerForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let entry = {};
  if (isEdit) { try { entry = await api.get(`/ledger/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; } }

  app.innerHTML = `
    ${PageHeader({ title: isEdit ? 'Edit Entry' : 'New Journal Entry', backHref: '/ledger' })}
    <div class="table-container" style="padding:1.5rem">
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
          <a href="/ledger" data-route><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;

  // Attach party autocomplete — when selected, resolve the party ID
  attachPartyAutocomp('accountName', async (selectedName) => {
    try {
      const res = await fetch(`/api/search/parties?q=${encodeURIComponent(selectedName)}`);
      const items = await res.json();
      // Find exact match and fill hidden accountId
      const match = items.find(i => i.value === selectedName);
      if (match) {
        // Fetch the party to get their ID
        const partyRes = await fetch(`/api/parties?q=${encodeURIComponent(selectedName)}&limit=1`);
        const partyList = await partyRes.json();
        if (partyList.length > 0) {
          document.getElementById('accountId').value = partyList[0].id;
        }
      }
    } catch { /* silently ignore lookup failures */ }
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
      if (isEdit) { await api.put(`/ledger/${id}`, fd); showToast('Entry updated'); }
      else { await api.post('/ledger', fd); showToast('Journal entry created'); }
      
      await api.get('/ledger?page=1&limit=50', { forceRefresh: true });
      window.history.pushState({}, '', '/ledger'); window.dispatchEvent(new PopStateEvent('popstate'));
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
        await api.get('/ledger?page=1&limit=50', { forceRefresh: true });
        window.history.pushState({}, '', '/ledger');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = ogHtml;
        alert(err.message);
      }
    });
  }
}
