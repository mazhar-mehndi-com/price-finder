require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

async function debugEbayKeys() {
    const appId = "mazharme-Pricingk-SBX-e7b75c3f4-bf56a12e";
    const certId = "30f400b8-9589-44ca-9bdb-a1a5995d20c9";
    
    console.log('Testing App ID:', appId);
    console.log('Testing Cert ID:', certId);

    const auth = Buffer.from(`${appId}:${certId}`).toString('base64');
    
    try {
        console.log('\n--- Method 1: standard scope ---');
        const res1 = await axios.post('https://api.sandbox.ebay.com/identity/v1/oauth2/token', 
            qs.stringify({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` } }
        );
        console.log('✅ Success with Method 1!');
        return;
    } catch (e) {
        console.log('❌ Method 1 failed:', e.response?.data?.error_description || e.message);
    }

    try {
        console.log('\n--- Method 2: no scope ---');
        const res2 = await axios.post('https://api.sandbox.ebay.com/identity/v1/oauth2/token', 
            qs.stringify({ grant_type: 'client_credentials' }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` } }
        );
        console.log('✅ Success with Method 2!');
        return;
    } catch (e) {
        console.log('❌ Method 2 failed:', e.response?.data?.error_description || e.message);
    }
}

debugEbayKeys();
