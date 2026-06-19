/** Listing detail — photos placeholder, quality, seller, save, private bargaining & tender bidding. */
import * as api from '../lib/api.js';
import { mount, inr, qty, ago, esc, go, toast } from '../lib/ui.js';

function formatCloseDate(dateStr) {
  if (!dateStr) return 'No deadline';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'No deadline';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export async function renderListing(id) {
  mount(`<section class="mkt-detail"><div class="mkt-empty">Loading…</div></section>`);

  let l;
  try {
    ({ listing: l } = await api.get('/listings/' + id));
  } catch (e) {
    mount(`<section class="mkt-detail"><div class="mkt-empty">${esc(e.message)}</div>
      <a class="mkt-btn-ghost" data-route href="/market">← Back to feed</a></section>`);
    return;
  }

  const isTender = l.listingType === 'TENDER';
  const isAuthed = api.isAuthed();
  const currentMember = api.getMember();
  
  const verified = l.sellerVerified ? '<span class="mkt-badge mkt-badge-verified">Verified</span>' : '';
  const tenderBadge = isTender ? '<span class="mkt-badge mkt-badge-tender">Gov Tender</span>' : '';
  const directionBadge = l.direction === 'BUY' ? '<span class="mkt-badge mkt-badge-buy">Buying</span>' : '<span class="mkt-badge mkt-badge-sell">Selling</span>';
  
  const packing = l.packingType ? `${esc(l.packingType)}${l.packingWeight ? ' · ' + l.packingWeight + ' kg' : ''}` : '—';

  // Volatility and deposit parameters
  const volTier = l.volatilityTier || 'MEDIUM';
  let depPct = 0.05; // 5%
  if (volTier === 'LOW') depPct = 0.02; // 2%
  else if (volTier === 'HIGH') depPct = 0.10; // 10%

  // Build Actions panel
  let actionsHtml = '';
  
  if (isTender) {
    if (isAuthed) {
      const isClosed = l.closeDate && new Date() > new Date(l.closeDate);
      
      if (isClosed) {
        actionsHtml = `
          <div class="mkt-tender-bidding" style="border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--secondary); padding: 1.25rem; margin-top: 1.5rem; text-align: center;">
            <span style="font-weight: 700; color: var(--danger);">Bidding Closed</span>
            <p class="mkt-muted" style="margin: 0.25rem 0 0; font-size: 0.8rem;">The deadline for this tender has passed.</p>
          </div>
        `;
      } else {
        // Fetch current member details from API to get the latest tokenBalance
        let activeBalance = 100000.00;
        try {
          const res = await api.get('/auth/me');
          if (res && res.member) {
            activeBalance = Number(res.member.tokenBalance || 100000.00);
            // Save updated balance to localStorage cache
            api.setSession(api.getToken(), res.member);
          }
        } catch (e) {
          console.error('Failed to fetch fresh member details', e);
        }

        actionsHtml = `
          <div class="mkt-tender-bidding" style="border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--secondary); padding: 1.25rem; margin-top: 1.5rem;">
            <h3 style="margin: 0 0 1rem; font-size: 1rem; font-weight: 700;">Submit Bidding Proposal</h3>
            <form id="mkt-bid-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <label style="flex: 1; min-width: 120px; font-size: 0.78rem; font-weight: 600; color: var(--muted-foreground); display: flex; flex-direction: column; gap: 0.25rem;">
                  Bid Price (₹ / quintal)
                  <input type="number" id="bid-price" step="0.01" min="0.01" required value="${l.pricePerQuintal || ''}" style="padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-base); background: var(--input); color: var(--foreground); font-family: inherit;">
                </label>
                <label style="flex: 1; min-width: 120px; font-size: 0.78rem; font-weight: 600; color: var(--muted-foreground); display: flex; flex-direction: column; gap: 0.25rem;">
                  Bid Quantity (quintals)
                  <input type="number" id="bid-qty" step="0.001" min="0.001" required value="${l.qtyQuintals || ''}" style="padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-base); background: var(--input); color: var(--foreground); font-family: inherit;">
                </label>
              </div>
              
              <div style="font-size: 0.82rem; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-base); padding: 0.6rem 0.85rem; margin: 0.25rem 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <span class="mkt-muted">Your Wallet Balance:</span>
                  <strong style="color: var(--primary);">${inr(activeBalance)}</strong>
                </div>
                <div>
                  <span class="mkt-muted">Required Deposit (${(depPct * 100).toFixed(0)}%):</span>
                  <strong id="bid-deposit-calc" style="color: var(--foreground);">₹0.00</strong>
                </div>
              </div>
              
              <button type="submit" class="mkt-btn" style="width: 100%; padding: 0.6rem;">Place Bid & Lock Deposit</button>
            </form>
          </div>
        `;
      }
    } else {
      actionsHtml = `
        <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
          <a class="mkt-btn" data-route href="/market/login" style="flex: 1;">Sign in to Bid</a>
          <button id="mkt-save" class="mkt-btn-ghost">☆ Save</button>
        </div>
      `;
    }
  } else {
    // Standard OPEN listing
    const isOwnListing = currentMember && l.sellerId === currentMember.id;
    
    if (isOwnListing) {
      actionsHtml = `
        <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
          <button class="mkt-btn-ghost" disabled style="flex: 1; cursor: default; border-color: var(--border); color: var(--muted-foreground);">Your Listing</button>
        </div>
      `;
    } else {
      actionsHtml = `
        <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="mkt-bargain-btn" class="mkt-btn" style="flex: 1; min-width: 180px;">Bargain Privately</button>
          <button id="mkt-save" class="mkt-btn-ghost">☆ Save</button>
        </div>
      `;
    }
  }

  mount(`
    <section class="mkt-detail">
      <a class="mkt-btn-ghost" data-route href="/market" style="align-self:flex-start; margin-bottom:1rem;">← Back to feed</a>
      <div class="mkt-detail-grid">
        <div class="mkt-detail-media" aria-hidden="true"><span>photo coming soon</span></div>
        <div class="mkt-detail-info">
          <div class="mkt-card-row" style="flex-wrap: wrap; gap: 0.25rem;">
            <span class="mkt-card-commodity">${esc(l.commodityName || 'Commodity')}</span>
            ${isTender ? tenderBadge : directionBadge}
            <span class="mkt-badge mkt-badge-verified" style="background: color-mix(in srgb, var(--primary) 12%, transparent);">${volTier} Volatility</span>
            ${verified}
          </div>
          <h1>${esc(l.title)}</h1>
          <div class="mkt-detail-price">${inr(l.pricePerQuintal)} <span>/ quintal ${isTender ? '(Base Price)' : ''}</span></div>

          <dl class="mkt-spec">
            <div><dt>${isTender ? 'Total Tender Qty' : 'Available'}</dt><dd>${qty(l.qtyQuintals)}</dd></div>
            <div><dt>Location</dt><dd>${esc(l.cityName || '—')}</dd></div>
            <div><dt>Packing</dt><dd>${packing}</dd></div>
            <div><dt>${isTender ? 'Deadline' : 'Listed'}</dt><dd>${isTender ? formatCloseDate(l.closeDate) : ago(l.createdAt)}</dd></div>
          </dl>

          ${l.qualityNotes ? `<div class="mkt-quality"><h4>Quality Specifications</h4><p>${esc(l.qualityNotes)}</p></div>` : ''}

          <div class="mkt-seller">${isTender ? 'Issuing Authority' : 'Seller'}: <strong>${esc(l.sellerName || 'GCC Tender Portal')}</strong></div>

          ${actionsHtml}
        </div>
      </div>
    </section>
  `);

  // Bind Standard Actions (Save button)
  const saveBtn = document.getElementById('mkt-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      if (!isAuthed) {
        toast('Sign in to save listings', 'info');
        go('/market/login');
        return;
      }
      try {
        await api.post('/watchlist', { listingId: l.id });
        e.target.textContent = '★ Saved';
        e.target.disabled = true;
        toast('Saved to your watchlist', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  // Bind Bargain button
  const bargainBtn = document.getElementById('mkt-bargain-btn');
  if (bargainBtn) {
    bargainBtn.addEventListener('click', async () => {
      if (!isAuthed) {
        toast('Sign in to bargain on listings', 'info');
        go('/market/login');
        return;
      }
      try {
        const res = await api.post('/chats', { listingId: l.id });
        const chatId = res.chat.id;
        go('/market/chat/' + chatId);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  // Bind Bidding Form Calculations
  const bidForm = document.getElementById('mkt-bid-form');
  if (bidForm) {
    const priceInput = document.getElementById('bid-price');
    const qtyInput = document.getElementById('bid-qty');
    const depositCalc = document.getElementById('bid-deposit-calc');

    function calculateDeposit() {
      const price = parseFloat(priceInput.value) || 0;
      const quantity = parseFloat(qtyInput.value) || 0;
      const depositVal = price * quantity * depPct;
      depositCalc.textContent = inr(depositVal);
    }

    priceInput.addEventListener('input', calculateDeposit);
    qtyInput.addEventListener('input', calculateDeposit);
    calculateDeposit(); // initial calc

    // Submit Bid
    bidForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = bidForm.querySelector('button[type=submit]');
      submitBtn.disabled = true;

      const price = parseFloat(priceInput.value);
      const quantity = parseFloat(qtyInput.value);

      try {
        const res = await api.post('/tenders/bid', {
          listingId: l.id,
          bidPricePerQuintal: price,
          qtyQuintals: quantity
        });
        
        toast(`Bid placed! Locked ₹${res.tokenLocked.toFixed(2)} deposit.`, 'success');
        
        // Refresh view to pull updated wallet balance
        setTimeout(() => renderListing(id), 1200);
      } catch (err) {
        toast(err.message, 'error');
        submitBtn.disabled = false;
      }
    });
  }
}
