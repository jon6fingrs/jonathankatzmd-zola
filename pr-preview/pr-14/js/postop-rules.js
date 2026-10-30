/* Post-op eye drop dosing rules.
 *
 * This file is the single place the clinical schedule logic lives. It has no
 * DOM access so it can run both in the browser (window.JKPostopRules) and
 * under Node for the tests in tests/postop-rules.test.js.
 *
 * The tapers are a direct port of the original WordPress PHP; change them
 * here and the tests will tell you what moved.
 *
 * Day numbering: day 0 is the first day of drops (the day after surgery).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKPostopRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SURGERIES = [
    'Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni',
    'Tube Shunt Surgery', 'Trabeculectomy', 'Pterygium Surgery',
    'Micropulse CPC', 'Standard CPC'
  ];

  var STEROIDS = ['Prednisolone Acetate', 'Pred-Moxi-Brom'];
  var ANTIBIOTICS = ['Gatifloxacin', 'Moxifloxacin', 'Ofloxacin', 'Ciprofloxacin', 'Polymyxin B Sulfate and Trimethoprim'];
  var NSAIDS = ['Ketorolac', 'Prolensa', 'Bromfenac', 'Diclofenac', 'Flurbiprofen'];
  var OINTMENTS = ['Maxitrol', 'Erythromycin'];

  // Which medication classes are part of each surgery's regimen.
  var ANTIBIOTIC_SURGERIES = [
    'Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni',
    'Pterygium Surgery', 'Tube Shunt Surgery', 'Trabeculectomy'
  ];
  var NSAID_SURGERIES = ['Cataract Surgery', 'Cataract Surgery + MIGS'];
  var OINTMENT_SURGERIES = ['Tube Shunt Surgery', 'Trabeculectomy'];

  // The combination drop only has a defined taper for the anterior-segment
  // cases. Tube, trab and CPC use the prednisolone taper regardless of
  // which steroid was picked, so for those only prednisolone is offered.
  var PMB_SURGERIES = ['Cataract Surgery', 'Cataract Surgery + MIGS', 'Standalone Omni', 'Pterygium Surgery'];

  var QID_NSAIDS = ['Ketorolac', 'Diclofenac', 'Flurbiprofen'];
  var DAILY_NSAIDS = ['Prolensa', 'Bromfenac'];

  function durationFor(surgery) {
    switch (surgery) {
      case 'Tube Shunt Surgery': return 42;
      case 'Trabeculectomy':     return 84;
      case 'Standard CPC':       return 42;
      default:                   return 28;   // cataract ± MIGS, Omni, pterygium, micropulse
    }
  }

  function applies(surgery, field) {
    switch (field) {
      case 'steroid':    return SURGERIES.indexOf(surgery) !== -1;
      case 'antibiotic': return ANTIBIOTIC_SURGERIES.indexOf(surgery) !== -1;
      case 'nsaid':      return NSAID_SURGERIES.indexOf(surgery) !== -1;
      case 'ointment':   return OINTMENT_SURGERIES.indexOf(surgery) !== -1;
      default:           return false;
    }
  }

  function steroidsFor(surgery) {
    if (!surgery) return STEROIDS.slice();
    return PMB_SURGERIES.indexOf(surgery) !== -1 ? STEROIDS.slice() : ['Prednisolone Acetate'];
  }

  function steroidCount(surgery, steroid, day) {
    var taper4 = function () {
      if (day < 7)  return 4;
      if (day < 14) return 3;
      if (day < 21) return 2;
      if (day < 28) return 1;
      return 0;
    };
    var taperPMB = function () {
      if (day < 14) return 3;
      if (day < 28) return 2;
      return 0;
    };
    var taper8over42 = function () {
      if (day < 7)  return 8;
      if (day < 14) return 6;
      if (day < 21) return 4;
      if (day < 28) return 3;
      if (day < 35) return 2;
      if (day < 42) return 1;
      return 0;
    };

    switch (surgery) {
      case 'Cataract Surgery':
      case 'Cataract Surgery + MIGS':
      case 'Standalone Omni':
      case 'Pterygium Surgery':
        if (steroid === 'Prednisolone Acetate') return taper4();
        if (steroid === 'Pred-Moxi-Brom')       return taperPMB();
        return 0;
      case 'Tube Shunt Surgery':
      case 'Standard CPC':
        return taper8over42();
      case 'Trabeculectomy':
        if (day < 14) return 8;
        if (day < 28) return 6;
        if (day < 42) return 4;
        if (day < 56) return 3;
        if (day < 70) return 2;
        if (day < 84) return 1;
        return 0;
      case 'Micropulse CPC':
        return taper4();
      default:
        return 0;
    }
  }

  function antibioticCount(surgery, antibiotic, day) {
    if (!antibiotic || !applies(surgery, 'antibiotic')) return 0;
    return day < 7 ? 4 : 0;
  }

  function nsaidCount(surgery, nsaid, day) {
    if (!nsaid || !applies(surgery, 'nsaid')) return 0;
    if (QID_NSAIDS.indexOf(nsaid) !== -1)   return day < 28 ? 4 : 0;
    if (DAILY_NSAIDS.indexOf(nsaid) !== -1) return day < 28 ? 1 : 0;
    return 0;
  }

  function ointmentCount(surgery, ointment, day) {
    if (!ointment || !applies(surgery, 'ointment')) return 0;
    return day < 14 ? 1 : 0;
  }

  /*
   * Build the full schedule as data. `v` is the form state:
   *   { surgeryType, steroid, antibiotic, nsaid, ointment }
   * Returns { duration, columns: [{key, label, drug, countFor(day), times}] }
   * Only columns that actually apply to this surgery are included.
   */
  function schedule(v) {
    var s = v.surgeryType;
    var cols = [];
    if (v.antibiotic && applies(s, 'antibiotic')) {
      cols.push({ key: 'antibiotic', label: 'Antibiotic', drug: v.antibiotic,
        countFor: function (d) { return antibioticCount(s, v.antibiotic, d); } });
    }
    if (v.steroid && steroidsFor(s).indexOf(v.steroid) !== -1) {
      cols.push({ key: 'steroid', label: 'Steroid', drug: v.steroid,
        countFor: function (d) { return steroidCount(s, v.steroid, d); } });
    }
    if (v.nsaid && applies(s, 'nsaid')) {
      cols.push({ key: 'nsaid', label: 'NSAID', drug: v.nsaid,
        countFor: function (d) { return nsaidCount(s, v.nsaid, d); } });
    }
    if (v.ointment && applies(s, 'ointment')) {
      cols.push({ key: 'ointment', label: 'Ointment', drug: v.ointment, bedtime: true,
        countFor: function (d) { return ointmentCount(s, v.ointment, d); } });
    }
    return { duration: durationFor(s), columns: cols };
  }

  return {
    SURGERIES: SURGERIES,
    STEROIDS: STEROIDS,
    ANTIBIOTICS: ANTIBIOTICS,
    NSAIDS: NSAIDS,
    OINTMENTS: OINTMENTS,
    durationFor: durationFor,
    applies: applies,
    steroidsFor: steroidsFor,
    steroidCount: steroidCount,
    antibioticCount: antibioticCount,
    nsaidCount: nsaidCount,
    ointmentCount: ointmentCount,
    schedule: schedule
  };
});
