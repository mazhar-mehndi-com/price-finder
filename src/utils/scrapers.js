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
    
    // Use the USER_DATA_DIR from .env if available, otherwise create a temp one
    const userDataDir = process.env.USER_DATA_DIR || path.join(process.cwd(), 'chrome-profile-compare-' + Date.now());
    const isTemp = !process.env.USER_DATA_DIR;

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        userDataDir: userDataDir,
        headless: isCloud ? 'new' : false, // Headless in cloud, visible on local
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1920,1080',
            !isCloud ? `--profile-directory=${process.env.CHROME_PROFILE_NAME || 'Default'}` : '',
        ].filter(Boolean),
    });

    return { browser, tempDir: (isTemp && !isCloud) ? userDataDir : null };
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
    console.log(`[Check] Checking for blocks/captchas on ${platform}...`);
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
            return !!document.querySelector('#nc_1_wrapper') || !!document.querySelector('.nc_wrapper') || text.includes('slide to verify') || text.includes('captcha interception') || title.includes('captcha') || url.includes('_____tmd_____');
        }
        if (plat === 'Walmart') {
            return text.includes('verify you are human') || text.includes('press and hold') || title.includes('robot or human');
        }
        if (plat === 'Etsy') {
            return text.includes('prove you\'re human') || text.includes('security check') || title.includes('etsy search');
        }
        if (plat === 'Costco') {
            return text.includes('access denied') || text.includes('pardon our interruption') || title.includes('access denied');
        }
        if (plat === 'Temu') {
            return !!document.querySelector('#captcha-container') || text.includes('slide to verify') || text.includes('captcha interception');
        }
        return false;
    }, platform);

    if (isCaptcha) {
        console.log(`[!!!] BLOCK DETECTED on ${platform}. URL: ${page.url()}`);
        const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL;
        
        if (isCloud) {
            console.log(`[!] CRITICAL: Blocked in Cloud environment. Cannot solve manually here.`);
        } else {
            console.log(`[!] Please solve the challenge manually in the local browser.`);
        }
        
        try { await page.bringToFront(); } catch (e) {}

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
            }, { timeout: isCloud ? 10000 : 600000, polling: 2000 }, platform);
            
            console.log(`[✔] Challenge cleared on ${platform}.`);
            return true;
        } catch (e) {
            console.log(`[!] Giving up on ${platform} after block/timeout.`);
            return false;
        }
    }
    console.log(`[Check] No immediate block detected on ${platform}.`);
    return false;
}

