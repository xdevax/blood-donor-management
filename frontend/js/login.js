/* ============================================================
   login.js — handles staff login + TOTP MFA workflow
   Requires config.js FIRST.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const stepCredentials = document.getElementById('stepCredentials');
  const stepMfaSetup    = document.getElementById('stepMfaSetup');
  const stepMfaVerify   = document.getElementById('stepMfaVerify');

  const credentialsForm = document.getElementById('credentialsForm');
  const mfaSetupForm    = document.getElementById('mfaSetupForm');
  const mfaVerifyForm   = document.getElementById('mfaVerifyForm');

  const credentialsBtn  = document.getElementById('credentialsBtn');
  const verifySetupBtn  = document.getElementById('verifySetupBtn');
  const verifyBtn       = document.getElementById('verifyBtn');
  const mfaQrImg        = document.getElementById('mfaQrImg');

  if (!credentialsForm) return;

  // Temporary tokens used only during authentication handshakes
  let setupToken = null;
  let mfaToken   = null;


  /* ============================================================
     STEP 1: PASSWORD AUTHENTICATION
     ============================================================ */
  credentialsForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showMessage('Please enter both username and password.', 'error');
      return;
    }

    credentialsBtn.disabled = true;
    credentialsBtn.textContent = 'Verifying credentials...';

    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });

    credentialsBtn.disabled = false;
    credentialsBtn.textContent = 'Continue';

    if (!result.ok) {
      showMessage(result.message || 'Invalid username or password.', 'error');
      return;
    }

    // Branch A: First-time user must enroll in MFA
    if (result.mfaSetupRequired) {
      setupToken = result.setupToken;
      stepCredentials.classList.add('hidden');
      showMessage('Loading QR code for MFA setup...', 'info');

      // Request QR code using setupToken
      const setupResult = await apiRequest('/api/auth/mfa/setup', {
        method: 'POST',
        token: setupToken
      });

      if (setupResult.ok && setupResult.qrDataUrl) {
        mfaQrImg.src = setupResult.qrDataUrl;
        stepMfaSetup.classList.remove('hidden');
        showMessage('Scan the QR code with your authenticator app and enter the code below.', 'info');
      } else {
        showMessage(setupResult.message || 'Failed to initialize MFA setup.', 'error');
      }
      return;
    }

    // Branch B: Existing user with MFA already enabled
    if (result.mfaRequired) {
      mfaToken = result.mfaToken;
      stepCredentials.classList.add('hidden');
      stepMfaVerify.classList.remove('hidden');
      showMessage('Password verified. Enter your 6-digit authenticator code.', 'info');
      document.getElementById('totpCode').focus();
      return;
    }

    showMessage('Unexpected response from authentication server.', 'error');
  });


  /* ============================================================
     STEP 2: ENROLL & VERIFY MFA
     ============================================================ */
  mfaSetupForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const code = document.getElementById('setupTotpCode').value.trim();
    if (!code || code.length !== 6) {
      showMessage('Please enter a valid 6-digit authenticator code.', 'error');
      return;
    }

    verifySetupBtn.disabled = true;
    verifySetupBtn.textContent = 'Verifying...';

    const result = await apiRequest('/api/auth/mfa/verify-setup', {
      method: 'POST',
      body: { code },
      token: setupToken
    });

    verifySetupBtn.disabled = false;
    verifySetupBtn.textContent = 'Verify & Enable MFA';

    if (result.ok && result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('authUser', JSON.stringify(result.user));
      showMessage('MFA setup complete! Redirecting to admin panel...', 'success');
      setTimeout(function () {
        window.location.href = 'admin.html';
      }, 1200);
    } else {
      showMessage(result.message || 'Invalid authenticator code. Check your device clock and try again.', 'error');
    }
  });


  /* ============================================================
     STEP 3: VERIFY MFA ON STANDARD LOGIN
     ============================================================ */
  mfaVerifyForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const code = document.getElementById('totpCode').value.trim();
    if (!code || code.length !== 6) {
      showMessage('Please enter a valid 6-digit authenticator code.', 'error');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Authenticating...';

    const result = await apiRequest('/api/auth/mfa/verify', {
      method: 'POST',
      body: { code },
      token: mfaToken
    });

    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify Code & Login';

    if (result.ok && result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('authUser', JSON.stringify(result.user));
      showMessage('Login successful! Redirecting to admin panel...', 'success');
      setTimeout(function () {
        window.location.href = 'admin.html';
      }, 1200);
    } else {
      showMessage(result.message || 'Invalid or expired authenticator code. Try again.', 'error');
    }
  });

});
