// The Print button on the stand-alone print pages in static/print/. A file
// rather than an onclick attribute so the Content-Security-Policy
// (static/_headers) can forbid inline scripts.
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('[data-print]')) window.print();
});
