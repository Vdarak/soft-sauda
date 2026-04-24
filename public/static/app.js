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
import { isAuthenticated, clearAuth, triggerWarmup } from './lib/api.js';
import { Icons } from './components/ui.js';
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
  r.on('/bills/{id}',         requireAuth((ctx) => renderBillForm(ctx.params.id)));

  // Payments
  r.on('/payments',           requireAuth((ctx) => renderPaymentList(ctx)));
  r.on('/payments/new',       requireAuth(() => renderPaymentForm()));
  r.on('/payments/{id}',      requireAuth((ctx) => renderPaymentForm(ctx.params.id)));

  // Ledger
  r.on('/ledger',             requireAuth((ctx) => renderLedgerList(ctx)));
  r.on('/ledger/new',         requireAuth(() => renderLedgerForm()));
  r.on('/ledger/{id}',        requireAuth((ctx) => renderLedgerForm(ctx.params.id)));

  // Start router — binds popstate + [data-route] clicks + handles initial URL
  r.ready();

  // After each navigation, update sidebar highlight
  const origNav = r.navigate.bind(r);
  r.navigate = function(path, ...args) {
    origNav(path, ...args);
    updateSidebarActive(path);
  };
  
  // Highlight on initial load
  updateSidebarActive(window.location.pathname);
}

/* ── Sidebar Active State ── */
function updateSidebarActive(path) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
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

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLogout();
  initRouter();

  // If already logged in (e.g. page refresh), warm the server cache
  if (isAuthenticated()) {
    triggerWarmup();
  }
});
