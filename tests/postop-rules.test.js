// Run with:  node --test tests/
// Guards the dosing rules in static/js/postop-rules.js. The expected values
// are the tapers from the original WordPress PHP; if a rule is changed on
// purpose, update the matching expectation here in the same commit.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../static/js/postop-rules.js');

function totals(countFor, duration) {
  const out = [];
  for (let d = 0; d < duration; d++) out.push(countFor(d));
  return out;
}
// compress [4,4,4,3,3] -> "4x3,3x2"
function rle(arr) {
  const parts = [];
  for (const n of arr) {
    const last = parts[parts.length - 1];
    if (last && last[0] === n) last[1]++; else parts.push([n, 1]);
  }
  return parts.map(([n, c]) => `${n}x${c}`).join(',');
}

test('durations per surgery', () => {
  assert.equal(R.durationFor('Cataract Surgery'), 28);
  assert.equal(R.durationFor('Cataract Surgery + MIGS'), 28);
  assert.equal(R.durationFor('Standalone Omni'), 28);
  assert.equal(R.durationFor('Pterygium Surgery'), 28);
  assert.equal(R.durationFor('Micropulse CPC'), 28);
  assert.equal(R.durationFor('Tube Shunt Surgery'), 42);
  assert.equal(R.durationFor('Standard CPC'), 42);
  assert.equal(R.durationFor('Trabeculectomy'), 84);
});

test('prednisolone taper for anterior-segment cases: 4/3/2/1 by week', () => {
  for (const s of ['Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni', 'Pterygium Surgery', 'Micropulse CPC']) {
    const t = totals(d => R.steroidCount(s, 'Prednisolone Acetate', d), 28);
    assert.equal(rle(t), '4x7,3x7,2x7,1x7', s);
    assert.equal(R.steroidCount(s, 'Prednisolone Acetate', 28), 0, s + ' stops at day 28');
  }
});

test('Pred-Moxi-Brom taper: 3x for two weeks then 2x for two weeks', () => {
  for (const s of ['Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni', 'Pterygium Surgery']) {
    const t = totals(d => R.steroidCount(s, 'Pred-Moxi-Brom', d), 28);
    assert.equal(rle(t), '3x14,2x14', s);
  }
});

test('tube shunt and standard CPC: 8/6/4/3/2/1 over six weeks', () => {
  for (const s of ['Tube Shunt Surgery', 'Standard CPC']) {
    const t = totals(d => R.steroidCount(s, 'Prednisolone Acetate', d), 42);
    assert.equal(rle(t), '8x7,6x7,4x7,3x7,2x7,1x7', s);
  }
});

test('trabeculectomy: 8/6/4/3/2/1 in two-week steps over twelve weeks', () => {
  const t = totals(d => R.steroidCount('Trabeculectomy', 'Prednisolone Acetate', d), 84);
  assert.equal(rle(t), '8x14,6x14,4x14,3x14,2x14,1x14');
});

test('antibiotic: four times daily for the first week, only where it applies', () => {
  assert.equal(rle(totals(d => R.antibioticCount('Cataract Surgery', 'Moxifloxacin', d), 28)), '4x7,0x21');
  assert.equal(rle(totals(d => R.antibioticCount('Trabeculectomy', 'Ofloxacin', d), 14)), '4x7,0x7');
  // CPC regimens have no antibiotic column even if one is picked
  assert.equal(R.antibioticCount('Micropulse CPC', 'Moxifloxacin', 0), 0);
  assert.equal(R.antibioticCount('Standard CPC', 'Moxifloxacin', 0), 0);
});

test('NSAIDs: QID vs once daily, cataract cases only, four weeks', () => {
  for (const n of ['Ketorolac', 'Diclofenac', 'Flurbiprofen']) {
    assert.equal(rle(totals(d => R.nsaidCount('Cataract Surgery', n, d), 29)), '4x28,0x1', n);
  }
  for (const n of ['Prolensa', 'Bromfenac']) {
    assert.equal(rle(totals(d => R.nsaidCount('Cataract Surgery + MIGS', n, d), 29)), '1x28,0x1', n);
  }
  assert.equal(R.nsaidCount('Trabeculectomy', 'Ketorolac', 0), 0, 'no NSAID with trab');
  assert.equal(R.nsaidCount('Standalone Omni', 'Ketorolac', 0), 0, 'no NSAID with standalone Omni');
});

test('ointment: nightly for two weeks after tube or trab only', () => {
  assert.equal(rle(totals(d => R.ointmentCount('Tube Shunt Surgery', 'Erythromycin', d), 42)), '1x14,0x28');
  assert.equal(rle(totals(d => R.ointmentCount('Trabeculectomy', 'Maxitrol', d), 84)), '1x14,0x70');
  assert.equal(R.ointmentCount('Cataract Surgery', 'Erythromycin', 0), 0);
});

test('applies(): which fields are live for each surgery', () => {
  const grid = {
    'Cataract Surgery':        { antibiotic: true,  nsaid: true,  ointment: false },
    'Cataract Surgery + MIGS': { antibiotic: true,  nsaid: true,  ointment: false },
    'Standalone Omni':         { antibiotic: true,  nsaid: false, ointment: false },
    'Pterygium Surgery':       { antibiotic: true,  nsaid: false, ointment: false },
    'Tube Shunt Surgery':      { antibiotic: true,  nsaid: false, ointment: true  },
    'Trabeculectomy':          { antibiotic: true,  nsaid: false, ointment: true  },
    'Micropulse CPC':          { antibiotic: false, nsaid: false, ointment: false },
    'Standard CPC':            { antibiotic: false, nsaid: false, ointment: false },
  };
  for (const [s, f] of Object.entries(grid)) {
    assert.equal(R.applies(s, 'steroid'), true, s + ' steroid');
    for (const [field, expected] of Object.entries(f)) assert.equal(R.applies(s, field), expected, s + ' ' + field);
  }
});

test('steroid choices: the combination drop only where it has a taper', () => {
  for (const s of ['Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni', 'Pterygium Surgery']) {
    assert.deepEqual(R.steroidsFor(s), ['Prednisolone Acetate', 'Pred-Moxi-Brom'], s);
  }
  for (const s of ['Tube Shunt Surgery', 'Trabeculectomy', 'Micropulse CPC', 'Standard CPC']) {
    assert.deepEqual(R.steroidsFor(s), ['Prednisolone Acetate'], s);
  }
});

test('schedule(): drops fields that do not apply and never silently includes them', () => {
  const sch = R.schedule({ surgeryType: 'Micropulse CPC', steroid: 'Prednisolone Acetate', antibiotic: 'Moxifloxacin', nsaid: 'Ketorolac', ointment: 'Maxitrol' });
  assert.deepEqual(sch.columns.map(c => c.key), ['steroid']);
  assert.equal(sch.duration, 28);

  const full = R.schedule({ surgeryType: 'Cataract Surgery', steroid: 'Prednisolone Acetate', antibiotic: 'Moxifloxacin', nsaid: 'Prolensa', ointment: '' });
  assert.deepEqual(full.columns.map(c => c.key), ['antibiotic', 'steroid', 'nsaid']);
  assert.equal(full.columns[2].countFor(0), 1);

  // a steroid not offered for this surgery is not scheduled
  const bad = R.schedule({ surgeryType: 'Tube Shunt Surgery', steroid: 'Pred-Moxi-Brom', antibiotic: '', nsaid: '', ointment: '' });
  assert.deepEqual(bad.columns, []);
});
