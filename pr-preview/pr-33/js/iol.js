/* Lens implant chooser (content/learn/lens-implants.md).
 *
 * Pick a kind of lens implant and see three everyday scenes through it: far
 * (across the street), arm's length (the kitchen counter) and near (a page),
 * with a night view for halos and a switch for astigmatism. The scene photos
 * are the vision simulator's (static/images/vision/).
 *
 * Nothing animates: each choice sets a CSS blur, a faint offset "ghost" copy
 * for uncorrected astigmatism, and ring-shaped halo gradients around the
 * lights at night. The numbers in LENSES are illustrations of the usual
 * pattern, not a measurement; the page says so.
 *
 * Phones show one distance at a time (chips), with a strip rating all three;
 * from 768px all three photos sit side by side.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-iol');
  if (!root) return;
  var BASE = new URL(root.getAttribute('data-base') || './', window.location.href).href;

  // lights: where halos sit, in % of the photo (as in vision.js)
  var SCENES = {
    street: { file: 'street.webp', w: 960, h: 640, lights: [] },
    night: { file: 'night.webp', w: 1400, h: 933,
      lights: [[13.6, 37.5], [35.6, 67.3], [53.9, 68], [58.9, 65.2], [77, 59], [88.5, 54], [61.5, 91], [73, 78], [86, 70], [92.7, 59]] },
    kitchen: { file: 'kitchen.webp', w: 1024, h: 683, lights: [[47.7, 16.7]] },
    reading: { file: 'reading.webp', w: 960, h: 641, lights: [] }
  };
  var DISTANCES = [
    { id: 'far', label: 'Far', sub: 'across the street', day: 'street', night: 'night' },
    { id: 'mid', label: 'Arm’s length', sub: 'counter, dashboard, computer', day: 'kitchen', night: 'kitchen' },
    { id: 'near', label: 'Near', sub: 'a book or phone', day: 'reading', night: 'reading' }
  ];

  // blur in px at each distance; contrast; halo size (0 none, 1 mild, 2 rings)
  var LENSES = [
    { id: 'mono', label: 'Monofocal', blur: { far: 0, mid: 1.8, near: 3.6 }, contrast: 1, halo: 0,
      text: 'Set for distance, the usual choice. Far is clear, arm’s length is a little soft, and reading needs glasses. Crisp at night.' },
    { id: 'mononear', label: 'Monofocal for near', blur: { far: 3.6, mid: 1.4, near: 0 }, contrast: 1, halo: 0,
      text: 'The same lens set for reading instead. Near is clear without glasses, and glasses are worn for driving and distance. Some people who were nearsighted all their lives prefer this.' },
    { id: 'monovision', label: 'Monovision', blur: { far: 0.5, mid: 1, near: 0.8 }, contrast: 1, halo: 0, toricIfNeeded: true,
      text: 'Monofocal lenses with one eye set for distance and the other for near; the brain uses whichever eye is clear. Many people manage most things without glasses, with slightly less depth perception. It is often tried with contact lenses first.' },
    { id: 'toric', label: 'Toric', blur: { far: 0, mid: 1.8, near: 3.6 }, contrast: 1, halo: 0, toric: true,
      text: 'A monofocal lens that also corrects astigmatism, so distance is sharp without the smearing that astigmatism causes. With “This eye has astigmatism” on, compare it with a plain monofocal.' },
    { id: 'edof', label: 'Extended depth', blur: { far: 0, mid: 0.2, near: 1.7 }, contrast: 0.95, halo: 1, toricIfNeeded: true,
      text: 'Stretches clear vision from far to arm’s length; reading small print usually still needs light reading glasses. Mild halos around lights at night for some people.' },
    { id: 'multi', label: 'Multifocal', blur: { far: 0.3, mid: 0.4, near: 0.3 }, contrast: 0.86, halo: 2, toricIfNeeded: true,
      text: 'Splits light between distances, so far, arm’s length and near are all usable without glasses for most people. The trade-offs are rings or halos around lights at night and a little less contrast, which matters more if the eye also has glaucoma or macular disease.' }
  ];
  var ASTIG_GHOST = 3.2;   // px offset of the ghost image with uncorrected astigmatism

  var state = { lens: 'mono', night: false, astig: false, dist: 'far' };

  function lensById(id) { for (var i = 0; i < LENSES.length; i++) if (LENSES[i].id === id) return LENSES[i]; return LENSES[0]; }
  function level(px) { return px <= 0.6 ? 2 : px <= 2 ? 1 : 0; }
  var RATING = ['Glasses needed', 'Usable, a little soft', 'Clear'];
  var DOT = ['jk-iol__dot--no', 'jk-iol__dot--some', 'jk-iol__dot--yes'];

  // ---------- markup ----------
  var h = '<div class="jk-chips jk-iol__lenses" role="group" aria-label="Kind of lens implant">';
  LENSES.forEach(function (l) { h += '<button type="button" class="jk-chip" data-lens="' + l.id + '" aria-pressed="false">' + l.label + '</button>'; });
  h += '</div><div class="jk-iol__opts">'
    + '<label class="jk-iol__opt"><input type="checkbox" id="jk-iol-night"> At night</label>'
    + '<label class="jk-iol__opt"><input type="checkbox" id="jk-iol-astig"> This eye has astigmatism</label>'
    + '</div>'
    + '<div class="jk-chips jk-iol__tabs" role="group" aria-label="Distance">';
  DISTANCES.forEach(function (d) { h += '<button type="button" class="jk-chip" data-dist="' + d.id + '" aria-pressed="false">' + d.label + '</button>'; });
  h += '</div><div class="jk-iol__panes" data-show="far">';
  DISTANCES.forEach(function (d) {
    h += '<figure class="jk-iol__pane" data-pane="' + d.id + '">'
      + '<div class="jk-iol__photo"><img class="jk-iol__img" alt="" decoding="async"><img class="jk-iol__ghost" alt="" decoding="async" aria-hidden="true"><div class="jk-iol__halo"></div></div>'
      + '<figcaption><strong>' + d.label + '</strong> <span class="jk-iol__sub">' + d.sub + '</span><span class="jk-iol__rate"></span></figcaption></figure>';
  });
  h += '</div><ul class="jk-iol__strip" aria-hidden="true">';
  DISTANCES.forEach(function (d) { h += '<li data-strip="' + d.id + '"><span class="jk-iol__dot"></span>' + d.label + '</li>'; });
  h += '</ul><p class="jk-iol__text" id="jk-iol-text" aria-live="polite"></p>';
  root.innerHTML = h;

  var lensBtns = root.querySelectorAll('[data-lens]'), distBtns = root.querySelectorAll('[data-dist]');
  var panes = root.querySelector('.jk-iol__panes'), textEl = document.getElementById('jk-iol-text');
  var nightBox = document.getElementById('jk-iol-night'), astigBox = document.getElementById('jk-iol-astig');

  function halos(scene, kind) {
    if (!kind || !scene.lights.length) return 'none';
    return scene.lights.map(function (p) {
      var at = 'circle at ' + p[0] + '% ' + p[1] + '%';
      return kind === 2
        ? 'radial-gradient(' + at + ', rgba(255,240,205,.5) 0, transparent 1.6%, transparent 2.6%, rgba(255,236,190,.55) 3.4%, rgba(255,236,190,.25) 4.6%, transparent 5.6%)'
        : 'radial-gradient(' + at + ', rgba(255,240,205,.55) 0, rgba(255,236,190,.22) 2.2%, transparent 3.8%)';
    }).join(', ');
  }

  function render() {
    // Lenses chosen to do without glasses come in toric versions, and the
    // toric one is used when the eye has astigmatism, so only the plain
    // monofocals are shown with it uncorrected.
    var lens = lensById(state.lens), astigOff = state.astig && !lens.toric && !lens.toricIfNeeded;
    DISTANCES.forEach(function (d) {
      var pane = root.querySelector('[data-pane="' + d.id + '"]'), scene = SCENES[state.night ? d.night : d.day];
      var img = pane.querySelector('.jk-iol__img'), ghost = pane.querySelector('.jk-iol__ghost'), halo = pane.querySelector('.jk-iol__halo');
      var src = BASE + scene.file;
      if (img.getAttribute('src') !== src) { img.src = src; ghost.src = src; img.width = scene.w; img.height = scene.h; }
      var blur = lens.blur[d.id] + (astigOff ? 0.6 : 0);
      var f = 'blur(' + blur.toFixed(1) + 'px)' + (lens.contrast < 1 ? ' contrast(' + lens.contrast + ')' : '') + (state.night && d.id === 'far' ? ' brightness(1.05)' : '');
      img.style.filter = f;
      ghost.style.filter = f;
      ghost.style.opacity = astigOff ? '0.45' : '0';
      ghost.style.transform = astigOff ? 'translate(' + ASTIG_GHOST + 'px,' + (-ASTIG_GHOST * 0.6).toFixed(1) + 'px)' : 'none';
      halo.style.backgroundImage = state.night ? halos(scene, lens.halo) : 'none';
      var lv = level(blur) - (astigOff && level(blur) === 2 ? 1 : 0);
      img.alt = d.label + ' through a ' + lens.label.toLowerCase() + ' lens: ' + RATING[lv].toLowerCase();
      pane.querySelector('.jk-iol__rate').textContent = RATING[lv];
      pane.querySelector('.jk-iol__rate').className = 'jk-iol__rate jk-iol__rate--' + lv;
      var dot = root.querySelector('[data-strip="' + d.id + '"] .jk-iol__dot');
      dot.className = 'jk-iol__dot ' + DOT[lv];
    });
    lensBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lens') === state.lens)); b.classList.toggle('is-active', b.getAttribute('data-lens') === state.lens); });
    distBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dist') === state.dist)); b.classList.toggle('is-active', b.getAttribute('data-dist') === state.dist); });
    panes.setAttribute('data-show', state.dist);
    nightBox.checked = state.night; astigBox.checked = state.astig;
    textEl.textContent = lens.text + (!state.astig || lens.toric ? ''
      : lens.toricIfNeeded ? ' With astigmatism, toric versions of these lenses are used, so the astigmatism is corrected too.'
      : ' With astigmatism left uncorrected, everything is a little smeared and lights may streak; glasses, or a toric version of the lens, fix that.');
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-lens')) {
      state.lens = b.getAttribute('data-lens');
      if (state.lens === 'toric') state.astig = true;
      render();
    } else if (b.hasAttribute('data-dist')) { state.dist = b.getAttribute('data-dist'); render(); }
  });
  nightBox.addEventListener('change', function () { state.night = nightBox.checked; render(); });
  astigBox.addEventListener('change', function () { state.astig = astigBox.checked; render(); });
  render();
})();
