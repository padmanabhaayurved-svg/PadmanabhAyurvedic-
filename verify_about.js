const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    // Setup error listener
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    console.log("Navigating to local index...");
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });

    console.log("Setting language to english (so no popups)...");
    await page.evaluate(() => {
      localStorage.setItem('pa_lang', 'en');
    });

    console.log("Navigating to about page...");
    // Let's go to index with hash or just straight to the HTML file? 
    // The routing is handled by serve.js and index.js. 
    // Let's use the UI to click "About" or go to URL '#about'.
    await page.evaluate(() => {
      if (typeof window.navigate === 'function') {
        window.navigate('about');
      } else {
        window.location.hash = 'about';
      }
    });

    // Wait for the about page to render
    await new Promise(r => setTimeout(r, 2000)); 

    console.log("Checking team members on About page...");
    const teamMembers = await page.evaluate(() => {
      const cards = document.querySelectorAll('#team-grid .team-card');
      const data = [];
      cards.forEach(card => {
        data.push({
          name: card.querySelector('.team-name')?.innerText,
          role: card.querySelector('.team-role')?.innerText
        });
      });
      return data;
    });

    console.log(`Found ${teamMembers.length} team members.`);
    teamMembers.forEach((member, i) => {
      console.log(`[${i+1}] Name: ${member.name}, Role: ${member.role}`);
    });

    // Verify grid class
    const gridClass = await page.evaluate(() => {
      return document.getElementById('team-grid')?.className;
    });
    console.log(`Team grid classes: ${gridClass}`);

    await page.setViewport({ width: 1280, height: 2000 });
    await page.screenshot({ path: 'about_page_verified.png', fullPage: true });
    console.log("Screenshot saved as about_page_verified.png");

  } catch (e) {
    console.error("Verification failed:", e);
  } finally {
    await browser.close();
  }
})();
