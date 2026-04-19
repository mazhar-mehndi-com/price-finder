# 🏛️ eBay Market Intelligence Architecture (Database-Driven)

## 🚀 Objective
Transition from live-scraping (slow/unreliable) to a **Scheduled Background Engine** that stores data in a MySQL database. This enables instant dashboard loading and historical trend tracking (Price/Sales over time).

---

## 📊 1. Database Schema (MySQL)

### Table: `sellers`
Stores the identity and aggregate performance of discovered power sellers.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Unique ID |
| `username` | VARCHAR(255) | eBay Username (Unique) |
| `feedback_score` | INT | Seller's trust level |
| `total_revenue` | DECIMAL | Simulated or calculated revenue |
| `market_str` | DECIMAL | Aggregated Sell-Through Rate |
| `last_scanned` | TIMESTAMP | When the worker last visited this seller |

### Table: `products`
Stores details of verified "Winning Products."
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Unique ID |
| `ebay_id` | VARCHAR(50) | eBay's internal Item ID |
| `seller_id` | INT (FK) | Reference to `sellers.id` |
| `title` | TEXT | Product Title |
| `price` | DECIMAL | Current active price |
| `image_url` | TEXT | Main product image |
| `item_url` | TEXT | Direct link |
| `trending_score` | INT | Calculated 0-100 score |
| `created_at` | TIMESTAMP | When first discovered |

### Table: `sales_history`
**The "ZIK" Secret Table.** Stores snapshots of sales volume to calculate velocity.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Unique ID |
| `product_id` | INT (FK) | Reference to `products.id` |
| `sold_count` | INT | Total sold at this timestamp |
| `captured_at` | TIMESTAMP | Hourly/Daily snapshot time |

---

## ⚙️ 2. The Background Worker (`worker.js`)

Instead of the user triggering a scrape, a separate process runs on the server:

1.  **Trigger**: Runs every 1 hour (via Cron Job).
2.  **Discovery**: Scans "Best Sellers" and "Daily Deals" (like our current logic).
3.  **Update Loop**: 
    *   If a seller is already in the DB, update their `last_scanned`.
    *   If a product is already in the DB, add a new row to `sales_history` with the current `sold_count`.
4.  **Calculation**: Runs the math for STR and Trending Scores based on the last 24 hours of snapshots.

---

## 🎨 3. Dashboard Impact
*   **Instant Load**: `SELECT * FROM products ORDER BY trending_score DESC` takes ~10ms.
*   **Velocity Indicators**: We can now show "Sold 5 times in the last hour" because we have the previous hour's data in `sales_history`.
*   **No Captcha Errors**: If the worker hits a Captcha, it simply tries again later. The user always sees the most recent data already in the database.

---

## 🛠️ 4. Immediate Next Steps
1.  **Setup MySQL Connection**: Add `mysql2` dependency and `.env` credentials.
2.  **Migration**: Create the tables.
3.  **Refactor API**: Change `/api/discover-sellers` to read from DB instead of launching Puppeteer.
4.  **Create Worker**: Build the standalone script that populates the DB.
