/** Post a listing (sellers / both). */
import * as api from '../lib/api.js';
import { mount, esc, go, toast } from '../lib/ui.js';

export async function renderSell() {
  const member = api.getMember();
  if (member && member.role === 'BUYER') {
    mount(`<section class="mkt-form-page"><div class="mkt-empty">
      Your account is buyer-only. Update your role to post listings.</div>
      <a class="mkt-btn-ghost" data-route href="/market">← Back to feed</a></section>`);
    return;
  }

  mount(`<section class="mkt-form-page"><div class="mkt-empty">Loading…</div></section>`);

  let commodities = [];
  try {
    ({ commodities } = await api.get('/commodities'));
  } catch (e) {
    toast(e.message, 'error');
  }

  const options = commodities
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join('');

  mount(`
    <section class="mkt-form-page">
      <a class="mkt-btn-ghost" data-route href="/market">← Back to feed</a>
      <h1>Post a listing</h1>
      <p class="mkt-muted">List a commodity for buyers to discover. GCC brokers the deal.</p>
      <form id="mkt-sell-form" class="mkt-form mkt-form-wide">
        <label>Commodity
          <select name="commodityId" required>
            <option value="" disabled selected>Select a commodity</option>
            ${options}
          </select>
        </label>
        <label>Title<input name="title" required placeholder="e.g. Sharbati Wheat — Premium"></label>
        <div class="mkt-form-row">
          <label>Quantity (quintals)<input name="qtyQuintals" type="number" step="0.001" min="0" placeholder="500"></label>
          <label>Price (₹ / quintal)<input name="pricePerQuintal" type="number" step="0.01" min="0" placeholder="2650"></label>
        </div>
        <label>I am
          <select name="direction">
            <option value="SELL">Selling</option>
            <option value="BUY">Buying</option>
          </select>
        </label>
        <label>Quality notes<textarea name="qualityNotes" rows="3" placeholder="Moisture 10%, foreign matter <1%, test weight 78 kg/hl"></textarea></label>
        <button class="mkt-btn" type="submit">Publish listing</button>
      </form>
    </section>
  `);

  document.getElementById('mkt-sell-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload.commodityId = Number(payload.commodityId);
    try {
      const { listing } = await api.post('/listings', payload);
      toast('Listing published', 'success');
      go('/market/listing/' + listing.id);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  });
}
