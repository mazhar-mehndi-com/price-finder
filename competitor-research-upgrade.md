# 📄 Upgrade Competitor Research Page → Trending + Market Intelligence Tool

## 🚀 Objective

Enhance the existing page:

👉 `/competitor-research`

Add **ZIK-style analytics features** without creating a new page.

---

## ⚠️ Strict Rules

* ❌ DO NOT create new page
* ❌ DO NOT modify other tools/pages
* ❌ DO NOT change project structure
* ❌ DO NOT change eBay API config
* ✅ ONLY enhance logic inside competitor-research
* ✅ Keep SAME UI design & layout

---

## 🎯 New Capabilities to Add

### 1. 📊 Sold Listings Analysis (CORE)

Enhance current search to include:

* Sold items (completed listings)
* Active listings (existing)

---

### 2. 📈 Market Intelligence Metrics

For each product:

* Items Sold
* Active Listings
* Average Sold Price
* Average Active Price
* Sell-Through Rate

---

### 📐 Formula

```javascript
sellThroughRate = soldItems / activeItems
```

---

## 🔥 3. Trending Score (ZIK-style)

```javascript
TrendingScore =
  (itemsSold * 0.5) +
  (sellThroughRate * 0.3) +
  (priceConsistency * 0.2)
```

---

### 📊 Price Consistency

```javascript
priceConsistency = 1 - (priceStdDev / avgPrice)
```

---

## 🧠 4. Insight Engine

Generate insights:

```javascript
if (avgActivePrice > avgSoldPrice) {
  insight = "Overpriced compared to market";
} else {
  insight = "Competitive pricing";
}
```

---

## 🏷️ 5. Trend Labels

```javascript
if (score > 80) label = "🔥 Hot";
else if (score > 60) label = "📈 Rising";
else label = "⚖️ Stable";
```

---

## ⚙️ Backend Changes

### Extend existing API:

```bash
/api/competitor
```

---

### Add:

1. Fetch sold listings
2. Merge with active listings
3. Group similar products (by title similarity)
4. Compute metrics
5. Return enhanced data

---

### Response Structure:

```json
{
  "products": [
    {
      "title": "Wireless Earbuds Bluetooth 5.3",
      "avgSoldPrice": 18.5,
      "avgActivePrice": 21.0,
      "sold": 320,
      "active": 120,
      "sellThroughRate": 2.66,
      "score": 87,
      "trend": "🔥 Hot",
      "insight": "Overpriced compared to market"
    }
  ]
}
```

---

## 🎨 Frontend Changes (IMPORTANT)

DO NOT redesign UI.

ONLY:

### Add new columns to existing table:

* Sold Count
* Avg Sold Price
* Sell-Through Rate
* Trend Score
* Trend Label
* Insight

---

### Add small UI elements:

#### Trend Badge:

```text
🔥 Hot
📈 Rising
⚖️ Stable
```

#### Insight Text:

Display under each row OR tooltip

---

## 🔍 Data Grouping Logic

Group listings by:

```javascript
normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "")
```

---

## ⚡ Performance Optimization

* Cache results (5–10 mins)
* Limit API calls
* Debounce search input

---

## 🧪 Expected User Flow

```text
User searches product →
System fetches active + sold listings →
Calculates metrics →
Displays enriched competitor table
```

---

## 🚀 Result

Competitor Research page now becomes:

👉 Competitor + Trending + Market Intelligence Tool

---

## 🏁 Goal

Help users:
👉 See what competitors are doing
👉 Understand real market demand
👉 Identify winning products

---

## 💡 Gemini CLI Usage

```bash
gemini analyze competitor-upgrade.md
gemini generate backend
gemini generate frontend
```

---

## 📌 File Name

```text
competitor-research-upgrade.md
```
