/** Private negotiation room view — message exchange + bargaining price commitments. */
import * as api from '../lib/api.js';
import { mount, inr, qty, esc, toast } from '../lib/ui.js';

export async function renderChat(id) {
  if (window.mktChatInterval) {
    clearInterval(window.mktChatInterval);
    window.mktChatInterval = null;
  }

  mount(`
    <section class="mkt-chat-page" style="max-width:800px; margin:0 auto; padding:5.5rem 1.25rem 2rem; display:flex; flex-direction:column; height:85vh;">
      <a class="mkt-btn-ghost" data-route href="/market/watchlist" style="align-self:flex-start; margin-bottom:1rem;">← Back to dashboard</a>
      
      <!-- Room Header -->
      <header class="mkt-chat-header" style="border:1px solid var(--border); border-radius:var(--radius-card); background:var(--card); padding:1rem 1.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <h2 id="mkt-chat-title" style="margin:0; font-size:1.25rem; font-weight:800;">Loading negotiation…</h2>
          <p id="mkt-chat-subtitle" class="mkt-muted" style="margin:0.25rem 0 0; font-size:0.82rem;"></p>
        </div>
        <div id="mkt-chat-badge-container"></div>
      </header>

      <!-- Bargaining Price Commitments -->
      <section class="mkt-bargain-panel" style="border:1px solid var(--border); border-radius:var(--radius-card); background:var(--card); padding:1rem 1.5rem; margin-bottom:1rem;">
        <h3 style="margin:0 0 0.75rem; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted-foreground);">Bargaining Rates (₹ / quintal)</h3>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem; margin-bottom:1rem;">
          <div style="display:flex; gap:2rem;">
            <div>
              <div class="mkt-muted" style="font-size:0.75rem;">Your Committed Price</div>
              <div id="mkt-my-price" style="font-size:1.3rem; font-weight:800; color:var(--primary);">—</div>
            </div>
            <div>
              <div class="mkt-muted" style="font-size:0.75rem;">Counterparty Committed Price</div>
              <div id="mkt-their-price" style="font-size:1.3rem; font-weight:800; color:var(--foreground);">—</div>
            </div>
          </div>
          <div id="mkt-bargain-action" style="display:flex; gap:0.5rem; align-items:center;">
            <!-- Rendered dynamically -->
          </div>
        </div>
        <p id="mkt-commission-note" class="mkt-muted" style="margin:0; font-size:0.75rem; border-top:1px solid var(--border); padding-top:0.5rem;"></p>
      </section>

      <!-- Messages Thread -->
      <div id="mkt-messages-thread" style="flex:1; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-card); background:var(--secondary); padding:1.25rem; display:flex; flex-direction:column-reverse; gap:1rem; margin-bottom:1rem;">
        <div class="mkt-empty">Loading messages…</div>
      </div>

      <!-- Text Message Input Form -->
      <form id="mkt-chat-form" style="display:flex; gap:0.5rem;">
        <input id="mkt-message-input" type="text" placeholder="Type a message…" required autocomplete="off" style="flex:1; padding:0.6rem 0.85rem; border:1px solid var(--border); border-radius:var(--radius-base); background:var(--input); color:var(--foreground); font-family:inherit; font-size:0.9rem;">
        <button class="mkt-btn" type="submit" style="padding:0.6rem 1.5rem;">Send</button>
      </form>
    </section>
  `);

  const titleEl = document.getElementById('mkt-chat-title');
  const subtitleEl = document.getElementById('mkt-chat-subtitle');
  const badgeContainer = document.getElementById('mkt-chat-badge-container');
  const myPriceEl = document.getElementById('mkt-my-price');
  const theirPriceEl = document.getElementById('mkt-their-price');
  const actionEl = document.getElementById('mkt-bargain-action');
  const commNoteEl = document.getElementById('mkt-commission-note');
  const threadEl = document.getElementById('mkt-messages-thread');
  const inputEl = document.getElementById('mkt-message-input');

  let currentChat = null;
  let lastMessageCount = 0;

  function renderMessages(messages) {
    if (!messages.length) {
      threadEl.innerHTML = `<div class="mkt-empty" style="align-self:center; margin:auto;">No messages yet. Start bargaining!</div>`;
      return;
    }
    
    // Sort in reverse order (bottom to top display via column-reverse flex)
    const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    threadEl.innerHTML = sorted.map(m => {
      const isSystem = m.senderId == null;
      if (isSystem) {
        return `
          <div style="align-self:center; background:var(--card); border:1px solid var(--border); border-radius:var(--radius-base); padding:0.4rem 1rem; font-size:0.78rem; text-align:center; max-width:90%; color:var(--muted-foreground); line-height:1.4;">
            ${esc(m.messageText)}
          </div>
        `;
      }
      
      const isMe = m.senderId === api.getMember()?.id;
      const align = isMe ? 'flex-end' : 'flex-start';
      const bg = isMe ? 'var(--primary)' : 'var(--card)';
      const color = isMe ? 'var(--primary-foreground)' : 'var(--foreground)';
      const border = isMe ? '1px solid var(--primary)' : '1px solid var(--border)';
      
      return `
        <div style="align-self:${align}; max-width:70%; display:flex; flex-direction:column; gap:0.2rem;">
          <div style="background:${bg}; color:${color}; border:${border}; border-radius:var(--radius-base); padding:0.6rem 0.95rem; font-size:0.88rem; line-height:1.4; word-break:break-word;">
            ${esc(m.messageText)}
          </div>
          <span class="mkt-muted" style="font-size:0.68rem; align-self:${isMe ? 'flex-end' : 'flex-start'};">
            ${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      `;
    }).join('');
  }

  async function updateUI(data, isInitial = false) {
    const { chat, messages } = data;
    currentChat = chat;

    titleEl.textContent = `Negotiation with ${esc(chat.counterpartyName)}`;
    subtitleEl.textContent = `${esc(chat.listingTitle)} · ${qty(chat.listingQty)}`;
    
    // Volatility and Commission details
    const ratePct = (Number(chat.commissionRate) * 100).toFixed(1);
    commNoteEl.innerHTML = `Platform commission: <strong>${ratePct}%</strong> (${chat.volatilityTier} Volatility Commodity). Calculated on final agreed price.`;

    // Badges
    const statusClass = chat.status === 'AGREED' ? 'mkt-badge-verified' : (chat.status === 'CANCELLED' ? 'mkt-badge-danger' : 'mkt-badge-tender');
    const statusLabel = chat.status === 'AGREED' ? 'Deal Agreed' : (chat.status === 'CANCELLED' ? 'Cancelled' : 'Negotiating');
    badgeContainer.innerHTML = `<span class="mkt-badge ${statusClass}" style="font-size:0.75rem; padding:0.3rem 0.75rem;">${statusLabel}</span>`;

    // Prices
    const myPrice = chat.isBuyer ? chat.agreedBuyerPrice : chat.agreedSellerPrice;
    const theirPrice = chat.isBuyer ? chat.agreedSellerPrice : chat.agreedBuyerPrice;

    myPriceEl.textContent = myPrice ? inr(myPrice) : 'Not proposed';
    theirPriceEl.textContent = theirPrice ? inr(theirPrice) : 'Not proposed';

    // Propose Rate inputs/actions
    if (chat.status === 'NEGOTIATING') {
      actionEl.innerHTML = `
        <input id="mkt-propose-val" type="number" step="0.01" min="0" placeholder="₹ Rate" style="width:100px; padding:0.35rem 0.5rem; border:1px solid var(--border); border-radius:var(--radius-base); font-size:0.85rem; background:var(--input); color:var(--foreground);" value="${myPrice || ''}">
        <button id="mkt-propose-btn" class="mkt-btn mkt-btn-sm">Propose Rate</button>
      `;

      document.getElementById('mkt-propose-btn').addEventListener('click', async () => {
        const rate = parseFloat(document.getElementById('mkt-propose-val').value);
        if (isNaN(rate) || rate <= 0) {
          toast('Enter a valid positive rate', 'error');
          return;
        }
        try {
          const res = await api.post(`/chats/${id}`, { agreedPrice: rate });
          toast('Rate proposed', 'success');
          updateUI(res);
        } catch (e) {
          toast(e.message, 'error');
        }
      });
      
      document.getElementById('mkt-chat-form').style.display = 'flex';
    } else {
      actionEl.innerHTML = `<span style="font-weight:700; color:var(--success); font-size:0.9rem;">Agreement Reached!</span>`;
      document.getElementById('mkt-chat-form').style.display = 'none';
    }

    // Messages
    if (isInitial || messages.length !== lastMessageCount) {
      renderMessages(messages);
      lastMessageCount = messages.length;
    }
  }

  // Load Initial Data
  try {
    const res = await api.get(`/chats/${id}`);
    updateUI(res, true);
  } catch (e) {
    mount(`<section class="mkt-detail"><div class="mkt-empty">${esc(e.message)}</div>
      <a class="mkt-btn-ghost" data-route href="/market/watchlist">← Back to dashboard</a></section>`);
    return;
  }

  // Bind message submit
  document.getElementById('mkt-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = inputEl.value.trim();
    if (!txt) return;
    
    inputEl.value = '';
    try {
      const res = await api.post(`/chats/${id}`, { messageText: txt });
      updateUI(res);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Start polling loop (every 3 seconds)
  window.mktChatInterval = setInterval(async () => {
    try {
      const res = await api.get(`/chats/${id}`);
      updateUI(res);
    } catch (e) {
      console.error('Error polling chat messages:', e);
    }
  }, 3000);
}
