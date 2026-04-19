require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDB() {
    console.log("--- 📊 DATABASE DIAGNOSTIC START ---");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL not found in .env");
        return;
    }

    const connection = await mysql.createConnection({
        uri: connectionString,
        ssl: { rejectUnauthorized: true }
    });

    try {
        const [sellers] = await connection.execute('SELECT COUNT(*) as count FROM sellers');
        console.log(`Sellers Count: ${sellers[0].count}`);

        const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log(`Products Count: ${products[0].count}`);

        if (products[0].count > 0) {
            console.log("\n--- Sample Products in DB ---");
            const [rows] = await connection.execute('SELECT title, sales_volume FROM products LIMIT 5');
            rows.forEach(r => console.log(`- ${r.title} (${r.sales_volume} sold)`));
        }

    } catch (error) {
        console.error("❌ DB Check Failed:", error.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

checkDB();
