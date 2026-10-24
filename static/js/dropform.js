/* Eye Drop Schedule Builder.
 *
 * Rows are added/removed; generic and brand dropdowns are populated from
 * /data/eye-drops.json (the same file that builds the reference table) and
 * linked both ways. Output: a list of the drops, a daily routine with drops
 * spaced five minutes apart, calendar (.ics) export and a
 * QR code of the schedule URL. Shared helpers live in schedule-common.js.
 */
(function () {
  'use strict';

  var JK = window.JK;
  var Plan = window.JKDropPlan;
  var form = document.getElementById('jk-dropform');
  var rowsEl = document.getElementById('jk-dropform-rows');
  var out = document.getElementById('jk-dropform-result');
  var tpl = document.getElementById('jk-dropform-row');
  var errEl = document.getElementById('jk-dropform-error');
  var qEl = document.getElementById('jk-dropform-question');
  if (!JK || !Plan || !form || !rowsEl || !out || !tpl) return;

  var drugs = [];          // [{generic, brand, color, ...}]
  var byGeneric = {};      // generic -> drug
  var brands = [];         // [{name, generic}]  (one entry per comma-separated brand)
  var esc = JK.esc;

  var SPACING_MIN = 5;     // minutes between different drops in the same slot
  var day = Plan.DAY_DEFAULT;   // { wake, bed } in minutes; set on the schedule

  // ---------- data ----------
  // Pills (Tablet/Capsule in the data's colour field) are taken by mouth:
  // their "Which eye" is fixed to "By mouth", they skip the five-minute
  // drop spacing, and their reminders say "Take" rather than "Eye drop".
  var ORAL = { Tablet: true, Capsule: true };
  var BY_MOUTH = 'By mouth';
  function isOral(e) { return !!(e && ORAL[e.color]); }
  function indexData(list) {
    drugs = list;
    byGeneric = {};
    brands = [];
    list.forEach(function (d) {
      byGeneric[d.generic] = d;
      (d.brand || '').split(',').forEach(function (b) {
        b = b.trim();
        if (b) brands.push({ name: b, generic: d.generic });
      });
    });
    brands.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  // Default "Times per day" from the table's typical dosage: the first
  // "Nx/day" in it ("4x/day", "~4x/day, Variable", "Up to 4x/day" -> 4), or
  // the lower end of a range ("2-3x/day" -> 2); anything else ("Variable",
  // "As needed", none) -> once a day.
  function defaultTimes(d) {
    var m = /(\d+)(?:\s*-\s*\d+)?x\/day/i.exec((d && d.dosage) || '');
    return onceADay(d, m ? Math.min(8, Math.max(1, +m[1])) : 1);
  }
  // Once-daily glaucoma drops (prostaglandins and their combinations) are
  // conventionally taken at bedtime, so once a day defaults to the evening
  // for them and the morning for everything else. Also reads links made
  // before morning/evening existed, which say just 1.
  function eveningDrop(d) { return !isOral(d) && /Glaucoma/.test((d && d.use) || ''); }
  function onceADay(d, times) { return times === 1 ? (eveningDrop(d) ? 'qpm' : 'qam') : times; }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = '';
    var o = document.createElement('option');
    o.value = ''; o.textContent = placeholder;
    sel.appendChild(o);
    items.forEach(function (it) {
      var op = document.createElement('option');
      op.value = it.value; op.textContent = it.label;
      sel.appendChild(op);
    });
  }

  function swatchHTML(color) {
    if (!color) return '<span class="jk-colorchip__text">—</span>';
    var cls = (color === 'Vial' || color === 'Tube' || color === 'Varies' || ORAL[color]) ? 'jk-swatch jk-swatch--container' : 'jk-swatch';
    return '<span class="' + cls + '" data-color="' + esc(color) + '" aria-hidden="true"></span><span class="jk-colorchip__text">' + esc(color) + '</span>';
  }

  // ---------- rows ----------
  function addRow() {
    var row = tpl.content.firstElementChild.cloneNode(true);
    var gen = row.querySelector('[name=genericName]');
    var brd = row.querySelector('[name=brandName]');
    var col = row.querySelector('[name=topColor]');

    fillSelect(gen, drugs.map(function (d) { return { value: d.generic, label: d.generic }; }), 'Select generic name');
    fillSelect(brd, brands.map(function (b) { return { value: b.name, label: b.name }; }), 'Select brand name');

    var eyeSel = row.querySelector('[name=eye]');
    var timesSel = row.querySelector('[name=timesPerDay]');
    function setColor(c) {
      col.innerHTML = swatchHTML(c); col.setAttribute('data-color', c || '');
      setOral(eyeSel, !!ORAL[c]);
    }

    // generic -> brand + color
    gen.addEventListener('change', function () {
      var d = byGeneric[gen.value];
      setColor(d ? d.color : '');
      if (d) {
        timesSel.value = String(defaultTimes(d));
        var first = (d.brand || '').split(',')[0].trim();
        brd.value = first && brands.some(function (b) { return b.name === first; }) ? first : '';
      } else {
        brd.value = '';
      }
      hideError();
    });
    // brand -> generic + color
    brd.addEventListener('change', function () {
      var b = brands.filter(function (x) { return x.name === brd.value; })[0];
      if (b) {
        gen.value = b.generic; setColor(byGeneric[b.generic].color);
        timesSel.value = String(defaultTimes(byGeneric[b.generic]));
      }
      else { gen.value = ''; setColor(''); }
      hideError();
    });

    row.querySelector('.jk-rowbtn--del').addEventListener('click', function () {
      if (rowsEl.children.length > 1) row.remove();
      renumber();
    });

    rowsEl.appendChild(row);
    renumber();
    return row;
  }

  // A pill's "Which eye" is "By mouth" and locked; switching back to a drop
  // restores the eye choices.
  function setOral(sel, oral) {
    var opt = sel.querySelector('option[value="' + BY_MOUTH + '"]');
    if (oral) {
      if (!opt) { opt = document.createElement('option'); opt.value = BY_MOUTH; opt.textContent = BY_MOUTH; sel.appendChild(opt); }
      sel.value = BY_MOUTH; sel.disabled = true;
    } else {
      if (opt) { opt.remove(); sel.value = 'Right Eye'; }
      sel.disabled = false;
    }
  }

  // The first/only row can't be deleted.
  function renumber() {
    var rows = rowsEl.querySelectorAll('.jk-droprow');
    rows.forEach(function (r, i) {
      r.querySelector('.jk-droprow__n').textContent = i + 1;
      r.querySelector('.jk-rowbtn--del').hidden = rows.length === 1;
    });
  }

  function reset() {
    rowsEl.innerHTML = '';
    addRow();
    out.hidden = true;
    form.hidden = false;
    hideError();
    day = Plan.DAY_DEFAULT;
    JK.print.title(null);
    JK.url.clear();
  }

  function showError(msg) { hideQuestion(); errEl.textContent = msg; errEl.hidden = false; }
  function hideError() { errEl.hidden = true; hideQuestion(); }
  function hideQuestion() { if (qEl) qEl.hidden = true; }

  function readRows() {
    var entries = [];
    rowsEl.querySelectorAll('.jk-droprow').forEach(function (r) {
      var g = r.querySelector('[name=genericName]').value;
      if (!g) return;
      var d = byGeneric[g];
      entries.push({
        generic: g,
        brand: r.querySelector('[name=brandName]').value,
        color: d ? d.color : '',
        use: d ? d.use : '',
        times: Plan.parseFreq(r.querySelector('[name=timesPerDay]').value),
        eye: d && ORAL[d.color] ? BY_MOUTH : r.querySelector('[name=eye]').value,
        stop: r.querySelector('[name=stopDate]').value
      });
    });
    return entries;
  }

  function fillRows(entries) {
    rowsEl.innerHTML = '';
    entries.forEach(function (e) {
      var r = addRow();
      var gen = r.querySelector('[name=genericName]');
      gen.value = e.generic;
      gen.dispatchEvent(new Event('change'));
      if (e.brand) r.querySelector('[name=brandName]').value = e.brand;
      r.querySelector('[name=timesPerDay]').value = String(e.times);
      if (!isOral(e)) r.querySelector('[name=eye]').value = e.eye;
      r.querySelector('[name=stopDate]').value = e.stop || '';
    });
    if (!entries.length) addRow();
  }

  // ---------- url state ----------
  // r = one entry per row, fields separated by "|", rows by ";"
  // w, b = wake-up and bedtime ("0700"), left out when they are the default
  var EYE_CODE = { 'Right Eye': 'R', 'Left Eye': 'L', 'Both Eyes': 'B', 'By mouth': 'M' };
  var EYE_NAME = { R: 'Right Eye', L: 'Left Eye', B: 'Both Eyes', M: 'By mouth' };
  function toParams(entries) {
    var p = { r: entries.map(function (e) {
      return [e.generic, e.brand, e.times, EYE_CODE[e.eye] || 'B', e.stop].join('|');
    }).join(';') };
    if (!Plan.isDefaultDay(day)) { p.w = Plan.dayParam(day.wake); p.b = Plan.dayParam(day.bed); }
    return p;
  }
  function fromParams(p) {
    if (!p.r) return [];
    return p.r.split(';').map(function (s) {
      var f = s.split('|');
      var d = byGeneric[f[0]];
      if (!d) return null;
      return { generic: f[0], brand: f[1] || '', color: d.color, use: d.use, times: onceADay(d, Plan.parseFreq(f[2])), eye: ORAL[d.color] ? BY_MOUTH : (EYE_NAME[f[3]] && f[3] !== 'M' ? EYE_NAME[f[3]] : 'Both Eyes'), stop: JK.date.parseISO(f[4]) ? f[4] : '' };
    }).filter(Boolean);
  }

  // ---------- routine ----------
  // Assign each medication its dose times, then stagger the eye drops that
  // share a slot by SPACING_MIN so the routine itself teaches the "wait five
  // minutes" rule. Pills in a slot are listed first, at the slot time; they
  // don't need spacing from drops. The same drop going into each eye at the
  // same time is one line ("Both Eyes"), not two drops five minutes apart.
  // segs: the plan's segments active in one period.
  // Returns [{ time:"HH:MM", drops:[{entry, eye, segs, time}] }] sorted by time.
  // Every-other-day drops take the once-a-day time on their dose days.
  // All times are fitted to the patient's wake-up and bedtime (`day`).
  function timesFor(e) {
    var fixed = Plan.fixedTimes(e.times, day);
    if (fixed) return fixed;
    var n = Plan.dosesOnDoseDay(e.times);
    if (n === 1) return Plan.fixedTimes(onceADay(e, 1), day);
    return Plan.fitDay(JK.doseTimes(n), day);
  }
  // `start`: the first day of the period, to find each every-other-day
  // drop's first dose day in it (item.first). Drops on different days are
  // kept apart, so "Both Eyes" only merges eyes dosed on the same days.
  function buildRoutine(segs, start) {
    var slots = {};
    segs.forEach(function (s) {
      var first = Plan.everyDays(s.entry.times) > 1 ? Plan.firstDoseDay(s, start) : null;
      timesFor(s.entry).forEach(function (t) {
        var slot = slots[t] = slots[t] || {};
        var k = s.entry.generic + '|' + s.entry.brand + (first ? '|' + JK.date.toISO(first) : '');
        (slot[k] = slot[k] || { entry: s.entry, segs: [], first: first }).segs.push(s);
      });
    });
    return Object.keys(slots).sort().map(function (t) {
      var items = Object.keys(slots[t]).map(function (k) {
        var it = slots[t][k];
        it.eye = Plan.eyeLabel(it.segs.map(function (s) { return s.side; }));
        return it;
      });
      // more-frequent drops first within a slot, then alphabetical
      var order = function (a, b) {
        return Plan.dosesPerDay(b.entry.times) - Plan.dosesPerDay(a.entry.times) || a.entry.generic.localeCompare(b.entry.generic);
      };
      var pills = items.filter(function (it) { return isOral(it.entry); }).sort(order);
      var drops = items.filter(function (it) { return !isOral(it.entry); }).sort(order);
      pills.forEach(function (it) { it.time = t; });
      drops.forEach(function (it, i) { it.time = JK.shiftTime(t, i * SPACING_MIN); });
      return { time: t, drops: pills.concat(drops) };
    });
  }

  function dropLabel(e) {
    return e.generic + (e.brand ? ' (' + e.brand + ')' : '');
  }
  // swatch + generic name + brand, for the routine table
  // `first`: first dose day of an every-other-day drop in this period
  function dropHTML(e, first) {
    return swatchHTML(e.color).replace('<span class="jk-colorchip__text">' + esc(e.color) + '</span>', '')
      + '<strong>' + esc(e.generic) + '</strong>' + (e.brand ? ' <span class="routine-brand">(' + esc(e.brand) + ')</span>' : '')
      + (first ? '<span class="routine-freq">' + esc(Plan.freqLabel(e.times)) + ', starting ' + esc(JK.date.fmtShort(first)) + '</span>' : '');
  }

  // "Until" cell for one row. A later taper step shows when it starts; a
  // "Both Eyes" row whose eyes start on different days says which eye waits.
  function datesText(segs, stop, today) {
    var fmt = JK.date.fmtShort;
    // every other day: the last dose may fall the day before the stop date
    if (stop && segs.length && segs[0].end) stop = Plan.lastDoseDay(segs[0]);
    var last = stop ? 'Last dose ' + fmt(stop) : 'Ongoing';
    if (!segs.length) return stop ? 'Finished ' + fmt(stop) : last;
    var later = segs.filter(function (s) { return s.start > today; });
    if (!later.length) return last;
    if (later.length === segs.length) {
      return 'Starts ' + fmt(segs[0].start) + (stop ? ', last dose ' + fmt(stop) : ', then ongoing');
    }
    return last + ' (' + Plan.SIDE_NAME[later[0].side] + ' starts ' + fmt(later[0].start) + ')';
  }

  // ---------- render ----------

  // ---------- wake-up / bedtime ----------
  // Shown above the daily routine (not printed). Changing either one
  // redraws the schedule in place, so the times, the calendar file and the
  // QR code all follow.
  // Any wake-up time, so night shifts work; bedtime is offered from 8 to
  // 20 hours after it and may be the next morning.
  function dayOptions(from, to, sel) {
    var h = '';
    for (var m = from; m <= to; m += 30) {
      var label = JK.fmtTime(Plan.dayParam(m).replace(/(\d\d)$/, ':$1'));
      if (m % 1440 === 0) label += ' (midnight)';
      else if (m % 1440 === 720) label += ' (noon)';
      h += '<option value="' + m + '"' + (m === sel ? ' selected' : '') + '>' + esc(label) + '</option>';
    }
    return h;
  }
  function dayHTML() {
    return '<div class="jk-daytimes"><p class="jk-daytimes__text">The times below fit a day from waking up to bedtime. Change them to match your day before adding reminders to your calendar.</p>'
      + '<div class="jk-daytimes__fields">'
      + '<label class="jk-daytimes__f"><span>Wake up</span><select id="jk-day-wake" class="jk-in">' + dayOptions(0, 1410, day.wake) + '</select></label>'
      + '<label class="jk-daytimes__f"><span>Bedtime</span><select id="jk-day-bed" class="jk-in">' + dayOptions(day.wake + Plan.AWAKE_MIN, day.wake + Plan.AWAKE_MAX, day.bed) + '</select></label>'
      + '</div></div>';
  }
  function wireDay(entries) {
    ['jk-day-wake', 'jk-day-bed'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        // a new wake-up keeps the bedtime's clock time if it still fits
        day = Plan.makeDay(+document.getElementById('jk-day-wake').value, +document.getElementById('jk-day-bed').value % 1440);
        render(entries, true);
        document.getElementById(id).focus();
      });
    });
  }

  // `again`: redrawn for a new wake-up/bedtime; keep the scroll position
  // and print orientation
  function render(entries, again) {
    var today = JK.date.today();
    var p = Plan.plan(entries, today);
    var periods = Plan.periods(p.segs, today);
    var tapered = periods.length > 1;
    var anyPill = entries.some(isOral);
    var title = anyPill ? 'Eye Medication Schedule' : 'Eye Drop Schedule';
    var medHead = anyPill ? 'Medication' : 'Eye drop';
    var h = '<div class="schedule-head"><div><h1>' + title + '</h1>'
      + '<p class="schedule-meta">Prepared ' + esc(JK.date.fmtLong(today)) + '</p></div>'
      + '<div class="jk-qrbox"><div class="jk-qr" id="jk-dropform-qr"></div><p class="jk-qrbox__cap">Scan to open this schedule on your phone</p></div></div>';

    // 1. the drops
    var untilHead = tapered ? 'When' : 'Until';
    h += '<div class="table-wrapper"><table class="schedule-table schedule-table--stack"><thead><tr>'
      + '<th scope="col">' + medHead + '</th><th scope="col">' + (anyPill ? 'Cap color / form' : 'Cap color') + '</th><th scope="col">How often</th><th scope="col">Which eye</th><th scope="col">' + untilHead + '</th>'
      + '</tr></thead><tbody>';
    entries.forEach(function (e, i) {
      var stop = JK.date.parseISO(e.stop);
      var rowSegs = p.segs.filter(function (s) { return s.row === i + 1; });
      h += '<tr>'
        + '<th scope="row" class="day-cell"><strong>' + esc(e.generic) + '</strong>' + (e.brand ? '<br><span class="routine-brand">' + esc(e.brand) + '</span>' : '') + '</th>'
        + '<td data-label="Cap color" class="jk-td-color" data-color="' + esc(e.color) + '">' + swatchHTML(e.color) + '</td>'
        + '<td data-label="How often">' + esc(Plan.freqLabel(e.times)) + '</td>'
        + '<td data-label="Which eye">' + esc(e.eye) + '</td>'
        + '<td data-label="' + untilHead + '">' + esc(datesText(rowSegs, stop, today)) + '</td>'
        + '</tr>';
    });
    h += '</tbody></table></div>';

    h += dayHTML();

    // 2. daily routine: when to use each drop, every day. Drops sharing a
    // time slot are already staggered five minutes apart. A taper gets one
    // routine per step, headed with its dates.
    var routines = periods.map(function (per) { return { period: per, slots: buildRoutine(per.segs, per.start) }; });
    var note = 'Suggested times. Wait at least five minutes between different eye drops.' + (anyPill ? ' Pills can be taken with your drops; follow the pharmacy label about food.' : '');
    if (!routines.length) {
      h += '<div class="routine"><h2>Daily routine</h2><p class="routine-note">Every medication on this schedule has finished.</p></div>';
    }
    routines.forEach(function (r) {
      var per = r.period, heading = 'Daily routine';
      if (tapered) {
        heading += ': ' + (per.end
          ? (per.end.getTime() === per.start.getTime() ? JK.date.fmtShort(per.start) : JK.date.fmtShort(per.start) + ' – ' + JK.date.fmtShort(per.end))
          : 'from ' + JK.date.fmtShort(per.start));
      }
      // The heading appears twice: as an <h2> on screen, and as a title row
      // inside <thead> for print. Browsers never separate a table header from
      // its first body row and repeat it on each page, so in print the heading
      // can't be stranded at the bottom of page 1 and labels page 2 as well.
      h += '<div class="routine"><h2>' + esc(heading) + '</h2>'
        + '<p class="routine-note">' + note + '</p>'
        + '<div class="table-wrapper"><table class="schedule-table routine-table schedule-table--stack"><thead>'
        + '<tr class="routine-titlerow" aria-hidden="true"><th colspan="3"><span class="routine-titlerow__h">' + esc(heading) + '</span><span class="routine-titlerow__note">' + note + '</span></th></tr>'
        + '<tr>'
        + '<th scope="col">Time</th><th scope="col">' + medHead + '</th><th scope="col">Which eye</th>'
        + '</tr></thead>';
      // One <tbody> per time slot: in print a slot is never split across
      // pages, but the table as a whole may continue onto the next page
      // (with the header row repeated) instead of leaving page 1 half empty.
      r.slots.forEach(function (slot) {
        h += '<tbody class="routine-slot">';
        slot.drops.forEach(function (d, i) {
          h += '<tr' + (i === 0 ? ' class="slot-start"' : '') + '>'
            + '<th scope="row" class="day-cell">' + esc(JK.fmtTime(d.time)) + '</th>'
            + '<td data-label="' + medHead + '" class="routine-drop">' + dropHTML(d.entry, d.first) + '</td>'
            + '<td data-label="Which eye" class="routine-eye">' + esc(d.eye) + '</td>'
            + '</tr>';
        });
        h += '</tbody>';
      });
      h += '</table></div></div>';
    });

    h += '<div class="button-container">'
      + '<button type="button" class="btn btn-primary" id="jk-dropform-print">Print</button>'
      + '<button type="button" class="btn btn-outline-primary" id="jk-dropform-ics">Add to calendar</button>'
      + '<button type="button" class="btn btn-outline-secondary" id="jk-dropform-back">Back</button>'
      + '<label class="jk-printopt"><input type="checkbox" class="jk-landscape"> Landscape</label></div>'
      + '<p class="jk-note jk-ics-note">“Add to calendar” downloads a file that adds a daily reminder for each dose to the phone or computer calendar it is opened on. Medications without a stop date repeat until you delete them.</p>';

    out.innerHTML = h;
    form.hidden = true;
    out.hidden = false;
    JK.print.title(title);
    if (!again) JK.print.setLandscape(false);
    JK.print.wireLandscape(out);
    wireDay(entries);

    var url = JK.url.write(toParams(entries));
    JK.ios.safariNote(out.querySelector('.jk-ics-note'), url);
    JK.qr.render(document.getElementById('jk-dropform-qr'), url, 132);

    document.getElementById('jk-dropform-print').addEventListener('click', function () { window.print(); });
    document.getElementById('jk-dropform-ics').addEventListener('click', function () { JK.ics.download(buildICS(routines), 'eye-drop-schedule.ics'); });
    document.getElementById('jk-dropform-back').addEventListener('click', function () {
      out.hidden = true; form.hidden = false; JK.print.title(null); JK.url.clear(); window.scrollTo(0, 0);
    });
    if (!again) window.scrollTo(0, 0);
  }

  // One daily reminder per dose for each routine period, running from the
  // later of the period start and the drop's start until the earlier of the
  // period end and the drop's stop date (none = repeats until deleted). A
  // "Both Eyes" line whose eyes stop on different days becomes one reminder
  // per eye so each can end on its own date.
  function buildICS(routines) {
    var events = [];
    function minEnd(a, b) { return a === null ? b : b === null ? a : (a < b ? a : b); }
    routines.forEach(function (r) {
      r.slots.forEach(function (slot) {
        slot.drops.forEach(function (d) {
          var ends = d.segs.map(function (s) { return minEnd(s.end || null, r.period.end); });
          var same = ends.every(function (x) { return (x && x.getTime()) === (ends[0] && ends[0].getTime()); });
          var groups = same ? [{ eye: d.eye, end: ends[0] }]
            : d.segs.map(function (s, i) { return { eye: Plan.SIDE_NAME[s.side], end: ends[i] }; });
          var start = d.first || r.period.start;
          groups.forEach(function (g) {
            var e = d.entry;
            if (g.end && start > g.end) return;   // no dose day left in this period
            events.push({
              summary: isOral(e) ? 'Take: ' + dropLabel(e) + ' (by mouth)' : 'Eye drop: ' + dropLabel(e) + ' — ' + g.eye,
              description: (isOral(e)
                ? Plan.freqLabel(e.times) + ' by mouth.'
                : Plan.freqLabel(e.times) + (e.color ? ', ' + e.color.toLowerCase() + ' cap' : '') + '. Wait five minutes between different drops.') + ' Schedule from jonathankatzmd.com.',
              start: start,
              end: g.end,                 // null = repeats until deleted
              interval: Plan.everyDays(e.times),
              time: d.time
            });
          });
        });
      });
    });
    return JK.ics.build(events, 'Eye medications');
  }

  // ---------- taper question ----------
  // Rows for the same medication and eye that don't read as a taper (two
  // without a stop date, the same stop date twice, or the dose not going
  // down) might be a taper with a date missing. Ask before guessing; "no"
  // uses them at the same time.
  function askTaper(questions, entries) {
    var lines = questions.map(function (q) {
      return q.generic + ', ' + q.eye.toLowerCase() + ' (medications ' + q.rows.join(' and ') + ')';
    });
    qEl.querySelector('.jk-form__question-text').textContent =
      'Was this supposed to be a taper? ' + lines.join('; ') + ' ' + (questions.length > 1 ? 'are' : 'is')
      + ' listed more than once. In a taper, each step needs its own stop date, later than the step before, with fewer doses a day. Only the last step can be left without a stop date.';
    errEl.hidden = true;
    qEl.hidden = false;
    var fix = qEl.querySelector('.jk-form__question-fix'), go = qEl.querySelector('.jk-form__question-go');
    fix.onclick = function () {
      hideQuestion();
      var r = rowsEl.querySelectorAll('.jk-droprow')[questions[0].rows[0] - 1];
      if (r) r.querySelector('[name=stopDate]').focus();
    };
    go.onclick = function () { hideQuestion(); render(entries); };
    fix.focus();
  }

  // ---------- events ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var entries = readRows();
    if (!entries.length) {
      rowsEl.querySelector('[name=genericName]').focus();
      showError('Choose at least one medication.');
      return;
    }
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].stop && !JK.date.parseISO(entries[i].stop)) {
        showError('Medication ' + (i + 1) + ': enter the stop date as a full date, or leave it blank.');
        return;
      }
    }
    var p = Plan.plan(entries, JK.date.today());
    if (p.past.length) {
      showError('Medication ' + p.past[0] + ': the stop date has already passed. Change it, or leave it blank.');
      return;
    }
    if (p.questions.length && qEl) { askTaper(p.questions, entries); return; }
    render(entries);
  });
  document.getElementById('jk-dropform-add').addEventListener('click', function () {
    var r = addRow();
    r.querySelector('[name=genericName]').focus();
  });
  document.getElementById('jk-dropform-reset').addEventListener('click', reset);

  fetch(form.getAttribute('data-source'), { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (list) {
      indexData(list);
      var params = JK.url.read();
      day = Plan.parseDay(params.w, params.b);
      var entries = fromParams(params);
      if (entries.length) { fillRows(entries); render(entries); }
      else reset();
    })
    .catch(function () {
      rowsEl.innerHTML = '<p class="jk-status--error">Could not load the medication list. Please reload the page.</p>';
    });
})();
