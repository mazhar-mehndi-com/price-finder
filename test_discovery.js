const puppeteer = require('puppeteer');

async function testDiscovery() {
    console.log("Starting discovery test...");
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false, 
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        const discoveryUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&LH_BIN=1&_sop=12&_ipg=240';
        console.log(`Navigating to: ${discoveryUrl}`);
        
        await page.goto(discoveryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log("Page loaded. Waiting 5 seconds for dynamic content...");
        await new Promise(r => setTimeout(r, 5000));

        const content = await page.content();
        console.log(`Content length: ${content.length}`);

        const sellers = new Set();
        
        // Strategy 1: Look for seller-info-text (Search results)
        // eBay HTML: <span class="s-item__seller-info-text">sellername (1234) 99%</span>
        const infoMatches = content.matchAll(/s-item__seller-info-text">([a-zA-Z0-9\-_]+)/g);
        for (const match of infoMatches) {
            if (match[1]) sellers.add(match[1].toLowerCase());
        }
        console.log(`Found via Info Text: ${sellers.size}`);

        // Strategy 2: Look for /usr/ or /str/ links
        const urlMatches = content.matchAll(/\/(?:usr|str)\/([a-zA-Z0-9\-_]+)/g);
        for (const match of urlMatches) {
            const name = match[1].toLowerCase();
            if (!['ebay', 'deals', 'trending', 'help', 'pages', 'itm', 'i', 'p'].includes(name) && name.length > 2) {
                sellers.add(name);
            }
        }
        console.log(`Total unique sellers found: ${sellers.size}`);
        console.log("Sellers:", Array.from(sellers).slice(0, 15));

        if (sellers.size === 0) {
            console.log("DEBUG: Saving page content to discovery_debug.html");
            require('fs').writeFileSync('discovery_debug.html', content);
        }

    } catch (e) {
        console.error("Test failed:", e.message);
    } finally {
        await browser.close();
        process.exit();
    }
}

testDiscovery();
