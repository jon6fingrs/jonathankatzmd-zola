// Run with:  node --test tests/
// Guards the taper logic in static/js/dropform-plan.js (Eye Drop Schedule
// Builder) and the calendar export in static/js/schedule-common.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../static/js/dropform-plan.js');

const PRED = 'Prednisolone Acetate';
const d = s => new Date(s + 'T00:00:00Z');
const TODAY = d('2026-10-16');
const row = (times, eye, stop, generic = PRED) => ({ generic, brand: '', times, eye, stop });

// daily doses per "drug|side" on a date
function dosesOn(segs, day) {
  const out = {};
  for (const s of segs) {
    if (s.start <= day && (!s.end || day <= s.end)) {
      const k = s.entry.generic + '|' + s.side;
      out[k] = (out[k] || 0) + P.dosesPerDay(s.entry.times);
    }
  }
  return out;
}
const segList = segs => segs.map(s => `${s.row}${s.side} ${s.start.toISOString().slice(5, 10)}..${s.end ? s.end.toISOString().slice(5, 10) : 'on'}`);

test('3x -> 2x -> 1x taper steps run one after another', () => {
  const p = P.plan([row(3, 'Right Eye', '2026-10-22'), row(2, 'Right Eye', '2026-10-29'), row(1, 'Right Eye', '2026-11-06')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.deepEqual(segList(p.segs), ['1R 10-16..10-22', '2R 10-23..10-29', '3R 10-30..11-06']);
  assert.deepEqual(dosesOn(p.segs, d('2026-10-16')), { [PRED + '|R']: 3 });
  const per = P.periods(p.segs, TODAY);
  assert.deepEqual(per.map(x => x.start.toISOString().slice(5, 10)), ['10-16', '10-23', '10-30']);
  assert.equal(per[2].end.toISOString().slice(0, 10), '2026-11-06');   // last step ends with the taper
});

test('rows entered out of date order are sorted', () => {
  const p = P.plan([row(2, 'Right Eye', '2026-10-29'), row(4, 'Right Eye', '2026-10-22')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.deepEqual(segList(p.segs), ['2R 10-16..10-22', '1R 10-23..10-29']);
});

test('hourly start: q1h -> q2h -> 4x', () => {
  const p = P.plan([row('q1h', 'Left Eye', '2026-10-18'), row('q2h', 'Left Eye', '2026-10-22'), row(4, 'Left Eye', '2026-10-29')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.deepEqual(dosesOn(p.segs, d('2026-10-16')), { [PRED + '|L']: 15 });
  assert.deepEqual(dosesOn(p.segs, d('2026-10-20')), { [PRED + '|L']: 8 });
  assert.deepEqual(dosesOn(p.segs, d('2026-10-25')), { [PRED + '|L']: 4 });
});

test('both eyes, then right eye continues alone', () => {
  const p = P.plan([row(4, 'Both Eyes', '2026-10-22'), row(2, 'Right Eye', '2026-11-05')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.deepEqual(dosesOn(p.segs, d('2026-10-16')), { [PRED + '|R']: 4, [PRED + '|L']: 4 });
  assert.deepEqual(dosesOn(p.segs, d('2026-10-23')), { [PRED + '|R']: 2 });
});

test('a different taper in each eye', () => {
  const p = P.plan([
    row(4, 'Right Eye', '2026-10-22'), row(2, 'Right Eye', '2026-10-29'),
    row(2, 'Left Eye', '2026-10-25'), row(1, 'Left Eye', '2026-11-01')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.deepEqual(dosesOn(p.segs, d('2026-10-24')), { [PRED + '|R']: 2, [PRED + '|L']: 2 });
  assert.deepEqual(dosesOn(p.segs, d('2026-10-27')), { [PRED + '|R']: 2, [PRED + '|L']: 1 });
  assert.equal(P.periods(p.segs, TODAY).length, 3);   // Oct 16, Oct 23, Oct 26
});

test('taper ending in an ongoing dose', () => {
  const p = P.plan([row(4, 'Left Eye', '2026-10-22'), row(1, 'Left Eye', '')], TODAY);
  assert.deepEqual(segList(p.segs), ['1L 10-16..10-22', '2L 10-23..on']);
  const per = P.periods(p.segs, TODAY);
  assert.equal(per[1].end, null);
});

test('rows that do not read as a taper become a question, and run together if used', () => {
  const cases = [
    [row(4, 'Right Eye', ''), row(2, 'Right Eye', '2026-10-29')],          // forgot step 1 stop date
    [row(4, 'Right Eye', ''), row(2, 'Right Eye', '')],                    // two open-ended
    [row(4, 'Both Eyes', '2026-10-22'), row(2, 'Right Eye', '2026-10-22')], // same stop date
    [row(1, 'Right Eye', '2026-10-22'), row(4, 'Right Eye', '2026-10-29')], // dose goes up
    [row(4, 'Right Eye', '2026-10-22'), row(4, 'Right Eye', '2026-10-29')]  // dose unchanged
  ];
  for (const entries of cases) {
    const p = P.plan(entries, TODAY);
    assert.equal(p.questions.length, 1, JSON.stringify(entries));
    assert.deepEqual(p.questions[0].rows, [1, 2]);
    assert.ok(p.segs.every(s => s.start.getTime() === TODAY.getTime() && !s.taper));
  }
});

test('a "Both Eyes" question is asked once', () => {
  const p = P.plan([row(4, 'Both Eyes', ''), row(2, 'Both Eyes', '')], TODAY);
  assert.equal(p.questions.length, 1);
  assert.equal(p.questions[0].eye, 'Both Eyes');
});

test('same drug in different eyes, or different drugs, are not a taper', () => {
  const p = P.plan([row(4, 'Right Eye', '2026-10-22'), row(2, 'Left Eye', '2026-10-29'), row(2, 'Right Eye', '2026-10-29', 'Ketorolac')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.ok(p.segs.every(s => s.start.getTime() === TODAY.getTime()));
  assert.equal(P.periods(p.segs, TODAY).length, 1);
});

test('past stop dates are reported; reopening mid-taper starts at the current step', () => {
  const entries = [row(3, 'Right Eye', '2026-10-22'), row(2, 'Right Eye', '2026-10-29'), row(1, 'Right Eye', '2026-11-06')];
  assert.deepEqual(P.plan(entries, TODAY).past, []);
  const later = d('2026-10-25');
  const p = P.plan(entries, later);
  assert.deepEqual(p.past, [1]);
  assert.deepEqual(segList(p.segs), ['2R 10-25..10-29', '3R 10-30..11-06']);
  assert.deepEqual(P.periods(p.segs, later).map(x => x.start.toISOString().slice(5, 10)), ['10-25', '10-30']);
});

test('frequency values from the form and URL', () => {
  assert.equal(P.parseFreq('q1h'), 'q1h');
  assert.equal(P.parseFreq('3'), 3);
  assert.equal(P.parseFreq('99'), 8);
  assert.equal(P.parseFreq('junk'), 1);
  assert.equal(P.freqLabel('q2h'), 'Every 2 hours');
  assert.equal(P.freqLabel(2), '2x a day');
  assert.equal(P.dosesPerDay('q1h'), 15);
});

// ---------- calendar export ----------
function loadCommon() {
  const ctx = { window: { location: { search: '' } }, document: { title: '', querySelector: () => null }, history: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js/schedule-common.js'), 'utf8'), ctx);
  return ctx.window.JK;
}

test('calendar: a stop date of tomorrow ends tomorrow; no stop date repeats forever', () => {
  const JK = loadCommon();
  const ics = JK.ics.build([
    { summary: 'a', start: TODAY, end: d('2026-10-17'), time: '09:00' },
    { summary: 'b', start: TODAY, end: null, time: '09:00' },
    { summary: 'c', start: TODAY, end: TODAY, time: '09:00' }
  ], 't');
  const rrules = ics.split('\r\n\r\n').join('').split('BEGIN:VEVENT').slice(1)
    .map(ev => (ev.match(/RRULE:[^\r]*/) || ['none'])[0]);
  assert.deepEqual(rrules, ['RRULE:FREQ=DAILY;UNTIL=20261017T235959', 'RRULE:FREQ=DAILY', 'none']);
});

test('the "use Safari" note shows on every iPhone/iPad browser, nowhere else', () => {
  const UA = {
    safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    duckduckgo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15',
    chrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
    inApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
  };
  const ios = {};
  for (const [k, ua] of Object.entries(UA)) {
    const ctx = { window: { location: { search: '' } }, document: { title: '', querySelector: () => null }, history: {}, navigator: { userAgent: ua, maxTouchPoints: 0 } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js/schedule-common.js'), 'utf8'), ctx);
    ios[k] = ctx.window.JK.ios.isIOS();
  }
  assert.deepEqual(ios, { safari: true, duckduckgo: true, chrome: true, inApp: true, android: false, mac: false });
});

test('a page opened from the copied link (safari=1) skips the note', () => {
  const run = search => {
    const ctx = { window: { location: { search } }, document: { title: '', querySelector: () => null }, history: {}, navigator: { userAgent: 'iPhone', maxTouchPoints: 0 } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js/schedule-common.js'), 'utf8'), ctx);
    return ctx.window.JK.ios.fromCopy();
  };
  assert.equal(run('?r=x&safari=1'), true);
  assert.equal(run('?safari=1'), true);
  assert.equal(run('?r=x'), false);
  assert.equal(run('?r=x&safari=10'), false);
});

test('every other day: last step of a taper, dosed from its first day', () => {
  const p = P.plan([row(2, 'Right Eye', '2026-10-22'), row(1, 'Right Eye', '2026-10-29'), row('qod', 'Right Eye', '2026-11-12')], TODAY);
  assert.deepEqual(p.questions, []);
  assert.deepEqual(segList(p.segs), ['1R 10-16..10-22', '2R 10-23..10-29', '3R 10-30..11-12']);
  const qod = p.segs[2];
  assert.equal(P.firstDoseDay(qod, d('2026-10-16')).toISOString().slice(0, 10), '2026-10-30');
  assert.equal(P.firstDoseDay(qod, d('2026-10-30')).toISOString().slice(0, 10), '2026-10-30');
  assert.equal(P.firstDoseDay(qod, d('2026-10-31')).toISOString().slice(0, 10), '2026-11-01');   // off day -> next dose day
  assert.equal(P.firstDoseDay(qod, d('2026-11-01')).toISOString().slice(0, 10), '2026-11-01');
  assert.equal(P.lastDoseDay(qod).toISOString().slice(0, 10), '2026-11-11');   // Nov 12 is an off day
  assert.equal(P.lastDoseDay(p.segs[1]).toISOString().slice(0, 10), '2026-10-29');   // daily: the stop date
  assert.equal(P.freqLabel('qod'), 'Every other day');
  assert.equal(P.parseFreq('qod'), 'qod');
  assert.equal(P.everyDays('qod'), 2);
  assert.equal(P.everyDays(1), 1);
  assert.equal(P.dosesOnDoseDay('qod'), 1);
  assert.equal(P.fixedTimes('qod'), null);
});

test('every other day ranks below once a day', () => {
  // qod -> 1x is the dose going up: asked, not tapered
  const up = P.plan([row('qod', 'Left Eye', '2026-10-22'), row(1, 'Left Eye', '2026-10-29')], TODAY);
  assert.equal(up.questions.length, 1);
});

test('calendar: every-other-day reminders repeat every 2 days', () => {
  const JK = loadCommon();
  const ics = JK.ics.build([
    { summary: 'a', start: d('2026-10-30'), end: d('2026-11-12'), time: '09:00', interval: 2 },
    { summary: 'b', start: d('2026-10-30'), end: null, time: '09:00', interval: 2 }
  ], 't');
  assert.deepEqual(ics.match(/RRULE:[^\r]*/g), ['RRULE:FREQ=DAILY;INTERVAL=2;UNTIL=20261112T235959', 'RRULE:FREQ=DAILY;INTERVAL=2']);
});

test('once a day: morning and evening', () => {
  assert.equal(P.parseFreq('qam'), 'qam');
  assert.equal(P.parseFreq('qpm'), 'qpm');
  assert.equal(P.parseFreq('1'), 1);   // links made before morning/evening
  assert.equal(P.freqLabel('qam'), '1x a day, morning');
  assert.equal(P.freqLabel('qpm'), '1x a day, evening');
  assert.equal(P.dosesPerDay('qam'), 1);
  assert.deepEqual(P.fixedTimes('qam'), ['09:00']);
  assert.deepEqual(P.fixedTimes('qpm'), ['21:00']);
  // 2x -> 1x evening is a taper; morning -> evening is not
  assert.deepEqual(P.plan([row(2, 'Left Eye', '2026-10-22'), row('qpm', 'Left Eye', '')], TODAY).questions, []);
  assert.equal(P.plan([row('qam', 'Left Eye', '2026-10-22'), row('qpm', 'Left Eye', '')], TODAY).questions.length, 1);
});

test('the default day (8 AM to 10 PM) keeps the usual times', () => {
  const day = P.DAY_DEFAULT;
  assert.deepEqual(P.fitDay(['08:00', '12:00', '16:00', '20:00'], day), ['08:00', '12:00', '16:00', '20:00']);
  assert.deepEqual(P.fixedTimes('q2h', day), ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']);
  assert.equal(P.fixedTimes('q1h', day).length, 15);
  assert.equal(P.dosesPerDay('q1h'), 15);
  assert.equal(P.dosesPerDay('q2h'), 8);
});

test('times move with wake-up and bedtime', () => {
  const early = { wake: 6 * 60, bed: 20 * 60 };   // whole day two hours earlier
  assert.deepEqual(P.fitDay(['09:00', '15:00', '21:00'], early), ['07:00', '13:00', '19:00']);
  assert.deepEqual(P.fixedTimes('q2h', early), ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']);
  // waking an hour earlier moves the morning most and bedtime not at all
  const sevenToTen = { wake: 7 * 60, bed: 22 * 60 };
  assert.deepEqual(P.fitDay(['09:00', '15:00', '21:00'], sevenToTen), ['08:00', '14:30', '21:00']);
  // midnight bedtime: hourly doses stop at 11 PM, others stay on the same day
  const late = { wake: 9 * 60, bed: 24 * 60 };
  assert.equal(P.fixedTimes('q1h', late).slice(-1)[0], '23:00');
  assert.deepEqual(P.fixedTimes('qpm', late), ['23:00']);
});

test('wake-up / bedtime in the link', () => {
  assert.deepEqual(P.parseDay('0630', '2300'), { wake: 390, bed: 1380 });
  assert.deepEqual(P.parseDay('0700', '2400'), { wake: 420, bed: 1440 });
  assert.deepEqual(P.parseDay(undefined, undefined), P.DAY_DEFAULT);
  assert.deepEqual(P.parseDay('2200', '0800'), P.DAY_DEFAULT);   // nonsense -> default
  assert.equal(P.dayParam(390), '0630');
  assert.equal(P.isDefaultDay(P.parseDay('0800', '2200')), true);
});

test('morning is an hour after waking, evening an hour before bed', () => {
  const day = { wake: 6 * 60 + 30, bed: 23 * 60 };
  assert.deepEqual(P.fixedTimes('qam', day), ['07:30']);
  assert.deepEqual(P.fixedTimes('qpm', day), ['22:00']);
  // 8 AM dose of 4x a day never lands before waking
  assert.deepEqual(P.fitDay(['08:00', '12:00', '16:00', '20:00'], day), ['06:30', '11:15', '16:00', '20:45']);
});
