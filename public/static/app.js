/**
 * Soft Sauda ERP — Main Application Controller
 * 
 * Orchestrates:
 * - SPA routing via tinyrouter.js
 * - Auth guard (check JWT before rendering views)
 * - Theme toggle (dark/light)
 * - Sidebar navigation highlighting
 */

import { renderDashboard } from './views/dashboard.js';
import { renderLogin } from './views/login.js';
import { renderPartyList, renderPartyForm } from './views/parties.js';
import { renderCommodityList, renderCommodityForm } from './views/commodities.js';
import { renderContractList, renderContractForm } from './views/contracts.js';
import { renderDeliveryList, renderDeliveryForm } from './views/deliveries.js';
import { renderBillList, renderBillForm } from './views/bills.js';
import { renderPaymentList, renderPaymentForm } from './views/payments.js';
import { renderLedgerList, renderLedgerForm } from './views/ledger.js';
import { renderCityList, renderCityForm } from './views/cities.js';
import { renderBatchBilling } from './views/batch_billing.js';
import { renderPaymentOutstanding } from './views/payment_outstanding.js';
import { renderUserList, renderUserForm, renderAuditLogs } from './views/admin.js';
import { renderAnalytics } from './views/analytics.js';
import { isAuthenticated, clearAuth, triggerWarmup, clientCache, get as apiGet } from './lib/api.js';
import { Icons, showToast } from './components/ui.js';
import tinyrouter from './vendor/tinyrouter.js';

/* ── Force Clear Rogue Service Workers & Cache (Bypasses old caching on dev port 3000) ── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().then(success => {
        if (success) {
          console.log('Unregistered service worker successfully');
          if (window.caches) {
            caches.keys().then(names => {
              for (const name of names) caches.delete(name);
            });
          }
          window.location.reload();
        }
      });
    }
  });
}

/* ── Auth Guards ── */
function requireAuth(handler) {
  return function (ctx) {
    if (!isAuthenticated()) {
      renderLogin();
      return;
    }
    // Check if company and fiscal year are selected!
    if (!sessionStorage.getItem('active_company_id')) {
      renderCompanySelector();
      return;
    }
    // Remove login mode — sidebar reappears via CSS
    document.body.removeAttribute('data-page');
    // Ensure header/topbar has correct company name & fiscal year!
    updateHeaderWithActiveContext();
    handler(ctx);
  };
}

