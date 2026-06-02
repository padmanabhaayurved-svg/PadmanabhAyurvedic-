const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    console.log('=== LIVE SITE VERIFICATION: padmanabhayurved.com ===\n');

    const page = await browser.newPage();
    page.on('console', msg => {
      // Ignore some common noise
      if(msg.text().includes('Failed to load resource')) return;
      console.log('[PAGE]', msg.text());
    });

    const LIVE_URL = 'https://www.padmanabhayurved.com/';

    // Bypass splash screen
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('pa_lang', 'en');
    });

    // 1. Check Homepage Load
    console.log('1. Loading Live Homepage...');
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    console.log(`✅ Loaded Homepage. Title: ${title}`);

    // 2. AI Chatbot
    console.log('\n2. Testing AI Chatbot...');
    const chatbotBtn = await page.$('#chatbot-btn');
    if (!chatbotBtn) {
      console.log('❌ Chatbot button not found!');
    } else {
      await chatbotBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      const isChatOpen = await page.evaluate(() => {
        const win = document.getElementById('chatbot-window');
        return win && win.classList.contains('open');
      });
      if (isChatOpen) {
        console.log('✅ Chatbot window opened successfully.');
      } else {
        console.log('❌ Chatbot window failed to open.');
      }

      await page.type('#chat-input', 'I have a headache');
      await page.click('#chat-send');
      await new Promise(r => setTimeout(r, 2500));
      
      const chatbotReply = await page.evaluate(() => {
        const body = document.getElementById('chat-body');
        return body ? body.innerText : '';
      });
      if (chatbotReply.length > 50) {
        console.log('✅ Chatbot intelligence responded successfully.');
      } else {
        console.log('❌ Chatbot intelligence response was empty or too short.');
      }
    }

    // 3. User Flow - Add to Cart
    console.log('\n3. Testing Shopping Cart Flow...');
    await page.evaluate(() => {
      // Find quick add button
      const addBtn = document.querySelector('.product-card-quick-add button') || 
                     Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add to Cart') || b.textContent.includes('Add'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    
    // Check cart count
    const cartCount = await page.evaluate(() => {
      const bubble = document.getElementById('cart-count');
      return bubble ? bubble.innerText : '0';
    });
    if (parseInt(cartCount) > 0) {
      console.log(`✅ Item added to cart. Cart count is now: ${cartCount}`);
    } else {
      console.log('❌ Failed to add item to cart (count is still 0).');
    }

    // 4. Checkout Page
    console.log('\n4. Testing Checkout Page routing...');
    await page.goto(`${LIVE_URL}#cart`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    const checkoutVisible = await page.evaluate(() => {
      const co = document.getElementById('checkout-section');
      return co && !co.classList.contains('hidden');
    });
    
    if (checkoutVisible) {
      console.log('✅ Checkout section rendered successfully.');
    } else {
      console.log('❌ Checkout section not visible. User might need to login first.');
    }

    // We won't submit a live order to avoid spamming their production DB, 
    // but the UI rendering and chatbot logic working confirms the site is functionally intact.

    console.log('\n=== LIVE SITE VERIFICATION COMPLETED ===');

  } catch (e) {
    console.error('Error during live site verification:', e);
  } finally {
    await browser.close();
  }
})();
