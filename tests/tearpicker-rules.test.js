'use strict';
// Guards the artificial tears picker (static/js/tearpicker-rules.js) against
// the site's own advice: preserved tears up to four times a day, otherwise
// preservative-free; no gels or ointment with contact lenses in. Also checks
// the product list (static/data/artificial-tears.json) the picker draws on.
const test = require('node:test');
const assert = require('node:assert');
const T = require('../static/js/tearpicker-rules.js');
const fs = require('fs');
const path = require('path');

const kinds = (a) => T.pick(a).picks.map((p) => p.kind);

test('occasional use with no other factors: a standard bottle', () => {
  assert.deepStrictEqual(kinds({ often: 'low' }), ['preserved']);
});

test('frequent use, contact lenses or sensitive eyes each call for preservative-free', () => {
  for (const a of [{ often: 'high' }, { often: 'low', contacts: true }, { often: 'low', sensitive: true }]) {
    assert.strictEqual(kinds(a)[0], 'pf', JSON.stringify(a));
    assert.ok(!kinds(a).includes('preserved'));
  }
});

test('gel drops are offered when tears wear off, but never with contact lenses', () => {
  assert.ok(kinds({ often: 'low', lasting: true }).includes('gel'));
  assert.ok(!kinds({ often: 'low', lasting: true, contacts: true }).includes('gel'));
});

test('eyes worst on waking get ointment at bedtime', () => {
  assert.ok(kinds({ often: 'low', night: true }).includes('ointment'));
  assert.ok(!kinds({ often: 'low' }).includes('ointment'));
});

test('contact lens wearers are always told not to use gels or ointment with lenses in', () => {
  const notes = T.pick({ contacts: true, night: true, lasting: true }).notes.join(' ');
  assert.match(notes, /not use gels or ointment with lenses in/);
});

const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'static', 'data', 'artificial-tears.json'), 'utf8'));

test('blocked oil glands get tears with oil, preservative-free when needed', () => {
  assert.deepStrictEqual(kinds({ often: 'low', oil: true }), ['oil']);
  const p = T.pick({ often: 'high', oil: true }).picks[0];
  assert.strictEqual(p.kind, 'oil');
  assert.ok(T.products(list, p).every((x) => x.oil && x.pf));
});

test('every product has the fields the picker shows, from a DailyMed label', () => {
  const ids = new Set();
  for (const p of list) {
    assert.ok(!ids.has(p.id), 'duplicate ' + p.id); ids.add(p.id);
    assert.ok(p.name && p.brand, p.id);
    assert.ok(['drop', 'gel', 'ointment'].includes(p.form), p.id);
    assert.ok(['bottle', 'vials', 'tube'].includes(p.pack), p.id);
    assert.strictEqual(typeof p.pf, 'boolean', p.id);
    assert.strictEqual(typeof p.oil, 'boolean', p.id);
    assert.ok(p.pf ? p.preservative === '' : p.preservative.length > 0, p.id + ': a preserved product names its preservative');
    assert.ok(['', 'ok', 'remove'].includes(p.lenses), p.id);
    assert.match(p.setid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, p.id);
    if (p.pack === 'vials') assert.ok(p.pf, p.id + ': single-use vials are preservative-free');
    if (p.photo) assert.ok(fs.existsSync(path.join(__dirname, '..', 'static', 'images', 'drops', p.photo)), p.photo);
  }
});

test('ointments are preservative-free and every card has products', () => {
  assert.ok(list.filter((p) => p.form === 'ointment').every((p) => p.pf));
  const answers = [{ often: 'low' }, { often: 'high' }, { often: 'low', oil: true }, { often: 'high', oil: true },
    { often: 'low', lasting: true }, { often: 'high', lasting: true }, { often: 'low', night: true }];
  for (const a of answers) for (const p of T.pick(a).picks) assert.ok(T.products(list, p, a).length >= 3, JSON.stringify(a) + ' ' + p.kind);
});

test('the examples shown first come from different brands', () => {
  const answers = [{ often: 'low' }, { often: 'high' }, { often: 'low', oil: true }, { often: 'low', lasting: true }, { often: 'low', night: true }];
  for (const a of answers) for (const p of T.pick(a).picks) {
    const first = T.products(list, p, a).slice(0, 4).map((x) => x.brand);
    assert.strictEqual(new Set(first).size, first.length, JSON.stringify(a) + ' ' + p.kind + ': ' + first);
  }
});

test('preservative-free cards never list a preserved product', () => {
  for (const a of [{ often: 'high' }, { contacts: true }, { sensitive: true, lasting: true }, { often: 'high', oil: true }]) {
    for (const p of T.pick(a).picks) assert.ok(T.products(list, p, a).every((x) => x.pf), JSON.stringify(a) + ' ' + p.kind);
  }
});

test('with contact lenses, a drop labeled for use with lenses comes first', () => {
  const a = { often: 'low', contacts: true };
  const first = T.products(list, T.pick(a).picks[0], a)[0];
  assert.strictEqual(first.lenses, 'ok');
});
