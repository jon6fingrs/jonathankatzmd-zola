/* Which kind of artificial tear suits which situation
 * (content/learn/choosing-artificial-tears.md, drawn by tearpicker.js).
 * No DOM, so Node can test it (tests/tearpicker-rules.test.js).
 *
 * The advice is the general guidance on the site's dry eye pages and the
 * medication chart: preserved tears are fine up to about four times a day;
 * beyond that, or with contact lenses or sensitive eyes, use
 * preservative-free; thicker gels last longer but blur; ointment is for
 * bedtime. `chart` is the entry's `generic` name in static/data/eye-drops.json,
 * so the page can show the brands and photos from the chart.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKTearPicker = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var KINDS = {
    preserved: { name: 'Standard artificial tears', chart: 'Artificial Tears', how: 'In an ordinary bottle. Fine up to about four times a day.' },
    pf: { name: 'Preservative-free artificial tears', chart: 'Artificial Tears PF', how: 'In single-use vials or special bottles. Can be used as often as needed.' },
    gel: { name: 'Gel drops', chart: 'Lubricating Gel Drops', how: 'Thicker, so they last longer. They blur vision for a minute or two.' },
    ointment: { name: 'Ointment at bedtime', chart: 'Lubricating Ointment', how: 'Protects the eye overnight. It blurs vision, so use it just before sleep.' }
  };

  // answers: { often: 'low' | 'high', contacts: bool, sensitive: bool, lasting: bool, night: bool, oil: bool }
  function pick(a) {
    a = a || {};
    var picks = [], notes = [], needPf = a.often === 'high' || a.contacts || a.sensitive;
    if (needPf) {
      var why = [];
      if (a.often === 'high') why.push('you need them more than four times a day');
      if (a.contacts) why.push('you wear contact lenses');
      if (a.sensitive) why.push('your eyes are sensitive or you use other eye drops');
      picks.push({ kind: 'pf', when: 'During the day', why: 'Because ' + why.join(', and ') + '. Preservatives can irritate the surface with frequent use.' });
    } else {
      picks.push({ kind: 'preserved', when: 'During the day', why: 'Up to four times a day, a standard bottle is fine and costs less. Preservative-free is also fine if you prefer it.' });
    }
    if (a.lasting && !a.contacts) picks.push({ kind: 'gel', when: 'When you need it to last', why: 'Regular tears wear off quickly for you. A gel drop stays on the eye longer; use it when a minute of blur does not matter.' });
    if (a.night) picks.push({ kind: 'ointment', when: 'At bedtime', why: 'Your eyes are worst on waking, which usually means they dry out overnight.' });

    if (a.contacts) notes.push('With contact lenses, use drops labeled for use with contacts, or put drops in before the lenses go in and after they come out. Do not use gels or ointment with lenses in.');
    if (a.lasting && a.contacts) notes.push('Gel drops last longer but are not for use with lenses in. Use them after the lenses are out.');
    if (a.oil) notes.push('For blocked oil glands, look for tears that contain oil (often labeled "lipid", "for evaporative dry eye" or "for MGD"), and keep up warm compresses and lid cleaning.');
    if (a.often === 'high') notes.push('Needing tears many times a day is a reason to be seen. Prescription drops or punctal plugs may help more.');
    notes.push('Use tears on a schedule, not only when the eyes hurt, and leave five minutes between different drops.');
    notes.push('Avoid drops that promise to "get the red out".');
    return { picks: picks, notes: notes };
  }

  return { pick: pick, KINDS: KINDS };
});
