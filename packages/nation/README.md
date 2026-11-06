# @dropagentx/nation — اقتصاد کشور دیجیتال (خط نسلی AgentX)

بستهٔ قانون پولی + API شفافیت فقط-خواندنی. این بسته **ماژول nation از AgentX** است که
طبق قانون صفر بدون هیچ اتلافی به مخزن واحد منتقل شده:

| فایل | وضعیت ممیزی | توضیح |
|---|---|---|
| `src/charter.ts` | `IDENTICAL` | کپی بایت-به-بایت از `AgentX/src/nation/charter.ts` — ۱۰ مادهٔ منشور به‌صورت کد خالص |
| `src/economy.service.ts` | `EVOLVED` | تنها تغییر: پرisma به‌جای import مستقیم، **تزریق** می‌شود (`NationDb`) — رفتار و شکل خروجی بدون تغییر |
| `src/economy.routes.ts` | `EVOLVED` | Express Router → Fastify plugin؛ همان ۳ مسیر، همان JSON، همان 503 |
| `src/tests/nation.charter.test.ts` | `EVOLVED` | پورت ۱۰ کیس اصلی (node:test → vitest) با همان assertها |
| `src/tests/nation.service.test.ts` | `NEW` | تست سرویس با db استاب + تست ۳ مسیر + مسیر 503 |
| `scripts/` | `IDENTICAL` | `nation-genesis-proof.py` + README (حسابرسی میراث: شکاف −63 Đ آیتم‌شده ۱۰۰٪) |
| `docs/economy-charter.md` (در ریشه) | `IDENTICAL` | متن کامل منشور اقتصادی |

## مصرف

```ts
import { nationEconomyRoutes } from '@dropagentx/nation';
await app.register(nationEconomyRoutes, { prefix: '/api/v1/nation', db });
```

مسیرها (Article 10 — عمومی و فقط-خواندنی):
- `GET /api/v1/nation/economy` → شاخص‌های زنده
- `GET /api/v1/nation/economy/verify` → گزارش ناوردای مقدس + حسابرسی میراث
- `GET /api/v1/nation/economy/charter` → منشور ۱۰ ماده‌ای به‌صورت داده

## نکتهٔ سازگاری
اسکیمای v3 هنوز مدل Wallet/Order خط کلاسیک را ندارد (ادغام کیف پول: گام ۵)؛
تا آن زمان سرویس از رابط ساختاری `NationDb` تغذیه می‌شود و تست‌ها با استاب سبز است.
