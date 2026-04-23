/**
 * Login View — JWT authentication page
 * 
 * Uses a `data-page="login"` attribute on <body> to hide sidebar via CSS,
 * avoiding direct style mutations that cause React hydration mismatches.
 */
import { Icons, showToast } from '../components/ui.js';
import * as api from '../lib/api.js';

export function renderLogin() {
  // Toggle sidebar visibility via a body attribute (CSS-driven, no hydration conflict)
  document.body.setAttribute('data-page', 'login');

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="logo">
          <img src="/static/logo.svg" alt="Soft Sauda" onerror="this.style.display='none'">
          <h1>Soft Sauda</h1>
          <p>Commodity Trading ERP</p>
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

    try {
      await api.login(username, password);
      // Remove login mode — sidebar reappears via CSS
      document.body.removeAttribute('data-page');
      showToast('Welcome back!', 'success');
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      errEl.textContent = err.message || 'Login failed';
      errEl.style.display = 'block';
    }
  });
}
