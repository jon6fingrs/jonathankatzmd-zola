/* Step-by-step procedure demos for the Learn pages: SLT, MIGS,
 * trabeculectomy, tube shunt and cyclophotocoagulation, plus the tear film
 * between blinks (`tears`), which uses the same format. A page has one
 *     <div id="jk-proc" class="jk-lpi" data-proc="slt"></div>
 * and this file builds it. SLT (standard, direct), MIGS (stent, goniotomy, viscodilation, viscodilation + stent) and
 * cyclophotocoagulation (micropulse, standard) have variants switched by
 * chips; see `variants`.
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
 *
 * Retina, cornea and cataract surgery demos live in procedure-retina.js,
 * procedure-cornea.js and procedure-cataract.js, which a page loads before
 * this file.
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
      + '<marker id="pr-ahm" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker>'
      + '<pattern id="pr-tm" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fde68a"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" stroke-width="2"/></pattern>'
      + '<radialGradient id="pr-irisg"><stop offset="0.3" stop-color="#a9764a"/><stop offset="0.7" stop-color="#8b5e3c"/><stop offset="1" stop-color="#5c3d26"/></radialGradient>'
      + '</defs>';
  }
  function svgOpen(vb, title) {
    var p = vb.split(' ');
    return '<svg class="jk-lpi__svg" viewBox="' + vb + '" role="img" aria-label="' + title + '"><title>' + title + '</title>'
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

  // ---------- cyclophotocoagulation: micropulse and standard ----------
  // A probe on the white of the eye, just behind the cornea, sends laser
  // energy through the wall to the ciliary body, which makes the fluid.
  // Micropulse sweeps the probe along the upper and lower halves; standard
  // (continuous-wave) CPC treats a row of separate spots. Both skip the
  // 3 and 9 o'clock positions.
  var CPC_ARCS = [[200, 340], [20, 160]]; // degrees, screen angles: upper half, then lower half
  function cpcPt(deg, r) { var a = deg * Math.PI / 180; return [280 + r * Math.cos(a), 210 + r * Math.sin(a)]; }
  function cpcArc(a0, a1, r) { var p0 = cpcPt(a0, r), p1 = cpcPt(a1, r); return 'M' + p0[0].toFixed(1) + ',' + p0[1].toFixed(1) + ' A' + r + ',' + r + ' 0 0,1 ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1); }
  function cpcSide() {
    var h = svgOpen('60 -40 560 445', 'Side view: a probe on the white of the eye sends laser energy to the tissue that makes the fluid');
    h += eyeSide()
      + '<path id="cpc-quiet" d="M312,118 C340,106 372,98 400,96 C392,130 372,160 340,170 C326,160 314,142 312,118 Z" fill="#9ca3af" opacity="0"/>'
      + '<g id="cpc-make">' + arrow('cpc-m1', 'M352,168 C344,186 334,200 322,212') + arrow('cpc-m2', 'M366,160 C362,182 352,204 338,222') + arrow('cpc-m3', 'M338,172 C330,184 322,192 314,198') + '</g>'
      + '<circle id="cpc-glow" cx="352" cy="118" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="3"/>'
      + '<line id="cpc-beam" x1="349" y1="72" x2="352" y2="112" stroke="' + GREEN + '" stroke-width="4" stroke-linecap="round" opacity="0"/>'
      + '<g id="cpc-probe" opacity="0"><line x1="347" y1="66" x2="322" y2="-30" stroke="#4b5563" stroke-width="20" stroke-linecap="round"/><line x1="347" y1="66" x2="322" y2="-30" stroke="#d1d5db" stroke-width="13" stroke-linecap="round"/>'
      + '<path d="M334,70 L360,63 L361,69 L335,76 Z" fill="#4b5563"/></g>'
      + txt(210, 392, 'Iris', 'end') + lead(216, 386, 280, 290)
      + txt(440, 330, 'Lens', 'start') + lead(436, 324, 420, 324)
      + '<g id="cpc-lab-cb">' + txt(450, 150, 'Ciliary body:', 'start') + txt(450, 174, 'makes the fluid', 'start', INK, 400) + lead(446, 146, 384, 124) + '</g>'
      + '<g id="cpc-lab-probe" opacity="0">' + txt(70, -8, 'Laser probe on the', 'start', '#374151') + txt(70, 16, 'white of the eye', 'start', '#374151', 400) + lead(236, 4, 322, 2, '#374151') + '</g>'
      + '<g id="cpc-lab-less" opacity="0">' + txt(450, 150, 'Ciliary body:', 'start', BLUE) + txt(450, 174, 'makes less fluid', 'start', BLUE, 400) + lead(446, 146, 384, 124, BLUE) + '</g>';
    return h + '</svg>';
  }
  function cpcFront(micro) {
    var h = svgOpen('0 0 560 420', 'Front view: where the laser is applied around the eye'), i, k;
    h += '<circle cx="280" cy="210" r="198" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
      + '<circle cx="280" cy="210" r="118" fill="url(#pr-irisg)" stroke="#3f2a1a" stroke-width="2"/>'
      + '<circle cx="280" cy="210" r="34" fill="#0b0f14"/>'
      + '<circle cx="280" cy="210" r="146" fill="none" stroke="#f2b8b5" stroke-width="20" opacity="0.55"/>';
    if (micro) {
      CPC_ARCS.forEach(function (a, n) {
        h += '<path id="cpc-arc' + n + '" d="' + cpcArc(a[0], a[1], 146) + '" pathLength="1" fill="none" stroke="' + GREEN + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1" opacity="0.8"/>';
      });
    } else {
      h += '<g id="cpc-spots">';
      CPC_ARCS.forEach(function (a) { for (k = 0; k < 9; k++) { var p = cpcPt(a[0] + (a[1] - a[0]) * k / 8, 146); h += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="7" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="2" opacity="0"/>'; } });
      h += '</g>';
    }
    h += '<g id="cpc-fprobe" opacity="0"><circle r="13" fill="#d1d5db" stroke="#4b5563" stroke-width="4"/><circle r="4" fill="' + GREEN + '"/></g>'
      + txt(16, 30, 'Ciliary body: a ring', 'start') + txt(16, 54, 'under the white of the eye', 'start', MUTED, 400, 18) + lead(150, 62, 184, 104)
      + txt(16, 404, 'Iris', 'start') + lead(56, 396, 200, 280)
      + '<g id="cpc-lab-skip" opacity="0">' + txt(544, 404, 'The sides are skipped', 'end', '#374151', 600, 20) + lead(470, 384, 428, 216, '#374151') + '</g>';
    return h + '</svg>';
  }
  var CPC_VARIANTS = [['cpc', 'Micropulse'], ['cwcpc', 'Standard CPC']];
  function cpcProc(micro) {
    var probe = { label: 'Probe', dur: 1800,
      caption: '<strong>Numbing and the probe.</strong> ' + (micro
        ? 'You are given sedation so you sleep lightly, and numbing drops are placed on the eye.'
        : 'The eye is numbed with an injection of anesthetic behind the eye, so you feel no pain.')
        + ' A small probe is then rested on the white of the eye, just behind the edge of the cornea. Nothing enters the eye.',
      draw: function (p) { var e = ease(p); op('cpc-probe', e); at('cpc-probe', 'transform', 'translate(' + (-8 * (1 - e)).toFixed(1) + ',' + (-30 * (1 - e)).toFixed(1) + ')'); op('cpc-lab-probe', e); } };
    var laser = { label: 'Laser', dur: micro ? 5200 : 4400,
      caption: micro
        ? '<strong>The laser.</strong> The probe is swept slowly back and forth along the upper half of the eye, then the lower half. The laser is delivered in very short bursts with rests between them, which is gentler on the tissue. The two sides are skipped.'
        : '<strong>The laser.</strong> The probe is moved from spot to spot around the eye, with a steady pulse of laser at each one. The two sides are skipped.',
      draw: function (p) {
        var on = p > 0 && p < 1, half = p < 0.5 ? 0 : 1, q = clamp(p * 2 - half, 0, 1), pos, i;
        op('cpc-lab-skip', p > 0 ? 1 : 0);
        if (micro) {
          // two passes over each half: out and back
          var sweep = q < 0.5 ? q * 2 : 2 - q * 2, a = CPC_ARCS[half];
          pos = cpcPt(a[0] + (a[1] - a[0]) * sweep, 146);
          at('cpc-arc0', 'stroke-dashoffset', p <= 0 ? 1 : half ? 0 : 1 - Math.min(1, q * 2));
          at('cpc-arc1', 'stroke-dashoffset', p >= 1 ? 0 : half ? 1 - Math.min(1, q * 2) : 1);
          var beat = on ? 0.6 + 0.4 * Math.sin(p * 260) : 0;
          at('cpc-glow', 'r', 16 * beat); op('cpc-glow', on ? 0.85 : 0); op('cpc-beam', on ? 1 : 0);
        } else {
          var spots = document.querySelectorAll('#cpc-spots circle'), n = Math.round(p * spots.length), x = (p * spots.length) % 1;
          for (i = 0; i < spots.length; i++) spots[i].style.opacity = i < n ? 1 : 0;
          var idx = clamp(Math.floor(p * spots.length), 0, spots.length - 1);
          pos = [+spots[idx].getAttribute('cx'), +spots[idx].getAttribute('cy')];
          var pulse = on ? Math.max(0, Math.sin(Math.PI * clamp(x * 1.4, 0, 1))) : 0;
          at('cpc-glow', 'r', 18 * pulse); op('cpc-glow', pulse); op('cpc-beam', pulse > 0.05 ? 1 : 0);
        }
        op('cpc-fprobe', on ? 1 : 0);
        at('cpc-fprobe', 'transform', 'translate(' + pos[0].toFixed(1) + ',' + pos[1].toFixed(1) + ')');
      } };
    var later = { label: 'Weeks later', dur: 2600,
      caption: '<strong>Over the next weeks.</strong> The treated tissue makes less fluid, like a faucet turned down, and the pressure falls. The full effect takes about a month. The laser can be repeated if more effect is needed.',
      draw: function (p) {
        var e = ease(p), i;
        op('cpc-quiet', 0.45 * e); op('cpc-m2', 1 - e); op('cpc-m3', 1 - e); at('cpc-m1', 'stroke-width', 4 - 1.5 * e);
        op('cpc-lab-cb', 1 - e); op('cpc-lab-less', e);
        if (p > 0) {
          var gone = 1 - ease(clamp(p * 3, 0, 1));
          op('cpc-probe', gone); op('cpc-lab-probe', gone); op('cpc-lab-skip', gone);
          if (micro) { op('cpc-arc0', 0.8 * (1 - 0.7 * e)); op('cpc-arc1', 0.8 * (1 - 0.7 * e)); }
          else { var spots = document.querySelectorAll('#cpc-spots circle'); for (i = 0; i < spots.length; i++) spots[i].style.opacity = (1 - 0.7 * e).toFixed(2); }
        } else if (micro) { op('cpc-arc0', 0.8); op('cpc-arc1', 0.8); }
      } };
    return {
      variants: CPC_VARIANTS,
      views: [['Side view', cpcSide], ['Front view', function () { return cpcFront(micro); }]],
      intro: '<strong>Before.</strong> The fluid inside the eye is made by the ciliary body, a ring of tissue hidden behind the iris, under the white of the eye. This laser treats that tissue from the outside.'
        + (micro ? ' Micropulse delivers it in short bursts while the probe is swept along.' : ' Standard CPC is the heavier treatment: a row of separate spots.'),
      steps: [probe, laser, later]
    };
  }

  // ---------- MIGS: stent, goniotomy, viscodilation ----------
  // Two drawings: a close-up of the angle (the geometry of migs-stent.svg)
  // and a ring view of the whole drain, since the canal runs all the way
  // around and a catheter or a goniotomy travels along it.
  function wy(x, inner) { return (inner ? 330 : 230) - x * 0.31; }
  var MS = [372, wy(372, 1) + 8], M_ANG = -62, M_CANAL = [395, wy(395, 1) - 48];
  var MIGS_INS = { migs: 'Inserter', gonio: 'Blade', visco: 'Cannula', combo: 'Instrument' };
  function hasStent(k) { return k === 'migs' || k === 'combo'; }
  function hasVisco(k) { return k === 'visco' || k === 'combo'; }
  function migsSvg(kind) {
    var h = svgOpen('0 0 720 500', 'Close-up of the drain: the meshwork, with the canal behind it');
    h += '<path d="M0,' + wy(0, 0) + ' L340,' + wy(340, 0) + ' L340,' + wy(340, 1) + ' L0,' + wy(0, 1) + ' Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      + '<path d="M340,' + wy(340, 0) + ' L720,' + wy(720, 0) + ' L720,' + wy(720, 1) + ' L340,' + wy(340, 1) + ' Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
      + '<path d="M520,' + wy(520, 1) + ' L720,' + wy(720, 1) + ' L720,300 C640,300 560,280 500,240 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="2"/>'
      + '<path d="M440,' + (wy(440, 1) + 4) + ' L520,' + (wy(520, 1) + 2) + ' C510,300 500,380 496,480 L404,480 C410,380 425,290 440,' + (wy(440, 1) + 4) + ' Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="2"/>';
    var tm = [[350, wy(350, 1)], [440, wy(440, 1)], [440, wy(440, 1) - 22], [350, wy(350, 1) - 22]];
    h += '<path d="M' + tm.map(function (p) { return p[0] + ',' + p[1].toFixed(1); }).join(' L') + ' Z" fill="url(#pr-tm)" stroke="#b45309" stroke-width="2"/>';
    var cx = M_CANAL[0], cy = M_CANAL[1];
    if (kind === 'gonio') { // the strip of meshwork that is removed, leaving the canal open to the chamber
      var g = [[370, wy(370, 1) + 2], [420, wy(420, 1) + 2], [420, wy(420, 1) - 36], [370, wy(370, 1) - 36]];
      h += '<path id="migs-gap" d="M' + g.map(function (p) { return p[0] + ',' + p[1].toFixed(1); }).join(' L') + ' Z" fill="#fff" opacity="0"/>';
    }
    h += '<ellipse id="migs-canal" cx="' + cx + '" cy="' + cy.toFixed(1) + '" rx="44" ry="14" transform="rotate(-17 ' + cx + ' ' + cy.toFixed(1) + ')" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>';
    if (hasVisco(kind)) h += '<circle id="migs-cath" cx="' + cx + '" cy="' + cy.toFixed(1) + '" r="7" fill="#1e3a8a" stroke="#fff" stroke-width="2" opacity="0"/>';
    // the instrument, and the stent riding on it, in the instrument's own frame (x along its length)
    h += '<g transform="rotate(' + M_ANG + ' ' + MS[0] + ' ' + MS[1].toFixed(1) + ')">'
      + '<g id="migs-ins" opacity="0"><rect x="' + (MS[0] - 360) + '" y="' + (MS[1] - 4).toFixed(1) + '" width="352" height="8" rx="3" fill="#9ca3af" stroke="#4b5563" stroke-width="1.5"/>'
      + (kind === 'gonio' ? '<path d="M' + (MS[0] - 10) + ',' + (MS[1] - 7).toFixed(1) + ' L' + (MS[0] + 16) + ',' + MS[1].toFixed(1) + ' L' + (MS[0] - 10) + ',' + (MS[1] + 7).toFixed(1) + ' Z" fill="#6b7280" stroke="#374151" stroke-width="1.5"/>' : '')
      + '</g>'
      + (hasStent(kind) ? '<g id="migs-stent" opacity="0"><rect x="' + (MS[0] - 6) + '" y="' + (MS[1] - 9).toFixed(1) + '" width="78" height="18" rx="9" fill="#d4a017" stroke="#7c5a06" stroke-width="2"/><rect x="' + (MS[0] + 6) + '" y="' + (MS[1] - 3).toFixed(1) + '" width="54" height="6" rx="3" fill="#fff7d6"/></g>' : '')
      + '</g>'
      + '<g id="migs-flow" opacity="0">' + arrow('migs-f1', 'M150,420 C240,390 320,320 360,252') + arrow('migs-f2', 'M420,' + (cy - 10).toFixed(0) + ' C450,' + (cy - 50).toFixed(0) + ' 470,' + (cy - 90).toFixed(0) + ' 500,' + (cy - 120).toFixed(0)) + '</g>'
      + txt(60, 250, 'Cornea', 'start') + txt(600, 48, 'Sclera', 'start', MUTED, 400, 20)
      + txt(160, 130, "Schlemm's canal", 'start', INK, 600, 20) + lead(250, 138, 372, 160)
      + txt(570, 330, 'Drain', 'start', INK, 600, 20) + txt(570, 354, '(trabecular', 'start', INK, 400, 18) + txt(570, 376, 'meshwork)', 'start', INK, 400, 18) + lead(566, 326, 428, 196)
      + txt(530, 470, 'Iris', 'start') + lead(526, 464, 486, 440)
      + '<g id="migs-lab-ins" opacity="0">' + txt(40, 330, MIGS_INS[kind], 'start', '#4b5563') + '</g>';
    if (hasStent(kind)) h += '<g id="migs-lab-stent" opacity="0">' + txt(150, 214, 'Stent', 'start') + lead(206, 208, 374, 208) + '</g>';
    if (kind === 'gonio') h += '<g id="migs-lab-gap" opacity="0">' + txt(70, 214, 'Meshwork opened', 'start') + lead(248, 208, 378, 204) + '</g>';
    if (hasVisco(kind)) h += '<g id="migs-lab-cath" opacity="0">' + txt(70, 214, 'Catheter in the canal', 'start', '#1e3a8a') + lead(284, 204, cx - 6, cy + 4, '#1e3a8a') + '</g>'
      + '<g id="migs-lab-dil" opacity="0">' + txt(70, 214, 'Canal stretched open', 'start', BLUE) + lead(280, 204, cx - 30, cy + 10, BLUE) + '</g>';
    h += '<g id="migs-lab-flow" opacity="0">' + txt(510, 76, 'To the', 'start', BLUE, 600, 18) + txt(510, 98, 'bloodstream', 'start', BLUE, 600, 18) + txt(40, 470, 'Fluid in the front chamber', 'start', BLUE, 600, 20) + '</g>';
    return h + '</svg>';
  }
  // angles in degrees, 0 = 3 o'clock (where the instrument reaches the drain), clockwise on screen
  function ringPt(deg, r) { var a = deg * Math.PI / 180; return [280 + r * Math.cos(a), 210 + r * Math.sin(a)]; }
  function ringArc(a0, a1, r) { var p0 = ringPt(a0, r), p1 = ringPt(a1, r); return 'M' + p0[0].toFixed(1) + ',' + p0[1].toFixed(1) + ' A' + r + ',' + r + ' 0 0,' + (a1 > a0 ? 1 : 0) + ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1); }
  function dash(id, d, color, w, extra) { return '<path id="' + id + '" d="' + d + '" pathLength="1" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-dasharray="1 1" stroke-dashoffset="1"' + (extra || '') + '/>'; }
  var R_CANAL = 181, R_TM = 165;
  function migsRing(kind) {
    var h = svgOpen('0 0 560 420', 'Around the drain: the meshwork and the canal behind it run all the way around the eye'), i, p, q;
    h += '<circle cx="280" cy="210" r="200" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
      + '<circle id="mg-rcanal" cx="280" cy="210" r="' + R_CANAL + '" fill="none" stroke="#93c5fd" stroke-width="7"/>'
      + '<circle cx="280" cy="210" r="' + R_TM + '" fill="none" stroke="url(#pr-tm)" stroke-width="17"/>'
      + '<circle cx="280" cy="210" r="' + (R_TM + 8.5) + '" fill="none" stroke="#b45309" stroke-width="1"/>'
      + '<circle cx="280" cy="210" r="156" fill="url(#pr-irisg)" stroke="#3f2a1a" stroke-width="2"/>'
      + '<circle cx="280" cy="210" r="46" fill="#0b0f14"/>';
    var flowAt = [];
    if (hasVisco(kind)) {
      h += dash('mg-dilU', ringArc(-180, 0, R_CANAL), '#3b82f6', 13) + dash('mg-dilL', ringArc(180, 0, R_CANAL), '#3b82f6', 13)
        + dash('mg-cathU', ringArc(0, -180, R_CANAL), '#1e3a8a', 4, ' stroke-linecap="round"') + dash('mg-cathL', ringArc(0, 180, R_CANAL), '#1e3a8a', 4, ' stroke-linecap="round"');
      flowAt = [-150, -110, -70, -30, 30, 70, 110, 150];
    }
    if (hasStent(kind)) {
      h += '<g id="mg-rstent" opacity="0">';
      [-12, 12].forEach(function (a) { p = ringPt(a, 158); q = ringPt(a, 184); h += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="#7c5a06" stroke-width="10" stroke-linecap="round"/><line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="#d4a017" stroke-width="6" stroke-linecap="round"/>'; });
      h += '</g>';
      flowAt = flowAt.concat([-12, 12]);
      if (!hasVisco(kind)) flowAt = flowAt.concat([-34, 34]);
    }
    if (kind === 'gonio') {
      h += dash('mg-rgonio', ringArc(-55, 55, R_TM), '#fff', 18) + '<circle id="mg-rtool" r="8" fill="#6b7280" stroke="#374151" stroke-width="2" opacity="0"/>';
      flowAt = [-44, -22, 0, 22, 44];
    }
    h += '<g id="mg-rflow" opacity="0">';
    flowAt.forEach(function (a, k) { p = ringPt(a, 186); q = ringPt(a, 204); h += arrow('mg-rf' + k, 'M' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' L' + q[0].toFixed(1) + ',' + q[1].toFixed(1), BLUE, 3.5); });
    h += '</g>'
      + txt(16, 30, 'The canal: a ring', 'start', '#1d4ed8') + txt(16, 54, 'behind the drain', 'start', MUTED, 400, 18) + lead(128, 62, 152, 82, '#1d4ed8')
      + txt(16, 404, 'Iris', 'start') + lead(56, 396, 190, 290)
      + txt(544, 404, 'Pupil', 'end') + lead(490, 398, 300, 228);
    return h + '</svg>';
  }
  var MIGS_VARIANTS = [['migs', 'Stent'], ['gonio', 'Goniotomy'], ['visco', 'Viscodilation'], ['combo', 'Viscodilation + stent']];
  var MIGS_COMBINE = ' These procedures are often combined with each other, and with cataract surgery, in one operation.';
  // the instrument alone (cannula, blade) and the instrument carrying the stent
  function moveIns(x, show) { at('migs-ins', 'transform', 'translate(' + x.toFixed(1) + ',0)'); if (show !== undefined) op('migs-ins', show); }
  function insAt(x, show) { at('migs-ins', 'transform', 'translate(' + x.toFixed(1) + ',0)'); at('migs-stent', 'transform', 'translate(' + x.toFixed(1) + ',0)'); if (show !== undefined) { op('migs-ins', show); op('migs-stent', show); } }
  function migsFlow(caption) {
    return { label: 'Fluid', dur: 2200, caption: caption,
      draw: function (p) { var e = ease(p); op('migs-flow', e); op('migs-lab-flow', e); op('mg-rflow', e); at('migs-canal', 'fill', p > 0.3 ? '#60a5fa' : '#93c5fd'); } };
  }
  function viscoSteps() {
    return [
      { label: 'Catheter', dur: 2800, caption: '<strong>The catheter.</strong> Through a tiny incision, a fine cannula is brought to the drain. A flexible catheter, about as thin as a few hairs, is passed from it through the meshwork and threaded along the canal, halfway around the eye.',
        draw: function (p) {
          var a = ease(clamp(p / 0.35, 0, 1)), c = ease(clamp((p - 0.35) / 0.65, 0, 1));
          moveIns(lerp(-320, 0, a), p > 0 ? 1 : 0); op('migs-lab-ins', a * (1 - c)); op('migs-cath', c); op('migs-lab-cath', c); at('mg-cathU', 'stroke-dashoffset', 1 - c);
        } },
      { label: 'Gel', dur: 2600, caption: '<strong>The gel.</strong> As the catheter is drawn back, a clear gel is released into the canal. It stretches the canal open, along with the small channels that carry fluid away from it.',
        draw: function (p) {
          var e = ease(p); at('mg-dilU', 'stroke-dashoffset', 1 - e); at('migs-canal', 'rx', 44 + 5 * e); at('migs-canal', 'ry', 14 + 5 * e); op('migs-lab-dil', e);
          if (p > 0) { at('mg-cathU', 'stroke-dashoffset', e); op('migs-lab-cath', 1 - e); }
        } },
      { label: 'Other half', dur: 3000, caption: '<strong>The other half.</strong> The catheter is then passed the other way and drawn back in the same manner, so the canal is treated all the way around.',
        draw: function (p) {
          var a = ease(clamp(p * 2, 0, 1)), c = ease(clamp(p * 2 - 1, 0, 1));
          at('mg-cathL', 'stroke-dashoffset', p < 0.5 ? 1 - a : c); at('mg-dilL', 'stroke-dashoffset', 1 - c);
          if (p > 0) { at('migs-canal', 'rx', 49 + 4 * c); at('migs-canal', 'ry', 19 + 4 * c); }
        } }
    ];
  }
  function migsProc(kind) {
    var approach = '<strong>The instrument.</strong> Through the same tiny incision used for cataract surgery, or one like it, the surgeon brings ', watch = ' across the front chamber, watching the drain through a mirrored lens.';
    var steps;
    if (kind === 'migs') {
      steps = [
        { label: 'Inserter', dur: 1800, caption: approach + 'the stent on its inserter' + watch,
          draw: function (p) { var e = ease(p); insAt(lerp(-320, -60, e), p > 0 ? 1 : 0); op('migs-lab-ins', e); } },
        { label: 'Stent', dur: 1400, caption: '<strong>The stent goes in.</strong> The stent, smaller than a grain of rice, is pushed through the meshwork so its tip sits in the canal. Depending on the device, one or more are placed.',
          draw: function (p) { var e = ease(p); op('migs-lab-stent', e); op('mg-rstent', e); if (!p) return; insAt(lerp(-60, 0, e)); } },
        { label: 'Withdraw', dur: 1400, caption: '<strong>The inserter is withdrawn.</strong> The stent stays in place on its own. Nothing is seen or felt from the outside.',
          draw: function (p) { if (!p) return; var e = ease(p); at('migs-ins', 'transform', 'translate(' + lerp(0, -380, e).toFixed(1) + ',0)'); op('migs-ins', 1 - e); op('migs-lab-ins', 1 - e); } },
        migsFlow('<strong>Fluid takes the shortcut.</strong> It passes through the stent into the canal and on to the bloodstream, bypassing the part of the drain that resists it.' + MIGS_COMBINE)
      ];
    } else if (kind === 'gonio') {
      steps = [
        { label: 'Blade', dur: 1800, caption: approach + 'a fine blade' + watch,
          draw: function (p) { var e = ease(p); insAt(lerp(-320, 0, e), p > 0 ? 1 : 0); op('migs-lab-ins', e); } },
        { label: 'Open', dur: 2600, caption: '<strong>The drain is opened.</strong> A strip of the meshwork is removed along part of the ring, usually a quarter to a third of the way around. The canal behind it is now open to the front chamber. No implant is left in the eye.',
          draw: function (p) {
            var e = ease(p); op('migs-gap', ease(clamp(p * 2.5, 0, 1))); op('migs-lab-gap', e); at('mg-rgonio', 'stroke-dashoffset', 1 - e);
            var t = ringPt(-55 + 110 * e, R_TM); at('mg-rtool', 'transform', 'translate(' + t[0].toFixed(1) + ',' + t[1].toFixed(1) + ')'); op('mg-rtool', p > 0 && p < 1 ? 1 : 0);
          } },
        { label: 'Withdraw', dur: 1300, caption: '<strong>The blade is withdrawn.</strong> Nothing is seen or felt from the outside.',
          draw: function (p) { if (!p) return; var e = ease(p); insAt(lerp(0, -380, e), 1 - e); op('migs-lab-ins', 1 - e); } },
        migsFlow('<strong>Fluid reaches the canal directly.</strong> With the strip of meshwork gone, fluid passes straight into the canal and on to the bloodstream. A little bleeding from the canal in the first days is common and clears.' + MIGS_COMBINE)
      ];
    } else {
      steps = viscoSteps();
      if (kind === 'combo') {
        steps.push(
          { label: 'Stent', dur: 2600, caption: '<strong>Then a stent.</strong> The cannula comes out and the stent is brought in on its inserter, then pushed through the meshwork into the stretched canal.',
            draw: function (p) {
              var a = ease(clamp(p / 0.35, 0, 1)), b = ease(clamp((p - 0.35) / 0.65, 0, 1));
              op('migs-lab-stent', b); op('mg-rstent', b); if (!p) { op('migs-stent', 0); at('migs-stent', 'transform', 'translate(-320,0)'); return; }
              op('migs-cath', 1 - a); op('migs-lab-dil', 1 - a);
              if (b > 0) { insAt(lerp(-320, 0, b), 1); op('migs-lab-ins', b); }
              else { moveIns(lerp(0, -380, a), 1 - a); op('migs-stent', 0); op('migs-lab-ins', 1 - a); }
            } },
          { label: 'Withdraw', dur: 1300, caption: '<strong>The inserter is withdrawn.</strong> The stent stays in place, and nothing else is left in the eye.',
            draw: function (p) { if (!p) return; var e = ease(p); moveIns(lerp(0, -380, e), 1 - e); op('migs-lab-ins', 1 - e); } },
          migsFlow('<strong>Two routes out.</strong> Fluid passes through the stent into the canal, and the stretched canal and its channels carry it away more easily. Done together, often with cataract surgery, the two can lower pressure more than either alone.')
        );
      } else {
        steps.push((function () {
          var f = migsFlow('<strong>Fluid drains more easily.</strong> The catheter and cannula are removed and nothing is left in the eye. The stretched canal and channels carry fluid away more easily.' + MIGS_COMBINE), d0 = f.draw;
          f.draw = function (p) { d0(p); if (p > 0) { var g = 1 - ease(clamp(p * 3, 0, 1)); moveIns(lerp(-380, 0, g), g); op('migs-cath', g); } };
          return f;
        })());
      }
    }
    return {
      variants: MIGS_VARIANTS,
      views: [['Close-up of the drain', function () { return migsSvg(kind); }], ['Around the drain', function () { return migsRing(kind); }]],
      intro: '<strong>Before.</strong> Fluid has to pass through the meshwork to reach the canal behind it, and in glaucoma the meshwork resists it. '
        + ({ migs: 'A stent holds a path open through the meshwork.', gonio: 'A goniotomy removes a strip of the meshwork.', visco: 'Viscodilation stretches the canal and its outflow channels open with a gel.',
          combo: 'Viscodilation and a stent are often done together: first the canal is stretched open with a gel, then a stent holds a path open through the meshwork into it.' })[kind],
      steps: steps
    };
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

  // ---------- the tear film between blinks ----------
  // Not a procedure, but the same step-through format: a blink spreads a
  // fresh tear film, then it thins until the next blink. Three variants:
  // healthy, not enough oil (it evaporates and breaks up), not enough
  // tears (a thin film that breaks up). Two drawings: a slice through the
  // film, and the front of the eye with the dye a doctor uses to see it.
  var TEAR = {
    tears: { h0: 120, loss: 0.18, breakAt: 2, oil: 1, evap: 0.35 },
    tearsevap: { h0: 120, loss: 0.5, breakAt: 0.3, oil: 0.25, evap: 1 },
    tearsaq: { h0: 62, loss: 0.3, breakAt: 0.45, oil: 1, evap: 0.45 }
  };
  var TEAR_SPOTS = [[150, 34], [318, 44], [452, 30]]; // dry spots in the slice: x, half-width
  var TF_BASE = 300; // top of the eye's surface in the slice
  // q: how far into the gap between blinks (0 fresh .. 1 just before the next blink)
  function tearState(v, q) { var d = clamp((q - v.breakAt) / (1 - v.breakAt), 0, 1); return { h: v.h0 * (1 - v.loss * q), dry: v.breakAt > 1 ? 0 : ease(d) }; }
  function tearTop(v, x, q) {
    var st = tearState(v, q), y = TF_BASE - st.h, i, g;
    for (i = 0; i < TEAR_SPOTS.length; i++) { g = Math.exp(-Math.pow((x - TEAR_SPOTS[i][0]) / TEAR_SPOTS[i][1], 2)); y += (st.h + 2) * st.dry * g; }
    return Math.min(y, TF_BASE + 2);
  }
  // the film's top edge; left of lidX it has just been refreshed by the lid
  function tearPaths(v, q, lidX) {
    var top = '', x, y;
    for (x = 20; x <= 540; x += 8) { y = tearTop(v, x, x < lidX ? 0 : q); top += (x === 20 ? 'M' : ' L') + x + ',' + y.toFixed(1); }
    return { top: top, fill: top + ' L540,' + TF_BASE + ' L20,' + TF_BASE + ' Z' };
  }
  function tearSlice(key) {
    var v = TEAR[key], h = svgOpen('0 0 560 420', 'A slice through the tear film on the surface of the eye'), i;
    h += '<rect x="20" y="' + TF_BASE + '" width="520" height="100" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      + '<path id="tf-water" fill="#93c5fd"/>'
      + '<rect x="20" y="' + (TF_BASE - 7) + '" width="520" height="8" fill="#6ee7b7"/>'
      + '<path id="tf-oil" fill="none" stroke="#f59e0b" stroke-width="' + (v.oil < 1 ? 5 : 8) + '" stroke-linecap="round"' + (v.oil < 1 ? ' stroke-dasharray="26 46"' : '') + '/>'
      + '<g id="tf-evap" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round">';
    for (i = 0; i < 6; i++) { var ex = 70 + i * 84; h += '<path d="M' + ex + ',150 q-9,-12 0,-24 q9,-12 0,-24" marker-end="url(#pr-ahm)"/>'; }
    h += '</g>'
      + '<g id="tf-lid" opacity="0"><rect x="-150" y="96" width="150" height="212" rx="18" fill="#f1c7a8" stroke="#b07d5b" stroke-width="2"/>' + txt(-75, 206, 'Eyelid', 'middle', '#7c4a2a') + '</g>'
      + txt(280, 372, 'Surface of the eye (cornea)', 'middle', '#1e3a8a', 600, 20)
      + '<g id="tf-lab-layers">' + txt(24, 30, 'Oil layer', 'start', '#b45309', 600, 20) + txt(24, 52, 'slows evaporation', 'start', MUTED, 400, 17)
      + txt(214, 30, 'Water layer', 'start', '#1d4ed8', 600, 20) + txt(214, 52, 'the bulk of the tears', 'start', MUTED, 400, 17)
      + txt(404, 30, 'Mucus layer', 'start', '#047857', 600, 20) + txt(404, 52, 'helps tears stick', 'start', MUTED, 400, 17) + '</g>'
      + '<text id="tf-timer" x="540" y="92" ' + FONT + ' font-size="20" font-weight="600" fill="' + INK + '" text-anchor="end"></text>'
      + '<g id="tf-lab-dry" opacity="0">' + txt(TEAR_SPOTS[1][0], 252, 'Dry spot', 'middle', '#b91c1c', 700, 20) + '</g>';
    return h + '</svg>';
  }
  // What the dye shows differs by kind. Not enough oil: the film breaks up
  // fast, in patches scattered all over. Not enough tears: the line of tears
  // along the lower lid is thin, and the dry band sits low on the eye, where
  // it is most exposed. [dx, dy, rx, ry, rotation]
  var DYE_SPOTS = {
    tears: [],
    tearsevap: [[-58, -50, 15, 9, -20], [-8, -66, 12, 8, 30], [48, -44, 16, 9, 15], [-70, 4, 13, 8, 60], [-22, -8, 17, 10, -35], [34, 10, 14, 9, 40], [74, -4, 12, 8, -10], [-44, 52, 15, 9, 20], [8, 60, 16, 9, -25], [56, 54, 13, 8, 35]],
    tearsaq: [[-62, 46, 30, 13, 8], [-4, 62, 34, 14, 0], [58, 48, 30, 13, -8], [-28, 26, 20, 10, -15], [30, 28, 20, 10, 15]]
  };
  var DYE_LABEL = { tears: 'Even color: a smooth film', tearsevap: 'Patches all over, within seconds', tearsaq: 'Thin tear line, dry band low down' };
  function tearFront(key) {
    var h = svgOpen('0 0 560 420', 'The front of the eye stained with a yellow-green dye, as the doctor sees it'), i, sp, spots = DYE_SPOTS[key];
    var lake = key === 'tearsaq' ? 381 : 364; // how far the line of tears along the lower lid reaches up
    h += '<clipPath id="tf-eyeclip"><path d="M60,214 Q280,40 500,214 Q280,388 60,214 Z"/></clipPath>'
      + '<path d="M60,214 Q280,40 500,214 Q280,388 60,214 Z" fill="#fff" stroke="' + INK + '" stroke-width="3"/>'
      + '<g clip-path="url(#tf-eyeclip)">'
      + '<path d="M60,214 Q280,40 500,214 Q280,388 60,214 Z" fill="#d9f99d" opacity="0.55"/>'
      + '<circle cx="280" cy="214" r="112" fill="#65a30d"/><circle cx="280" cy="214" r="112" fill="#bef264" opacity="0.75"/>'
      + '<circle cx="280" cy="214" r="40" fill="#1a2e05" opacity="0.55"/>'
      + '<g id="tf-fspots" fill="#14532d" opacity="0">';
    for (i = 0; i < spots.length; i++) { sp = spots[i]; h += '<ellipse cx="' + (280 + sp[0]) + '" cy="' + (214 + sp[1]) + '" rx="' + sp[2] + '" ry="' + sp[3] + '" transform="rotate(' + sp[4] + ' ' + (280 + sp[0]) + ' ' + (214 + sp[1]) + ')"/>'; }
    h += '</g>'
      + '<path d="M60,214 Q280,388 500,214 Q280,' + lake + ' 60,214 Z" fill="#a3e635" stroke="#65a30d" stroke-width="1"/>'
      // the upper lid: tall enough that nothing shows above it as it comes down
      + '<path id="tf-flid" d="M20,-400 L540,-400 L540,214 Q280,40 20,214 Z" fill="#f1c7a8" stroke="#b07d5b" stroke-width="2"/>'
      + '</g>'
      + '<path d="M60,214 Q280,40 500,214" fill="none" stroke="' + INK + '" stroke-width="5"/>'
      + txt(20, 30, 'Line of tears along the lower lid' + (key === 'tearsaq' ? ': thin' : ''), 'start', '#3f6212', 600, 18) + lead(150, 40, 250, lake === 381 ? 300 : 294, '#3f6212')
      + '<g id="tf-flab-dye">' + txt(20, 404, 'Yellow-green dye in the tears', 'start', '#3f6212', 600, 20) + '</g>'
      + '<g id="tf-flab-end" opacity="0">' + txt(20, 404, DYE_LABEL[key], 'start', key === 'tears' ? '#3f6212' : '#14532d', 600, 20) + '</g>';
    return h + '</svg>';
  }
  var TEAR_VARIANTS = [['tears', 'Healthy'], ['tearsevap', 'Not enough oil'], ['tearsaq', 'Not enough tears']];
  function tearDraw(v, q, lidX, lidShow) {
    var pth = tearPaths(v, q, lidX), st = tearState(v, q);
    at('tf-water', 'd', pth.fill); at('tf-oil', 'd', pth.top);
    op('tf-evap', v.evap * (lidShow ? 0.3 : 1));
    at('tf-lid', 'transform', 'translate(' + lidX.toFixed(1) + ',0)'); op('tf-lid', lidShow ? 1 : 0);
    var dry = st.dry * (1 - clamp(lidX / 560, 0, 1)); // the lid wipes the dry spots away as it passes
    op('tf-lab-dry', dry > 0.6 ? 1 : 0); op('tf-fspots', 0.85 * dry);
    return st;
  }
  function tearProc(key) {
    var v = TEAR[key], healthy = key === 'tears', breakSec = Math.round(v.breakAt * 10);
    var why = key === 'tearsevap'
      ? 'Here the oil layer is patchy, because the oil glands in the eyelids are blocked. Without its cover the water evaporates quickly.'
      : key === 'tearsaq' ? 'Here the tear glands make too little of the watery part, so the film starts out thin.' : 'A healthy film has all three layers.';
    return {
      variants: TEAR_VARIANTS,
      views: [['A slice through the tear film', function () { return tearSlice(key); }], ['With dye, as the doctor sees it', function () { return tearFront(key); }]],
      intro: '<strong>The tear film.</strong> A thin film of tears covers the front of the eye. It has three layers: mucus that helps it stick, water, and a skin of oil on top that slows evaporation. ' + why,
      steps: [
        { label: 'Blink', dur: 1700, caption: '<strong>A blink.</strong> The eyelid sweeps across and spreads a fresh, smooth film of tears over the surface.',
          draw: function (p, t) {
            var e = ease(p), lidX = p > 0 && p < 1 ? lerp(-10, 720, e) : (p >= 1 ? 720 : -10);
            tearDraw(v, 1, lidX, p > 0 && p < 1);
            at('tf-flid', 'transform', 'translate(0,' + (p > 0 && p < 1 ? (176 * Math.sin(Math.PI * p)).toFixed(1) : '0') + ')');
            at('tf-timer', 'opacity', p >= 1 ? 1 : 0);
          } },
        { label: 'Eye open', dur: 5200, caption: healthy
            ? '<strong>Between blinks.</strong> The film thins a little as water evaporates, but the oil layer holds it together. It stays smooth for ten seconds or more, until the next blink.'
            : '<strong>Between blinks.</strong> The film thins and then breaks apart after only about ' + breakSec + ' seconds, leaving dry spots on the surface before the next blink arrives.',
          draw: function (p) {
            if (p > 0) { tearDraw(v, p, -10, false); }
            var el = $('tf-timer'); if (el) el.textContent = 'Seconds since the blink: ' + Math.round(10 * p);
            op('tf-lab-layers', 1);
          } },
        { label: healthy ? 'Result' : 'What you feel', dur: 2200, caption: healthy
            ? '<strong>A smooth surface.</strong> A smooth tear film is the first lens of the eye, so vision stays clear and the eye feels comfortable. With dye, the doctor sees an even color.'
            : '<strong>What you feel.</strong> Dry spots sting, burn or feel gritty, and they blur vision until the next blink. The irritation can also set off a flood of watery reflex tears, which is why a dry eye often waters. '
              + (key === 'tearsevap' ? 'With dye, the doctor sees dark patches open up all over the surface within a few seconds of a blink.' : 'With dye, the doctor sees only a thin line of tears along the lower lid, and a dry band low on the eye where it is most exposed.'),
          draw: function (p) { op('tf-flab-end', ease(p)); op('tf-flab-dye', 1 - ease(p)); } }
      ]
    };
  }

  // ---------- lid care: warm compress, massage, clean ----------
  // An upper eyelid cut through, hanging over the eye (the geometry of
  // eyelid-glands.svg): a blocked oil gland is warmed, emptied and cleaned.
  function lidcareSvg() {
    var h = svgOpen('0 0 560 420', 'An eyelid cut through, with a blocked oil gland, hanging over the surface of the eye'), k;
    h += '<rect x="20" y="346" width="520" height="56" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      + '<rect id="lc-water" x="20" y="334" width="520" height="12" fill="#93c5fd"/>'
      + '<line id="lc-oil-bad" x1="20" y1="334" x2="540" y2="334" stroke="#f59e0b" stroke-width="4" stroke-dasharray="14 40" stroke-linecap="round"/>'
      + '<line id="lc-oil-good" x1="20" y1="322" x2="540" y2="322" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" opacity="0"/>'
      + '<g id="lc-evap" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round">';
    [60, 100, 140, 420, 460, 500].forEach(function (x) { h += '<path d="M' + x + ',316 q-8,-11 0,-22 q8,-11 0,-22" marker-end="url(#pr-ahm)"/>'; });
    h += '</g>'
      + '<path d="M210,40 L350,40 L350,266 Q350,306 310,306 L250,306 Q210,306 210,266 Z" fill="#f1c7a8" stroke="#b07d5b" stroke-width="2"/>'
      + '<path id="lc-red" d="M250,306 L310,306 Q342,306 348,278 L212,278 Q218,306 250,306 Z" fill="#f87171" opacity="0.55"/>';
    for (k = 0; k < 3; k++) h += '<path d="M' + (226 + k * 10) + ',304 q-14,16 -30,' + (18 + k * 4) + '" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>';
    h += '<g id="lc-crust" fill="#fef3c7" stroke="#b45309" stroke-width="1"><circle cx="214" cy="310" r="4"/><circle cx="222" cy="304" r="3.5"/><circle cx="204" cy="316" r="3.5"/><circle cx="232" cy="309" r="3"/></g>'
      + '<path id="lc-gland" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>'
      + '<path d="M300,262 L300,306" stroke="#b45309" stroke-width="7" stroke-linecap="round"/><path id="lc-duct" d="M300,262 L300,296" stroke="#fde68a" stroke-width="3.5" stroke-linecap="round"/>'
      + '<ellipse id="lc-plug" cx="300" cy="305" rx="10" ry="7" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>'
      + '<path id="lc-drop" d="M300,308 C300,316 304,320 318,321" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" opacity="0"/>'
      // warm compress against the front of the lid, with heat
      + '<g id="lc-compress" opacity="0"><rect x="150" y="50" width="56" height="230" rx="16" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>'
      + '<g fill="none" stroke="#dc2626" stroke-width="3" stroke-linecap="round"><path d="M226,90 q10,10 0,22 q-10,12 0,24"/><path d="M226,160 q10,10 0,22 q-10,12 0,24"/><path d="M226,226 q10,10 0,22"/></g></g>'
      + '<g id="lc-finger" opacity="0"><rect x="150" y="-20" width="56" height="130" rx="28" fill="#f1c7a8" stroke="#b07d5b" stroke-width="2"/><path d="M162,92 Q178,104 194,92" fill="none" stroke="#b07d5b" stroke-width="2"/></g>'
      + '<g id="lc-wipe" opacity="0"><rect x="150" y="296" width="60" height="24" rx="8" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/></g>'
      + txt(280, 386, 'Surface of the eye', 'middle', '#1e3a8a', 600, 18)
      + txt(370, 80, 'Eyelid', 'start') + lead(366, 74, 344, 80)
      + '<g id="lc-lab-block">' + txt(380, 180, 'Oil gland, blocked', 'start', '#92400e') + txt(380, 204, 'with thick oil', 'start', '#92400e', 400) + lead(376, 174, 318, 180, '#92400e') + '</g>'
      + '<g id="lc-lab-flow" opacity="0">' + txt(380, 180, 'Oil gland, flowing', 'start', '#b45309') + lead(376, 174, 316, 180, '#b45309') + '</g>'
      + '<g id="lc-lab-compress" opacity="0">' + txt(20, 40, 'Warm compress', 'start', '#b91c1c') + '</g>'
      + '<g id="lc-lab-finger" opacity="0">' + txt(20, 40, 'Gentle massage', 'start', '#7c4a2a') + txt(20, 64, 'toward the lashes', 'start', '#7c4a2a', 400) + '</g>'
      + '<g id="lc-lab-wipe" opacity="0">' + txt(20, 230, 'Lid wipe along', 'start', '#0369a1') + txt(20, 254, 'the lash line', 'start', '#0369a1', 400) + '</g>';
    return h + '</svg>';
  }
  function lcGland(w) { // the gland sac, wide when blocked
    return 'M' + (300 - w) + ',90 Q300,60 ' + (300 + w) + ',90 L' + (300 + w) + ',240 Q300,272 ' + (300 - w) + ',240 Z';
  }
  var LIDCARE = {
    views: [['An eyelid, cut through', lidcareSvg]],
    intro: '<strong>A blocked gland.</strong> The oil glands open along the edge of the eyelid, just behind the lashes. Here the oil has turned thick and plugged the opening, so little reaches the tears and they evaporate. The lid edge is red, with crusts on the lashes.',
    steps: [
      { label: 'Warm', dur: 2600, caption: '<strong>Warm compress.</strong> Hold something comfortably warm against the closed lids for 5 to 10 minutes. The warmth melts the thick oil, the way butter softens.',
        draw: function (p) {
          var e = ease(p), inn = ease(clamp(p * 3, 0, 1));
          op('lc-compress', inn); at('lc-compress', 'transform', 'translate(' + (-50 * (1 - inn)).toFixed(1) + ',0)'); op('lc-lab-compress', inn);
          at('lc-gland', 'd', lcGland(26)); at('lc-gland', 'fill', p > 0.5 ? '#fcd34d' : '#fbbf24');
        } },
      { label: 'Massage', dur: 2600, caption: '<strong>Massage.</strong> Straight afterward, roll a clean finger gently along the lid toward the lashes: downward on the upper lid, upward on the lower lid. The softened oil is pushed out of the gland.',
        draw: function (p) {
          var e = ease(p);
          op('lc-finger', p > 0 && p < 1 ? 1 : 0); at('lc-finger', 'transform', 'translate(0,' + (190 * e).toFixed(1) + ')'); op('lc-lab-finger', p > 0 && p < 1 ? 1 : 0);
          op('lc-plug', 1 - ease(clamp(p * 2.5, 0, 1))); op('lc-drop', ease(clamp(p * 2 - 0.6, 0, 1))); at('lc-duct', 'd', 'M300,262 L300,' + (296 + 10 * e).toFixed(1));
          op('lc-lab-block', 1 - e); op('lc-lab-flow', e);
          if (p > 0) { at('lc-gland', 'd', lcGland(26 - 10 * e)); at('lc-gland', 'fill', p > 0.6 ? '#fde68a' : '#fcd34d'); op('lc-compress', 0); op('lc-lab-compress', 0); }
        } },
      { label: 'Clean', dur: 2200, caption: '<strong>Clean the lid edge.</strong> Wipe along the base of the lashes with a lid wipe or lid cleanser. This clears crusts and the bacteria and mites that feed the inflammation.',
        draw: function (p) {
          var e = ease(p);
          op('lc-wipe', p > 0 && p < 1 ? 1 : 0); at('lc-wipe', 'transform', 'translate(' + (26 * Math.sin(p * Math.PI * 3)).toFixed(1) + ',0)'); op('lc-lab-wipe', p > 0 && p < 1 ? 1 : 0);
          op('lc-crust', 1 - e);
        } },
      { label: 'Weeks later', dur: 2400, caption: '<strong>With daily care, over two to four weeks.</strong> The glands keep flowing, a smooth layer of oil covers the tears again, the tears stop evaporating, and the redness settles. It works as long as it is kept up.',
        draw: function (p) { var e = ease(p); op('lc-oil-good', e); op('lc-oil-bad', 1 - e); op('lc-evap', 1 - e); op('lc-red', 0.55 * (1 - e)); at('lc-water', 'y', 334 - 12 * e); at('lc-water', 'height', 12 + 12 * e); } }
    ]
  };

  // ---------- punctal plug ----------
  function plugSvg() {
    var cx = 250, cy = 200, h = svgOpen('0 0 560 420', 'The front of an eye, with the tear drains at the inner corner');
    var eye = 'M' + (cx - 170) + ',' + cy + ' Q' + cx + ',' + (cy - 167) + ' ' + (cx + 170) + ',' + cy + ' Q' + cx + ',' + (cy + 167) + ' ' + (cx - 170) + ',' + cy + ' Z';
    h += '<clipPath id="pg-clip"><path d="' + eye + '"/></clipPath><path d="' + eye + '" fill="#fff" stroke="' + INK + '" stroke-width="3"/>'
      + '<g clip-path="url(#pg-clip)"><circle cx="' + cx + '" cy="' + cy + '" r="62" fill="#5b8bb5" stroke="#2c4f6e" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="25" fill="#111827"/><circle cx="' + (cx + 14) + '" cy="' + (cy - 16) + '" r="7" fill="#fff"/>'
      + '<path id="pg-lake" fill="#93c5fd" opacity="0.92"/></g>'
      + '<path d="M' + (cx - 170) + ',' + cy + ' Q' + cx + ',' + (cy - 167) + ' ' + (cx + 170) + ',' + cy + '" fill="none" stroke="' + INK + '" stroke-width="5"/>'
      + '<path d="M' + (cx - 170) + ',' + cy + ' Q' + cx + ',' + (cy + 167) + ' ' + (cx + 170) + ',' + cy + '" fill="none" stroke="' + INK + '" stroke-width="3"/>'
      // the two drain channels joining and running down to the nose
      + '<path d="M' + (cx + 150) + ',' + (cy - 16) + ' C' + (cx + 190) + ',' + (cy - 30) + ' ' + (cx + 214) + ',' + (cy - 14) + ' ' + (cx + 226) + ',' + (cy + 4) + '" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round" opacity="0.55"/>'
      + '<path d="M' + (cx + 152) + ',' + (cy + 22) + ' C' + (cx + 190) + ',' + (cy + 34) + ' ' + (cx + 214) + ',' + (cy + 22) + ' ' + (cx + 226) + ',' + (cy + 4) + '" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round" opacity="0.55"/>'
      + '<path d="M' + (cx + 226) + ',' + (cy - 8) + ' C' + (cx + 244) + ',' + (cy - 8) + ' ' + (cx + 248) + ',' + (cy + 20) + ' ' + (cx + 242) + ',' + (cy + 50) + ' C' + (cx + 236) + ',' + (cy + 90) + ' ' + (cx + 244) + ',' + (cy + 130) + ' ' + (cx + 256) + ',' + (cy + 170) + '" fill="none" stroke="#1d4ed8" stroke-width="9" stroke-linecap="round" opacity="0.4"/>'
      + '<circle cx="' + (cx + 150) + '" cy="' + (cy - 16) + '" r="5" fill="' + INK + '"/><circle cx="' + (cx + 152) + '" cy="' + (cy + 22) + '" r="5" fill="' + INK + '"/>'
      + '<g id="pg-flow-up">' + arrow('pg-fu', 'M' + (cx + 104) + ',' + (cy - 14) + ' L' + (cx + 138) + ',' + (cy - 16), BLUE, 3.5) + '</g>'
      + '<g id="pg-flow-low">' + arrow('pg-fl', 'M' + (cx + 104) + ',' + (cy + 30) + ' L' + (cx + 140) + ',' + (cy + 23), BLUE, 3.5) + '</g>'
      + '<g id="pg-plug" opacity="0"><rect x="' + (cx + 141) + '" y="' + (cy + 12) + '" width="22" height="9" rx="4.5" fill="#0f9b8e" stroke="#0b6b62" stroke-width="2"/><rect x="' + (cx + 147) + '" y="' + (cy + 19) + '" width="10" height="16" rx="4" fill="#0f9b8e" stroke="#0b6b62" stroke-width="2"/>'
      + '<line id="pg-tool" x1="' + (cx + 152) + '" y1="' + (cy + 10) + '" x2="' + (cx + 250) + '" y2="' + (cy - 130) + '" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/></g>'
      + txt(20, 30, 'Drain openings', 'start') + txt(20, 54, 'at the inner corner', 'start', MUTED, 400, 18) + lead(180, 40, cx + 146, cy - 20)
      + txt(540, 400, 'To the nose', 'end', MUTED, 400, 18)
      + '<g id="pg-lab-thin">' + txt(20, 400, 'Few tears on the eye', 'start', '#b91c1c') + '</g>'
      + '<g id="pg-lab-plug" opacity="0">' + txt(540, 60, 'Plug', 'end', '#0b6b62', 700) + lead(496, 66, cx + 160, cy + 16, '#0b6b62') + '</g>'
      + '<g id="pg-lab-full" opacity="0">' + txt(20, 400, 'Your own tears stay longer', 'start', BLUE) + '</g>';
    return h + '</svg>';
  }
  function plugLake(e) { // the line of tears along the lower lid, thin to full
    var cx = 250, cy = 200, inner = cy + 158 - 40 * e;
    return 'M' + (cx - 170) + ',' + cy + ' Q' + cx + ',' + (cy + 167) + ' ' + (cx + 170) + ',' + cy + ' Q' + cx + ',' + inner.toFixed(1) + ' ' + (cx - 170) + ',' + cy + ' Z';
  }
  var PLUG = {
    views: [['The front of the eye', plugSvg]],
    intro: '<strong>Before.</strong> Tears leave the eye through two small openings at the inner corner of the lids and drain into the nose. When the eye makes too few tears, what little there is drains away quickly.',
    steps: [
      { label: 'Plug', dur: 2400, caption: '<strong>The plug.</strong> In the office, after a numbing drop, a tiny soft plug is slipped into the lower drain opening. It takes a few seconds. You may be aware of it at the corner of the lid for a day or two.',
        draw: function (p) {
          var e = ease(p), out = ease(clamp(p * 3 - 2, 0, 1));
          op('pg-plug', p > 0 ? 1 : 0); at('pg-plug', 'transform', 'translate(' + (36 * (1 - ease(clamp(p * 1.5, 0, 1)))).toFixed(1) + ',' + (-50 * (1 - ease(clamp(p * 1.5, 0, 1)))).toFixed(1) + ')');
          op('pg-tool', 1 - out); op('pg-lab-plug', e); op('pg-flow-low', 1 - ease(clamp(p * 1.5, 0, 1)));
        } },
      { label: 'Tears stay', dur: 2800, caption: '<strong>Your own tears stay longer.</strong> With the lower drain closed, tears build up along the lid and keep the surface wet. The upper drain still works, so the eye does not usually overflow. Some plugs dissolve over months; others stay until they are removed.',
        draw: function (p) { var e = ease(p); at('pg-lake', 'd', plugLake(e)); op('pg-lab-thin', 1 - e); op('pg-lab-full', e); } }
    ]
  };

  // ---------- why an eye waters ----------
  // The front of the eye with its tear gland and drains. Three causes:
  // reflex tears from a dry surface, a blocked drain, and a lower lid that
  // has fallen away from the eye so the drain opening no longer touches it.
  var WCX = 250, WCY = 210;
  function wLid(sag) { return 'M' + (WCX - 170) + ',' + WCY + ' Q' + WCX + ',' + (WCY + 167 + sag) + ' ' + (WCX + 170) + ',' + WCY; }
  function wLake(level, sag) { return wLid(sag) + ' Q' + WCX + ',' + (WCY + 160 + sag - 44 * level).toFixed(1) + ' ' + (WCX - 170) + ',' + WCY + ' Z'; }
  function waterySvg(kind) {
    var cx = WCX, cy = WCY, h = svgOpen('0 0 560 440', 'The front of an eye with its tear gland above and its drains at the inner corner');
    h += '<path d="M70,96 C90,52 170,38 220,64 C202,88 140,118 92,128 Z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>'
      + '<path id="wt-white" d="M' + (cx - 170) + ',' + cy + ' Q' + cx + ',' + (cy - 167) + ' ' + (cx + 170) + ',' + cy + ' Q' + cx + ',' + (cy + 167) + ' ' + (cx - 170) + ',' + cy + ' Z" fill="#fff"/>'
      + '<path id="wt-under" fill="#fecaca" opacity="0"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="60" fill="#5b8bb5" stroke="#2c4f6e" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="24" fill="#111827"/><circle cx="' + (cx + 14) + '" cy="' + (cy - 16) + '" r="7" fill="#fff"/>'
      + '<g id="wt-dry" fill="#b91c1c" opacity="0"><ellipse cx="' + (cx - 26) + '" cy="' + (cy + 22) + '" rx="12" ry="7"/><ellipse cx="' + (cx + 22) + '" cy="' + (cy + 34) + '" rx="10" ry="6"/><ellipse cx="' + (cx + 4) + '" cy="' + (cy - 4) + '" rx="8" ry="5"/></g>'
      + '<path id="wt-lake" fill="#93c5fd" opacity="0.92"/>'
      + '<path d="M' + (cx - 170) + ',' + cy + ' Q' + cx + ',' + (cy - 167) + ' ' + (cx + 170) + ',' + cy + '" fill="none" stroke="' + INK + '" stroke-width="5"/>'
      + '<path id="wt-lid" fill="none" stroke="' + INK + '" stroke-width="3.5"/>'
      + '<path d="M' + (cx + 150) + ',' + (cy - 16) + ' C' + (cx + 190) + ',' + (cy - 30) + ' ' + (cx + 214) + ',' + (cy - 14) + ' ' + (cx + 226) + ',' + (cy + 4) + ' M' + (cx + 152) + ',' + (cy + 22) + ' C' + (cx + 190) + ',' + (cy + 34) + ' ' + (cx + 214) + ',' + (cy + 22) + ' ' + (cx + 226) + ',' + (cy + 4) + '" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round" opacity="0.55"/>'
      + '<path d="M' + (cx + 226) + ',' + (cy - 8) + ' C' + (cx + 244) + ',' + (cy - 8) + ' ' + (cx + 248) + ',' + (cy + 20) + ' ' + (cx + 242) + ',' + (cy + 50) + ' C' + (cx + 236) + ',' + (cy + 90) + ' ' + (cx + 244) + ',' + (cy + 130) + ' ' + (cx + 256) + ',' + (cy + 190) + '" fill="none" stroke="#1d4ed8" stroke-width="9" stroke-linecap="round" opacity="0.4"/>'
      + '<circle cx="' + (cx + 150) + '" cy="' + (cy - 16) + '" r="5" fill="' + INK + '"/><circle id="wt-punct" cx="' + (cx + 152) + '" cy="' + (cy + 22) + '" r="5" fill="' + INK + '"/>'
      + '<g id="wt-in">' + arrow('wt-in1', 'M150,118 C170,146 182,166 188,184') + '</g>'
      + '<g id="wt-in2" opacity="0">' + arrow('wt-in2a', 'M120,128 C136,160 146,180 150,198', BLUE, 5) + arrow('wt-in2b', 'M186,104 C208,132 222,150 228,168', BLUE, 5) + '</g>'
      + '<g id="wt-out">' + arrow('wt-out1', 'M' + (cx + 104) + ',' + (cy + 4) + ' L' + (cx + 138) + ',' + (cy + 4), BLUE, 3.5) + '</g>'
      + '<g id="wt-block" opacity="0"><path d="M' + (cx + 232) + ',' + (cy + 62) + ' l22,22 m0,-22 l-22,22" stroke="#b91c1c" stroke-width="6" stroke-linecap="round"/></g>'
      + '<g id="wt-drops" fill="#60a5fa" stroke="#1d4ed8" stroke-width="1.5" opacity="0"><path d="M' + (cx + 60) + ',' + (cy + 80) + ' c10,16 10,28 0,30 c-10,-2 -10,-14 0,-30 Z"/><path d="M' + (cx + 104) + ',' + (cy + 70) + ' c8,13 8,22 0,24 c-8,-2 -8,-11 0,-24 Z"/><path d="M' + (cx + 84) + ',' + (cy + 124) + ' c8,13 8,22 0,24 c-8,-2 -8,-11 0,-24 Z"/></g>'
      + txt(20, 30, 'Tear gland', 'start') + lead(110, 38, 130, 76)
      + txt(540, 40, 'Drains', 'end') + lead(500, 48, cx + 152, cy - 20)
      + txt(540, 428, 'To the nose', 'end', MUTED, 400, 18)
      + '<g id="wt-lab-a" opacity="0">' + txt(20, 400, { reflex: 'Dry, irritated surface', blocked: 'Drain blocked', lid: 'Loose lid, away from the eye' }[kind], 'start', '#b91c1c') + '</g>'
      + '<g id="wt-lab-b" opacity="0">' + txt(20, 428, 'Tears spill over the lid', 'start', BLUE) + '</g>';
    return h + '</svg>';
  }
  var WATERY_VARIANTS = [['reflex', 'Dry eye'], ['blocked', 'Blocked drain'], ['loose', 'Loose lid']];
  var WATERY_TEXT = {
    reflex: ['<strong>Normal.</strong> The tear gland makes a steady trickle of tears, a blink spreads them, and they drain at the inner corner. The most common reason for a watery eye is, oddly, a dry one.',
      '<strong>A dry, irritated surface.</strong> The tear film breaks up and leaves dry spots. The surface is full of nerves, and it signals the tear gland for help.',
      '<strong>A flood of reflex tears.</strong> The gland answers with a rush of watery tears, more than the drains can carry, and they spill over. These tears are thin and do not stay on the eye, so the dryness comes back. Treating the dry eye stops the watering.'],
    blocked: ['<strong>Normal.</strong> The tear gland makes a steady trickle of tears, a blink spreads them, and they drain at the inner corner into the nose.',
      '<strong>A blocked drain.</strong> The drain openings or the tear duct can narrow or block, most often with age. Tears are still made at the normal rate.',
      '<strong>Nowhere to go.</strong> The tears back up, pool along the lid and spill onto the cheek, often with stickiness. An opening that has narrowed can be widened in the office; a blocked duct can be bypassed with surgery.'],
    loose: ['<strong>Normal.</strong> The lower lid sits snugly against the eye, so the drain opening touches the tears, and each blink pumps them into the drain.',
      '<strong>A loose lower lid.</strong> With age the lower lid can slacken and sag or turn outward. The drain opening lifts away from the eye, and the blink no longer pumps tears into it.',
      '<strong>Tears miss the drain.</strong> They pool in the sagging lid and spill over, and the exposed surface dries, which brings more tears. A small operation to tighten the lid fixes it.']
  };
  function wateryProc(key) {
    var kind = key === 'loose' ? 'lid' : key, T = WATERY_TEXT[key], sagNow = 0; // steps draw in order, so the second sees the first's sag
    return {
      variants: WATERY_VARIANTS,
      views: [['The front of the eye', function () { return waterySvg(kind); }]],
      intro: T[0],
      steps: [
        { label: 'The cause', dur: 2400, caption: T[1],
          draw: function (p) {
            var e = ease(p), sag = kind === 'lid' ? 56 * e : 0;
            sagNow = sag;
            at('wt-lid', 'd', wLid(sag)); op('wt-lab-a', e);
            op('wt-dry', kind === 'reflex' ? e : 0); op('wt-block', kind === 'blocked' ? e : 0); op('wt-out', kind === 'reflex' ? 1 : 1 - e);
            at('wt-under', 'd', wLid(0).replace('M', 'M') + ' Q' + WCX + ',' + (WCY + 167 + sag) + ' ' + (WCX - 170) + ',' + WCY + ' Z'); op('wt-under', kind === 'lid' ? 0.8 * e : 0);
            at('wt-punct', 'cy', WCY + 22 + (kind === 'lid' ? 22 * e : 0)); at('wt-punct', 'cx', WCX + 152 + (kind === 'lid' ? -8 * e : 0));
          } },
        { label: 'Overflow', dur: 2800, caption: T[2],
          draw: function (p) {
            var e = ease(p), sag = sagNow;
            at('wt-lake', 'd', wLake((0.25 + 0.75 * e) * (kind === 'lid' ? 0.6 : 1), sag)); op('wt-in2', kind === 'reflex' ? e : 0);
            op('wt-drops', ease(clamp(p * 2 - 0.8, 0, 1))); at('wt-drops', 'transform', 'translate(0,' + (sag * 0.5 + 12 * e).toFixed(1) + ')'); op('wt-lab-b', e);
          } }
      ]
    };
  }

  // ---------- an allergic reaction on the surface of the eye ----------
  var AL_POLLEN = [[110, 0], [210, 1], [300, 2], [396, 3], [470, 4]], AL_GRAN = 14;
  function allergySvg() {
    var h = svgOpen('0 0 560 420', 'A slice through the surface of the eye: tears on top, the lining of the eye beneath, with an allergy cell, a blood vessel and a nerve'), i;
    h += '<rect id="al-tissue" x="20" y="190" width="520" height="210" fill="#fde2e2" stroke="#e5a3a3" stroke-width="2"/>'
      + '<rect x="20" y="150" width="520" height="40" fill="#bfdbfe"/><line x1="20" y1="150" x2="540" y2="150" stroke="#3b82f6" stroke-width="2"/>'
      + '<path id="al-vessel" d="M20,340 C140,320 260,360 380,336 C440,326 500,340 540,334" fill="none" stroke="#dc2626" stroke-linecap="round"/>'
      + '<g id="al-leak" fill="#93c5fd" opacity="0">';
    [[120, 316], [200, 322], [290, 330], [370, 316], [450, 314], [160, 300], [330, 304]].forEach(function (c) { h += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="6"/>'; });
    h += '</g>'
      + '<path d="M70,400 C90,330 120,280 150,240" fill="none" stroke="#ca8a04" stroke-width="4" stroke-linecap="round"/><circle cx="150" cy="240" r="6" fill="#ca8a04"/>'
      + '<g id="al-itch" opacity="0" fill="none" stroke="#b45309" stroke-width="3.5" stroke-linecap="round"><path d="M132,224 l-10,-12 l12,-2 l-10,-12"/><path d="M168,224 l10,-12 l-12,-2 l10,-12"/></g>'
      + '<g id="al-gran" fill="#7c3aed">';
    for (i = 0; i < AL_GRAN; i++) h += '<circle r="5"/>';
    h += '</g>'
      + '<circle id="al-cell" cx="300" cy="262" r="34" fill="#ddd6fe" stroke="#6d28d9" stroke-width="3"/>'
      + '<g id="al-pollen" fill="#facc15" stroke="#a16207" stroke-width="1.5">';
    for (i = 0; i < AL_POLLEN.length; i++) h += '<g><circle r="9"/><circle r="3" cx="-10"/><circle r="3" cx="10"/><circle r="3" cy="-10"/><circle r="3" cy="10"/></g>';
    h += '</g>'
      + '<g id="al-shield" opacity="0" fill="none" stroke="#059669" stroke-width="5" stroke-linecap="round"><path d="M126,252 a26,26 0 0 1 48,0"/><path d="M230,318 a70,40 0 0 1 140,0"/><circle cx="300" cy="262" r="42" stroke-dasharray="10 9"/></g>'
      + '<g id="al-drop" opacity="0"><path d="M440,40 c18,28 18,48 0,52 c-18,-4 -18,-24 0,-52 Z" fill="#6ee7b7" stroke="#059669" stroke-width="2.5"/></g>'
      + txt(26, 176, 'Tears', 'start', '#1d4ed8', 600, 18)
      + txt(534, 216, 'Lining of the eye', 'end', '#9f1239', 600, 18)
      + txt(356, 256, 'Allergy cell', 'start', '#6d28d9', 600, 20) + txt(356, 278, '(mast cell)', 'start', '#6d28d9', 400, 17)
      + txt(534, 372, 'Blood vessel', 'end', '#b91c1c', 600, 18)
      + txt(26, 392, 'Nerve', 'start', '#a16207', 600, 18)
      + '<g id="al-lab-pollen" opacity="0">' + txt(26, 40, 'Pollen, dust or pet dander', 'start', '#a16207') + '</g>'
      + '<g id="al-lab-hist" opacity="0">' + txt(26, 40, 'Histamine is released', 'start', '#6d28d9') + '</g>'
      + '<g id="al-lab-sym" opacity="0">' + txt(26, 40, 'Itching, redness, swelling, watering', 'start', '#b91c1c') + '</g>'
      + '<g id="al-lab-drop" opacity="0">' + txt(26, 40, 'Allergy drop: blocks histamine', 'start', '#047857') + txt(26, 64, 'and steadies the allergy cell', 'start', '#047857', 400) + '</g>';
    return h + '</svg>';
  }
  function alGran(spread) { // histamine granules: packed in the cell, or spread through the tissue
    var g = document.querySelectorAll('#al-gran circle'), i, a, r;
    for (i = 0; i < g.length; i++) { a = i / g.length * Math.PI * 2 + (i % 3) * 0.4; r = 12 + (i % 3) * 7 + spread * (70 + (i * 37 % 90));
      g[i].setAttribute('cx', (300 + r * Math.cos(a) * 1.5).toFixed(1)); g[i].setAttribute('cy', clamp(262 + r * Math.sin(a) * 0.75, 204, 392).toFixed(1)); }
  }
  var ALLERGY = {
    views: [['The surface of the eye, cut through', allergySvg]],
    intro: '<strong>The surface of the eye.</strong> The clear lining of the eye sits just under the tears. It holds allergy cells (mast cells) packed with histamine, small blood vessels, and nerve endings.',
    steps: [
      { label: 'Trigger', dur: 2200, caption: '<strong>The trigger.</strong> Pollen, dust, mold or pet dander lands in the tears and reaches the lining of the eye. In someone with allergies, the allergy cells are primed to react to it.',
        draw: function (p) {
          var e = ease(p), g = document.querySelectorAll('#al-pollen > g'), i;
          for (i = 0; i < g.length; i++) g[i].setAttribute('transform', 'translate(' + (AL_POLLEN[i][0] + (300 - AL_POLLEN[i][0]) * 0.25 * e).toFixed(1) + ',' + lerp(-20 - i * 14, 182 + (i % 2) * 14, e).toFixed(1) + ')');
          op('al-pollen', p > 0 ? 1 : 0); op('al-lab-pollen', e);
        } },
      { label: 'Histamine', dur: 2200, caption: '<strong>Histamine.</strong> The allergy cells burst open and release histamine and other chemicals into the tissue. This happens within minutes.',
        draw: function (p) { var e = ease(p); alGran(e); at('al-cell', 'stroke-dasharray', p > 0.15 ? '14 9' : 'none'); op('al-lab-hist', e); if (p > 0) op('al-lab-pollen', 1 - e); } },
      { label: 'Symptoms', dur: 2400, caption: '<strong>Symptoms.</strong> Histamine makes the nerves itch, widens the blood vessels so the eye turns red, and lets fluid leak out so the lids and the lining swell and the eye waters. Rubbing bursts more cells and makes it worse.',
        draw: function (p) { var e = ease(p); at('al-vessel', 'stroke-width', 10 + 14 * e); op('al-leak', e); op('al-itch', e); at('al-tissue', 'fill', p > 0.4 ? '#fecdd3' : '#fde2e2'); op('al-lab-sym', e); if (p > 0) op('al-lab-hist', 1 - e); } },
      { label: 'Drops', dur: 2800, caption: '<strong>Allergy drops.</strong> Antihistamine drops block histamine at the nerves and blood vessels, so the itch and redness settle within minutes. Most also steady the allergy cells so they release less, which is why they work best used every day through the season, not only when the eyes itch.',
        draw: function (p) {
          var e = ease(p), fall = ease(clamp(p * 2.5, 0, 1));
          op('al-drop', p > 0 && fall < 1 ? 1 : 0); at('al-drop', 'transform', 'translate(0,' + (90 * fall).toFixed(1) + ')');
          op('al-shield', ease(clamp(p * 2 - 0.5, 0, 1))); op('al-lab-drop', e);
          if (p > 0) { at('al-vessel', 'stroke-width', 24 - 14 * e); op('al-leak', 1 - e); op('al-itch', 1 - e); op('al-lab-sym', 1 - e); alGran(1 - 0.75 * e); op('al-gran', 1 - 0.6 * e); if (p > 0.6) at('al-tissue', 'fill', '#fde2e2'); }
          else op('al-gran', 1);
        } }
    ]
  };

  var PROCS = {
    reflex: wateryProc('reflex'),
    blocked: wateryProc('blocked'),
    loose: wateryProc('loose'),
    allergy: ALLERGY,
    lidcare: LIDCARE,
    plug: PLUG,
    tears: tearProc('tears'),
    tearsevap: tearProc('tearsevap'),
    tearsaq: tearProc('tearsaq'),
    slt: sltProc(false),
    dslt: sltProc(true),
    cpc: cpcProc(true),
    cwcpc: cpcProc(false),
    migs: migsProc('migs'),
    gonio: migsProc('gonio'),
    visco: migsProc('visco'),
    combo: migsProc('combo'),
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

  // Topic files loaded before this one (procedure-retina.js,
  // procedure-cornea.js, procedure-cataract.js) add their own entries: each pushes a function onto
  // window.JK_PROC_EXTRA that takes these helpers and returns more PROCS.
  var HELPERS = { clamp: clamp, ease: ease, lerp: lerp, txt: txt, lead: lead, op: op, at: at, arrow: arrow, svgOpen: svgOpen, $: $,
    FONT: FONT, INK: INK, BLUE: BLUE, MUTED: MUTED, GREEN: GREEN, WATER: WATER };
  (window.JK_PROC_EXTRA || []).forEach(function (add) { var more = add(HELPERS), k; for (k in more) PROCS[k] = more[k]; });

  if (!PROCS[root.getAttribute('data-proc')]) return;
  var proc, starts, T_END, el, stepBtns, tNow = 0, capShown = -2, raf = 0, playing = false;

  // ---------- markup ----------
  function mount(key) {
    proc = PROCS[key];
    starts = []; T_END = 0;
    proc.steps.forEach(function (s) { starts.push(T_END); T_END += s.dur; });
    // The shared markers, patterns and gradients live once, in a zero-size
    // SVG that is never display:none, so both views can use them whichever
    // one is showing.
    var two = proc.views.length > 1, h = '<svg class="jk-proc__defs" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden">' + defs() + '</svg>';
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
