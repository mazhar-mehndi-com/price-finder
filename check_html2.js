const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('debug_page_1.html', 'utf8');
const $ = cheerio.load(html);

const items = [];
$('.s-card, .su-card-container').each((i, el) => {
  const title = $(el).find('h3, .s-card__title, .su-card-container__title').text().trim() || $(el).find('a').first().text().trim() || $(el).find('img').attr('alt');
  const price = $(el).find('.su-card-container__attributes__primary, .s-card__attribute-row').text().trim();
  const img = $(el).find('img').attr('src');
  if (title && price && title.length > 0) {
    items.push({ title, price, img });
  }
});

console.log(`Found ${items.length} items.`);
console.log(items.slice(0, 5));
