require('dotenv').config();
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const path = require('path');

async function runWorker() {
    console.log(`[${new Date().toLocaleString()}] 🚀 Starting Market Intelligence Worker...`);
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing.");
        return;
    }

    const pool = mysql.createPool({
        uri: connectionString,
        ssl: { rejectUnauthorized: true }
    });

    let browser;
    try {
        const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
        const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
        const primaryUserDataDir = process.env.USER_DATA_DIR;

        browser = await puppeteer.launch({
            executablePath: chromePath,
            userDataDir: primaryUserDataDir, // Use profile for verified session
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // --- STEP 1: SCAN FOR TOP ITEMS (Multi-Niche Discovery) ---
        const niches = [
            'trending',
            'best+seller',
            'hot+deals',
            'most+popular',
            'top+rated'
        ];
        
        const randomNiche = niches[Math.floor(Math.random() * niches.length)];
        const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${randomNiche}&_sacat=0&LH_Sold=1&_ipg=60&_sop=12`;
        
        console.log(`[Worker] Scanning Niche [${randomNiche}]: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));

        const itemUrls = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
            return [...new Set(links.map(l => l.href.split('?')[0]))].filter(h => h.includes('ebay.com/itm/')).slice(0, 15);
        });

        console.log(`[Worker] Found ${itemUrls.length} items to analyze.`);

        for (const url of itemUrls) {
            try {
                console.log(`   - Visiting: ${url}`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                // Deep Wait for dynamic images to load
                await new Promise(r => setTimeout(r, 4000));
                
                const data = await page.evaluate(() => {
                    const res = { seller: null, soldCount: 0, title: "", price: "", img: "", itemId: "" };
                    
                    const idM = window.location.href.match(/\/itm\/(\d+)/);
                    if (idM) res.itemId = idM[1];

                    const sEl = document.querySelector('.x-sellercard-atf__info__about-seller a, [class*="seller-info"] a, .seller-persona a');
                    if (sEl) res.seller = sEl.innerText.split('(')[0].trim().toLowerCase();

                    const tEl = document.querySelector('h1.x-item-title__mainTitle, .x-item-title, h1[class*="title"]');
                    res.title = tEl ? tEl.innerText.trim() : document.title.split('|')[0].trim();

                    const pEl = document.querySelector('.x-price-primary, .x-price-approx, .vi-price');
                    res.price = pEl ? pEl.innerText.trim() : "";

                    // AGGRESSIVE IMAGE EXTRACTION
                    const findImg = () => {
                        const selectors = [
                            '.ux-image-magnify-view__image-container img',
                            '.x-picture-wrapper img',
                            '#icImg',
                            '#mainImgHpr',
                            '[data-testid="x-main-image"] img'
                        ];
                        for (const s of selectors) {
                            const el = document.querySelector(s);
                            if (el && el.src && el.src.includes('http')) return el.src;
                        }
                        // Ultimate Fallback: Any large product image
                        const allImgs = Array.from(document.querySelectorAll('img'));
                        const productImg = allImgs.find(img => (img.width > 200 || img.height > 200) && img.src.includes('ebayimg.com'));
                        return productImg ? productImg.src : "";
                    };
                    res.img = findImg();

                    const vEl = document.querySelector('.x-quantity-lbt .BOLD, .d-quantity__availability .BOLD, .vi-qtyS-hot-red');
                    if (vEl) {
                        const m = vEl.innerText.replace(/,/g, '').match(/(\d+)/);
                        if (m) res.soldCount = parseInt(m[1]);
                    }
                    
                    return res;
                });

                if (data.seller && data.itemId && data.title) {
                    console.log(`     ✅ Saving: ${data.seller} | Image: ${data.img ? 'YES' : 'NO'}`);
                    
                    const [sResult] = await pool.execute('INSERT INTO sellers (username, last_scanned) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_scanned = NOW()', [data.seller]);
                    const sellerId = sResult.insertId || (await pool.execute('SELECT id FROM sellers WHERE username = ?', [data.seller]))[0][0].id;

                    const priceNum = parseFloat(data.price.replace(/[^\d.]/g, '')) || 0;
                    const [pResult] = await pool.execute(`
                        INSERT INTO products (ebay_id, seller_id, title, price, image_url, item_url, sales_volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE price = ?, sales_volume = ?, image_url = ?`,
                        [data.itemId, sellerId, data.title, priceNum, data.img, url, data.soldCount, priceNum, data.soldCount, data.img]
                    );
                }

            } catch (e) {
                console.log(`     ⚠️ Skip: ${e.message}`);
            }
        }

        console.log(`[Worker] ✅ Cycle completed.`);

    } catch (err) {
        console.error(`[Worker] ❌ Fatal:`, err.message);
    } finally {
        if (browser) await browser.close();
        await pool.end();
        process.exit();
    }
}

runWorker();
