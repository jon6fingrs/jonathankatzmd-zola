# jonathankatzmd.com — Zola site: hosting and setup

See README.md for the full map of the repo. This file is the short
operational checklist.

**Day to day there is nothing to run here.** Open a PR, check the preview,
merge; CI deploys `master` to Cloudflare Pages. The home server is retired:
there is no `git pull` or container restart after a merge.

## Cloudflare Pages

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

### Cutover (done; kept for reference)

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

## Before merging

CI (GitHub Actions) builds the site and runs the tests on every push and
pull request, and the PR gets a preview link. Merge only when the check is
green and the preview looks right. No local Zola install is needed.

## Cutover checklist (if the hostname ever changes)

Most of these fail silently:

1. `base_url` in config.toml
2. `[extra.plausible] domain` — must match the Plausible site name exactly
3. `noindex = false` in config.toml
4. Add the new hostname as a custom domain on the Cloudflare Pages
   project. The contact form rejects posts whose `Origin` doesn't match
   the page's own host.
