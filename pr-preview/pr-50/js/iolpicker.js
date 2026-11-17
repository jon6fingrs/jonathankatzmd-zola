/* Lens implant picker (content/learn/lens-implants.md, "Which lens might
 * fit you"). Questions about what the patient wants after surgery, a folding
 * checklist of eye conditions, and every kind of lens sorted into good fits,
 * possible with trade-offs, and usually not advised, each with its reasons.
 * The rules are in iolpicker-rules.js, which is tested.
 *
 * The questions are built once; only the result is redrawn, so the open
 * checklist and focus stay put.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-iolp');
  var R = window.JKIolPicker;
  if (!root || !R) return;

  var QUESTIONS = [
    { key: 'glasses', label: 'After surgery, what would you like to do without glasses?', values: [['readers', 'See far; reading glasses are fine'], ['near', 'Read up close; glasses for distance'], ['computer', 'Far and computer or dashboard'], ['none', 'As little glasses as possible, reading too']] },
    { key: 'night', label: 'Do you drive a lot at night, or would halos around lights bother you?', values: [['', 'No'], ['1', 'Yes']] },
    { key: 'monovision', label: 'Have you tried monovision with contact lenses (one eye for distance, one for near)?', values: [['never', 'Never tried'], ['liked', 'Yes, liked it'], ['disliked', 'Yes, did not like it']] },
    { key: 'adjust', label: 'Would you come back for several short light treatments, and wear UV-protective glasses for a few weeks, to fine-tune the result?', values: [['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']] },
    { key: 'astig', label: 'Have you been told you have astigmatism?', values: [['unknown', 'Not sure'], ['yes', 'Yes'], ['no', 'No']] }
  ];
  var HEADS = {
    good: ['Good fits', 'Match what you want, with nothing in your answers against them.'],
    possible: ['Possible, with trade-offs', 'Could work; the reasons say what to weigh.'],
    avoid: ['Usually not advised', 'Something in your answers argues against these.']
  };
  var state = { glasses: 'readers', night: '', monovision: 'never', adjust: '', astig: 'unknown', conditions: {} };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var h = '<div class="jk-tears__qs"><h3 class="jk-tears__head">What you want afterward</h3>';
  QUESTIONS.forEach(function (q) {
    if (q.key === 'astig') h += '<h3 class="jk-tears__head jk-iolp__sub">Your eyes</h3>';
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

  function render() {
    root.querySelectorAll('[data-q]').forEach(function (b) {
      var on = state[b.getAttribute('data-q')] === b.getAttribute('data-v');
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    var n = Object.keys(state.conditions).length;
    count.textContent = n ? '(' + n + ' checked)' : '(none checked)';
    var res = R.pick({ glasses: state.glasses, night: !!state.night, monovision: state.monovision, adjust: state.adjust, astig: state.astig, conditions: state.conditions });
    var o = '';
    if (!res.groups[0].lenses.length) o += '<p class="jk-iolp__none">No lens fits everything you want. The trade-offs below are the ones to talk through with your surgeon.</p>';
    res.groups.forEach(function (g) {
      if (!g.lenses.length) return;
      o += '<div class="jk-iolp__grp jk-iolp__grp--' + g.verdict + '"><h3 class="jk-tears__head">' + HEADS[g.verdict][0] + '</h3><p class="jk-iolp__grphint">' + HEADS[g.verdict][1] + '</p><div class="jk-tears__cards">';
      g.lenses.forEach(function (l) {
        o += '<div class="jk-tears__card jk-iolp__card"><strong><a href="#' + l.anchor + '">' + esc(l.name) + '</a></strong>';
        var tags = [];
        if (l.toric) tags.push('toric version');
        if (l.extra) tags.push('often extra cost');
        if (tags.length) o += ' <span class="jk-iolp__tags">' + tags.map(function (t) { return '<span class="jk-iolp__tag">' + esc(t) + '</span>'; }).join('') + '</span>';
        o += '<p>' + esc(l.what) + '</p>';
        if (l.why.length) o += '<ul class="jk-iolp__why">' + l.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
        o += '</div>';
      });
      o += '</div></div>';
    });
    o += '<ul class="jk-tears__notes">' + res.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    out.innerHTML = o;
  }
  root.addEventListener('click', function (e) {
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
