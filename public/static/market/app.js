/**
 * GCC Marketplace — SPA controller.
 *
 * Fully isolated from the staff ERP: its own router instance, its own token
 * (mkt_token via lib/api.js), its own views. The only shared import is the
 * third-party vendor router. Routes live under /market.
 */
import tinyrouter from '../vendor/tinyrouter.js';
import * as api from './lib/api.js';
import { go } from './lib/ui.js';
import { renderFeed } from './views/feed.js';
import { renderListing } from './views/listing.js';
import { renderAuth } from './views/auth.js';
import { renderSell } from './views/sell.js';
import { renderWatchlist } from './views/watchlist.js';
import { renderChat } from './views/chat.js';

/* ── Auth guard ── */
function requireMember(handler) {
  return (ctx) => {
    if (!api.isAuthed()) {
      go('/market/login');
      return;
    }
    handler(ctx);
  };
}

/* ── Clear Chat Polling ── */
function clearChatInterval() {
  if (window.mktChatInterval) {
    clearInterval(window.mktChatInterval);
    window.mktChatInterval = null;
  }
}

/* ── Theme Icons ── */
const Icons = {
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
};

/* ── Theme Control ── */
function initTheme() {
  const saved = localStorage.getItem('ss_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/* ── Top navigation ── */
function renderNav() {
  const nav = document.getElementById('market-nav');
  if (!nav) return;
  const path = window.location.pathname;
  const member = api.getMember();
  const authed = api.isAuthed();
  const savedTheme = localStorage.getItem('ss_theme') || 'dark';

  const link = (href, label) =>
    `<a data-route href="${href}" class="${path === href ? 'active' : ''}">${label}</a>`;

  nav.innerHTML = `
    <a class="mkt-brand" data-route href="/market">
      <img src="/gcc-logo.svg" alt="" width="24" height="24"><span>GCC&nbsp;Market</span>
    </a>
    <nav class="mkt-nav-links">
      ${link('/market', 'Feed')}
      ${authed ? link('/market/watchlist', 'Dashboard') : ''}
      ${authed ? link('/market/sell', 'Sell') : ''}
    </nav>
    <div class="mkt-nav-actions">
      <button id="mkt-theme-toggle" class="mkt-theme-toggle" title="Toggle theme" type="button" style="background:none; border:none; color:var(--muted-foreground); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0.35rem; border-radius:var(--radius-base);">
        ${savedTheme === 'dark' ? Icons.sun : Icons.moon}
      </button>
      <a class="mkt-link-muted" href="/">← GCC home</a>
      ${
        authed
          ? `<span class="mkt-whoami">${member?.name || 'Member'}</span><a href="#" id="mkt-logout" class="mkt-link-muted">Sign out</a>`
          : `<a class="mkt-btn mkt-btn-sm" data-route href="/market/login">Sign in</a>`
      }
    </div>`;

  const logout = document.getElementById('mkt-logout');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      clearChatInterval();
      api.clearSession();
      go('/market');
    });
  }

  const themeToggle = document.getElementById('mkt-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ss_theme', next);
      themeToggle.innerHTML = next === 'dark' ? Icons.sun : Icons.moon;
    });
  }
}

/* ── Router ── */
const r = tinyrouter.new({
  defaultHandler: () => {
    clearChatInterval();
    document.getElementById('app').innerHTML =
      `<section class="mkt-feed"><div class="mkt-empty">Page not found. <a data-route href="/market">Go to feed</a></div></section>`;
  },
});

r.on('/market', () => { clearChatInterval(); renderFeed(); });
r.on('/market/login', () => { clearChatInterval(); renderAuth(); });
r.on('/market/watchlist', requireMember(() => { clearChatInterval(); renderWatchlist(); }));
r.on('/market/sell', requireMember(() => { clearChatInterval(); renderSell(); }));
r.on('/market/listing/{id}', (ctx) => { clearChatInterval(); renderListing(ctx.params.id); });
r.on('/market/chat/{id}', requireMember((ctx) => renderChat(ctx.params.id)));

initTheme();
r.ready();
renderNav();
window.addEventListener('popstate', () => {
  clearChatInterval();
  renderNav();
});

