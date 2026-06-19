/** Auth view — combined sign in / create account for marketplace members. */
import * as api from '../lib/api.js';
import { mount, esc, go, toast } from '../lib/ui.js';

export function renderAuth() {
  if (api.isAuthed()) {
    go('/market');
    return;
  }

  let mode = 'login'; // 'login' | 'register'

  function view() {
    const isReg = mode === 'register';
    mount(`
      <section class="mkt-auth">
        <div class="mkt-auth-card">
          <h1>${isReg ? 'Create your account' : 'Welcome back'}</h1>
          <p class="mkt-muted">${isReg ? 'Join the GCC marketplace.' : 'Sign in to the GCC marketplace.'}</p>
          <form id="mkt-auth-form" class="mkt-form">
            ${isReg ? `
              <label>Name<input name="name" required autocomplete="name"></label>
              <label>Email (optional)<input name="email" type="email" autocomplete="email"></label>
            ` : ''}
            <label>Phone<input name="phone" required inputmode="tel" autocomplete="tel"></label>
            <label>Password<input name="password" type="password" required minlength="6" autocomplete="${isReg ? 'new-password' : 'current-password'}"></label>
            ${isReg ? `
              <label>I want to<select name="role">
                <option value="BOTH">Buy &amp; sell</option>
                <option value="BUYER">Buy only</option>
                <option value="SELLER">Sell only</option>
              </select></label>
            ` : ''}
            <button class="mkt-btn" type="submit">${isReg ? 'Create account' : 'Sign in'}</button>
          </form>
          <p class="mkt-auth-switch">
            ${isReg ? 'Already have an account?' : 'New to GCC?'}
            <a href="#" id="mkt-auth-toggle">${isReg ? 'Sign in' : 'Create one'}</a>
          </p>
        </div>
      </section>
    `);

    document.getElementById('mkt-auth-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      mode = isReg ? 'login' : 'register';
      view();
    });

    document.getElementById('mkt-auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      try {
        const path = isReg ? '/auth/register' : '/auth/login';
        const data = await api.post(path, payload);
        api.setSession(data.token, data.member);
        toast(isReg ? 'Account created' : 'Signed in', 'success');
        go('/market');
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    });
  }

  view();
}
