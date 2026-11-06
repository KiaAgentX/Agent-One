/**
 * i18n — fa (default, RTL) and en. Same flat-dotted-key parity pattern as
 * the dashboard: TypeScript enforces `en` implements every key of `fa`.
 * Page titles are derived from routes.ts so the registry stays the single
 * source of truth (Law 9-B).
 */

import { PAGES } from '../routes';

export type Lang = 'fa' | 'en';

export const LANGS: readonly Lang[] = ['fa', 'en'];

const fa = {
  'app.title': 'DropAgentX',
  'app.tagline': 'بازار، کیف پول و اقتصاد — داخل تلگرام',
  'app.stubNote': 'این صفحه در گام ۵ (UI کامل) ساخته می‌شود — منطق آن از ماژول زیر می‌آید:',
  'nav.more': 'بیشتر',
  'lang.switch': 'English',
  'group.core': 'هسته',
  'group.market': 'بازار',
  'group.wallet': 'کیف پول',
  'group.economy': 'اقتصاد',
  'group.growth': 'رشد',
  'group.seller': 'فروشنده',
  'group.account': 'حساب',
  ...Object.fromEntries(PAGES.map((p) => [`page.${p.id}`, p.fa])),
};

const en: Record<keyof typeof fa, string> = {
  'app.title': 'DropAgentX',
  'app.tagline': 'Market, wallet and economy — inside Telegram',
  'app.stubNote': 'This page is built in Step 5 (full UI) — its logic comes from:',
  'nav.more': 'More',
  'lang.switch': 'فارسی',
  'group.core': 'Core',
  'group.market': 'Market',
  'group.wallet': 'Wallet',
  'group.economy': 'Economy',
  'group.growth': 'Growth',
  'group.seller': 'Seller',
  'group.account': 'Account',
  ...Object.fromEntries(PAGES.map((p) => [`page.${p.id}`, p.en])),
};

const dicts: Record<Lang, Record<string, string>> = { fa, en };

let current: Lang = 'fa';
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  listeners.forEach((l) => l());
}

export function toggleLang(): void {
  setLang(current === 'fa' ? 'en' : 'fa');
}

/** React-friendly subscribe for useSyncExternalStore. */
export function subscribeLang(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function t(key: string): string {
  return dicts[current][key] ?? dicts.fa[key] ?? key;
}
