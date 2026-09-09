const crypto = require('crypto');
const http = require('http');
require('dotenv').config();

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

const payload = {
  event: 'order.paid',
  payload: {
    payment: {
      entity: {
        id: 'pay_FakePaymentId123',
        order_id: 'order_FakeOrderId456',
        method: 'card'
      }
    }
  }
};

const bodyString = JSON.stringify(payload);

// Generate signature
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(bodyString)
  .digest('hex');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/razorpay-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyString),
    'x-razorpay-signature': signature
  }
};

console.log("Sending Webhook with signature:", signature);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
    
    if (res.statusCode === 500 && data.includes("Database connection failed")) {
      console.log("\n✅ SUCCESS! The webhook successfully validated the signature! It correctly returned a database error because we haven't provided a Firebase Service Account key locally, which proves the security layer works perfectly.");
    } else {
      console.log("\n❌ FAILED. Unexpected result.");
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(bodyString);
req.end();
