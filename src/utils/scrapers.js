const path = require('path');
const fs = require('fs');

const req = eval('require');
const puppeteer = req('puppeteer-extra');
const StealthPlugin = req('puppeteer-extra-plugin-stealth');

if (puppeteer.use && !puppeteer.pluginNames?.includes('stealth')) {
    puppeteer.use(StealthPlugin());
}

async function launchScraperBrowser() {
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    // Use the USER_DATA_DIR from .env if available, otherwise create a temp one
    const userDataDir = process.env.USER_DATA_DIR || path.join(process.cwd(), 'chrome-profile-compare-' + Date.now());
    const isTemp = !process.env.USER_DATA_DIR;

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        userDataDir: userDataDir,
        headless: false,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1920,1080',
            `--profile-directory=${process.env.CHROME_PROFILE_NAME || 'Default'}`,
        ],
    });

    return { browser, tempDir: isTemp ? userDataDir : null };
}

async function simulateHuman(page) {
    await page.setViewport({ width: 1280, height: 800 });
    // Minimal human-like behavior
    await page.evaluate(() => {
        window.scrollBy(0, 300);
    });
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
}

function cleanTitle(title) {
    if (!title) return "";
    // Remove special characters that might confuse the search engine but keep spaces
    let cleaned = title.replace(/[,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    // Remove extra spaces
    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    
    const words = cleaned.split(' ');
    const filtered = words.filter(w => !['for', 'with', 'and', 'the', 'a', 'to', 'in', 'on', 'at', 'by', 'an', 'of'].includes(w.toLowerCase()));
    
    // If it was a very long title, don't truncate it too much, but don't keep it too long either
    if (filtered.length > 10) {
        return filtered.slice(0, 10).join(' ');
    }
    return filtered.join(' ');
}

async function checkAndHandleCaptcha(page, platform) {
    let isCaptcha = await page.evaluate((plat) => {
        const text = document.body.innerText.toLowerCase();
        const title = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();
        
        if (plat === 'eBay') {
            return text.includes('please verify you are a human') || !!document.querySelector('#captcha-container');
        }
        if (plat === 'Amazon') {
            return text.includes('enter the characters you see below') || text.includes('sorry, we just need to make sure you\'re not a robot');
        }
        if (plat === 'AliExpress') {
            return !!document.querySelector('#nc_1_wrapper') || 
                   !!document.querySelector('.nc_wrapper') ||
                   text.includes('slide to verify') || 
                   text.includes('captcha interception') ||
                   title.includes('captcha') ||
                   title.includes('interception') ||
                   url.includes('_____tmd_____');
        }
        return false;
    }, platform);

    if (isCaptcha) {
        console.log(`\n[!!!] ACTION REQUIRED: CAPTCHA/Verification detected on ${platform}.`);
        console.log(`[!!!] A browser window should be visible. PLEASE SOLVE THE CHALLENGE MANUALLY.`);
        console.log(`[!!!] The process will wait here until you finish solving it in the browser.\n`);
        
        try {
            await page.bringToFront();
        } catch (e) {}

        // Wait indefinitely (up to 10 mins) for the user to solve it.
        // We consider it solved when NO captcha elements are found AND the URL doesn't contain block indicators.
        try {
            await page.waitForFunction((plat) => {
                const text = document.body.innerText.toLowerCase();
                const title = document.title.toLowerCase();
                const url = window.location.href.toLowerCase();

                if (plat === 'eBay') return !text.includes('please verify you are a human');
                if (plat === 'Amazon') return !text.includes('enter the characters you see below');
                if (plat === 'AliExpress') {
                    const hasResults = !!document.querySelector('.search-item-card, [class*="list--item"], .multi--content--1At9C3Q');
                    const hasCaptcha = !!document.querySelector('#nc_1_wrapper') || 
                                     !!document.querySelector('.nc_wrapper') ||
                                     text.includes('captcha interception') ||
                                     title.includes('captcha') ||
                                     url.includes('_____tmd_____');
                    return hasResults || !hasCaptcha;
                }
                return true;
            }, { timeout: 600000, polling: 2000 }, platform);
            
            console.log(`[✔] Challenge cleared on ${platform}. Waiting for page to stabilize...`);
            await new Promise(r => setTimeout(r, 5000)); 
            return true;
        } catch (e) {
            console.log(`[!] Timeout or error waiting for manual action on ${platform}.`);
            return false;
        }
    }
    return false;
}

async function scrapeEbay(title) {
    const searchTerm = cleanTitle(title);
    console.log(`[Stealth] Scraping eBay for: ${searchTerm}`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_ipg=60&_blrs=recall_filtering`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        await checkAndHandleCaptcha(page, 'eBay');
        await new Promise(r => setTimeout(r, 2000));
        
        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.s-item, .s-card, .srp-results .s-item, .srp-results .s-card'));
            const data = [];
            for (const card of cards) {
                const titleEl = card.querySelector('.s-item__title, .s-card__title, h3, [role="heading"]');
                const priceEl = card.querySelector('.s-item__price, .s-card__price, .su-card-container__attributes');
                const linkEl = card.querySelector('.s-item__link, .s-card__link, a');
                const imgEl = card.querySelector('.s-item__image-img, .s-card__image, img');

                if (titleEl && priceEl && linkEl) {
                    let titleText = titleEl.innerText.trim().replace(/^new listing\s+/i, '').replace(/\nOpens in a new window or tab/i, '');
                    if (titleText.toLowerCase().includes('shop on ebay') || titleText === "" || titleText.toLowerCase().includes('results for')) continue;

                    let priceText = priceEl.innerText.trim().replace(/,/g, '');
                    let priceMatch = priceText.match(/(\d+(\.\d+)?)/);
                    if (priceMatch) {
                        data.push({
                            title: titleText,
                            price: parseFloat(priceMatch[0]),
                            image: imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || "") : "",
                            url: linkEl.href
                        });
                    }
                }
            }
            return data;
        });

        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 20);
    } catch (e) {
        console.error('eBay Stealth Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeAmazon(title) {
    const searchTerm = cleanTitle(title);
    console.log(`[Stealth] Scraping Amazon for: ${searchTerm}`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        await checkAndHandleCaptcha(page, 'Amazon');
        await simulateHuman(page);
        
        let results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'));
            const data = [];
            for (const card of cards) {
                const titleEl = card.querySelector('h2, .a-size-base-plus, .a-size-medium');
                const priceEl = card.querySelector('.a-price');
                const linkEl = card.querySelector('a.a-link-normal.s-no-outline, h2 a');
                const imgEl = card.querySelector('.s-image');

                if (titleEl && priceEl && linkEl) {
                    const priceOffscreen = priceEl.querySelector('.a-offscreen');
                    const priceFullText = (priceOffscreen ? priceOffscreen.innerText : priceEl.innerText).trim();
                    let priceValue = 0;
                    const m = priceFullText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) {
                        priceValue = parseFloat(m[0]);
                        if (priceFullText.includes('PKR') || priceValue > 500) { priceValue = parseFloat((priceValue / 280).toFixed(2)); }
                    }
                    if (priceValue > 0) {
                        data.push({
                            title: titleEl.innerText.trim(),
                            price: priceValue,
                            image: imgEl ? imgEl.src : "",
                            url: linkEl.href.startsWith('http') ? linkEl.href : 'https://www.amazon.com' + linkEl.getAttribute('href')
                        });
                    }
                }
            }
            return data;
        });

        // If no results, double check for captcha before giving up
        if (results.length === 0) {
            const wasBlocked = await checkAndHandleCaptcha(page, 'Amazon');
            if (wasBlocked) {
                // Re-evaluate if user solved it
                results = await page.evaluate(() => { /* same evaluation logic as above */ });
            }
        }

        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 20);
    } catch (e) {
        console.error('Amazon Stealth Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeAliExpress(title) {
    const searchTerm = cleanTitle(title);
    console.log(`[Stealth] Scraping AliExpress for: ${searchTerm}`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const searchUrl = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(searchTerm.replace(/\s+/g, '-'))}.html`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        await checkAndHandleCaptcha(page, 'AliExpress');
        
        // Stabilization wait
        console.log("[Stealth] AliExpress: Waiting 10s for rendering...");
        await new Promise(r => setTimeout(r, 10000));
        
        const getAliResults = async () => {
            return await page.evaluate(() => {
                const data = [];
                // Target the specific card wrappers identified in debug HTML
                const cards = Array.from(document.querySelectorAll('.search-item-card-wrapper-gallery, .search-card-item, [class*="search-item-card"]'));
                
                const seenIds = new Set();
                for (const card of cards) {
                    // Try specific selectors from debug first
                    const titleEl = card.querySelector('h3, .lw_k4, [class*="title"], [class*="Title"]');
                    const priceEl = card.querySelector('.lw_kt, .lw_el, [class*="price"], [class*="Price"]');
                    const imgEl = card.querySelector('img');
                    const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="/item/"]');

                    if (titleEl && priceEl && linkEl) {
                        const titleText = titleEl.innerText.trim();
                        // Extract price - handle PKR/USD
                        const priceText = priceEl.innerText.trim().replace(/,/g, '');
                        const m = priceText.match(/(\d+(\.\d+)?)/);
                        
                        const url = linkEl.href.startsWith('http') ? linkEl.href : 'https:' + linkEl.getAttribute('href');
                        const itemIdMatch = url.match(/\/item\/(\d+)\.html/);
                        const itemId = itemIdMatch ? itemIdMatch[1] : url;

                        if (m && titleText && titleText.length > 5 && !seenIds.has(itemId)) {
                            seenIds.add(itemId);
                            let priceVal = parseFloat(m[0]);
                            // Locale conversion if PKR is detected
                            if (priceText.includes('PKR') || priceVal > 500) {
                                priceVal = parseFloat((priceVal / 280).toFixed(2));
                            }

                            data.push({
                                title: titleText,
                                price: priceVal,
                                image: imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : "",
                                url: url
                            });
                        }
                    }
                    if (data.length >= 12) break;
                }

                // Backup: if cards failed, use the aggressive link traversal
                if (data.length === 0) {
                    const itemLinks = Array.from(document.querySelectorAll('a[href*="/item/"]'));
                    for (const link of itemLinks) {
                        let container = link.parentElement;
                        for (let i = 0; i < 8; i++) {
                            if (!container) break;
                            const tEl = container.querySelector('h1, h3, [class*="title"]');
                            const pEl = container.querySelector('[class*="price"]');
                            if (tEl && pEl) {
                                const tText = tEl.innerText.trim();
                                const pText = pEl.innerText.trim().replace(/,/g, '');
                                const m = pText.match(/(\d+(\.\d+)?)/);
                                if (m && tText.length > 10) {
                                    let pVal = parseFloat(m[0]);
                                    if (pText.includes('PKR') || pVal > 500) pVal = parseFloat((pVal / 280).toFixed(2));
                                    data.push({
                                        title: tText,
                                        price: pVal,
                                        image: container.querySelector('img')?.src || "",
                                        url: link.href
                                    });
                                    break;
                                }
                            }
                            container = container.parentElement;
                        }
                        if (data.length >= 10) break;
                    }
                }
                return data;
            });
        };

        let results = await getAliResults();
        
        if (results.length === 0) {
            console.log("[Stealth] AliExpress: No items found. Scrolling...");
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 4000));
            results = await getAliResults();
        }

        console.log(`[Stealth] AliExpress: Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 20);
    } catch (e) {
        console.error('AliExpress Stealth Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

module.exports = { scrapeEbay, scrapeAmazon, scrapeAliExpress };
