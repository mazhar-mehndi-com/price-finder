const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { config, validateConfig } = require('./utils/session');
const fs = require('fs');
const path = require('path');

const { analyzeListings } = require('./ai_processor');

// Use stealth plugin to avoid basic bot detection
puppeteer.use(StealthPlugin());

async function runScraper() {
  try {
    const validatedConfig = validateConfig();
    console.log('--- eBay Active Listings Scraper ---');
    console.log(`Using Chrome at: ${validatedConfig.chromeExecutablePath}`);
    console.log(`Using Profile: ${validatedConfig.profileName} from ${validatedConfig.userDataDir}`);

    const browser = await puppeteer.launch({
      executablePath: validatedConfig.chromeExecutablePath,
      userDataDir: validatedConfig.userDataDir,
      headless: false, // Run in non-headless mode to see what's happening and handle login if needed
      args: [
        `--profile-directory=${validatedConfig.profileName}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: null, // Full page width
    });

    const page = await browser.newPage();

    console.log(`Navigating to: ${validatedConfig.activeListingsUrl}`);
    await page.goto(validatedConfig.activeListingsUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Check if we are on a login page
    const currentUrl = page.url();
    if (currentUrl.includes('ebay.com/signin')) {
      console.log('--- ACTION REQUIRED ---');
      console.log('It looks like you are not logged in. Please log in manually in the browser window.');
      console.log('The script will wait for you to reach the Active Listings page...');
      
      // Wait for the URL to change back to active listings
      await page.waitForFunction(
        (url) => window.location.href.includes(url),
        { timeout: 300000 }, // 5 minutes to log in
        'ebay.com/sh/lst/active'
      );
      console.log('Login detected. Continuing...');
    }

    console.log('Waiting for active listings table to load...');
    // Common selector for the Seller Hub grid table
    await page.waitForSelector('.sh-grid__table, .sh-list-item-card', { timeout: 30000 });

    console.log('Extracting listings data...');
    const listings = await page.evaluate(() => {
      // This part depends on the actual DOM structure of eBay Seller Hub
      // We will try several selectors to increase robustness
      const rows = document.querySelectorAll('.sh-grid__row, .sh-list-item-card');
      const results = [];

      rows.forEach(row => {
        try {
          const titleEl = row.querySelector('.sh-grid__cell-value--title, .item-title, a[href*="/itm/"]');
          const priceEl = row.querySelector('.sh-grid__cell-value--price, .item-price, .sh-grid__cell-value--totalPrice');
          const qtyEl = row.querySelector('.sh-grid__cell-value--qty, .item-qty');
          const itemIdEl = row.querySelector('.sh-grid__cell-value--itemId, .item-id');
          
          if (titleEl) {
            results.push({
              title: titleEl.innerText.trim(),
              price: priceEl ? priceEl.innerText.trim() : 'N/A',
              quantity: qtyEl ? qtyEl.innerText.trim() : 'N/A',
              itemId: itemIdEl ? itemIdEl.innerText.trim() : (titleEl.href ? titleEl.href.split('/').pop() : 'N/A'),
              url: titleEl.href || 'N/A'
            });
          }
        } catch (err) {
          // Skip rows that fail to parse
        }
      });
      return results;
    });

    console.log(`Successfully extracted ${listings.length} listings.`);

    // Save data
    const outputDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `active_listings_${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(listings, null, 2));
    console.log(`Data saved to: ${outputPath}`);

    // AI Analysis
    await analyzeListings(outputPath);
    
    // Optional: Prompt if user wants to close or keep open
    console.log('Scraping complete. The browser will stay open for 10 seconds.');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  }
}

runScraper();
