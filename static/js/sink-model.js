/* The numbers behind the eye pressure sink (content/learn/eye-pressure.md,
 * drawn by sink.js). No DOM, so Node can test it (tests/sink-model.test.js).
 *
 * Steady state (Goldmann): fluid made = fluid leaving.
 *     F = U + C x (P - PV)            without surgery
 *     F = U + C x (P - PV) + sum of Cn x (P - Pn)   with a new drain
 * F: fluid made; U: side-drain (uveoscleral) flow; C: how easily the main
 * drain passes fluid; PV: pressure in the veins the main drain empties into
 * (episcleral venous pressure); Cn, Pn: a new drain and its back pressure.
 *
 * What the model has to get right, because patients are shown it:
 *   - Without a new drain the pressure cannot go below PV. The main drain
 *     empties into those veins, so turning the faucet down only brings the
 *     level toward PV, never under it. Only a trabeculectomy or tube,
 *     which bypass the veins, go lower.
 *   - Returns diminish where they do in the eye:
 *       faucet      each suppressant removes a share of what is still
 *                   suppressible; the eye never makes less than F_FLOOR.
 *       main drain  each treatment recovers a share of the gap to the best
 *                   a treated drain can do (C_BEST), so SLT after netarsudil
 *                   adds less than SLT alone, and a healthy drain gains nothing.
 *       MIGS        a bypass past the meshwork into Schlemm's canal, so it
 *                   adds its own ease (bypass) rather than repairing the
 *                   meshwork. It still empties into the same veins, so the
 *                   venous floor holds. Sized so MIGS alone lands in the mid
 *                   teens, the figure usually quoted for it.
 *       side drain  it carries a share of the fluid made, so it can never
 *                   take more than is made, and it helps less once the
 *                   faucet is turned down.
 *     and the nearer the level is to PV, the less any of them moves it.
 * The values are round examples for one imaginary eye, not data.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKSinkModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var F0 = 2.4, F_FLOOR = 0.5 * F0;      // fluid made, and the least it can be cut to
  var C_GLAUCOMA = 0.11, C_HEALTHY = 0.27, C_BEST = 0.19; // main drain: clogged, healthy, best after treatment
  var U0 = 0.25;                           // side drain's pull, untreated
  var PV = 9;                              // venous back pressure
  var P_MIN = 6;

  // faucet: share of the suppressible flow removed; drain: share of the gap
  // to C_BEST recovered; bypass: ease added past the meshwork (MIGS);
  // side: the side drain's pull; pv: change in venous
  // pressure; add: a new drain [ease, back pressure]
  var EFFECTS = {
    less: { faucet: 0.6 },
    cpc: { faucet: 0.7 },
    side: { side: 2.0 },
    main: { drain: 0.3, pv: -1 },          // netarsudil also lowers venous pressure a little
    slt: { drain: 0.6 },
    migs: { bypass: 0.25 },
    trab: { add: [0.35, 6] },
    tube: { add: [0.25, 7] }
  };

  function solve(on, healthy) {
    var keep = 1, gap = 1, bypass = 0, pull = U0, pv = PV, extra = [], id, e;
    for (id in EFFECTS) {
      if (!on || !on[id]) continue;
      e = EFFECTS[id];
      if (e.faucet) keep *= 1 - e.faucet;
      if (e.drain) gap *= 1 - e.drain;
      if (e.bypass) bypass += e.bypass;
      if (e.side) pull = Math.max(pull, e.side);
      if (e.pv) pv += e.pv;
      if (e.add) extra.push(e.add);
    }
    var F = F_FLOOR + (F0 - F_FLOOR) * keep;
    var C0 = healthy ? C_HEALTHY : C_GLAUCOMA;
    var C = C0 >= C_BEST ? C0 : C_BEST - (C_BEST - C0) * gap;
    var U = F * pull / (pull + F);         // a share of what is made, always less than F
    var CT = C + bypass;                   // everything that empties into the veins
    var num = F - U + CT * pv, den = CT, i;
    for (i = 0; i < extra.length; i++) { num += extra[i][0] * extra[i][1]; den += extra[i][0]; }
    var P = num / den;
    if (P < pv && extra.length) {          // below venous pressure nothing leaves by the main drain
      num = F - U; den = 0;
      for (i = 0; i < extra.length; i++) { num += extra[i][0] * extra[i][1]; den += extra[i][0]; }
      P = num / den;
    }
    P = Math.max(P_MIN, P);
    var newFlow = 0;
    for (i = 0; i < extra.length; i++) newFlow += Math.max(0, extra[i][0] * (P - extra[i][1]));
    return { P: P, F: F, C: C, U: U, pv: pv, mainFlow: Math.max(0, CT * (P - pv)), newFlow: newFlow, hasNew: extra.length > 0 };
  }

  return { solve: solve, PV: PV, F0: F0, C_GLAUCOMA: C_GLAUCOMA, C_HEALTHY: C_HEALTHY, C_BEST: C_BEST, IDS: Object.keys(EFFECTS) };
});
