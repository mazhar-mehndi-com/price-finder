require('dotenv').config();
const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

const SCRAPE_INTERVAL = 60 * 60 * 1000; // 1 Hour in milliseconds

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
            userDataDir: (primaryUserDataDir && !isCloud) ? primaryUserDataDir : undefined,
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // --- DISCOVERY LOGIC ---
        const niches = ['trending', 'best+seller', 'hot+deals', 'top+rated'];
        const randomNiche = niches[Math.floor(Math.random() * niches.length)];
        const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${randomNiche}&_sacat=0&LH_Sold=1&_ipg=60&_sop=12`;
        
        console.log(`[Worker] Scanning [${randomNiche}]...`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));

        const itemUrls = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
            return [...new Set(links.map(l => l.href.split('?')[0]))].filter(h => h.includes('ebay.com/itm/')).slice(0, 15);
        });

        console.log(`[Worker] Found ${itemUrls.length} items.`);

        for (const url of itemUrls) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await new Promise(r => setTimeout(r, 3000));
                
                const data = await page.evaluate(() => {
                    const res = { seller: null, soldCount: 0, title: "", price: "", img: "", itemId: "" };
                    const idM = window.location.href.match(/\/itm\/(\d+)/);
                    if (idM) res.itemId = idM[1];

                    const sEl = document.querySelector('.x-sellercard-atf__info__about-seller a, [class*="seller-info"] a');
                    if (sEl) res.seller = sEl.innerText.split('(')[0].trim().toLowerCase();

                    const tEl = document.querySelector('h1.x-item-title__mainTitle, .x-item-title');
                    res.title = tEl ? tEl.innerText.trim() : "";

                    const pEl = document.querySelector('.x-price-primary, .x-price-approx');
                    res.price = pEl ? pEl.innerText.trim() : "";

                    const findImg = () => {
                        const sel = ['.ux-image-magnify-view__image-container img', '.x-picture-wrapper img', '#icImg', '[data-testid="x-main-image"] img'];
                        for (const s of sel) {
                            const el = document.querySelector(s);
                            if (el && el.src && el.src.includes('http')) return el.src;
                        }
                        return "";
                    };
                    res.img = findImg();

                    const vEl = document.querySelector('.x-quantity-lbt .BOLD, .d-quantity__availability .BOLD');
                    if (vEl) {
                        const m = vEl.innerText.replace(/,/g, '').match(/(\d+)/);
                        if (m) res.soldCount = parseInt(m[1]);
                    }
                    return res;
                });

                if (data.seller && data.itemId && data.title) {
                    console.log(`   ✅ Saved: ${data.seller} | Img: ${data.img ? 'Y' : 'N'}`);
                    const [sResult] = await pool.execute('INSERT INTO sellers (username, last_scanned) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_scanned = NOW()', [data.seller]);
                    const sellerId = sResult.insertId || (await pool.execute('SELECT id FROM sellers WHERE username = ?', [data.seller]))[0][0].id;
                    const priceNum = parseFloat(data.price.replace(/[^\d.]/g, '')) || 0;
                    await pool.execute(`
                        INSERT INTO products (ebay_id, seller_id, title, price, image_url, item_url, sales_volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE price = ?, sales_volume = ?, image_url = ?`,
                        [data.itemId, sellerId, data.title, priceNum, data.img, url, data.soldCount, priceNum, data.soldCount, data.img]
                    );
                }
            } catch (e) { console.log(`   ⚠️ Skip: ${e.message}`); }
        }
        console.log(`[Worker] ✅ Cycle completed. Next run in 1 hour.`);

    } catch (err) {
        console.error(`[Worker] ❌ Fatal Error:`, err.message);
    } finally {
        if (browser) await browser.close();
        await pool.end();
    }
}

// Infinite Loop
async function start() {
    while (true) {
        await runWorker();
        await new Promise(resolve => setTimeout(resolve, SCRAPE_INTERVAL));
    }
}

start();
