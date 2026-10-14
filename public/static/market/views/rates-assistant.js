/**
 * GCC Marketplace — Agri Rates AI Assistant Prototype
 *
 * Provides real-time natural language mandi & spot rate queries
 * strictly grounded on approved pulse rates in PostgreSQL.
 */

import { toast } from '../lib/ui.js';

const AssistantIcons = {
  send: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  table: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polyline points="20 6 9 17 4 12"/></svg>`,
};

let allDailyRates = [];
let currentCommodityFilter = 'ALL';
let sessionId = 'session-' + Math.random().toString(36).substring(2, 9);

export async function renderRatesAssistant() {
  const container = document.getElementById('app');
  if (!container) return;

  container.innerHTML = `
    <style>
      .assistant-feed-container {
        max-width: 960px;
        margin: 0 auto;
        padding-top: 5rem;
        padding-bottom: 2rem;
      }
      .assistant-top-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
      }
      .assistant-chat-card {
        display: flex;
        flex-direction: column;
        height: 600px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--card);
        transform: none !important;
        transition: none !important;
      }
      .assistant-chat-card:hover {
        transform: none !important;
      }
      .rates-desktop-table {
        display: table;
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
        text-align: left;
      }
      .rates-mobile-cards {
        display: none;
      }
      #rates-modal-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 100;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      #rates-modal-container {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        width: 920px;
        max-width: calc(100vw - 2rem);
        height: 640px;
        max-height: calc(100vh - 3rem);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: var(--shadow-xl);
      }
      @media (max-width: 640px) {
        html, body {
          overflow: hidden !important;
          height: 100dvh !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #app {
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100vw !important;
          height: 100dvh !important;
          overflow: hidden !important;
        }
        .assistant-feed-container {
          padding: 0 !important;
          margin: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100dvh !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .assistant-top-section {
          flex-shrink: 0 !important;
          margin-bottom: 0 !important;
          padding: 4.5rem 0.65rem 0.4rem !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          gap: 0.35rem !important;
        }
        .assistant-top-subtitle {
          display: none !important;
        }
        .assistant-top-title {
          font-size: 1.05rem !important;
          line-height: 1.15 !important;
          margin: 0.1rem 0 0 !important;
        }
        #btn-view-all-rates {
          padding: 0.35rem 0.65rem !important;
          font-size: 0.8rem !important;
          height: 32px !important;
          flex-shrink: 0 !important;
          margin-bottom: 0 !important;
        }
        .assistant-chat-card {
          flex: 1 !important;
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          width: 100vw !important;
          max-width: 100vw !important;
          border-radius: 0 !important;
          border-left: none !important;
          border-right: none !important;
          border-bottom: none !important;
          border-top: 1px solid var(--border) !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }
        #assistant-messages {
          flex: 1 !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 0.75rem !important;
        }
        .assistant-input-bar {
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)) !important;
        }
        .rates-desktop-table {
          display: none !important;
        }
        .rates-mobile-cards {
          display: flex !important;
          flex-direction: column;
          gap: 0.6rem;
        }
        #rates-modal-overlay {
          padding: 0 !important;
        }
        #rates-modal-container {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100dvh !important;
          max-height: 100dvh !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .modal-header-container {
          padding: 0.75rem 0.85rem !important;
        }
        .modal-header-actions {
          gap: 0.35rem !important;
        }
      }
    </style>

    <section class="mkt-feed assistant-feed-container">
      <!-- Top Section (Fits into 20% VH on mobile) -->
      <div class="assistant-top-section">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.15rem;">
            <span class="mkt-badge mkt-badge-verified" style="display: inline-flex; align-items: center; gap: 0.3rem;">
              ${AssistantIcons.check} BROKER VERIFIED
            </span>
            <span style="font-size: 0.78rem; color: var(--muted-foreground);" id="assistant-rate-count">
              Loading live rates...
            </span>
          </div>
          <h1 class="assistant-top-title" style="font-size: clamp(1.3rem, 3.5vw, 2rem); font-weight: 800; letter-spacing: -0.02em; margin: 0;">
            Mandi Rates AI Assistant
          </h1>
          <p class="mkt-muted assistant-top-subtitle" style="margin: 0.15rem 0 0; font-size: 0.86rem;">
            Ask questions in English or Hindi regarding today's spot quotes for Toor, Moong, Urad, Chana across Indian mandis.
          </p>
        </div>

        <!-- View All Rates Button -->
        <button 
          id="btn-view-all-rates" 
          class="mkt-btn-ghost" 
          title="View complete pulse rate table" 
          type="button" 
          style="width: 100%; padding: 0.55rem 1.25rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; font-size: 0.86rem; border: 1px solid var(--border); border-radius: var(--radius-base); background: var(--card); cursor: pointer;"
        >
          ${AssistantIcons.table} <span>View All Pulse Rates</span>
        </button>
      </div>

      <!-- Chat Container (Takes 80% VH on mobile, borders flush to viewport edges) -->
      <div class="mkt-card mkt-card-static assistant-chat-card">
        <!-- Messages Area -->
        <div id="assistant-messages" style="flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem;">
          <!-- Welcome Message with Simple Single-Word Suggestions INSIDE (No logo, no copy button) -->
          <div class="assistant-msg-bot" style="width: 100%; max-width: 100%;">
            <div style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.95rem 1.1rem; font-size: 0.88rem; line-height: 1.5; color: var(--foreground); box-shadow: var(--shadow-sm); width: 100%; box-sizing: border-box;">
              <p style="margin: 0 0 0.35rem; font-weight: 700; color: var(--foreground); font-size: 0.92rem;">
                Namaste! Welcome to Ganesh Canvassing Rates Desk.
              </p>
              <p style="margin: 0 0 0.75rem; color: var(--muted-foreground); font-size: 0.85rem;">
                All rates quoted here are live spot quotes verified by our trading desk. Select a commodity or ask any mandi price:
              </p>

              <!-- Simple 1-word Suggestions -->
              <div style="border-top: 1px solid var(--border); padding-top: 0.65rem;">
                <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); font-weight: 700; margin-bottom: 0.45rem;">
                  Quick Commodities
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                  <button class="assistant-chip mkt-btn-ghost" data-query="Toor" style="padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600;">Toor</button>
                  <button class="assistant-chip mkt-btn-ghost" data-query="Moong" style="padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600;">Moong</button>
                  <button class="assistant-chip mkt-btn-ghost" data-query="Urad" style="padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600;">Urad</button>
                  <button class="assistant-chip mkt-btn-ghost" data-query="Chana" style="padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600;">Chana</button>
                  <button class="assistant-chip mkt-btn-ghost" data-query="Masoor" style="padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600;">Masoor</button>
                  <button class="assistant-chip mkt-btn-ghost" data-query="Peas" style="padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600;">Peas</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Bar: Input + Ask Button (Non-shrinking on mobile) -->
        <div class="assistant-input-bar" style="border-top: 1px solid var(--border); padding: 0.75rem 1rem; background: var(--background); display: flex; gap: 0.5rem; align-items: center; box-sizing: border-box; flex-shrink: 0;">
          <input 
            type="text" 
            id="assistant-input" 
            placeholder="Ask pulse rates in English or Hindi..."
            style="flex: 1; min-width: 0; padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-base); background: var(--input); color: var(--foreground); font-size: 0.9rem; font-family: inherit;"
          />
          <button 
            id="assistant-send-btn" 
            class="mkt-btn" 
            type="button" 
            style="flex-shrink: 0; min-width: 78px; padding: 0.65rem 1rem; gap: 0.4rem; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"
          >
            <span style="display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 16px; height: 16px;">
              ${AssistantIcons.send}
            </span>
            <span>Ask</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Modal for Tabular Rates with Mobile-Friendly Card Fallback -->
    <div id="rates-modal-overlay">
      <div id="rates-modal-container">
        
        <!-- Modal Header -->
        <div class="modal-header-container" style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.1rem; border-bottom: 1px solid var(--border); background: var(--card); flex-shrink: 0; gap: 0.75rem;">
          <div style="min-width: 0; flex: 1;">
            <h2 style="font-size: 1.05rem; font-weight: 800; margin: 0; color: var(--foreground); letter-spacing: -0.01em; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Verified Pulses Rates
            </h2>
            <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem; font-size: 0.76rem; color: var(--muted-foreground); flex-wrap: wrap;">
              <span class="mkt-badge mkt-badge-verified" style="font-size: 0.65rem; padding: 0.12rem 0.42rem; font-weight: 700; flex-shrink: 0;">LIVE</span>
              <span id="modal-last-updated-text" style="white-space: nowrap;">Loading update time...</span>
            </div>
          </div>

          <div class="modal-header-actions" style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
            <button id="modal-btn-copy" class="mkt-btn-ghost" title="Copy all rates to clipboard" style="padding: 0.4rem 0.65rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid var(--border); border-radius: var(--radius-base); cursor: pointer;">
              ${AssistantIcons.copy} <span>Copy</span>
            </button>
            <button id="modal-btn-close" class="mkt-btn-ghost" title="Close" style="padding: 0.4rem; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-base); cursor: pointer;">
              ${AssistantIcons.close}
            </button>
          </div>
        </div>

        <!-- Filter Chips Bar inside Modal -->
        <div id="modal-filter-chips" style="padding: 0.55rem 1.1rem; border-bottom: 1px solid var(--border); background: var(--faint); display: flex; gap: 0.35rem; overflow-x: auto; white-space: nowrap; flex-shrink: 0;">
          <!-- Dynamically populated -->
        </div>

        <!-- Table Container (Desktop 6-col Table + Mobile Card Fallback) -->
        <div style="flex: 1; overflow-y: auto; padding: 0.75rem 1.1rem;">
          <!-- Desktop Table -->
          <table class="rates-desktop-table">
            <thead>
              <tr style="border-bottom: 2px solid var(--border); color: var(--muted-foreground); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">
                <th style="padding: 0.6rem 0.75rem;">Commodity</th>
                <th style="padding: 0.6rem 0.75rem;">Variety</th>
                <th style="padding: 0.6rem 0.75rem;">Center / Mandi</th>
                <th style="padding: 0.6rem 0.75rem;">Rate (Rs. / QTL)</th>
                <th style="padding: 0.6rem 0.75rem;">Delivery Terms</th>
                <th style="padding: 0.6rem 0.75rem;">Trend</th>
              </tr>
            </thead>
            <tbody id="modal-rates-tbody">
              <!-- Dynamically populated -->
            </tbody>
          </table>

          <!-- Mobile Cards Container (100% viewport width, zero horizontal scroll) -->
          <div id="modal-rates-mobile-cards" class="rates-mobile-cards">
            <!-- Dynamically populated for mobile -->
          </div>
        </div>

        <!-- Modal Footer -->
        <div style="padding: 0.65rem 1.1rem; border-top: 1px solid var(--border); background: var(--faint); display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--muted-foreground); flex-shrink: 0;">
          <span>All quotes per 100 kg (Quintal).</span>
          <button id="modal-btn-close-bottom" class="mkt-btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.78rem;">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const inputEl = document.getElementById('assistant-input');
  const sendBtn = document.getElementById('assistant-send-btn');
  const viewAllBtn = document.getElementById('btn-view-all-rates');
  const modalOverlay = document.getElementById('rates-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-btn-close');
  const modalCloseBottomBtn = document.getElementById('modal-btn-close-bottom');
  const modalCopyBtn = document.getElementById('modal-btn-copy');

  sendBtn?.addEventListener('click', () => handleSend());
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Modal open / close handlers
  viewAllBtn?.addEventListener('click', () => openRatesModal());
  modalCloseBtn?.addEventListener('click', () => closeRatesModal());
  modalCloseBottomBtn?.addEventListener('click', () => closeRatesModal());
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeRatesModal();
  });

  // Copy button inside modal
  modalCopyBtn?.addEventListener('click', () => copyRatesText());

  // Setup prompt chips inside chat
  document.querySelectorAll('.assistant-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-query');
      if (query && inputEl) {
        inputEl.value = query;
        handleSend();
      }
    });
  });

  // Keyboard escape listener for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRatesModal();
  });

  // Load initial rates
  await loadDailyRates();
}

