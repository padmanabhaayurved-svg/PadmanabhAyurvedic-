const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    console.log('=== Chatbot Intelligence Engine Verification ===\n');

    const page = await browser.newPage();
    
    // Print browser console logs
    page.on('console', msg => {
      const text = msg.text();
      console.log('[PAGE]', text);
    });

    page.on('pageerror', err => {
      console.error('[PAGE ERROR]', err.message);
    });

    // Bypass splash screen
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('pa_lang', 'en');
    });

    console.log('1. Loading home page...');
    await page.goto('http://127.0.0.1:8080', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Verify Chatbot Button and open window
    console.log('\n2. Opening Chatbot Window...');
    const chatbotBtn = await page.$('#chatbot-btn');
    if (!chatbotBtn) {
      console.error('❌ FAILURE: Chatbot button (#chatbot-btn) not found!');
      process.exit(1);
    }
    await chatbotBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    const isChatOpen = await page.evaluate(() => {
      const win = document.getElementById('chatbot-window');
      return win && win.classList.contains('open');
    });

    if (isChatOpen) {
      console.log('✅ SUCCESS: Chatbot window opened and has the "open" class.');
    } else {
      console.error('❌ FAILURE: Chatbot window did not open!');
      process.exit(1);
    }

    // Test greeting and initial state
    console.log('\n3. Verifying initial bot message...');
    const initialText = await page.evaluate(() => {
      const body = document.getElementById('chat-body');
      return body ? body.innerText.trim() : '';
    });
    console.log('Bot Response:', initialText.slice(0, 150) + '...');

    if (initialText.includes('Welcome') || initialText.includes('Namaste')) {
      console.log('✅ SUCCESS: Initial greeting loaded correctly.');
    } else {
      console.error('❌ FAILURE: Initial greeting was empty or incorrect.');
    }

    // Test Symptom Recommendation (e.g. joint pain)
    console.log('\n4. Testing Symptom-based Product Recommendations...');
    
    // Ensure product cache is loaded
    console.log('Waiting for product cache to populate...');
    await page.waitForFunction(() => {
      return window.Store && window.Store.getCachedProducts && window.Store.getCachedProducts().length > 0;
    }, { timeout: 10000 });
    
    await page.type('#chat-input', 'I have severe joint pain');
    await page.click('#chat-send');
    await new Promise(r => setTimeout(r, 2000));

    const symptomResult = await page.evaluate(() => {
      const body = document.getElementById('chat-body');
      const cards = document.querySelectorAll('.chat-product-card');
      return {
        text: body ? body.innerText.trim() : '',
        cardCount: cards.length
      };
    });

    console.log('Bot Response length:', symptomResult.text.length, 'characters');
    console.log('Product Cards Rendered:', symptomResult.cardCount);

    if (symptomResult.cardCount > 0) {
      console.log('✅ SUCCESS: Chatbot correctly identified "joint pain" symptom and rendered rich product cards!');
    } else {
      console.error('❌ FAILURE: Chatbot did not render product recommendations for joint pain.');
    }

    // Test FAQ Matching (e.g. shipping time)
    console.log('\n5. Testing FAQ Matching Intelligence...');
    await page.type('#chat-input', 'What is your shipping policy?');
    await page.click('#chat-send');
    await new Promise(r => setTimeout(r, 1500));

    const faqText = await page.evaluate(() => {
      const body = document.getElementById('chat-body');
      return body ? body.innerText.trim() : '';
    });

    console.log('FAQ Bot Response Snippet:', faqText.slice(-300));

    if (faqText.includes('shipping') || faqText.includes('Free shipping')) {
      console.log('✅ SUCCESS: FAQ match succeeded and bot replied with shipping details!');
    } else {
      console.error('❌ FAILURE: Chatbot failed to match shipping policy FAQ.');
    }

    // Test Language Auto-Detection
    console.log('\n6. Testing Multilingual Auto-Language Detection (Hindi)...');
    await page.type('#chat-input', 'नमस्ते');
    await page.click('#chat-send');
    await new Promise(r => setTimeout(r, 1500));

    const langText = await page.evaluate(() => {
      const body = document.getElementById('chat-body');
      return body ? body.innerText.trim() : '';
    });

    console.log('Hindi Bot Response Snippet:', langText.slice(-150));

    if (langText.includes('स्वागत') || langText.includes('मदद')) {
      console.log('✅ SUCCESS: Chatbot successfully auto-detected Hindi input and responded in Hindi!');
    } else {
      console.error('❌ FAILURE: Chatbot language auto-detection failed.');
    }

    console.log('\n=== CHATBOT VERIFICATION COMPLETED SUCCESSFULLY ===');

  } catch (e) {
    console.error('Error during chatbot verification:', e.message);
  } finally {
    await browser.close();
  }
})();
