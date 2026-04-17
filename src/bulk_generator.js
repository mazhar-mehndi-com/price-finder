const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./utils/session');

// Use stealth plugin to avoid basic bot detection
puppeteer.use(StealthPlugin());

async function scrapeKeywordWithPuppeteer(keyword, pages = 2) {
  const allResults = [];
  const validatedConfig = validateConfig();

  console.log(`--- Starting Stealth Scrape for: "${keyword}" ---`);

  const browser = await puppeteer.launch({
    executablePath: validatedConfig.chromeExecutablePath,
    userDataDir: validatedConfig.userDataDir,
    headless: true, // Headless is fine for search results usually
    args: [
      `--profile-directory=BulkScraper`, // Use a dedicated profile for bulk scraping
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Set a realistic User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  for (let p = 1; p <= pages; p++) {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_pgn=${p}`;
    console.log(`Scraping page ${p}...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.screenshot({ path: `debug_page_${p}.png` });
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      fs.writeFileSync(`debug_page_${p}.html`, html);
      
      // Extract data using Puppeteer
      const listings = await page.evaluate(() => {
        const items = [];
        const resultsContainer = document.querySelector('ul.srp-results');
        if (resultsContainer) {
          console.log(`Results container found with ${resultsContainer.children.length} children`);
          Array.from(resultsContainer.children).forEach((child, index) => {
            const text = child.innerText || '';
            const hasPrice = text.includes('$');
            const links = child.querySelectorAll('a');
            console.log(`Child ${index}: hasPrice=${hasPrice}, links=${links.length}, textPreview=${text.substring(0, 50).replace(/\n/g, ' ')}`);
            
            if (hasPrice && links.length > 0) {
               // Try to extract title and price from this child
               const titleEl = child.querySelector('.s-item__title, [class*="title"], h1, h2, h3, h4');
               const priceEl = child.querySelector('.s-item__price, [class*="price"], .s-item__details');
               
               let title = titleEl ? titleEl.innerText.trim() : "";
               if (!title) {
                 // Fallback: use the first link that has text
                 for (let link of links) {
                   if (link.innerText.trim().length > 10) {
                     title = link.innerText.trim();
                     break;
                   }
                 }
               }

               let price = "";
               if (priceEl) {
                 const priceMatch = priceEl.innerText.match(/\$[0-9,.]+/);
                 if (priceMatch) price = priceMatch[0];
               }
               if (!price) {
                 const priceMatch = child.innerText.match(/\$[0-9,.]+/);
                 if (priceMatch) price = priceMatch[0];
               }

               if (title && price) {
                 items.push({
                   title: title,
                   price: price,
                   picUrl: child.querySelector('img') ? child.querySelector('img').src : ''
                 });
               }
            }
          });
        } else {
          console.log('Results container ul.srp-results NOT found');
          // Fallback to searching all li elements
          const allLis = document.querySelectorAll('li');
          console.log(`Found ${allLis.length} li elements on page`);
        }
        return items;
      });

      allResults.push(...listings);
      console.log(`Found ${listings.length} items on page ${p}.`);

      // Small delay to simulate human behavior
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error scraping page ${p}:`, error.message);
    }
  }

  await browser.close();
  console.log(`Successfully scraped ${allResults.length} total results.`);
  return allResults;
}

function transformData(rawListings) {
  return rawListings.map(item => {
    // 1. Clean Title (Remove "Sponsored", slightly modify)
    let cleanTitle = item.title.replace(/^New listing\s+/i, '').replace(/Sponsored/i, '').trim();
    
    // Slightly modify title (shuffle words for variety)
    const words = cleanTitle.split(' ');
    if (words.length > 3) {
      const first = words.shift();
      cleanTitle = `${words.join(' ')} ${first}`;
    }

    // 2. Parse and Adjust Price (+5%)
    let numericPrice = parseFloat(item.price.replace(/[^\d.]/g, ''));
    if (isNaN(numericPrice)) numericPrice = 0;
    const finalPrice = (numericPrice * 1.05).toFixed(2);

    // 3. Generate Description
    const description = `This is a high-quality ${item.title}. Ideal for everyday use.`;

    return {
      Action: "Add",
      Category: "9355", // Default Electronics
      Title: cleanTitle.substring(0, 80),
      ConditionID: "1000",
      Price: finalPrice,
      Quantity: "10",
      Format: "FixedPriceItem",
      Description: description,
      PicURL: item.picUrl || "",
      Site: "US",
      Currency: "USD"
    };
  });
}

function exportToExcel(transformedData) {
  const ws = xlsx.utils.json_to_sheet(transformedData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "BulkUpload");

  const outputDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filePath = path.join(outputDir, 'ebay_bulk_upload.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log(`\n--- EXPORT COMPLETE ---`);
  console.log(`File saved to: ${filePath}`);
}

async function start(keyword = "iphone") {
  const raw = await scrapeKeywordWithPuppeteer(keyword);
  const transformed = transformData(raw);
  exportToExcel(transformed);
}

const userKeyword = process.argv[2] || "iphone";
start(userKeyword);
