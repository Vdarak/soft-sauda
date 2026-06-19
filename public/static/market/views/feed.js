/** Marketplace feed — public list of active listings + government tenders + filters. */
import * as api from '../lib/api.js';
import { mount, inr, qty, ago, esc, toast } from '../lib/ui';

function formatCloseDate(dateStr) {
  if (!dateStr) return 'No deadline';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'No deadline';
  return 'Closes ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function card(l) {
  const verified = l.sellerVerified ? '<span class="mkt-badge mkt-badge-verified">Verified</span>' : '';
  const isTender = l.listingType === 'TENDER';
  const badge = isTender 
    ? '<span class="mkt-badge mkt-badge-tender">Gov Tender</span>' 
    : (l.direction === 'BUY' ? '<span class="mkt-badge mkt-badge-buy">Buying</span>' : '<span class="mkt-badge mkt-badge-sell">Selling</span>');

  const volatileBadge = l.volatilityTier && l.volatilityTier !== 'LOW'
    ? `<span class="mkt-badge mkt-badge-volatile">${l.volatilityTier} Volatility</span>`
    : '';

  const metaHtml = isTender
    ? `<span>${qty(l.qtyQuintals)}</span>
       <span>${esc(l.cityName || '—')}</span>
       <span class="mkt-close-date">${formatCloseDate(l.closeDate)}</span>`
    : `<span>${qty(l.qtyQuintals)}</span>
       <span>${esc(l.cityName || '—')}</span>
       <span>${ago(l.createdAt)}</span>`;

  const priceLabel = isTender ? 'Base Price' : 'Price';

  return `
    <a class="mkt-card" data-route href="/market/listing/${l.id}">
      <div class="mkt-card-media" aria-hidden="true">
        <span>photo coming soon</span>
      </div>
      <div class="mkt-card-body">
        <div class="mkt-card-row" style="flex-wrap: wrap; gap: 0.25rem;">
          <span class="mkt-card-commodity">${esc(l.commodityName || 'Commodity')}</span>
          ${badge}
          ${volatileBadge}
          ${verified}
        </div>
        <h3 class="mkt-card-title">${esc(l.title)}</h3>
        <div class="mkt-card-price">${inr(l.pricePerQuintal)} <span>/ quintal (${priceLabel})</span></div>
        <div class="mkt-card-meta">
          ${metaHtml}
        </div>
      </div>
    </a>`;
}

export async function renderFeed() {
  mount(`
    <section class="mkt-feed">
      <header class="mkt-feed-head">
        <h1>Marketplace</h1>
        <p class="mkt-muted">Live listings from verified counterparties and government portals.</p>
        
        <div class="mkt-search-row" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
          <div class="mkt-search" style="flex: 1; min-width: 250px;">
            <input id="mkt-q" type="search" placeholder="Search listings…" autocomplete="off" style="max-width:100%;">
          </div>
          <div class="mkt-tabs-container" style="display: flex; gap: 0.5rem; background: var(--secondary); padding: 0.25rem; border-radius: var(--radius-base); border: 1px solid var(--border);">
            <button class="mkt-tab-btn active" data-type="OPEN" style="padding: 0.4rem 1rem; border: none; border-radius: var(--radius-base); font-size: 0.82rem; font-weight: 600; cursor: pointer; background: var(--primary); color: var(--primary-foreground); transition: all 0.2s;">Open Market</button>
            <button class="mkt-tab-btn" data-type="TENDER" style="padding: 0.4rem 1rem; border: none; border-radius: var(--radius-base); font-size: 0.82rem; font-weight: 600; cursor: pointer; background: transparent; color: var(--muted-foreground); transition: all 0.2s;">Gov Tenders</button>
          </div>
        </div>
      </header>
      <div id="mkt-feed-grid" class="mkt-grid">
        <div class="mkt-empty">Loading listings…</div>
      </div>
    </section>
  `);

  const grid = document.getElementById('mkt-feed-grid');
  let currentType = 'OPEN';

  async function load(q = '') {
    grid.innerHTML = '<div class="mkt-empty">Loading listings…</div>';
    try {
      let urlStr = currentType === 'TENDER' 
        ? '/tenders' 
        : '/listings?listingType=OPEN';
      
      if (q.trim()) {
        urlStr += (urlStr.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q.trim());
      }
      
      const res = await api.get(urlStr);
      const items = currentType === 'TENDER' ? res.tenders : res.listings;
      
      if (!items || !items.length) {
        grid.innerHTML = `<div class="mkt-empty">No ${currentType === 'TENDER' ? 'tenders' : 'listings'} found. Check back soon.</div>`;
        return;
      }
      grid.innerHTML = items.map(card).join('');
    } catch (e) {
      grid.innerHTML = `<div class="mkt-empty">Could not load items.</div>`;
      toast(e.message, 'error');
    }
  }

  // Bind search input
  let t;
  const searchInput = document.getElementById('mkt-q');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(t);
    const v = e.target.value;
    t = setTimeout(() => load(v), 250);
  });

  // Bind tabs
  document.querySelectorAll('.mkt-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mkt-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--muted-foreground)';
      });
      
      btn.classList.add('active');
      btn.style.background = 'var(--primary)';
      btn.style.color = 'var(--primary-foreground)';
      
      currentType = btn.dataset.type;
      searchInput.value = '';
      load();
    });
  });

  load();
}
