/* Artificial tears picker (content/learn/choosing-artificial-tears.md).
 * A few yes/no questions; the answer is which kinds of tear to use and
 * when, with example products and photos, and the full list that fits
 * (static/data/artificial-tears.json, from each product's DailyMed label).
 * The advice and the product choice are in tearpicker-rules.js, which is
 * tested.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-tears');
  var R = window.JKTearPicker;
  if (!root || !R) return;
  var DATA = new URL(root.getAttribute('data-products') || './', window.location.href).href;
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
  var list = [];
  var PACK = { bottle: 'bottle', vials: 'single-use vials', tube: 'tube' };
  var SHOWN = 4;

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
  // one product in the full list: what the label says
  function item(x) {
    var bits = [PACK[x.pack] || x.pack, x.pf ? 'preservative-free' : 'preservative: ' + x.preservative];
    if (x.lenses === 'ok') bits.push('label: can be used with contacts');
    else if (x.lenses === 'remove') bits.push('label: remove contacts first');
    if (x.lanolin === false) bits.push('no lanolin');
    return '<li><a href="https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=' + encodeURIComponent(x.setid) + '" rel="noopener" target="_blank">' + esc(x.name) + '</a> <span>' + esc(bits.join(' \u00b7 ')) + '</span></li>';
  }
  function render() {
    root.querySelectorAll('[data-q]').forEach(function (b) {
      var on = state[b.getAttribute('data-q')] === b.getAttribute('data-v');
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    var answers = { often: state.often, contacts: !!state.contacts, sensitive: !!state.sensitive, lasting: !!state.lasting, night: !!state.night, oil: !!state.oil };
    var res = R.pick(answers);
    var o = '<h3 class="jk-tears__head">What to look for</h3><div class="jk-tears__cards">';
    res.picks.forEach(function (p) {
      var k = R.KINDS[p.kind], ps = R.products(list, p, answers), ex = ps.slice(0, SHOWN);
      o += '<div class="jk-tears__card"><span class="jk-tears__when">' + esc(p.when) + '</span><strong>' + esc(k.name) + '</strong><p>' + esc(k.how) + '</p><p class="jk-tears__why">' + esc(p.why) + '</p>';
      if (ex.length) {
        o += '<p class="jk-tears__brands">Examples: ' + esc(ex.map(function (x) { return x.name; }).join(', ')) + '</p>';
        var ph = ex.filter(function (x) { return x.photo; });
        if (ph.length) o += '<div class="jk-tears__photos">' + ph.map(function (x) { return '<img src="' + PHOTOS + encodeURIComponent(x.photo) + '" alt="' + esc(x.name) + '" title="' + esc(x.name) + '" loading="lazy">'; }).join('') + '</div>';
        o += '<details class="jk-tears__all"><summary>All ' + ps.length + ' that fit</summary><ul>' + ps.map(item).join('') + '</ul></details>';
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
  // products and photos load after; the advice shows without them
  fetch(DATA).then(function (r) { return r.json(); }).then(function (d) {
    list = d;
    render();
  }).catch(function () {});
  root.classList.add('is-ready');
})();
