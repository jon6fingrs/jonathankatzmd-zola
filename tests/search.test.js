// Ranking for the site search (static/js/search.js). Run: node --test 'tests/**/*.test.js'
const test = require('node:test');
const assert = require('node:assert');
const S = require('../static/js/search.js');

const index = S.prepare([
  { t: 'SLT Laser', d: 'An office laser that lowers eye pressure.', s: 'Glaucoma', u: '/learn/slt-laser/', b: '<p>Selective laser trabeculoplasty treats the drain.</p><p class="jk-vis__noscript">The animation needs JavaScript.</p>' },
  { t: 'Laser Iridotomy', d: 'A tiny opening in the iris.', s: 'Glaucoma', u: '/learn/laser-iridotomy/', b: '<p>For a narrow angle. Some patients later have SLT.</p>' },
  { t: 'What Is Dry Eye?', d: 'A problem with the tear film.', s: 'Dry Eye', u: '/learn/what-is-dry-eye/', b: '<p>Sjögren&rsquo;s syndrome and screens.</p><img src="x.svg" alt="The tear film between blinks">' },
  { t: 'Flashes and Floaters', d: 'Why floaters appear.', s: 'Retina', u: '/learn/flashes-and-floaters/', b: '<p>A floater is a clump in the gel.</p>' },
  { k: 'drug', t: 'Latanoprost', q: 'Latanoprost', d: 'Xalatan · Prostaglandin Analog · Teal', s: 'Eye Medication Reference', u: '/patients/eye-drops/', b: 'Xalatan Generic' },
  null,
]);

const urls = (q) => S.search(index, q).map((e) => e.u);

test('null entries are skipped', () => assert.strictEqual(index.length, 5));

test('a title match ranks above a body mention', () => {
  assert.deepStrictEqual(urls('slt'), ['/learn/slt-laser/', '/learn/laser-iridotomy/']);
});

test('every word must match somewhere', () => {
  assert.deepStrictEqual(urls('laser iris'), ['/learn/laser-iridotomy/']);
  assert.deepStrictEqual(urls('laser floaters'), []);
});

test('the start of a word matches, so partial typing works', () => {
  assert.deepStrictEqual(urls('float'), ['/learn/flashes-and-floaters/']);
  assert.deepStrictEqual(urls('latano'), ['/patients/eye-drops/']);
});

test('accents and curly apostrophes do not matter', () => {
  assert.deepStrictEqual(urls('sjogren'), ['/learn/what-is-dry-eye/']);
});

test('brand names find the drug', () => {
  assert.deepStrictEqual(urls('xalatan'), ['/patients/eye-drops/']);
});

test('image alt text is searchable; "needs JavaScript" notes are not', () => {
  assert.deepStrictEqual(urls('blinks'), ['/learn/what-is-dry-eye/']);
  assert.deepStrictEqual(urls('javascript'), []);
});

test('empty or one-letter queries return nothing', () => {
  assert.deepStrictEqual(urls(''), []);
  assert.deepStrictEqual(urls('a'), []);
});

test('snippets escape HTML and mark the words found', () => {
  const e = S.prepare([{ t: 'X', d: 'd', s: 's', u: '/x/', b: '<p>Use 1 drop &lt;script&gt; twice daily for glaucoma.</p>' }])[0];
  const out = S.snippet(e, 'glaucoma');
  assert.ok(out.includes('<mark>glaucoma</mark>'));
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(!out.includes('<script>'));
});
