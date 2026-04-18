const path = require('path');
const fs = require('fs');

const req = eval('require');
const puppeteer = req('puppeteer-extra');
const StealthPlugin = req('puppeteer-extra-plugin-stealth');

if (puppeteer.use && !puppeteer.pluginNames?.includes('stealth')) {
    puppeteer.use(StealthPlugin());
}

async function launchScraperBrowser() {
    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL;
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
        const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL;
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

    // Detect Sandbox environment
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
        console.error(`[eBay ${isSandbox ? 'Sandbox' : 'API'}] Token Error:`, error.response?.data || error.message);
        return null;
    }
}

async function scrapeEbay(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- eBay Scrape Start: ${searchTerm} ---`);

    const appId = process.env.EBAY_APP_ID?.trim();
    const isSandbox = appId?.includes('-SBX-');

    // Try eBay API first
    const token = await getEbayToken();
    if (token) {
        console.log(`[eBay] Using official ${isSandbox ? 'Sandbox' : 'Production'} API...`);
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
            if (searchResult && searchResult.item) {
                return searchResult.item.map(item => ({
                    title: item.title?.[0],
                    price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
                    image: item.pictureURLLarge?.[0] || item.galleryURL?.[0],
                    url: item.viewItemURL?.[0]
                })).filter(i => i.price > 0);
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
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(`https://www.walmart.com/search?q=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 4000));
        try { await checkAndHandleCaptcha(page, 'Walmart'); } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-testid="list-view"], [data-item-id], [class*="mb0-m"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('[data-automation-id="product-title"], [class*="product-title"], h3');
                const priceEl = card.querySelector('[data-automation-id="product-price"], [class*="price"]');
                if (titleEl && priceEl) {
                    // Walmart fix: Extract ONLY the current price text, avoiding merged labels
                    // Usually current price is in a specific sub-element or first part of text
                    let priceText = priceEl.innerText.split('Was')[0].split('Options')[0];
                    priceText = priceText.replace(/[^\d.]/g, '');

                    if (!priceText.includes('.') && priceText.length > 3) {
                         priceText = priceText.slice(0, -2) + '.' + priceText.slice(-2);
                    }
                    const p = parseFloat(priceText);
                    if (!isNaN(p)) return { title: titleEl.innerText.trim(), price: p, image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) { console.error(`[Walmart] Error: ${e.message}`); if (browser) await browser.close(); if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {} return []; }
}

async function scrapeEtsy(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Etsy Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(`https://www.etsy.com/search?q=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 4000));
        try { await checkAndHandleCaptcha(page, 'Etsy'); } catch (e) {}
        
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
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) { console.error(`[Etsy] Error: ${e.message}`); if (browser) await browser.close(); if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {} return []; }
}

async function scrapeCostco(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Costco Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto(`https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 5000));
        try { await checkAndHandleCaptcha(page, 'Costco'); } catch (e) {}

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.product-list .product, .product-tile, [class*="product-tile"]'));
            return cards.map(card => {
                const titleEl = card.querySelector('.description a, h3, [class*="description"]');
                const priceEl = card.querySelector('.price, [class*="price"]');
                if (titleEl && priceEl) {
                    const m = priceEl.innerText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) return { title: titleEl.innerText.trim(), price: parseFloat(m[0]), image: card.querySelector('img')?.src || "", url: card.querySelector('a')?.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) { console.error(`[Costco] Error: ${e.message}`); if (browser) await browser.close(); if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (err) {} return []; }
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
        await page.goto(`https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(searchTerm)}`, { waitUntil: 'load', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));
        try { await checkAndHandleCaptcha(page, 'BestBuy'); } catch (e) {}

        const results = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.sku-item, .list-item'));
            return cards.map(card => {
                const titleEl = card.querySelector('.sku-header a, .sku-title a');
                const priceEl = card.querySelector('.priceView-customer-price span');
                if (titleEl && priceEl) {
                    const m = priceEl.innerText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                    if (m) return { title: titleEl.innerText.trim(), price: parseFloat(m[0]), image: card.querySelector('img')?.src || "", url: titleEl.href };
                }
                return null;
            }).filter(Boolean);
        });
        await browser.close();
        return results.slice(0, 10);
    } catch (e) { console.error(`[Best Buy] Error: ${e.message}`); if (browser) await browser.close(); return []; }
}

module.exports = { 
    launchScraperBrowser, checkAndHandleCaptcha, getEbayToken,
    scrapeEbay, scrapeAmazon, scrapeAliExpress, 
    scrapeWalmart, scrapeEtsy, scrapeCostco, 
    scrapeTemu, scrapeTarget, scrapeBestBuy 
};
