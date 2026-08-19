const handler = require('../../api/verify-payment.js');
const crypto = require('crypto');

describe('Razorpay Verify Payment API', () => {
  let req, res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {}
    };
    
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };

    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  });

  it('should return 400 if fields are missing', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing payment verification fields' });
  });

  it('should verify payment successfully when signatures match', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const secret = process.env.RAZORPAY_KEY_SECRET;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(orderId + "|" + paymentId)
      .digest('hex');

    req.body = {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Payment verified successfully' });
  });

  it('should return 400 when signatures do not match', async () => {
    req.body = {
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_456',
      razorpay_signature: 'invalid_signature'
    };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid payment signature' });
  });
});
