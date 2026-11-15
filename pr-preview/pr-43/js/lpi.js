/* Laser peripheral iridotomy demo (content/learn/laser-iridotomy.md).
 *
 * Two drawings of the same eye, built here as inline SVG:
 *   side view   the front of the eye cut in half (same geometry as eye() in
 *               tools/learn-figures.py, so it matches the Learn figures)
 *   front view  the iris as the doctor sees it at the laser
 *
 * "Fire laser" plays one timeline: aiming beam, three pulses, the opening
 * appears with a puff of pigment, fluid passes through, the iris falls back
 * and the drain opens. Every frame is drawn by stage(t), a pure function of
 * the time t in ms, so "before" is stage(0), "after" is stage(T_END), and
 * reduced motion jumps straight between the two.
 *
 * On a phone one view shows at a time (chips switch), so the picture, the
 * button and the caption fit on one screen; from 768px both sit side by side.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-lpi');
  if (!root) return;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var FONT = 'font-family="Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"';
  var INK = '#1f2937', BLUE = '#2a6ebb', MUTED = '#5b6573', GREEN = '#16a34a', RED = '#b91c1c';

  // ---------- timeline (ms) ----------
  var T_AIM = 0, T_P1 = 900, T_P2 = 1300, T_P3 = 1700, T_OPEN = 1700, T_FLAT0 = 2100, T_FLAT1 = 5000, T_END = 5800;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }

  // ---------- side view geometry ----------
  // The iris as a strip around a centerline from its root (u = 0) to the
  // pupil margin (u = 1). bow = 1 is the narrow-angle shape: pushed forward
  // against the eye wall near the root, and back onto the lens at the pupil.
  var IRIS_N = 30, HOLE_U = 0.25;
  function irisCenter(u, bow) {
    var push = 40 * (1 - Math.exp(-u / 0.07)) * Math.pow(1 - u, 1.1) - 9 * Math.pow(u, 4);
    return [308 - 30 * u - bow * push, 126 + 175 * u];
  }
  function irisSides(bow) {
    var front = [], back = [];
    for (var i = 0; i <= IRIS_N; i++) {
      var u = i / IRIS_N, c = irisCenter(u, bow), a = irisCenter(Math.max(0, u - 0.02), bow), b = irisCenter(Math.min(1, u + 0.02), bow);
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var h = (16 - 3 * u) / 2, nx = -dy / len, ny = dx / len; // normal, pointing to the back of the eye (right)
      front.push([c[0] - nx * h, c[1] - ny * h]);
      back.push([c[0] + nx * h, c[1] + ny * h]);
    }
    return { front: front, back: back };
  }
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L'); }
  function irisPath(s) {
    var m = s.front[IRIS_N], n = s.back[IRIS_N], r = (Math.hypot(n[0] - m[0], n[1] - m[1]) / 2).toFixed(1);
    // rounded pupil margin
    return 'M' + pts(s.front) + ' A' + r + ',' + r + ' 0 0,1 ' + n[0].toFixed(1) + ',' + n[1].toFixed(1)
      + ' L' + pts(s.back.slice().reverse()) + ' Z';
  }
  // fluid space behind the iris; its far edges are covered by the lens and
  // ciliary body, which are drawn over it
  function chamberPath(s) {
    return 'M' + pts(s.back) + ' L300,306 L385,178 L345,166 L316,128 Z';
  }

  function sideSvg() {
    var a = 'stroke="' + BLUE + '" stroke-width="4" fill="none" stroke-linecap="round"';
    var h = '<svg class="jk-lpi__svg" viewBox="40 0 560 420" role="img" aria-labelledby="jk-lpi-side-t">'
      + '<title id="jk-lpi-side-t">Side view of the front of the eye</title>'
      + '<defs>'
      + '<marker id="lpi-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + BLUE + '"/></marker>'
      + '<marker id="lpi-ahs" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#6d28d9"/></marker>'
      + '<pattern id="lpi-tm" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fde68a"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" stroke-width="2"/></pattern>'
      + '</defs>'
      + '<rect x="40" y="0" width="560" height="420" fill="#fff"/>'
      // sclera, cornea
      + '<path d="M298,92 C420,50 560,40 720,44 L720,70 C560,66 422,76 304,116 Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
      + '<path d="M110,400 C110,250 190,128 298,92 L304,116 C204,148 128,262 128,400 Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      // fluid behind the iris (tinted while it is trapped)
      + '<path id="lpi-pc" fill="#a78bfa"/>'
      // ciliary body, lens, zonules
      + '<path d="M312,118 C340,106 372,98 400,96 C392,130 372,160 340,170 C326,160 314,142 312,118 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="1.5"/>'
      + '<path d="M385,400 m-100,0 a100,222 0 0,1 200,0 Z" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>';
    [[342, 166, 372, 184], [352, 160, 388, 180], [362, 152, 400, 183], [372, 144, 412, 190]].forEach(function (z) {
      h += '<line x1="' + z[0] + '" y1="' + z[1] + '" x2="' + z[2] + '" y2="' + z[3] + '" stroke="#a8a29e" stroke-width="1"/>';
    });
    h += '<path id="lpi-iris" fill="#8b5e3c" stroke="#5c3d26" stroke-width="1.5" stroke-linejoin="round"/>'
      + '<line id="lpi-hole" stroke="#fff" stroke-width="0"/>'
      // drain and canal
      + '<path d="M292,104 L305,100 L309,122 L299,126 Z" fill="url(#lpi-tm)" stroke="#b45309" stroke-width="1.2"/>'
      + '<ellipse cx="312" cy="100" rx="8" ry="4.5" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1.2"/>'
      + '<line x1="60" y1="400" x2="600" y2="400" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="4 6"/>'
      // trapped-fluid arrows (before)
      + '<g id="lpi-push">'
      + '<path d="M338,214 L312,212" stroke="#6d28d9" stroke-width="3.5" fill="none" stroke-linecap="round" marker-end="url(#lpi-ahs)"/>'
      + '<path d="M336,250 L312,250" stroke="#6d28d9" stroke-width="3.5" fill="none" stroke-linecap="round" marker-end="url(#lpi-ahs)"/>'
      + '</g>'
      // new flow (after)
      + '<g id="lpi-flow">'
      + '<path d="M342,184 C326,180 310,174 284,164" ' + a + ' marker-end="url(#lpi-ah)"/>'
      + '<path d="M270,156 C268,144 276,134 288,126" ' + a + ' marker-end="url(#lpi-ah)"/>'
      + '</g>'
      // laser
      + '<g id="lpi-beam"><line id="lpi-beamline" x1="52" y1="118" x2="262" y2="168" stroke="' + GREEN + '" stroke-linecap="round"/>'
      + '<text x="52" y="104" ' + FONT + ' font-size="22" font-weight="700" fill="#15803d">Laser</text></g>'
      + '<circle id="lpi-flash" cx="262" cy="168" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="3"/>'
      + '<g id="lpi-plume"></g>'
      // labels
      + txt(150, 300, 'Cornea', 'end') + lead(156, 294, 186, 280)
      + txt(452, 330, 'Lens', 'start') + lead(448, 324, 426, 324)
      + '<g id="lpi-iris-lab">' + txt(215, 392, 'Iris', 'end') + '<line id="lpi-iris-lead" stroke="' + MUTED + '" stroke-width="1.5"/></g>'
      + '<g id="lpi-lab-before">'
      + txt(396, 244, 'Fluid trapped', 'start', '#6d28d9') + txt(396, 270, 'behind the iris', 'start', '#6d28d9', 400) + lead(392, 238, 330, 232, '#6d28d9')
      + txt(60, 40, 'Drain crowded', 'start', RED) + txt(60, 66, 'by the iris', 'start', RED, 400) + lead(206, 46, 292, 120, RED)
      + '</g>'
      + '<g id="lpi-lab-after">'
      + txt(396, 244, 'Fluid passes', 'start', BLUE) + txt(396, 270, 'through the opening', 'start', BLUE, 400) + lead(392, 238, 322, 182, BLUE)
      + txt(60, 40, 'Drain open', 'start', '#15803d') + lead(180, 46, 294, 116, '#15803d')
      + '</g>'
      + '</svg>';
    return h;
  }
  function txt(x, y, s, anchor, color, weight) {
    return '<text x="' + x + '" y="' + y + '" ' + FONT + ' font-size="22" font-weight="' + (weight || 600) + '" fill="' + (color || INK) + '" text-anchor="' + (anchor || 'start') + '">' + s + '</text>';
  }
  function lead(x1, y1, x2, y2, color) {
    color = color || MUTED;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.5"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3.5" fill="' + color + '"/>';
  }

  // ---------- front view ----------
  var FC = [280, 222], F_IRIS = 128, F_PUPIL = 30;
  var FH = [FC[0] - 104 * Math.sin(Math.PI / 6), FC[1] - 104 * Math.cos(Math.PI / 6)]; // the opening, at about 11 o'clock
  function frontSvg() {
    var h = '<svg class="jk-lpi__svg" viewBox="0 0 560 420" role="img" aria-labelledby="jk-lpi-front-t">'
      + '<title id="jk-lpi-front-t">Front view of the iris, as the doctor sees it</title>'
      + '<defs>'
      + '<radialGradient id="lpi-irisg"><stop offset="0.2" stop-color="#a9764a"/><stop offset="0.62" stop-color="#8b5e3c"/><stop offset="1" stop-color="#5c3d26"/></radialGradient>'
      + '<radialGradient id="lpi-scl"><stop offset="0.7" stop-color="#ffffff"/><stop offset="1" stop-color="#eef1f5"/></radialGradient>'
      + '<clipPath id="lpi-fclip"><circle cx="' + FC[0] + '" cy="' + FC[1] + '" r="186"/></clipPath>'
      + '</defs>'
      + '<rect width="560" height="420" fill="#fff"/>'
      + '<circle cx="' + FC[0] + '" cy="' + FC[1] + '" r="186" fill="url(#lpi-scl)" stroke="#cbd5e1" stroke-width="2"/>'
      + '<g clip-path="url(#lpi-fclip)" fill="none" stroke="#f2a6a6" stroke-width="1.6" stroke-linecap="round">'
      + '<path d="M90,180 C116,188 132,196 148,212"/><path d="M104,292 C122,280 136,272 150,262"/><path d="M472,170 C450,182 430,190 414,204"/><path d="M460,300 C440,286 426,276 412,266"/>'
      + '</g>'
      + '<circle cx="' + FC[0] + '" cy="' + FC[1] + '" r="' + F_IRIS + '" fill="url(#lpi-irisg)" stroke="#3f2a1a" stroke-width="3"/>'
      + '<g stroke="#5c3d26" stroke-width="2" stroke-linecap="round" opacity="0.55">';
    for (var i = 0; i < 48; i++) {
      var an = i / 48 * Math.PI * 2, r1 = F_PUPIL + 10 + (i % 3) * 5, r2 = F_IRIS - 10 - (i % 4) * 6;
      h += '<line x1="' + (FC[0] + r1 * Math.cos(an)).toFixed(1) + '" y1="' + (FC[1] + r1 * Math.sin(an)).toFixed(1) + '" x2="' + (FC[0] + r2 * Math.cos(an)).toFixed(1) + '" y2="' + (FC[1] + r2 * Math.sin(an)).toFixed(1) + '"/>';
    }
    h += '</g>'
      + '<circle cx="' + FC[0] + '" cy="' + FC[1] + '" r="' + (F_PUPIL + 24) + '" fill="none" stroke="#6b4428" stroke-width="2" opacity="0.6"/>'
      + '<circle cx="' + FC[0] + '" cy="' + FC[1] + '" r="' + F_PUPIL + '" fill="#0b0f14"/>'
      + '<ellipse cx="' + (FC[0] + 50) + '" cy="' + (FC[1] - 58) + '" rx="20" ry="12" fill="#fff" opacity="0.5" transform="rotate(-35 ' + (FC[0] + 50) + ' ' + (FC[1] - 58) + ')"/>'
      // the opening
      + '<ellipse id="lpi-fhole" cx="' + FH[0].toFixed(1) + '" cy="' + FH[1].toFixed(1) + '" rx="0" ry="0" fill="#0b0f14" stroke="#3f2a1a" stroke-width="1.5"/>'
      + '<g id="lpi-fplume"></g>'
      + '<circle id="lpi-faim" cx="' + FH[0].toFixed(1) + '" cy="' + FH[1].toFixed(1) + '" r="9" fill="none" stroke="' + GREEN + '" stroke-width="3"/>'
      + '<circle id="lpi-fflash" cx="' + FH[0].toFixed(1) + '" cy="' + FH[1].toFixed(1) + '" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="3"/>'
      // labels
      + txt(540, 400, 'Pupil', 'end') + lead(480, 394, FC[0] + 14, FC[1] + 14)
      + txt(20, 400, 'Iris', 'start') + lead(62, 392, FC[0] - 74, FC[1] + 60)
      + '<g id="lpi-flab-aim">' + txt(20, 34, 'Laser aimed at', 'start', '#15803d') + txt(20, 60, 'the outer iris', 'start', '#15803d', 400) + lead(150, 66, FH[0] - 8, FH[1] - 8, '#15803d') + '</g>'
      + '<g id="lpi-flab-after">' + txt(20, 34, 'New opening', 'start', BLUE) + txt(20, 60, 'smaller than a pinhead', 'start', BLUE, 400) + lead(150, 66, FH[0] - 7, FH[1] - 7, BLUE) + '</g>'
      + '</svg>';
    return h;
  }

  // pigment specks: [angle, speed, size, delay]
  var SPECKS = [];
  (function () {
    var s = 7;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (var i = 0; i < 14; i++) SPECKS.push([rnd(), 0.5 + rnd(), 1.6 + rnd() * 2.2, rnd() * 350]);
  })();
  function specks(g, n) {
    var h = '';
    for (var i = 0; i < n; i++) h += '<circle r="' + SPECKS[i][2].toFixed(1) + '" fill="#5c3d26"/>';
    g.innerHTML = h;
    return g.querySelectorAll('circle');
  }

  // ---------- markup ----------
  var STEPS = {
    before: '<strong>Before.</strong> The iris rests against the lens, so fluid has trouble getting through the pupil. It builds up behind the iris and bows it forward, crowding the drain at the edge.',
    laser: '<strong>The laser.</strong> A few quick pulses make a tiny opening in the outer part of the iris. A small puff of pigment shows that it is through.',
    after: '<strong>After.</strong> Fluid now has a second way through. The pressure in front of and behind the iris evens out, the iris falls back, and the drain is uncovered.'
  };
  root.innerHTML = '<div class="jk-chips jk-lpi__tabs" role="group" aria-label="View">'
    + '<button type="button" class="jk-chip is-active" data-view="side" aria-pressed="true">Side view</button>'
    + '<button type="button" class="jk-chip" data-view="front" aria-pressed="false">Front view</button>'
    + '</div>'
    + '<div class="jk-lpi__views" data-show="side">'
    + '<figure class="jk-lpi__view" data-view="side"><figcaption>Side view: the eye cut in half</figcaption>' + sideSvg() + '</figure>'
    + '<figure class="jk-lpi__view" data-view="front"><figcaption>Front view: what the doctor sees</figcaption>' + frontSvg() + '</figure>'
    + '</div>'
    + '<div class="jk-lpi__controls">'
    + '<button type="button" class="btn btn-primary jk-lpi__fire" id="jk-lpi-fire">&#9889; Fire laser</button>'
    + '<button type="button" class="btn btn-outline-secondary" id="jk-lpi-reset" disabled>Start over</button>'
    + '<button type="button" class="btn btn-outline-secondary jk-lpi__full" id="jk-lpi-full" hidden>Full screen</button>'
    + '</div>'
    + '<p class="jk-lpi__step" id="jk-lpi-step" aria-live="polite"></p>';

  function $(id) { return document.getElementById(id); }
  var el = {
    views: root.querySelector('.jk-lpi__views'), fire: $('jk-lpi-fire'), reset: $('jk-lpi-reset'), full: $('jk-lpi-full'), step: $('jk-lpi-step'),
    iris: $('lpi-iris'), pc: $('lpi-pc'), hole: $('lpi-hole'), push: $('lpi-push'), flow: $('lpi-flow'),
    beam: $('lpi-beam'), beamline: $('lpi-beamline'), flash: $('lpi-flash'), irisLead: $('lpi-iris-lead'),
    labBefore: $('lpi-lab-before'), labAfter: $('lpi-lab-after'),
    fhole: $('lpi-fhole'), faim: $('lpi-faim'), fflash: $('lpi-fflash'), flabAim: $('lpi-flab-aim'), flabAfter: $('lpi-flab-after')
  };
  var plume = specks($('lpi-plume'), 9), fplume = specks($('lpi-fplume'), 14);

  // ---------- one frame ----------
  var stepShown = '';
  function stage(t) {
    var flat = ease(ramp(t, T_FLAT0, T_FLAT1)), bow = 1 - flat;
    var open = ease(ramp(t, T_OPEN, T_OPEN + 350));
    var s = irisSides(bow);
    el.iris.setAttribute('d', irisPath(s));
    el.pc.setAttribute('d', chamberPath(s));
    el.pc.style.opacity = (0.55 * bow).toFixed(3);

    // the opening: a gap across the iris strip
    var i = Math.round(HOLE_U * IRIS_N), f = s.front[i], b = s.back[i];
    var ex = (b[0] - f[0]) * 0.2, ey = (b[1] - f[1]) * 0.2;
    el.hole.setAttribute('x1', (f[0] - ex).toFixed(1)); el.hole.setAttribute('y1', (f[1] - ey).toFixed(1));
    el.hole.setAttribute('x2', (b[0] + ex).toFixed(1)); el.hole.setAttribute('y2', (b[1] + ey).toFixed(1));
    el.hole.setAttribute('stroke-width', (13 * open).toFixed(1));

    // "Iris" label follows the iris
    var m = s.front[Math.round(0.8 * IRIS_N)];
    el.irisLead.setAttribute('x1', 221); el.irisLead.setAttribute('y1', 386);
    el.irisLead.setAttribute('x2', m[0].toFixed(1)); el.irisLead.setAttribute('y2', m[1].toFixed(1));

    // laser: thin aiming beam, thick on each pulse
    var aiming = t > T_AIM + 1 && t < T_P3 + 300;
    var pulse = Math.max(pulseAt(t, T_P1), pulseAt(t, T_P2), pulseAt(t, T_P3));
    el.beam.style.opacity = aiming ? 1 : 0;
    el.beamline.setAttribute('stroke-width', (2 + 6 * pulse).toFixed(1));
    el.beamline.setAttribute('x2', f[0].toFixed(1)); el.beamline.setAttribute('y2', f[1].toFixed(1));
    [el.flash, el.fflash].forEach(function (c, k) {
      c.setAttribute('r', (pulse * (k ? 20 : 18)).toFixed(1)); c.style.opacity = pulse.toFixed(2);
    });
    el.flash.setAttribute('cx', f[0].toFixed(1)); el.flash.setAttribute('cy', f[1].toFixed(1));
    el.faim.style.opacity = aiming ? (0.55 + 0.45 * Math.sin(t / 90)).toFixed(2) : 0;

    // pigment puff, from the opening into the front chamber
    var pt = t - T_OPEN;
    for (var k = 0; k < plume.length; k++) puff(plume[k], SPECKS[k], pt, f[0] - 4, f[1], -1, 0.45, 60);
    for (k = 0; k < fplume.length; k++) puff(fplume[k], SPECKS[k], pt, FH[0], FH[1], 0, 1, 46);

    // front view opening
    el.fhole.setAttribute('rx', (8 * open).toFixed(1)); el.fhole.setAttribute('ry', (6.5 * open).toFixed(1));
    el.fhole.style.opacity = open ? 1 : 0;

    // labels and arrows
    var done = ease(ramp(t, T_FLAT1 - 500, T_END));
    el.push.style.opacity = el.labBefore.style.opacity = (1 - ease(ramp(t, T_OPEN, T_FLAT0 + 600))).toFixed(3);
    el.flow.style.opacity = ease(ramp(t, T_OPEN + 300, T_FLAT0 + 700)).toFixed(3);
    el.labAfter.style.opacity = el.flabAfter.style.opacity = done.toFixed(3);
    el.flabAim.style.opacity = aiming ? 1 : 0;

    var step = t <= 0 ? 'before' : t < T_FLAT0 + 400 ? 'laser' : 'after';
    if (step !== stepShown) { stepShown = step; el.step.innerHTML = STEPS[step]; }
  }
  function pulseAt(t, t0) { var x = (t - t0) / 220; return x < 0 || x > 1 ? 0 : Math.sin(Math.PI * x); }
  // a speck drifting from (x, y): dirX -1 = toward the front of the eye; fall = how much it sinks
  function puff(c, sp, pt, x, y, dirX, fall, reach) {
    var p = clamp((pt - sp[3]) / 1700, 0, 1);
    if (pt <= sp[3] || p >= 1) { c.style.opacity = 0; return; }
    var d = reach * sp[1] * (1 - Math.pow(1 - p, 2)), spread = (sp[0] - 0.5) * 2;
    var px = dirX ? x + dirX * d + spread * 6 * p : x + spread * d * 0.7;
    var py = y + (dirX ? spread * d * 0.5 : 0) + fall * 40 * p * p + (dirX ? 0 : d * 0.5 * Math.abs(spread) * 0.3);
    c.setAttribute('cx', px.toFixed(1)); c.setAttribute('cy', py.toFixed(1));
    c.style.opacity = (0.85 * (1 - p)).toFixed(2);
  }

  // ---------- controls ----------
  var raf = 0, playing = false;
  function setButtons(state) { // 'before' | 'playing' | 'after'
    el.fire.disabled = state !== 'before';
    el.reset.disabled = state === 'before';
  }
  function stop() { cancelAnimationFrame(raf); playing = false; }
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
  function reset() { stop(); stage(0); setButtons('before'); }

  el.fire.addEventListener('click', fire);
  el.reset.addEventListener('click', reset);
  root.querySelectorAll('.jk-lpi__tabs .jk-chip').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-view');
      el.views.setAttribute('data-show', v);
      root.querySelectorAll('.jk-lpi__tabs .jk-chip').forEach(function (o) {
        var on = o === b; o.classList.toggle('is-active', on); o.setAttribute('aria-pressed', String(on));
      });
    });
  });

  // Full screen, for showing it on the exam-room screen (not offered where
  // the browser cannot do it, such as Safari on an iPhone)
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

  stage(0);
  setButtons('before');
  root.classList.add('is-ready');
})();
