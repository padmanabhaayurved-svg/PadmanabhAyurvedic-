const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.url().includes('drive.google.com')) {
      console.log('DRIVE RESP:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:8080');
  await page.evaluate(() => localStorage.setItem('pa_lang', 'en'));
  await page.goto('http://localhost:8080/#product/29ywAvr0BRxF3Q4WWkTZ', { waitUntil: 'networkidle2' });
  
  // Wait for the gallery image to be rendered
  await page.waitForSelector('#gallery-main-img');
  
  const imgInfo = await page.evaluate(() => {
    const img = document.querySelector('#gallery-main-img');
    return {
      src: img.src,
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      className: img.className
    };
  });
  
  console.log('Image Info:', imgInfo);
  
  await browser.close();
})();
