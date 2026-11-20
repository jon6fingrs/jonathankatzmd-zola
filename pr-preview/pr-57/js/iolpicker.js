/* Lens implant picker (content/learn/lens-implants.md, "Which lens might
 * fit you"). Questions about what the patient wants after surgery, a folding
 * checklist of eye conditions, and every kind of lens sorted into good fits,
 * possible with trade-offs, and usually not advised, each with its reasons.
 * The rules are in iolpicker-rules.js, which is tested.
 *
 * The questions are built once; only the result is redrawn, so the open
 * checklist and focus stay put. A one-line summary under the questions
 * (the only live region) shows the outcome without scrolling and links to
 * the details. Tags every recommended lens shares are shown once above the
 * cards; lenses usually not advised are a short list, not cards. "Start
 * over" clears the answers between patients. On wide screens (from 1100px,
 * see custom.css) the picker can go side by side: questions on the left,
 * results on the right kept in view; the choice is remembered per browser.
 *
 * "Print a one-page summary" builds a separate sheet (letterhead from the
 * page's hidden .jk-iolp__head, blank lines for name and eye, the answers,
 * the three groups with one reason each, the notes, and a plan box for the
 * chart), appends it to <body>, and prints only that: html.jk-iolp-printing
 * hides everything else until afterprint. Nothing typed about the patient
 * goes into the page; the blanks are filled in by hand.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-iolp');
  var R = window.JKIolPicker;
  if (!root || !R) return;

  // the questions and their starting answers are in the rules, shared with
  // the generic Lens Implant Planner
  var QUESTIONS = R.QUESTIONS;
  var HEADS = {
    good: ['Good fits', 'Match what you want, with nothing in your answers against them.'],
    possible: ['Possible, with trade-offs', 'Could work; the reasons say what to weigh.'],
    avoid: ['Usually not advised', 'Something in your answers argues against these.']
  };
  var DEFAULTS = R.DEFAULTS;
  var state = {};
  function reset() { Object.keys(DEFAULTS).forEach(function (k) { state[k] = DEFAULTS[k]; }); state.conditions = {}; }
  reset();

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var h = '<div class="jk-iolp__bar"><button type="button" class="jk-chip jk-chip--sm jk-iolp__barprint" data-print>Print summary</button><button type="button" class="jk-chip jk-chip--sm" id="jk-iolp-wide" aria-pressed="false">Side by side</button></div>' +
    '<div class="jk-iolp__layout"><div class="jk-iolp__ask"><div class="jk-tears__qs"><h3 class="jk-tears__head">What you want afterward</h3>';
  QUESTIONS.forEach(function (q) {
    if (q.key === 'eyes') h += '<h3 class="jk-tears__head jk-iolp__sub">Your eyes</h3>';
    h += '<div class="jk-tears__q"><span class="jk-vis__lab" id="jk-iq-' + q.key + '">' + esc(q.label) + '</span><div class="jk-chips" role="group" aria-labelledby="jk-iq-' + q.key + '">';
    q.values.forEach(function (v) { h += '<button type="button" class="jk-chip jk-chip--sm" data-q="' + q.key + '" data-v="' + v[0] + '" aria-pressed="false">' + esc(v[1]) + '</button>'; });
    h += '</div></div>';
  });
  h += '<details class="jk-iolp__conds"><summary>Eye conditions <span class="jk-iolp__count" id="jk-iolp-count">(none checked)</span></summary><p class="jk-iolp__hint">Check any that apply to the eye having surgery.</p>';
  R.CONDITIONS.forEach(function (g) {
    h += '<fieldset class="jk-iolp__group"><legend>' + esc(g.group) + '</legend>';
    g.items.forEach(function (it) {
      h += '<label class="jk-iolp__check"><input type="checkbox" value="' + it[0] + '"> <span>' + esc(it[1]) + '</span></label>';
    });
    h += '</fieldset>';
  });
  h += '</details></div></div><div class="jk-iolp__res"><p class="jk-iolp__summary" id="jk-iolp-sum" aria-live="polite"></p><div class="jk-tears__out" id="jk-iolp-out" tabindex="-1"></div></div></div>';
  root.innerHTML = h;
  var out = document.getElementById('jk-iolp-out');
  var count = document.getElementById('jk-iolp-count');
  var sum = document.getElementById('jk-iolp-sum');
  var wideBtn = document.getElementById('jk-iolp-wide');
  // side by side on wide screens: on unless this browser turned it off
  function setWide(on, save) {
    root.classList.toggle('is-wide', on);
    wideBtn.setAttribute('aria-pressed', String(on));
    wideBtn.classList.toggle('is-active', on);
    if (save) { try { localStorage.setItem('jk-iolp-wide', on ? '1' : '0'); } catch (e) {} }
  }
  var wideSaved = null;
  try { wideSaved = localStorage.getItem('jk-iolp-wide'); } catch (e) {}
  setWide(wideSaved !== '0', false);

  function tagsFor(l) {
    var tags = [];
    if (l.tryFirst) tags.push('try with contacts first');
    if (l.toric) tags.push('toric version');
    if (l.laserAstig) tags.push('laser treats astigmatism');
    else if (l.laser) tags.push('laser-assisted');
    if (l.extra || l.toric || l.laser) tags.push('often extra cost');
    return tags;
  }
  // tags that every recommended lens (good or possible) carries, shown once
  function sharedTags(res) {
    var ls = res.groups[0].lenses.concat(res.groups[1].lenses);
    if (ls.length < 2) return [];
    return tagsFor(ls[0]).filter(function (t) { return ls.every(function (l) { return tagsFor(l).indexOf(t) >= 0; }); });
  }
  function names(ls) { return ls.map(function (l) { return l.name; }).join(', '); }
  function answers() {
    return { glasses: state.glasses, night: state.night, monovision: state.monovision, adjust: state.adjust, astig: state.astig, refractive: state.refractive, eyes: state.eyes, conditions: state.conditions };
  }

  function render() {
    root.querySelectorAll('[data-q]').forEach(function (b) {
      var on = state[b.getAttribute('data-q')] === b.getAttribute('data-v');
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    var n = Object.keys(state.conditions).length;
    count.textContent = n ? '(' + n + ' checked)' : '(none checked)';
    var res = R.pick(answers());
    var good = res.groups[0].lenses, maybe = res.groups[1].lenses, avoid = res.groups[2].lenses;
    sum.innerHTML = (good.length ? '<b>Good fits:</b> ' + esc(names(good)) : '<b>No lens fits everything you want.</b>') +
      ' <span>\u00b7 Possible: ' + maybe.length + ' \u00b7 Not advised: ' + avoid.length + '</span> <a href="#jk-iolp-out" data-jump>See details</a> <a href="#" data-print>Print summary</a>';
    var shared = sharedTags(res);
    var o = '';
    if (!good.length) o += '<p class="jk-iolp__none">No lens fits everything you want. The trade-offs below are the ones to talk through with your surgeon.</p>';
    if (shared.length) o += '<p class="jk-iolp__shared"><span>All recommended lenses:</span> ' + shared.map(function (t) { return '<span class="jk-iolp__tag">' + esc(t) + '</span>'; }).join('') + '</p>';
    res.groups.forEach(function (g) {
      if (!g.lenses.length) return;
      if (g.verdict === 'avoid') {
        o += '<div class="jk-iolp__grp jk-iolp__grp--avoid"><h3 class="jk-tears__head">' + HEADS.avoid[0] + '</h3><ul class="jk-iolp__avoid">';
        g.lenses.forEach(function (l) { o += '<li><a href="#' + l.anchor + '">' + esc(l.name) + '</a>: ' + esc(l.why[0] || '') + '</li>'; });
        o += '</ul></div>';
        return;
      }
      o += '<div class="jk-iolp__grp jk-iolp__grp--' + g.verdict + '"><h3 class="jk-tears__head">' + HEADS[g.verdict][0] + '</h3><p class="jk-iolp__grphint">' + HEADS[g.verdict][1] + '</p><div class="jk-tears__cards">';
      g.lenses.forEach(function (l) {
        o += '<div class="jk-tears__card jk-iolp__card"><strong><a href="#' + l.anchor + '">' + esc(l.name) + '</a></strong>';
        var tags = tagsFor(l).filter(function (t) { return shared.indexOf(t) < 0; });
        if (tags.length) o += ' <span class="jk-iolp__tags">' + tags.map(function (t) { return '<span class="jk-iolp__tag">' + esc(t) + '</span>'; }).join('') + '</span>';
        o += '<p>' + esc(l.what) + '</p>';
        if (l.why.length) o += '<ul class="jk-iolp__why">' + l.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
        o += '</div>';
      });
      o += '</div></div>';
    });
    o += '<ul class="jk-tears__notes">' + res.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    o += '<p class="jk-iolp__printrow"><button type="button" class="btn btn-outline-primary" id="jk-iolp-print">Print a one-page summary</button> <button type="button" class="btn btn-outline-secondary" id="jk-iolp-reset">Start over</button></p>';
    out.innerHTML = o;
  }

  // the one-page sheet
  function sheet() {
    var res = R.pick(answers());
    var head = document.querySelector('.jk-iolp__head');
    var date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var box = '<span class="jk-iolp-sheet__box"></span>';
    var s = (head ? head.innerHTML : '') +
      '<h1>Lens implant options for cataract surgery</h1>' +
      '<p class="jk-iolp-sheet__fill"><span>Name <i></i></span><span>Date of birth <i></i></span><span>Eye ' + box + ' Right ' + box + ' Left</span></p>';
    s += '<h2>Answers</h2><dl class="jk-iolp-sheet__ans">';
    QUESTIONS.forEach(function (q) {
      var v = q.values.filter(function (x) { return x[0] === state[q.key]; })[0];
      s += '<div><dt>' + esc(q.short) + '</dt><dd>' + esc(v ? v[1] : '') + '</dd></div>';
    });
    var conds = [];
    R.CONDITIONS.forEach(function (g) { g.items.forEach(function (it) { if (state.conditions[it[0]]) conds.push(it[1]); }); });
    s += '<div class="jk-iolp-sheet__wide"><dt>Eye conditions</dt><dd>' + esc(conds.length ? conds.join('; ') : 'None checked') + '</dd></div></dl>';
    var shared = sharedTags(res);
    if (shared.length) s += '<p class="jk-iolp-sheet__shared"><b>All recommended lenses:</b> ' + esc(shared.join(' \u00b7 ')) + '</p>';
    s += '<div class="jk-iolp-sheet__cols">';
    res.groups.forEach(function (g) {
      s += '<div><h2>' + HEADS[g.verdict][0] + '</h2>';
      if (!g.lenses.length) s += '<p class="jk-iolp-sheet__none">None</p>';
      g.lenses.forEach(function (l) {
        var tags = g.verdict === 'avoid' ? [] : tagsFor(l).filter(function (t) { return shared.indexOf(t) < 0; });
        s += '<div class="jk-iolp-sheet__lens"><b>' + box + ' ' + esc(l.name) + '</b>' +
          (tags.length ? '<span class="jk-iolp-sheet__tags">' + esc(tags.join(' \u00b7 ')) + '</span>' : '') +
          '<p>' + esc(l.why[0] || l.what) + '</p></div>';
      });
      s += '</div>';
    });
    s += '</div><h2>Notes</h2><ul class="jk-iolp-sheet__notes">' + res.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    s += '<div class="jk-iolp-sheet__plan"><h2>Plan</h2>' +
      '<p><span>Lens <i></i></span><span>Target <i></i></span></p>' +
      '<p><span>Astigmatism ' + box + ' Toric ' + box + ' Laser ' + box + ' None</span><span>Laser-assisted ' + box + ' Yes ' + box + ' No</span></p>' +
      '<p><span>Surgeon <i></i></span><span>Date <i></i></span></p></div>';
    s += '<p class="jk-iolp-sheet__foot">From the lens picker on jonathankatzmd.com, Choosing a Lens Implant, printed ' + esc(date) + '. A starting point for a talk with the surgeon, not a decision; it cannot know the eye\u2019s measurements.</p>';
    var el = document.getElementById('jk-iolp-sheet');
    if (!el) { el = document.createElement('div'); el.id = 'jk-iolp-sheet'; el.className = 'jk-iolp-sheet'; document.body.appendChild(el); }
    el.innerHTML = s;
    // fit one Letter page: measure at the printed width (7.3in) against the
    // printable height (9.8in, less a little slack), stepping the type down
    el.classList.remove('is-long', 'is-tight');
    el.classList.add('is-measuring');
    var limit = 9.6 * 96;
    if (el.offsetHeight > limit) el.classList.add('is-long');
    if (el.offsetHeight > limit) { el.classList.remove('is-long'); el.classList.add('is-tight'); }
    el.classList.remove('is-measuring');
  }
  function printSheet() {
    sheet();
    document.documentElement.classList.add('jk-iolp-printing');
    window.print();
  }
  window.addEventListener('afterprint', function () { document.documentElement.classList.remove('jk-iolp-printing'); });
  root.addEventListener('click', function (e) {
    if (e.target.closest('#jk-iolp-print, [data-print]')) { e.preventDefault(); printSheet(); return; }
    if (e.target.closest('#jk-iolp-wide')) { setWide(!root.classList.contains('is-wide'), true); return; }
    if (e.target.closest('#jk-iolp-reset')) {
      reset();
      root.querySelectorAll('.jk-iolp__check input').forEach(function (c) { c.checked = false; });
      root.querySelector('.jk-iolp__conds').open = false;
      render();
      root.scrollIntoView({ block: 'start' });
      return;
    }
    if (e.target.closest('[data-jump]')) {
      e.preventDefault();
      out.scrollIntoView({ block: 'start', behavior: 'smooth' });
      out.focus({ preventScroll: true });
      return;
    }
    var b = e.target.closest('[data-q]');
    if (!b) return;
    state[b.getAttribute('data-q')] = b.getAttribute('data-v');
    render();
  });
  root.addEventListener('change', function (e) {
    var c = e.target;
    if (c.type !== 'checkbox') return;
    if (c.checked) state.conditions[c.value] = true; else delete state.conditions[c.value];
    render();
  });
  render();
  root.classList.add('is-ready');
})();
