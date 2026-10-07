/* Vision simulator (content/learn/vision-loss.md).
 *
 * Shows what common eye conditions do to an everyday scene. Everything is
 * rendered in the browser from one photo and CSS: no server, no canvas
 * copies of the picture, no upload.
 *
 * Layers inside the stage, bottom to top:
 *   .jk-vis__base   the untouched photo (the "normal" side of the divider)
 *   .jk-vis__sim    clipped by the compare divider; holds:
 *     .jk-vis__sharp   the photo with whole-image filters (blur, cataract
 *                      tint, astigmatism, color vision) — CSS or SVG filters
 *     .jk-vis__warp    the photo through an SVG displacement filter, masked
 *                      to the center (wet macular degeneration distortion)
 *     .jk-vis__lost    a blurred, dimmed copy masked to the regions of lost
 *                      vision (glaucoma, macular degeneration, retinopathy,
 *                      detachment, stroke). Lost regions are rendered as the
 *                      brain experiences them — smeared and detail-free, not
 *                      black — unless the "blackout" toggle is on.
 *     .jk-vis__overlay gradients: glare halos, haze, the detachment curtain
 *     .jk-vis__floaters an inline SVG of drifting floaters
 *
 * Masks are tiny canvases (a grid of alpha values) scaled up by the
 * browser, which gives smooth, soft-edged regions with no filter support
 * needed. State lives in the query string (JK.url) so a view can be shared
 * or opened from the QR code.
 *
 * Prescription mode (data-mode="rx" on the root, used by
 * content/learn/glasses-prescription.md) swaps the condition list for a
 * glasses prescription, a viewing distance and with/without glasses. The
 * optics are in rx-optics.js; here they become one more layer:
 *     .jk-vis__rx      the photo blurred by different amounts along and
 *                      across the cylinder axis. CSS filters run in an
 *                      element's own coordinates, before its transform, so
 *                      the blur box is rotated to the axis and the photo
 *                      inside it rotated back: the picture stays upright and
 *                      the smear lies along the axis.
 */
