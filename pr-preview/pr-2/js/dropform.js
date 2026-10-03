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
  var form = document.getElementById('jk-dropform');
  var rowsEl = document.getElementById('jk-dropform-rows');
  var out = document.getElementById('jk-dropform-result');
  var tpl = document.getElementById('jk-dropform-row');
  var errEl = document.getElementById('jk-dropform-error');
  if (!JK || !form || !rowsEl || !out || !tpl) return;

  var drugs = [];          // [{generic, brand, color, ...}]
  var byGeneric = {};      // generic -> drug
  var brands = [];         // [{name, generic}]  (one entry per comma-separated brand)
  var esc = JK.esc;

  var SPACING_MIN = 5;     // minutes between different drops in the same slot

  // ---------- data ----------
  // Pills (Tablet/Capsule in the data's colour field) are taken by mouth:
  // their "Which eye" is fixed to "By mouth", they skip the five-minute
  // drop spacing, and their reminders say "Take" rather than "Eye drop".
  var ORAL = { Tablet: true, Capsule: true };
  var BY_MOUTH = 'By mouth';
  function isOral(e) { return !!ORAL[e.color]; }
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
    function setColor(c) {
      col.innerHTML = swatchHTML(c); col.setAttribute('data-color', c || '');
      setOral(eyeSel, !!ORAL[c]);
    }

    // generic -> brand + color
    gen.addEventListener('change', function () {
      var d = byGeneric[gen.value];
      setColor(d ? d.color : '');
      if (d) {
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
      if (b) { gen.value = b.generic; setColor(byGeneric[b.generic].color); }
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
    JK.print.title(null);
    JK.url.clear();
  }

  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }
  function hideError() { errEl.hidden = true; }

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
        times: +r.querySelector('[name=timesPerDay]').value || 1,
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
  var EYE_CODE = { 'Right Eye': 'R', 'Left Eye': 'L', 'Both Eyes': 'B', 'By mouth': 'M' };
  var EYE_NAME = { R: 'Right Eye', L: 'Left Eye', B: 'Both Eyes', M: 'By mouth' };
  function toParams(entries) {
    return { r: entries.map(function (e) {
      return [e.generic, e.brand, e.times, EYE_CODE[e.eye] || 'B', e.stop].join('|');
    }).join(';') };
  }
  function fromParams(p) {
    if (!p.r) return [];
    return p.r.split(';').map(function (s) {
      var f = s.split('|');
      var d = byGeneric[f[0]];
      if (!d) return null;
      return { generic: f[0], brand: f[1] || '', color: d.color, use: d.use, times: Math.min(8, Math.max(1, +f[2] || 1)), eye: ORAL[d.color] ? BY_MOUTH : (EYE_NAME[f[3]] && f[3] !== 'M' ? EYE_NAME[f[3]] : 'Both Eyes'), stop: JK.date.parseISO(f[4]) ? f[4] : '' };
    }).filter(Boolean);
  }

  // ---------- routine ----------
  // Assign each medication its dose times, then stagger the eye drops that
  // share a slot by SPACING_MIN so the routine itself teaches the "wait five
  // minutes" rule. Pills in a slot are listed first, at the slot time; they
  // don't need spacing from drops.
  // Returns [{ time:"HH:MM", drops:[{entry, time}] }] sorted by time.
  // Once-daily glaucoma drops (prostaglandins and their combinations) are
  // conventionally taken at bedtime, so that is their default slot.
  function timesFor(e) {
    if (e.times === 1 && !isOral(e) && /Glaucoma/.test(e.use || '')) return ['21:00'];
    return JK.doseTimes(e.times);
  }
  function buildRoutine(entries) {
    var slots = {};
    entries.forEach(function (e) {
      timesFor(e).forEach(function (t) {
        (slots[t] = slots[t] || []).push(e);
      });
    });
    return Object.keys(slots).sort().map(function (t) {
      // more-frequent drops first within a slot, then alphabetical
      var order = function (a, b) { return b.times - a.times || a.generic.localeCompare(b.generic); };
      var pills = slots[t].filter(isOral).sort(order);
      var drops = slots[t].filter(function (e) { return !isOral(e); }).sort(order);
      return { time: t, drops: pills.map(function (e) { return { entry: e, time: t }; })
        .concat(drops.map(function (e, i) { return { entry: e, time: JK.shiftTime(t, i * SPACING_MIN) }; })) };
    });
  }

  function dropLabel(e) {
    return e.generic + (e.brand ? ' (' + e.brand + ')' : '');
  }
  // swatch + generic name + brand, for the routine table
  function dropHTML(e) {
    return swatchHTML(e.color).replace('<span class="jk-colorchip__text">' + esc(e.color) + '</span>', '')
      + '<strong>' + esc(e.generic) + '</strong>' + (e.brand ? ' <span class="routine-brand">(' + esc(e.brand) + ')</span>' : '');
  }

  // ---------- render ----------

  function render(entries) {
    var today = JK.date.today();
    var anyPill = entries.some(isOral);
    var title = anyPill ? 'Eye Medication Schedule' : 'Eye Drop Schedule';
    var medHead = anyPill ? 'Medication' : 'Eye drop';
    var h = '<div class="schedule-head"><div><h1>' + title + '</h1>'
      + '<p class="schedule-meta">Prepared ' + esc(JK.date.fmtLong(today)) + '</p></div>'
      + '<div class="jk-qrbox"><div class="jk-qr" id="jk-dropform-qr"></div><p class="jk-qrbox__cap">Scan to open this schedule on your phone</p></div></div>';

    // 1. the drops
    h += '<div class="table-wrapper"><table class="schedule-table schedule-table--stack"><thead><tr>'
      + '<th scope="col">' + medHead + '</th><th scope="col">' + (anyPill ? 'Cap color / form' : 'Cap color') + '</th><th scope="col">How often</th><th scope="col">Which eye</th><th scope="col">Until</th>'
      + '</tr></thead><tbody>';
    entries.forEach(function (e) {
      var stop = JK.date.parseISO(e.stop);
      h += '<tr>'
        + '<th scope="row" class="day-cell"><strong>' + esc(e.generic) + '</strong>' + (e.brand ? '<br><span class="routine-brand">' + esc(e.brand) + '</span>' : '') + '</th>'
        + '<td data-label="Cap color" class="jk-td-color" data-color="' + esc(e.color) + '">' + swatchHTML(e.color) + '</td>'
        + '<td data-label="How often">' + e.times + 'x a day</td>'
        + '<td data-label="Which eye">' + esc(e.eye) + '</td>'
        + '<td data-label="Until">' + (stop ? 'Last dose ' + esc(JK.date.fmtShort(stop)) : 'Until your doctor says to stop') + '</td>'
        + '</tr>';
    });
    h += '</tbody></table></div>';

    // 2. daily routine: when to use each drop, every day. Drops sharing a
    // time slot are already staggered five minutes apart.
    var routine = buildRoutine(entries);
    var note = 'Suggested times. Wait at least five minutes between different eye drops.' + (anyPill ? ' Pills can be taken with your drops; follow the pharmacy label about food.' : '');
    // The heading appears twice: as an <h2> on screen, and as a title row
    // inside <thead> for print. Browsers never separate a table header from
    // its first body row and repeat it on each page, so in print the heading
    // can't be stranded at the bottom of page 1 and labels page 2 as well.
    h += '<div class="routine"><h2>Daily routine</h2>'
      + '<p class="routine-note">' + note + '</p>'
      + '<div class="table-wrapper"><table class="schedule-table routine-table schedule-table--stack"><thead>'
      + '<tr class="routine-titlerow" aria-hidden="true"><th colspan="3"><span class="routine-titlerow__h">Daily routine</span><span class="routine-titlerow__note">' + note + '</span></th></tr>'
      + '<tr>'
      + '<th scope="col">Time</th><th scope="col">' + medHead + '</th><th scope="col">Which eye</th>'
      + '</tr></thead>';
    // One <tbody> per time slot: in print a slot is never split across
    // pages, but the table as a whole may continue onto the next page
    // (with the header row repeated) instead of leaving page 1 half empty.
    routine.forEach(function (slot) {
      h += '<tbody class="routine-slot">';
      slot.drops.forEach(function (d, i) {
        h += '<tr' + (i === 0 ? ' class="slot-start"' : '') + '>'
          + '<th scope="row" class="day-cell">' + esc(JK.fmtTime(d.time)) + '</th>'
          + '<td data-label="' + medHead + '" class="routine-drop">' + dropHTML(d.entry) + '</td>'
          + '<td data-label="Which eye" class="routine-eye">' + esc(d.entry.eye) + '</td>'
          + '</tr>';
      });
      h += '</tbody>';
    });
    h += '</table></div></div>';

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
    JK.print.setLandscape(false);
    JK.print.wireLandscape(out);

    var url = JK.url.write(toParams(entries));
    JK.qr.render(document.getElementById('jk-dropform-qr'), url, 132);

    document.getElementById('jk-dropform-print').addEventListener('click', function () { window.print(); });
    document.getElementById('jk-dropform-ics').addEventListener('click', function () { exportICS(entries, routine, today); });
    document.getElementById('jk-dropform-back').addEventListener('click', function () {
      out.hidden = true; form.hidden = false; JK.print.title(null); JK.url.clear(); window.scrollTo(0, 0);
    });
    window.scrollTo(0, 0);
  }

  function exportICS(entries, routine, today) {
    var events = [];
    routine.forEach(function (slot) {
      slot.drops.forEach(function (d) {
        var e = d.entry;
        var stop = JK.date.parseISO(e.stop);
        events.push({
          summary: isOral(e) ? 'Take: ' + dropLabel(e) + ' (by mouth)' : 'Eye drop: ' + dropLabel(e) + ' — ' + e.eye,
          description: isOral(e)
            ? e.times + 'x a day by mouth. Schedule from jonathankatzmd.com.'
            : e.times + 'x a day' + (e.color ? ', ' + e.color.toLowerCase() + ' cap' : '') + '. Wait five minutes between different drops. Schedule from jonathankatzmd.com.',
          start: today,
          end: stop || null,            // null = repeats until deleted
          time: d.time
        });
      });
    });
    // an event with no end still needs a daily rule
    var text = JK.ics.build(events.map(function (ev) {
      if (!ev.end) ev.end = JK.date.addDays(ev.start, 1); // placeholder so RRULE is emitted
      return ev;
    }), 'Eye medications');
    // strip the placeholder UNTIL for open-ended drops
    text = text.replace(/RRULE:FREQ=DAILY;UNTIL=(\d{8})T235959/g, function (m, until) {
      var tomorrow = JK.date.toISO(JK.date.addDays(today, 1)).replace(/-/g, '');
      return until === tomorrow ? 'RRULE:FREQ=DAILY' : m;
    });
    JK.ics.download(text, 'eye-drop-schedule.ics');
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
      var entries = fromParams(JK.url.read());
      if (entries.length) { fillRows(entries); render(entries); }
      else reset();
    })
    .catch(function () {
      rowsEl.innerHTML = '<p class="jk-status--error">Could not load the medication list. Please reload the page.</p>';
    });
})();
