# 🐘 DropAgentX

**A production-grade Telegram marketplace bot with a web dashboard, an AI agent gateway, and a unified LLM router.**

DropAgentX connects sellers and buyers inside Telegram: task-based commerce, wallets, missions/XP, referrals, support tickets, and an admin panel — plus a web storefront (3D landing, PWA, live dashboard) and an AI layer (Hermes agent engine, A2A/MCP, 9router) behind a single gateway.

> 🇮🇷 [Readme به فارسی](README-fa.md) · Persian changelogs and reports are kept in the repo root (`CHANGELOG-*.md`, `docs/`).

---

## ✨ Features

- **Telegram bot** — marketplace, products, tasks, wallet, quests/missions (XP & levels), 4-tier leaderboard, referrals, in-bot support tickets, abuse reports
- **AI layer** — Hermes agent engine with 16 built-in skills, LLM router (9router) with 3-level fallback, quota & token saving, prompt caching
- **Web** — 3D Three.js landing page, 3D product showcase (`/showcase3d`), live SSE dashboard (`/live`), full PWA (installable + offline), Persian voice search, glassmorphism links hub (`/links`)
- **Admin panel** — user management (pagination, ban, CSV backup), analytics `/insights` (pure SVG, zero dependencies), CSV exports, weekly seller digest
- **Security** — upload path-traversal protection, atomic escrow, rate limiting behind proxies, fail-closed secrets, sandbox lock, anti-scam filter, token invalidation on password change
- **i18n** — Persian (fa) / English (en) via `locales/`
- **Ops** — structured observability (JSON logs, `app_logs` table, rotating file logs), capacity tooling for 8,000+ users on a 500 MB ceiling, DB doctor & seed tools

## 🏗️ Architecture

```
                 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
     user ─────▶ │   gateway   │──▶│  bot + web  │──▶│   hermes    │ (A2A/MCP)
                 │ (sole entry)│   │  (9router)  │──▶│   (agent)   │
                 └─────────────┘   └─────────────┘   └─────────────┘
                      │ /v1 │ /dashboard │ /agent.json
                      └────▶ ROUTER_BASE_URL ──▶ 9router (fallback + quota)
```

| Directory | Purpose |
| --- | --- |
| `handlers/` | Telegram bot routers (marketplace, wallet, tasks, admin, …) |
| `gateway/` | Single entry gateway (proxy + agent discovery) |
| `router/` | LLM router client |
| `shared/` | `security/` (skill guard), `context/` (compressor), `llm/` (router client) |
| `web/` + `web_admin.py` | Storefront, PWA, admin panel |
| `skills_builtin/` | 16 built-in AI skills |
| `deploy/` | `docker-compose.v3.yml` (3 services), Dockerfiles, Railway config |
| `tests/` | 100 tests (core + versioned regression suites) |
| `docs/` | Architecture, deploy, operations, marketing (mostly Persian) |
| `locales/` | `fa.json` / `en.json` translations |

## 🚀 Quick start

```bash
# 1) Configure environment
cp .env.example .env    # BOT_TOKEN, ADMIN_IDS, ROUTER_BASE_URL, AI_API_KEY, A2A_TOKEN...

# 2) Local run (bot + web + A2A + MCP)
pip install -r requirements-dev.txt
pytest                  # 100 passed
python run.py           # auto-detects Railway / VPS

# 3) Docker (3 services behind the gateway)
cd deploy
docker compose -f docker-compose.v3.yml up -d --build
```

See [DEPLOY.md](DEPLOY.md), [DEPLOY_V2-railway.md](DEPLOY_V2-railway.md) and [docs/DEPLOY-VPS-RAILWAY-FA.md](docs/DEPLOY-VPS-RAILWAY-FA.md) for one-command VPS + Railway deployment.

## 🔑 Environment variables (`.env` only — never commit secrets)

| Variable | Required | Description |
| --- | --- | --- |
| `BOT_TOKEN` | ✅ | Telegram bot token |
| `ADMIN_IDS` | ✅ | Comma-separated admin Telegram IDs |
| `ROUTER_BASE_URL` | | Points to 9router (e.g. `http://router:20128`) |
| `AI_API_KEY` / `OPENAI_API_KEY` | | Fallback LLM API key |
| `GEMINI_API_KEY` | | Gemini image plan (free tier ok) |
| `A2A_TOKEN` | ✅ in prod | A2A/MCP auth (fail-closed) |
| `WEB_PASSWORD`, `WEB_SECRET` | | Admin panel credentials |

Full list: [.env.example](.env.example)

## 🧪 Status

- ✅ **100/100 tests passing** (`pytest`)
- ✅ `compileall` clean
- ✅ Gateway: agent card + `/.well-known` + `/v1` proxy to 9router
- ✅ Router: safe fallback to `hermes_engine` when 9router is unavailable

## 📚 Documentation

- [V3_UNIFIED_BLUEPRINT.md](V3_UNIFIED_BLUEPRINT.md) — full architecture blueprint
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DEVELOPER-GUIDE-FA.md](docs/DEVELOPER-GUIDE-FA.md)
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute
- `CHANGELOG-*.md` — per-version release notes (0.5.0 → 2.0.0)

## 📜 License

[MIT](LICENSE)
