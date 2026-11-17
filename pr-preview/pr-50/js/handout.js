/* Procedure handouts (templates/handout.html): draws the QR code that links
 * the printed sheet back to its full Learn page, and runs the Print button.
 * The QR library is static/vendor/qrcode.js, as in the schedule tools. */
(function () {
  'use strict';
  document.querySelectorAll('[data-qr]').forEach(function (el) {
    if (!window.qrcode) return;
    var q = window.qrcode(0, 'M');
    q.addData(el.getAttribute('data-qr'));
    q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    var svg = el.querySelector('svg');
    if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'QR code linking to the full page'); }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-print]')) window.print();
  });
})();
