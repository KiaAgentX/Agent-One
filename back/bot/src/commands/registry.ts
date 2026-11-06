/**
 * Command Registry — the curated command surface of the unified bot (Law 10).
 * ─────────────────────────────────────────────────────────────────────────────
 * The 28 classic-line commands (AgentX/DropAgentX handlers) as ONE registry,
 * each with a standard identity card: fa/en description, access level,
 * category, linked Telegram-Mini-App page (front/webapp routes.ts) and the
 * lineage module that supplies its logic.
 *
 * status:
 *   'live'    — the v3 orchestrator already executes this command end-to-end.
 *   'evolved' — the name exists on both lines; the v3 semantics supersede the
 *               classic ones (documented per command).
 *   'bridge'  — not yet executed natively; the orchestrator replies with this
 *               identity card + a Mini-App deep link until its full logic is
 *               ported (RULEBOOK step 5). Nothing is silently unknown anymore.
 *
 * Telegram constraints honored: command 1–32 chars of [a-z0-9_],
 * description 1–256 chars (setMyCommands scopes built from the same registry).
 */

export type CommandAccess = 'all' | 'seller' | 'admin';

export type CommandCategory = 'core' | 'market' | 'wallet' | 'growth' | 'seller' | 'gov';

export type CommandStatus = 'live' | 'evolved' | 'bridge';

export interface CommandSpec {
  /** Command word, no slash. */
  readonly name: string;
  /** Persian description (default locale, RTL). */
  readonly fa: string;
  /** English description — parity twin of `fa`. */
  readonly en: string;
  readonly access: CommandAccess;
  readonly category: CommandCategory;
  /** Deep-link path inside the Telegram Mini App (front/webapp/src/routes.ts). */
  readonly webapp?: string;
  readonly status: CommandStatus;
  /** Which merged module supplies the logic (zero-loss trace, Law 0). */
  readonly lineage: string;
  /** Another registry command this one aliases (e.g. ref → referral). */
  readonly aliasOf?: string;
  /** Only for status 'evolved' — how the v3 semantics supersede the classic ones. */
  readonly note?: { readonly fa: string; readonly en: string };
}

export const CATEGORY_LABELS: Record<CommandCategory, { fa: string; en: string }> = {
  core: { fa: 'هسته', en: 'Core' },
  market: { fa: 'بازار', en: 'Market' },
  wallet: { fa: 'کیف پول', en: 'Wallet' },
  growth: { fa: 'رشد', en: 'Growth' },
  seller: { fa: 'فروشنده', en: 'Seller' },
  gov: { fa: 'حاکمیت', en: 'Governance' },
};

export const ACCESS_LABELS: Record<CommandAccess, { fa: string; en: string }> = {
  all: { fa: 'همه', en: 'everyone' },
  seller: { fa: 'فروشنده', en: 'sellers' },
  admin: { fa: 'مدیر', en: 'admins' },
};

