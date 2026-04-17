const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function findSpecs() {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH;
  const userDataDir = process.env.USER_DATA_DIR;
  const profileName = 'BulkScraper';

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: userDataDir,
    headless: true,
    args: [`--profile-directory=${profileName}`, '--no-sandbox']
  });

  const page = await browser.newPage();
  const url = 'https://www.ebay.com/itm/366115493606';
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // 1. Take a screenshot of the whole page to manually verify where specs are
    await page.setViewport({ width: 1280, height: 3000 });
    await page.screenshot({ path: 'specs_full_debug.png' });

    // 2. Find any labels and their next values
    const data = await page.evaluate(() => {
        const results = [];
        // Look for anything that looks like "Label: Value"
        document.querySelectorAll('span, div, td, th').forEach(el => {
            const text = el.innerText.trim();
            if (text.includes('Brand') && text.length < 50) {
                results.push({
                    text,
                    tag: el.tagName,
                    class: el.className,
                    parentClass: el.parentElement?.className
                });
            }
        });
        return results;
    });

    console.log('--- Brand Finder ---');
    console.log(data);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

findSpecs();
