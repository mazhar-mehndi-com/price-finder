const puppeteer = require('puppeteer-core');
require('dotenv').config();

async function checkItemPage(url) {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = process.env.USER_DATA_DIR;
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: userDataDir,
    headless: true,
    args: [
      '--profile-directory=BulkScraper',
      '--no-sandbox', 
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 2000 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  try {
    console.log(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: 'item_page_debug.png' });
    
    // Check for specs in different common eBay selectors
    const info = await page.evaluate(() => {
      const results = {};
      
      // Look for any table-like structures
      const possibleSpecs = [];
      document.querySelectorAll('.ux-layout-section--item-specifics dl, .itemAttr table, .ux-layout-section--item-specifics div').forEach(el => {
          if (el.innerText.length < 500) possibleSpecs.push(el.innerText.substring(0, 100));
      });
      
      const frames = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      
      return {
          title: document.title,
          possibleSpecs,
          frames
      };
    });
    
    console.log('Page Info:', info);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

checkItemPage('https://www.ebay.com/itm/366115493606');
