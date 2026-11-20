/* Amsler grid (content/learn/macular-degeneration.md). A home check for
 * distortion at the center of vision. The grid is drawn here so it can also
 * show an example of what a change looks like. "Print the grid" opens
 * static/print/amsler-grid.html, a page holding only the grid at 10 cm and
 * the instructions, because hiding the rest of a page for printing is not
 * honored by every browser (Safari on iPhone printed the whole page).
 */
(function () {
  'use strict';
  var root = document.getElementById('jk-amsler');
  if (!root) return;
  var N = 20, SIZE = 400, C = SIZE / 2;
  // where the example pushes the lines: a bulge up and to the right of center, with a blank patch
  function warp(x, y, on) {
    if (!on) return [x, y];
    var dx = x - 250, dy = y - 160, g = Math.exp(-(dx * dx + dy * dy) / 3200);
    return [x + dx * 0.42 * g + 9 * g * Math.sin(y / 16), y + dy * 0.42 * g + 9 * g * Math.sin(x / 16)];
  }
  function grid(on) {
    var h = '<svg class="jk-amsler__svg" viewBox="-4 -4 ' + (SIZE + 8) + ' ' + (SIZE + 8) + '" role="img" aria-label="' + (on ? 'Amsler grid with an example of wavy lines and a blurred patch' : 'Amsler grid: a square grid with a dot at the center') + '">'
      + '<rect x="0" y="0" width="' + SIZE + '" height="' + SIZE + '" fill="#fff"/>', i, t, d, p;
    for (i = 0; i <= N; i++) {
      d = ''; for (t = 0; t <= SIZE; t += 5) { p = warp(i * SIZE / N, t, on); d += (t ? ' L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }
      h += '<path d="' + d + '" fill="none" stroke="#111827" stroke-width="' + (i === 0 || i === N ? 2.5 : 1.2) + '"/>';
      d = ''; for (t = 0; t <= SIZE; t += 5) { p = warp(t, i * SIZE / N, on); d += (t ? ' L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }
      h += '<path d="' + d + '" fill="none" stroke="#111827" stroke-width="' + (i === 0 || i === N ? 2.5 : 1.2) + '"/>';
    }
    if (on) h += '<defs><radialGradient id="jk-amsler-g"><stop offset="0.3" stop-color="#9ca3af" stop-opacity="0.9"/><stop offset="1" stop-color="#9ca3af" stop-opacity="0"/></radialGradient></defs><ellipse cx="262" cy="150" rx="46" ry="36" fill="url(#jk-amsler-g)"/>';
    return h + '<circle cx="' + C + '" cy="' + C + '" r="5" fill="#111827"/></svg>';
  }
  root.innerHTML = '<div class="jk-chips jk-amsler__tabs" role="group" aria-label="Grid">'
    + '<button type="button" class="jk-chip is-active" data-ex="0" aria-pressed="true">The grid</button>'
    + '<button type="button" class="jk-chip" data-ex="1" aria-pressed="false">Example of a change</button></div>'
    + '<div class="jk-amsler__grid" id="jk-amsler-grid"></div>'
    + '<p class="jk-amsler__note" id="jk-amsler-note"></p>'
    + '<div class="jk-lpi__controls"><a class="btn btn-outline-primary" id="jk-amsler-print" href="' + (root.getAttribute('data-print') || '#') + '" target="_blank" rel="noopener">Print the grid</a></div>';
  var box = document.getElementById('jk-amsler-grid'), note = document.getElementById('jk-amsler-note');
  function show(on) {
    box.innerHTML = grid(on);
    note.textContent = on ? 'An example only: wavy lines and a blurred or missing patch. If your own grid ever looks like this, call the same day.' : 'Cover one eye, look at the center dot, and notice the lines without looking away from the dot.';
    root.querySelectorAll('[data-ex]').forEach(function (b) { var a = (b.getAttribute('data-ex') === '1') === on; b.classList.toggle('is-active', a); b.setAttribute('aria-pressed', String(a)); });
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-ex')) show(b.getAttribute('data-ex') === '1');
  });
  show(false);
  root.classList.add('is-ready');
})();
