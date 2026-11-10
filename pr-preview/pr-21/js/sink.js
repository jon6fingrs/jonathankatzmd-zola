/* Eye pressure "sink" (content/learn/eye-pressure.md).
 *
 * The eye as a sink: a faucet that never turns off (the ciliary body making
 * fluid), a main drain (the trabecular meshwork), a small side drain (the
 * uveoscleral path) and, after surgery, a new drain. The water level is the
 * eye pressure. Each treatment chip changes one of those, and the level
 * settles to the new balance.
 *
 * The numbers come from the usual steady-state balance (Goldmann):
 *     made = side drain + main drain x (P - back pressure) + new drain x (P - its back pressure)
 * with round example values for one imaginary eye. They are for
 * understanding, not a prediction of anyone's result; the page says so.
 *
 * Layout: on a phone the picture sticks to the top of the screen while the
 * chips scroll under it, so a tap and its effect are on screen together.
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-sink');
  if (!root) return;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FONT = 'font-family="Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"';
  var INK = '#1f2937', BLUE = '#2a6ebb', MUTED = '#5b6573', WATER = '#93c5fd';

  // ---------- the model ----------
  // F: fluid made; C: how easily the main drain lets it through; U: side
  // drain; PE: back pressure in the veins the main drain empties into.
  var BASE = { F: 2.4, C: 0.11, U: 0.25 }, HEALTHY_C = 0.27, PE = 9;
  // where: which part of the sink the treatment acts on
  var TREATMENTS = [
    { id: 'less', group: 'faucet', label: 'Drops: make less fluid', where: 'faucet', apply: function (m) { m.F *= 0.72; },
      about: '<strong>Drops that turn down the faucet</strong> (timolol, dorzolamide, brinzolamide, brimonidine) make the eye produce less fluid.', link: ['../using-eye-drops/', 'Using eye drops'] },
    { id: 'cpc', group: 'faucet', label: 'Micropulse / CPC laser', where: 'faucet', apply: function (m) { m.F *= 0.65; },
      about: '<strong>Cyclophotocoagulation</strong> is a laser applied to the outside of the eye. It quiets the tissue that makes the fluid, turning down the faucet for months or years.' },
    { id: 'side', group: 'drain', label: 'Drops: open the side drain', where: 'side', apply: function (m) { m.U = 1.15; },
      about: '<strong>Prostaglandin drops</strong> (latanoprost, travoprost, bimatoprost, tafluprost) open up the eye&rsquo;s second, smaller way out. They are used once a day and are often the first drop tried.', link: ['../using-eye-drops/', 'Using eye drops'] },
    { id: 'main', group: 'drain', label: 'Drops: open the main drain', where: 'main', apply: function (m) { m.C *= 1.3; },
      about: '<strong>Netarsudil</strong> (Rhopressa) relaxes the main drain so fluid passes through it more easily.', link: ['../using-eye-drops/', 'Using eye drops'] },
    { id: 'slt', group: 'drain', label: 'SLT laser', where: 'main', apply: function (m) { m.C *= 1.55; },
      about: '<strong>SLT laser</strong> treats the main drain itself. Over a few weeks the drain clears and lets more fluid through. Nothing is cut.', link: ['../slt-laser/', 'SLT laser'] },
    { id: 'migs', group: 'drain', label: 'MIGS', where: 'main', apply: function (m) { m.C *= 1.5; },
      about: '<strong>MIGS</strong> (a tiny stent, or opening part of the drain) gives fluid a shortcut past the clogged part of the main drain. It is often done with cataract surgery.', link: ['../migs/', 'MIGS'] },
    { id: 'trab', group: 'new', label: 'Trabeculectomy', where: 'new', drain: [0.2, 6], apply: function () {},
      about: '<strong>Trabeculectomy</strong> makes a new drain: a small opening in the wall of the eye, so fluid collects in a pocket (bleb) under the upper eyelid and is absorbed there.', link: ['../trabeculectomy/', 'Trabeculectomy'] },
    { id: 'tube', group: 'new', label: 'Tube shunt', where: 'new', drain: [0.13, 7], apply: function () {},
      about: '<strong>A tube shunt</strong> is a new drain made of a tiny tube that carries fluid to a plate on the wall of the eye, where it is absorbed.', link: ['../tube-shunt-surgery/', 'Tube shunt surgery'] }
  ];
  var GROUPS = [['faucet', 'Turn down the faucet'], ['drain', 'Open the drains'], ['new', 'Add a new drain']];

  function solve(on, healthy) {
    var m = { F: BASE.F, C: healthy ? HEALTHY_C : BASE.C, U: BASE.U }, num, den;
    var extra = [];
    TREATMENTS.forEach(function (t) { if (on[t.id]) { t.apply(m); if (t.drain) extra.push(t.drain); } });
    num = m.F - m.U + m.C * PE; den = m.C;
    extra.forEach(function (d) { num += d[0] * d[1]; den += d[0]; });
    var P = Math.max(8, num / den);
    m.P = P;
    m.mainFlow = Math.max(0, m.C * (P - PE));
    m.newFlow = 0; extra.forEach(function (d) { m.newFlow += Math.max(0, d[0] * (P - d[1])); });
    m.hasNew = extra.length > 0;
    return m;
  }

  // ---------- the picture ----------
  var BOWL = { x0: 150, x1: 410, top: 120, bottom: 340 };
  var P_MIN = 5, P_MAX = 34;
  function levelY(P) { return BOWL.bottom - (Math.min(P, P_MAX) - P_MIN) / (P_MAX - P_MIN) * (BOWL.bottom - BOWL.top - 6); }
  function txt(x, y, s, anchor, color, weight, size) {
    return '<text x="' + x + '" y="' + y + '" ' + FONT + ' font-size="' + (size || 20) + '" font-weight="' + (weight || 600) + '" fill="' + (color || INK) + '" text-anchor="' + (anchor || 'start') + '">' + s + '</text>';
  }
  function svg() {
    var bowl = 'M' + BOWL.x0 + ',' + BOWL.top + ' L' + BOWL.x0 + ',' + (BOWL.bottom - 26) + ' Q' + BOWL.x0 + ',' + BOWL.bottom + ' ' + (BOWL.x0 + 26) + ',' + BOWL.bottom
      + ' L' + (BOWL.x1 - 26) + ',' + BOWL.bottom + ' Q' + BOWL.x1 + ',' + BOWL.bottom + ' ' + BOWL.x1 + ',' + (BOWL.bottom - 26) + ' L' + BOWL.x1 + ',' + BOWL.top;
    var h = '<svg class="jk-lpi__svg" viewBox="0 0 560 440" role="img" aria-labelledby="jk-sink-t">'
      + '<title id="jk-sink-t">The eye drawn as a sink: a faucet, drains, and a water level that stands for eye pressure</title>'
      + '<defs>'
      + '<clipPath id="sink-bowl"><path d="' + bowl + ' Z"/></clipPath>'
      + '<pattern id="sink-tm" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fde68a"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" stroke-width="2"/></pattern>'
      + '</defs>'
      + '<rect width="560" height="440" fill="#fff"/>'
      // pressure zones behind the water
      + '<g clip-path="url(#sink-bowl)">'
      + '<rect x="' + BOWL.x0 + '" y="' + BOWL.top + '" width="260" height="' + (levelY(21) - BOWL.top) + '" fill="#fee2e2"/>'
      + '<rect id="sink-water" x="' + BOWL.x0 + '" width="260" y="300" height="60" fill="' + WATER + '" opacity="0.9"/>'
      + '<rect id="sink-surface" x="' + BOWL.x0 + '" width="260" y="300" height="3" fill="#3b82f6"/>'
      + '</g>'
      + '<line x1="' + BOWL.x0 + '" y1="' + levelY(21) + '" x2="' + BOWL.x1 + '" y2="' + levelY(21) + '" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="6 5"/>'
      // side drain (left wall), new drain (right wall), main drain (bottom)
      + '<path d="M' + BOWL.x0 + ',306 L112,306 L112,372" fill="none" stroke="#6b7280" stroke-width="16" stroke-linejoin="round"/>'
      + '<path d="M' + BOWL.x0 + ',306 L112,306 L112,372" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round"/>'
      + '<path id="sink-sideflow" d="M' + (BOWL.x0 + 2) + ',306 L112,306 L112,392" fill="none" stroke="' + WATER + '" stroke-linejoin="round" stroke-width="2"/>'
      + '<g id="sink-new">'
      + '<path d="M' + BOWL.x1 + ',296 L462,296 L462,330" fill="none" stroke="#6b7280" stroke-width="18" stroke-linejoin="round"/>'
      + '<path d="M' + BOWL.x1 + ',296 L462,296 L462,330" fill="none" stroke="#fff" stroke-width="13" stroke-linejoin="round"/>'
      + '<path id="sink-newflow" d="M' + (BOWL.x1 - 2) + ',296 L462,296 L462,340" fill="none" stroke="' + WATER + '" stroke-linejoin="round" stroke-width="2"/>'
      + '<ellipse cx="462" cy="358" rx="48" ry="22" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>'
      + '<text id="sink-newlab" x="488" y="274" ' + FONT + ' font-size="20" font-weight="600" fill="' + INK + '" text-anchor="middle">New drain</text>'
      + '</g>'
      + '<rect x="258" y="' + BOWL.bottom + '" width="44" height="62" fill="#fff" stroke="#6b7280" stroke-width="2.5"/>'
      + '<rect id="sink-mainflow" x="276" y="' + (BOWL.bottom + 8) + '" width="8" height="92" fill="' + WATER + '"/>'
      + '<rect x="250" y="' + (BOWL.bottom - 5) + '" width="60" height="12" rx="3" fill="url(#sink-tm)" stroke="#b45309" stroke-width="1.5"/>'
      + '<g id="sink-clog" fill="#92400e"></g>'
      // the bowl
      + '<path d="' + bowl + '" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
      // faucet and stream
      + '<rect id="sink-stream" x="276" y="96" width="8" height="200" fill="' + WATER + '"/>'
      + '<path d="M40,60 L262,60 Q282,60 282,80 L282,98" fill="none" stroke="#6b7280" stroke-width="22" stroke-linecap="butt" stroke-linejoin="round"/>'
      + '<path d="M40,60 L262,60 Q282,60 282,80 L282,98" fill="none" stroke="#e5e7eb" stroke-width="16" stroke-linejoin="round"/>'
      + '<rect x="196" y="28" width="12" height="24" fill="#6b7280"/><rect x="178" y="18" width="48" height="12" rx="6" fill="#6b7280"/>'
      // highlight ring for the part a treatment acts on
      + '<circle id="sink-ring" r="34" fill="none" stroke="#f59e0b" stroke-width="5" opacity="0"/>'
      // labels
      + txt(20, 108, 'Faucet') + txt(20, 130, 'fluid is made', 'start', MUTED, 400, 17)
      + txt(318, 392, 'Main drain') + txt(318, 414, 'the meshwork', 'start', MUTED, 400, 17)
      + txt(100, 418, 'Side drain', 'middle')
      + txt(BOWL.x1 - 8, levelY(21) - 8, 'High', 'end', '#b91c1c', 600, 17)
      + txt(BOWL.x1 - 8, levelY(21) + 20, 'Usual range', 'end', '#1e3a8a', 600, 17)
      // gauge
      + '<g id="sink-gauge"><rect x="398" y="14" width="150" height="86" rx="10" fill="#fff" stroke="#d9dee5" stroke-width="2"/>'
      + txt(473, 36, 'Eye pressure', 'middle', MUTED, 600, 15)
      + '<text id="sink-num" x="473" y="78" ' + FONT + ' font-size="40" font-weight="700" fill="' + INK + '" text-anchor="middle">28</text>'
      + txt(473, 94, 'mm Hg (example)', 'middle', MUTED, 400, 13) + '</g>'
      + '</svg>';
    return h;
  }

  // ---------- markup ----------
  var h = '<div class="jk-sink__grid"><figure class="jk-sink__pic">' + svg() + '<figcaption class="jk-sink__about" id="jk-sink-about" aria-live="polite"></figcaption></figure><div class="jk-sink__side">'
    + '<div class="jk-vis__opt jk-sink__opt"><span class="jk-vis__lab">Start with</span><div class="jk-chips" role="group" aria-label="Start with">'
    + '<button type="button" class="jk-chip jk-chip--sm" data-eye="glaucoma" aria-pressed="true">Glaucoma: clogged drain</button>'
    + '<button type="button" class="jk-chip jk-chip--sm" data-eye="healthy" aria-pressed="false">Healthy eye</button></div></div>';
  GROUPS.forEach(function (g) {
    h += '<div class="jk-vis__opt jk-sink__opt"><span class="jk-vis__lab">' + g[1] + '</span><div class="jk-chips" role="group" aria-label="' + g[1] + '">';
    TREATMENTS.forEach(function (t) { if (t.group === g[0]) h += '<button type="button" class="jk-chip jk-chip--sm" data-treat="' + t.id + '" aria-pressed="false">' + t.label + '</button>'; });
    h += '</div></div>';
  });
  h += '<div class="jk-lpi__controls jk-sink__controls"><button type="button" class="btn btn-outline-secondary" id="jk-sink-clear">Clear all</button>'
    + '<button type="button" class="btn btn-outline-secondary jk-lpi__full" id="jk-sink-full" hidden>Full screen</button></div>'
    + '</div></div>';
  root.innerHTML = h;

  function $(id) { return document.getElementById(id); }
  var el = {
    water: $('sink-water'), surface: $('sink-surface'), stream: $('sink-stream'), mainflow: $('sink-mainflow'), sideflow: $('sink-sideflow'),
    newg: $('sink-new'), newflow: $('sink-newflow'), newlab: $('sink-newlab'), clog: $('sink-clog'), ring: $('sink-ring'), num: $('sink-num'),
    about: $('jk-sink-about'), full: $('jk-sink-full')
  };

  // ---------- state and drawing ----------
  var on = {}, healthy = false, last = null;
  var shown = null, target = null, raf = 0, ringT = 0;
  var RING = { faucet: [282, 84], main: [280, 342], side: [130, 306], new: [436, 296] };

  function intro() {
    return healthy
      ? '<strong>A healthy eye.</strong> The faucet runs all day and the drain keeps up, so the level stays in the usual range.'
      : '<strong>Glaucoma.</strong> The faucet runs as usual, but the main drain is partly clogged. Fluid backs up and the pressure rises. Tap a treatment to see what it changes.';
  }
  function draw(v) {
    var y = levelY(v.P);
    el.water.setAttribute('y', y.toFixed(1)); el.water.setAttribute('height', (BOWL.bottom - y + 2).toFixed(1));
    el.surface.setAttribute('y', (y - 1.5).toFixed(1));
    var sw = 3 + v.F * 4.5;
    el.stream.setAttribute('x', (282 - sw / 2).toFixed(1)); el.stream.setAttribute('width', sw.toFixed(1)); el.stream.setAttribute('height', Math.max(0, y - 96).toFixed(1));
    var mw = Math.min(36, 1 + v.mainFlow * 11);
    el.mainflow.setAttribute('x', (280 - mw / 2).toFixed(1)); el.mainflow.setAttribute('width', mw.toFixed(1));
    el.sideflow.setAttribute('stroke-width', Math.min(10, 1 + v.U * 6).toFixed(1));
    el.newflow.setAttribute('stroke-width', Math.min(12, 1 + v.newFlow * 6).toFixed(1));
    el.newg.style.opacity = v.newShow.toFixed(2);
    el.clog.style.opacity = clamp((HEALTHY_C - v.C) / (HEALTHY_C - BASE.C), 0, 1).toFixed(2);
    el.num.textContent = String(Math.round(v.P));
    el.num.setAttribute('fill', v.P > 21.4 ? '#b91c1c' : INK);
  }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function tick(now) {
    var done = true, k;
    for (k in target) {
      var d = target[k] - shown[k];
      if (Math.abs(d) > 0.004) { shown[k] += d * 0.07; done = false; } else shown[k] = target[k];
    }
    draw(shown);
    if (ringT) {
      var q = (now - ringT) / 1600;
      if (q >= 1) { ringT = 0; el.ring.style.opacity = 0; }
      else { el.ring.style.opacity = (1 - q).toFixed(2); el.ring.setAttribute('r', (26 + 14 * Math.abs(Math.sin(q * Math.PI * 2))).toFixed(1)); done = false; }
    }
    raf = done ? 0 : requestAnimationFrame(tick);
  }
  function update() {
    var m = solve(on, healthy);
    target = { P: m.P, F: m.F, C: m.C, U: m.U, mainFlow: m.mainFlow, newFlow: m.newFlow, newShow: m.hasNew ? 1 : 0 };
    el.newlab.textContent = on.tube && !on.trab ? 'Tube and plate' : on.trab && !on.tube ? 'Bleb' : 'New drain';
    root.querySelectorAll('[data-treat]').forEach(function (b) {
      var a = !!on[b.getAttribute('data-treat')]; b.classList.toggle('is-active', a); b.setAttribute('aria-pressed', String(a));
    });
    root.querySelectorAll('[data-eye]').forEach(function (b) {
      var a = (b.getAttribute('data-eye') === 'healthy') === healthy; b.classList.toggle('is-active', a); b.setAttribute('aria-pressed', String(a));
    });
    var t = last && on[last.id] ? last : null;
    el.about.innerHTML = t ? t.about + (t.link ? ' <a href="' + t.link[0] + '">' + t.link[1] + ' &rarr;</a>' : '') : intro();
    if (!shown || REDUCED) { shown = {}; for (var k in target) shown[k] = target[k]; draw(shown); el.ring.style.opacity = 0; ringT = 0; return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // clog specks over the main drain
  (function () {
    var s = 3, hh = '';
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (var i = 0; i < 16; i++) hh += '<circle cx="' + (254 + rnd() * 52).toFixed(1) + '" cy="' + (BOWL.bottom - 8 + rnd() * 10).toFixed(1) + '" r="' + (2 + rnd() * 2.5).toFixed(1) + '"/>';
    el.clog.innerHTML = hh;
  })();

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-treat')) {
      var id = b.getAttribute('data-treat');
      on[id] = !on[id];
      TREATMENTS.forEach(function (t) { if (t.id === id) last = t; });
      if (on[id] && !REDUCED) {
        var p = RING[last.where];
        el.ring.setAttribute('cx', p[0]); el.ring.setAttribute('cy', p[1]); ringT = performance.now();
      }
      update();
    } else if (b.hasAttribute('data-eye')) {
      healthy = b.getAttribute('data-eye') === 'healthy'; last = null; update();
    } else if (b.id === 'jk-sink-clear') {
      on = {}; last = null; update();
    }
  });

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

  update();
  root.classList.add('is-ready');
})();
