/**
 * Service + routes tests — the injected-db economy API end to end.
 * Exercises the IDENTICAL behavior contract of the EVOLVED ports: indicator
 * aggregates, the sacred-invariant report, the 10-article charter endpoint
 * and the fail-closed 503 path (database offline).
 */
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { nationEconomyRoutes } from '../economy.routes.js';
import { GENESIS_AUDIT, getEconomyIndicators, verifySacredInvariant, type NationDb } from '../economy.service.js';

function stubDb(overrides: Partial<Record<string, number>> = {}, fail = false): NationDb {
  const boom = (): never => {
    throw new Error('database offline');
  };
  return {
    wallet: {
      aggregate: (async (args: { _sum: { credits: true }; _count: true } | { _sum: { stars: true } } | { _sum: { credits: true } }) => {
        if (fail) boom();
        if ('stars' in args._sum) {
          return { _sum: { stars: overrides.stars ?? 55 } };
        }
        if ('_count' in args) {
          return { _sum: { credits: overrides.credits ?? 1000 }, _count: overrides.citizens ?? 7 };
        }
        return { _sum: { credits: overrides.credits ?? 1000 } };
      }) as NationDb['wallet']['aggregate'],
    },
    transaction: {
      aggregate: (async () => {
        if (fail) boom();
        return { _sum: { amount: overrides.ledger ?? 900 }, _count: overrides.ledgerRows ?? 12 };
      }) as NationDb['transaction']['aggregate'],
    },
    order: { count: async () => overrides.orders ?? 3 },
    product: { count: async () => overrides.products ?? 4 },
  };
}

describe('economy service (injected db)', () => {
  it('returns the full indicator contract with charter constants embedded', async () => {
    const s = await getEconomyIndicators(stubDb({ credits: 42_000, citizens: 11 }));
    expect(s.currency.code).toBe('DNX');
    expect(s.citizens).toBe(11);
    expect(s.supplyDinar).toBe(42_000);
    expect(s.taxPercent).toBe(10);
    expect(s.taxMaxPercent).toBe(90);
    expect(s.mintCaps).toEqual({ quest: 10_000, referral: 5_000 });
    expect(s.hitlThreshold).toBe(50_000);
    expect(s.generatedAt).toBeTruthy();
  });

  it('verifySacredInvariant reports the live gap (Article 7)', async () => {
    const r = await verifySacredInvariant(stubDb({ credits: 1000, ledger: 900 }));
    expect(r.ok).toBe(false);
    expect(r.gap).toBe(100); // 1000 balances − 900 ledger − 0 adjustments
    expect(r.detail).toMatch(/audit failed/);
  });

  it('genesis audit stays published, itemized 100%', () => {
    expect(GENESIS_AUDIT.gap).toBe(-63.0);
    const itemized = GENESIS_AUDIT.itemization.reduce((acc, i) => acc + i.dinar, 0);
    expect(itemized).toBe(GENESIS_AUDIT.gap);
  });
});

describe('transparency API (Fastify plugin, additive mount)', () => {
  it('GET /economy → ok:true + indicators', async () => {
    const app = Fastify();
    await app.register(nationEconomyRoutes, { prefix: '/api/v1/nation', db: stubDb() });
    const res = await app.inject({ method: 'GET', url: '/api/v1/nation/economy' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; indicators: { currency: { code: string } } };
    expect(body.ok).toBe(true);
    expect(body.indicators.currency.code).toBe('DNX');
    await app.close();
  });

  it('GET /economy/verify → audit + published genesis', async () => {
    const app = Fastify();
    await app.register(nationEconomyRoutes, { prefix: '/api/v1/nation', db: stubDb() });
    const res = await app.inject({ method: 'GET', url: '/api/v1/nation/economy/verify' });
    const body = res.json() as { ok: boolean; genesis: { gap: number } };
    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.genesis.gap).toBe(-63.0);
    await app.close();
  });

  it('GET /economy/charter → exactly the 10 articles, in Persian', async () => {
    const app = Fastify();
    await app.register(nationEconomyRoutes, { prefix: '/api/v1/nation', db: stubDb() });
    const res = await app.inject({ method: 'GET', url: '/api/v1/nation/economy/charter' });
    const body = res.json() as { ok: boolean; charter: { title: string; articles: unknown[] } };
    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.charter.title).toContain('۱۰ ماده');
    expect(body.charter.articles).toHaveLength(10);
    await app.close();
  });

  it('database offline → fail-closed 503 with the original error contract', async () => {
    const app = Fastify();
    await app.register(nationEconomyRoutes, { prefix: '/api/v1/nation', db: stubDb({}, true) });
    const res = await app.inject({ method: 'GET', url: '/api/v1/nation/economy' });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { ok: boolean; error: string; detail: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('unavailable');
    expect(body.detail).toContain('database offline');
    await app.close();
  });
});
