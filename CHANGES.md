# Comprehensive update — self-hosted fonts + all pending review fixes

Apply this instead of site-review-fixes.zip. It contains that zip's changes
plus self-hosted fonts, and is the complete current state of every file I
have authored — so it also brings you level if you skipped any earlier round
(print borders, landscape toggle, the steroid guard).

    rsync -avzn ~/Downloads/jonathankatzmd-zola/ jonathan@10.0.1.11:/home/jonathan/zola/   # dry run
    rsync -avz  ~/Downloads/jonathankatzmd-zola/ jonathan@10.0.1.11:/home/jonathan/zola/

Restart zola-build AND nginx (nginx.conf is included).

Deliberately NOT included, so nothing of yours gets clobbered:
  - docker-compose.yml — holds your real SMTP password and Traefik network
  - fetch-assets.sh — already run
  - static/images/*, themes/ — already on the server
Also not included: static/js/dropschedule.js, which was superseded by
dropform.js long ago. Delete it if it is still lying around.

## New in this zip: fonts are self-hosted

Oswald (300, 400) and Roboto (400, 500, 700), latin subset, woff2 only —
91KB total for all five weights, in static/fonts/. Taken from the
@fontsource npm packages; licences sit beside them (Oswald is OFL, Roboto is
Apache 2.0), which is what you need to redistribute them.

No page now makes any request to Google. `@font-face` rules are at the top
of custom.css with `font-display: swap`, so text paints immediately in a
fallback rather than showing invisible text while a webfont loads. The two
weights needed for first paint — Oswald 300 for the masthead, Roboto 400 for
body — are `<link rel="preload">`ed, so they start downloading alongside the
CSS instead of after it.

Remaining third-party requests on page load: the OpenStreetMap iframes on
the Contact page. Those are five embeds that each load OSM's own JS. I can
swap them for static map images or click-to-load if you want that page fully
first-party too — say the word.

## From the review (unchanged from site-review-fixes.zip)

- **EYE DROP FORM added to the FOR PATIENTS dropdown.** You mentioned this
  omission was deliberate. If you want it hidden again, delete the
  `[[extra.menus.children]]` block for it in config.toml — nothing else
  depends on it.
- **Nested `<title>` on the 404 page fixed** (my bug: the theme already
  wraps that block in `<title>`).
- **Page titles now include your name** — "About — Jonathan Katz, MD"
  instead of bare "About".
- **meta description, canonical, Open Graph and Twitter card tags added.**
  The theme emitted none, so shared links produced no preview anywhere.
  Your headshot is the preview image. Five pages that had no description
  got one.
- **noindex + robots.txt.** Now that I know the site genuinely is publicly
  reachable, this matters more, not less: a crawlable duplicate of your
  practice site at a second hostname can cannibalise jonathankatzmd.com in
  search for your own name. Both are one-line reversals at cutover.

## About the nginx.conf change

`absolute_redirect off; port_in_redirect off;` is still in there. Since you
confirmed the site works fine off-network, this did NOT fix a live problem —
the redirect loop was my fetcher's issue. I have left it because it does
prevent a real failure mode for nginx behind a TLS-terminating proxy, and it
changes nothing otherwise. Remove those two lines if you would rather not
carry a change that fixed nothing.

## Two corrections to things I told you earlier

1. The favicon was browser cache, as you found. That also settles a doubt I
   raised: nginx is NOT serving a stale view of public/, so my original
   guidance holds — content changes need only zola-build restarted, not
   nginx. Ignore the paragraph in the last CHANGES.md suggesting otherwise.
2. The external redirect loop was not your site. Disregard the Cloudflare
   "Flexible SSL" theory.

## Cutover checklist for jonathankatzmd.com

Three of these four fail silently:

1. `base_url` in config.toml
2. `[extra.plausible] domain` — must match the Plausible site name exactly,
   or events are accepted and thrown away
3. `noindex = false` in config.toml, and delete static/robots.txt
4. `CORS_ALLOW_ORIGIN` for hugo-contact in docker-compose.yml, or the
   contact form starts returning 403

## Verified

- Builds clean; all 9 pages plus 404.
- Zero references to googleapis.com or gstatic.com in any page.
- 5 woff2 files published, 5 @font-face rules, 2 preloads per page.
- Only offsite hosts left: openstreetmap.org (contact map iframes),
  google.com (map links you click), katzeneye.com (bio link).
- One <title> per page, no nesting, all include the practice name.
- description/canonical/og:*/twitter:* present and populated on every page.
- nginx -t passes.
