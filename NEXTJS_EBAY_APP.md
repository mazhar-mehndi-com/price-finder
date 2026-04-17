# 🌐 eBay Scraper → Bulk Upload Excel (Next.js App)

## Goal

Build a Next.js web application where:

1. User pastes an eBay search/listing URL
2. Clicks "Scrape"
3. App scrapes listings
4. Converts data into eBay bulk upload format
5. Downloads an Excel (.xlsx) file

---

## 🧱 Tech Stack

* Next.js (App Router)
* React
* Node.js (API routes)
* axios
* cheerio
* xlsx

---

## 📁 Project Structure

/app
/page.js
/api/scrape/route.js

---

## 🌐 Frontend (page.js)

Create a UI with:

* Input field (eBay URL)
* Button: "Scrape Listings"
* Loading state
* Success/error message

### Behavior

* On click:

  * Send POST request to `/api/scrape`
  * Receive Excel file (blob)
  * Trigger download

---

## ⚙️ Backend API (route.js)

### Endpoint

POST /api/scrape

### Request Body

{
"url": "https://www.ebay.com/sch/i.html?_nkw=shoes"
}

---

## 🔍 Scraping Logic

1. Use axios to fetch HTML
2. Use cheerio to parse

Extract:

* Title → `.s-item__title`
* Price → `.s-item__price`
* Image → `.s-item__image-img`
* Link → `.s-item__link`

Skip:

* Empty titles
* "Shop on eBay" / ads

---

## 🔄 Transform Data (eBay Bulk Format)

Map each item to:

{
Action: "Add",
Category: "9355",
Title: cleaned title,
ConditionID: "1000",
Price: numeric price,
Quantity: "10",
Format: "FixedPriceItem",
Description: "High-quality [title]",
PicURL: image URL,
Site: "US",
Currency: "USD"
}

Rules:

* Remove "Sponsored"
* Trim title length
* Handle missing values safely

---

## 📊 Excel Generation

Use xlsx:

* json_to_sheet()
* book_new()
* write()

Return as buffer

---

## 📥 API Response

* Set headers:
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="ebay_bulk_upload.xlsx"

* Send file buffer

---

## 🔁 Frontend Download Logic

Use:

* fetch()
* response.blob()
* createObjectURL()
* auto-download file

---

## 🛡️ Error Handling

* Invalid URL → show message
* No items → return error
* Catch axios errors

---

## 🚀 Bonus

* Add pagination support (_pgn=2,3)
* Add CSV export option
* Add proxy headers (User-Agent)

---

## 📦 Install Dependencies

npm install axios cheerio xlsx

---

## ▶️ Run Project

npm run dev

---

## 📌 Deliverables

Return:

1. Full Next.js code (frontend + API)
2. Working scrape endpoint
3. Excel download functionality
