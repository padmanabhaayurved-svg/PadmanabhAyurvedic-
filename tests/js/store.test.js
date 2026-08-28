/**
 * Unit tests for Store (js/store.js)
 */

// We need to load the store.js file into the DOM environment.
// Since it's an IIFE that assigns to window.Store, we can use require/eval or run it in JSDOM.
const fs = require('fs');
const path = require('path');

// Read the store.js content
const storeJsCode = fs.readFileSync(path.resolve(__dirname, '../../js/store.js'), 'utf-8');

describe('Store Core Functionality', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="cart-count"></div>
      <div id="floating-cart-badge"></div>
      <div id="fab-cart-count"></div>
    `;

    // Clear localStorage
    localStorage.clear();

    // Mock global dependencies used by store.js
    window.showToast = jest.fn();
    window.trackCartAdd = jest.fn().mockResolvedValue();
    window.openCartDrawer = jest.fn();
    window.PhoneAuth = {
      getUser: jest.fn().mockReturnValue(null)
    };

    // Execute store.js in the current JSDOM context
    // This will attach `Store` to `window.Store` and evaluate the IIFE.
    eval(storeJsCode);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with an empty cart', () => {
    expect(window.Store.getCart()).toEqual([]);
    expect(window.Store.getCartCount()).toBe(0);
    expect(window.Store.getCartTotal()).toBe(0);
  });

  test('should add a product to the cart correctly', () => {
    const product = { id: 'p1', name: 'Ashwagandha', price: 500, mrp: 600 };
    window.Store.addToCart(product, 2);

    const cart = window.Store.getCart();
    expect(cart.length).toBe(1);
    expect(cart[0].id).toBe('p1');
    expect(cart[0].qty).toBe(2);
    expect(window.Store.getCartCount()).toBe(2);
    expect(window.Store.getCartTotal()).toBe(1000);
    
    // Check if badges were updated in DOM
    expect(document.getElementById('cart-count').textContent).toBe('2');
    expect(document.getElementById('fab-cart-count').textContent).toBe('2');
  });

  test('should aggregate quantity when adding the same product', () => {
    const product = { id: 'p1', name: 'Ashwagandha', price: 500 };
    window.Store.addToCart(product, 1);
    window.Store.addToCart(product, 2);

    const cart = window.Store.getCart();
    expect(cart.length).toBe(1);
    expect(cart[0].qty).toBe(3);
    expect(window.Store.getCartTotal()).toBe(1500);
  });

  test('should update item quantity', () => {
    const product = { id: 'p2', name: 'Brahmi', price: 300 };
    window.Store.addToCart(product, 1);
    
    window.Store.updateQty('p2', 5);
    expect(window.Store.getCart()[0].qty).toBe(5);
    expect(window.Store.getCartTotal()).toBe(1500);
  });

  test('should remove item when quantity is updated to 0 or less', () => {
    const product = { id: 'p2', name: 'Brahmi', price: 300 };
    window.Store.addToCart(product, 2);
    window.Store.updateQty('p2', 0);
    
    expect(window.Store.getCart().length).toBe(0);
  });

  test('should completely remove an item from the cart', () => {
    const product = { id: 'p3', name: 'Chyawanprash', price: 800 };
    window.Store.addToCart(product, 1);
    window.Store.removeFromCart('p3');

    expect(window.Store.getCart().length).toBe(0);
  });

  test('should clear the entire cart', () => {
    window.Store.addToCart({ id: 'p1', name: 'Item 1', price: 100 }, 1);
    window.Store.addToCart({ id: 'p2', name: 'Item 2', price: 200 }, 2);
    
    window.Store.clearCart();
    expect(window.Store.getCart()).toEqual([]);
    expect(window.Store.getCartCount()).toBe(0);
  });

  test('should correctly calculate savings percentage', () => {
    expect(window.Store.getSavings(500, 1000)).toBe(50); // 50% off
    expect(window.Store.getSavings(800, 1000)).toBe(20); // 20% off
    expect(window.Store.getSavings(1000, 1000)).toBe(0); // 0% off
    expect(window.Store.getSavings(1200, 1000)).toBe(0); // Price > MRP = 0
    expect(window.Store.getSavings(500, undefined)).toBe(0); // No MRP
  });

  test('should format price correctly', () => {
    expect(window.Store.formatPrice(500)).toBe('₹500');
    expect(window.Store.formatPrice(1500)).toBe('₹1,500');
    expect(window.Store.formatPrice(100000)).toBe('₹1,00,000');
  });

  test('should filter products correctly', () => {
    const products = [
      { id: '1', name: 'Ashwagandha', category: 'Herbs', price: 500, sortOrder: 1 },
      { id: '2', name: 'Chyawanprash', category: 'Immunity', price: 800, sortOrder: 2 },
      { id: '3', name: 'Brahmi Vati', category: 'Herbs', price: 300, sortOrder: 3 },
    ];

    // Filter by category
    let res = window.Store.filterProducts(products, { category: 'Herbs' });
    expect(res.length).toBe(2);
    
    // Filter by search query
    res = window.Store.filterProducts(products, { search: 'vati' });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('3');

    // Sort by price asc
    res = window.Store.filterProducts(products, { sort: 'price_asc' });
    expect(res[0].id).toBe('3'); // 300
    expect(res[1].id).toBe('1'); // 500
    expect(res[2].id).toBe('2'); // 800
  });

  test('should build order payload correctly', () => {
    window.Store.addToCart({ id: 'p1', name: 'Product A', price: 500, image: 'img.jpg' }, 1);
    
    const address = {
      name: 'John Doe',
      phone: '9876543210',
      email: 'john@example.com',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001'
    };

    const payload = window.Store.buildOrderPayload({ address, userId: 'user123' });

    expect(payload.userId).toBe('user123');
    expect(payload.customerName).toBe('John Doe');
    expect(payload.subtotal).toBe(500);
    // 500 >= 499, shipping should be 0 based on store logic (note: new checkout uses flat 70, but we test store logic)
    expect(payload.shipping).toBe(0); 
    expect(payload.tax).toBe(Math.round(500 * 0.18));
    expect(payload.total).toBe(500 + 0 + Math.round(500 * 0.18));
    expect(payload.items.length).toBe(1);
    expect(payload.items[0].productId).toBe('p1');
  });
});
