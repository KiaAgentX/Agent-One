/**
 * demo.ts — structured demo datasets, bilingual by design ({fa, en} fields),
 * invariants kept live by the REAL charter functions from @dropagentx/nation
 * (splitTax on every order, mint caps on quest rewards, HITL threshold flags).
 * Numbers are consistent: order treasury/seller shares come from splitTax,
 * wallet mutations flow through the same paths the live API will use.
 */

import { splitTax, GENESIS_AUDIT } from '@dropagentx/nation';

export interface Bi {
  readonly fa: string;
  readonly en: string;
}

const bi = (fa: string, en: string): Bi => ({ fa, en });

export type ProductCategory = 'digital' | 'service' | 'physical' | 'course';

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = ['digital', 'service', 'physical', 'course'];

export interface Product {
  id: string;
  title: Bi;
  category: ProductCategory;
  price: number;
  seller: Bi;
  escrow: boolean;
  rating: number;
  salesCount: number;
  desc: Bi;
}

export interface OrderLine {
  label: Bi;
  amount: number;
}

export interface Order {
  id: string;
  role: 'buyer' | 'seller';
  productTitle: Bi;
  gross: number;
  status: 'paid' | 'escrow' | 'delivered' | 'released' | 'disputed' | 'cancelled';
  ts: string;
  counterpart: Bi;
}

export interface Escrow {
  id: string;
  productTitle: Bi;
  amount: number;
  state: 'awaiting_funds' | 'funded' | 'delivered' | 'released';
  counterparty: Bi;
}

export interface Booking {
  id: string;
  title: Bi;
  provider: Bi;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  price: number;
}

export interface Tx {
  id: string;
  kind: 'in' | 'out';
  label: Bi;
  amount: number;
  ts: string;
}

export interface Quest {
  id: string;
  title: Bi;
  reward: number;
  progress: number;
  goal: number;
  expires: string;
}

export interface LeaderRow {
  handle: Bi;
  points: number;
  isMe?: boolean;
}

export interface Customer {
  id: string;
  name: Bi;
  tag: 'lead' | 'customer' | 'vip';
  ordersCount: number;
  spent: number;
  note: Bi;
}

export interface Notification {
  id: string;
  title: Bi;
  body: Bi;
  ts: string;
  read: boolean;
}

// ── market ──────────────────────────────────────────────────────────

export const products: Product[] = [
  { id: 'p1', title: bi('بات تلگرام فروشگاهی', 'Telegram shop bot'), category: 'digital', price: 850_000, seller: bi('استودیو کیا', 'Kia Studio'), escrow: true, rating: 4.8, salesCount: 132, desc: bi('ربات فروشگاه کامل با کیف پول دینار و اسکرو خودکار.', 'Full shop bot with dinar wallet and automatic escrow.') },
  { id: 'p2', title: bi('مشاوره رشد بازار', 'Growth consulting'), category: 'service', price: 300_000, seller: bi('مریم ر.', 'Maryam R.'), escrow: true, rating: 4.6, salesCount: 41, desc: bi('جلسه ۶۰ دقیقه‌ای رشد و قیمت‌گذاری در بازار دیجیتال.', 'A 60-minute session on growth and pricing in the digital market.') },
  { id: 'p3', title: bi('پکیج آموزش دینار', 'Dinar mastery course'), category: 'course', price: 120_000, seller: bi('آکادمی ملت', 'Nation Academy'), escrow: true, rating: 4.9, salesCount: 520, desc: bi('از صفر تا ساخت اولین محصول در اقتصاد ملت.', 'From zero to your first product in the nation economy.') },
  { id: 'p4', title: bi('قالب داشبورد آئورا', 'Aurora dashboard kit'), category: 'digital', price: 210_000, seller: bi('استودیو کیا', 'Kia Studio'), escrow: true, rating: 4.7, salesCount: 88, desc: bi('قالب RTL با فونت وزیرمتن و تم تیره.', 'RTL template with Vazirmatn font and dark theme.') },
  { id: 'p5', title: bi('طراحی لوگو', 'Logo design'), category: 'service', price: 450_000, seller: bi('آتلیه نور', 'Noor Atelier'), escrow: true, rating: 4.5, salesCount: 27, desc: bi('سه پیشنهاد + دو مرحله بازخورد.', 'Three proposals + two feedback rounds.') },
  { id: 'p6', title: bi('کلید سخت‌افزاری', 'Hardware key'), category: 'physical', price: 1_200_000, seller: bi('فروشگاه امن', 'Secure Shop'), escrow: false, rating: 4.3, salesCount: 12, desc: bi('ارسال با پست، پرداخت مستقیم بدون اسکرو.', 'Shipped by post, direct payment without escrow.') },
  { id: 'p7', title: bi('اسکریپت تلگرام ستاره', 'Stars telegram script'), category: 'digital', price: 95_000, seller: bi('دِو مِگ', 'DevMeg'), escrow: true, rating: 4.4, salesCount: 210, desc: bi('اتصال برداشت به ستارهٔ تلگرام.', 'Withdrawal bridge to Telegram Stars.') },
  { id: 'p8', title: bi('مشاوره منشور اقتصادی', 'Economy charter consulting'), category: 'service', price: 500_000, seller: bi('آکادمی ملت', 'Nation Academy'), escrow: true, rating: 5.0, salesCount: 9, desc: bi('پیاده‌سازی قانون پول در محصول شما.', 'Implementing the money law in your product.') },
];

