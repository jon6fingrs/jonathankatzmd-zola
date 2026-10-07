// Run with:  node --test tests/
// Guards the prescription optics in static/js/rx-optics.js, which drive the
// glasses prescription simulator. The expectations are the plain optics a
// patient would be told: a myope reads without glasses, a presbyope needs
// the add up close, and the glasses fix distance.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../static/js/rx-optics.js');

const plano = { sph: 0, cyl: 0, axis: 180, add: 0 };

test('normal eye at 30 is clear at every distance', () => {
  for (const d of ['far', 'mid', 'near']) assert.equal(R.simulate(plano, 30, d, false).snellen, 20, d);
});

test('presbyopia: a 65-year-old with no prescription blurs only up close', () => {
  assert.equal(R.simulate(plano, 65, 'far', false).snellen, 20);
  assert.ok(R.simulate(plano, 65, 'near', false).snellen >= 100);
  // the reading add fixes it
  assert.equal(R.simulate({ ...plano, add: 2.5 }, 65, 'near', true).snellen, 20);
});

test('myopia: blurry far, clear at its far point, glasses fix distance', () => {
  const rx = { sph: -2.5, cyl: 0, axis: 180, add: 0 };
  const far = R.simulate(rx, 60, 'far', false);
  assert.ok(far.snellen >= 150 && far.snellen <= 250, String(far.snellen));
  assert.equal(R.simulate(rx, 60, 'near', false).snellen, 20); // 40 cm is its far point
  assert.equal(R.simulate(rx, 60, 'far', true).snellen, 20);
});

test('hyperopia: a young eye focuses it away, an older one cannot', () => {
  const rx = { sph: 2, cyl: 0, axis: 180, add: 0 };
  assert.equal(R.simulate(rx, 20, 'far', false).snellen, 20);
  assert.ok(R.simulate(rx, 60, 'far', false).snellen >= 100);
});

test('astigmatism blurs along one meridian; plus and minus cylinder agree', () => {
  const minus = R.simulate({ sph: 0, cyl: -2, axis: 90, add: 0 }, 70, 'far', false);
  const plus = R.simulate({ sph: -2, cyl: 2, axis: 180, add: 0 }, 70, 'far', false);
  assert.equal(minus.blur.toFixed(3), plus.blur.toFixed(3));
  assert.ok(Math.abs(minus.e1) < 0.01 && Math.abs(minus.e2) > 1);
});

test('snellen rule of thumb', () => {
  assert.equal(R.snellen(0), 20);
  assert.equal(R.snellen(1), 70);
  assert.equal(R.snellen(2), 150);
  assert.equal(R.snellen(10), 400);
});

test('normalize and URL round trip', () => {
  assert.deepEqual(R.normalize({ sph: '-2.30', cyl: '-0.6', axis: '0', add: '-1' }), { sph: -2.25, cyl: -0.5, axis: 180, add: 0 });
  assert.equal(R.normalize({ axis: 185 }).axis, 5);
  const rx = { sph: -3.75, cyl: -1.25, axis: 15, add: 2 };
  assert.deepEqual(R.decode(R.encode(rx)), rx);
  assert.equal(R.decode('nonsense'), null);
});

test('clear range of a myope', () => {
  const cr = R.clearRange({ sph: -2, cyl: 0, axis: 180, add: 0 }, 70);
  assert.ok(cr.far > 0.5 && cr.far < 0.6, String(cr.far));
});
