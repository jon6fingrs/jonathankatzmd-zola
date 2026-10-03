# jonathankatzmd.com — Zola static site

Ophthalmology practice website, migrated from WordPress to
[Zola](https://www.getzola.org/) (static site generator, Rust/Tera) in
2026. This README exists so that anyone — human or Claude Code — picking
this repo up cold has the context that isn't visible from the source files
alone.

**Before touching anything that handles secrets**, read
`CREDENTIALS-AUDIT.md` if present. Short version: `docker-compose.yml` and
`nginx.conf` are real, deployed, gitignored files — never commit them. Work
from the `.example` versions.

## What's in this repo vs. what isn't

| Tracked in git | Gitignored | Why |
|---|---|---|
| `content/`, `templates/`, `static/css`, `static/js`, `static/data`, `static/fonts`, `static/vendor`, `static/images`, `tests/` | — | hand-authored source |
| `config.toml` | — | site config; no secrets in it |
| `.github/workflows/ci.yml` | — | build + tests on every PR |
| `docker-compose.yml.example` | `docker-compose.yml` | the real file has an SMTP password and a token secret |
| `nginx.conf.example` | `nginx.conf` | the real file is tied to this one host's container names |
| — | `public/` | build output — `zola build` regenerates it |
| — | `static/processed_images/` | build output — `resize_image()` thumbnails, favicons, hero WebP |

**There is no theme.** The site used to extend the `portio-zola` theme, but
every template and nearly every style was overridden, and the theme's
stylesheet pulled two fonts from Google on every page. Everything now lives
in `templates/` and `static/css/custom.css`. Bootstrap 5.3 (CSS + bundle JS)
is vendored in `static/css` and `static/js`; it is used for the navbar
collapse/dropdown behaviour, buttons and the contact form grid.

## Setup from a fresh clone

```bash
git clone <this-repo> && cd <this-repo>

# 1. fill in the two deployment files from their templates
cp docker-compose.yml.example docker-compose.yml   # then edit the CHANGEME values
cp nginx.conf.example nginx.conf                   # then edit the CHANGEME values

# 2. build with the official Zola image (this project does NOT use a Zola
#    binary installed on the host)
docker run --rm -v "$(pwd):/project" -w /project ghcr.io/getzola/zola:v0.23.3 build

# 3. run the dosing-rule tests (any Node 18+)
node --test 'tests/**/*.test.js'
```

To preview locally with a plain Zola binary:
`zola serve` or `zola build --base-url http://127.0.0.1:1111 && (cd public && python3 -m http.server 1111)`.

The production deployment runs the same image as a long-lived `zola-build`
service in `docker-compose.yml` that builds once and exits; see that file.

## Deployment model

**CI builds, it does not deploy** (PR previews aside, see above). `.github/workflows/ci.yml` runs on every
push and PR: `zola build`, `zola check --skip-external-links`, the Node
tests, and a sanity check of `eye-drops.json`. A red check means "don't
deploy this". Deploys themselves are still manual:

1. `rsync` the changed files to the host (`/home/jonathan/zola/` in
   production).
2. Restart the `zola-build` container (rebuilds `public/` from the current
   source).
3. Restart `nginx` too, but **only** if `nginx.conf` changed — content and
   template changes need just the `zola-build` restart, since nginx serves
   straight from the shared `public/` directory.

Traefik (reverse proxy, TLS termination) and Portainer (container
management UI) sit in front of this stack but aren't part of this repo.

## Previewing a change before deploying

Open a pull request (a draft is fine). `.github/workflows/preview.yml`
builds that branch and publishes it to GitHub Pages at
`https://<owner>.github.io/<repo>/pr-preview/pr-<number>/`, then comments the
link on the PR. Every push updates it; closing or merging removes it.
Preview builds set `JK_PREVIEW`, which adds `noindex`, drops analytics,
turns off the contact form and shows a yellow "Preview build" banner. The
production build never sets it.

One-time setup: after the first preview run creates the `gh-pages` branch,
go to Settings → Pages → Source "Deploy from a branch" → `gh-pages`, `/ (root)`.

**Previews live under a sub-path, so never hard-code root paths.** In
Markdown, link pages with Zola's internal links (`[text](@/learn/migs.md)`,
`[text](@/contact/_index.md)`); `zola check` verifies them. In raw HTML
inside content, use paths relative to the page (`../eye-drop-form/`). In
templates, use `get_url(...)`. In CSS, `url("../fonts/...")`. The PR's
preview comment is the quickest way to spot a link that escaped.

