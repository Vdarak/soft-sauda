/**
 * Catch-All SPA Shell — Returns raw HTML for every non-API route.
 * 
 * This completely bypasses React rendering. No hydration, no JSX,
 * no client-side React — just a plain HTML string served from the server.
 * The SPA logic is handled entirely by /static/app.js (ES module).
 * 
 * Next.js resolves routes by specificity, so /api/* routes (which are
 * more specific) always take priority over this [[...slug]] catch-all.
 */

const HTML_SHELL = `<!DOCTYPE html>
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
      <a href="/" data-route style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;color:inherit">
        <img src="/gcc-logo.svg" alt="GCC Logo" style="height:28px;border-radius:4px">
      </a>
    </div>

    <!-- Desktop horizontal navigation -->
    <div class="topbar-nav">
      <a href="/" data-route>
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
    <a href="/" data-route>
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

export async function GET() {
  return new Response(HTML_SHELL, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
