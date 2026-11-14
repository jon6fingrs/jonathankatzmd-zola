// Site-wide content checks that need no Zola: run with
//   node --test 'tests/**/*.test.js'
// They catch the slips a site audit found once and should not come back:
// descriptions too long for search results, British spellings, Learn pages
// missing their topic, dates or share card, inline scripts the
// Content-Security-Policy would block, and article text that disagrees with
// the Post-Op Eye Drop Schedule's dosing rules.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const rules = require('../static/js/postop-rules.js');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function walk(dir, ext) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

// Just enough TOML for front matter: top-level keys and the [extra] table.
function frontMatter(p) {
  const fm = read(p).split(/^\+\+\+$/m)[1] || '';
  const top = {}, extra = {};
  let into = top;
  for (const line of fm.split('\n')) {
    if (/^\[extra\]/.test(line)) { into = extra; continue; }
    if (/^\[/.test(line)) { into = {}; continue; }
    const m = /^([a-z_]+)\s*=\s*(.+)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1);
    else if (v === 'true' || v === 'false') v = v === 'true';
    else if (/^\[.*\]$/.test(v)) v = JSON.parse(v);
    into[m[1]] = v;
  }
  return { top, extra };
}

const content = walk('content', '.md');
const learnDir = 'content/learn';
const topics = frontMatter(learnDir + '/_index.md').extra.topics;
const articles = fs.readdirSync(path.join(ROOT, learnDir)).filter((f) => f.endsWith('.md') && f !== '_index.md');

test('page descriptions fit in a search result (160 characters)', () => {
  const long = content.map((p) => [p, frontMatter(p).top.description || '']).filter(([, d]) => d.length > 160);
  assert.deepStrictEqual(long.map(([p, d]) => p + ' (' + d.length + ')'), []);
});

test('American spelling in everything patients read', () => {
  const BRITISH = /\b(labell(ed|ing)|grey(s|ish)?|colour\w*|centre|metres?|centimetres?|millimetres?|mould|recognis(e|ed|es|ing)|anaesthe\w*|anesthetist|behaviour|favour\w*|tumour|oedema|haemorrhage|organis(e|ed|ation)|minimis(e|ed)|travell(ed|ing)|honour\w*)\b/i;
  const files = content.concat(walk('static/print', '.html'), [
    'static/js/procedure.js', 'static/js/procedure-retina.js', 'static/js/procedure-cornea.js', 'static/js/procedure-cataract.js', 'static/js/lpi.js',
    'static/js/yag.js', 'static/js/sink.js', 'static/js/amsler.js', 'static/js/tearpicker-rules.js', 'templates/search.html',
  ]);
  const found = [];
  for (const f of files) {
    read(f).split('\n').forEach((line, i) => {
      const m = BRITISH.exec(line.replace(/aria-labelledby/g, ''));
      if (m) found.push(f + ':' + (i + 1) + ' ' + m[0]);
    });
  }
  assert.deepStrictEqual(found, []);
});

test('every Learn article has its topic, group and dates', () => {
  const bad = [];
  for (const f of articles) {
    const { top, extra } = frontMatter(learnDir + '/' + f);
    if (extra.article !== true) bad.push(f + ': article = true missing');
    if (!('topic' in extra) || !('group' in extra)) { bad.push(f + ': topic and group are both required'); continue; }
    if (extra.topic) {
      if (!topics.includes(extra.topic)) bad.push(f + ': unknown topic ' + extra.topic);
      const groups = frontMatter(learnDir + '/' + extra.topic + '/_index.md').extra.groups;
      if (groups.length ? !groups.includes(extra.group) : extra.group !== '') bad.push(f + ': group "' + extra.group + '" is not one of ' + JSON.stringify(groups));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(top.date || '')) bad.push(f + ': date = YYYY-MM-DD missing');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(top.updated || '')) bad.push(f + ': updated = YYYY-MM-DD missing');
    if (top.updated < top.date) bad.push(f + ': updated is before date');
  }
  assert.deepStrictEqual(bad, []);
});

test('every Learn article and topic has a share card (tools/share-cards.js)', () => {
  const want = articles.map((f) => f.replace(/\.md$/, '.png')).concat(topics.map((t) => 'topic-' + t + '.png'));
  const missing = want.filter((f) => !fs.existsSync(path.join(ROOT, 'static/images/share', f)));
  assert.deepStrictEqual(missing, []);
});

