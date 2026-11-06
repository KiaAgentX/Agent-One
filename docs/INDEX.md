# نمایه مخزن‌های دانلودشده — KiaAgentX

تاریخ کلون: 2026-11-06 | مسیر پایه: `/home/z/my-project/repos/`

## ۸ پروژه هدف

| # | پروژه | مسیر محلی | حجم | فایل‌ها | آخرین کامیت | توضیح README |
|---|-------|-----------|------|---------|-------------|---------------|
| 1 | HermesA | `repos/HermesA` | 7.5M | 266 | 2026-11-04 (master) | DropAgentX — Hermes Marketplace Bot (Production): بات مارکت‌پلیس تلگرام + داشبورد وب + AI gateway + LLM router |
| 2 | AgentX | `repos/AgentX` | 10M | 225 | 2026-10-21 (main) | KIA DropAgentX — Telegram Super-App: AI Agents, Marketplace, Wallet, HITL Governance + ماژول economy/nation |
| 3 | DropAgentX | `repos/DropAgentX` | 9.8M | 211 | 2026-10-21 (main) | همان کدبیس AgentX بدون ماژول nation/economy |
| 4 | DropAgentX-v3 | `repos/DropAgentX-v3` | 3.1M | 196 | 2026-11-05 (main) | «هسته‌ی یکپارچه» — monorepo با pnpm: back (bot, server, ai-gateway, contracts) + front (dashboard) |
| 5 | Bot | `repos/Bot` | 3.1M | 198 | 2026-11-06 (main) | ادامه‌ی v3 + ماژول backup و تغییرات AI gateway |
| 6 | DropAgentXBot-main | `repos/portfolio/projects/DropAgentXBot-main` | 8.3M | 224 | — (اسنپ‌شات) | آرشیو نسخه‌های 0.5.0 تا v3.3.3 با چنج‌لاگ‌های کامل (فارسی) |
| 7 | zenovix-main | `repos/portfolio/projects/zenovix-main` | 1.2M | 49 | — (اسنپ‌شات) | Zenovix Chat Widget v3.2 — ویجت چت (Node 20 + Python 3.12) |
| 8 | AGI-main | `repos/portfolio/projects/AGI-main` | 18M | 456 | — (اسنپ‌شات) | Zenovix 1.6.0 — مدیر عملیات دیجیتال برای یک شرکت (charter 2.1.0) |

## روابط کشف‌شده (diff سریع، بدون .git و node_modules)

- `Bot` ≈ `DropAgentX-v3` — فقط **۱۶** اختلاف: Bot اضافه دارد `back/server/src/backup.ts` + تستش، و تغییر در gateway/contracts/api/guards. یعنی Bot ادامه‌ی مستقیم v3 است (یک روز جلوتر).
- `AgentX` ≈ `DropAgentX` — فقط **۱۶** اختلاف: AgentX اضافه دارد ماژول `src/nation` + `scripts/nation` + `docs/economy-charter.md` + `public/economy.html` + تست `nation-economy`. یعنی AgentX = DropAgentX + اقتصاد nation.
- `HermesA` در برابر v3: ۲۴ اختلاف مسیر — معماری متفاوت (backend/frontend جدا) اما همان دامنه.

## نکته درباره portfolio

مخزن `portfolio` فقط برای سه زیرپروژه خواسته شده بود کلون شد ولی شامل ~۵۰ پروژه دیگر هم هست
(فهرست کامل: `repos/portfolio/projects/`). اگر فقط همان سه‌تا لازم است، بقیه قابل حذف است.

## ساختار پایه مخزن‌های Monorepo (v3 / Bot)

```
back/  → bot (grammY?) · server (API) · ai-gateway · contracts (tRPC/زپرو?)
front/ → dashboard (React/Vite?)
```

## مخزن واحد ساخته شد (2026-11-06)
`repos/DropAgentX-One/` — بذر از Bot @ 2df647e + کتاب قانون (docs/law-book/) + پورت‌های stage‌شده (ports/)
کامیت‌ها: dab6f11 (بذر) · d49cd9f (قوانین+پورت‌ها). تحویل: download/DropAgentX-One-repo.zip + ادغام‌نامه docx/pdf
