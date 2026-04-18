import { NextResponse } from 'next/server';
const { fetchDeepMarketInsights } = require('../../../src/utils/scrapers');

export async function POST(request) {
  try {
    const { title } = await request.json();
    
    if (!title) return NextResponse.json({ error: 'Missing product title' }, { status: 400 });

    console.log(`[Market Research API] Analyzing: ${title}`);
    
    const insights = await fetchDeepMarketInsights(title);

    return NextResponse.json(insights, { status: 200 });

  } catch (error) {
    console.error('[Market Research API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
