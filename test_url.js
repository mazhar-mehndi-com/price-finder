const puppeteer = require('puppeteer-core');
const fs = require('fs');
require('dotenv').config();

async function testUrl(url) {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = process.env.USER_DATA_DIR;
  
  console.log(`Testing URL: ${url}`);
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: userDataDir,
    headless: true,
    args: [
      '--profile-directory=BulkScraper',
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: 'test_url_debug.png' });
    
    const info = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      const classes = new Set();
      all.forEach(el => {
          if (el.className && typeof el.className === 'string') {
              el.className.split(' ').forEach(c => classes.add(c));
          }
      });
      return {
          totalElements: all.length,
          classes: Array.from(classes).slice(0, 100),
          sItemFound: !!document.querySelector('.s-item')
      };
    });
    const extraInfo = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      const itemsByText = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('$') && el.innerText.length < 500).length;
      const ulCount = document.querySelectorAll('ul').length;
      const liCount = document.querySelectorAll('li').length;
      
      return {
          iframeCount: iframes.length,
          itemsWithPriceText: itemsByText,
          ulCount,
          liCount
      };
    });
    const itemDiscovery = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
          return el.innerText && el.innerText.includes('$') && el.innerText.length < 500 && (el.className && el.className.includes('item'));
      });
      return candidates.map(el => ({
          tag: el.tagName,
          className: el.className,
          text: el.innerText.substring(0, 50).replace(/\n/g, ' ')
      }));
    });
    console.log('Item Discovery:', itemDiscovery.slice(0, 20));
    
    const count = await page.evaluate(() => {
      const resultsContainer = document.querySelector('ul.srp-results') || document.body;
      const cards = resultsContainer.querySelectorAll('.s-item, li.s-item, .s-item__wrapper, [class*="s-item"], .s-card, .su-card-container');
      return cards.length;
    });
    
    console.log(`Found ${count} potential items on this page.`);
    
    if (count > 0) {
        const sample = await page.evaluate(() => {
            const card = document.querySelector('.s-item, li.s-item, .s-item__wrapper, [class*="s-item"], .s-card, .su-card-container');
            const titleEl = card.querySelector('.s-item__title, [class*="title"], h3, .s-card__title, .su-card-container__title');
            const priceEl = card.querySelector('.s-item__price, [class*="price"], .su-card-container__attributes__primary, .s-card__attribute-row');
            const imgEl = card.querySelector('img');
            
            let title = titleEl ? titleEl.innerText.trim() : "";
            let priceText = priceEl ? priceEl.innerText.trim() : "";
            let priceMatch = priceText.match(/\$([0-9,]+(\.[0-9]{2})?)/);
            let price = priceMatch ? priceMatch[0] : "";
            
            return { title, price, img: imgEl ? imgEl.src : "" };
        });
        console.log('Sample Item:', sample);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

const targetUrl = process.argv[2] || 'https://www.ebay.com/sch/i.html?_nkw=shoes';
testUrl(targetUrl);
