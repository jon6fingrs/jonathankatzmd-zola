/* Eye drop reference table: interactivity + image lightbox. */
(function () {
  'use strict';

  var table = document.getElementById('jk-drops-table');
  if (!table || !window.simpleDatatables) return;

  new simpleDatatables.DataTable(table, {
    perPage: 25,
    perPageSelect: [10, 25, 50, 100],
    searchable: true,
    sortable: true,
    fixedHeight: false,
    // Let columns size to their content instead of being given inline
    // percentage widths, so the table doesn't stretch edge to edge.
    fixedColumns: false,
    labels: {
      placeholder: 'Search\u2026',
      perPage: 'entries per page',
      noRows: 'No matching entries',
      noResults: 'No results match your search query',
      info: 'Showing {start} to {end} of {rows} entries'
    }
  });

  // --- lightbox ---
  var box = document.getElementById('jk-lightbox');
  var boxImg = document.getElementById('jk-lightbox-img');
  var boxCap = document.getElementById('jk-lightbox-cap');
  if (!box) return;

  function open(src, alt) {
    boxImg.src = src;
    boxImg.alt = alt || '';
    boxCap.textContent = alt || '';
    box.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    box.hidden = true;
    boxImg.src = '';
    document.body.style.overflow = '';
  }

  // Delegated so it keeps working after the table re-renders on sort/search/page.
  table.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('img.jk-drop') : null;
    if (img) open(img.src, img.alt);
  });

  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.closest('.jk-lightbox__close')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !box.hidden) close();
  });
})();
