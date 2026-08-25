const crypto = require('crypto');

// Stage keys from .env.stage
const SECRET_KEY = 'sBYDzGabIR2aEPagELKBN41kIR7xBm1G5emAODCCLl0=';
const IV_KEY = '2d8f2f3bfb6a2e6d129f3eaf4ef104d0';

function encrypt(text) {
  try {
    const key = Buffer.from(SECRET_KEY, 'base64');
    const iv = Buffer.from(IV_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (err) {
    console.error('Encryption failed:', err);
    return null;
  }
}

function decrypt(encryptedHex) {
  try {
    const key = Buffer.from(SECRET_KEY, 'base64');
    const iv = Buffer.from(IV_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

async function run() {
  const stageUrl = "https://api.superott.in";
  const assetId = '1759';
  console.log(`Fetching asset/${assetId} WITHOUT sessionid header...`);
  
  const encryptedAssetBody = encrypt(JSON.stringify({}));
  const assetRes = await fetch(`${stageUrl}/asset/${assetId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'deviceTypeCode': '3',
      'deviceID': 'test-server-id',
      'language': '1',
      'appversion': '2.0.0',
      'project': 'JOJO'
    },
    body: JSON.stringify({ data: encryptedAssetBody })
  });

  const assetData = await assetRes.json();
  console.log('Asset response status:', assetData['meta-data']);
  if (assetData.data) {
    const dec = decrypt(assetData.data);
    console.log('Decrypted Asset:', dec);
  } else {
    console.log('Asset response data field is null');
  }
}

run().catch(console.error);
