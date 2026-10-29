const http = require('http');
const fs = require('fs');
const path = require('path');

const user = process.argv[2] || 'admin1';
const pass = process.argv[3] || 'Admin@123';

function post(endpoint, data, token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8080,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log(`[1] Logging in as ${user}...`);
    const loginRes = await post('/api/auth/login', { username: user, password: pass });
    console.log('Login result:', loginRes.data);

    const setupToken = loginRes.data.setupToken || loginRes.data.token;
    if (!setupToken) {
      console.error('No setupToken received! Already enrolled?');
      process.exit(1);
    }

    console.log(`[2] Requesting MFA setup...`);
    const setupRes = await post('/api/auth/mfa/setup', {}, setupToken);
    console.log('MFA Setup result:');
    const { otpauth, qrDataUrl } = setupRes.data;

    const secretMatch = (otpauth || '').match(/secret=([A-Za-z0-9]+)/);
    const secret = secretMatch ? secretMatch[1] : setupRes.data.secret;

    console.log('--------------------------------------------------');
    console.log('User:       ', user);
    console.log('Secret Key: ', secret);
    console.log('OTP Auth URL:', otpauth);
    console.log('--------------------------------------------------');

    // Save QR code image if dataUrl is present
    if (qrDataUrl) {
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const outPath = path.join(__dirname, '..', '..', 'results', 'q2', `qr-${user}.png`);
      fs.writeFileSync(outPath, base64Data, 'base64');
      console.log(`QR code PNG saved to: ${outPath}`);
    }

    // Save setupToken for verification
    const tokenPath = path.join(__dirname, '..', '..', 'results', 'q2', `setup-token-${user}.txt`);
    fs.writeFileSync(tokenPath, setupToken, 'utf8');
    console.log(`Setup token saved to: ${tokenPath}`);

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