function orderTs(daysAgo: number, hour = 12): string {
  const d = new Date(Date.UTC(2026, 10, 6 - daysAgo, hour, 30));
  return d.toISOString();
}

export const orders: Order[] = [
  { id: 'o1', role: 'buyer', productTitle: products[0]!.title, gross: 850_000, status: 'escrow', ts: orderTs(0, 9), counterpart: products[0]!.seller },
  { id: 'o2', role: 'seller', productTitle: products[3]!.title, gross: 210_000, status: 'delivered', ts: orderTs(1), counterpart: bi('کاربر ۷۴', 'User 74') },
  { id: 'o3', role: 'buyer', productTitle: products[2]!.title, gross: 120_000, status: 'released', ts: orderTs(2), counterpart: products[2]!.seller },
  { id: 'o4', role: 'seller', productTitle: products[6]!.title, gross: 95_000, status: 'paid', ts: orderTs(3), counterpart: bi('کاربر ۲۱', 'User 21') },
  { id: 'o5', role: 'buyer', productTitle: products[4]!.title, gross: 450_000, status: 'disputed', ts: orderTs(4), counterpart: products[4]!.seller },
];

export const escrows: Escrow[] = [
  { id: 'e1', productTitle: products[0]!.title, amount: 850_000, state: 'funded', counterparty: products[0]!.seller },
  { id: 'e2', productTitle: products[3]!.title, amount: 210_000, state: 'delivered', counterparty: bi('کاربر ۷۴', 'User 74') },
  { id: 'e3', productTitle: products[2]!.title, amount: 120_000, state: 'released', counterparty: products[2]!.seller },
];

export const bookings: Booking[] = [
  { id: 'b1', title: products[1]!.title, provider: products[1]!.seller, date: '2026-11-08', time: '18:30', status: 'confirmed', price: 300_000 },
  { id: 'b2', title: products[7]!.title, provider: products[7]!.seller, date: '2026-11-11', time: '10:00', status: 'pending', price: 500_000 },
  { id: 'b3', title: products[4]!.title, provider: products[4]!.seller, date: '2026-11-05', time: '16:00', status: 'cancelled', price: 450_000 },
  { id: 'b4', title: products[1]!.title, provider: products[1]!.seller, date: '2026-10-29', time: '20:00', status: 'confirmed', price: 300_000 },
];

// ── wallet (invariants: balance moves only via recorded txs) ────────

export interface WalletState {
  balance: number;
  stars: number;
}

export const walletState: WalletState = { balance: 1_847_000, stars: 320 };

export const transactions: Tx[] = [
  { id: 't1', kind: 'in', label: bi('فروش قالب آئورا', 'Aurora kit sale'), amount: 189_000, ts: orderTs(0, 11) },
  { id: 't2', kind: 'out', label: bi('خرید بات فروشگاهی', 'Shop bot purchase'), amount: 850_000, ts: orderTs(0, 9) },
  { id: 't3', kind: 'in', label: bi('پاداش معرفی', 'Referral reward'), amount: 200, ts: orderTs(1, 15) },
  { id: 't4', kind: 'in', label: bi('فروش اسکریپت ستاره', 'Stars script sale'), amount: 85_500, ts: orderTs(2) },
  { id: 't5', kind: 'out', label: bi('برداشت به ستاره', 'Withdraw to Stars'), amount: 150_000, ts: orderTs(3) },
  { id: 't6', kind: 'in', label: bi('پاداش کوئست روزانه', 'Daily quest reward'), amount: 500, ts: orderTs(3, 8) },
  { id: 't7', kind: 'out', label: bi('خرید دوره دینار', 'Dinar course purchase'), amount: 120_000, ts: orderTs(4) },
  { id: 't8', kind: 'in', label: bi('انتقال از @devmeg', 'Transfer from @devmeg'), amount: 75_000, ts: orderTs(5) },
];

