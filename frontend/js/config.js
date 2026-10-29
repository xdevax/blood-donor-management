/* ============================================================
   config.js — shared configuration + helper functions
   Loaded FIRST on every page, before the page-specific script.
   ============================================================ */

/* ------------------------------------------------------------
   DEPLOYMENT:
   Local development (localhost or 127.0.0.1) -> 'http://localhost:8080'
   Deployed backend (Netlify/production)     -> 'https://blood-donor-api-q1jg.onrender.com'
   No trailing slash.
   ------------------------------------------------------------ */
const API_BASE_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:8080'
  : 'https://blood-donor-api-q1jg.onrender.com';


/* ============================================================
   Auth Helpers
   ============================================================ */
function getAuthUser() {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = 'login.html';
}


/* ============================================================
   apiRequest(endpoint, options)
   ------------------------------------------------------------
   One wrapper around fetch() used by EVERY page.
   - endpoint: path only, e.g. '/api/donors'
   - options : { method, body, token }  (body is a plain object)

   ALWAYS returns an object shaped like:
     { ok, status, success, data, message, count }
   It NEVER throws, so callers never need try/catch.
   ============================================================ */
async function apiRequest(endpoint, options = {}) {
  const url = API_BASE_URL + endpoint;

  const config = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  // Add Authorization header if a token is provided directly or stored in localStorage
  const authToken = options.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (authToken) {
    config.headers['Authorization'] = 'Bearer ' + authToken;
  }

  // Only GET/DELETE have no body. Convert the object to a JSON string.
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);   // wait for the server
    const result = await response.json();        // wait for the JSON body

    // If unauthorized (401), clear invalid/expired stored credentials
    if (response.status === 401 && typeof localStorage !== 'undefined' && !options.token) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }

    return {
      ok: response.ok,                 // true for status 200-299
      status: response.status,         // 200, 201, 400, 401, 403, 404, 409, 500
      success: result.success,         // the backend's own flag
      data: result.data,
      message: result.message,
      count: result.count,
      // Pass through MFA fields from auth responses
      mfaRequired: result.mfaRequired,
      mfaSetupRequired: result.mfaSetupRequired,
      setupToken: result.setupToken,
      mfaToken: result.mfaToken,
      qrDataUrl: result.qrDataUrl,
      otpauth: result.otpauth,
      token: result.token,
      user: result.user
    };
  } catch (error) {
    // Reached only if the network call itself failed:
    // backend down, wrong port, CORS block, or page opened via file://
    console.error('apiRequest failed:', url, error);
    return {
      ok: false,
      status: 0,
      success: false,
      data: null,
      message: 'Cannot reach the server. Is the backend running on ' + API_BASE_URL + ' ?'
    };
  }
}


/* ============================================================
   showMessage(text, type)
   ------------------------------------------------------------
   Writes an alert into #message.
   type: 'success' | 'error' | 'info' | 'warning'
   Auto-clears after 5 seconds and scrolls into view.
   ============================================================ */
let messageTimer = null;

function showMessage(text, type = 'info') {
  const box = document.getElementById('message');
  if (!box) return;                    // page has no #message -> do nothing

  box.className = 'alert alert-' + type;
  box.textContent = text;              // textContent, not innerHTML (safe)
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });

  clearTimeout(messageTimer);          // cancel any previous countdown
  messageTimer = setTimeout(clearMessage, 5000);
}

function clearMessage() {
  const box = document.getElementById('message');
  if (!box) return;
  box.textContent = '';
  box.className = 'hidden';
}


/* ============================================================
   Loading spinner helpers — toggle .hidden on #loadingState
   ============================================================ */
function showLoading() {
  const el = document.getElementById('loadingState');
  if (el) el.classList.remove('hidden');
}

function hideLoading() {
  const el = document.getElementById('loadingState');
  if (el) el.classList.add('hidden');
}


/* ============================================================
   escapeHtml(str)  ***SECURITY***
   ============================================================ */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')     // must be first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ============================================================
   formatDate(isoString) -> 'DD Mon YYYY' for DISPLAY in tables
   ============================================================ */
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}


/* ============================================================
   toInputDate(isoString) -> 'YYYY-MM-DD' for <input type="date">
   ============================================================ */
function toInputDate(isoString) {
  if (!isoString) return '';
  return String(isoString).split('T')[0];
}


/* ============================================================
   Badge builders — reuse existing CSS classes only.
   ============================================================ */
function badgeForStatus(status) {
  const safe = escapeHtml(status);
  const key = String(status || '').toLowerCase();
  return '<span class="badge badge-' + key + '">' + safe + '</span>';
}

function badgeForUrgency(urgency) {
  const safe = escapeHtml(urgency);
  const key = String(urgency || '').toLowerCase();
  return '<span class="badge badge-' + key + '">' + safe + '</span>';
}

function availabilityBadge(isAvailable) {
  return isAvailable
    ? '<span class="badge badge-available">Available</span>'
    : '<span class="badge badge-unavailable">Unavailable</span>';
}

function bloodBadge(group) {
  return '<span class="badge badge-blood">' + escapeHtml(group) + '</span>';
}


/* ============================================================
   Dynamic Staff Navigation Enhancer
   Appends Staff Login / Staff Logout link to navbar.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  const user = getAuthUser();
  const li = document.createElement('li');

  if (user && user.username) {
    li.innerHTML = '<a href="#" id="staffLogoutLink" style="font-weight: 600; color: #ffc107;">Logout (' + escapeHtml(user.username) + ' - ' + escapeHtml(user.role) + ')</a>';
    navLinks.appendChild(li);
    const link = document.getElementById('staffLogoutLink');
    if (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
      });
    }
  } else {
    const isLogin = window.location.pathname.endsWith('login.html');
    li.innerHTML = '<a href="login.html"' + (isLogin ? ' class="active"' : '') + '>Staff Login</a>';
    navLinks.appendChild(li);
  }
});
