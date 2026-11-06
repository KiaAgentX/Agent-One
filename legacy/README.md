# legacy/ — بایگانی (قانون صفر و ۵)

هیچ فایلی «حذف‌شده» نیست. هر چیزی از ۸ مخزن که نسخهٔ زندهٔ تکامل‌یافته‌ای پیدا کند،
نسخهٔ قدیمی‌اش اینجا بایگانی می‌شود و قابل مراجعه/بازگردانی است.

## نقشهٔ بایگانی (گام ۴)

| بایگانی | منبع | کاربرد |
|---|---|---|
| `agi-main/` (کل اسنپ‌شات Zenovix 1.6.0 — ۴۵۶ فایل) | portfolio/AGI-main | مرجع کامل؛ زیرمجموعه‌های کاربردی: |
| `agi-main/admin/ops/` — ۲۴ صفحهٔ ادمین | همان | **مرجع طراحی گام ۵** — پورت صفحه‌به‌صفحه به `front/dashboard` (سطح A قانون ۹) |
| `agi-main/admin/twa.html` | همان | مرجع طراحی Mini App (سطح B قانون ۹) |
| `agi-main/docs/` (platform-map، terms-of-service، webapp-10x-diagrams) | همان | مراجع معماری و حقوقی |
| `agi-main/app/core/company_charter.py` + `docs/charter.html` | همان | نسخهٔ زنده: `docs/charter/` |

## خطوط نسلی زنده (قانون ۳) — از طریق ریموت‌های git در دسترس‌اند:
`origin` (Bot) · `v3` (DropAgentX-v3) · `agentx` · `dropagentx` · `hermesa` · `portfolio`

## آثاری که نسخهٔ زنده گرفتند (برای ممیزی گام ۶)

| اثر قدیمی | نسخهٔ زنده | وضعیت |
|---|---|---|
| `AgentX/src/nation/*` | `packages/nation/*` | `IDENTICAL` (charter) + `EVOLVED` (service/routes) |
| `AgentX/src/bot/handlers/*` — ۲۸ فرمان | `back/bot/src/commands/registry.ts` + orchestrator | `EVOLVED` (رجیستری متصل) |
| `HermesA/*` | `apps/hermesa/*` | `IDENTICAL` — معماری مستقل حفظ شده |
| `zenovix-main/*` (widget v3.2) | `packages/widget/*` | `IDENTICAL` |
| `AGI-main/admin/ops/*` | فعلاً مرجع؛ پورت به dashboard در گام ۵ | `ARCHIVED→EVOLVED` |
