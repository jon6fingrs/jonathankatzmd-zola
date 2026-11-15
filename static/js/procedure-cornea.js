/* Cornea demos for procedure.js (load this file first). Same rules as the
 * others: the picture is a pure function of time; a step's draw sets what
 * it owns at every p and touches another step's pieces only when p > 0.
 *
 * Drawings: a slice through the cornea's layers (surface cells on top, the
 * thick clear middle, the single layer of pump cells underneath); a side
 * profile of the cornea for keratoconus; the front of the eye for pterygium;
 * a wider slice for the four kinds of corneal transplant.
 */
(window.JK_PROC_EXTRA = window.JK_PROC_EXTRA || []).push(function (H) {
  'use strict';
  var clamp = H.clamp, ease = H.ease, lerp = H.lerp, txt = H.txt, lead = H.lead, op = H.op, at = H.at, arrow = H.arrow, svgOpen = H.svgOpen;
  var INK = H.INK, BLUE = H.BLUE, MUTED = H.MUTED, GREEN = H.GREEN;
  var EPI = '#e9d5ff', EPI_S = '#7c3aed', STROMA = '#dbeafe', ENDO = '#a7f3d0', ENDO_S = '#047857';

  // ---------- the layers, shared ----------
  var TOP = 110, EPI_H = 44, ST_TOP = TOP + EPI_H; // surface cells from TOP; the middle layer starts at ST_TOP
  function stromaLines(h) { var s = '', y; for (y = ST_TOP + 14; y < ST_TOP + h - 6; y += 14) s += '<line x1="24" y1="' + y + '" x2="536" y2="' + y + '" stroke="#93c5fd" stroke-width="1.2"/>'; return s; }

  // ---------- a scratch on the surface ----------
  function abrasionSvg() {
    var h = svgOpen('0 0 560 440', 'A slice through the cornea: surface cells on top, the thick clear middle layer, and a single layer of pump cells underneath'), x;
    h += '<rect x="20" y="' + ST_TOP + '" width="520" height="170" fill="' + STROMA + '" stroke="#3b82f6" stroke-width="2"/>' + stromaLines(170)
      + '<rect x="20" y="' + (ST_TOP + 170) + '" width="520" height="16" fill="' + ENDO + '" stroke="' + ENDO_S + '" stroke-width="1.5"/>'
      + '<g stroke="#ca8a04" stroke-width="3" stroke-linecap="round" fill="none">';
    for (x = 210; x <= 350; x += 28) h += '<path d="M' + x + ',' + (ST_TOP + 60) + ' C' + (x + 6) + ',' + (ST_TOP + 30) + ' ' + (x - 6) + ',' + (ST_TOP + 10) + ' ' + x + ',' + (TOP + 16) + '"/>';
    h += '</g>'
      + '<path id="ab-epi" fill="' + EPI + '" stroke="' + EPI_S + '" stroke-width="2"/>'
      + '<g id="ab-pain" opacity="0" fill="#fde047" stroke="#ca8a04" stroke-width="1.5">';
    for (x = 238; x <= 322; x += 28) h += '<path d="M' + x + ',' + (TOP - 4) + ' l-8,-12 l9,2 l-3,-14 l8,12 l-9,-2 Z"/>';
    h += '</g>'
      + '<line id="ab-tear" x1="20" x2="540" y1="' + (TOP - 4) + '" y2="' + (TOP - 4) + '" stroke="#60a5fa" stroke-width="5" stroke-linecap="round"/>'
      + txt(20, 40, 'Surface cells', 'start', EPI_S) + txt(20, 64, 'a few cells thick; heal fast', 'start', MUTED, 400, 17) + lead(120, 72, 90, TOP + 20, EPI_S)
      + txt(540, 40, 'Nerve endings', 'end', '#a16207') + txt(540, 64, 'more than anywhere else in the body', 'end', MUTED, 400, 17) + lead(440, 72, 350, TOP + 50, '#a16207')
      + txt(280, ST_TOP + 120, 'Clear middle layer', 'middle', '#1d4ed8', 600, 19)
      + txt(280, 372, 'Inside of the eye', 'middle', MUTED, 400, 17)
      + '<g id="ab-lab-a" opacity="0">' + txt(280, 424, 'Scratch: nerve endings exposed', 'middle', '#b91c1c', 700, 19) + '</g>'
      + '<g id="ab-lab-b" opacity="0">' + txt(280, 424, 'Neighboring cells slide in', 'middle', '#6d28d9', 700, 19) + '</g>'
      + '<g id="ab-lab-c" opacity="0">' + txt(280, 424, 'Healed, usually in one to three days', 'middle', '#047857', 700, 19) + '</g>';
    return h + '</svg>';
  }
  function abEpi(gap, thin) { // gap: half-width of the scratch; thin: 0..1 how thin the new cover is
    var l = 280 - gap, r = 280 + gap, b = ST_TOP, d;
    d = 'M20,' + TOP + ' L' + (l - 14) + ',' + TOP + ' Q' + l + ',' + TOP + ' ' + l + ',' + (TOP + 16 + 28 * (gap > 0 ? 1 : 0)) + ' L' + l + ',' + b + ' L20,' + b + ' Z'
      + ' M540,' + TOP + ' L' + (r + 14) + ',' + TOP + ' Q' + r + ',' + TOP + ' ' + r + ',' + (TOP + 16 + 28 * (gap > 0 ? 1 : 0)) + ' L' + r + ',' + b + ' L540,' + b + ' Z';
    if (gap <= 0) d = 'M20,' + TOP + ' L200,' + TOP + ' Q280,' + (TOP + 30 * thin) + ' 360,' + TOP + ' L540,' + TOP + ' L540,' + b + ' L20,' + b + ' Z';
    at('ab-epi', 'd', d);
  }
  var ABRASION = {
    views: [['A slice through the cornea', abrasionSvg]],
    intro: '<strong>The surface of the cornea.</strong> The cornea is the clear window at the front of the eye. Its surface is a thin sheet of cells, packed with more nerve endings than anywhere else in the body, which is why even a speck of dust is felt at once.',
    steps: [
      { label: 'Scratch', dur: 2200, caption: '<strong>A scratch.</strong> A fingernail, a branch, a contact lens or a speck under the lid scrapes away a patch of surface cells. The nerve endings underneath are left bare, so it hurts sharply, waters, and is very sensitive to light, all out of proportion to the size of the scratch.',
        draw: function (p) { var e = ease(p); abEpi(70 * e, 0); op('ab-pain', p > 0.3 ? 1 : 0); op('ab-lab-a', e); at('ab-tear', 'stroke-dasharray', p > 0.3 ? '190 140 190' : 'none'); } },
      { label: 'Healing', dur: 2800, caption: '<strong>Healing.</strong> The surface cells at the edges flatten and slide in to cover the bare patch, then multiply to rebuild the full thickness. An antibiotic drop or ointment prevents infection while the cover is open, and lubricant keeps it comfortable.',
        draw: function (p) { var e = ease(p); if (p > 0) { abEpi(70 * (1 - e), 1); op('ab-lab-a', 1 - e); op('ab-pain', p < 0.6 ? 1 : 0); if (p >= 1) at('ab-tear', 'stroke-dasharray', 'none'); } op('ab-lab-b', p > 0 && p < 1 ? 1 : p >= 1 ? 1 : 0); } },
      { label: 'Healed', dur: 2200, caption: '<strong>Healed.</strong> Most scratches heal in one to three days and leave no mark. The new cells take weeks to anchor firmly. Occasionally the patch lifts off again, typically on waking, which is called a recurrent erosion; ointment at bedtime helps prevent it.',
        draw: function (p) { var e = ease(p); if (p > 0) { abEpi(0, 1 - e); op('ab-lab-b', 1 - e); } op('ab-lab-c', e); } }
    ]
  };

  // ---------- Fuchs dystrophy: the pump layer ----------
  var FU_CELLS = 20, FU_LOST = [2, 5, 6, 9, 11, 12, 14, 17];
  function fuchsSvg() {
    var h = svgOpen('0 0 560 460', 'A slice through the cornea: the clear middle layer and the single layer of pump cells on its inner surface'), i;
    h += '<rect id="fu-stroma" x="20" y="' + ST_TOP + '" width="520" height="130" fill="' + STROMA + '" stroke="#3b82f6" stroke-width="2"/>'
      + '<rect id="fu-haze" x="20" y="' + ST_TOP + '" width="520" height="130" fill="#cbd5e1" opacity="0"/>'
      + '<rect x="20" y="' + TOP + '" width="520" height="' + EPI_H + '" fill="' + EPI + '" stroke="' + EPI_S + '" stroke-width="2"/>'
      + '<g id="fu-blister" opacity="0"><ellipse cx="300" cy="' + (TOP + 6) + '" rx="34" ry="12" fill="#fff" stroke="' + EPI_S + '" stroke-width="2"/></g>'
      + '<g id="fu-under">'
      + '<g id="fu-gut" opacity="0" fill="#92400e">';
    FU_LOST.forEach(function (k) { h += '<ellipse cx="' + (33 + k * 26) + '" cy="6" rx="9" ry="6"/>'; });
    h += '</g><g id="fu-cells">';
    for (i = 0; i < FU_CELLS; i++) h += '<rect x="' + (21 + i * 26) + '" y="0" width="24" height="18" rx="5" fill="' + ENDO + '" stroke="' + ENDO_S + '" stroke-width="1.5"/>';
    h += '</g><g id="fu-pump">';
    for (i = 0; i < 7; i++) h += arrow('fu-p' + i, 'M' + (60 + i * 72) + ',-22 L' + (60 + i * 72) + ',40', BLUE, 3.5);
    h += '</g>'
      + '<g id="fu-donor" opacity="0"><rect x="20" y="20" width="520" height="14" rx="5" fill="#34d399" stroke="' + ENDO_S + '" stroke-width="2"/></g>'
      + '<ellipse id="fu-bubble" cx="280" cy="150" rx="200" ry="0" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" opacity="0.9"/>'
      + '<text x="280" y="92" font-family="Roboto, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="17" fill="' + MUTED + '" text-anchor="middle">Fluid inside the eye</text>'
      + '</g>'
      + txt(20, 40, 'Surface cells', 'start', EPI_S, 600, 19) + lead(74, 48, 74, TOP + 16, EPI_S)
      + txt(280, ST_TOP + 66, 'Clear middle layer', 'middle', '#1d4ed8', 600, 19)
      + txt(540, 40, 'Pump cells: keep the cornea clear', 'end', ENDO_S, 600, 19)
      + '<g id="fu-lab-a" opacity="0">' + txt(280, 82, 'Cells are lost and are not replaced', 'middle', '#92400e', 700, 19) + '</g>'
      + '<g id="fu-lab-b" opacity="0">' + txt(280, 82, 'The cornea swells and turns hazy', 'middle', '#475569', 700, 19) + '</g>'
      + '<g id="fu-lab-c" opacity="0">' + txt(280, 82, 'A donor layer of healthy pump cells', 'middle', '#047857', 700, 19) + '</g>';
    return h + '</svg>';
  }
  function fuSet(hh, haze) { // thickness of the middle layer, and how hazy it is
    at('fu-stroma', 'height', hh); at('fu-haze', 'height', hh); op('fu-haze', haze);
    at('fu-under', 'transform', 'translate(0,' + (ST_TOP + hh).toFixed(1) + ')');
  }
  function fuCells(lost) { var c = document.querySelectorAll('#fu-cells rect'), i; for (i = 0; i < c.length; i++) c[i].style.opacity = FU_LOST.indexOf(i) >= 0 ? (1 - lost).toFixed(2) : 1; }
  var FUCHS = {
    views: [['A slice through the cornea', fuchsSvg]],
    intro: '<strong>The pump layer.</strong> The inner surface of the cornea is lined with a single layer of cells that pump fluid out of it, all day and night. That is what keeps the cornea thin and clear. These cells do not multiply: the ones you are born with have to last.',
    steps: [
      { label: 'Cells lost', dur: 2600, caption: '<strong>Cells are lost.</strong> In Fuchs dystrophy the pump cells die off faster than normal, over decades, and small bumps form on the layer beneath them. The remaining cells spread out to cover the gaps. For years there are no symptoms.',
        draw: function (p) { var e = ease(p); fuCells(e); op('fu-gut', e); op('fu-lab-a', e); op('fu-pump', 1 - 0.55 * e); fuSet(130, 0); } },
      { label: 'Swelling', dur: 2800, caption: '<strong>Swelling.</strong> When too few cells are left, fluid builds up. The cornea thickens and turns hazy, like a steamed-up window. It is worst on waking, because nothing evaporates while the eyes are closed, and clears as the day goes on. Later it stays hazy, and painful blisters can form on the surface.',
        draw: function (p) { var e = ease(p); if (p > 0) { fuSet(130 + 46 * e, 0.6 * e); op('fu-lab-a', 1 - e); } op('fu-lab-b', e); op('fu-blister', ease(clamp(p * 2 - 1, 0, 1))); } },
      { label: 'New layer', dur: 3200, caption: '<strong>A new pump layer.</strong> A thin layer of healthy pump cells from a donor cornea replaces the worn-out one. It is slid in through a small incision, unrolled, and pressed into place by a gas bubble, with no stitches in the cornea. The swelling clears over the following weeks.',
        draw: function (p) {
          var e = ease(p), a = ease(clamp(p * 2, 0, 1)), b = ease(clamp(p * 2 - 1, 0, 1));
          op('fu-donor', a); at('fu-donor', 'transform', 'translate(' + (-300 * (1 - a)).toFixed(1) + ',' + (-20 * b).toFixed(1) + ')'); at('fu-bubble', 'ry', 70 * a * (1 - 0.4 * b)); op('fu-lab-c', e);
          if (p > 0) { fuSet(176 - 46 * b, 0.6 * (1 - b)); op('fu-lab-b', 1 - e); op('fu-blister', 1 - b); op('fu-cells', 1 - a); op('fu-gut', 1 - a); op('fu-pump', 0.45 + 0.55 * b); }
          else op('fu-cells', 1);
        } }
    ]
  };

  // ---------- keratoconus: the cornea in profile ----------
  function kcShape(c) {
    var ox = 96 - 44 * c, oy = 220 + 56 * c, ix = 126 - 62 * c, iy = 220 + 60 * c;
    return 'M230,60 Q' + ox + ',' + oy + ' 230,380 L246,366 Q' + ix + ',' + iy + ' 246,74 Z';
  }
  var KC_RAYS = [-110, -55, 0, 55, 110], KC_OFF = [70, -44, 30, 96, -60];
  // A scleral lens vaults over the whole cornea (shown at its full cone,
  // kcShape(1)) and rests on the white of the eye; fluid fills the space.
  var KC_LENS = 'M236,30 Q-22,220 236,410 L240,396 Q0,220 240,44 Z';
  var KC_FLUID = 'M240,44 Q0,220 240,396 L230,380 Q52,276 230,60 Z';
  function kcSvg() {
    var h = svgOpen('0 0 560 440', 'The cornea seen from the side, with light passing through it to a focus'), i;
    h += '<defs><pattern id="kc-x" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0,0 L12,12 M12,0 L0,12" stroke="#7c3aed" stroke-width="1.6"/></pattern></defs>'
      + '<g id="kc-rays" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round">';
    for (i = 0; i < KC_RAYS.length; i++) h += '<path/>';
    h += '</g>'
      + '<line x1="250" y1="80" x2="262" y2="170" stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/><line x1="262" y1="270" x2="250" y2="360" stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/>'
      + '<ellipse cx="292" cy="220" rx="24" ry="70" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>'
      + '<path id="kc-cornea" fill="' + STROMA + '" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path id="kc-links" fill="url(#kc-x)" opacity="0"/>'
      + '<path id="kc-fluid" d="' + KC_FLUID + '" fill="#bae6fd" opacity="0"/>'
      + '<g id="kc-scleral" opacity="0"><path d="' + KC_LENS + '" fill="#f0f9ff" fill-opacity="0.55" stroke="#0369a1" stroke-width="2.5" stroke-linejoin="round"/>' + txt(24, 44, 'Scleral lens', 'start', '#0369a1', 700, 19) + lead(84, 52, 142, 120, '#0369a1') + '</g>'
      + '<g id="kc-uv" opacity="0" stroke="#7c3aed" stroke-width="4" stroke-linecap="round"><line x1="20" y1="150" x2="92" y2="176"/><line x1="20" y1="220" x2="88" y2="226"/><line x1="20" y1="290" x2="92" y2="276"/></g>'
      + '<g id="kc-drop" opacity="0"><path d="M70,60 c12,18 12,32 0,36 c-12,-4 -12,-18 0,-36 Z" fill="#fde047" stroke="#ca8a04" stroke-width="2"/></g>'
      + '<line x1="540" y1="120" x2="540" y2="320" stroke="#fb923c" stroke-width="8" stroke-linecap="round"/>'
      + txt(300, 30, 'Cornea', 'start') + lead(296, 36, 224, 82)
      + txt(540, 96, 'Retina', 'end', '#c2410c', 600, 18)
      + txt(20, 420, 'Light', 'start', '#b45309', 600, 18)
      + '<g id="kc-lab-a" opacity="0">' + txt(300, 420, 'The cornea thins and bulges into a cone', 'middle', '#1d4ed8', 700, 19) + '</g>'
      + '<g id="kc-lab-b" opacity="0">' + txt(300, 420, 'Light no longer comes to one focus', 'middle', '#b45309', 700, 19) + '</g>'
      + '<g id="kc-lab-c" opacity="0">' + txt(300, 420, 'Cross-linking stiffens the cornea', 'middle', '#6d28d9', 700, 19) + '</g>'
      + '<g id="kc-lab-d" opacity="0">' + txt(300, 420, 'A scleral lens brings light back to one focus', 'middle', '#0369a1', 700, 19) + '</g>';
    return h + '</svg>';
  }
  // c: how far the cone has formed; rc: how scattered the light is (the
  // same as c unless a lens has smoothed the front surface).
  function kcDraw(c, rc) {
    if (rc === undefined) rc = c;
    at('kc-cornea', 'd', kcShape(c)); at('kc-links', 'd', kcShape(c));
    var r = document.querySelectorAll('#kc-rays path'), i, y, sx;
    for (i = 0; i < r.length; i++) { y = 220 + KC_RAYS[i]; sx = 150 + Math.abs(KC_RAYS[i]) * 0.5 - 30 * c * (KC_RAYS[i] > 0 ? 1 : 0.2);
      r[i].setAttribute('d', 'M20,' + y + ' L' + sx.toFixed(0) + ',' + y + ' L536,' + (220 + rc * KC_OFF[i]).toFixed(1)); }
  }
  var KC = {
    views: [['The cornea from the side', kcSvg]],
    intro: '<strong>A normal cornea.</strong> The cornea is the clear dome at the front of the eye, and it does most of the eye&rsquo;s focusing. A smooth, evenly curved dome brings light to a single sharp focus on the retina.',
    steps: [
      { label: 'Thinning', dur: 2600, caption: '<strong>Thinning.</strong> In keratoconus the cornea is weaker than normal. Starting in the teens or twenties, it slowly thins, usually a little below the center. Eye rubbing makes it worse.',
        draw: function (p) { var e = ease(p); kcDraw(0.45 * e); op('kc-lab-a', e); } },
      { label: 'Bulging', dur: 2600, caption: '<strong>Bulging.</strong> The thin area is pushed forward by the pressure inside the eye, and the dome becomes a cone. Light is bent unevenly and no longer comes to one focus, so vision is blurred and ghosted, with streaks around lights, and glasses stop correcting it fully.',
        draw: function (p) { var e = ease(p); if (p > 0) { kcDraw(0.45 + 0.55 * e); op('kc-lab-a', 1 - e); } op('kc-lab-b', e); } },
      { label: 'Cross-linking', dur: 3000, caption: '<strong>Cross-linking.</strong> Vitamin B2 drops are soaked into the cornea and activated with ultraviolet light. This forms new links between the cornea&rsquo;s fibers and stiffens it, which stops the cone from progressing in most people. It does not undo the change already there, so it is best done early.',
        draw: function (p) { var a = ease(clamp(p * 3, 0, 1)), e = ease(p); op('kc-drop', p > 0 && p < 0.45 ? 1 : 0); at('kc-drop', 'transform', 'translate(0,' + (80 * a).toFixed(1) + ')'); op('kc-uv', p > 0.4 && p < 1 ? 1 : 0); op('kc-links', 0.7 * ease(clamp(p * 2 - 0.8, 0, 1))); op('kc-lab-c', e); if (p > 0) op('kc-lab-b', 1 - e); } },
      { label: 'Scleral lens', dur: 3200, caption: '<strong>A scleral lens.</strong> The cornea is now stable, but still cone-shaped. A scleral lens is a large rigid contact lens that vaults over the whole cornea and rests on the white of the eye, with a layer of fluid underneath. Its smooth front surface takes over the focusing, so light comes back to one focus and vision is sharp again. Rigid and hybrid lenses work in a similar way.',
        draw: function (p) {
          var a = ease(clamp(p * 2, 0, 1)), b = ease(clamp(p * 2 - 1, 0, 1)), e = ease(p);
          op('kc-scleral', a); at('kc-scleral', 'transform', 'translate(' + (-180 * (1 - a)).toFixed(1) + ',0)'); op('kc-fluid', 0.8 * b); op('kc-lab-d', e);
          if (p > 0) { kcDraw(1, 1 - b); op('kc-lab-c', 1 - e); }
        } }
    ]
  };

  // ---------- pterygium: the front of the eye ----------
  var PX = 250, PY = 215;
  function ptWedge(g) { // from the inner corner across the white onto the cornea; g = how far the tip has grown
    var tip = PX + 78 - 44 * g;
    return 'M' + (PX + 168) + ',' + (PY - 20) + ' C' + (PX + 130) + ',' + (PY - 34) + ' ' + (tip + 40) + ',' + (PY - 22) + ' ' + tip + ',' + PY + ' C' + (tip + 40) + ',' + (PY + 22) + ' ' + (PX + 130) + ',' + (PY + 34) + ' ' + (PX + 168) + ',' + (PY + 20) + ' Z';
  }
  function pterySvg() {
    var eye = 'M' + (PX - 170) + ',' + PY + ' Q' + PX + ',' + (PY - 172) + ' ' + (PX + 170) + ',' + PY + ' Q' + PX + ',' + (PY + 172) + ' ' + (PX - 170) + ',' + PY + ' Z';
    var h = svgOpen('0 0 560 440', 'The front of an eye, with the white of the eye on each side of the cornea');
    h += '<clipPath id="pt-clip"><path d="' + eye + '"/></clipPath><path d="' + eye + '" fill="#fff" stroke="' + INK + '" stroke-width="3"/>'
      + '<g clip-path="url(#pt-clip)">'
      + '<circle cx="' + PX + '" cy="' + PY + '" r="78" fill="#5b8bb5" stroke="#2c4f6e" stroke-width="2"/><circle cx="' + PX + '" cy="' + PY + '" r="28" fill="#111827"/><circle cx="' + (PX + 16) + '" cy="' + (PY - 18) + '" r="8" fill="#fff"/>'
      + '<rect id="pt-graft" x="' + (PX + 86) + '" y="' + (PY - 26) + '" width="62" height="52" rx="8" fill="#fff7ed" stroke="#c2410c" stroke-width="2" stroke-dasharray="6 5" opacity="0"/>'
      + '<ellipse id="pt-ping" cx="' + (PX + 108) + '" cy="' + PY + '" rx="0" ry="0" fill="#fde68a" stroke="#ca8a04" stroke-width="1.5"/>'
      + '<g id="pt-wedge" opacity="0"><path id="pt-wedge-p" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>'
      + '<g fill="none" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"><path d="M' + (PX + 166) + ',' + (PY - 8) + ' C' + (PX + 130) + ',' + (PY - 12) + ' ' + (PX + 100) + ',' + (PY - 6) + ' ' + (PX + 70) + ',' + (PY - 2) + '"/><path d="M' + (PX + 166) + ',' + (PY + 8) + ' C' + (PX + 130) + ',' + (PY + 12) + ' ' + (PX + 100) + ',' + (PY + 6) + ' ' + (PX + 70) + ',' + (PY + 2) + '"/></g></g>'
      + '</g>'
      + '<path d="M' + (PX - 170) + ',' + PY + ' Q' + PX + ',' + (PY - 172) + ' ' + (PX + 170) + ',' + PY + '" fill="none" stroke="' + INK + '" stroke-width="5"/>'
      + '<g id="pt-take" opacity="0">' + arrow('pt-take-a', 'M' + (PX + 60) + ',' + (PY + 150) + ' C' + (PX + 100) + ',' + (PY + 110) + ' ' + (PX + 112) + ',' + (PY + 70) + ' ' + (PX + 114) + ',' + (PY + 34), '#c2410c', 3.5) + '</g>'
      + txt(20, 30, 'Cornea', 'start') + lead(92, 36, PX - 40, PY - 50)
      + txt(540, 30, 'Inner corner,', 'end') + txt(540, 52, 'beside the nose', 'end', MUTED, 400, 17) + lead(500, 60, PX + 164, PY - 4)
      + '<g id="pt-lab-a" opacity="0">' + txt(280, 424, 'Pinguecula: a yellowish bump on the white', 'middle', '#a16207', 700, 19) + '</g>'
      + '<g id="pt-lab-b" opacity="0">' + txt(280, 424, 'Pterygium: tissue growing onto the cornea', 'middle', '#b91c1c', 700, 19) + '</g>'
      + '<g id="pt-lab-c" opacity="0">' + txt(280, 424, 'Removed; a graft from under the lower lid covers the spot', 'middle', '#c2410c', 700, 18) + '</g>';
    return h + '</svg>';
  }
  var PTERY = {
    views: [['The front of the eye', pterySvg]],
    intro: '<strong>The surface of the eye.</strong> The white of the eye is covered by a thin clear skin, the conjunctiva. Years of sun, wind and dust can change it, most often on the side next to the nose, where reflected sunlight is concentrated.',
    steps: [
      { label: 'Pinguecula', dur: 2200, caption: '<strong>A pinguecula.</strong> A yellowish, slightly raised bump on the white of the eye, beside the cornea. It is very common, harmless, and does not grow onto the cornea. It can get red and irritated; lubricating drops and sunglasses help.',
        draw: function (p) { var e = ease(p); at('pt-ping', 'rx', 15 * e); at('pt-ping', 'ry', 20 * e); op('pt-lab-a', e); } },
      { label: 'Pterygium', dur: 3000, caption: '<strong>A pterygium.</strong> A wedge of tissue with its own blood vessels that grows from the white of the eye onto the cornea, slowly, over years. It causes redness, a gritty feeling and dryness. As it advances it pulls on the cornea and distorts its shape, blurring vision, and it can eventually reach the pupil.',
        draw: function (p) { var e = ease(p); at('pt-wedge-p', 'd', ptWedge(e)); op('pt-wedge', ease(clamp(p * 4, 0, 1))); op('pt-lab-b', e); if (p > 0) { op('pt-lab-a', 1 - e); op('pt-ping', 1 - ease(clamp(p * 4, 0, 1))); } else op('pt-ping', 1); } },
      { label: 'Surgery', dur: 3000, caption: '<strong>Surgery.</strong> The pterygium is removed, and the bare spot is covered with a small graft of your own conjunctiva taken from under the lower eyelid, held with tissue glue or fine stitches. (Amniotic membrane, a thin donor tissue, can be used instead.) The graft is what keeps it from growing back; without one, most return. Sunglasses and a hat matter afterward.',
        draw: function (p) { var a = ease(clamp(p * 2, 0, 1)), b = ease(clamp(p * 2 - 1, 0, 1)); if (p > 0) { op('pt-wedge', 1 - a); op('pt-lab-b', 1 - a); } op('pt-take', p > 0.45 && p < 0.95 ? 1 : 0); op('pt-graft', b); op('pt-lab-c', ease(p)); } }
    ]
  };


  // ---------- corneal transplants: PK, DALK, DSAEK, DMEK ----------
  // One slice through the cornea, wider than the other demos so the edges of
  // the graft show: surface cells, the clear middle layer, the pump layer.
  // The middle of the cornea (KX0..KX1) is drawn as its own pieces, front
  // (kp-hf) and back (kp-hb), so each kind of transplant can take out the
  // layers it replaces. Each step owns what it moves; later steps adjust
  // only when p > 0.
  var KT = 104, KE = 40, KS = KT + KE, KN = KS + 150, KD = 12, KX0 = 170, KX1 = 390;
  // filled, with lines only along the top and bottom, so the pieces meet without a seam
  function kRect(x0, x1, y0, y1, fill, stroke) {
    return '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="' + fill + '"/>'
      + '<path d="M' + x0 + ',' + y0 + ' H' + x1 + ' M' + x0 + ',' + y1 + ' H' + x1 + '" stroke="' + stroke + '" stroke-width="1.5"/>';
  }
  function kLines(x0, x1, y0, y1) { var s = '', y; for (y = y0 + 14; y < y1 - 6; y += 14) s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#93c5fd" stroke-width="1.2"/>'; return s; }
  function kEndo(x0, x1, y, sick) { // the pump layer, on its thin membrane; sick: gaps and bumps
    var s = '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#065f46" stroke-width="2.5"/>', x, i = 0;
    for (x = x0 + 1; x + 20 <= x1; x += 22, i++) {
      if (sick && i % 3 === 1) { s += '<ellipse cx="' + (x + 10) + '" cy="' + (y + 4) + '" rx="7" ry="4" fill="#92400e"/>'; continue; }
      s += '<rect x="' + x + '" y="' + (y + 1) + '" width="20" height="' + (KD - 2) + '" rx="4" fill="' + ENDO + '" stroke="' + ENDO_S + '" stroke-width="1.2"/>';
    }
    return s;
  }
  function kSide(x0, x1, sick) { // the host's own cornea outside the graft
    return kRect(x0, x1, KT, KS, EPI, EPI_S) + kRect(x0, x1, KS, KN, STROMA, '#3b82f6') + kLines(x0, x1, KS, KN) + kEndo(x0, x1, KN, sick);
  }
  var KP_INFO = {
    pk: { sick: false, scar: [KT + 6, KN + KD - 2] },
    dalk: { sick: false, scar: [KT + 10, KN - 40] },
    dsaek: { sick: true },
    dmek: { sick: true }
  };
  function kpSvg(kind) {
    var inner = kind === 'dsaek' || kind === 'dmek', info = KP_INFO[kind];
    var h = svgOpen('0 0 560 440', 'A slice through the cornea: surface cells on top, the clear middle layer, and the pump layer on the inside');
    h += '<ellipse id="kp-bub" cx="280" cy="' + (KN + KD) + '" rx="130" ry="0" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>'
      + kSide(20, KX0, info.sick) + kSide(KX1, 540, info.sick)
      + '<g id="kp-hb">' + kEndo(KX0, KX1, KN, info.sick) + '</g>'
      + '<g id="kp-hf">' + kRect(KX0 - 1, KX1 + 1, KT, KS, EPI, EPI_S) + kRect(KX0 - 1, KX1 + 1, KS, KN, STROMA, '#3b82f6') + kLines(KX0 - 1, KX1 + 1, KS, KN); // overlaps the sides by 1, so no hairline shows
    if (info.scar) h += '<ellipse cx="280" cy="' + ((info.scar[0] + info.scar[1]) / 2) + '" rx="96" ry="' + ((info.scar[1] - info.scar[0]) / 2) + '" fill="#94a3b8" opacity="0.75"/>';
    h += '</g>'
      + '<rect id="kp-haze" x="20" y="' + KS + '" width="520" height="' + (KN - KS) + '" fill="#cbd5e1" opacity="' + (inner ? 0.6 : 0) + '"/>';
    // the cut, then the donor tissue
    var cutTo = kind === 'dalk' ? KN - 2 : KN + KD;
    h += '<g id="kp-cut" opacity="0" stroke="#b91c1c" stroke-width="2.5" stroke-dasharray="6 5">'
      + (inner ? '' : '<line x1="' + KX0 + '" y1="' + (KT - 8) + '" x2="' + KX0 + '" y2="' + cutTo + '"/><line x1="' + KX1 + '" y1="' + (KT - 8) + '" x2="' + KX1 + '" y2="' + cutTo + '"/>')
      + '</g><g id="kp-d" opacity="0">';
    if (kind === 'pk') h += kRect(KX0, KX1, KT, KS, EPI, EPI_S) + kRect(KX0, KX1, KS, KN, STROMA, '#3b82f6') + kLines(KX0, KX1, KS, KN) + kEndo(KX0, KX1, KN, false);
    else if (kind === 'dalk') h += kRect(KX0, KX1, KT, KS, EPI, EPI_S) + kRect(KX0, KX1, KS, KN, STROMA, '#3b82f6') + kLines(KX0, KX1, KS, KN);
    else if (kind === 'dsaek') h += kRect(KX0 + 6, KX1 - 6, KN, KN + 16, STROMA, '#3b82f6') + '<g transform="translate(0,16)">' + kEndo(KX0 + 6, KX1 - 6, KN, false) + '</g>';
    else h += kEndo(KX0 + 6, KX1 - 6, KN, false);
    h += '</g>'
      + '<ellipse id="kp-scroll" cx="280" cy="' + (KN + 70) + '" rx="12" ry="12" fill="none" stroke="' + ENDO_S + '" stroke-width="5" opacity="0"/>'
      + '<g id="kp-sut" opacity="0" fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round">';
    [KX0, KX1].forEach(function (x) { h += '<path d="M' + (x - 22) + ',' + (KT + 2) + ' C' + (x - 16) + ',' + (KN - 50) + ' ' + (x + 16) + ',' + (KN - 50) + ' ' + (x + 22) + ',' + (KT + 2) + '"/>'; });
    h += '</g>'
      + txt(20, 40, 'Front of the cornea', 'start', MUTED, 600, 18) + lead(100, 48, 100, KT + 14)
      + txt(20, 346, 'Pump cells', 'start', ENDO_S, 700, 18) + txt(20, 368, 'keep it clear', 'start', ENDO_S, 400, 16) + lead(70, 328, 70, KN + 8, ENDO_S)
      + txt(540, 384, 'Inside of the eye', 'end', MUTED, 400, 17);
    KP_LABELS[kind].forEach(function (s, i) { h += '<g id="kp-lab-' + i + '"' + (i ? ' opacity="0"' : '') + '>' + txt(280, 430, s, 'middle', s.charAt(0) === '!' ? '#b91c1c' : '#1e3a8a', 700, 19).replace('>!', '>') + '</g>'; });
    return h + '</svg>';
  }
  var KP_LABELS = {
    pk: ['!A scar through every layer', 'A round button is cut out', 'A donor button, all layers', 'Held with fine stitches', 'Clear; stitches out over months'],
    dalk: ['!A scar in the front layers only', 'Front layers removed; pump layer kept', 'Donor front layers laid on top', 'Held with fine stitches', 'Clear, with your own pump cells'],
    dsaek: ['!Worn-out pump cells: swollen, hazy', 'The worn-out pump layer is stripped', 'A thin donor disc slides in', 'A gas bubble presses it up', 'Pumping again: the haze clears'],
    dmek: ['!Worn-out pump cells: swollen, hazy', 'The worn-out pump layer is stripped', 'The donor layer unrolls', 'A gas bubble presses it up', 'Pumping again: the haze clears']
  };
  function kpLabel(k, p) { op('kp-lab-' + k, win(p, 0.06, 0.16)); if (p > 0) op('kp-lab-' + (k - 1), 1 - win(p, 0, 0.06)); else if (k === 1) op('kp-lab-0', 1); }
  function win(p, a, b) { return ease(clamp((p - a) / (b - a), 0, 1)); }
  var KP_VARIANTS = [['dmek', 'DMEK'], ['dsaek', 'DSAEK'], ['dalk', 'Front (DALK)'], ['pk', 'Full (PK)']]; // the most common first
  var KP_TEXT = {
    pk: { intro: '<strong>A scar through every layer.</strong> A slice through the cornea, with the middle of the cornea between the edges. Here a scar, from an infection or injury, runs through all the layers, so light cannot pass clearly. A full-thickness transplant (penetrating keratoplasty, PK) replaces all of them.',
      steps: [['Remove', '<strong>Removing the button.</strong> A round cutter cuts a button, about 8 millimeters across, through every layer of the cornea, and it is lifted out.'],
        ['Donor', '<strong>The donor button.</strong> A matching button of donor cornea, with all its layers, is placed in the opening.'],
        ['Stitches', '<strong>Stitches.</strong> It is held in place with very fine stitches, finer than a hair, all the way around the edge.'],
        ['Healing', '<strong>Healing.</strong> The edges heal slowly. Vision takes six months to a year or more to settle, and the stitches are taken out gradually over months to years. Glasses or a rigid contact lens are often needed afterward. The graft never regains the full strength of a normal cornea, so protect the eye from blows.']] },
    dalk: { intro: '<strong>A scar in the front layers.</strong> In keratoconus, and with scars that do not reach the inside, the pump layer on the inside of the cornea is still healthy. A partial-thickness transplant of the outer layers (DALK) replaces everything in front of it and keeps it.',
      steps: [['Remove', '<strong>Removing the front layers.</strong> The front layers are removed, down to the thin, tough membrane at the back of the cornea, often lifted off it with a bubble of air. Your own pump cells stay in place.'],
        ['Donor', '<strong>The donor tissue.</strong> A donor button of the front layers, with its pump layer taken off, is laid on top of your own.'],
        ['Stitches', '<strong>Stitches.</strong> It is stitched in place, as with a full-thickness graft.'],
        ['Healing', '<strong>Healing.</strong> Because your own pump cells are kept, the most serious kind of rejection cannot happen, and the eye stays stronger than after a full-thickness graft. Recovery is still slow, with the stitches taken out over months.']] },
    dsaek: { intro: '<strong>A failing pump layer.</strong> In Fuchs dystrophy and other pump-cell failure, the cells on the inside of the cornea wear out, so the cornea swells with fluid and turns hazy. Only that layer needs replacing, through a small opening at the edge of the cornea.',
      steps: [['Remove', '<strong>Removing the pump layer.</strong> The worn-out pump layer is gently stripped from the inside of the cornea, leaving the rest of the cornea in place.'],
        ['Donor', '<strong>The donor disc.</strong> A thin disc cut from the back of a donor cornea, with its healthy pump cells, is folded, slid into the eye and unfolded. This is DSAEK.'],
        ['Bubble', '<strong>A gas bubble.</strong> A bubble of gas is placed in the eye. It floats up and presses the disc against the cornea until it sticks. Lying flat on your back, face up, keeps the bubble in the right place. There are no stitches in the cornea.'],
        ['Healing', '<strong>Healing.</strong> The new cells start pumping, the swelling and haze clear, and the bubble is absorbed within days. Vision improves over weeks and is usually stable by three months.']] },
    dmek: { intro: '<strong>A failing pump layer.</strong> In Fuchs dystrophy and other pump-cell failure, the cells on the inside of the cornea wear out, so the cornea swells with fluid and turns hazy. Only that layer needs replacing, through a small opening at the edge of the cornea.',
      steps: [['Remove', '<strong>Removing the pump layer.</strong> The worn-out pump layer is gently stripped from the inside of the cornea, leaving the rest of the cornea in place.'],
        ['Donor', '<strong>The donor layer.</strong> In DMEK the donor tissue is only the pump layer and the thin membrane it sits on, thinner than a hair. It naturally rolls up like a scroll, so it is injected rolled and carefully unrolled inside the eye.'],
        ['Bubble', '<strong>A gas bubble.</strong> A bubble of gas is placed in the eye. It floats up and presses the new layer against the cornea until it sticks. Lying flat on your back, face up, keeps the bubble in the right place. There are no stitches in the cornea.'],
        ['Healing', '<strong>Healing.</strong> The new cells start pumping, the swelling and haze clear, and the bubble is absorbed within days. Because only the pump layer is replaced, vision often recovers faster and sharper than with DSAEK, and rejection is less common. Sometimes the edge lifts and more gas is added in the office.']] }
  };
  function kpProc(kind) {
    var inner = kind === 'dsaek' || kind === 'dmek', T = KP_TEXT[kind], below = 64;
    function donorAt(dy, sx) { at('kp-d', 'transform', 'translate(0,' + dy.toFixed(1) + ') translate(280,0) scale(' + sx.toFixed(3) + ',1) translate(-280,0)'); }
    var draws = [
      function (p) { // remove
        var cut = win(p, 0, 0.35), go = win(p, 0.35, 0.9);
        op('kp-cut', inner ? 0 : cut);
        if (inner) { at('kp-hb', 'transform', 'translate(' + (-420 * go).toFixed(1) + ',0)'); op('kp-hb', 1 - go); at('kp-hf', 'transform', ''); op('kp-hf', 1); }
        else {
          at('kp-hf', 'transform', 'translate(0,' + (-280 * go).toFixed(1) + ')'); op('kp-hf', 1 - go);
          at('kp-hb', 'transform', kind === 'pk' ? 'translate(0,' + (-280 * go).toFixed(1) + ')' : ''); op('kp-hb', kind === 'pk' ? 1 - go : 1);
        }
        kpLabel(1, p);
      },
      function (p) { // donor in
        var a = win(p, 0, 0.7);
        op('kp-d', p > 0 ? 1 : 0);
        if (kind === 'pk' || kind === 'dalk') donorAt(-280 * (1 - a), 1);
        else if (kind === 'dsaek') { var f = win(p, 0, 0.45), u = win(p, 0.45, 0.9); at('kp-d', 'transform', 'translate(' + (-360 * (1 - f)).toFixed(1) + ',' + below + ') translate(280,0) scale(' + (0.35 + 0.65 * u).toFixed(3) + ',1) translate(-280,0)'); }
        else { var r = win(p, 0.15, 0.85); donorAt(below, 0.06 + 0.94 * r); op('kp-scroll', p > 0 ? 1 - r : 0); at('kp-scroll', 'transform', 'scale(1)'); }
        if (kind !== 'dmek') op('kp-scroll', 0);
        kpLabel(2, p);
      },
      function (p) { // stitches or bubble
        var e = ease(p);
        if (inner) {
          var up = win(p, 0.2, 0.85), ry = 38 * win(p, 0, 0.7), top = KN + (kind === 'dsaek' ? KD + 16 : KD) + below * (1 - up);
          at('kp-bub', 'ry', ry); at('kp-bub', 'cy', top + ry);
          if (p > 0) donorAt(below * (1 - up), 1);
          op('kp-sut', 0);
        } else { op('kp-sut', e); at('kp-bub', 'ry', 0); }
        kpLabel(3, p);
      },
      function (p) { // healing
        var e = ease(p);
        if (inner) { op('kp-haze', 0.6 * (1 - e)); if (p > 0) { var ry = 38 * (1 - win(p, 0.3, 1)), top = KN + (kind === 'dsaek' ? KD + 16 : KD); at('kp-bub', 'ry', ry); at('kp-bub', 'cy', top + ry); } }
        else if (p > 0) op('kp-cut', 1 - 0.85 * e);
        kpLabel(4, p);
      }
    ];
    return {
      variants: KP_VARIANTS,
      views: [['A slice through the cornea', function () { return kpSvg(kind); }]],
      intro: T.intro,
      steps: T.steps.map(function (s, i) { return { label: s[0], dur: [3000, 3400, 3200, 3600][i], caption: s[1], draw: draws[i] }; })
    };
  }

  return { abrasion: ABRASION, fuchs: FUCHS, kc: KC, ptery: PTERY, pk: kpProc('pk'), dalk: kpProc('dalk'), dsaek: kpProc('dsaek'), dmek: kpProc('dmek') };
});
