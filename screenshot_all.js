const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1080 }); // Desktop view

    console.log("Navigating to local index...");
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    console.log("Setting language to english (so no popups)...");
    await page.evaluate(() => {
      localStorage.setItem('pa_lang', 'en');
      const style = document.createElement('style');
      style.textContent = `
        * { animation: none !important; transition: none !important; }
        .animate-on-scroll, .animate-in { opacity: 1 !important; transform: none !important; }
      `;
      document.head.appendChild(style);
      
      const popup = document.getElementById('lang-splash');
      if (popup) popup.style.display = 'none';
      if (typeof setLanguage === 'function') setLanguage('en');
    });

    const pagesToScreenshot = ['home', 'about', 'catalog', 'cart', 'earn'];

    
    for (let pageName of pagesToScreenshot) {
      console.log(`Navigating to ${pageName}...`);
      await page.evaluate((name) => {
        if (typeof window.navigate === 'function') {
          window.navigate(name);
        } else {
          window.location.hash = name;
        }
      }, pageName);

      // Wait for rendering
      await new Promise(r => setTimeout(r, 2000));
      
      const path = `screenshot_${pageName}.png`;
      await page.screenshot({ path: path, fullPage: true });
      console.log(`Saved ${path}`);
    }

  } catch (e) {
    console.error("Failed:", e);
  } finally {
    await browser.close();
  }
})();
