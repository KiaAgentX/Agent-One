<div align="center">

<img src=".github/assets/logo.png" alt="DropAgentX v3" width="140" />

<img src=".github/assets/hero.svg" alt="DropAgentX v3 — هسته‌ی یکپارچه" width="100%" />

**یک موتور برای کل امپراتوری — دفتر کیف پول، مارکت‌پلیس اسکرو، چرخه‌ی AI و پارلمان؛
این بار از روز صفر با معماری دامنه‌محور بازنویسی شده.**

`front/` → سایت عمومی، مینی‌اپ تلگرام، داشبورد Aurora · `back/` → سرور، ربات و همه‌ی بسته‌های دامنه

[![Version](https://img.shields.io/badge/version-4.4.2-818CF8?labelColor=0F1B2D)](package.json)
[![Tests](https://img.shields.io/badge/tests-286%20passing-6EE7B7?labelColor=0F1B2D)](#تست‌ها)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict%20%2B%20noUncheckedIndexedAccess-3178C6?labelColor=0F1B2D)](tsconfig.base.json)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?labelColor=0F1B2D&logo=node.js&logoColor=white)](package.json)
[![pnpm + turbo](https://img.shields.io/badge/pnpm%209%20%2B%20turbo-monorepo-F9A03C?labelColor=0F1B2D&logo=pnpm&logoColor=white)](pnpm-workspace.yaml)
[![License: MIT](https://img.shields.io/badge/license-MIT-38BDF8?labelColor=0F1B2D)](LICENSE)

**[English](README.md)** · **[فارسی](README.fa.md)** · [معماری](docs/ARCHITECTURE.md) · [نقشه‌ی راه](docs/ROADMAP.md) · [انتشار](docs/DEPLOY.md) · [قانون‌نامه](docs/RULEBOOK.md) · [پوش به Agent-One](docs/PUSH-AGENT-ONE.md) · [ADRها](docs/adr/)

</div>

---

## چرا این پروژه وجود دارد؟

پنج ابزار جدای از هم — اینجا یک کیف پول، آن‌جا یک فروشگاه، یک چت‌بات AI در حاشیه —
در هر درز، پول و اعتماد نشت می‌دادند. **نسخه‌ی ۳ همه‌ی آن‌ها را در یک موتور جمع می‌کند**
با یک منبع حقیقت واحد:

| ماژول | کاری که می‌کند | کجا زندگی می‌کند |
|---|---|---|
| 💰 **کیف پول (Đ)** | دفتر دوطرفه با ارز صحیح، تراکنش‌های تغییرناپذیر، mint/burn/خزانه/مالیات | `back/domain` + `back/server` |
| 🏪 **مارکت اسکرو** | ماشین حالت صریح ۸ حالته — هر فروش از مسیر اسکرو می‌گذرد: fund → deliver → release | `back/domain` + `back/server` |
| 🤖 **چرخه‌ی AI** | ۶ ایجنت Zenovix + ۱۶ مهارت KIA-OS پشت یک گیت‌وی سازگار با OpenAI، با سنجش مصرف و سقف | `back/ai-gateway` + `back/llm` |
| ⚖️ **پارلمان / HITL** | هر عملیات بالای ۵۰٬۰۰۰ Đ منتظر تصمیم انسانی می‌ماند — sweep، تأیید، رد | `back/server` + `back/bot` |
| 🖥️ **داشبورد Aurora** | دوزبانه fa/en، راست‌به‌چپ بومی، با کلاینت تایپ‌دار مستقیماً روی قراردادهای API | `front/dashboard` |
| 📱 **مینی‌اپ تلگرام** | ۳۰ صفحه‌ی واقعی، موبایل‌اول، راست‌به‌چپ بومی — فروشگاه در جیب مشتری | `front/webapp` + `packages/nation` |
| 🌐 **سایت عمومی** | لندینگ PWA استاتیک («XDrop Marketplace») — نصب‌شدنی، آفلاین‌پسند | `front/public-site` |

همین بازنویسی، چیزهایی که نسخه‌ی ۲ را قابل‌اعتماد می‌کرد حفظ کرده — قراردادهای تایپ‌دار،
امنیت fail-closed و نظم انتشار — و هرچه تغییرش را سخت می‌کرد دور انداخته.

## معماری

```mermaid
flowchart LR
    U(("👥 فروشندگان<br/>تلگرام")) --> BOT["back/bot<br/>grammY + Orchestrator"]
    M(("📱 مینی‌اپ<br/>۳۰ صفحه · RTL")) --> API
    O(("🧑‍💻 مالک")) --> DASH["front/dashboard<br/>Aurora UI · fa/en · RTL"]

    BOT -- HTTP لوکال / وبهوک --> API
    DASH -- کلاینت تایپ‌دار --> API

    subgraph SERVER ["back/server — Fastify v5"]
        API["/api/v1 · ۲۸ endpoint<br/>صف HITL · لاگ audit"]
        DB[("Prisma<br/>SQLite → آماده‌ی PostgreSQL")]
    end

    API --> DOM["back/domain<br/>دفتر · اسکرو · منشور<br/>صفر وابستگی runtime"]
    API --> GW["back/ai-gateway<br/>۶ ایجنت · ۱۶ مهارت · سنجش مصرف"]
    GW --> LLM["back/llm<br/>کلاینت سازگار با OpenAI"]
    LLM --> EXT["هر سرویس‌دهنده‌ی<br/>سازگار با OpenAI — ۳ متغیر"]

    NAT["packages/nation<br/>منشور · قانون پول"] -. تایپ‌ها .-> M
    CON["back/contracts<br/>zod → OpenAPI 3.1 → کلاینت تایپ‌دار"] -. تولید .-> API
    CON -. تایپ‌ها .-> DASH
```

- **قراردادها تک‌منبع حقیقت‌اند.** هر endpoint فقط یک‌بار به‌صورت اسکیمای zod در
  [`back/contracts`](back/contracts/src) تعریف می‌شود؛ سند OpenAPI 3.1، مستندات مرورپذیر
  و کلاینتِ داشبورد همه از همان ساخته می‌شوند.
- **دامنه صفر وابستگی runtime دارد.** پول، دفتر، اسکرو و منشور توابع خالص‌اند —
  لایه‌ی HTTP فقط یک آداپتور نازک روی آن‌هاست.

## تصاویر محصول

UI واقعی با دیتای واقعی — کل استک با دیتابیس دموی seed شده بالا آمده (هر ۸ وضعیت اسکرو، صف HITL زنده، دفتر متوازن با Σ = ۰). ست کامل در [docs/screenshots/](docs/screenshots/).

| **نمای کلی — اقتصاد ملی** | **اسکروها — ماشین ۸-وضعیتی** |
|---|---|
| ![نمای کلی](docs/screenshots/01-overview-fa.png) | ![اسکروها](docs/screenshots/03-escrows-fa.png) |
| **حساب‌ها — دفتر دوطرفه** | **صف HITL — ماده ۷، ≥ ۵۰٬۰۰۰ Đ** |
| ![حساب‌ها](docs/screenshots/02-accounts-fa.png) | ![HITL](docs/screenshots/04-hitl-fa.png) |
| **دروازه ادمین — ورود کلید fail-closed** | **مستندات API — OpenAPI 3.1** |
| ![دروازه](docs/screenshots/11-gate-fa.png) | ![مستندات](docs/screenshots/12-api-docs.png) |
| **بات — خرید اسکرویی → تایید انسانی** | **بات — دستورها و اقتصاد ملی** |
| ![بات خرید](docs/screenshots/14-bot-buy-hitl-fa.png) | ![بات راهنما](docs/screenshots/13-bot-help-fa.png) |

*داشبورد دوزبانه است (نماهای EN با شماره‌های ۰۶ تا ۱۰ در پوشه). پیش‌نمایش‌های بات از رشته‌های واقعی i18n خود بات و دیتای زنده سرور رندر شده‌اند.*

## ساختار پروژه

```
DropAgentX v3 (v4.4.2)
├── front/                    # هرچه کاربر لمس می‌کند
│   ├── dashboard/            # Aurora UI — React 19 + Vite + Tailwind v4، fa/en (کنسول مالک)
│   ├── webapp/               # مینی‌اپ تلگرام — ۳۰ صفحه، موبایل‌اول، RTL بومی
│   └── public-site/          # لندینگ PWA استاتیک «XDrop Marketplace» (بدون build)
├── back/                     # هرچه موتور اجرا می‌کند
│   ├── server/               # Fastify v5 + Prisma · /api/v1 · HITL · اسکریپت‌های مهاجرت
│   ├── bot/                  # ربات تلگرام (grammY) · صف HITL در جیب شما
│   ├── domain/               # 💎 هسته‌ی خالص: پول، دفتر دوطرفه، اسکرو، منشور
│   ├── contracts/            # قراردادهای zod → OpenAPI 3.1 → کلاینت تایپ‌دار
│   ├── llm/                  # کلاینت سازگار با OpenAI (ADR-006)
│   └── ai-gateway/           # ۶ ایجنت · ۱۶ مهارت · fallback قطعی · سقف مصرف
├── packages/
│   ├── nation/               # منشور ملی — قانون پول، مشترک با مینی‌اپ
│   └── widget/               # ویجت چت Zenovix (لجسی — فقط مرجع)
├── docs/                     # تز، معماری، نقشه‌ی راه، انتشار، قانون‌نامه + ۸ سند ADR
├── scripts/                  # آیین QC انتشار (package-v3.sh)
├── Dockerfile                # ایمیج سرویس واحد (server + bot در یک process)
└── railway.json              # کانفیگ انتشار Railway — healthcheck روی /api/v1/health
```

## قانون‌های مقدس

غیرقابل‌مذاکره — با تست تضمین شده‌اند، نه با امید:

- 🧾 **پول همیشه عدد صحیح است** (`Din` brand) — هیچ float ای وارد دامنه نمی‌شود.
- ⚖️ **دفتر دوطرفه و تغییرناپذیر است** — Σ همه‌ی ترازها همیشه صفر؛ ترازها مشتق (derived) هستند، ذخیره نمی‌شوند.
- 📮 **قواعد جهت fail-closed هستند** — mint هرگز منفی نمی‌شود، burn هرگز مثبت نمی‌شود،
  حساب‌های user/escrow/خزانه هرگز منفی نمی‌شوند.
- 🏪 **هر فروش مارکتی از اسکرو می‌گذرد** — ماشین حالت صریح ۸ حالته:
  `CREATED → FUNDED → DELIVERED → RELEASED`، `DISPUTED → REFUNDED | RELEASED`،
  `CANCELLED`، `EXPIRED`.
- 🔁 **کلیدهای idempotency به‌صورت no-op پخش می‌شوند** — همان تراکنش دو بار؟ امن است.
- 🧑‍⚖️ **عملیات ≥ ۵۰٬۰۰۰ Đ نیاز به تأیید انسانی دارد (HITL)** — هم در تلگرام، هم در داشبورد.
- 🧱 **خطاها مقدار `Result` هستند** — هیچ exception از مرز دامنه عبور نمی‌کند.
- 🔐 **اسرار هرگز وارد git نمی‌شوند** — ریپو یک `.env` خالی توزیع می‌کند؛ هر انتشار کلیدهای خودش را می‌سازد.

## شروع سریع

**پیش‌نیازها:** Node ≥ 22، [pnpm 9](https://pnpm.io) (با corepack)، داکر اختیاری.

```bash
git clone https://github.com/KiaAgentX/Agent-One.git agent-one
cd agent-one

pnpm install            # نصب workspace (۹ بسته)
cp .env.example .env    # بعد DATABASE_URL و KIA_ADMIN_KEY را پر کنید

pnpm test               # ۲۸۶ تست در ۹ بسته
pnpm typecheck          # strict، صفر خطا — ۹/۹ بسته

pnpm -F @dropagentx/server dev        # API روی :8787 — مستندات در /api/v1/docs
pnpm -F @dropagentx/dashboard dev     # داشبورد روی :5173
pnpm -F @dropagentx/webapp dev        # مینی‌اپ تلگرام
pnpm -F @dropagentx/bot dev           # ربات تلگرام در حالت polling

# اختیاری: دیتای دموی کامل (replay-safe با دفتر متوازن) را بریزید و دوباره داشبورد را باز کنید
BASE_URL=http://127.0.0.1:8787/api/v1 KIA_ADMIN_KEY=<کلید شما> \
  pnpm -F @dropagentx/server exec tsx scripts/seed-demo.ts
```

حداقلی‌ترین `.env`:

```ini
DATABASE_URL=file:./db/v3.db          # SQLite (اسکیما آماده‌ی PostgreSQL)
KIA_ADMIN_KEY=<openssl rand -hex 24>  # هدر X-KIA-Key برای ادمین و داشبورد

TELEGRAM_BOT_TOKEN=                   # اختیاری — انتشار بدون ربات خالی بماند
OPENAI_BASE_URL=                      # لایه‌ی AI: هر سه با هم، یا هیچ‌کدام
OPENAI_API_KEY=                       # (ADR-006)
MODEL=
```

### یک پروسه، یک انتشار

در Railway (یا داکر) سرور و ربات در **یک پروسه** اجرا می‌شوند — ربات از طریق loopback
با همان احراز هویت هر کلاینت با API حرف می‌زند. همان پروسه **فرانت‌اندها را هم سرو
می‌کند**: سایت عمومی روی **`/`** و مینی‌اپ بیلدشده روی **`/app`** (روتر هش، بدون
rewrite) — یک دیپلوی، یک origin، صفر CORS:

```bash
docker build -t dropagentx-v3 .
docker run --rm -p 8787:8787 --env-file .env dropagentx-v3
```

روی Railway بوت **بدون کانفیگ** است: ایمیج `DATABASE_URL=file:/app/db/v3.db` را همراه
دارد و entrypoint همان را قبل از گیت fail-closed پیش‌فرض می‌کند — فقط یک volume روی
`/app/db` وصل کنید و `TELEGRAM_BOT_TOKEN` را بدهید؛ Railway خودش `PORT` را تزریق می‌کند
و healthcheck (`/api/v1/health`) در `railway.json` از قبل سیم‌کشی شده است.

بات در توسعه‌ی محلی **long-polling** است؛ روی Railway (وقتی دامنه‌ی عمومی وجود دارد)
موقع بوت **خودکار وبهوک را مسلح می‌کند** — تلگرام آپدیت‌ها را push می‌کند، دیگر
`getUpdates`ای برای تصادم نمی‌ماند و overlap دیپلوی هرگز نمی‌تواند بات را با 409
بیندازد؛ یک secret گذرای بوت هم دوطرفه مسلح می‌شود. برای تحمیل حالت به‌صورت دستی:

```ini
BOT_MODE=webhook
BOT_WEBHOOK_URL=https://<app>.up.railway.app/api/v1/bot/webhook
TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 32>   # خودکار دوطرفه مسلح می‌شود
```

وقتی وبهوک مسلح شود، بوت **`WEBAPP_BASE_URL` را خودش از origin وبهوک می‌سازد**
(`https://<app>.up.railway.app/app/`) — و روی Railway حتی حالت polling هم آن را از
`RAILWAY_PUBLIC_DOMAIN` تزریقی می‌سازد. همین پایه **دکمه‌های وب‌اپ ربات را مسلح
می‌کند** (دکمه‌ی «اپ تلگرام» زیر کارت هر فرمان و در منوی /start). فقط برای دامنه‌ی
سفارشی `WEBAPP_BASE_URL` را دستی ست کنید.

دیپلوی‌های polling هم **مقاوم به overlap** هستند: وقتی کانتینر قدیمی هنوز در حال
خاموش‌شدن است، نمونه‌ی تازه ممکن است مسابقه‌ی `getUpdates` را با خطای گذرای 409
ببازد — بات به‌جای crash-loop با backoff دوباره تلاش می‌کند (بودجه‌ی حدود ۲ دقیقه) و
فقط یک نمونه‌ی دائمیِ واقعی دوم (مثلاً ربات روی لپ‌تاپ شما) باز هم سریع fail می‌شود.

بات موقع بوت خودش `setWebhook` می‌زند (با secret token) و سرور `POST /api/v1/bot/webhook`
را مونت می‌کند — لاگ‌های `Telegram webhook mounted` / `webhook armed` تأییدش می‌کنند.
جزئیات: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## سطح API

۲۸ endpoint تایپ‌دار زیر `/api/v1`، همه از قراردادهای zod ساخته شده‌اند — سند زنده‌ی
OpenAPI روی **`/api/v1/openapi.json`** و مستندات مرورپذیر روی **`/api/v1/docs`**:

| گروه | endpoint ها | توضیح |
|---|---|---|
| Meta | `GET /health` · `GET /openapi.json` · `GET /docs` | healthcheck برای Railway |
| حساب‌ها | `GET /accounts` · `POST /accounts` · `GET /accounts/{id}/balance` | ترازهای derived، نما‌ی trial balance |
| کیف پول | `POST /wallet/mint` · `POST /wallet/burn` | قواعد جهت fail-closed |
| اسکرو | `GET /escrows` · `POST /escrows` · `GET /escrows/{id}` + ۷ مسیر چرخه‌ی عمر | ماشین ۸ حالته، idempotent |
| HITL | `GET /hitl` · `POST /hitl` · `GET /hitl/{id}` · `approve`/`reject` · `POST /hitl/sweep` | صف ≥ ۵۰٬۰۰۰ Đ |
| سیستم | `POST /system/backup` | اسنپ‌شات درخواستی دیتابیس |
| اقتصاد | `GET /economy` | عرضه در گردش، خزانه، مالیات |
| AI | `POST /ai/chat` · `GET /ai/agents` · `GET /ai/skills` · `GET /ai/usage` | سنجیده، سقف‌دار |
| ربات | `POST /bot/webhook` | در حالت سرویس واحد خودکار مسلح می‌شود |

هر پاسخ با همان اسکیمایی که مسیر را ساخته اعتبارسنجی می‌شود — کلاینت تایپ‌دار داشبورد
([`createV3Client`](front/dashboard/src/lib/api.ts)) همان بسته‌ی قرارداد را با سرور به اشتراک می‌گذارد.

## لایه‌ی AI — سازگار با OpenAI، از طراحی

[ADR-006](docs/adr/ADR-006-openai-compatible-llm.md) لایه‌ی مدل را به **یک قرارداد** قفل
کرده: یک API ساده‌ی سازگار با OpenAI. بدون SDK اختصاصی، بدون قفل به فروشنده —
تغییر سرویس‌دهنده فقط با سه متغیر محیطی:

```ini
OPENAI_BASE_URL=https://your-provider.example/v1
OPENAI_API_KEY=sk-...
MODEL=your-model-of-choice
```

روی همین کلاینتِ واحد، [`back/ai-gateway`](back/ai-gateway/src) **۶ ایجنت Zenovix**
(`orchestrator`، `receptionist`، `sales`، `support`، `analyst`، `content`) و
**۱۶ مهارت KIA-OS** (کیف پول، اسکرو، محصولات، پایگاه دانش، آنالیتیکس، اطلاع‌رسانی)
را اجرا می‌کند — با سقف توکن روزانه برای هر کاربر، سنجش مصرف و fallback قطعی وقتی
سرویس‌دهنده در دسترس نیست. سرویس‌دهنده‌ی دوم (`OPENAI_BASE_URL_2` / `OPENAI_API_KEY_2` /
`MODEL_2`) می‌تواند به‌عنوان fallback همراه باشد.

## مدل امنیتی

- **احراز تلگرام** — هر درخواست ربات با امضای HMAC روی `initData` در برابر توکن ربات
  راستی‌آزمایی می‌شود؛ payload جعلی رد می‌شود.
- **احراز وبهوک** — آپدیت‌های تلگرام با هدر `x-telegram-bot-api-secret-token`
  راستی‌آزمایی می‌شوند؛ سکرت موقع بوت دوطرفه مسلح می‌شود.
- **سطح ادمین** — مسیرهای مدیریتی هدر `X-KIA-Key` می‌خواهند؛ مقایسه به‌صورت
  timing-safe با `KIA_ADMIN_KEY`.
- **محدودیت نرخ** — throttle بر اساس IP با `@fastify/rate-limit` (پیش‌فرض ۲۴۰ درخواست/دقیقه).
- **لاگ audit** — رویدادهای امنیتی در یک دفتر append-only ثبت می‌شوند.
- **Fail-closed** — احراز هویت گم‌شده یا خراب یعنی رد، نه حدس.
- **آستانه‌ی انسانی** — HITL مبالغ غیرقابل‌برگشت را زیر کنترل انسانی نگه می‌دارد.

## مهاجرت لجسی

داده‌ی v2 از روز اول به v3 می‌آید، به‌صورت replay-safe: ۴۶۶ کاربر روی حساب‌های
`user:tg:<id>` می‌نشینند و گپ تاریخی −۶۳ Đ به‌صورت **ردیف تعدیل صریح** می‌شود —
هرگز یک تعمیر بی‌صدا. ممیزی بیرونی است (SQL خام، بدون Prisma):

```bash
pnpm -F @dropagentx/server exec tsx scripts/migrate-legacy.ts --from <v2.json> --db file:./db/v3.db
pnpm -F @dropagentx/server exec tsx scripts/genesis-proof.ts --db file:./db/v3.db
# PROOF OK — Σ کیف‌های کاربران = ۱۸۷٬۶۷۲ Đ، همه‌ی انتظارها برقرار.
```

## تست‌ها

۲۸۶ تست، سبز روی هر push — `pnpm typecheck` هم strict و تمیز روی ۹/۹ بسته:

| بسته | تعداد | پوشش |
|---|---:|---|
| `back/server` | ۴۸ | HTTP + امنیت + HITL + چرخه‌ی AI + سطوح استاتیک (انتگراسیون) |
| `front/dashboard` | ۴۳ | UI، i18n، فرمت‌بندی، **roundtrip کلاینت↔سرور** |
| `front/webapp` | ۳۹ | صفحات مینی‌اپ، i18n، قانون پول با بسته‌ی nation |
| `back/domain` | ۴۰ | پول، بستگی دفتر، ماشین اسکرو، منشور |
| `back/bot` | ۴۲ | Orchestrator + چسب تلگرام + پخش وبهوک + دکمه‌های وب‌اپ |
| `back/ai-gateway` | ۲۹ | ایجنت‌ها، مهارت‌ها، سنجش، fallback |
| `back/llm` | ۱۷ | قرارداد کلاینت سازگار با OpenAI |
| `packages/nation` | ۱۷ | منشور ملی — قانون پول مشترک با مینی‌اپ |
| `back/contracts` | ۱۱ | تولید OpenAPI + کلاینت تایپ‌دار |

تست roundtrip داشبورد **سرور واقعی** را روی دیتابیس موقت بالا می‌آورد و **کلاینت
تایپ‌دار واقعی** را از میانش عبور می‌دهد — قراردادها سر تا سر تمرین می‌شوند، نه mock.

## نقشه‌ی راه

| فاز | محتوا | وضعیت |
|---|---|---|
| ۰ | اسکلت monorepo — pnpm + turbo + TS strict + CI | ✅ |
| ۱ | هسته‌ی دامنه‌ی خالص — پول، دفتر، اسکرو، منشور | ✅ |
| ۲ | سرور Fastify + قراردادهای zod→OpenAPI + کلاینت LLM | ✅ |
| ۳ | ربات تلگرام (grammY) + HITL سمت سرور | ✅ |
| ۴ | داشبورد Aurora — fa/en، RTL، کلاینت تایپ‌دار | ✅ |
| ۵ | گیت‌وی AI — ۶ ایجنت، ۱۶ مهارت، سقف، fallback | ✅ |
| ۶ | مهاجرت لجسی (Σ ۱۸۷٬۶۷۲ Đ اثبات‌شده) + انتشار Railway | ✅ |
| ۷ | یکپارچه‌سازی — ۸ ریپو → یک monorepo، مینی‌اپ + سایت عمومی + منشور ملی، v4.4.2 روی Agent-One | ✅ |

جزئیات و معیارهای پذیرش هر فاز: [`docs/ROADMAP.md`](docs/ROADMAP.md).
قانون‌نامه‌ی یکپارچه‌سازی: [`docs/RULEBOOK.md`](docs/RULEBOOK.md).
تصمیم‌ها و پیامدهایشان: [`docs/adr/`](docs/adr/) (ADR-001 تا ADR-008).

## مستندات

| سند | چه چیزی داخلش است |
|---|---|
| [PRODUCT-THESIS.md](docs/PRODUCT-THESIS.md) | چرا این موتور فروش می‌رود — ۵ ابزار شکسته → ۱، سه لایه درآمد |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | چیدمان شش‌ضلعی، جریان داده، مرز ماژول‌ها |
| [ROADMAP.md](docs/ROADMAP.md) | فازها با معیار پذیرش |
| [DEPLOY.md](docs/DEPLOY.md) | انتشار سرویس واحد Railway، volume، وبهوک، ران‌بوک مهاجرت |
| [RULEBOOK.md](docs/RULEBOOK.md) | قانون‌نامه‌ی یکپارچه‌سازی — چطور ۸ ریپو یکی شد (v1.1) |
| [PUSH-AGENT-ONE.md](docs/PUSH-AGENT-ONE.md) | پوش به ریموت Agent-One — نگاشت SHA + رسپی |
| [ADR-001…008](docs/adr/) | اسناد تصمیم معماری — شش‌ضلعی، پول صحیح، دوطرفه، ماشین اسکرو، قرارداد/OpenAPI، LLM سازگار با OpenAI، Vite SPA، گیت‌وی AI |

## مشارکت

این خط تولیدِ یک محصول تجاری است، پس قواعد سخت‌گیرانه‌اند:

1. از `main` **شاخه بگیرید**؛ کامیت‌ها [سبک conventional](https://www.conventionalcommits.org) (`feat:`، `fix:`، `docs:`…).
2. **typecheck + تست باید سبز بماند** — `pnpm typecheck && pnpm test` قبل از هر push (۲۸۶ تست، typecheck ۹/۹).
3. **هر تغییر دامنه برای هر قانون مقدسی که لمس می‌کند تست می‌خواهد.**
4. **هرگز اسرار را commit نکنید** — آیین QC هر کلید واقعی‌نما در قالب‌های env را رد می‌کند.

آیین انتشار (`scripts/package-v3.sh`) حاضر نیست چیزی بفرستد مگر اینکه درخت تمیز باشد،
`git fsck` بگذرد، هر ۲۸۶ تست سبز باشند، نسخه‌ی هر ۱۰ مانیفست هم‌گام باشد و هیچ اسری
به قالب env نشت نکرده باشد.

## مجوز

[MIT](LICENSE) © KiaAgentX

<div align="center">

<sub>«از صفر و یک، تا حکومت.»</sub>

</div>
