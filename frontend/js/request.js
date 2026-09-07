/* ============================================================
   request.js — drives request.html
   Creates a new blood request:  POST /api/requests
   Requires config.js FIRST.
   Same pattern as register.js.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const form      = document.getElementById('requestForm');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn  = document.getElementById('resetBtn');

  if (!form) return;   // wrong page — stop quietly


  /* ----------------------------------------------------------
     SUBMIT HANDLER
     ---------------------------------------------------------- */
  form.addEventListener('submit', async function (event) {

    event.preventDefault();   // stop the page reloading

    // ---------- 1. Read every field ----------
    const patientName   = document.getElementById('patientName').value.trim();
    const bloodGroup    = document.getElementById('bloodGroup').value;
    const unitsRequired = document.getElementById('unitsRequired').value.trim();
    const hospitalName  = document.getElementById('hospitalName').value.trim();
    const city          = document.getElementById('city').value.trim();
    const contactPerson = document.getElementById('contactPerson').value.trim();
    const contactPhone  = document.getElementById('contactPhone').value.trim();
    const urgency       = document.getElementById('urgency').value;
    const status        = document.getElementById('status').value;
    const neededBy      = document.getElementById('neededBy').value;
    const notes         = document.getElementById('notes').value.trim();

    // ---------- 2. Build the body ----------
    const body = {
      patientName:   patientName,
      bloodGroup:    bloodGroup,
      unitsRequired: Number(unitsRequired),   // <-- Number(), not "2"
      hospitalName:  hospitalName,
      city:          city,
      contactPerson: contactPerson,
      contactPhone:  contactPhone
    };

    // Optional / defaulted fields — only send when chosen.
    if (urgency)  body.urgency = urgency;
    if (status)   body.status  = status;
    if (notes)    body.notes   = notes;

    // <input type="date"> already gives 'YYYY-MM-DD', which Mongoose
    // parses fine, so it is sent through as-is.
    if (neededBy) body.neededBy = neededBy;

    // ---------- 3. Sanity check the number ----------
    if (!unitsRequired || isNaN(body.unitsRequired) || body.unitsRequired < 1) {
      showMessage('Please enter a valid number of units (1 or more).', 'error');
      return;
    }

    // ---------- 4. Lock the button ----------
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // ---------- 5. Send ----------
    const result = await apiRequest('/api/requests', {
      method: 'POST',
      body: body
    });

    // ---------- 6. Always unlock ----------
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    // ---------- 7. React ----------
    if (result.status === 201) {
      showMessage(
        result.message || 'Blood request created successfully!',
        'success'
      );
      form.reset();
    } else {
      // 400 validation, 500 server error, 0 unreachable.
      showMessage(
        result.message || 'Could not create the request. Please try again.',
        'error'
      );
    }
  });


  /* ----------------------------------------------------------
     RESET BUTTON
     ---------------------------------------------------------- */
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      clearMessage();
    });
  }

});