// Quick debug — log the exact Shiprocket error response
require('dotenv').config({ path: '.env.local' });

const PROXY = 'https://www.padmanabhayurved.com/api/shiprocket';

async function callProxy(endpoint, method, body, token) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, method, body, token })
  });
  return res.json();
}

async function run() {
  // Auth
  const authData = await callProxy('/auth/login', 'POST', {});
  const token = authData.token;
  console.log('Auth OK, token:', token ? token.slice(0, 20) + '...' : 'MISSING');

  // Try to create order and log full response
  const payload = {
    order_id:               `TEST-${Date.now()}`,
    order_date:             new Date().toISOString().slice(0, 10),
    pickup_location:        'Rushikes',
    billing_customer_name:  'Test',
    billing_last_name:      'User',
    billing_address:        '123 MG Road',
    billing_city:           'Ahilyanagar',
    billing_pincode:        '414001',
    billing_state:          'Maharashtra',
    billing_country:        'India',
    billing_email:          'padmanabhaayurved@gmail.com',
    billing_phone:          '9822334455',
    shipping_is_billing:    true,
    order_items: [{ name: 'Test Product', sku: 'SKU-001', units: 1, selling_price: 299 }],
    payment_method: 'COD',
    sub_total:      299,
    length: 15, breadth: 10, height: 10, weight: 0.5,
  };

  const data = await callProxy('/orders/create/adhoc', 'POST', payload, token);
  console.log('\nFull response from Shiprocket:');
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