export const COMMANDS: readonly CommandSpec[] = [
  // ── core (5) ─────────────────────────────────────────────────────
  {
    name: 'start', fa: 'شروع — خوش‌آمد، موجودی و منو', en: 'Start — welcome, balance and menu',
    access: 'all', category: 'core', webapp: '/home', status: 'live',
    lineage: 'v3 orchestrator (classic: start handler)',
  },
  {
    name: 'menu', fa: 'منوی کامل دستورها بر اساس دسته', en: 'Full command menu by category',
    access: 'all', category: 'core', webapp: '/home', status: 'bridge',
    lineage: 'classic: menu command — rendered from THIS registry',
  },
  {
    name: 'help', fa: 'راهنما', en: 'Help',
    access: 'all', category: 'core', webapp: '/help', status: 'live',
    lineage: 'v3 orchestrator (classic: help command)',
  },
  {
    name: 'lang', fa: 'تغییر زبان (fa/en)', en: 'Switch language (fa/en)',
    access: 'all', category: 'core', webapp: '/settings', status: 'live',
    lineage: 'v3 orchestrator (classic: lang command)',
  },
  {
    name: 'id', fa: 'شناسهٔ تلگرام و حساب تو', en: 'Your Telegram & account ids',
    access: 'all', category: 'core', webapp: '/profile', status: 'bridge',
    lineage: 'classic: id command (v3 twin: /whoami)',
  },

  // ── market (6) ───────────────────────────────────────────────────
  {
    name: 'market', fa: 'بازار — فهرست محصولات', en: 'Market — product listing',
    access: 'all', category: 'market', webapp: '/market', status: 'bridge',
    lineage: 'classic: market handler',
  },
  {
    name: 'addproduct', fa: 'افزودن محصول (ویزارد فروشنده)', en: 'Add a product (seller wizard)',
    access: 'seller', category: 'market', webapp: '/seller/new', status: 'bridge',
    lineage: 'classic: addproduct + wizard handlers',
  },
  {
    name: 'orders', fa: 'سفارش‌های من', en: 'My orders',
    access: 'all', category: 'market', webapp: '/orders', status: 'live',
    lineage: 'v3 orchestrator (classic: orders handler)',
  },
  {
    name: 'book', fa: 'رزرو یک محصول یا زمان', en: 'Book a product or slot',
    access: 'all', category: 'market', webapp: '/bookings', status: 'bridge',
    lineage: 'classic: bookings handler',
  },
  {
    name: 'bookings', fa: 'رزروهای من', en: 'My bookings',
    access: 'all', category: 'market', webapp: '/bookings', status: 'bridge',
    lineage: 'classic: bookings handler',
  },
  {
    name: 'cancel', fa: 'لغو سفارش یا اسکرو', en: 'Cancel an order or escrow',
    access: 'all', category: 'market', webapp: '/orders', status: 'evolved',
    lineage: 'v3 orchestrator escrow-cancel supersedes classic order-cancel',
    note: {
      fa: 'در خط v3، /cancel اسکرو را لغو می‌کند (جانشین لغو سفارش خط کلاسیک).',
      en: 'On the v3 line /cancel cancels an escrow (supersedes the classic order cancel).',
    },
  },

  // ── wallet (4) ───────────────────────────────────────────────────
  {
    name: 'wallet', fa: 'کیف پول — موجودی Đ', en: 'Wallet — Đ balance',
    access: 'all', category: 'wallet', webapp: '/wallet', status: 'bridge',
    lineage: 'classic: wallet handler (v3 twin: /balance)',
  },
  {
    name: 'transfer', fa: 'انتقال دینار به کاربر دیگر', en: 'Transfer dinar to another user',
    access: 'all', category: 'wallet', webapp: '/transfer', status: 'bridge',
    lineage: 'classic: wallet handler · transfer',
  },
  {
    name: 'withdraw', fa: 'برداشت به ستارهٔ تلگرام', en: 'Withdraw to Telegram Stars',
    access: 'all', category: 'wallet', webapp: '/withdraw', status: 'bridge',
    lineage: 'classic: wallet handler · withdraw',
  },
  {
    name: 'history', fa: 'تاریخچهٔ تراکنش‌ها', en: 'Transaction history',
    access: 'all', category: 'wallet', webapp: '/history', status: 'bridge',
    lineage: 'classic: history command',
  },

  // ── growth (4) ───────────────────────────────────────────────────
  {
    name: 'quests', fa: 'ماموریت‌ها و پاداش ضرب', en: 'Quests and mint rewards',
    access: 'all', category: 'growth', webapp: '/quests', status: 'bridge',
    lineage: 'classic: quests handler',
  },
  {
    name: 'leaderboard', fa: 'جدول امتیازات ملت', en: 'Nation leaderboard',
    access: 'all', category: 'growth', webapp: '/leaderboard', status: 'bridge',
    lineage: 'classic: leaderboard command',
  },
  {
    name: 'ref', fa: 'کد معرفی تو', en: 'Your referral code',
    access: 'all', category: 'growth', webapp: '/referral', status: 'bridge',
    lineage: 'classic: ref command', aliasOf: 'referral',
  },
  {
    name: 'referral', fa: 'معرفی دوستان و پاداش', en: 'Invite friends and earn',
    access: 'all', category: 'growth', webapp: '/referral', status: 'bridge',
    lineage: 'classic: referral command',
  },

  // ── seller (3) ───────────────────────────────────────────────────
  {
    name: 'sales', fa: 'فروش‌های من', en: 'My sales',
    access: 'seller', category: 'seller', webapp: '/sales', status: 'bridge',
    lineage: 'classic: sales handler',
  },
  {
    name: 'crm', fa: 'مدیریت مشتریان', en: 'Customer relationship manager',
    access: 'seller', category: 'seller', webapp: '/crm', status: 'bridge',
    lineage: 'classic: crm handler',
  },
  {
    name: 'lead', fa: 'ثبت و پیگیری سرنخ', en: 'Record and follow leads',
    access: 'seller', category: 'seller', webapp: '/crm', status: 'bridge',
    lineage: 'classic: lead command',
  },

  // ── governance (6) ───────────────────────────────────────────────
  {
    name: 'approvals', fa: 'صف تأیید (HITL)', en: 'Approval queue (HITL)',
    access: 'admin', category: 'gov', status: 'bridge',
    lineage: 'classic: owner.ts approvals (v3 twin: /pending)',
  },
  {
    name: 'panel', fa: 'پنل مدیریت', en: 'Admin panel',
    access: 'admin', category: 'gov', status: 'bridge',
    lineage: 'classic: panel command (v3 twin: dashboard HitlPage)',
  },
  {
    name: 'owner', fa: 'دستورهای مالک', en: 'Owner commands',
    access: 'admin', category: 'gov', status: 'bridge',
    lineage: 'classic: owner handler',
  },
  {
    name: 'broadcast', fa: 'پیام همگانی به کاربران', en: 'Broadcast to all users',
    access: 'admin', category: 'gov', webapp: '/notifications', status: 'bridge',
    lineage: 'classic: broadcast command',
  },
  {
    name: 'stats', fa: 'آمار بات و بازار', en: 'Bot and market statistics',
    access: 'admin', category: 'gov', status: 'bridge',
    lineage: 'classic: stats command',
  },
  {
    name: 'kill', fa: 'توقف اضطراری (fail-stop)', en: 'Emergency stop (fail-stop)',
    access: 'admin', category: 'gov', status: 'bridge',
    lineage: 'classic: kill command',
  },
] as const;

