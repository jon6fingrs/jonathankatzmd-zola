'use strict';
// Guards the eye pressure sink's model (static/js/sink-model.js). The
// expectations are the physiology the owner asked for: no drop or laser
// can take pressure below venous pressure, only a new drain can, and
// stacking treatments gives diminishing returns.
const test = require('node:test');
const assert = require('node:assert');
const M = require('../static/js/sink-model.js');

const P = (...ids) => M.solve(Object.fromEntries(ids.map((i) => [i, true]))).P;
const NON_SURGICAL = ['less', 'cpc', 'side', 'main', 'slt', 'migs'];

test('untreated glaucoma is high, a healthy eye is in the usual range', () => {
  assert.ok(P() > 25 && P() < 32);
  const h = M.solve({}, true).P;
  assert.ok(h > 14 && h < 19);
});

test('every treatment alone lowers pressure', () => {
  for (const id of M.IDS) assert.ok(P(id) < P() - 2, id);
});

test('no combination of drops and lasers goes below venous pressure', () => {
  for (let mask = 0; mask < 1 << NON_SURGICAL.length; mask++) {
    const ids = NON_SURGICAL.filter((_, i) => mask & (1 << i));
    const r = M.solve(Object.fromEntries(ids.map((i) => [i, true])));
    assert.ok(r.P > r.pv, ids.join('+') + ' gave ' + r.P);
    assert.ok(r.P >= M.PV - 1, ids.join('+')); // netarsudil lowers venous pressure by 1
    assert.ok(r.U < r.F, 'side drain cannot carry more than is made');
  }
});

test('turning the faucet down approaches venous pressure but never reaches it', () => {
  assert.ok(P('less', 'cpc') > M.PV + 5);
});

test('only a new drain can take pressure below venous pressure', () => {
  assert.ok(P('trab', 'less', 'cpc', 'side') < M.PV);
  assert.ok(P('trab') > 10 && P('trab') < 16);
  assert.ok(P('tube') > P('trab'));
});

test('diminishing returns: the second treatment of a kind adds less than the first', () => {
  const drop = (first, second) => [P() - P(first), P(first) - P(first, second)];
  for (const [a, b] of [['less', 'cpc'], ['cpc', 'less'], ['slt', 'migs'], ['migs', 'slt'], ['slt', 'main']]) {
    const [d1, d2] = drop(a, b);
    assert.ok(d2 > 0 && d2 < d1, a + ' then ' + b + ': ' + d1 + ', ' + d2);
    assert.ok(d2 < P() - P(b), b + ' adds less after ' + a + ' than alone');
  }
});

test('diminishing returns across kinds: each helps less once another is on', () => {
  for (const [a, b] of [['less', 'side'], ['side', 'less'], ['slt', 'less'], ['side', 'slt'], ['cpc', 'migs']]) {
    assert.ok(P(a) - P(a, b) < P() - P(b), b + ' after ' + a);
  }
});

test('a healthy drain gains nothing from drain treatments', () => {
  assert.strictEqual(M.solve({ slt: true, migs: true }, true).C, M.C_HEALTHY);
});

test('treated drains never beat the best a treated drain can do', () => {
  assert.ok(M.solve({ slt: true, migs: true, main: true }).C < M.C_BEST);
});
