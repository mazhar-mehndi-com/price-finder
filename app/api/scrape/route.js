import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  let browser;
  let tempDirToCleanup = null;
  
  try {
    let { url, deep = false } = await request.json();

    if (!url || !url.includes('ebay.com')) {
      return NextResponse.json({ error: 'Please provide a valid eBay URL.' }, { status: 400 });
    }

    const urlObj = new URL(url);
    if (!url.includes('/itm/')) {
        urlObj.searchParams.set('_stpos', '10001');
        urlObj.searchParams.set('_fcid', '1');
    }
    url = urlObj.toString();

    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    const primaryUserDataDir = process.env.USER_DATA_DIR;
    const isItemPage = url.includes('/itm/');

    const launchBrowser = async (useProfile) => {
        const uDir = useProfile ? primaryUserDataDir : path.join(process.cwd(), 'chrome-profile-temp-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        if (!useProfile) tempDirToCleanup = uDir;
        
        return await puppeteer.launch({
            executablePath: chromePath,
            userDataDir: uDir,
            headless: isCloud ? true : isItemPage, 
            slowMo: (isCloud || isItemPage) ? 0 : 50,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
            ],
        });
    };

    try {
        browser = await launchBrowser(!!primaryUserDataDir);
    } catch (e) {
        if (e.message.includes('already running') || e.message.includes('locked')) {
            browser = await launchBrowser(false);
        } else {
            throw e;
        }
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const checkBlocked = async () => {
        try {
            const content = await page.content();
            const text = content.toLowerCase();
            const isBlocked = content.includes("Robot Check") || 
                              content.includes("captcha") || 
                              content.includes("Pardon Our Interruption") || 
                              text.includes("please verify you are a human") ||
                              text.includes("security check");
            return isBlocked;
        } catch (e) {
            console.error('[checkBlocked] Error:', e.message);
            return false;
        }
    };

    const handleCaptcha = async () => {
        console.log(`[!!!] eBay BLOCK DETECTED. URL: ${page.url()}`);
        // In local dev, we want to see the browser to solve it
        console.log(`[Wait] Waiting up to 5 minutes for manual captcha resolution...`);
        try {
            await page.waitForFunction(() => {
                const text = document.body.innerText.toLowerCase();
                return !text.includes('please verify you are a human') && !document.body.innerHTML.toLowerCase().includes('captcha-delivery.com');
            }, { timeout: 300000, polling: 2000 });
            await new Promise(r => setTimeout(r, 2000));
            return true;
        } catch (e) {
            console.log(`[Captcha] Wait failed: ${e.message}`);
            return false;
        }
    };

    if (isItemPage) {
        // --- ITEM DETAIL PAGE SCRAPE ---
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        if (await checkBlocked()) {
            const resolved = await handleCaptcha();
            if (!resolved) {
                await browser.close();
                if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
                throw new Error("Blocked by eBay bot detection (Captcha not resolved).");
            }
        }

        try { await page.waitForSelector('h1.x-item-title__mainTitle, .x-price-primary', { timeout: 15000 }); } catch (e) { }

        const productData = await page.evaluate(() => {
            const titleEl = document.querySelector('h1.x-item-title__mainTitle') || document.querySelector('h1') || document.querySelector('.product-title');
            const title = titleEl ? titleEl.innerText.trim() : document.title.split('|')[0].trim();
            const priceEl = document.querySelector('.x-price-primary') || document.querySelector('.display-price');
            const price = priceEl ? priceEl.innerText.trim() : "";
            const images = Array.from(document.querySelectorAll('.ux-image-carousel-item img, .icImg, .mainImg'))
                .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('data-zoom-src'))
                .filter(src => src && !src.includes('s-l64') && src.startsWith('http'))
                .map(src => src.replace(/s-l[0-9]+\./, 's-l1600.'));
            
            // EXTRACT CATEGORY ID FROM VARIOUS SOURCES
            let categoryId = "9355"; // Default
            try {
                // 1. Check window.ebay (Common in many layouts)
                if (window.ebay && window.ebay.categoryId) {
                    categoryId = window.ebay.categoryId.toString();
                } 
                // 2. Check utag_data (Tealium data layer)
                else if (window.utag_data && window.utag_data.page_referrer_sacat) {
                    categoryId = window.utag_data.page_referrer_sacat.toString();
                } else if (window.utag_data && window.utag_data.category_id) {
                    categoryId = window.utag_data.category_id.toString();
                }
                // 3. Search breadcrumbs specifically for the leaf category
                if (categoryId === "9355") {
                    const bcLinks = Array.from(document.querySelectorAll('nav.seo-breadcrumb-text a, .bc-w a, li.bc-item a'));
                    if (bcLinks.length > 0) {
                        const lastLink = bcLinks[bcLinks.length - 1].href;
                        const m = lastLink.match(/\/sch\/(\d+)/) || lastLink.match(/_sacat=(\d+)/);
                        if (m) categoryId = m[1];
                    }
                }
                // 4. Final attempt: Scan all script tags for categoryId
                if (categoryId === "9355") {
                    const html = document.documentElement.innerHTML;
                    const m = html.match(/"categoryId"\s*:\s*"?(\d+)"?/) || 
                             html.match(/leafCategoryId\s*[:=]\s*"?(\d+)"?/) ||
                             html.match(/category_id\s*[:=]\s*"?(\d+)"?/);
                    if (m) categoryId = m[1];
                }
            } catch(e) {}

            const specs = {};
            const rows = document.querySelectorAll('.ux-layout-section-evo__row, .ux-layout-section--item-specifics .ux-labels-values');
            rows.forEach(row => {
                const labels = Array.from(row.querySelectorAll('.ux-labels-values__labels')).map(l => l.innerText.replace(/:/g, '').trim());
                const values = Array.from(row.querySelectorAll('.ux-labels-values__values')).map(v => v.innerText.trim());
                labels.forEach((l, i) => { if (l && values[i]) specs[l] = values[i]; });
            });

            const descIframe = document.querySelector('iframe[src*="desc"]')?.src || "";
            return { title, price, images: [...new Set(images)], specs, descIframe, categoryId };
        });

        let fullDescription = "";
        if (productData.descIframe) {
            try {
                await page.goto(productData.descIframe, { waitUntil: 'domcontentloaded', timeout: 30000 });
                fullDescription = await page.evaluate(() => document.body.innerText.trim());
            } catch (e) { }
        }

        await browser.close();
        if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }

        return NextResponse.json({ 
            items: [{
                Title: productData.title.replace(/\n/g, ' ').trim(),
                Price: productData.price,
                PicURL: productData.images[0] || "",
                Images: productData.images,
                Specs: productData.specs,
                Description: fullDescription,
                FullDescription: fullDescription,
                Action: "Add",
                Category: productData.categoryId,
                ConditionID: "1000",
                Quantity: "10",
                Format: "FixedPriceItem",
                Site: "US",
                Currency: "USD"
            }] 
        }, { status: 200 });

    } else {
        // --- SEARCH RESULTS PAGE SCRAPE ---
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        if (await checkBlocked()) {
            const resolved = await handleCaptcha();
            if (!resolved) {
                await browser.close();
                if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
                throw new Error("Blocked by eBay bot detection (Captcha not resolved).");
            }
        }

        const searchCategoryId = await page.evaluate(() => {
            try {
                if (window.ebay && window.ebay.categoryId) return window.ebay.categoryId.toString();
                const html = document.documentElement.innerHTML;
                const m = html.match(/"categoryId"\s*:\s*"?(\d+)"?/) || html.match(/_sacat=(\d+)/);
                return m ? m[1] : "9355";
            } catch(e) { return "9355"; }
        });

        const listings = await page.evaluate(() => {
          const items = [];
          // Try multiple common container selectors
          const cards = Array.from(document.querySelectorAll('.s-item, .s-card, [class*="s-item"], [class*="s-card"]'));
          
          cards.forEach((card) => {
            // Find title using multiple possible classes
            const titleEl = card.querySelector('.s-item__title, .s-card__title, [class*="title"], h3');
            // Find price using multiple possible classes
            const priceEl = card.querySelector('.s-item__price, .s-card__price, [class*="price"]');
            const imgEl = card.querySelector('.s-item__image-img, .s-card__image, img');
            const linkEl = card.querySelector('.s-item__link, .s-card__link, a');
            
            if (!titleEl || !priceEl) return;
            
            let title = titleEl.innerText.trim().replace(/^new listing\s+/i, '').replace(/\nOpens in a new window or tab/i, '');
            let priceText = priceEl.innerText.trim();
            let itemUrl = linkEl ? linkEl.href : "";
            
            // eBay often marks sponsored items with a specific span or text
            const isSponsored = card.innerText.includes('Sponsored') || card.querySelector('.s-item__sep');
            
            // Improved price extraction
            let priceMatch = priceText.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
            let price = priceMatch ? priceMatch[0] : priceText;
            
            if (title && !title.toLowerCase().includes('shop on ebay') && !isSponsored && title !== "") {
              items.push({ 
                title, 
                price, 
                img: imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : "", 
                url: itemUrl 
              });
            }
          });
          return items;
        });

        let transformed = listings.map(item => {
          let cleanTitle = item.title.trim();
          let numericPriceText = item.price.replace(/[^\d.]/g, '');
          let numericPrice = parseFloat(numericPriceText);
          return {
            Action: "Add",
            Category: searchCategoryId,
            Title: cleanTitle.substring(0, 80).replace(/\n/g, ' '),
            ConditionID: "1000",
            Price: !isNaN(numericPrice) && numericPrice > 0 ? numericPrice.toFixed(2) : item.price,
            Quantity: "10",
            Format: "FixedPriceItem",
            Description: `High-quality ${cleanTitle}`.replace(/\n/g, ' '),
            PicURL: item.img || "",
            Site: "US",
            Currency: "USD",
            ItemUrl: item.url,
            Specs: {},
            FullDescription: ""
          };
        });

        if (deep && transformed.length > 0) {
            const limit = Math.min(transformed.length, 3);
            for (let i = 0; i < limit; i++) {
                try {
                    await page.goto(transformed[i].ItemUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    const details = await page.evaluate(() => {
                        const specs = {};
                        const rows = document.querySelectorAll('.ux-layout-section-evo__row, .ux-layout-section--item-specifics .ux-labels-values');
                        rows.forEach(row => {
                            const labels = Array.from(row.querySelectorAll('.ux-labels-values__labels')).map(l => l.innerText.replace(/:/g, '').trim());
                            const values = Array.from(row.querySelectorAll('.ux-labels-values__values')).map(v => v.innerText.trim());
                            labels.forEach((l, i) => { if (l && values[i]) specs[l] = values[i]; });
                        });
                        const iframe = document.querySelector('iframe[src*="desc"]')?.src || "";
                        
                        let catId = "";
                        try {
                            if (window.ebay && window.ebay.categoryId) catId = window.ebay.categoryId.toString();
                            else {
                                const bLinks = Array.from(document.querySelectorAll('nav.seo-breadcrumb-text a, .bc-w a'));
                                if (bLinks.length > 0) {
                                    const lastLink = bLinks[bLinks.length - 1].href;
                                    const m = lastLink.match(/\/sch\/(\d+)/) || lastLink.match(/_sacat=(\d+)/);
                                    if (m) catId = m[1];
                                }
                            }
                        } catch(e) {}
                        
                        return { specs, iframe, catId };
                    });
                    transformed[i].Specs = details.specs;
                    if (details.catId) transformed[i].Category = details.catId;
                    if (details.iframe) {
                        try {
                            await page.goto(details.iframe, { waitUntil: 'domcontentloaded', timeout: 20000 });
                            transformed[i].FullDescription = await page.evaluate(() => document.body.innerText.trim());
                            transformed[i].Description = transformed[i].FullDescription.substring(0, 500).replace(/\n/g, ' ');
                        } catch (e) { }
                    }
                } catch (e) { }
            }
        }

        await browser.close();
        if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
        return NextResponse.json({ items: transformed }, { status: 200 });
    }

  } catch (error) {
    if (browser) await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
    console.error('Scrape Error:', error.message);
    return NextResponse.json({ error: 'Failed to scrape: ' + error.message }, { status: 500 });
  }
}
