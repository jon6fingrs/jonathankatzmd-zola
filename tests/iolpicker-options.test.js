'use strict';
// Practice options in the lens picker's rules (static/js/iolpicker-rules.js):
// lenses a practice does not offer, and surgery without the femtosecond
// laser. This site passes no options; the generic Lens Implant Planner
// (github.com/jon6fingrs/iol-picker) copies the rules and uses them, so these
// tests keep the shared engine working for it.
const test = require('node:test');
const assert = require('node:assert');
const T = require('../static/js/iolpicker-rules.js');

const base = { glasses: 'readers', monovision: 'never', adjust: '', astig: 'unknown', conditions: {} };
const cond = (...ids) => Object.fromEntries(ids.map((i) => [i, true]));
const ids = (r) => r.lenses.map((l) => l.id);
const notes = (r) => r.notes.join(' ');

test('with no options every lens is offered, with the laser', () => {
  assert.deepStrictEqual(T.options(), { lenses: T.LENSES.map((l) => l.id), laser: true });
  assert.deepStrictEqual(ids(T.pick(base)), T.LENSES.map((l) => l.id));
});

test('the monofocal set for distance is always offered, and unknown ids are ignored', () => {
  assert.deepStrictEqual(T.options({ lenses: [] }).lenses, ['distance']);
  assert.deepStrictEqual(T.options({ lenses: ['bogus', 'edof'] }).lenses, ['distance', 'edof']);
});

test('lenses not offered are left out of every group', () => {
  const r = T.pick({ ...base, glasses: 'none' }, { lenses: ['distance', 'near', 'edof'] });
  assert.deepStrictEqual(ids(r), ['distance', 'near', 'edof']);
  assert.strictEqual(r.groups.reduce((n, g) => n + g.lenses.length, 0), 3);
});

test('verdicts of offered lenses do not depend on which others are offered', () => {
  const a = { ...base, glasses: 'computer', night: 'some', astig: 'little', conditions: cond('dryeye') };
  const all = T.pick(a).lenses;
  const some = T.pick(a, { lenses: ['distance', 'edof'] }).lenses;
  for (const l of some) assert.strictEqual(l.verdict, all.find((x) => x.id === l.id).verdict, l.id);
});

test('without the light adjustable lens, the notes never mention it', () => {
  const o = { lenses: ['distance', 'near', 'monovision', 'edof', 'multifocal'] };
  for (const astig of ['little', 'more', 'unknown', 'no']) {
    for (const laser of [true, false]) {
      const n = notes(T.pick({ ...base, glasses: 'none', astig }, { ...o, laser }));
      assert.doesNotMatch(n, /light adjustable/i, astig + ' laser ' + laser);
    }
  }
});

test('without the laser, nothing is laser-assisted, astigmatism goes to a toric lens, and the notes do not mention the laser', () => {
  const o = { laser: false };
  for (const astig of ['little', 'more', 'unknown', 'no']) {
    const r = T.pick({ ...base, glasses: 'none', astig, conditions: cond('fuchs', 'keratoconus') }, o);
    for (const l of r.lenses) {
      assert.strictEqual(l.laser, false, l.id);
      assert.strictEqual(l.laserAstig, false, l.id);
      assert.strictEqual(l.wantsLaser, false, l.id);
    }
    assert.doesNotMatch(notes(r), /laser/i, astig);
  }
  const little = T.pick({ ...base, astig: 'little' }, o).lenses.find((l) => l.id === 'distance');
  assert.strictEqual(little.toric, true);
});

test('without the laser, conditions that only matter to the laser are not asked about', () => {
  const list = (o) => T.conditionsFor(o).flatMap((g) => g.items.map((i) => i[0]));
  assert.ok(list({ laser: false }).includes('pupil'), 'pupil still matters to the light adjustable lens');
  assert.ok(!list({ laser: false }).includes('flat'));
  assert.ok(!list({ laser: false }).includes('bleb'));
  const bare = list({ laser: false, lenses: ['distance', 'edof', 'multifocal'] });
  for (const c of ['pupil', 'herpes', 'nystagmus', 'photo', 'flat', 'bleb']) assert.ok(!bare.includes(c), c);
  assert.ok(bare.includes('amd') && bare.includes('other'));
  assert.deepStrictEqual(list(), T.CONDITIONS.flatMap((g) => g.items.map((i) => i[0])));
});

test('questions about lenses not offered are skipped', () => {
  assert.strictEqual(T.questionApplies('adjust', { lenses: ['distance'] }), false);
  assert.strictEqual(T.questionApplies('adjust', {}), true);
  assert.strictEqual(T.questionApplies('monovision', { lenses: ['distance', 'edof'] }), false);
  assert.strictEqual(T.questionApplies('monovision', { lenses: ['distance', 'lal'] }), true);
  assert.strictEqual(T.questionApplies('glasses', { lenses: [] }), true);
});

test('the out-of-pocket note always shows, and mentions the laser only when offered', () => {
  assert.match(notes(T.pick(base)), /out-of-pocket.*/);
  assert.match(notes(T.pick(base)), /laser-assisted surgery may involve an out-of-pocket/);
  assert.doesNotMatch(notes(T.pick(base, { laser: false })), /laser/i);
});

test('the laser note names only the lenses offered', () => {
  const n = notes(T.pick({ ...base, glasses: 'none' }, { lenses: ['distance', 'multifocal'] }));
  assert.match(n, /Toric and multifocal lenses, and laser treatment of astigmatism, go with laser-assisted surgery/);
});


test('a little astigmatism without the laser: the light adjustable lens is mentioned only when offered', () => {
  const a = { ...base, astig: 'little', conditions: cond('bleb') };
  assert.match(notes(T.pick(a)), /Without the laser.*toric.*The light adjustable lens can also correct it/);
  assert.doesNotMatch(notes(T.pick(a, { lenses: ['distance', 'edof'] })), /light adjustable/i);
});

test('the questions and their defaults live in the rules, and every default is one of the choices', () => {
  assert.deepStrictEqual(T.QUESTIONS.map((q) => q.key).sort(), Object.keys(T.DEFAULTS).sort());
  for (const q of T.QUESTIONS) {
    assert.ok(q.short && q.label && q.values.length >= 2, q.key);
    assert.ok(q.values.some((v) => v[0] === T.DEFAULTS[q.key]), q.key);
  }
});

test('the rules stay free of the DOM, so they can be shared and tested in Node', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'static', 'js', 'iolpicker-rules.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\b(document|window|localStorage|fetch|XMLHttpRequest)\b/);
});
