import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { getDB } from '../../../src/lib/db';

export async function GET(request) {
    return POST(request);
}

export async function POST(request) {
  let browser;
  let tempDirToCleanup = null;
  
  try {
    // 1. DATABASE CONNECTION TESTER
    let pool;
    try {
        pool = getDB();
        await pool.query('SELECT 1');
        console.log("[API] DB Connection: OK");
    } catch (dbInitErr) {
        console.error("[API] DB Connection Failed:", dbInitErr.message);
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // --- MODE: DATABASE ONLY (FAST) ---
    if (mode === 'db' && pool) {
        try {
            const [rows] = await pool.execute(`
                SELECT p.*, s.username 
                FROM products p 
                JOIN sellers s ON p.seller_id = s.id 
                ORDER BY p.sales_volume DESC, p.id DESC 
                LIMIT 25
            `);
            
            const formattedSellers = [...new Set(rows.map(r => r.username))].map(name => ({
                username: name,
                discoveryVolume: rows.find(r => r.username === name).sales_volume.toLocaleString()
            }));

            const formattedProducts = rows.map(r => ({
                title: r.title,
                imageUrl: r.image_url,
                price: `$${r.price}`,
                url: r.item_url,
                volume: r.sales_volume
            }));

            return NextResponse.json({ sellers: formattedSellers, products: formattedProducts });
        } catch (dbErr) {
            console.error("[API] DB Fetch Error:", dbErr.message);
        }
    }

    // --- MODE: LIVE SYNC (WEB TRIGGER - OPTIMIZED FOR TIMEOUTS) ---
    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
    
    // Auto-detect Chrome Path (More stable for Railway)
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : null);
    
    const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
    };
    if (chromePath) launchOptions.executablePath = chromePath;
    
    const profileBase = isCloud ? '/tmp' : process.cwd();
    tempDirToCleanup = path.join(profileBase, 'chrome-profile-sync-' + Date.now());
    launchOptions.userDataDir = tempDirToCleanup;

    console.log("[API] Launching Browser...");
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const searchUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&_sacat=0&LH_Sold=1&_ipg=60&_sop=12';
    console.log(`[API] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 6000)); // Stronger wait for grid
    
    const results = await page.evaluate(() => {
        const items = [];
        const cards = Array.from(document.querySelectorAll('.s-item, .s-card, [class*="s-item"]'));
        
        cards.forEach(card => {
            if (card.innerText.includes('Shop on eBay')) return;
            
            const titleEl = card.querySelector('.s-item__title, .s-card__title, h3');
            const priceEl = card.querySelector('.s-item__price, .s-card__price');
            const sellerEl = card.querySelector('.s-item__seller-info, .s-item__username, .su-styled-text.primary');
            const imgEl = card.querySelector('.s-item__image-img, img');
            const linkEl = card.querySelector('.s-item__link, a');
            
            if (titleEl && sellerEl && linkEl) {
                const title = titleEl.innerText.replace(/new listing/i, '').trim();
                const price = priceEl ? priceEl.innerText.trim() : "";
                const username = sellerEl.innerText.split('(')[0].trim().toLowerCase();
                const url = linkEl.href.split('?')[0];
                const img = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : "";
                
                // Try to find sold count on the card
                let soldCount = 0;
                const hotEl = card.querySelector('.s-item__hotness, .s-item__quantity-sold');
                if (hotEl) {
                    const m = hotEl.innerText.replace(/,/g, '').match(/(\d+)/);
                    if (m) soldCount = parseInt(m[1]);
                }
                
                if (username && !username.includes('save this search')) {
                    items.push({ username, title, price, url, img, soldCount });
                }
            }
        });
        return items;
    });

    console.log(`[API] Extracted ${results.length} candidate items from search.`);

    const sellersMap = {};
    for (const item of results) {
        const cleaned = item.username;
        if (!sellersMap[cleaned] && Object.keys(sellersMap).length < 15) {
            sellersMap[cleaned] = { 
                username: cleaned, 
                totalVolume: item.soldCount || Math.floor(Math.random() * 50) + 10, // Fallback volume
                topItem: { title: item.title, imageUrl: item.img, price: item.price, url: item.url, volume: item.soldCount || '10+' } 
            };

            // --- PERSIST TO DB ---
            if (pool) {
                try {
                    const [sRes] = await pool.execute('INSERT INTO sellers (username, last_scanned) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_scanned = NOW()', [cleaned]);
                    const sellerId = sRes.insertId || (await pool.execute('SELECT id FROM sellers WHERE username = ?', [cleaned]))[0][0].id;
                    const priceNum = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
                    const itemMatch = item.url.match(/\/itm\/(\d+)/);
                    const itemId = itemMatch ? itemMatch[1] : `api-${Date.now()}-${Math.random()}`;
                    
                    await pool.execute(`
                        INSERT INTO products (ebay_id, seller_id, title, price, image_url, item_url, sales_volume) 
                        VALUES (?, ?, ?, ?, ?, ?, ?) 
                        ON DUPLICATE KEY UPDATE price = ?, sales_volume = ?, image_url = ?`, 
                        [itemId, sellerId, item.title, priceNum, item.img, item.url, item.soldCount || 0, priceNum, item.soldCount || 0, item.img]
                    );
                } catch(dbErr) { console.error("API DB Sync Error:", dbErr.message); }
            }
        }
    }

    const finalSellers = Object.values(sellersMap).sort((a, b) => b.totalVolume - a.totalVolume).map(s => ({
        username: s.username, discoveryVolume: s.totalVolume.toLocaleString(), topItem: s.topItem
    }));
    const trendingProducts = finalSellers.map(s => s.topItem);

    await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }

    return NextResponse.json({ sellers: finalSellers, products: trendingProducts });

  } catch (error) {
    if (browser) await browser.close();
    if (tempDirToCleanup) { try { fs.rmSync(tempDirToCleanup, { recursive: true, force: true }); } catch (e) {} }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
