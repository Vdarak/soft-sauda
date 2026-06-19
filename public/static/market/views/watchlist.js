/** Member dashboard — watchlist, negotiations list, and bids history. */
import * as api from '../lib/api.js';
import { mount, inr, qty, esc, ago, go, toast } from '../lib/ui.js';

export async function renderWatchlist() {
  mount(`
    <section class="mkt-dashboard" style="max-width:1140px; margin:0 auto; padding:5.5rem 1.25rem 4rem;">
      <!-- Mock Wallet Header -->
      <div class="mkt-wallet-card" style="border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--card); padding: 1.25rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.75rem;">
        <div>
          <span class="mkt-muted" style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Mock Bidding Wallet</span>
          <h2 id="mkt-dashboard-balance" style="margin:0.15rem 0 0; font-size:1.85rem; font-weight:800; color:var(--primary);">₹0.00</h2>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <input id="mkt-add-funds-amt" type="number" placeholder="₹ Amount" value="10000" style="width:100px; padding:0.45rem 0.6rem; border:1px solid var(--border); border-radius:var(--radius-base); background:var(--input); color:var(--foreground); font-family:inherit; font-size:0.88rem;">
          <button id="mkt-add-funds-btn" class="mkt-btn mkt-btn-sm" style="padding:0.45rem 1rem;">+ Deposit Dummy Funds</button>
        </div>
      </div>

      <!-- Dashboard Navigation Tabs -->
      <div class="mkt-dashboard-tabs" style="display:flex; gap:0.5rem; border-bottom:1px solid var(--border); padding-bottom:0.25rem; margin-bottom:1.5rem;">
        <button class="mkt-dash-tab active" data-tab="watchlist" style="background:transparent; border:none; padding:0.5rem 1rem; cursor:pointer; font-weight:700; font-size:0.9rem; color:var(--primary); transition:all 0.2s; border-bottom:2px solid var(--primary);">Watchlist</button>
        <button class="mkt-dash-tab" data-tab="bids" style="background:transparent; border:none; padding:0.5rem 1rem; cursor:pointer; font-weight:700; font-size:0.9rem; color:var(--muted-foreground); transition:all 0.2s; border-bottom:2px solid transparent;">My Bids</button>
      </div>

      <div id="mkt-dashboard-content" class="mkt-grid" style="margin-top:0;">
        <div class="mkt-empty">Loading dashboard content…</div>
      </div>
    </section>
  `);

  const balanceEl = document.getElementById('mkt-dashboard-balance');
  const addFundsBtn = document.getElementById('mkt-add-funds-btn');
  const addFundsAmtInput = document.getElementById('mkt-add-funds-amt');
  const contentEl = document.getElementById('mkt-dashboard-content');
  
  let currentTab = 'watchlist';

  // Load Wallet Balance
  async function loadBalance() {
    try {
      const res = await api.get('/auth/me');
      if (res && res.member) {
        balanceEl.textContent = inr(res.member.tokenBalance);
        api.setSession(api.getToken(), res.member);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Bind deposit button
  addFundsBtn.addEventListener('click', async () => {
    const amt = parseFloat(addFundsAmtInput.value);
    if (isNaN(amt) || amt <= 0) {
      toast('Enter a valid amount to deposit', 'error');
      return;
    }
    addFundsBtn.disabled = true;
    try {
      const res = await api.post('/members/funds', { amount: amt });
      toast(`Deposited ₹${amt.toLocaleString()} dummy funds`, 'success');
      loadBalance();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      addFundsBtn.disabled = false;
    }
  });

  // Tab Loaders
  async function loadWatchlist() {
    contentEl.className = 'mkt-grid';
    contentEl.innerHTML = '<div class="mkt-empty">Loading watchlist…</div>';
    try {
      const { watchlist } = await api.get('/watchlist');
      if (!watchlist.length) {
        contentEl.innerHTML = `<div class="mkt-empty" style="grid-column: 1/-1;">Your watchlist is empty. Save listings by tapping ☆ Save on the feed.</div>`;
        return;
      }
      contentEl.innerHTML = watchlist
        .map(
          (l) => `
        <div class="mkt-card mkt-card-static">
          <div class="mkt-card-body">
            <span class="mkt-card-commodity">${esc(l.commodityName || 'Commodity')}</span>
            <a class="mkt-card-title" data-route href="/market/listing/${l.id}">${esc(l.title)}</a>
            <div class="mkt-card-price">${inr(l.pricePerQuintal)} <span>/ quintal</span></div>
            <div class="mkt-card-meta">
              <span>${qty(l.qtyQuintals)}</span>
              <span>${esc(l.cityName || '—')}</span>
            </div>
            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
              <a class="mkt-btn mkt-btn-sm" data-route href="/market/listing/${l.id}" style="flex:1;">View Detail</a>
              <button class="mkt-btn-ghost mkt-btn-sm mkt-remove" data-id="${l.id}" style="color:var(--danger); border-color:color-mix(in srgb, var(--danger) 30%, transparent);">Remove</button>
            </div>
          </div>
        </div>`,
        )
        .join('');

      contentEl.querySelectorAll('.mkt-remove').forEach((b) =>
        b.addEventListener('click', async () => {
          try {
            await api.del('/watchlist?listingId=' + b.dataset.id);
            loadWatchlist();
          } catch (e) {
            toast(e.message, 'error');
          }
        }),
      );
    } catch (e) {
      contentEl.innerHTML = `<div class="mkt-empty" style="grid-column:1/-1;">${esc(e.message)}</div>`;
    }
  }

  async function loadBids() {
    contentEl.className = 'mkt-grid';
    contentEl.innerHTML = '<div class="mkt-empty">Loading bids…</div>';
    try {
      const { bids } = await api.get('/bids');
      if (!bids || !bids.length) {
        contentEl.innerHTML = `<div class="mkt-empty" style="grid-column: 1/-1;">You haven't placed any bids on government tenders yet.</div>`;
        return;
      }

      contentEl.innerHTML = bids
        .map(
          (b) => {
            const statusClass = b.status === 'ACCEPTED' ? 'mkt-badge-verified' : (b.status === 'REJECTED' ? 'mkt-badge-danger' : 'mkt-badge-tender');
            const statusBadge = `<span class="mkt-badge ${statusClass}">${b.status}</span>`;

            return `
              <div class="mkt-card mkt-card-static">
                <div class="mkt-card-body">
                  <div class="mkt-card-row" style="justify-content:space-between;">
                    <span class="mkt-card-commodity">${esc(b.commodityName || 'Commodity')}</span>
                    ${statusBadge}
                  </div>
                  <a class="mkt-card-title" data-route href="/market/listing/${b.listingId}">${esc(b.listingTitle)}</a>
                  <div class="mkt-card-price">${inr(b.bidPricePerQuintal)} <span>/ quintal (Bid Rate)</span></div>
                  <div class="mkt-card-meta">
                    <span>${qty(b.qtyQuintals)}</span>
                    <span>Locked Deposit: ${inr(b.tokenLocked)}</span>
                  </div>
                  <div style="font-size:0.7rem; margin-top:0.75rem;" class="mkt-muted">Placed ${ago(b.createdAt)}</div>
                </div>
              </div>
            `;
          }
        )
        .join('');
    } catch (e) {
      contentEl.innerHTML = `<div class="mkt-empty" style="grid-column:1/-1;">${esc(e.message)}</div>`;
    }
  }

  // Switch tabs
  document.querySelectorAll('.mkt-dash-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', (e) => {
      document.querySelectorAll('.mkt-dash-tab').forEach((b) => {
        b.classList.remove('active');
        b.style.color = 'var(--muted-foreground)';
        b.style.borderBottomColor = 'transparent';
      });

      tabBtn.classList.add('active');
      tabBtn.style.color = 'var(--primary)';
      tabBtn.style.borderBottomColor = 'var(--primary)';
      
      currentTab = tabBtn.dataset.tab;
      
      if (currentTab === 'watchlist') loadWatchlist();
      else if (currentTab === 'bids') loadBids();
    });
  });

  // Init view
  loadBalance();
  loadWatchlist();
}
