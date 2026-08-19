const Razorpay = require('razorpay');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, receipt } = req.body || {};

    if (!amount || Math.round(amount * 100) < 100) {
      return res.status(400).json({ error: 'Amount must be at least 1 INR (100 paise)' });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;


    const razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id 
    });
  } catch (error) {
    console.error("Razorpay API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to create Razorpay order" });
  }
}
