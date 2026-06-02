const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('pa_lang', 'en');
    });

    await page.goto('https://www.padmanabhayurved.com/', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'live_site_screenshot.png' });
    console.log("Saved live_site_screenshot.png");

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
