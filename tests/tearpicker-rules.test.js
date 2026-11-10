'use strict';
// Guards the artificial tears picker (static/js/tearpicker-rules.js) against
// the site's own advice: preserved tears up to four times a day, otherwise
// preservative-free; no gels or ointment with contact lenses in.
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

test('every kind points at an entry that exists in the medication chart', () => {
  const chart = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'static', 'data', 'eye-drops.json'), 'utf8'));
  const names = new Set(chart.map((d) => d.generic));
  for (const k of Object.keys(T.KINDS)) assert.ok(names.has(T.KINDS[k].chart), T.KINDS[k].chart);
});
