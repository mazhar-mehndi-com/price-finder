import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { getDB } from '../../../src/lib/db';

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

    // --- MODE: LIVE SYNC (SLOW SCRAPE) ---
    const isCloud = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL || !!process.env.VERCEL;
    const chromePath = process.env.CHROME_EXECUTABLE_PATH || (isCloud ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    
    // Create unique temp profile to avoid locking errors
    tempDirToCleanup = path.join(process.cwd(), 'chrome-profile-sync-' + Date.now());

    browser = await puppeteer.launch({
        executablePath: chromePath,
        userDataDir: tempDirToCleanup,
        headless: true, // Always headless for server routes
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 1. Initial Scrape (Trending Grid)
    const searchUrl = 'https://www.ebay.com/sch/i.html?_nkw=best+seller&_sacat=0&LH_Sold=1&_ipg=60&_sop=12';
    console.log(`[API] Scrape Start: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));

    const itemUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
        return [...new Set(links.map(l => l.href.split('?')[0]))].filter(h => h.includes('ebay.com/itm/')).slice(0, 30);
    });

    const sellersMap = {};

    // 2. Item Deep-Dive
    for (const url of itemUrls) {
        if (Object.keys(sellersMap).length >= 20) break;
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));

            const itemData = await page.evaluate(() => {
                const res = { name: null, soldCount: 0, itemId: "", title: "", price: "", img: "" };
                const urlMatch = window.location.href.match(/\/itm\/(\d+)/);
                if (urlMatch) res.itemId = urlMatch[1];

                const sEl = document.querySelector('.x-sellercard-atf__info__about-seller a, [class*="seller-info"] a');
                if (sEl) res.name = sEl.innerText.split('(')[0].trim();

                const soldEl = document.querySelector('.x-quantity-lbt .BOLD, .d-quantity__availability .BOLD');
                if (soldEl) {
                    const m = soldEl.innerText.replace(/,/g, '').match(/(\d+)/);
                    if (m) res.soldCount = parseInt(m[1]);
                }
                
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

                return res;
            });

            if (itemData.name && itemData.itemId && itemData.title) {
                const cleaned = itemData.name.toLowerCase();
                if (!sellersMap[cleaned]) {
                    sellersMap[cleaned] = { 
                        username: cleaned, 
                        totalVolume: itemData.soldCount, 
                        topItem: { title: itemData.title, imageUrl: itemData.img, price: itemData.price, url: url, volume: itemData.soldCount } 
                    };

                    // --- PERSIST TO DB ---
                    if (pool) {
                        try {
                            const [sRes] = await pool.execute('INSERT INTO sellers (username, last_scanned) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_scanned = NOW()', [cleaned]);
                            const sellerId = sRes.insertId || (await pool.execute('SELECT id FROM sellers WHERE username = ?', [cleaned]))[0][0].id;
                            const priceNum = parseFloat(itemData.price.replace(/[^\d.]/g, '')) || 0;
                            await pool.execute(`
                                INSERT INTO products (ebay_id, seller_id, title, price, image_url, item_url, sales_volume) 
                                VALUES (?, ?, ?, ?, ?, ?, ?) 
                                ON DUPLICATE KEY UPDATE price = ?, sales_volume = ?, image_url = ?`, 
                                [itemData.itemId, sellerId, itemData.title, priceNum, itemData.img, url, itemData.soldCount, priceNum, itemData.soldCount, itemData.img]
                            );
                        } catch(dbErr) { console.error("API DB Sync Error:", dbErr.message); }
                    }
                }
            }
        } catch (e) {}
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
