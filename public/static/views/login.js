/**
 * Login View — JWT authentication page
 * 
 * Uses a `data-page="login"` attribute on <body> to hide sidebar via CSS,
 * avoiding direct style mutations that cause React hydration mismatches.
 */
import { Icons, showToast } from '../components/ui.js';
import * as api from '../lib/api.js';

function warmupOverlayHTML() {
  return `
    <div class="warmup-overlay">
      <img src="/gcc-logo.svg" alt="GCC" onerror="this.style.display='none'">
      <div class="warmup-overlay-title">GCC</div>
      <div class="warmup-overlay-sub">Preparing your workspace…</div>
      <div class="warmup-overlay-track"><div class="warmup-overlay-bar"></div></div>
    </div>
  `;
}

export function renderLogin() {
  // Toggle sidebar visibility via a body attribute (CSS-driven, no hydration conflict)
  document.body.setAttribute('data-page', 'login');

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="logo">
          <img src="/gcc-logo.svg" alt="GCC" onerror="this.style.display='none'">
          <h1>GCC</h1>
        </div>

        <form id="login-form">
          <div class="form-group" style="margin-bottom:1rem">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required placeholder="Enter username" autofocus>
          </div>

          <div class="form-group" style="margin-bottom:1.5rem">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="Enter password">
          </div>

          <button type="submit" class="primary" style="width:100%">Sign In</button>

          <p id="login-error" style="color:var(--danger);font-size:0.75rem;margin-top:0.75rem;text-align:center;display:none"></p>
        </form>
      </div>
    </div>
  `;

  // Bind form submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      // Step 1: authenticate only (fast) and get details
      const data = await api.post('/auth/login', { username, password });
      api.setToken(data.token);
      localStorage.setItem('ss_user', data.username);
      localStorage.setItem('ss_companies', JSON.stringify(data.companies || []));
      localStorage.setItem('ss_role', data.role || 'EMPLOYEE');
      localStorage.setItem('ss_permissions', JSON.stringify(data.permissions || {}));
      localStorage.setItem('ss_display_name', data.displayName || data.username);

      // Step 2: navigate to home (which triggers company selection)
      showToast('Welcome back!', 'success');
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In';
      errEl.textContent = err.message || 'Login failed';
      errEl.style.display = 'block';
    }
  });
}
