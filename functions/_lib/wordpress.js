// Leftover WordPress URLs from before the move to Zola.
//
// Drug photos moved from /wp-content/uploads/YYYY/MM/<file> to
// /images/drops/<file> with the same filenames, so those redirect. Every
// other WordPress path is 410 Gone rather than 404: it tells crawlers to drop
// the URL for good and keeps bot noise out of the 404 page's analytics.

const UPLOAD = /^\/wp-content\/uploads\/[0-9]{4}\/[0-9]{2}\/(.+)$/;

export function wordpress({ request }) {
  const url = new URL(request.url);
  const m = UPLOAD.exec(url.pathname);
  if (m) return Response.redirect(new URL('/images/drops/' + m[1], url), 301);
  return new Response('Gone\n', { status: 410, headers: { 'Content-Type': 'text/plain' } });
}
