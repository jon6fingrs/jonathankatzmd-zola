# jonathankatzmd.com — Zola site: install and rebuild

See README.md for the full map of the repo. This file is the short
operational checklist.

## Cloudflare Pages (replacing the homelab host)

Every push to `master` whose CI is green is deployed to the Cloudflare
Pages project `jonathankatzmd` by the `deploy` job in
`.github/workflows/ci.yml`. A red check never deploys. Nginx's jobs move to
`functions/`, which Cloudflare runs on four paths only:

    /form-token.js, /f/contact   contact form (replaces hugo-contact); sends
                                 through Fastmail SMTP (functions/_lib/smtp.js)
    /js/vx.js, /vx/event         first-party Plausible proxy
    /wp-*, /xmlrpc.php           old WordPress URLs: drug photos 301 to
                                 /images/drops/, everything else 410
    static/_redirects            old WordPress page URLs -> Zola pages (301)
    static/_headers              cache headers; noindex on *.pages.dev

Non-secret settings (SMTP host and port, Plausible host) are in
`wrangler.toml`. Everything personal is a Cloudflare secret.

### One-time setup

1. **API token.** Cloudflare dashboard → My Profile → API Tokens → Create
   Token → Custom token. Permission: Account → **Cloudflare Pages → Edit**.
   Account resources: your account.
2. **GitHub secrets.** This repo → Settings → Secrets and variables →
   Actions → New repository secret: `CLOUDFLARE_API_TOKEN` (the token) and
   `CLOUDFLARE_ACCOUNT_ID` (the dashboard's Account ID). Until both exist,
   CI skips the deploy.
3. **GitHub variable.** On the Variables tab of the same page:
   `SITE_BASE_URL` = `/`, so links on the `*.pages.dev` copy stay on it.
   Delete it at cutover.
4. **First deploy.** Merge to `master` (or Actions → CI → Re-run). It
   creates the project; the address is in the Deploy step's log.
5. **Fastmail app password.** Fastmail → Settings → Privacy & Security →
   Manage app passwords → New, access **SMTP** only.
6. **Cloudflare secrets.** Workers & Pages → `jonathankatzmd` → Settings →
   Variables and Secrets → Add, type **Secret**, Production:

       SMTP_USERNAME    Fastmail login address
       SMTP_PASSWORD    the app password from step 5
       RECIPIENT_EMAIL  where form messages are delivered
       TOKEN_SECRET     `openssl rand -base64 32`
       SMTP_FROM        optional; sender address if not SMTP_USERNAME
                        (must be an address or alias Fastmail lets you send as)

   Secrets take effect on the next deploy: re-run the CI workflow.
7. **Test** the form on the `*.pages.dev` address. If it fails, the
   reason is under Workers & Pages → `jonathankatzmd` → the deployment →
   Functions → real-time logs.

### Cutover

1. Workers & Pages → `jonathankatzmd` → Custom domains → add
   `jonathankatzmd.com` (and `www` if wanted). The domain is already on
   Cloudflare DNS; leave the Fastmail MX, SPF, DKIM and DMARC records alone.
2. Delete the `SITE_BASE_URL` variable and re-run CI, so the build uses
   `base_url` from config.toml again.
3. Stop the homelab containers and remove the Traefik route.

### Local test

    zola build --base-url /
    npx wrangler pages dev

with SMTP settings in `.dev.vars` (gitignored).

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
