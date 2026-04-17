# 🌐 eBay Product Scraper → Blog Style Viewer (Next.js)

## 🎯 Goal

Build a Next.js app with **2 pages**:

### Page 1 (Blog Listing)

* Input eBay product URL
* Button: "Fetch Product"
* Redirect to detail page

### Page 2 (Blog Post Detail)

* Display scraped product like a blog post:

  * Title
  * Price
  * Images
  * Item specifics
  * Description
* Add "Copy" buttons for each section
* Add "Copy All" button

---

## 🧱 Tech Stack

* Next.js (App Router)
* React
* axios
* cheerio

---

## 📁 Structure

/app
/page.js                → Listing page
/product/page.js        → Detail page
/api/scrape/route.js    → Scraper API

---

## 🧩 Page 1 (Listing Page)

### UI

* Input field (eBay URL)
* Button: "Fetch Product"

### Behavior

* On submit:
  redirect to:
  /product?url=<ENCODED_URL>

---

## 🧩 Page 2 (Product Detail Page)

### Fetch Data

* Read URL param
* Call:
  POST /api/scrape

---

## 📦 Data to Extract (from eBay product page)

Extract:

* Title → #itemTitle or h1
* Price → .x-price-primary
* Images → img tags in gallery
* Description → #desc_div or iframe content
* Item specifics → table under "Item specifics"

---

## 🔍 Scraping Logic (Backend)

Use axios + cheerio:

1. Fetch HTML
2. Load into cheerio
3. Extract:

### Title

$('h1').text()

### Price

$('.x-price-primary').text()

### Images

$('img').map(...)

### Description

$('#desc_div').text()

### Item specifics

Loop table rows:

* key
* value

---

## 📤 API Response Format

{
title: "",
price: "",
images: [],
description: "",
specifics: {
Brand: "",
Type: "",
Condition: ""
}
}

---

## 🧾 UI (Detail Page)

Display like blog:

# Title

Price: $XX

## Images

(show all)

## Description

(full text)

## Item Specifics

* Brand: X
* Type: X

---

## 📋 Copy Features

Add buttons:

### Copy Title

navigator.clipboard.writeText(title)

### Copy Description

navigator.clipboard.writeText(description)

### Copy All

Combine:
title + description + specifics

---

## ⚠️ Important (Description iframe)

eBay often loads description in iframe:

* Try to fetch iframe src separately
* Make second axios request if needed

---

## 🛡️ Headers (IMPORTANT)

Use browser-like headers:

{
"User-Agent": "Mozilla/5.0",
"Accept-Language": "en-US,en;q=0.9"
}

---

## 🚀 Bonus Features

* Show loading spinner
* Show error if blocked
* Clean HTML tags from description
* Limit image duplicates

---

## ▶️ Install

npm install axios cheerio

---

## ▶️ Run

npm run dev

---

## 📦 Deliverables

Return:

1. Full Next.js project code
2. 2 working pages
3. API scraper
4. Copy functionality
