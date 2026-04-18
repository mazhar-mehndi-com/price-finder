import { NextResponse } from 'next/server';
const { fetchEbayMarketData } = require('../../../src/utils/scrapers');

export async function POST(request) {
  try {
    const { title } = await request.json();
    
    if (!title) return NextResponse.json({ error: 'Missing product title' }, { status: 400 });

    console.log(`[Analytics API] Analyzing market for: ${title}`);
    
    const { activeItems, soldItems } = await fetchEbayMarketData(title);

    if (soldItems.length === 0 && activeItems.length === 0) {
        return NextResponse.json({ error: 'No market data found for this product' }, { status: 404 });
    }

    // Calculate Analytics
    const soldPrices = soldItems.map(i => i.price).filter(p => p > 0);
    const activePrices = activeItems.map(i => i.price).filter(p => p > 0);

    const avgSoldPrice = soldPrices.length > 0 
        ? (soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length) 
        : 0;
    
    const avgActivePrice = activePrices.length > 0 
        ? (activePrices.reduce((a, b) => a + b, 0) / activePrices.length) 
        : 0;

    const minSold = soldPrices.length > 0 ? Math.min(...soldPrices) : 0;
    const maxSold = soldPrices.length > 0 ? Math.max(...soldPrices) : 0;

    // Generate Insight
    let insight = "";
    if (avgSoldPrice > 0 && avgActivePrice > 0) {
        const diff = ((avgActivePrice - avgSoldPrice) / avgSoldPrice) * 100;
        if (diff > 15) {
            insight = `Market Alert: Current listings are ~${Math.round(diff)}% higher than recent sold prices. You might be overpaying.`;
        } else if (diff < -5) {
            insight = `Deal Alert: Current listings are ~${Math.round(Math.abs(diff))}% lower than recent sold prices. This is a great time to buy!`;
        } else {
            insight = "Market Stable: Current asking prices align closely with recent actual sales.";
        }
    } else {
        insight = "Insufficient data to provide a full market comparison.";
    }

    return NextResponse.json({ 
        avgSoldPrice: parseFloat(avgSoldPrice.toFixed(2)), 
        avgActivePrice: parseFloat(avgActivePrice.toFixed(2)),
        minSold: parseFloat(minSold.toFixed(2)),
        maxSold: parseFloat(maxSold.toFixed(2)),
        insight,
        soldItems,
        activeItems
    }, { status: 200 });

  } catch (error) {
    console.error('[Analytics API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
