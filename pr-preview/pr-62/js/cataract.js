/* What a cataract does (content/learn/what-is-a-cataract.md).
 *
 * Two panels, built here:
 *   the eye     either the front view through a dilated pupil, as the doctor
 *               sees it, or a cross-section with light rays passing through
 *               the lens to the retina (inline SVG, switched by chips)
 *   the view    an everyday photo as the patient sees it (scene photos
 *               shared with the vision simulator)
 *
 * Controls: the kind of cataract (nuclear, cortical, posterior
 * subcapsular), how advanced it is (a slider, plus Play to run it from clear
 * to advanced), and "After surgery", which swaps in a clear lens implant.
 * The scene also sets the pupil: wide at night, small in daylight, which is
 * why cortical cataracts bother people most at night and posterior
 * subcapsular ones in bright light.
 *
 * Everything is drawn by render() from the state below, so the slider, Play
 * and the chips all go through the same code. The numbers illustrate the
 * usual pattern of each kind; they are not measurements.
 *
 * The cloudy view is three pre-filtered copies of the photo (early, moderate,
 * advanced) that only change opacity, cross-faded by severity. Animating the
 * blur itself re-rasterizes every frame and flickers on phones (the same
 * lesson as yag.js and Play in vision.js).
 *
 * Layout classes are shared with the iridotomy and YAG demos (.jk-lpi and
 * .jk-yag__* in custom.css): one panel at a time on a phone, both side by
 * side from 768px.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-cat');
  if (!root) return;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = new URL(root.getAttribute('data-base') || './', window.location.href).href;
  var FONT = 'font-family="Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"';
  var INK = '#1f2937', BLUE = '#2a6ebb', MUTED = '#5b6573';

  // lights: where glare halos sit, in % of the photo (as in vision.js).
  // night: the pupil is wide at night and small in daylight.
  var SCENES = [
    { id: 'night', file: 'night.webp', label: 'Night', w: 1400, h: 933, night: true,
      lights: [[13.6, 37.5], [35.6, 67.3], [53.9, 68], [58.9, 65.2], [77, 59], [88.5, 54], [61.5, 91], [73, 78], [86, 70], [92.7, 59]] },
    { id: 'table', file: 'table.webp', label: 'Breakfast', w: 960, h: 640, night: false, lights: [] },
    { id: 'reading', file: 'reading.webp', label: 'Reading', w: 960, h: 641, night: false, lights: [] }
  ];

  var TYPES = [
    { id: 'nuclear', label: 'Nuclear' },
    { id: 'cortical', label: 'Cortical' },
    { id: 'psc', label: 'Posterior subcapsular' }
  ];
  var LEVELS = [0.34, 0.67, 1]; // the three pre-filtered copies
  function stageName(s) { return s < 0.04 ? 'Clear' : s < 0.42 ? 'Early' : s < 0.75 ? 'Moderate' : 'Advanced'; }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ramp(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function smooth(a, b, x) { return ease(ramp(x, a, b)); }
  function lcg(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function f1(v) { return v.toFixed(1); }
  function mix(c1, c2, t) { // hex colors
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16), out = '#';
    for (var sh = 16; sh >= 0; sh -= 8) {
      var x = Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
      out += (x < 16 ? '0' : '') + x.toString(16);
    }
    return out;
  }

  function txt(x, y, s, anchor, color, weight, id) {
    return '<text' + (id ? ' id="' + id + '"' : '') + ' x="' + x + '" y="' + y + '" ' + FONT + ' font-size="20" font-weight="' + (weight || 600) + '" fill="' + (color || INK) + '" text-anchor="' + (anchor || 'start') + '">' + s + '</text>';
  }
  function lead(x1, y1, x2, y2, color) {
    color = color || MUTED;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.5"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3.5" fill="' + color + '"/>';
  }

  // ======================================================================
  // Front view: through a dilated pupil
  // ======================================================================
  var C = [280, 205], R = 100;
  var SPOKES = (function () {
    var r = lcg(11), a = [], n = 16;
    for (var i = 0; i < n; i++) {
      a.push({ an: (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3, w: 0.07 + r() * 0.07, len: 0.6 + r() * 0.4, at: ((i * 7) % n) / n * 0.55 });
    }
    return a;
  })();
  var PSC_DOTS = (function () {
    var r = lcg(3), a = [];
    for (var i = 0; i < 70; i++) { var an = r() * Math.PI * 2, d = Math.sqrt(r()) * 50; a.push([C[0] + d * Math.cos(an), C[1] + d * Math.sin(an), 1.2 + r() * 2.4, d]); }
    return a;
  })();

  function frontSvg() {
    var i, an, h = '<svg class="jk-lpi__svg" viewBox="0 0 560 420" role="img" aria-labelledby="cat-front-t">'
      + '<title id="cat-front-t">Front view of the eye through a dilated pupil, showing the lens</title>'
      + '<defs>'
      + '<radialGradient id="cat-iris"><stop offset="0.6" stop-color="#7d9bb8"/><stop offset="0.85" stop-color="#5f7f9e"/><stop offset="1" stop-color="#3e566e"/></radialGradient>'
      + '<radialGradient id="cat-scl"><stop offset="0.7" stop-color="#ffffff"/><stop offset="1" stop-color="#eef1f5"/></radialGradient>'
      + '<radialGradient id="cat-reflex"><stop offset="0" stop-color="#4a1a14"/><stop offset="1" stop-color="#0b0f14"/></radialGradient>'
      + '<radialGradient id="cat-nucy"><stop offset="0" stop-color="#ecc565"/><stop offset="0.6" stop-color="#d9a441" stop-opacity="0.85"/><stop offset="1" stop-color="#d9a441" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="cat-nucb"><stop offset="0" stop-color="#7a4a1f"/><stop offset="0.55" stop-color="#8f5a26" stop-opacity="0.85"/><stop offset="1" stop-color="#8f5a26" stop-opacity="0"/></radialGradient>'
      + '<clipPath id="cat-pupil"><circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R + '"/></clipPath>'
      + '</defs>'
      + '<rect width="560" height="420" fill="#fff"/>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="188" fill="url(#cat-scl)" stroke="#cbd5e1" stroke-width="2"/>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="140" fill="url(#cat-iris)" stroke="#2f4255" stroke-width="3"/>'
      + '<g stroke="#3e566e" stroke-width="2" stroke-linecap="round" opacity="0.5">';
    for (i = 0; i < 48; i++) {
      an = i / 48 * Math.PI * 2;
      var r1 = R + 6, r2 = 132 - (i % 4) * 5;
      h += '<line x1="' + f1(C[0] + r1 * Math.cos(an)) + '" y1="' + f1(C[1] + r1 * Math.sin(an)) + '" x2="' + f1(C[0] + r2 * Math.cos(an)) + '" y2="' + f1(C[1] + r2 * Math.sin(an)) + '"/>';
    }
    h += '</g>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R + '" fill="url(#cat-reflex)"/>'
      + '<g clip-path="url(#cat-pupil)">'
      + '<circle id="cat-f-haze" cx="' + C[0] + '" cy="' + C[1] + '" r="' + R + '" fill="#d4d0c6"/>'
      + '<circle id="cat-f-nucy" cx="' + C[0] + '" cy="' + C[1] + '" r="82" fill="url(#cat-nucy)"/>'
      + '<circle id="cat-f-nucb" cx="' + C[0] + '" cy="' + C[1] + '" r="70" fill="url(#cat-nucb)"/>'
      + '<g id="cat-f-spokes" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.8"></g>'
      + '<circle id="cat-f-psc" cx="' + C[0] + '" cy="' + C[1] + '" fill="#e9e2cf"/>'
      + '<g id="cat-f-dots" fill="#fbfaf5">';
    for (i = 0; i < PSC_DOTS.length; i++) h += '<circle cx="' + f1(PSC_DOTS[i][0]) + '" cy="' + f1(PSC_DOTS[i][1]) + '" r="' + f1(PSC_DOTS[i][2]) + '"/>';
    h += '</g>'
      // after surgery: the implant's edge and its two arms
      + '<g id="cat-f-iol" fill="none" stroke="#e0f2fe" stroke-width="2.5">'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="72"/>'
      + '<path d="M' + (C[0] + 30) + ',' + (C[1] - 66) + ' C' + (C[0] + 90) + ',' + (C[1] - 90) + ' ' + (C[0] + 110) + ',' + (C[1] - 40) + ' ' + (C[0] + 104) + ',' + (C[1] + 10) + '"/>'
      + '<path d="M' + (C[0] - 30) + ',' + (C[1] + 66) + ' C' + (C[0] - 90) + ',' + (C[1] + 90) + ' ' + (C[0] - 110) + ',' + (C[1] + 40) + ' ' + (C[0] - 104) + ',' + (C[1] - 10) + '"/>'
      + '</g>'
      + '</g>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R + '" fill="none" stroke="#2f4255" stroke-width="2"/>'
      + '<ellipse cx="' + (C[0] + 58) + '" cy="' + (C[1] - 62) + '" rx="20" ry="11" fill="#fff" opacity="0.45" transform="rotate(-35 ' + (C[0] + 58) + ' ' + (C[1] - 62) + ')"/>'
      // the pupil's everyday size: wide at night, small in daylight
      + '<circle id="cat-f-ring" cx="' + C[0] + '" cy="' + C[1] + '" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="7 5"/>'
      + txt(280, 408, '', 'middle', MUTED, 400, 'cat-f-ringlab')
      + txt(20, 360, 'Iris', 'start') + lead(58, 352, C[0] - 104, C[1] + 60)
      + '<g id="cat-f-lab"></g>'
      + '</svg>';
    return h;
  }

  // ======================================================================
  // Cross-section: light through the lens to the retina
  // ======================================================================
  var E = [410, 215], ER = 158;             // the eyeball
  var L = [314, 215], LRX = 20, LRY = 56;   // the lens
  var FOV = [E[0] + ER - 2, E[1]];          // where light focuses
  var N_RAYS = 9;
  var SCATTER = (function () { // two stray paths per ray, to points on the retina
    var r = lcg(17), a = [];
    for (var i = 0; i < N_RAYS * 2; i++) {
      var th = (8 + r() * 52) * (r() < 0.5 ? -1 : 1) * Math.PI / 180;
      a.push([E[0] + (ER - 2) * Math.cos(th), E[1] + (ER - 2) * Math.sin(th)]);
    }
    return a;
  })();
  function corneaX(y) { return 238 + 26 * (y / 72) * (y / 72); }

  function crossSvg() {
    var i, h = '<svg class="jk-lpi__svg" viewBox="0 0 600 420" role="img" aria-labelledby="cat-cross-t">'
      + '<title id="cat-cross-t">Cross-section of the eye: light passes through the cornea, the pupil and the lens and focuses on the retina</title>'
      + '<defs><clipPath id="cat-lensclip"><ellipse cx="' + L[0] + '" cy="' + L[1] + '" rx="' + LRX + '" ry="' + LRY + '"/></clipPath></defs>'
      + '<rect width="600" height="420" fill="#fff"/>'
      // eyeball and retina
      + '<circle cx="' + E[0] + '" cy="' + E[1] + '" r="' + ER + '" fill="#f8fafc" stroke="#94a3b8" stroke-width="3"/>'
      + '<path d="' + arc(E, ER - 3, -62, 62) + '" fill="none" stroke="#e8a0a0" stroke-width="5"/>'
      + '<path id="cat-x-glare" d="' + arc(E, ER - 3, -60, 60) + '" fill="none" stroke-width="9" stroke-linecap="round"/>'
      // cornea and the front chamber
      + '<path d="M262,143 Q214,215 262,287" fill="#eaf4fb" stroke="#7aa7c7" stroke-width="3"/>'
      + '<g id="cat-x-iris" stroke="#5f7f9e" stroke-width="7" stroke-linecap="round"></g>'
      // the lens, then what clouds it
      + '<ellipse cx="' + L[0] + '" cy="' + L[1] + '" rx="' + LRX + '" ry="' + LRY + '" fill="#eef6fd" stroke="#7aa7c7" stroke-width="2" id="cat-x-lens"/>'
      + '<g clip-path="url(#cat-lensclip)">'
      + '<ellipse id="cat-x-haze" cx="' + L[0] + '" cy="' + L[1] + '" rx="' + LRX + '" ry="' + LRY + '" fill="#d4d0c6"/>'
      + '<ellipse id="cat-x-nuc" cx="' + L[0] + '" cy="' + L[1] + '" rx="12" ry="31"/>'
      + '<g id="cat-x-cort" fill="#c3ccd8" stroke="#8796a8" stroke-width="0.8"></g>'
      + '<ellipse id="cat-x-psc" cx="' + (L[0] + LRX - 3) + '" cy="' + L[1] + '" fill="#cdbf98" stroke="#9c8b5e" stroke-width="1"/>'
      + '</g>'
      + '<g id="cat-x-iol"><ellipse cx="' + L[0] + '" cy="' + L[1] + '" rx="' + LRX + '" ry="' + LRY + '" fill="#fff" stroke="#7aa7c7" stroke-width="1.5" stroke-dasharray="4 3"/>'
      + '<ellipse cx="' + L[0] + '" cy="' + L[1] + '" rx="6" ry="30" fill="#e0f2fe" stroke="' + BLUE + '" stroke-width="2"/></g>'
      // light
      + '<g id="cat-x-scatter" fill="none" stroke-width="1.4" stroke-dasharray="5 4"></g>'
      + '<g id="cat-x-rays" fill="none" stroke-width="2" stroke-linecap="round"></g>'
      + '<circle id="cat-x-spot" cx="' + FOV[0] + '" cy="' + FOV[1] + '" r="8"/>'
      // labels
      + txt(14, 32, 'Light from what', 'start', INK) + txt(14, 54, 'you look at', 'start', INK, 400)
      + txt(214, 120, 'Cornea', 'middle', MUTED, 400)
      + '<g id="cat-x-lablens"></g>'
      + txt(520, 30, 'Retina', 'middle') + lead(520, 38, E[0] + 112, E[1] - 108)
      + '<g id="cat-x-labfocus">' + txt(596, 300, 'Focused', 'end', BLUE) + txt(596, 322, 'here', 'end', BLUE, 400) + lead(560, 288, FOV[0] - 4, FOV[1] + 6, BLUE) + '</g>'
      + '<g id="cat-x-labscatter">' + txt(596, 396, 'Scattered light:', 'end', '#92400e') + txt(596, 416, 'glare and haze', 'end', '#92400e', 400) + '</g>'
      + txt(14, 396, '', 'start', MUTED, 400, 'cat-x-pupillab')
      + '</svg>';
    return h;
  }
  function arc(c, r, a0, a1) { // degrees, clockwise from +x
    var p0 = [c[0] + r * Math.cos(a0 * Math.PI / 180), c[1] + r * Math.sin(a0 * Math.PI / 180)];
    var p1 = [c[0] + r * Math.cos(a1 * Math.PI / 180), c[1] + r * Math.sin(a1 * Math.PI / 180)];
    return 'M' + f1(p0[0]) + ',' + f1(p0[1]) + ' A' + r + ',' + r + ' 0 0 1 ' + f1(p1[0]) + ',' + f1(p1[1]);
  }

  // how much of a ray at height yn (0 center .. 1 lens edge) gets through
  function clouding(type, s, yn) {
    if (type === 'nuclear') return 0.08 * s + 0.72 * s * (1 - smooth(0.45, 0.75, yn));
    if (type === 'cortical') return 0.05 * s + 0.8 * s * smooth(0.35, 0.75, yn);
    var rc = 0.1 + 0.32 * s; // psc: a central plaque that widens
    return 0.05 * s + 0.88 * s * (1 - smooth(rc, rc + 0.14, yn));
  }

  // ======================================================================
  // What you see
  // ======================================================================
  // One look per kind of cataract, at severity s, at night or in daylight.
  function look(type, s, night) {
    var blur, contrast, sepia, sat, bright, glare, veil;
    if (type === 'nuclear') {
      blur = 0.4 + 1.9 * s; contrast = 1 - 0.3 * s; sepia = 0.8 * s; sat = 1 - 0.3 * s; bright = 1 - 0.14 * s; glare = 0.6; veil = 0.06 * s;
    } else if (type === 'cortical') {
      blur = (0.3 + 1.5 * s) * (night ? 1.25 : 0.75); contrast = 1 - 0.25 * s; sepia = 0.12 * s; sat = 1 - 0.1 * s; bright = 1;
      glare = night ? 1.25 : 0.6; veil = (night ? 0.16 : 0.1) * s;
    } else {
      blur = (0.5 + 2.4 * s) * (night ? 0.85 : 1.3); contrast = 1 - 0.3 * s; sepia = 0.1 * s; sat = 1 - 0.08 * s; bright = 1 + 0.04 * s;
      glare = night ? 0.9 : 1; veil = (night ? 0.12 : 0.2) * s;
    }
    return {
      filter: 'blur(' + blur.toFixed(2) + 'px) contrast(' + contrast.toFixed(2) + ') sepia(' + sepia.toFixed(2) + ') saturate(' + sat.toFixed(2) + ') brightness(' + bright.toFixed(2) + ')',
      glare: glare * s, veil: veil
    };
  }

  // ---------- text ----------
  var ABOUT = {
    clear: '<strong>A clear lens.</strong> Light passes straight through the lens and comes to a sharp focus on the retina. Choose a kind of cataract, then drag the slider or press <strong>Play</strong>.',
    nuclear: '<strong>Nuclear cataract,</strong> the most common kind. The center of the lens slowly turns yellow, then brown. Colors fade and look yellowed, everything looks dimmer, and distance vision blurs. It can make the eye more nearsighted, so some people find they can briefly read without their glasses.',
    cortical: '<strong>Cortical cataract.</strong> White spokes grow inward from the edge of the lens and scatter the light that hits them. Glare and halos are the main trouble, worst at night, when the pupil opens wide and lets light through the edge of the lens.',
    psc: '<strong>Posterior subcapsular cataract.</strong> A plaque forms on the back of the lens, right in the center, where all the light passes. Even a small one causes glare and blur, especially in bright light and for reading, when the pupil is small. It can grow over months rather than years, and is more common with diabetes and with steroid medicines.',
    after: '<strong>After cataract surgery.</strong> The cloudy lens has been replaced by a clear lens implant, so light reaches the retina again. Many people notice that colors look brighter and bluer, because the yellowed lens had been filtering them.'
  };

  // ---------- markup ----------
  var h = '<div class="jk-chips jk-lpi__tabs" role="group" aria-label="View">'
    + '<button type="button" class="jk-chip is-active" data-view="side" aria-pressed="true">The eye</button>'
    + '<button type="button" class="jk-chip" data-view="front" aria-pressed="false">What you see</button>'
    + '</div>'
    + '<div class="jk-lpi__views" data-show="side">'
    + '<figure class="jk-lpi__view" data-view="side"><figcaption id="cat-eyecap">From the front, through a dilated pupil</figcaption>'
    + '<div class="jk-cat__eye" data-eye="front"><div class="jk-cat__svg" data-for="front">' + frontSvg() + '</div><div class="jk-cat__svg" data-for="cross">' + crossSvg() + '</div></div>'
    + '<div class="jk-chips jk-yag__scenes" role="group" aria-label="Eye view">'
    + '<button type="button" class="jk-chip jk-chip--sm is-active" data-eye="front" aria-pressed="true">From the front</button>'
    + '<button type="button" class="jk-chip jk-chip--sm" data-eye="cross" aria-pressed="false">Cut through, with light</button>'
    + '</div></figure>'
    + '<figure class="jk-lpi__view" data-view="front"><figcaption>What you see</figcaption>'
    + '<div class="jk-yag__photo" id="jk-cat-photo"><img class="jk-yag__img" id="jk-cat-clear" alt="">';
  LEVELS.forEach(function (lv, i) {
    h += '<div class="jk-yag__hazy" id="jk-cat-l' + i + '"><img class="jk-yag__img jk-cat__blur" alt=""><div class="jk-yag__veil"></div></div>';
  });
  h += '<span class="jk-vis__tag jk-vis__tag--l" id="jk-cat-tag" aria-hidden="true"></span></div>'
    + '<div class="jk-chips jk-yag__scenes" role="group" aria-label="Scene">';
  SCENES.forEach(function (sc, i) { h += '<button type="button" class="jk-chip jk-chip--sm' + (i ? '' : ' is-active') + '" data-scene="' + sc.id + '" aria-pressed="' + !i + '">' + sc.label + '</button>'; });
  h += '</div></figure>'
    + '</div>'
    + '<div class="jk-cat__controls">'
    + '<div class="jk-cat__row"><span class="jk-cat__lab" id="jk-cat-typelab">Kind of cataract</span>'
    + '<div class="jk-chips" role="group" aria-labelledby="jk-cat-typelab">';
  TYPES.forEach(function (t, i) { h += '<button type="button" class="jk-chip' + (i ? '' : ' is-active') + '" data-type="' + t.id + '" aria-pressed="' + !i + '">' + t.label + '</button>'; });
  h += '</div></div>'
    + '<div class="jk-cat__row"><label class="jk-cat__lab" for="jk-cat-sev">How advanced</label>'
    + '<div class="jk-cat__slider"><input type="range" id="jk-cat-sev" min="0" max="100" step="1" value="0">'
    + '<output id="jk-cat-stage" for="jk-cat-sev" class="jk-cat__stage">Clear</output></div></div>'
    + '</div>'
    + '<div class="jk-lpi__controls">'
    + '<button type="button" class="btn btn-primary" id="jk-cat-play">&#9654; Play</button>'
    + '<button type="button" class="btn btn-outline-primary" id="jk-cat-after" aria-pressed="false">After surgery</button>'
    + '<button type="button" class="btn btn-outline-secondary jk-lpi__full" id="jk-cat-full" hidden>Full screen</button>'
    + '</div>'
    + '<p class="jk-lpi__step" id="jk-cat-step" aria-live="polite"></p>';
  root.innerHTML = h;

  function $(id) { return document.getElementById(id); }
  var el = {
    views: root.querySelector('.jk-lpi__views'), eye: root.querySelector('.jk-cat__eye'), eyecap: $('cat-eyecap'),
    play: $('jk-cat-play'), after: $('jk-cat-after'), full: $('jk-cat-full'), step: $('jk-cat-step'), sev: $('jk-cat-sev'), stage: $('jk-cat-stage'),
    clear: $('jk-cat-clear'), tag: $('jk-cat-tag'), photo: $('jk-cat-photo'),
    layers: LEVELS.map(function (lv, i) { var d = $('jk-cat-l' + i); return { box: d, img: d.querySelector('img'), veil: d.querySelector('.jk-yag__veil') }; }),
    fHaze: $('cat-f-haze'), fNucY: $('cat-f-nucy'), fNucB: $('cat-f-nucb'), fSpokes: $('cat-f-spokes'), fPsc: $('cat-f-psc'), fDots: $('cat-f-dots'),
    fIol: $('cat-f-iol'), fRing: $('cat-f-ring'), fRingLab: $('cat-f-ringlab'), fLab: $('cat-f-lab'),
    xHaze: $('cat-x-haze'), xNuc: $('cat-x-nuc'), xCort: $('cat-x-cort'), xPsc: $('cat-x-psc'), xIol: $('cat-x-iol'), xLens: $('cat-x-lens'),
    xIris: $('cat-x-iris'), xRays: $('cat-x-rays'), xScatter: $('cat-x-scatter'), xSpot: $('cat-x-spot'), xGlare: $('cat-x-glare'),
    xLabLens: $('cat-x-lablens'), xLabScatter: $('cat-x-labscatter'), xPupilLab: $('cat-x-pupillab')
  };
  var dotEls = el.fDots.querySelectorAll('circle');

  // ---------- state ----------
  var state = { type: 'nuclear', s: 0, after: 0, scene: SCENES[0] };

  // the cloudy photo layers depend on the kind and the scene, not severity
  function buildLayers() {
    var sc = state.scene, src = BASE + sc.file;
    el.photo.style.aspectRatio = sc.w + ' / ' + sc.h;
    el.clear.src = src;
    LEVELS.forEach(function (lv, i) {
      var lk = look(state.type, lv, sc.night), L2 = el.layers[i];
      L2.img.src = src;
      L2.img.style.filter = lk.filter;
      var g = sc.lights.map(function (p) {
        var r = 3 + 14 * lk.glare;
        return 'radial-gradient(circle at ' + p[0] + '% ' + p[1] + '%, rgba(255,243,210,' + Math.min(0.95, 0.9 * lk.glare).toFixed(2) + ') 0, rgba(255,236,190,' + Math.min(0.5, 0.4 * lk.glare).toFixed(2) + ') ' + f1(r * 0.4) + '%, transparent ' + f1(r) + '%)';
      });
      g.push('linear-gradient(rgba(250,246,236,' + lk.veil.toFixed(2) + '), rgba(250,246,236,' + lk.veil.toFixed(2) + '))');
      L2.veil.style.backgroundImage = g.join(', ');
    });
    root.querySelectorAll('[data-scene]').forEach(function (b) {
      var on = b.getAttribute('data-scene') === sc.id;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
  }

  // ---------- one frame ----------
  var shownStep = '';
  function render() {
    var type = state.type, a = state.after, s = state.s * (1 - a), night = state.scene.night, i;
    var stage = a > 0.5 ? 'After surgery' : stageName(state.s);

    // ----- front view -----
    el.fHaze.style.opacity = ((type === 'nuclear' ? 0.18 : 0.12) * s).toFixed(3);
    var nuc = type === 'nuclear' ? s : 0;
    el.fNucY.style.opacity = Math.min(1, 1.7 * nuc).toFixed(3);
    el.fNucB.style.opacity = (0.95 * smooth(0.45, 1, nuc)).toFixed(3);
    var cort = type === 'cortical' ? s : 0, sp = '';
    SPOKES.forEach(function (k) {
      var g = ramp(cort, k.at, 1);
      if (g <= 0) return;
      var rIn = R * (1 - (0.2 + 0.65 * ease(g)) * k.len), r0 = R + 4;
      sp += '<path d="M' + f1(C[0] + r0 * Math.cos(k.an - k.w)) + ',' + f1(C[1] + r0 * Math.sin(k.an - k.w))
        + ' L' + f1(C[0] + rIn * Math.cos(k.an)) + ',' + f1(C[1] + rIn * Math.sin(k.an))
        + ' L' + f1(C[0] + r0 * Math.cos(k.an + k.w)) + ',' + f1(C[1] + r0 * Math.sin(k.an + k.w)) + ' Z" opacity="' + Math.min(0.92, 2 * g).toFixed(2) + '"/>';
    });
    el.fSpokes.innerHTML = sp;
    var psc = type === 'psc' ? s : 0, rp = 8 + 40 * psc;
    el.fPsc.setAttribute('r', f1(rp));
    el.fPsc.style.opacity = (0.7 * Math.min(1, 3 * psc)).toFixed(3);
    for (i = 0; i < dotEls.length; i++) dotEls[i].style.opacity = psc > 0.02 && PSC_DOTS[i][3] < rp ? '0.9' : '0';
    el.fIol.style.opacity = a.toFixed(3);
    var ring = night ? 90 : 46;
    el.fRing.setAttribute('r', ring);
    el.fRingLab.textContent = night ? 'Dashed circle: the pupil at night' : 'Dashed circle: the pupil in daylight';

    var lab = '', show = s > 0.12 || a > 0.5;
    if (a > 0.5) lab = txt(20, 34, 'Clear lens implant', 'start', BLUE) + lead(196, 28, C[0] - 50, C[1] - 52, BLUE);
    else if (!show) lab = txt(20, 34, 'Clear lens', 'start', BLUE) + lead(126, 28, C[0] - 34, C[1] - 34, BLUE);
    else if (type === 'nuclear') lab = txt(20, 34, 'Yellow-brown center', 'start') + txt(20, 56, '(the nucleus)', 'start', INK, 400) + lead(150, 62, C[0] - 22, C[1] - 22);
    else if (type === 'cortical') lab = txt(20, 34, 'Spokes from', 'start') + txt(20, 56, 'the edge', 'start', INK, 400) + lead(118, 48, C[0] - 62, C[1] - 58);
    else lab = txt(20, 34, 'Plaque at the back,', 'start') + txt(20, 56, 'in the center', 'start', INK, 400) + lead(150, 62, C[0] - 8, C[1] - 8);
    el.fLab.innerHTML = lab;

    // ----- cross-section -----
    var ph = night ? 46 : 20; // half the pupil, in the drawing
    el.xIris.innerHTML = '<line x1="288" y1="' + (L[1] - 72) + '" x2="288" y2="' + (L[1] - ph) + '"/><line x1="288" y1="' + (L[1] + ph) + '" x2="288" y2="' + (L[1] + 72) + '"/>';
    el.xPupilLab.textContent = night ? 'At night the pupil opens wide' : 'In daylight the pupil is small';
    el.xHaze.style.opacity = ((type === 'nuclear' ? 0.2 : 0.12) * s).toFixed(3);
    el.xNuc.setAttribute('fill', mix('#ecc565', '#7a4a1f', smooth(0.4, 1, nuc)));
    el.xNuc.style.opacity = Math.min(0.95, 1.7 * nuc).toFixed(3);
    var cs = '';
    if (cort > 0) {
      [-1, 1].forEach(function (side) {
        for (var k = 0; k < 4; k++) {
          var g = ramp(cort, k * 0.15, 1);
          if (g <= 0) continue;
          var y0 = L[1] + side * (LRY - 2 - k * 6), dx = (k - 1.5) * 9, len = (10 + 30 * ease(g));
          cs += '<path d="M' + f1(L[0] + dx - 4) + ',' + f1(y0 + side * 4) + ' L' + f1(L[0] + dx * 0.6) + ',' + f1(y0 - side * len) + ' L' + f1(L[0] + dx + 4) + ',' + f1(y0 + side * 4) + ' Z"/>';
        }
      });
    }
    el.xCort.innerHTML = cs;
    el.xPsc.setAttribute('rx', f1(2 + 5 * psc)); el.xPsc.setAttribute('ry', f1(6 + 22 * psc));
    el.xPsc.style.opacity = Math.min(1, 3 * psc).toFixed(3);
    el.xIol.style.opacity = a.toFixed(3);
    el.xLens.style.opacity = (1 - a).toFixed(3);

    // rays: each loses what the lens blocks; what it loses is scattered
    var rays = '', scat = '', got = 0, lost = 0;
    var tint = mix('#2563eb', '#b7791f', 0.85 * smooth(0.15, 1, nuc));
    for (i = 0; i < N_RAYS; i++) {
      var y = -ph + 4 + (2 * ph - 8) * i / (N_RAYS - 1);
      var cl = clouding(type, s, Math.abs(y * 0.82) / LRY), T = 1 - cl;
      var xc = corneaX(y), yl = L[1] + y * 0.82, xb = L[0] + LRX, yb = L[1] + y * 0.74;
      rays += '<path d="M6,' + f1(L[1] + y) + ' L' + f1(xc) + ',' + f1(L[1] + y) + ' L' + f1(L[0] - LRX) + ',' + f1(yl) + ' L' + f1(xb) + ',' + f1(yb) + '" stroke="#2563eb"/>'
        + '<path d="M' + f1(xb) + ',' + f1(yb) + ' L' + FOV[0] + ',' + FOV[1] + '" stroke="' + tint + '" opacity="' + Math.max(0.06, T).toFixed(2) + '"/>';
      for (var k2 = 0; k2 < 2; k2++) {
        var q = SCATTER[i * 2 + k2];
        if (cl > 0.03) scat += '<path d="M' + f1(xb) + ',' + f1(yb) + ' L' + f1(q[0]) + ',' + f1(q[1]) + '" stroke="#d97706" opacity="' + Math.min(0.9, 1.1 * cl).toFixed(2) + '"/>';
      }
      got += T; lost += cl;
    }
    got /= N_RAYS; lost /= N_RAYS;
    el.xRays.innerHTML = rays;
    el.xScatter.innerHTML = scat;
    el.xSpot.setAttribute('fill', tint);
    el.xSpot.style.opacity = (0.15 + 0.85 * got).toFixed(3);
    el.xGlare.setAttribute('stroke', '#f59e0b');
    el.xGlare.style.opacity = (0.55 * Math.min(1, 1.6 * lost)).toFixed(3);
    el.xLabScatter.style.opacity = smooth(0.05, 0.2, lost).toFixed(3);
    el.xLabLens.innerHTML = a > 0.5
      ? txt(330, 330, 'Lens implant', 'middle', BLUE) + lead(330, 312, L[0] + 2, L[1] + 26, BLUE)
      : txt(330, 330, s > 0.12 ? 'Cloudy lens' : 'Lens', 'middle') + lead(330, 312, L[0] + 4, L[1] + 40);

    // ----- the view: cross-fade the pre-filtered copies -----
    el.layers.forEach(function (Ly, j) {
      var o = j === 0 ? clamp(s / LEVELS[0], 0, 1) : clamp((s - LEVELS[j - 1]) / (LEVELS[j] - LEVELS[j - 1]), 0, 1);
      Ly.box.style.opacity = o.toFixed(3);
    });
    if (el.tag.textContent !== stage) el.tag.textContent = stage;
    var tname = TYPES.filter(function (t) { return t.id === type; })[0].label.toLowerCase();
    el.clear.alt = state.scene.label + (a > 0.5 ? ', after cataract surgery' : s < 0.04 ? ', through a clear lens' : ', through a ' + stage.toLowerCase() + ' ' + tname + ' cataract');

    // ----- controls and text -----
    el.stage.textContent = stage;
    el.sev.setAttribute('aria-valuetext', stage);
    var step = a > 0.5 ? 'after' : state.s < 0.04 ? 'clear' : type;
    if (step !== shownStep) { shownStep = step; el.step.innerHTML = ABOUT[step]; }
  }

  // ---------- controls ----------
  var raf = 0, playing = false;
  function stop() { cancelAnimationFrame(raf); playing = false; el.play.innerHTML = '&#9654; Play'; }
  function setAfter(on, animate) {
    el.after.setAttribute('aria-pressed', String(on));
    el.after.textContent = on ? 'Back to the cataract' : 'After surgery';
    var from = state.after, to = on ? 1 : 0;
    if (!animate || REDUCED) { state.after = to; render(); return; }
    var t0 = 0;
    cancelAnimationFrame(raf);
    function tick(now) {
      if (!t0) t0 = now;
      var x = clamp((now - t0) / 900, 0, 1);
      state.after = from + (to - from) * ease(x);
      render();
      if (x < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }
  function play() {
    if (playing) { stop(); return; }
    if (state.after) setAfter(false, false);
    var from = state.s >= 0.99 ? 0 : state.s;
    if (REDUCED) { state.s = 1; el.sev.value = 100; render(); return; }
    playing = true; el.play.innerHTML = '&#10074;&#10074; Pause';
    var t0 = 0, dur = 7000 * (1 - from);
    function tick(now) {
      if (!t0) t0 = now;
      var x = clamp((now - t0) / dur, 0, 1);
      state.s = from + (1 - from) * x;
      el.sev.value = Math.round(state.s * 100);
      render();
      if (x < 1) raf = requestAnimationFrame(tick); else stop();
    }
    raf = requestAnimationFrame(tick);
  }

  el.play.addEventListener('click', play);
  el.after.addEventListener('click', function () { stop(); setAfter(el.after.getAttribute('aria-pressed') !== 'true', true); });
  el.sev.addEventListener('input', function () {
    stop();
    if (state.after) setAfter(false, false);
    state.s = el.sev.value / 100; render();
  });
  function pick(attr, val) {
    root.querySelectorAll('[' + attr + ']').forEach(function (b) {
      if (b.tagName !== 'BUTTON') return;
      var on = b.getAttribute(attr) === val; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-type')) {
      state.type = b.getAttribute('data-type'); pick('data-type', state.type);
      if (state.after) setAfter(false, false);
      buildLayers(); render();
    } else if (b.hasAttribute('data-scene')) {
      SCENES.forEach(function (sc) { if (sc.id === b.getAttribute('data-scene')) state.scene = sc; });
      buildLayers(); render();
    } else if (b.hasAttribute('data-eye')) {
      var v = b.getAttribute('data-eye');
      el.eye.setAttribute('data-eye', v); pick('data-eye', v);
      el.eyecap.textContent = v === 'front' ? 'From the front, through a dilated pupil' : 'Cut through from the side, with light coming in';
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

  buildLayers();
  render();
  root.classList.add('is-ready');
})();
