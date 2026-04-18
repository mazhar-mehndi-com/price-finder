import { NextResponse } from 'next/server';
const { scrapeEbay, scrapeAmazon, scrapeAliExpress } = require('../../../src/utils/scrapers');

export async function POST(request) {
  try {
    const { scrapeEbay, scrapeAmazon, scrapeAliExpress, scrapeWalmart, scrapeEtsy, scrapeCostco, scrapeTemu } = require('../../../src/utils/scrapers');

    console.log(`Starting parallel comparison for: ${title}`);

    const [ebayRes, amazonRes, aliRes, walmartRes, etsyRes, costcoRes, temuRes] = await Promise.all([
        scrapeEbay(title).catch(e => []),
        scrapeAmazon(title).catch(e => []),
        scrapeAliExpress(title).catch(e => []),
        scrapeWalmart(title).catch(e => []),
        scrapeEtsy(title).catch(e => []),
        scrapeCostco(title).catch(e => []),
        scrapeTemu(title).catch(e => [])
    ]);

    const platforms = [
      { name: 'eBay', items: ebayRes, error: ebayRes.length === 0 ? 'No items found' : null },
      { name: 'Amazon', items: amazonRes, error: amazonRes.length === 0 ? 'No items found' : null },
      { name: 'AliExpress', items: aliRes, error: aliRes.length === 0 ? 'No items found' : null },
      { name: 'Walmart', items: walmartRes, error: walmartRes.length === 0 ? 'No items found' : null },
      { name: 'Etsy', items: etsyRes, error: etsyRes.length === 0 ? 'No items found' : null },
      { name: 'Costco', items: costcoRes, error: costcoRes.length === 0 ? 'No items found' : null },
      { name: 'Temu', items: temuRes, error: temuRes.length === 0 ? 'No items found' : null }
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