(function () {
  'use strict';

  var root = document.getElementById('jk-vision');
  if (!root || !window.JK) return;

  var BASE = new URL(root.getAttribute('data-base') || './', window.location.href).href;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MODE = root.getAttribute('data-mode') === 'rx' ? 'rx' : 'conditions';
  var RX = window.JKRxOptics;
  if (MODE === 'rx' && !RX) return;

  // ---------- scenes ----------
  // lights: bright points (percent of width/height) that cataract glare
  // wraps halos around.
  var SCENES = [
    { id: 'table', file: 'table.webp', label: 'Family breakfast', w: 960, h: 640, lights: [] },
    { id: 'street', file: 'street.webp', label: 'Crossing the street', w: 960, h: 640, lights: [] },
    { id: 'night', file: 'night.webp', label: 'City at night', w: 1400, h: 933,
      lights: [[13.6, 37.5], [35.6, 67.3], [53.9, 68], [58.9, 65.2], [77, 59], [88.5, 54], [61.5, 91], [73, 78], [86, 70], [92.7, 59]] },
    { id: 'kitchen', file: 'kitchen.webp', label: 'Kitchen', w: 1024, h: 683, lights: [[47.7, 16.7]] },
    { id: 'reading', file: 'reading.webp', label: 'Reading the paper', w: 960, h: 641, lights: [] }
  ];

  // ---------- conditions ----------
  // Each has: label, the scene it opens on, severity labels for the slider,
  // optional `options` (a second control row), and `apply(s, ctx)` where
  // s is severity 0..1. `apply` returns nothing; it mutates ctx.* fields
  // that render() then writes to the layers.
  var SEVERITY_DEFAULT = ['Mild', 'Moderate', 'Advanced'];

  var CONDITIONS = [
    {
      id: 'glaucoma', label: 'Glaucoma', scene: 'table', severity: ['Early', 'Moderate', 'Advanced'],
      options: [
        { key: 'pattern', label: 'Pattern', values: [['arcuate', 'Typical'], ['nasal', 'Nasal step'], ['paracentral', 'Near the center'], ['tunnel', 'Tunnel'], ['paint', 'Paint your own']] },
        { key: 'eye', label: 'Eye', values: [['r', 'Right eye'], ['l', 'Left eye']] },
        { key: 'black', label: 'Show lost areas as', values: [['0', 'Filled in (realistic)'], ['1', 'Black']] }
      ],
      apply: function (s, ctx) {
        ctx.lostMask = glaucomaMask(s, ctx.opt.pattern, ctx.opt.eye === 'l', ctx.grid);
        ctx.lostBlack = ctx.opt.black === '1';
        ctx.lostBlur = 14 + 16 * s;
        ctx.lostDim = 0.98 - 0.1 * s;
      }
    },
    {
      id: 'cataract', label: 'Cataract', scene: 'night', severity: SEVERITY_DEFAULT,
      apply: function (s, ctx) {
        ctx.sharpFilter = 'blur(' + px(0.4 + 2.2 * s) + ') contrast(' + (1 - 0.3 * s).toFixed(2) + ') sepia(' + (0.5 * s).toFixed(2) + ') brightness(' + (1 + 0.05 * s).toFixed(2) + ') saturate(' + (1 - 0.2 * s).toFixed(2) + ')';
        var g = [];
        ctx.scene.lights.forEach(function (p) {
          var r = 3 + 13 * s;
          g.push('radial-gradient(circle at ' + p[0] + '% ' + p[1] + '%, rgba(255,243,210,' + (0.9 * s).toFixed(2) + ') 0, rgba(255,236,190,' + (0.4 * s).toFixed(2) + ') ' + (r * 0.4).toFixed(1) + '%, transparent ' + r.toFixed(1) + '%)');
        });
        g.push('linear-gradient(rgba(255,246,228,' + (0.14 * s).toFixed(2) + '), rgba(255,246,228,' + (0.14 * s).toFixed(2) + '))');
        ctx.overlay = g.join(', ');
        ctx.overlayBlend = 'screen';
      }
    },
    {
      id: 'amd', label: 'Macular degeneration', scene: 'table', severity: ['Early', 'Intermediate', 'Advanced'],
      options: [{ key: 'type', label: 'Type', values: [['dry', 'Dry'], ['wet', 'Wet']] }],
      apply: function (s, ctx) {
        var wet = ctx.opt.type === 'wet';
        if (wet) {
          ctx.warpMask = radialMask(0.5, 0.5, 0.14 + 0.26 * s, 0.12);
          ctx.warpScale = 8 + 36 * s;
          ctx.lostMask = s > 0.35 ? radialMask(0.5, 0.5, 0.03 + 0.2 * (s - 0.35), 0.08) : null;
        } else {
          ctx.lostMask = radialMask(0.5, 0.5, 0.06 + 0.26 * s, 0.1);
        }
        ctx.lostBlur = 16 + 10 * s;
        ctx.lostDim = 0.94 - 0.18 * s;
        ctx.sharpFilter = 'contrast(' + (1 - 0.1 * s).toFixed(2) + ')';
      }
    },
    {
      id: 'dr', label: 'Diabetic retinopathy', scene: 'street', severity: SEVERITY_DEFAULT,
      apply: function (s, ctx) {
        ctx.sharpFilter = 'blur(' + px(0.3 + 2.2 * s) + ') contrast(' + (1 - 0.15 * s).toFixed(2) + ')';
        ctx.lostMask = blobMask(3 + Math.round(8 * s), 0.045 + 0.06 * s, 7);
        ctx.lostBlur = 10;
        ctx.lostDim = 0.7 - 0.3 * s;
        ctx.floaters = s > 0.6 ? 2 : 0;
        ctx.floaterOpacity = 0.35;
      }
    },
    {
      id: 'rd', label: 'Retinal detachment', scene: 'street', severity: ['Starting', 'Spreading', 'Near the center'],
      options: [{ key: 'side', label: 'Curtain from', values: [['top', 'Above'], ['bottom', 'Below'], ['left', 'The left'], ['right', 'The right']] }],
      apply: function (s, ctx) {
        ctx.lostMask = curtainMask(ctx.opt.side, 0.12 + 0.55 * s);
        ctx.lostBlack = false;
        ctx.lostBlur = 16;
        ctx.lostDim = 0.25;
        ctx.floaters = 3;
        ctx.floaterOpacity = 0.3;
      }
    },
    {
      id: 'hemi', label: 'Stroke (half the field)', scene: 'street', severity: ['Partial', 'Dense', 'Complete'],
      options: [{ key: 'side', label: 'Side lost', values: [['left', 'Left half'], ['right', 'Right half']] }],
      apply: function (s, ctx) {
        ctx.lostMask = halfMask(ctx.opt.side === 'right', 0.35 + 0.65 * s);
        ctx.lostBlur = 16 + 10 * s;
        ctx.lostDim = 0.6 - 0.35 * s;
      }
    },
    {
      id: 'myopia', label: 'Needing glasses', scene: 'street', severity: SEVERITY_DEFAULT,
      apply: function (s, ctx) {
        ctx.sharpFilter = 'blur(' + px(1 + 7 * s) + ')';
      }
    },
    {
      id: 'astig', label: 'Astigmatism', scene: 'night', severity: SEVERITY_DEFAULT,
      apply: function (s, ctx) {
        ctx.astig = { sx: 0.4 + 4.6 * s, sy: 0.15 + 0.6 * s, ghost: 1 + 5 * s, alpha: 0.35 + 0.25 * s };
        ctx.sharpFilter = 'url(#jk-vis-astig)';
      }
    },
    {
      id: 'dryeye', label: 'Dry eye', scene: 'reading', severity: SEVERITY_DEFAULT,
      apply: function (s, ctx) {
        ctx.dryeye = 0.8 + 3.2 * s;
        ctx.sharpFilter = 'blur(' + px(ctx.dryeye * 0.5) + ') contrast(0.95)';
      }
    },
    {
      id: 'floaters', label: 'Floaters', scene: 'reading', severity: ['A few', 'Several', 'Many'],
      apply: function (s, ctx) {
        ctx.floaters = 2 + Math.round(6 * s);
        ctx.floaterOpacity = 0.28 + 0.22 * s;
      }
    },
    {
      id: 'color', label: 'Color blindness', scene: 'table', severity: ['Mild', 'Moderate', 'Complete'],
      options: [{ key: 'type', label: 'Type', values: [['deutan', 'Red–green (deutan)'], ['protan', 'Red–green (protan)'], ['tritan', 'Blue–yellow (tritan)']] }],
      apply: function (s, ctx) {
        ctx.colorMatrix = colorMatrix(ctx.opt.type, s);
        ctx.sharpFilter = 'url(#jk-vis-color)';
      }
    }
  ];

  // Severity px values are tuned for a 900px-wide stage; scale with it.
  var stageScale = 1;
  function px(v) { return (v * stageScale).toFixed(2) + 'px'; }

  // ---------- masks ----------
  // A mask is a small canvas whose alpha channel is "how lost" each cell is.
  // The browser scales it to the stage with smoothing, so a 24-cell grid
  // becomes a soft-edged shape. Returned as a data URL.
  var MASK_N = 48;
  function maskFromFn(fn) {
    var n = MASK_N, c = document.createElement('canvas');
    c.width = n; c.height = n;
    var ctx = c.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var a = fn((i + 0.5) / n, (j + 0.5) / n); // 0..1, u right, v down
        var k = (j * n + i) * 4;
        d[k] = 0; d[k + 1] = 0; d[k + 2] = 0; d[k + 3] = Math.round(clamp(a, 0, 1) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    // A second pass at 4x with smoothing rounds the cells off a little more.
    var c2 = document.createElement('canvas');
    c2.width = n * 4; c2.height = n * 4;
    var x2 = c2.getContext('2d');
    x2.imageSmoothingEnabled = true;
    x2.imageSmoothingQuality = 'high';
    x2.drawImage(c, 0, 0, c2.width, c2.height);
    return c2.toDataURL();
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(edge0, edge1, x) { var t = clamp((x - edge0) / (edge1 - edge0), 0, 1); return t * t * (3 - 2 * t); }

  // soft disc centered (cx, cy) radius r (fractions of width), feather f
  function radialMask(cx, cy, r, f) {
    return maskFromFn(function (u, v) {
      var d = Math.hypot(u - cx, (v - cy) * 0.75); // scenes are ~3:2; keep it round
      return 1 - smooth(r, r + f, d);
    });
  }
  // half of the field, soft vertical edge, small central sparing
  function halfMask(rightSide, depth) {
    return maskFromFn(function (u, v) {
      var x = rightSide ? u : 1 - u;
      var side = smooth(0.47, 0.55, x);
      var spare = 1 - smooth(0.04, 0.09, Math.hypot(u - 0.5, (v - 0.5) * 0.75));
      return side * depth * (1 - 0.5 * spare);
    });
  }
  // a curtain creeping in from one edge, wavy leading edge
  function curtainMask(side, extent) {
    return maskFromFn(function (u, v) {
      var along, across;
      if (side === 'top') { along = v; across = u; }
      else if (side === 'bottom') { along = 1 - v; across = u; }
      else if (side === 'left') { along = u; across = v; }
      else { along = 1 - u; across = v; }
      var wave = 0.05 * Math.sin(across * 9.4) + 0.03 * Math.sin(across * 23 + 1.3);
      return 1 - smooth(extent + wave - 0.06, extent + wave + 0.08, along);
    });
  }
  // scattered patches at fixed pseudo-random spots
  function blobMask(count, radius, seed) {
    var pts = [], rnd = lcg(seed);
    for (var i = 0; i < count; i++) {
      // two overlapping ellipses per patch so they are not perfect circles
      var cx = 0.08 + 0.84 * rnd(), cy = 0.1 + 0.8 * rnd(), r = radius * (0.6 + 0.8 * rnd()), ang = rnd() * Math.PI;
      pts.push([cx, cy, r, 1 + rnd() * 0.8]);
      pts.push([cx + Math.cos(ang) * r * 0.8, cy + Math.sin(ang) * r * 0.6, r * (0.5 + 0.5 * rnd()), 1 + rnd() * 0.8]);
    }
    return maskFromFn(function (u, v) {
      var a = 0;
      pts.forEach(function (p) {
        var d = Math.hypot((u - p[0]) * p[3], (v - p[1]) * 0.75);
        a = Math.max(a, 0.9 * (1 - smooth(p[2] * 0.5, p[2] * 1.4, d)));
      });
      return a;
    });
  }
  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Glaucoma: each cell has an "onset" (0 = goes first). Loss at severity s
  // is how far past its onset the cell is. Coordinates: x nasal-positive
  // for the chosen eye, y up-positive, both -1..1 across the image.
  function glaucomaMask(s, pattern, leftEye, grid) {
    if (pattern === 'paint') {
      var depth = 0.5 + 0.5 * s;
      return maskFromFn(function (u, v) {
        var gi = clamp(Math.floor(u * 8), 0, 7), gj = clamp(Math.floor(v * 8), 0, 7);
        var lv = grid[gj * 8 + gi] || 0;
        return lv === 2 ? depth : lv === 1 ? 0.55 * depth : 0;
      });
    }
    return maskFromFn(function (u, v) {
      // nasal field is on the temporal side of the image: for the right eye,
      // the nasal field is the viewer's left.
      var x = (u - 0.5) * 2, y = (0.5 - v) * 2;
      if (!leftEye) x = -x;
      var r = Math.hypot(x, y * 0.85);
      var onset;
      if (pattern === 'tunnel') {
        onset = 1.05 - r * 0.8;
      } else if (pattern === 'nasal') {
        var wedge = (x > 0.08 && y > -0.05) ? 0.1 + r * 0.35 : 0.75 + r * 0.3;
        onset = Math.min(wedge, 1.15 - r * 0.6);
      } else if (pattern === 'paracentral') {
        var d = Math.hypot(x - 0.28, (y - 0.32) * 0.85);
        onset = Math.min(0.05 + d * 1.6, 1.15 - r * 0.6);
      } else {
        // arcuate: superior arc first (nasal end earliest), inferior arc
        // later, far periphery closes in, center last
        var arc = Math.abs(Math.hypot(x, (y - 0.03) * 0.85) - 0.62);
        var sup = y > 0 ? 0.04 + arc * 1.1 + (x < 0 ? 0.18 : 0) : 9;
        var inf = y <= 0 ? 0.42 + arc * 1.1 + (x < 0 ? 0.12 : 0) : 9;
        var periph = 1.25 - r * 0.7;
        onset = Math.min(sup, inf, periph);
      }
      var center = Math.hypot(x, y * 0.85);
      if (center < 0.16) onset = Math.max(onset, 0.93 + (0.16 - center));
      return clamp((s - onset) / 0.3, 0, 1);
    });
  }

  // ---------- color vision ----------
  // Machado et al. 2009 full-severity simulation matrices, blended with
  // identity for partial severity.
  var CVD = {
    protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
    tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900]
  };
  function colorMatrix(type, s) {
    var m = CVD[type] || CVD.deutan, I = [1, 0, 0, 0, 1, 0, 0, 0, 1], out = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) out.push((I[r * 3 + c] * (1 - s) + m[r * 3 + c] * s).toFixed(4));
      out.push('0', '0');
    }
    out.push('0', '0', '0', '1', '0');
    return out.join(' ');
  }

  // ---------- state ----------
  var state = { scene: 'table', cond: 'glaucoma', sev: 55, opt: {}, grid: defaultGrid(), split: 50 };

  function defaultGrid() {
    // a superior arcuate defect for the right eye, as a starting point
    var g = [];
    for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
      var x = (i + 0.5) / 8 * 2 - 1, y = 1 - (j + 0.5) / 8 * 2;
      var arc = Math.abs(Math.hypot(-x, (y - 0.03) * 0.85) - 0.62);
      g.push(y > 0.1 && arc < 0.22 ? (arc < 0.12 ? 2 : 1) : 0);
    }
    return g;
  }
  function condById(id) { for (var i = 0; i < CONDITIONS.length; i++) if (CONDITIONS[i].id === id) return CONDITIONS[i]; return CONDITIONS[0]; }
  function sceneById(id) { for (var i = 0; i < SCENES.length; i++) if (SCENES[i].id === id) return SCENES[i]; return SCENES[0]; }

  // grid <-> 22-char base64url (64 cells x 2 bits)
  function encodeGrid(g) {
    var bytes = [];
    for (var i = 0; i < 16; i++) {
      var b = 0;
      for (var k = 0; k < 4; k++) b |= (g[i * 4 + k] & 3) << (k * 2);
      bytes.push(b);
    }
    return btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeGrid(s) {
    try {
      var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      if (bin.length !== 16) return null;
      var g = [];
      for (var i = 0; i < 16; i++) { var b = bin.charCodeAt(i); for (var k = 0; k < 4; k++) g.push((b >> (k * 2)) & 3); }
      return g.map(function (v) { return v > 2 ? 2 : v; });
    } catch (e) { return null; }
  }

  function readState() {
    var p = JK.url.read();
    if (p.c && condById(p.c).id === p.c) state.cond = p.c;
    var cond = condById(state.cond);
    state.scene = (p.s && sceneById(p.s).id === p.s) ? p.s : cond.scene;
    if (p.v !== undefined && !isNaN(+p.v)) state.sev = clamp(Math.round(+p.v), 0, 100);
    (cond.options || []).forEach(function (o) {
      var v = p['o_' + o.key];
      if (v && o.values.some(function (pair) { return pair[0] === v; })) state.opt[o.key] = v;
    });
    if (p.g) { var g = decodeGrid(p.g); if (g) state.grid = g; }
  }
  function writeState() {
    var cond = condById(state.cond), o = { c: state.cond, s: state.scene, v: String(state.sev) };
    (cond.options || []).forEach(function (op) {
      var v = state.opt[op.key];
      if (v && v !== op.values[0][0]) o['o_' + op.key] = v;
    });
    if (state.cond === 'glaucoma' && state.opt.pattern === 'paint') o.g = encodeGrid(state.grid);
    return JK.url.write(o);
  }

  // ---------- markup ----------
  var SVG_DEFS = '<svg class="jk-vis__defs" width="0" height="0" aria-hidden="true" focusable="false">'
    + '<defs>'
    + '<filter id="jk-vis-astig" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">'
    + '<feGaussianBlur in="SourceGraphic" stdDeviation="3 0.5" result="b"/>'
    + '<feOffset in="SourceGraphic" dx="0" dy="4" result="o"/>'
    + '<feComponentTransfer in="o" result="og"><feFuncA type="linear" slope="0.4"/></feComponentTransfer>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="og"/></feMerge>'
    + '</filter>'
    + '<filter id="jk-vis-warp" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="2" seed="4" result="n"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G"/>'
    + '</filter>'
    // blur along x and y of the rotated box, then make the faded border
    // opaque again (colors are unpremultiplied, so it keeps the edge color)
    + '<filter id="jk-vis-rx" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">'
    + '<feGaussianBlur in="SourceGraphic" stdDeviation="0 0"/>'
    + '<feComponentTransfer><feFuncA type="linear" slope="40"/></feComponentTransfer>'
    + '</filter>'
    + '<filter id="jk-vis-color" color-interpolation-filters="sRGB">'
    + '<feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/>'
    + '</filter>'
    + '</defs></svg>';

  function build() {
    var h = SVG_DEFS;
    h += '<div class="jk-vis__stage" id="jk-vis-stage" style="--jk-ar: 3 / 2">'
      + '<img class="jk-vis__img jk-vis__base" alt="">'
      + '<div class="jk-vis__sim" id="jk-vis-sim">'
      + '<img class="jk-vis__img jk-vis__sharp" alt="">'
      + '<div class="jk-vis__wrap jk-vis__warpwrap" hidden><img class="jk-vis__img jk-vis__warp" alt=""></div>'
      + '<div class="jk-vis__wrap jk-vis__lostwrap" hidden><img class="jk-vis__img jk-vis__lost" alt=""></div>'
      + '<div class="jk-vis__rx" hidden><div class="jk-vis__rxspin"><img class="jk-vis__rximg" alt=""></div></div>'
      + '<div class="jk-vis__overlay"></div>'
      + '<svg class="jk-vis__floaters" viewBox="0 0 100 66" preserveAspectRatio="none" aria-hidden="true"></svg>'
      + '</div>'
      + '<span class="jk-vis__tag jk-vis__tag--l" aria-hidden="true">Normal</span>'
      + '<span class="jk-vis__tag jk-vis__tag--r" id="jk-vis-tagr" aria-hidden="true">Simulated</span>'
      + '<div class="jk-vis__divider" id="jk-vis-divider" role="slider" tabindex="0" aria-label="Compare: drag to reveal more of the normal or simulated view" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span class="jk-vis__knob" aria-hidden="true">&#9664;&#9654;</span></div>'
      + '</div>';
    h += '<p class="jk-vis__hint">Drag the handle to compare. Hold <button type="button" class="jk-vis__hold" id="jk-vis-hold">Show normal</button> to see the scene without the ' + (MODE === 'rx' ? 'blur' : 'condition') + '.</p>';
    if (MODE === 'rx') h += buildRx(); else h += buildConditions();
    h += '<div class="jk-vis__about" id="jk-vis-about" aria-live="polite"></div>';
    h += '<div class="jk-vis__share">'
      + '<button type="button" class="btn btn-outline-primary btn-sm" id="jk-vis-copy">Copy link to this view</button>'
      + '<span class="jk-vis__copied" id="jk-vis-copied" role="status"></span>'
      + '<div class="jk-qrbox jk-vis__qr"><div class="jk-qr" id="jk-vis-qr"></div><p class="jk-qrbox__cap">Scan to open this view on your phone</p></div>'
      + '</div>';
    root.innerHTML = h;
  }

  function buildConditions() {
    var h = '';
    // scenes
    h += '<div class="jk-vis__row"><span class="jk-vis__lab">Scene</span><div class="jk-vis__scenes" role="group" aria-label="Scene">';
    SCENES.forEach(function (sc) {
      h += '<button type="button" class="jk-vis__scene" data-scene="' + sc.id + '" aria-pressed="false"><img src="' + BASE + sc.file + '" alt="" loading="lazy" width="' + sc.w + '" height="' + sc.h + '"><span>' + sc.label + '</span></button>';
    });
    h += '</div></div>';
    // conditions
    h += '<div class="jk-vis__row"><span class="jk-vis__lab">Condition</span><div class="jk-chips jk-vis__conds" role="group" aria-label="Condition">';
    CONDITIONS.forEach(function (c) {
      h += '<button type="button" class="jk-chip" data-cond="' + c.id + '" aria-pressed="false">' + c.label + '</button>';
    });
    h += '</div></div>';
    // severity
    h += '<div class="jk-vis__row jk-vis__row--sev"><label class="jk-vis__lab" for="jk-vis-sev">How far along</label>'
      + '<div class="jk-vis__sevwrap"><input type="range" id="jk-vis-sev" min="0" max="100" step="1" value="55">'
      + '<div class="jk-vis__sevlabels" id="jk-vis-sevlabels" aria-hidden="true"></div></div></div>';
    h += '<div id="jk-vis-options" class="jk-vis__options"></div>';
    h += '<div id="jk-vis-paint" class="jk-vis__paint" hidden></div>';
    return h;
  }

  // Short explanations shown under the controls; the long versions are the
  // page sections, linked by id.
  var ABOUT = {
    glaucoma: ['Glaucoma takes side vision first, usually in arcs above or below the center, and the center last. The lost areas are not black: the brain fills them in, which is why most people notice nothing until the damage is advanced.', 'glaucoma'],
    cataract: ['A cataract clouds the lens, so the whole picture softens, colors yellow and fade, and lights at night grow halos and glare.', 'cataract'],
    amd: ['Macular degeneration affects the center of vision: faces and print blur or fade, and in the wet form straight lines bend. Side vision is kept.', 'macular-degeneration'],
    dr: ['Diabetic retinopathy causes patchy blurring and dark spots where the retina has bled or swollen, and overall blur when the center swells.', 'diabetic-retinopathy'],
    rd: ['A retinal detachment appears as a dark curtain or shadow moving in from one side, often after new flashes and floaters. It is an emergency: call the same day.', 'retinal-detachment'],
    hemi: ['A stroke or other brain injury can remove the same half of the visual field in both eyes. People bump into things or miss words on one side of the page.', 'stroke'],
    myopia: ['Uncorrected nearsightedness blurs everything at a distance evenly. Glasses or contact lenses correct it fully.', 'glasses'],
    astig: ['Astigmatism smears and doubles the image in one direction, so lights streak and letters have ghosts. Glasses correct it.', 'glasses'],
    dryeye: ['Dry eye blurs vision between blinks as the tear film breaks up, then clears for a moment after a blink. It fluctuates through the day.', 'dry-eye'],
    floaters: ['Floaters are shadows of clumps in the gel inside the eye. They drift when the eye moves and are usually harmless, but a sudden shower of new ones needs a same-day exam.', 'floaters'],
    color: ['Color blindness is a difference in the retina’s color sensors, usually inherited, and most often makes reds and greens hard to tell apart. Vision is otherwise sharp.', 'color-blindness']
  };

  // ---------- rendering ----------
  var els = {};
  var dryLoop = null;

  function $(id) { return document.getElementById(id); }

  function render(opts) {
    stageScale = Math.max(0.35, els.stage.clientWidth / 900);
    if (MODE === 'rx') { renderRx(opts); return; }
    var cond = condById(state.cond), scene = sceneById(state.scene), s = state.sev / 100;

    var ctx = { scene: scene, opt: {}, grid: state.grid, sharpFilter: 'none', lostMask: null, lostBlur: 12, lostDim: 0.8, lostBlack: false,
      warpMask: null, warpScale: 0, overlay: 'none', overlayBlend: 'normal', floaters: 0, floaterOpacity: 0.3, astig: null, dryeye: 0, colorMatrix: null };
    (cond.options || []).forEach(function (o) { ctx.opt[o.key] = state.opt[o.key] || o.values[0][0]; });
    cond.apply(s, ctx);

    // sharp layer
    if (ctx.astig) {
      var f = root.querySelector('#jk-vis-astig');
      f.querySelector('feGaussianBlur').setAttribute('stdDeviation', (ctx.astig.sx * stageScale).toFixed(2) + ' ' + (ctx.astig.sy * stageScale).toFixed(2));
      f.querySelector('feOffset').setAttribute('dy', (ctx.astig.ghost * stageScale).toFixed(2));
      f.querySelector('feFuncA').setAttribute('slope', ctx.astig.alpha.toFixed(2));
    }
    if (ctx.colorMatrix) root.querySelector('#jk-vis-color feColorMatrix').setAttribute('values', ctx.colorMatrix);
    els.sharp.style.filter = ctx.sharpFilter;

    // warp layer
    if (ctx.warpMask) {
      root.querySelector('#jk-vis-warp feDisplacementMap').setAttribute('scale', (ctx.warpScale * stageScale).toFixed(1));
      setMask(els.warpwrap, ctx.warpMask);
      els.warp.style.filter = 'url(#jk-vis-warp)';
      els.warpwrap.hidden = false;
    } else {
      els.warpwrap.hidden = true;
    }

    // lost layer
    if (ctx.lostMask) {
      setMask(els.lostwrap, ctx.lostMask);
      els.lost.style.filter = ctx.lostBlack ? 'brightness(0)' : 'blur(' + px(ctx.lostBlur) + ') brightness(' + ctx.lostDim.toFixed(2) + ') saturate(0.7) contrast(0.88)';
      els.lostwrap.hidden = false;
    } else {
      els.lostwrap.hidden = true;
    }

    // overlay + floaters
    els.overlay.style.backgroundImage = ctx.overlay;
    els.overlay.style.mixBlendMode = ctx.overlayBlend;
    drawFloaters(ctx.floaters, ctx.floaterOpacity);

    // dry eye: tear film breaks up between blinks, clears after one
    stopDry();
    if (ctx.dryeye && !REDUCED) startDry(ctx.dryeye);

    // controls
    if (!opts || !opts.controlsOnly === false) syncControls(cond, scene);
    els.tagr.textContent = cond.label;
    var url = writeState();
    JK.qr.render(els.qr, url, 112);
  }

  function setMask(el, dataUrl) {
    var v = 'url("' + dataUrl + '")';
    el.style.webkitMaskImage = v; el.style.maskImage = v;
    el.style.webkitMaskSize = '100% 100%'; el.style.maskSize = '100% 100%';
    el.style.webkitMaskRepeat = 'no-repeat'; el.style.maskRepeat = 'no-repeat';
  }

  function drawFloaters(n, opacity) {
    var svg = els.floaters;
    if (!n) { svg.innerHTML = ''; svg.hidden = true; return; }
    svg.hidden = false;
    var rnd = lcg(11 + n), h = '';
    for (var i = 0; i < n; i++) {
      var x = 10 + 80 * rnd(), y = 8 + 50 * rnd(), kind = rnd();
      var dur = (14 + 10 * rnd()).toFixed(1) + 's', delay = (-20 * rnd()).toFixed(1) + 's';
      var style = REDUCED ? '' : ' style="animation-duration:' + dur + ';animation-delay:' + delay + '"';
      if (kind < 0.45) {
        // a wiggly strand
        var d = 'M' + x.toFixed(1) + ' ' + y.toFixed(1);
        var px0 = x, py0 = y;
        for (var k = 0; k < 4; k++) { var nx = px0 + (rnd() - 0.5) * 9, ny = py0 + (rnd() - 0.5) * 7; d += ' Q' + (px0 + (rnd() - 0.5) * 6).toFixed(1) + ' ' + (py0 + (rnd() - 0.5) * 6).toFixed(1) + ' ' + nx.toFixed(1) + ' ' + ny.toFixed(1); px0 = nx; py0 = ny; }
        h += '<path class="jk-vis__floater" d="' + d + '" fill="none" stroke="rgba(30,30,35,' + opacity.toFixed(2) + ')" stroke-width="' + (0.5 + rnd() * 0.5).toFixed(2) + '" stroke-linecap="round"' + style + '/>';
      } else if (kind < 0.8) {
        // a dot cluster
        var g = '<g class="jk-vis__floater"' + style + '>';
        var m = 2 + Math.floor(rnd() * 4);
        for (var q = 0; q < m; q++) g += '<circle cx="' + (x + (rnd() - 0.5) * 5).toFixed(1) + '" cy="' + (y + (rnd() - 0.5) * 4).toFixed(1) + '" r="' + (0.3 + rnd() * 0.6).toFixed(2) + '" fill="rgba(30,30,35,' + (opacity * 0.9).toFixed(2) + ')"/>';
        h += g + '</g>';
      } else {
        // a translucent ring / cobweb blob
        h += '<ellipse class="jk-vis__floater" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + (2 + rnd() * 3).toFixed(1) + '" ry="' + (1.5 + rnd() * 2).toFixed(1) + '" fill="rgba(30,30,35,' + (opacity * 0.35).toFixed(2) + ')" stroke="rgba(30,30,35,' + (opacity * 0.7).toFixed(2) + ')" stroke-width="0.35"' + style + '/>';
      }
    }
    svg.innerHTML = h;
  }

  function startDry(amp) {
    var t0 = performance.now();
    function tick(now) {
      var t = ((now - t0) / 1000) % 7; // a 7-second blink cycle
      var film = t < 0.6 ? t / 0.6 * 0.15 : 0.15 + 0.85 * smooth(0.6, 6.2, t); // clears right after a blink, builds until the next
      var b = amp * film;
      els.sharp.style.filter = 'blur(' + px(b) + ') contrast(' + (1 - 0.08 * film).toFixed(3) + ') brightness(' + (1 + 0.04 * film).toFixed(3) + ')';
      dryLoop = requestAnimationFrame(tick);
    }
    dryLoop = requestAnimationFrame(tick);
  }
  function stopDry() { if (dryLoop) { cancelAnimationFrame(dryLoop); dryLoop = null; } }

  function syncControls(cond, scene) {
    root.querySelectorAll('.jk-vis__scene').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-scene') === scene.id)); });
    root.querySelectorAll('.jk-vis__conds .jk-chip').forEach(function (b) {
      var on = b.getAttribute('data-cond') === cond.id;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    els.sev.value = state.sev;
    els.sevlabels.innerHTML = (cond.severity || SEVERITY_DEFAULT).map(function (l) { return '<span>' + l + '</span>'; }).join('');
    // options
    var h = '';
    (cond.options || []).forEach(function (o) {
      var cur = state.opt[o.key] || o.values[0][0];
      h += '<div class="jk-vis__opt"><span class="jk-vis__lab">' + o.label + '</span><div class="jk-chips" role="group" aria-label="' + o.label + '">';
      o.values.forEach(function (pair) {
        h += '<button type="button" class="jk-chip jk-chip--sm' + (pair[0] === cur ? ' is-active' : '') + '" data-opt="' + o.key + '" data-val="' + pair[0] + '" aria-pressed="' + (pair[0] === cur) + '">' + pair[1] + '</button>';
      });
      h += '</div></div>';
    });
    els.options.innerHTML = h;
    // paint grid
    var paint = cond.id === 'glaucoma' && (state.opt.pattern === 'paint');
    els.paint.hidden = !paint;
    if (paint) drawPaintGrid();
    // about
    var ab = ABOUT[cond.id];
    els.about.innerHTML = ab ? '<p>' + ab[0] + ' <a href="#' + ab[1] + '">Read more below.</a></p>' : '';
  }

  function drawPaintGrid() {
    if (!els.paint.querySelector('.jk-vis__grid')) {
      var h = '<p class="jk-vis__paintlede">Tap the squares to mark where vision is lost, to match a visual field printout. Tap again for deeper loss, a third time to clear. Up is up in the picture.</p>'
        + '<div class="jk-vis__gridwrap"><div class="jk-vis__grid" role="grid" aria-label="Visual field: tap cells to mark lost areas">';
      for (var i = 0; i < 64; i++) h += '<button type="button" class="jk-vis__cell" data-i="' + i + '" aria-label="Field cell ' + (i + 1) + '"></button>';
      h += '</div><div class="jk-vis__gridbtns"><button type="button" class="btn btn-outline-secondary btn-sm" data-grid="clear">Clear</button><button type="button" class="btn btn-outline-secondary btn-sm" data-grid="reset">Example</button></div></div>';
      els.paint.innerHTML = h;
    }
    els.paint.querySelectorAll('.jk-vis__cell').forEach(function (b, i) {
      b.setAttribute('data-level', String(state.grid[i] || 0));
    });
  }

  // ---------- scene loading ----------
  function loadScene() {
    var sc = sceneById(state.scene), src = BASE + sc.file;
    els.stage.style.setProperty('--jk-ar', sc.w + ' / ' + sc.h);
    [els.base, els.sharp, els.warp, els.lost, els.rximg].forEach(function (im) { if (im.getAttribute('src') !== src) im.src = src; });
    els.base.alt = sc.label + ', as seen with healthy vision';
    els.sharp.alt = sc.label + ', as seen ' + (MODE === 'rx' ? 'with the prescription' : 'with ' + condById(state.cond).label.toLowerCase());
  }

  // ---------- divider ----------
  function setSplit(pct) {
    state.split = clamp(pct, 0, 100);
    els.sim.style.clipPath = 'inset(0 0 0 ' + state.split + '%)';
    els.divider.style.left = state.split + '%';
    els.divider.setAttribute('aria-valuenow', Math.round(state.split));
  }
  function wireDivider() {
    var dragging = false;
    function posFromEvent(e) {
      var r = els.stage.getBoundingClientRect();
      return (e.clientX - r.left) / r.width * 100;
    }
    els.divider.addEventListener('pointerdown', function (e) {
      dragging = true; els.divider.setPointerCapture(e.pointerId); els.stage.classList.add('is-dragging'); e.preventDefault();
    });
    els.divider.addEventListener('pointermove', function (e) { if (dragging) setSplit(posFromEvent(e)); });
    function up() { dragging = false; els.stage.classList.remove('is-dragging'); }
    els.divider.addEventListener('pointerup', up);
    els.divider.addEventListener('pointercancel', up);
    els.divider.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') { setSplit(state.split - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setSplit(state.split + step); e.preventDefault(); }
      else if (e.key === 'Home') { setSplit(0); e.preventDefault(); }
      else if (e.key === 'End') { setSplit(100); e.preventDefault(); }
    });
    // hold-to-compare
    var hold = els.hold;
    function show() { els.sim.style.visibility = 'hidden'; els.divider.style.visibility = 'hidden'; hold.classList.add('is-held'); }
    function hide() { els.sim.style.visibility = ''; els.divider.style.visibility = ''; hold.classList.remove('is-held'); }
    hold.addEventListener('pointerdown', function (e) { show(); hold.setPointerCapture(e.pointerId); e.preventDefault(); });
    hold.addEventListener('pointerup', hide); hold.addEventListener('pointercancel', hide); hold.addEventListener('pointerleave', hide);
    hold.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { show(); e.preventDefault(); } });
    hold.addEventListener('keyup', hide); hold.addEventListener('blur', hide);
  }

  // ---------- events ----------
  function wire() {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-scene')) { state.scene = b.getAttribute('data-scene'); loadScene(); render(); return; }
      if (b.hasAttribute('data-cond')) {
        var c = condById(b.getAttribute('data-cond'));
        state.cond = c.id; state.scene = c.scene; state.opt = {};
        loadScene(); render(); return;
      }
      if (b.hasAttribute('data-opt')) { state.opt[b.getAttribute('data-opt')] = b.getAttribute('data-val'); render(); return; }
      if (b.classList.contains('jk-vis__cell')) {
        var i = +b.getAttribute('data-i');
        state.grid[i] = ((state.grid[i] || 0) + 1) % 3;
        b.setAttribute('data-level', String(state.grid[i]));
        render({ controlsOnly: false }); return;
      }
      if (b.hasAttribute('data-grid')) {
        state.grid = b.getAttribute('data-grid') === 'clear' ? new Array(64).fill(0) : defaultGrid();
        render(); return;
      }
      if (b.id === 'jk-vis-copy') { copyLink(); return; }
      if (MODE === 'rx') rxClick(b);
    });
    if (MODE === 'rx') wireRx();
    else els.sev.addEventListener('input', function () { state.sev = +els.sev.value; render({ controlsOnly: false }); });
    window.addEventListener('resize', debounce(function () { render({ controlsOnly: false }); }, 150));
    wireDivider();
  }

  function copyLink() {
    var url = MODE === 'rx' ? writeRxState() : writeState();
    var done = function (ok) {
      els.copied.textContent = ok ? 'Link copied.' : 'Copy failed; use the address bar.';
      setTimeout(function () { els.copied.textContent = ''; }, 3000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  // ---------- prescription mode ----------
  // Which scenes suit each viewing distance.
  var RX_SCENES = { far: ['street', 'night'], mid: ['table', 'kitchen'], near: ['reading'] };
  var RX_EYES = [['both', 'Both eyes'], ['od', 'Right eye'], ['os', 'Left eye']];
  var RX_EXAMPLES = [
    { id: 'myope', label: 'Nearsighted', age: 30, od: { sph: -3, cyl: 0, axis: 180, add: 0 }, os: { sph: -2.75, cyl: -0.5, axis: 175, add: 0 }, dist: 'far' },
    { id: 'hyperope', label: 'Farsighted', age: 52, od: { sph: 2.5, cyl: 0, axis: 180, add: 1.5 }, os: { sph: 2.25, cyl: -0.25, axis: 90, add: 1.5 }, dist: 'near' },
    { id: 'astig', label: 'Astigmatism', age: 35, od: { sph: 0.5, cyl: -2.5, axis: 180, add: 0 }, os: { sph: 0.25, cyl: -2.25, axis: 5, add: 0 }, dist: 'far' },
    { id: 'presby', label: 'Reading glasses only', age: 62, od: { sph: 0, cyl: 0, axis: 180, add: 2.25 }, os: { sph: 0, cyl: 0, axis: 180, add: 2.25 }, dist: 'near' }
  ];
  // the "Nearsighted" example is the starting view
  function rxFromExample(ex) {
    return { od: RX.normalize(ex.od), os: RX.normalize(ex.os), age: ex.age, dist: ex.dist, eye: 'both', glasses: false };
  }

  function rxOptions(lo, hi, cur, zeroLabel) {
    var h = '';
    for (var q = Math.round(hi * 4); q >= Math.round(lo * 4); q--) {
      var v = q / 4;
      h += '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + (v === 0 && zeroLabel ? zeroLabel : RX.fmt(v)) + '</option>';
    }
    return h;
  }

  function buildRx() {
    var r = state.rx, h = '';
    h += '<div class="jk-vis__row"><span class="jk-vis__lab">Prescription</span><div>'
      + '<div class="jk-vis__rxgrid" role="group" aria-label="Glasses prescription">'
      + '<span></span><span class="jk-vis__rxh">Sphere</span><span class="jk-vis__rxh">Cylinder</span><span class="jk-vis__rxh">Axis</span><span class="jk-vis__rxh">Add</span>';
    [['od', 'Right', 'OD'], ['os', 'Left', 'OS']].forEach(function (e) {
      var x = r[e[0]], n = e[1] + ' eye ';
      h += '<span class="jk-vis__rxeye">' + e[1] + ' <small>' + e[2] + '</small></span>'
        + '<select class="form-select" data-rx="' + e[0] + '" data-f="sph" aria-label="' + n + 'sphere">' + rxOptions(-20, 20, x.sph, '0.00') + '</select>'
        + '<select class="form-select" data-rx="' + e[0] + '" data-f="cyl" aria-label="' + n + 'cylinder">' + rxOptions(-8, 8, x.cyl, '0.00') + '</select>'
        + '<input class="form-control" type="number" inputmode="numeric" min="1" max="180" step="1" data-rx="' + e[0] + '" data-f="axis" value="' + x.axis + '" aria-label="' + n + 'axis, 1 to 180 degrees">'
        + '<select class="form-select" data-rx="' + e[0] + '" data-f="add" aria-label="' + n + 'reading add">' + rxOptions(0, 4, x.add, 'None') + '</select>';
    });
    h += '</div><p class="jk-vis__rxnote">Copy the numbers from your glasses prescription. OD is the right eye and OS the left. If there is no cylinder, leave it at 0.00; the axis then does not matter. "Add" is the extra power for reading in bifocals or progressives.</p></div></div>';
    h += '<div class="jk-vis__row"><label class="jk-vis__lab" for="jk-vis-age">Age</label><div class="jk-vis__agewrap">'
      + '<input class="form-control" type="number" inputmode="numeric" min="5" max="100" step="1" id="jk-vis-age" value="' + r.age + '">'
      + '<span class="jk-vis__rxnote">Focusing up close gets harder with age, so age changes the near view.</span></div></div>';
    h += '<div class="jk-vis__row"><span class="jk-vis__lab">Or try</span><div class="jk-chips" role="group" aria-label="Example prescriptions">';
    RX_EXAMPLES.forEach(function (ex) { h += '<button type="button" class="jk-chip jk-chip--sm" data-rxex="' + ex.id + '">' + ex.label + '</button>'; });
    h += '</div></div>';
    h += '<div class="jk-vis__row"><span class="jk-vis__lab">Looking at</span><div><div class="jk-chips jk-vis__dists" role="group" aria-label="Viewing distance">';
    RX.DISTANCES.forEach(function (d) { h += '<button type="button" class="jk-chip" data-rxdist="' + d.id + '" aria-pressed="false">' + d.label + '</button>'; });
    h += '</div><p class="jk-vis__rxnote" id="jk-vis-distnote"></p></div></div>';
    h += '<div class="jk-vis__row"><span class="jk-vis__lab">Scene</span><div class="jk-vis__scenes" role="group" aria-label="Scene">';
    SCENES.forEach(function (sc) {
      h += '<button type="button" class="jk-vis__scene" data-scene="' + sc.id + '" aria-pressed="false"><img src="' + BASE + sc.file + '" alt="" loading="lazy" width="' + sc.w + '" height="' + sc.h + '"><span>' + sc.label + '</span></button>';
    });
    h += '</div></div>';
    h += '<div class="jk-vis__opt"><span class="jk-vis__lab">Eye</span><div class="jk-chips" role="group" aria-label="Eye">';
    RX_EYES.forEach(function (e) { h += '<button type="button" class="jk-chip jk-chip--sm" data-rxeye="' + e[0] + '" aria-pressed="false">' + e[1] + '</button>'; });
    h += '</div></div>';
    h += '<div class="jk-vis__opt"><span class="jk-vis__lab">Right side shows</span><div class="jk-chips" role="group" aria-label="Right side shows">'
      + '<button type="button" class="jk-chip jk-chip--sm" data-rxglasses="0" aria-pressed="false">Without glasses</button>'
      + '<button type="button" class="jk-chip jk-chip--sm" data-rxglasses="1" aria-pressed="false">With these glasses</button>'
      + '</div></div>';
    return h;
  }

  function rxFixScene() {
    var ok = RX_SCENES[state.rx.dist];
    if (ok.indexOf(state.scene) < 0) state.scene = ok[0];
  }

  function readRxState() {
    state.rx = rxFromExample(RX_EXAMPLES[0]);
    var p = JK.url.read(), r = state.rx;
    var od = RX.decode(p.r), os = RX.decode(p.l);
    if (od) r.od = od;
    if (os) r.os = os;
    if (p.a !== undefined && isFinite(parseFloat(p.a))) r.age = clamp(Math.round(+p.a), 5, 100);
    if (RX_SCENES[p.d]) r.dist = p.d;
    if (RX_EYES.some(function (e) { return e[0] === p.e; })) r.eye = p.e;
    r.glasses = p.w === '1';
    state.scene = p.s && sceneById(p.s).id === p.s ? p.s : '';
    rxFixScene();
  }
  function writeRxState() {
    var r = state.rx;
    return JK.url.write({ r: RX.encode(r.od), l: RX.encode(r.os), a: String(r.age), d: r.dist, e: r.eye === 'both' ? '' : r.eye, w: r.glasses ? '1' : '', s: state.scene });
  }

  function syncRxControls() {
    var r = state.rx, ok = RX_SCENES[r.dist], d = RX.distanceById(r.dist);
    root.querySelectorAll('[data-rx]').forEach(function (el) {
      var v = r[el.getAttribute('data-rx')][el.getAttribute('data-f')];
      if (document.activeElement !== el) el.value = String(v);
    });
    var age = $('jk-vis-age');
    if (document.activeElement !== age) age.value = r.age;
    function press(sel, attr, cur) {
      root.querySelectorAll(sel).forEach(function (b) {
        var on = b.getAttribute(attr) === cur;
        b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
      });
    }
    press('[data-rxdist]', 'data-rxdist', r.dist);
    press('[data-rxeye]', 'data-rxeye', r.eye);
    press('[data-rxglasses]', 'data-rxglasses', r.glasses ? '1' : '0');
    $('jk-vis-distnote').textContent = d.label + ' is ' + metres(d.metres) + ' away: ' + d.detail + '.';
    root.querySelectorAll('.jk-vis__scene').forEach(function (b) {
      var id = b.getAttribute('data-scene');
      b.hidden = ok.indexOf(id) < 0;
      b.setAttribute('aria-pressed', String(id === state.scene));
    });
  }

  function metres(m) {
    if (m === Infinity) return 'far away';
    return m < 1 ? Math.round(m * 100) + ' cm' : (Math.round(m * 10) / 10) + ' m';
  }
  function acuity(n) { return n >= 400 ? '20/400 or worse' : n <= 20 ? '20/20' : 'about 20/' + n; }

  // px of Gaussian blur per diopter of leftover error, on a 900px stage
  var RX_PX_PER_D = 2.2, RX_MAX_PX = 18;

  function renderRx() {
    var r = state.rx, d = RX.distanceById(r.dist);
    var od = RX.simulate(r.od, r.age, r.dist, r.glasses), os = RX.simulate(r.os, r.age, r.dist, r.glasses);
    var res = r.eye === 'od' ? od : r.eye === 'os' ? os : RX.better(od, os);

    var sx = Math.min(RX_MAX_PX, RX_PX_PER_D * Math.abs(res.e1)) * stageScale;
    var sy = Math.min(RX_MAX_PX, RX_PX_PER_D * Math.abs(res.e2)) * stageScale;
    els.sharp.style.filter = 'none';
    if (sx < 0.05 && sy < 0.05) {
      els.rx.hidden = true;
    } else {
      els.rx.hidden = false;
      var W = els.stage.clientWidth, H = els.stage.clientHeight, D = Math.ceil(Math.hypot(W, H)) + 2;
      // the axis is written as the examiner sees the patient; from the
      // patient's side that is the same angle turned clockwise on screen
      var ang = res.axis % 180;
      var sp = els.rxspin.style, im = els.rximg.style;
      sp.width = sp.height = D + 'px';
      sp.left = ((W - D) / 2) + 'px'; sp.top = ((H - D) / 2) + 'px';
      sp.transform = 'rotate(' + ang + 'deg)';
      im.width = W + 'px'; im.height = H + 'px';
      im.left = ((D - W) / 2) + 'px'; im.top = ((D - H) / 2) + 'px';
      im.transform = 'rotate(' + (-ang) + 'deg)';
      root.querySelector('#jk-vis-rx feGaussianBlur').setAttribute('stdDeviation', sx.toFixed(2) + ' ' + sy.toFixed(2));
      // re-apply so browsers that cache the filter pick up the change
      sp.filter = 'none'; void els.rxspin.offsetWidth; sp.filter = 'url(#jk-vis-rx)';
    }
    els.overlay.style.backgroundImage = 'none';
    drawFloaters(0, 0);

    syncRxControls();
    els.tagr.textContent = r.glasses ? 'With these glasses' : 'Without glasses';
    els.about.innerHTML = rxAbout(r, d, od, os, res);
    JK.qr.render(els.qr, writeRxState(), 112);
  }

  function rxAbout(r, d, od, os, res) {
    var how = r.glasses ? 'with these glasses' : 'without glasses';
    var h = '<p><strong>' + d.label + ' (' + metres(d.metres) + '), ' + how + ':</strong> ';
    if (r.eye === 'both' && od.snellen === os.snellen) h += 'each eye ' + acuity(od.snellen) + '.';
    else if (r.eye === 'both') h += 'right eye ' + acuity(od.snellen) + ', left eye ' + acuity(os.snellen) + '; with both eyes open, ' + acuity(res.snellen) + ', since the clearer eye mostly wins.';
    else h += (r.eye === 'od' ? 'right' : 'left') + ' eye ' + acuity(res.snellen) + '.';
    h += ' Normal vision is 20/20.</p><ul class="jk-vis__rxlist">';
    [['od', 'Right eye', r.od], ['os', 'Left eye', r.os]].forEach(function (e) {
      if (r.eye !== 'both' && r.eye !== e[0]) return;
      var x = e[2], line = '<li><strong>' + e[1] + '</strong> (' + RX.fmt(x.sph) + (x.cyl ? ' ' + RX.fmt(x.cyl) + ' × ' + x.axis : '') + (x.add ? ', add ' + RX.fmt(x.add) : '') + '): ' + RX.describe(x) + '.';
      var cr = RX.clearRange(x, r.age);
      if (!cr) line += ' Without glasses, nothing is fully in focus at age ' + r.age + '.';
      else if (cr.far === Infinity && cr.near <= 0.42) line += ' Without glasses it can focus from far away to about ' + metres(cr.near) + ' up close.';
      else if (cr.far === Infinity) line += ' Without glasses it focuses far away but not closer than about ' + metres(cr.near) + '.';
      else line += ' Without glasses it focuses only between about ' + metres(cr.far) + ' and ' + metres(cr.near) + '.';
      if (Math.abs(x.cyl) >= 0.75) line += ' The astigmatism blurs at every distance until it is corrected.';
      if (r.glasses && d.id !== 'far' && !x.add && RX.amplitude(r.age) < d.demand + 0.5) line += ' This prescription has no reading add, and at ' + r.age + ' the eye cannot do all of the close focusing itself: a reading add or reading glasses would help.';
      h += line + '</li>';
    });
    h += '</ul><p class="jk-vis__rxnote">Estimates for understanding, not a measurement of anyone’s vision. <a href="#how-it-works">How this works.</a></p>';
    return h;
  }

  function rxClick(b) {
    var r = state.rx;
    if (b.hasAttribute('data-rxex')) {
      var id = b.getAttribute('data-rxex');
      RX_EXAMPLES.forEach(function (ex) { if (ex.id === id) { var g = r.glasses; state.rx = rxFromExample(ex); state.rx.glasses = g; } });
    } else if (b.hasAttribute('data-rxdist')) r.dist = b.getAttribute('data-rxdist');
    else if (b.hasAttribute('data-rxeye')) r.eye = b.getAttribute('data-rxeye');
    else if (b.hasAttribute('data-rxglasses')) r.glasses = b.getAttribute('data-rxglasses') === '1';
    else return;
    rxFixScene(); loadScene(); render();
  }

  function wireRx() {
    function onField(e) {
      var el = e.target;
      if (el.id === 'jk-vis-age') {
        var a = parseFloat(el.value);
        if (!isFinite(a)) return;
        state.rx.age = clamp(Math.round(a), 5, 100);
      } else if (el.hasAttribute('data-rx')) {
        var eye = el.getAttribute('data-rx'), f = el.getAttribute('data-f');
        if (f === 'axis' && !isFinite(parseFloat(el.value))) return;
        var x = {}; for (var k in state.rx[eye]) x[k] = state.rx[eye][k];
        x[f] = el.value;
        state.rx[eye] = RX.normalize(x);
      } else return;
      render();
    }
    root.addEventListener('input', onField);
    // on change (leaving the field) show the value as it was understood
    root.addEventListener('change', function (e) {
      onField(e);
      var el = e.target;
      if (el.id === 'jk-vis-age') el.value = state.rx.age;
      else if (el.hasAttribute('data-rx')) el.value = String(state.rx[el.getAttribute('data-rx')][el.getAttribute('data-f')]);
    });
  }

  // ---------- init ----------
  if (MODE === 'rx') readRxState(); else readState();
  build();
  els = {
    stage: $('jk-vis-stage'), sim: $('jk-vis-sim'), divider: $('jk-vis-divider'), hold: $('jk-vis-hold'), tagr: $('jk-vis-tagr'),
    base: root.querySelector('.jk-vis__base'), sharp: root.querySelector('.jk-vis__sharp'), warp: root.querySelector('.jk-vis__warp'),
    lost: root.querySelector('.jk-vis__lost'), lostwrap: root.querySelector('.jk-vis__lostwrap'), warpwrap: root.querySelector('.jk-vis__warpwrap'), overlay: root.querySelector('.jk-vis__overlay'), floaters: root.querySelector('.jk-vis__floaters'),
    sev: $('jk-vis-sev'), sevlabels: $('jk-vis-sevlabels'), options: $('jk-vis-options'), paint: $('jk-vis-paint'), about: $('jk-vis-about'),
    qr: $('jk-vis-qr'), copied: $('jk-vis-copied'),
    rx: root.querySelector('.jk-vis__rx'), rxspin: root.querySelector('.jk-vis__rxspin'), rximg: root.querySelector('.jk-vis__rximg')
  };
  wire();
  loadScene();
  setSplit(50);
  render();
  root.classList.add('is-ready');
})();
