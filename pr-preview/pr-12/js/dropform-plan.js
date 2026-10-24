/* Eye Drop Schedule Builder: tapers.
 *
 * Turns the form's rows into dated segments. Rows are normally used at the
 * same time, from today until their stop date. When the same medication is
 * listed more than once for the same eye, the rows are read as a taper:
 * sorted by stop date, each step starts the day after the previous one
 * stops. A "Both Eyes" row counts once for each eye, so "both eyes 4x until
 * Oct 22, then right eye 2x until Nov 5" tapers the right eye and stops the
 * left.
 *
 * A group is only treated as a taper if it reads as one: different stop
 * dates, at most one row without a stop date (it comes last), and the dose
 * going down at every step. Anything else is returned as a question for the
 * form ("was this supposed to be a taper?"); if the answer is no, those rows
 * are used at the same time, as they always were.
 *
 * No DOM access, so it runs in the browser (window.JKDropPlan) and under
 * Node for tests/dropform-plan.test.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKDropPlan = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = 86400000;
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }

  // ---------- frequency ----------
  // "How often" is once a day in the morning or the evening, 2-8 times a
  // day, every hour / every 2 hours while awake, or once every other day.
  // An every-other-day step doses on its first day and every second day
  // after that. A bare 1 (links made before morning/evening existed) is
  // still read as once a day.
  var FREQ = {
    qam: { label: '1x a day, morning', times: ['09:00'] },
    qpm: { label: '1x a day, evening', times: ['21:00'] },
    qod: { label: 'Every other day', every: 2 },
    q1h: { label: 'Every hour', step: 60 },
    q2h: { label: 'Every 2 hours', step: 120 }
  };
  // form/URL value -> 1..8 or 'qam'/'qpm'/'q1h'/'q2h'/'qod'
  function parseFreq(v) {
    if (FREQ[v]) return v;
    return Math.min(8, Math.max(1, (+v) | 0 || 1));
  }
  // days between dose days: 2 for every other day, else 1
  function everyDays(times) { return (FREQ[times] && FREQ[times].every) || 1; }
  // average doses a day; orders taper steps (every other day < 1x a day)
  function dosesPerDay(times) {
    var f = FREQ[times];
    if (!f) return +times;
    if (f.every) return 1 / f.every;
    return f.step ? stepTimes(f.step, DAY_DEFAULT).length : f.times.length;
  }
  // doses on a dose day (1 for every other day)
  function dosesOnDoseDay(times) { return FREQ[times] && FREQ[times].every ? 1 : dosesPerDay(times); }
  function freqLabel(times) { return FREQ[times] ? FREQ[times].label : times + 'x a day'; }
  // set times for morning/evening and q1h/q2h on `day`, else null (the
  // caller spreads N doses and fits them with fitDay)
  function fixedTimes(times, day) {
    var f = FREQ[times];
    if (f && f.step) return stepTimes(f.step, day || DAY_DEFAULT);
    return f && f.times ? fitDay(f.times, day) : null;
  }

  // ---------- the patient's day ----------
  // Dose times are written for a day from 8 AM to 10 PM: the morning dose
  // at 9, an hour after waking, and the evening dose at 9 PM, an hour
  // before bed. For another day those two move with wake-up and bedtime
  // and the doses between them are spaced to fit, so moving the wake-up
  // time from 8 to 7 moves the morning dose to 8 and the midday doses a
  // little, but leaves the evening alone.
  // Times are minutes after midnight in `day`; bed can be 1440 (midnight).
  var DAY_DEFAULT = { wake: 8 * 60, bed: 22 * 60 };
  var LAST = 23 * 60 + 45;   // latest dose time on the same calendar day
  function toMin(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function toHHMM(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // base times ("HH:MM", for an 8 AM-10 PM day) moved onto `day`, to the
  // nearest quarter hour, never before waking or after bedtime
  function fitDay(base, day) {
    day = day || DAY_DEFAULT;
    var a = DAY_DEFAULT.wake + 60, b = DAY_DEFAULT.bed - 60;
    var from = day.wake + 60, scale = (day.bed - 60 - from) / (b - a);
    return base.map(function (t) {
      var m = Math.round((from + (toMin(t) - a) * scale) / 15) * 15;
      return toHHMM(Math.max(day.wake, Math.min(day.bed, LAST, m)));
    });
  }
  // every `step` minutes from waking up until bedtime
  function stepTimes(step, day) {
    var out = [];
    for (var m = day.wake; m <= Math.min(day.bed, 23 * 60); m += step) out.push(toHHMM(m));
    return out;
  }
  // "0730" (URL) <-> minutes; null if not a sensible wake-up / bedtime
  function parseDay(w, b) {
    function m(s) { var x = /^(\d{2})(\d{2})$/.exec(s || ''); return x && +x[2] < 60 ? (+x[1]) * 60 + (+x[2]) : null; }
    var wake = m(w), bed = m(b);
    if (wake === null) wake = DAY_DEFAULT.wake;
    if (bed === null) bed = DAY_DEFAULT.bed;
    if (wake < 4 * 60 || wake > 12 * 60 || bed < 18 * 60 || bed > 24 * 60) return { wake: DAY_DEFAULT.wake, bed: DAY_DEFAULT.bed };
    return { wake: wake, bed: bed };
  }
  function dayParam(m) { return pad(Math.floor(m / 60)) + pad(m % 60); }
  function isDefaultDay(day) { return day.wake === DAY_DEFAULT.wake && day.bed === DAY_DEFAULT.bed; }

  // last dose day of a segment with a stop date: the stop date, or for
  // every other day the dose day on or before it
  function lastDoseDay(seg) {
    var every = everyDays(seg.entry.times);
    return addDays(seg.end, -(Math.round((seg.end - seg.start) / DAY) % every));
  }
  // first dose day of segment `seg` on or after `day`
  function firstDoseDay(seg, day) {
    if (day <= seg.start) return seg.start;
    var every = everyDays(seg.entry.times);
    var n = Math.ceil(Math.round((day - seg.start) / DAY) / every) * every;
    return addDays(seg.start, n);
  }

  // ---------- eyes ----------
  var SIDES = { 'Right Eye': ['R'], 'Left Eye': ['L'], 'Both Eyes': ['R', 'L'], 'By mouth': ['M'] };
  var SIDE_NAME = { R: 'Right Eye', L: 'Left Eye', M: 'By mouth' };
  // a set of sides back to the label the patient sees
  function eyeLabel(sides) {
    var has = {};
    sides.forEach(function (s) { has[s] = true; });
    if (has.R && has.L) return 'Both Eyes';
    return SIDE_NAME[sides[0]];
  }

  /*
   * entries: [{ generic, times, eye, stop: "YYYY-MM-DD" | "" , ... }] in row
   *          order (other fields are carried through untouched)
   * today:   Date, UTC midnight
   *
   * Returns {
   *   segs:      [{ row, entry, side, start, end (Date | null = ongoing),
   *                 taper (bool) }]  -- only what is still to come
   *   questions: [{ generic, eye, rows: [1-based row numbers] }]
   *   past:      [1-based rows whose stop date is before today]
   * }
   * Segments that already finished (stop date before today) are left out,
   * so a schedule reopened mid-taper starts at the current step.
   */
  function plan(entries, today) {
    var groups = {}, order = [], past = [];
    entries.forEach(function (e, i) {
      var stop = parseISO(e.stop);
      if (stop && stop < today) past.push(i + 1);
      (SIDES[e.eye] || SIDES['Both Eyes']).forEach(function (side) {
        var k = e.generic + '|' + side;
        if (!groups[k]) { groups[k] = []; order.push(k); }
        groups[k].push({ row: i + 1, entry: e, side: side, stop: stop });
      });
    });

    var segs = [], questions = [], asked = {};
    order.forEach(function (k) {
      var g = groups[k];
      var sorted = g.slice().sort(function (a, b) {
        if (!a.stop || !b.stop) return a.stop ? -1 : b.stop ? 1 : a.row - b.row;
        return a.stop - b.stop || a.row - b.row;
      });
      var taper = g.length > 1 && isTaper(sorted);
      if (g.length > 1 && !taper) {
        // "Both Eyes" rows put the same question to each eye; ask it once
        var rows = g.map(function (x) { return x.row; });
        var key = g[0].entry.generic + '|' + rows.join(',');
        if (asked[key]) asked[key].sides.push(g[0].side);
        else {
          asked[key] = { generic: g[0].entry.generic, rows: rows, sides: [g[0].side] };
          questions.push(asked[key]);
        }
      }
      if (taper) {
        var start = today;
        sorted.forEach(function (x) {
          if (x.stop && x.stop < start) { start = maxDate(start, addDays(x.stop, 1)); return; }
          segs.push({ row: x.row, entry: x.entry, side: x.side, start: start, end: x.stop, taper: true });
          if (x.stop) start = addDays(x.stop, 1);
        });
      } else {
        g.forEach(function (x) {
          if (x.stop && x.stop < today) return;
          segs.push({ row: x.row, entry: x.entry, side: x.side, start: today, end: x.stop, taper: false });
        });
      }
    });
    questions.forEach(function (q) { q.eye = eyeLabel(q.sides); delete q.sides; });
    return { segs: segs, questions: questions, past: past };
  }

  // sorted by stop date: all different, only the last may be open-ended,
  // and the dose goes down at every step
  function isTaper(sorted) {
    for (var i = 1; i < sorted.length; i++) {
      var a = sorted[i - 1], b = sorted[i];
      if (!a.stop) return false;                                  // two open-ended rows
      if (b.stop && b.stop.getTime() === a.stop.getTime()) return false;
      if (dosesPerDay(b.entry.times) >= dosesPerDay(a.entry.times)) return false;
    }
    return true;
  }
  function maxDate(a, b) { return a > b ? a : b; }

  /*
   * Split the schedule into periods with the same daily routine. The
   * routine changes when a taper steps down; ordinary stop dates don't
   * start a new period (the drop list says when each one stops).
   * Returns [{ start, end (Date | null = open), segs: [active at start] }];
   * one open period when nothing is tapered.
   */
  function periods(segs, today) {
    var seen = {}, cuts = [];
    segs.forEach(function (s) {
      var t = s.start.getTime();
      if (s.taper && s.start > today && !seen[t]) { seen[t] = true; cuts.push(s.start); }
    });
    cuts.sort(function (a, b) { return a - b; });
    var starts = [today].concat(cuts);
    return starts.map(function (start, i) {
      var active = segs.filter(function (s) { return s.start <= start && (!s.end || s.end >= start); });
      // the last period runs until its last stop date, or stays open
      var end = i + 1 < starts.length ? addDays(starts[i + 1], -1)
        : active.every(function (s) { return s.end; }) && active.length
          ? new Date(Math.max.apply(null, active.map(function (s) { return lastDoseDay(s).getTime(); }))) : null;
      return { start: start, end: end, segs: active };
    }).filter(function (p) { return p.segs.length; });
  }

  return {
    parseFreq: parseFreq, dosesPerDay: dosesPerDay, dosesOnDoseDay: dosesOnDoseDay, freqLabel: freqLabel,
    fixedTimes: fixedTimes, fitDay: fitDay, DAY_DEFAULT: DAY_DEFAULT, parseDay: parseDay, dayParam: dayParam, isDefaultDay: isDefaultDay,
    everyDays: everyDays, firstDoseDay: firstDoseDay, lastDoseDay: lastDoseDay,
    eyeLabel: eyeLabel, SIDE_NAME: SIDE_NAME,
    plan: plan, periods: periods
  };
});
