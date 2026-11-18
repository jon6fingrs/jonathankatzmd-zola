/* Which kinds of lens implant fit which wishes and which eyes
 * (content/learn/lens-implants.md, drawn by iolpicker.js).
 * No DOM, so Node can test it (tests/iolpicker-rules.test.js).
 *
 * The rules follow the page's own text: monofocal lenses suit every eye;
 * extended depth and multifocal lenses need a healthy cornea, macula and
 * optic nerve, and bring halos; monovision is best tried with contact
 * lenses first; toric versions are added for astigmatism. The light
 * adjustable lens follows its FDA labeling: UV-protective glasses during all
 * waking hours until the power is locked in, and not for macular disease,
 * light-sensitizing medicines, herpes of the eye or nystagmus. The light
 * treatments are given through a dilated pupil.
 *
 * Laser-assisted surgery is assumed with a toric or multifocal lens, unless
 * something in the eye rules the laser out (poor dilation, a corneal scar,
 * a bleb or tube shunt, trouble lying flat or still); the lens is then
 * placed with standard surgery and its verdict does not change.
 *
 * Every lens gets a verdict, 'good', 'possible' or 'avoid', with the
 * reasons. The worst reason wins. It is a starting point for a talk with the
 * surgeon, and the page says so.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKIolPicker = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // anchor: the heading on lens-implants.md that explains the lens
  // extra: usually carries an out-of-pocket charge on top of insurance
  var LENSES = [
    { id: 'distance', name: 'Monofocal, set for distance', anchor: 'monofocal-lenses', extra: false,
      what: 'Sharp distance vision with the least glare. Reading glasses for near.' },
    { id: 'enhanced', name: 'Enhanced monofocal', anchor: 'monofocal-lenses', extra: false,
      what: 'Like a monofocal, with a little more range at arm’s length. Reading glasses for near.' },
    { id: 'near', name: 'Monofocal, set for near', anchor: 'monofocal-lenses', extra: false,
      what: 'Reading without glasses; glasses for driving and distance.' },
    { id: 'monovision', name: 'Monovision', anchor: 'monovision', extra: false,
      what: 'One eye set for distance, the other for near, with monofocal lenses.' },
    { id: 'lal', name: 'Light adjustable lens', anchor: 'light-adjustable-lenses', extra: true,
      what: 'A monofocal lens whose power is fine-tuned with light treatments after surgery, once you can try the result.' },
    { id: 'edof', name: 'Extended depth of focus', anchor: 'extended-depth-of-focus-lenses', extra: true,
      what: 'Distance to arm’s length without glasses; light readers for small print. Mild halos with some designs.' },
    { id: 'multifocal', name: 'Multifocal', anchor: 'multifocal-lenses', extra: true,
      what: 'Far, arm’s length and near, with the most freedom from glasses and the most halos.' }
  ];

  // The checklist, grouped. A condition's effect on each lens is in pick().
  var CONDITIONS = [
    { group: 'Glaucoma', items: [
      ['glaucoma-mild', 'Glaucoma, mild and stable'],
      ['glaucoma-adv', 'Glaucoma, moderate or advanced'],
      ['bleb', 'Past trabeculectomy or tube shunt']] },
    { group: 'Retina', items: [
      ['amd', 'Macular degeneration'],
      ['diabetic', 'Diabetic eye disease or swelling of the macula'],
      ['erm', 'A membrane or hole on the macula']] },
    { group: 'Cornea and surface', items: [
      ['dryeye', 'Significant dry eye'],
      ['fuchs', 'Fuchs dystrophy or another corneal disease'],
      ['keratoconus', 'Keratoconus or an irregular cornea'],
      ['scar', 'A corneal scar or haze'],
      ['refractive', 'Past LASIK, PRK or RK']] },
    { group: 'Other', items: [
      ['amblyopia', 'A lazy eye (amblyopia)'],
      ['uveitis', 'Uveitis (inflammation inside the eye)'],
      ['pupil', 'A pupil that does not dilate well (pseudoexfoliation, or medicines such as Flomax)'],
      ['herpes', 'Herpes (cold sore virus) infection of the eye'],
      ['nystagmus', 'Eyes that shake or wobble (nystagmus)'],
      ['flat', 'Trouble lying flat or keeping still for a few minutes'],
      ['photo', 'A medicine that makes you sensitive to sunlight (such as doxycycline, amiodarone or hydrochlorothiazide)'],
      ['other', 'Something else not listed']] }
  ];

  var RANK = { good: 0, possible: 1, avoid: 2 };

  // answers: { glasses: 'readers' | 'near' | 'computer' | 'none', night: bool,
  //   monovision: 'liked' | 'disliked' | 'never', adjust: 'yes' | 'no' | '',
  //   astig: 'yes' | 'no' | 'unknown', conditions: { id: true } }
  function pick(a) {
    a = a || {};
    var c = a.conditions || {}, has = function (k) { return !!c[k]; };
    var macula = has('amd') || has('diabetic') || has('erm');
    var out = {};
    LENSES.forEach(function (l) { out[l.id] = { verdict: 'good', why: [] }; });
    function say(id, verdict, why) {
      var o = out[id];
      if (RANK[verdict] > RANK[o.verdict]) o.verdict = verdict;
      if (why) o.why.push({ verdict: verdict, text: why });
    }

    // What you want afterward
    if (a.glasses === 'none') {
      say('distance', 'possible', 'You would still need reading glasses.');
      say('enhanced', 'possible', 'Reading glasses are still needed for near.');
      say('lal', 'possible', 'It can be set for some near in one eye, but reading glasses are often still needed.');
      say('edof', 'possible', 'Light reading glasses are often still needed for small print.');
      say('multifocal', 'good', 'Gives the most freedom from glasses, including reading.');
    } else if (a.glasses === 'computer') {
      say('distance', 'possible', 'A computer or dashboard is usable but softer without glasses.');
      say('enhanced', 'good', 'A little more range at arm’s length than a standard monofocal.');
      say('edof', 'good', 'Covers distance to arm’s length.');
      say('multifocal', 'possible', 'Covers arm’s length, but brings more halos than you may need.');
    } else if (a.glasses === 'near') {
      say('near', 'good', 'Matches what you want: reading without glasses, glasses for driving and distance.');
      say('distance', 'possible', 'Set for distance, you would need glasses to read instead.');
      say('enhanced', 'possible', 'Usually set for distance, so you would need glasses to read.');
      say('lal', 'possible', 'Can be set for near, and fine-tuned once you try it.');
      say('edof', 'possible', 'Aimed at distance and arm’s length; small print would still need glasses.');
      say('multifocal', 'avoid', 'If glasses for distance are fine, a monofocal set for near gives sharp reading without the halos.');
    } else {
      say('distance', 'good', 'Matches what you want: clear distance, reading glasses for near.');
      say('edof', 'possible', 'More range than you need, with some halos.');
      say('multifocal', 'avoid', 'If reading glasses are fine, the halos and lower contrast are not worth it.');
    }
    if (a.glasses !== 'near') say('near', 'possible', 'Suits people who have been nearsighted all their lives and like to read without glasses; glasses are needed for driving.');

    if (a.night) {
      say('multifocal', 'avoid', 'Halos around lights at night are common, and you drive a lot at night or worry about them.');
      say('edof', 'possible', 'Some designs give mild halos at night; designs without rings give fewer.');
      if (a.monovision !== 'disliked') say('monovision', 'good', 'No halos. Both eyes together are a little less sharp at night; some people keep glasses for night driving.');
    }

    if ((a.glasses === 'none' || a.glasses === 'computer') && a.monovision !== 'disliked') {
      say('monovision', 'good', 'Done well, it gives as much freedom from glasses as a multifocal, from distance to near, without the halos.');
    }
    if (a.monovision === 'liked') say('monovision', 'good', 'You have liked monovision with contact lenses.');
    else if (a.monovision === 'disliked') say('monovision', 'avoid', 'You did not like monovision with contact lenses.');
    else if (a.glasses === 'none' || a.glasses === 'computer') say('monovision', 'good', 'Best tried with contact lenses first, to be sure it suits you.');
    else say('monovision', 'possible', 'Best tried with contact lenses first.');

    if (a.adjust === 'yes') say('lal', 'good', 'You are willing to come back for the light treatments and wear UV-protective glasses until it is locked in.');
    else if (a.adjust === 'no') say('lal', 'avoid', 'It needs several extra visits and UV-protective glasses for all waking hours for some weeks.');
    else say('lal', 'possible', 'It needs several extra visits and UV-protective glasses for all waking hours for some weeks.');

    // The eye
    if (has('glaucoma-adv')) {
      say('multifocal', 'avoid', 'Glaucoma already lowers contrast, and a multifocal lowers it further.');
      say('edof', 'avoid', 'With moderate or advanced glaucoma, a lens that splits or stretches focus costs contrast the eye cannot spare.');
    } else if (has('glaucoma-mild')) {
      say('multifocal', 'avoid', 'Glaucoma already lowers contrast, and a multifocal lowers it further.');
      say('edof', 'possible', 'Sometimes considered in mild, stable glaucoma, usually a design without rings.');
    }
    if (macula) {
      say('multifocal', 'avoid', 'A multifocal needs a healthy macula to work well.');
      say('edof', 'avoid', 'Works best with a healthy macula; macular disease lowers contrast further.');
      say('lal', 'avoid', 'Not for eyes with macular disease, because the effect of the light treatments on it is not known.');
    }
    if (has('dryeye')) {
      say('multifocal', 'avoid', 'An uneven tear film blurs a multifocal lens more than a monofocal. Treat the dry eye first.');
      say('edof', 'possible', 'The dry eye should be treated and settled first, and before the measurements.');
    }
    if (has('fuchs')) {
      say('multifocal', 'avoid', 'Corneal disease lowers contrast, and may worsen after surgery.');
      say('edof', 'avoid', 'Corneal disease lowers contrast, and may worsen after surgery.');
    }
    if (has('scar')) {
      say('multifocal', 'avoid', 'A corneal scar scatters light and lowers contrast, and a multifocal lowers it further.');
      say('edof', 'avoid', 'A corneal scar scatters light and lowers contrast, and these lenses add to it.');
    }
    if (has('keratoconus')) {
      say('multifocal', 'avoid', 'An irregular cornea scatters light, and a multifocal adds to it.');
      say('edof', 'avoid', 'An irregular cornea scatters light, and these lenses add to it.');
    }
    if (has('refractive')) {
      say('multifocal', 'possible', 'After laser or RK the lens power is harder to predict, and the earlier surgery can add to halos.');
      say('edof', 'possible', 'After laser or RK the lens power is harder to predict.');
      say('lal', 'good', 'After laser or RK the power is harder to predict; this lens can be adjusted afterward.');
    }
    if (has('amblyopia')) {
      say('multifocal', 'avoid', 'An eye that has always seen less gains little from a multifocal, and loses contrast.');
      say('edof', 'possible', 'An eye that has always seen less may gain little from the extra range.');
      say('monovision', 'possible', 'It depends on which eye is the weaker one; your surgeon plans around it.');
    }
    if (has('uveitis')) {
      say('multifocal', 'avoid', 'Inflammation can return and affect the macula, and these lenses need a healthy one.');
      say('edof', 'possible', 'Only once the inflammation has been quiet for some months.');
    }
    if (has('pupil')) say('lal', 'avoid', 'The light treatments are given through a widely dilated pupil.');
    if (has('herpes')) say('lal', 'avoid', 'The UV light of the treatments can reactivate herpes in the eye.');
    if (has('nystagmus')) say('lal', 'avoid', 'The eye has to hold still during the light treatments.');
    if (has('photo')) say('lal', 'avoid', 'Medicines that make you sensitive to light can make the UV treatments harmful to the eye. Tell your surgeon every medicine you take.');

    // why the laser would not be used, if anything rules it out
    var noLaser = [];
    if (has('pupil')) noLaser.push('the pupil does not dilate enough for it');
    if (has('scar')) noLaser.push('a corneal scar can block the laser');
    if (has('bleb')) noLaser.push('its suction ring could press on a bleb or tube shunt');
    if (has('flat')) noLaser.push('it needs you to lie flat and still for a few minutes');

    var lenses = LENSES.map(function (l) {
      var o = out[l.id];
      // the reasons that decided the verdict come first; a lens ruled out
      // keeps only the reasons against it
      var why = o.why.filter(function (w) { return o.verdict !== 'avoid' || w.verdict === 'avoid'; })
        .sort(function (x, y) { return RANK[y.verdict] - RANK[x.verdict]; }).map(function (w) { return w.text; });
      var toric = a.astig === 'yes' && o.verdict !== 'avoid' && l.id !== 'lal';
      return { id: l.id, name: l.name, anchor: l.anchor, extra: l.extra, what: l.what, verdict: o.verdict, why: why, toric: toric,
        laser: o.verdict !== 'avoid' && (toric || l.id === 'multifocal') && !noLaser.length };
    });
    var wouldLaser = lenses.some(function (l) { return l.verdict !== 'avoid' && (l.toric || l.id === 'multifocal'); });
    var groups = ['good', 'possible', 'avoid'].map(function (v) {
      return { verdict: v, lenses: lenses.filter(function (l) { return l.verdict === v; }) };
    });

    var notes = [];
    if (a.astig === 'yes') notes.push('With astigmatism, a toric version of the lens corrects it; the light adjustable lens can correct it with its light treatments.');
    if (a.astig === 'yes' && has('keratoconus')) notes.push('A toric lens corrects only regular astigmatism, so it may help less with an irregular cornea.');
    if (a.astig === 'unknown') notes.push('Your measurements before surgery will show whether you have enough astigmatism for a toric lens to help.');
    if (wouldLaser && !noLaser.length) notes.push('Toric and multifocal lenses are usually placed with laser-assisted surgery, which helps center them precisely. For most eyes, vision afterward is about the same as with standard surgery.');
    if (wouldLaser && noLaser.length) notes.push('Laser-assisted surgery would not be used, because ' + noLaser.join(', and ') + '. Toric and multifocal lenses are then placed with standard surgery, which works well.');
    if (has('fuchs') && !noLaser.length) notes.push('With Fuchs dystrophy, laser-assisted surgery can lower the ultrasound energy needed, which is gentler on the cornea. Ask whether it suits you whatever the lens.');
    if (has('glaucoma-mild') || has('glaucoma-adv')) notes.push('With glaucoma, a monofocal lens also keeps future visual field tests easiest to read.');
    if (has('amblyopia')) notes.push('A lens implant cannot fix a lazy eye: vision in that eye after surgery is usually about what it was with glasses before the cataract.');
    if (has('dryeye')) notes.push('Treat dry eye before the measurements for surgery; it can throw them off.');
    if (has('other')) notes.push('Many other conditions affect the choice of lens. Your surgeon will take them into account.');
    notes.push('Lenses beyond a standard monofocal, toric versions and laser-assisted surgery may involve an out-of-pocket expense. It varies, so ask the surgeon’s office.');
    return { groups: groups, lenses: lenses, notes: notes };
  }

  return { pick: pick, LENSES: LENSES, CONDITIONS: CONDITIONS };
});
