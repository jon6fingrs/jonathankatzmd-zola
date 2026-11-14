// Checks on the Eye Medication Reference data (static/data/eye-drops.json),
// which patients read to recognize their drops. Run with
//   node --test 'tests/**/*.test.js'
// These catch typos, not clinical errors: an entry's dose and cap color
// still need checking against the drug's label (DailyMed) when added.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const drops = JSON.parse(fs.readFileSync(path.join(ROOT, 'static/data/eye-drops.json'), 'utf8'));
const css = fs.readFileSync(path.join(ROOT, 'static/css/custom.css'), 'utf8');

// Cap colors are the ones the stylesheet draws a swatch for; the rest are
// container types (templates/eye-drops.html shows those as text).
const CONTAINERS = ['Vial', 'Tube', 'Tablet', 'Capsule', 'Varies'];
const SWATCHES = [...css.matchAll(/\.jk-swatch\[data-color="([^"]+)"\]/g)].map(m => m[1]);

test('every entry has the fields the reference page shows', () => {
  const bad = drops.filter(d => !['generic', 'color', 'use', 'dosage'].every(k => typeof d[k] === 'string' && d[k].trim())
    || typeof d.brand !== 'string' || typeof d.notes !== 'string' || !Array.isArray(d.photos));
  assert.deepEqual(bad.map(d => d.generic), []);
});

test('generic names are unique', () => {
  const seen = new Set(), dup = [];
  for (const d of drops) { if (seen.has(d.generic)) dup.push(d.generic); seen.add(d.generic); }
  assert.deepEqual(dup, []);
});

test('each cap color has a swatch, or is a container type', () => {
  const bad = drops.filter(d => !SWATCHES.includes(d.color) && !CONTAINERS.includes(d.color));
  assert.deepEqual(bad.map(d => `${d.generic}: ${d.color}`), []);
});

test('doses start with a recognizable frequency', () => {
  // "2x/day", "1-3x/day", "~4x/day, up to 6x/day", "Up to 4x/day",
  // "As needed", "At bedtime", "Variable", "preop".
  const ok = /^(~?\d+(?:-\d+)?x\/day|Up to \d+x\/day|As needed|At bedtime|Variable|preop)\b/i;
  const bad = drops.filter(d => !ok.test(d.dosage));
  assert.deepEqual(bad.map(d => `${d.generic}: ${d.dosage}`), []);
});

test('dose ranges run low to high', () => {
  const bad = drops.filter(d => [...d.dosage.matchAll(/(\d+)-(\d+)x\/day/g)].some(m => +m[1] >= +m[2]));
  assert.deepEqual(bad.map(d => `${d.generic}: ${d.dosage}`), []);
});

test('every photo exists', () => {
  const missing = drops.flatMap(d => d.photos.filter(p => !fs.existsSync(path.join(ROOT, 'static/images/drops', p))).map(p => `${d.generic}: ${p}`));
  assert.deepEqual(missing, []);
});
