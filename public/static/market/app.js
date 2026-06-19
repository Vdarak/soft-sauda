/**
 * GCC Marketplace — SPA controller.
 *
 * Fully isolated from the staff ERP: its own router instance, its own token
 * (mkt_token via lib/api.js), its own views, and its own bottom-right chat overlay.
 */
import tinyrouter from '../vendor/tinyrouter.js';
import * as api from './lib/api.js';
import { go, toast } from './lib/ui.js';
import { renderFeed } from './views/feed.js';
import { renderListing } from './views/listing.js';
import { renderAuth } from './views/auth.js';
import { renderSell } from './views/sell.js';
import { renderWatchlist } from './views/watchlist.js';

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

/* ── Top navigation with Hamburger ── */
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
    <!-- Mobile Hamburger Toggle -->
    <button id="mkt-hamburger-btn" class="mkt-hamburger" title="Toggle Navigation" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>

    <a class="mkt-brand" data-route href="/market">
      <img src="/gcc-logo.svg" alt="" width="24" height="24"><span>GCC&nbsp;Market</span>
    </a>
    
    <nav id="mkt-nav-links-menu" class="mkt-nav-links">
      ${link('/market', 'Feed')}
      ${authed ? link('/market/watchlist', 'Dashboard') : ''}
      ${authed ? link('/market/sell', 'Sell') : ''}
    </nav>
    <div class="mkt-nav-actions">
      <button id="mkt-theme-toggle" class="mkt-theme-toggle" title="Toggle theme" type="button" style="background:none; border:none; color:var(--muted-foreground); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0.35rem; border-radius:var(--radius-base);">
        ${savedTheme === 'dark' ? Icons.sun : Icons.moon}
      </button>
      ${
        authed
          ? `<span class="mkt-whoami">${member?.name || 'Member'}</span><a href="#" id="mkt-logout" class="mkt-logout-btn" title="Sign out"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg></a>`
          : `<a class="mkt-btn mkt-btn-sm" data-route href="/market/login">Sign in</a>`
      }
    </div>`;

  const logout = document.getElementById('mkt-logout');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      api.clearSession();
      window.mktOpenChats = [];
      renderChatOverlay();
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

  // Hamburger toggle functionality
  const burger = document.getElementById('mkt-hamburger-btn');
  const menu = document.getElementById('mkt-nav-links-menu');
  if (burger && menu) {
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      menu.classList.remove('open');
    });
  }
}

// ── Notification Sound Synthesis ──
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
}

// ════════════════════════════════════════
// CHAT OVERLAY CONTROLLER
// ════════════════════════════════════════
window.mktOpenChats = []; // Open chat windows
window.mktChatList = [];  // Last active chats list
window.mktChatSearchActive = false; // "New Chat" search active state
window.mktSearchQuery = '';
window.mktAvailableListings = []; // Listings available for search starting new chat
window.mktDrawerState = localStorage.getItem('mkt_drawer_state') || 'collapsed'; // 'expanded' | 'collapsed'
window.mktActiveMobileChatId = null; // ID of active chat window on mobile view

// Helpers to escape HTML
function esc(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inr(val) {
  if (val == null) return '—';
  const n = parseFloat(val);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function qty(val) {
  if (val == null) return '—';
  return parseFloat(val).toLocaleString() + ' q';
}

// Open or focus a chat room
window.mktOpenChat = async function (roomId, forceExpand = true) {
  if (!api.isAuthed()) return;
  
  // Clean active mobile state
  window.mktActiveMobileChatId = roomId;

  const existing = window.mktOpenChats.find(c => c.id === roomId);
  if (existing) {
    if (forceExpand) {
      existing.state = 'expanded';
    }
    // Mark as read
    try { await api.post(`/chats/${roomId}/read`); } catch (e) {}
    renderChatOverlay();
    scrollChatBottom(roomId);
    return;
  }

  // Find info from chat list if we have it to populate header immediately
  const listInfo = window.mktChatList.find(c => c.id === roomId);
  const counterpartyName = listInfo ? listInfo.counterpartyName : 'Loading...';
  const listingTitle = listInfo ? listInfo.listingTitle : '';
  const isOnline = listInfo ? listInfo.isOnline : false;

  // Add placeholder with loading state optimistically
  window.mktOpenChats.push({
    id: roomId,
    counterpartyName,
    listingTitle,
    isOnline,
    state: 'expanded',
    messages: [],
    isLoading: true,
    lastMessageCount: 0
  });

  renderChatOverlay();

  try {
    const res = await api.get(`/chats/${roomId}`);
    const { chat, messages } = res;
    
    // Find the optimistic tab and populate it
    const placeholder = window.mktOpenChats.find(c => c.id === roomId);
    if (placeholder) {
      placeholder.isLoading = false;
      placeholder.counterpartyName = chat.counterpartyName;
      placeholder.isOnline = chat.isOnline;
      placeholder.messages = messages || [];
      placeholder.agreedBuyerPrice = chat.agreedBuyerPrice;
      placeholder.agreedSellerPrice = chat.agreedSellerPrice;
      placeholder.status = chat.status;
      placeholder.isBuyer = chat.isBuyer;
      placeholder.listingQty = chat.listingQty;
      placeholder.commissionRate = chat.commissionRate;
      placeholder.volatilityTier = chat.volatilityTier;
      placeholder.listingTitle = chat.listingTitle;
      placeholder.lastMessageCount = messages?.length || 0;
    }

    // Mark as read
    try { await api.post(`/chats/${roomId}/read`); } catch (e) {}
    
    renderChatOverlay();
    scrollChatBottom(roomId);
  } catch (e) {
    console.error('Failed to open chat:', e);
    // Remove the failed placeholder tab
    window.mktOpenChats = window.mktOpenChats.filter(c => c.id !== roomId);
    renderChatOverlay();
    toast('Failed to load chat room', 'error');
  }
};

window.mktCloseChat = function (roomId) {
  window.mktOpenChats = window.mktOpenChats.filter(c => c.id !== roomId);
  if (window.mktActiveMobileChatId === roomId) {
    window.mktActiveMobileChatId = null;
  }
  renderChatOverlay();
};

window.mktToggleChatState = function (roomId, state) {
  const chat = window.mktOpenChats.find(c => c.id === roomId);
  if (chat) {
    chat.state = state;
    if (state === 'expanded') {
      // Mark as read
      api.post(`/chats/${roomId}/read`).catch(() => {});
      scrollChatBottom(roomId);
    }
    renderChatOverlay();
  }
};

// Optimistic Send Message
window.mktSendMessage = async function (roomId, text) {
  const chat = window.mktOpenChats.find(c => c.id === roomId);
  if (!chat || !text.trim()) return;

  const tempId = 'temp-' + Date.now();
  const optimisticMsg = {
    id: tempId,
    roomId,
    senderId: api.getMember()?.id,
    messageText: text,
    isRead: false,
    createdAt: new Date().toISOString(),
    status: 'sending' // 'sending' | 'delivered' | 'seen'
  };

  // Add message locally
  chat.messages.unshift(optimisticMsg);
  renderChatOverlay();
  scrollChatBottom(roomId);

  try {
    const res = await api.post(`/chats/${roomId}`, { messageText: text });
    
    // Replace messages with new list returned from API
    chat.messages = res.messages.map(m => {
      // If it is the user's message, mark as delivered
      if (m.senderId === api.getMember()?.id) {
        return { ...m, status: m.isRead ? 'seen' : 'delivered' };
      }
      return m;
    });
    chat.lastMessageCount = chat.messages.length;
    renderChatOverlay();
    scrollChatBottom(roomId);
  } catch (e) {
    console.error('Failed to send message:', e);
    // Mark optimistic message as failed
    const failedMsg = chat.messages.find(m => m.id === tempId);
    if (failedMsg) {
      failedMsg.status = 'failed';
      renderChatOverlay();
    }
  }
};

// Propose Price Commitment inside chat
window.mktProposeRate = async function (roomId, rate) {
  const chat = window.mktOpenChats.find(c => c.id === roomId);
  if (!chat || isNaN(rate) || rate <= 0) return;

  try {
    const res = await api.post(`/chats/${roomId}`, { agreedPrice: rate });
    // Update local chat info
    chat.messages = res.messages;
    renderChatOverlay();
    scrollChatBottom(roomId);
  } catch (e) {
    alert(e.message);
  }
};

function scrollChatBottom(roomId) {
  setTimeout(() => {
    const container = document.getElementById(`mkt-chat-body-${roomId}`);
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, 50);
}

// Global Polling Loop
let lastActiveChatCount = 0;
let lastUnreadTotals = 0;
let loopInterval = null;

async function mktGlobalLoop() {
  if (!api.isAuthed()) {
    clearInterval(loopInterval);
    loopInterval = null;
    return;
  }

  try {
    // 1. Send Heartbeat
    await api.post('/members/heartbeat');

    // 2. Fetch Chat List
    const { chats } = await api.get('/chats');
    window.mktChatList = chats || [];

    // Calculate total unread messages count
    let totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    if (totalUnread > lastUnreadTotals) {
      playNotificationSound();
    }
    lastUnreadTotals = totalUnread;

    // Update main drawer UI if present
    updateDrawerUI();

    // 3. Update Open Chat Windows
    for (const openChat of window.mktOpenChats) {
      const roomRes = await api.get(`/chats/${openChat.id}`);
      const { chat, messages } = roomRes;

      // Check if counterparty status or agreed prices changed
      openChat.isOnline = chat.isOnline;
      openChat.agreedBuyerPrice = chat.agreedBuyerPrice;
      openChat.agreedSellerPrice = chat.agreedSellerPrice;
      openChat.status = chat.status;

      // Check for new incoming messages to play sound and scroll
      if (messages.length !== openChat.lastMessageCount) {
        // If there are new messages and the last message isn't from me, play sound
        const lastMsg = messages[0];
        if (lastMsg && lastMsg.senderId !== api.getMember()?.id && messages.length > openChat.lastMessageCount) {
          if (openChat.state !== 'expanded') {
            playNotificationSound();
          }
        }
        openChat.messages = messages;
        openChat.lastMessageCount = messages.length;
        renderChatOverlay();
        scrollChatBottom(openChat.id);
      } else {
        // Just redraw in case statuses (like isRead checkmarks) changed
        openChat.messages = messages;
        updateChatWindowUI(openChat.id);
      }

      // If active and expanded, mark read
      if (openChat.state === 'expanded' && chat.unreadCount > 0) {
        await api.post(`/chats/${openChat.id}/read`);
      }
    }
  } catch (e) {
    console.error('Error in global chat loop:', e);
  }
}

function startGlobalLoop() {
  if (loopInterval) return;
  mktGlobalLoop();
  loopInterval = setInterval(mktGlobalLoop, 4000);
}

// ── Rendering Chat List Drawer Content ──
function updateDrawerUI() {
  const itemsContainer = document.getElementById('mkt-drawer-items');
  if (!itemsContainer) return;

  // Header unread counts badge
  const headerUnreadContainer = document.getElementById('mkt-drawer-unread-total');
  if (headerUnreadContainer) {
    const count = window.mktChatList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    headerUnreadContainer.innerHTML = count > 0 ? `<span class="mkt-unread-badge">${count}</span>` : '';
  }

  if (window.mktChatSearchActive) {
    renderNewChatSearch();
    return;
  }

  if (!window.mktChatList.length) {
    itemsContainer.innerHTML = `<div class="mkt-empty" style="font-size: 0.78rem;">No conversations yet.</div>`;
    return;
  }

  // Filter list if search query is present
  const query = window.mktSearchQuery.trim().toLowerCase();
  const filtered = window.mktChatList.filter(c =>
    c.counterpartyName.toLowerCase().includes(query) ||
    c.listingTitle.toLowerCase().includes(query)
  );

  itemsContainer.innerHTML = filtered.map(c => {
    const initial = c.counterpartyName.charAt(0).toUpperCase();
    const onlineClass = c.isOnline ? 'online' : '';
    const unreadBadge = c.unreadCount > 0 ? `<span class="mkt-unread-badge">${c.unreadCount}</span>` : '';
    const rateText = c.status === 'AGREED' ? `Closed: ${inr(c.agreedBuyerPrice)}` : `Buy: ${c.agreedBuyerPrice ? inr(c.agreedBuyerPrice) : '—'} | Sell: ${c.agreedSellerPrice ? inr(c.agreedSellerPrice) : '—'}`;

    return `
      <div class="mkt-chat-list-item" onclick="window.mktOpenChat(${c.id})">
        <div class="mkt-chat-avatar">
          ${initial}
          <span class="mkt-status-dot ${onlineClass}"></span>
        </div>
        <div class="mkt-chat-item-info">
          <div class="mkt-chat-item-row">
            <span class="mkt-chat-item-name">${esc(c.counterpartyName)}</span>
            <span class="mkt-chat-item-time">${unreadBadge || new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <span class="mkt-chat-item-snippet" style="font-size:0.75rem; color:var(--foreground);">${esc(c.listingTitle)}</span>
          <span class="mkt-chat-item-snippet">${rateText}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Render the search results in "New Chat" overlay
async function renderNewChatSearch() {
  const container = document.getElementById('mkt-drawer-items');
  if (!container) return;

  const query = window.mktSearchQuery.trim().toLowerCase();
  if (window.mktAvailableListings.length === 0) {
    try {
      const res = await api.get('/listings?status=ACTIVE');
      // Filter out listings owned by current user
      window.mktAvailableListings = res.listings.filter(l => l.sellerId !== api.getMember()?.id);
    } catch (e) {
      console.error('Failed to load listings for new chat:', e);
    }
  }

  // Filter listings based on query
  const filtered = window.mktAvailableListings.filter(l =>
    l.title.toLowerCase().includes(query) ||
    l.commodityName.toLowerCase().includes(query) ||
    l.sellerName.toLowerCase().includes(query)
  );

  if (!filtered.length) {
    container.innerHTML = `<div class="mkt-empty" style="font-size: 0.78rem;">No active listings found to negotiate on.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="mkt-new-chat-overlay">
      <div style="font-size: 0.72rem; padding: 0.4rem 0.85rem; color: var(--muted-foreground); text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border);">Select Listing to Negotiate</div>
      ${filtered.map(l => `
        <div class="mkt-new-chat-item" onclick="window.mktStartNewNegotiation(${l.id})">
          <div style="flex:1;">
            <div style="font-weight:700; color:var(--foreground);">${esc(l.title)}</div>
            <div class="mkt-muted" style="font-size:0.7rem;">Owner: ${esc(l.sellerName)} · Rate: ${inr(l.pricePerQuintal)}</div>
          </div>
          <span class="mkt-badge mkt-badge-buy" style="font-size:0.6rem;">${l.direction}</span>
        </div>
      `).join('')}
    </div>
  `;
}

window.mktStartNewNegotiation = async function (listingId) {
  try {
    const res = await api.post('/chats', { listingId });
    window.mktChatSearchActive = false;
    window.mktSearchQuery = '';
    const searchInput = document.getElementById('mkt-drawer-search-input');
    if (searchInput) searchInput.value = '';
    
    // Open the window
    window.mktOpenChat(res.chat.id);
  } catch (e) {
    alert(e.message);
  }
};

// ── Update Single Chat Window DOM (avoid full redraw for input cursor focus) ──
function updateChatWindowUI(roomId) {
  const chat = window.mktOpenChats.find(c => c.id === roomId);
  if (!chat || chat.state === 'collapsed' || chat.isLoading) return;

  const messagesContainer = document.getElementById(`mkt-chat-body-${roomId}`);
  const negotiateContainer = document.getElementById(`mkt-chat-negotiate-${roomId}`);

  if (negotiateContainer) {
    const myPrice = chat.isBuyer ? chat.agreedBuyerPrice : chat.agreedSellerPrice;
    const theirPrice = chat.isBuyer ? chat.agreedSellerPrice : chat.agreedBuyerPrice;
    const isAgreed = chat.status === 'AGREED';

    if (isAgreed) {
      negotiateContainer.innerHTML = `
        <div class="mkt-chat-negotiate-row" style="justify-content: center;">
          <span style="font-weight:700; color:var(--success);">Deal Closed at ${inr(chat.agreedBuyerPrice)}!</span>
        </div>
      `;
      const inputForm = document.getElementById(`mkt-chat-form-${roomId}`);
      if (inputForm) inputForm.style.display = 'none';
    } else {
      negotiateContainer.innerHTML = `
        <div class="mkt-chat-negotiate-row">
          <span>Counterparty: <strong>${theirPrice ? inr(theirPrice) : 'None committed'}</strong></span>
          <span class="mkt-muted">Commission: ${(Number(chat.commissionRate) * 100).toFixed(1)}%</span>
        </div>
        <div class="mkt-chat-negotiate-row" style="margin-top: 0.15rem;">
          <div class="mkt-chat-negotiate-input-group">
            <span class="mkt-muted">Your Price:</span>
            <input id="mkt-price-commit-${roomId}" type="number" step="0.01" min="0" placeholder="₹ Rate" value="${myPrice || ''}">
            <button class="mkt-btn mkt-btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="window.mktProposeRate(${roomId}, parseFloat(document.getElementById('mkt-price-commit-${roomId}').value))">Commit</button>
          </div>
        </div>
      `;
    }
  }

  if (messagesContainer) {
    if (!chat.messages.length) {
      messagesContainer.innerHTML = `<div class="mkt-empty" style="font-size:0.75rem;">No messages yet. Start bargaining!</div>`;
      return;
    }

    // Sort: oldest first (displayed from top to bottom)
    const sorted = [...chat.messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Detect new messages boundary if there are unread ones
    let html = '';
    let dividerPlaced = false;
    
    sorted.forEach((m, idx) => {
      const isMe = m.senderId === api.getMember()?.id;
      const isSystem = m.senderId == null;

      // If we see the first incoming unread message, place a divider
      if (!isMe && !isSystem && !m.isRead && !dividerPlaced) {
        html += `
          <div class="mkt-chat-new-msg-divider">
            New Messages
            <span style="margin-left: 3px; font-size: 0.62rem;">▼</span>
          </div>`;
        dividerPlaced = true;
      }

      if (isSystem) {
        html += `<div class="mkt-chat-system-msg">${esc(m.messageText)}</div>`;
        return;
      }

      const bubbleClass = isMe ? 'me' : 'other';
      const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Build status indicator for my messages
      let statusIcon = '';
      if (isMe) {
        if (m.status === 'sending') {
          statusIcon = `<span class="mkt-chat-status-icon" title="Sending">🕒</span>`;
        } else if (m.status === 'failed') {
          statusIcon = `<span class="mkt-chat-status-icon" title="Failed" style="color:var(--danger)">⚠️</span>`;
        } else if (m.isRead || m.status === 'seen') {
          // Double check (seen)
          statusIcon = `<span class="mkt-chat-status-icon" title="Seen" style="color:var(--primary)">✓✓</span>`;
        } else {
          // Single check (delivered)
          statusIcon = `<span class="mkt-chat-status-icon" title="Delivered">✓</span>`;
        }
      }

      html += `
        <div class="mkt-chat-bubble ${bubbleClass}">
          <div class="mkt-chat-bubble-text">${esc(m.messageText)}</div>
          <span class="mkt-chat-bubble-meta">${time} ${statusIcon}</span>
        </div>
      `;
    });

    messagesContainer.innerHTML = html;
  }
}

// ── Render Entire Floating Chat Overlay Layout ──
function renderChatOverlay() {
  const container = document.getElementById('market-chat-container');
  if (!container) return;

  if (!api.isAuthed()) {
    container.innerHTML = '';
    return;
  }

  const isListExpanded = window.mktDrawerState === 'expanded';
  const drawerChevron = isListExpanded 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

  const searchBtnIcon = window.mktChatSearchActive
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>` // Close icon
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`; // Plus icon

  // Build individual chat window tabs
  const chatWindowsHtml = window.mktOpenChats.map(c => {
    const isExpanded = c.state === 'expanded';
    const isCollapsed = c.state === 'collapsed';
    
    const activeMobileClass = window.mktActiveMobileChatId === c.id ? 'active-mobile' : '';
    const onlineClass = c.isOnline ? 'online' : '';
    const statusText = c.isOnline ? 'Online' : 'Offline';

    const sizeClass = isCollapsed ? 'collapsed' : 'expanded';

    return `
      <div id="mkt-chat-win-${c.id}" class="mkt-chat-window ${sizeClass} ${activeMobileClass}">
        <!-- Header -->
        <header class="mkt-chat-window-header" onclick="window.mktToggleChatState(${c.id}, '${isCollapsed ? 'expanded' : 'collapsed'}')">
          <div class="mkt-chat-window-title">
            <span class="mkt-chat-window-name">${esc(c.counterpartyName)}</span>
            <span class="mkt-chat-window-status ${onlineClass}">${statusText}</span>
          </div>
          <div class="mkt-chat-window-actions" onclick="event.stopPropagation()">
            <!-- Minimize/Expand Button -->
            ${
              isCollapsed
                ? `<button class="mkt-chat-drawer-btn" title="Expand" onclick="window.mktToggleChatState(${c.id}, 'expanded')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>`
                : `<button class="mkt-chat-drawer-btn" title="Minimize" onclick="window.mktToggleChatState(${c.id}, 'collapsed')">—</button>`
            }
            <!-- Close Button -->
            <button class="mkt-chat-drawer-btn" title="Close" onclick="window.mktCloseChat(${c.id})">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </header>

        <!-- Body content when not collapsed -->
        ${
          !isCollapsed
            ? (c.isLoading
                ? `
                <div class="mkt-chat-loading-container">
                  <span class="mkt-chat-spinner"></span>
                  <span style="font-size:0.75rem; color:var(--muted-foreground); margin-top:0.55rem;">Loading negotiation...</span>
                </div>
                `
                : `
                <!-- Price Negotiation Bar -->
                <div id="mkt-chat-negotiate-${c.id}" class="mkt-chat-negotiate-panel">
                  <!-- Rendered dynamically -->
                  </div>
                <!-- Messages -->
                <div id="mkt-chat-body-${c.id}" class="mkt-chat-window-messages">
                  <!-- Rendered dynamically -->
                </div>
                <!-- Send Footer -->
                <form id="mkt-chat-form-${c.id}" class="mkt-chat-window-input-form" onsubmit="event.preventDefault(); window.mktSendMessage(${c.id}, document.getElementById('mkt-chat-msg-input-${c.id}').value); document.getElementById('mkt-chat-msg-input-${c.id}').value='';">
                  <input id="mkt-chat-msg-input-${c.id}" type="text" placeholder="Write a message…" required autocomplete="off">
                  <button class="mkt-btn mkt-btn-sm" type="submit" style="padding: 0.35rem 0.8rem;">></button>
                </form>
                `
              )
            : ''
        }
      </div>
    `;
  }).join('');

  container.innerHTML = `
    ${chatWindowsHtml}
    
    <!-- Main Drawer -->
    <div id="mkt-chat-drawer" class="mkt-chat-list-drawer ${isListExpanded ? 'expanded' : 'collapsed'}">
      <header class="mkt-chat-drawer-header" onclick="window.mktToggleDrawer()">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Messaging
          <span id="mkt-drawer-unread-total"></span>
        </h3>
        <div class="mkt-chat-drawer-actions" onclick="event.stopPropagation()">
          <button class="mkt-chat-drawer-btn" title="New Chat" onclick="window.mktToggleNewChatSearch()">
            ${searchBtnIcon}
          </button>
          <button class="mkt-chat-drawer-btn" title="Toggle Size" onclick="window.mktToggleDrawer()">
            ${drawerChevron}
          </button>
        </div>
      </header>
      
      <!-- Drawer Search input -->
      ${
        isListExpanded
          ? `
          <div class="mkt-chat-drawer-search">
            <input id="mkt-drawer-search-input" type="search" placeholder="${window.mktChatSearchActive ? 'Search listings to negotiate…' : 'Search messages…'}" value="${esc(window.mktSearchQuery)}" oninput="window.mktSearchQuery = this.value; window.mktUpdateDrawerList();">
          </div>
          `
          : ''
      }
      
      <!-- List Items -->
      <div id="mkt-drawer-items" class="mkt-chat-list-items">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  // Update dynamic content
  updateDrawerUI();
  window.mktOpenChats.forEach(c => {
    updateChatWindowUI(c.id);
    if (c.state === 'expanded') {
      scrollChatBottom(c.id);
    }
  });
}

// Drawer Action Handlers
window.mktToggleDrawer = function () {
  const nextState = window.mktDrawerState === 'collapsed' ? 'expanded' : 'collapsed';
  window.mktDrawerState = nextState;
  localStorage.setItem('mkt_drawer_state', nextState);
  renderChatOverlay();
};

window.mktToggleNewChatSearch = function () {
  window.mktChatSearchActive = !window.mktChatSearchActive;
  window.mktSearchQuery = '';
  // Force expand list drawer
  window.mktDrawerState = 'expanded';
  renderChatOverlay();
};

window.mktUpdateDrawerList = function () {
  updateDrawerUI();
};

// ════════════════════════════════════════
// Router Configuration
// ════════════════════════════════════════
const r = tinyrouter.new({
  defaultHandler: () => {
    document.getElementById('app').innerHTML =
      `<section class="mkt-feed"><div class="mkt-empty">Page not found. <a data-route href="/market">Go to feed</a></div></section>`;
  },
});

r.on('/market', () => { renderFeed(); });
r.on('/market/login', () => { renderAuth(); });
r.on('/market/watchlist', requireMember(() => { renderWatchlist(); }));
r.on('/market/sell', requireMember(() => { renderSell(); }));
r.on('/market/listing/{id}', (ctx) => { renderListing(ctx.params.id); });

// Intercept old chat route to open floating chat window dynamically
r.on('/market/chat/{id}', requireMember((ctx) => {
  const roomId = parseInt(ctx.params.id, 10);
  window.mktOpenChat(roomId);
  
  // Clean URL history state and stay on the current page
  const prevPath = window.location.pathname;
  if (prevPath.startsWith('/market/chat/')) {
    go('/market');
  } else {
    history.replaceState(null, '', prevPath);
  }
}));

initTheme();
r.ready();
renderNav();
renderChatOverlay();
startGlobalLoop();

window.addEventListener('popstate', () => {
  renderNav();
});