test('no inline scripts or event handlers (the Content-Security-Policy blocks them)', () => {
  const files = walk('templates', '.html').concat(walk('static/print', '.html'), content);
  const bad = [];
  for (const f of files) {
    const s = read(f);
    for (const m of s.matchAll(/<script\b([^>]*)>/g)) {
      if (!/\bsrc=/.test(m[1]) && !/type="application\/(ld\+)?json"/.test(m[1])) bad.push(f + ': inline <script>');
    }
    for (const m of s.matchAll(/<[a-z][^>]*\son[a-z]+=["']/gi)) bad.push(f + ': ' + m[0].slice(0, 40));
    if (/href=["']javascript:/i.test(s)) bad.push(f + ': javascript: link');
  }
  assert.deepStrictEqual(bad, []);
});

test('the post-op tool is called by its own name', () => {
  const title = frontMatter('content/patients/post-op-schedule.md').top.title;
  const bad = [];
  for (const f of content) {
    for (const m of read(f).matchAll(/\[([^\]]+)\]\(@\/patients\/post-op-schedule\.md\)/g)) if (m[1] !== title) bad.push(f + ': [' + m[1] + ']');
  }
  assert.deepStrictEqual(bad, []);
});

// Weekly steroid doses from the rules: [day 0, day 7, day 14, ...] until 0.
function weekly(surgery) {
  const out = [];
  for (let d = 0; ; d += 7) { const n = rules.steroidCount(surgery, 'Prednisolone Acetate', d); if (!n) return out; out.push(n); }
}
const WORDS = { once: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
function numbers(line) { return (line.toLowerCase().match(/\b(once|one|two|three|four|five|six|seven|eight)\b/g) || []).map((w) => WORDS[w]); }

test('the CPC page tapers match the Post-Op Eye Drop Schedule', () => {
  const lines = read('content/learn/cyclophotocoagulation.md').split('\n');
  const micro = lines.find((l) => l.includes('**After micropulse:**'));
  const standard = lines.find((l) => l.includes('**After standard CPC:**'));
  assert.deepStrictEqual(numbers(micro.split('about')[0]), weekly('Micropulse CPC'));
  assert.deepStrictEqual(numbers(standard.split('about')[0]), weekly('Standard CPC'));
});

test('recovery pages agree with the tool on how long drops last', () => {
  const page = (f) => read('content/learn/' + f);
  assert.strictEqual(rules.durationFor('Trabeculectomy'), 12 * 7);
  assert.match(page('trabeculectomy.md'), /eight times a day\) and taper it slowly over about twelve weeks/);
  assert.strictEqual(rules.steroidCount('Trabeculectomy', 'Prednisolone Acetate', 0), 8);
  assert.strictEqual(rules.durationFor('Tube Shunt Surgery'), 6 * 7);
  assert.match(page('tube-shunt-surgery.md'), /tapered over about six weeks, an antibiotic for the first week/);
  assert.strictEqual(rules.durationFor('Cataract Surgery'), 4 * 7);
  assert.match(page('cataract-surgery.md'), /an antibiotic for a week, a steroid tapered over four weeks, and an anti-inflammatory \(NSAID\) for four weeks/);
  assert.strictEqual(rules.durationFor('Pterygium Surgery'), 4 * 7);
  assert.match(page('pterygium.md'), /steroid drop\*\* is used for about a month, tapering down, and \*\*an antibiotic drop\*\* for the first week/);
  for (const s of ['Cataract Surgery', 'Pterygium Surgery', 'Tube Shunt Surgery', 'Trabeculectomy']) {
    assert.strictEqual(rules.antibioticCount(s, 'Moxifloxacin', 6), 4, s + ': antibiotic in week one');
    assert.strictEqual(rules.antibioticCount(s, 'Moxifloxacin', 7), 0, s + ': antibiotic stops after a week');
  }
});

test('every handout points at a Learn page, and that page links back', () => {
  const bad = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'content/handouts')).filter((x) => x.endsWith('.md') && x !== '_index.md')) {
    const { top, extra } = frontMatter('content/handouts/' + f);
    if (top.template !== 'handout.html') bad.push(f + ': template');
    if (!extra.article || !fs.existsSync(path.join(ROOT, 'content', extra.article))) { bad.push(f + ': article missing'); continue; }
    if (frontMatter('content/' + extra.article).extra.handout !== 'handouts/' + f) bad.push(extra.article + ': no handout = "handouts/' + f + '"');
    if (extra.figure && !fs.existsSync(path.join(ROOT, 'static', extra.figure))) bad.push(f + ': figure missing');
    // Two columns written into the file: Safari on iPhone ignores CSS multi-column when printing.
    if ((read('content/handouts/' + f).match(/class="jk-handout__col"/g) || []).length !== 2) bad.push(f + ': needs its two jk-handout__col divs');
  }
  assert.deepStrictEqual(bad, []);
});
