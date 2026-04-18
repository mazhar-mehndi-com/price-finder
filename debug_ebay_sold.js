const { launchScraperBrowser, checkAndHandleCaptcha, preparePage } = require('./src/utils/scrapers');
const fs = require('fs');

async function debugSold() {
    console.log('Debugging eBay Sold Listings Scraper...');
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        const url = `https://www.ebay.com/sch/i.html?_nkw=iphone+15&rt=nc&LH_Sold=1&LH_Complete=1`;
        console.log('Navigating to:', url);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        await checkAndHandleCaptcha(page, 'eBay');

        console.log('Saving HTML...');
        const html = await page.content();
        fs.writeFileSync('ebay_sold_debug.html', html);
        
        const cardCount = await page.evaluate(() => {
            // Check common eBay listing classes
            return document.querySelectorAll('.s-item, .s-card, .srp-results .s-item').length;
        });
        console.log('Card count in DOM:', cardCount);

        const firstItem = await page.evaluate(() => {
            const card = document.querySelector('.s-item, .s-card');
            if (!card) return 'No card found';
            return {
                title: card.querySelector('.s-item__title')?.innerText,
                price: card.querySelector('.s-item__price')?.innerText
            };
        });
        console.log('First Item Sample:', firstItem);

    } catch (e) {
        console.error('Debug failed:', e);
    } finally {
        await browser.close();
    }
}

debugSold();
