/* Site search (content/search.md, templates/search.html).
 *
 * The search page carries its own index: templates/search.html writes every
 * Learn article, topic, tool and drug into a JSON block at build time, so
 * there is no server and nothing leaves the browser. This file cleans that
 * text, ranks entries for a query and draws the results.
 *
 * The ranking functions have no DOM access, so tests/search.test.js runs them
 * under Node (module.exports); in the browser they are window.JKSearch.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.JKSearch = api; api.boot(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Lowercase, drop accents (Sjögren -> sjogren) and curly quotes.
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019]/g, "'").toLowerCase();
  }

  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘',
    rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', middot: '·', rarr: '→', rsaquo: '›' };

  // A page's rendered HTML to plain text. Image alt text is kept, since the
  // figures describe things the prose does not always name; the "needs
  // JavaScript" notes are dropped.
  function clean(html) {
    return String(html || '')
      .replace(/<img\b[^>]*?\balt="([^"]*)"[^>]*>/gi, ' $1 ')
      .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<p class="jk-vis__noscript">[\s\S]*?<\/p>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, e) {
        if (e.charAt(0) === '#') return String.fromCharCode(e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1));
        return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : ' ';
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Abbreviations patients see on paperwork, mapped to the words the pages use.
  var ALIAS = { iop: 'pressure', pressures: 'pressure', drop: 'drops', ppv: 'vitrectomy', lpi: 'iridotomy', cpc: 'cyclophotocoagulation',
    amd: 'macular', armd: 'macular', pvd: 'floaters', rd: 'detachment', dme: 'macular', pco: 'capsule', pk: 'transplant', dmek: 'transplant', mgd: 'glands' };

  function terms(q) {
    return norm(q).split(/[^a-z0-9']+/).map(function (t) { t = t.replace(/^'+|'+$/g, ''); return ALIAS[t] || t; })
      .filter(function (t, i, all) { return (t.length > 1 || /\d/.test(t)) && all.indexOf(t) === i; });
  }

  // Index entries: { t: title, d: description, s: section, u: url,
  // b: body (markdown, cleaned once), k: kind ("page" | "topic" | "drug") }.
  function prepare(entries) {
    return entries.filter(Boolean).map(function (e) {
      var body = clean(e.b);
      return {
        t: e.t, d: e.d || '', s: e.s || '', u: e.u, k: e.k || 'page', q: e.q || '', body: body,
        nt: ' ' + norm(e.t) + ' ', nd: ' ' + norm(e.d) + ' ', ns: ' ' + norm(e.s) + ' ', nb: ' ' + norm(body) + ' '
      };
    });
  }

  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // A whole word scores more than the start of a word, and the start of a
  // word more than the middle of one. 0 means no match.
  function hit(hay, t) {
    if (new RegExp('[^a-z0-9]' + reEsc(t) + '[^a-z0-9]').test(hay)) return 3;
    if (new RegExp('[^a-z0-9]' + reEsc(t)).test(hay)) return 2;
    return t.length > 3 && hay.indexOf(t) !== -1 ? 1 : 0;
  }
  function count(hay, t) {
    var n = 0, i = hay.indexOf(t);
    while (i !== -1 && n < 6) { n++; i = hay.indexOf(t, i + t.length); }
    return n;
  }

  // Every term has to appear somewhere in the entry. Titles count most, then
  // descriptions, then the section name, then how often the body uses it.
  // A word found in only a few entries says more than one found everywhere
  // ("eye"), so each term is weighted by how rare it is in the index.
  function matches(e, t) { return hit(e.nt, t) || hit(e.nd, t) || hit(e.ns, t) || hit(e.nb, t); }
  function weights(index, ts) {
    return ts.map(function (t) {
      var df = 0;
      for (var i = 0; i < index.length; i++) if (matches(index[i], t)) df++;
      return df ? Math.log(1 + index.length / df) : 1;
    });
  }

  function score(e, ts, w) {
    var total = 0;
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i], ht = hit(e.nt, t), hd = hit(e.nd, t), hs = hit(e.ns, t), hb = hit(e.nb, t);
      if (!ht && !hd && !hs && !hb) return 0;
      total += (ht * 12 + hd * 4 + hs * 3 + (hb ? 1 + count(e.nb, t) : 0)) * (w ? w[i] : 1);
    }
    var phrase = ts.join(' ');
    if (e.nt.trim() === phrase) total += 60;
    else if (ts.length > 1 && e.nt.indexOf(' ' + phrase) !== -1) total += 20;
    return total;
  }

  // Ranked entries for a query. With `kind`, only that kind ("drug") or
  // everything else ("page").
  function search(index, q, limit, kind) {
    var ts = terms(q);
    if (!ts.length) return [];
    var pool = kind ? index.filter(function (e) { return (e.k === 'drug') === (kind === 'drug'); }) : index;
    var w = weights(index, ts);
    return pool.map(function (e) { return { e: e, s: score(e, ts, w) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s || (a.e.t < b.e.t ? -1 : 1); })
      .slice(0, limit || 30)
      .map(function (r) { r.e.score = r.s; return r.e; });
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // A stretch of body text around the first term found, with every term
  // marked. Falls back to the description.
  function snippet(e, q) {
    var ts = terms(q), nb = norm(e.body), at = -1;
    for (var i = 0; i < ts.length && at === -1; i++) at = nb.indexOf(ts[i]);
    var text;
    if (at === -1 || e.k !== 'page') text = e.d || e.body.slice(0, 160);
    else {
      var a = Math.max(0, nb.lastIndexOf(' ', Math.max(0, at - 70))), b = nb.indexOf(' ', at + 110);
      if (b === -1) b = e.body.length;
      text = (a > 0 ? '… ' : '') + e.body.slice(a, b).trim() + (b < e.body.length ? ' …' : '');
    }
    var out = esc(text);
    ts.forEach(function (t) {
      if (t.length < 2) return;
      out = out.replace(new RegExp('(^|[^a-z0-9])(' + reEsc(t) + '[a-z0-9]*)', 'gi'),
        function (m, pre, w) { return norm(w).indexOf(t) === 0 ? pre + '<mark>' + w + '</mark>' : m; });
    });
    return out;
  }

  function boot() {
    if (typeof document === 'undefined') return;
    var data = document.getElementById('jk-search-data');
    var input = document.getElementById('jk-search-q');
    var list = document.getElementById('jk-search-results');
    var status = document.getElementById('jk-search-status');
    var hint = document.getElementById('jk-search-hint');
    if (!data || !input || !list) return;
    var index = prepare(JSON.parse(data.textContent));

    var drugBox = document.getElementById('jk-search-drugs');
    var drugList = document.getElementById('jk-search-druglist');

    function item(e, q) {
      return '<li class="jk-result"><a href="' + esc(e.u) + '"><span class="jk-result__sec">' + esc(e.s) + '</span>'
        + '<span class="jk-result__title">' + esc(e.t) + '</span></a>'
        + '<p class="jk-result__text">' + snippet(e, q) + '</p></li>';
    }
    function drugItem(e) {
      return '<li><a href="' + esc(e.u + '?q=' + encodeURIComponent(e.q || e.t)) + '"><strong>' + esc(e.t) + '</strong> <span>' + esc(e.d) + '</span></a></li>';
    }

    function draw() {
      var q = input.value.trim();
      var pages = search(index, q, 25, 'page'), drugs = search(index, q, 12, 'drug');
      list.innerHTML = pages.map(function (e) { return item(e, q); }).join('');
      drugList.innerHTML = drugs.map(drugItem).join('');
      drugBox.hidden = !drugs.length;
      // A drug name typed exactly: show the medications first.
      drugBox.classList.toggle('jk-search__drugs--first', !!(drugs.length && (!pages.length || drugs[0].score > pages[0].score)));
      if (hint) hint.hidden = !!q;
      var n = pages.length + drugs.length;
      status.textContent = !q ? '' : n ? (pages.length ? pages.length + ' page' + (pages.length === 1 ? '' : 's') : '')
        + (pages.length && drugs.length ? ' and ' : '') + (drugs.length ? drugs.length + ' medication' + (drugs.length === 1 ? '' : 's') : '')
        : 'Nothing found for “' + q + '”. Try a shorter word, or browse the Learn topics.';
      try {
        var u = new URL(location.href);
        if (q) u.searchParams.set('q', q); else u.searchParams.delete('q');
        history.replaceState(null, '', u);
      } catch (err) { /* old browser: the address just doesn't update */ }
    }

    var timer;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(draw, 120); });
    var form = input.form;
    if (form) form.addEventListener('submit', function (ev) { ev.preventDefault(); draw(); input.blur(); });
    try { input.value = new URLSearchParams(location.search).get('q') || ''; } catch (err) { /* ignore */ }
    draw();
  }

  return { norm: norm, clean: clean, terms: terms, prepare: prepare, score: score, search: search, snippet: snippet, boot: boot };
});
