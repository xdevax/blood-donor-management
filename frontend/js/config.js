/* ============================================================
   config.js — shared configuration + helper functions
   Loaded FIRST on every page, before the page-specific script.
   ============================================================ */

/* ------------------------------------------------------------
   DEPLOYMENT: THIS IS THE ONE LINE TO CHANGE IN CHAT 11.
   Local development  -> 'http://localhost:5000'
   Deployed backend   -> 'https://your-app-name.onrender.com'
   No trailing slash.
   ------------------------------------------------------------ */
const API_BASE_URL = 'https://blood-donor-api-q1jg.onrender.com';


/* ============================================================
   apiRequest(endpoint, options)
   ------------------------------------------------------------
   One wrapper around fetch() used by EVERY page.
   - endpoint: path only, e.g. '/api/donors'
   - options : { method, body }  (body is a plain object, not a string)

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

  // Only GET/DELETE have no body. Convert the object to a JSON string.
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);   // wait for the server
    const result = await response.json();        // wait for the JSON body

    return {
      ok: response.ok,                 // true for status 200-299
      status: response.status,         // 200, 201, 400, 401, 404, 409, 500
      success: result.success,         // the backend's own flag
      data: result.data,
      message: result.message,
      count: result.count
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
   ------------------------------------------------------------
   Converts dangerous characters into harmless HTML entities
   BEFORE any database value is placed into innerHTML.

   Without it, a donor saved with the name
       <script>alert('hacked')</script>
   would EXECUTE in the browser of every user viewing the list.
   That attack is called stored XSS (Cross-Site Scripting).
   With it, the same text is displayed literally as characters.
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
   Example: '2024-03-15T00:00:00.000Z'  ->  '15 Mar 2024'
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
   ------------------------------------------------------------
   A date input REFUSES a full ISO timestamp and silently shows
   blank, so every edit form must run values through this first.
   Example: '2024-03-15T00:00:00.000Z'  ->  '2024-03-15'
   ============================================================ */
function toInputDate(isoString) {
  if (!isoString) return '';
  return String(isoString).split('T')[0];
}


/* ============================================================
   Badge builders — reuse existing CSS classes only.
   ============================================================ */

// Request status: Open | Fulfilled | Cancelled
function badgeForStatus(status) {
  const safe = escapeHtml(status);
  const key = String(status || '').toLowerCase();
  return '<span class="badge badge-' + key + '">' + safe + '</span>';
}

// Urgency: High | Medium | Low
function badgeForUrgency(urgency) {
  const safe = escapeHtml(urgency);
  const key = String(urgency || '').toLowerCase();
  return '<span class="badge badge-' + key + '">' + safe + '</span>';
}

// Donor availability: true -> Available, false -> Unavailable
function availabilityBadge(isAvailable) {
  return isAvailable
    ? '<span class="badge badge-available">Available</span>'
    : '<span class="badge badge-unavailable">Unavailable</span>';
}

// Blood group pill
function bloodBadge(group) {
  return '<span class="badge badge-blood">' + escapeHtml(group) + '</span>';
}