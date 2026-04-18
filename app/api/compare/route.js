import { NextResponse } from 'next/server';
const { 
    scrapeEbay, scrapeAmazon, scrapeAliExpress, 
    scrapeWalmart, scrapeEtsy, scrapeCostco, scrapeTemu,
    scrapeTarget, scrapeBestBuy 
} = require('../../../src/utils/scrapers');

export async function POST(request) {
  try {
    const { title, platform } = await request.json();
    
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    console.log(`[API] Searching ${platform} for: ${title}`);
    
    let items = [];
    let error = null;

    try {
        switch (platform) {
            case 'eBay': items = await scrapeEbay(title); break;
            case 'Amazon': items = await scrapeAmazon(title); break;
            case 'AliExpress': items = await scrapeAliExpress(title); break;
            case 'Walmart': items = await scrapeWalmart(title); break;
            case 'Etsy': items = await scrapeEtsy(title); break;
            case 'Costco': items = await scrapeCostco(title); break;
            case 'Temu': items = await scrapeTemu(title); break;
            case 'Target': items = await scrapeTarget(title); break;
            case 'Best Buy': items = await scrapeBestBuy(title); break;
            default: error = 'Unknown platform';
        }
    } catch (e) {
        console.error(`[API] ${platform} error:`, e.message);
        error = e.message;
    }

    return NextResponse.json({ 
        platform, 
        items: items || [], 
        error: (!items || items.length === 0) ? (error || 'No items found') : null 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
