const axios = require('axios');

async function generateGlobalQuery(userInput) {
    const groqKey = process.env.GROQ_API_KEY;
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3-8b-8192';

    const systemPrompt = `You are an AI assistant designed to generate effective search queries for e-commerce platforms. Your goal is to help users find products by simulating searches with dynamic IP addresses, mimicking a global browsing experience.
    Output ONLY the search query string. No quotes, no extra text.`;

    // 1. Try GROQ (Online/Cloud) first if key exists
    if (groqKey && groqKey !== 'your_groq_api_key_here') {
        console.log(`[AI] Using Groq (Cloud Llama 3.3) to optimize query...`);
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.3
            }, {
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
            });

            const query = response.data.choices[0].message.content.trim().replace(/^"|"$/g, '');
            console.log(`[AI] Groq Optimized Query: "${query}"`);
            return query;
        } catch (error) {
            console.error('[AI] Groq Error:', error.response?.data || error.message);
        }
    }

    // 2. Fallback to OLLAMA (Local)
    console.log(`[AI] Using Ollama (Local) to optimize query...`);
    try {
        const response = await axios.post(`${ollamaHost}/api/generate`, {
            model: process.env.OLLAMA_MODEL || 'llama3',
            prompt: `System: ${systemPrompt}\n\nUser: ${userInput}\n\nQuery:`,
            stream: false
        });

        const query = response.data.response.trim().replace(/^"|"$/g, '');
        console.log(`[AI] Ollama Optimized Query: "${query}"`);
        return query;
    } catch (error) {
        return userInput; // Final fallback to original input
    }
}

module.exports = { generateGlobalQuery };
