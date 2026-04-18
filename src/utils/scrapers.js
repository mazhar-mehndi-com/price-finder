const path = require('path');
const fs = require('fs');

const req = eval('require');
const puppeteer = req('puppeteer-extra');
const StealthPlugin = req('puppeteer-extra-plugin-stealth');

if (puppeteer.use && !puppeteer.pluginNames?.includes('stealth')) {
    puppeteer.use(StealthPlugin());
}

async function launchScraperBrowser() {
    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    
    const userDataDir = path.join(process.cwd(), 'chrome-profile-shared');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const args = [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
        !isCloud ? `--profile-directory=${process.env.CHROME_PROFILE_NAME || 'Default'}` : '',
    ];

    // Support for Dynamic Proxies
    if (process.env.PROXY_SERVER) {
        args.push(`--proxy-server=${process.env.PROXY_SERVER}`);
    }

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        userDataDir: userDataDir,
        headless: isCloud ? 'new' : false,
        args: args.filter(Boolean),
    });

    return { browser, tempDir: null };
}

async function preparePage(browser) {
    const page = await browser.newPage();
    
    // Proxy Authentication if needed
    if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD
        });
    }

    // Diverse locales and headers to mimic global browsing
    const locales = ['en-US,en;q=0.9', 'en-GB,en;q=0.8', 'en-CA,en;q=0.7'];
    await page.setExtraHTTPHeaders({
        'Accept-Language': locales[Math.floor(Math.random() * locales.length)],
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
    });

    // Randomize User-Agent to look like different devices
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
    ];
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    
    return page;
}

