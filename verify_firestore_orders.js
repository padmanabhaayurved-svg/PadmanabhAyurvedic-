const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    console.log('=== Firestore Orders Verification ===\n');

    console.log('1. Adding item to cart...');
    const page = await browser.newPage();
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Firebase]') || text.includes('Error')) {
         console.log('[PAGE]', text);
      }
    });

    await page.goto('http://127.0.0.1:8080', { waitUntil: 'networkidle2' });
    
    // Add product to cart
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.textContent.includes('Cart') || b.innerHTML.includes('Cart'));
      if (addBtn) addBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('2. Proceeding to checkout (injecting fake session)...');
    await page.goto('http://127.0.0.1:8080/#cart', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Inject fake PhoneAuth session so it bypasses login modal
    await page.evaluate(() => {
      localStorage.setItem('pa_auth_session', JSON.stringify({
        uid: 'test-user-uid',
        phone: '8888888888',
        name: 'Incognito User'
      }));
    });
    // Reload to apply fake session
    await page.goto('http://127.0.0.1:8080/#cart', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Fill out form. Let's use the actual IDs from cart.html:
    await page.evaluate(() => {
      const name = document.getElementById('co-name');
      if (name) name.value = 'Incognito User';
      const phone = document.getElementById('co-phone');
      if (phone) phone.value = '8888888888';
      const email = document.getElementById('co-email');
      if (email) email.value = 'test@example.com';
      const address = document.getElementById('co-address');
      if (address) address.value = '123 Incognito St';
      const city = document.getElementById('co-city');
      if (city) city.value = 'Secret City';
      const state = document.getElementById('co-state');
      if (state) state.value = 'Secret State';
      const zip = document.getElementById('co-pin');
      if (zip) zip.value = '000000';
      
      const codRadio = document.querySelector('input[value="cod"]');
      if (codRadio) codRadio.click();
    });
    
    console.log('3. Placing order (COD)...');
    await page.evaluate(() => {
      const form = document.getElementById('checkout-form');
      if (form) form.requestSubmit();
    });
    
    await new Promise(r => setTimeout(r, 6000));
    
    // --- Step 2: Query Firestore directly ---
    console.log('\n4. Querying Firestore directly for orders...');
    const incognitoCtx = await browser.createBrowserContext();
    const queryPage = await incognitoCtx.newPage();
    queryPage.on('console', msg => {
        const text = msg.text();
        if(text.includes('FIRESTORE_RESULT')) {
            console.log(text);
        }
    });
    
    await queryPage.goto('http://127.0.0.1:8080', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    const orders = await queryPage.evaluate(async () => {
        try {
            const getAdminOrders = window.getAdminOrders;
            if(!getAdminOrders) return 'getAdminOrders not found';
            
            const docs = await getAdminOrders();
            console.log('FIRESTORE_RESULT: Found ' + (docs ? docs.length : 0) + ' orders.');
            return docs;
        } catch(e) {
            return 'Error: ' + e.message;
        }
    });
    
    if(Array.isArray(orders)) {
        const testOrder = orders.find(o => o.customerName === 'Incognito User' || o.phone === '8888888888' || o.customerPhone === '8888888888');
        if(testOrder) {
            console.log('\n✅ SUCCESS: Order was successfully saved to Firestore and is readable from a fresh Incognito context!');
            console.log('Order Details:', JSON.stringify(testOrder, null, 2));
        } else {
            console.log('\n❌ FAILURE: Order was not found in the returned Firestore data.');
            console.log('Returned Orders:', JSON.stringify(orders.slice(0, 2), null, 2));
        }
    } else {
        console.log('Failed to query orders:', orders);
    }

  } catch (e) {
    console.error('Error during test:', e);
  } finally {
    await browser.close();
  }
})();
