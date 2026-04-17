import { NextResponse } from 'next/server';
const { scrapeEbay, scrapeAmazon, scrapeAliExpress } = require('../../../src/utils/scrapers');

export async function POST(request) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Please provide a product title.' }, { status: 400 });
    }

    console.log(`Starting comparison for: ${title}`);

    // Execute scrapers sequentially to avoid resource contention and detection
    console.log("Searching eBay...");
    const ebayResults = await scrapeEbay(title);
    
    console.log("Searching Amazon...");
    const amazonResults = await scrapeAmazon(title);
    
    console.log("Searching AliExpress...");
    const aliExpressResults = await scrapeAliExpress(title);

    const platforms = [
      {
        name: 'eBay',
        items: ebayResults || [],
        error: (!ebayResults || ebayResults.length === 0) ? 'No results found on eBay' : null
      },
      {
        name: 'Amazon',
        items: amazonResults || [],
        error: (!amazonResults || amazonResults.length === 0) ? 'No results found on Amazon' : null
      },
      {
        name: 'AliExpress',
        items: aliExpressResults || [],
        error: (!aliExpressResults || aliExpressResults.length === 0) ? 'No results found on AliExpress' : null
      }
    ];

    // Calculate overall lowest price from all items
    let lowest = null;
    platforms.forEach(p => {
      p.items.forEach(item => {
        if (!lowest || item.price < lowest.price) {
          lowest = {
            platform: p.name,
            price: item.price,
            url: item.url,
            title: item.title,
            image: item.image
          };
        }
      });
    });

    return NextResponse.json({ platforms, lowest }, { status: 200 });

  } catch (error) {
    console.error('Comparison API Error:', error.message);
    return NextResponse.json({ error: 'Failed to compare prices: ' + error.message }, { status: 500 });
  }
}
