/**
 * Terms & Conditions Master View (Single-Viewport Compact Paper Form Design)
 */

import * as api from '../lib/api.js';
import { showToast, Icons } from '../components/ui.js';

export async function renderTermList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="single-viewport-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.fileCode} Terms & Conditions Management
          </h2>
          <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">
            Manage reusable contract clauses, payment term conditions, and legal disclaimers.
          </p>
        </div>
        <button id="btn-add-term" class="primary" style="height: 30px; font-size: 0.8rem; padding: 0 0.75rem;">
          + Add New Clause
        </button>
      </div>

      <div class="split-pane-wrapper">
        <!-- LEFT PANE: Searchable List -->
        <div class="split-pane-list">
          <div class="split-pane-list-header">
            <input type="text" id="search-term" class="compact-input" placeholder="Search terms text..." />
            <span id="term-count" style="font-size: 0.7rem; font-weight: 700; color: var(--muted-foreground);">0</span>
          </div>
          <div class="split-pane-list-body" id="term-list-items">
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.85rem;">
              Loading terms...
            </div>
          </div>
        </div>

        <!-- RIGHT PANE: Compact Paper Form -->
        <div class="split-pane-form" id="term-form-pane">
          <div class="paper-form-header">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.4rem;" id="form-title">
              ${Icons.fileText} TERMS & CONDITIONS RECORD
            </h3>
            <span class="badge" id="form-status-badge" style="font-size: 0.7rem;">New Record</span>
          </div>

          <form id="term-form" class="paper-form-body">
            <input type="hidden" id="term-id" value="" />

            <div class="compact-group" style="flex: 1;">
              <label class="compact-label">Contract Term Clause Text*</label>
              <textarea id="term-text" class="compact-input" style="height: 140px !important; resize: vertical; line-height: 1.4;" required placeholder="Enter exact terms & conditions clause text..."></textarea>
            </div>
          </form>

          <div class="paper-form-footer">
            <button type="button" id="btn-delete-term" class="danger" style="display: none; height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.trash} Delete
            </button>
            <button type="button" id="btn-reset-term" class="secondary" style="height: 28px; font-size: 0.75rem; padding: 0 0.6rem;">
              ${Icons.refresh} Reset Form
            </button>
            <button type="submit" form="term-form" class="primary" style="height: 28px; font-size: 0.75rem; padding: 0 0.8rem;">
              ${Icons.save} Save Clause (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let allTerms = [];
  let selectedId = null;

  async function loadTerms() {
    try {
      allTerms = await api.get('/api/terms');
      renderList(allTerms);
    } catch (err) {
      showToast(err.message || 'Failed to load terms', 'error');
    }
  }

  function renderList(list) {
    const listEl = document.getElementById('term-list-items');
    document.getElementById('term-count').textContent = list.length;

    if (list.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          No terms found. Click "+ Add New Clause" to create.
        </div>
      `;
      return;
    }

    listEl.innerHTML = list.map(t => `
      <div class="split-pane-list-item ${selectedId === t.id ? 'selected' : ''}" data-id="${t.id}">
        <div style="font-weight: 700; font-size: 0.825rem; color: var(--foreground);">
          Clause #${t.id}
        </div>
        <div style="font-size: 0.75rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(t.termText)}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.split-pane-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        selectTerm(id);
      });
    });
  }

  function selectTerm(id) {
    selectedId = id;
    const t = allTerms.find(item => item.id === id);
    if (!t) return;

    document.getElementById('term-id').value = t.id;
    document.getElementById('term-text').value = t.termText || '';

    document.getElementById('form-title').textContent = `📄 EDIT CLAUSE #${t.id}`;
    document.getElementById('form-status-badge').textContent = 'Editing';
    document.getElementById('btn-delete-term').style.display = 'inline-block';

    renderList(allTerms);
  }

  function resetForm() {
    selectedId = null;
    document.getElementById('term-id').value = '';
    document.getElementById('term-form').reset();
    document.getElementById('form-title').textContent = '📄 TERMS & CONDITIONS RECORD';
    document.getElementById('form-status-badge').textContent = 'New Record';
    document.getElementById('btn-delete-term').style.display = 'none';
    renderList(allTerms);
    document.getElementById('term-text').focus();
  }

  document.getElementById('btn-add-term').addEventListener('click', resetForm);
  document.getElementById('btn-reset-term').addEventListener('click', resetForm);

  document.getElementById('search-term').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allTerms.filter(t => t.termText && t.termText.toLowerCase().includes(q));
    renderList(filtered);
  });

  document.getElementById('term-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('term-id').value;
    const payload = {
      termText: document.getElementById('term-text').value.trim(),
    };

    try {
      if (id) {
        await api.put(`/api/terms/${id}`, payload);
        showToast('Term clause updated successfully', 'success');
      } else {
        await api.post('/api/terms', payload);
        showToast('New term clause added successfully', 'success');
      }
      resetForm();
      await loadTerms();
    } catch (err) {
      showToast(err.message || 'Failed to save term clause', 'error');
    }
  });

  document.getElementById('btn-delete-term').addEventListener('click', async () => {
    if (!selectedId) return;
    if (!confirm('Are you sure you want to delete this clause?')) return;

    try {
      await api.del(`/api/terms/${selectedId}`);
      showToast('Clause deleted', 'success');
      resetForm();
      await loadTerms();
    } catch (err) {
      showToast(err.message || 'Failed to delete clause', 'error');
    }
  });

  await loadTerms();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
