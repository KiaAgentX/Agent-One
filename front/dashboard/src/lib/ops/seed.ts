/**
 * Ops seed — every row below is ported 1:1 from the legacy Zenovix Ops
 * console (legacy/agi-main/admin/ops, v1.6.0). Times, ids and policy
 * levels are preserved so the audit (Law 6) can diff page vs port.
 */

import type {
  Approval, AuditEntry, CatalogProduct, Category, CharterRow, ControlRow,
  CronJob, DocRow, EcoNode, Lead, MailItem, QuoteRow, RuntimeVar, SocialRow,
  SoulProfile, Ticket, WebPageRow,
} from './types.js';

/* ── audit.html — "Today's trail" ─────────────────────────────────── */

export const SEED_AUDIT: readonly AuditEntry[] = [
  { time: '09:14', actor: 'agent', action: 'reply_common', result: 'executed', idem: 'r-8841' },
  { time: '09:02', actor: 'agent', action: 'create_lead', result: 'executed', idem: 'l-2290' },
  { time: '08:50', actor: 'agent', action: 'publish_calendar', result: 'executed', idem: 'c-1102' },
  { time: '08:41', actor: 'agent', action: 'create_ticket', result: 'executed', idem: 't-441' },
  { time: '07:55', actor: 'Sara', action: 'create_quote send', result: 'approved', idem: 'q-1038' },
  { time: '07:40', actor: 'Sara', action: 'publish_content', result: 'rejected', idem: 's-77' },
  { time: '07:12', actor: 'agent', action: 'payment', result: 'blocked', idem: 'p-12' },
];

/* ── queue.html — live queue + legacy cards + hard gates ──────────── */

export const SEED_APPROVALS: readonly Approval[] = [
  { id: 'q-1042', kind: 'create_quote', summary: 'Nordic Oils · 12 drums', requester: 'agent', channel: 'email', createdAt: '09:20', policy: 'manager', status: 'pending' },
  { id: 'q-1043', kind: 'payment', summary: 'invoice #2214 · wire transfer', requester: 'agent', channel: 'telegram', createdAt: '09:31', policy: 'manager_only', status: 'pending' },
  { id: 'q-1044', kind: 'publish_content', summary: 'off-calendar post · “winter base-oil promo”', requester: 'agent', channel: 'instagram', createdAt: '09:38', policy: 'manager', status: 'pending' },
  { id: 'q-1045', kind: 'change_price', summary: 'PET-001 · 99 → 104 USD', requester: 'agent', channel: 'web', createdAt: '09:44', policy: 'manager', status: 'pending' },
];

export const SEED_QUOTE_ROWS: readonly QuoteRow[] = [
  { no: 'Q-1042', detail: 'Nordic Oils · 12 drums', policy: 'manager', status: 'waiting' },
  { no: 'Q-1041', detail: 'buyer@ · catalog only', policy: 'auto_rules', status: 'answered' },
  { no: 'Q-1039', detail: 'Delta Trading · repeat', policy: 'manager', status: 'waiting' },
  { no: 'Q-1038', detail: 'Sent 07:55', policy: 'manager', status: 'approved' },
];

/** "Why it never autos" — the four hard gates. */
export const SEED_HARD_GATES: ReadonlyArray<readonly [string, string]> = [
  ['payment', 'Money movement'],
  ['contract', 'Legal commitment'],
  ['create_quote / change_price', 'Commercial commitment'],
  ['delete_data / change_access', 'Irreversible'],
];

/* ── catalog.html — products the bot sells ────────────────────────── */

