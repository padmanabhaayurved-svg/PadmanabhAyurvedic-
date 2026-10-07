const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.production.local' });

async function runTest() {
  console.log('1. Authenticating...');
  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    })
  });
  const token = (await authRes.json()).token;

  console.log('\n2. Creating Test Order...');
  const orderData = {
    order_id: 'TEST-' + Date.now(),
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: 'Primary',
    billing_customer_name: 'Test',
    billing_last_name: 'User',
    billing_address: '123 Test Street',
    billing_city: 'Pune',
    billing_pincode: '411001',
    billing_state: 'Maharashtra',
    billing_country: 'India',
    billing_email: 'padmanabhaayurved@gmail.com',
    billing_phone: '9999999999',
    shipping_is_billing: true,
    order_items: [{ name: 'Test Product', sku: 'TEST-SKU', units: 1, selling_price: 100 }],
    payment_method: 'Prepaid',
    sub_total: 100,
    length: 10, breadth: 10, height: 10, weight: 0.5
  };

  const createRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(orderData)
  });
  const createData = await createRes.json();
  console.log('Order Create Response:', JSON.stringify(createData, null, 2));
  
  if (createData.shipment_id) {
    console.log('\n3. Assigning AWB...');
    const awbRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        shipment_id: createData.shipment_id,
        courier_company_id: 10
      })
    });
    console.log('AWB Response:', JSON.stringify(await awbRes.json(), null, 2));
  }
}

runTest().catch(console.error);
