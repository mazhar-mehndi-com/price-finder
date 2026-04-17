const fs = require('fs');
const cheerio = require('cheerio');

try {
  const html = fs.readFileSync('debug_page_1.html', 'utf8');
  const $ = cheerio.load(html);

  const priceEls = $('span, div').filter((i, el) => {
    const text = $(el).text();
    return text.includes('$') && text.length < 20;
  });

  console.log('Total potential price elements:', priceEls.length);
  
  const parents = {};
  priceEls.each((i, el) => {
    const parentClass = $(el).parent().attr('class');
    if (parentClass) {
      parents[parentClass] = (parents[parentClass] || 0) + 1;
    }
    const gpClass = $(el).parent().parent().attr('class');
    if (gpClass) {
      parents[gpClass] = (parents[gpClass] || 0) + 1;
    }
  });

  console.log('Common parent classes for prices:');
  const sorted = Object.entries(parents).sort((a, b) => b[1] - a[1]);
  console.log(sorted.slice(0, 10));

  // Find something that looks like an item card
  const cards = $('div, li').filter((i, el) => {
     return $(el).find('img').length > 0 && $(el).text().includes('$');
  });
  console.log('Potential cards count:', cards.length);
  
  if (cards.length > 0) {
    const classCount = {};
    cards.each((i, el) => {
       const cls = $(el).attr('class');
       if (cls) {
          classCount[cls] = (classCount[cls] || 0) + 1;
       }
    });
    console.log('Most frequent card classes:');
    console.log(Object.entries(classCount).sort((a,b)=>b[1]-a[1]).slice(0, 5));
  }
} catch (e) {
  console.error(e);
}
