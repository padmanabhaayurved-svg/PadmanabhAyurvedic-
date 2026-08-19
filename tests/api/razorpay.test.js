const handler = require('../../api/razorpay.js');
const Razorpay = require('razorpay');

// Mock Razorpay SDK
jest.mock('razorpay');

describe('Razorpay API Handler', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset mocks
    Razorpay.mockClear();
    
    // Setup mock request and response objects
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
    
    // Set environment variables for testing
    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
  });

  it('should handle OPTIONS method with 200 status', async () => {
    req.method = 'OPTIONS';
    await handler(req, res);
    
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('should reject non-POST methods with 405 status', async () => {
    req.method = 'GET';
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('should return 400 if amount is missing', async () => {
    req.body = {};
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Amount must be at least 1 INR (100 paise)' });
  });

  it('should return 400 if amount is less than 1', async () => {
    req.body = { amount: 0.5 };
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Amount must be at least 1 INR (100 paise)' });
  });

  it('should create an order successfully', async () => {
    req.body = { amount: 500 }; // 500 INR
    
    const mockOrder = {
      id: 'order_test_123',
      amount: 50000,
      currency: 'INR'
    };
    
    const mockCreate = jest.fn().mockResolvedValue(mockOrder);
    Razorpay.mockImplementation(() => {
      return {
        orders: {
          create: mockCreate
        }
      };
    });

    await handler(req, res);
    
    expect(Razorpay).toHaveBeenCalledWith({
      key_id: 'test_key_id',
      key_secret: 'test_key_secret'
    });
    
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 50000, // Amount should be converted to paise
      currency: 'INR'
    }));
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      orderId: 'order_test_123',
      amount: 50000,
      currency: 'INR',
      keyId: 'test_key_id'
    });
  });

  it('should handle razorpay errors gracefully', async () => {
    req.body = { amount: 500 };
    
    const mockError = new Error('Razorpay failed');
    const mockCreate = jest.fn().mockRejectedValue(mockError);
    Razorpay.mockImplementation(() => {
      return {
        orders: {
          create: mockCreate
        }
      };
    });

    // Suppress console.error in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Razorpay failed' });
    
    consoleSpy.mockRestore();
  });
});
