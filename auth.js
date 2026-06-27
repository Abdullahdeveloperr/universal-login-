/**
 * auth.js — Lightweight login system for small HTML/CSS/JS projects
 * Usage: <script src="auth.js"></script>  (single line in your HTML)
 *
 * Features:
 *  - Beautiful login modal overlay
 *  - localStorage-based session (stays logged in on refresh)
 *  - Simple user store you can edit at the top
 *  - auth.onLogin(cb) / auth.onLogout(cb) hooks
 *  - auth.logout() to sign out from anywhere
 *  - auth.getUser() to get current user info
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     USER STORE  ← edit / replace with your own
  ───────────────────────────────────────────── */
  const USERS = [
    { username: "admin",   password: "admin123645045",   name: "Admin" },
    { username: "ali",     password: "ali202444556677",    name: "Ali" },
    { username: "saraustaad",    password: "saraBR21435",   name: "Sara" },
  ];

  const SESSION_KEY = "auth_user";
  let _loginCb  = null;
  let _logoutCb = null;

  /* ─────────────────────────────────────────────
     STYLES
  ───────────────────────────────────────────── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    #auth-overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(10,10,18,.82);
      backdrop-filter: blur(6px);
      font-family: 'Inter', system-ui, sans-serif;
      animation: auth-fade-in .25s ease;
    }
    @keyframes auth-fade-in { from { opacity:0 } to { opacity:1 } }

    #auth-card {
      background: #0f1117;
      border: 1px solid #1e2030;
      border-radius: 20px;
      padding: 44px 40px 40px;
      width: 100%; max-width: 400px;
      box-shadow: 0 32px 80px rgba(0,0,0,.6);
      animation: auth-slide-up .3s cubic-bezier(.22,.68,0,1.2);
    }
    @keyframes auth-slide-up {
      from { transform: translateY(24px); opacity:0 }
      to   { transform: translateY(0);    opacity:1 }
    }

    #auth-card .auth-logo {
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, #6c63ff, #48cfad);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 24px;
      font-size: 22px;
    }
    #auth-card h2 {
      color: #f0f0f5; font-size: 22px; font-weight: 700;
      margin: 0 0 6px;
    }
    #auth-card p.auth-sub {
      color: #60637a; font-size: 14px; margin: 0 0 32px;
    }

    #auth-card label {
      display: block; color: #9294a8;
      font-size: 12px; font-weight: 600;
      letter-spacing: .06em; text-transform: uppercase;
      margin-bottom: 7px;
    }
    #auth-card input {
      width: 100%; box-sizing: border-box;
      background: #181b27; border: 1px solid #252840;
      border-radius: 10px; padding: 12px 14px;
      color: #e8e8f0; font-size: 15px; font-family: inherit;
      outline: none; transition: border-color .2s, box-shadow .2s;
      margin-bottom: 18px;
    }
    #auth-card input:focus {
      border-color: #6c63ff;
      box-shadow: 0 0 0 3px rgba(108,99,255,.18);
    }
    #auth-card input::placeholder { color: #3a3d55; }

    #auth-card .auth-row {
      display: flex; align-items: center;
      justify-content: space-between; margin-bottom: 22px;
    }
    #auth-card .auth-row label {
      margin:0; display:flex; align-items:center; gap:7px;
      text-transform:none; letter-spacing:0; font-size:13px;
      color:#60637a; cursor:pointer;
    }
    #auth-card .auth-row input[type=checkbox] {
      width:auto; margin:0; accent-color:#6c63ff;
    }

    #auth-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #6c63ff, #48cfad);
      border: none; border-radius: 10px;
      color: #fff; font-size: 15px; font-weight: 600;
      font-family: inherit; cursor: pointer;
      transition: opacity .2s, transform .15s;
    }
    #auth-btn:hover  { opacity: .9; }
    #auth-btn:active { transform: scale(.98); }

    #auth-error {
      color: #ff6b8a; font-size: 13px; text-align: center;
      margin-top: 14px; min-height: 20px;
      animation: auth-shake .3s ease;
    }
    @keyframes auth-shake {
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-6px)}
      75%{transform:translateX(6px)}
    }

    /* ── Logged-in badge (top-right corner) ── */
    #auth-badge {
      position: fixed; top: 18px; right: 18px; z-index: 9998;
      display: flex; align-items: center; gap: 10px;
      background: #0f1117; border: 1px solid #1e2030;
      border-radius: 50px; padding: 8px 16px 8px 10px;
      font-family: 'Inter', system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
      animation: auth-fade-in .3s ease;
    }
    #auth-badge .auth-av {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #6c63ff, #48cfad);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 13px; font-weight: 700;
    }
    #auth-badge span { color: #c8cad8; font-size: 14px; font-weight: 500; }
    #auth-badge button {
      background: none; border: none; cursor: pointer;
      color: #60637a; font-size: 13px; font-family: inherit;
      padding: 0; margin-left: 4px;
      transition: color .2s;
    }
    #auth-badge button:hover { color: #ff6b8a; }
  `;

  /* ─────────────────────────────────────────────
     INJECT CSS
  ───────────────────────────────────────────── */
  const styleTag = document.createElement("style");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */
  function saveSession(user, remember) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function loadSession() {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function avatarLetter(name) {
    return (name || "?")[0].toUpperCase();
  }

  /* ─────────────────────────────────────────────
     BADGE (shown when logged in)
  ───────────────────────────────────────────── */
  function showBadge(user) {
    let badge = document.getElementById("auth-badge");
    if (badge) badge.remove();

    badge = document.createElement("div");
    badge.id = "auth-badge";
    badge.innerHTML = `
      <div class="auth-av">${avatarLetter(user.name)}</div>
      <span>${user.name}</span>
      <button id="auth-logout-btn">Sign out</button>
    `;
    document.body.appendChild(badge);
    document.getElementById("auth-logout-btn").addEventListener("click", auth.logout);
  }

  /* ─────────────────────────────────────────────
     LOGIN MODAL
  ───────────────────────────────────────────── */
  function showModal() {
    if (document.getElementById("auth-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.innerHTML = `
      <div id="auth-card">
        <div class="auth-logo">🔐</div>
        <h2>Welcome back</h2>
        <p class="auth-sub">Sign in to continue to your project</p>

        <label for="auth-username">Username</label>
        <input id="auth-username" type="text" placeholder="Enter your username" autocomplete="username" />

        <label for="auth-password">Password</label>
        <input id="auth-password" type="password" placeholder="Enter your password" autocomplete="current-password" />

        <div class="auth-row">
          <label>
            <input type="checkbox" id="auth-remember" />
            Remember me
          </label>
        </div>

        <button id="auth-btn">Sign In</button>
        <div id="auth-error"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const usernameEl = document.getElementById("auth-username");
    const passwordEl = document.getElementById("auth-password");
    const rememberEl = document.getElementById("auth-remember");
    const errorEl    = document.getElementById("auth-error");
    const btn        = document.getElementById("auth-btn");

    function attempt() {
      const u = usernameEl.value.trim().toLowerCase();
      const p = passwordEl.value;
      const found = USERS.find(x => x.username.toLowerCase() === u && x.password === p);

      if (found) {
        const userObj = { username: found.username, name: found.name };
        saveSession(userObj, rememberEl.checked);
        overlay.remove();
        showBadge(userObj);
        if (_loginCb) _loginCb(userObj);
      } else {
        errorEl.style.animation = "none";
        void errorEl.offsetWidth; // reflow to restart animation
        errorEl.style.animation = "";
        errorEl.textContent = "Incorrect username or password.";
        passwordEl.value = "";
        passwordEl.focus();
      }
    }

    btn.addEventListener("click", attempt);
    [usernameEl, passwordEl].forEach(el =>
      el.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); })
    );

    usernameEl.focus();
  }

  /* ─────────────────────────────────────────────
     PUBLIC API  →  window.auth
  ───────────────────────────────────────────── */
  window.auth = {
    /** Called with the user object when login succeeds */
    onLogin(cb)  { _loginCb  = cb; },

    /** Called when the user signs out */
    onLogout(cb) { _logoutCb = cb; },

    /** Returns the current user object, or null if not logged in */
    getUser() { return loadSession(); },

    /** Sign the user out */
    logout() {
      clearSession();
      const badge = document.getElementById("auth-badge");
      if (badge) badge.remove();
      if (_logoutCb) _logoutCb();
      showModal();
    },
  };

  /* ─────────────────────────────────────────────
     BOOT  — check session on page load
  ───────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    const user = loadSession();
    if (user) {
      showBadge(user);
      if (_loginCb) _loginCb(user);
    } else {
      showModal();
    }
  });
})();