async function scrapeEbay(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- eBay Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_ipg=60&_blrs=recall_filtering`;
        console.log(`[eBay] Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        await checkAndHandleCaptcha(page, 'eBay');
        
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
                            title: titleText, price: parseFloat(priceMatch[0]),
                            image: imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || "") : "",
                            url: linkEl.href
                        });
                    }
                }
            }
            return data;
        });

        console.log(`[eBay] Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[eBay] Error:', e.message);
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
        
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
        console.log(`[Amazon] Navigating to: ${searchUrl}`);
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
                            title: titleEl.innerText.trim(), price: priceValue,
                            image: imgEl ? imgEl.src : "",
                            url: linkEl.href.startsWith('http') ? linkEl.href : 'https://www.amazon.com' + linkEl.getAttribute('href')
                        });
                    }
                }
            }
            return data;
        });

        if (results.length === 0) {
            console.log(`[Amazon] Zero items. Final block check...`);
            await checkAndHandleCaptcha(page, 'Amazon');
        }

        console.log(`[Amazon] Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[Amazon] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeAliExpress(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- AliExpress Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const searchUrl = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(searchTerm.replace(/\s+/g, '-'))}.html`;
        console.log(`[AliExpress] Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        await checkAndHandleCaptcha(page, 'AliExpress');
        
        console.log("[AliExpress] Stabilization wait (10s)...");
        await new Promise(r => setTimeout(r, 10000));
        
        const getAliResults = async () => {
            return await page.evaluate(() => {
                const data = [];
                const selectors = [
                    '.search-item-card-wrapper-gallery', 
                    '.search-card-item', 
                    '[class*="search-item-card"]',
                    '[class*="list--item"]',
                    '[class*="multi--content"]',
                    '.multi--container--1_8keSD',
                    'div[data-index]'
                ];
                
                let cards = [];
                selectors.forEach(s => {
                    const found = Array.from(document.querySelectorAll(s));
                    if (found.length > cards.length) cards = found;
                });

                const seenIds = new Set();
                for (const card of cards) {
                    const titleEl = card.querySelector('h3, h1, [class*="title"], [class*="Title"]');
                    const priceEl = card.querySelector('[class*="price"], [class*="Price"], .lw_kt, .multi--price-sale--3996963');
                    const imgEl = card.querySelector('img');
                    const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="/item/"]');
                    
                    if (titleEl && priceEl && linkEl) {
                        const titleText = titleEl.innerText.trim();
                        const priceText = priceEl.innerText.trim().replace(/,/g, '');
                        const m = priceText.match(/(\d+(\.\d+)?)/);
                        const url = linkEl.href.startsWith('http') ? linkEl.href : 'https:' + linkEl.getAttribute('href');
                        const itemIdMatch = url.match(/\/item\/(\d+)\.html/);
                        const itemId = itemIdMatch ? itemIdMatch[1] : url;

                        if (m && titleText.length > 5 && !seenIds.has(itemId)) {
                            seenIds.add(itemId);
                            let priceVal = parseFloat(m[0]);
                            if (priceText.includes('PKR') || priceVal > 500) { priceVal = parseFloat((priceVal / 280).toFixed(2)); }
                            data.push({ title: titleText, price: priceVal, image: imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : "", url: url });
                        }
                    }
                }
                return data;
            });
        };

        let results = await getAliResults();
        console.log(`[AliExpress] Initial check found: ${results.length} items`);
        
        if (results.length === 0) {
            const pageData = await page.evaluate(() => ({
                title: document.title,
                bodySnippet: document.body.innerText.substring(0, 500),
                cardCount: document.querySelectorAll('div').length
            }));
            console.log(`[AliExpress] DEBUG - Page Title: "${pageData.title}"`);
            console.log(`[AliExpress] DEBUG - Body Snippet: ${pageData.bodySnippet.replace(/\n/g, ' ')}`);
            
            console.log("[AliExpress] Attempting scroll and re-scan...");
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 4000));
            results = await getAliResults();
            console.log(`[AliExpress] Items found after scroll: ${results.length}`);
        }

        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[AliExpress] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeWalmart(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Walmart Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(searchTerm)}`;
        console.log(`[Walmart] Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await checkAndHandleCaptcha(page, 'Walmart');
        await new Promise(r => setTimeout(r, 5000));
        const results = await page.evaluate(() => {
            const data = [];
            const cards = Array.from(document.querySelectorAll('[data-testid="list-view"], [data-item-id], .mb0-m'));
            for (const card of cards) {
                const titleEl = card.querySelector('[data-automation-id="product-title"], .f6-m');
                const priceEl = card.querySelector('[data-automation-id="product-price"], .w_iUH7');
                const imgEl = card.querySelector('img');
                const linkEl = card.querySelector('a');
                if (titleEl && priceEl && linkEl) {
                    const priceText = priceEl.innerText.replace(/,/g, '');
                    const m = priceText.match(/(\d+(\.\d+)?)/);
                    if (m) {
                        data.push({
                            title: titleEl.innerText.trim(),
                            price: parseFloat(m[0]),
                            image: imgEl ? imgEl.src : "",
                            url: linkEl.href.startsWith('http') ? linkEl.href : 'https://www.walmart.com' + linkEl.getAttribute('href')
                        });
                    }
                }
                if (data.length >= 10) break;
            }
            return data;
        });
        console.log(`[Walmart] Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[Walmart] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeEtsy(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Etsy Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const searchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(searchTerm)}`;
        console.log(`[Etsy] Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await checkAndHandleCaptcha(page, 'Etsy');
        await new Promise(r => setTimeout(r, 3000));
        const results = await page.evaluate(() => {
            const data = [];
            const cards = Array.from(document.querySelectorAll('.wt-list-unstyled li, [data-search-results] li'));
            for (const card of cards) {
                const titleEl = card.querySelector('h3');
                const priceEl = card.querySelector('.currency-value');
                const imgEl = card.querySelector('img');
                const linkEl = card.querySelector('a');
                if (titleEl && priceEl && linkEl) {
                    data.push({
                        title: titleEl.innerText.trim(),
                        price: parseFloat(priceEl.innerText.replace(/,/g, '')),
                        image: imgEl ? imgEl.src : "",
                        url: linkEl.href
                    });
                }
                if (data.length >= 10) break;
            }
            return data;
        });
        console.log(`[Etsy] Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[Etsy] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeCostco(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Costco Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const searchUrl = `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(searchTerm)}`;
        console.log(`[Costco] Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await checkAndHandleCaptcha(page, 'Costco');
        await new Promise(r => setTimeout(r, 5000));
        const results = await page.evaluate(() => {
            const data = [];
            const cards = Array.from(document.querySelectorAll('.product-list .product, .product-tile'));
            for (const card of cards) {
                const titleEl = card.querySelector('.description a');
                const priceEl = card.querySelector('.price');
                const imgEl = card.querySelector('img');
                const linkEl = card.querySelector('a');
                if (titleEl && priceEl && linkEl) {
                    const priceText = priceEl.innerText.replace(/,/g, '');
                    const m = priceText.match(/(\d+(\.\d+)?)/);
                    if (m) {
                        data.push({
                            title: titleEl.innerText.trim(),
                            price: parseFloat(m[0]),
                            image: imgEl ? imgEl.src : "",
                            url: linkEl.href
                        });
                    }
                }
                if (data.length >= 10) break;
            }
            return data;
        });
        console.log(`[Costco] Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[Costco] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

async function scrapeTemu(title) {
    const searchTerm = cleanTitle(title);
    console.log(`\n--- Temu Scrape Start: ${searchTerm} ---`);
    const { browser, tempDir } = await launchScraperBrowser();
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const searchUrl = `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(searchTerm)}`;
        console.log(`[Temu] Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await checkAndHandleCaptcha(page, 'Temu');
        await new Promise(r => setTimeout(r, 5000));
        const results = await page.evaluate(() => {
            const data = [];
            const cards = Array.from(document.querySelectorAll('[data-goods-id], .goods-item'));
            for (const card of cards) {
                const titleEl = card.querySelector('[class*="title"], [class*="desc"]');
                const priceEl = card.querySelector('[class*="price"]');
                const imgEl = card.querySelector('img');
                const linkEl = card.querySelector('a');
                if (titleEl && priceEl && linkEl) {
                    const priceText = priceEl.innerText.replace(/,/g, '');
                    const m = priceText.match(/(\d+(\.\d+)?)/);
                    if (m) {
                        data.push({
                            title: titleEl.innerText.trim(),
                            price: parseFloat(m[0]),
                            image: imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : "",
                            url: linkEl.href
                        });
                    }
                }
                if (data.length >= 10) break;
            }
            return data;
        });
        console.log(`[Temu] Found ${results.length} items.`);
        await browser.close();
        if (tempDir) try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        return results.slice(0, 10);
    } catch (e) {
        console.error('[Temu] Error:', e.message);
        if (browser) await browser.close();
        return [];
    }
}

module.exports = { scrapeEbay, scrapeAmazon, scrapeAliExpress, scrapeWalmart, scrapeEtsy, scrapeCostco, scrapeTemu };
