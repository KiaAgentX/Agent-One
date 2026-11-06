/**
 * i18n — fa (default, RTL) and en. Flat dotted keys; TypeScript enforces
 * parity (`en` implements every key of `fa`). Content data (products, orders…)
 * is bilingual at the source ({fa, en} in demo.ts) — this dict is UI chrome.
 */

import { PAGES } from '../routes';

export type Lang = 'fa' | 'en';

export const LANGS: readonly Lang[] = ['fa', 'en'];

const fa = {
  'app.title': 'DropAgentX',
  'app.tagline': 'بازار، کیف پول و اقتصاد — داخل تلگرام',
  'lang.switch': 'English',

  // common
  'common.loading': 'در حال بارگذاری…',
  'common.error': 'خطا',
  'common.back': 'بازگشت',
  'common.search': 'جستجو…',
  'common.all': 'همه',
  'common.confirm': 'تأیید',
  'common.cancel': 'لغو',
  'common.submit': 'ثبت',
  'common.copy': 'کپی',
  'common.copied': 'کپی شد',
  'common.empty': 'چیزی اینجا نیست.',
  'common.amount': 'مبلغ (دینار)',
  'common.save': 'ذخیره',
  'common.of': 'از',

  // status vocabulary
  'status.paid': 'پرداخت‌شده',
  'status.escrow': 'در اطمینان',
  'status.delivered': 'تحویل‌شده',
  'status.released': 'آزادشده',
  'status.disputed': 'در اختلاف',
  'status.cancelled': 'لغوشده',
  'status.confirmed': 'تأییدشده',
  'status.pending': 'در انتظار',
  'status.awaiting_funds': 'در انتظار واریز',
  'status.funded': 'واریزشده',
  'status.in': 'ورودی',
  'status.out': 'خروجی',
  'status.lead': 'سرنخ',
  'status.customer': 'مشتری',
  'status.vip': 'ویژه',
  'status.unread': 'نخوانده',

  // categories
  'cat.digital': 'دیجیتال',
  'cat.service': 'خدمات',
  'cat.physical': 'فیزیکی',
  'cat.course': 'دوره',

  // home
  'home.greet': 'سلام',
  'home.balance': 'موجودی کیف پول',
  'home.quick': 'میان‌برها',
  'home.recent': 'آخرین تراکنش‌ها',
  'home.starReserve': 'رزرو ستاره',

  // onboarding
  'onb.step': 'گام',
  'onb.lang': 'زبان خود را انتخاب کن',
  'onb.profile': 'پروفایل تو',
  'onb.first': 'پیشنهاد اول',
  'onb.done': 'شروع کردم!',
  'onb.hintQuest': 'اولین کوئست را بردار و ۵۰۰ دینار ضرب کن.',

  // market
  'market.sales': 'فروش',
  'market.rating': 'امتیاز',

  // product / checkout / order
  'product.by': 'فروشنده',
  'product.buySecure': 'خرید با اطمینان',
  'product.direct': 'پرداخت مستقیم (بدون اسکرو)',
  'product.qty': 'تعداد',
  'checkout.summary': 'خلاصهٔ سفارش',
  'checkout.escrowNote': 'پول تا تأیید تحویل در خزانه قفل می‌شود (مادهٔ ۳).',
  'checkout.pay': 'پرداخت به اطمینان',
  'checkout.success': 'سفارش ساخته شد!',
  'order.timeline': 'مسیر سفارش',
  'order.taxSplit': 'تقسیم مالیات (مادهٔ ۳ و ۴)',
  'order.treasury': 'سهم خزانه',
  'order.sellerShare': 'سهم فروشنده',
  'order.confirm': 'تحویل را تأیید می‌کنم',
  'order.dispute': 'ثبت اختلاف',
  'order.cancel': 'لغو سفارش',

  // escrow & bookings
  'escrow.how': 'اطمینان چطور کار می‌کند؟',
  'escrow.howBody': '۱) خریدار واریز می‌کند ۲) فروشنده تحویل می‌دهد ۳) خریدار تأیید می‌کند و پول آزاد می‌شود.',
  'escrow.active': 'اطمینان‌های من',
  'bookings.upcoming': 'پیش‌رو',
  'bookings.past': 'گذشته',
  'booking.when': 'زمان',
  'booking.provider': 'ارائه‌دهنده',

  // wallet
  'wallet.stars': 'ستارهٔ تلگرام',
  'wallet.actions': 'عملیات',
  'deposit.packages': 'بسته‌های ستاره',
  'deposit.custom': 'مبلغ دلخواه (دینار)',
  'deposit.rate': 'هر ۱۰٬۰۰۰ دینار = ۱ ستاره',
  'withdraw.starsNote': 'برداشت به ستارهٔ تلگرام — نرخ ثابت مادهٔ ۲.',
  'transfer.to': 'به (آیدی یا شناسه)',
  'transfer.notePh': 'یادداشت (اختیاری)',
  'transfer.hitlWarn': '≥ ۵۰٬۰۰۰ دینار نیازمند تأیید انسانی است (مادهٔ ۹).',

  // economy & nation
  'eco.supply': 'عرضهٔ دینار',
  'eco.citizens': 'شهروندان',
  'eco.purchases': 'خریدها',
  'eco.products': 'محصولات',
  'eco.ledger': 'سطرهای دفتر',
  'eco.stars': 'رزرو ستاره',
  'eco.tax': 'نرخ مالیات',
  'nation.articles': '۱۰ مادهٔ منشور',
  'nation.genesis': 'حسابرسی میراث (شکاف −۶۳ دینار)',
  'nation.itemized': 'آیتم‌شده ۱۰۰٪:',
  'nation.verify': 'ناوردای مقدس (مادهٔ ۷)',
  'nation.holds': 'برقرار است',
  'nation.broken': 'شکسته — حسابرسی لازم',

  // growth
  'quests.reward': 'پاداش',
  'quests.cap': 'سقف ضرب روزانه: کوئست ۱۰٬۰۰۰ · معرفی ۵٬۰۰۰ (مادهٔ ۸)',
  'quests.expires': 'مهلت',
  'leaderboard.points': 'امتیاز',
  'leaderboard.you': 'رتبهٔ تو',
  'ref.code': 'کد معرفی تو',
  'ref.invited': 'دعوت‌شده',
  'ref.confirmed': 'تأییدشده',
  'ref.earned': 'درآمد از معرفی',
  'ref.link': 'لینک دعوت',

  // seller
  'sales.revenue': 'درآمد ۳۰ روز',
  'sales.orders': 'سفارش‌ها',
  'sales.avg': 'میانگین سفارش',
  'sales.top': 'محصول برتر',
  'seller.products': 'محصولات من',
  'seller.add': 'افزودن محصول',
  'add.title': 'نام محصول',
  'add.category': 'دسته',
  'add.desc': 'توضیحات',
  'add.invalidPrice': 'قیمت باید عدد صحیح مثبت باشد (قانون پول).',
  'add.created': 'محصول ساخته شد',
  'crm.tag': 'برچسب',
  'crm.orders': 'سفارش‌ها',
  'crm.spent': 'مجموع خرید',

  // core pages
  'notif.markAll': 'خواندن همه',
  'help.faq': 'پرسش‌های پرتکرار',
  'help.bot': 'راه سریع: فرمان‌های بات',
  'help.botBody': 'منوی کامل: /menu · راهنما: /help · زبان: /lang',
  'charter.source': 'منبع قانون',
  'profile.tgId': 'شناسهٔ تلگرام',
  'profile.account': 'حساب دینار',
  'profile.stats': 'آمار تو',
  'profile.orders': 'سفارش‌ها',
  'settings.language': 'زبان',
  'settings.about': 'درباره',
  'settings.version': 'نسخه',

  ...Object.fromEntries(PAGES.map((p) => [`page.${p.id}`, p.fa])),
};