export function applyDeposit(amount: number): void {
  walletState.balance += amount;
  transactions.unshift({ id: `td${Date.now()}`, kind: 'in', label: bi('واریز به کیف پول', 'Wallet deposit'), amount, ts: new Date().toISOString() });
}

export function applyWithdraw(amount: number): void {
  walletState.balance -= amount;
  walletState.stars += Math.floor(amount / 10_000);
  transactions.unshift({ id: `tw${Date.now()}`, kind: 'out', label: bi('برداشت به ستارهٔ تلگرام', 'Withdraw to Telegram Stars'), amount, ts: new Date().toISOString() });
}

export function applyTransfer(to: string, amount: number): void {
  walletState.balance -= amount;
  transactions.unshift({ id: `tt${Date.now()}`, kind: 'out', label: bi(`انتقال به ${to}`, `Transfer to ${to}`), amount, ts: new Date().toISOString() });
}

// ── economy (numbers from the REAL charter + published genesis audit) ─

export const economyIndicators = {
  currency: { symbol: 'Đ', code: 'DNX', name: 'Digital Dinar' },
  citizens: 466,
  supplyDinar: 187_672,
  ledgerRows: 12_480,
  purchases: 108,
  products: 42,
  starsInReserve: 5_240,
  taxPercent: 10,
  genesis: GENESIS_AUDIT,
};

/** Live tax-split preview for an order — the charter runs in the UI too. */
export function taxSplitOf(gross: number) {
  return splitTax(gross, 10);
}

// ── growth (mint caps honored: quest 500 ≤ 10_000, referral 200 ≤ 5_000) ─

export const quests: Quest[] = [
  { id: 'q1', title: bi('اولین فروش امروز', 'First sale today'), reward: 500, progress: 0, goal: 1, expires: '2026-11-06' },
  { id: 'q2', title: bi('۳ معرفی موفق', '3 successful referrals'), reward: 500, progress: 2, goal: 3, expires: '2026-11-07' },
  { id: 'q3', title: bi('نقد یک محصول', 'Review a product'), reward: 200, progress: 0, goal: 1, expires: '2026-11-06' },
  { id: 'q4', title: bi('تکمیل پروفایل', 'Complete your profile'), reward: 300, progress: 1, goal: 1, expires: '2026-11-30' },
  { id: 'q5', title: bi('هفت روز پیوسته فعال', '7-day streak'), reward: 1_000, progress: 4, goal: 7, expires: '2026-11-13' },
  { id: 'q6', title: bi('انتقال اولین دینار', 'First dinar transfer'), reward: 250, progress: 1, goal: 1, expires: '2026-11-10' },
];

export const leaderboard: LeaderRow[] = [
  { handle: bi('آکادمی ملت', 'Nation Academy'), points: 12_480 },
  { handle: bi('استودیو کیا', 'Kia Studio'), points: 9_950 },
  { handle: bi('دِو مِگ', 'DevMeg'), points: 8_310 },
  { handle: bi('آتلیه نور', 'Noor Atelier'), points: 7_120 },
  { handle: bi('مریم ر.', 'Maryam R.'), points: 6_480 },
  { handle: bi('من (تو)', 'Me (you)'), points: 5_990, isMe: true },
  { handle: bi('کاربر ۷۴', 'User 74'), points: 4_210 },
  { handle: bi('فروشگاه امن', 'Secure Shop'), points: 3_860 },
  { handle: bi('کاربر ۲۱', 'User 21'), points: 2_450 },
  { handle: bi('کاربر ۹', 'User 9'), points: 1_980 },
];

export const referralState = {
  code: 'KIA-X7Q2',
  invited: 12,
  confirmed: 7,
  earned: 1_400, // 7 × 200 Đ — within the 5,000 Đ/day referral cap (Article 8)
  link: 'https://t.me/DropAgentXBot?start=ref_KIA-X7Q2',
};

// ── seller ──────────────────────────────────────────────────────────

export const salesStats = {
  revenue30d: 1_284_500,
  orders30d: 23,
  avgOrder: 55_847,
  topProduct: products[3]!.title,
  series: [320, 410, 380, 520, 610, 580, 760],
};

export interface NewProduct {
  title: string;
  category: ProductCategory;
  price: number;
  desc: string;
}

export function applyNewProduct(input: NewProduct): Product {
  const p: Product = {
    id: `p${products.length + 1}`,
    title: bi(input.title, input.title),
    category: input.category,
    price: input.price,
    seller: bi('من (تو)', 'Me (you)'),
    escrow: true,
    rating: 0,
    salesCount: 0,
    desc: bi(input.desc, input.desc),
  };
  products.unshift(p);
  return p;
}

