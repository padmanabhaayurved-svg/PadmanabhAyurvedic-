/**
 * Tests for Order Payment Detection and Formatting
 */
const fs = require('fs');
const path = require('path');

describe('Order Payment Logic & Formatting', () => {
  let formatOrderPaymentInfo;

  beforeAll(() => {
    // Add required global mocks
    window.Audio = jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));
    window.PhoneAuth = { getUser: () => null };
    window.showToast = jest.fn();
    window.Store = {
      getCart: jest.fn().mockReturnValue([]),
      getCartTotal: jest.fn().mockReturnValue(0),
      clearCart: jest.fn()
    };

    const app = require('../../js/app.js');
    formatOrderPaymentInfo = app.formatOrderPaymentInfo || window.formatOrderPaymentInfo;
  });

  test('should identify legacy/standard COD orders with payment: COD and paymentId: COD_...', () => {
    const order = {
      id: '4NPKY9',
      payment: 'COD',
      paymentId: 'COD_1788035030614',
      total: 12994,
      status: 'pending'
    };

    const info = formatOrderPaymentInfo(order);
    expect(info.isCOD).toBe(true);
    expect(info.isPaid).toBe(false);
    expect(info.methodLabel).toBe('Cash on Delivery');
    expect(info.statusLabel).toBe('Pending');
  });

  test('should identify new COD orders with paymentMethod: COD', () => {
    const order = {
      id: 'ORD123456',
      payment: 'COD',
      paymentMethod: 'COD',
      paymentStatus: 'pending',
      paymentId: 'COD_1788035030999',
      total: 1500,
      status: 'processing'
    };

    const info = formatOrderPaymentInfo(order);
    expect(info.isCOD).toBe(true);
    expect(info.isPaid).toBe(false);
    expect(info.methodLabel).toBe('Cash on Delivery');
    expect(info.statusLabel).toBe('Pending');
  });

  test('should identify Online Razorpay paid orders correctly', () => {
    const order = {
      id: 'ORD789012',
      payment: 'Online',
      paymentMethod: 'Online',
      paymentStatus: 'paid',
      paymentId: 'pay_ABC123XYZ',
      total: 2500,
      status: 'processing'
    };

    const info = formatOrderPaymentInfo(order);
    expect(info.isCOD).toBe(false);
    expect(info.isOnline).toBe(true);
    expect(info.isPaid).toBe(true);
    expect(info.methodLabel).toBe('Online (Razorpay)');
    expect(info.statusLabel).toBe('Paid');
  });

  test('should fallback safely for empty/undefined order object', () => {
    const info = formatOrderPaymentInfo(null);
    expect(info.isCOD).toBe(true);
    expect(info.isPaid).toBe(false);
    expect(info.methodLabel).toBe('Cash on Delivery');
    expect(info.statusLabel).toBe('Pending');
  });

  test('should fallback safely when paymentMethod and payment are missing', () => {
    const order = { id: 'ORD555' };
    const info = formatOrderPaymentInfo(order);
    expect(info.isCOD).toBe(true);
    expect(info.isPaid).toBe(false);
    expect(info.methodLabel).toBe('Cash on Delivery');
  });
});
