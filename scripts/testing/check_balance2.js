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
  const token = (await authRes.json()).token;
  if(!token) return;

  const endpoints = [
    '/users/details',
    '/account/details/profile',
    '/wallet/balance'
  ];

  for (let ep of endpoints) {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external' + ep, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log(ep, res.status, await res.text().catch(()=>'').then(t => t.slice(0, 300)));
  }
}
runTest();