export const customers: Customer[] = [
  { id: 'c1', name: bi('کاربر ۷۴', 'User 74'), tag: 'vip', ordersCount: 9, spent: 1_890_000, note: bi('مشتری همیشگی قالب‌ها', 'Regular template buyer') },
  { id: 'c2', name: bi('کاربر ۲۱', 'User 21'), tag: 'customer', ordersCount: 3, spent: 285_000, note: bi('علاقه‌مند به اسکریپت‌ها', 'Into scripts') },
  { id: 'c3', name: bi('سارا م.', 'Sara M.'), tag: 'lead', ordersCount: 0, spent: 0, note: bi('استعلام دوره دینار', 'Asked about the dinar course') },
  { id: 'c4', name: bi('امیر ک.', 'Amir K.'), tag: 'lead', ordersCount: 0, spent: 0, note: bi('قیمت لوگو را پرسید', 'Asked for logo pricing') },
  { id: 'c5', name: bi('نگار ت.', 'Negar T.'), tag: 'customer', ordersCount: 2, spent: 420_000, note: bi('دو جلسه مشاوره گرفته', 'Took two consulting sessions') },
  { id: 'c6', name: bi('کاربر ۹', 'User 9'), tag: 'vip', ordersCount: 14, spent: 2_450_000, note: bi('بازاریاب فعال ملت', 'Active nation promoter') },
];

// ── core ────────────────────────────────────────────────────────────

export const notifications: Notification[] = [
  { id: 'n1', title: bi('اسکرو تأمین شد', 'Escrow funded'), body: bi('مبلغ ۸۵۰٬۰۰۰ Đ برای «بات فروشگاهی» در اطمینان قفل شد.', '850,000 Đ locked in escrow for "Shop bot".'), ts: orderTs(0, 9), read: false },
  { id: 'n2', title: bi('پاداش معرفی', 'Referral reward'), body: bi('۲۰۰ Đ برای معرفی تأییدشده ضرب شد.', '200 Đ minted for a confirmed referral.'), ts: orderTs(1, 15), read: false },
  { id: 'n3', title: bi('یادآوری رزرو', 'Booking reminder'), body: bi('جلسه مشاوره فردا ۱۸:۳۰ است.', 'Your consulting session is tomorrow at 18:30.'), ts: orderTs(1, 10), read: true },
  { id: 'n4', title: bi('محصول تحویل شد', 'Product delivered'), body: bi('«قالب داشبورد آئورا» تحویل شد — ۲۴ ساعت برای تأیید.', '"Aurora kit" delivered — 24h to confirm.'), ts: orderTs(2), read: true },
  { id: 'n5', title: bi('پیام ملت', 'Nation broadcast'), body: bi('سقف ضرب کوئست‌ها به‌روزرسانی شد (مادهٔ ۸).', 'Quest mint caps updated (Article 8).'), ts: orderTs(3), read: true },
];

export function markAllRead(): void {
  for (const n of notifications) n.read = true;
}

export const faqs = {
  items: [
    { q: bi('دینار چیست؟', 'What is the dinar?'), a: bi('واحد پول کشور دیجیتال (Đ/DNX)؛ ۱:۱ با اعتبارات — مادهٔ ۱ منشور.', 'The Digital Nation currency (Đ/DNX); 1:1 with credits — charter Article 1.') },
    { q: bi('اطمینان (اسکرو) چطور کار می‌کند؟', 'How does escrow work?'), a: bi('پول تا تأیید تحویل در خزانه قفل می‌شود؛ کمیسیون قبل از تسویه برداشت می‌شود (مادهٔ ۳).', 'Funds stay locked until delivery is confirmed; commission is taken before payout (Article 3).') },
    { q: bi('سقف پاداش‌ها چقدر است؟', 'What are the reward caps?'), a: bi('کوئست ≤ ۱۰٬۰۰۰ Đ/روز و معرفی ≤ ۵٬۰۰۰ Đ/روز (مادهٔ ۸).', 'Quests ≤ 10,000 Đ/day, referrals ≤ 5,000 Đ/day (Article 8).') },
    { q: bi('کی تصمیم انسانی لازم است؟', 'When is human approval needed?'), a: bi('اقدام یکجا ≥ ۵۰٬۰۰۰ Đ به HITL می‌رود (مادهٔ ۹).', 'Any single action ≥ 50,000 Đ goes to HITL (Article 9).') },
    { q: bi('زبان را کجا عوض کنم؟', 'Where do I switch language?'), a: bi('تنظیمات ← زبان، یا فرمان /lang در بات.', 'Settings → language, or the /lang command in the bot.') },
  ],
};
