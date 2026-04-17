const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function diagnose() {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH;
  const userDataDir = process.env.USER_DATA_DIR;
  const profileName = 'BulkScraper';

  console.log('--- Diagnosis V2 with Stealth & Profile ---');
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: userDataDir,
    headless: false, // Turn off headless to check if captcha appears
    args: [
        `--profile-directory=${profileName}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  const url = 'https://www.ebay.com/itm/366115493606';
  
  try {
    console.log(`Analyzing: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check for block
    const content = await page.content();
    if (content.includes('Pardon Our Interruption')) {
        console.log('Blocked by Captcha. Please solve it in the browser window.');
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s for manual intervention
    }

    const results = await page.evaluate(() => {
      const specs = {};
      const specElements = document.querySelectorAll('.ux-layout-section--item-specifics .ux-labels-values');
      specElements.forEach(el => {
        const label = el.querySelector('.ux-labels-values__labels')?.innerText.replace(/:/g, '').trim();
        const value = el.querySelector('.ux-labels-values__values')?.innerText.trim();
        if (label && value) specs[label] = value;
      });

      const descFrame = document.querySelector('iframe[src*="desc"]')?.src || '';
      const price = document.querySelector('.x-price-primary')?.innerText.trim();
      const title = document.querySelector('h1')?.innerText.trim();

      return {
        title,
        price,
        specs,
        descFrame
      };
    });

    console.log('--- Results ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

diagnose();
