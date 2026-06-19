/**
 * HTML Shells — three independent surfaces served from one app.
 *
 *   ERP_SHELL      -> staff/admin ERP SPA  (root paths: /dashboard, /parties, ...)
 *   LANDING_SHELL  -> public editorial landing page (default domain `/`)
 *   MARKET_SHELL   -> public marketplace SPA (after signup) under /market
 *
 * The three surfaces share ONLY the backend (/api/* + Drizzle + Postgres).
 * They have separate bundles, routers, CSS and auth tokens — never cross-import.
 *
 * Routing (resolved in route.ts files by path):
 *   /                 + /about /contact   -> LANDING_SHELL
 *   /market           + /market/*         -> MARKET_SHELL
 *   everything else   (/parties, /login)  -> ERP_SHELL
 */

// ==========================================================================
// ERP SHELL — existing staff app. Identical to the original catch-all shell
// except the home links point at /dashboard (the root `/` now serves landing).
// ==========================================================================
export const ERP_SHELL = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>GCC — Ganesh Canvassing Company</title>
  <meta name="description" content="Professional commodity trading and brokerage management system">
  <link rel="icon" href="/gcc-logo.svg" type="image/png">

  <!-- Oat.ink CSS -->
  <link rel="stylesheet" href="/static/vendor/oat.min.css">
  <!-- Custom theme -->
  <link rel="stylesheet" href="/static/theme.css">
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
  <!-- Top Bar Navigation -->
  <nav class="topbar" id="sidebar">
    <!-- Hamburger button for mobile/tablet -->
    <button id="mobile-menu-toggle" class="mobile-menu-toggle" title="Toggle Menu" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>

    <div class="topbar-brand">
      <a href="/dashboard" data-route style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;color:inherit">
        <img src="/gcc-logo.svg" alt="GCC Logo" style="height:28px;border-radius:4px">
      </a>
    </div>

    <!-- Desktop horizontal navigation -->
    <div class="topbar-nav">
      <a href="/dashboard" data-route>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Dashboard</span>
      </a>
      <div id="desktop-masters-menu-placeholder" style="display:flex;align-items:center;gap:0.125rem;align-self:stretch"></div>
      <div id="desktop-transactions-menu-placeholder" style="display:flex;align-items:center;gap:0.125rem;align-self:stretch"></div>
      <div id="desktop-ledger-menu-placeholder" style="display:flex;align-items:center;gap:0.125rem;align-self:stretch"></div>
      <div id="desktop-admin-menu-placeholder" style="display:flex;align-items:center;gap:0.125rem;align-self:stretch"></div>
    </div>

    <div class="topbar-actions">
      <button id="theme-toggle" class="theme-toggle" title="Toggle theme" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      </button>
      <a href="#" id="logout-btn" class="topbar-logout" title="Logout">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      </a>
    </div>
  </nav>

  <!-- Mobile Navigation Drawer -->
  <div class="topbar-nav-mobile-drawer">
    <a href="/dashboard" data-route>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Dashboard</span>
    </a>
    <div id="mobile-masters-menu-placeholder"></div>
    <div id="mobile-transactions-menu-placeholder"></div>
    <div id="mobile-ledger-menu-placeholder"></div>
    <div id="mobile-admin-menu-placeholder"></div>
  </div>

  <!-- Mobile Menu Backdrop -->
  <div class="mobile-menu-backdrop" id="mobile-menu-backdrop"></div>

  <!-- Main Content -->
  <div class="main-content" id="main-content">
    <div id="app">
      <!-- SPA content rendered here by app.js -->
    </div>
  </div>

  <!-- Vendor JS -->
  <script src="/static/vendor/oat.min.js"></script>
  <!-- Main App (ES module) -->
  <script type="module" src="/static/app.js"></script>
