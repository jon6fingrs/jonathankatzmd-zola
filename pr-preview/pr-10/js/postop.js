/* Post-op eye drop schedule generator (UI layer).
 *
 * The dosing rules live in postop-rules.js (shared with the tests); the date,
 * calendar, QR and URL helpers in schedule-common.js. This file wires the
 * form, greys out medications that don't apply to the chosen surgery, and
 * renders the schedule.
 */
(function () {
  'use strict';

  var R = window.JKPostopRules;
  var JK = window.JK;
  if (!R || !JK) return;

  var form = document.getElementById('jk-postop-form');
  var out  = document.getElementById('jk-postop-result');
  if (!form || !out) return;
  var el = form.elements;
  var errEl = document.getElementById('jk-postop-error');

  var NOT_USED = {
    antibiotic: 'Not part of the drop regimen for this surgery.',
    nsaid:      'Not part of the drop regimen for this surgery.',
    ointment:   'Ointment is used only after tube shunt or trabeculectomy.'
  };

  // ---------- form gating ----------
  function setFieldState(name, on, hint) {
    var wrap = form.querySelector('[data-field="' + name + '"]');
    var sel = el[name];
    if (!wrap || !sel) return;
    wrap.classList.toggle('is-off', !on);
    sel.disabled = !on;
    if (!on) sel.value = '';
    var h = wrap.querySelector('[data-hint]');
    if (h) h.textContent = hint || '';
  }

  function gate() {
    var s = el['surgery_type'].value;
    var picked = !!s;
    ['antibiotic', 'nsaid', 'ointment'].forEach(function (f) {
      var on = !picked || R.applies(s, f);
      setFieldState(f, on, on ? '' : NOT_USED[f]);
    });
    // steroid: always on, but only the steroids with a taper for this
    // surgery are selectable
    var allowed = R.steroidsFor(s);
    var ster = el['steroid'];
    Array.prototype.forEach.call(ster.options, function (o) {
      if (!o.value) return;
      o.disabled = allowed.indexOf(o.value) === -1;
    });
    if (ster.value && allowed.indexOf(ster.value) === -1) ster.value = '';
    var sh = form.querySelector('[data-field="steroid"] [data-hint]');
    if (sh) sh.textContent = (picked && allowed.length === 1) ? 'Only ' + allowed[0] + ' is used for this surgery.' : '';
    hideError();
  }

  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }
  function hideError() { errEl.hidden = true; }

  // ---------- read / write form state ----------
  function readForm() {
    return {
      surgeryDate: el['surgery_date'].value,
      surgeryType: el['surgery_type'].value,
      steroid:     el['steroid'].value,
      antibiotic:  el['antibiotic'].value,
      nsaid:       el['nsaid'].value,
      ointment:    el['ointment'].value
    };
  }
  function fillForm(v) {
    el['surgery_date'].value = v.surgeryDate || '';
    el['surgery_type'].value = v.surgeryType || '';
    gate();
    el['steroid'].value    = v.steroid || '';
    el['antibiotic'].value = v.antibiotic || '';
    el['nsaid'].value      = v.nsaid || '';
    el['ointment'].value   = v.ointment || '';
  }
  // short query keys keep the QR code small
  var KEYS = { surgeryDate: 'd', surgeryType: 't', steroid: 's', antibiotic: 'a', nsaid: 'n', ointment: 'o' };
  function toParams(v) {
    var p = {};
    Object.keys(KEYS).forEach(function (k) { p[KEYS[k]] = v[k] || ''; });
    return p;
  }
  function fromParams(p) {
    var v = {};
    Object.keys(KEYS).forEach(function (k) { v[k] = p[KEYS[k]] || ''; });
    return v;
  }

  // ---------- rendering ----------
  function boxes(n) {
    var h = '<span class="jk-boxes" aria-label="' + n + ' doses">';
    for (var i = 0; i < n; i++) h += '<input type="checkbox" aria-label="dose ' + (i + 1) + '">';
    return h + '</span>';
  }

  function render(v) {
    var sch = R.schedule(v);
    var surgeryDate = JK.date.parseISO(v.surgeryDate) || JK.date.today();
    var start = JK.date.addDays(surgeryDate, 1);
    var last = JK.date.addDays(start, sch.duration - 1);
    var esc = JK.esc;

    var h = '<div class="schedule-head schedule-head--postop">'
      + '<div><h1 class="surgery-name">' + esc(v.surgeryType) + '</h1>'
      + '<p class="schedule-meta">Surgery ' + esc(JK.date.fmtLong(surgeryDate))
      + '<br>Drops ' + esc(JK.date.fmtShort(start)) + ' through ' + esc(JK.date.fmtShort(last))
      + ' (' + sch.duration + ' days)</p></div>'
      + '<div class="jk-qrbox"><div class="jk-qr" id="jk-postop-qr"></div><p class="jk-qrbox__cap">Scan to open this schedule on your phone</p></div>'
      + '</div>';

    // legend: what each column is and when it stops
    h += '<ul class="schedule-legend">';
    sch.columns.forEach(function (c) {
      var ph = JK.ics.phases(start, sch.duration, c.countFor);
      var lastDay = ph.length ? ph[ph.length - 1].end : null;
      h += '<li><strong>' + esc(c.label) + ':</strong> ' + esc(c.drug)
        + (c.bedtime ? ' at bedtime' : '')
        + (lastDay ? ', last dose ' + esc(JK.date.fmtShort(lastDay)) : '') + '</li>';
    });
    h += '</ul>';

    h += '<div class="table-wrapper"><table class="schedule-table schedule-table--stack"><thead><tr><th scope="col">Date</th>';
    sch.columns.forEach(function (c) {
      h += '<th scope="col">' + esc(c.label) + '<br><span class="schedule-drug">' + esc(c.drug) + '</span></th>';
    });
    h += '</tr></thead><tbody>';

    var cols = sch.columns.length + 1;
    for (var day = 0; day < sch.duration; day++) {
      var date = JK.date.addDays(start, day);
      if (day % 7 === 0) {
        var wkEnd = JK.date.addDays(start, Math.min(day + 6, sch.duration - 1));
        h += '<tr class="week-row"><td colspan="' + cols + '">Week ' + (day / 7 + 1)
          + ' <span class="week-range">' + esc(JK.date.fmtRange(date, wkEnd)) + '</span></td></tr>';
      }
      h += '<tr class="' + ((day / 7 | 0) % 2 ? 'week-odd' : 'week-even') + '">'
        + '<th scope="row" class="day-cell"><span class="day-wd">' + esc(date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })) + '</span> '
        + '<span class="day-md">' + esc(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })) + '</span></th>';
      sch.columns.forEach(function (c) {
        var n = c.countFor(day);
        h += '<td data-label="' + esc(c.drug) + '" class="dose-cell' + (n ? '' : ' dose-cell--none') + '">'
          + (n ? boxes(n) : '<span class="dose-none">—</span>') + '</td>';
      });
      h += '</tr>';
    }
    h += '</tbody></table></div>';

    h += '<div class="button-container">'
      + '<button type="button" class="btn btn-primary" id="jk-postop-print">Print schedule</button>'
      + '<button type="button" class="btn btn-outline-primary" id="jk-postop-ics">Add to calendar</button>'
      + '<button type="button" class="btn btn-outline-secondary" id="jk-postop-back">Back</button>'
      + '<label class="jk-printopt"><input type="checkbox" class="jk-landscape"> Landscape</label>'
      + '</div>'
      + '<p class="jk-note jk-ics-note">“Add to calendar” downloads a file that adds every dose as a reminder to the phone or computer calendar it is opened on. The last reminder is on the final day of drops.</p>';

    out.innerHTML = h;
    form.hidden = true;
    out.hidden = false;

    JK.print.title(v.surgeryType + ' Drop Schedule');
    JK.print.setLandscape(false);
    JK.print.wireLandscape(out);

    var url = JK.url.write(toParams(v));
    JK.qr.render(document.getElementById('jk-postop-qr'), url, 132);

    document.getElementById('jk-postop-print').addEventListener('click', function () { window.print(); });
    document.getElementById('jk-postop-ics').addEventListener('click', function () { exportICS(v, sch, start); });
    document.getElementById('jk-postop-back').addEventListener('click', back);
    window.scrollTo(0, 0);
  }

  function exportICS(v, sch, start) {
    var events = [];
    sch.columns.forEach(function (c) {
      JK.ics.phases(start, sch.duration, c.countFor).forEach(function (ph) {
        var times = c.bedtime && ph.count === 1 ? ['21:00'] : JK.doseTimes(ph.count);
        times.forEach(function (t, i) {
          events.push({
            summary: 'Eye drop: ' + c.drug + (ph.count > 1 ? ' (' + (i + 1) + ' of ' + ph.count + ' today)' : ''),
            description: c.label + ' after ' + v.surgeryType + '. ' + ph.count + 'x/day this phase. Schedule from jonathankatzmd.com.',
            start: ph.start, end: ph.end, time: t
          });
        });
      });
    });
    var text = JK.ics.build(events, 'Eye drops: ' + v.surgeryType);
    JK.ics.download(text, 'eye-drops-' + v.surgeryType.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics');
  }

  function back() {
    out.hidden = true;
    form.hidden = false;
    JK.print.title(null);
    JK.url.clear();
    window.scrollTo(0, 0);
  }

  function validate(v) {
    if (!v.surgeryType) { el['surgery_type'].focus(); showError('Choose the type of surgery.'); return false; }
    if (v.surgeryDate && !JK.date.parseISO(v.surgeryDate)) { el['surgery_date'].focus(); showError('Enter the surgery date as a full date.'); return false; }
    if (!R.schedule(v).columns.length) {
      el['steroid'].focus();
      showError('Select at least one medication that is used for this surgery.');
      return false;
    }
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = readForm();
    if (!validate(v)) return;
    render(v);
  });
  form.addEventListener('reset', function () {
    setTimeout(gate, 0);
    JK.url.clear();
  });
  el['surgery_type'].addEventListener('change', gate);

  // A schedule reopened from a link or QR code renders straight away.
  var params = JK.url.read();
  if (params.t) {
    var v0 = fromParams(params);
    fillForm(v0);
    if (validate(v0)) render(v0); else gate();
  } else {
    gate();
  }
})();
