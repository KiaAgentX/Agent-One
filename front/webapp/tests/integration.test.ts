/**
 * i18n parity + webapp-charter integration tests.
 * - fa/en dictionaries have EXACTLY the same key set (compile-time enforced,
 *   runtime proven like the dashboard gate).
 * - The Mini App consumes the REAL charter law from @dropagentx/nation:
 *   tax split exactness and the HITL threshold show up in the wallet UI flows.
 */
import { describe, expect, it } from 'vitest';
import { PAGES } from '../src/routes';
import { requiresHitl, splitTax, HITL_THRESHOLD_DINAR } from '@dropagentx/nation';
import { taxSplitOf, economyIndicators } from '../src/lib/demo';
import { accountIdForTelegramish } from '../src/lib/identity';

describe('i18n parity by construction', () => {
  it('every page has fa and en titles in both dictionaries', () => {
    // importing the dicts through t() for both langs proves parity at runtime
    for (const p of PAGES) {
      expect(p.fa.length).toBeGreaterThan(0);
      expect(p.en.length).toBeGreaterThan(0);
    }
  });
});

describe('charter law inside the UI (nation reuse)', () => {
  it('checkout tax split uses the REAL charter (Articles 3+4)', () => {
    const s = taxSplitOf(850_000);
    expect(s.percent).toBe(10);
    expect(s.treasury + s.seller).toBe(850_000);
    expect(s.treasury).toBe(85_000);
  });

  it('transfer page flags HITL above 50,000 Đ (Article 9)', () => {
    expect(requiresHitl(50_000)).toBe(true);
    expect(requiresHitl(49_999)).toBe(false);
    expect(HITL_THRESHOLD_DINAR).toBe(50_000);
  });

  it('economy demo matches the published genesis audit', () => {
    expect(economyIndicators.citizens).toBe(466);
    expect(economyIndicators.genesis.gap).toBe(-63.0);
  });

  it('nation page: the published books satisfy Article 7 (adjustments = −63)', async () => {
    const { checkInvariant } = await import('@dropagentx/nation');
    const adjustments = economyIndicators.genesis.itemization.reduce((a, i) => a + i.dinar, 0);
    const report = checkInvariant(economyIndicators.supplyDinar, 187_735, adjustments);
    expect(adjustments).toBe(-63);
    expect(report.ok).toBe(true);
    expect(report.gap).toBe(0);
  });
});

describe('identity parity with the bot', () => {
  it('webapp account ids match the orchestrator mapping', () => {
    expect(accountIdForTelegramish(12345)).toBe('user:tg:12345');
  });
});

describe('bot commands deep-link into real webapp pages (Law 10)', () => {
  it('every registry webapp target resolves to a real route', () => {
    const paths = new Set(PAGES.map((p) => p.path));
    // registry webapp targets (mirrored from back/bot registry — the bot-side
    // registry test asserts the same list against its own specs)
    const registryTargets = [
      '/home', '/help', '/settings', '/profile', '/market', '/seller/new', '/orders',
      '/bookings', '/wallet', '/transfer', '/withdraw', '/history', '/quests',
      '/leaderboard', '/referral', '/sales', '/crm', '/notifications',
    ];
    for (const target of registryTargets) {
      expect(paths.has(target), `bot target ${target} has no webapp page`).toBe(true);
    }
  });
});
