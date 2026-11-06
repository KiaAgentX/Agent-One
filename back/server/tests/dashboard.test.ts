/**
 * Command-center acceptance suite — every shape front/public-site/app.js
 * consumes, against the REAL store: brand, overview (with a settled sale),
 * products CRUD (archive = DELETE), orders (status filter + actions),
 * users/wallets, leaderboard (sales rail), approvals (HITL views + decide),
 * settings (GET list / PUT 501), security layers + audit tail, and the
 * enriched /health (version + status chips).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, type BuiltApp } from '../src/index.js';
import { resetRateLimiter } from '../src/guards.js';

const ADMIN_KEY = 'v3-test-admin-key-0123456789abcdef';
const ADMIN = { 'x-kia-key': ADMIN_KEY, 'content-type': 'application/json' };

let built: BuiltApp;

beforeAll(async () => {
  built = await buildApp({
    adminKey: ADMIN_KEY,
    botToken: undefined,
    devAuth: false,
    port: 8787,
    rateLimitPerMin: 100_000,
  });
});

afterAll(async () => {
  await built.app.close();
  await built.prisma.$disconnect();
});

beforeEach(async () => {
  resetRateLimiter();
  await built.prisma.auditLog.deleteMany();
  await built.prisma.outboxEvent.deleteMany();
  await built.prisma.hitlRequest.deleteMany();
  await built.prisma.aiUsage.deleteMany();
  await built.prisma.posting.deleteMany();
  await built.prisma.tx.deleteMany();
  await built.prisma.escrow.deleteMany();
  await built.prisma.product.deleteMany();
  await built.prisma.account.deleteMany();
  await built.store.ensureSystemAccounts();
});

async function newUser(id: string, label?: string): Promise<void> {
  const res = await built.app.inject({ method: 'POST', url: '/api/v1/accounts', headers: ADMIN, payload: { id, ...(label !== undefined ? { label } : {}) } });
  if (res.statusCode !== 201) throw new Error(`create ${id} failed: ${res.statusCode} ${res.body}`);
}

async function mint(accountId: string, amount: number): Promise<void> {
  const res = await built.app.inject({ method: 'POST', url: '/api/v1/wallet/mint', headers: ADMIN, payload: { accountId, amount, memo: 'test genesis' } });
  if (res.statusCode !== 200) throw new Error(`mint failed: ${res.statusCode} ${res.body}`);
}

async function createProduct(title: string, priceCredits = 12_000): Promise<string> {
  const res = await built.app.inject({ method: 'POST', url: '/api/v1/products', headers: ADMIN, payload: { title, priceCredits, description: 'test listing' } });
  expect(res.statusCode).toBe(201);
  const body = JSON.parse(res.body) as { data: { id: string } };
  return body.data.id;
}

/** buyer mints, escrow created+funded+delivered — ready for release approval. */
async function deliveredEscrow(id: string, amount: number, productId?: string): Promise<void> {
  await newUser('user:buyer', 'Buyer One');
  await newUser('user:seller', 'Seller One');
  await mint('user:buyer', amount);
  const create = await built.app.inject({
    method: 'POST',
    url: '/api/v1/escrows',
    headers: ADMIN,
    payload: { id, buyerId: 'user:buyer', sellerId: 'user:seller', amount, ...(productId !== undefined ? { productRef: productId } : {}) },
  });
  expect(create.statusCode).toBe(201);
  expect((await built.app.inject({ method: 'POST', url: `/api/v1/escrows/${id}/fund`, headers: ADMIN, payload: {} })).statusCode).toBe(200);
  expect((await built.app.inject({ method: 'POST', url: `/api/v1/escrows/${id}/deliver`, headers: ADMIN, payload: {} })).statusCode).toBe(200);
}

