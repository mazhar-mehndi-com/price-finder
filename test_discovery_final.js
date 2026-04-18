const puppeteer = require('puppeteer');
const fs = require('fs');

async function testDiscovery() {
    console.log("--- 🕵️‍♂️ DISCOVERY LIVE TEST START ---");
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: 'C:\\Users\\mazha\\OneDrive\\Desktop\\ebay-scrap\\chrome-profile',
        headless: false,
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        const searchUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&_sacat=0&_from=R40&rt=nc&LH_Sold=1&_ipg=60&_sop=12';
        console.log(`1. Navigating to: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Check for block
        const content = await page.content();
        if (content.includes("Robot Check") || content.includes("captcha") || content.includes("Pardon Our Interruption")) {
            console.log("🛑 BLOCKED. Solve captcha in browser...");
            await new Promise(r => setTimeout(r, 20000)); // Wait for you to solve
        }

        console.log("2. Extracting item URLs...");
        const itemUrls = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
            // Filter to ensure unique, clean item links
            const urls = links.map(l => l.href.split('?')[0])
                             .filter(h => h.includes('ebay.com/itm/'));
            return [...new Set(urls)].slice(0, 15);
        });

        console.log(`   - Found ${itemUrls.length} items.`);
        if (itemUrls.length === 0) {
            console.log("❌ NO ITEMS FOUND. Dumping search HTML...");
            fs.writeFileSync('search_fail.html', await page.content());
            return;
        }

        const sellers = new Set();
        console.log("3. Visiting items to find sellers...");

        for (const url of itemUrls.slice(0, 5)) {
            console.log(`   - Visiting: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const sellerName = await page.evaluate(() => {
                const aboutLink = document.querySelector('.x-sellercard-atf__info__about-seller a, [class*="seller-info"] a, [class*="seller-card"] a');
                if (aboutLink && aboutLink.innerText.trim()) {
                    return aboutLink.innerText.split('(')[0].trim();
                }
                const allLinks = Array.from(document.querySelectorAll('a[data-clientpresentationmetadata]'));
                const sellerLink = allLinks.find(a => a.getAttribute('data-clientpresentationmetadata').includes('SELLER_ITEMS'));
                if (sellerLink && sellerLink.innerText.trim()) {
                    return sellerLink.innerText.split('(')[0].trim();
                }
                return null;
            });

            if (sellerName) {
                console.log(`     ✅ Found: ${sellerName}`);
                sellers.add(sellerName.toLowerCase());
            } else {
                console.log("     ❌ No seller found.");
            }
        }

        console.log("--- TEST COMPLETED ---");
        console.log("Sellers found:", Array.from(sellers));

    } catch (e) {
        console.error("Test failed:", e.message);
    } finally {
        await browser.close();
        process.exit();
    }
}

testDiscovery();
