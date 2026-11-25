// Render makiet i manifestu. Wymaga Playwright z Chromium (npm i -D playwright && npx playwright install chromium).
// Użycie:  node render.js makiety   → ../makiety/*.png (2x) z zrodla/makiety/*.html
//          node render.js manifest  → ../CRUX-MANIFEST-1.0.pdf + ../plansze/NN-*.png z zrodla/manifest.html
//          node render.js all
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;                 // zrodla/
const OUT = path.resolve(ROOT, '..');   // manifest/

async function renderMakiety(browser) {
  const dir = path.join(ROOT, 'makiety');
  const outDir = path.join(OUT, 'makiety');
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  for (const f of files) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(dir, f), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const name = f.replace('.html', '');
    const fullPage = true;
    await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage });
    console.log('makieta', name);
    await page.close();
  }
}

async function renderManifest(browser) {
  const html = path.join(ROOT, 'manifest.html');
  const page = await browser.newPage({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2 });
  await page.goto('file://' + html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(OUT, 'CRUX-MANIFEST-1.0.pdf'), width: '297mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
  console.log('pdf');
  await page.emulateMedia({ media: 'screen' });
  const outDir = path.join(OUT, 'plansze');
  fs.mkdirSync(outDir, { recursive: true });
  const n = await page.evaluate(() => document.querySelectorAll('section.plansza').length);
  for (let i = 0; i < n; i++) {
    const el = (await page.$$('section.plansza'))[i];
    const id = await el.getAttribute('id');
    await el.screenshot({ path: path.join(outDir, String(i + 1).padStart(2, '0') + '-' + id + '.png') });
  }
  console.log('plansze', n);
  await page.close();
}

(async () => {
  const what = process.argv[2] || 'all';
  const browser = await chromium.launch();
  if (what === 'makiety' || what === 'all') await renderMakiety(browser);
  if (what === 'manifest' || what === 'all') await renderManifest(browser);
  await browser.close();
})();
