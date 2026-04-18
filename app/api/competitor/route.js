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

    // eBay URL to show SOLD items for a specific seller
    // LH_Sold=1: Show only sold items
    // LH_Complete=1: Show completed items
    // _ssn: Seller name parameter
    const url = `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(username)}&LH_Sold=1&LH_Complete=1&_sop=13`;

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

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    if (await checkBlocked()) {
        const resolved = await handleCaptcha();
        if (!resolved) {
            await browser.close();
            if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
            throw new Error("Blocked by eBay bot detection (Captcha not resolved).");
        }
    }

    // Wait for items to load
    try {
        await page.waitForSelector('.s-item, .s-card', { timeout: 15000 });
    } catch (e) {}

    const sellerData = await page.evaluate(() => {
        const items = [];
        const cards = Array.from(document.querySelectorAll('.s-item, .s-card, [class*="s-item"]'));
        
        cards.forEach((card) => {
            if (card.innerText.includes('Shop on eBay') || card.querySelector('.s-item__sep')) return;

            const titleEl = card.querySelector('.s-item__title, .s-card__title, h3');
            const priceEl = card.querySelector('.s-item__price, .s-card__price, [class*="price"]');
            const dateEl = card.querySelector('.s-item__ended-date, .POSITIVE, .s-item__caption');
            const imgEl = card.querySelector('.s-item__image-img, img');
            const linkEl = card.querySelector('.s-item__link, a');
            
            if (!titleEl || !priceEl) return;
            
            let title = titleEl.innerText.replace(/new listing/i, '').trim();
            title = title.split('\n')[0].trim();
            
            const price = priceEl.innerText.trim();
            const soldDate = dateEl ? dateEl.innerText.replace(/sold\s+/i, '').trim() : "Recently";
            const itemUrl = linkEl ? linkEl.href : "";
            const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : "";
            
            if (title.length > 5 && itemUrl.includes('/itm/')) {
                items.push({ title, price, soldDate, itemUrl, imageUrl });
            }
        });
        
        return items;
    });

    // Velocity Calculation Logic
    // Group identical items to see what they are selling multiple times
    const velocityMap = {};
    sellerData.forEach(item => {
        if (!velocityMap[item.title]) {
            velocityMap[item.title] = { ...item, salesCount: 0 };
        }
        velocityMap[item.title].salesCount++;
    });

    const topItems = Object.values(velocityMap)
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 15);

    // Calculate Summary Stats
    const totalSalesFound = sellerData.length;
    const avgPrice = totalSalesFound > 0 
        ? (sellerData.reduce((acc, curr) => {
            const p = parseFloat(curr.price.replace(/[^\d.]/g, ''));
            return acc + (isNaN(p) ? 0 : p);
          }, 0) / totalSalesFound).toFixed(2)
        : 0;

    await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }

    return NextResponse.json({ 
        username,
        stats: {
            totalRecentSales: totalSalesFound,
            averagePrice: avgPrice,
            uniqueProducts: Object.keys(velocityMap).length
        },
        topItems 
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('Competitor Scrape Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
