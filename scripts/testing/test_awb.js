const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.production.local' });

async function testAWB() {
  console.log('Sending request to LIVE endpoint...');
  const res = await fetch('https://padmanabhayurved.com/api/shiprocket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: '/courier/assign/awb',
      method: 'POST',
      body: { shipment_id: 1, courier_company_id: 10 }
    })
  });
  console.log(res.status, await res.text());
}
testAWB().catch(console.error);
