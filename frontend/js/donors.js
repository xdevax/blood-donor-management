/* ============================================================
   donors.js — drives donors.html
   READ (list + filter), UPDATE (edit panel), DELETE
   Requires config.js FIRST.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Grab elements once ---------- */
  const filterBloodGroup   = document.getElementById('filterBloodGroup');
  const filterCity         = document.getElementById('filterCity');
  const filterAvailability = document.getElementById('filterAvailability');
  const searchBtn          = document.getElementById('searchBtn');
  const resetBtn           = document.getElementById('resetBtn');

  const emptyState         = document.getElementById('emptyState');
  const tableSection       = document.getElementById('donorTableSection');
  const tableBody          = document.getElementById('donorTableBody');
  const donorCount         = document.getElementById('donorCount');

  const editSection        = document.getElementById('editDonorSection');
  const editForm           = document.getElementById('editDonorForm');
  const updateDonorBtn     = document.getElementById('updateDonorBtn');
  const cancelEditBtn      = document.getElementById('cancelEditBtn');

  if (!tableBody) return;   // wrong page — stop quietly


  /* ============================================================
     LOAD DONORS  —  GET /api/donors?bloodGroup=O%2B&city=jaipur
     ============================================================ */
  async function loadDonors() {

    showLoading();
    tableSection.classList.add('hidden');
    emptyState.classList.add('hidden');

    /* ----- Build the query string with URLSearchParams -----
       URLSearchParams percent-encodes every value automatically.
       'O+' becomes 'O%2B'.  This matters because in a URL query
       string a raw '+' is shorthand for a SPACE, so hand-built
       string concatenation would send bloodGroup=" " and match
       nothing. URLSearchParams removes that entire class of bug. */
    const params = new URLSearchParams();

    if (filterBloodGroup && filterBloodGroup.value) {
      params.append('bloodGroup', filterBloodGroup.value);
    }
    if (filterCity && filterCity.value.trim()) {
      params.append('city', filterCity.value.trim());
    }
    if (filterAvailability && filterAvailability.value !== '') {
      params.append('isAvailable', filterAvailability.value);
    }

    const queryString = params.toString();          // '' if no filters
    const endpoint = queryString
      ? '/api/donors?' + queryString
      : '/api/donors';

    const result = await apiRequest(endpoint);

    hideLoading();

    if (!result.ok) {
      showMessage(result.message || 'Could not load donors.', 'error');
      emptyState.classList.remove('hidden');
      donorCount.textContent = '0';
      return;
    }

    const donors = result.data || [];
    donorCount.textContent = donors.length;

    if (donors.length === 0) {
      emptyState.classList.remove('hidden');
      tableSection.classList.add('hidden');
      tableBody.innerHTML = '';
      return;
    }

    renderDonors(donors);
    tableSection.classList.remove('hidden');
    emptyState.classList.add('hidden');
  }


  /* ============================================================
     RENDER ROWS
     Every DB value passes through escapeHtml() before touching
     innerHTML. data-id carries the Mongo _id for the buttons.
     ============================================================ */
  function renderDonors(donors) {
    let html = '';

    donors.forEach(function (d, index) {
      html +=
        '<tr>' +
          '<td>' + (index + 1) + '</td>' +
          '<td>' + escapeHtml(d.name) + '</td>' +
          '<td>' + escapeHtml(d.age) + '</td>' +
          '<td>' + escapeHtml(d.gender) + '</td>' +
          '<td>' + bloodBadge(d.bloodGroup) + '</td>' +
          '<td>' + escapeHtml(d.phone) + '</td>' +
          '<td>' + escapeHtml(d.city) + '</td>' +
          '<td>' + availabilityBadge(d.isAvailable) + '</td>' +
          '<td>' +
            '<div class="btn-group">' +
              '<button class="btn btn-sm btn-outline" data-action="edit" data-id="' + d._id + '">Edit</button>' +
              '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + d._id + '" data-name="' + escapeHtml(d.name) + '">Delete</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
    });

    tableBody.innerHTML = html;
  }


  /* ============================================================
     EVENT DELEGATION
     ONE listener on the tbody instead of two per row.
     Rows are rebuilt on every load, so per-row listeners would
     have to be re-attached every time (and old ones leak memory).
     Clicks bubble UP from the button to the tbody, and we ask
     event.target which button was actually clicked.
     ============================================================ */
  tableBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;                 // clicked empty space in a cell

    const id     = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    if (action === 'edit')   startEdit(id);
    if (action === 'delete') deleteDonor(id, button.getAttribute('data-name'));
  });


  /* ============================================================
     EDIT — fetch one donor, fill the panel, reveal it
     ============================================================ */
  async function startEdit(id) {
    const result = await apiRequest('/api/donors/' + id);

    if (!result.ok || !result.data) {
      showMessage(result.message || 'Could not load that donor.', 'error');
      return;
    }

    const d = result.data;

    document.getElementById('editDonorId').value    = d._id;
    document.getElementById('editName').value       = d.name || '';
    document.getElementById('editAge').value        = d.age || '';
    document.getElementById('editGender').value     = d.gender || '';
    document.getElementById('editBloodGroup').value = d.bloodGroup || '';
    document.getElementById('editPhone').value      = d.phone || '';
    document.getElementById('editEmail').value      = d.email || '';
    document.getElementById('editCity').value       = d.city || '';
    document.getElementById('editState').value      = d.state || '';

    // DATE CONVERSION (API -> form):
    // API sends '2024-03-15T00:00:00.000Z' but <input type="date">
    // accepts ONLY 'YYYY-MM-DD'. Anything else shows blank silently.
    document.getElementById('editLastDonationDate').value =
      toInputDate(d.lastDonationDate);

    document.getElementById('editIsAvailable').checked = d.isAvailable === true;

    editSection.classList.remove('hidden');
    editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  /* ============================================================
     UPDATE — PUT /api/donors/:id
     ============================================================ */
  if (editForm) {
    editForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      const id = document.getElementById('editDonorId').value;

      const age              = document.getElementById('editAge').value.trim();
      const email            = document.getElementById('editEmail').value.trim();
      const state            = document.getElementById('editState').value.trim();
      const lastDonationDate = document.getElementById('editLastDonationDate').value;

      const body = {
        name:        document.getElementById('editName').value.trim(),
        age:         Number(age),
        gender:      document.getElementById('editGender').value,
        bloodGroup:  document.getElementById('editBloodGroup').value,
        phone:       document.getElementById('editPhone').value.trim(),
        city:        document.getElementById('editCity').value.trim(),
        isAvailable: document.getElementById('editIsAvailable').checked
      };

      if (email) body.email = email;
      if (state) body.state = state;

      // DATE CONVERSION (form -> API):
      // The input already gives 'YYYY-MM-DD', which Mongoose parses
      // happily, so it is sent through as-is.
      if (lastDonationDate) body.lastDonationDate = lastDonationDate;

      if (!age || isNaN(body.age)) {
        showMessage('Please enter a valid age.', 'error');
        return;
      }

      const originalText = updateDonorBtn.textContent;
      updateDonorBtn.disabled = true;
      updateDonorBtn.textContent = 'Updating...';

      const result = await apiRequest('/api/donors/' + id, {
        method: 'PUT',
        body: body
      });

      updateDonorBtn.disabled = false;
      updateDonorBtn.textContent = originalText;

      if (result.ok) {
        showMessage(result.message || 'Donor updated successfully!', 'success');
        editSection.classList.add('hidden');
        loadDonors();                     // re-render so the row shows new data
      } else {
        showMessage(result.message || 'Could not update donor.', 'error');
      }
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function () {
      editSection.classList.add('hidden');
      clearMessage();
    });
  }


  /* ============================================================
     DELETE — confirm() then DELETE /api/donors/:id
     ============================================================ */
  async function deleteDonor(id, name) {
    const ok = confirm('Delete donor "' + name + '"?\n\nThis cannot be undone.');
    if (!ok) return;

    const result = await apiRequest('/api/donors/' + id, { method: 'DELETE' });

    if (result.ok) {
      showMessage(result.message || 'Donor deleted.', 'success');
      editSection.classList.add('hidden');   // in case that donor was open
      loadDonors();                          // MUST re-render or the row lingers
    } else {
      showMessage(result.message || 'Could not delete donor.', 'error');
    }
  }


  /* ============================================================
     SEARCH / RESET
     ============================================================ */
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      loadDonors();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (filterBloodGroup)   filterBloodGroup.value = '';
      if (filterCity)         filterCity.value = '';
      if (filterAvailability) filterAvailability.value = '';
      clearMessage();
      loadDonors();
    });
  }

  // Pressing Enter in the city box should search, not reload the page
  if (filterCity) {
    filterCity.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadDonors();
      }
    });
  }


  /* ---------- Initial load ---------- */
  loadDonors();

});