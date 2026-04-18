require('dotenv').config();
const { generateGlobalQuery } = require('./src/ai_processor');

async function testAI() {
    console.log('Testing AI Query Optimization with Groq...');
    const input = "I need a cheap but powerful gaming laptop";
    const optimized = await generateGlobalQuery(input);
    console.log('--- Test Result ---');
    console.log('Original:', input);
    console.log('Optimized:', optimized);
    
    if (optimized && optimized !== input) {
        console.log('✅ AI Optimization is working!');
    } else {
        console.log('⚠️ AI returned original query or failed.');
    }
}

testAI();
