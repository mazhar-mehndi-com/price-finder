const puppeteer = require('puppeteer-core');
const fs = require('fs');
require('dotenv').config();

async function setLocation(url) {
  const chromePath = process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = process.env.USER_DATA_DIR;
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    userDataDir: userDataDir,
    headless: false, // Turn off headless to see the interaction
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if "Shipping to" button exists
    const shipBtn = await page.$('.gh-eb-li-a.gh-icon, .gh-ship-to-link, button.gh-shipto-click-trigger, .sh-picker');
    if (shipBtn) {
        console.log('Found shipping button');
        await shipBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ path: 'location_popup.png' });
        
        // Look for zip code input
        // Often it's in an iframe or a popup
        // Let's try to find it
        const inputSelector = 'input[aria-label="Enter zip code"], .sh-picker__zip-input, #gh-shipto-zip';
        const input = await page.$(inputSelector);
        if (input) {
            await input.click({ clickCount: 3 });
            await input.type('10001');
            await page.keyboard.press('Enter');
            console.log('Entered zip code');
            await new Promise(resolve => setTimeout(resolve, 5000));
            await page.screenshot({ path: 'after_zip.png' });
        } else {
            console.log('Zip input not found in main page, checking buttons...');
            // Maybe we need to click "Change" button first
            const changeBtn = await page.$('button.sh-picker__change-button');
            if (changeBtn) {
                await changeBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await page.type('input[type="text"]', '10001');
                await page.keyboard.press('Enter');
            }
        }
    } else {
        console.log('Shipping button not found with primary selectors. Trying generic approach.');
        // Try clicking the text "Shipping to"
        const textBtn = await page.evaluateHandle(() => {
            const spans = Array.from(document.querySelectorAll('span, button'));
            return spans.find(el => el.innerText.includes('Shipping to'));
        });
        if (textBtn) {
            await textBtn.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.screenshot({ path: 'location_popup_v2.png' });

            // Select Country "United States"
            const countryDropdown = await page.$('.sh-picker__country-list, select, [role="combobox"]');
            if (countryDropdown) {
                await countryDropdown.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Try to find United States in the list
                await page.keyboard.type('United States');
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Enter Zip Code
            const zipInput = await page.$('input[placeholder="Zip code"], .sh-picker__zip-input');
            if (zipInput) {
                await zipInput.type('10001');
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Click Apply
            const applyBtn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => b.innerText.includes('Apply'));
            });
            if (applyBtn) {
                await applyBtn.click();
                console.log('Clicked Apply');
                await new Promise(resolve => setTimeout(resolve, 5000));
                await page.screenshot({ path: 'after_apply.png' });
            }
        }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    // Keep browser open for a bit to see
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

const targetUrl = process.argv[2] || 'https://www.ebay.com/sch/i.html?item=366115493606&rt=nc&_trksid=p4429486.m3561.l161210&_ssn=dyl.a_74';
setLocation(targetUrl);
