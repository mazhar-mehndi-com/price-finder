const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function analyzeListings(listingsPath) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('--- AI WARNING ---');
      console.warn('ANTHROPIC_API_KEY is missing in your .env file. Skipping AI analysis.');
      return;
    }

    const listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
    if (listings.length === 0) {
      console.log('No listings to analyze.');
      return;
    }

    console.log(`--- AI Analyzing ${listings.length} Listings ---`);
    
    // Process in batches if too many
    const batch = listings.slice(0, 5); // Start with top 5 for demo
    const prompt = `I have extracted my active eBay listings. Please analyze these for potential optimizations:
    
${JSON.stringify(batch, null, 2)}

Provide a brief report including:
1. Title optimization (missing keywords, brand names).
2. Pricing assessment (if possible).
3. General presentation tips.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const reportPath = listingsPath.replace('.json', '_ai_report.txt');
    fs.writeFileSync(reportPath, message.content[0].text);
    
    console.log(`AI Report saved to: ${reportPath}`);
    console.log('\n--- AI ANALYSIS PREVIEW ---');
    console.log(message.content[0].text.substring(0, 500) + '...');

  } catch (error) {
    console.error('An error occurred during AI analysis:', error);
  }
}

module.exports = { analyzeListings };
