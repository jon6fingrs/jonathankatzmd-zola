/* Step-by-step procedure demos for the Learn pages: SLT, MIGS,
 * trabeculectomy and tube shunt. A page has one
 *     <div id="jk-proc" class="jk-lpi" data-proc="slt"></div>
 * and this file builds it. SLT has two variants (standard, and direct SLT
 * without a contact lens) switched by chips; see `variants`.
 *
 * Each procedure is an entry in PROCS: one or two drawings (inline SVG,
 * using the same eye geometry as tools/learn-figures.py) and a list of
 * steps. A step has a short label, a caption, a duration and draw(p, t),
 * where p runs 0..1 through that step and t is the time in ms. The whole
 * picture is a pure function of t: render(t) calls every step's draw with
 * its own p, so earlier steps sit at 1 and later ones at 0. That lets the
 * step buttons jump anywhere, and reduced motion jump straight to the end.
 *
 * Layout and buttons share the .jk-lpi styles with the iridotomy demo.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-proc');
  if (!root) return;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FONT = 'font-family="Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"';
  var INK = '#1f2937', BLUE = '#2a6ebb', MUTED = '#5b6573', GREEN = '#16a34a', WATER = '#3b82f6';

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(x) { return x * x * (3 - 2 * x); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function txt(x, y, s, anchor, color, weight, size) {
    return '<text x="' + x + '" y="' + y + '" ' + FONT + ' font-size="' + (size || 22) + '" font-weight="' + (weight || 600) + '" fill="' + (color || INK) + '" text-anchor="' + (anchor || 'start') + '">' + s + '</text>';
  }
  function lead(x1, y1, x2, y2, color) {
    color = color || MUTED;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.5"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3.5" fill="' + color + '"/>';
  }
  function $(id) { return document.getElementById(id); }
  function op(id, v) { var e = $(id); if (e) e.style.opacity = clamp(v, 0, 1).toFixed(3); }
  function at(id, k, v) { var e = $(id); if (e) e.setAttribute(k, typeof v === 'number' ? v.toFixed(2) : v); }
  function arrow(id, d, color, w) {
    return '<path id="' + id + '" d="' + d + '" stroke="' + (color || BLUE) + '" stroke-width="' + (w || 4) + '" fill="none" stroke-linecap="round" marker-end="url(#pr-ah)"/>';
  }
  function defs() {
    return '<defs>'
      + '<marker id="pr-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + BLUE + '"/></marker>'
      + '<pattern id="pr-tm" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fde68a"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" stroke-width="2"/></pattern>'
      + '<radialGradient id="pr-irisg"><stop offset="0.3" stop-color="#a9764a"/><stop offset="0.7" stop-color="#8b5e3c"/><stop offset="1" stop-color="#5c3d26"/></radialGradient>'
      + '</defs>';
  }
  function svgOpen(vb, title) {
    var p = vb.split(' ');
    return '<svg class="jk-lpi__svg" viewBox="' + vb + '" role="img" aria-label="' + title + '"><title>' + title + '</title>' + defs()
      + '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + p[2] + '" height="' + p[3] + '" fill="#fff"/>';
  }

  // The front of the eye cut in half, facing left (eye() in learn-figures.py).
  // irisNotch: draw a hidden small hole near the iris root (trabeculectomy).
  function eyeSide(opts) {
    opts = opts || {};
    var s = '<path d="M298,92 C420,50 560,40 760,44 L760,70 C560,66 422,76 304,116 Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
      + '<path d="M110,400 C110,250 190,128 298,92 L304,116 C204,148 128,262 128,400 Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      + '<path d="M312,118 C340,106 372,98 400,96 C392,130 372,160 340,170 C326,160 314,142 312,118 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="1.5"/>'
      + '<path d="M385,400 m-100,0 a100,222 0 0,1 200,0 Z" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>';
    [[342, 166, 372, 184], [352, 160, 388, 180], [362, 152, 400, 183], [372, 144, 412, 190]].forEach(function (z) {
      s += '<line x1="' + z[0] + '" y1="' + z[1] + '" x2="' + z[2] + '" y2="' + z[3] + '" stroke="#a8a29e" stroke-width="1"/>';
    });
    s += '<path d="M300,124 C292,180 280,250 270,300 L286,302 C296,252 306,186 316,128 Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="1.5"/>';
    if (opts.irisNotch) s += '<line id="' + opts.irisNotch + '" x1="290" y1="140" x2="318" y2="146" stroke="#fff" stroke-width="0"/>';
    s += '<path d="M292,104 L305,100 L309,122 L299,126 Z" fill="url(#pr-tm)" stroke="#b45309" stroke-width="1.2"/>'
      + '<ellipse id="' + (opts.canal || 'pr-canal') + '" cx="312" cy="100" rx="8" ry="4.5" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1.2"/>'
      + '<line x1="80" y1="400" x2="760" y2="400" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="4 6"/>';
    return s;
  }

  // ---------- SLT, standard and direct ----------
  // Standard SLT is aimed through a mirrored contact lens. Direct SLT (DSLT)
  // uses no lens: the machine tracks the eye and sends the pulses straight
  // through the edge of the cornea (the limbus) to the drain underneath.
  function sltSide(direct) {
    var h = svgOpen('40 -10 540 430', direct ? 'Side view: the laser passes through the edge of the cornea to the drain, with no contact lens' : 'Side view: the laser is aimed through a contact lens at the drain');
    if (!direct) h += '<g id="slt-lens" opacity="0"><path d="M58,262 C64,170 140,86 250,52 L298,92 C190,128 110,250 110,330 L80,330 Z" fill="#e0e7ff" stroke="#6366f1" stroke-width="2" opacity="0.85"/></g>';
    h += eyeSide();
    h += '<g id="slt-clog" fill="#7c2d12">';
    [[296, 108], [302, 112], [298, 117], [304, 106], [301, 121], [295, 113]].forEach(function (c) { h += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="2.2"/>'; });
    h += '</g>'
      + '<g id="slt-flow" opacity="0">' + arrow('slt-f1', 'M232,182 C252,158 274,136 294,118') + arrow('slt-f2', 'M318,96 C344,82 372,72 404,66') + '</g>';
    if (direct) {
      h += '<line id="slt-aim" x1="50" y1="97" x2="288" y2="97" stroke="' + GREEN + '" stroke-width="2" stroke-dasharray="7 7" stroke-linecap="round" opacity="0"/>'
        + '<line id="slt-beam" x1="50" y1="97" x2="290" y2="97" stroke="' + GREEN + '" stroke-width="3" stroke-linecap="round" opacity="0"/>'
        + '<circle id="slt-flash" cx="298" cy="104" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="3"/>'
        + '<g id="slt-lab-lens" opacity="0">' + txt(56, 40, 'No contact lens:', 'start', '#15803d') + txt(56, 64, 'nothing touches the eye', 'start', '#15803d', 400) + '</g>'
        + '<g id="slt-lab-laser" opacity="0">' + txt(56, 128, 'Laser', 'start', '#15803d', 700) + '</g>';
    } else {
      h += '<line id="slt-beam" x1="50" y1="184" x2="292" y2="114" stroke="' + GREEN + '" stroke-width="3" stroke-linecap="round" opacity="0"/>'
        + '<circle id="slt-flash" cx="300" cy="112" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="3"/>'
        + '<g id="slt-lab-lens" opacity="0">' + txt(56, 40, 'Contact lens', 'start', '#4f46e5') + lead(150, 48, 190, 104, '#4f46e5') + '</g>'
        + '<g id="slt-lab-laser" opacity="0">' + txt(56, 214, 'Laser', 'start', '#15803d', 700) + '</g>';
    }
    h += txt(380, 12, 'Drain', 'start') + txt(380, 34, '(trabecular meshwork)', 'start', MUTED, 400, 18) + lead(376, 18, 304, 106)
      + txt(210, 392, 'Iris', 'end') + lead(216, 386, 280, 290)
      + txt(440, 330, 'Lens', 'start') + lead(436, 324, 420, 324)
      + '<g id="slt-lab-flow" opacity="0">' + txt(420, 110, 'Fluid drains', 'start', BLUE) + txt(420, 134, 'more easily', 'start', BLUE, 400) + '</g>';
    return h + '</svg>';
  }
  function sltRing(direct) {
    var c = [280, 210], n = direct ? 60 : 40, rr = direct ? 170 : 157, h = svgOpen('0 0 560 420', 'Around the drain: the laser spots are placed all the way around the eye');
    h += '<circle cx="280" cy="210" r="196" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
      + '<circle cx="280" cy="210" r="168" fill="url(#pr-tm)" stroke="#b45309" stroke-width="1.5"/>'
      + '<circle cx="280" cy="210" r="146" fill="url(#pr-irisg)" stroke="#3f2a1a" stroke-width="2"/>'
      + '<circle cx="280" cy="210" r="44" fill="#0b0f14"/>'
      + '<g id="slt-rclog" fill="#7c2d12">';
    for (var i = 0; i < 60; i++) {
      var a = i / 60 * Math.PI * 2 + 0.05 * (i % 3), r = 152 + (i * 7 % 13);
      h += '<circle cx="' + (c[0] + r * Math.cos(a)).toFixed(1) + '" cy="' + (c[1] + r * Math.sin(a)).toFixed(1) + '" r="2.4"/>';
    }
    h += '</g>';
    if (direct) h += '<circle id="slt-track" cx="280" cy="210" r="181" fill="none" stroke="' + GREEN + '" stroke-width="2.5" stroke-dasharray="9 8" opacity="0"/>';
    h += '<g id="slt-spots">';
    for (i = 0; i < n; i++) {
      a = -Math.PI / 2 + i / n * Math.PI * 2;
      h += '<circle cx="' + (c[0] + rr * Math.cos(a)).toFixed(1) + '" cy="' + (c[1] + rr * Math.sin(a)).toFixed(1) + '" r="' + (direct ? 3.6 : 5) + '" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="' + (direct ? 1.5 : 2) + '" opacity="0"/>';
    }
    h += '</g>'
      + txt(16, 30, 'The drain is a ring', 'start') + txt(16, 54, 'all the way around', 'start', MUTED, 400, 18) + lead(120, 62, 166, 112)
      + txt(544, 404, 'Pupil', 'end') + lead(490, 398, 300, 226)
      + txt(16, 404, 'Iris', 'start') + lead(56, 396, 190, 290);
    if (direct) h += '<g id="slt-lab-track" opacity="0">' + txt(544, 30, 'The laser finds and', 'end', '#15803d') + txt(544, 54, 'follows the eye', 'end', '#15803d', 400) + '</g>';
    return h + '</svg>';
  }
  function sltSpots(n, glow) {
    var spots = document.querySelectorAll('#slt-spots circle');
    for (var i = 0; i < spots.length; i++) {
      spots[i].style.opacity = i < n ? 1 : 0;
      spots[i].setAttribute('fill', i === n - 1 && glow ? '#4ade80' : '#bbf7d0');
    }
  }
  var SLT_VARIANTS = [['slt', 'Standard SLT'], ['dslt', 'Direct SLT (DSLT)']];
  function sltProc(direct) {
    var laser = { label: 'Laser', dur: direct ? 2600 : 4200,
      caption: direct
        ? '<strong>The laser.</strong> In two to three seconds the machine delivers about 120 gentle pulses in a ring, through the edge of the cornea to the drain underneath. There is no cut and no burn.'
        : '<strong>The laser.</strong> Short, gentle pulses are aimed at the drain, spot by spot, around the ring. There is no cut and no burn: the light is absorbed by pigment in the drain.',
      draw: function (p) {
        var total = document.querySelectorAll('#slt-spots circle').length;
        var n = Math.round(p * total), on = p > 0 && p < 1, x = (p * total) % 1, pulse = on ? Math.max(0, Math.sin(Math.PI * clamp(x * 2.2, 0, 1))) : 0;
        if (direct && on) pulse = 0.55 + 0.45 * pulse; // too fast to see single pulses
        op('slt-beam', on ? 1 : 0); op('slt-lab-laser', on ? 1 : 0);
        at('slt-beam', 'stroke-width', 2 + 5 * pulse); at('slt-flash', 'r', 14 * pulse); op('slt-flash', pulse);
        sltSpots(n, on);
      } };
    var later = { label: 'Weeks later', dur: 2600, caption: '<strong>Over the next weeks.</strong> The treated drain clears itself and lets more fluid through, so the pressure comes down. The full effect takes four to six weeks.',
      draw: function (p) {
        var e = ease(p), gone = 1 - ease(clamp(p * 3, 0, 1));
        op('slt-clog', 1 - e); op('slt-rclog', 1 - e); op('slt-flow', e); op('slt-lab-flow', e);
        if (p > 0) { op('slt-lens', gone); op('slt-lab-lens', gone); op('slt-track', gone); op('slt-lab-track', gone); }
        var spots = document.querySelectorAll('#slt-spots circle'); for (var i = 0; i < spots.length; i++) if (p > 0) spots[i].style.opacity = (1 - 0.8 * e).toFixed(2);
      } };
    var first = direct
      ? { label: 'Aim', dur: 1800, caption: '<strong>Aiming.</strong> After a numbing drop you rest your chin and look at a target light. The laser&rsquo;s camera finds the edge of the cornea and follows the eye. There is no contact lens: nothing touches the eye.',
          draw: function (p) { var e = ease(p); op('slt-aim', e); op('slt-track', e); op('slt-lab-lens', e); op('slt-lab-track', e); } }
      : { label: 'Lens', dur: 1600, caption: '<strong>Drops and a contact lens.</strong> After numbing drops, a contact lens with a mirror is placed on the eye. It lets the doctor see and aim at the drain, which is hidden behind the edge of the cornea.',
          draw: function (p) { var e = ease(p); at('slt-lens', 'transform', 'translate(' + (-80 * (1 - e)).toFixed(1) + ',0)'); op('slt-lens', e); op('slt-lab-lens', e); } };
    if (direct) { var d0 = laser.draw; laser.draw = function (p) { d0(p); if (p > 0) op('slt-aim', 0); }; }
    return {
      variants: SLT_VARIANTS,
      views: [['Side view', function () { return sltSide(direct); }], ['Around the drain', function () { return sltRing(direct); }]],
      intro: '<strong>Before.</strong> The drain is a ring of filter tissue all the way around the eye, where the iris meets the cornea. In glaucoma it lets fluid through less easily than it should.'
        + (direct ? ' Direct SLT treats it from the outside, through the edge of the cornea.' : ' Standard SLT treats it through a mirrored contact lens.'),
      steps: [first, laser, later]
    };
  }

  // ---------- MIGS (close-up of the angle) ----------
  function wy(x, inner) { return (inner ? 330 : 230) - x * 0.31; }
  var MS = [372, wy(372, 1) + 8], M_ANG = -62;
  function migsSvg() {
    var h = svgOpen('0 0 720 500', 'Close-up of the drain: a tiny stent is placed through the meshwork into the canal behind it');
    h += '<path d="M0,' + wy(0, 0) + ' L340,' + wy(340, 0) + ' L340,' + wy(340, 1) + ' L0,' + wy(0, 1) + ' Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      + '<path d="M340,' + wy(340, 0) + ' L720,' + wy(720, 0) + ' L720,' + wy(720, 1) + ' L340,' + wy(340, 1) + ' Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
      + '<path d="M520,' + wy(520, 1) + ' L720,' + wy(720, 1) + ' L720,300 C640,300 560,280 500,240 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="2"/>'
      + '<path d="M440,' + (wy(440, 1) + 4) + ' L520,' + (wy(520, 1) + 2) + ' C510,300 500,380 496,480 L404,480 C410,380 425,290 440,' + (wy(440, 1) + 4) + ' Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="2"/>';
    var tm = [[350, wy(350, 1)], [440, wy(440, 1)], [440, wy(440, 1) - 22], [350, wy(350, 1) - 22]];
    h += '<path d="M' + tm.map(function (p) { return p[0] + ',' + p[1].toFixed(1); }).join(' L') + ' Z" fill="url(#pr-tm)" stroke="#b45309" stroke-width="2"/>';
    var cx = 395, cy = wy(395, 1) - 48;
    h += '<ellipse id="migs-canal" cx="' + cx + '" cy="' + cy.toFixed(1) + '" rx="44" ry="14" transform="rotate(-17 ' + cx + ' ' + cy.toFixed(1) + ')" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>';
    // the stent rides on the inserter: both in the stent's own frame, x along its length
    h += '<g transform="rotate(' + M_ANG + ' ' + MS[0] + ' ' + MS[1].toFixed(1) + ')">'
      + '<g id="migs-ins"><rect x="' + (MS[0] - 360) + '" y="' + (MS[1] - 4).toFixed(1) + '" width="352" height="8" rx="3" fill="#9ca3af" stroke="#4b5563" stroke-width="1.5"/></g>'
      + '<g id="migs-stent"><rect x="' + (MS[0] - 6) + '" y="' + (MS[1] - 9).toFixed(1) + '" width="78" height="18" rx="9" fill="#d4a017" stroke="#7c5a06" stroke-width="2"/><rect x="' + (MS[0] + 6) + '" y="' + (MS[1] - 3).toFixed(1) + '" width="54" height="6" rx="3" fill="#fff7d6"/></g>'
      + '</g>'
      + '<g id="migs-flow" opacity="0">' + arrow('migs-f1', 'M150,420 C240,390 320,320 360,252') + arrow('migs-f2', 'M420,' + (cy - 10).toFixed(0) + ' C450,' + (cy - 50).toFixed(0) + ' 470,' + (cy - 90).toFixed(0) + ' 500,' + (cy - 120).toFixed(0)) + '</g>'
      + txt(60, 250, 'Cornea', 'start') + txt(600, 48, 'Sclera', 'start', MUTED, 400, 20)
      + txt(160, 130, "Schlemm's canal", 'start', INK, 600, 20) + lead(250, 138, 372, 160)
      + txt(570, 330, 'Drain', 'start', INK, 600, 20) + txt(570, 354, '(trabecular', 'start', INK, 400, 18) + txt(570, 376, 'meshwork)', 'start', INK, 400, 18) + lead(566, 326, 428, 196)
      + txt(530, 470, 'Iris', 'start') + lead(526, 464, 486, 440)
      + '<g id="migs-lab-ins" opacity="0">' + txt(40, 330, 'Inserter', 'start', '#4b5563') + '</g>'
      + '<g id="migs-lab-stent" opacity="0">' + txt(150, 214, 'Stent', 'start') + lead(206, 208, 374, 208) + '</g>'
      + '<g id="migs-lab-flow" opacity="0">' + txt(510, 76, 'To the', 'start', BLUE, 600, 18) + txt(510, 98, 'bloodstream', 'start', BLUE, 600, 18) + txt(40, 470, 'Fluid in the front chamber', 'start', BLUE, 600, 20) + '</g>';
    return h + '</svg>';
  }

  // ---------- trabeculectomy ----------
  var CONJ_FLAT = [[330, 72], [420, 50]], CONJ_UP = [[330, 16], [440, 4]];
  function conjPath(b) {
    var c1 = [lerp(CONJ_FLAT[0][0], CONJ_UP[0][0], b), lerp(CONJ_FLAT[0][1], CONJ_UP[0][1], b)];
    var c2 = [lerp(CONJ_FLAT[1][0], CONJ_UP[1][0], b), lerp(CONJ_FLAT[1][1], CONJ_UP[1][1], b)];
    return { line: 'M292,88 C' + c1.join(',') + ' ' + c2.join(',') + ' 480,48 C560,42 660,38 760,40',
      fill: 'M296,90 C' + c1.join(',') + ' ' + c2.join(',') + ' 480,48 L480,52 C420,60 340,80 298,92 Z' };
  }
  function trabSvg() {
    var h = svgOpen('60 -20 580 440', 'Side view of a trabeculectomy: a flap, a small opening under it, and a bleb where fluid collects');
    h += eyeSide({ irisNotch: 'trab-pi' })
      + '<path id="trab-bleb" fill="#bfdbfe" opacity="0"/>'
      + '<path d="M320,84 L372,66 L378,74 L326,94 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>'
      + '<line id="trab-hole" x1="298" y1="112" x2="318" y2="92" stroke="#1d4ed8" stroke-width="0" stroke-linecap="round"/>'
      + '<g id="trab-flap"><path d="M320,84 L372,66 L378,74 L326,94 Z" fill="#f8fafc" stroke="#374151" stroke-width="2"/>'
      + '<g id="trab-sut" stroke="#111827" stroke-width="1.6" opacity="0"><line x1="364" y1="64" x2="372" y2="76"/><line x1="372" y1="64" x2="364" y2="76"/><line x1="340" y1="70" x2="348" y2="82"/><line x1="348" y1="70" x2="340" y2="82"/></g></g>'
      + '<path id="trab-conj" fill="none" stroke="#dc2626" stroke-width="2.5"/>'
      + '<g id="trab-flow" opacity="0">' + arrow('trab-f1', 'M210,250 C220,190 256,148 292,120') + arrow('trab-f2', 'M332,82 C360,58 396,48 430,50') + '</g>'
      + txt(632, 14, 'Conjunctiva', 'end', '#b91c1c', 600, 18) + lead(600, 20, 600, 39, '#b91c1c')
      + txt(210, 392, 'Iris', 'end') + lead(216, 386, 280, 290)
      + txt(440, 330, 'Lens', 'start') + lead(436, 324, 420, 324)
      + '<g id="trab-lab-flap" opacity="0">' + txt(70, 10, 'Flap in the', 'start') + txt(70, 34, 'eye wall', 'start', INK, 400) + lead(160, 40, 340, 80) + '</g>'
      + '<g id="trab-lab-hole" opacity="0">' + txt(70, 186, 'Small opening', 'start', '#1d4ed8') + lead(206, 180, 304, 108, '#1d4ed8') + '</g>'
      + '<g id="trab-lab-bleb" opacity="0">' + txt(440, 116, 'Bleb', 'start', BLUE, 700) + txt(440, 140, 'fluid collects under', 'start', BLUE, 400, 19) + txt(440, 162, 'the conjunctiva, hidden', 'start', BLUE, 400, 19) + txt(440, 184, 'by the upper eyelid', 'start', BLUE, 400, 19) + lead(436, 110, 410, 40, BLUE) + '</g>';
    return h + '</svg>';
  }

  // ---------- tube shunt ----------
  // along the eye wall, through it at the limbus, then down the front chamber
  // parallel to the iris and just in front of it
  var TUBE = 'M560,30 C460,36 380,58 334,80 C316,90 302,108 294,134 L281,198';
  function tubeSvg() {
    var h = svgOpen('60 -20 680 440', 'Side view of a tube shunt: a plate on the eye wall and a tube into the front chamber');
    h += eyeSide()
      + '<ellipse id="tube-bleb" cx="640" cy="26" rx="118" ry="0" fill="#bfdbfe" opacity="0.7"/>'
      + '<g id="tube-plate"><rect x="550" y="18" width="190" height="24" rx="12" fill="#e5e7eb" stroke="#4b5563" stroke-width="2"/></g>'
      + '<path id="tube-out" d="' + TUBE + '" pathLength="1" fill="none" stroke="#4b5563" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"/>'
      + '<path id="tube-in" d="' + TUBE + '" pathLength="1" fill="none" stroke="#d1d5db" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"/>'
      + '<path id="tube-water" d="' + TUBE + '" pathLength="1" fill="none" stroke="' + WATER + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.04 0.06" opacity="0"/>'
      + '<path id="tube-patch" d="M330,72 C360,56 400,46 430,44 L436,56 C404,58 366,68 336,84 Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.5" opacity="0"/>'
      + '<g id="tube-flow" opacity="0">' + arrow('tube-f1', 'M206,292 C214,258 240,228 270,208') + '</g>'
      + txt(210, 392, 'Iris', 'end') + lead(216, 386, 280, 290)
      + txt(440, 330, 'Lens', 'start') + lead(436, 324, 420, 324)
      + '<g id="tube-lab-plate" opacity="0">' + txt(520, 120, 'Plate on the eye wall,', 'start') + txt(520, 144, 'under the upper eyelid', 'start', INK, 400) + lead(600, 102, 640, 44) + '</g>'
      + '<g id="tube-lab-tube" opacity="0">' + txt(70, 10, 'Tube in the front chamber,', 'start') + txt(70, 34, 'in front of the iris', 'start', INK, 400) + lead(170, 40, 283, 190) + '</g>'
      + '<g id="tube-lab-patch" opacity="0">' + txt(330, 0, 'Patch over the tube', 'start', '#a16207') + lead(390, 8, 388, 54, '#a16207') + '</g>'
      + '<g id="tube-lab-bleb" opacity="0">' + txt(520, 196, 'Fluid is absorbed', 'start', BLUE) + txt(520, 220, 'around the plate', 'start', BLUE, 400) + lead(560, 178, 620, 30, BLUE) + '</g>';
    return h + '</svg>';
  }

  var PROCS = {
    slt: sltProc(false),
    dslt: sltProc(true),
    migs: {
      views: [['Close-up of the drain', migsSvg]],
      intro: '<strong>Before.</strong> A close-up of the drain. Fluid has to pass through the meshwork to reach the canal behind it, and in glaucoma the meshwork resists it.',
      steps: [
        { label: 'Inserter', dur: 1800, caption: '<strong>The inserter.</strong> Through the same tiny incision used for cataract surgery, the surgeon brings the stent across the front chamber, watching the drain through a mirrored lens.',
          draw: function (p) { var e = ease(p); at('migs-ins', 'transform', 'translate(' + lerp(-320, -60, e).toFixed(1) + ',0)'); at('migs-stent', 'transform', 'translate(' + lerp(-320, -60, e).toFixed(1) + ',0)'); op('migs-ins', p > 0 ? 1 : 0); op('migs-stent', p > 0 ? 1 : 0); op('migs-lab-ins', e); } },
        { label: 'Stent', dur: 1400, caption: '<strong>The stent goes in.</strong> The stent, smaller than a grain of rice, is pushed through the meshwork so its tip sits in the canal.',
          draw: function (p) { var e = ease(p); op('migs-lab-stent', e); if (!p) return; at('migs-ins', 'transform', 'translate(' + lerp(-60, 0, e).toFixed(1) + ',0)'); at('migs-stent', 'transform', 'translate(' + lerp(-60, 0, e).toFixed(1) + ',0)'); } },
        { label: 'Withdraw', dur: 1400, caption: '<strong>The inserter is withdrawn.</strong> The stent stays in place on its own. Nothing is seen from the outside.',
          draw: function (p) { if (!p) return; var e = ease(p); at('migs-ins', 'transform', 'translate(' + lerp(0, -380, e).toFixed(1) + ',0)'); op('migs-ins', 1 - e); op('migs-lab-ins', 1 - e); } },
        { label: 'Fluid', dur: 2200, caption: '<strong>Fluid takes the shortcut.</strong> It passes through the stent into the canal and on to the bloodstream, bypassing the part of the drain that resists it. Pressure in the mid teens afterward is typical.',
          draw: function (p) { var e = ease(p); op('migs-flow', e); op('migs-lab-flow', e); at('migs-canal', 'fill', p > 0.3 ? '#60a5fa' : '#93c5fd'); } }
      ]
    },
    trab: {
      views: [['Side view', trabSvg]],
      intro: '<strong>Before.</strong> The front of the eye cut in half. The red line is the conjunctiva, the thin clear skin over the white of the eye. The operation is done at the top of the eye, under the upper eyelid.',
      steps: [
        { label: 'Flap', dur: 1800, caption: '<strong>A flap.</strong> The surgeon opens the conjunctiva and makes a thin, hinged flap, like a trapdoor, in the white wall of the eye. A medicine that slows scarring (mitomycin C) is applied briefly.',
          draw: function (p) { var e = ease(p); at('trab-flap', 'transform', 'rotate(' + (-34 * e).toFixed(1) + ' 322 89)'); op('trab-lab-flap', e); } },
        { label: 'Opening', dur: 1800, caption: '<strong>An opening.</strong> A tiny opening is made under the flap into the front chamber, and usually a small hole in the iris beside it so the iris cannot block it.',
          draw: function (p) { var e = ease(p); at('trab-hole', 'stroke-width', 7 * e); at('trab-pi', 'stroke-width', 8 * e); op('trab-lab-hole', e); } },
        { label: 'Stitches', dur: 1800, caption: '<strong>Stitches.</strong> The flap is laid back and stitched loosely, so fluid can seep out slowly under its edges. The stitches can be loosened later to adjust the flow. The conjunctiva is closed over it.',
          draw: function (p) { var e = ease(p); op('trab-sut', e); if (!p) return; at('trab-flap', 'transform', 'rotate(' + (-34 * (1 - e)).toFixed(1) + ' 322 89)'); op('trab-lab-flap', 1 - e); } },
        { label: 'Bleb', dur: 2600, caption: '<strong>The bleb.</strong> Fluid now leaves through the opening and collects in a small blister, the bleb, under the conjunctiva, where it is absorbed. The eyelid covers it.',
          draw: function (p) { var e = ease(p), c = conjPath(e); at('trab-conj', 'd', c.line); at('trab-bleb', 'd', c.fill); op('trab-bleb', 0.85 * e); op('trab-flow', e); op('trab-lab-bleb', e); if (p > 0) op('trab-lab-hole', 1 - e); } }
      ]
    },
    tube: {
      views: [['Side view', tubeSvg]],
      intro: '<strong>Before.</strong> The front of the eye cut in half. The operation is done on the white of the eye, under the upper eyelid, well back from the cornea.',
      steps: [
        { label: 'Plate', dur: 1700, caption: '<strong>The plate.</strong> A thin, soft plate is placed on the wall of the eye, far back under the upper eyelid, and stitched in place.',
          draw: function (p) { var e = ease(p); at('tube-plate', 'transform', 'translate(' + (160 * (1 - e)).toFixed(1) + ',0)'); op('tube-plate', p > 0 ? 1 : 0); op('tube-lab-plate', e); } },
        { label: 'Tube', dur: 2000, caption: '<strong>The tube.</strong> The tube from the plate is trimmed and passed into the front chamber through a tiny tunnel. It lies flat, just in front of the iris and parallel to it, away from the cornea.',
          draw: function (p) { var e = ease(p); at('tube-out', 'stroke-dashoffset', 1 - e); at('tube-in', 'stroke-dashoffset', 1 - e); op('tube-out', p > 0 ? 1 : 0); op('tube-in', p > 0 ? 1 : 0); op('tube-lab-tube', e); } },
        { label: 'Patch', dur: 1500, caption: '<strong>A patch.</strong> A patch of donor tissue covers the tube where it runs under the conjunctiva, to protect it. The conjunctiva is closed over everything.',
          draw: function (p) { var e = ease(p); op('tube-patch', e); op('tube-lab-patch', e); } },
        { label: 'Fluid', dur: 2600, caption: '<strong>Fluid drains.</strong> Fluid runs from the front chamber down the tube to the plate, collects in a pocket around it, and is absorbed.',
          draw: function (p, t) { var e = ease(p); op('tube-water', e); at('tube-water', 'stroke-dashoffset', -(t / 2500) % 1); at('tube-bleb', 'ry', 26 * e); op('tube-flow', e); op('tube-lab-bleb', e); if (p > 0) op('tube-lab-patch', 1 - e); } }
      ]
    }
  };

  if (!PROCS[root.getAttribute('data-proc')]) return;
  var proc, starts, T_END, el, stepBtns, tNow = 0, capShown = -2, raf = 0, playing = false;

  // ---------- markup ----------
  function mount(key) {
    proc = PROCS[key];
    starts = []; T_END = 0;
    proc.steps.forEach(function (s) { starts.push(T_END); T_END += s.dur; });
    var two = proc.views.length > 1, h = '';
    if (proc.variants) {
      h += '<div class="jk-chips jk-proc__variants" role="group" aria-label="Which kind">';
      proc.variants.forEach(function (v) { h += '<button type="button" class="jk-chip' + (v[0] === key ? ' is-active' : '') + '" data-variant="' + v[0] + '" aria-pressed="' + (v[0] === key) + '">' + v[1] + '</button>'; });
      h += '</div>';
    }
    if (two) {
      h += '<div class="jk-chips jk-lpi__tabs" role="group" aria-label="View">';
      proc.views.forEach(function (v, i) { h += '<button type="button" class="jk-chip' + (i ? '' : ' is-active') + '" data-view="' + (i ? 'front' : 'side') + '" aria-pressed="' + !i + '">' + v[0] + '</button>'; });
      h += '</div>';
    }
    h += '<div class="jk-lpi__views' + (two ? '' : ' jk-lpi__views--one') + '" data-show="side">';
    proc.views.forEach(function (v, i) { h += '<figure class="jk-lpi__view" data-view="' + (i ? 'front' : 'side') + '"><figcaption>' + v[0] + '</figcaption>' + v[1]() + '</figure>'; });
    h += '</div>'
      + '<ol class="jk-proc__steps" aria-label="Steps">';
    proc.steps.forEach(function (s, i) { h += '<li><button type="button" class="jk-proc__step" data-step="' + i + '"><span>' + (i + 1) + '</span> ' + s.label + '</button></li>'; });
    h += '</ol>'
      + '<div class="jk-lpi__controls">'
      + '<button type="button" class="btn btn-primary jk-lpi__fire" id="jk-proc-play">&#9654; Play</button>'
      + '<button type="button" class="btn btn-outline-secondary" id="jk-proc-reset" disabled>Start over</button>'
      + '<button type="button" class="btn btn-outline-secondary jk-lpi__full" id="jk-proc-full"' + (reqFull ? '' : ' hidden') + '>' + fullLabel() + '</button>'
      + '</div>'
      + '<p class="jk-lpi__step" id="jk-proc-cap" aria-live="polite"></p>';
    root.innerHTML = h;
    el = { play: $('jk-proc-play'), reset: $('jk-proc-reset'), full: $('jk-proc-full'), cap: $('jk-proc-cap'), views: root.querySelector('.jk-lpi__views') };
    stepBtns = root.querySelectorAll('.jk-proc__step');
    capShown = -2;
    render(0);
    setButtons();
  }
  var reqFull = root.requestFullscreen || root.webkitRequestFullscreen;
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fullLabel() { return isFull() ? 'Exit full screen' : 'Full screen'; }

  // ---------- render ----------
  function render(t) {
    tNow = t;
    proc.steps.forEach(function (s, i) { s.draw(clamp((t - starts[i]) / s.dur, 0, 1), t); });
    var cur = -1;
    for (var i = 0; i < starts.length; i++) if (t > starts[i]) cur = i;
    if (cur !== capShown) {
      capShown = cur;
      el.cap.innerHTML = cur < 0 ? proc.intro : proc.steps[cur].caption;
      stepBtns.forEach(function (b, k) { b.classList.toggle('is-done', k < cur); b.classList.toggle('is-active', k === cur); b.setAttribute('aria-current', k === cur ? 'step' : 'false'); });
    }
  }

  function setButtons() {
    el.play.innerHTML = playing ? '&#10074;&#10074; Pause' : tNow >= T_END ? '&#9654; Play again' : tNow > 0 ? '&#9654; Continue' : '&#9654; Play';
    el.reset.disabled = tNow <= 0 && !playing;
  }
  function stop() { cancelAnimationFrame(raf); playing = false; setButtons(); }
  function play() {
    if (playing) { stop(); return; }
    if (tNow >= T_END) render(0);
    if (REDUCED) { render(T_END); setButtons(); return; }
    playing = true; setButtons();
    var from = tNow, t0 = 0;
    function tick(now) {
      if (!t0) t0 = now;
      var t = Math.min(T_END, from + now - t0);
      render(Math.max(1, t));
      if (t >= T_END) { stop(); return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }
  // a step button shows that step finished, so it can be talked through
  function jump(i) { stop(); render(starts[i] + proc.steps[i].dur); setButtons(); }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'jk-proc-play') play();
    else if (b.id === 'jk-proc-reset') { stop(); render(0); setButtons(); }
    else if (b.id === 'jk-proc-full') {
      if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (reqFull) reqFull.call(root);
    } else if (b.hasAttribute('data-step')) jump(+b.getAttribute('data-step'));
    else if (b.hasAttribute('data-variant')) {
      if (PROCS[b.getAttribute('data-variant')] === proc) return;
      var show = el.views.getAttribute('data-show');
      stop(); mount(b.getAttribute('data-variant'));
      setView(show);
    } else if (b.hasAttribute('data-view')) setView(b.getAttribute('data-view'));
  });
  function setView(v) {
    el.views.setAttribute('data-show', v);
    root.querySelectorAll('.jk-lpi__tabs .jk-chip').forEach(function (o) { var on = o.getAttribute('data-view') === v; o.classList.toggle('is-active', on); o.setAttribute('aria-pressed', String(on)); });
  }
  function onFs() { if (el && el.full) el.full.textContent = fullLabel(); }
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);

  mount(root.getAttribute('data-proc'));
  root.classList.add('is-ready');
})();
