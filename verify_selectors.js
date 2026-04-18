const puppeteer = require('puppeteer');

async function verifySelectors() {
    console.log("--- 🧪 SELECTOR VERIFICATION START ---");
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: 'C:\\Users\\mazha\\OneDrive\\Desktop\\ebay-scrap\\chrome-profile',
        headless: false,
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        const itemUrl = 'https://www.ebay.com/itm/366250479527';
        console.log(`Navigating to verified item: ${itemUrl}`);
        
        await page.goto(itemUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("Page loaded. Extracting HTML snippet...");

        const htmlSnippet = await page.evaluate(() => {
            const el = document.querySelector('.x-seller-section__name, .mbg-nw, [data-testid*="seller"], .seller-persona');
            return el ? el.outerHTML : "NOT FOUND BY COMMON CLASSES";
        });

        console.log("Extracted Snippet:", htmlSnippet);

        const sellers = await page.evaluate(() => {
            const found = [];
            document.querySelectorAll('a[href*="/usr/"]').forEach(a => {
                found.push({ text: a.innerText.trim(), href: a.href });
            });
            return found;
        });

        console.log("Found /usr/ links:", sellers);
        
        if (results.selector_testid === "NOT FOUND" && results.selector_usr_link === "NOT FOUND") {
            console.log("🚨 ALL SELECTORS FAILED. Dumping seller section HTML...");
            const html = await page.evaluate(() => {
                // Try to find ANY element that mentions "Seller" or "Feedback"
                return document.body.innerHTML.match(/seller-info">([\s\S]{1,500})/i)?.[0] || "No match found";
            });
            console.log("DEBUG HTML SNIPPET:", html);
        }

    } catch (e) {
        console.error("Verification failed:", e.message);
    } finally {
        await new Promise(r => setTimeout(r, 5000)); // Keep open 5s to look
        await browser.close();
        process.exit();
    }
}

verifySelectors();
