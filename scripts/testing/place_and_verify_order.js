const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    console.log('=== End-to-End Order Flow Verification ===\n');

    // --- Step 1: Open store & add item to cart ---
    console.log('1. Adding item to cart...');
    const page = await browser.newPage();
    // Add console logging
    page.on('console', msg => {
      const text = msg.text();
      console.log('[PAGE]', text);
    });

    page.on('pageerror', err => {
      console.error('[PAGE ERROR]', err.message);
    });

    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('pa_lang', 'en');
    });

    await page.goto('http://127.0.0.1:8080', { waitUntil: 'domcontentloaded' });
    
    // Log in programmatically
    console.log('1.5 Logging in test user programmatically...');
    await page.evaluate(async () => {
      try {
        await PhoneAuth.register('9999999999', 'Test User', 'password123');
      } catch (e) {
        await PhoneAuth.login('9999999999', 'password123');
      }
    });

    await new Promise(r => setTimeout(r, 1000));

    // Add product to cart (find a 'Add to Cart' button)
    await page.evaluate(() => {
      // Find the actual 'Add to Cart' button on a product card
      const addBtn = document.querySelector('.product-card-quick-add button') || 
                     Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Add to Cart');
      if (addBtn) addBtn.click();
      else console.error('Add to Cart button not found!');
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Go to cart
    console.log('2. Proceeding to checkout...');
    await page.goto('http://127.0.0.1:8080/#cart', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Fill out form and trigger serviceability check
    console.log('2.5 Filling out checkout form and checking serviceability...');
    await page.evaluate(async () => {
      const name = document.getElementById('co-name');
      if (name) name.value = 'Test User';
      const phone = document.getElementById('co-phone');
      if (phone) phone.value = '9999999999';
      const email = document.getElementById('co-email');
      if (email) email.value = 'test@example.com';
      const address = document.getElementById('co-address');
      if (address) address.value = '123 Test St';
      const city = document.getElementById('co-city');
      if (city) city.value = 'Test City';
      const state = document.getElementById('co-state');
      if (state) state.value = 'Maharashtra';
      const pin = document.getElementById('co-pin');
      if (pin) {
        pin.value = '414001';
      }
      
      // Select COD
      const codRadio = document.querySelector('input[value="cod"]');
      if (codRadio) codRadio.click();
      
      // Trigger serviceability check
      if (typeof checkCourierServiceability === 'function') {
        await checkCourierServiceability();
      }
    });

    // Wait for available couriers to load and enable button
    await new Promise(r => setTimeout(r, 3000));
    
    // Submit order
    console.log('3. Placing order (COD)...');
    await page.evaluate(() => {
      const form = document.getElementById('checkout-form');
      if (form) form.requestSubmit();
      else console.error('Checkout form not found!');
    });
    
    await new Promise(r => setTimeout(r, 4000));
    
    // --- Step 2: Check Admin Panel ---
    console.log('\n4. Opening Admin Panel in new context (Incognito)...');
    const incognitoCtx = await browser.createBrowserContext();
    const adminPage = await incognitoCtx.newPage();
    adminPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Firebase]') || text.includes('order')) {
         console.log('[ADMIN]', text);
      }
    });

    await adminPage.evaluateOnNewDocument(() => {
      localStorage.setItem('pa_lang', 'en');
    });

    await adminPage.goto('http://127.0.0.1:8080/#admin', { waitUntil: 'domcontentloaded' });
    
    // Wait for the admin shell to render (auto-auth on localhost)
    try {
      await adminPage.waitForSelector('#admin-shell', { visible: true, timeout: 8000 });
      console.log('✅ Admin shell visible');
    } catch(e) {
      console.log('⚠️ Admin shell not visible — trying to force auth...');
      await adminPage.evaluate(() => {
        sessionStorage.setItem('pa_admin_auth', 'true');
        sessionStorage.setItem('pa_auth_provider', 'local');
      });
      await adminPage.goto('http://127.0.0.1:8080/#admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Click Orders tab
    await adminPage.evaluate(() => {
      const btn = document.querySelector('.sidebar-item[data-target="tab-orders"]');
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
    // Check table
    const tableText = await adminPage.evaluate(() => {
      const tbody = document.getElementById('admin-orders-body');
      return tbody ? tbody.innerText.trim() : 'TABLE ELEMENT NOT FOUND';
    });

    console.log('\n📋 Admin Orders Table Content:');
    console.log(tableText.slice(0, 500));
    
    if (tableText.includes('Test User') && tableText.includes('9999999999')) {
       console.log('\n✅ SUCCESS: Placed order found in Admin panel via Firestore!');
    } else {
       console.log('\n❌ FAILURE: Order not found in Admin panel.');
    }

  } catch (e) {
    console.error('Error during test:', e);
  } finally {
    await browser.close();
  }
})();
