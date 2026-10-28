/* ============================================================
   admin.js — drives admin.html
   Login (POST /api/admin/login) + Dashboard stats (GET /api/stats)
   Requires config.js FIRST.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const loginSection     = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm        = document.getElementById('loginForm');
  const loginBtn         = document.getElementById('loginBtn');
  const logoutBtn        = document.getElementById('logoutBtn');

  if (!loginForm) return;   // wrong page — stop quietly

  // The key we store the "logged in" flag under.
  const AUTH_KEY = 'isAdminLoggedIn';


  /* ============================================================
     SHOW / HIDE PANELS
     ============================================================ */
  function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadStats();
  }

  function showLogin() {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }


  /* ============================================================
     LOGIN — POST /api/admin/login
     ============================================================ */
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showMessage('Please enter both username and password.', 'error');
      return;
    }

    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    const result = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: { username: username, password: password }
    });

    loginBtn.disabled = false;
    loginBtn.textContent = originalText;

    if (result.ok) {
      // 200 — credentials accepted.
      // There is no token; we simply remember the fact locally.
      sessionStorage.setItem(AUTH_KEY, 'true');
      loginForm.reset();
      clearMessage();
      showDashboard();
    } else if (result.status === 401) {
      showMessage(result.message || 'Invalid username or password.', 'error');
      document.getElementById('password').value = '';   // clear only password
    } else {
      showMessage(result.message || 'Login failed. Please try again.', 'error');
    }
  });


  /* ============================================================
     LOGOUT
     ============================================================ */
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem(AUTH_KEY);
      showLogin();
      showMessage('You have been logged out.', 'info');
    });
  }


  /* ============================================================
     LOAD STATS — GET /api/stats
     ============================================================ */
  async function loadStats() {

    const result = await apiRequest('/api/stats');

    if (!result.ok || !result.data) {
      showMessage(result.message || 'Could not load statistics.', 'error');
      return;
    }

    const s = result.data;

    // Six headline numbers. ?? 0 guards against a missing field.
    document.getElementById('statsTotalDonors').textContent      = s.totalDonors ?? 0;
    document.getElementById('statsAvailableDonors').textContent  = s.availableDonors ?? 0;
    document.getElementById('statsTotalRequests').textContent    = s.totalRequests ?? 0;
    document.getElementById('statsOpenRequests').textContent     = s.openRequests ?? 0;
    document.getElementById('statsFulfilledRequests').textContent= s.fulfilledRequests ?? 0;
    document.getElementById('statsCancelledRequests').textContent= s.cancelledRequests ?? 0;

    renderBloodGroupTable(s.donorsByBloodGroup || []);
  }


  /* ============================================================
     BLOOD GROUP BREAKDOWN TABLE
     ============================================================ */
  function renderBloodGroupTable(rows) {
    const tbody = document.getElementById('bloodGroupTableBody');
    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="2" class="empty-state">No donor data yet.</td></tr>';
      return;
    }

    let html = '';
    rows.forEach(function (row) {
      html +=
        '<tr>' +
          '<td>' + bloodBadge(row.bloodGroup) + '</td>' +
          '<td>' + escapeHtml(row.count) + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;
  }


  /* ============================================================
     ON PAGE LOAD — restore the session if the flag is set
     ============================================================ */
  if (sessionStorage.getItem(AUTH_KEY) === 'true') {
    showDashboard();
  } else {
    showLogin();
  }

});