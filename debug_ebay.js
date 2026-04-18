const { launchScraperBrowser, checkAndHandleCaptcha } = require('./src/utils/scrapers');
const fs = require('fs');

async function debugEbay() {
    console.log('Debugging eBay Scraper...');
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        console.log('Navigating to eBay...');
        await page.goto(`https://www.ebay.com/sch/i.html?_nkw=iphone+15&_ipg=60`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 2000));
        await checkAndHandleCaptcha(page, 'eBay');
        await new Promise(r => setTimeout(r, 3000));

        console.log('Page Title:', await page.title());
        console.log('Final URL:', page.url());

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'ebay_debug.png' });
        
        console.log('Saving HTML...');
        const html = await page.content();
        fs.writeFileSync('ebay_debug.html', html);
        
        const cardCount = await page.evaluate(() => {
            return document.querySelectorAll('.s-item, .s-card, .srp-results .s-item, .srp-results .s-card').length;
        });
        console.log('Card count in DOM:', cardCount);

        const titles = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.s-item__title')).map(el => el.innerText).slice(0, 5);
        });
        console.log('Sample titles:', titles);

    } catch (e) {
        console.error('Debug failed:', e);
    } finally {
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
}

debugEbay();
