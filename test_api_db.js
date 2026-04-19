const axios = require('axios');

async function testApiDB() {
    console.log("--- 🌐 API DB MODE TEST START ---");
    try {
        const response = await axios.post('http://localhost:3000/api/discover-sellers?mode=db');
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ API Request Failed:", error.response ? error.response.data : error.message);
    }
}

testApiDB();
