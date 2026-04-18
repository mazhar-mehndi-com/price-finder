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
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle bot check if necessary (reuse your established pattern)
    const content = await page.content();
    if (content.includes("Robot Check") || content.includes("captcha")) {
        // In this specific tool, if blocked we return an error to avoid hanging
        await browser.close();
        return NextResponse.json({ error: 'Blocked by eBay bot detection. Please try again later or solve captcha in local browser.' }, { status: 403 });
    }

    const sellerData = await page.evaluate(() => {
        const items = [];
        const cards = Array.from(document.querySelectorAll('.s-item__wrapper, .s-item'));
        
        cards.forEach((card) => {
            const titleEl = card.querySelector('.s-item__title');
            const priceEl = card.querySelector('.s-item__price');
            const dateEl = card.querySelector('.s-item__title--tagblock .POSITIVE, .s-item__ended-date');
            const imgEl = card.querySelector('.s-item__image-img');
            const linkEl = card.querySelector('.s-item__link');
            
            if (!titleEl || !priceEl) return;
            
            const title = titleEl.innerText.replace('New Listing', '').trim();
            const price = priceEl.innerText.trim();
            const soldDate = dateEl ? dateEl.innerText.replace('Sold ', '').trim() : "Recently";
            const itemUrl = linkEl ? linkEl.href : "";
            const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : "";
            
            if (title && !title.toLowerCase().includes('shop on ebay')) {
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
