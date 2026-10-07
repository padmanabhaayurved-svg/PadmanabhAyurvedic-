const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function runTest() {
  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    })
  });
  const authData = await authRes.json();
  const token = authData.token;
  console.log('Token exists:', !!token);

  if (!token) {
    console.log('Auth failed:', authData);
    return;
  }

  // Shiprocket API documentation says: No direct external wallet balance endpoint in v1/external. 
  // Let's try /courier/serviceability to see if account is restricted, or /account/details/profile
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=110030&delivery_postcode=110030&weight=1&cod=0', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Serviceability:', res.status, await res.text().catch(()=>'').then(t => t.slice(0,200)));
}
runTest();
