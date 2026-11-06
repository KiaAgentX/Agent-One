# 🐘 DropAgentX — Hermes Marketplace Bot (Production)

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

---

## 🏗️ Architecture

```text
                 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
     user ─────▶ │   gateway   │──▶│  bot + web  │──▶│   hermes    │ (A2A/MCP)
                 │ (sole entry)│   │  (9router)  │──▶│   (agent)   │
                 └─────────────┘   └─────────────┘   └─────────────┘
                      │ /v1 │ /dashboard │ /agent.json
                      └────▶ ROUTER_BASE_URL ──▶ 9router (fallback + quota)
```

| Directory | Purpose |
|-----------|---------|
| `backend/` | Python backend (FastAPI + aiogram + SQLite) |
| `backend/web/` | Frontend (HTML/CSS/JS) — served by backend |
| `backend/handlers/` | Telegram bot routers (marketplace, wallet, tasks, admin, …) |
| `backend/gateway/` | Single entry gateway (proxy + agent discovery) |
| `backend/router/` | LLM router client |
| `backend/shared/` | `security/` (skill guard), `context/` (compressor), `llm/` (router client) |
| `backend/skills_builtin/` | 16 built-in AI skills |
| `backend/tests/` | 100 tests (core + versioned regression suites) |
| `frontend/` | Locales + UI/UX Max Pro toolkit |
| `docs/` | Architecture, deploy, operations, marketing (mostly Persian) |
| `locales/` | `fa.json` / `en.json` translations |

---

## 🚀 Quick Start

### Local Development

```bash
# 1) Clone & enter
cd /home/user/hermesa

# 2) Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and set: BOT_TOKEN, ADMIN_IDS, WEB_PASSWORD, WEB_SECRET

# 3) Install dependencies
pip install -r backend/requirements.txt

# 4) Run tests
cd backend
pytest -q

# 5) Run locally
python run.py
```

Web dashboard will be available at `http://localhost:8080`.

### Docker (Local)

```bash
cd /home/user/hermesa
cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up -d --build
```

### Railway (Production)

1. Create a new project on [Railway.app](https://railway.app)
2. Deploy from ZIP or connect GitHub
3. Add the following **Variables** in Railway dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | ✅ | Telegram bot token from @BotFather |
| `ADMIN_IDS` | ✅ | Comma-separated admin Telegram IDs from @userinfobot |
| `WEB_PASSWORD` | ✅ | Admin panel login password |
| `WEB_SECRET` | ✅ | Random cookie signing key (`python -c "import secrets;print(secrets.token_hex(32))"`) |
| `COOKIE_SECURE` | ✅ | `1` behind HTTPS on Railway |
| `DATA_DIR` | ✅ | `/data` (must mount a Railway Volume at this path) |
| `AI_API_KEY` | ❌ | Gemini / OpenRouter / OpenAI API key (optional) |
| `AI_MODEL` | ❌ | Model name (e.g. `gemini-2.0-flash`) |
| `A2A_ENABLED` | ❌ | `0` to keep only main port healthy |
| `DAX_MODE` | ❌ | `railway` |
| `LOG_LEVEL` | ❌ | `INFO` |

4. Create a **Volume** with mount path `/data` so SQLite DB and uploads survive redeploys.
5. Deploy!

See [`DEPLOY.md`](backend/DEPLOY.md) and [`DEPLOY_V2-railway.md`](backend/DEPLOY_V2-railway.md) for detailed deployment guides.

---

## 🔑 Environment Variables (`.env` only — never commit secrets)

Full list in [`backend/.env.example`](backend/.env.example).

---

## 🧪 Status

- ✅ **100/100 tests passing** (`pytest -q`)
- ✅ `compileall` clean
- ✅ Gateway: agent card + `/.well-known` + `/v1` proxy to 9router
- ✅ Router: safe fallback to `hermes_engine` when 9router is unavailable

---

## 📚 Documentation

- [`V3_UNIFIED_BLUEPRINT.md`](backend/V3_UNIFIED_BLUEPRINT.md) — full architecture blueprint
- [`DEPLOY.md`](backend/DEPLOY.md) — deployment guide
- [`DEPLOY_V2-railway.md`](backend/DEPLOY_V2-railway.md) — Railway deployment
- [`docs/ARCHITECTURE.md`](backend/docs/ARCHITECTURE.md) · [`docs/DEVELOPER-GUIDE-FA.md`](backend/docs/DEVELOPER-GUIDE-FA.md)
- [`CONTRIBUTING.md`](backend/CONTRIBUTING.md) — how to contribute
- `CHANGELOG-*.md` — per-version release notes (0.5.0 → 2.0.0)

---

## 📜 License

[MIT](LICENSE)

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

---

**Built with ❤️ in Silicon Valley style · Powered by ui-ux-pro-max-skill design system**