export const SEED_PRODUCTS: readonly CatalogProduct[] = [
  { code: 'PET-001', name: 'PET-001 group II base oil', nameFa: 'روغن پایه گروه II', category: 'lubricants', price: 99, unit: 'barrel', icon: '🛢', visible: true, sales: 12 },
  { code: 'PKG-200', name: '200L industrial drum', nameFa: 'بشکهٔ صنعتی ۲۰۰ لیتری', category: 'packaging', price: 48, unit: 'piece', icon: '🛢', visible: true, sales: 9 },
  { code: 'PMP-4400', name: 'Circulating pump PMP-4400', nameFa: 'پمپ سیرکولاسیون', category: 'equipment', price: 1840, unit: 'piece', icon: '⚙', visible: true, sales: 6 },
  { code: 'DOC-TDS', name: 'Technical data sheet pack', nameFa: 'بستهٔ دیتاشیت فنی', category: 'docs', price: 0, unit: 'service', icon: '📄', visible: true, sales: 40 },
  { code: 'DOC-FAQ', name: 'MOQ & warranty FAQ', nameFa: 'پرسش‌های متداول ضمانت', category: 'docs', price: 0, unit: 'service', icon: '📘', visible: true, sales: 22 },
  { code: 'DOC-SOP', name: 'Brand voice SOP v2', nameFa: 'دستور لحن برند v2', category: 'docs', price: 0, unit: 'service', icon: '🗂', visible: false, sales: 8 },
  { code: 'EDU-SALES', name: 'Sales psychology skill', nameFa: 'مهارت روانشناسی فروش', category: 'training', price: 29, unit: 'service', icon: '🎓', visible: true, sales: 15 },
  { code: 'EDU-PRICE', name: 'Pricing strategy skill', nameFa: 'مهارت استراتژی قیمت', category: 'training', price: 19, unit: 'service', icon: '🎓', visible: true, sales: 11 },
  { code: 'EDU-CAL', name: 'Content calendar skill', nameFa: 'مهارت تقویم محتوا', category: 'training', price: 15, unit: 'service', icon: '📅', visible: false, sales: 7 },
  { code: 'Q-NORDIC', name: 'Nordic Oils quote pack', nameFa: 'بستهٔ پیش‌فاکتور Nordic Oils', category: 'sales', price: 4200, unit: 'service', icon: '💶', visible: true, sales: 1 },
];

export const SEED_CATEGORIES: readonly Category[] = [
  { key: 'lubricants', name: 'Lubricants', icon: '🛢', active: true },
  { key: 'packaging', name: 'Packaging', icon: '📦', active: true },
  { key: 'equipment', name: 'Equipment', icon: '⚙', active: true },
  { key: 'docs', name: 'Documents', icon: '📄', active: true },
  { key: 'training', name: 'Training', icon: '🎓', active: true },
  { key: 'sales', name: 'Sales packs', icon: '💶', active: true },
];

export const SEED_UNITS: readonly CatalogProduct['unit'][] = ['metric ton', 'barrel', 'liter', 'kg', 'piece', 'service'];

/* ── settings.html — variables (secrets masked like the original) ─── */

export const SEED_VARS: readonly RuntimeVar[] = [
  { key: 'NODE_ENV', value: 'production', group: 'deploy', secret: false, readonly_: true },
  { key: 'RAILWAY_SERVICE', value: 'zenovix-ops', group: 'deploy', secret: false, readonly_: true },
  { key: 'PORT', value: '8080', group: 'deploy', secret: false, readonly_: true },
  { key: 'DATABASE_URL', value: 'postgres://…', group: 'deploy', secret: true, readonly_: true },
  { key: 'REDIS_URL', value: 'redis://…', group: 'deploy', secret: true, readonly_: true },
  { key: 'BOT_USERNAME', value: '@zenovix_bot', group: 'bot', secret: false, readonly_: false },
  { key: 'BOT_ADMIN_IDS', value: '114, 507', group: 'bot', secret: false, readonly_: false },
  { key: 'BOT_MENU_CONTACT', value: 'sales@zenovix.example', group: 'bot', secret: false, readonly_: false },
  { key: 'TELEGRAM_TOKEN', value: '••masked••', group: 'runtime', secret: true, readonly_: true },
  { key: 'WHATSAPP_ENABLED', value: 'false', group: 'runtime', secret: false, readonly_: false },
  { key: 'AUTO_REPLY_LIMIT', value: '200/day', group: 'runtime', secret: false, readonly_: false },
  { key: 'SIMULATOR', value: 'the real bot', group: 'runtime', secret: false, readonly_: true },
];

/* ── soul.html — Zenovix identity (defaults) ──────────────────────── */

export const SEED_SOUL: readonly SoulProfile[] = [{
  name: 'Zenovix',
  role: 'Digital Operations Manager',
  company: 'Zenovix Trading',
  mission: 'Run email, website, social and day-to-day work; know the company knowledge; never cross a gate.',
  personality: 'Precise, calm, pro-active; short sentences; no hype.',
  tone: 'Professional and warm; mirrors the customer\u2019s language.',
  languages: 'en, fa, ar, tr, ru, de, fr, es',
  greeting: 'Hi! I\u2019m Zenovix, the digital operations manager. How can I help?',
  boundaries: 'Payment, contract, quotes, price changes and deletions always wait for a human decision.',
  styleRules: 'No invented facts · no price promises · escalate safety issues immediately.',
  signature: '— Zenovix · Digital Operations Manager',
}];

