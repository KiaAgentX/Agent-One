# Changelog — Kia Portfolio Site

All notable changes to **KiaAgentX/portfolio**. Semantic versioning; first official tagged release: `v1.0.0` (2026-10-04).

## v1.0.0 — Official Desktop Release (2026-10-04)

### Added
- **Desktop app (portable)** — Electron shell serving the full site locally with `app://` protocol (all previews, source viewer and PWA assets work offline).
- **VALUATION.md** — independent triangulated valuation report: fair value ≈ **$758,565** (cost-based + market comparison across three hourly rates); site claims $466,500 (38.5% conservative by design).
- 🎲 **Surprise** — random-project jump from nav & mobile menu.
- **5-sound procedural engine** — hover sparkle, click tick, whoosh (menu/tabs/palette), discovery chime, mission-complete fanfare + ambient space pad (WebAudio, zero audio files).
- **Capabilities / Languages & Data / Skills sections** in the index with real metrics; Skills linked to `KiaAgentX/skills` (11 modules incl. procedural-canvas-game).
- Command palette (`Ctrl K` / `/`), contact section (Telegram @ImXforevr · X @imxforever · GitHub), PWA install (manifest, icons, service worker).
- `scripts/publish.mjs` prune step (files removed from `dist/` are deleted from `gh-pages`).

### Performance
- Hero video **removed entirely** (was 4.6MB third-party payload and LCP element).
- Critical CSS inlined; `style.css` + fonts load non-blocking; motion stack `defer`red; render pipeline split into idle phases (TBT down from 1.45s).
- Composited `scaleX` bar animations; fixed counter slots (`min-width: 9ch` + tabular numerals) for near-zero CLS.

### Fixed
- 9 critical bugs: mobile-menu z-index covering the burger, no-JS hidden text, dishonest copy feedback, path-based publish verification (CRLF + Persian filenames), `will-change` overuse, HUD/toast mobile overlap, palette/menu Escape conflicts, unbounded showreel DOM, dead particles code.
- Lighthouse pass: non-blocking fonts, `favicon.ico`, select/input labels, sequential headings, contrast (`--faint`), unique "Learn more" labels (SEO).

### Security
- Secret scan before every publish (leaked Groq key redacted from source & site).
- No tokens stored in git config; git prompts disabled in automation (`GCM_INTERACTIVE=never`).
