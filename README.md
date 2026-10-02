# jonathankatzmd.com — Zola static site

Ophthalmology practice website, migrated from WordPress to
[Zola](https://www.getzola.org/) (static site generator, Rust/Tera) in
2026. This README exists so that anyone — human or Claude Code — picking
this repo up cold has the context that isn't visible from the source files
alone.

**Before touching anything that handles secrets**, read
`CREDENTIALS-AUDIT.md`. Short version: `docker-compose.yml` and
`nginx.conf` are real, deployed, gitignored files — never commit them. Work
from the `.example` versions.

## What's in this repo vs. what isn't

| Tracked in git | Gitignored | Why |
|---|---|---|
| `content/`, `templates/`, `static/css`, `static/js`, `static/data`, `static/fonts`, `static/vendor` | — | hand-authored source |
| `config.toml` | — | site config; no secrets in it |
| `docker-compose.yml.example` | `docker-compose.yml` | the real file has an SMTP password and a token secret |
| `nginx.conf.example` | `nginx.conf` | the real file is tied to this one host's container names |
| — | `public/` | build output — `zola build` regenerates it |
| — | `themes/` | vendored external repo — cloned in, not committed |
| (maybe) `static/images/` | — by default | real site images, large binaries; see `.gitignore` comment |

## Setup from a fresh clone

```bash
git clone <this-repo> && cd <this-repo>

# 1. theme
git clone https://github.com/quentin-rodriguez/portio-zola.git themes/portio-zola

# 2. theme's own static assets must be merged into the project's static/.
#    Required: Zola's image-processing functions (resize_image, used for
#    favicons in the theme's base.html) only look in the project's own
#    static/, not the theme's — get_url() falls back to the theme's, but
#    resize_image() does not.
cp -rn themes/portio-zola/static/. static/

# 3. fill in the two deployment files from their templates
cp docker-compose.yml.example docker-compose.yml   # then edit the CHANGEME values
cp nginx.conf.example nginx.conf                   # then edit the CHANGEME values

# 4. images referenced by content aren't all in this repo (see .gitignore) —
#    pull them from wherever the live site's static/images/ actually lives,
#    or re-run the original fetch-assets.sh if this is a from-scratch WP
#    migration rather than a restore.
```

Then build with the official Zola image (this project does NOT use a
Zola binary installed on the host):

```bash
docker run --rm -v "$(pwd):/project" -w /project ghcr.io/getzola/zola:v0.23.3 build
```

The production deployment runs this same image as a long-lived `zola-build`
service in `docker-compose.yml` that builds once and exits; see that file.

## Deployment model

**There is no CI/CD.** Deploys are manual:

1. `rsync` the changed files to the host (`/home/jonathan/zola/` in
   production).
2. Restart the `zola-build` container (rebuilds `public/` from the current
   source — this is also how Zola itself regenerates `public/` every single
   build, see the gotcha below).
3. Restart `nginx` too, but **only** if `nginx.conf` changed — content and
   template changes need just the `zola-build` restart, since nginx serves
   straight from the shared `public/` directory and picks up fresh files
   immediately.

Traefik (reverse proxy, TLS termination) and Portainer (container
management UI) sit in front of this stack but aren't part of this repo.

## Content → template map

Not obvious from the theme alone, since several pages use custom templates
that override the theme's defaults (Zola's resolution order: project
`templates/` wins over `themes/<name>/templates/` for any file with a
matching name):

| Content | Template | Notes |
|---|---|---|
| `content/_index.md` | `templates/index.html` | home page, hero section |
| `content/about.md`, `content/videos.md` | `templates/page.html` | generic content page |
| `content/patients/eye-drops.md` | `templates/eye-drops.html` | renders `static/data/eye-drops.json` as an interactive table (simple-datatables, vendored in `static/vendor/`) |
| `content/patients/eye-drop-form.md`, `content/patients/post-op-schedule.md` | `templates/page.html` | interactive generators — logic lives in `static/js/dropform.js` and `static/js/postop.js`, not in the template |
| `content/contact/_index.md` | `templates/contact/section.html` | office list driven by `config.toml`'s `[[extra.offices]]` array, not by content |
| any unmatched URL | `templates/404.html` | custom — the theme ships an EMPTY 404.html; this one was written from scratch |

