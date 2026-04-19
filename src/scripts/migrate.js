require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    console.log("--- 🏗️ Starting Database Migration ---");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL not found in .env");
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        uri: connectionString,
        ssl: { rejectUnauthorized: true }
    });

    try {
        // 1. Create Sellers Table
        console.log("Creating 'sellers' table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS sellers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                feedback_score INT DEFAULT 0,
                total_revenue DECIMAL(15, 2) DEFAULT 0,
                market_str DECIMAL(5, 2) DEFAULT 0,
                last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Products Table
        console.log("Creating 'products' table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ebay_id VARCHAR(50) UNIQUE,
                seller_id INT,
                title TEXT NOT NULL,
                price DECIMAL(10, 2) DEFAULT 0,
                image_url TEXT,
                item_url TEXT,
                trending_score INT DEFAULT 0,
                sales_volume INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
            )
        `);

        // 3. Create Sales History Table
        console.log("Creating 'sales_history' table...");
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS sales_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                sold_count INT NOT NULL,
                captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        console.log("--- ✅ Migration Completed Successfully ---");

    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

migrate();
