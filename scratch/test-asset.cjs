const crypto = require('crypto');

// Stage keys from .env.stage
const SECRET_KEY = 'sBYDzGabIR2aEPagELKBN41kIR7xBm1G5emAODCCLl0=';
const IV_KEY = '2d8f2f3bfb6a2e6d129f3eaf4ef104d0';

async function run() {
  const stageUrl = "https://api.superott.in";

  // 1. Get Guest Token first
  console.log('Fetching Guest Token...');
  const guestRes = await fetch(`${stageUrl}/v3/auth/guest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'deviceTypeCode': '3',
      'deviceID': 'test-server-id',
      'language': '1',
      'appversion': '2.0.0',
      'project': 'JOJO'
    },
    body: JSON.stringify({})
  });

  const guestData = await guestRes.json();
  console.log('Raw Guest response:', guestData);
}

run().catch(console.error);
