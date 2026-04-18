import { NextResponse } from 'next/server';
const { 
    scrapeEbay, scrapeAmazon, scrapeAliExpress, 
    scrapeWalmart, scrapeEtsy, scrapeCostco, scrapeTemu,
    scrapeTarget, scrapeBestBuy 
} = require('../../../src/utils/scrapers');
const { generateGlobalQuery } = require('../../../src/ai_processor');

export async function POST(request) {
  try {
    const { title, platform } = await request.json();
    
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    // Optimize the search query using AI to mimic global/dynamic IP behavior
    const globalQuery = await generateGlobalQuery(title);

    console.log(`[API] Searching ${platform} for: ${globalQuery}`);
    
    let items = [];
    let error = null;

    try {
        switch (platform) {
            case 'eBay': items = await scrapeEbay(globalQuery); break;
            case 'Amazon': items = await scrapeAmazon(globalQuery); break;
            case 'AliExpress': items = await scrapeAliExpress(globalQuery); break;
            case 'Walmart': items = await scrapeWalmart(globalQuery); break;
            case 'Etsy': items = await scrapeEtsy(globalQuery); break;
            case 'Costco': items = await scrapeCostco(globalQuery); break;
            case 'Temu': items = await scrapeTemu(globalQuery); break;
            case 'Target': items = await scrapeTarget(globalQuery); break;
            case 'Best Buy': items = await scrapeBestBuy(globalQuery); break;
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