/* ── inbox.html — mails with classification + proposed action ─────── */

export const SEED_MAILS: readonly MailItem[] = [
  { id: 'm-501', cat: 'sales', from: 'buyer@example.com', title: 'Price for 12 drums of PET-001?', body: 'We need a formal quote for 12 drums, delivered to Rotterdam. Please include lead time.', policy: 'hold', action: 'create_quote', status: 'new' },
  { id: 'm-502', cat: 'support', from: 'ops@nordicoils.io', title: 'Warranty claim on pump PMP-4400', body: 'The pump started leaking after two weeks. What does the warranty cover?', policy: 'auto', action: 'FAQ reply', status: 'new' },
  { id: 'm-503', cat: 'ops', from: 'calendar@zenovix.example', title: 'Scheduled post ready', body: 'Ordinary calendar item for 10:00 — base oil facts infographic.', policy: 'auto', action: 'publish_calendar', status: 'new' },
  { id: 'm-504', cat: 'finance', from: 'billing@delta-trading.com', title: 'Invoice #2214 — bank details changed', body: 'Please note our new IBAN for the pending wire. Signed letter attached.', policy: 'hold', action: 'payment', status: 'new' },
  { id: 'm-505', cat: 'sales', from: 'lab@chem.io', title: 'Sample request — group II base oil', body: 'Could you ship a 1L sample for lab analysis? Company details in signature.', policy: 'auto', action: 'create_lead', status: 'new' },
];

/* ── support.html — request → ticket → first line ─────────────────── */

export const SEED_TICKETS: readonly Ticket[] = [
  { id: 't-441', subject: 'System error, please support', priority: 'medium', sla: '4h', source: 'Chat', action: 'create_ticket', status: 'open' },
  { id: 't-440', subject: 'Warranty claim on pump', priority: 'normal', sla: '24h', source: 'Email', action: 'FAQ reply', status: 'firstline' },
  { id: 't-439', subject: 'Delivery delay on last order', priority: 'normal', sla: '24h', source: 'Email', action: 'template', status: 'firstline' },
  { id: 't-438', subject: 'Reported leak at customer site', priority: 'high', sla: 'now', source: 'WhatsApp', action: 'safety → human', status: 'escalated' },
  { id: 't-437', subject: 'Login issue on portal', priority: 'low', sla: '48h', source: 'Form', action: 'create_ticket', status: 'open' },
];

/* ── sales.html — lead → qualify → quote ──────────────────────────── */

export const SEED_LEADS: readonly Lead[] = [
  { account: 'buyer@example.com', source: 'Email catalog', stage: 'lead' },
  { account: 'Nordic Oils', source: 'Website form', stage: 'qualified' },
  { account: 'Delta Trading', source: 'Repeat', stage: 'qualified' },
  { account: 'lab@chem.io', source: 'Sample request', stage: 'lead' },
];

/* ── social.html — schedule → publish ─────────────────────────────── */

export const SEED_SOCIAL: readonly SocialRow[] = [
  { channel: 'IG comment', item: '“Great product!”', policy: 'template', status: 'published' },
  { channel: 'IG DM', item: 'Price for 12 drums', policy: 'sales_flow', status: 'draft' },
  { channel: 'IG comment', item: '“Guaranteed returns?”', policy: 'escalate', status: 'held' },
  { channel: 'Calendar', item: 'Base-oil facts infographic · 10:00', policy: 'calendar', status: 'published' },
];

/* ── website.html — pages · edit + policy gates ───────────────────── */

export const SEED_WEBPAGES: readonly WebPageRow[] = [
  { page: 'Products / base oil', status: 'draft', step: 3, policy: 'content' },
  { page: 'PET-001 price', status: 'review', step: 4, policy: 'change_price' },
  { page: 'Refund policy', status: 'review', step: 4, policy: 'contract' },
  { page: 'Contact', status: 'published', step: 5, policy: 'stable' },
  { page: 'About', status: 'published', step: 5, policy: 'stable' },
  { page: 'Technical data sheets', status: 'draft', step: 3, policy: 'content' },
];

