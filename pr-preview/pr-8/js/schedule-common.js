/* Shared helpers for the two schedule generators (postop.js, dropform.js).
 *
 *   JK.date     — "YYYY-MM-DD" parsing/formatting without timezone drift
 *   JK.doseTimes— times of day for N doses (used for the calendar export
 *                 and the printed daily routine)
 *   JK.ics      — build and download an .ics calendar file
 *   JK.qr       — render a QR code (vendor/qrcode.js) for the page URL
 *   JK.url      — read/write the form state in the query string so a
 *                 schedule can be reopened from a link or a QR code
 *   JK.print    — document title swap + landscape toggle for printing
 *
 * No dependencies beyond vendor/qrcode.js (loaded only where QR is used).
 */
(function () {
  'use strict';

  var DAY = 86400000;

  // ---------- dates (all "calendar" dates are UTC-midnight Date objects) ----------
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  function today() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }
  function toISO(d) { return d.toISOString().slice(0, 10); }
  // "Sat, Oct 3"
  function fmtShort(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  // "Saturday, October 3, 2026"
  function fmtLong(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  // "Oct 3 – Oct 9"
  function fmtRange(a, b) {
    var o = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    return a.toLocaleDateString('en-US', o) + ' \u2013 ' + b.toLocaleDateString('en-US', o);
  }

  // ---------- dose times ----------
  // Spread N doses across the waking day. Fixed, familiar times for the
  // common counts; evenly spaced between 8am and 9pm beyond that.
  var FIXED = {
    1: ['09:00'],
    2: ['09:00', '21:00'],
    3: ['09:00', '15:00', '21:00'],
    4: ['08:00', '12:00', '16:00', '20:00']
  };
  function doseTimes(n) {
    n = Math.max(0, n | 0);
    if (n === 0) return [];
    if (FIXED[n]) return FIXED[n].slice();
    var startMin = 8 * 60, endMin = 21 * 60, out = [];
    var step = (endMin - startMin) / (n - 1);
    for (var i = 0; i < n; i++) {
      var m = Math.round((startMin + i * step) / 15) * 15;
      out.push(pad(Math.floor(m / 60)) + ':' + pad(m % 60));
    }
    return out;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // "09:00" -> "9:00 AM"
  function fmtTime(hhmm) {
    var p = hhmm.split(':'), h = +p[0], m = p[1];
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + m + ' ' + ap;
  }
  // add minutes to "HH:MM"
  function shiftTime(hhmm, minutes) {
    var p = hhmm.split(':'), t = (+p[0]) * 60 + (+p[1]) + minutes;
    t = Math.max(0, Math.min(23 * 60 + 59, t));
    return pad(Math.floor(t / 60)) + ':' + pad(t % 60);
  }

  // ---------- ics ----------
  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function icsDate(d) { return toISO(d).replace(/-/g, ''); }
  // RFC 5545 lines are folded at 75 octets
  function fold(line) {
    var out = '', s = line;
    while (s.length > 73) { out += s.slice(0, 73) + '\r\n '; s = s.slice(73); }
    return out + s;
  }
  /*
   * events: [{ summary, description, start (Date, UTC-midnight), end (Date,
   *            inclusive), time "HH:MM", alarm (bool) }]
   * Times are written as floating local time (no TZID) on purpose: the
   * patient's calendar interprets "8:00" as 8:00 wherever they are.
   */
  function buildICS(events, calName) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jonathankatzmd.com//Eye Drop Schedule//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape(calName || 'Eye Drop Schedule')
    ];
    events.forEach(function (ev, i) {
      var t = ev.time.replace(':', '') + '00';
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + stamp + '-' + i + '@jonathankatzmd.com');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART:' + icsDate(ev.start) + 'T' + t);
      lines.push('DTEND:' + icsDate(ev.start) + 'T' + shiftTime(ev.time, 10).replace(':', '') + '00');
      if (ev.end && ev.end.getTime() > ev.start.getTime()) {
        lines.push('RRULE:FREQ=DAILY;UNTIL=' + icsDate(ev.end) + 'T235959');
      }
      lines.push('SUMMARY:' + icsEscape(ev.summary));
      if (ev.description) lines.push('DESCRIPTION:' + icsEscape(ev.description));
      if (ev.alarm !== false) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.summary), 'TRIGGER:PT0M', 'END:VALARM');
      }
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function downloadICS(text, filename) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'eye-drop-schedule.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  // Turn a per-day count function into contiguous phases:
  // [{start, end, count}] for days where count > 0.
  function phases(startDate, duration, countFor) {
    var out = [], cur = null;
    for (var day = 0; day < duration; day++) {
      var c = countFor(day);
      if (cur && cur.count === c) { cur.end = addDays(startDate, day); continue; }
      cur = null;
      if (c > 0) { cur = { start: addDays(startDate, day), end: addDays(startDate, day), count: c }; out.push(cur); }
    }
    return out;
  }

  // ---------- qr ----------
  // Renders into `el` (emptied first). Returns false if the library is absent.
  function renderQR(el, text, sizePx) {
    if (!window.qrcode || !el) return false;
    var q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    var svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', sizePx || 132);
      svg.setAttribute('height', sizePx || 132);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'QR code linking to this schedule');
    }
    return true;
  }

  // ---------- url state ----------
  function readParams() {
    var out = {}, q = window.location.search.replace(/^\?/, '');
    if (!q) return out;
    q.split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' ');
      var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      out[k] = v;
    });
    return out;
  }
  function writeParams(obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === '' || v == null) return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    var url = window.location.pathname + (parts.length ? '?' + parts.join('&') : '');
    try { history.replaceState(null, '', url); } catch (e) { /* file:// etc. */ }
    return window.location.origin + url;
  }
  function clearParams() {
    try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
  }

  // ---------- print ----------
  var pageTitle = document.title;
  // The browser prints the document title in its own page header; swap it
  // while a schedule is on screen so the printout is labelled sensibly.
  function printTitle(label) {
    var brand = document.querySelector('.jk-brand__title');
    document.title = label ? label + (brand ? ' \u2014 ' + brand.textContent.trim() : '') : pageTitle;
  }
  // Orientation is a print-dialog setting the page can't read, so offer it
  // as a checkbox that injects an @page rule.
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

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  window.JK = {
    date: { parseISO: parseISO, today: today, addDays: addDays, toISO: toISO, fmtShort: fmtShort, fmtLong: fmtLong, fmtRange: fmtRange },
    doseTimes: doseTimes, fmtTime: fmtTime, shiftTime: shiftTime,
    ics: { build: buildICS, download: downloadICS, phases: phases },
    qr: { render: renderQR },
    url: { read: readParams, write: writeParams, clear: clearParams },
    print: { title: printTitle, setLandscape: setLandscape, wireLandscape: wireLandscape },
    esc: esc
  };
})();