async function simulateHuman(page) {
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluate(() => { window.scrollBy(0, 300); });
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 300;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight || totalHeight > 3000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

function cleanTitle(title) {
    if (!title) return "";
    let cleaned = title.replace(/[,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ").trim();
    const words = cleaned.split(' ');
    const filtered = words.filter(w => !['for', 'with', 'and', 'the', 'a', 'to', 'in', 'on', 'at', 'by', 'an', 'of'].includes(w.toLowerCase()));
    return filtered.length > 10 ? filtered.slice(0, 10).join(' ') : filtered.join(' ');
}

async function checkAndHandleCaptcha(page, platform) {
    console.log(`[Check] Checking for blocks on ${platform}...`);
    let isCaptcha = await page.evaluate((plat) => {
        const text = document.body.innerText.toLowerCase();
        const title = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();
        const html = document.documentElement.innerHTML.toLowerCase();
        
        const hasText = (t) => text.includes(t) || html.includes(t);
        
        if (hasText('captcha-delivery.com') || hasText('datadome') || title.includes('etsy.com') && text.length < 100) return true;
        if (plat === 'eBay') return text.includes('please verify you are a human') || !!document.querySelector('#captcha-container');
        if (plat === 'Amazon') return text.includes('enter the characters you see below') || text.includes('sorry, we just need to make sure you\'re not a robot');
        if (plat === 'AliExpress') return !!document.querySelector('#nc_1_wrapper') || !!document.querySelector('.nc_wrapper') || text.includes('slide to verify') || text.includes('captcha interception') || title.includes('captcha') || url.includes('_____tmd_____');
        if (plat === 'Walmart') return text.includes('verify you are human') || text.includes('press and hold') || title.includes('robot or human') || url.includes('blocked');
        if (plat === 'Etsy') return text.includes('prove you\'re human') || text.includes('security check') || title.includes('etsy.com');
        if (plat === 'Costco') return text.includes('access denied') || text.includes('pardon our interruption') || title.includes('access denied');
        if (plat === 'Temu') return !!document.querySelector('#captcha-container') || text.includes('slide to verify');
        return false;
    }, platform);

    if (isCaptcha) {
        console.log(`[!!!] BLOCK DETECTED on ${platform}. URL: ${page.url()}`);
        const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
        if (!isCloud) { try { await page.bringToFront(); } catch (e) {} }
        console.log(`[Wait] Waiting for manual captcha resolution on ${platform}...`);
        try {
            // Wait for the URL to change or the body text to change (indicating success)
            await page.waitForFunction((plat) => {
                const text = document.body.innerText.toLowerCase();
                const html = document.documentElement.innerHTML.toLowerCase();
                const url = window.location.href.toLowerCase();
                
                if (html.includes('captcha-delivery.com') || html.includes('datadome')) return false;
                if (url.includes('blocked') || url.includes('punish')) return false;
                
                if (plat === 'eBay') return !text.includes('please verify you are a human');
                if (plat === 'Amazon') return !text.includes('enter the characters you see below');
                if (plat === 'AliExpress') return !document.querySelector('#nc_1_wrapper') && !document.querySelector('.nc_wrapper') && !url.includes('_____tmd_____');
                if (plat === 'Walmart') return !window.location.href.includes('blocked');
                return true;
            }, { timeout: isCloud ? 5000 : 300000, polling: 2000 }, platform);
            
            // Give it a moment to settle after manual resolution
            await new Promise(r => setTimeout(r, 2000));
            return true;
        } catch (e) { 
            console.log(`[Captcha] Wait finished or failed: ${e.message}`);
            return false; 
        }
    }
    return false;
}

const axios = require('axios');
const qs = require('qs');

async function getEbayToken() {
    const appId = process.env.EBAY_APP_ID?.trim();
    const certId = process.env.EBAY_CERT_ID?.trim();
    
    if (!appId || !certId) return null;

    // Detect environment
    const isSandbox = appId.includes('-SBX-');
    const tokenUrl = isSandbox 
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' 
        : 'https://api.ebay.com/identity/v1/oauth2/token';

    try {
        const auth = Buffer.from(`${appId}:${certId}`).toString('base64');
        const response = await axios.post(tokenUrl, 
            qs.stringify({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error(`[eBay ${isSandbox ? 'Sandbox' : 'Production'}] Token Error:`, error.response?.data || error.message);
        return null;
    }
}

async function scrapeEbay(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- eBay Scrape Start: ${searchTerm} ---`);

    const appId = process.env.EBAY_APP_ID?.trim();
    const isSandbox = appId?.includes('-SBX-');

    // Try eBay API first (Finding API uses SECURITY-APPNAME which is the App ID)
    if (appId) {
        console.log(`[eBay] Using official ${isSandbox ? 'Sandbox' : 'Production'} Finding API...`);
        const searchUrl = isSandbox
            ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
            : 'https://svcs.ebay.com/services/search/FindingService/v1';

        try {
            const response = await axios.get(searchUrl, {
                params: {
                    'OPERATION-NAME': 'findItemsByKeywords',
                    'SERVICE-VERSION': '1.0.0',
                    'SECURITY-APPNAME': appId,
                    'RESPONSE-DATA-FORMAT': 'JSON',
                    'keywords': searchTerm,
                    'paginationInput.entriesPerPage': 10,
                    'outputSelector': 'PictureURLLarge'
                }
            });

            const searchResult = response.data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0];
            if (searchResult && searchResult.item && searchResult.item.length > 0) {
                return searchResult.item.map(item => ({
                    title: item.title?.[0],
                    price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
                    image: item.pictureURLLarge?.[0] || item.galleryURL?.[0],
                    url: item.viewItemURL?.[0]
                })).filter(i => i.price > 0);
            } else {
                console.log('[eBay API] No items found in API response, falling back to scraper...');
            }
        } catch (error) {
            console.error('[eBay API] Search Error:', error.message);
        }
    }

    // Fallback to Puppeteer Scraper
    console.log('[eBay] Falling back to Puppeteer Scraper...');
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_ipg=60&_blrs=recall_filtering`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 4000));
        try { await checkAndHandleCaptcha(page, 'eBay'); } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.s-item, .s-card, .srp-results .s-item, .srp-results .s-card, [class*="s-item"], [class*="s-card"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('.s-item__title, .s-card__title, .su-styled-text.primary, h3');
                const priceEl = card.querySelector('.s-item__price, .s-card__price, [class*="price"]');
                const linkEl = card.querySelector('.s-item__link, .s-card__link, a');
                if (titleEl && priceEl && linkEl) {
                    const priceText = priceEl.innerText;
                    const priceMatch = priceText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (priceMatch) {
                        return { 
                            title: titleEl.innerText.trim().replace(/\nOpens in a new window or tab/i, ''), 
                            price: parseFloat(priceMatch[0]), 
                            image: card.querySelector('img')?.src || "", 
                            url: linkEl.href 
                        };
                    }
                }
                return null;
            }).filter(i => i && i.price > 0 && !i.title.toLowerCase().includes('shop on ebay') && i.title !== "");
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { 
        console.error(`[eBay] Scraper Error: ${e.message}`);
        if (browser) await browser.close(); 
        return []; 
    }
}

async function scrapeAmazon(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Amazon Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(`https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 3000));
        try { await checkAndHandleCaptcha(page, 'Amazon'); } catch (e) {}
        await simulateHuman(page);
        
        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('h2, .a-size-base-plus, [class*="title"]');
                const priceEl = card.querySelector('.a-price');
                const linkEl = card.querySelector('h2 a, a.a-link-normal, [class*="link"]');
                if (titleEl && priceEl && linkEl) {
                    const priceText = priceEl.querySelector('.a-offscreen')?.innerText || priceEl.innerText;
                    const m = priceText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) {
                        let p = parseFloat(m[0]);
                        // Regional conversion logic if needed
                        if (priceText.includes('PKR') || (priceText.includes('Rs') && p > 1000)) p = parseFloat((p / 280).toFixed(2));
                        return { title: titleEl.innerText.trim(), price: p, image: card.querySelector('.s-image')?.src || "", url: linkEl.href.startsWith('http') ? linkEl.href : 'https://www.amazon.com' + linkEl.getAttribute('href') };
                    }
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) { console.error(`[Amazon] Error: ${e.message}`); if (browser) await browser.close(); if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {} return []; }
}

async function scrapeAliExpress(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- AliExpress Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(`https://www.aliexpress.com/w/wholesale-${encodeURIComponent(searchTerm.replace(/\s+/g, '-'))}.html`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        try { await checkAndHandleCaptcha(page, 'AliExpress'); } catch (e) {}
        await new Promise(r => setTimeout(r, 3000));

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[class*="search-item-card"], [class*="list--item"], [class*="multi--content"], [class*="ItemCard"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('h3, h1, [class*="title"]');
                const priceEl = card.querySelector('[class*="price"], .lw_kt');
                const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="/item/"]');
                if (titleEl && priceEl && linkEl) {
                    const priceText = priceEl.innerText.trim();
                    const m = priceText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) {
                        let p = parseFloat(m[0]);
                        if (priceText.includes('PKR') || (priceText.includes('Rs') && p > 1000)) p = parseFloat((p / 280).toFixed(2));
                        const url = linkEl.href.startsWith('http') ? linkEl.href : 'https:' + linkEl.getAttribute('href');
                        return { title: titleEl.innerText.trim(), price: p, image: card.querySelector('img')?.src || "", url };
                    }
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) { console.error(`[AliExpress] Error: ${e.message}`); if (browser) await browser.close(); if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {} return []; }
}

async function scrapeWalmart(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Walmart Scrape Start: ${searchTerm} ---`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        await page.goto(`https://www.walmart.com/search?q=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        try { await checkAndHandleCaptcha(page, 'Walmart'); } catch (e) {}
        
        console.log('[Walmart] Scrolling to load items...');
        await autoScroll(page);
        await new Promise(r => setTimeout(r, 2000));

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-testid="list-view"], [data-item-id], [class*="mb0-m"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('[data-automation-id="product-title"], [class*="product-title"], h3');
                const priceEl = card.querySelector('[data-automation-id="product-price"], [class*="price"]');
                if (titleEl && priceEl) {
                    const text = priceEl.innerText;
                    // Improved regex to find first dollar amount like 367.98
                    const m = text.match(/\d+\.\d{2}/);
                    if (m) {
                        return { title: titleEl.innerText.trim(), price: parseFloat(m[0]), image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                    }
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Walmart] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

async function scrapeEtsy(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Etsy Scrape Start: ${searchTerm} ---`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        await page.goto(`https://www.etsy.com/search?q=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        try { await checkAndHandleCaptcha(page, 'Etsy'); } catch (e) {}
        
        console.log('[Etsy] Scrolling to load items...');
        await autoScroll(page);

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.wt-list-unstyled li, [data-search-results] li, [class*="list-unstyled"] li'));
            return cards.map(card => {
                const titleEl = card.querySelector('h3, [class*="title"]');
                const priceEl = card.querySelector('.currency-value, [class*="price"]');
                if (titleEl && priceEl) {
                    const p = parseFloat(priceEl.innerText.replace(/,/g, '').replace(/[^\d.]/g, ''));
                    if (!isNaN(p)) return { title: titleEl.innerText.trim(), price: p, image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Etsy] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

async function scrapeCostco(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Costco Scrape Start: ${searchTerm} ---`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        await page.goto(`https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 6000));
        try { await checkAndHandleCaptcha(page, 'Costco'); } catch (e) {}

        console.log('[Costco] Scrolling to load items...');
        await autoScroll(page);

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.product-list .product, .product-tile, [class*="product-tile"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('.description a, h3, [class*="description"]');
                const priceEl = card.querySelector('.price, [class*="price"]');
                if (titleEl && priceEl) {
                    const m = priceEl.innerText.replace(/,/g, '').match(/\d+\.\d{2}/);
                    if (m) return { title: titleEl.innerText.trim(), price: parseFloat(m[0]), image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Costco] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

async function scrapeTemu(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Temu Scrape Start: ${searchTerm} ---`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        await page.goto(`https://www.temu.com/search_result.html?search_key=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        try { await checkAndHandleCaptcha(page, 'Temu'); } catch (e) {}

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-goods-id], .goods-item, [class*="goods-item"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('[class*="title"], [class*="desc"]');
                const priceEl = card.querySelector('[class*="price"]');
                if (titleEl && priceEl) {
                    const m = priceEl.innerText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) return { title: titleEl.innerText.trim(), price: parseFloat(m[0]), image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Temu] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

async function scrapeTarget(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Target Scrape Start: ${searchTerm} ---`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        await page.goto(`https://www.target.com/s?searchTerm=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));
        try { await checkAndHandleCaptcha(page, 'Target'); } catch (e) {}

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-test="@web/site-top-of-funnel/ProductCardWrapper"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('[data-test="product-title"]');
                const priceEl = card.querySelector('[data-test="current-price"]');
                if (titleEl && priceEl) {
                    const m = priceEl.innerText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) return { title: titleEl.innerText.trim(), price: parseFloat(m[0]), image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Target] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

async function scrapeBestBuy(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Best Buy Scrape Start: ${searchTerm} ---`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        await page.goto(`https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for the main list or a common element to appear
        try {
            await page.waitForSelector('.sku-item-list, .list-item, .sku-item', { timeout: 15000 });
        } catch (e) {
            console.log('[Best Buy] Warning: Main list not found, might be empty or blocked.');
        }

        await new Promise(r => setTimeout(r, 3000));
        try { await checkAndHandleCaptcha(page, 'BestBuy'); } catch (e) {}

        console.log('[Best Buy] Scrolling slowly to trigger lazy-load...');
        // Slower auto-scroll for Best Buy's heavy scripts
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 200; // Smaller distance
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight || totalHeight > 4000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 300); // More time between scrolls
            });
        });
        
        await new Promise(r => setTimeout(r, 2000));

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.sku-item, .list-item, [class*="sku-item"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('.sku-header a, .sku-title a, h3 a');
                const priceEl = card.querySelector('.priceView-customer-price span, [class*="price"]');
                const imgEl = card.querySelector('.product-image, img');
                
                if (titleEl && priceEl) {
                    const priceText = priceEl.innerText;
                    const m = priceText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) {
                        return { 
                            title: titleEl.innerText.trim(), 
                            price: parseFloat(m[0]), 
                            image: imgEl ? imgEl.src : "", 
                            url: titleEl.href.startsWith('http') ? titleEl.href : 'https://www.bestbuy.com' + titleEl.getAttribute('href')
                        };
                    }
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Best Buy] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

async function fetchEbayMarketData(title) {
    const searchTerm = cleanTitle(title);
    const appId = process.env.EBAY_APP_ID?.trim();
    const isSandbox = appId?.includes('-SBX-');

    // OAuth token is required for the Browse API
    const token = await getEbayToken();

    const browseBaseUrl = isSandbox 
        ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
        : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    const findingBaseUrl = isSandbox
        ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
        : 'https://svcs.ebay.com/services/search/FindingService/v1';

    try {
        // 1. Fetch Active Items via Browse API (Modern, higher limits)
        let activeItems = [];
        if (token) {
            try {
                const activeRes = await axios.get(browseBaseUrl, {
                    params: { q: searchTerm, limit: 15 },
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                activeItems = (activeRes.data.itemSummaries || []).map(item => ({
                    title: item.title,
                    price: parseFloat(item.price?.value),
                    image: item.image?.imageUrl,
                    url: item.itemWebUrl,
                    status: 'active'
                }));
            } catch (e) {
                console.error('[eBay Browse API] Error:', e.response?.data || e.message);
            }
        }

        // 2. Fetch Sold Items via Finding API (Only method for historical data)
        const soldRes = await axios.get(findingBaseUrl, {
            params: { 
                'OPERATION-NAME': 'findCompletedItems',
                'SERVICE-VERSION': '1.0.0',
                'SECURITY-APPNAME': appId,
                'RESPONSE-DATA-FORMAT': 'JSON',
                'keywords': searchTerm,
                'itemFilter(0).name': 'SoldItemsOnly',
                'itemFilter(0).value': 'true',
                'paginationInput.entriesPerPage': 10
            }
        });

        const soldItems = (soldRes.data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || []).map(item => ({
            title: item.title?.[0],
            price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
            image: item.pictureURLLarge?.[0] || item.galleryURL?.[0],
            url: item.viewItemURL?.[0],
            status: 'sold'
        }));

        return { activeItems, soldItems };
    } catch (error) {
        console.error('[eBay Analytics] Error Response:', JSON.stringify(error.response?.data, null, 2) || error.message);
        throw error;
    }
}

async function getEbayToken() {
    const appId = process.env.EBAY_APP_ID?.trim();
    const certId = process.env.EBAY_CERT_ID?.trim();
    if (!appId || !certId) return null;
    const isSandbox = appId.includes('-SBX-');
    const tokenUrl = isSandbox ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' : 'https://api.ebay.com/identity/v1/oauth2/token';
    try {
        const auth = Buffer.from(`${appId}:${certId}`).toString('base64');
        const response = await axios.post(tokenUrl, qs.stringify({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` } });
        return response.data.access_token;
    } catch (error) { return null; }
}

async function scrapeEbaySoldListings(title) {
    const searchTerm = cleanTitle(title);
    console.log(`[Fallback] Scraping eBay Sold Listings for: ${searchTerm}`);
    const { browser } = await launchScraperBrowser();
    try {
        const page = await preparePage(browser);
        // eBay search URL for sold items
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&rt=nc&LH_Sold=1&LH_Complete=1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        try { await checkAndHandleCaptcha(page, 'eBay'); } catch (e) {}
        
        await autoScroll(page);

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.s-item, .s-card, .srp-results .s-item, .srp-results .s-card'));
            return cards.map(card => {
                const titleEl = card.querySelector('.s-item__title, .s-card__title, [class*="title"], h3');
                const priceEl = card.querySelector('.s-item__price, .s-card__price, [class*="price"]');
                const sellerEl = card.querySelector('.s-item__seller-info, .su-styled-text.primary, [class*="seller"]');
                const linkEl = card.querySelector('.s-item__link, .s-card__link, a');
                
                if (titleEl && priceEl) {
                    const priceText = priceEl.innerText;
                    const m = priceText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) {
                        return { 
                            title: titleEl.innerText.trim().replace(/\nOpens in a new window or tab/i, ''), 
                            price: parseFloat(m[0]), 
                            seller: sellerEl ? sellerEl.innerText.split('(')[0].trim() : 'Unknown', 
                            condition: 'Used', 
                            shipping: 0,
                            url: linkEl ? linkEl.href : ""
                        };
                    }
                }
                return null;
            }).filter(i => i && i.price > 0 && !i.title.toLowerCase().includes('shop on ebay'));
        });
        await browser.close();
        return results;
    } catch (e) {
        console.error('[eBay Sold Scraper] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function fetchDeepMarketInsights(title) {
    const searchTerm = cleanTitle(title);
    const appId = process.env.EBAY_APP_ID?.trim();
    const isSandbox = appId?.includes('-SBX-');

    const token = await getEbayToken();

    const browseBaseUrl = isSandbox 
        ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
        : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    const findingBaseUrl = isSandbox
        ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
        : 'https://svcs.ebay.com/services/search/FindingService/v1';

    let activeItems = [];
    let soldItems = [];

    // 1. Fetch Active Items (Prefer Browse API for higher limits)
    try {
        if (token) {
            const activeRes = await axios.get(browseBaseUrl, {
                params: { q: searchTerm, limit: 40 },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            activeItems = (activeRes.data.itemSummaries || []).map(item => ({
                title: item.title,
                price: parseFloat(item.price?.value),
                seller: item.seller?.username || 'Unknown',
                condition: item.condition || 'Unknown',
                shipping: item.shippingOptions?.[0]?.shippingCost?.value || 0
            }));
        } else {
            const activeRes = await axios.get(findingBaseUrl, {
                params: { 'OPERATION-NAME': 'findItemsByKeywords', 'SERVICE-VERSION': '1.0.0', 'SECURITY-APPNAME': appId, 'RESPONSE-DATA-FORMAT': 'JSON', 'keywords': searchTerm, 'paginationInput.entriesPerPage': 40 }
            });
            activeItems = (activeRes.data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || []).map(i => ({
                title: i.title?.[0],
                price: parseFloat(i.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
                seller: i.sellerInfo?.[0]?.sellerUserName?.[0] || 'Unknown',
                condition: i.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
                shipping: parseFloat(i.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__) || 0
            }));
        }
    } catch (e) {
        console.error('[Market Research] Active Items Fetch Error:', e.message);
    }

    // SMALL DELAY to prevent eBay Rate Limiter (Error 10001)
    await new Promise(r => setTimeout(r, 2000));

    // 2. Fetch Sold Items (Try API first, then Fallback to Scraper)
    try {
        const soldRes = await axios.get(findingBaseUrl, {
            params: { 
                'OPERATION-NAME': 'findCompletedItems', 
                'SERVICE-VERSION': '1.0.0', 
                'SECURITY-APPNAME': appId, 
                'RESPONSE-DATA-FORMAT': 'JSON', 
                'keywords': searchTerm, 
                'itemFilter(0).name': 'SoldItemsOnly', 
                'itemFilter(0).value': 'true',
                'paginationInput.entriesPerPage': 40 
            }
        });
        soldItems = (soldRes.data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || []).map(i => ({
            title: i.title?.[0],
            price: parseFloat(i.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
            seller: i.sellerInfo?.[0]?.sellerUserName?.[0] || 'Unknown',
            condition: i.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
            shipping: parseFloat(i.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__) || 0,
            url: i.viewItemURL?.[0]
        }));
    } catch (e) {
        console.log('[Market Research] Sold API Limit reached or error, switching to scraper fallback...');
        soldItems = await scrapeEbaySoldListings(searchTerm);
    }

    if (activeItems.length === 0 && soldItems.length === 0) {
        throw new Error('Could not retrieve market data. Please try again in a few minutes.');
    }

    // --- CALCULATE ANALYTICS ---
    const activePrices = activeItems.map(i => i.price).filter(p => p > 0);
    const soldPrices = soldItems.map(i => i.price).filter(p => p > 0);
    
    const avgActive = activePrices.length > 0 ? (activePrices.reduce((a,b)=>a+b,0) / activePrices.length) : 0;
    const avgSold = soldPrices.length > 0 ? (soldPrices.reduce((a,b)=>a+b,0) / soldPrices.length) : 0;

    const sellThroughRate = (activeItems.length + soldItems.length) > 0 
        ? (soldItems.length / (activeItems.length + soldItems.length)) * 100 
        : 0;

    const sellerCounts = {};
    soldItems.forEach(item => {
        sellerCounts[item.seller] = (sellerCounts[item.seller] || 0) + 1;
    });
    const topSellers = Object.entries(sellerCounts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(s => ({ username: s[0], count: s[1] }));

    const conditions = { New: 0, Used: 0, Other: 0 };
    soldItems.forEach(item => {
        const cond = (item.condition || 'Used').toLowerCase();
        if (cond.includes('new')) conditions.New++;
        else if (cond.includes('used') || cond.includes('pre-owned') || cond.includes('refurbished')) conditions.Used++;
        else conditions.Other++;
    });

    const freeShippingRate = soldItems.length > 0 
        ? (soldItems.filter(i => i.shipping === 0).length / soldItems.length) * 100 
        : 0;

    return {
        keyword: searchTerm,
        stats: {
            avgActivePrice: parseFloat(avgActive.toFixed(2)),
            avgSoldPrice: parseFloat(avgSold.toFixed(2)),
            sellThroughRate: parseFloat(sellThroughRate.toFixed(1)),
            freeShippingRate: parseFloat(freeShippingRate.toFixed(1)),
            activeCount: activeItems.length,
            soldCount: soldItems.length
        },
        topSellers,
        conditions,
        sampleSold: soldItems.slice(0, 5)
    };
}

module.exports = { 
    launchScraperBrowser, checkAndHandleCaptcha, getEbayToken, preparePage,
    scrapeEbay, scrapeAmazon, scrapeAliExpress, 
    scrapeWalmart, scrapeEtsy, scrapeCostco, 
    scrapeTemu, scrapeTarget, scrapeBestBuy,
    fetchEbayMarketData, fetchDeepMarketInsights,
    scrapeEbaySoldListings
};
