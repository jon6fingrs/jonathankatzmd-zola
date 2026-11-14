// Plausible's queue stub, so plausible('event') calls made before the deferred
// /js/vx.js arrives are kept and sent once it loads. A file rather than an
// inline script so the Content-Security-Policy (static/_headers) can forbid
// inline scripts.
window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
