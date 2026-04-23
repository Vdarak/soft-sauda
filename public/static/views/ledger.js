/**
 * Ledger View — Journal entries list + manual entry form
 * 
 * The account field uses party autocomplete so users can type a party name
 * instead of remembering raw IDs.
 */
import { Icons, DataTable, FormGroup, PageHeader, Spinner, showToast, escapeHtml, formatDate, formatCurrency, collectFormData } from '../components/ui.js';
import * as api from '../lib/api.js';
import { attachPartyAutocomp } from '../lib/autocomplete.js';

export async function renderLedgerList() {
  const app = document.getElementById('app');
  app.innerHTML = Spinner();
  try {
    const data = await api.get('/ledger');
    const rows = data.map(e => `
      <tr>
        <td>${formatDate(e.transactionDate)}</td>
        <td style="font-weight:600">${escapeHtml(e.accountName || '-')}</td>
        <td>${escapeHtml(e.sourceType || '-')}</td>
        <td>${escapeHtml(e.narration || '-')}</td>
        <td style="text-align:right;color:var(--danger)" class="mono">${Number(e.debit) > 0 ? formatCurrency(e.debit) : '-'}</td>
        <td style="text-align:right;color:var(--success)" class="mono">${Number(e.credit) > 0 ? formatCurrency(e.credit) : '-'}</td>
        <td style="text-align:right"><a href="/ledger/${e.id}" data-route><button class="small">${Icons.edit} Edit</button></a></td>
      </tr>
    `);
    app.innerHTML = `
      ${PageHeader({ title: 'General Ledger', subtitle: 'Financial journal entries', actions: `<a href="/ledger/new" data-route><button class="primary">${Icons.plus} Journal Entry</button></a>` })}
      ${DataTable({ id: 'ledger-table', title: 'Ledger Entries', count: data.length,
        headers: [{ label: 'Date' }, { label: 'Account' }, { label: 'Source' }, { label: 'Narration' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }, { label: '', align: 'right' }],
        rows })}
    `;
  } catch (err) { app.innerHTML = `${PageHeader({ title: 'Ledger' })}<div class="alert danger">${err.message}</div>`; }
}

export async function renderLedgerForm(id) {
  const app = document.getElementById('app');
  const isEdit = !!id;
  let entry = {};
  if (isEdit) { app.innerHTML = Spinner(); try { entry = await api.get(`/ledger/${id}`); } catch (err) { app.innerHTML = `<div class="alert danger">${err.message}</div>`; return; } }

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
    const fd = collectFormData('ledger-form');
    // Use the resolved accountId from the hidden input
    fd.accountId = document.getElementById('accountId').value || fd.accountId;
    // Remove the display field
    delete fd.accountName;

    if (!fd.accountId) {
      showToast('Please select a valid party account', 'error');
      return;
    }

    try {
      if (isEdit) { await api.put(`/ledger/${id}`, fd); showToast('Entry updated'); }
      else { await api.post('/ledger', fd); showToast('Journal entry created'); }
      window.history.pushState({}, '', '/ledger'); window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) { showToast(err.message, 'error'); }
  });
}
