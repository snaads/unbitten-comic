# Repository Guidelines

## Project Structure & Module Organization
- Source: `build.js` orchestrates the static build using `nunjucks`, `sharp`, and `glob`.
- Content: `issues/<issue-id>/*.{png,jpg}` are source pages (per issue).
- Templates: `templates/` contains `index.html`, `issue.html`, and `about.html` used at build time.
- Output: `public/` is generated; do not edit by hand.
- Ops: `deploy.sh` builds and rsyncs `public/` to a remote web root.

## Build, Test, and Development Commands
- Install deps: `npm ci` (or `npm install` when changing deps).
- Build site: `node build.js` (creates thumbnails and renders HTML to `public/`).
- Serve locally: `python3 -m http.server -d public 8080` then open `http://localhost:8080/`.
- Deploy: edit `HOST` and `REMOTE_DIR` in `deploy.sh`, then run `./deploy.sh`.

## Coding Style & Naming Conventions
- JavaScript: 2‑space indent, semicolons, double quotes, CommonJS (`require`/`module.exports`).
- Templates: Keep logic minimal; prefer passing data from `build.js`.
- Naming: Issues as `issue-001`, `issue-002`, …; page files as zero‑padded numerics (`01.png`, `02.png`) for stable sort.
- Formatting: Use Prettier locally if desired: `npx prettier -w build.js templates/**/*.html`.

## Testing Guidelines
- Frameworks: None yet; use manual verification.
- Quick check: after `node build.js`, confirm `public/index.html` lists issues and `public/<issue-id>/index.html` loads with images and thumbnails.
- Cross‑platform note: `sharp` requires native binaries; ensure your environment can compile or install them.

## Commit & Pull Request Guidelines
- Commits: Use clear, imperative messages (e.g., "Add issue-003 content", "Tweak issue template spacing"). Group related changes.
- PRs must include:
  - Purpose and scope; reference any tracked issue.
  - Screenshots or GIFs of `public/` pages (index + a sample issue) after build.
  - Notes on template or image processing changes (if any) and any deploy implications.
  - Checklist: `npm ci` ok, `node build.js` ok, pages load locally.

## Security & Configuration Tips
- Do not commit secrets or server details beyond placeholders. Use SSH keys for `rsync`.
- Verify `REMOTE_DIR` points to your web root (e.g., `/var/www/unbitten`).
- `.DS_Store` and other transient files are ignored during deploy; keep `public/` ephemeral.
