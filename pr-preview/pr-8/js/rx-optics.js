/* Glasses prescription optics for the prescription simulator
 * (content/learn/glasses-prescription.md, rendered by static/js/vision.js).
 *
 * No DOM access, so it runs in the browser (window.JKRxOptics) and under
 * Node for tests/rx-optics.test.js.
 *
 * The model, in diopters (D):
 *   - A prescription is sphere S, cylinder C, axis A. Its two principal
 *     meridians have refractive error S (along the axis) and S + C (at
 *     right angles to it). Plus-cylinder and minus-cylinder forms give the
 *     same answer.
 *   - Looking at something d metres away needs 1/d D of focus. Without
 *     glasses, meridian i needs D + Rx_i of accommodation: a -3.00 myope is
 *     clear at 33 cm with none, a +2.00 hyperope works 2 D harder everywhere.
 *   - The eye accommodates one amount for both meridians, aiming the
 *     circle of least confusion (the spherical equivalent), limited to
 *     0..amplitude. Amplitude falls with age (Hofstetter's average formula).
 *   - What is left over in each meridian is the blur; a quarter diopter of
 *     depth of focus is forgiven.
 *   - Wearing the glasses cancels the error. A reading add, if there is one,
 *     is treated as a progressive or bifocal: the full add at near, half of
 *     it at intermediate, none at distance.
 * This is a teaching approximation, not a measurement of anyone's vision.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKRxOptics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Viewing distances. `demand` is the focus needed, in diopters. Distance
  // is 6 m (the eye chart), not optical infinity.
  var DISTANCES = [
    { id: 'far', label: 'Distance', detail: 'driving, TV, faces across a room', metres: 6, addShare: 0 },
    { id: 'mid', label: 'Intermediate', detail: 'computer, dashboard, countertop', metres: 0.67, addShare: 0.5 },
    { id: 'near', label: 'Near', detail: 'reading, phone', metres: 0.4, addShare: 1 }
  ];
  DISTANCES.forEach(function (d) { d.demand = 1 / d.metres; });

  var DEPTH_OF_FOCUS = 0.25;

  function distanceById(id) {
    for (var i = 0; i < DISTANCES.length; i++) if (DISTANCES[i].id === id) return DISTANCES[i];
    return DISTANCES[0];
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function num(v, dflt) { v = parseFloat(v); return isFinite(v) ? v : dflt; }

  // Bring a prescription into range: quarter-diopter steps, axis 0..180
  // (0 is the same as 180), add never negative.
  function normalize(rx) {
    rx = rx || {};
    var q = function (v, lo, hi) { return clamp(Math.round(num(v, 0) * 4) / 4, lo, hi); };
    var axis = Math.round(num(rx.axis, 180)) % 180;
    if (axis <= 0) axis += 180;
    return { sph: q(rx.sph, -20, 20), cyl: q(rx.cyl, -8, 8), axis: axis, add: q(rx.add, 0, 4) };
  }

  // Average amplitude of accommodation by age (Hofstetter 1950).
  function amplitude(age) {
    age = clamp(num(age, 40), 5, 100);
    return Math.max(0, 18.5 - 0.3 * age);
  }

  function forgive(e) { var a = Math.abs(e) - DEPTH_OF_FOCUS; return a > 0 ? (e < 0 ? -a : a) : 0; }

  // Blur strength of a sphero-cylindrical error: sqrt(M^2 + (C/2)^2), the
  // usual single-number summary (M = spherical equivalent).
  function blurStrength(e1, e2) {
    var m = (e1 + e2) / 2, j = (e2 - e1) / 2;
    return Math.sqrt(m * m + j * j);
  }

  // Rough Snellen equivalent for a blur strength in diopters. Fitted to the
  // usual clinical rule of thumb (1 D ~ 20/70, 2 D ~ 20/150, 3 D ~ 20/250,
  // 4 D ~ 20/400). Returned as the "20/x" denominator, rounded to a line on
  // the chart, with 400 meaning "20/400 or worse".
  var LINES = [20, 25, 30, 40, 50, 60, 70, 80, 100, 125, 150, 200, 250, 300, 400];
  function snellen(blur) {
    var x = 20 * (1 + 2 * blur + 0.6 * blur * blur);
    for (var i = 0; i < LINES.length; i++) if (x <= LINES[i] * 1.06) return LINES[i];
    return 400;
  }

  // What one eye sees at one distance.
  //   rx: {sph, cyl, axis, add}; age in years; dist: a DISTANCES id;
  //   glasses: true to look through the prescription.
  // Returns the leftover error in each principal meridian (e1 along the
  // axis, e2 across it), the overall blur, and its Snellen estimate.
  function simulate(rx, age, dist, glasses) {
    rx = normalize(rx);
    var d = distanceById(dist), amp = amplitude(age);
    // focus still needed by each meridian after the glasses (if any)
    var need1, need2;
    if (glasses) {
      var add = rx.add * d.addShare;
      need1 = need2 = d.demand - add;
    } else {
      need1 = d.demand + rx.sph;
      need2 = d.demand + rx.sph + rx.cyl;
    }
    var acc = clamp((need1 + need2) / 2, 0, amp);
    var e1 = forgive(need1 - acc), e2 = forgive(need2 - acc);
    var blur = blurStrength(e1, e2);
    return { e1: e1, e2: e2, axis: rx.axis, accommodation: acc, blur: blur, snellen: snellen(blur) };
  }

  // Binocular: the clearer eye mostly wins.
  function better(a, b) { return a.blur <= b.blur ? a : b; }

  // Plain-language description of one eye's prescription.
  function describe(rx) {
    rx = normalize(rx);
    var parts = [], se = rx.sph + rx.cyl / 2, c = Math.abs(rx.cyl);
    if (se <= -0.5) parts.push('nearsighted');
    else if (se >= 0.5) parts.push('farsighted');
    if (c >= 0.5) parts.push('astigmatism');
    if (rx.add >= 0.75) parts.push('a reading add (presbyopia)');
    if (!parts.length) return 'little or no prescription';
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' with ' + parts[parts.length - 1];
  }

  // Without glasses, the range of distances (metres) where the spherical
  // equivalent is in focus, given the age. far = Infinity when distance
  // is clear; null when nothing is (high hyperopia with little focusing).
  function clearRange(rx, age) {
    rx = normalize(rx);
    var se = rx.sph + rx.cyl / 2, amp = amplitude(age);
    var lo = Math.max(0, -se - DEPTH_OF_FOCUS), hi = amp - se + DEPTH_OF_FOCUS;
    if (hi <= 0 || hi < lo) return null;
    return { far: lo <= 0 ? Infinity : 1 / lo, near: 1 / hi };
  }

  // Prescription <-> compact string for the URL: "sph,cyl,axis,add".
  function encode(rx) {
    rx = normalize(rx);
    return [rx.sph, rx.cyl, rx.axis, rx.add].join(',');
  }
  function decode(s) {
    if (typeof s !== 'string') return null;
    var p = s.split(',');
    if (p.length !== 4 || p.some(function (v) { return !isFinite(parseFloat(v)); })) return null;
    return normalize({ sph: p[0], cyl: p[1], axis: p[2], add: p[3] });
  }

  // "-2.50", "+1.25", "0.00"
  function fmt(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2); }

  return {
    DISTANCES: DISTANCES,
    distanceById: distanceById,
    normalize: normalize,
    amplitude: amplitude,
    blurStrength: blurStrength,
    snellen: snellen,
    simulate: simulate,
    better: better,
    describe: describe,
    clearRange: clearRange,
    encode: encode,
    decode: decode,
    fmt: fmt
  };
});
