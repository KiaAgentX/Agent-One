/**
 * format.ts — dinar & number formatting, locale-aware, integer-exact.
 * Money is always integer Đ (charter law, packages/nation) — we only render.
 */

import type { Lang } from './i18n';

const nf = (lang: Lang): Intl.NumberFormat =>
  new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', { maximumFractionDigits: 0 });

export function fmtNum(n: number, lang: Lang): string {
  return nf(lang).format(n);
}

/** 42000 → «۴۲٬۰۰۰ Đ» (fa) / "42,000 Đ" (en). */
export function fmtDin(n: number, lang: Lang): string {
  return `${nf(lang).format(n)} ${lang === 'fa' ? 'دینار' : 'Đ'}`;
}

/** Compact for stats: 1250000 → ۱.۲M / 1.2M */
export function fmtCompact(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

const faDate = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });
const enDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });

export function fmtDay(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return lang === 'fa' ? faDate.format(d) : enDate.format(d);
}

export function fmtTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Deterministic short id for demo data — stable across renders/tests. */
export function shortRef(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}
