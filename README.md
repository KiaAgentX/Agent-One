[# Kia — Portfolio Site

Static portfolio that indexes all projects with **market-value estimates, live previews, and an in-site source-code viewer**. Built for an international audience (English UI), deployed on GitHub Pages.

## What it generates (`dist/`)

| Page | Content |
|------|---------|
| `/` | Hero + stats (projects, LOC, est. value, previews), search, category filters, sortable project cards |
| `/projects/<id>/` | Overview (facts + gallery), **Live Preview** (iframe), **Source Code** (file tree + syntax-highlighted viewer) |
| `/data/src/<id>.json` | Extracted source files per project |
| `/previews/<id>/` | Static or built preview bundle per project |

## Commands

```bash
npm install            # once
npm run vendor          # re-bundle highlight.js (already committed in src/assets)
npm run build:previews  # npm install + build all Vite/Next projects -> builds/  (needs network, ~10 min)
npm run build           # generate dist/ (scan + sources + previews + pages)
npm run build:all       # previews + site in one go
npm run serve           # local preview at http://localhost:8877
```

Single project preview rebuild:

```bash
node scripts/build-previews.mjs tidewater win12
npm run build
```

## Content editing

- **`src/projects.json`** — every project: name, tagline, English description, category, stack, `value` (market estimate), `status`, `preview` (`static` | `build` | `none`), `repo` (GitHub repo name).
- **`src/config.json`** — owner name, GitHub handle, tagline, site title/description.
- Value numbers are **market-rate estimates** (agency build cost). Edit freely.

## Publish to GitHub Pages

```bash
cd portfolio
git init
git add . && git commit -m "portfolio site"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/KiaAgentX/portfolio.git
git push -u origin main

npm run deploy          # publishes dist/ to the gh-pages branch
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
Your site will be at `https://kiaagentx.github.io/portfolio/`.

Because all links are relative, the site also works from any subpath or custom domain without config changes.

## Notes

- Source viewer caps each project at ~1.2 MB / 200 files (root files first, per-file 60 KB truncation). Full code stays on GitHub — every project page links to the repo and a ZIP download.
- Projects marked `preview: none` are server-side (bots/backends); their pages explain that and link to GitHub.
- `preview: build` projects need `npm run build:previews` first; until then the page shows "preview is being prepared".
](https://github.com/KiaAgentX/portfolio)
