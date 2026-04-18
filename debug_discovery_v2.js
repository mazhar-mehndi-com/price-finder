const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugDiscovery() {
    console.log("--- 🕵️‍♂️ DISCOVERY DEEP DEBUG START ---");
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        const searchUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&LH_BIN=1&_sop=12';
        console.log(`1. Navigating to search: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log("   - Page loaded. Checking for block...");

        const content = await page.content();
        const isBlocked = content.includes("Robot Check") || content.includes("captcha") || content.toLowerCase().includes("verify you are a human");
        
        if (isBlocked) {
            console.log("   [!!!] BLOCKED BY EBAY. Waiting 10s for you to look at it...");
            await new Promise(r => setTimeout(r, 10000));
        }

        console.log("2. Attempting to extract Item URLs...");
        const itemUrls = await page.evaluate(() => {
            // Try 3 different selector patterns
            const links = new Set();
            
            // Pattern A: Standard s-item links
            document.querySelectorAll('.s-item__link').forEach(a => links.add(a.href));
            
            // Pattern B: Any /itm/ link that looks like a product
            document.querySelectorAll('a[href*="/itm/"]').forEach(a => {
                if (!a.href.includes('ebay.com/itm/')) return;
                links.add(a.href);
            });

            return Array.from(links).filter(h => !h.includes('p.ebaystatic.com')).slice(0, 10);
        });

        console.log(`   - Found ${itemUrls.length} potential items.`);

        if (itemUrls.length === 0) {
            console.log("   [ERR] 0 items found. Dumping HTML to discovery_fail.html");
            fs.writeFileSync('discovery_fail.html', content);
            return;
        }

        const sellers = new Set();
        console.log("3. Visiting items to find sellers...");

        for (const url of itemUrls.slice(0, 3)) {
            console.log(`   - Checking: ${url.substring(0, 60)}...`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const sellerInfo = await page.evaluate(() => {
                const results = {};
                // Strategy A: x-seller-section
                const a = document.querySelector('.x-seller-section__name, [data-testid="x-seller-section"] a');
                // Strategy B: mbg-nw (Old layout)
                const b = document.querySelector('.mbg-nw');
                // Strategy C: seller-persona (Mobile/New)
                const c = document.querySelector('.seller-persona a');
                
                results.name = (a || b || c)?.innerText || null;
                results.htmlMatch = !!(a || b || c);
                return results;
            });

            if (sellerInfo.name) {
                const cleaned = sellerInfo.name.split('(')[0].trim();
                console.log(`     ✅ Found: ${cleaned}`);
                sellers.add(cleaned);
            } else {
                console.log("     ❌ No seller name found on this page.");
            }
        }

        console.log(`--- DEBUG COMPLETED. Total Sellers: ${sellers.size} ---`);
        console.log("Result:", Array.from(sellers));

    } catch (e) {
        console.error("DEBUG CRASHED:", e.message);
    } finally {
        await browser.close();
        process.exit();
    }
}

debugDiscovery();
