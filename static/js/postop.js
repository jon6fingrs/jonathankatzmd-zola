/* Post-op eye drop schedule generator.
 * Direct port of the WordPress theme's page-generate-postop-drop-schedule.php.
 * All timing rules are preserved exactly; only the runtime moved from PHP to the browser.
 */
(function () {
  'use strict';

  var ANTIBIOTIC_SURGERIES = [
    'Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni',
    'Pterygium Surgery', 'Tube Shunt Surgery', 'Trabeculectomy'
  ];
  var NSAID_SURGERIES = ['Cataract Surgery', 'Cataract Surgery + MIGS'];
  var OINTMENT_SURGERIES = ['Tube Shunt Surgery', 'Trabeculectomy'];
  var QID_NSAIDS = ['Ketorolac', 'Diclofenac', 'Flurbiprofen'];
  var DAILY_NSAIDS = ['Prolensa', 'Bromfenac'];

  function durationFor(surgery) {
    switch (surgery) {
      case 'Tube Shunt Surgery': return 42;
      case 'Trabeculectomy':     return 84;
      case 'Micropulse CPC':     return 28;
      case 'Standard CPC':       return 42;
      case 'Standalone Omni':
      case 'Pterygium Surgery':
      case 'Cataract Surgery + MIGS':
                                 return 28;
      default:                   return 28;
    }
  }

  function steroidCount(surgery, steroid, day) {
    var taper4 = function () {
      if (day < 7)  return 4;
      if (day < 14) return 3;
      if (day < 21) return 2;
      if (day < 28) return 1;
      return 0;
    };
    var taperPMB = function () {
      if (day < 14) return 3;
      if (day < 28) return 2;
      return 0;
    };
    var taper8over42 = function () {
      if (day < 7)  return 8;
      if (day < 14) return 6;
      if (day < 21) return 4;
      if (day < 28) return 3;
      if (day < 35) return 2;
      if (day < 42) return 1;
      return 0;
    };

    switch (surgery) {
      case 'Cataract Surgery':
      case 'Cataract Surgery + MIGS':
      case 'Standalone Omni':
      case 'Pterygium Surgery':
        if (steroid === 'Prednisolone Acetate') return taper4();
        if (steroid === 'Pred-Moxi-Brom')       return taperPMB();
        return 0;
      case 'Tube Shunt Surgery':
      case 'Standard CPC':
        return taper8over42();
      case 'Trabeculectomy':
        if (day < 14) return 8;
        if (day < 28) return 6;
        if (day < 42) return 4;
        if (day < 56) return 3;
        if (day < 70) return 2;
        if (day < 84) return 1;
        return 0;
      case 'Micropulse CPC':
        return taper4();
      default:
        return 0;
    }
  }

  function nsaidCount(nsaid, day) {
    if (QID_NSAIDS.indexOf(nsaid) !== -1)   return day < 28 ? 4 : 0;
    if (DAILY_NSAIDS.indexOf(nsaid) !== -1) return day < 28 ? 1 : 0;
    return 0;
  }

  // Parse "YYYY-MM-DD" without timezone drift.
  function parseISODate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }
  function addDays(d, n) {
    return new Date(d.getTime() + n * 86400000);
  }
  function fmtISO(d) {
    return d.toISOString().slice(0, 10);
  }
  function todayUTC() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  function checkboxes(n) {
    var out = '';
    for (var i = 0; i < n; i++) out += '<input type="checkbox"> ';
    return out;
  }
  function cell(count) {
    if (count > 4) return '<td>' + count + 'x/day</td>';
    return '<td class="checkbox-spacing">' + checkboxes(count) + '</td>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function buildSchedule(v) {
    var surgery = v.surgeryType;
    var start = addDays(parseISODate(v.surgeryDate) || todayUTC(), 1);
    var duration = durationFor(surgery);

    var showAbx  = !!v.antibiotic && ANTIBIOTIC_SURGERIES.indexOf(surgery) !== -1;
    var showSter = !!v.steroid;
    var showNsd  = !!v.nsaid && NSAID_SURGERIES.indexOf(surgery) !== -1;
    var showOint = !!v.ointment && OINTMENT_SURGERIES.indexOf(surgery) !== -1;

    var h = '<div class="surgery-name">' + esc(surgery) + '</div>';
    h += '<div class="table-wrapper"><table class="schedule-table"><thead><tr><th>Date</th>';
    if (showAbx)  h += '<th>Antibiotic (' + esc(v.antibiotic) + ')</th>';
    if (showSter) h += '<th>Steroid ('    + esc(v.steroid)    + ')</th>';
    if (showNsd)  h += '<th>NSAID ('      + esc(v.nsaid)      + ')</th>';
    if (showOint) h += '<th>Ointment ('   + esc(v.ointment)   + ')</th>';
    h += '</tr></thead><tbody>';

    for (var day = 0; day < duration; day++) {
      h += '<tr><td>' + fmtISO(addDays(start, day)) + '</td>';
      if (showAbx)  h += cell(day < 7 ? 4 : 0);
      if (showSter) h += cell(steroidCount(surgery, v.steroid, day));
      if (showNsd)  h += cell(nsaidCount(v.nsaid, day));
      if (showOint) h += cell(day < 14 ? 1 : 0);
      h += '</tr>';
    }

    h += '</tbody></table></div>';
    h += '<div class="button-container">'
       + '<button type="button" onclick="window.print()">Print Schedule</button>'
       + '<button type="button" id="jk-postop-back">Back</button>'
       + '<label class="jk-printopt"><input type="checkbox" class="jk-landscape"> Landscape</label>'
       + '</div>';
    return h;
  }

  // See the note in dropform.js: keeps the browser's print header useful.
  var pageTitle = document.title;
  function printTitle(label) {
    var brand = document.querySelector('.jk-brand__title');
    document.title = label ? label + (brand ? ' \u2014 ' + brand.textContent.trim() : '') : pageTitle;
  }


  // Orientation is a print-dialog setting the page can't read, so offer it
  // here: ticking the box injects an @page rule. Lets you try both without
  // hunting through the dialog.
  function setLandscape(on) {
    var id = 'jk-page-orientation';
    var el = document.getElementById(id);
    if (on) {
      if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
      el.textContent = '@media print{@page{size: letter landscape;}}';
    } else if (el) {
      el.remove();
    }
  }

  function wireLandscape(root) {
    var cb = root.querySelector('.jk-landscape');
    if (!cb) return;
    cb.checked = !!document.getElementById('jk-page-orientation');
    cb.addEventListener('change', function () { setLandscape(cb.checked); });
  }

  function init() {
    var form = document.getElementById('jk-postop-form');
    var out  = document.getElementById('jk-postop-result');
    if (!form || !out) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // form.elements[...] rather than form.<name>: named access on a form
      // is shadowed by HTMLFormElement's own properties for some names, so
      // elements[] is the reliable lookup.
      var el = form.elements;
      var v = {
        surgeryDate: el['surgery_date'].value,
        surgeryType: el['surgery_type'].value,
        steroid:     el['steroid'].value,
        antibiotic:  el['antibiotic'].value,
        nsaid:       el['nsaid'].value,
        ointment:    el['ointment'].value
      };
      if (!v.surgeryType) { el['surgery_type'].focus(); return; }

      // Without at least one medication that applies to this surgery, the
      // schedule would be a column of bare dates and nothing else. The
      // original WordPress form required a steroid; this guards the same
      // case, including a medication that doesn't apply to the surgery type
      // chosen (e.g. an NSAID with a trabeculectomy).
      var hasAbx  = v.antibiotic && ANTIBIOTIC_SURGERIES.indexOf(v.surgeryType) !== -1;
      var hasNsd  = v.nsaid      && NSAID_SURGERIES.indexOf(v.surgeryType) !== -1;
      var hasOint = v.ointment   && OINTMENT_SURGERIES.indexOf(v.surgeryType) !== -1;
      if (!v.steroid && !hasAbx && !hasNsd && !hasOint) {
        el['steroid'].focus();
        window.alert('Select at least one medication for this surgery type.');
        return;
      }

      out.innerHTML = buildSchedule(v);
      form.hidden = true;
      out.hidden = false;
      printTitle(v.surgeryType + ' Drop Schedule');
      // Only 2-4 columns but up to 84 rows, so portrait fits more days per
      // page. Left in portrait by default; the checkbox overrides.
      setLandscape(false);
      wireLandscape(out);
      document.getElementById('jk-postop-back').addEventListener('click', function () {
        out.hidden = true;
        form.hidden = false;
        printTitle(null);
        window.scrollTo(0, 0);
      });
      window.scrollTo(0, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