function requireAdmin(handler) {
  return requireAuth((ctx) => {
    if (localStorage.getItem('ss_role') !== 'ADMIN') {
      showToast('Access denied: Administrator privilege required', 'error');
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    handler(ctx);
  });
}

/* ── Company Selector View ── */
function renderCompanySelector() {
  document.body.setAttribute('data-page', 'company-selector');

  const app = document.getElementById('app');
  const companies = JSON.parse(localStorage.getItem('ss_companies') || '[]');
  const displayName = localStorage.getItem('ss_display_name') || localStorage.getItem('ss_user') || 'User';

  const cardsHtml = companies.map(comp => {
    const currentFy = comp.fiscalYears.find(fy => fy.isCurrent) || comp.fiscalYears[0];
    
    const fyOptions = comp.fiscalYears.map(fy => `
      <option value="${fy.id}" ${fy.id === currentFy?.id ? 'selected' : ''}>
        ${fy.label}${fy.isLocked ? ' 🔒' : ''}
      </option>
    `).join('');

    let icon = '🌾';
    if (comp.shortCode === 'SOYBEAN') icon = '🌻';
    else if (comp.shortCode === 'OIL') icon = '🫒';
    else if (comp.shortCode === 'MAFI') icon = '🏭';

    return `
      <div class="company-card card" data-id="${comp.id}" style="padding: 1.5rem; text-align: center;">
        <div class="card-icon" style="font-size: 2.5rem; margin-bottom: 0.75rem;">${icon}</div>
        <h3 style="margin-bottom: 0.5rem; font-weight: 700;">${comp.name}</h3>
        <p style="font-size: 0.8rem; color: var(--muted-foreground); margin-bottom: 1.25rem; min-height: 38px; line-height: 1.3;">
          ${comp.description || 'Access and manage transactions, deliveries, and ledgers.'}
        </p>
        
        <div class="form-group" style="margin-bottom: 1rem; text-align: left;">
          <label style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground);">Fiscal Year</label>
          <select class="select-fy" style="width: 100%; margin-top: 0.25rem; padding: 0.35rem 0.5rem; font-size: 0.85rem;">
            ${fyOptions}
          </select>
        </div>

        <button class="primary enter-workspace-btn" style="width: 100%; padding: 0.5rem 1rem;">
          Enter Workspace
        </button>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    <div class="company-selector-page" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 2rem; max-width: 1200px; margin: 0 auto;">
      <div style="margin-bottom: 2.5rem; text-align: center;">
        <h1 style="font-weight: 800; font-size: 2.25rem; letter-spacing: -0.03em; margin-bottom: 0.5rem; color: var(--primary);">
          Select Workspace
        </h1>
        <p style="color: var(--muted-foreground); font-size: 0.95rem;">
          Welcome back, <strong>${displayName}</strong>. Please select a division and fiscal year.
        </p>
      </div>

      <div class="company-grid">
        ${cardsHtml}
      </div>
      
      <a href="#" id="company-selector-logout" style="margin-top: 3rem; font-size: 0.85rem; color: var(--muted-foreground); text-decoration: underline;">
        Sign out
      </a>
    </div>
  `;

  // Bind enter workspace buttons
  app.querySelectorAll('.company-card').forEach(card => {
    const compId = parseInt(card.getAttribute('data-id'), 10);
    const company = companies.find(c => c.id === compId);
    
    card.querySelector('.enter-workspace-btn').addEventListener('click', async (e) => {
      const selectFy = card.querySelector('.select-fy');
      const fyId = parseInt(selectFy.value, 10);
      const fy = company.fiscalYears.find(f => f.id === fyId);
      
      sessionStorage.setItem('active_company_id', company.id);
      sessionStorage.setItem('active_company_name', company.name);
      sessionStorage.setItem('active_company_code', company.shortCode);
      sessionStorage.setItem('active_fiscal_year_id', fy.id);
      sessionStorage.setItem('active_fiscal_year_label', fy.label);

      // Clear any cached mega payload
      sessionStorage.removeItem('gcc_mega_payload');
      clientCache.clear();

      // Show loader overlay
      app.innerHTML = `
        <div class="warmup-overlay">
          <img src="/gcc-logo.svg" alt="Soft Sauda" onerror="this.style.display='none'">
          <div class="warmup-overlay-title">Soft Sauda</div>
          <div class="warmup-overlay-sub">Preparing ${company.name} workspace…</div>
          <div class="warmup-overlay-track"><div class="warmup-overlay-bar"></div></div>
        </div>
      `;

      try {
        await triggerWarmup({ forceRefresh: true });
        document.body.removeAttribute('data-page');
        showToast(`Entered ${company.name} workspace`, 'success');
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        showToast(err.message, 'error');
        renderCompanySelector();
      }
    });
  });

  // Bind sign out link
  document.getElementById('company-selector-logout').addEventListener('click', (e) => {
    e.preventDefault();
    clearAuth();
    window.location.href = '/login';
  });
}

/* ── Update Header Context ── */
function updateHeaderWithActiveContext() {
  const companyName = sessionStorage.getItem('active_company_name') || 'No Company';
  const role = localStorage.getItem('ss_role') || 'EMPLOYEE';
  const displayName = localStorage.getItem('ss_display_name') || localStorage.getItem('ss_user') || 'User';

  // 1. Update brand area to show company name (making logo + name clickable to switch)
  const brandEl = document.querySelector('.topbar-brand');
  if (brandEl && !brandEl.querySelector('.company-badge')) {
    brandEl.innerHTML = `
      <div id="company-badge-switch" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;user-select:none;" title="Click to switch company">
        <img src="/gcc-logo.svg" alt="GCC Logo" style="height:28px;border-radius:4px">
        <span class="company-badge" style="font-weight:700;font-size:1.05rem;color:var(--primary);margin-left:0.25rem;display:flex;align-items:center;gap:0.25rem;transition:opacity 0.2s;">
          ${companyName}
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </div>
    `;
    
    // Bind click event to the company badge switch area
    document.getElementById('company-badge-switch')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sessionStorage.removeItem('active_company_id');
      sessionStorage.removeItem('active_company_name');
      sessionStorage.removeItem('active_company_code');
      sessionStorage.removeItem('active_fiscal_year_id');
      sessionStorage.removeItem('active_fiscal_year_label');
      sessionStorage.removeItem('gcc_mega_payload');
      clientCache.clear();
      window.location.reload();
    });
  }

  // 2. Add or update fiscal year dropdown in topbar actions
  const actionsEl = document.querySelector('.topbar-actions');
  if (actionsEl) {
    let picker = document.getElementById('header-fy-picker');
    if (!picker) {
      picker = document.createElement('div');
      picker.id = 'header-fy-picker';
      picker.style.marginRight = '0.75rem';
      const themeToggle = document.getElementById('theme-toggle');
      actionsEl.insertBefore(picker, themeToggle);
    }
    
    const companies = JSON.parse(localStorage.getItem('ss_companies') || '[]');
    const activeCompanyId = parseInt(sessionStorage.getItem('active_company_id') || '0', 10);
    const activeCompany = companies.find(c => c.id === activeCompanyId);
    
    if (activeCompany && activeCompany.fiscalYears) {
      const activeFyId = parseInt(sessionStorage.getItem('active_fiscal_year_id') || '0', 10);
      
      const optionsHtml = activeCompany.fiscalYears.map(fy => `
        <option value="${fy.id}" ${fy.id === activeFyId ? 'selected' : ''}>
          ${fy.label}${fy.isLocked ? ' 🔒' : ''}
        </option>
      `).join('');
      
      picker.innerHTML = `
        <select class="select-sm" style="font-weight:600;font-size:0.8rem;padding:0.25rem 0.5rem;border-color:var(--border);background:var(--card);color:var(--foreground);border-radius:var(--radius-base);" id="header-fy-select">
          ${optionsHtml}
        </select>
      `;
      
      document.getElementById('header-fy-select').addEventListener('change', async (e) => {
        const newFyId = parseInt(e.target.value, 10);
        const newFy = activeCompany.fiscalYears.find(fy => fy.id === newFyId);
        if (newFy) {
          sessionStorage.setItem('active_fiscal_year_id', newFy.id);
          sessionStorage.setItem('active_fiscal_year_label', newFy.label);
          sessionStorage.removeItem('gcc_mega_payload');
          clientCache.clear();
          
          const app = document.getElementById('app');
          app.innerHTML = `
            <div class="warmup-overlay">
              <div class="warmup-overlay-title">Soft Sauda</div>
              <div class="warmup-overlay-sub">Switching to ${newFy.label}…</div>
              <div class="warmup-overlay-track"><div class="warmup-overlay-bar"></div></div>
            </div>
          `;
          await triggerWarmup({ forceRefresh: true });
          window.location.reload();
        }
      });
    }
  }

  // 3. Update or add user display badge in topbar-actions
  let userBadge = document.getElementById('header-user-badge');
  if (actionsEl && !userBadge) {
    userBadge = document.createElement('div');
    userBadge.id = 'header-user-badge';
    userBadge.style.marginRight = '0.75rem';
    userBadge.style.display = 'flex';
    userBadge.style.alignItems = 'center';
    userBadge.style.gap = '0.25rem';
    userBadge.style.fontSize = '0.75rem';
    userBadge.style.fontWeight = '600';
    userBadge.style.border = '1px solid var(--border)';
    userBadge.style.padding = '0.25rem 0.5rem';
    userBadge.style.borderRadius = 'var(--radius-base)';
    userBadge.style.background = 'var(--card)';
    const themeToggle = document.getElementById('theme-toggle');
    actionsEl.insertBefore(userBadge, themeToggle);
  }
  if (userBadge) {
    const badgeColor = role === 'ADMIN' ? 'var(--primary)' : 'var(--muted-foreground)';
    userBadge.style.color = badgeColor;
    userBadge.style.borderColor = role === 'ADMIN' ? 'var(--primary)' : 'var(--border)';
    userBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>${displayName}</span>
    `;
  }

  // 4. Render the dynamic Analytics & Admin dropdown
  renderAnalyticsAdminMenu();
  // 5. Render the Commodities & Cities masters dropdown
  renderMasterMenu();
  // 6. Render the Contracts / Deliveries / Bills / Payments dropdown
  renderTransactionsMenu();
  // 7. Render the Ledger & Outstanding dropdown
  renderLedgerMenu();
}



/* ── Route Handlers ── */
function handleNotFound(ctx) {
  const app = document.getElementById('app');
  app.innerHTML = `<div style="padding:3rem;text-align:center">
    <h1 style="font-size:3rem;color:var(--muted-foreground);margin-bottom:1rem">404</h1>
    <p style="color:var(--muted-foreground)">Page not found</p>
    <a href="/" data-route><button class="primary" style="margin-top:1rem">Go Home</button></a>
  </div>`;
}

/* ── Initialize Router ── */
function initRouter() {
  const r = tinyrouter.new({
    defaultHandler: handleNotFound,
  });

  // Dashboard
  r.on('/',                   requireAuth(() => renderDashboard()));
  
  // Login
  r.on('/login',              () => renderLogin());

  // Parties
  r.on('/parties',            requireAuth((ctx) => renderPartyList(ctx)));
  r.on('/parties/new',        requireAuth(() => renderPartyForm()));
  r.on('/parties/{id}',       requireAuth((ctx) => renderPartyForm(ctx.params.id)));

  // Commodities
  r.on('/commodities',        requireAuth((ctx) => renderCommodityList(ctx)));
  r.on('/commodities/new',    requireAuth(() => renderCommodityForm()));
  r.on('/commodities/{id}',   requireAuth((ctx) => renderCommodityForm(ctx.params.id)));

  // Contracts
  r.on('/contracts',          requireAuth((ctx) => renderContractList(ctx)));
  r.on('/contracts/new',      requireAuth(() => renderContractForm()));
  r.on('/contracts/{id}',     requireAuth((ctx) => renderContractForm(ctx.params.id)));

  // Deliveries
  r.on('/deliveries',         requireAuth((ctx) => renderDeliveryList(ctx)));
  r.on('/deliveries/new',     requireAuth(() => renderDeliveryForm()));
  r.on('/deliveries/{id}',    requireAuth((ctx) => renderDeliveryForm(ctx.params.id)));

  // Bills
  r.on('/bills',              requireAuth((ctx) => renderBillList(ctx)));
  r.on('/bills/new',          requireAuth(() => renderBillForm()));
  r.on('/bills/batch-billing', requireAuth(() => renderBatchBilling()));
  r.on('/bills/{id}',         requireAuth((ctx) => renderBillForm(ctx.params.id)));

  // Payments
  r.on('/payments',           requireAuth((ctx) => renderPaymentList(ctx)));
  r.on('/payments/new',       requireAuth(() => renderPaymentForm()));
  r.on('/payments/{id}',      requireAuth((ctx) => renderPaymentForm(ctx.params.id)));

  // Ledger
  r.on('/ledger',             requireAuth((ctx) => renderLedgerList(ctx)));
  r.on('/ledger/new',         requireAuth(() => renderLedgerForm()));
  r.on('/ledger/{id}',        requireAuth((ctx) => renderLedgerForm(ctx.params.id)));

  // City Master
  r.on('/cities',             requireAuth((ctx) => renderCityList(ctx)));
  r.on('/cities/new',         requireAuth(() => renderCityForm()));

  // Reports
  r.on('/reports/payment-outstanding', requireAuth((ctx) => renderPaymentOutstanding(ctx)));
  r.on('/reports/bill-register', requireAuth(() => {
    window.history.replaceState({}, '', '/bills');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }));

  // Analytics
  r.on('/analytics',          requireAuth(() => renderAnalytics()));

  // Admin Panel
  r.on('/admin/users',        requireAdmin((ctx) => renderUserList(ctx)));
  r.on('/admin/users/new',    requireAdmin(() => renderUserForm()));
  r.on('/admin/users/{id}',   requireAdmin((ctx) => renderUserForm(ctx.params.id)));
  r.on('/admin/audit-logs',   requireAdmin((ctx) => renderAuditLogs(ctx)));

  // Start router — binds popstate + [data-route] clicks + handles initial URL
  r.ready();

  // After each navigation (click-based via r.navigate), update sidebar highlight
  const origNav = r.navigate.bind(r);
  r.navigate = function(path, ...args) {
    origNav(path, ...args);
    updateSidebarActive(path);
  };

  // Also update on programmatic popstate (pushState + dispatchEvent used by all views after save/delete)
  window.addEventListener('popstate', () => {
    updateSidebarActive(window.location.pathname);
  });

  // Highlight on initial load
  updateSidebarActive(window.location.pathname);
}

/* ── Render Commodities & Cities Masters Dropdown ── */
function renderMasterMenu() {
  const pathname = window.location.pathname;

  const desktopPlaceholder = document.getElementById('desktop-masters-menu-placeholder');
  const mobilePlaceholder  = document.getElementById('mobile-masters-menu-placeholder');

  if (!desktopPlaceholder && !mobilePlaceholder) return;

  const partiesIcon16     = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const commoditiesIcon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
  const citiesIcon16      = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const partiesIcon14     = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const commoditiesIcon14 = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
  const citiesIcon14      = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const chevronIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:0.25rem"><path d="m6 9 6 6 6-6"/></svg>`;

  const isOnParties      = pathname.startsWith('/parties');
  const isOnCommodities  = pathname.startsWith('/commodities');
  const isOnCities       = pathname.startsWith('/cities');
  const isDropdownActive = isOnParties || isOnCommodities || isOnCities;

  const triggerIcon  = isOnCommodities ? commoditiesIcon16 : isOnCities ? citiesIcon16 : partiesIcon16;
  const triggerLabel = isOnCommodities ? 'Commodities'     : isOnCities ? 'Cities'     : 'Parties';

  if (desktopPlaceholder) {
    desktopPlaceholder.innerHTML = `
      <div class="nav-dropdown">
        <button class="nav-dropdown-trigger ${isDropdownActive ? 'active' : ''}">
          ${triggerIcon}
          <span>${triggerLabel}</span>
          ${chevronIcon}
        </button>
        <div class="nav-dropdown-content">
          <a href="/parties" data-route class="${isOnParties ? 'active' : ''}">
            ${partiesIcon14}
            <span>Parties</span>
          </a>
          <a href="/commodities" data-route class="${isOnCommodities ? 'active' : ''}">
            ${commoditiesIcon14}
            <span>Commodities</span>
          </a>
          <a href="/cities" data-route class="${isOnCities ? 'active' : ''}">
            ${citiesIcon14}
            <span>Cities</span>
          </a>
        </div>
      </div>
    `;
  }

  if (mobilePlaceholder) {
    mobilePlaceholder.innerHTML = `
      <a href="/parties" data-route class="${isOnParties ? 'active' : ''}">
        ${partiesIcon16}
        <span>Parties</span>
      </a>
      <a href="/commodities" data-route class="${isOnCommodities ? 'active' : ''}">
        ${commoditiesIcon16}
        <span>Commodities</span>
      </a>
      <a href="/cities" data-route class="${isOnCities ? 'active' : ''}">
        ${citiesIcon16}
        <span>Cities</span>
      </a>
    `;
  }
}

/* ── Render Contracts / Deliveries / Bills / Payments Dropdown ── */
function renderTransactionsMenu() {
  const pathname = window.location.pathname;

  const desktopPlaceholder = document.getElementById('desktop-transactions-menu-placeholder');
  const mobilePlaceholder  = document.getElementById('mobile-transactions-menu-placeholder');

  if (!desktopPlaceholder && !mobilePlaceholder) return;

  const contractsIcon16  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
  const deliveriesIcon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
  const billsIcon16      = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/><path d="M8 11h8"/><path d="M8 7h8"/><path d="M9 7a4 4 0 0 1 0 8H8l3 2"/></svg>`;
  const paymentsIcon16   = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
  const contractsIcon14  = contractsIcon16.replace(/width="16" height="16"/g, 'width="14" height="14"');
  const deliveriesIcon14 = deliveriesIcon16.replace(/width="16" height="16"/g, 'width="14" height="14"');
  const billsIcon14      = billsIcon16.replace(/width="16" height="16"/g, 'width="14" height="14"');
  const paymentsIcon14   = paymentsIcon16.replace(/width="16" height="16"/g, 'width="14" height="14"');
  const chevronIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:0.25rem"><path d="m6 9 6 6 6-6"/></svg>`;

  const isOnContracts  = pathname.startsWith('/contracts');
  const isOnDeliveries = pathname.startsWith('/deliveries');
  const isOnBills      = pathname.startsWith('/bills');
  const isOnPayments   = pathname.startsWith('/payments');
  const isDropdownActive = isOnContracts || isOnDeliveries || isOnBills || isOnPayments;

  const triggerIcon  = isOnDeliveries ? deliveriesIcon16
                     : isOnBills      ? billsIcon16
                     : isOnPayments   ? paymentsIcon16
                     : contractsIcon16;
  const triggerLabel = isOnDeliveries ? 'Deliveries'
                     : isOnBills      ? 'Bills'
                     : isOnPayments   ? 'Payments'
                     : 'Contracts';

  if (desktopPlaceholder) {
    desktopPlaceholder.innerHTML = `
      <div class="nav-dropdown">
        <button class="nav-dropdown-trigger ${isDropdownActive ? 'active' : ''}">
          ${triggerIcon}
          <span>${triggerLabel}</span>
          ${chevronIcon}
        </button>
        <div class="nav-dropdown-content">
          <a href="/contracts" data-route class="${isOnContracts ? 'active' : ''}">
            ${contractsIcon14}
            <span>Contracts</span>
          </a>
          <a href="/deliveries" data-route class="${isOnDeliveries ? 'active' : ''}">
            ${deliveriesIcon14}
            <span>Deliveries</span>
          </a>
          <a href="/bills" data-route class="${isOnBills ? 'active' : ''}">
            ${billsIcon14}
            <span>Bills</span>
          </a>
          <a href="/payments" data-route class="${isOnPayments ? 'active' : ''}">
            ${paymentsIcon14}
            <span>Payments</span>
          </a>
        </div>
      </div>
    `;
  }

  if (mobilePlaceholder) {
    mobilePlaceholder.innerHTML = `
      <a href="/contracts" data-route class="${isOnContracts ? 'active' : ''}">
        ${contractsIcon16}<span>Contracts</span>
      </a>
      <a href="/deliveries" data-route class="${isOnDeliveries ? 'active' : ''}">
        ${deliveriesIcon16}<span>Deliveries</span>
      </a>
      <a href="/bills" data-route class="${isOnBills ? 'active' : ''}">
        ${billsIcon16}<span>Bills</span>
      </a>
      <a href="/payments" data-route class="${isOnPayments ? 'active' : ''}">
        ${paymentsIcon16}<span>Payments</span>
      </a>
    `;
  }
}

/* ── Render Ledger & Outstanding Dropdown ── */
function renderLedgerMenu() {
  const pathname = window.location.pathname;

  const desktopPlaceholder = document.getElementById('desktop-ledger-menu-placeholder');
  const mobilePlaceholder  = document.getElementById('mobile-ledger-menu-placeholder');

  if (!desktopPlaceholder && !mobilePlaceholder) return;

  const ledgerIcon16      = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
  const outstandingIcon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  const ledgerIcon14      = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
  const outstandingIcon14 = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  const chevronIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:0.25rem"><path d="m6 9 6 6 6-6"/></svg>`;

  const isOnLedger      = pathname.startsWith('/ledger');
  const isOnOutstanding = pathname.startsWith('/reports/payment-outstanding');
  const isDropdownActive = isOnLedger || isOnOutstanding;

  const triggerIcon  = isOnOutstanding ? outstandingIcon16 : ledgerIcon16;
  const triggerLabel = isOnOutstanding ? 'Outstanding'     : 'Ledger';

  if (desktopPlaceholder) {
    desktopPlaceholder.innerHTML = `
      <div class="nav-dropdown">
        <button class="nav-dropdown-trigger ${isDropdownActive ? 'active' : ''}">
          ${triggerIcon}
          <span>${triggerLabel}</span>
          ${chevronIcon}
        </button>
        <div class="nav-dropdown-content">
          <a href="/ledger" data-route class="${isOnLedger ? 'active' : ''}">
            ${ledgerIcon14}
            <span>Ledger</span>
          </a>
          <a href="/reports/payment-outstanding" data-route class="${isOnOutstanding ? 'active' : ''}">
            ${outstandingIcon14}
            <span>Outstanding</span>
          </a>
        </div>
      </div>
    `;
  }

  if (mobilePlaceholder) {
    mobilePlaceholder.innerHTML = `
      <a href="/ledger" data-route class="${isOnLedger ? 'active' : ''}">
        ${ledgerIcon16}
        <span>Ledger</span>
      </a>
      <a href="/reports/payment-outstanding" data-route class="${isOnOutstanding ? 'active' : ''}">
        ${outstandingIcon16}
        <span>Outstanding</span>
      </a>
    `;
  }
}

/* ── Render Analytics & Admin Dropdown Menu ── */
function renderAnalyticsAdminMenu() {
  const role = localStorage.getItem('ss_role') || 'EMPLOYEE';
  const pathname = window.location.pathname;

  const desktopPlaceholder = document.getElementById('desktop-admin-menu-placeholder');
  const mobilePlaceholder = document.getElementById('mobile-admin-menu-placeholder');

  if (!desktopPlaceholder && !mobilePlaceholder) return;

  // Icons
  const analyticsIcon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  const usersIcon14 = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const usersIcon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const auditIcon14 = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>`;
  const auditIcon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>`;
  const chevronIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:0.25rem"><path d="m6 9 6 6 6-6"/></svg>`;

  // Dropdown trigger: reflects active page, defaults to "Users"
  const isOnAnalytics = pathname.startsWith('/analytics');
  const isOnUsers = pathname.startsWith('/admin/users');
  const isOnAudit = pathname.startsWith('/admin/audit-logs');
  const isDropdownActive = isOnAnalytics || isOnUsers || isOnAudit;

  let triggerIcon16 = usersIcon16;
  let triggerLabel = 'Users';
  if (isOnAnalytics) { triggerIcon16 = analyticsIcon16; triggerLabel = 'Analytics'; }
  else if (isOnAudit) { triggerIcon16 = auditIcon16;    triggerLabel = 'Audit Logs'; }

  if (desktopPlaceholder) {
    if (role === 'ADMIN') {
      desktopPlaceholder.innerHTML = `
        <div class="nav-dropdown">
          <button class="nav-dropdown-trigger ${isDropdownActive ? 'active' : ''}">
            ${triggerIcon16}
            <span>${triggerLabel}</span>
            ${chevronIcon}
          </button>
          <div class="nav-dropdown-content">
            <a href="/analytics" data-route class="${isOnAnalytics ? 'active' : ''}">
              ${analyticsIcon16.replace('width="16" height="16"', 'width="14" height="14"')}
              <span>Analytics</span>
            </a>
            <a href="/admin/users" data-route class="${isOnUsers ? 'active' : ''}">
              ${usersIcon14}
              <span>Users</span>
            </a>
            <a href="/admin/audit-logs" data-route class="${isOnAudit ? 'active' : ''}">
              ${auditIcon14}
              <span>Audit Logs</span>
            </a>
          </div>
        </div>
      `;
    } else {
      desktopPlaceholder.innerHTML = `
        <a href="/analytics" data-route class="${isOnAnalytics ? 'active' : ''}">
          ${analyticsIcon16}
          <span>Analytics</span>
        </a>
      `;
    }
  }

  if (mobilePlaceholder) {
    if (role === 'ADMIN') {
      mobilePlaceholder.innerHTML = `
        <a href="/analytics" data-route class="${isOnAnalytics ? 'active' : ''}">
          ${analyticsIcon16}
          <span>Analytics</span>
        </a>
        <a href="/admin/users" data-route class="${isOnUsers ? 'active' : ''}">
          ${usersIcon16}
          <span>Users</span>
        </a>
        <a href="/admin/audit-logs" data-route class="${isOnAudit ? 'active' : ''}">
          ${auditIcon16}
          <span>Audit Logs</span>
        </a>
      `;
    } else {
      mobilePlaceholder.innerHTML = `
        <a href="/analytics" data-route class="${isOnAnalytics ? 'active' : ''}">
          ${analyticsIcon16}
          <span>Analytics</span>
        </a>
      `;
    }
  }
}

/* ── Topbar Active State ── */
function updateSidebarActive(path) {
  renderAnalyticsAdminMenu();
  renderMasterMenu();
  renderTransactionsMenu();
  renderLedgerMenu();
  document.querySelectorAll('.topbar-nav a, .topbar-nav-mobile-drawer a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

/* ── Mobile Navigation Drawer ── */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const topbar = document.querySelector('.topbar');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  if (toggleBtn && topbar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      topbar.classList.toggle('mobile-open');
    });

    // Close drawer when clicking a link inside the mobile drawer
    const mobileDrawer = document.querySelector('.topbar-nav-mobile-drawer');
    if (mobileDrawer) {
      mobileDrawer.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
          topbar.classList.remove('mobile-open');
        }
      });
    }
 
    // Close drawer when clicking the backdrop
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        topbar.classList.remove('mobile-open');
      });
    }
 
    // Close drawer when clicking outside topbar or drawer
    document.addEventListener('click', (e) => {
      if (!topbar.contains(e.target) && 
          (!mobileDrawer || !mobileDrawer.contains(e.target)) && 
          (!backdrop || !backdrop.contains(e.target))) {
        topbar.classList.remove('mobile-open');
      }
    });
  }
}

