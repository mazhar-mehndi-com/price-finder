const axios = require('axios');

async function testResearch() {
    try {
        console.log('Testing Professional Market Research API for: "iPhone 15"');
        const res = await axios.post('http://localhost:3000/api/market-research', {
            title: 'iPhone 15'
        });
        
        console.log('\n✅ Success! Research Data:');
        console.log(JSON.stringify({
            keyword: res.data.keyword,
            stats: res.data.stats,
            topSellers: res.data.topSellers,
            conditions: res.data.conditions
        }, null, 2));

    } catch (err) {
        console.error('\n❌ API Error:', err.response?.data || err.message);
        if (err.response?.status === 500) {
            console.log('Suggestion: Check server logs for detailed eBay error response.');
        }
    }
}

testResearch();
