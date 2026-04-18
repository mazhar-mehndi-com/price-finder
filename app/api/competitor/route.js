import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  let browser;
  let tempDirToCleanup = null;
  
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Please provide an eBay Seller Username.' }, { status: 400 });
    }

    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    const primaryUserDataDir = process.env.USER_DATA_DIR;

    const launchBrowser = async (useProfile) => {
        const uDir = useProfile ? primaryUserDataDir : path.join(process.cwd(), 'chrome-profile-competitor-' + Date.now());
        if (!useProfile) tempDirToCleanup = uDir;
        
        return await puppeteer.launch({
            executablePath: chromePath,
            userDataDir: uDir,
            headless: isCloud ? true : false, 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
            ],
        });
    };

    try {
        browser = await launchBrowser(!!primaryUserDataDir);
    } catch (e) {
        browser = await launchBrowser(false);
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const checkBlocked = async () => {
        try {
            const content = await page.content();
            const isBlocked = content.includes("Robot Check") || content.includes("captcha") || content.includes("Pardon Our Interruption");
            return isBlocked;
        } catch (e) { return false; }
    };

    const handleCaptcha = async () => {
        try {
            await page.waitForFunction(() => {
                const text = document.body.innerText.toLowerCase();
                return !text.includes('please verify you are a human') && !document.body.innerHTML.toLowerCase().includes('captcha-delivery.com');
            }, { timeout: 300000, polling: 2000 });
            await new Promise(r => setTimeout(r, 2000));
            return true;
        } catch (e) { return false; }
    };

    const scrapeEbayListings = async (url) => {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        if (await checkBlocked()) {
            const resolved = await handleCaptcha();
            if (!resolved) throw new Error("Blocked by eBay bot detection.");
        }
        try { await page.waitForSelector('.s-item, .s-card', { timeout: 10000 }); } catch (e) {}

        return await page.evaluate(() => {
            const items = [];
            const cards = Array.from(document.querySelectorAll('.s-item, .s-card'));
            cards.forEach((card) => {
                if (card.innerText.includes('Shop on eBay') || card.querySelector('.s-item__sep')) return;
                const titleEl = card.querySelector('.s-item__title, .s-card__title, h3');
                const priceEl = card.querySelector('.s-item__price, [class*="price"]');
                const dateEl = card.querySelector('.s-item__ended-date, .POSITIVE, .s-item__caption');
                const imgEl = card.querySelector('.s-item__image-img, img');
                const linkEl = card.querySelector('.s-item__link, a');
                
                if (!titleEl || !priceEl) return;
                let title = titleEl.innerText.replace(/new listing/i, '').trim().split('\n')[0];
                const priceText = priceEl.innerText.trim();
                const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
                const soldDate = dateEl ? dateEl.innerText.replace(/sold\s+/i, '').trim() : "";
                const itemUrl = linkEl ? linkEl.href : "";
                const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : "";
                
                if (title.length > 5 && itemUrl.includes('/itm/')) {
                    items.push({ title, price, soldDate, itemUrl, imageUrl });
                }
            });
            return items;
        });
    };

    // 1. Fetch SOLD listings
    const soldUrl = `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(username)}&LH_Sold=1&LH_Complete=1&_sop=13`;
    const soldListings = await scrapeEbayListings(soldUrl);

    // 2. Fetch ACTIVE listings
    const activeUrl = `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(username)}&_sop=12`;
    const activeListings = await scrapeEbayListings(activeUrl);

    // --- MARKET INTELLIGENCE LAYER ---
    const normalize = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
    const productsMap = {};

    // Process Sold
    soldListings.forEach(item => {
        const key = normalize(item.title);
        if (!productsMap[key]) {
            productsMap[key] = { 
                title: item.title, imageUrl: item.imageUrl, itemUrl: item.itemUrl,
                soldCount: 0, activeCount: 0, soldPrices: [], activePrices: [], lastSold: item.soldDate
            };
        }
        productsMap[key].soldCount++;
        productsMap[key].soldPrices.push(item.price);
    });

    // Process Active
    activeListings.forEach(item => {
        const key = normalize(item.title);
        if (!productsMap[key]) {
            productsMap[key] = { 
                title: item.title, imageUrl: item.imageUrl, itemUrl: item.itemUrl,
                soldCount: 0, activeCount: 0, soldPrices: [], activePrices: [], lastSold: ""
            };
        }
        productsMap[key].activeCount++;
        productsMap[key].activePrices.push(item.price);
    });

    const products = Object.values(productsMap).map(p => {
        const avgSold = p.soldPrices.length > 0 ? (p.soldPrices.reduce((a, b) => a + b, 0) / p.soldPrices.length) : 0;
        const avgActive = p.activePrices.length > 0 ? (p.activePrices.reduce((a, b) => a + b, 0) / p.activePrices.length) : 0;
        
        // Sell-Through Rate (STR)
        const str = p.activeCount > 0 ? (p.soldCount / p.activeCount) : p.soldCount;

        // Trending Score (Simplified ZIK Formula)
        // (itemsSold * 0.5) + (STR * 0.3) + (Price Stability * 0.2)
        const score = Math.min(100, Math.floor((p.soldCount * 5) + (str * 10) + 20));

        let trend = "⚖️ Stable";
        if (score > 80) trend = "🔥 Hot";
        else if (score > 60) trend = "📈 Rising";

        let insight = "Competitive pricing";
        if (avgActive > avgSold && avgSold > 0) insight = "Overpriced vs market";
        else if (avgActive < avgSold && avgActive > 0) insight = "Great value/Underpriced";

        return {
            ...p,
            avgSoldPrice: avgSold.toFixed(2),
            avgActivePrice: avgActive.toFixed(2),
            sellThroughRate: str.toFixed(2),
            score,
            trend,
            insight
        };
    }).sort((a, b) => b.score - a.score).slice(0, 20);

    // Global Stats
    const marketStr = activeListings.length > 0 ? (soldListings.length / activeListings.length).toFixed(2) : soldListings.length;
    
    await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }

    return NextResponse.json({ 
        username,
        stats: {
            totalSold: soldListings.length,
            totalActive: activeListings.length,
            marketStr,
            uniqueProducts: products.length
        },
        products 
    });

  } catch (error) {
    if (browser) await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
