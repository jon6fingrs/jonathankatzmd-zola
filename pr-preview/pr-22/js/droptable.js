/* Eye drop reference: search, filter chips, column sort, image lightbox.
 *
 * The page ships two renderings of the same data (a table for wide screens,
 * cards for phones); CSS decides which is visible, and this script filters
 * both in lockstep so switching orientation never loses a filter.
 */
(function () {
  'use strict';

  var table = document.getElementById('jk-drops-table');
  var cards = document.getElementById('jk-drops-cards');
  if (!table || !cards) return;

  var rows = Array.prototype.slice.call(table.tBodies[0].rows);
  var items = Array.prototype.slice.call(cards.children);
  var search = document.getElementById('jk-drops-search');
  // One chip per distinct `use` category, built from the rows so a new
  // category in the JSON shows up without touching the template.
  var chipRow = document.querySelector('#jk-dropfilters .jk-chips');
  var pfChip = chipRow.querySelector('.jk-chip--pf');
  var seen = {};
  rows.forEach(function (r) {
    (r.getAttribute('data-use') || '').split(', ').forEach(function (u) { if (u) seen[u] = true; });
  });
  Object.keys(seen).sort().forEach(function (u) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'jk-chip';
    b.setAttribute('data-filter', u);
    b.setAttribute('aria-pressed', 'false');
    b.textContent = u === 'Non-steroidal Anti-inflammatory' ? 'NSAID' : u;
    chipRow.insertBefore(b, pfChip);
  });
  var chips = Array.prototype.slice.call(chipRow.querySelectorAll('.jk-chip'));
  var countEl = document.getElementById('jk-drops-count');
  var emptyEl = document.getElementById('jk-drops-empty');
  var total = rows.length;

  // Normalise the search text once. (In the template, `| lower` binds only to
  // the last concatenated field, so do the lowercasing here instead.)
  rows.concat(items).forEach(function (el) {
    el.setAttribute('data-search', (el.getAttribute('data-search') || '').toLowerCase());
  });

  var state = { q: '', filter: '' };

  function matches(el) {
    if (state.filter === '__pf') {
      if (!el.hasAttribute('data-pf')) return false;
    } else if (state.filter === '__oral') {
      if (!el.hasAttribute('data-oral')) return false;
    } else if (state.filter) {
      // data-use is e.g. "Steroid, Antibiotic"; match whole categories only
      var uses = (el.getAttribute('data-use') || '').split(', ');
      if (uses.indexOf(state.filter) === -1) return false;
    }
    if (state.q) {
      var hay = el.getAttribute('data-search') || '';
      // every word typed must appear somewhere
      var words = state.q.split(/\s+/);
      for (var i = 0; i < words.length; i++) {
        if (words[i] && hay.indexOf(words[i]) === -1) return false;
      }
    }
    return true;
  }

  function apply() {
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var on = matches(rows[i]);
      rows[i].hidden = !on;
      items[i].hidden = !on;
      if (on) shown++;
    }
    countEl.textContent = 'Showing ' + shown + ' of ' + total;
    emptyEl.hidden = shown !== 0;
  }

  // --- search (debounced a touch so phones don't re-filter on every key) ---
  var timer;
  search.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.q = search.value.trim().toLowerCase();
      apply();
    }, 80);
  });

  // --- chips ---
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.filter = chip.getAttribute('data-filter') || '';
      chips.forEach(function (c) {
        var active = c === chip;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      apply();
    });
  });

  // --- column sort (table only; the card list keeps alphabetical order) ---
  var sortBtns = Array.prototype.slice.call(table.querySelectorAll('.jk-sort'));
  var sortCol = 0, sortDir = 1;
  function cellText(row, col) {
    return row.cells[col].textContent.trim().toLowerCase();
  }
  function sortRows() {
    rows.sort(function (a, b) {
      var x = cellText(a, sortCol), y = cellText(b, sortCol);
      // blanks sink to the bottom whichever way we sort
      if (!x && y) return 1;
      if (x && !y) return -1;
      return x < y ? -sortDir : x > y ? sortDir : 0;
    });
    var tbody = table.tBodies[0];
    rows.forEach(function (r) { tbody.appendChild(r); });
    // keep the parallel card array aligned with the row array
    items = rows.map(function (r) { return itemFor(r); });
  }
  var itemByKey = {};
  Array.prototype.slice.call(cards.children).forEach(function (li) {
    itemByKey[li.getAttribute('data-search')] = li;
  });
  function itemFor(row) { return itemByKey[row.getAttribute('data-search')]; }

  sortBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var col = +btn.getAttribute('data-sort');
      if (col === sortCol) sortDir = -sortDir; else { sortCol = col; sortDir = 1; }
      sortBtns.forEach(function (b) {
        if (b === btn) b.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
        else b.removeAttribute('aria-sort');
      });
      sortRows();
    });
  });

  // --- lightbox ---
  var box = document.getElementById('jk-lightbox');
  var boxImg = document.getElementById('jk-lightbox-img');
  var boxCap = document.getElementById('jk-lightbox-cap');
  var closeBtn = box.querySelector('.jk-lightbox__close');
  var lastFocus = null;

  function open(img) {
    lastFocus = document.activeElement;
    boxImg.src = img.getAttribute('data-full') || img.src;
    boxImg.alt = img.alt || '';
    boxCap.textContent = img.alt || '';
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    box.hidden = true;
    boxImg.src = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onPhotoClick(e) {
    var img = e.target.closest ? e.target.closest('img.jk-drop') : null;
    if (img) open(img);
  }
  table.addEventListener('click', onPhotoClick);
  cards.addEventListener('click', onPhotoClick);
  // make the thumbnails reachable by keyboard too
  Array.prototype.slice.call(document.querySelectorAll('img.jk-drop')).forEach(function (img) {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });

  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.closest('.jk-lightbox__close')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !box.hidden) close();
  });

  apply();
})();
