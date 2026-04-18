const { 
    scrapeEbay, scrapeAmazon, scrapeAliExpress, 
    scrapeWalmart, scrapeEtsy, scrapeCostco, scrapeTemu 
} = require('./src/utils/scrapers');

async function testAll() {
    const platforms = [
        { name: 'eBay', fn: scrapeEbay },
        { name: 'Amazon', fn: scrapeAmazon },
        { name: 'AliExpress', fn: scrapeAliExpress },
        { name: 'Walmart', fn: scrapeWalmart },
        { name: 'Etsy', fn: scrapeEtsy },
        { name: 'Costco', fn: scrapeCostco },
        { name: 'Temu', fn: scrapeTemu }
    ];

    for (const p of platforms) {
        console.log(`\nTesting ${p.name} Scraper...`);
        try {
            const items = await p.fn('iphone 15');
            console.log(`${p.name}: Found ${items.length} items.`);
            if (items.length > 0) console.log(`${p.name} First Item:`, items[0].title, items[0].price);
        } catch (e) {
            console.error(`${p.name} Error:`, e.message);
        }
    }
}

testAll();
