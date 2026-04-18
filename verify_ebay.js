const { getEbayToken } = require('./src/utils/scrapers');
require('dotenv').config();

async function verifyToken() {
    console.log('Verifying eBay Sandbox Token...');
    const token = await getEbayToken();
    if (token) {
        console.log('✅ Token generated successfully!');
        console.log('Token starts with:', token.substring(0, 20) + '...');
    } else {
        console.log('❌ Failed to generate token. Check your App ID and Cert ID in .env');
    }
}

verifyToken();
