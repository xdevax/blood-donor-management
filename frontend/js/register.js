/* ============================================================
   register.js — drives register.html
   Creates a new donor:  POST /api/donors
   Requires config.js to be loaded FIRST.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const form      = document.getElementById('donorForm');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn  = document.getElementById('resetBtn');

  // Safety guard: if this script ever loads on a page without the
  // form, stop quietly instead of throwing "Cannot read properties of null".
  if (!form) return;


  /* ----------------------------------------------------------
     SUBMIT HANDLER
     ---------------------------------------------------------- */
  form.addEventListener('submit', async function (event) {

    // Stop the browser's default behaviour: reloading the page and
    // dumping the fields into the URL. We want to send JSON instead.
    event.preventDefault();

    // ---------- 1. Read every field, trimming whitespace ----------
    const name             = document.getElementById('name').value.trim();
    const age              = document.getElementById('age').value.trim();
    const gender           = document.getElementById('gender').value;
    const bloodGroup       = document.getElementById('bloodGroup').value;
    const phone            = document.getElementById('phone').value.trim();
    const email            = document.getElementById('email').value.trim();
    const city             = document.getElementById('city').value.trim();
    const state            = document.getElementById('state').value.trim();
    const lastDonationDate = document.getElementById('lastDonationDate').value;
    const isAvailable      = document.getElementById('isAvailable').checked;

    // ---------- 2. Build the body ----------
    // REQUIRED fields always go in.
    const body = {
      name: name,
      age: Number(age),          // <-- Number(), NOT the raw string "25"
      gender: gender,
      bloodGroup: bloodGroup,
      phone: phone,
      city: city,
      isAvailable: isAvailable   // <-- .checked gives a real true/false
    };

    // OPTIONAL fields: only attach them if the user actually typed something.
    // Sending "" (empty string) can fail schema validation, so we omit instead.
    if (email)            body.email = email;
    if (state)            body.state = state;
    if (lastDonationDate) body.lastDonationDate = lastDonationDate;

    // ---------- 3. Client-side sanity check on age ----------
    // Number("") is 0 and Number("abc") is NaN — catch both before sending.
    if (!age || isNaN(body.age)) {
      showMessage('Please enter a valid age.', 'error');
      return;
    }

    // ---------- 4. Lock the button so double-clicks can't create duplicates ----------
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    // ---------- 5. Send it ----------
    const result = await apiRequest('/api/donors', {
      method: 'POST',
      body: body
    });

    // ---------- 6. Always unlock the button, whatever happened ----------
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    // ---------- 7. React to the response ----------
    if (result.status === 201) {
      // Created successfully
      showMessage(
        result.message || 'Donor registered successfully!',
        'success'
      );
      form.reset();                                  // clear all inputs
      document.getElementById('isAvailable').checked = true; // restore default
    } else {
      // 400 = validation failed, 409 = duplicate phone,
      // 500 = server error, 0 = could not reach server.
      // Show the backend's OWN message so the user sees the real reason.
      showMessage(
        result.message || 'Could not register donor. Please try again.',
        'error'
      );
    }
  });


  /* ----------------------------------------------------------
     RESET BUTTON
     Clears the form and any leftover alert.
     ---------------------------------------------------------- */
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      document.getElementById('isAvailable').checked = true;
      clearMessage();
    });
  }

});