## Content → template map

| Content | Template | Notes |
|---|---|---|
| `content/_index.md` | `templates/index.html` | home: hero (WebP via `resize_image`), tool cards, bio + office phones, Learn cards, Physician JSON-LD built from `config.extra.offices` |
| `content/about.md`, `content/learn/*.md`, `content/privacy.md` | `templates/page.html` | `[extra] article = true` gives the 720px reading layout, an `<h1>`, and previous/next links within the section |
| `content/learn/_index.md`, `content/patients/_index.md` | `templates/section.html` | card grid of the section's pages |
| `content/patients/eye-drops.md` | `templates/eye-drops.html` | renders `static/data/eye-drops.json` twice: a table (≥768px) and a card list (phones). `static/js/droptable.js` filters both, builds the filter chips, sorts, and runs the lightbox |
| `content/patients/post-op-schedule.md` | `templates/page.html` | form markup lives in the content file; logic in `static/js/postop-rules.js` (dosing rules, tested) + `static/js/postop.js` (UI) |
| `content/patients/eye-drop-form.md` | `templates/page.html` | row template in the content file; logic in `static/js/dropform.js` |
| both generators | — | share `static/js/schedule-common.js` (dates, dose times, `.ics` export, QR via `static/vendor/qrcode.js`, URL state, print helpers) |
| `content/contact/_index.md` | `templates/contact/section.html` | office list driven by `config.toml`'s `[[extra.offices]]`, not by content |
| `content/videos.md` | — | `draft = true`; not built or linked until there are videos |
| any unmatched URL | `templates/404.html` | custom |

A page's `[extra]` can load scripts with `scripts = ["vendor/x.js", "js/y.js"]`
(in order) or a single `js = "js/y.js"`.

### `static/data/eye-drops.json` is the single source of truth

Both the reference page (build time) and the schedule builder (runtime
fetch) read it. Add a drug once and it appears in both, and its `use`
value becomes a filter chip automatically. Pills use `Tablet` or `Capsule`
as their `color`; that drives the "By mouth" chip, and in the schedule
builder it locks "Which eye" to "By mouth", skips the five-minute drop
spacing, and words the calendar reminder "Take:". Where photos came from is
in IMAGE-SOURCES.md. Keys: `generic`, `brand`
(comma-separated if several), `color` (cap colour; `Vial`/`Tube` for
containers), `use` (comma-separated categories), `dosage`, `notes`
(`Preservative Free` in notes drives that chip), `photos` (filenames in
`static/images/drops/`; may be empty). Photos are thumbnailed at build
time, so any size source is fine. CI fails if a listed photo is missing.

### Learn-page illustrations

The diagrams on the Learn pages are hand-drawn SVGs in `static/images/learn/`,
generated by `python3 tools/learn-figures.py` (no dependencies; edit and
re-run). Place one in Markdown with the `figure` component defined in
`templates/components.html`:

```
{{<figure src="images/learn/slt.svg" alt="..." caption="..." />}}
```

Zola 0.23 components take space-separated arguments; the classic
`{{ figure(...) }}` shortcode form is not supported. Use curly quotes inside
`alt`/`caption`, never straight double quotes.

### Post-op dosing rules are tested

`static/js/postop-rules.js` holds every taper and the "which medications
apply to which surgery" table, with no DOM access, so Node can load it.
`tests/postop-rules.test.js` pins the expected tapers. **If a rule is
changed on purpose, update the test in the same commit**; CI runs them.

## Mobile-first conventions (keep these for new pages)

The site is used on phones in exam rooms and kitchens. Rules that every
page follows and new work should too:

- **Design the narrow layout first; widen with `@media (min-width: …)`.**
  Breakpoints in use: 640px (schedule tables become cards below this),
  768px (reference table ↔ cards; drop-builder rows stack ↔ flow),
  900px (home about/offices two-column), 992px (Bootstrap navbar collapse).
- **Tables need a phone rendering.** Either emit a second card markup
  (eye-drops.html) or give each `<td>` a `data-label` and the table the
  `schedule-table--stack` class, which turns rows into cards below 640px
  and back into a table for print.
