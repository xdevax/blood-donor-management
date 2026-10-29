const https = require('https');
const fs = require('fs');
const path = require('path');

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location, headers));
      }
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(data) }));
      res.on('error', reject);
    });
  });
}

(async () => {
  try {
    console.log('1. Fetching token...');
    const tokenRes = await get('https://ghcr.io/token?scope=repository:aquasecurity/trivy-db:pull');
    const token = JSON.parse(tokenRes.body.toString()).token;

    console.log('2. Fetching manifest...');
    const manifestRes = await get('https://ghcr.io/v2/aquasecurity/trivy-db/manifests/2', {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.oci.image.manifest.v1+json'
    });

    const manifest = JSON.parse(manifestRes.body.toString());
    console.log('Manifest:', JSON.stringify(manifest, null, 2));

    const layer = manifest.layers && manifest.layers[0];
    if (!layer) throw new Error('No layer found in manifest');

    console.log('Layer digest:', layer.digest, 'size:', layer.size);
    const blobUrl = `https://ghcr.io/v2/aquasecurity/trivy-db/blobs/${layer.digest}`;

    // Resolve redirect URL for direct blob download
    console.log('3. Resolving download redirect...');
    https.get(blobUrl, { headers: { 'Authorization': `Bearer ${token}` } }, res => {
      console.log('Redirect status:', res.statusCode);
      console.log('Location:', res.headers.location ? res.headers.location.slice(0, 100) + '...' : 'none');
      if (res.headers.location) {
        fs.writeFileSync(path.join(__dirname, 'trivy-db-url.txt'), res.headers.location);
        console.log('Saved direct URL to trivy-db-url.txt');
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