</body>
</html>`;

// ==========================================================================
// LANDING SHELL — public editorial single page. Awwwards-style minimal design,
// smooth scroll-reveal animations driven by IntersectionObserver in site.js.
// ==========================================================================
export const LANDING_SHELL = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>GCC — Ganesh Canvassing Company · Commodity Brokers since 1987</title>
  <meta name="description" content="Ganesh Canvassing Company (GCC) — commodity brokers since 1987. Experience Speaks. Trusted brokerage across wheat, maize, pulses and oilseeds, with a new digital marketplace on the way.">
  <link rel="icon" href="/gcc-logo.svg" type="image/png">
  <!-- ERP design system: Outfit font + shared design tokens (theme.css) -->
  <link rel="stylesheet" href="/static/theme.css">
  <!-- Landing-only editorial layout + animations, built on the same tokens -->
  <link rel="stylesheet" href="/static/site/site.css">
</head>
<body>
  <header class="site-nav" data-nav>
    <a class="site-brand" href="/">
      <img src="/gcc-logo.svg" alt="" width="26" height="26">
      <span>GCC</span>
    </a>
    <nav class="site-nav-links">
      <a href="#brokerage">Brokerage</a>
      <a href="#commodities">Commodities</a>
      <a href="#marketplace">Marketplace</a>
    </nav>
    <div class="site-nav-actions">
      <a class="site-link-muted" href="/login">Staff login</a>
      <a class="site-btn" href="#brokerage">Work with us</a>
    </div>
  </header>

  <main>
    <!-- HERO -->
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow reveal">Ganesh Canvassing Company · Since 1987</p>
        <h1 class="hero-title">
          <span class="reveal" style="color:var(--foreground)">Experience Speaks</span>
        </h1>
        <p class="hero-sub reveal">For nearly four decades we have connected the right buyers and
          sellers across India's commodity markets — pricing it right, closing it cleanly, and
          standing behind every deal.</p>
        <div class="hero-cta reveal">
          <a class="site-btn site-btn-lg" href="#brokerage">Our brokerage</a>
          <a class="site-link-arrow" href="#marketplace">Explore the marketplace &rarr;</a>
        </div>
      </div>
      <div class="hero-scroll reveal" aria-hidden="true">scroll</div>
    </section>

    <!-- BROKERAGE (primary) -->
    <section class="section" id="brokerage">
      <div class="section-head reveal">
        <span class="section-index">01</span>
        <h2>What we do</h2>
      </div>
      <div class="grid-3">
        <article class="card reveal">
          <h3>Connect</h3>
          <p>We match the right buyers and sellers across commodities — drawing on relationships
             built over decades in the mandi.</p>
        </article>
        <article class="card reveal">
          <h3>Price &amp; close</h3>
          <p>We negotiate fair terms, settle the rate, and see the trade through — the judgement
             that only experience brings.</p>
        </article>
        <article class="card reveal">
          <h3>Stand behind it</h3>
          <p>Every contract, delivery and payment is recorded and followed up in our own
             settlement and ledger system.</p>
        </article>
      </div>
    </section>

    <!-- COMMODITIES -->
    <section class="section" id="commodities">
      <div class="section-head reveal">
        <span class="section-index">02</span>
        <h2>Commodities</h2>
      </div>
      <ul class="commodity-list">
        <li class="reveal"><span>Wheat</span><span class="muted">Sharbati · Lokwan · MP</span></li>
        <li class="reveal"><span>Maize</span><span class="muted">Feed · Starch grade</span></li>
        <li class="reveal"><span>Pulses</span><span class="muted">Chana · Tur · Moong</span></li>
        <li class="reveal"><span>Oilseeds</span><span class="muted">Soybean · Mustard</span></li>
      </ul>
    </section>

    <!-- MARKETPLACE (secondary) -->
    <section class="section" id="marketplace">
      <div class="section-head reveal">
        <span class="section-index">03</span>
        <h2>The marketplace — coming soon</h2>
      </div>
      <div class="trust-grid">
        <div class="reveal"><strong>Discover</strong><p>A live feed of listings from counterparties we already know and broker for.</p></div>
        <div class="reveal"><strong>Negotiate</strong><p>Bargain privately; when both sides agree the same price, the deal comes to us.</p></div>
        <div class="reveal"><strong>Trade</strong><p>We verify, broker transparently, and the trade flows into our proven systems.</p></div>
      </div>
      <p class="hero-sub reveal" style="margin-top:2.5rem">We are building a digital marketplace to bring
        this brokerage online — the same trust, now at your fingertips.
        <a class="site-link-arrow" href="/market">Preview it &rarr;</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <div class="reveal">
      <span class="site-brand"><img src="/gcc-logo.svg" alt="" width="22" height="22"> GCC</span>
      <p class="muted">Ganesh Canvassing Company — commodity brokers since 1987. Experience Speaks.</p>
    </div>
    <nav class="reveal">
      <a href="#brokerage">Brokerage</a>
      <a href="/market">Marketplace</a>
      <a href="/login">Staff login</a>
    </nav>
  </footer>

  <script type="module" src="/static/site/site.js"></script>
</body>
</html>`;

// ==========================================================================
// MARKET SHELL — mounts the marketplace SPA (own router + mkt_token auth).
// Bundle: /static/market/app.js. Styles build on theme.css + site.css tokens.
// ==========================================================================
export const MARKET_SHELL = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>GCC Marketplace</title>
  <meta name="description" content="Ganesh Canvassing Company commodity marketplace.">

  <link rel="icon" href="/gcc-logo.svg" type="image/png">
  <!-- Oat.ink CSS -->
  <link rel="stylesheet" href="/static/vendor/oat.min.css">
  <!-- Custom theme -->
  <link rel="stylesheet" href="/static/theme.css">
  <link rel="stylesheet" href="/static/site/site.css">
  <link rel="stylesheet" href="/static/market/market.css">
</head>


<body>
  <header id="market-nav"><!-- nav rendered by app.js --></header>
  <main id="app"><!-- marketplace views rendered here --></main>
  <script type="module" src="/static/market/app.js"></script>
</body>
</html>`;
