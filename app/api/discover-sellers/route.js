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
                return !text.includes('please verify you are a human') && 
                       !document.title.includes('Pardon Our Interruption') &&
                       !document.body.innerHTML.toLowerCase().includes('captcha-delivery.com');
            }, { timeout: 300000, polling: 2000 });
            await new Promise(r => setTimeout(r, 2000));
            return true;
        } catch (e) { return false; }
    };

    // --- STEP 1: GET PRODUCT LINKS FROM THE "SOLD" PAGE ---
    const searchUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&_sacat=0&_from=R40&rt=nc&LH_Sold=1&_ipg=60&_sop=12';
    console.log(`[Discovery] 1. Getting items from: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (await checkBlocked()) {
        const resolved = await handleCaptcha();
        if (!resolved) throw new Error("Blocked by Captcha");
    }

    const itemUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
        return links.map(l => l.href).filter(h => h.includes('ebay.com/itm/')).slice(0, 15);
    });

    console.log(`[Discovery] Found ${itemUrls.length} items. Visiting pages to find sellers...`);

    const sellers = new Set();

    // --- STEP 2: VISIT ITEMS TO GRAB SELLER NAMES ---
    for (const url of itemUrls.slice(0, 8)) {
        try {
            console.log(`[Discovery] Checking item: ${url.split('?')[0]}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            if (await checkBlocked()) await handleCaptcha();

            const name = await page.evaluate(() => {
                // 1. Target the verified modern "about-seller" link
                const aboutLink = document.querySelector('.x-sellercard-atf__info__about-seller a, [class*="seller-info"] a, [class*="seller-card"] a');
                if (aboutLink && aboutLink.innerText.trim()) {
                    return aboutLink.innerText.split('(')[0].trim();
                }

                // 2. Fallback: Search for any link that eBay marks as SELLER_ITEMS in metadata
                const allLinks = Array.from(document.querySelectorAll('a[data-clientpresentationmetadata]'));
                const sellerLink = allLinks.find(a => a.getAttribute('data-clientpresentationmetadata').includes('SELLER_ITEMS'));
                if (sellerLink && sellerLink.innerText.trim()) {
                    return sellerLink.innerText.split('(')[0].trim();
                }

                // 3. Fallback: Look for the bold span inside the seller card
                const boldSpan = document.querySelector('.x-sellercard-atf__info .ux-textspans--BOLD');
                if (boldSpan) return boldSpan.innerText.trim();

                return null;
            });

            if (name) {
                const cleaned = name.split('(')[0].trim().toLowerCase();
                if (cleaned.length > 2 && !['ebay', 'deals'].includes(cleaned)) {
                    console.log(`[Discovery] ✅ Found Seller: ${cleaned}`);
                    sellers.add(cleaned);
                }
            }
        } catch (e) {
            console.log(`[Discovery] Skip item: ${e.message}`);
        }
        if (sellers.size >= 12) break;
    }

    const finalSellers = Array.from(sellers);
    console.log(`[Discovery] Final Sellers: ${finalSellers.length}`);

    await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }

    return NextResponse.json({ sellers: finalSellers });

  } catch (error) {
    if (browser) await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
