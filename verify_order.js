const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if(msg.type() === 'error') console.error('PAGE ERROR:', msg.text());
  });
  
  await page.goto('http://127.0.0.1:8080/pages/cart.html', { waitUntil: 'networkidle2' });

  // Add dummy item to cart
  await page.evaluate(() => {
    window.Store = window.Store || {};
    localStorage.setItem('pa_cart', JSON.stringify([{
      id: 'p1', name: 'Test Product', price: 100, qty: 1, image: ''
    }]));
    // Set dummy session
    localStorage.setItem('pa_local_auth', JSON.stringify({
      uid: 'user123', phone: '9999999999', name: 'Test User'
    }));
  });

  // Reload to reflect cart and auth
  await page.goto('http://127.0.0.1:8080/pages/cart.html', { waitUntil: 'networkidle2' });
  
  // Fill form
  await page.type('#co-name', 'John Doe');
  await page.type('#co-phone', '9999999999');
  await page.type('#co-email', 'john@test.com');
  await page.type('#co-address', '123 Main St');
  await page.type('#co-city', 'Test City');
  await page.type('#co-state', 'MH');
  await page.type('#co-pin', '400001');

  // Select COD
  await page.evaluate(() => {
    document.getElementById('pay-cod').checked = true;
  });

  // Wait 1 second to let couriers fetch
  await new Promise(r => setTimeout(r, 1500));

  console.log('Submitting order...');
  
  // Try to submit
  await page.evaluate(() => {
    const form = document.getElementById('checkout-form');
    if(form) form.requestSubmit();
  });

  await new Promise(r => setTimeout(r, 3000));
  
  // Check local storage for pa_orders
  const orders = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('pa_orders') || '[]');
  });

  console.log('Orders found in admin local storage:', orders.length);
  if(orders.length > 0) {
    console.log('SUCCESS! Order was successfully placed and saved to localStorage.');
    console.log('Sample order ID:', orders[0].id);
  } else {
    console.error('FAILED. No orders found.');
  }
  
  await browser.close();
})();
