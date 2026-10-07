const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.production.local' });
async function runTest() {
  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    })
  });
  console.log(authRes.status, await authRes.text());
}
runTest();
