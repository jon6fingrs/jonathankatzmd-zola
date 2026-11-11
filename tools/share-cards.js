#!/usr/bin/env node
/* Share cards: the 1200x630 picture a link preview shows (og:image) for every
 * Learn article and topic page. Writes static/images/share/<slug>.png for an
 * article (content/learn/<slug>.md) and topic-<topic>.png for a topic page;
 * templates/base.html points og:image at them, and tests/content.test.js
 * fails if one is missing.
 *
 * Each card shows the page's title and topic beside a picture: the page's
 * first figure, or else a frame of its animation or simulator, taken from the
 * built site. Pages with neither show the logo.
 *
 *   node tools/share-cards.js                     # every page, from the live site
 *   node tools/share-cards.js slt-laser migs      # just these
 *   SITE=https://jon6fingrs.github.io/jonathankatzmd-zola/pr-preview/pr-30 node tools/share-cards.js new-page
 *
 * Needs Playwright (preinstalled in Claude Code cloud sessions). Then shrink
 * the PNGs losslessly, e.g. `oxipng -o4 --strip safe static/images/share/*.png`.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SITE = (process.env.SITE || 'https://jonathankatzmd.com').replace(/\/$/, '');
const OUT = path.join(ROOT, 'static/images/share');

// The picture for each topic page.
const TOPIC_FIGURE = {
  glaucoma: 'images/learn/aqueous-flow.svg',
  cataract: 'images/learn/cataract-lens.svg',
  'dry-eye': 'images/learn/tear-system.svg',
  cornea: 'images/learn/cornea-layers.svg',
  retina: 'images/learn/retina-anatomy.svg',
  simulators: { page: 'vision-loss' },
};

function frontMatter(file) {
  const s = fs.readFileSync(file, 'utf8');
  const fm = s.split(/^\+\+\+$/m)[1] || '';
  const get = (k) => { const m = new RegExp('^' + k + ' = "(.*)"$', 'm').exec(fm); return m ? m[1] : ''; };
  const fig = /\{\{<\s*figure src="([^"]+)"/.exec(s);
  return { title: get('title'), topic: get('topic'), figure: fig ? fig[1] : '' };
}

function jobs() {
  const learn = path.join(ROOT, 'content/learn');
  const topicTitle = {};
  const list = [];
  for (const t of fs.readdirSync(learn)) {
    const idx = path.join(learn, t, '_index.md');
    if (!fs.existsSync(idx)) continue;
    const fm = frontMatter(idx);
    topicTitle[t] = fm.title;
    const pic = TOPIC_FIGURE[t] || '';
    list.push({ slug: 'topic-' + t, title: fm.title, label: 'Learn', figure: typeof pic === 'string' ? pic : '', from: pic.page || '' });
  }
  for (const f of fs.readdirSync(learn)) {
    if (!f.endsWith('.md') || f === '_index.md') continue;
    const fm = frontMatter(path.join(learn, f));
    const slug = f.replace(/\.md$/, '');
    list.push({ slug, title: fm.title, label: fm.topic ? 'Learn · ' + topicTitle[fm.topic] : 'Learn', figure: fm.figure, from: slug });
  }
  return list;
}

// A frame of the page's own animation or simulator, as a PNG data URL.
async function grab(page, slug) {
  await page.goto(SITE + '/learn/' + slug + '/', { waitUntil: 'networkidle' });
  if (await page.locator('#jk-proc').count()) {
    const n = await page.locator('#jk-proc .jk-proc__step').count();
    await page.click('#jk-proc [data-step="' + (n - 1) + '"]');
    await page.waitForTimeout(300);
    return page.locator('#jk-proc .jk-lpi__view svg').first().screenshot({ omitBackground: false });
  }
  if (await page.locator('#jk-sink').count()) {
    await page.click('#jk-sink [data-treat]');
    await page.waitForTimeout(1500);
    return page.locator('#jk-sink .jk-sink__pic svg').first().screenshot();
  }
  if (await page.locator('#jk-lpi, #jk-yag').count()) {
    const fire = page.locator('#jk-lpi-fire, #jk-yag-fire').first();
    await fire.click();
    await page.waitForTimeout(9000);
    return page.locator('.jk-lpi__view svg').first().screenshot();
  }
  if (await page.locator('#jk-vis-stage').count()) {
    await page.waitForTimeout(1500);
    return page.locator('#jk-vis-stage').screenshot();
  }
  return null;
}

function font(name) {
  return 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'static/fonts', name)).toString('base64') + ')';
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function card(job, img) {
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'static/images/logo.png')).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Oswald; font-weight: 400; src: ${font('oswald-latin-400-normal.woff2')}; }
@font-face { font-family: Roboto; font-weight: 400; src: ${font('roboto-latin-400-normal.woff2')}; }
@font-face { font-family: Roboto; font-weight: 500; src: ${font('roboto-latin-500-normal.woff2')}; }
html, body { margin: 0; }
.c { width: 1200px; height: 630px; box-sizing: border-box; display: flex; background: #fff; font-family: Roboto, sans-serif; color: #1f2937; }
.bar { width: 18px; background: linear-gradient(180deg, #f2f4f7, #7d8da6); flex: none; }
.t { flex: 1 1 0; padding: 56px 40px 48px 52px; display: flex; flex-direction: column; min-width: 0; }
.lab { font-size: 24px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: #5b6573; }
h1 { font-family: Oswald, sans-serif; font-weight: 400; font-size: ${job.title.length > 30 ? 62 : 74}px; line-height: 1.08; margin: 22px 0 0; color: #1f2937; }
.by { margin-top: auto; display: flex; align-items: center; gap: 18px; }
.by img { width: 64px; height: 64px; }
.by b { display: block; font-size: 26px; font-weight: 500; }
.by span { font-size: 21px; color: #5b6573; }
.p { flex: none; width: ${img ? 560 : 0}px; background: #f4f6f8; display: ${img ? 'flex' : 'none'}; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
.p img { max-width: 100%; max-height: 100%; object-fit: contain; background: #fff; border-radius: 10px; }
</style></head><body><div class="c"><div class="bar"></div><div class="t">
<div class="lab">${esc(job.label)}</div><h1>${esc(job.title)}</h1>
<div class="by"><img src="${logo}" alt=""><div><b>Jonathan Katz, MD</b><span>Ophthalmologist · Glaucoma Specialist · jonathankatzmd.com</span></div></div>
</div><div class="p">${img ? `<img src="${img}" alt="">` : ''}</div></div></body></html>`;
}

(async () => {
  const only = process.argv.slice(2);
  const list = jobs().filter((j) => !only.length || only.includes(j.slug));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const site = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const out = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const job of list) {
    let img = null;
    if (job.figure) {
      img = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'static', job.figure)).toString('base64');
    } else if (job.from) {
      const png = await grab(site, job.from);
      if (png) img = 'data:image/png;base64,' + png.toString('base64');
    }
    const kind = img ? (job.figure ? 'figure' : 'from the page') : 'logo';
    if (!img) img = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'static/images/logo.png')).toString('base64');
    await out.setContent(card(job, img), { waitUntil: 'load' });
    await out.evaluate(() => document.fonts.ready);
    await out.screenshot({ path: path.join(OUT, job.slug + '.png') });
    console.log(job.slug + '.png', kind);
  }
  await browser.close();
})();
