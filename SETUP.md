# jonathankatzmd.com — Zola site: install and rebuild

See README.md for the full map of the repo. This file is the short
operational checklist.

## Fresh install on the host

    # 1. put the repo in /home/jonathan/zola/
    git clone <this-repo> /home/jonathan/zola && cd /home/jonathan/zola

    # 2. deployment files from their templates (the real ones are gitignored)
    cp docker-compose.yml.example docker-compose.yml   # edit: Traefik network, SMTP_*, TOKEN_SECRET, CORS_ALLOW_ORIGIN
    cp nginx.conf.example nginx.conf                   # edit: container names, analytics host

    # 3. create the stack in Portainer (3 services: zola-build, hugo-contact, nginx)

No theme to clone and no theme assets to copy: everything the build needs
is in the repo. Images are tracked in git.

## Deploying an update (after a PR is merged to master)

    cd /home/jonathan/zola
    git pull
    docker restart jonathankatzmd-zola-build    # or Portainer -> Restart

nginx keeps running and serves the new files immediately. Restart nginx
only if nginx.conf changed.

If `git pull` refuses because of local changes, a tracked file was edited
on the host. Run `git diff` to see what changed, then `git restore <file>`.
Host-only ignore patterns go in `.git/info/exclude`, not `.gitignore`.
Keep backup files outside `static/`, because everything in `static/` is
published.

"Permission denied" warnings about `static/processed_images` come from
root-owned build files. They're harmless, and
`sudo rm -rf static/processed_images` clears them.

## Before deploying

CI (GitHub Actions) builds the site and runs the tests on every push and
pull request. Only deploy a commit whose check is green. To run the same
locally:

    docker run --rm -v "$(pwd):/project" -w /project ghcr.io/getzola/zola:v0.23.3 build
    node --test 'tests/**/*.test.js'

## Cutover checklist (if the hostname ever changes)

Three of these four fail silently:

1. `base_url` in config.toml
2. `[extra.plausible] domain` — must match the Plausible site name exactly
3. `noindex = false` in config.toml
4. `CORS_ALLOW_ORIGIN` for hugo-contact in docker-compose.yml, or the
   contact form starts returning 403

## Email backend (contact form)

A static site cannot send mail, so `hugo-contact` receives the form POST
and sends one email over SMTP. nginx proxies `/f/` and `/form-token.js` to
it internally; nothing new is exposed to Traefik. Fill in under
`hugo-contact.environment` in docker-compose.yml:

    SMTP_HOST       e.g. smtp.gmail.com / smtp.office365.com
    SMTP_PORT       587 (STARTTLS only — Go's net/smtp can't do implicit TLS on 465)
    SMTP_USERNAME   login (usually your email address)
    SMTP_PASSWORD   app password
    RECIPIENT_EMAIL where submissions should be delivered
    TOKEN_SECRET    `openssl rand -base64 32`; without it, tokens reset on every restart
