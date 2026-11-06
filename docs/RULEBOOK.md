# 📕 دفترچه قانون — ادغام ۸ مخزن به یک پروژه واحد
**نسخه ۱.۱ — قانون واحد: هیچ چیزی از دست نمی‌رود — و UI کامل است.**

---

## ⚡ قانون صفر (هدف واحد)
تمام ۸ مخزن به **یک مخزن واحد (monorepo)** تبدیل می‌شوند به‌طوری که:
هر فایل از هر مخزن، در نهایت دقیقاً یکی از این سه حالت را داشته باشد:

| وضعیت | معنی |
|---|---|
| `IDENTICAL` | عیناً منتقل شده |
| `EVOLVED` | نسخهٔ تکامل‌یافته‌اش جایگزین شده (با ثبت diff) |
| `ARCHIVED` | در `legacy/` بایگانی شده و قابل بازگردانی است |

چیزی به نام «حذف‌شده» وجود ندارد.

---

## 🧬 قانون ۱ — شجره‌نامه (منبع حقیقت)
```
DropAgentXBot-main (اسنپ‌شات تاریخی، changelog فارسی v0.5.0 → v3.3.3)
        │
   DropAgentX (نسخهٔ زندهٔ قدیمی)
        ├──→ AgentX          = DropAgentX + ماژول nation/economy   (16 اختلاف)
        └──→ DropAgentX-v3   = بازساخت monorepo با pnpm
                  └──→ Bot   = v3 + ماژول backup                   (16 اختلاف، جدیدترین: 2026-11-06)

مستقل‌ها (خط نسلی مشترک ندارند):
   HermesA        (همان دامنه، معماری جدا: front/back)   2026-11-04
   zenovix-main   (Chat Widget v3.2)
   AGI-main       (Zenovix 1.6.0 + charter 2.1.0)
```

**قانون:** برای هر خط نسلی، **جدیدترین نسخه** منبع حقیقت است:
- خط monorepo → **Bot** (شامل تمام v3 + backup)
- خط قدیمی → **AgentX** (شامل تمام DropAgentX + nation)

---

## 🏗️ قانون ۲ — ساختار هدف
اسکلت بر پایهٔ **Bot** ساخته می‌شود (کامل‌ترین و جدیدترین):

```
unified/
├── back/
│   ├── bot/          ← از Bot (خط نسلی v3)
│   ├── server/       ← از Bot (شامل backup.ts و تستش)
│   ├── ai-gateway/   ← از Bot
│   └── contracts/    ← از Bot
├── front/
│   ├── dashboard/    ← از Bot (ادمین React + Vazirmatn + i18n)
│   ├── webapp/       ← Telegram Mini App — ۳۰ صفحه (جدید، بند قانون ۹)
│   └── public-site/  ← از AgentX (PWA: index + economy + nation + sw.js)
├── apps/
│   └── hermesa/      ← از HermesA (معماری مستقلش حفظ می‌شود)
├── packages/
│   ├── nation/       ← از AgentX (src/nation + scripts/nation)
│   └── widget/       ← از zenovix-main
├── docs/
│   ├── economy-charter.md   ← از AgentX
│   ├── charter/             ← از AGI-main (charter 2.1.0)
│   ├── changelog-fa.md      ← از DropAgentXBot-main (تاریخچهٔ فارسی نسخه‌ها)
│   └── INDEX.md + RULEBOOK.md
└── legacy/           ← بایگانی هر چه جایگزین شده (قابل مراجعه)
```

---

## ⚖️ قانون ۳ تا ۱۰ — قوانین اجرا

| # | قانون |
|---|---|
| **۳** | **تاریخچهٔ git مقدس است:** هر ۸ مخزن به‌عنوان remote به مخزن واحد اضافه می‌شوند؛ تاریخ با subtree/merge حفظ می‌شود. |
| **۴** | **هیچ رفتاری تغییر نمی‌کند:** ادغام فقط انتقال + سازگاری است؛ هیچ فیچری غیرفعال یا حذف نمی‌شود. |
| **۵** | **تک‌نسخه‌ای بودن:** هر منطق تجاری فقط یک نسخهٔ زنده دارد؛ نسخه‌های قدیمی‌تر فقط در `legacy/`. |
| **۶** | **ممیزی ماشینی:** اسکریپت مانیفست باید ۱۰۰٪ پوشش فایل‌های هر ۸ مخزن را با وضعیت `IDENTICAL/EVOLVED/ARCHIVED` گزارش کند. زیر ۱۰۰٪ = شکست گام. |
| **۷** | **هر گام باید سبز باشد:** بعد از هر گام، build و تست‌های موجود پاس می‌شوند؛ وگرنه به گام قبل برمی‌گردیم. |
| **۸** | **نسخه‌گذاری واحد:** semver از بالاترین نسخهٔ موجود ادامه پیدا می‌کند (بعد از v3.3.3). |
| **۹** | **UI سه‌سطحی کامل است** (بند بعدی). یک سطح ناقص = تحویل ممنوع. |
| **۱۰** | **فرمان‌های بات گلچین‌شده‌اند:** رجیستری واحد ۲۸ فرمان با فرمت استاندارد (نام، توضیح دوزبانه، دسترسی، دکمه‌ها) — نه پراکندگی بین هندلرها. |

---

## 🎨 قانون ۹ — UI سه‌سطحی (شرط تحویل)
UI فقط داشبورد ادمین نیست. پروژهٔ واحد **سه سطح UI** دارد:

