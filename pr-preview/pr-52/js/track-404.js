// Sends a "404" custom event with the attempted path (templates/404.html).
// Needs a custom event goal named exactly "404" in Plausible, or it records
// nothing. A file rather than an inline script so the Content-Security-Policy
// (static/_headers) can forbid inline scripts.
document.addEventListener('DOMContentLoaded', function () {
  if (window.plausible) window.plausible('404', { props: { path: document.location.pathname } });
});
