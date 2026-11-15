/* Step-by-step procedure demos for the Learn pages: SLT, MIGS,
 * trabeculectomy, tube shunt and cyclophotocoagulation, plus the tear film
 * between blinks (`tears`), which uses the same format. A page has one
 *     <div id="jk-proc" class="jk-lpi" data-proc="slt"></div>
 * and this file builds it. SLT (standard, direct), MIGS (stent, goniotomy, viscodilation, viscodilation + stent) and
 * cyclophotocoagulation (micropulse, standard) have variants switched by
 * chips; see `variants`.
 * A step may name a `view` ('side' or 'front', the first or second
 * drawing); on phones, which show one drawing at a time, playing into that
 * step switches to it.
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

  // ---------- what is glaucoma: fluid, pressure, the nerve ----------
  // Two drawings share one state, set by the steps in order (made, drain,
  // clog, damage, treat); the last step's draw then paints the moving fluid
  // and the pressure from it. The fluid is dots that run along one path,
  // from the ciliary body, through the pupil, across the front chamber and
  // out through the drain; a dot's place is a pure function of t.
  var GL = { made: 0, drain: 0, clog: 0, dmg: 0, treat: 0 }, GL_N = 20, GL_LOOP = 4200, glTable = null;
  var GL_PATH = 'M346,170 C326,220 302,270 286,318 C232,346 192,272 232,182 C252,150 274,130 294,116 L312,100 C344,82 372,72 404,66';
  var GL_PASS = 0.8; // beyond this along the path a dot has gone through the drain
  function glSide() {
    var h = svgOpen('40 -10 580 430', 'Side view of the front of the eye: fluid is made behind the iris, flows through the pupil, and leaves through the drain');
    h += eyeSide()
      + '<path id="gl-ac" d="M304,116 C204,148 128,262 128,400 L280,400 L270,300 C280,250 292,180 300,124 Z" fill="#2563eb" opacity="0"/>'
      + '<path id="gl-path" d="' + GL_PATH + '" fill="none" stroke="none"/>'
      + '<g id="gl-push" opacity="0">' + arrow('gl-push1', 'M220,250 L170,222', '#b91c1c', 4) + arrow('gl-push2', 'M200,330 L150,330', '#b91c1c', 4) + '</g>'
      + '<g id="gl-dots" fill="' + WATER + '">';
    for (var i = 0; i < GL_N; i++) h += '<circle r="5" opacity="0"/>';
    h += '</g>'
      + '<g id="gl-plug" fill="#7c2d12" opacity="0">';
    [[296, 108], [302, 112], [298, 117], [304, 106], [301, 121], [295, 113], [306, 116], [299, 104]].forEach(function (c) { h += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="2.6"/>'; });
    h += '</g>'
      + txt(210, 392, 'Iris', 'end') + lead(216, 386, 280, 290)
      + txt(440, 330, 'Lens', 'start') + lead(436, 324, 420, 324)
      + txt(150, 40, 'Cornea', 'end') + lead(156, 46, 210, 120)
      + '<g id="gl-lab-made" opacity="0">' + txt(420, 136, 'Fluid is made here', 'start', '#b45454') + lead(416, 130, 360, 140, '#b45454') + '</g>'
      + '<g id="gl-lab-drain" opacity="0">' + txt(380, 12, 'Drain', 'start') + lead(376, 18, 304, 106) + '</g>'
      + '<g id="gl-lab-clog" opacity="0">' + txt(380, 36, 'works less well', 'start', '#7c2d12', 600, 18) + '</g>'
      + txt(612, 214, 'Eye pressure', 'end', MUTED, 600, 18)
      + '<text id="gl-p1" x="612" y="254" ' + FONT + ' font-size="34" font-weight="700" fill="' + GREEN + '" text-anchor="end">15</text>'
      + txt(612, 278, 'mm Hg', 'end', MUTED, 400, 16);
    return h + '</svg>';
  }
  var GL_DISC = [150, 200], GL_FIELD = [418, 200];
  function glCupPath(d) { // the cup grows with damage, faster downward (the bottom of the rim goes first)
    var cx = GL_DISC[0] + 4, cy = GL_DISC[1] + 14 * d, rx = 26 + 30 * d, ry = 30 + 44 * d;
    return 'M' + (cx - rx).toFixed(1) + ',' + cy.toFixed(1) + ' a' + rx.toFixed(1) + ',' + ry.toFixed(1) + ' 0 1,0 ' + (2 * rx).toFixed(1) + ',0 a' + rx.toFixed(1) + ',' + ry.toFixed(1) + ' 0 1,0 ' + (-2 * rx).toFixed(1) + ',0';
  }
  function glArc(c, r0, r1, a0, a1) { // a ring segment, angles in degrees (negative is up)
    function q(r, a) { a = a * Math.PI / 180; return (c[0] + r * Math.cos(a)).toFixed(1) + ',' + (c[1] + r * Math.sin(a)).toFixed(1); }
    var big = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return 'M' + q(r1, a0) + ' A' + r1 + ',' + r1 + ' 0 ' + big + ',' + (a1 > a0 ? 1 : 0) + ' ' + q(r1, a1) + ' L' + q(r0, a1) + ' A' + r0 + ',' + r0 + ' 0 ' + big + ',' + (a1 > a0 ? 0 : 1) + ' ' + q(r0, a0) + ' Z';
  }
  function glNerve() {
    var h = svgOpen('0 0 560 420', 'The optic nerve as the doctor sees it, and what this eye sees'), i, a, d = GL_DISC;
    h += '<clipPath id="gl-fundus"><rect x="20" y="40" width="260" height="320" rx="14"/></clipPath>'
      + '<rect x="20" y="40" width="260" height="320" rx="14" fill="#b4472a"/>'
      + '<g clip-path="url(#gl-fundus)">'
      + '<g id="gl-nfl" stroke="#fed7aa" stroke-width="2" stroke-linecap="round" opacity="0.75">';
    for (i = 0; i < 48; i++) {
      a = i / 48 * Math.PI * 2;
      h += '<line x1="' + (d[0] + 84 * Math.cos(a)).toFixed(1) + '" y1="' + (d[1] + 94 * Math.sin(a)).toFixed(1) + '" x2="' + (d[0] + 116 * Math.cos(a)).toFixed(1) + '" y2="' + (d[1] + 128 * Math.sin(a)).toFixed(1) + '"/>';
    }
    h += '</g>'
      + '<ellipse cx="' + d[0] + '" cy="' + d[1] + '" rx="74" ry="84" fill="#f6b48f" stroke="#fcd9bd" stroke-width="3"/>'
      + '<path id="gl-cup" d="' + glCupPath(0) + '" fill="#fff4dc" stroke="#fde68a" stroke-width="1.5"/>'
      // the vessels come out of the cup and arch up and down (the arcades)
      + '<g fill="none" stroke-linecap="round">'
      + '<path d="M144,196 L144,128 C144,98 104,82 10,74 M144,128 C144,98 190,80 290,70 M144,204 L144,272 C144,302 104,318 10,326 M144,272 C144,302 190,320 290,330" stroke="#7f1d1d" stroke-width="7"/>'
      + '<path d="M156,196 L156,136 C156,110 120,104 10,106 M156,136 C156,110 200,104 290,104 M156,204 L156,264 C156,290 120,296 10,294 M156,264 C156,290 200,296 290,296" stroke="#c0392b" stroke-width="4.5"/>'
      + '</g></g>'
      + '<rect x="20" y="40" width="260" height="320" rx="14" fill="none" stroke="#7c2d12" stroke-width="1.5"/>'
      // what this eye sees
      + '<circle cx="' + GL_FIELD[0] + '" cy="' + GL_FIELD[1] + '" r="112" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
      + '<g stroke="#e2e8f0" stroke-width="1.5"><line x1="' + (GL_FIELD[0] - 112) + '" y1="' + GL_FIELD[1] + '" x2="' + (GL_FIELD[0] + 112) + '" y2="' + GL_FIELD[1] + '"/><line x1="' + GL_FIELD[0] + '" y1="' + (GL_FIELD[1] - 112) + '" x2="' + GL_FIELD[0] + '" y2="' + (GL_FIELD[1] + 112) + '"/></g>'
      + '<path id="gl-arc-sup" d="' + glArc(GL_FIELD, 30, 76, -12, -178) + ' ' + glArc(GL_FIELD, 76, 112, -150, -180) + '" fill="#334155" opacity="0"/>'
      + '<path id="gl-arc-inf" d="' + glArc(GL_FIELD, 64, 112, 150, 180) + '" fill="#334155" opacity="0"/>'
      + '<ellipse cx="' + (GL_FIELD[0] + 52) + '" cy="' + (GL_FIELD[1] + 4) + '" rx="9" ry="12" fill="#94a3b8"/>'
      + '<circle cx="' + GL_FIELD[0] + '" cy="' + GL_FIELD[1] + '" r="4" fill="' + INK + '"/>'
      + txt(150, 28, 'The optic nerve', 'middle') + txt(418, 28, 'What this eye sees', 'middle')
      + txt(150, 392, 'Pale center: the cup', 'middle', MUTED, 400, 16)
      + txt(150, 412, 'Orange-pink rim: nerve fibers', 'middle', MUTED, 400, 16)
      + '<g id="gl-lab-dmg" opacity="0">' + txt(418, 346, 'Side vision lost in a patch', 'middle', '#334155', 700, 17) + '</g>'
      + txt(418, 384, 'Eye pressure', 'end', MUTED, 600, 17)
      + '<text id="gl-p2" x="426" y="385" ' + FONT + ' font-size="22" font-weight="700" fill="' + GREEN + '">15 mm Hg</text>'
      + '<g id="gl-lab-stop" opacity="0">' + txt(418, 412, 'Lost vision does not return', 'middle', '#1d4ed8', 700, 16) + '</g>';
    return h + '</svg>';
  }
  function glPaint(t) {
    var path = $('gl-path'), dots = document.querySelectorAll('#gl-dots circle'), i;
    if (!path || !dots.length) return;
    if (!glTable) { var L = path.getTotalLength(); glTable = []; for (i = 0; i <= 200; i++) { var q = path.getPointAtLength(L * i / 200); glTable.push([q.x, q.y]); } }
    var blocked = GL.clog * (1 - GL.treat);
    for (i = 0; i < dots.length; i++) {
      var u = (t / GL_LOOP + i / GL_N) % 1, k = Math.round(u * 200), o = GL.made * (u < 0.36 ? 1 : GL.drain);
      if (u > 0.3 && u < 0.36) o *= 1 - (1 - GL.drain) * (u - 0.3) / 0.06; // dots fade at the pupil until the drain step shows the rest
      if (u > GL_PASS - 0.04 && i % 3) o *= 1 - blocked; // through the drain: only a third get through when it is clogged
      dots[i].setAttribute('cx', glTable[k][0].toFixed(1)); dots[i].setAttribute('cy', glTable[k][1].toFixed(1));
      dots[i].style.opacity = clamp(o, 0, 1).toFixed(3);
    }
    var pr = Math.round(15 + 13 * GL.clog - 12 * GL.clog * GL.treat), hot = pr >= 22 ? '#b91c1c' : GREEN;
    var p1 = $('gl-p1'), p2 = $('gl-p2');
    if (p1) { p1.textContent = pr; p1.setAttribute('fill', hot); }
    if (p2) { p2.textContent = pr + ' mm Hg'; p2.setAttribute('fill', hot); }
    op('gl-ac', 0.22 * blocked); op('gl-push', blocked);
    op('gl-plug', GL.clog * (1 - 0.7 * GL.treat));
    // the nerve: damage happens once and stays
    var d = GL.dmg, nfl = document.querySelectorAll('#gl-nfl line');
    at('gl-cup', 'd', glCupPath(d));
    for (i = 0; i < nfl.length; i++) {
      var ang = i / nfl.length * 360, inf = Math.abs(ang - 90) < 40 ? 1 : 0, sup = Math.abs(ang - 270) < 30 ? 0.6 : 0;
      nfl[i].style.opacity = (1 - inf * clamp(d * 1.6, 0, 1) - sup * clamp(d * 2 - 1, 0, 1)).toFixed(3);
    }
    op('gl-arc-sup', 0.85 * clamp(d * 1.6, 0, 1)); op('gl-arc-inf', 0.7 * clamp(d * 2 - 1, 0, 1));
  }
  var GLAUCOMA = {
    views: [['Side view', glSide], ['The nerve and vision', glNerve]],
    intro: '<strong>A healthy eye.</strong> One drawing shows the front of the eye cut in half. The other shows the optic nerve at the back of the eye as the doctor sees it, beside what this eye sees. The pale center of the nerve is called the cup; the orange-pink rim around it is made of the nerve fibers that carry vision to the brain.',
    steps: [
      { label: 'Fluid made', dur: 4200, view: 'side', caption: '<strong>Fluid is made.</strong> A gland behind the iris, the ciliary body, makes a clear fluid all day and night. It flows forward through the pupil into the front of the eye. It is not tears: it stays inside the eye and nourishes the lens and cornea.',
        draw: function (p) { GL.made = ease(clamp(p * 3, 0, 1)); op('gl-lab-made', ease(p)); } },
      { label: 'Fluid drains', dur: 4200, view: 'side', caption: '<strong>Fluid drains.</strong> The fluid leaves through a drain where the iris meets the cornea, the trabecular meshwork. Eye pressure is the balance between how much fluid is made and how easily it drains, like a sink with the tap running.',
        draw: function (p) { GL.drain = ease(p); op('gl-lab-drain', ease(p)); } },
      { label: 'Drain clogs', dur: 5200, view: 'side', caption: '<strong>The drain works less well.</strong> In the most common kind of glaucoma, the drain slowly becomes less efficient. Fluid keeps coming in but leaves more slowly, so the pressure inside the eye rises. The pressure presses on every part of the eye, including the optic nerve at the back. There is no pain and nothing you would notice.',
        draw: function (p) { GL.clog = ease(p); op('gl-lab-clog', ease(p)); } },
      { label: 'Nerve damage', dur: 6000, view: 'front', caption: '<strong>The nerve is damaged.</strong> Over years, pressure that the nerve cannot tolerate kills nerve fibers. The rim thins, often at the bottom or top first, and the cup grows. Each lost bundle of fibers leaves a patch of side vision missing; the bottom of the nerve sees the top of the world. The other eye and the brain fill in the gaps, so most people notice nothing until a great deal is lost.',
        draw: function (p) { GL.dmg = ease(p); op('gl-lab-dmg', ease(clamp(p * 2 - 0.4, 0, 1))); } },
      { label: 'Treatment', dur: 5200, view: 'front', caption: '<strong>Treatment lowers the pressure.</strong> Drops, laser or surgery help fluid drain or reduce how much is made, bringing the pressure down to a target set for your eye. That stops or slows further damage. What was already lost does not come back, which is why finding glaucoma early, and keeping up treatment, matters.',
        draw: function (p, t) { GL.treat = ease(p); op('gl-lab-stop', ease(clamp(p * 2 - 0.5, 0, 1))); glPaint(t); } }
    ]
  };

  // ---------- angle closure: why the angle narrows, closes, and reopens ----------
  // The iris is the same strip as the iridotomy demo (irisCenter() in
  // lpi.js, after iris_center() in tools/learn-figures.py): bow = 1 is the
  // narrow-angle shape. Here it also moves forward with a thicker lens
  // (fwd), and gets shorter and thicker when the pupil widens (dil). One
  // state, set by the steps in order; the last step paints it.
  var AC = { thick: 0, block: 0, close: 0, laser: 0, lens: 0 }, AC_N = 30, AC_HOLE = 0.25;
  function acCenter(u, bow, fwd, dil) {
    var push = 40 * (1 - Math.exp(-u / 0.07)) * Math.pow(1 - u, 1.1) - 9 * Math.pow(u, 4);
    return [308 - 30 * u - bow * push - fwd * u, 126 + 175 * u * (1 - 0.22 * dil)];
  }
  function acSides(bow, fwd, dil) {
    var front = [], back = [];
    for (var i = 0; i <= AC_N; i++) {
      var u = i / AC_N, c = acCenter(u, bow, fwd, dil), a = acCenter(Math.max(0, u - 0.02), bow, fwd, dil), b = acCenter(Math.min(1, u + 0.02), bow, fwd, dil);
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var h = (16 - 3 * u + dil * 10 * Math.pow(1 - u, 2)) / 2, nx = -dy / len, ny = dx / len;
      front.push([c[0] - nx * h, c[1] - ny * h]); back.push([c[0] + nx * h, c[1] + ny * h]);
    }
    return { front: front, back: back };
  }
  function acPts(a) { return a.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' L'); }
  function acIrisPath(s) {
    var m = s.front[AC_N], n = s.back[AC_N], r = (Math.hypot(n[0] - m[0], n[1] - m[1]) / 2).toFixed(1);
    return 'M' + acPts(s.front) + ' A' + r + ',' + r + ' 0 0,1 ' + n[0].toFixed(1) + ',' + n[1].toFixed(1) + ' L' + acPts(s.back.slice().reverse()) + ' Z';
  }
  function acLens(rx) { return 'M385,400 m-' + rx.toFixed(1) + ',0 a' + rx.toFixed(1) + ',222 0 0,1 ' + (2 * rx).toFixed(1) + ',0 Z'; }
  function acSvg() {
    var h = svgOpen('40 0 560 420', 'Side view of the front of the eye, showing the angle where the iris meets the cornea');
    h += '<path d="M298,92 C420,50 560,40 720,44 L720,70 C560,66 422,76 304,116 Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
      + '<path d="M110,400 C110,250 190,128 298,92 L304,116 C204,148 128,262 128,400 Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
      + '<path id="ac-pc" fill="#a78bfa" opacity="0"/>'
      + '<path d="M312,118 C340,106 372,98 400,96 C392,130 372,160 340,170 C326,160 314,142 312,118 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="1.5"/>'
      + '<path id="ac-bag" d="' + acLens(100) + '" fill="none" stroke="#ca8a04" stroke-width="1.5" stroke-dasharray="5 5" opacity="0"/>'
      + '<path id="ac-lens" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>'
      + '<g id="ac-iol" opacity="0"><path d="M340,400 m-13,0 a13,84 0 0,1 26,0 Z" fill="#e0f2fe" stroke="#2563eb" stroke-width="2"/>'
      + '<path d="M342,318 C350,270 372,220 384,186" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/></g>';
    [[342, 166, 372, 184], [352, 160, 388, 180], [362, 152, 400, 183], [372, 144, 412, 190]].forEach(function (z) {
      h += '<line x1="' + z[0] + '" y1="' + z[1] + '" x2="' + z[2] + '" y2="' + z[3] + '" stroke="#a8a29e" stroke-width="1"/>';
    });
    h += '<path id="ac-iris" fill="#8b5e3c" stroke="#5c3d26" stroke-width="1.5" stroke-linejoin="round"/>'
      + '<line id="ac-hole" stroke="#fff" stroke-width="0" stroke-linecap="round"/>'
      + '<path d="M292,104 L305,100 L309,122 L299,126 Z" fill="url(#pr-tm)" stroke="#b45309" stroke-width="1.2"/>'
      + '<ellipse cx="312" cy="100" rx="8" ry="4.5" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1.2"/>'
      + '<line x1="60" y1="400" x2="600" y2="400" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="4 6"/>'
      // fluid: through the pupil and out the drain; held back; through the laser opening
      + '<g id="ac-flow">' + arrow('ac-f1', 'M352,186 C330,232 312,276 300,312') + arrow('ac-f2', 'M264,326 C226,300 228,220 282,140') + '</g>'
      + '<g id="ac-push" opacity="0">'
      + '<path d="M340,214 L314,212" stroke="#6d28d9" stroke-width="3.5" fill="none" stroke-linecap="round" marker-end="url(#pr-ahm)"/>'
      + '<path d="M338,250 L314,250" stroke="#6d28d9" stroke-width="3.5" fill="none" stroke-linecap="round" marker-end="url(#pr-ahm)"/></g>'
      + '<g id="ac-holeflow" opacity="0">' + arrow('ac-h1', 'M344,184 C326,180 310,174 284,164') + arrow('ac-h2', 'M268,156 C266,144 274,134 286,126') + '</g>'
      // labels
      + txt(150, 300, 'Cornea', 'end') + lead(156, 294, 186, 280)
      + '<g id="ac-lab-lens">' + txt(470, 330, 'Lens', 'start') + lead(466, 324, 440, 324) + '</g>'
      + '<g id="ac-lab-iol" opacity="0">' + txt(596, 330, 'Thin implant', 'end', '#1d4ed8') + lead(470, 324, 352, 360, '#1d4ed8') + '</g>'
      + txt(215, 392, 'Iris', 'end') + lead(221, 386, 276, 262)
      + txt(596, 140, 'Eye pressure', 'end', MUTED, 600, 18)
      + '<text id="ac-p" x="596" y="182" ' + FONT + ' font-size="34" font-weight="700" fill="' + GREEN + '" text-anchor="end">15</text>'
      + txt(596, 204, 'mm Hg', 'end', MUTED, 400, 16)
      + '<g id="ac-lab-fluid" opacity="0">' + txt(440, 262, 'Fluid held', 'start', '#6d28d9') + txt(440, 286, 'behind the iris', 'start', '#6d28d9', 400) + lead(436, 256, 334, 232, '#6d28d9') + '</g>';
    [['open', 'Angle open', GREEN], ['narrow', 'Angle narrow', '#b45309'], ['closed', 'Angle closed', '#b91c1c'], ['again', 'Angle open again', GREEN], ['wide', 'Angle wide open', GREEN]].forEach(function (s, i) {
      h += '<g id="ac-st-' + s[0] + '"' + (i ? ' opacity="0"' : '') + '>' + txt(60, 40, s[1], 'start', s[2], 700) + lead(214 + (i === 3 ? 40 : 0), 46, 296, 114, s[2]) + '</g>';
    });
    return h + '</svg>';
  }
  function acPaint() {
    // only one treatment is shown at a time: laser or lens, so treat is either
    var lens = AC.lens, treat = AC.laser + AC.lens, thick = AC.thick * (1 - lens);
    var bow = 0.75 * AC.block + 0.45 * AC.close - 1.05 * treat - 0.25 * lens;
    var dil = AC.close * (1 - treat), fwd = 20 * thick;
    var s = acSides(bow, fwd, dil);
    at('ac-iris', 'd', acIrisPath(s));
    at('ac-pc', 'd', 'M' + acPts(s.back) + ' L300,306 L385,178 L345,166 L316,128 Z');
    var trapped = clamp(AC.block + AC.close, 0, 1) * (1 - treat);
    op('ac-pc', 0.5 * trapped); op('ac-push', trapped); op('ac-lab-fluid', trapped);
    op('ac-flow', (1 - AC.block) + lens); op('ac-holeflow', AC.laser);
    at('ac-lens', 'd', acLens(100 + 24 * AC.thick)); op('ac-lab-lens', 1 - lens); op('ac-lab-iol', lens); op('ac-lens', 1 - lens); op('ac-iol', lens); op('ac-bag', 0.8 * lens);
    var k = Math.round(AC_HOLE * AC_N), a = s.front[k], b = s.back[k];
    at('ac-hole', 'x1', a[0]); at('ac-hole', 'y1', a[1]); at('ac-hole', 'x2', b[0]); at('ac-hole', 'y2', b[1]); at('ac-hole', 'stroke-width', 7 * AC.laser);
    var pr = Math.round(15 + 40 * AC.close - 37 * AC.close * treat), pe = $('ac-p');
    if (pe) { pe.textContent = pr; pe.setAttribute('fill', pr >= 22 ? '#b91c1c' : GREEN); }
  }
  function acStatus(prev, next, p) { if (p > 0) op('ac-st-' + prev, 1 - ease(clamp(p * 4, 0, 1))); op('ac-st-' + next, ease(clamp(p * 4 - 1, 0, 1))); }
  // Two variants, switched by chips: the same three steps, then either a
  // laser opening or lens surgery.
  var ANGLE_VARIANTS = [['angle', 'Laser opening'], ['anglelens', 'Lens surgery']];
  function angleProc(lens) {
    var last = lens
      ? { label: 'Lens surgery', dur: 4400, caption: '<strong>Lens surgery.</strong> Instead of a laser opening, the thick natural lens is replaced with a thin implant, which takes up far less room. The iris settles back and the angle opens wider than the laser can make it. For many people with angle closure, especially when a cataract is present, this works better than the laser.',
        draw: function (p) { AC.laser = 0; AC.lens = ease(p); acStatus('closed', 'wide', p); acPaint(); } }
      : { label: 'Laser opening', dur: 4400, caption: '<strong>A laser opening.</strong> A laser iridotomy makes a tiny hole in the outer iris. Fluid now has a way around the pupil, the pressure behind the iris evens out, and the iris falls back from the drain. Drops bring the pressure down in the meantime. It is the usual first treatment, and is often done in both eyes.',
        draw: function (p) { AC.lens = 0; AC.laser = ease(p); acStatus('closed', 'again', p); acPaint(); } };
    return {
      variants: ANGLE_VARIANTS,
      views: [['Side view', acSvg]],
      intro: '<strong>An open angle.</strong> The front of the eye, cut in half. Fluid is made behind the iris, flows forward through the pupil, and leaves through the drain in the angle, where the iris meets the cornea. Here the angle is wide open. Choose a treatment above, then press Play.',
      steps: [
        { label: 'Lens thickens', dur: 3200, caption: '<strong>The lens thickens with age.</strong> The natural lens keeps growing slowly throughout life. As it thickens it pushes the iris forward, and the space in front of the iris gets shallower. This happens sooner in eyes that are small or farsighted.',
          draw: function (p) { AC.thick = ease(p); if (p <= 0) op('ac-st-open', 1); } },
        { label: 'Fluid held back', dur: 4000, caption: '<strong>Fluid is held back.</strong> With the iris resting on the front of the lens, fluid has trouble getting through the pupil. It builds up behind the iris and pushes its thin outer part forward, so the iris bows toward the drain. This is a narrow angle. It causes no symptoms, and many people never go beyond this stage.',
          draw: function (p) { AC.block = ease(p); acStatus('open', 'narrow', p); } },
        { label: 'Angle closes', dur: 4400, caption: '<strong>The angle closes.</strong> When the pupil widens, in dim light or from some medicines, the iris bunches up at its outer edge and can cover the drain completely. Fluid can no longer get out, and the pressure can climb within hours to several times normal. A sudden attack makes the eye red and painful, blurs vision with halos around lights, and can bring headache and vomiting. It is an emergency.',
          draw: function (p) { AC.close = ease(p); acStatus('narrow', 'closed', p); } },
        last
      ]
    };
  }

  var PROCS = {
    angle: angleProc(false),
    anglelens: angleProc(true),
    glaucoma: GLAUCOMA,
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
      if (cur >= 0 && proc.steps[cur].view && proc.views.length > 1) setView(proc.steps[cur].view); // phones show one view: follow the step
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