- **No fixed widths on form controls.** `width: 100%` plus grid columns;
  `min-height: 44px` for tap targets.
- **Check `document.documentElement.scrollWidth` at 390px.** It must equal
  the viewport width. Grid children need `min-width: 0` or
  `minmax(0, 1fr)` columns or long drug names will overflow.
- **Print always uses the table layout** with `pt` units (see below).

## Architecture decisions worth knowing before changing anything

**Tera 2 syntax.** Zola 0.23 ships Tera 2. `{% macro %}` files, the
`concat`/`map` filters and `is containing(...)` tests from Tera 1 are not
available. Use `"text" in value` for substring tests, do list building in
JS (as the filter chips do), and inline repeated markup rather than
reaching for macros.

**Two containers, not one.** `zola-build` (official Zola image, runs once,
exits) and `nginx` (serves the output) are separate services sharing a bind
mount. Rebuilding after a content edit is `docker restart zola-build`, and
nginx never needs to restart for that, so there's no serving downtime.

**Why `zola-build` and `nginx` both mount the whole project directory,
not just `public/`.** `zola build` deletes and recreates `public/` on
every run — you cannot `rmdir` a directory that something else has
separately mounted. Mount the parent project directory into both
containers (read-write for `zola-build`, read-only for `nginx`) and point
nginx's `root` at the `public/` subdirectory.

**Hostnames in `nginx.conf` go through `set $var`, never written
literally in `proxy_pass`.** A literal hostname is resolved once at
startup; if it doesn't resolve yet, nginx refuses to start at all. The
variable form defers resolution to request time.

**`minify_html = true` strips default HTML attributes** (e.g.
`type="submit"` on a `<button>`). Select elements by `id`, not by such
attributes.

**Never read a form field as `form.<fieldname>` in JavaScript.** Use
`form.elements['fieldname']`; `HTMLFormElement`'s own properties shadow
same-named inputs.

**A `<form>` submitted via `fetch()` defaults to `multipart/form-data`.**
hugo-contact only parses `application/x-www-form-urlencoded`, so
`contact.js` sends `URLSearchParams`.

**Nav links use `get_url(..., trailing_slash=true)`.** Without it Zola
emits `/about` and nginx 301s every click to `/about/`.

**Schedule state lives in the query string, not in storage.** Both
generators write their form state to the URL (short keys so the QR stays
small) and rebuild from it on load. That is what makes the QR code and
"send a link" work with no backend, and it is why the Privacy page can say
nothing is stored or sent.

**`.ics` export uses floating local times, no TZID.** A patient's phone
reads "08:00" as 08:00 wherever they are, which is what a drop schedule
means. One recurring event per dose time per taper phase, `UNTIL` on the
last day of that phase; open-ended drops (no stop date) get a daily rule
with no `UNTIL`.

**Print stylesheets use `pt`, not `px`, for anything that must survive
printing.** A 1px border can land between device pixels at 300dpi and
vanish on some rows; `pt` units never round away. Checkboxes are drawn with
`appearance: none` and a `pt` border for the same reason.

**Image pipeline.** `resize_image()` writes into `static/processed_images/`
(gitignored). Drug photos: 116px-tall WebP thumbnails (2× the 58px
display); the lightbox loads the original from `data-full`. Hero: 942px
WebP with the PNG as `<picture>` fallback. Icons: three PNG sizes from
`logo.png`. Zola's image crate does not read AVIF, so sources are
JPEG/PNG/WebP/GIF. The two `.avif` files in `static/images/drops/` are
the WordPress-era originals, unreferenced by the JSON and kept only so
old links to those exact filenames still resolve; don't list them in
`photos`.

## Known rough edges

- `fetch-assets.sh` is a one-time migration script that pulled images from
  the original WordPress install. Historical reference only.
- The contact form backend (hugo-contact) only accepts a fixed field set;
  extending the form with a new field requires backend changes.
- New reference-table entries without photos show an empty photo cell;
  add a file to `static/images/drops/` and list it in `photos` to fill it.
- Dose-time defaults (`JK.doseTimes` in `schedule-common.js`; once-daily
  glaucoma drops at 21:00 in `dropform.js`) are conventions, not
  prescriptions; adjust there if the practice prefers different times.
