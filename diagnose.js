const puppeteer = require('puppeteer-core');
require('dotenv').config();

async function diagnose() {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH;
  const userDataDir = process.env.USER_DATA_DIR;
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: userDataDir,
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const url = 'https://www.ebay.com/itm/366115493606';
  console.log(`Analyzing: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    const results = await page.evaluate(() => {
      // 1. Get Specs
      const specs = {};
      
      // Try multiple common eBay spec selectors
      const rows = document.querySelectorAll('.ux-layout-section--item-specifics .ux-labels-values, .itemAttr table tr, .section dl');
      
      rows.forEach(row => {
          let label = "", value = "";
          
          if (row.classList.contains('ux-labels-values')) {
              label = row.querySelector('.ux-labels-values__labels')?.innerText;
              value = row.querySelector('.ux-labels-values__values')?.innerText;
          } else if (row.tagName === 'TR') {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2) {
                  label = cells[0].innerText;
                  value = cells[1].innerText;
              }
          }
          
          if (label && value) {
              const cleanLabel = label.replace(/:/g, '').trim();
              if (cleanLabel && cleanLabel.length < 50) {
                  specs[cleanLabel] = value.trim();
              }
          }
      });

      // 2. Get Description Frame
      const descFrame = document.querySelector('iframe[src*="desc"]')?.src || '';
      
      // 3. Get Price
      const price = document.querySelector('.x-price-primary')?.innerText.trim();

      // 4. Get Images
      const images = Array.from(document.querySelectorAll('.ux-image-carousel-item img')).map(img => img.src);

      return {
        title: document.title,
        price,
        specs,
        descFrame,
        images: images.slice(0, 5)
      };
    });

    console.log('--- Diagnosis Results ---');
    console.log(JSON.stringify(results, null, 2));

    if (results.descFrame) {
      console.log(`\nNavigating to description frame: ${results.descFrame}`);
      await page.goto(results.descFrame, { waitUntil: 'networkidle2' });
      const descText = await page.evaluate(() => document.body.innerText.trim());
      console.log('Description Preview:', descText.substring(0, 300));
    }

  } catch (err) {
    console.error('Diagnosis error:', err.message);
  } finally {
    await browser.close();
  }
}

diagnose();
