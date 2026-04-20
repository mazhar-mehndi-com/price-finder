const axios = require('axios');

async function testLocalSystem() {
    console.log("--- 🧪 COMPREHENSIVE LOCAL TEST START ---");
    
    // TEST 1: Instant Fetch (Database Mode)
    console.log("\n1. Testing Instant Fetch (mode=db)...");
    const t1 = Date.now();
    try {
        const dbRes = await axios.get('http://localhost:3000/api/discover-sellers?mode=db');
        const d1 = Date.now() - t1;
        console.log(`   ✅ Success (${d1}ms)`);
        console.log(`   📊 Found: ${dbRes.data.sellers.length} Sellers, ${dbRes.data.products.length} Products`);
    } catch (e) {
        console.log("   ❌ DB Fetch Failed:", e.message);
    }

    // TEST 2: Live Market Sync (Pulling new data)
    console.log("\n2. Testing Market Sync (Pulling fresh data)...");
    console.log("   (This will take ~60 seconds to scan eBay)");
    const t2 = Date.now();
    try {
        const syncRes = await axios.post('http://localhost:3000/api/discover-sellers');
        const d2 = Date.now() - t2;
        console.log(`   ✅ Pull Complete (${Math.round(d2/1000)}s)`);
        console.log(`   ✨ New items pulled and saved to Cloud DB.`);
        
        if (syncRes.data.products.length > 0) {
            console.log(`   📦 Sample Product: ${syncRes.data.products[0].title}`);
            console.log(`   🖼️ Image Captured: ${syncRes.data.products[0].imageUrl ? 'YES' : 'NO'}`);
        }
    } catch (e) {
        console.log("   ❌ Sync Failed:", e.message);
    }

    console.log("\n--- 🏁 TEST COMPLETED ---");
}

testLocalSystem();
