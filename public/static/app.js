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
import { isAuthenticated, clearAuth, triggerWarmup } from './lib/api.js';
import { Icons, showToast } from './components/ui.js';
import tinyrouter from './vendor/tinyrouter.js';

/* ── Auth Guard ── */
function requireAuth(handler) {
  return function (ctx) {
    if (!isAuthenticated()) {
      renderLogin();
      return;
    }
    // Remove login mode — sidebar reappears via CSS
    document.body.removeAttribute('data-page');
    handler(ctx);
  };
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

/* ── Topbar Active State ── */
function updateSidebarActive(path) {
  document.querySelectorAll('.topbar-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
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

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLogout();
  initRouter();
  initKeyboardShortcuts();

  // If already logged in (e.g. page refresh), warm the server cache
  if (isAuthenticated()) {
    triggerWarmup().then(() => {
      // Start background polling
      let currentChecksum = null;
      setInterval(async () => {
        if (!isAuthenticated()) return;
        try {
          const res = await fetch('/api/status');
          if (!res.ok) return;
          const data = await res.json();
          if (currentChecksum && data.checksum !== currentChecksum) {
            console.log('Background sync: data changed. Refreshing cache silently...');
            await triggerWarmup();
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          currentChecksum = data.checksum;
        } catch (err) { /* ignore network blips */ }
      }, 15000);
    });
  }
});
