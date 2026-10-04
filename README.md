<div align="center">

<img src="docs/assets/banner.svg" alt="Kia — Software Portfolio" width="100%">

# Kia — Software Portfolio

**A cinematic, static portfolio site that indexes 60 production projects —<br>with market-value estimates, live previews, and an in-site source-code viewer.**

[🌐 Live Demo](https://kiaagentx.github.io/portfolio/) · [✨ Features](#-features) · [🚀 Quick Start](#-quick-start) · [📬 Contact](#-contact)

![Status](https://img.shields.io/badge/Status-Live-success)
![Projects](https://img.shields.io/badge/Projects-60%2B-informational)
![Motion](https://img.shields.io/badge/Motion-GSAP_·_Lenis-88CE02?logo=greensock&logoColor=white)
![Hosted](https://img.shields.io/badge/Hosted_on-GitHub_Pages-1a1e2e?logo=githubpages&logoColor=white)
![Built with](https://img.shields.io/badge/Built_with-Node.js-339933?logo=node.js&logoColor=white)

</div>

<details>
<summary><b>📑 Table of Contents</b></summary>

- [Overview](#-overview)
- [Features](#-features)
- [What it generates](#️-what-it-generates)
- [What's inside](#-whats-inside)
- [Quick Start](#-quick-start)
- [Commands](#️-commands)
- [Editing content](#-editing-content)
- [How it works](#️-how-it-works)
- [Deploying](#-deploying)
- [Repository structure](#-repository-structure)
- [Notes](#-notes)
- [Built with](#️-built-with)
- [Contact](#-contact)

</details>

---

## 📖 Overview

**Kia — Software Portfolio** is a self-hosted showcase for the work of **Kia**, a full-stack engineer building **AI agents, trading systems, and immersive web experiences**.

Instead of linking out to 60 separate repositories, this project **bundles everything into one experience**:

- 💰 Every project gets a dedicated page with facts, a gallery, and a **market-value estimate** (agency build cost).
- ▶️ Front-end projects run as **live iframe previews**, built from their real source during the site build.
- 📂 An **in-site source-code viewer** lets visitors browse each project's file tree with syntax highlighting — no clone needed.

All project sources live in this monorepo under [`projects/`](projects/), so every *"View source"* link points right back here.

---

## ✨ Features

| | |
|---|---|
| 🎬 **Cinematic motion** | GSAP + ScrollTrigger + Lenis smooth scroll, custom cursor, magnetic buttons, 3D card tilt, hero parallax, scroll scrubbing and count-up stats |
| 🔊 **Procedural sound engine** | 5 synthesized UI sounds (hover · click · whoosh · chime · fanfare) wired to menus, tabs and the palette — zero audio files |
| 💰 **Market-value estimates** | Every project priced as an agency-build cost, aggregated into hero stats |
| ▶️ **Live previews** | Static projects embedded directly; Vite / Next.js projects built by the pipeline |
| 📂 **Source-code viewer** | File tree + syntax-highlighted code for every project |
| 🔎 **Search, filter, sort** | Full-text search, category filters, sortable project cards |
| ⚡ **Performance pass** | Non-blocking fonts, `preload=metadata` video (−4.5 MB), composited animations, idle-capped showreel |
| ♿ **Accessibility & SEO** | ARIA labels, correct heading order, contrast-checked palette, unique link labels, favicon |

---

## 🗺️ What it generates

| Page | Content |
|---|---|
| `/` | Hero + stats (projects · LOC · est. value · previews), search, category filters, sortable project cards |
| `/projects/<id>/` | Overview (facts + gallery) · **Live Preview** (iframe) · **Source Code** (file tree + viewer) |
| `/data/src/<id>.json` | Extracted source files per project |
| `/previews/<id>/` | Static or built preview bundle per project |

---

## 📦 What's inside

**60 production projects** across:

- 🤖 **AI & Agents** — agent platforms, LLM gateways, Gemini / DeepSeek playgrounds, deploy templates
- 📈 **Trading & Fintech** — trading simulators and valuation dashboards
- 🛒 **E-Commerce & Marketplaces** — Telegram marketplace bots with wallets and web apps
- 🕹️ **Games & 3D** — Three.js worlds and mission-control simulators
- 🛠️ **Developer Tools** — code valuation, gateways and tooling
- 💼 **Business & Accounting** — offline-first Persian (RTL) audit suites
- 🎨 **Web & Brand Experiences** — interactive brand systems and single-file experiments

Stack spans **Python · TypeScript · React · Next.js · Three.js · Vite · Express · PostgreSQL · Docker · Telegram Bot API**.

---

## 🚀 Quick Start

```bash
git clone https://github.com/KiaAgentX/portfolio.git
cd portfolio
npm install
npm run build        # generate dist/
npm run serve        # → http://localhost:8877
```

> ⚡ `build:previews` is optional for a first look — project pages show *"preview is being prepared"* until it runs.

---

## ⚙️ Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (once) |
| `npm run vendor` | Re-bundle highlight.js (already committed in `src/assets`) |
| `npm run build:previews` | `npm install` + build every Vite/Next project into `builds/` (~10 min, needs network) |
| `npm run build` | Generate `dist/` — scan projects, extract sources, copy previews, render pages |
| `npm run build:all` | Previews + site in one go |
| `npm run serve` | Local preview at <http://localhost:8877> |
| `npm run deploy` | Publish `dist/` to the `gh-pages` branch |

Rebuild a single project's preview:

```bash
node scripts/build-previews.mjs <project-id>
npm run build
```

---

## 📝 Editing content

| File | Purpose |
|---|---|
| `src/projects.json` | Every project: name, tagline, description, category, stack, `value` (market estimate), `status`, `preview` mode, `repo` |
| `src/config.json` | Owner name, GitHub handle, tagline, site title & description |

- `preview` is one of `static` (plain HTML), `build` (Vite/Next build) or `none` (server-side project).
- Value numbers are **market-rate estimates** (agency build cost) — edit freely.

---

## 🏗️ How it works

```
projects/*              src/projects.json
     │                        │
     ▼                        ▼
scan + source          build:previews
extraction             (Vite / Next builds)
     │                        │
     └──────────┬─────────────┘
                ▼
          npm run build
                ▼
   dist/  (pages · data · previews)
                ▼
      npm run deploy → gh-pages
```

---

## 🌍 Deploying

Hosted on **GitHub Pages**:

```bash
npm run deploy   # publishes dist/ to the gh-pages branch
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.

Because all links are relative, the site also works from any subpath or custom domain with no config changes.

---

## 📁 Repository structure

```
portfolio/
├── projects/           # All project sources (monorepo)
├── scripts/            # Build pipeline: scan · extract · previews · pages · deploy
├── src/
│   ├── projects.json   # Project metadata
│   ├── config.json     # Site configuration
│   └── assets/         # Vendored highlight.js, styles, media
└── dist/               # Generated site (not committed)
```

---

## 📌 Notes

- The source viewer caps each project at **~1.2 MB / 200 files** (root files first, 60 KB per-file truncation). Full code stays on GitHub — every project page links to the repo and a ZIP download.
- Projects marked `preview: none` are server-side (bots/backends); their pages explain that and link to GitHub.
- `preview: build` projects need `npm run build:previews` first; until then the page shows *"preview is being prepared"*.

---

## 🛠️ Built with

[GSAP](https://gsap.com/) · [Lenis](https://github.com/darkroomengineering/lenis) · [highlight.js](https://highlightjs.org/) · Node.js · GitHub Pages

---

## 📬 Contact

| | |
|---|---|
| 👤 **Kia** | Full-stack engineer · AI agents, trading systems & immersive web |
| 🌐 Portfolio | [kiaagentx.github.io/portfolio](https://kiaagentx.github.io/portfolio/) |
| 🐙 GitHub | [KiaAgentX](https://github.com/KiaAgentX) |
| ✈️ Telegram | [@ImXforevr](https://t.me/ImXforevr) |
| 🐦 X / Twitter | [@imxforever](https://x.com/imxforever) |

---

<div align="center">

*Built, shipped and maintained by Kia —* **[see the live site →](https://kiaagentx.github.io/portfolio/)**

</div>