function getLastUpdatedFormatted() {
  let latestTs = null;
  for (const r of allDailyRates) {
    if (r.updated_at) {
      const ts = new Date(r.updated_at).getTime();
      if (!latestTs || ts > latestTs) latestTs = ts;
    }
  }
  const dateObj = latestTs ? new Date(latestTs) : new Date();
  const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const todayStr = new Date().toDateString();
  const isToday = dateObj.toDateString() === todayStr;

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  const dateFormatted = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${dateFormatted}, ${timeStr}`;
}

function updateLastUpdatedDisplay() {
  const el = document.getElementById('modal-last-updated-text');
  if (el) {
    el.textContent = `Last updated at ${getLastUpdatedFormatted()}`;
  }
}

function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const originalHtml = btnElement.innerHTML;
      btnElement.innerHTML = `${AssistantIcons.check} <span>Copied</span>`;
      btnElement.style.color = 'var(--primary)';
      setTimeout(() => {
        btnElement.innerHTML = originalHtml;
        btnElement.style.color = '';
      }, 2000);
    }
    toast('Copied to clipboard!', 'info');
  }).catch(() => {
    toast('Failed to copy to clipboard', 'danger');
  });
}

async function loadDailyRates() {
  const countLabel = document.getElementById('assistant-rate-count');

  try {
    const res = await fetch('/api/market/assistant/rates');
    const data = await res.json();
    if (data.success && Array.isArray(data.rates)) {
      allDailyRates = data.rates;

      if (countLabel) {
        countLabel.textContent = `${allDailyRates.length} Verified Rates Online`;
      }
      updateLastUpdatedDisplay();
    }
  } catch (err) {
    console.warn('Failed to load rates:', err);
  }
}

function openRatesModal() {
  const modalOverlay = document.getElementById('rates-modal-overlay');
  if (!modalOverlay) return;
  modalOverlay.style.display = 'flex';
  updateLastUpdatedDisplay();
  renderModalFilters();
  renderModalTable();
}

function closeRatesModal() {
  const modalOverlay = document.getElementById('rates-modal-overlay');
  if (modalOverlay) modalOverlay.style.display = 'none';
}

function renderModalFilters() {
  const container = document.getElementById('modal-filter-chips');
  if (!container) return;

  const commodities = ['ALL', ...new Set(allDailyRates.map(r => r.commodity_name.toUpperCase()))];
  container.innerHTML = commodities.map(c => {
    const count = c === 'ALL' ? allDailyRates.length : allDailyRates.filter(r => r.commodity_name.toUpperCase() === c).length;
    const isActive = currentCommodityFilter === c;
    const activeStyle = isActive
      ? 'background: var(--primary); color: var(--primary-foreground); border-color: var(--primary);'
      : 'background: transparent; color: var(--foreground);';

    return `
      <button class="mkt-btn-ghost filter-chip" data-filter="${c}" style="padding: 0.3rem 0.7rem; font-size: 0.76rem; border-radius: var(--radius-full); ${activeStyle}">
        ${c === 'ALL' ? 'All Pulses' : c} (${count})
      </button>
    `;
  }).join('');

  container.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCommodityFilter = btn.getAttribute('data-filter') || 'ALL';
      renderModalFilters();
      renderModalTable();
    });
  });
}

function renderModalTable() {
  const tbody = document.getElementById('modal-rates-tbody');
  const mobileCardsEl = document.getElementById('modal-rates-mobile-cards');
  if (!tbody || !mobileCardsEl) return;

  const filtered = currentCommodityFilter === 'ALL'
    ? allDailyRates
    : allDailyRates.filter(r => r.commodity_name.toUpperCase() === currentCommodityFilter);

  if (filtered.length === 0) {
    const emptyMsg = `
      <div style="padding: 2rem; text-align: center; color: var(--muted-foreground);">
        No verified rates recorded for this filter today.
      </div>
    `;
    tbody.innerHTML = `<tr><td colspan="6">${emptyMsg}</td></tr>`;
    mobileCardsEl.innerHTML = emptyMsg;
    return;
  }

  // 1. Desktop Table Rows
  tbody.innerHTML = filtered.map(r => `
    <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s ease;">
      <td style="padding: 0.75rem; font-weight: 700; color: var(--primary);">
        ${escapeHtml(r.commodity_name)}
      </td>
      <td style="padding: 0.75rem; color: var(--foreground); font-weight: 500;">
        ${escapeHtml(r.variety)}
      </td>
      <td style="padding: 0.75rem; color: var(--foreground);">
        <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
          ${AssistantIcons.pin} ${escapeHtml(r.location_name)}
        </span>
      </td>
      <td style="padding: 0.75rem; font-weight: 700; color: var(--foreground); white-space: nowrap;">
        Rs. ${Number(r.min_price).toLocaleString()} - ${Number(r.max_price).toLocaleString()}
      </td>
      <td style="padding: 0.75rem; color: var(--muted-foreground); font-size: 0.8rem;">
        ${escapeHtml(r.delivery_condition)}
      </td>
      <td style="padding: 0.75rem;">
        <span class="mkt-badge mkt-badge-verified" style="font-size: 0.7rem;">
          ${escapeHtml(r.trend || 'STEADY')}
        </span>
      </td>
    </tr>
  `).join('');

  // 2. Mobile Responsive Rate Cards (Zero horizontal scroll)
  mobileCardsEl.innerHTML = filtered.map(r => `
    <div style="border: 1px solid var(--border); background: var(--card); border-radius: 6px; padding: 0.7rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem; box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="font-weight: 800; color: var(--primary); font-size: 0.9rem;">
            ${escapeHtml(r.commodity_name)}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 0.2rem; font-weight: 600; color: var(--foreground); font-size: 0.82rem;">
            ${AssistantIcons.pin} ${escapeHtml(r.location_name)}
          </span>
        </div>
        <span class="mkt-badge mkt-badge-verified" style="font-size: 0.65rem;">
          ${escapeHtml(r.trend || 'STEADY')}
        </span>
      </div>

      <div style="color: var(--foreground); font-size: 0.82rem; font-weight: 500;">
        ${escapeHtml(r.variety)}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.2rem; border-top: 1px dashed var(--border); padding-top: 0.35rem;">
        <span style="font-size: 0.95rem; font-weight: 800; color: var(--foreground);">
          Rs. ${Number(r.min_price).toLocaleString()} - ${Number(r.max_price).toLocaleString()}
          <span style="font-size: 0.72rem; font-weight: 500; color: var(--muted-foreground);">/ ${escapeHtml(r.price_unit)}</span>
        </span>
        <span style="font-size: 0.74rem; color: var(--muted-foreground); text-align: right;">
          ${escapeHtml(r.delivery_condition)}
        </span>
      </div>
    </div>
  `).join('');
}

function generateRatesText() {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let text = `GANESH CANVASSING COMPANY\nDaily Pulses Spot Rates — ${today}\n\n`;

  const groups = {};
  for (const r of allDailyRates) {
    const cName = r.commodity_name.toUpperCase();
    if (!groups[cName]) groups[cName] = [];
    groups[cName].push(r);
  }

  for (const [comm, list] of Object.entries(groups)) {
    text += `*${comm}:*\n`;
    for (const item of list) {
      text += `- ${item.location_name} (${item.variety}): Rs. ${Number(item.min_price).toLocaleString()} - ${Number(item.max_price).toLocaleString()} / QTL [${item.delivery_condition}] (${item.trend || 'STEADY'})\n`;
    }
    text += '\n';
  }

  text += `Verified by Broker Trading Desk.\nSubject to mandi arrivals.`;
  return text;
}

function formatChatbotCopyText(rawText, matchedRates = []) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // 1. If we have structured matchedRates, build high-fidelity clean spot quote text directly
  if (matchedRates && matchedRates.length > 0) {
    let text = `GANESH CANVASSING COMPANY\nDaily Pulses Spot Rates — ${today}\n\n`;
    const groups = {};
    for (const r of matchedRates) {
      const cName = (r.commodity_name || 'PULSES').toUpperCase();
      if (!groups[cName]) groups[cName] = [];
      groups[cName].push(r);
    }
    for (const [comm, list] of Object.entries(groups)) {
      text += `*${comm}:*\n`;
      for (const item of list) {
        const loc = item.location_name || '';
        const variety = item.variety ? ` (${item.variety})` : '';
        const minP = Number(item.min_price).toLocaleString();
        const maxP = Number(item.max_price).toLocaleString();
        const unit = item.price_unit || 'QTL';
        const delivery = item.delivery_condition ? ` [${item.delivery_condition}]` : '';
        const trend = item.trend ? ` (${item.trend})` : '';
        text += `- ${loc}${variety}: Rs. ${minP} - ${maxP} / ${unit}${delivery}${trend}\n`;
      }
      text += '\n';
    }
    text += `Verified by Broker Trading Desk.`;
    return text.trim();
  }

  // 2. If no matchedRates array (or text-only response), clean redundant conversational fluff
  let cleaned = rawText
    .replace(/^(Namaste!?|Hello!?|Hey!?|Greetings!?|Pranam!?)[^\n.]*[.!:]?\s*/i, '')
    .replace(/(Would you like delivery specifications|Contact broker desk|Kya aapko kisi specific|Agar aapko quote chahiye|Please share your contact)[^]*$/i, '')
    .trim();

  if (!cleaned) cleaned = rawText.trim();

  let text = `GANESH CANVASSING COMPANY\nDaily Pulses Spot Rates — ${today}\n\n`;
  text += cleaned;
  text += `\n\nVerified by Broker Trading Desk.`;
  return text.trim();
}

function copyRatesText() {
  const text = generateRatesText();
  const copyBtn = document.getElementById('modal-btn-copy');
  copyToClipboard(text, copyBtn);
}

async function handleSend() {
  const inputEl = document.getElementById('assistant-input');
  const sendBtn = document.getElementById('assistant-send-btn');
  const messagesEl = document.getElementById('assistant-messages');
  if (!inputEl || !messagesEl) return;

  const query = inputEl.value.trim();
  if (!query) return;

  // Render User Message
  inputEl.value = '';
  appendUserMessage(query);

  // Render Loading Indicator
  const loadingId = 'loading-' + Date.now();
  appendLoadingMessage(loadingId);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch('/api/market/assistant/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        sessionId,
      })
    });

    const data = await res.json();
    removeMessage(loadingId);

    if (data.success) {
      appendBotResponse(data.response, data.matchedRates, data.isEscalated);
    } else {
      appendBotResponse('Sorry, an error occurred while checking rates: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    removeMessage(loadingId);
    appendBotResponse('Connection error. Please verify your network.');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

function appendUserMessage(text) {
  const messagesEl = document.getElementById('assistant-messages');
  if (!messagesEl) return;

  const el = document.createElement('div');
  el.style.display = 'flex';
  el.style.justifyContent = 'flex-end';
  el.style.gap = '0.75rem';
  el.innerHTML = `
    <div style="background: var(--primary); color: var(--primary-foreground); border-radius: 8px; padding: 0.75rem 1rem; max-width: 80%; font-size: 0.88rem; line-height: 1.4;">
      ${escapeHtml(text)}
    </div>
  `;
  messagesEl.appendChild(el);
}

function appendLoadingMessage(id) {
  const messagesEl = document.getElementById('assistant-messages');
  if (!messagesEl) return;

  const el = document.createElement('div');
  el.id = id;
  el.style.display = 'flex';
  el.style.width = '100%';
  el.innerHTML = `
    <div style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; color: var(--muted-foreground); font-size: 0.85rem; box-shadow: var(--shadow-sm); width: 100%; box-sizing: border-box;">
      Checking verified spot rates...
    </div>
  `;
  messagesEl.appendChild(el);
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendBotResponse(text, matchedRates = [], isEscalated = false) {
  const messagesEl = document.getElementById('assistant-messages');
  if (!messagesEl) return;

  // Format matched rate cards if available
  let rateCardsHtml = '';
  if (matchedRates && matchedRates.length > 0) {
    rateCardsHtml = `
      <div style="margin-top: 0.75rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
        ${matchedRates.map(r => `
          <div style="border: 1px solid var(--border); background: var(--faint); border-radius: 6px; padding: 0.65rem 0.8rem; font-size: 0.82rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <span style="font-weight: 700; color: var(--primary);">${escapeHtml(r.commodity_name)}</span>
              <span class="mkt-badge mkt-badge-verified">${escapeHtml(r.trend || 'STEADY')}</span>
            </div>
            <div style="color: var(--muted-foreground); font-size: 0.76rem; margin-bottom: 0.35rem;">
              ${escapeHtml(r.variety)}
            </div>
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--foreground); margin-bottom: 0.25rem;">
              Rs. ${Number(r.min_price).toLocaleString()} - ${Number(r.max_price).toLocaleString()} <span style="font-size: 0.7rem; font-weight: 500; color: var(--muted-foreground);">/ ${escapeHtml(r.price_unit)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.74rem; color: var(--muted-foreground);">
              ${AssistantIcons.pin} ${escapeHtml(r.location_name)} &bull; ${escapeHtml(r.delivery_condition)}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  let escalationNoticeHtml = '';
  if (isEscalated) {
    escalationNoticeHtml = `
      <div style="margin-top: 0.75rem; padding: 0.65rem 0.85rem; border: 1px dashed var(--warning); border-radius: 6px; background: color-mix(in srgb, var(--warning) 8%, transparent); font-size: 0.8rem; color: var(--foreground);">
        <strong>Trade Desk Inquiry Flagged:</strong> Our trading desk has received notification of this sauda requirement. Contact broker desk for immediate booking.
      </div>
    `;
  }

  const el = document.createElement('div');
  el.className = 'assistant-msg-bot';
  el.style.width = '100%';
  el.style.maxWidth = '100%';
  el.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 100%;">
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.88rem; line-height: 1.5; color: var(--foreground); box-shadow: var(--shadow-sm); width: 100%; box-sizing: border-box;">
        <div style="white-space: pre-wrap; color: var(--foreground);">${escapeHtml(text)}</div>
        ${rateCardsHtml}
        ${escalationNoticeHtml}
      </div>

      <!-- Action button below the message -->
      <div style="display: flex; align-items: center; gap: 0.4rem; padding-left: 0.15rem;">
        <button 
          type="button" 
          class="assistant-msg-copy-btn mkt-btn-ghost" 
          title="Copy message" 
          style="padding: 0.2rem 0.55rem; font-size: 0.74rem; display: inline-flex; align-items: center; gap: 0.3rem; color: var(--muted-foreground); border: 1px solid var(--border); border-radius: var(--radius-base); background: var(--card); cursor: pointer;"
        >
          ${AssistantIcons.copy} <span>Copy</span>
        </button>
      </div>
    </div>
  `;

  const copyBtn = el.querySelector('.assistant-msg-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const copyContent = formatChatbotCopyText(text, matchedRates);
      copyToClipboard(copyContent, copyBtn);
    });
  }

  messagesEl.appendChild(el);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
