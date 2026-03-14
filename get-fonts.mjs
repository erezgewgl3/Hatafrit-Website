import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/erezg/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');

const browser = await puppeteer.launch({
  executablePath: 'C:/Users/erezg/.cache/puppeteer/chrome/win64-146.0.7680.76/chrome-win64/chrome.exe',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto('https://www.hatafrit.co.il', { waitUntil: 'networkidle2', timeout: 30000 });

const fontInfo = await page.evaluate(() => {
  const els = document.querySelectorAll('h1, h2, p, a, span');
  const seen = new Set();
  const result = [];
  els.forEach(el => {
    const cs = window.getComputedStyle(el);
    const f = cs.fontFamily;
    if (!seen.has(f) && f) {
      seen.add(f);
      result.push({tag: el.tagName, text: (el.innerText || '').substring(0, 30), font: f, size: cs.fontSize});
    }
  });
  return result.slice(0, 20);
});
console.log(JSON.stringify(fontInfo, null, 2));

// Get logo images
const logoInfo = await page.evaluate(() => {
  const imgs = document.querySelectorAll('img');
  return Array.from(imgs).map(img => ({alt: img.alt, src: img.src.substring(0,100)})).slice(0,10);
});
console.log('Images:', JSON.stringify(logoInfo, null, 2));

await browser.close();
