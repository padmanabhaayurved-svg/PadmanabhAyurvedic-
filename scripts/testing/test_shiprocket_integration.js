/**
 * End-to-end integration test for Shiprocket order creation
 * Tests the full flow: auth → create order → assign AWB
 * Run: node scripts/testing/test_shiprocket_integration.js
 */

require('dotenv').config({ path: '.env.local' });

const PROXY = 'https://www.padmanabhayurved.com/api/shiprocket';

const TEST_ORDER = {
  id: `TEST-${Date.now()}`,
  address: {
    name: 'Test User',
    phone: '8888888888',
    email: 'test@padmanabhayurved.com',
    address: '123 Test Street, Near Market',
    city: 'Ahilyanagar',
    pincode: '414001',
    state: 'Maharashtra',
  },
  items: [
    { name: 'Test Product', productId: 'SKU-001', qty: 1, price: 299 }
  ],
  paymentMethod: 'COD',
  total: 350,
  subtotal: 299,
  shipping: 51,
  weight: 0.5,
  courierCompany: 'Delhivery',
};

async function callProxy(endpoint, method, body, token) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, method, body, token })
  });
  return res.json();
}

async function run() {
  console.log('\n🔍 Padmanabh Ayurvedics — Shiprocket Integration Test\n');
  console.log('━'.repeat(52));

  // ── Step 1: Authenticate ───────────────────────────────
  process.stdout.write('\n[1/3] Authenticating with Shiprocket... ');
  let token;
  try {
    const authData = await callProxy('/auth/login', 'POST', {});
    if (!authData.token) throw new Error(authData.message || JSON.stringify(authData));
    token = authData.token;
    console.log('✅ OK');
  } catch (e) {
    console.log('❌ FAILED');
    console.error('    Error:', e.message);
    process.exit(1);
  }

  // ── Step 2: Create Order ───────────────────────────────
  process.stdout.write('[2/3] Creating test order in Shiprocket... ');
  let srOrderId, shipmentId;
  try {
    const payload = {
      order_id:               TEST_ORDER.id,
      order_date:             new Date().toISOString().slice(0, 10),
      pickup_location:        'Rushikes',
      billing_customer_name:  TEST_ORDER.address.name,
      billing_last_name:      'User',
      billing_address:        TEST_ORDER.address.address,
      billing_city:           TEST_ORDER.address.city,
      billing_pincode:        TEST_ORDER.address.pincode,
      billing_state:          TEST_ORDER.address.state,
      billing_country:        'India',
      billing_email:          'padmanabhaayurved@gmail.com',
      billing_phone:          '9822334455',
      shipping_is_billing:    true,
      order_items: TEST_ORDER.items.map(i => ({
        name: i.name, sku: i.productId, units: i.qty, selling_price: i.price
      })),
      payment_method: 'COD',
      sub_total:      TEST_ORDER.subtotal,
      shipping_charges: TEST_ORDER.shipping,
      length: 15, breadth: 10, height: 10,
      weight: TEST_ORDER.weight,
    };

    const data = await callProxy('/orders/create/adhoc', 'POST', payload, token);
    if (data.status_code && data.status_code !== 1) throw new Error(data.message || JSON.stringify(data));
    srOrderId  = data.order_id;
    shipmentId = data.shipment_id;
    console.log('✅ OK');
    console.log(`    SR Order ID:  ${srOrderId}`);
    console.log(`    Shipment ID:  ${shipmentId}`);
  } catch (e) {
    console.log('❌ FAILED');
    console.error('    Error:', e.message);
    process.exit(1);
  }

  // ── Step 3: Assign AWB ─────────────────────────────────
  process.stdout.write('[3/3] Assigning AWB to shipment... ');
  try {
    const data = await callProxy('/courier/assign/awb', 'POST', {
      shipment_id: [shipmentId]
    }, token);

    const awb = data.response?.data?.awb_code || data.awb_code || data.awb;
    if (!awb) throw new Error(data.message || 'AWB not returned: ' + JSON.stringify(data));
    console.log('✅ OK');
    console.log(`    AWB Code: ${awb}`);
    console.log('\n━'.repeat(52));
    console.log('🎉 All tests passed! Shiprocket integration is WORKING.');
    console.log(`📦 Test order visible in Shiprocket dashboard as: ${TEST_ORDER.id}`);
    console.log('━'.repeat(52) + '\n');
  } catch (e) {
    console.log('⚠️  AWB assignment failed (may need pickup location setup)');
    console.error('    Error:', e.message);
    console.log('\n━'.repeat(52));
    console.log('⚠️  Order was CREATED in Shiprocket but AWB assign failed.');
    console.log('   This is often due to pickup location not being configured.');
    console.log('━'.repeat(52) + '\n');
  }
}

run().catch(console.error);
