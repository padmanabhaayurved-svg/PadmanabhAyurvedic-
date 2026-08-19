const fs = require('fs');
const path = require('path');

// Read the store.js file
const storeJs = fs.readFileSync(path.resolve(__dirname, '../../js/store.js'), 'utf8');

describe('Store Module', () => {
  beforeAll(() => {
    // Mock global dependencies required by store.js
    window.showToast = jest.fn();
    window.trackCartAdd = jest.fn().mockResolvedValue();
    
    // Evaluate the IIFE to attach Store to window
    eval(storeJs);
  });

  beforeEach(() => {
    // Clear localStorage and reset mocks before each test
    localStorage.clear();
    if (window.Store) {
      window.Store.clearCart();
    }
    jest.clearAllMocks();
  });

  describe('Cart Management', () => {
    it('should add a product to the cart', () => {
      const product = { id: 'p1', name: 'Product 1', price: 100 };
      window.Store.addToCart(product, 2);
      
      const cart = window.Store.getCart();
      expect(cart.length).toBe(1);
      expect(cart[0].id).toBe('p1');
      expect(cart[0].qty).toBe(2);
      expect(cart[0].price).toBe(100);
      expect(window.showToast).toHaveBeenCalledWith('"Product 1" added to cart', 'success');
      expect(window.trackCartAdd).toHaveBeenCalledWith('p1');
    });

    it('should increment quantity when adding the same product', () => {
      const product = { id: 'p1', name: 'Product 1', price: 100 };
      window.Store.addToCart(product, 1);
      window.Store.addToCart(product, 2);
      
      const cart = window.Store.getCart();
      expect(cart.length).toBe(1);
      expect(cart[0].qty).toBe(3);
    });

    it('should update quantity and remove if quantity is 0 or less', () => {
      const product = { id: 'p1', name: 'Product 1', price: 100 };
      window.Store.addToCart(product, 2);
      
      window.Store.updateQty('p1', 5);
      expect(window.Store.getCart()[0].qty).toBe(5);
      
      window.Store.updateQty('p1', 0);
      expect(window.Store.getCart().length).toBe(0);
    });

    it('should calculate cart total correctly', () => {
      window.Store.addToCart({ id: 'p1', name: 'Product 1', price: 100 }, 2);
      window.Store.addToCart({ id: 'p2', name: 'Product 2', price: 50 }, 1);
      
      expect(window.Store.getCartTotal()).toBe(250);
      expect(window.Store.getCartCount()).toBe(3);
    });
  });

  describe('Price Formatting & Utilities', () => {
    it('should format price correctly', () => {
      expect(window.Store.formatPrice(1234)).toBe('₹1,234');
      expect(window.Store.formatPrice(1234.56)).toBe('₹1,235'); // Rounds off
    });

    it('should calculate savings percentage', () => {
      expect(window.Store.getSavings(80, 100)).toBe(20);
      expect(window.Store.getSavings(100, 100)).toBe(0);
      expect(window.Store.getSavings(120, 100)).toBe(0);
      expect(window.Store.getSavings(100, null)).toBe(0);
    });
  });
});
