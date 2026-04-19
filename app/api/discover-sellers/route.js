import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export async function POST() {
  let browser;
  let tempDirToCleanup = null;
  
  try {
    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    const primaryUserDataDir = process.env.USER_DATA_DIR;
    
    const launchBrowser = async (useProfile) => {
        const uDir = useProfile ? primaryUserDataDir : path.join(process.cwd(), 'chrome-profile-discovery-' + Date.now());
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

    const checkBlocked = async () => {
        try {
            const content = await page.content();
            return content.includes("Robot Check") || content.includes("captcha") || content.includes("Pardon Our Interruption");
        } catch (e) { return false; }
    };

    const handleCaptcha = async () => {
        console.log(`[Discovery] 🛑 BLOCKED. Waiting for manual solution in browser...`);
        try {
            await page.waitForFunction(() => {
                const text = document.body.innerText.toLowerCase();
                const isStillBlocked = text.includes('please verify you are a human') || 
                                     document.title.includes('Pardon Our Interruption') ||
                                     document.body.innerHTML.toLowerCase().includes('captcha-delivery.com');
                return !isStillBlocked;
            }, { timeout: 300000, polling: 2000 });
            console.log(`[Discovery] ✅ Block cleared. Waiting for page to settle...`);
            await new Promise(r => setTimeout(r, 4000));
            return true;
        } catch (e) { return false; }
    };

    const searchUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&_sacat=0&_from=R40&rt=nc&LH_Sold=1&_ipg=60&_sop=12';
    console.log(`[Discovery] 1. Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    if (await checkBlocked()) {
        const resolved = await handleCaptcha();
        if (!resolved) throw new Error("Blocked by Captcha");
    }

    try { await page.waitForSelector('a[href*="/itm/"]', { timeout: 15000 }); } catch (e) {}

    const itemUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
        const urls = links.map(l => l.href.split('?')[0]).filter(h => h.includes('ebay.com/itm/'));
        return [...new Set(urls)].slice(0, 20);
    });

    if (itemUrls.length === 0) {
        await browser.close();
        return NextResponse.json({ error: "No items found on search page." }, { status: 403 });
    }

    const sellersMap = {};
    for (const url of itemUrls.slice(0, 10)) {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            if (await checkBlocked()) await handleCaptcha();

            const itemData = await page.evaluate(() => {
                const data = { name: null, soldCount: 0 };
                const aboutLink = document.querySelector('.x-sellercard-atf__info__about-seller a, [class*="seller-info"] a, [class*="seller-card"] a');
                if (aboutLink) data.name = aboutLink.innerText.split('(')[0].trim();
                const soldEl = document.querySelector('.x-quantity-lbt .BOLD, .d-quantity__availability .BOLD, .vi-qtyS-hot-red');
                if (soldEl) {
                    const m = soldEl.innerText.replace(/,/g, '').match(/(\d+)/);
                    if (m) data.soldCount = parseInt(m[1]);
                }
                return data;
            });

            if (itemData.name) {
                const cleaned = itemData.name.toLowerCase();
                if (cleaned.length > 2 && !['ebay', 'deals'].includes(cleaned)) {
                    if (!sellersMap[cleaned]) {
                        sellersMap[cleaned] = { 
                            username: cleaned, totalVolume: 0, itemsCount: 0,
                            topItem: { title: "", imageUrl: "", price: "", url: "", volume: -1 }
                        };
                    }
                    if (itemData.soldCount > sellersMap[cleaned].topItem.volume) {
                        const itemDetails = await page.evaluate(() => {
                            const titleEl = document.querySelector('h1.x-item-title__mainTitle, .x-item-title, h1[class*="title"], [data-testid="x-item-title"]');
                            const priceEl = document.querySelector('.x-price-primary, .x-price-approx, [data-testid="x-price-primary"], .vi-price');
                            const imgEl = document.querySelector('.ux-image-magnify-view__image-container img, .x-picture-wrapper img, #icImg');
                            let textSoldCount = 0;
                            try {
                                const bodyText = document.body.innerText;
                                const soldMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*)\s+sold/i);
                                if (soldMatch) textSoldCount = parseInt(soldMatch[1].replace(/,/g, ''));
                            } catch(e) {}
                            return {
                                title: titleEl ? titleEl.innerText.trim() : (document.title.split('|')[0].trim()),
                                price: priceEl ? priceEl.innerText.trim() : "View Price",
                                imageUrl: imgEl ? (imgEl.src || imgEl.getAttribute('src')) : "",
                                textSoldCount
                            };
                        });
                        const finalVol = Math.max(itemData.soldCount, itemDetails.textSoldCount || 0);
                        sellersMap[cleaned].topItem = { title: itemDetails.title, price: itemDetails.price, imageUrl: itemDetails.imageUrl, url: url, volume: finalVol };
                        sellersMap[cleaned].totalVolume += finalVol;
                    } else {
                        sellersMap[cleaned].totalVolume += itemData.soldCount;
                    }
                    sellersMap[cleaned].itemsCount++;
                }
            }
        } catch (e) {}
    }

    const finalSellers = Object.values(sellersMap).sort((a, b) => b.totalVolume - a.totalVolume).map(s => ({
        username: s.username, discoveryVolume: s.totalVolume.toLocaleString(), topItem: s.topItem
    }));

    const trendingProducts = Object.values(sellersMap).map(s => s.topItem).filter(p => p.title !== "").sort((a, b) => b.volume - a.volume);

    await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }

    return NextResponse.json({ sellers: finalSellers, products: trendingProducts });

  } catch (error) {
    if (browser) await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