const en: Record<keyof typeof fa, string> = {
  'app.title': 'DropAgentX',
  'app.tagline': 'Market, wallet and economy — inside Telegram',
  'lang.switch': 'فارسی',

  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.back': 'Back',
  'common.search': 'Search…',
  'common.all': 'All',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.submit': 'Submit',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.empty': 'Nothing here yet.',
  'common.amount': 'Amount (dinar)',
  'common.save': 'Save',
  'common.of': 'of',

  'status.paid': 'Paid',
  'status.escrow': 'In escrow',
  'status.delivered': 'Delivered',
  'status.released': 'Released',
  'status.disputed': 'Disputed',
  'status.cancelled': 'Cancelled',
  'status.confirmed': 'Confirmed',
  'status.pending': 'Pending',
  'status.awaiting_funds': 'Awaiting funds',
  'status.funded': 'Funded',
  'status.in': 'In',
  'status.out': 'Out',
  'status.lead': 'Lead',
  'status.customer': 'Customer',
  'status.vip': 'VIP',
  'status.unread': 'Unread',

  'cat.digital': 'Digital',
  'cat.service': 'Service',
  'cat.physical': 'Physical',
  'cat.course': 'Course',

  'home.greet': 'Hi',
  'home.balance': 'Wallet balance',
  'home.quick': 'Quick actions',
  'home.recent': 'Recent transactions',
  'home.starReserve': 'Stars reserve',

  'onb.step': 'Step',
  'onb.lang': 'Choose your language',
  'onb.profile': 'Your profile',
  'onb.first': 'First suggestion',
  'onb.done': "Let's go!",
  'onb.hintQuest': 'Grab your first quest and mint 500 dinar.',

  'market.sales': 'sales',
  'market.rating': 'rating',

  'product.by': 'Seller',
  'product.buySecure': 'Buy with escrow',
  'product.direct': 'Direct payment (no escrow)',
  'product.qty': 'Quantity',
  'checkout.summary': 'Order summary',
  'checkout.escrowNote': 'Funds stay in treasury until delivery is confirmed (Article 3).',
  'checkout.pay': 'Pay into escrow',
  'checkout.success': 'Order created!',
  'order.timeline': 'Order journey',
  'order.taxSplit': 'Tax split (Articles 3 & 4)',
  'order.treasury': 'Treasury share',
  'order.sellerShare': 'Seller share',
  'order.confirm': 'I confirm delivery',
  'order.dispute': 'Open dispute',
  'order.cancel': 'Cancel order',

  'escrow.how': 'How escrow works',
  'escrow.howBody': '1) buyer funds 2) seller delivers 3) buyer confirms and funds release.',
  'escrow.active': 'My escrows',
  'bookings.upcoming': 'Upcoming',
  'bookings.past': 'Past',
  'booking.when': 'When',
  'booking.provider': 'Provider',

  'wallet.stars': 'Telegram Stars',
  'wallet.actions': 'Actions',
  'deposit.packages': 'Stars packages',
  'deposit.custom': 'Custom amount (dinar)',
  'deposit.rate': 'Every 10,000 dinar = 1 Star',
  'withdraw.starsNote': 'Withdrawal to Telegram Stars — fixed Article-2 rate.',
  'transfer.to': 'To (username or id)',
  'transfer.notePh': 'Note (optional)',
  'transfer.hitlWarn': '≥ 50,000 dinar requires human approval (Article 9).',

  'eco.supply': 'Dinar supply',
  'eco.citizens': 'Citizens',
  'eco.purchases': 'Purchases',
  'eco.products': 'Products',
  'eco.ledger': 'Ledger rows',
  'eco.stars': 'Stars reserve',
  'eco.tax': 'Tax rate',
  'nation.articles': '10 charter articles',
  'nation.genesis': 'Genesis audit (−63 Đ gap)',
  'nation.itemized': '100% itemized:',
  'nation.verify': 'Sacred invariant (Article 7)',
  'nation.holds': 'Holds',
  'nation.broken': 'Broken — audit required',

  'quests.reward': 'Reward',
  'quests.cap': 'Daily mint caps: quests 10,000 · referrals 5,000 (Article 8)',
  'quests.expires': 'Expires',
  'leaderboard.points': 'points',
  'leaderboard.you': 'Your rank',
  'ref.code': 'Your referral code',
  'ref.invited': 'Invited',
  'ref.confirmed': 'Confirmed',
  'ref.earned': 'Referral earnings',
  'ref.link': 'Invite link',

  'sales.revenue': '30-day revenue',
  'sales.orders': 'Orders',
  'sales.avg': 'Average order',
  'sales.top': 'Top product',
  'seller.products': 'My products',
  'seller.add': 'Add product',
  'add.title': 'Product name',
  'add.category': 'Category',
  'add.desc': 'Description',
  'add.invalidPrice': 'Price must be a positive integer (money law).',
  'add.created': 'Product created',
  'crm.tag': 'Tag',
  'crm.orders': 'Orders',
  'crm.spent': 'Total spent',

  'notif.markAll': 'Mark all read',
  'help.faq': 'FAQ',
  'help.bot': 'Fast path: bot commands',
  'help.botBody': 'Full menu: /menu · Help: /help · Language: /lang',
  'charter.source': 'Source of law',
  'profile.tgId': 'Telegram id',
  'profile.account': 'Dinar account',
  'profile.stats': 'Your stats',
  'profile.orders': 'Orders',
  'settings.language': 'Language',
  'settings.about': 'About',
  'settings.version': 'Version',

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

export function subscribeLang(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function t(key: string): string {
  return dicts[current][key] ?? dicts.fa[key] ?? key;
}
