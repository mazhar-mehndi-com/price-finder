# 💰 Price Finder → Real-Time Comparison (Next.js)

## 🎯 Goal
Build a Next.js tool that finds the lowest price for any product by searching multiple US retailers in real-time.

## 🚀 Features
* **Multi-Store Search:** Scrapes/APIs eBay, Amazon, AliExpress, Walmart, Etsy, Costco, Temu, Target, and Best Buy.
* **Smart Detection:** Automatically highlights the "Best Deal" across all platforms.
* **Bot Protection:** 
    * Uses a persistent shared Chrome profile to build reputation.
    * Supports rotating proxies via `.env`.
    * Manual CAPTCHA fallback: Opens browser for user to solve if blocked.
* **Responsive Design:** Modern, mobile-friendly grid layout.

## 🛠 Tech Stack
* **Frontend:** Next.js 15 (App Router), Tailwind-like Vanilla CSS.
* **Backend:** Next.js API Routes.
* **Scraping:** Puppeteer Extra + Stealth Plugin.
* **Official API:** eBay Finding API (with fallback to scraper).

## 🔑 Configuration (.env)
```env
# eBay API (Optional but recommended)
EBAY_APP_ID=your_id
EBAY_CERT_ID=your_cert

# Proxy Support (Optional)
PROXY_SERVER=http://your-proxy-domain.com:port
PROXY_USERNAME=user
PROXY_PASSWORD=pass

# Local Chrome Path
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

## ▶️ Usage
1. Go to `/lowest-price`.
2. Enter a product name (e.g., "iPhone 15").
3. Wait for the sequential search to complete.
4. If a store shows "BLOCK DETECTED", a browser window will open—solve the CAPTCHA once and it will remember you.
