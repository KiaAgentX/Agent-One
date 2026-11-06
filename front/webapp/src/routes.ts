/**
 * routes.ts — the single source of truth for the Telegram Mini App.
 * 30 pages, mapped 1:1 to RULEBOOK Law 9 (Level-B UI). Every page declares
 * which lineage module supplies its logic, so the zero-loss audit (Step 6)
 * can verify that no capability of the 8 merged repos is left without a UI.
 */

export type PageGroup =
  | 'core'
  | 'market'
  | 'wallet'
  | 'economy'
  | 'growth'
  | 'seller'
  | 'account';

export interface PageDef {
  /** Stable id — used as i18n key suffix and test id. */
  id: string;
  /** Hash route; `:param` segments allowed. */
  path: string;
  group: PageGroup;
  /** Persian title (default language, RTL). */
  fa: string;
  /** English title — parity with `fa` enforced by i18n parity test. */
  en: string;
  /** Which merged module supplies this page's logic (zero-loss trace). */
  source: string;
  /** Curated bot command that deep-links here (RULEBOOK Law 10). */
  command?: string;
  /** Shown on the bottom navigation bar (max 5, mobile-first). */
  tab?: boolean;
}

export const PAGES: readonly PageDef[] = [
  // ── core ─────────────────────────────────────────────────────────
  { id: 'home', path: '/home', group: 'core', fa: 'خانه', en: 'Home', source: 'back/bot orchestrator', tab: true },
  { id: 'onboarding', path: '/onboarding', group: 'core', fa: 'شروع', en: 'Onboarding', source: 'start handler (classic line)' },
  { id: 'notifications', path: '/notifications', group: 'core', fa: 'اعلان‌ها', en: 'Notifications', source: 'broadcast command' },
  { id: 'help', path: '/help', group: 'core', fa: 'پشتیبانی', en: 'Help & support', source: 'help command + crm handler' },
  { id: 'charter', path: '/charter', group: 'core', fa: 'منشور', en: 'Charter & about', source: 'AGI-main charter 2.1.0' },

  // ── market ───────────────────────────────────────────────────────
  { id: 'market', path: '/market', group: 'market', fa: 'بازار', en: 'Market', source: 'market handler', command: '/market', tab: true },
  { id: 'product', path: '/product/:id', group: 'market', fa: 'محصول', en: 'Product', source: 'market handler + wizard' },
  { id: 'checkout', path: '/checkout', group: 'market', fa: 'پرداخت', en: 'Checkout', source: 'wizard handler + contracts/escrows' },
  { id: 'orders', path: '/orders', group: 'market', fa: 'سفارش‌ها', en: 'Orders', source: 'orders handler', command: '/orders' },
  { id: 'order', path: '/order/:id', group: 'market', fa: 'جزئیات سفارش', en: 'Order detail', source: 'orders handler' },
  { id: 'escrow', path: '/escrow', group: 'market', fa: 'اطمینان', en: 'Escrow', source: 'contracts/escrows + EscrowsPage' },
  { id: 'bookings', path: '/bookings', group: 'market', fa: 'رزروها', en: 'Bookings', source: 'bookings handler', command: '/bookings' },
  { id: 'booking', path: '/booking/:id', group: 'market', fa: 'جزئیات رزرو', en: 'Booking detail', source: 'bookings handler' },

  // ── wallet ───────────────────────────────────────────────────────
  { id: 'wallet', path: '/wallet', group: 'wallet', fa: 'کیف پول', en: 'Wallet', source: 'wallet handler + contracts/wallet', command: '/wallet', tab: true },
  { id: 'deposit', path: '/deposit', group: 'wallet', fa: 'واریز', en: 'Deposit', source: 'wallet handler' },
  { id: 'withdraw', path: '/withdraw', group: 'wallet', fa: 'برداشت', en: 'Withdraw', source: 'wallet handler', command: '/withdraw' },
  { id: 'transfer', path: '/transfer', group: 'wallet', fa: 'انتقال', en: 'Transfer', source: 'wallet handler', command: '/transfer' },
  { id: 'history', path: '/history', group: 'wallet', fa: 'تاریخچه', en: 'Transactions', source: 'history command' },

  // ── economy ──────────────────────────────────────────────────────
  { id: 'economy', path: '/economy', group: 'economy', fa: 'اقتصاد', en: 'Economy', source: 'packages/nation + economy.html (AgentX)' },
  { id: 'nation', path: '/nation', group: 'economy', fa: 'ملت', en: 'Nation', source: 'packages/nation + nation.html (AgentX)' },

  // ── growth ───────────────────────────────────────────────────────
  { id: 'quests', path: '/quests', group: 'growth', fa: 'ماموریت‌ها', en: 'Quests', source: 'quests handler', command: '/quests' },
  { id: 'quest', path: '/quest/:id', group: 'growth', fa: 'جزئیات ماموریت', en: 'Quest detail', source: 'quests handler' },
  { id: 'leaderboard', path: '/leaderboard', group: 'growth', fa: 'لیدربورد', en: 'Leaderboard', source: 'leaderboard command' },
  { id: 'referral', path: '/referral', group: 'growth', fa: 'معرفی دوستان', en: 'Referral', source: 'ref/referral command' },

  // ── seller ───────────────────────────────────────────────────────
  { id: 'sales', path: '/sales', group: 'seller', fa: 'فروش من', en: 'My sales', source: 'sales handler', command: '/sales' },
  { id: 'seller', path: '/seller', group: 'seller', fa: 'پنل فروشنده', en: 'Seller dashboard', source: 'sales handler + addproduct' },
  { id: 'addproduct', path: '/seller/new', group: 'seller', fa: 'افزودن محصول', en: 'Add product', source: 'addproduct command + wizard' },
  { id: 'crm', path: '/crm', group: 'seller', fa: 'مشتریان', en: 'CRM', source: 'crm handler', command: '/crm' },

  // ── account ──────────────────────────────────────────────────────
  { id: 'profile', path: '/profile', group: 'account', fa: 'پروفایل', en: 'Profile', source: 'identity.ts', tab: true },
  { id: 'settings', path: '/settings', group: 'account', fa: 'تنظیمات', en: 'Settings', source: 'SettingsPage (dashboard)' },
] as const;

export type PageId = (typeof PAGES)[number]['id'];

export const TAB_PAGES: readonly PageDef[] = PAGES.filter((p) => p.tab);

export const GROUPS: readonly PageGroup[] = [
  'core',
  'market',
  'wallet',
  'economy',
  'growth',
  'seller',
  'account',
];

export function pageById(id: string): PageDef | undefined {
  return PAGES.find((p) => p.id === id);
}

/** Match a hash like `/product/42` or `/checkout?product=p1&qty=2`. */
export function matchRoute(
  hash: string,
): { page: PageDef; params: Record<string, string> } | undefined {
  const clean = hash.replace(/^#/, '') || '/home';
  const [pathPart = '', queryPart] = clean.split('?');
  const segs = pathPart.split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart ?? '');
  for (const page of PAGES) {
    const pat = page.path.split('/').filter(Boolean);
    if (pat.length !== segs.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < pat.length; i++) {
      const patSeg = pat[i]!;
      const seg = segs[i]!;
      if (patSeg.startsWith(':')) params[patSeg.slice(1)] = decodeURIComponent(seg);
      else if (patSeg !== seg) { ok = false; break; }
    }
    if (ok) {
      for (const [k, v] of query.entries()) params[k] = v;
      return { page, params };
    }
  }
  return undefined;
}
