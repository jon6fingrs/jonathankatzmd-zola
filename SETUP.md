# jonathankatzmd.com — Zola site (v2: 1:1 parity + working forms)

Verified locally with Zola v0.23.3. The post-op schedule logic was unit-tested
against the original PHP (21 checks: durations, every steroid taper,
NSAID rules, column visibility per surgery type, start date).

## Fresh install — run in order on the host

    # 1. put these files in /home/jonathan/zola/  (overwrite the old ones)

    # 2. theme (skip if already cloned)
    git clone https://github.com/quentin-rodriguez/portio-zola.git \
      /home/jonathan/zola/themes/portio-zola

    # 3. theme static assets -> project static (required for favicon processing)
    cp -rn /home/jonathan/zola/themes/portio-zola/static/. /home/jonathan/zola/static/

    # 4. pull every image from the WordPress box (nav icons, hero cutout,
    #    headshot, favicon, all 64 drug photos). After this the Zola site has
    #    NO dependency on the old server.
    cd /home/jonathan/zola && bash fetch-assets.sh

    # 5. edit docker-compose.yml:
    #    - network `zzzz` -> your real Traefik network
    #    - the SMTP_* / MAIL_* values under form-mailer (see below)

    # 6. delete + recreate the stack in Portainer (it now has 3 services)

## Email backend (contact form)

A static site cannot send mail, so `form-mailer/` is a ~50-line Flask
container that receives the form POST and sends one email over SMTP.
nginx proxies `/api/contact` to it internally; nothing new is exposed to
Traefik.

Note: IMAP is the protocol for *reading* mail; *sending* is SMTP. Your
provider's SMTP settings almost always use the same username/password
as IMAP — just a different host/port (typically `smtp.<provider>`,
port 587). Fill these in under `form-mailer.environment`:

    SMTP_HOST   e.g. smtp.gmail.com / smtp.office365.com / mail.yourhost.com
    SMTP_PORT   587 (STARTTLS) or 465 (SSL)
    SMTP_USER   login (usually your email address)
    SMTP_PASS   password / app password
    MAIL_FROM   sender address (often must equal SMTP_USER)
    MAIL_TO     where submissions should be delivered

The Reply-To header is set to the visitor's address so you can reply
directly. Includes a honeypot field and a 30-second per-IP rate limit.

## What changed vs. v1 (parity with WordPress)

- Nav: SVG icons beside each item, dot bullets on sub-items
- Home: transparent cutout PNG instead of a circle-cropped photo
- Favicon: the cartoon-cat image
- About: headshot restored (floats right)
- Contact: OpenStreetMap embed under each office, live form
- Post-Op Schedule: fully working — generates the checkbox table, with
  Print / Back buttons, styled like the WordPress output
- NEW /patients/eye-drop-form/ — the "create a custom schedule" picker
  (checkbox per drop, times/day, eye, stop date -> printable table).
  Rebuilt from the PHP handler's field names; the original form page
  wasn't retrievable, so tell me if the layout should differ.
- Eye Drops table now uses local image paths (`/images/drops/...`)

## Files

    config.toml               nav (with icons), offices (with map embeds), form endpoint
    docker-compose.yml        zola-build + form-mailer + nginx
    nginx.conf                static serving + /api/ proxy to form-mailer
    fetch-assets.sh           one-shot image download from WordPress
    form-mailer/              Dockerfile + app.py
    content/                  8 pages
    templates/                theme overrides (base, index, page, section, contact, navbar, footer, office-card)
    static/css/custom.css     all site styling incl. schedule + print styles
    static/js/postop.js       post-op generator (port of the PHP)
    static/js/dropschedule.js custom drop picker (port of the PHP)
    static/js/contact.js      AJAX submit for the contact form

## Rebuilding after content edits

Portainer -> Containers -> jonathankatzmd-zola-build -> Restart.
nginx keeps running and serves the new files immediately.
