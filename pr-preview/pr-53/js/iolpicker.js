/* Lens implant picker (content/learn/lens-implants.md, "Which lens might
 * fit you"). Questions about what the patient wants after surgery, a folding
 * checklist of eye conditions, and every kind of lens sorted into good fits,
 * possible with trade-offs, and usually not advised, each with its reasons.
 * The rules are in iolpicker-rules.js, which is tested.
 *
 * The questions are built once; only the result is redrawn, so the open
 * checklist and focus stay put.
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

  var QUESTIONS = [
    { key: 'glasses', short: 'Without glasses', label: 'After surgery, what would you like to do without glasses?', values: [['readers', 'See far; reading glasses are fine'], ['near', 'Read up close; glasses for distance'], ['computer', 'Far and computer or dashboard'], ['none', 'As little glasses as possible, reading too']] },
    { key: 'night', short: 'Glare at night', label: 'How much would glare or halos around lights at night bother you?', values: [['', 'Not at all'], ['some', 'A little would be OK'], ['yes', 'Any would bother me, or I drive a lot at night']] },
    { key: 'monovision', short: 'Monovision in contacts', label: 'Have you tried monovision with contact lenses (one eye for distance, one for near)?', values: [['never', 'Never tried'], ['liked', 'Yes, liked it'], ['disliked', 'Yes, did not like it']] },
    { key: 'adjust', short: 'Light treatments', label: 'Would you come back for several short light treatments, and wear UV-protective glasses for a few weeks, to fine-tune the result?', values: [['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']] },
    { key: 'eyes', short: 'Eyes having surgery', label: 'Which eyes are having cataract surgery?', values: [['both', 'Both eyes'], ['one', 'Just one eye'], ['only', 'My only seeing eye']] },
    { key: 'refractive', short: 'LASIK, PRK or RK', label: 'Have you had laser vision correction or RK?', values: [['no', 'No'], ['myopic', 'LASIK or PRK for nearsightedness'], ['hyperopic', 'LASIK or PRK for farsightedness'], ['lasik', 'LASIK or PRK, not sure which'], ['rk', 'RK (radial cuts)']] },
    { key: 'astig', short: 'Astigmatism', label: 'Have you been told you have astigmatism?', values: [['unknown', 'Not sure'], ['no', 'No'], ['little', 'Yes, a little'], ['more', 'Yes, more than a little']] }
  ];
  var HEADS = {
    good: ['Good fits', 'Match what you want, with nothing in your answers against them.'],
    possible: ['Possible, with trade-offs', 'Could work; the reasons say what to weigh.'],
    avoid: ['Usually not advised', 'Something in your answers argues against these.']
  };
  var state = { glasses: 'readers', night: '', monovision: 'never', adjust: '', astig: 'unknown', refractive: 'no', eyes: 'both', conditions: {} };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var h = '<div class="jk-tears__qs"><h3 class="jk-tears__head">What you want afterward</h3>';
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
  h += '</details></div><div class="jk-tears__out" id="jk-iolp-out" aria-live="polite"></div>';
  root.innerHTML = h;
  var out = document.getElementById('jk-iolp-out');
  var count = document.getElementById('jk-iolp-count');

  function tagsFor(l) {
    var tags = [];
    if (l.tryFirst) tags.push('try with contacts first');
    if (l.toric) tags.push('toric version');
    if (l.laserAstig) tags.push('laser treats astigmatism');
    else if (l.laser) tags.push('laser-assisted');
    if (l.extra || l.toric || l.laser) tags.push('often extra cost');
    return tags;
  }
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
    var o = '';
    if (!res.groups[0].lenses.length) o += '<p class="jk-iolp__none">No lens fits everything you want. The trade-offs below are the ones to talk through with your surgeon.</p>';
    res.groups.forEach(function (g) {
      if (!g.lenses.length) return;
      o += '<div class="jk-iolp__grp jk-iolp__grp--' + g.verdict + '"><h3 class="jk-tears__head">' + HEADS[g.verdict][0] + '</h3><p class="jk-iolp__grphint">' + HEADS[g.verdict][1] + '</p><div class="jk-tears__cards">';
      g.lenses.forEach(function (l) {
        o += '<div class="jk-tears__card jk-iolp__card"><strong><a href="#' + l.anchor + '">' + esc(l.name) + '</a></strong>';
        var tags = tagsFor(l);
        if (tags.length) o += ' <span class="jk-iolp__tags">' + tags.map(function (t) { return '<span class="jk-iolp__tag">' + esc(t) + '</span>'; }).join('') + '</span>';
        o += '<p>' + esc(l.what) + '</p>';
        if (l.why.length) o += '<ul class="jk-iolp__why">' + l.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
        o += '</div>';
      });
      o += '</div></div>';
    });
    o += '<ul class="jk-tears__notes">' + res.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    o += '<p class="jk-iolp__printrow"><button type="button" class="btn btn-outline-primary" id="jk-iolp-print">Print a one-page summary</button> <span>for the patient or the chart</span></p>';
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
    s += '<div class="jk-iolp-sheet__cols">';
    res.groups.forEach(function (g) {
      s += '<div><h2>' + HEADS[g.verdict][0] + '</h2>';
      if (!g.lenses.length) s += '<p class="jk-iolp-sheet__none">None</p>';
      g.lenses.forEach(function (l) {
        var tags = tagsFor(l);
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
    // a long sheet (many conditions and notes) gets smaller type to stay on one page
    var words = conds.join(' ').length + res.notes.join(' ').length;
    el.classList.toggle('is-long', words > 900);
  }
  function printSheet() {
    sheet();
    document.documentElement.classList.add('jk-iolp-printing');
    window.print();
  }
  window.addEventListener('afterprint', function () { document.documentElement.classList.remove('jk-iolp-printing'); });
  root.addEventListener('click', function (e) {
    if (e.target.closest('#jk-iolp-print')) { printSheet(); return; }
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
