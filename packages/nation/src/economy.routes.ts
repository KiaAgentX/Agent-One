/**
 * Nation economy routes — public, READ-ONLY transparency API (Article 10).
 * ─────────────────────────────────────────────────────────────────────────────
 * EVOLVED from AgentX src/nation/economy.router.ts (zero-loss trace, Law 0):
 * Express Router → Fastify plugin. Paths, JSON payloads, status codes and
 * the additive mount contract are IDENTICAL:
 *   GET /api/v1/nation/economy           → live indicators
 *   GET /api/v1/nation/economy/verify    → sacred-invariant report (Article 7)
 *   GET /api/v1/nation/economy/charter   → the 10-article charter as data
 * The consumer registers with `{ prefix: '/api/v1/nation' }` — no existing
 * route is touched, exactly like the original Express mount.
 */
import type { FastifyInstance } from 'fastify';
import {
  DINAR,
  HITL_THRESHOLD_DINAR,
  MINT_DAILY_CAPS,
  TAX_DEFAULT_PERCENT,
  TAX_MAX_PERCENT,
} from './charter.js';
import {
  getEconomyIndicators,
  getGenesisAudit,
  verifySacredInvariant,
  type NationDb,
} from './economy.service.js';

export interface NationRoutesOptions {
  readonly db: NationDb;
}

export async function nationEconomyRoutes(
  fastify: FastifyInstance,
  opts: NationRoutesOptions,
): Promise<void> {
  const errPayload = (error: unknown, message: string) => ({
    ok: false,
    error: message,
    detail: error instanceof Error ? error.message : String(error),
  });

  fastify.get('/economy', async (_req, reply) => {
    try {
      return { ok: true, indicators: await getEconomyIndicators(opts.db) };
    } catch (err) {
      reply.code(503);
      return errPayload(err, 'economy indicators unavailable (database offline?)');
    }
  });

  fastify.get('/economy/verify', async (_req, reply) => {
    try {
      return { ok: true, audit: await verifySacredInvariant(opts.db), genesis: getGenesisAudit() };
    } catch (err) {
      reply.code(503);
      return errPayload(err, 'verification unavailable (database offline?)');
    }
  });

  fastify.get('/economy/charter', async () => ({
    ok: true,
    charter: {
      title: 'منشور پولی کشور دیجیتال — ۱۰ ماده',
      currency: DINAR,
      articles: [
        { id: 1, title: 'واحد پول', rule: 'دینار دیجیتال (Đ/DNX)؛ تغییر نام ۱:۱ اعتبارات — هرگز تنزیل و بازپایه‌گذاری نمی‌شود' },
        { id: 2, title: 'رزرو خارجی', rule: 'ستارهٔ تلگرام = رزرو خارجی کشور؛ دینار فقط داخلی است' },
        { id: 3, title: 'خزانه', rule: 'کمیسیون پیش از هر تسویهٔ فروشنده به خزانه واریز می‌شود' },
        { id: 4, title: 'مالیات', rule: `پیش‌فرض ${TAX_DEFAULT_PERCENT}٪ (نرخ واقعی کد)؛ سقف قانونی ${TAX_MAX_PERCENT}٪` },
        { id: 5, title: 'ضرب', rule: 'پاداش‌ها (کوئست/معرفی) ضرب ملی‌اند با سقف روزانه' },
        { id: 6, title: 'ابطال', rule: 'سوزاندن دینار فقط در مسیرهای مستندِ ابطال' },
        { id: 7, title: 'ناوردای مقدس', rule: 'Σ موجودی ≡ Σ دفتر + تعدیلات مستند — مغایرتِ توجیه‌ناپذیر = شکست حسابرسی' },
        { id: 8, title: 'سقف‌های ضرب', rule: `کوئست ≤ ${MINT_DAILY_CAPS.quest.toLocaleString('en')} Đ/روز · معرفی ≤ ${MINT_DAILY_CAPS.referral.toLocaleString('en')} Đ/روز` },
        { id: 9, title: 'حاکمیت انسانی', rule: `اقدام یکجا ≥ ${HITL_THRESHOLD_DINAR.toLocaleString('en')} Đ نیازمند تصمیم انسانی (HITL) است` },
        { id: 10, title: 'شفافیت', rule: 'این API فقط-خواندنی و عمومی است؛ قانون آینهٔ واقعیت کد است' },
      ],
    },
  }));
}