/* ── knowledge.html — draft → review → approve → index ────────────── */

export const SEED_DOCS: readonly DocRow[] = [
  { doc: 'Product catalog', version: '4', sensitivity: 'public', step: 'indexed' },
  { doc: 'Brand voice and reply SOP', version: '2', sensitivity: 'internal', step: 'indexed' },
  { doc: 'Warranty and MOQ FAQ', version: '3', sensitivity: 'internal', step: 'indexed' },
  { doc: 'Shipping windows', version: '1', sensitivity: 'internal', step: 'review' },
  { doc: 'Distribution contract terms', version: '1', sensitivity: 'confidential', step: 'manager_only' },
  { doc: '2026 price list', version: '—', sensitivity: 'internal', step: 'draft' },
];

/* ── automation.html — phase-5 cron jobs ──────────────────────────── */

export const SEED_JOBS: readonly CronJob[] = [
  { job: 'daily-report', every: '24h', lastRun: '08:00', mayAuto: 'compile only', paused: false },
  { job: 'followup-check', every: '1h', lastRun: '09:00', mayAuto: 'open tasks', paused: false },
  { job: 'calendar-publish', every: '5m', lastRun: '09:05', mayAuto: 'ordinary posts', paused: false },
  { job: 'ops-digest', every: '24h', lastRun: '08:00', mayAuto: 'compile only', paused: true },
];

/* ── control.html / charter.html — access matrix ──────────────────── */

export const SEED_CONTROL: readonly ControlRow[] = [
  { work: 'Read and classify email', level: 'auto', action: 'read_email / classify_email', flow: 'Email' },
  { work: 'Reply to common questions', level: 'auto_rules', action: 'reply_common', flow: 'Email' },
  { work: 'Send sensitive or important email', level: 'manager', action: 'send_email', flow: 'Approvals' },
  { work: 'Publish ordinary calendar content', level: 'auto', action: 'publish_calendar', flow: 'Social' },
  { work: 'Change price or sensitive site information', level: 'manager', action: 'change_price', flow: 'Website' },
  { work: 'Payment, contract, money transfer', level: 'manager_only', action: 'payment / contract', flow: 'Approvals' },
  { work: 'Delete data or change user access', level: 'manager', action: 'delete_data / change_access', flow: 'Approvals' },
];

export const SEED_CHARTER_MATRIX: readonly CharterRow[] = [
  { work: 'Read and classify email', mode: 'auto', action: 'read_email / classify_email' },
  { work: 'Answer common questions under rules', mode: 'auto', action: 'reply_common' },
  { work: 'Send sensitive or important email', mode: 'manager', action: 'send_email' },
  { work: 'Publish ordinary calendar content', mode: 'auto', action: 'publish_calendar' },
  { work: 'Sensitive or off-calendar publish', mode: 'manager', action: 'publish_content' },
  { work: 'Change price or sensitive site data', mode: 'manager', action: 'change_price' },
  { work: 'Payment, contract, money transfer', mode: 'manager_only', action: 'payment / contract' },
  { work: 'Delete data or change user access', mode: 'manager_only', action: 'delete_data / change_access' },
];

/* ── operations.html — daily report ───────────────────────────────── */

export const SEED_DAILY: ReadonlyArray<readonly [string, number]> = [
  ['Messages', 312], ['Email received', 128], ['Automatic replies', 84],
  ['Work completed', 19], ['Follow-ups armed', 11], ['Errors', 1],
];

/* ── brain.html — knowledge atom (Bohr: shell n holds 2n²) ────────── */

export const SEED_ELECTRONS = [
  { title: 'Product catalog', sensitivity: 'public', domain: 'sales', status: 'approved', version: 4 },
  { title: 'Brand voice and reply SOP', sensitivity: 'internal', domain: 'ops', status: 'approved', version: 2 },
  { title: 'Warranty and MOQ FAQ', sensitivity: 'internal', domain: 'support', status: 'approved', version: 3 },
  { title: 'Shipping windows', sensitivity: 'internal', domain: 'ops', status: 'draft', version: 1 },
  { title: 'Distribution contract terms', sensitivity: 'confidential', domain: 'legal', status: 'approved', version: 1 },
] as const;

/* ── ecosystem.html — orbital board nodes (ecosystem-view.js) ─────── */