### سطح A — داشبورد ادمین → `front/dashboard`
پایه: داشبورد React از Bot (۵ صفحه: Overview، Accounts، Escrows، Hitl، Settings).
مرجع گسترش: **۲۴ صفحهٔ ops از AGI-main** (soul، live، sales، inbox، brain، market، queue، audit، insights، simulator، ...) که در `legacy/agi-ops/` نگه داشته می‌شوند و صفحه‌به‌صفحه به React پورت می‌شوند.

### سطح B — Telegram Web App (Mini App) → `front/webapp` ⭐ جدید
ده‌ها صفحه، دوزبانه (fa/en)، رابط Telegram WebApp API، موبایل‌فرست. نقشهٔ ۳۰ صفحه از روی قابلیت‌های واقعی مخزن‌ها:

| # | صفحه | منبع منطق |
|---|---|---|
| ۱ | home (خانه) | orchestrator |
| ۲ | onboarding | start handler |
| ۳–۵ | market / product / checkout | market handler + wizard |
| ۶–۷ | orders / order-detail | orders handler |
| ۸ | escrow (اطمینان) | contracts/escrows |
| ۹–۱۰ | bookings / booking-detail | bookings handler |
| ۱۱ | wallet | wallet handler + contracts/wallet |
| ۱۲–۱۴ | deposit / withdraw / transfer | wallet handler |
| ۱۵ | transactions history | history command |
| ۱۶–۱۷ | economy / nation | nation package + economy.html + nation.html از AgentX |
| ۱۸–۱۹ | leaderboard / referral | quests handler + ref |
| ۲۰–۲۱ | quests / quest-detail | quests handler |
| ۲۲–۲۳ | sales / seller-dashboard | sales handler |
| ۲۴ | crm | crm handler |
| ۲۵ | profile | identity.ts |
| ۲۶–۲۷ | settings / language | SettingsPage + lang |
| ۲۸ | notifications | broadcast |
| ۲۹ | help/support | help + crm |
| ۳۰ | charter/about | AGI charter |

مرجع‌های طراحی: `admin/twa.html` از AGI-main و `telegram-platform/twa.html` از zenovix (در legacy).

### سطح C — دستورهای بات (گلچین نهایی)
از ۲۸ فرمان کشف‌شده در خط کلاسیک (AgentX/DropAgentX — شمارش ماشینی، اصلاح‌شده از ۲۷)، رجیستری واحد ساخته می‌شود و به **orchestrator** خط جدید (Bot) متصل می‌شود:

| دسته | فرمان‌ها |
|---|---|
| هسته | `/start` `/menu` `/help` `/lang` `/id` |
| بازار | `/market` `/addproduct` `/orders` `/book` `/bookings` `/cancel` |
| کیف پول | `/wallet` `/transfer` `/withdraw` `/history` |
| رشد | `/quests` `/leaderboard` `/ref` |
| فروشنده | `/sales` `/crm` `/lead` |
| حاکمیت | `/approvals` `/panel` `/owner` `/broadcast` `/stats` `/kill` |

فرمت استاندارد هر فرمان: «نام + توضیح fa/en + سطح دسترسی + صفحهٔ WebApp مرتبط + دکمه‌های inline» — با `setMyCommands` بر اساس scope (همه / فروشنده / ادمین).

---

## 🚀 نقشهٔ راه — ۷ گام

| گام | کار | معیار قبولی |
|---|---|---|
| **۱** | دفترچه قانون + نقشهٔ ساختار | ✅ همین سند (v1.1 با قوانین UI) |
| **۲** | ساخت اسکلت واحد از Bot + اتصال ۸ ریموت + اسکلت webapp | ✅ **Done** — مخزن `unified/` ساخته شد؛ ۶ ریموت fetch شد (`git log` همهٔ خطوط در دسترس: Bot، v3، AgentX، DropAgentX، HermesA، portfolio)؛ webapp با رجیستری ۳۰ صفحه + typecheck/build سبز؛ همهٔ تست‌های موجود سبز (server 43، dashboard 35، bot) |
| **۳** | ادغام خطوط نسلی: انتقال nation از AgentX + رجیستری ۲۸ فرمان متصل به orchestrator | ✅ **Done** — `packages/nation` با charter IDENTICAL (diff صفر) + سرویس/روت EVOLVED (Fastify، همان ۳ مسیر)؛ ۱۷ تست nation سبز. رجیستری ۲۸ فرمان در `back/bot/src/commands/registry.ts` متصل به orchestrator (منوی دسته‌بندی + شناسنامهٔ استاندارد + دکمهٔ WebApp)؛ ۱۴ تست جدید + ۲۲۶ تست کل سبز |
| **۴** | ورود یکتاها: HermesA → apps، zenovix → packages/widget، AGI ops/charter → docs و legacy | ✅ **Done** — `apps/hermesa` (۷.۵M، IDENTICAL، diff صفر، npm مستقل) · `packages/widget` (zenovix v3.2، IDENTICAL) · `legacy/agi-main/` (کل اسنپ‌شات ۴۵۶ فایل، IDENTICAL) · `docs/charter/` (charter 2.1.0 استخراج شد) · نقشهٔ کامل در `legacy/README.md` — هیچ پوشه‌ای جا نماند |
| **۵** | **UI کامل:** ۳۰ صفحهٔ webapp + پورت صفحات ops به dashboard + PWA از AgentX | هر ۳ سطح UI طبق قانون ۹ کامل |
| **۶** | ممیزی صفر-اتلاف: اسکریپت مانیفست روی هر ۸ مخزن | گزارش پوشش = ۱۰۰٪ |
| **۷** | build/test نهایی + بسته‌بندی تحویل | همهٔ تست‌ها سبز + مخزن واحد آماده |

**گام ۰ (انجام شده):** کلون ۸ مخزن + اینونتوری + کشف شجره‌نامه → `INDEX.md`
