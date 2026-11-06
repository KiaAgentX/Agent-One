/**
 * charterArticles.ts — the 10 charter articles as bilingual data for the
 * /charter page. Persian rules mirror packages/nation routes (Article 10
 * endpoint); English is the UI twin. Numbers come from the REAL constants.
 */

import {
  DINAR,
  HITL_THRESHOLD_DINAR,
  MINT_DAILY_CAPS,
  TAX_DEFAULT_PERCENT,
  TAX_MAX_PERCENT,
} from '@dropagentx/nation';
import type { Bi } from '../lib/demo';

const num = (n: number): string => n.toLocaleString('en');

export interface Article {
  id: number;
  title: Bi;
  rule: Bi;
}

export const ARTICLES: readonly Article[] = [
  { id: 1, title: { fa: 'واحد پول', en: 'Currency' }, rule: { fa: `دینار دیجیتال (${DINAR.symbol}/${DINAR.code})؛ تغییر نام ۱:۱ اعتبارات — هرگز تنزیل نمی‌شود.`, en: `The Digital Dinar (${DINAR.symbol}/${DINAR.code}); a 1:1 renaming of credits — never devalued.` } },
  { id: 2, title: { fa: 'رزرو خارجی', en: 'Foreign reserve' }, rule: { fa: 'ستارهٔ تلگرام رزرو خارجی است؛ دینار فقط داخلی است.', en: 'Telegram Stars are the foreign reserve; the dinar is internal only.' } },
  { id: 3, title: { fa: 'خزانه', en: 'Treasury' }, rule: { fa: 'کمیسیون پیش از هر تسویهٔ فروشنده به خزانه می‌رود.', en: 'Commission is collected before any seller payout.' } },
  { id: 4, title: { fa: 'مالیات', en: 'Tax' }, rule: { fa: `پیش‌فرض ${TAX_DEFAULT_PERCENT}٪؛ سقف قانونی ${TAX_MAX_PERCENT}٪.`, en: `Default ${TAX_DEFAULT_PERCENT}%; legal cap ${TAX_MAX_PERCENT}%.` } },
  { id: 5, title: { fa: 'ضرب', en: 'Minting' }, rule: { fa: 'پاداش کوئست/معرفی ضرب ملی است با سقف روزانه.', en: 'Quest/referral rewards are national mints with daily caps.' } },
  { id: 6, title: { fa: 'ابطال', en: 'Burning' }, rule: { fa: 'سوزاندن دینار فقط در مسیرهای مستندِ ابطال.', en: 'Dinar burns only on documented cancellation paths.' } },
  { id: 7, title: { fa: 'ناوردای مقدس', en: 'Sacred invariant' }, rule: { fa: 'Σ موجودی ≡ Σ دفتر + تعدیلات مستند.', en: 'Σ balances ≡ Σ ledger + documented adjustments.' } },
  { id: 8, title: { fa: 'سقف‌های ضرب', en: 'Mint caps' }, rule: { fa: `کوئست ≤ ${num(MINT_DAILY_CAPS.quest)} Đ/روز · معرفی ≤ ${num(MINT_DAILY_CAPS.referral)} Đ/روز.`, en: `Quests ≤ ${num(MINT_DAILY_CAPS.quest)} Đ/day · referrals ≤ ${num(MINT_DAILY_CAPS.referral)} Đ/day.` } },
  { id: 9, title: { fa: 'حاکمیت انسانی', en: 'Human governance' }, rule: { fa: `اقدام یکجا ≥ ${num(HITL_THRESHOLD_DINAR)} Đ نیازمند تصمیم انسانی است.`, en: `Any single action ≥ ${num(HITL_THRESHOLD_DINAR)} Đ needs a human decision.` } },
  { id: 10, title: { fa: 'شفافیت', en: 'Transparency' }, rule: { fa: 'قانون آینهٔ واقعیت کد است؛ API اقتصاد عمومی و فقط-خواندنی.', en: 'The law mirrors the code; the economy API is public and read-only.' } },
];