/** Exactly the 28 curated classic commands — asserted by tests. */
export const COMMAND_COUNT = 28;

export function findCommand(name: string): CommandSpec | undefined {
  const cmd = name.toLowerCase();
  return COMMANDS.find((c) => c.name === cmd);
}

export function commandsForAccess(isAdmin: boolean): readonly CommandSpec[] {
  return COMMANDS.filter((c) => (isAdmin ? true : c.access === 'all'));
}

// ── identity card & menu rendering (orchestrator consumes these) ────

export interface CardLines {
  readonly title: string;
  readonly meta: string;
  readonly lineage: string;
  readonly webapp?: string;
}

export function renderCard(spec: CommandSpec, locale: 'fa' | 'en'): CardLines {
  const cat = CATEGORY_LABELS[spec.category][locale];
  const acc = ACCESS_LABELS[spec.access][locale];
  const title = locale === 'fa' ? `/${spec.name} — ${spec.fa}` : `/${spec.name} — ${spec.en}`;
  const meta = locale === 'fa' ? `دسته: ${cat} · دسترسی: ${acc}` : `Category: ${cat} · Access: ${acc}`;
  const lineage = locale === 'fa' ? `منطق: ${spec.lineage}` : `Logic: ${spec.lineage}`;
  const note =
    spec.note === undefined ? undefined : locale === 'fa' ? `※ ${spec.note.fa}` : `※ ${spec.note.en}`;
  const alias = spec.aliasOf === undefined ? undefined : `↔ /${spec.aliasOf}`;
  const webapp =
    spec.webapp === undefined
      ? undefined
      : locale === 'fa'
        ? `صفحهٔ اپ تلگرام: ${spec.webapp}`
        : `Mini-App page: ${spec.webapp}`;
  return {
    title: [title, alias].filter(Boolean).join('  '),
    meta,
    lineage,
    webapp: [webapp, note].filter(Boolean).join('\n') || undefined,
  };
}

/** Categorized menu text — the curated surface in its best arrangement. */
export function renderMenu(isAdmin: boolean, locale: 'fa' | 'en'): string {
  const order: readonly CommandCategory[] = ['core', 'market', 'wallet', 'growth', 'seller', 'gov'];
  const header =
    locale === 'fa'
      ? `منوی دستورها (${COMMAND_COUNT} فرمان گلچین‌شده):\n`
      : `Command menu (${COMMAND_COUNT} curated commands):\n`;
  const body = order
    .map((cat) => {
      const list = commandsForAccess(isAdmin).filter((c) => c.category === cat);
      if (list.length === 0) return '';
      const label = CATEGORY_LABELS[cat][locale];
      const items = list.map((c) => `  /${c.name} — ${locale === 'fa' ? c.fa : c.en}`).join('\n');
      return `${label}:\n${items}`;
    })
    .filter((block) => block.length > 0)
    .join('\n\n');
  return header + body;
}

// ── setMyCommands builders (Telegram wire format) ───────────────────

export interface TelegramBotCommand {
  readonly command: string;
  readonly description: string;
}

export type CommandScope = 'default' | 'seller' | 'admin';

export function telegramCommandsFor(scope: CommandScope, locale: 'fa' | 'en'): TelegramBotCommand[] {
  const include = (a: CommandAccess): boolean =>
    scope === 'admin' ? true : scope === 'seller' ? a === 'all' || a === 'seller' : a === 'all';
  return COMMANDS.filter((c) => !c.aliasOf && include(c.access)).map((c) => ({
    command: c.name,
    description: (locale === 'fa' ? c.fa : c.en).slice(0, 256),
  }));
}
