const axios = require('axios');

async function test() {
    try {
        console.log('Testing /api/scrape endpoint on http://localhost:3000...');
        const res = await axios.post('http://localhost:3000/api/scrape', {
            url: 'https://www.ebay.com/itm/366115493606'
        });
        console.log('--- Response Status ---');
        console.log(res.status);
        console.log('--- Item Data ---');
        console.log(JSON.stringify(res.data.items[0], null, 2).substring(0, 1000) + '...');
    } catch (err) {
        console.error('Error testing API:', err.response?.data || err.message);
    }
}

test();