/* ── Theme Toggle ── */
function initTheme() {
  const saved = localStorage.getItem('ss_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ss_theme', next);
      updateThemeIcon(next);
    });
    updateThemeIcon(saved);
  }
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
}

/* ── Logout ── */
function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = '/login';
    });
  }
}

/* ── Keyboard Shortcuts ── */
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // F2 - Add new record
    if (e.key === 'F2') {
      e.preventDefault();
      const path = window.location.pathname;
      if (path.startsWith('/parties')) {
        window.history.pushState({}, '', '/parties/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/commodities')) {
        window.history.pushState({}, '', '/commodities/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/contracts')) {
        window.history.pushState({}, '', '/contracts/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/deliveries')) {
        window.history.pushState({}, '', '/deliveries/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/bills')) {
        window.history.pushState({}, '', '/bills/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/payments')) {
        window.history.pushState({}, '', '/payments/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/ledger')) {
        window.history.pushState({}, '', '/ledger/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path.startsWith('/cities')) {
        window.history.pushState({}, '', '/cities/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }

    // F3 - List/Alter
    if (e.key === 'F3') {
      e.preventDefault();
      const path = window.location.pathname;
      const base = path.split('/')[1];
      if (base) {
        window.history.pushState({}, '', `/${base}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }

    // F5 - Delete
    if (e.key === 'F5') {
      const deleteBtn = document.getElementById('btn-delete');
      if (deleteBtn) {
        e.preventDefault();
        deleteBtn.click();
      }
    }

    // F6 - Save
    if (e.key === 'F6') {
      const form = document.querySelector('form');
      if (form) {
        e.preventDefault();
        const submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button:not([type="button"])');
        if (submitBtn) {
          submitBtn.click();
        } else {
          form.requestSubmit();
        }
      } else {
        const proceedBtn = document.getElementById('btn-proceed');
        if (proceedBtn) {
          e.preventDefault();
          proceedBtn.click();
        }
      }
    }

    // F12 - Copy Record
    if (e.key === 'F12') {
      e.preventDefault();
      const path = window.location.pathname;
      const parts = path.split('/');
      if (parts.length === 3 && !isNaN(parseInt(parts[2], 10))) {
        window.history.replaceState({}, '', `/${parts[1]}/new`);
        const formHeader = document.querySelector('.page-header h1');
        if (formHeader) {
          formHeader.textContent = 'New ' + parts[1].slice(0, -1).toUpperCase() + ' (Copy)';
        }
        document.getElementById('btn-delete')?.remove();
        showToast('Record copied! Save to duplicate.', 'success');
      }
    }

    // Find / Focus Search input
    const isEditing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable;
    if (((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) || ((e.key === 'f' || e.key === 'F') && !isEditing)) {
      const searchInput = document.querySelector('input[id^="search-"]');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }

    // Print shortcut (Alt+P or P when not editing)
    if (((e.altKey || e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) || ((e.key === 'p' || e.key === 'P') && !isEditing)) {
      // Avoid conflict with standard browser printing unless we want to intercept
      const printBtn = document.getElementById('btn-print') || document.getElementById('btn-print-bills') || document.querySelector('.btn-print');
      if (printBtn) {
        e.preventDefault();
        printBtn.click();
      }
    }
  });
}

// Global click delegator for row deletion (using capture phase to bypass inline stopPropagation)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-row-btn');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const id = btn.getAttribute('data-id');
  const entity = btn.getAttribute('data-entity');
  if (!id || !entity) return;

  const entityNameSingular = entity.endsWith('ies') ? entity.slice(0, -3) + 'y' : entity.slice(0, -1);
  if (!confirm(`Are you sure you want to delete this ${entityNameSingular}?`)) {
    return;
  }

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; margin: 0; border-width: 2px; border-color: currentColor; border-top-color: transparent;"></span>`;

  try {
    const api = await import('./lib/api.js');
    await api.del(`/${entity}/${id}`);
    showToast(`${entityNameSingular.charAt(0).toUpperCase() + entityNameSingular.slice(1)} deleted successfully`);
    // Re-render the current view so the deleted row is removed from the DOM
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    showToast(err.message, 'error');
  }
}, true);

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLogout();
  initRouter();
  initKeyboardShortcuts();
  initMobileMenu();
  initDualPaneObserver();

  // If already logged in (e.g. page refresh), warm the server cache
  if (isAuthenticated()) {
    triggerWarmup().then(() => {
      // Start background polling
      let currentChecksum = null;
      setInterval(async () => {
        if (!isAuthenticated()) return;
        // ONLY poll if active company is selected, to prevent unauthorized (401) errors on company selection page
        if (!sessionStorage.getItem('active_company_id')) return;
        try {
          // Use apiGet to automatically inject Authorization token and company/FY headers
          const data = await apiGet('/status');
          if (currentChecksum && data.checksum !== currentChecksum) {
            console.log('Background sync: data changed. Refreshing cache silently...');
            await triggerWarmup();
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          currentChecksum = data.checksum;
        } catch (err) { /* ignore network blips or temporary 401/403s on expire */ }
      }, 15000);
    });
  }
});

/* ── Dual-Pane Mobile Drawer Injector ── */
function initDualPaneObserver() {
  // Setup existing containers
  document.querySelectorAll('.dual-pane-container').forEach(setupDualPaneDrawer);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const container = node.classList?.contains('dual-pane-container') 
          ? node 
          : node.querySelector?.('.dual-pane-container');
        if (container) {
          setupDualPaneDrawer(container);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function setupDualPaneDrawer(container) {
  // Prevent duplicate setup
  if (container.querySelector('.dual-pane-drawer-toggle')) return;

  // 1. Create floating toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'dual-pane-drawer-toggle';

  // Determine label based on route
  let labelText = 'Records';
  const path = window.location.pathname;
  if (path.startsWith('/parties')) labelText = 'Accounts';
  else if (path.startsWith('/commodities')) labelText = 'Commodities';
  else if (path.startsWith('/contracts')) labelText = 'Contracts';
  else if (path.startsWith('/deliveries')) labelText = 'Deliveries';
  else if (path.startsWith('/bills')) labelText = 'Bills';
  else if (path.startsWith('/payments')) labelText = 'Payments';
  else if (path.startsWith('/ledger')) labelText = 'Ledger';

  toggleBtn.innerHTML = `
    <span>${labelText}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-top: 0.25rem;"><polyline points="9 18 15 12 9 6"/></svg>
  `;
  container.appendChild(toggleBtn);

  // 2. Create backdrop element
  const backdrop = document.createElement('div');
  backdrop.className = 'dual-pane-backdrop';
  container.appendChild(backdrop);

  // Get the left sidebar (first child table-container)
  const sidebar = container.querySelector('.table-container:first-child');
  if (!sidebar) return;
  sidebar.classList.add('dual-pane-sidebar');

  // 3. Bind events
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.toggle('drawer-open');
  });

  backdrop.addEventListener('click', () => {
    container.classList.remove('drawer-open');
  });

  // Close when selecting an item in the sidebar list
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.alter-list-item')) {
      container.classList.remove('drawer-open');
    }
  });
}
