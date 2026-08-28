const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Navigating to live site...');
        const response = await page.goto('https://www.padmanabhayurved.com/', { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });

        console.log("Status Code: " + response.status());
        
        try {
            await page.waitForFunction(() => {
                const splash = document.getElementById('splash-screen');
                return !splash || getComputedStyle(splash).display === 'none' || getComputedStyle(splash).opacity === '0';
            }, { timeout: 10000 });
            console.log('Splash screen cleared naturally.');
        } catch (e) {
            console.log('Splash screen did not clear or not found, forcing hide...');
            await page.evaluate(() => {
                const splash = document.getElementById('splash-screen');
                if (splash) splash.style.display = 'none';
            });
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'screenshot_live_final.png', fullPage: false });

        console.log('Done');
        await browser.close();
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
