/* Cataract surgery for procedure.js (load this file first). Same rules as
 * the other topic files: the picture is a pure function of time; a step's
 * draw sets what it owns at every p and touches another step's pieces only
 * when p > 0.
 *
 * One drawing: the eye from the front, as the surgeon sees it through the
 * microscope. Main incision at 3 o'clock, side port near 12. Each step has
 * its own copies of the instruments (ids ct-<step>-<tool>), so no two steps
 * fight over one element. An instrument is drawn with its tip at 0,0 and
 * its shaft along +x, and tool() places the tip and swings the shaft so it
 * passes through its incision, the way an instrument pivots in the wound.
 *
 * Scale: about 13 units to the millimeter (cornea 12 mm, dilated pupil
 * 8 mm, opening in the capsule 5.5 mm, implant optic 6 mm).
 */
(window.JK_PROC_EXTRA = window.JK_PROC_EXTRA || []).push(function (H) {
  'use strict';
  var clamp = H.clamp, ease = H.ease, lerp = H.lerp, txt = H.txt, lead = H.lead, op = H.op, at = H.at, svgOpen = H.svgOpen, $ = H.$;
  var MUTED = H.MUTED;
  var C = [280, 215], R_LIMBUS = 152, R_PUPIL = 104, R_SMALL = 44, R_NUC = 62, R_RHEX = 36, R_OPTIC = 42;

  function pt(r, deg) { var a = deg * Math.PI / 180; return [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)]; }
  function f(v) { return v.toFixed(1); }
  // window: how far p is through [a, b], eased
  function win(p, a, b) { return ease(clamp((p - a) / (b - a), 0, 1)); }
  function mix(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }

  // the incisions: where they are, and the outward direction there
  function inc(deg) { var q = pt(R_LIMBUS - 6, deg), a = deg * Math.PI / 180; return { x: q[0], y: q[1], ux: Math.cos(a), uy: Math.sin(a), deg: deg }; }
  var MAIN = inc(0), SIDE = inc(-100);
  function outside(w, k) { return [w.x + w.ux * 260 * k, w.y + w.uy * 260 * k]; } // k=1: off the picture
  function inner(w, d) { return [w.x - w.ux * d, w.y - w.uy * d]; }

  // Place instrument `id` with its tip at `tip`, its shaft through wound w.
  function tool(id, w, tip, show) {
    var e = $(id); if (!e) return;
    e.style.opacity = show ? 1 : 0;
    if (!show) return;
    var dx = w.x - tip[0], dy = w.y - tip[1], ang;
    if (dx * w.ux + dy * w.uy <= 0.5) ang = w.deg; // at or outside the wound: straight out
    else ang = Math.atan2(dy + w.uy * 4, dx + w.ux * 4) * 180 / Math.PI;
    e.setAttribute('transform', 'translate(' + f(tip[0]) + ',' + f(tip[1]) + ') rotate(' + f(ang) + ')');
  }
  // In and out along a path: enter over [a0, a1], leave over [b0, b1].
  // Between, the caller gives the tip. Returns null when the tool is out.
  function inOut(w, p, a0, a1, b0, b1, first, last) {
    if (p <= a0 || p >= b1) return null;
    if (p < a1) return mix(outside(w, 1), first, win(p, a0, a1));
    if (p > b0) return mix(last, outside(w, 1), win(p, b0, b1));
    return undefined; // inside: caller decides
  }

  // ---------- instruments (tip at 0,0, shaft along +x) ----------
  var STEEL = '#94a3b8', STEEL_D = '#475569';
  function shaft(w, color) { return '<line x1="6" y1="0" x2="420" y2="0" stroke="' + (color || STEEL) + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  var TOOLS = {
    blade: '<path d="M0,0 L16,-7 L34,-7 L34,7 L16,7 Z" fill="#e2e8f0" stroke="' + STEEL_D + '" stroke-width="1.5"/>' + shaft(5, STEEL_D),
    keratome: '<path d="M0,0 L20,-15 L44,-15 L44,15 L20,15 Z" fill="#e2e8f0" stroke="' + STEEL_D + '" stroke-width="1.5"/>' + shaft(6, STEEL_D),
    cannula: shaft(4) + '<circle cx="0" cy="0" r="2.5" fill="' + STEEL_D + '"/>',
    needle: '<path d="M0,0 L-3,7" stroke="' + STEEL_D + '" stroke-width="2.5" stroke-linecap="round"/>' + shaft(3, STEEL_D),
    phaco: '<rect x="12" y="-9" width="420" height="18" rx="8" fill="#cbd5e1" stroke="' + STEEL + '" stroke-width="1.5"/><rect x="-2" y="-4" width="18" height="8" rx="2" fill="' + STEEL_D + '"/>',
    chopper: '<path d="M0,0 L-4,-9" stroke="' + STEEL_D + '" stroke-width="3" stroke-linecap="round"/>' + shaft(3.5, STEEL_D),
    ia: '<rect x="0" y="-7" width="420" height="14" rx="7" fill="#e2e8f0" stroke="' + STEEL + '" stroke-width="1.5"/><circle cx="10" cy="-2" r="2.2" fill="' + STEEL_D + '"/>',
    injector: '<path d="M0,-6 L26,-11 L420,-11 L420,11 L26,11 L0,6 Z" fill="#f1f5f9" stroke="' + STEEL + '" stroke-width="1.5"/>'
  };
  function toolSvg(id, kind) { return '<g id="' + id + '" opacity="0">' + TOOLS[kind] + '</g>'; }

  // ---------- the nucleus: four quarters, so it can be chopped ----------
  var QUARTERS = [[1, 1], [-1, 1], [-1, -1], [1, -1]]; // the sign of x and y of each quarter's middle
  function quarterPath(i) {
    var a0 = i * 90 * Math.PI / 180, a1 = (i + 1) * 90 * Math.PI / 180;
    return 'M0,0 L' + f(R_NUC * Math.cos(a0)) + ',' + f(R_NUC * Math.sin(a0)) + ' A' + R_NUC + ',' + R_NUC + ' 0 0,1 ' + f(R_NUC * Math.cos(a1)) + ',' + f(R_NUC * Math.sin(a1)) + ' Z';
  }
  function arcPath(r, i) {
    var a0 = i * Math.PI / 2, a1 = (i + 1) * Math.PI / 2;
    return 'M' + f(r * Math.cos(a0)) + ',' + f(r * Math.sin(a0)) + ' A' + r + ',' + r + ' 0 0,1 ' + f(r * Math.cos(a1)) + ',' + f(r * Math.sin(a1));
  }
  // the cortex: eight slices under and around the nucleus, cleaned one by one
  var SLICES = 8;
  function slicePath(i) {
    var r = R_PUPIL + 8, a0 = (i / SLICES) * 2 * Math.PI, a1 = ((i + 1) / SLICES) * 2 * Math.PI;
    return 'M' + C[0] + ',' + C[1] + ' L' + f(C[0] + r * Math.cos(a0)) + ',' + f(C[1] + r * Math.sin(a0)) + ' A' + r + ',' + r + ' 0 0,1 ' + f(C[0] + r * Math.cos(a1)) + ',' + f(C[1] + r * Math.sin(a1)) + ' Z';
  }

  // ---------- the drawing ----------
  function cataractSvg() {
    var h = svgOpen('0 0 560 460', 'The eye from the front, as the surgeon sees it through the microscope, with a cloudy lens behind the pupil'), i, a, q;
    h += '<defs>'
      + '<radialGradient id="ct-scl"><stop offset="0.7" stop-color="#ffffff"/><stop offset="1" stop-color="#eef1f5"/></radialGradient>'
      + '<radialGradient id="ct-iris"><stop offset="0.55" stop-color="#7aa0c4"/><stop offset="0.85" stop-color="#4f7aa3"/><stop offset="1" stop-color="#2f4f6e"/></radialGradient>'
      + '<radialGradient id="ct-reflex"><stop offset="0" stop-color="#f08a4b"/><stop offset="0.75" stop-color="#d0572a"/><stop offset="1" stop-color="#8f2f14"/></radialGradient>'
      + '<radialGradient id="ct-nuc" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="' + R_NUC + '"><stop offset="0" stop-color="#a1621c"/><stop offset="0.6" stop-color="#c58a2e"/><stop offset="1" stop-color="#ddb35a"/></radialGradient>'
      + '<clipPath id="ct-pupil"><circle id="ct-pupil-c" cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_SMALL + '"/></clipPath>'
      + '<clipPath id="ct-cornea"><circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + (R_LIMBUS - 2) + '"/></clipPath>'
      + '</defs>';
    // the white of the eye, its vessels, the lid holder
    h += '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="196" fill="url(#ct-scl)" stroke="#cbd5e1" stroke-width="2"/>'
      + '<g fill="none" stroke="#f2a6a6" stroke-width="1.6" stroke-linecap="round">'
      + '<path d="M96,170 C114,180 126,188 134,196"/><path d="M100,272 C116,262 126,254 134,246"/><path d="M466,168 C446,178 436,186 428,194"/><path d="M462,274 C444,264 434,256 428,250"/>'
      + '<path d="M214,34 C222,50 228,60 236,70"/><path d="M350,398 C342,384 334,372 326,362"/>'
      + '</g>'
      + '<g id="ct-iodine" opacity="0"><circle cx="' + C[0] + '" cy="' + C[1] + '" r="196" fill="#b45309"/></g>'
      + '<g id="ct-spec" opacity="0" fill="none" stroke="#64748b" stroke-width="7" stroke-linecap="round">'
      + '<path d="M180,30 Q280,6 380,30"/><path d="M180,400 Q280,424 380,400"/></g>'
      // the iris and its fibers; the pupil is cut out by drawing over it
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_LIMBUS + '" fill="url(#ct-iris)" stroke="#2f4f6e" stroke-width="2"/>'
      + '<g stroke="#2f4f6e" stroke-width="2" stroke-linecap="round" opacity="0.4">';
    for (i = 0; i < 56; i++) {
      a = i / 56 * 360; var r2 = R_LIMBUS - 8 - (i % 4) * 5;
      q = pt(R_SMALL + 4, a); var q2 = pt(r2, a);
      h += '<line x1="' + f(q[0]) + '" y1="' + f(q[1]) + '" x2="' + f(q2[0]) + '" y2="' + f(q2[1]) + '"/>';
    }
    h += '</g>'
      // everything seen through the pupil
      + '<g clip-path="url(#ct-pupil)">'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + (R_PUPIL + 10) + '" fill="url(#ct-reflex)"/>'
      + '<g id="ct-cortex" fill="#efe6c8" stroke="#d6c79a" stroke-width="1">';
    for (i = 0; i < SLICES; i++) h += '<path d="' + slicePath(i) + '" opacity="0.88"/>';
    h += '</g>'
      + '<g id="ct-striae" stroke="#d6c79a" stroke-width="1.4" opacity="0.8">';
    for (i = 0; i < 24; i++) { q = pt(R_NUC + 6, i * 15); var q3 = pt(R_PUPIL + 4, i * 15 + 4); h += '<line x1="' + f(q[0]) + '" y1="' + f(q[1]) + '" x2="' + f(q3[0]) + '" y2="' + f(q3[1]) + '"/>'; }
    h += '</g>'
      + '<circle id="ct-ring" cx="' + C[0] + '" cy="' + C[1] + '" r="' + (R_NUC + 5) + '" fill="none" stroke="#fde047" stroke-width="3.5" opacity="0"/>'
      + '<g id="ct-nuc" transform="translate(' + C[0] + ',' + C[1] + ')">';
    for (i = 0; i < 4; i++) {
      h += '<g class="ct-q"><path d="' + quarterPath(i) + '" fill="url(#ct-nuc)" stroke="url(#ct-nuc)" stroke-width="1"/>'
        + '<path d="' + arcPath(R_NUC, i) + '" fill="none" stroke="#8a5a1c" stroke-width="1.5"/>'
        + '<path d="' + arcPath(R_NUC * 0.62, i) + '" fill="none" stroke="#8a5a1c" stroke-width="1.2" opacity="0.35"/>'
        + '<path d="' + arcPath(R_NUC * 0.3, i) + '" fill="none" stroke="#7c4a12" stroke-width="1.2" opacity="0.3"/></g>';
    }
    h += '</g>'
      + '<ellipse id="ct-wave" cx="' + C[0] + '" cy="' + C[1] + '" rx="18" ry="' + (R_PUPIL + 6) + '" fill="#bfdbfe" fill-opacity="0.35" stroke="#60a5fa" stroke-width="3" opacity="0"/>'
      + '<g id="ct-us" opacity="0" fill="none" stroke="#e0f2fe" stroke-width="2.5"><circle cx="' + (C[0] + 6) + '" cy="' + C[1] + '" r="10"/><circle cx="' + (C[0] + 6) + '" cy="' + C[1] + '" r="18" opacity="0.6"/></g>'
      + '<circle id="ct-bagvisco" cx="' + C[0] + '" cy="' + C[1] + '" r="0" fill="#bae6fd" opacity="0"/>'
      // the new lens: optic and two arms
      + '<g id="ct-iol" opacity="0"><g id="ct-iol-in">'
      + '<path d="M0,-37 C40,-50 76,-34 82,6" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round"/>'
      + '<path d="M0,37 C-40,50 -76,34 -82,-6" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round"/>'
      + '<circle r="' + R_OPTIC + '" fill="#e0f2fe" fill-opacity="0.35" stroke="#60a5fa" stroke-width="2.5"/>'
      + '<circle r="' + (R_OPTIC - 8) + '" fill="none" stroke="#f8fafc" stroke-width="1" opacity="0.6"/>'
      + '</g></g>'
      // the front of the capsule: the round piece and the opening's edge
      + '<circle id="ct-flap" cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_RHEX + '" fill="#f8fafc" opacity="0"/>'
      + '<path id="ct-rhexis" d="M' + (C[0] + R_RHEX) + ',' + C[1] + ' a' + R_RHEX + ',' + R_RHEX + ' 0 1,0 ' + (-2 * R_RHEX) + ',0 a' + R_RHEX + ',' + R_RHEX + ' 0 1,0 ' + (2 * R_RHEX) + ',0" pathLength="1" fill="none" stroke="#f8fafc" stroke-width="2.5" stroke-dasharray="1 1" stroke-dashoffset="1"/>'
      + '</g>'
      + '<circle id="ct-pupil-edge" cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_SMALL + '" fill="none" stroke="#1e3a52" stroke-width="2.5"/>'
      // the front chamber: gel, medicines, the incisions
      + '<g clip-path="url(#ct-cornea)">'
      + '<circle id="ct-visco" cx="' + C[0] + '" cy="' + C[1] + '" r="' + (R_LIMBUS - 2) + '" fill="#bae6fd" opacity="0"/>'
      + '<circle id="ct-lido" cx="' + SIDE.x + '" cy="' + SIDE.y + '" r="0" fill="#c4b5fd" opacity="0"/>'
      + '<circle id="ct-moxi" cx="' + SIDE.x + '" cy="' + SIDE.y + '" r="0" fill="#fde047" opacity="0"/>'
      + '</g>';
    function slit(id, w, half) { var a = pt(R_LIMBUS - 5, w.deg - half), b = pt(R_LIMBUS - 5, w.deg + half); return '<path id="' + id + '" d="M' + f(a[0]) + ',' + f(a[1]) + ' A' + (R_LIMBUS - 5) + ',' + (R_LIMBUS - 5) + ' 0 0,1 ' + f(b[0]) + ',' + f(b[1]) + '" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round" opacity="0"/>'; }
    h += slit('ct-cut-side', SIDE, 2.5) + slit('ct-cut-main', MAIN, 5.5)
      + '<circle id="ct-seal-main" cx="' + f(MAIN.x) + '" cy="' + f(MAIN.y) + '" r="12" fill="#f8fafc" opacity="0"/>'
      + '<circle id="ct-seal-side" cx="' + f(SIDE.x) + '" cy="' + f(SIDE.y) + '" r="8" fill="#f8fafc" opacity="0"/>'
      + '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="' + R_LIMBUS + '" fill="none" stroke="#2f4f6e" stroke-width="2"/>'
      + '<ellipse cx="' + (C[0] - 62) + '" cy="' + (C[1] - 70) + '" rx="22" ry="11" fill="#fff" opacity="0.4" transform="rotate(-35 ' + (C[0] - 62) + ' ' + (C[1] - 70) + ')"/>';
    // instruments, one set per step
    [['ct-2-blade', 'blade'], ['ct-2-can', 'cannula'], ['ct-3-can', 'cannula'], ['ct-3-ker', 'keratome'], ['ct-4-ndl', 'needle'],
      ['ct-5-can', 'cannula'], ['ct-6-chop', 'chopper'], ['ct-6-phaco', 'phaco'], ['ct-7-chop', 'chopper'], ['ct-7-phaco', 'phaco'], ['ct-7-ia', 'ia'],
      ['ct-8-can', 'cannula'], ['ct-8-inj', 'injector'], ['ct-8-ia', 'ia'], ['ct-9-can', 'cannula'], ['ct-9-can2', 'cannula'], ['ct-9-moxi', 'cannula']
    ].forEach(function (t) { h += toolSvg(t[0], t[1]); });
    // labels
    h += txt(20, 410, 'Iris', 'start') + lead(58, 404, C[0] - 112, C[1] + 92)
      + '<g id="ct-lab-lens">' + txt(540, 34, 'Cloudy lens', 'end', '#92400e') + lead(470, 42, C[0] + 22, C[1] - 18, '#92400e') + '</g>'
      + '<g id="ct-lab-main" opacity="0">' + txt(540, 316, 'Main', 'end', MUTED, 600, 17) + txt(540, 336, 'opening', 'end', MUTED, 600, 17) + lead(500, 300, MAIN.x + 4, MAIN.y + 8) + '</g>'
      + '<g id="ct-lab-side" opacity="0">' + txt(20, 34, 'Side opening', 'start', MUTED, 600, 17) + lead(124, 40, SIDE.x - 4, SIDE.y - 2) + '</g>';
    var LABS = ['Before: a cloudy lens behind the pupil', 'Pupil widened, eye cleaned, lids held open', 'Numbing medicine: may sting for a few seconds',
      'Gel fills the front of the eye', 'A round opening in the capsule', 'Fluid frees the lens so it can turn', 'Split into pieces: horizontal chop',
      'Pieces removed, capsule cleaned', 'The new lens unfolds in the capsule', 'Sealed without stitches; antibiotic inside'];
    LABS.forEach(function (s, k) { h += '<g id="ct-lab-' + k + '"' + (k ? ' opacity="0"' : '') + '>' + txt(280, 446, s, 'middle', '#1e3a8a', 700, 19) + '</g>'; });
    return h + '</svg>';
  }

  // ---------- shared state setters ----------
  function pupil(r) { at('ct-pupil-c', 'r', r); at('ct-pupil-edge', 'r', r); }
  var nucRot = 0;
  function nucleus(rot, crackA, crackB1, crackB2, gone) {
    var g = document.querySelectorAll('#ct-nuc .ct-q'), i, s;
    at('ct-nuc', 'transform', 'translate(' + C[0] + ',' + C[1] + ') rotate(' + f(rot) + ')');
    for (i = 0; i < g.length; i++) {
      s = QUARTERS[i];
      var dx = 6 * crackA * s[0], dy = 6 * (i === 0 || i === 3 ? crackB1 : crackB2) * s[1], k = gone ? gone[i] : 0;
      g[i].setAttribute('transform', 'scale(' + (1 - 0.9 * k).toFixed(3) + ') translate(' + f(dx * (1 - k)) + ',' + f(dy * (1 - k)) + ')');
      g[i].style.opacity = (1 - k).toFixed(3);
    }
  }
  function cortex(left) { // left: 0..SLICES slices still there, in order of cleaning
    var s = document.querySelectorAll('#ct-cortex path'), i;
    for (i = 0; i < s.length; i++) s[i].style.opacity = (0.88 * clamp(left - i, 0, 1)).toFixed(3);
    op('ct-striae', 0.8 * clamp(left / SLICES * 1.6 - 0.6, 0, 1));
  }
  function label(k, p) { // the old one fades out before the new one fades in, so they never overlap
    if (k === 1 && p <= 0) op('ct-lab-0', 1);
    op('ct-lab-' + k, win(p, 0.05, 0.12));
    if (p > 0) op('ct-lab-' + (k - 1), 1 - win(p, 0, 0.05));
  }
  function puff(id, p, a, b, r, peak) { // a cloud of fluid spreading from the cannula, then fading
    var k = clamp((p - a) / (b - a), 0, 1);
    at(id, 'r', r * ease(clamp(k * 1.6, 0, 1))); op(id, k > 0 && k < 1 ? peak * (1 - ease(clamp(k * 2 - 1, 0, 1))) : 0);
  }

  // ---------- the steps ----------
  var STEPS = [
    { label: 'Getting ready', dur: 3600, caption: '<strong>Getting ready.</strong> Drops widen the pupil and numb the surface of the eye, and you are given medicine to relax. The skin around the eye is cleaned with an iodine wash, a sterile sheet is draped over the face, and a small spring holds the eyelids open, so you do not need to worry about blinking. You see bright light and colors, not the instruments.',
      draw: function (p) {
        pupil(lerp(R_SMALL, R_PUPIL, win(p, 0, 0.45)));
        op('ct-iodine', 0.4 * Math.sin(Math.PI * clamp((p - 0.35) / 0.45, 0, 1)));
        op('ct-spec', win(p, 0.65, 0.95)); label(1, p);
      } },
    { label: 'Numbing', dur: 4600, caption: '<strong>A tiny side opening, and numbing inside the eye.</strong> A fine blade makes an opening about a millimeter wide at the edge of the cornea, the clear window over the iris. Numbing medicine (lidocaine) is then rinsed into the eye through it. For many people this is the most uncomfortable moment of the whole operation: it can sting or burn for a few seconds. It passes quickly, and the eye stays numb from then on.',
      draw: function (p) {
        var t = inOut(SIDE, p, 0, 0.16, 0.26, 0.38, inner(SIDE, 14), inner(SIDE, 14));
        tool('ct-2-blade', SIDE, t === undefined ? inner(SIDE, 14) : t || [0, 0], t !== null);
        op('ct-cut-side', p > 0.2 ? 1 : 0); op('ct-lab-side', win(p, 0.2, 0.35));
        t = inOut(SIDE, p, 0.4, 0.52, 0.82, 0.94, inner(SIDE, 40), inner(SIDE, 40));
        tool('ct-2-can', SIDE, t === undefined ? inner(SIDE, 40) : t || [0, 0], t !== null);
        puff('ct-lido', p, 0.52, 0.98, 150, 0.45); label(2, p);
      } },
    { label: 'Gel, opening', dur: 4600, caption: '<strong>Protective gel and the main opening.</strong> A clear gel (viscoelastic) fills the front of the eye. It holds the space open and cushions the cornea&rsquo;s delicate inner lining while the surgeon works. Then the main opening is made, about 2 millimeters wide. It is shaped as a tiny tunnel through the cornea, so that it seals itself at the end without stitches.',
      draw: function (p) {
        var mid = inner(SIDE, 70), t = inOut(SIDE, p, 0, 0.1, 0.4, 0.5, mid, mid);
        tool('ct-3-can', SIDE, t === undefined ? mid : t || [0, 0], t !== null);
        op('ct-visco', 0.28 * win(p, 0.1, 0.4));
        t = inOut(MAIN, p, 0.52, 0.66, 0.8, 0.94, inner(MAIN, 22), inner(MAIN, 22));
        tool('ct-3-ker', MAIN, t === undefined ? inner(MAIN, 22) : t || [0, 0], t !== null);
        op('ct-cut-main', p > 0.62 ? 1 : 0); op('ct-lab-main', win(p, 0.62, 0.8)); label(3, p);
      } },
    { label: 'Capsule', dur: 4400, caption: '<strong>Opening the lens capsule.</strong> The lens sits inside a thin, clear bag called the capsule. The surgeon tears a smooth, round opening in the front of it, about 5 millimeters across, and lifts the round piece out. This opening (the capsulorhexis) is the door for everything that follows. The rest of the bag stays in place, to hold the new lens.',
      draw: function (p) {
        var k = win(p, 0.14, 0.72), ang = -360 * k, edge = pt(R_RHEX, ang), lift = win(p, 0.76, 0.9);
        at('ct-rhexis', 'stroke-dashoffset', 1 - k);
        op('ct-flap', p > 0 && lift < 1 ? 0.55 * (1 - lift) : 0);
        at('ct-flap', 'transform', 'translate(' + f((MAIN.x - C[0] - 30) * lift) + ',0)');
        var t = inOut(MAIN, p, 0, 0.14, 0.76, 0.92, pt(R_RHEX, 0), pt(R_RHEX, 0));
        tool('ct-4-ndl', MAIN, t === undefined ? edge : t || [0, 0], t !== null);
        label(4, p);
      } },
    { label: 'Loosening', dur: 4600, caption: '<strong>Loosening the lens.</strong> Fluid is gently injected under the edge of the opening. A wave of fluid passes behind the lens and frees it from the capsule (hydrodissection), and a second injection separates the hard center of the lens from its softer outer shell (hydrodelineation). The lens can then turn freely inside the bag, which makes the next steps gentler on the eye.',
      draw: function (p) {
        var tip = pt(R_RHEX + 4, 8), t = inOut(MAIN, p, 0, 0.1, 0.86, 0.96, tip, tip), w = win(p, 0.12, 0.42), turn = win(p, 0.62, 0.86);
        tool('ct-5-can', MAIN, t === undefined ? mix(tip, pt(R_NUC - 10, 160), win(p, 0.62, 0.86) * 0.5) : t || [0, 0], t !== null);
        at('ct-wave', 'cx', lerp(C[0] + 70, C[0] - 130, w)); op('ct-wave', p > 0.1 && w < 1 ? 1 : 0);
        op('ct-ring', win(p, 0.44, 0.6));
        nucRot = 90 * turn; nucleus(nucRot, 0, 0, 0);
        label(5, p);
      } },
    { label: 'Dividing', dur: 7800, caption: '<strong>Dividing the lens.</strong> An ultrasound probe (the phaco tip) holds the hard center of the lens. A second, hooked instrument, the chopper, comes in through the side opening, reaches around to the far edge of the lens, and is pulled back toward the probe, splitting the lens in two. The lens is turned and the move repeated until it is in pieces. This technique, horizontal chop, splits the lens by hand rather than carving it with ultrasound, so less ultrasound energy goes into the eye.',
      draw: function (p) {
        var hold = [C[0] + 14, C[1]], far = [C[0] - R_NUC - 6, C[1] + 2], near = [C[0] + 2, C[1]];
        var t = inOut(MAIN, p, 0, 0.08, 2, 3, hold, hold);
        tool('ct-6-phaco', MAIN, t === undefined ? hold : t || [0, 0], t !== null);
        // three chops: [reach, pull from, pull to, crack]; turns between them
        var A = win(p, 0.15, 0.24), B1 = win(p, 0.5, 0.59), B2 = win(p, 0.82, 0.91);
        var tip;
        if (p < 0.08) tip = null;
        else if (p < 0.12) tip = mix(outside(SIDE, 1), far, win(p, 0.08, 0.12));
        else if (p < 0.24) tip = mix(far, near, win(p, 0.12, 0.24));
        else if (p < 0.44) tip = mix(near, far, win(p, 0.26, 0.34));
        else if (p < 0.56) tip = mix(far, near, win(p, 0.44, 0.56));
        else if (p < 0.76) tip = mix(near, far, win(p, 0.58, 0.66));
        else tip = mix(far, near, win(p, 0.76, 0.88));
        tool('ct-6-chop', SIDE, tip || [0, 0], tip !== null);
        if (p > 0) {
          op('ct-5-can', 0);
          nucRot = 90 + 90 * win(p, 0.3, 0.42) + 180 * win(p, 0.62, 0.74);
          nucleus(nucRot, A, B1, B2);
          op('ct-ring', 1 - win(p, 0, 0.2));
        }
        label(6, p);
      } },
    { label: 'Removing', dur: 7600, caption: '<strong>Removing the pieces, then cleaning the capsule.</strong> The probe breaks each piece up with ultrasound and vacuums it out, while the chopper guides the pieces to it. A gentler suction tip then removes the soft outer layer (the cortex) that lines the capsule, leaving a clean, clear bag. The orange glow is light reflecting back from the retina, which now shines through.',
      draw: function (p, time) {
        var hold = [C[0] + 14, C[1]], help = [C[0] - 30, C[1] - 18];
        var t = inOut(MAIN, p, 0, 0, 0.56, 0.64, hold, hold);
        tool('ct-7-phaco', MAIN, t === undefined ? hold : t || [0, 0], p > 0 && t !== null);
        t = inOut(SIDE, p, 0, 0, 0.56, 0.64, help, help);
        tool('ct-7-chop', SIDE, t === undefined ? mix([C[0] - R_NUC - 6, C[1] + 2], help, win(p, 0, 0.06)) : t || [0, 0], p > 0 && t !== null);
        var order = [1, 2, 0, 3], gone = [0, 0, 0, 0], busy = false, k;
        order.forEach(function (q, n) { var a = 0.04 + n * 0.12; gone[q] = win(p, a, a + 0.12); if (p > a && p < a + 0.12) busy = true; });
        var c = 0.66, sweep = win(p, c + 0.04, 0.96), iaTip = pt(R_PUPIL - 34, 360 * sweep + 20);
        t = inOut(MAIN, p, c, c + 0.04, 0.95, 1, iaTip, iaTip);
        tool('ct-7-ia', MAIN, t === undefined ? iaTip : t || [0, 0], t !== null);
        if (p > 0) {
          op('ct-6-phaco', 0); op('ct-6-chop', 0);
          nucleus(nucRot, 1, 1, 1, gone);
          op('ct-us', busy ? 0.5 + 0.5 * Math.sin(time / 40) : 0);
          op('ct-lab-lens', 1 - win(p, 0.3, 0.5));
        } else { op('ct-us', 0); op('ct-lab-lens', 1); }
        k = SLICES - SLICES * win(p, c + 0.04, 0.96);
        cortex(k);
        label(7, p);
      } },
    { label: 'New lens', dur: 7400, caption: '<strong>Placing the new lens.</strong> The empty capsule is filled with gel, and the new lens is injected, folded, through the same small opening. It unfolds slowly inside the bag, and its two curved arms hold it centered. (A toric lens, for astigmatism, is then turned to line up with marks made on the eye.) Last, the gel is rinsed out, so that it does not raise the eye pressure afterward.',
      draw: function (p) {
        var mid = [C[0] + 30, C[1]], t = inOut(MAIN, p, 0, 0.06, 0.18, 0.24, mid, mid);
        tool('ct-8-can', MAIN, t === undefined ? mid : t || [0, 0], t !== null);
        var fill = win(p, 0.06, 0.2), clear = win(p, 0.72, 0.94);
        at('ct-bagvisco', 'r', (R_PUPIL + 8) * fill); op('ct-bagvisco', 0.3 * fill * (1 - clear));
        var nose = [MAIN.x - 8, C[1]];
        t = inOut(MAIN, p, 0.24, 0.32, 0.6, 0.66, nose, nose);
        tool('ct-8-inj', MAIN, t === undefined ? nose : t || [0, 0], t !== null);
        var go = win(p, 0.32, 0.5), open = win(p, 0.4, 0.6), dial = win(p, 0.6, 0.68);
        op('ct-iol', p > 0.32 ? 1 : 0);
        at('ct-iol', 'transform', 'translate(' + f(lerp(MAIN.x - 10, C[0], go)) + ',' + C[1] + ') rotate(' + f(-40 * dial) + ')');
        at('ct-iol-in', 'transform', 'scale(' + (0.35 + 0.65 * go).toFixed(3) + ',' + (0.12 + 0.88 * open).toFixed(3) + ')');
        var ang = 360 * win(p, 0.72, 0.94), iaTip = pt(R_PUPIL - 46, ang + 200);
        t = inOut(MAIN, p, 0.68, 0.72, 0.94, 1, iaTip, iaTip);
        tool('ct-8-ia', MAIN, t === undefined ? iaTip : t || [0, 0], t !== null);
        if (p > 0) { op('ct-visco', 0.28 * (1 - clear)); op('ct-7-ia', 0); }
        label(8, p);
      } },
    { label: 'Sealing', dur: 5000, caption: '<strong>Sealing, and an antibiotic.</strong> A little fluid is injected into the sides of each opening. The tissue swells slightly and the tunnel seals itself shut, so no stitches are needed. Last, an antibiotic (moxifloxacin) is placed inside the eye to help prevent infection. The lid holder comes out, and a shield goes over the eye.',
      draw: function (p) {
        var m = inner(MAIN, 4), s = inner(SIDE, 4), t = inOut(MAIN, p, 0, 0.08, 0.2, 0.27, m, m);
        tool('ct-9-can', MAIN, t === undefined ? m : t || [0, 0], t !== null);
        t = inOut(SIDE, p, 0.27, 0.33, 0.42, 0.5, s, s);
        tool('ct-9-can2', SIDE, t === undefined ? s : t || [0, 0], t !== null);
        var sm = win(p, 0.08, 0.2), ss = win(p, 0.33, 0.42);
        op('ct-seal-main', 0.85 * sm * (1 - 0.5 * win(p, 0.6, 1))); op('ct-seal-side', 0.85 * ss * (1 - 0.5 * win(p, 0.6, 1)));
        var mid = inner(SIDE, 46);
        t = inOut(SIDE, p, 0.52, 0.6, 0.78, 0.86, mid, mid);
        tool('ct-9-moxi', SIDE, t === undefined ? mid : t || [0, 0], t !== null);
        puff('ct-moxi', p, 0.6, 1.05, 150, 0.35);
        if (p > 0) op('ct-spec', 1 - win(p, 0.9, 1));
        label(9, p);
      } }
  ];

  return {
    cataract: {
      views: [['The eye from the front, as the surgeon sees it', cataractSvg]],
      intro: '<strong>Before.</strong> This is the eye as the surgeon sees it through the operating microscope, looking straight down at the front of the eye. The cloudy lens, the cataract, sits just behind the pupil. The whole operation is done through two tiny openings at the edge of the cornea.',
      steps: STEPS
    }
  };
});
