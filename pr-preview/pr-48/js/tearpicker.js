/* Artificial tears picker (content/learn/choosing-artificial-tears.md).
 * A few yes/no questions; the answer is which kinds of tear to use and
 * when, with the brands and photos from the medication chart
 * (static/data/eye-drops.json). The advice itself is in
 * tearpicker-rules.js, which is tested.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-tears');
  var R = window.JKTearPicker;
  if (!root || !R) return;
  var DATA = new URL(root.getAttribute('data-chart') || './', window.location.href).href;
  var PHOTOS = new URL(root.getAttribute('data-photos') || './', window.location.href).href;

  var QUESTIONS = [
    { key: 'often', label: 'How often do you need tears?', values: [['low', 'Up to 4 times a day'], ['high', 'More than 4 times a day']] },
    { key: 'contacts', label: 'Do you wear contact lenses?', values: [['', 'No'], ['1', 'Yes']] },
    { key: 'sensitive', label: 'Sensitive eyes, or other eye drops every day (such as glaucoma drops)?', values: [['', 'No'], ['1', 'Yes']] },
    { key: 'lasting', label: 'Do regular tears wear off within minutes?', values: [['', 'No'], ['1', 'Yes']] },
    { key: 'night', label: 'Are your eyes worst when you wake up?', values: [['', 'No'], ['1', 'Yes']] },
    { key: 'oil', label: 'Have you been told your eyelid oil glands are blocked?', values: [['', 'No'], ['1', 'Yes']] }
  ];
  var state = { often: 'low', contacts: '', sensitive: '', lasting: '', night: '', oil: '' };
  var chart = {};

  var h = '<div class="jk-tears__qs">';
  QUESTIONS.forEach(function (q) {
    h += '<div class="jk-tears__q"><span class="jk-vis__lab" id="jk-tq-' + q.key + '">' + q.label + '</span><div class="jk-chips" role="group" aria-labelledby="jk-tq-' + q.key + '">';
    q.values.forEach(function (v) { h += '<button type="button" class="jk-chip jk-chip--sm" data-q="' + q.key + '" data-v="' + v[0] + '" aria-pressed="false">' + v[1] + '</button>'; });
    h += '</div></div>';
  });
  h += '</div><div class="jk-tears__out" id="jk-tears-out" aria-live="polite"></div>';
  root.innerHTML = h;
  var out = document.getElementById('jk-tears-out');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    root.querySelectorAll('[data-q]').forEach(function (b) {
      var on = state[b.getAttribute('data-q')] === b.getAttribute('data-v');
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    var res = R.pick({ often: state.often, contacts: !!state.contacts, sensitive: !!state.sensitive, lasting: !!state.lasting, night: !!state.night, oil: !!state.oil });
    var o = '<h3 class="jk-tears__head">What to look for</h3><div class="jk-tears__cards">';
    res.picks.forEach(function (p) {
      var k = R.KINDS[p.kind], c = chart[k.chart];
      o += '<div class="jk-tears__card"><span class="jk-tears__when">' + esc(p.when) + '</span><strong>' + esc(k.name) + '</strong><p>' + esc(k.how) + '</p><p class="jk-tears__why">' + esc(p.why) + '</p>';
      if (c) {
        if (c.brand) o += '<p class="jk-tears__brands">Examples: ' + esc(c.brand) + '</p>';
        if (c.photos && c.photos.length) o += '<div class="jk-tears__photos">' + c.photos.slice(0, 3).map(function (f) { return '<img src="' + PHOTOS + encodeURIComponent(f) + '" alt="" loading="lazy">'; }).join('') + '</div>';
      }
      o += '</div>';
    });
    o += '</div><ul class="jk-tears__notes">' + res.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    out.innerHTML = o;
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]');
    if (!b) return;
    state[b.getAttribute('data-q')] = b.getAttribute('data-v');
    render();
  });
  render();
  // brands and photos come from the chart; the advice shows without them
  fetch(DATA).then(function (r) { return r.json(); }).then(function (list) {
    list.forEach(function (d) { chart[d.generic] = d; });
    render();
  }).catch(function () {});
  root.classList.add('is-ready');
})();
