const { launchScraperBrowser, checkAndHandleCaptcha } = require('./src/utils/scrapers');
const fs = require('fs');

async function debugEtsy() {
    console.log('Debugging Etsy Scraper...');
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        console.log('Navigating to Etsy...');
        await page.goto(`https://www.etsy.com/search?q=iphone+15`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        await checkAndHandleCaptcha(page, 'Etsy');

        console.log('Page Title:', await page.title());
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'etsy_debug.png' });
        
        console.log('Saving HTML...');
        const html = await page.content();
        fs.writeFileSync('etsy_debug.html', html);
        
        const cardCount = await page.evaluate(() => {
            return document.querySelectorAll('.wt-list-unstyled li, [data-search-results] li, [class*="list-unstyled"] li').length;
        });
        console.log('Card count in DOM:', cardCount);

    } catch (e) {
        console.error('Debug failed:', e);
    } finally {
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
}

debugEtsy();
