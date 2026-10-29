const http = require('http');
const fs = require('fs');
const path = require('path');

const user = process.argv[2] || 'admin1';
const code = process.argv[3];

if (!code) {
  console.error('Usage: node q2-verify-mfa-code.js <username> <6-digit-code>');
  process.exit(1);
}

const tokenPath = path.join(__dirname, '..', '..', 'results', 'q2', `setup-token-${user}.txt`);
if (!fs.existsSync(tokenPath)) {
  console.error(`Setup token file not found: ${tokenPath}`);
  process.exit(1);
}
const setupToken = fs.readFileSync(tokenPath, 'utf8').trim();

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
    console.log(`Verifying code ${code} for ${user}...`);
    const verifyRes = await post('/api/auth/mfa/verify-setup', { code }, setupToken);
    console.log('Result:', verifyRes.data);

    if (verifyRes.data && verifyRes.data.token) {
      const accessToken = verifyRes.data.token;
      const outPath = path.join(__dirname, '..', '..', 'results', 'q2', `token-${user}.txt`);
      fs.writeFileSync(outPath, accessToken, 'utf8');
      console.log(`SUCCESS! Access JWT saved to: ${outPath}`);
    } else {
      console.error('Verification failed:', verifyRes.data.message);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
