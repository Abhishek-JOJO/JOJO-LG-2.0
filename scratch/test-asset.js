const crypto = require('crypto');

// Stage keys from .env.stage
const SECRET_KEY = 'sBYDzGabIR2aEPagELKBN41kIR7xBm1G5emAODCCLl0=';
const IV_KEY = '2d8f2f3bfb6a2e6d129f3eaf4ef104d0';

function decrypt(encryptedHex) {
  try {
    const key = Buffer.from(SECRET_KEY, 'base64');
    const iv = Buffer.from(IV_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

async function run() {
  console.log('Fetching app-config...');
  const configRes = await fetch('https://api.superott.in/app-config', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'device-type-code': 'web',
      'app-version': '1.0.0',
      'project-code': 'jojo'
    },
    body: JSON.stringify({})
  });
  
  const configData = await configRes.json();
  const decryptedConfig = decrypt(configData.data);
  const parsedConfig = JSON.parse(decryptedConfig);
  console.log('Decrypted API URL:', parsedConfig.data.api.stageBaseUrl);

  const assetId = '1759';
  console.log(`Fetching asset/${assetId}...`);
  
  // Let's call both without session token first
  const assetRes = await fetch(`https://api.superott.in/asset/${assetId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'device-type-code': 'web',
      'app-version': '1.0.0',
      'project-code': 'jojo'
    },
    body: JSON.stringify({})
  });

  const assetData = await assetRes.json();
  console.log('Raw asset response keys:', Object.keys(assetData));
  if (assetData.data) {
    if (typeof assetData.data === 'string') {
      const dec = decrypt(assetData.data);
      console.log('Decrypted Asset Data:', dec ? dec.substring(0, 1000) : 'null');
    } else {
      console.log('Plain Asset Data:', assetData.data);
    }
  } else {
    console.log('Asset Response Data is empty/null');
  }
}

run().catch(console.error);
