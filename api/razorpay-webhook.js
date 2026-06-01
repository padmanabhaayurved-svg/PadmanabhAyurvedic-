const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // If running in Vercel or locally, we expect the FIREBASE_SERVICE_ACCOUNT JSON string.
    // Ensure FIREBASE_SERVICE_ACCOUNT is set in your Vercel Environment Variables.
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-razorpay-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("Webhook secret not configured.");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  // Get raw body (Vercel provides req.body as an object, but we need raw string)
  // Next.js/Vercel typically provides raw body if bodyParser is disabled.
  // Locally, our serve.js sets req.rawBody.
  const bodyToVerify = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyToVerify)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process the webhook payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event;
    
    // Check if Firebase admin is initialized before trying to use it
    if (!admin.apps.length) {
      console.error("Cannot process webhook: Firebase Admin is not initialized.");
      return res.status(500).json({ error: "Database connection failed" });
    }

    const db = admin.firestore();

    if (event === 'order.paid') {
      const paymentEntity = payload.payload.payment.entity;
      const orderId = paymentEntity.order_id; // e.g. "order_XXXXXX"
      
      console.log(`Processing successful payment for Razorpay Order: ${orderId}`);
      
      // Look up the order in Firestore by razorpayOrderId
      const ordersRef = db.collection('orders');
      const snapshot = await ordersRef.where('razorpayOrderId', '==', orderId).get();
      
      if (snapshot.empty) {
        console.error(`Order not found for Razorpay Order ID: ${orderId}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      const doc = snapshot.docs[0];
      await doc.ref.update({
        status: 'Paid',
        paymentId: paymentEntity.id,
        paymentMethod: paymentEntity.method,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Order ${doc.id} successfully marked as Paid.`);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
