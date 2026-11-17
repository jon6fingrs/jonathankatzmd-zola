'use strict';
// Guards the lens implant picker (static/js/iolpicker-rules.js) against the
// page's own advice (content/learn/lens-implants.md): lenses that split or
// stretch focus need a healthy eye, monovision is tried first, and the light
// adjustable lens follows its labeling.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../static/js/iolpicker-rules.js');

const verdict = (a, id) => T.pick(a).lenses.find((l) => l.id === id).verdict;
const cond = (...ids) => Object.fromEntries(ids.map((i) => [i, true]));
const base = { glasses: 'readers', monovision: 'never', adjust: '', astig: 'unknown', conditions: {} };
const ALL = T.CONDITIONS.flatMap((g) => g.items.map((i) => i[0]));

test('every lens gets one verdict, in one group, with a reason unless it is a clean fit', () => {
  const r = T.pick(base);
  assert.strictEqual(r.groups.reduce((n, g) => n + g.lenses.length, 0), T.LENSES.length);
  for (const l of r.lenses) {
    assert.ok(['good', 'possible', 'avoid'].includes(l.verdict), l.id);
    if (l.verdict !== 'good') assert.ok(l.why.length, l.id + ' needs a reason');
  }
});

test('a monofocal set for distance is never ruled out, whatever the eye', () => {
  for (const glasses of ['readers', 'near', 'computer', 'none']) {
    assert.notStrictEqual(verdict({ ...base, glasses, night: true, conditions: cond(...ALL) }, 'distance'), 'avoid');
  }
});

test('macular disease, moderate glaucoma, corneal disease and keratoconus rule out multifocal and extended depth lenses', () => {
  for (const c of ['amd', 'diabetic', 'erm', 'glaucoma-adv', 'fuchs', 'keratoconus']) {
    const a = { ...base, glasses: 'none', conditions: cond(c) };
    assert.strictEqual(verdict(a, 'multifocal'), 'avoid', c);
    assert.strictEqual(verdict(a, 'edof'), 'avoid', c);
  }
});

test('mild glaucoma rules out a multifocal but leaves extended depth possible', () => {
  const a = { ...base, glasses: 'computer', conditions: cond('glaucoma-mild') };
  assert.strictEqual(verdict(a, 'multifocal'), 'avoid');
  assert.strictEqual(verdict(a, 'edof'), 'possible');
});

test('night driving or a lazy eye rules out a multifocal', () => {
  assert.strictEqual(verdict({ ...base, glasses: 'none', night: true }, 'multifocal'), 'avoid');
  assert.strictEqual(verdict({ ...base, glasses: 'none', conditions: cond('amblyopia') }, 'multifocal'), 'avoid');
});

test('a healthy eye wanting no glasses gets a multifocal as a good fit', () => {
  assert.strictEqual(verdict({ ...base, glasses: 'none' }, 'multifocal'), 'good');
});

test('monovision follows the contact lens trial', () => {
  assert.strictEqual(verdict({ ...base, monovision: 'liked' }, 'monovision'), 'good');
  assert.strictEqual(verdict({ ...base, monovision: 'disliked' }, 'monovision'), 'avoid');
  assert.strictEqual(verdict({ ...base, monovision: 'never' }, 'monovision'), 'possible');
});

test('the light adjustable lens follows its labeling', () => {
  for (const c of ['amd', 'diabetic', 'erm', 'pupil', 'herpes', 'nystagmus', 'photo']) {
    assert.strictEqual(verdict({ ...base, adjust: 'yes', conditions: cond(c) }, 'lal'), 'avoid', c);
  }
  assert.strictEqual(verdict({ ...base, adjust: 'no' }, 'lal'), 'avoid');
  assert.strictEqual(verdict({ ...base, adjust: 'yes', conditions: cond('refractive') }, 'lal'), 'good');
});

test('astigmatism marks toric versions, except the light adjustable lens and ruled-out lenses', () => {
  const r = T.pick({ ...base, astig: 'yes', conditions: cond('amd') });
  for (const l of r.lenses) assert.strictEqual(l.toric, l.id !== 'lal' && l.verdict !== 'avoid', l.id);
});

test('lenses that usually cost extra are marked, and the out-of-pocket note always shows', () => {
  const extra = T.LENSES.filter((l) => l.extra).map((l) => l.id).sort();
  assert.deepStrictEqual(extra, ['edof', 'lal', 'multifocal']);
  assert.match(T.pick(base).notes.join(' '), /out-of-pocket/);
});

test('every lens links to a section that exists on the page', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', 'content', 'learn', 'lens-implants.md'), 'utf8');
  const slug = (h) => h.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/ +/g, '-');
  const ids = new Set([...md.matchAll(/^## (.+)$/gm)].map((m) => slug(m[1])));
  for (const l of T.LENSES) assert.ok(ids.has(l.anchor), l.anchor);
  assert.ok(ids.has('which-lens-might-fit-you'));
});

test('a lens that is usually not advised lists only the reasons against it', () => {
  const l = T.pick({ ...base, glasses: 'none', conditions: cond('glaucoma-mild') }).lenses.find((x) => x.id === 'multifocal');
  assert.strictEqual(l.verdict, 'avoid');
  assert.ok(!l.why.some((w) => /most freedom/.test(w)));
});

test('wanting to read without glasses, with glasses for distance, points to a monofocal set for near', () => {
  const a = { ...base, glasses: 'near' };
  assert.strictEqual(verdict(a, 'near'), 'good');
  assert.strictEqual(verdict(a, 'distance'), 'possible');
  assert.strictEqual(verdict(a, 'multifocal'), 'avoid');
  assert.notStrictEqual(verdict({ ...a, conditions: cond(...ALL) }, 'near'), 'avoid');
});
