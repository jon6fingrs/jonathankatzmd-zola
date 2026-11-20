/* Which kind of artificial tear suits which situation, and which products
 * fit (content/learn/choosing-artificial-tears.md, drawn by tearpicker.js).
 * No DOM, so Node can test it (tests/tearpicker-rules.test.js).
 *
 * The advice is the general guidance on the site's dry eye pages: preserved
 * tears are fine up to about four times a day; beyond that, or with contact
 * lenses or sensitive eyes, use preservative-free; tears with oil for blocked
 * oil glands; thicker gels last longer but blur; ointment is for bedtime.
 * The products are in static/data/artificial-tears.json, taken from each
 * product's label on DailyMed (preservative, packaging, what it says about
 * contact lenses).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JKTearPicker = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var KINDS = {
    preserved: { name: 'Standard artificial tears', how: 'In an ordinary bottle. Fine up to about four times a day.' },
    pf: { name: 'Preservative-free artificial tears', how: 'In a preservative-free bottle or single-use vials. Can be used as often as needed.' },
    oil: { name: 'Tears with oil', how: 'Contain an oil that slows the tears from evaporating. Many are milky and need shaking first; follow the label.' },
    gel: { name: 'Gel drops', how: 'Thicker, so they last longer. They blur vision for a minute or two.' },
    ointment: { name: 'Ointment at bedtime', how: 'Protects the eye overnight. It blurs vision, so use it just before sleep.' }
  };

  // answers: { often: 'low' | 'high', contacts: bool, sensitive: bool, lasting: bool, night: bool, oil: bool }
  function pick(a) {
    a = a || {};
    var picks = [], notes = [], needPf = a.often === 'high' || a.contacts || a.sensitive;
    var why = [];
    if (a.often === 'high') why.push('you need them more than four times a day');
    if (a.contacts) why.push('you wear contact lenses');
    if (a.sensitive) why.push('your eyes are sensitive or you use other eye drops');
    var pfWhy = needPf ? 'Because ' + why.join(', and ') + ', choose preservative-free. Preservatives can irritate the surface with frequent use.' : '';
    if (a.oil) {
      picks.push({ kind: 'oil', pf: needPf, when: 'During the day', why: 'Blocked oil glands let the tears evaporate too fast. Drops with oil help replace the oily layer.' + (pfWhy ? ' ' + pfWhy : '') });
    } else if (needPf) {
      picks.push({ kind: 'pf', pf: true, when: 'During the day', why: pfWhy });
    } else {
      picks.push({ kind: 'preserved', pf: false, when: 'During the day', why: 'Up to four times a day, a standard bottle is fine and costs less. Preservative-free is also fine if you prefer it.' });
    }
    if (a.lasting && !a.contacts) picks.push({ kind: 'gel', pf: needPf, when: 'When you need it to last', why: 'Regular tears wear off quickly for you. A gel drop stays on the eye longer; use it when a minute of blur does not matter.' + (needPf ? ' Pick a preservative-free one.' : '') });
    if (a.night) picks.push({ kind: 'ointment', pf: true, when: 'At bedtime', why: 'Your eyes are worst on waking, which usually means they dry out overnight.' });

    if (a.contacts) notes.push('With contact lenses, put drops in before the lenses go in and after they come out, unless the label says the drop can be used with lenses in. Do not use gels or ointment with lenses in. Rewetting drops sold for contact lenses are another option.');
    if (a.lasting && a.contacts) notes.push('Gel drops last longer but are not for use with lenses in. Use them after the lenses are out.');
    if (a.oil) notes.push('Keep up warm compresses and lid cleaning; drops alone do not unblock the glands.');
    if (a.often === 'high') notes.push('Needing tears many times a day is a reason to be seen. Prescription drops or punctal plugs may help more.');
    notes.push('Use tears on a schedule, not only when the eyes hurt, and leave five minutes between different drops.');
    notes.push('Avoid drops that promise to "get the red out".');
    return { picks: picks, notes: notes };
  }

  // The products that fit one pick, as listed in artificial-tears.json.
  function fits(p, k) {
    if (k.pf && !p.pf) return false;
    if (k.kind === 'preserved') return p.form === 'drop' && !p.oil && !p.pf;
    if (k.kind === 'pf') return p.form === 'drop' && !p.oil;
    if (k.kind === 'oil') return p.form === 'drop' && p.oil;
    if (k.kind === 'gel') return p.form === 'gel';
    if (k.kind === 'ointment') return p.form === 'ointment';
    return false;
  }

  // Ordered so the first few come from different brands: one per brand in
  // turn (brands in the order they first appear in the list), a product
  // with a photo first within each brand. With contact lenses, products
  // whose label allows use with lenses in come first.
  function products(list, k, a) {
    a = a || {};
    var byBrand = {}, brands = [];
    (list || []).filter(function (p) { return fits(p, k); }).forEach(function (p) {
      if (!byBrand[p.brand]) { byBrand[p.brand] = []; brands.push(p.brand); }
      byBrand[p.brand].push(p);
    });
    brands.forEach(function (b) {
      byBrand[b].sort(function (x, y) { return (y.photo ? 1 : 0) - (x.photo ? 1 : 0); });
    });
    var out = [];
    for (var i = 0; out.length < (list || []).length; i++) {
      var added = false;
      brands.forEach(function (b) { if (byBrand[b][i]) { out.push(byBrand[b][i]); added = true; } });
      if (!added) break;
    }
    if (a.contacts) out = out.filter(function (p) { return p.lenses === 'ok'; }).concat(out.filter(function (p) { return p.lenses !== 'ok'; }));
    return out;
  }

  return { pick: pick, products: products, KINDS: KINDS };
});
