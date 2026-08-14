/**
 * Expense Head Master View (Single-Viewport Compact Paper Form Design)
 */

import * as api from '../lib/api.js';
import { showToast, Icons } from '../components/ui.js';

export async function renderExpenseHeadList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.dollar} Expense Head Management
          </h2>
          <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">
            Manage expense heads for outstanding bill adjustments, freight deductions, and loading charges.
          </p>
        </div>
        <button id="btn-add-exp" class="primary" style="height: 30px; font-size: 0.8rem; padding: 0 0.75rem;">
          + Add Expense Head
        </button>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-exp" class="compact-input" placeholder="Search expense heads..." />
            <span id="exp-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">0</span>
          </div>
          <div class="split-pane-list-body" id="exp-list-items">
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.85rem;">
              Loading expense heads...
            </div>
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="exp-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} EXPENSE HEAD RECORD
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.7rem;">New Record</span>
          </div>

          <form id="exp-form" class="paper-form-body">
            <input type="hidden" id="exp-id" value="" />

            <div class="form-grid-2">
              <div class="compact-group">
                <label class="compact-label">Expense Head Name*</label>
                <input type="text" id="exp-name" class="compact-input" required placeholder="e.g. Freight Deduction / Loading Charges" />
              </div>
              <div class="compact-group">
                <label class="compact-label">Expense Type Code</label>
                <input type="text" id="exp-type" class="compact-input" placeholder="e.g. DR / CR / EX" />
              </div>
            </div>
          </form>

          <div class="paper-form-footer">
            <button type="button" id="btn-delete-exp" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} Delete
            </button>
            <button type="button" id="btn-reset-exp" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset Form
            </button>
            <button type="submit" form="exp-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} Save Expense Head (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let allExpenses = [];
  let selectedId = null;

  async function loadExpenses() {
    try {
      allExpenses = await api.get('/api/expense-heads');
      renderList(allExpenses);
    } catch (err) {
      showToast(err.message || 'Failed to load expense heads', 'error');
    }
  }

  function renderList(list) {
    const listEl = document.getElementById('exp-list-items');
    document.getElementById('exp-count').textContent = list.length;

    if (list.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          No expense heads found. Click "+ Add Expense Head" to create.
        </div>
      `;
      return;
    }

    listEl.innerHTML = list.map(e => `
      <div class="split-pane-list-item ${selectedId === e.id ? 'selected' : ''}" data-id="${e.id}">
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--foreground); display: flex; align-items: center; justify-content: space-between;">
          <span>${escapeHtml(e.name)}</span>
          <span style="font-size: 0.7rem; font-weight: 600; color: var(--primary);">${escapeHtml(e.expenseType || '')}</span>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        selectExpense(id);
      });
    });
  }

  function selectExpense(id) {
    selectedId = id;
    const e = allExpenses.find(item => item.id === id);
    if (!e) return;

    document.getElementById('exp-id').value = e.id;
    document.getElementById('exp-name').value = e.name || '';
    document.getElementById('exp-type').value = e.expenseType || '';

    document.getElementById('form-title').textContent = `📄 EDIT EXPENSE HEAD #${e.id}`;
    document.getElementById('form-status-badge').textContent = 'Editing';
    document.getElementById('btn-delete-exp').style.display = 'inline-block';

    renderList(allExpenses);
  }

  function resetForm() {
    selectedId = null;
    document.getElementById('exp-id').value = '';
    document.getElementById('exp-form').reset();
    document.getElementById('form-title').textContent = '📄 EXPENSE HEAD RECORD';
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-exp').style.display = 'none';
    renderList(allExpenses);
    document.getElementById('exp-name').focus();
  }

  document.getElementById('btn-add-exp').addEventListener('click', resetForm);
  document.getElementById('btn-reset-exp').addEventListener('click', resetForm);

  document.getElementById('search-exp').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allExpenses.filter(e => e.name && e.name.toLowerCase().includes(q));
    renderList(filtered);
  });

  document.getElementById('exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('exp-id').value;
    const payload = {
      name: document.getElementById('exp-name').value.trim(),
      expenseType: document.getElementById('exp-type').value.trim() || null,
    };

    try {
      if (id) {
        await api.put(`/api/expense-heads/${id}`, payload);
        showToast('Expense head updated successfully', 'success');
      } else {
        await api.post('/api/expense-heads', payload);
        showToast('New expense head added successfully', 'success');
      }
      resetForm();
      await loadExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to save expense head', 'error');
    }
  });

  document.getElementById('btn-delete-exp').addEventListener('click', async () => {
    if (!selectedId) return;
    if (!confirm('Are you sure you want to delete this expense head?')) return;

    try {
      await api.del(`/api/expense-heads/${selectedId}`);
      showToast('Expense head deleted', 'success');
      resetForm();
      await loadExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense head', 'error');
    }
  });

  await loadExpenses();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
