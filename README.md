# jonathankatzmd.com — Zola static site

Ophthalmology practice website, migrated from WordPress to
[Zola](https://www.getzola.org/) (static site generator, Rust/Tera) in
2026. This README exists so that anyone — human or Claude Code — picking
this repo up cold has the context that isn't visible from the source files
alone.

**Hosting.** The site runs on Cloudflare Pages. Merging a PR into
`master` builds and deploys it automatically. There is no home server to
pull onto or restart any more. Secrets (SMTP login, token secret) are
Cloudflare and GitHub secrets, never files in the repo; see SETUP.md.
The owner's write-up of the move:
https://thehelpfulidiot.com/moving-four-websites-off-my-home-server-to-cloudflare-pages/

## Working on this repo (start here in a new coding session)

**Workflow.**
1. Work on a branch and open a pull request (a draft is fine).
2. CI (`.github/workflows/ci.yml`) builds the site with Zola, runs
   `zola check` and the Node tests. The preview workflow publishes the
   branch and comments a preview link on the PR (see "Previewing a change"
   below).
3. The owner reviews the preview, then merges.
4. Merging into `master` deploys to Cloudflare Pages automatically, but
   only if CI is green (see "Deployment model"). Nothing else needs
   doing after the merge.

**Don't install Zola locally.** The PR's CI run and preview build are the
build check: they catch template errors, broken `@/` links and failing
tests before anything goes live. Open the PR and read the check results
instead of downloading a Zola binary. The Node tests need no Zola, so
`node --test 'tests/**/*.test.js'` is still fine to run locally when you
change dosing logic.

**Before calling a UI change done:**
- Open the PR and wait for the preview link.
- Load the preview page with Playwright (Chromium) at 390px wide and at
  desktop width, or ask the owner to check it on a phone.
- Check that there is no horizontal scroll (see "Mobile-first
  conventions").
- For anything printable, also render a PDF of the preview page.
- Make sure CI's "Build site and run tests" check is green.

**Verifying the live site after a deploy.** Only when asked, or after
changes to `functions/`, `static/_redirects` or `static/_headers`:
- Fetch every page, asset and photo with `curl` and expect HTTP 200.
- Expect `/videos/` to return 404 while it is a draft.
- The live page should have no preview banner and no `noindex`, and
  should include the Plausible tag and the JSON-LD block.
- `/form-token.js` should return a token.
- The old WordPress URLs should 301 to pages that return 200.
- The live `js/*.js`, `css/custom.css` and `data/eye-drops.json` should
  be byte-identical to `master`.
- A sandboxed browser behind a TLS-intercepting proxy may reject the
  live site's certificate. That is the sandbox, not the site. Use curl
  with the proxy's CA bundle, and never turn off certificate checks.

**Keep private details out of the repo.**
- Never commit secrets (SMTP passwords, `TOKEN_SECRET`, API tokens),
  `.dev.vars`, or details of the owner's home network.
- If the owner shares real configuration to check something, use it for
  checking only, and leave it out of commits, PRs and docs.

**What the owner values.**
- Interactive, polished patient tools: the medication chart, the post-op
  schedule and the schedule builder.
- Every page working well on a phone.
- Printouts that older patients can read easily.
- Plain-language patient content with illustrations rather than walls of
  text.

## What's in this repo vs. what isn't

| Tracked in git | Gitignored | Why |
|---|---|---|
| `content/`, `templates/`, `static/css`, `static/js`, `static/data`, `static/fonts`, `static/vendor`, `static/images`, `tests/` | — | hand-authored source |
| `config.toml` | — | site config; no secrets in it |
| `.github/workflows/ci.yml`, `preview.yml` | — | build + tests on every PR, PR previews, deploy on merge |
| `functions/`, `wrangler.toml`, `static/_redirects`, `static/_headers` | `.dev.vars`, `.wrangler/` | Cloudflare Pages: contact form, analytics proxy, redirects, headers |
| — | `public/` | build output — `zola build` regenerates it |
| — | `static/processed_images/` | build output — `resize_image()` thumbnails, favicons, hero WebP |

**There is no theme.** The site used to extend the `portio-zola` theme, but
every template and nearly every style was overridden, and the theme's
stylesheet pulled two fonts from Google on every page. Everything now lives
in `templates/` and `static/css/custom.css`. Bootstrap 5.3 (CSS + bundle JS)
is vendored in `static/css` and `static/js`; it is used for the navbar
collapse/dropdown behavior, buttons and the contact form grid.

## Setup from a fresh clone

Nothing to set up for normal work: edit, push a branch, open a PR, and let
CI and the preview build it. To test Cloudflare Functions (contact form,
redirects) locally, see SETUP.md, "Local test".

## Deployment model

**Cloudflare Pages, deployed by CI.** `.github/workflows/ci.yml` runs on
every push and PR: `zola build`, `zola check --skip-external-links`, the
Node tests, and a sanity check of `eye-drops.json`. On a push to `master`
(that is, a merged PR), a green build is then deployed to the Cloudflare
Pages project `jonathankatzmd` by the "Deploy to Cloudflare Pages" job. A
red check never deploys.

- The deploy uses the exact `public/` the tests ran against.
- `functions/` replaces the old nginx proxies and hugo-contact: the
  contact form (`/f/contact`, `/form-token.js`), the Plausible proxy
  (`/js/vx.js`, `/vx/event`) and old WordPress URLs.
- To check a deploy, look at the "Deploy to Cloudflare Pages" job on the
  merge commit's CI run.
- To roll back, revert the PR (or re-deploy an older build from the
  Cloudflare dashboard).

Setup, secrets and the contact form's mail settings are in SETUP.md,
"Cloudflare Pages".

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
`[text](@/contact/_index.md)`); CI's `zola check` verifies them. In raw HTML
inside content, use paths relative to the page (`../eye-drop-form/`). In
templates, use `get_url(...)`. In CSS, `url("../fonts/...")`. The PR's
preview comment is the quickest way to spot a link that escaped.

## Content → template map

| Content | Template | Notes |
|---|---|---|
| `content/_index.md` | `templates/index.html` | home: hero (WebP via `resize_image`), tool cards, bio + office phones, Learn cards, Physician JSON-LD built from `config.extra.offices` |
| `content/about.md`, `content/learn/*.md`, `content/privacy.md` | `templates/page.html` | `[extra] article = true` gives the 720px reading layout and an `<h1>`. Every Learn page also sets `topic` and `group` (see "Learn topics" below), which drive the "Related pages" block at the bottom |
| `content/patients/_index.md` ("Tools"; the address stays `/patients/`) | `templates/section.html` | card grid of the section's pages, plus pages from other sections named in `[extra] also` |
| `content/learn/_index.md` | `templates/learn.html` | every topic with its articles; topics and their order come from `[extra] topics` |
| `content/learn/<topic>/_index.md` | `templates/topic.html` | a topic hub: the articles with that `topic`, under the hub's `groups` headings if it has any |
| `content/patients/eye-drops.md` | `templates/eye-drops.html` | renders `static/data/eye-drops.json` twice: a table (≥768px) and a card list (phones). `static/js/droptable.js` filters both, builds the filter chips, sorts, and runs the lightbox |
| `content/patients/post-op-schedule.md` | `templates/page.html` | form markup lives in the content file; logic in `static/js/postop-rules.js` (dosing rules, tested) + `static/js/postop.js` (UI) |
| `content/patients/eye-drop-form.md` | `templates/page.html` | row template in the content file; logic in `static/js/dropform-plan.js` (tapers, tested) + `static/js/dropform.js` (UI) |
| both generators | — | share `static/js/schedule-common.js` (dates, dose times, `.ics` export, QR via `static/vendor/qrcode.js`, URL state, print helpers) |
| `content/learn/vision-loss.md` | `templates/page.html` | the vision simulator: markup is one `<div id="jk-vision">`, everything else is built by `static/js/vision.js` (see below); scene photos in `static/images/vision/` |
| `content/learn/laser-iridotomy.md` | `templates/page.html` | the laser demo: markup is one `<div id="jk-lpi">`, built and animated by `static/js/lpi.js` (side view and front view, "Fire laser", full screen for the exam room). Its iris shape is the same maths as `iris_center()` in `tools/learn-figures.py`, which draws the static before/after figure; change both together |
| `content/learn/yag-capsulotomy.md` | `templates/page.html` | the YAG demo: one `<div id="jk-yag">` built by `static/js/yag.js` (front view of the capsule plus a before/after photo using the vision simulator's scenes). It shares the `.jk-lpi` layout CSS with the iridotomy demo |
| `content/learn/lens-implants.md` | `templates/page.html` | the lens implant chooser: `<div id="jk-iol">` built by `static/js/iol.js`. Six kinds of lens, each a set of blur amounts at far, arm's length and near (the vision simulator's scene photos), plus an astigmatism ghost and night halos. Nothing animates. The numbers illustrate the usual pattern and the page says so |
| `content/learn/eye-pressure.md` | `templates/page.html` | the eye pressure "sink": one `<div id="jk-sink">` built by `static/js/sink.js`. The numbers are in `static/js/sink-model.js` (no DOM; pinned by `tests/sink-model.test.js`): the level comes from the steady-state balance, cannot go below venous pressure without a new drain, and stacked treatments give diminishing returns. If an effect size is changed on purpose, keep those tests passing. Example numbers only, and the page says so |
| `slt-laser.md`, `migs.md`, `trabeculectomy.md`, `tube-shunt-surgery.md`, `cyclophotocoagulation.md` (in `content/learn/`) | `templates/page.html` | step-by-step animations: one `<div id="jk-proc" data-proc="slt">` (or `migs`, `trab`, `tube`, `cpc`; `tears`, `lidcare`, `plug`, `reflex` (watery eyes) and `allergy` are the dry eye topic's demos) built by `static/js/procedure.js`. Each procedure is an entry in `PROCS`: drawings plus steps with `draw(p, t)`. SLT has two variants switched by chips (`slt` through a contact lens, `dslt` direct with no lens), MIGS has four (`migs` stent, `gonio`, `visco`, and `combo`: viscodilation then a stent), and so does cyclophotocoagulation (`cpc` micropulse, `cwcpc` standard); `variants` on an entry adds the chips. The picture is a pure function of time, so a step's draw must set everything it owns even when its `p` is 0, and touch another step's pieces only once its own `p` is above 0; otherwise jumping between steps leaves stale pieces |
| `content/learn/choosing-artificial-tears.md` | `templates/page.html` | the artificial tears picker: `<div id="jk-tears">` built by `static/js/tearpicker.js`. The advice is in `static/js/tearpicker-rules.js` (no DOM; pinned by `tests/tearpicker-rules.test.js`); brands and photos are read from `eye-drops.json` by the `chart` name on each kind |
| retina and cornea pages in `content/learn/` | `templates/page.html` | their animations are in `static/js/procedure-retina.js` and `static/js/procedure-cornea.js`, which register extra entries with `procedure.js`; a page loads its topic file first: `scripts = ["js/procedure-retina.js", "js/procedure.js"]`. `macular-degeneration.md` also loads `static/js/amsler.js`, the Amsler grid (on screen, and an example of a change); its "Print the grid" link opens `static/print/amsler-grid.html`, a standalone page with only the grid at 10 cm and the instructions, because hiding the rest of an article for printing is not honored by every browser |
| `content/search.md` | `templates/search.html` | site search. The template writes every Learn article, topic, tool page and drug into a JSON block at build time (rendered page HTML; no Zola search index), and `static/js/search.js` ranks it in the browser (no DOM in the ranking; pinned by `tests/search.test.js`). Drug hits link to the reference with `?q=`, which `droptable.js` reads. The Learn page and the 404 page have a box that sends the words to `/search/` |
| `content/about-this-site.md` | `templates/page.html` | what the site is and how it was built, linked from the About page. Its counts ("more than 40 articles") are deliberately round so they don't go stale |
| `content/handouts/*.md` | `templates/handout.html` (index: `section.html`) | one-page printable handouts for procedures. Front matter: `heading` (the title on the sheet), `article` (the Learn page it summarizes: its link and the QR code, drawn by `static/js/handout.js`), `figure`/`figure_alt`. The article sets `handout = "handouts/x.md"` and gets a "Print a one-page handout" link; `tests/content.test.js` checks both directions. Print CSS fits the sheet on one Letter page in two columns. The columns are written into the file (`<div class="jk-handout__cols"><div class="jk-handout__col">`, with blank lines around the Markdown inside) because Safari on iPhone ignores CSS multi-column when printing. After editing one, print it to PDF, including from an iPhone, and check it is still one page with the columns about even. Keep the facts in step with the article |
| `content/contact/_index.md` | `templates/contact/section.html` | office list driven by `config.toml`'s `[[extra.offices]]`, not by content |
| `content/videos.md` | — | `draft = true`; not built or linked until there are videos |
| any unmatched URL | `templates/404.html` | custom |

A page's `[extra]` can load scripts with `scripts = ["vendor/x.js", "js/y.js"]`
(in order) or a single `js = "js/y.js"`.

### Learn topics

The Learn menu is one panel listing every article under its topic
(Glaucoma, Cataract, Dry Eye, Cornea, Retina, Vision Simulators), built by `partials/navbar.html`
from the Learn section, so a new article appears in the menu by itself.
Each topic also has its own page. Articles all live
flat in `content/learn/` so their addresses never change. To add one:
set `topic = "glaucoma"` (or `cataract`, `dry-eye`, `cornea`, `retina`, `simulators`) and `group = "Lasers"`
(a heading from that hub's `groups`, or `""` if the hub has none) in its
`[extra]`. Both keys are required on every Learn page: the templates
compare them directly. A page with `topic = ""` (When to Call the Same
Day, the Glossary of Eye Terms) belongs to no topic and gets no breadcrumb or related block; both are linked from the bottom row of the Learn menu. Tools
are only the three drop tools in `content/patients/`; the simulators and
the eye pressure sink are Learn pages.
To add a topic: create `content/learn/<topic>/_index.md` with
`template = "topic.html"` and a `more` label (the heading of the related
block, e.g. "More on glaucoma"), add it to `topics` in `content/learn/_index.md`
and to the Learn menu in `config.toml`.

### Dates, share cards and structured data on Learn pages

Every Learn article (and the privacy page) has `date` (first published) and
`updated` (last changed) in its front matter, shown under the title as
"Published … · Updated …", with Updated left out when it is the same day
(Privacy shows "Last updated …"). **When you change a page's content, set
`updated` to that day.** Learn articles also carry `MedicalWebPage` JSON-LD
(`templates/page.html`) with those dates, Dr. Katz as author and reviewer,
and the breadcrumb.

Link previews (`og:image`) use a share card from `static/images/share/`:
`<slug>.png` for an article, `topic-<topic>.png` for a topic page, the
portrait everywhere else (`templates/base.html`). A new article needs a card:
`node tools/share-cards.js <slug>` makes one from the page's first figure, or
a frame of its animation taken from the site (set `SITE=` to the PR preview
for a page that is not live yet). `tests/content.test.js` fails without it.

### `static/data/eye-drops.json` is the single source of truth

Both the reference page (build time) and the schedule builder (runtime
fetch) read it. Add a drug once and it appears in both, and its `use`
value becomes a filter chip automatically. Pills use `Tablet` or `Capsule`
as their `color`; that drives the "By mouth" chip, and in the schedule
builder it locks "Which eye" to "By mouth", skips the five-minute drop
spacing, and words the calendar reminder "Take:". Where photos came from is
in IMAGE-SOURCES.md. Keys: `generic`, `brand`
(comma-separated if several), `color` (cap color; `Vial`/`Tube` for
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

### Vision simulator

`static/js/vision.js` renders eye conditions onto a photo with layered
copies of the same image: a sharp copy with whole-image CSS/SVG filters
(cataract, refractive blur, astigmatism, color vision), a warped copy for
wet macular degeneration, and a blurred copy masked to the lost regions
(glaucoma, macular degeneration, retinopathy, detachment, stroke). Masks are
small canvases of alpha values scaled up by the browser, so they need no
filter support. Lost regions render "filled in" (smeared, not black) by
default, which is what patients experience; a toggle shows black. Glaucoma
has presets plus an 8×8 "paint your own" field grid, encoded in the URL so
the QR code carries it. Conditions are a table (`CONDITIONS`) of
`apply(severity, ctx)` functions; add a condition by adding an entry and a
section on the page. Scenes are in `SCENES`, with the bright points that
cataract halos sit on. Sources for the photos are in IMAGE-SOURCES.md.

### Post-op dosing rules are tested

`static/js/postop-rules.js` holds every taper and the "which medications
apply to which surgery" table, with no DOM access, so Node can load it.
`tests/postop-rules.test.js` pins the expected tapers. **If a rule is
changed on purpose, update the test in the same commit**; CI runs them.

### Schedule builder tapers

In the Eye Drop Schedule Builder, the same medication listed more than
once for the same eye is a taper: rows are sorted by stop date and each
step starts the day after the previous one stops (a "Both Eyes" row counts
for each eye). Rows that don't read as a taper (two without a stop date,
the same stop date twice, or the dose not going down) make the form ask
"Was this supposed to be a taper?"; "No" runs them at the same time. The
daily routine is split into one dated table per step. "Every other day" is the
last "How often" choice (rarely used); it ranks below once a day, so it can end a taper: it
doses on the step's first day and every second day after, at the once-a-day
time, and the calendar repeats it every 2 days (`INTERVAL=2`). The rules live in
`static/js/dropform-plan.js` (no DOM) and are pinned by
`tests/dropform-plan.test.js`, which also covers the calendar export.

On an iPhone, only Safari adds a multi-event calendar file with "Add All";
other browsers (Chrome, DuckDuckGo, Firefox, in-app browsers) show a
one-event preview. A page can't reliably detect those browsers (DuckDuckGo
often reports itself as Safari) or force Safari open, so both schedule
pages show every iPhone a short note with a "Copy link" button to paste
into Safari (`JK.ios.safariNote` in `schedule-common.js`). The copied link
ends in `safari=1`; a page opened from it skips the note.

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

**`minify_html = true` strips default HTML attributes** (e.g.
`type="submit"` on a `<button>`). Select elements by `id`, not by such
attributes.

**Never read a form field as `form.<fieldname>` in JavaScript.** Use
`form.elements['fieldname']`; `HTMLFormElement`'s own properties shadow
same-named inputs.

**The contact form posts `URLSearchParams`.** `contact.js` sends the form
as `application/x-www-form-urlencoded`; `functions/f/contact.js` reads it
with `request.formData()`.

**Nav links use `get_url(..., trailing_slash=true)`.** Without it Zola
emits `/about` and every click takes a redirect to `/about/`.

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

**Printed schedules are large print for patients.**
- Solid black text, 12pt minimum. No gray anywhere in print.
- `.jk-page .container` drops its max-width in print, so the table fills
  the paper; landscape fills the wider page.
- The daily-routine table is built as one `<tbody class="routine-slot">`
  per dose time with `break-inside: avoid`. A long routine breaks between
  time slots, never through one, and it flows onto page 2 instead of
  leaving page 1 mostly empty.
- The table's title is a print-only row in `<thead>` (`routine-titlerow`),
  not a heading above the table. Browsers ignore `break-after: avoid` on
  headings, so a separate heading could be stranded at the bottom of
  page 1. A `<thead>` row also repeats on every printed page.
- A medication with no stop date shows "Ongoing".
- To check print layout, render with Playwright's
  `page.pdf({ format: 'Letter' })` in both orientations and look at the
  PDF.

**Image pipeline.** `resize_image()` writes into `static/processed_images/`
(gitignored). Drug photos: 116px-tall WebP thumbnails (2× the 58px
display); the lightbox loads the original from `data-full`. Hero: 942px
WebP with the PNG as `<picture>` fallback. Icons: three PNG sizes from
`logo.png`. Zola's image crate does not read AVIF, so sources are
JPEG/PNG/WebP/GIF. The two `.avif` files in `static/images/drops/` are
the WordPress-era originals, unreferenced by the JSON and kept only so
old links to those exact filenames still resolve; don't list them in
`photos`.

### Content checks in CI

`tests/content.test.js` runs with the other Node tests and fails on:
descriptions over 160 characters, British spellings in anything patients
read, a Learn article missing `topic`/`group`/`date`/`updated` or its share
card, an inline `<script>` or `onclick` (the Content-Security-Policy in
`static/_headers` blocks them; put scripts in `static/js/`), a link to the
post-op tool under another name, and article text about steroid tapers or
drop durations that disagrees with `static/js/postop-rules.js`. If a rule
changes on purpose, change the article and the test together.

## Known rough edges

- `fetch-assets.sh` is a one-time migration script that pulled images from
  the original WordPress install. Historical reference only.
- The contact form backend (`functions/f/contact.js`) only reads name,
  email and message; a new form field needs a change there too.
- New reference-table entries without photos show an empty photo cell;
  add a file to `static/images/drops/` and list it in `photos` to fill it.
  Every current entry has a photo. Good sources are DailyMed label images
  and the practice's own photos (record the source in IMAGE-SOURCES.md).
  Crop to the bottle or pill on a plain background, like the existing
  photos.
- Dose-time defaults (`JK.doseTimes` in `schedule-common.js`; once-daily
  glaucoma drops at 21:00 in `dropform.js`; every hour / every 2 hours
  run 8 AM to 10 PM in `dropform-plan.js`) are conventions, not
  prescriptions; adjust there if the practice prefers different times.

## Ideas parked for later

The owner has seen these and chose to wait. Ask before starting any of them.
(The vision-loss simulator from this list was built; see `learn/vision-loss`.)

- **Bottle-life calculator.** Estimates how long a bottle of drops lasts
  from bottle size, drops per day and eyes treated, to help with refill
  timing.
- **Oral prednisone.** It could go in the medication chart as a
  reference entry. A taper in the schedule builder would need a
  different start date for each row, which the builder doesn't support.
  It's rarely prescribed, so it isn't added yet.
- **Videos page.** `content/videos.md` stays `draft = true` until there
  are videos. To publish it, set it to `false` and add it back to the nav
  in `config.toml`.