describe('dashboard API — command center wire', () => {
  it('GET /brand is public and answers the {ok:true,data} envelope', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/api/v1/brand' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { ok: boolean; data: { name: string; tagline: string } };
    expect(body.ok).toBe(true);
    expect(body.data.name.length).toBeGreaterThan(0);
    expect(typeof body.data.tagline).toBe('string');
  });

  it('GET /overview requires the admin key and derives KPIs from live tables', async () => {
    const denied = await built.app.inject({ method: 'GET', url: '/api/v1/overview' });
    expect(denied.statusCode).toBe(401);

    await deliveredEscrow('esc_ov', 40_000);
    await built.app.inject({ method: 'POST', url: `/api/v1/escrows/esc_ov/release`, headers: ADMIN, payload: {} });

    const res = await built.app.inject({ method: 'GET', url: '/api/v1/overview', headers: ADMIN });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      data: {
        users: number; orders: number; revenueStars: number; revenueCredits: number;
        series: { date: string; revenue: number; orders: number }[];
        recentOrders: { id: string; buyer: { name: string }; status: string; totalCredits: number }[];
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.users).toBe(2);
    expect(body.data.orders).toBe(1);
    // Charter: no Stars rail yet, settled dinar shows in the credits slot.
    expect(body.data.revenueStars).toBe(0);
    expect(body.data.revenueCredits).toBeGreaterThanOrEqual(36_000); // 90% seller net
    expect(body.data.series).toHaveLength(14);
    const today = body.data.series[13];
    expect(today.orders).toBe(1);
    expect(today.revenue).toBeGreaterThanOrEqual(36_000);
    expect(body.data.recentOrders[0].id).toBe('esc_ov');
    expect(body.data.recentOrders[0].buyer.name).toBe('Buyer One');
    expect(body.data.recentOrders[0].status).toBe('delivered');
  });

  it('products: create → public list → patch → archive (DELETE)', async () => {
    const id = await createProduct('Auli Template', 18_000);
    expect(id.startsWith('prod_')).toBe(true);

    const list = await built.app.inject({ method: 'GET', url: '/api/v1/products?limit=12&offset=0' });
    expect(list.statusCode).toBe(200);
    const listed = JSON.parse(list.body) as { ok: boolean; data: { items: { id: string; title: string; priceStars: number; priceCredits: number; stock: number; status: string }[]; total: number } };
    expect(listed.ok).toBe(true);
    expect(listed.data.total).toBe(1);
    expect(listed.data.items[0].priceStars).toBe(0);
    expect(listed.data.items[0].priceCredits).toBe(18_000);
    expect(listed.data.items[0].stock).toBe(-1);
    expect(listed.data.items[0].status).toBe('active');

    const patch = await built.app.inject({ method: 'PATCH', url: `/api/v1/products/${id}`, headers: ADMIN, payload: { title: 'Auli Template v2' } });
    expect(patch.statusCode).toBe(200);
    expect((JSON.parse(patch.body) as { data: { title: string } }).data.title).toBe('Auli Template v2');

    // No content-type on a bodyless DELETE — exactly what the dashboard's
    // api() wrapper sends (Fastify 400s on empty JSON bodies otherwise).
    const del = await built.app.inject({ method: 'DELETE', url: `/api/v1/products/${id}`, headers: { 'x-kia-key': ADMIN_KEY } });
    expect(del.statusCode).toBe(200);
    expect((JSON.parse(del.body) as { data: { status: string } }).data.status).toBe('archived');

    const missing = await built.app.inject({ method: 'PATCH', url: '/api/v1/products/prod_nope', headers: ADMIN, payload: { title: 'x' } });
    expect(missing.statusCode).toBe(404);
  });

  it('orders: status filter maps escrow states; deliver/cancel follow the state machine', async () => {
    await createProduct('Temp');
    await deliveredEscrow('esc_del', 5_000);

    const paid = await built.app.inject({ method: 'GET', url: '/api/v1/orders?status=paid&limit=20&offset=0', headers: ADMIN });
    expect((JSON.parse(paid.body) as { data: { items: unknown[] } }).data.items).toHaveLength(0); // already DELIVERED

    const delivered = await built.app.inject({ method: 'GET', url: '/api/v1/orders?status=delivered&limit=20&offset=0', headers: ADMIN });
    const deliveredBody = JSON.parse(delivered.body) as { ok: boolean; data: { items: { id: string; status: string; product: string }[]; total: number } };
    expect(deliveredBody.ok).toBe(true);
    expect(deliveredBody.data.total).toBe(1);
    expect(deliveredBody.data.items[0].status).toBe('delivered');

    // fund a second escrow and deliver it via the dashboard action
    await mint('user:buyer', 5_000);
    await built.app.inject({ method: 'POST', url: '/api/v1/escrows', headers: ADMIN, payload: { id: 'esc_act', buyerId: 'user:buyer', sellerId: 'user:seller', amount: 5_000 } });
    const act = await built.app.inject({ method: 'POST', url: '/api/v1/orders/esc_act/status', headers: ADMIN, payload: { action: 'deliver' } });
    expect(act.statusCode).toBe(422); // CREATED cannot deliver — must fund first
    expect((await built.app.inject({ method: 'POST', url: '/api/v1/escrows/esc_act/fund', headers: ADMIN, payload: {} })).statusCode).toBe(200);
    const deliver = await built.app.inject({ method: 'POST', url: '/api/v1/orders/esc_act/status', headers: ADMIN, payload: { action: 'deliver' } });
    expect(deliver.statusCode).toBe(200);
    expect((JSON.parse(deliver.body) as { data: { status: string } }).data.status).toBe('DELIVERED');

    // cancel a CREATED escrow via the dashboard action
    await built.app.inject({ method: 'POST', url: '/api/v1/escrows', headers: ADMIN, payload: { id: 'esc_cancel', buyerId: 'user:buyer', sellerId: 'user:seller', amount: 1_000 } });
    const cancel = await built.app.inject({ method: 'POST', url: '/api/v1/orders/esc_cancel/status', headers: ADMIN, payload: { action: 'cancel' } });
    expect(cancel.statusCode).toBe(200);
    expect((JSON.parse(cancel.body) as { data: { status: string } }).data.status).toBe('CANCELLED');
  });

  it('users + wallets: derived balances and escrow-locked amounts', async () => {
    await newUser('user:wallet', 'Wallet Owner');
    await newUser('user:buyer2');
    await mint('user:wallet', 77_000);
    await mint('user:buyer2', 10_000);
    await built.app.inject({ method: 'POST', url: '/api/v1/escrows', headers: ADMIN, payload: { id: 'esc_lock', buyerId: 'user:buyer2', sellerId: 'user:wallet', amount: 10_000 } });
    await built.app.inject({ method: 'POST', url: '/api/v1/escrows/esc_lock/fund', headers: ADMIN, payload: {} });

    const users = await built.app.inject({ method: 'GET', url: '/api/v1/users?limit=100', headers: ADMIN });
    const usersBody = JSON.parse(users.body) as { data: { items: { name: string; role: string }[] } };
    expect(usersBody.data.items.map((u) => u.name)).toContain('Wallet Owner');

    const wallets = await built.app.inject({ method: 'GET', url: '/api/v1/wallets?limit=100', headers: ADMIN });
    const walletsBody = JSON.parse(wallets.body) as { ok: boolean; data: { items: { name: string; balance: number; locked: number }[] } };
    expect(walletsBody.ok).toBe(true);
    const owner = walletsBody.data.items.find((w) => w.name === 'Wallet Owner');
    expect(owner?.balance).toBe(77_000);
    const buyer = walletsBody.data.items.find((w) => w.name === 'user:buyer2');
    expect(buyer?.locked).toBe(10_000);
  });

  it('leaderboard sales ranks settled sellers; quests/bookings answer clean empties', async () => {
    await deliveredEscrow('esc_lb', 4_000);
    await built.app.inject({ method: 'POST', url: '/api/v1/escrows/esc_lb/release', headers: ADMIN, payload: {} });

    const lb = await built.app.inject({ method: 'GET', url: '/api/v1/leaderboard?type=sales&limit=25' });
    const lbBody = JSON.parse(lb.body) as { data: { items: { rank: number; name: string; sales: number }[] } };
    expect(lbBody.data.items).toHaveLength(1);
    expect(lbBody.data.items[0].rank).toBe(1);
    expect(lbBody.data.items[0].name).toBe('Seller One');
    expect(lbBody.data.items[0].sales).toBe(1);

    const quests = await built.app.inject({ method: 'GET', url: '/api/v1/quests' });
    expect((JSON.parse(quests.body) as { data: { items: unknown[] } }).data.items).toHaveLength(0);
    const bookings = await built.app.inject({ method: 'GET', url: '/api/v1/bookings' });
    expect((JSON.parse(bookings.body) as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('approvals: HITL views with charter risk levels + decide settles in the same tx', async () => {
    await deliveredEscrow('esc_hitl', 60_000); // ≥ 50,000 Đ → release requires approval
    const created = await built.app.inject({
      method: 'POST',
      url: '/api/v1/hitl',
      headers: ADMIN,
      payload: { id: 'hitl_dash', kind: 'ESCROW_RELEASE', escrowId: 'esc_hitl', requesterId: 'user:seller', note: 'please release' },
    });
    expect(created.statusCode).toBe(201);

    const list = await built.app.inject({ method: 'GET', url: '/api/v1/approvals?status=pending', headers: ADMIN });
    const listBody = JSON.parse(list.body) as { data: { items: { id: string; riskLevel: string; summary: string }[] } };
    expect(listBody.data.items).toHaveLength(1);
    expect(listBody.data.items[0].riskLevel).toBe('high');
    expect(listBody.data.items[0].summary).toContain('60000');

    const treasuryBefore = await built.store.balanceOf('treasury:nation');
    const decide = await built.app.inject({ method: 'POST', url: '/api/v1/approvals/hitl_dash/decide', headers: ADMIN, payload: { approve: true } });
    expect(decide.statusCode).toBe(200);
    const decided = JSON.parse(decide.body) as { data: { status: string; txId: string | null } };
    expect(decided.data.status).toBe('approved');
    expect(decided.data.txId).not.toBeNull();
    const treasuryAfter = await built.store.balanceOf('treasury:nation');
    expect((treasuryAfter ?? 0) - (treasuryBefore ?? 0)).toBe(6_000); // 10% tax of 60,000

    const after = await built.app.inject({ method: 'GET', url: '/api/v1/approvals?status=pending', headers: ADMIN });
    expect((JSON.parse(after.body) as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('settings: GET lists (empty until KV) and PUT honestly refuses with 501', async () => {
    const get = await built.app.inject({ method: 'GET', url: '/api/v1/settings', headers: ADMIN });
    expect(get.statusCode).toBe(200);
    expect((JSON.parse(get.body) as { data: { items: unknown[] } }).data.items).toHaveLength(0);

    const put = await built.app.inject({ method: 'PUT', url: '/api/v1/settings', headers: ADMIN, payload: { key: 'brand.name', value: 'X' } });
    expect(put.statusCode).toBe(501);
    expect((JSON.parse(put.body) as { error: { code: string } }).error.code).toBe('NOT_IMPLEMENTED');
  });

  it('security: real layers + audit tail reflects dashboard actions', async () => {
    await createProduct('Audit Me');
    const res = await built.app.inject({ method: 'GET', url: '/api/v1/security', headers: ADMIN });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { layers: { id: string; name: string; active: boolean }[]; audit: { actor: string; action: string }[] };
    };
    expect(body.data.layers.length).toBeGreaterThanOrEqual(10);
    expect(body.data.layers.every((l) => l.name.length > 0)).toBe(true);
    const adminLayer = body.data.layers.find((l) => l.id === 'L05');
    expect(adminLayer?.active).toBe(true); // adminKey configured in this suite
    expect(body.data.audit.some((a) => a.action === 'product.create')).toBe(true);
    expect(body.data.audit.every((a) => a.actor === 'dashboard')).toBe(true);
  });

  it('/health reports the real version + status chips for the settings page', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { version: string; db: string; bot: string; ai: string; uptime: number };
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.version).not.toBe('1.0.0');
    expect(body.db).toBe('ok');
    expect(body.bot).toBe('disabled'); // botToken undefined in this suite
    expect(body.ai).toBe('disabled');
    expect(body.uptime).toBeGreaterThan(0);
  });
});
