# Instructions for Claude Code

README.md has the full map of this repo (templates, data files, conventions,
architecture decisions). Read it before changing anything. This file covers
the workflow.

## Workflow

- The site is hosted on **Cloudflare Pages**. Merging a PR into `master`
  builds and deploys it automatically, but only if CI is green.
- There is **no home server**. Never tell the owner to `git pull`, restart
  containers, or touch nginx/Docker/Portainer after a merge. The
  `docker-compose.yml.example` and `nginx.conf.example` files are retired.
- Work on a branch, push it, and **open a PR (draft is fine) to get a
  preview**. The preview workflow comments a link on the PR:
  `https://jon6fingrs.github.io/jonathankatzmd-zola/pr-preview/pr-<number>/`.
- **Don't download or install Zola.** The PR's CI run ("Build site and run
  tests": `zola build`, `zola check`, Node tests) and the preview build are
  the build check. Read their results instead of building locally.
  `node --test 'tests/**/*.test.js'` needs no Zola and is fine to run.
- Merge only when the owner says so. After merging, nothing else is needed.
  To confirm a deploy went out, check the "Deploy to Cloudflare Pages" job
  on the merge commit's CI run.

## Before calling a change done

- CI is green on the PR.
- For UI changes, check the preview page at 390px wide and desktop width
  (no horizontal scroll), and render a PDF for anything printable.
- Use `get_url(...)` in templates and `@/` links in Markdown, never
  hard-coded root paths: previews live under a sub-path.

## Never commit

Secrets (SMTP passwords, `TOKEN_SECRET`, API tokens), `.dev.vars`, or
details of the owner's home network. Secrets live in Cloudflare and GitHub
settings (see SETUP.md).
