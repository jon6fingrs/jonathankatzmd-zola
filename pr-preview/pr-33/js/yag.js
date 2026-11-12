/* YAG capsulotomy demo (content/learn/yag-capsulotomy.md).
 *
 * Two panels, built here:
 *   the eye     a front view through a dilated pupil: the lens implant with
 *               the cloudy capsule behind it (inline SVG)
 *   the view    an everyday photo as the patient sees it: hazy before,
 *               clear after (scene photos shared with the vision simulator)
 *
 * "Fire laser" plays one timeline: the aiming beam, then SHOTS pulses in a
 * cross pattern, each widening the opening in the capsule while the view
 * clears. Every frame is drawn by stage(t), a pure function of the time in
 * ms, so "before" is stage(0), "after" is stage(T_END), and reduced motion
 * jumps between the two.
 *
 * The hazy view is one pre-filtered copy of the photo that only changes
 * opacity. Animating the blur itself re-rasterizes every frame and flickers
 * on phones (the same lesson as Play in vision.js).
 *
 * Layout classes are shared with the iridotomy demo (.jk-lpi in custom.css):
 * one panel at a time on a phone, both side by side from 768px.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-yag');
  if (!root) return;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = new URL(root.getAttribute('data-base') || './', window.location.href).href;
  var FONT = 'font-family="Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"';
  var INK = '#1f2937', BLUE = '#2a6ebb', MUTED = '#5b6573', GREEN = '#16a34a';

  // lights: where glare halos sit, in % of the photo (as in vision.js)
  var SCENES = [
    { id: 'reading', file: 'reading.webp', label: 'Reading', w: 960, h: 641, lights: [] },
    { id: 'street', file: 'street.webp', label: 'Outdoors', w: 960, h: 640, lights: [] },
    { id: 'night', file: 'night.webp', label: 'Night', w: 1400, h: 933,
      lights: [[13.6, 37.5], [35.6, 67.3], [53.9, 68], [58.9, 65.2], [77, 59], [88.5, 54], [61.5, 91], [73, 78], [86, 70], [92.7, 59]] }
  ];

  // ---------- timeline (ms) ----------
  // Shots land around the center in a cross, then the diagonals, the way
  // the opening is usually made.
  var C = [280, 215], R_PUPIL = 96, R_OPEN = 60;
  var SHOTS = [[0, -1], [0, 1], [-1, 0], [1, 0], [-0.7, -0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7]];
  var T_FIRST = 900, T_GAP = 420, T_END = T_FIRST + SHOTS.length * T_GAP + 900;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function lcg(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function txt(x, y, s, anchor, color, weight) {
    return '<text x="' + x + '" y="' + y + '" ' + FONT + ' font-size="22" font-weight="' + (weight || 600) + '" fill="' + (color || INK) + '" text-anchor="' + (anchor || 'start') + '">' + s + '</text>';
  }
  function lead(x1, y1, x2, y2, color) {
    color = color || MUTED;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.5"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3.5" fill="' + color + '"/>';
  }

  // the opening's ragged edge: a fixed set of radii around the circle
  var EDGE = (function () { var r = lcg(5), a = []; for (var i = 0; i < 28; i++) a.push(0.86 + 0.28 * r()); return a; })();
  function openingPath(rad) {
    if (rad < 0.5) return '';
    var d = '';
    for (var i = 0; i < EDGE.length; i++) {
      var an = i / EDGE.length * Math.PI * 2, r = rad * EDGE[i];
      d += (i ? ' L' : 'M') + (C[0] + r * Math.cos(an)).toFixed(1) + ',' + (C[1] + r * Math.sin(an)).toFixed(1);
    }
    return d + ' Z';
  }

  function eyeSvg() {
    var rnd = lcg(21), i, an, h = '<svg class="jk-lpi__svg" viewBox="0 0 560 420" role="img" aria-labelledby="jk-yag-eye-t">'
      + '<title id="jk-yag-eye-t">Front view of the eye through a dilated pupil</title>'
      + '<defs>'
      + '<radialGradient id="yag-irisg"><stop offset="0.6" stop-color="#a9764a"/><stop offset="0.85" stop-color="#8b5e3c"/><stop offset="1" stop-color="#5c3d26"/></radialGradient>'
      + '<radialGradient id="yag-scl"><stop offset="0.7" stop-color="#ffffff"/><stop offset="1" stop-color="#eef1f5"/></radialGradient>'
      + '<radialGradient id="yag-haze"><stop offset="0" stop-color="#e5e7eb"/><stop offset="0.7" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></radialGradient>'
      + '<radialGradient id="yag-clear"><stop offset="0" stop-color="#3a1512"/><stop offset="1" stop-color="#0b0f14"/></radialGradient>'
      + '<clipPath id="yag-pupil"><circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_PUPIL + '"/></clipPath>'
      + '</defs>'
      + '<rect width="560" height="420" fill="#fff"/>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="190" fill="url(#yag-scl)" stroke="#cbd5e1" stroke-width="2"/>'
      + '<g fill="none" stroke="#f2a6a6" stroke-width="1.6" stroke-linecap="round">'
      + '<path d="M96,176 C120,184 134,190 146,200"/><path d="M104,270 C122,262 134,256 146,248"/><path d="M464,170 C442,180 428,188 414,198"/><path d="M458,276 C440,266 428,258 414,250"/>'
      + '</g>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="140" fill="url(#yag-irisg)" stroke="#3f2a1a" stroke-width="3"/>'
      + '<g stroke="#5c3d26" stroke-width="2" stroke-linecap="round" opacity="0.55">';
    for (i = 0; i < 48; i++) {
      an = i / 48 * Math.PI * 2;
      var r1 = R_PUPIL + 6, r2 = 132 - (i % 4) * 5;
      h += '<line x1="' + (C[0] + r1 * Math.cos(an)).toFixed(1) + '" y1="' + (C[1] + r1 * Math.sin(an)).toFixed(1) + '" x2="' + (C[0] + r2 * Math.cos(an)).toFixed(1) + '" y2="' + (C[1] + r2 * Math.sin(an)).toFixed(1) + '"/>';
    }
    h += '</g>'
      // inside the pupil: the dark eye, the cloudy capsule, the opening, the implant's edge
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_PUPIL + '" fill="url(#yag-clear)"/>'
      + '<g clip-path="url(#yag-pupil)">'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_PUPIL + '" fill="url(#yag-haze)" opacity="0.93"/>'
      + '<g fill="#f8fafc" stroke="#94a3b8" stroke-width="1" opacity="0.85">';
    for (i = 0; i < 46; i++) { // pearls and wrinkles of the cloudy capsule
      an = rnd() * Math.PI * 2;
      var rr = Math.sqrt(rnd()) * (R_PUPIL - 6);
      h += '<circle cx="' + (C[0] + rr * Math.cos(an)).toFixed(1) + '" cy="' + (C[1] + rr * Math.sin(an)).toFixed(1) + '" r="' + (2.5 + rnd() * 5).toFixed(1) + '"/>';
    }
    h += '</g>'
      + '<path id="yag-open" fill="url(#yag-clear)" stroke="#f8fafc" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<g id="yag-bits"></g>'
      + '</g>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + (R_PUPIL - 10) + '" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.7"/>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_PUPIL + '" fill="none" stroke="#3f2a1a" stroke-width="2"/>'
      + '<ellipse cx="' + (C[0] + 58) + '" cy="' + (C[1] - 62) + '" rx="20" ry="11" fill="#fff" opacity="0.45" transform="rotate(-35 ' + (C[0] + 58) + ' ' + (C[1] - 62) + ')"/>'
      + '<circle id="yag-aim" r="8" fill="none" stroke="' + GREEN + '" stroke-width="3"/>'
      + '<circle id="yag-flash" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="3"/>'
      // labels
      + txt(20, 400, 'Iris', 'start') + lead(62, 392, C[0] - 104, C[1] + 60)
      + txt(540, 400, 'Edge of the lens implant', 'end') + lead(420, 378, C[0] + 61, C[1] + 61)
      + '<g id="yag-lab-before">' + txt(20, 34, 'Cloudy capsule', 'start', '#475569') + txt(20, 60, 'behind the implant', 'start', '#475569', 400) + lead(196, 54, C[0] - 40, C[1] - 40, '#475569') + '</g>'
      + '<g id="yag-lab-after">' + txt(20, 34, 'Clear opening', 'start', BLUE) + txt(20, 60, 'in the capsule', 'start', BLUE, 400) + lead(180, 54, C[0] - 22, C[1] - 22, BLUE) + '</g>'
      + '</svg>';
    return h;
  }

  // ---------- markup ----------
  var STEPS = {
    before: '<strong>Before.</strong> The thin capsule that holds the lens implant has turned cloudy. Light scatters on its way through, so vision is hazy and lights glare.',
    laser: '<strong>The laser.</strong> A few quick pulses, each a tiny spark, open the center of the capsule. Nothing touches the eye, and the implant stays where it is.',
    after: '<strong>After.</strong> Light passes straight through the opening. The capsule does not grow back there, so the laser rarely needs repeating.'
  };
  var scene = SCENES[0];
  var h = '<div class="jk-chips jk-lpi__tabs" role="group" aria-label="View">'
    + '<button type="button" class="jk-chip is-active" data-view="side" aria-pressed="true">The eye</button>'
    + '<button type="button" class="jk-chip" data-view="front" aria-pressed="false">What you see</button>'
    + '</div>'
    + '<div class="jk-lpi__views" data-show="side">'
    + '<figure class="jk-lpi__view" data-view="side"><figcaption>The eye: what the doctor sees</figcaption>' + eyeSvg() + '</figure>'
    + '<figure class="jk-lpi__view" data-view="front"><figcaption>What you see</figcaption>'
    + '<div class="jk-yag__photo"><img class="jk-yag__img" id="jk-yag-clear" alt="">'
    + '<div class="jk-yag__hazy" id="jk-yag-hazy"><img class="jk-yag__img jk-yag__blur" id="jk-yag-blur" alt=""><div class="jk-yag__veil" id="jk-yag-veil"></div></div>'
    + '<span class="jk-vis__tag jk-vis__tag--l" id="jk-yag-tag" aria-hidden="true"></span></div>'
    + '<div class="jk-chips jk-yag__scenes" role="group" aria-label="Scene">';
  SCENES.forEach(function (s, i) { h += '<button type="button" class="jk-chip jk-chip--sm' + (i ? '' : ' is-active') + '" data-scene="' + s.id + '" aria-pressed="' + !i + '">' + s.label + '</button>'; });
  h += '</div></figure>'
    + '</div>'
    + '<div class="jk-lpi__controls">'
    + '<button type="button" class="btn btn-primary jk-lpi__fire" id="jk-yag-fire">&#9889; Fire laser</button>'
    + '<button type="button" class="btn btn-outline-secondary" id="jk-yag-reset" disabled>Start over</button>'
    + '<button type="button" class="btn btn-outline-secondary jk-lpi__full" id="jk-yag-full" hidden>Full screen</button>'
    + '</div>'
    + '<p class="jk-lpi__step" id="jk-yag-step" aria-live="polite"></p>';
  root.innerHTML = h;

  function $(id) { return document.getElementById(id); }
  var el = {
    views: root.querySelector('.jk-lpi__views'), fire: $('jk-yag-fire'), reset: $('jk-yag-reset'), full: $('jk-yag-full'), step: $('jk-yag-step'),
    open: $('yag-open'), aim: $('yag-aim'), flash: $('yag-flash'), labBefore: $('yag-lab-before'), labAfter: $('yag-lab-after'), bits: $('yag-bits'),
    photo: root.querySelector('.jk-yag__photo'), clear: $('jk-yag-clear'), blur: $('jk-yag-blur'), hazy: $('jk-yag-hazy'), veil: $('jk-yag-veil'), tag: $('jk-yag-tag')
  };

  // capsule fragments that drift down and fade after each shot
  var BITS = (function () { var r = lcg(9), a = []; for (var i = 0; i < SHOTS.length * 2; i++) a.push([r() - 0.5, 0.5 + r(), 2 + r() * 2.5]); return a; })();
  el.bits.innerHTML = BITS.map(function (b) { return '<circle r="' + b[2].toFixed(1) + '" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8"/>'; }).join('');
  var bitEls = el.bits.querySelectorAll('circle');

  function loadScene() {
    var src = BASE + scene.file;
    el.photo.style.aspectRatio = scene.w + ' / ' + scene.h;
    el.clear.src = src; el.blur.src = src;
    el.clear.alt = scene.label + ', as seen after the laser';
    el.blur.alt = scene.label + ', as seen through a cloudy capsule';
    // haze: a white veil, plus a halo on every light
    var g = scene.lights.map(function (p) {
      return 'radial-gradient(circle at ' + p[0] + '% ' + p[1] + '%, rgba(255,250,235,.95) 0, rgba(255,246,225,.5) 5%, transparent 14%)';
    });
    g.push('linear-gradient(rgba(240,243,247,.3), rgba(240,243,247,.3))');
    el.veil.style.backgroundImage = g.join(', ');
    root.querySelectorAll('[data-scene]').forEach(function (b) {
      var on = b.getAttribute('data-scene') === scene.id;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
  }

  // ---------- one frame ----------
  var stepShown = '';
  function shotPos(i) { return [C[0] + SHOTS[i][0] * 30, C[1] + SHOTS[i][1] * 30]; }
  function stage(t) {
    // how open: each shot adds a share, eased over 350ms
    var open = 0, pulse = 0, cur = -1, i;
    for (i = 0; i < SHOTS.length; i++) {
      var t0 = T_FIRST + i * T_GAP;
      open += ease(ramp(t, t0, t0 + 350)) / SHOTS.length;
      var x = (t - t0) / 200;
      if (x >= 0 && x <= 1) pulse = Math.max(pulse, Math.sin(Math.PI * x));
      if (t >= t0 - T_GAP * 0.8) cur = i;
    }
    el.open.setAttribute('d', openingPath(R_OPEN * Math.sqrt(open)));

    var aiming = t > 0 && t < T_FIRST + SHOTS.length * T_GAP;
    var p = shotPos(Math.max(0, Math.min(SHOTS.length - 1, cur)));
    el.aim.setAttribute('cx', p[0].toFixed(1)); el.aim.setAttribute('cy', p[1].toFixed(1));
    el.aim.style.opacity = aiming ? 1 : 0;
    el.flash.setAttribute('cx', p[0].toFixed(1)); el.flash.setAttribute('cy', p[1].toFixed(1));
    el.flash.setAttribute('r', (16 * pulse).toFixed(1)); el.flash.style.opacity = pulse.toFixed(2);

    for (i = 0; i < bitEls.length; i++) {
      var s = shotPos(i >> 1), b = BITS[i], q = clamp((t - (T_FIRST + (i >> 1) * T_GAP)) / 1500, 0, 1);
      if (q <= 0 || q >= 1) { bitEls[i].style.opacity = 0; continue; }
      bitEls[i].setAttribute('cx', (s[0] + b[0] * 40 * q).toFixed(1));
      bitEls[i].setAttribute('cy', (s[1] + 70 * b[1] * q * q).toFixed(1));
      bitEls[i].style.opacity = (0.9 * (1 - q)).toFixed(2);
    }

    el.labBefore.style.opacity = (1 - ease(ramp(t, T_FIRST, T_FIRST + 500))).toFixed(3);
    el.labAfter.style.opacity = ease(ramp(t, T_END - 800, T_END)).toFixed(3);

    // the view clears as the opening grows
    el.hazy.style.opacity = (1 - ease(open)).toFixed(3);
    var tag = open < 0.02 ? 'Cloudy capsule' : open > 0.98 ? 'After the laser' : 'Clearing';
    if (el.tag.textContent !== tag) el.tag.textContent = tag;

    var step = t <= 0 ? 'before' : t < T_END - 700 ? 'laser' : 'after';
    if (step !== stepShown) { stepShown = step; el.step.innerHTML = STEPS[step]; }
  }

  // ---------- controls ----------
  var raf = 0, playing = false;
  function setButtons(state) { el.fire.disabled = state !== 'before'; el.reset.disabled = state === 'before'; }
  function fire() {
    if (playing) return;
    if (REDUCED) { stage(T_END); setButtons('after'); return; }
    playing = true; setButtons('playing');
    var t0 = 0;
    function tick(now) {
      if (!t0) t0 = now;
      var t = now - t0;
      stage(Math.max(1, Math.min(T_END, t)));
      if (t >= T_END) { playing = false; setButtons('after'); return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }
  function reset() { cancelAnimationFrame(raf); playing = false; stage(0); setButtons('before'); }

  el.fire.addEventListener('click', fire);
  el.reset.addEventListener('click', reset);
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-scene')) {
      SCENES.forEach(function (s) { if (s.id === b.getAttribute('data-scene')) scene = s; });
      loadScene();
    } else if (b.hasAttribute('data-view')) {
      el.views.setAttribute('data-show', b.getAttribute('data-view'));
      root.querySelectorAll('.jk-lpi__tabs .jk-chip').forEach(function (o) {
        var on = o === b; o.classList.toggle('is-active', on); o.setAttribute('aria-pressed', String(on));
      });
    }
  });

  // Full screen for the exam-room screen, where the browser can do it
  var reqFull = root.requestFullscreen || root.webkitRequestFullscreen;
  if (reqFull) {
    el.full.hidden = false;
    el.full.addEventListener('click', function () {
      var cur = document.fullscreenElement || document.webkitFullscreenElement;
      if (cur) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else reqFull.call(root);
    });
    var onFs = function () { el.full.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? 'Exit full screen' : 'Full screen'; };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
  }

  loadScene();
  stage(0);
  setButtons('before');
  root.classList.add('is-ready');
})();
