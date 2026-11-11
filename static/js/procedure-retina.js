/* Retina demos for procedure.js (load this file first). Each entry follows
 * the rules in procedure.js: the picture is a pure function of time, so a
 * step's draw sets everything it owns at every p, and touches another
 * step's pieces only when its own p is above 0.
 *
 * Drawings: globe() is the whole eye cut in half, front to the left, with
 * the retina lining the back; fundus() is the back of the eye as the doctor
 * sees it through the pupil.
 */
(window.JK_PROC_EXTRA = window.JK_PROC_EXTRA || []).push(function (H) {
  'use strict';
  var clamp = H.clamp, ease = H.ease, lerp = H.lerp, txt = H.txt, lead = H.lead, op = H.op, at = H.at, arrow = H.arrow, svgOpen = H.svgOpen;
  var INK = H.INK, BLUE = H.BLUE, MUTED = H.MUTED, GREEN = H.GREEN;
  var GX = 330, GY = 220, RET = '#fb923c';
  function gp(deg, r) { var a = deg * Math.PI / 180; return [GX + r * Math.cos(a), GY + r * Math.sin(a)]; }
  function P(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }

  // The retina as a line from -128 to 128 degrees (0 = the back of the eye).
  // lift(a) is how far it has come away from the wall at angle a; gap is an
  // [a0, a1] range left out, for a tear.
  function retinaPath(lift, gap) {
    var d = '', pen = false, a, r;
    for (a = -128; a <= 128; a += 2) {
      if (gap && a > gap[0] && a < gap[1]) { pen = false; continue; }
      r = 162 - (lift ? lift(a) : 0);
      d += (pen ? ' L' : ' M') + P(gp(a, r)); pen = true;
    }
    return d;
  }
  function globe(opts) {
    opts = opts || {};
    var f = gp(-140, 172), b = gp(140, 172), n0 = gp(17, 150), n1 = gp(17, 262);
    return '<line x1="' + n0[0].toFixed(1) + '" y1="' + n0[1].toFixed(1) + '" x2="' + n1[0].toFixed(1) + '" y2="' + n1[1].toFixed(1) + '" stroke="#ca8a04" stroke-width="40"/>'
      + '<line x1="' + n0[0].toFixed(1) + '" y1="' + n0[1].toFixed(1) + '" x2="' + n1[0].toFixed(1) + '" y2="' + n1[1].toFixed(1) + '" stroke="#fde68a" stroke-width="34"/>'
      + '<path d="M' + P(f) + ' Q92,220 ' + P(b) + ' Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="3"/>'
      + '<circle cx="' + GX + '" cy="' + GY + '" r="170" fill="' + (opts.fill || '#f8fbff') + '"/>'
      + '<path d="M' + P(f) + ' A172,172 0 1,1 ' + P(b) + '" fill="none" stroke="#6b7280" stroke-width="4"/>'
      + (opts.under || '')
      + '<path id="' + (opts.retinaId || 'gl-retina') + '" d="' + retinaPath() + '" fill="none" stroke="' + RET + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + gp(0, 160)[0] + '" cy="' + GY + '" r="6" fill="#9a3412"/>'
      + '<line x1="213" y1="126" x2="226" y2="188" stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/><line x1="226" y1="252" x2="213" y2="314" stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/>'
      + '<ellipse cx="252" cy="220" rx="26" ry="60" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>';
  }
  function globeLabels(extra) {
    return txt(20, 410, 'Front of the eye', 'start', MUTED, 400, 17) + txt(620, 410, 'Optic nerve', 'end', MUTED, 400, 17)
      + txt(620, 190, 'Macula', 'end', '#9a3412', 600, 18) + lead(552, 196, gp(0, 160)[0] + 2, GY, '#9a3412') + (extra || '');
  }

  // ---------- flashes and floaters: the gel pulling away ----------
  var TEAR_A = -58; // where the gel tugs hardest, up and back
  function pvdSvg(tear) {
    var h = svgOpen('0 0 640 470', 'The eye cut in half: the clear gel that fills it, and the retina lining the back'), t = gp(TEAR_A, 158), i;
    h += '<clipPath id="pv-clip"><circle cx="' + GX + '" cy="' + GY + '" r="157"/></clipPath>'
      + globe({ under: '<g clip-path="url(#pv-clip)"><ellipse id="pv-gel" cx="330" cy="220" rx="160" ry="160" fill="#bae6fd" opacity="0.75"/></g>' })
      + '<g id="pv-float" opacity="0" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round"><path d="M392,212 q10,-12 20,0 q10,12 20,-2"/><path d="M380,250 q8,10 16,0"/><circle cx="430" cy="234" r="9"/><path d="M360,190 q6,-8 12,2"/></g>'
      + '<g id="pv-flash" opacity="0"><path d="M' + P(t) + ' l-16,-10 l8,14 l-18,2 l16,8 l-10,14 l16,-8 l4,16 l6,-16 l14,6 l-8,-14 l16,-6 l-18,-2 Z" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/></g>';
    if (tear) {
      h += '<g id="pv-blood" fill="#b91c1c" opacity="0">';
      for (i = 0; i < 12; i++) h += '<circle cx="' + (t[0] - 20 - (i * 37 % 70)).toFixed(0) + '" cy="' + (t[1] + 14 + (i * 53 % 110)).toFixed(0) + '" r="' + (2.5 + i % 3) + '"/>';
      h += '</g><path id="pv-flap" d="M' + P(gp(TEAR_A - 6, 160)) + ' L' + P(gp(TEAR_A - 1, 134)) + '" stroke="' + RET + '" stroke-width="8" stroke-linecap="round" opacity="0"/>';
    }
    h += globeLabels(txt(20, 30, 'Gel (vitreous)', 'start', '#0369a1') + lead(150, 38, 300, 150, '#0369a1')
      + txt(620, 30, 'Retina', 'end', '#c2410c') + lead(560, 38, gp(-40, 162)[0], gp(-40, 162)[1], '#c2410c')
      + '<g id="pv-lab-float" opacity="0">' + txt(320, 456, 'Floaters: clumps in the gel', 'middle', '#475569', 600, 19) + '</g>'
      + '<g id="pv-lab-flash" opacity="0">' + txt(620, 62, 'Flash: the gel tugs here', 'end', '#a16207', 600, 18) + '</g>'
      + (tear ? '<g id="pv-lab-tear" opacity="0">' + txt(620, 62, 'A tear in the retina', 'end', '#b91c1c', 700, 18) + '</g>' : ''));
    return h + '</svg>';
  }
  function pvdProc(tear) {
    var steps = [
      { label: 'Gel changes', dur: 2400, caption: '<strong>The gel changes with age.</strong> The eye is filled with a clear gel. Over the years it turns more watery and clumps into strands. The clumps cast shadows on the retina, and you see them as floaters that drift when you move your eye.',
        draw: function (p) { var e = ease(p); op('pv-float', 0.8 * e); op('pv-lab-float', e); at('pv-gel', 'rx', 160 - 6 * e); } },
      { label: 'Pulls away', dur: 2800, caption: '<strong>The gel pulls away.</strong> Sooner or later, usually after 50, the shrinking gel peels off the back of the eye. Where it tugs on the retina you see a flash of light, like a camera flash at the edge of your vision, and a new, larger floater often appears.',
        draw: function (p, t) {
          var e = ease(p);
          at('pv-gel', 'cx', 330 - 34 * e); if (p > 0) at('pv-gel', 'rx', 154 - 26 * e); at('pv-gel', 'ry', 160 - 14 * e);
          at('pv-float', 'transform', 'translate(' + (-26 * e).toFixed(1) + ',0)');
          var on = p > 0.15 && p < 1; op('pv-flash', on ? (0.5 + 0.5 * Math.sin(t / 70)) : 0); op('pv-lab-flash', on ? 1 : 0);
        } }
    ];
    if (tear) steps.push({ label: 'A tear', dur: 2600, caption: '<strong>A tear.</strong> In a small number of people the gel is stuck firmly to the retina and tears it as it pulls away. Signs are a sudden shower of new floaters, repeated flashes, or a shadow at the edge of vision. A tear needs to be sealed with laser within a day or so, before fluid gets under the retina. <strong>Call the same day.</strong>',
      draw: function (p) { var e = ease(p); op('pv-flap', e); op('pv-blood', 0.9 * e); op('pv-lab-tear', e); at('gl-retina', 'd', retinaPath(null, p > 0 ? [TEAR_A - 7, TEAR_A + 3] : null)); if (p > 0) { op('pv-flash', 0); op('pv-lab-flash', 0); } } });
    else steps.push({ label: 'Settles', dur: 2400, caption: '<strong>It settles.</strong> In most people the gel comes away cleanly. The flashes stop within a few weeks, and the floaters sink out of the line of sight and fade as the brain learns to ignore them. Nothing needs to be done, but the retina should be checked once to make sure there is no tear.',
      draw: function (p) { var e = ease(p); if (p > 0) { op('pv-float', 0.8 - 0.5 * e); op('pv-flash', 0); op('pv-lab-flash', 0); at('pv-float', 'transform', 'translate(' + (-26 - 10 * e).toFixed(1) + ',' + (60 * e).toFixed(1) + ')'); } } });
    return {
      variants: [['pvd', 'The usual course'], ['pvdtear', 'When it tears the retina']],
      views: [['The eye, cut in half', function () { return pvdSvg(tear); }]],
      intro: '<strong>The inside of the eye.</strong> The retina is the light-sensing layer lining the back of the eye, like the film in a camera. In front of it the eye is filled with a clear gel, the vitreous, which is attached to the retina.',
      steps: steps
    };
  }

  // ---------- retinal detachment ----------
  function rdLift(amount, spread) { return function (a) { var d = (a - TEAR_A) / spread; return amount * Math.exp(-d * d); }; }
  function rdSvg() {
    var h = svgOpen('0 0 640 470', 'The eye cut in half, with the retina lining the back'), i, a;
    h += globe({ under: '<path id="rd-fluid" fill="#93c5fd" opacity="0"/>' })
      + '<g id="rd-arrows" opacity="0">' + arrow('rd-a1', 'M' + P(gp(TEAR_A - 14, 110)) + ' L' + P(gp(TEAR_A - 3, 152))) + '</g>'
      + '<circle id="rd-bubble" cx="' + gp(-70, 96)[0].toFixed(0) + '" cy="' + gp(-70, 96)[1].toFixed(0) + '" r="0" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" opacity="0.9"/>'
      + '<g id="rd-laser" opacity="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="2">';
    for (i = 0; i < 7; i++) { a = TEAR_A - 14 + i * 4.5; if (Math.abs(a - TEAR_A + 2) < 4) continue; h += '<circle cx="' + gp(a, 160)[0].toFixed(1) + '" cy="' + gp(a, 160)[1].toFixed(1) + '" r="5"/>'; }
    h += '</g>'
      + globeLabels(txt(620, 30, 'Retina', 'end', '#c2410c') + lead(560, 38, gp(-30, 162)[0], gp(-30, 162)[1], '#c2410c')
      + '<g id="rd-lab-tear" opacity="0">' + txt(20, 30, 'Tear', 'start', '#b91c1c', 700) + lead(66, 36, gp(TEAR_A - 2, 156)[0], gp(TEAR_A - 2, 156)[1], '#b91c1c') + '</g>'
      + '<g id="rd-lab-fluid" opacity="0">' + txt(320, 456, 'Fluid gets under the retina', 'middle', BLUE, 600, 19) + '</g>'
      + '<g id="rd-lab-fix" opacity="0">' + txt(320, 456, 'A gas bubble presses it back; laser seals the tear', 'middle', '#047857', 600, 19) + '</g>'
      + '<g id="rd-lab-seal" opacity="0">' + txt(320, 456, 'Laser spots weld the retina down around the tear', 'middle', '#047857', 600, 19) + '</g>');
    return h + '</svg>';
  }
  function rdShape(amount, spread, torn) {
    at('gl-retina', 'd', retinaPath(amount ? rdLift(amount, spread) : null, torn ? [TEAR_A - 5, TEAR_A + 1] : null));
    var d = 'M' + P(gp(-128, 166)), a;
    for (a = -126; a <= 128; a += 2) d += ' L' + P(gp(a, 166));
    for (a = 128; a >= -128; a -= 2) d += ' L' + P(gp(a, 162 - (amount ? rdLift(amount, spread)(a) : 0)));
    at('rd-fluid', 'd', d + ' Z');
  }
  function rdProc(early) {
    var tearStep = { label: 'Tear', dur: 2000, caption: '<strong>A tear.</strong> Most detachments start with a small tear in the retina, usually made by the gel inside the eye pulling on it. The warning signs are new flashes and a sudden shower of floaters.',
      draw: function (p) { op('rd-lab-tear', ease(p)); rdShape(0, 1, p > 0.2); } };
    var steps = early ? [tearStep,
      { label: 'Laser', dur: 2600, caption: '<strong>Laser around the tear.</strong> In the office, a ring of laser spots is placed around the tear. Over a week or two each spot scars the retina down to the wall of the eye, like spot welds, so fluid cannot get underneath. A freezing treatment does the same job when laser cannot reach.',
        draw: function (p) { var e = ease(p), g = document.querySelectorAll('#rd-laser circle'), i; op('rd-laser', p > 0 ? 1 : 0); for (i = 0; i < g.length; i++) g[i].style.opacity = p * g.length > i ? 1 : 0; op('rd-lab-seal', e); } },
      { label: 'Sealed', dur: 1800, caption: '<strong>Sealed.</strong> The tear is still there, but it is walled off and the retina stays attached. Vision is not affected. This is why new flashes and floaters should be checked the same day: treated at this stage, a detachment is prevented.',
        draw: function () {} }
    ] : [tearStep,
      { label: 'Fluid', dur: 2400, caption: '<strong>Fluid gets underneath.</strong> Fluid from inside the eye passes through the tear and lifts the retina off the wall of the eye, the way damp gets behind wallpaper.',
        draw: function (p) { var e = ease(p); if (p > 0) rdShape(30 * e, 16, true); op('rd-fluid', 0.8 * e); op('rd-arrows', p > 0 && p < 1 ? 1 : 0); op('rd-lab-fluid', e); } },
      { label: 'Spreads', dur: 2800, caption: '<strong>It spreads.</strong> The detached area grows, and you see it as a dark curtain or shadow moving in from one side. A retina that is off the wall is cut off from its blood supply and stops working. If the detachment reaches the macula, the center of vision is lost. This is an emergency: the sooner it is repaired, the more vision is saved.',
        draw: function (p) { var e = ease(p); if (p > 0) rdShape(30 + 40 * e, 16 + 30 * e, true); } },
      { label: 'Repair', dur: 3000, caption: '<strong>Repair.</strong> A retina surgeon puts the retina back in place, most often by removing the gel and filling the eye with a gas bubble that presses the retina against the wall, or by placing a band around the eye. Laser or freezing then seals the tear. The gas is absorbed over weeks; you may need to keep your head in a set position at first, and you cannot fly until it is gone.',
        draw: function (p) { var e = ease(p); if (p > 0) { rdShape(70 * (1 - e), 46, true); op('rd-fluid', 0.8 * (1 - e)); op('rd-lab-fluid', 1 - e); } at('rd-bubble', 'r', 92 * e); op('rd-laser', ease(clamp(p * 2 - 1, 0, 1))); op('rd-lab-fix', e); } }
    ];
    return {
      variants: [['rd', 'A detachment'], ['rdlaser', 'A tear caught early']],
      views: [['The eye, cut in half', rdSvg]],
      intro: '<strong>The retina.</strong> The retina lines the back of the eye like wallpaper. It is held in place loosely, and it gets its nourishment from the wall behind it.',
      steps: steps
    };
  }

  // ---------- an injection into the eye ----------
  function injectSvg() {
    var tip = [300, 190], ent = gp(-126, 172), h = svgOpen('0 0 640 470', 'The eye cut in half: an injection is given through the white of the eye into the gel'), i;
    h += globe()
      + '<path id="in-leak" d="M' + P(gp(-9, 150)) + ' Q' + (gp(0, 126)[0]).toFixed(0) + ',220 ' + P(gp(9, 150)) + ' Z" fill="#dc2626" opacity="0.85"/>'
      + '<g id="in-med" fill="#34d399">';
    for (i = 0; i < 22; i++) h += '<circle r="' + (3 + i % 3) + '"/>';
    h += '</g>'
      + '<g id="in-spec" opacity="0" stroke="#6b7280" stroke-width="6" stroke-linecap="round"><line x1="150" y1="104" x2="196" y2="118"/><line x1="150" y1="336" x2="196" y2="322"/></g>'
      + '<g id="in-drops" opacity="0" fill="#60a5fa" stroke="#1d4ed8" stroke-width="1.5"><path d="M96,110 c10,16 10,28 0,30 c-10,-2 -10,-14 0,-30 Z"/><path d="M70,170 c8,13 8,22 0,24 c-8,-2 -8,-11 0,-24 Z"/></g>'
      + '<g id="in-needle" opacity="0"><line x1="' + (ent[0] - 110).toFixed(1) + '" y1="' + (ent[1] - 96).toFixed(1) + '" x2="' + tip[0] + '" y2="' + tip[1] + '" stroke="#475569" stroke-width="3" stroke-linecap="round"/>'
      + '<rect x="' + (ent[0] - 150).toFixed(1) + '" y="' + (ent[1] - 132).toFixed(1) + '" width="60" height="22" rx="5" fill="#e5e7eb" stroke="#4b5563" stroke-width="2" transform="rotate(41 ' + (ent[0] - 120).toFixed(1) + ' ' + (ent[1] - 121).toFixed(1) + ')"/></g>'
      + globeLabels('<g id="in-lab-leak">' + txt(620, 120, 'Leaking vessels', 'end', '#b91c1c', 600, 18) + txt(620, 142, 'at the macula', 'end', '#b91c1c', 400, 17) + '</g>'
      + '<g id="in-lab-prep" opacity="0">' + txt(320, 456, 'Numbing and antiseptic drops; the lids are held open', 'middle', INK, 600, 19) + '</g>'
      + '<g id="in-lab-needle" opacity="0">' + txt(320, 456, 'A very fine needle, through the white of the eye', 'middle', INK, 600, 19) + '</g>'
      + '<g id="in-lab-med" opacity="0">' + txt(320, 456, 'The medicine spreads through the gel', 'middle', '#047857', 600, 19) + '</g>'
      + '<g id="in-lab-dry" opacity="0">' + txt(620, 120, 'Leak dried up', 'end', '#047857', 600, 18) + '</g>');
    return h + '</svg>';
  }
  function inMed(spread, show) {
    var g = document.querySelectorAll('#in-med circle'), i, a, r;
    for (i = 0; i < g.length; i++) { a = i * 2.4; r = 6 + (i % 5) * 4;
      g[i].setAttribute('cx', (300 + r * Math.cos(a) + spread * (40 + (i * 29 % 150))).toFixed(1));
      g[i].setAttribute('cy', (190 + r * Math.sin(a) + spread * (30 * Math.sin(a) + 26)).toFixed(1)); }
    op('in-med', show);
  }
  var INJECT = {
    views: [['The eye, cut in half', injectSvg]],
    intro: '<strong>Why an injection.</strong> In wet macular degeneration, diabetic swelling and blocked retinal veins, leaky blood vessels damage the macula, the center of the retina. The medicines that stop the leak have to be placed inside the eye to reach it.',
    steps: [
      { label: 'Numb', dur: 2200, caption: '<strong>Numbing and cleaning.</strong> The eye is numbed with drops or gel, then cleaned with an antiseptic, which is the most important step for preventing infection. A small holder keeps the lids open so you do not have to worry about blinking.',
        draw: function (p) { var e = ease(p); op('in-spec', e); op('in-drops', p > 0 && p < 0.7 ? 1 : 0); at('in-drops', 'transform', 'translate(' + (40 * e).toFixed(1) + ',' + (30 * e).toFixed(1) + ')'); op('in-lab-prep', p < 1 ? e : 1); } },
      { label: 'Injection', dur: 2200, caption: '<strong>The injection.</strong> You look away, and a very fine needle is passed through the white of the eye into the gel. It takes a few seconds. Most people feel pressure, not pain.',
        draw: function (p) { var e = ease(clamp(p * 2, 0, 1)); op('in-needle', p > 0 ? 1 : 0); at('in-needle', 'transform', 'translate(' + (-70 * (1 - e)).toFixed(1) + ',' + (-62 * (1 - e)).toFixed(1) + ')'); op('in-lab-needle', p > 0 ? 1 : 0); inMed(0, ease(clamp(p * 2 - 1, 0, 1))); if (p > 0) op('in-lab-prep', 0); } },
      { label: 'Medicine', dur: 2600, caption: '<strong>The medicine spreads.</strong> The needle is out. The medicine spreads through the gel to the retina over the next hours. You may see a few small floaters or bubbles for a day or two.',
        draw: function (p) { var e = ease(p); if (p > 0) { op('in-needle', 1 - ease(clamp(p * 4, 0, 1))); op('in-lab-needle', 0); op('in-spec', 1 - e); inMed(e, 1); } op('in-lab-med', p > 0 ? 1 : 0); } },
      { label: 'Weeks later', dur: 2400, caption: '<strong>Over the next weeks.</strong> The leaking vessels dry up and the swelling at the macula goes down. The medicine wears off after one to several months, so injections are repeated, with visits spaced further apart as the eye allows.',
        draw: function (p) { var e = ease(p); op('in-leak', 0.85 * (1 - e)); op('in-lab-leak', 1 - e); op('in-lab-dry', e); if (p > 0) { op('in-med', 1 - e); op('in-lab-med', 1 - e); } } }
    ]
  };

  // ---------- macular degeneration: a close-up of the macula ----------
  var DRUSEN = [[110, 16], [200, 26], [300, 34], [392, 22], [470, 14]];
  function amdSvg(wet) {
    var h = svgOpen('0 0 560 420', 'A slice through the macula: the light-sensing retina, its support layer, and the blood vessels beneath'), i;
    h += '<rect x="20" y="300" width="520" height="100" fill="#fecaca" stroke="#f87171" stroke-width="2"/>';
    for (i = 0; i < 6; i++) h += '<ellipse cx="' + (70 + i * 86) + '" cy="' + (348 + (i % 2) * 14) + '" rx="30" ry="13" fill="#dc2626" opacity="0.75"/>';
    h += '<path id="am-fluid" fill="#93c5fd" opacity="0"/>'
      + '<g id="am-newv" opacity="0" fill="none" stroke="#b91c1c" stroke-width="5" stroke-linecap="round"><path d="M270,330 C270,300 262,286 248,270 M270,300 C282,284 296,278 312,262 M262,286 C250,280 236,282 224,272"/></g>'
      + '<g id="am-blood" fill="#b91c1c" opacity="0"><ellipse cx="270" cy="262" rx="34" ry="9"/></g>'
      + '<path id="am-rpe" fill="#92400e"/>'
      + '<path id="am-ret" fill="#fbcfe8" stroke="#db2777" stroke-width="2"/>'
      + '<g id="am-rods" stroke="#db2777" stroke-width="2"></g>'
      + '<g id="am-drusen" fill="#fde047" stroke="#a16207" stroke-width="1.5">';
    for (i = 0; i < DRUSEN.length; i++) h += '<ellipse cx="' + DRUSEN[i][0] + '" cy="294" rx="0" ry="0"/>';
    h += '</g>'
      + '<line x1="20" y1="300" x2="540" y2="300" stroke="#78350f" stroke-width="3"/>'
      + txt(20, 30, 'Retina', 'start', '#be185d') + txt(20, 54, 'the light-sensing cells', 'start', MUTED, 400, 17)
      + txt(540, 30, 'Support layer', 'end', '#92400e') + txt(540, 54, 'feeds the retina, clears its waste', 'end', MUTED, 400, 17) + lead(500, 62, 470, 284, '#92400e')
      + txt(280, 392, 'Blood vessels', 'middle', '#b91c1c', 600, 18)
      + '<g id="am-lab-a" opacity="0">' + txt(20, 96, wet ? 'New, fragile blood vessels' : 'Drusen: waste deposits', 'start', wet ? '#b91c1c' : '#a16207', 600, 19) + '</g>'
      + '<g id="am-lab-b" opacity="0">' + txt(20, 96, wet ? 'Fluid and blood under the retina' : 'The retina above thins and stops working', 'start', wet ? BLUE : '#be185d', 600, 19) + '</g>'
      + '<g id="am-lab-c" opacity="0">' + txt(20, 96, 'Injections dry up the leak', 'start', '#047857', 600, 19) + '</g>';
    return h + '</svg>';
  }
  // the retina and its support layer, riding over drusen (dz 0..1), lifted by fluid (fl 0..1), thinned (th 0..1)
  function amdShape(dz, fl, th) {
    var top = '', base = '', rpeTop = '', x, i, bump, lift, y0, thin, pts = [];
    for (x = 20; x <= 540; x += 8) {
      bump = 0; for (i = 0; i < DRUSEN.length; i++) bump += DRUSEN[i][1] * dz * Math.exp(-Math.pow((x - DRUSEN[i][0]) / 26, 2));
      lift = 46 * fl * Math.exp(-Math.pow((x - 270) / 120, 2));
      thin = th * Math.exp(-Math.pow((x - 290) / 90, 2));
      y0 = 290 - bump; pts.push([x, y0, lift, thin]);
    }
    pts.forEach(function (q, k) { base += (k ? ' L' : 'M') + q[0] + ',' + (q[1] - q[2]).toFixed(1); top += ' L' + q[0] + ',' + (q[1] - q[2] - 110 * (1 - 0.6 * q[3])).toFixed(1); rpeTop += (k ? ' L' : 'M') + q[0] + ',' + (q[1] - (1 - 0.8 * q[3]) * 9).toFixed(1); });
    var topRev = pts.slice().reverse().map(function (q) { return q[0] + ',' + (q[1] - q[2] - 110 * (1 - 0.6 * q[3])).toFixed(1); }).join(' L');
    at('am-ret', 'd', base + ' L' + topRev + ' Z');
    at('am-rpe', 'd', rpeTop + ' L540,300 L20,300 Z');
    var fl2 = 'M20,292'; pts.forEach(function (q) { fl2 += ' L' + q[0] + ',' + (q[1] - q[2] + 1).toFixed(1); }); at('am-fluid', 'd', fl2 + ' L540,292 Z');
    var e = document.querySelectorAll('#am-drusen ellipse'); for (i = 0; i < e.length; i++) { e[i].setAttribute('rx', (24 * dz * (DRUSEN[i][1] / 30 + 0.3)).toFixed(1)); e[i].setAttribute('ry', (DRUSEN[i][1] * dz * 0.55).toFixed(1)); e[i].setAttribute('cy', (296 - DRUSEN[i][1] * dz * 0.5).toFixed(1)); }
  }
  function amdProc(wet) {
    var steps = wet ? [
      { label: 'New vessels', dur: 2400, caption: '<strong>New blood vessels.</strong> In wet macular degeneration, abnormal blood vessels grow up from beneath the support layer toward the retina. It usually begins in an eye that already has the dry form.',
        draw: function (p) { var e = ease(p); op('am-newv', e); op('am-lab-a', e); amdShape(0.45, 0, 0); } },
      { label: 'Leak', dur: 2600, caption: '<strong>They leak.</strong> The new vessels are fragile. They leak fluid and bleed under the retina and lift it, so straight lines look bent or wavy and the center blurs, over days to weeks. Left alone, the leak leaves a scar. <strong>New distortion needs a same-day call.</strong>',
        draw: function (p) { var e = ease(p); if (p > 0) { amdShape(0.45, e, 0); op('am-lab-a', 1 - e); } op('am-fluid', 0.85 * e); op('am-blood', 0.8 * e); op('am-lab-b', e); } },
      { label: 'Injections', dur: 2800, caption: '<strong>Treatment.</strong> Medicines injected into the eye block the signal that makes these vessels grow and leak. The fluid clears and the retina settles back. Most people keep the vision they had when treatment started, and some gain vision, which is why starting early matters.',
        draw: function (p) { var e = ease(p); if (p > 0) { amdShape(0.45, 1 - e, 0); op('am-fluid', 0.85 * (1 - e)); op('am-blood', 0.8 * (1 - e)); op('am-newv', 1 - 0.75 * e); op('am-lab-b', 1 - e); } op('am-lab-c', e); } }
    ] : [
      { label: 'Drusen', dur: 2600, caption: '<strong>Drusen.</strong> With age, waste from the hard-working cells of the macula is cleared less well and builds up as yellow deposits called drusen. A few small drusen are common after 50 and cause no symptoms. Your doctor sees them at a dilated exam.',
        draw: function (p) { var e = ease(p); amdShape(e, 0, 0); op('am-lab-a', e); } },
      { label: 'Thinning', dur: 2800, caption: '<strong>Thinning.</strong> Over years, in some people, the support layer and the light-sensing cells above the drusen thin and die off in patches. This is advanced dry macular degeneration (geographic atrophy).',
        draw: function (p) { var e = ease(p); if (p > 0) { amdShape(1, 0, e); op('am-lab-a', 1 - e); } op('am-lab-b', e); } },
      { label: 'Vision', dur: 2000, caption: '<strong>What it does to vision.</strong> The center of vision dims and blurs: print needs more light, faces are harder to recognize, and blank spots can appear near the center. Side vision is kept, so dry macular degeneration does not cause total blindness. It usually changes slowly, over years.',
        draw: function () {} }
    ];
    return {
      variants: [['amd', 'Dry'], ['amdwet', 'Wet']],
      views: [['A slice through the macula', function () { return amdSvg(wet); }]],
      intro: '<strong>The macula.</strong> The macula is the small central part of the retina used for reading, faces and fine detail. Its light-sensing cells sit on a support layer that feeds them and carries away their waste, with a bed of blood vessels beneath.',
      steps: steps
    };
  }

  // ---------- diabetic retinopathy: the back of the eye ----------
  function fundus(inner) {
    return '<clipPath id="fu-clip"><circle cx="280" cy="210" r="190"/></clipPath>'
      + '<circle cx="280" cy="210" r="190" fill="#ea580c"/><circle cx="280" cy="210" r="190" fill="#fb923c" opacity="0.45"/>'
      + '<g clip-path="url(#fu-clip)">'
      + '<circle cx="250" cy="212" r="40" fill="#9a3412" opacity="0.45"/><circle cx="250" cy="212" r="12" fill="#7c2d12" opacity="0.6"/>'
      + '<g fill="none" stroke="#991b1b" stroke-width="5" stroke-linecap="round"><path d="M372,196 C340,120 250,80 120,110"/><path d="M372,224 C340,300 250,340 120,312"/><path d="M380,196 C420,140 450,110 480,70"/><path d="M380,224 C420,280 450,310 480,350"/></g>'
      + '<g fill="none" stroke="#b91c1c" stroke-width="2.5" stroke-linecap="round"><path d="M330,128 C310,150 300,166 292,180"/><path d="M330,292 C310,270 300,254 292,240"/><path d="M220,96 C226,120 230,140 236,160"/><path d="M220,326 C226,300 230,282 236,262"/></g>'
      + (inner || '') + '</g>'
      + '<circle cx="376" cy="210" r="26" fill="#fde68a" stroke="#f59e0b" stroke-width="2"/><circle cx="376" cy="210" r="9" fill="#fef9c3"/>'
      + '<circle cx="280" cy="210" r="190" fill="none" stroke="#7c2d12" stroke-width="3"/>';
  }
  function drSvg() {
    var h = svgOpen('0 0 560 444', 'The back of the eye as the doctor sees it: the optic nerve, the blood vessels and the macula'), i, s = 5;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var dots = '', blots = '', exud = '';
    for (i = 0; i < 16; i++) dots += '<circle cx="' + (130 + rnd() * 300).toFixed(0) + '" cy="' + (80 + rnd() * 260).toFixed(0) + '" r="3" fill="#7f1d1d"/>';
    for (i = 0; i < 9; i++) blots += '<ellipse cx="' + (120 + rnd() * 300).toFixed(0) + '" cy="' + (70 + rnd() * 280).toFixed(0) + '" rx="' + (8 + rnd() * 8).toFixed(0) + '" ry="' + (5 + rnd() * 5).toFixed(0) + '" fill="#7f1d1d" opacity="0.85"/>';
    for (i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2; exud += '<circle cx="' + (250 + 44 * Math.cos(a)).toFixed(0) + '" cy="' + (212 + 36 * Math.sin(a)).toFixed(0) + '" r="' + (3 + i % 3) + '" fill="#fef08a"/>'; }
    h += fundus('<g id="dr-dots" opacity="0">' + dots + '</g><g id="dr-blots" opacity="0">' + blots + '</g>'
      + '<circle id="dr-edema" cx="250" cy="212" r="52" fill="#bfdbfe" opacity="0"/><g id="dr-exud" opacity="0">' + exud + '</g>'
      + '<g id="dr-nv" opacity="0" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round"><path d="M392,190 c14,-20 30,-18 34,-36 M398,196 c22,-10 34,-2 46,-16 M388,186 c2,-22 16,-28 12,-46 M400,204 c20,2 30,14 48,10 M390,232 c14,18 30,14 36,32 M396,226 c20,8 32,2 44,14"/></g>'
      + '<path id="dr-bleed" d="M150,250 C210,220 330,236 430,270 C440,340 380,400 280,400 C200,400 140,340 150,250 Z" fill="#7f1d1d" opacity="0"/>')
      + txt(20, 30, 'Macula', 'start') + lead(92, 36, 244, 204)
      + txt(540, 30, 'Optic nerve', 'end') + lead(470, 38, 384, 196)
      + '<g id="dr-lab-1" opacity="0">' + txt(280, 432, 'Tiny bulges and spots of bleeding', 'middle', '#7f1d1d', 600, 19) + '</g>'
      + '<g id="dr-lab-2" opacity="0">' + txt(280, 432, 'Swelling and deposits at the macula', 'middle', '#1d4ed8', 600, 19) + '</g>'
      + '<g id="dr-lab-3" opacity="0">' + txt(280, 432, 'Fragile new vessels', 'middle', '#b91c1c', 600, 19) + '</g>'
      + '<g id="dr-lab-4" opacity="0">' + txt(280, 432, 'Bleeding into the gel', 'middle', '#7f1d1d', 600, 19) + '</g>';
    return h + '</svg>';
  }
  var DR = {
    views: [['The back of the eye', drSvg]],
    intro: '<strong>A healthy retina.</strong> This is the back of the eye as your doctor sees it through the dilated pupil: the optic nerve, the blood vessels that fan out from it, and the macula at the center. High blood sugar slowly damages the walls of these small vessels.',
    steps: [
      { label: 'Early', dur: 2400, caption: '<strong>Early changes.</strong> Weak spots in the vessel walls bulge and leak, leaving dots and blots of bleeding. There are no symptoms and vision is normal, which is why a yearly dilated exam matters: this is the stage to catch.',
        draw: function (p) { var e = ease(p); op('dr-dots', e); op('dr-blots', ease(clamp(p * 2 - 1, 0, 1))); op('dr-lab-1', e); } },
      { label: 'Swelling', dur: 2400, caption: '<strong>Swelling at the center.</strong> When leaky vessels are near the macula, fluid and fatty deposits collect there. This is diabetic macular edema, the most common reason diabetes blurs vision. It is treated with injections, and sometimes laser.',
        draw: function (p) { var e = ease(p); op('dr-edema', 0.55 * e); op('dr-exud', e); op('dr-lab-2', e); if (p > 0) op('dr-lab-1', 1 - e); } },
      { label: 'New vessels', dur: 2400, caption: '<strong>New vessels.</strong> As vessels close off, the starved retina sends out a signal to grow new ones. They are fragile and grow in the wrong place, on the surface of the retina and optic nerve. This is proliferative retinopathy. Laser or injections make them shrink back.',
        draw: function (p) { var e = ease(p); op('dr-nv', e); op('dr-lab-3', e); if (p > 0) op('dr-lab-2', 1 - e); } },
      { label: 'Bleeding', dur: 2400, caption: '<strong>Bleeding.</strong> The new vessels can bleed into the gel that fills the eye, causing a sudden shower of floaters or a red-brown haze, and their scar tissue can pull the retina off. This is how diabetes causes severe vision loss, and it is largely preventable with regular exams and timely treatment.',
        draw: function (p) { var e = ease(p); op('dr-bleed', 0.8 * e); op('dr-lab-4', e); if (p > 0) op('dr-lab-3', 1 - e); } }
    ]
  };

  // ---------- vitrectomy (pars plana vitrectomy, PPV) ----------
  // Shown clearing blood from the gel, the most common reason in diabetes;
  // the same steps are used to repair a detachment or a macular hole.
  // labels that share a spot swap rather than cross-fade: the old one is gone
  // in the first quarter of the step, the new one arrives after it
  function lin(p) { return ease(clamp(p * 4 - 1, 0, 1)); }
  function lout(p) { return 1 - ease(clamp(p * 4, 0, 1)); }
  var PP_PORTS = [-126, 126];
  var PP_WORK = [[372, 176], [356, 262]]; // where the cutter and the light pipe work
  function ppLine(i, ins, sweep) {
    var port = gp(PP_PORTS[i], 172), w = PP_WORK[i], tip;
    if (i === 0) w = [w[0] + 46 * Math.cos(sweep), w[1] + 34 * Math.sin(sweep)];
    tip = [lerp(port[0], w[0], ins), lerp(port[1], w[1], ins)];
    var dx = port[0] - w[0], dy = port[1] - w[1], L = Math.hypot(dx, dy), out = [port[0] + dx / L * 120, port[1] + dy / L * 120];
    at('pp-i' + i, 'x1', out[0]); at('pp-i' + i, 'y1', out[1]); at('pp-i' + i, 'x2', tip[0]); at('pp-i' + i, 'y2', tip[1]);
    at('pp-t' + i, 'cx', tip[0]); at('pp-t' + i, 'cy', tip[1]);
  }
  function ppvSvg() {
    var h = svgOpen('0 0 640 470', 'The eye cut in half, with blood clouding the gel that fills it'), i, s = 3, a;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var blood = '';
    for (i = 0; i < 26; i++) { a = rnd() * Math.PI * 2; var r = Math.sqrt(rnd()) * 120; blood += '<circle cx="' + (346 + r * Math.cos(a)).toFixed(0) + '" cy="' + (220 + r * Math.sin(a)).toFixed(0) + '" r="' + (3 + rnd() * 5).toFixed(1) + '"/>'; }
    h += '<clipPath id="pp-clip"><circle cx="' + GX + '" cy="' + GY + '" r="157"/></clipPath>'
      + globe({ under: '<g clip-path="url(#pp-clip)"><circle id="pp-gel" cx="' + GX + '" cy="' + GY + '" r="160" fill="#b45309" opacity="0.45"/><g id="pp-blood" fill="#7f1d1d" opacity="0.85">' + blood + '</g>'
        + '<path id="pp-gas" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" opacity="0.92"/></g>' })
      + '<g id="pp-laser" opacity="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="1.8">';
    [-104, -96, -88, -80, -72, 72, 80, 88, 96, 104].forEach(function (d) { var q = gp(d, 160); h += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="4.5"/>'; });
    h += '</g><g id="pp-ports" opacity="0">';
    PP_PORTS.forEach(function (d) { var q = gp(d, 172); h += '<rect x="' + (q[0] - 7).toFixed(1) + '" y="' + (q[1] - 7).toFixed(1) + '" width="14" height="14" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="2" transform="rotate(' + d + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')"/>'; });
    h += '</g><g id="pp-inst" opacity="0">'
      + '<line id="pp-i0" stroke="#6b7280" stroke-width="7" stroke-linecap="round"/><circle id="pp-t0" r="5" fill="#374151"/>'
      + '<line id="pp-i1" stroke="#cbd5e1" stroke-width="7" stroke-linecap="round"/><circle id="pp-t1" r="9" fill="#fef9c3" opacity="0.9"/>'
      + '</g>'
      + globeLabels(txt(620, 30, 'Retina', 'end', '#c2410c') + lead(560, 38, gp(-30, 162)[0], gp(-30, 162)[1], '#c2410c')
      + '<g id="pp-lab-0">' + txt(20, 30, 'Blood in the gel', 'start', '#7f1d1d') + lead(130, 38, 330, 150, '#7f1d1d') + '</g>'
      + '<g id="pp-lab-1" opacity="0">' + txt(320, 456, 'Three tiny ports in the white of the eye', 'middle', INK, 600, 19) + '</g>'
      + '<g id="pp-lab-2" opacity="0">' + txt(320, 456, 'A cutter removes the gel and blood; a light shines inside', 'middle', INK, 600, 18) + '</g>'
      + '<g id="pp-lab-3" opacity="0">' + txt(320, 456, 'Laser to the retina, or scar tissue peeled away', 'middle', '#047857', 600, 19) + '</g>'
      + '<g id="pp-lab-4" opacity="0">' + txt(320, 456, 'Gas, air, clear fluid or oil fills the eye', 'middle', '#0369a1', 600, 19) + '</g>');
    return h + '</svg>';
  }
  function ppGas(level) { // the bubble fills from the top down: level 0 none .. 1 most of the eye
    if (level <= 0) { at('pp-gas', 'd', 'M0,0 Z'); return; }
    var y = GY - 160 + 300 * level, half = Math.sqrt(Math.max(0, 160 * 160 - (y - GY) * (y - GY)));
    at('pp-gas', 'd', 'M' + (GX - half).toFixed(1) + ',' + y.toFixed(1) + ' A160,160 0 ' + (y > GY ? 1 : 0) + ',1 ' + (GX + half).toFixed(1) + ',' + y.toFixed(1) + ' Z');
  }
  var PPV = {
    views: [['The eye, cut in half', ppvSvg]],
    intro: '<strong>Why a vitrectomy.</strong> The eye is filled with a clear gel. Here bleeding from diabetic eye disease has clouded it, so light cannot reach the retina. Removing the gel is also how a retinal detachment, a macular hole or scar tissue on the retina is repaired.',
    steps: [
      { label: 'Ports', dur: 2000, caption: '<strong>Ports.</strong> After the eye is numbed, usually with sedation, three tiny ports are placed through the white of the eye, just behind the colored part. They are narrower than a pencil lead. One keeps the eye filled with fluid during surgery; the other two take the instruments.',
        draw: function (p) { var e = ease(p); op('pp-ports', e); op('pp-lab-1', e); } },
      { label: 'Gel out', dur: 3400, caption: '<strong>The gel is removed.</strong> A fine cutter, guided by a light inside the eye and a microscope above it, cuts and gently draws out the gel along with the blood. Clear fluid flows in to replace it, so the eye keeps its shape.',
        draw: function (p) {
          var ins = ease(clamp(p * 4, 0, 1)), clear = ease(clamp((p - 0.2) / 0.8, 0, 1));
          op('pp-inst', p > 0 ? 1 : 0); ppLine(0, ins, p * 14); ppLine(1, ins, 0);
          op('pp-gel', 0.45 * (1 - clear)); op('pp-blood', 0.85 * (1 - clear)); op('pp-lab-2', lin(p));
          if (p > 0) { op('pp-lab-1', lout(p)); op('pp-lab-0', 1 - clear); } else op('pp-lab-0', 1);
        } },
      { label: 'Repair', dur: 2600, caption: '<strong>Treating the retina.</strong> With the view clear, the surgeon treats the cause: laser to the retina to shrink abnormal vessels, peeling scar tissue off its surface, or flattening a detached retina and sealing its tears.',
        draw: function (p) { var e = ease(p), g = document.querySelectorAll('#pp-laser circle'), i; op('pp-laser', p > 0 ? 1 : 0); for (i = 0; i < g.length; i++) g[i].style.opacity = p * g.length > i ? 1 : 0; op('pp-lab-3', lin(p)); if (p > 0) { op('pp-lab-2', lout(p)); ppLine(0, 1, 14 + p * 6); } } },
      { label: 'Fill', dur: 2800, caption: '<strong>Filling the eye.</strong> Depending on the repair, the eye is left filled with clear fluid, air, a gas bubble that presses the retina in place, or silicone oil. The instruments come out and the ports seal by themselves, usually without stitches. The eye makes its own fluid again, and gas or air is absorbed over days to weeks.',
        draw: function (p) { var e = ease(p), out = ease(clamp(p * 3, 0, 1)); ppGas(0.6 * ease(clamp(p * 1.4 - 0.2, 0, 1))); op('pp-lab-4', lin(p)); if (p > 0) { op('pp-inst', 1 - out); op('pp-lab-3', lout(p)); op('pp-ports', 1 - 0.6 * e); } } }
    ]
  };

  // ---------- laser to the retina: scatter (PRP) and focal ----------
  var DISC = [376, 210], MAC = [250, 212];
  function prpSpots() { // rings of spots in the outer retina, sparing the macula and the optic nerve
    var pts = [], r, a, n, k, x, y;
    for (r = 110; r <= 182; r += 18) { n = Math.round(r / 6.5); for (k = 0; k < n; k++) { a = k / n * Math.PI * 2 + r * 0.07; x = 280 + r * Math.cos(a); y = 210 + r * Math.sin(a);
      if (Math.hypot(x - DISC[0], y - DISC[1]) < 64 || Math.hypot(x - MAC[0], y - MAC[1]) < 100) continue; pts.push([x, y]); } }
    return pts;
  }
  var FOCAL = [[214, 188], [226, 244], [282, 178], [292, 236], [204, 220], [270, 252]];
  function laserSvg(prp) {
    var h = svgOpen('0 0 560 444', prp ? 'The back of the eye, with new blood vessels growing on the optic nerve' : 'The back of the eye, with leaking blood vessels near the macula'), inner = '';
    if (prp) {
      inner += '<g id="ls-nv" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round"><path d="M392,190 c14,-20 30,-18 34,-36 M398,196 c22,-10 34,-2 46,-16 M388,186 c2,-22 16,-28 12,-46 M400,204 c20,2 30,14 48,10 M390,232 c14,18 30,14 36,32 M396,226 c20,8 32,2 44,14"/></g><g id="ls-spots">';
      prpSpots().forEach(function (q) { inner += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="5.5" fill="#fef3c7" stroke="#ca8a04" stroke-width="1" opacity="0"/>'; });
      inner += '</g>';
    } else {
      inner += '<circle id="ls-edema" cx="' + MAC[0] + '" cy="' + MAC[1] + '" r="64" fill="#bfdbfe" opacity="0"/><g id="ls-ma" fill="#7f1d1d" opacity="0">';
      FOCAL.forEach(function (q) { inner += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4"/>'; });
      inner += '</g><g id="ls-exud" fill="#fef08a" opacity="0">';
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; inner += '<circle cx="' + (MAC[0] + 58 * Math.cos(a)).toFixed(0) + '" cy="' + (MAC[1] + 48 * Math.sin(a)).toFixed(0) + '" r="' + (3 + i % 3) + '"/>'; }
      inner += '</g><g id="ls-spots">';
      FOCAL.forEach(function (q) { inner += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="7" fill="#fef3c7" stroke="#ca8a04" stroke-width="1" opacity="0"/>'; });
      inner += '</g>';
    }
    h += fundus(inner)
      + '<circle id="ls-flash" r="0" fill="#bbf7d0" stroke="' + GREEN + '" stroke-width="2.5"/>'
      + txt(20, 30, 'Macula', 'start') + lead(92, 36, 244, 204)
      + txt(540, 30, 'Optic nerve', 'end') + lead(470, 38, 384, 196)
      + '<g id="ls-lab-1" opacity="0">' + txt(280, 432, prp ? 'Fragile new vessels' : 'Leaking spots and swelling near the center', 'middle', '#b91c1c', 600, 19) + '</g>'
      + '<g id="ls-lab-2" opacity="0">' + txt(280, 432, prp ? 'Laser spots across the outer retina, sparing the center' : 'Small laser spots on the leaking points', 'middle', '#047857', 600, 19) + '</g>'
      + '<g id="ls-lab-3" opacity="0">' + txt(280, 432, prp ? 'The new vessels shrink back' : 'The swelling goes down', 'middle', '#1d4ed8', 600, 19) + '</g>';
    return h + '</svg>';
  }
  function lsSpots(n, glow, scar) {
    var g = document.querySelectorAll('#ls-spots circle'), i;
    for (i = 0; i < g.length; i++) { g[i].style.opacity = i < n ? 1 : 0; g[i].setAttribute('fill', scar ? '#78350f' : i === n - 1 && glow ? '#4ade80' : '#fef3c7'); g[i].setAttribute('stroke', scar ? '#451a03' : '#ca8a04'); }
    var last = g[Math.max(0, Math.min(g.length - 1, n - 1))];
    if (glow && n > 0) { at('ls-flash', 'cx', last.getAttribute('cx')); at('ls-flash', 'cy', last.getAttribute('cy')); }
  }
  function laserProc(prp) {
    return {
      variants: [['prp', 'Scatter laser (PRP)'], ['focal', 'Focal laser']],
      views: [['The back of the eye', function () { return laserSvg(prp); }]],
      intro: prp
        ? '<strong>Scatter laser (PRP).</strong> In advanced diabetic eye disease, or after a blocked retinal vein, the starved outer retina sends out a signal that makes fragile new blood vessels grow, here on the optic nerve. They can bleed and scar.'
        : '<strong>Focal laser.</strong> Near the macula, small bulges in the blood vessel walls can leak, so the center of the retina swells and vision blurs. This is diabetic macular edema.',
      steps: [
        { label: prp ? 'New vessels' : 'Leak', dur: 2200, caption: prp
            ? '<strong>New vessels.</strong> Fine, fragile vessels grow on the surface of the retina and optic nerve. They cause no symptoms until they bleed.'
            : '<strong>The leak.</strong> Fluid and yellow fatty deposits collect around the leaking spots, at the edge of the macula.',
          draw: function (p) { var e = ease(p); op('ls-lab-1', e); if (prp) op('ls-nv', 0.35 + 0.65 * e); else { op('ls-edema', 0.55 * e); op('ls-ma', e); op('ls-exud', e); } } },
        { label: 'Laser', dur: prp ? 4200 : 2600, caption: prp
            ? '<strong>The laser.</strong> In the office, through a contact lens, many small laser spots are placed across the outer retina, avoiding the center. The treated retina needs less oxygen, so the signal for new vessels switches off. It is usually done over two or three sessions. Bright flashes are seen, and it can sting or ache.'
            : '<strong>The laser.</strong> A few small, gentle spots are placed on or around the leaking points, away from the very center, to seal them.',
          draw: function (p) {
            var total = document.querySelectorAll('#ls-spots circle').length, n = Math.round(p * total), on = p > 0 && p < 1, x = (p * total) % 1;
            var pulse = on ? Math.max(0, Math.sin(Math.PI * clamp(x * 2.2, 0, 1))) : 0;
            lsSpots(n, on, false); at('ls-flash', 'r', 11 * pulse); op('ls-flash', pulse); op('ls-lab-2', lin(p)); if (p > 0) op('ls-lab-1', lout(p));
          } },
        { label: 'Weeks later', dur: 2600, caption: prp
            ? '<strong>Over the following weeks.</strong> The new vessels shrink and stop growing, and the spots become small scars. This protects against severe vision loss. The cost is some loss of side vision and night vision, because the outer retina has been treated. Injections are often used alongside or instead.'
            : '<strong>Over the following months.</strong> The leaks seal and the swelling goes down slowly. Injections into the eye have largely replaced focal laser as the first treatment for macular swelling, but laser is still used for some leaks, and the two are often combined.',
          draw: function (p) { var e = ease(p); op('ls-lab-3', lin(p)); if (p > 0) { op('ls-lab-2', lout(p)); lsSpots(9999, false, p > 0.5); if (prp) op('ls-nv', 1 - 0.85 * e); else { op('ls-edema', 0.55 * (1 - e)); op('ls-exud', 1 - 0.6 * e); op('ls-ma', 1 - 0.7 * e); } } } }
      ]
    };
  }

  return { ppv: PPV, prp: laserProc(true), focal: laserProc(false), pvd: pvdProc(false), pvdtear: pvdProc(true), rd: rdProc(false), rdlaser: rdProc(true), inject: INJECT, amd: amdProc(false), amdwet: amdProc(true), dr: DR };
});