export const SEED_ECO_NODES: readonly EcoNode[] = [
  { id: 'core', label: 'Orchestrator', ring: 0, kind: 'core', href: '/ops/desk', text: 'Intent classification, skill routing, memory. Every inbound message lands here first.' },
  { id: 'hitl', label: 'HITL gate', ring: 0.55, kind: 'gate', href: '/ops/queue', text: 'Payment, contract, price, delete, access never auto-run. Manager record required.' },
  { id: 'tg', label: 'Telegram', ring: 1, kind: 'channel', href: '/ops/inbox', text: 'Executive bot, webhooks, inline approvals.' },
  { id: 'wa', label: 'WhatsApp (optional)', ring: 1, kind: 'channel', href: '/ops/inbox', text: 'Optional. Disabled channel returns 404. Never invent a Meta/Twilio secret.' },
  { id: 'em', label: 'Email', ring: 1, kind: 'channel', href: '/ops/inbox', text: 'IMAP capture · classify · reply_common or escalate.' },
  { id: 'ig', label: 'Instagram', ring: 1, kind: 'channel', href: '/ops/social', text: 'Calendar posts auto. Guarantee claims held.' },
  { id: 'x', label: 'X / Twitter', ring: 1, kind: 'channel', href: '/ops/social', text: 'Publish, mentions, character limits before send.' },
  { id: 'web', label: 'Website', ring: 1, kind: 'channel', href: '/ops/website', text: 'Forms become leads. Price edits hit the policy gate.' },
  { id: 'emailag', label: 'Email agent', ring: 0.72, kind: 'agent', href: '/ops/inbox', text: 'Classify, reply_common, draft important mail. Finance and legal wait.' },
  { id: 'socialag', label: 'Social agent', ring: 0.72, kind: 'agent', href: '/ops/social', text: 'Calendar captions. Ordinary posts auto. Claims held.' },
  { id: 'salesag', label: 'Sales agent', ring: 0.72, kind: 'agent', href: '/ops/sales', text: 'Lead → qualify → quote. Sending a quote is HITL.' },
  { id: 'supportag', label: 'Support agent', ring: 0.72, kind: 'agent', href: '/ops/support', text: 'Tickets and first-line. Safety issues escalate now.' },
  { id: 'know', label: 'Knowledge', ring: 0.72, kind: 'agent', href: '/ops/brain', text: 'Approved docs only. Confidential stays hidden.' },
  { id: 'opsag', label: 'Ops agent', ring: 0.72, kind: 'agent', href: '/ops/operations', text: 'Reminders, digest, coordination. Observes, does not bypass.' },
  { id: 'pg', label: 'Postgres', ring: 1.28, kind: 'store', href: '/ops/audit', text: 'Customers, messages, approvals ledger. Durable before AI work.' },
  { id: 'rd', label: 'Redis', ring: 1.28, kind: 'store', href: '/ops/live', text: 'Streams, locks, rate limits, prompt cache.' },
  { id: 'rag', label: 'RAG store', ring: 1.28, kind: 'store', href: '/ops/knowledge', text: 'Indexed chunks. Unapproved drafts never answer.' },
];

/* ── insights.html — 14-day series (deterministic seeds) ──────────── */

export const SEED_14D_LABELS: readonly string[] = [
  '10-24', '10-25', '10-26', '10-27', '10-28', '10-29', '10-30',
  '10-31', '11-01', '11-02', '11-03', '11-04', '11-05', '11-06',
];

/** [newContacts, activeContacts] per day. */
export const SEED_14D_CONTACTS: ReadonlyArray<readonly [number, number]> = [
  [4, 18], [7, 22], [5, 19], [9, 26], [6, 21], [8, 24], [11, 29],
  [7, 23], [6, 20], [10, 27], [8, 25], [12, 31], [9, 28], [13, 34],
];

/** Inbound messages per day. */
export const SEED_14D_VOLUME: readonly number[] = [
  210, 264, 198, 302, 241, 276, 351, 268, 232, 318, 289, 372, 305, 340,
];

/** Desk traffic — messages per hour (24 bars). */
export const SEED_HOURLY: readonly number[] = [
  4, 3, 2, 2, 3, 5, 9, 14, 18, 22, 19, 24, 28, 25, 21, 18, 16, 14, 12, 10, 9, 7, 6, 5,
];
