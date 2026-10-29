/* ============================================================
   requests.js — drives requests.html
   READ (list + filter), UPDATE (status panel), DELETE
   Requires config.js FIRST.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Grab elements once ---------- */
  const filterStatus     = document.getElementById('filterStatus');
  const filterBloodGroup = document.getElementById('filterBloodGroup');
  const filterCity       = document.getElementById('filterCity');
  const searchBtn        = document.getElementById('searchBtn');
  const resetBtn         = document.getElementById('resetBtn');

  const emptyState       = document.getElementById('emptyState');
  const tableSection     = document.getElementById('requestTableSection');
  const tableBody        = document.getElementById('requestTableBody');
  const requestCount     = document.getElementById('requestCount');

  const updateSection    = document.getElementById('updateRequestSection');
  const updateForm       = document.getElementById('updateRequestForm');
  const saveRequestBtn   = document.getElementById('saveRequestBtn');
  const cancelUpdateBtn  = document.getElementById('cancelUpdateBtn');

  if (!tableBody) return;   // wrong page — stop quietly


  /* ============================================================
     LOAD REQUESTS — GET /api/requests?status=Open&bloodGroup=AB%2B
     ============================================================ */
  async function loadRequests() {

    showLoading();
    tableSection.classList.add('hidden');
    emptyState.classList.add('hidden');

    // URLSearchParams encodes 'AB+' as 'AB%2B' automatically.
    const params = new URLSearchParams();

    if (filterStatus && filterStatus.value) {
      params.append('status', filterStatus.value);
    }
    if (filterBloodGroup && filterBloodGroup.value) {
      params.append('bloodGroup', filterBloodGroup.value);
    }
    if (filterCity && filterCity.value.trim()) {
      params.append('city', filterCity.value.trim());
    }

    const queryString = params.toString();
    const endpoint = queryString
      ? '/api/requests?' + queryString
      : '/api/requests';

    const result = await apiRequest(endpoint);

    hideLoading();

    if (!result.ok) {
      showMessage(result.message || 'Could not load requests.', 'error');
      emptyState.classList.remove('hidden');
      requestCount.textContent = '0';
      return;
    }

    const requests = result.data || [];
    requestCount.textContent = requests.length;

    if (requests.length === 0) {
      emptyState.classList.remove('hidden');
      tableSection.classList.add('hidden');
      tableBody.innerHTML = '';
      return;
    }

    renderRequests(requests);
    tableSection.classList.remove('hidden');
    emptyState.classList.add('hidden');
  }


  /* ============================================================
     RENDER ROWS — badges reuse the existing CSS classes
     ============================================================ */
  function renderRequests(requests) {
    let html = '';

    requests.forEach(function (r, index) {
      html +=
        '<tr>' +
          '<td>' + (index + 1) + '</td>' +
          '<td>' + escapeHtml(r.patientName) + '</td>' +
          '<td>' + bloodBadge(r.bloodGroup) + '</td>' +
          '<td>' + escapeHtml(r.unitsRequired) + '</td>' +
          '<td>' + escapeHtml(r.hospitalName) + '</td>' +
          '<td>' + escapeHtml(r.city) + '</td>' +
          '<td>' + badgeForUrgency(r.urgency) + '</td>' +
          '<td>' + badgeForStatus(r.status) + '</td>' +
          '<td>' + formatDate(r.neededBy) + '</td>' +
          '<td>' +
            '<div class="btn-group">' +
              '<button class="btn btn-sm btn-outline" data-action="update" data-id="' + r._id + '">Update</button>' +
              '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + r._id + '" data-name="' + escapeHtml(r.patientName) + '">Delete</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
    });

    tableBody.innerHTML = html;
  }


  /* ============================================================
     ONE delegated listener for the whole table body
     ============================================================ */
  tableBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id     = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    if (action === 'update') startUpdate(id);
    if (action === 'delete') deleteRequest(id, button.getAttribute('data-name'));
  });


  /* ============================================================
     OPEN THE UPDATE PANEL — fetch one request, fill, reveal
     ============================================================ */
  async function startUpdate(id) {
    const result = await apiRequest('/api/requests/' + id);

    if (!result.ok || !result.data) {
      showMessage(result.message || 'Could not load that request.', 'error');
      return;
    }

    const r = result.data;

    document.getElementById('updateRequestId').value = r._id;

    const patientLabel = document.getElementById('updateRequestPatient');
    if (patientLabel.tagName === 'INPUT') {
      patientLabel.value = r.patientName || '';
    } else {
      patientLabel.textContent = r.patientName || '';
    }

    document.getElementById('updateStatus').value        = r.status || '';
    document.getElementById('updateUrgency').value       = r.urgency || '';
    document.getElementById('updateUnitsRequired').value = r.unitsRequired || '';
    document.getElementById('updateNotes').value         = r.notes || '';

    document.getElementById('updateNeededBy').value = toInputDate(r.neededBy);

    updateSection.classList.remove('hidden');
    updateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  /* ============================================================
     SAVE THE UPDATE — PUT /api/requests/:id
     ============================================================ */
  if (updateForm) {
    updateForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      const id            = document.getElementById('updateRequestId').value;
      const unitsRequired = document.getElementById('updateUnitsRequired').value.trim();
      const neededBy      = document.getElementById('updateNeededBy').value;
      const notes         = document.getElementById('updateNotes').value.trim();

      const body = {
        status:        document.getElementById('updateStatus').value,
        urgency:       document.getElementById('updateUrgency').value,
        unitsRequired: Number(unitsRequired)
      };

      if (neededBy) body.neededBy = neededBy;
      body.notes = notes;

      if (!unitsRequired || isNaN(body.unitsRequired) || body.unitsRequired < 1) {
        showMessage('Please enter a valid number of units (1 or more).', 'error');
        return;
      }

      const originalText = saveRequestBtn.textContent;
      saveRequestBtn.disabled = true;
      saveRequestBtn.textContent = 'Saving...';

      const result = await apiRequest('/api/requests/' + id, {
        method: 'PUT',
        body: body
      });

      saveRequestBtn.disabled = false;
      saveRequestBtn.textContent = originalText;

      if (result.ok) {
        showMessage(
          result.message || 'Request updated to ' + body.status + '.',
          'success'
        );
        updateSection.classList.add('hidden');
        loadRequests();          // re-render so the status badge changes colour
      } else if (result.status === 401) {
        showMessage('Please log in with staff credentials to update blood requests.', 'error');
      } else if (result.status === 403) {
        const u = getAuthUser();
        showMessage('Forbidden: your role (' + (u ? u.role : 'none') + ') cannot update blood requests.', 'error');
      } else {
        showMessage(result.message || 'Could not update the request.', 'error');
      }
    });
  }

  if (cancelUpdateBtn) {
    cancelUpdateBtn.addEventListener('click', function () {
      updateSection.classList.add('hidden');
      clearMessage();
    });
  }


  /* ============================================================
     DELETE — confirm() then DELETE /api/requests/:id
     ============================================================ */
  async function deleteRequest(id, name) {
    const ok = confirm('Delete the blood request for "' + name + '"?\n\nThis cannot be undone.');
    if (!ok) return;

    const result = await apiRequest('/api/requests/' + id, { method: 'DELETE' });

    if (result.ok) {
      showMessage(result.message || 'Request deleted.', 'success');
      updateSection.classList.add('hidden');
      loadRequests();            // MUST re-render or the row lingers
    } else if (result.status === 401) {
      showMessage('Please log in with staff credentials to delete blood requests.', 'error');
    } else if (result.status === 403) {
      const u = getAuthUser();
      showMessage('Forbidden: your role (' + (u ? u.role : 'none') + ') cannot delete blood requests (Admin only).', 'error');
    } else {
      showMessage(result.message || 'Could not delete the request.', 'error');
    }
  }


  /* ============================================================
     SEARCH / RESET
     ============================================================ */
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      loadRequests();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (filterStatus)     filterStatus.value = '';
      if (filterBloodGroup) filterBloodGroup.value = '';
      if (filterCity)       filterCity.value = '';
      clearMessage();
      loadRequests();
    });
  }

  if (filterCity) {
    filterCity.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadRequests();
      }
    });
  }


  /* ---------- Initial load ---------- */
  loadRequests();

});