`static/data/eye-drops.json` is the single source of truth for the drug
reference table. Both the static table (`eye-drops.html`, build time) and
the interactive form generator (`dropform.js`, runtime fetch) read the same
file — add a drug once, it appears in both places.

## Architecture decisions worth knowing before changing anything

**Two containers, not one.** `zola-build` (official Zola image, runs once,
exits) and `nginx` (serves the output) are separate services sharing a bind
mount, rather than a single multi-stage Dockerfile. This was deliberate:
rebuilding after a content edit is `docker restart zola-build`, and nginx
never needs to restart for that, so there's no serving downtime during a
rebuild.

**Why `zola-build` and `nginx` both mount the whole project directory,
not just `public/`.** `zola build` deletes and recreates `public/` on
every run — you cannot `rmdir` a directory that something else has
separately mounted. Giving nginx its own mount *at* `public/` causes
"Resource busy" (Linux can't delete a mount point) or, with certain
mount-option combinations, "read-only file system" errors, intermittently,
in a way that's confusing to debug because the first build often succeeds
before the problem shows up on the second one. The fix used throughout
this project: mount the parent project directory (read-write for
`zola-build`, read-only for `nginx`) into both containers, and point
nginx's `root` at the `public/` subdirectory of its own mount. `public/`
is then never itself a mount point for anyone.

**Hostnames in `nginx.conf` go through `set $var`, never written
literally in `proxy_pass`.** A literal hostname in `proxy_pass` is
resolved by nginx once, at config load / container startup. If that
hostname doesn't resolve yet — container not started, wrong startup
order — nginx refuses to start AT ALL, taking down the whole site, not
just the one proxied feature. The `set $var` + variable-in-proxy_pass
pattern defers resolution to request time: nginx starts regardless, and a
single request simply 502s if that backend happens to be down.

**`minify_html = true` in `config.toml` strips default HTML attributes**
(e.g. `type="submit"` is a `<button>`'s default, so minification removes
it). Any JS that selects elements by such an attribute
(`button[type="submit"]`) will silently match nothing in the built output
even though it works fine against the unminified source during
development. Select by `id` instead.

**Never read a form field as `form.<fieldname>` in JavaScript.**
`HTMLFormElement` has its own built-in properties — `name`, `method`,
`action`, `target`, `elements`, `length`, and a few others — which shadow
named access to a same-named `<input>`. A field literally named `name`
silently returns the form's own `name` attribute (a string) instead of the
input, with no error. Always use `form.elements['fieldname']`.

**A `<form>` submitted via `fetch()` defaults to
`multipart/form-data`.** Some minimal backends (anything using Go's
`net/http` with a plain `r.ParseForm()`, for instance) only parse
`application/x-www-form-urlencoded` bodies — a multipart body parses to
zero fields with no error, so every field including any anti-spam token
reads as empty. If a self-hosted form backend is ever swapped in, send
`URLSearchParams` from JS, not `FormData`, unless you've confirmed the
backend actually handles multipart.

**Print stylesheets use `pt`, not `px`, for anything that must survive
printing.** `Save as PDF` renders borders as vectors and they always show;
sending the same page to a physical printer rasterises at ~300dpi, and a
1px CSS border can land between device pixels and silently vanish — on
some rows but not others, since row heights repeat and some land on pixel
boundaries and some don't. Looks like a printer bug; isn't one. `pt` units
are large enough (~4 device pixels at 300dpi) to never round away.

**A theme's own base template can hardcode things that need separate
patching** — this theme's `base.html` referenced a `favicon.png` it
doesn't actually ship (only `favicon.ico`), and emitted no
`<meta name="description">` or Open Graph tags at all. Neither is a bug in
this project's content; both needed fixing in `templates/jk-base.html`
(the project-level override of the theme's `base.html`) rather than by
editing the vendored theme directly.

## Known rough edges

- `fetch-assets.sh` (if present) is a one-time migration script that
  pulled images from the original WordPress install's
  `/wp-content/uploads/`. It has no ongoing purpose once that WordPress
  install is decommissioned — keep for historical reference or delete.
- The contact form backend (if `hugo-contact` or similar) only accepts a
  fixed field set; extending the form with a new field requires backend
  changes, not just a template edit.
