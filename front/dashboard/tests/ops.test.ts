/**
 * Ops port tests — the Law-6 audit hooks for the Level-A UI port:
 * (1) all 24 console doors are registered and routable, (2) the never-auto
 * hard gates survived the port verbatim, (3) a manager decision logs an
 * idempotent audit entry, (4) the Bohr atom still grows 2n² shells,
 * (5) i18n nav labels exist for every slug.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OPS_SLUGS, parse, type RoutePath } from '../src/lib/router.js';
import { OPS_PAGE_COUNT, OPS_PAGES } from '../src/pages/ops/index.js';
import { getOps, ops } from '../src/lib/ops/store.js';
import { bohrShells } from '../src/pages/ops/OpsKnowledge.js';
import { SEED_HARD_GATES } from '../src/lib/ops/seed.js';
import { OPS_FA } from '../src/lib/ops-i18n.js';

const LEGACY_PAGES = [
  'index', 'hub', 'queue', 'catalog', 'settings', 'soul', 'simulator', 'database',
  'charter', 'inbox', 'website', 'social', 'sales', 'support', 'operations',
  'knowledge', 'brain', 'control', 'audit', 'automation', 'live', 'insights',
  'market', 'ecosystem',
];

const RENAMED: Record<string, string> = { index: 'desk', settings: 'variables' };

describe('ops console port (Law 9 Level-A)', () => {
  it('registers exactly 24 doors, 1:1 with the legacy pages (renames preserved)', () => {
    expect(OPS_PAGE_COUNT).toBe(24);
    expect(OPS_SLUGS.length).toBe(24);
    const expected = LEGACY_PAGES.map((p) => RENAMED[p] ?? p).sort();
    expect([...OPS_SLUGS].sort()).toEqual(expected);
    for (const slug of OPS_SLUGS) expect(OPS_PAGES[slug]).toBeTypeOf('function');
  });

  it('routes every /ops/<slug> and rejects unknown slugs', () => {
    for (const slug of OPS_SLUGS) {
      expect(parse(`#/ops/${slug}`)).toBe(`/ops/${slug}` as RoutePath);
    }
    expect(parse('#/ops/nope')).toBe('/overview');
    expect(parse('#/ops')).toBe('/overview');
  });

  it('keeps the four hard gates verbatim', () => {
    expect(SEED_HARD_GATES.map(([action]) => action)).toEqual([
      'payment',
      'contract',
      'create_quote / change_price',
      'delete_data / change_access',
    ]);
  });

  describe('store decisions', () => {
    beforeEach(() => ops.resetAll());
    afterEach(() => ops.resetAll());

    it('deciding an approval logs an idempotent audit entry and frees the queue', () => {
      const before = getOps();
      const target = before.approvals.find((a) => a.status === 'pending');
      expect(target).toBeDefined();
      const trailBefore = before.audit.length;
      ops.decide(target!.id, 'approved', 'manager');
      const after = getOps();
      expect(after.approvals.find((a) => a.id === target!.id)?.status).toBe('approved');
      expect(after.audit.length).toBe(trailBefore + 1);
      expect(after.audit[0]?.actor).toBe('manager');
      expect(after.audit[0]?.result).toBe('approved');
      expect(after.audit[0]?.idem).toMatch(/^ops-\d+$/);
      // deciding again is a no-op (idempotent like the legacy /decide)
      ops.decide(target!.id, 'rejected', 'manager');
      expect(getOps().approvals.find((a) => a.id === target!.id)?.status).toBe('approved');
    });

    it('catalog CRUD is persisted-capable and reflected in counts', () => {
      ops.saveProduct({ code: 'TST-1', name: 'Test product', nameFa: 'محصول آزمایشی', category: 'docs', price: 5, unit: 'piece', icon: '🧪', visible: true, sales: 0 });
      expect(getOps().products.some((p) => p.code === 'TST-1')).toBe(true);
      ops.deleteProduct('TST-1');
      expect(getOps().products.some((p) => p.code === 'TST-1')).toBe(false);
    });

    it('the simulator never auto-executes a payment', () => {
      ops.simReset();
      ops.simSend('I want to pay the invoice now', false);
      const dbg = getOps().simDebug;
      expect(dbg?.policy).toBe('manager_only');
      expect(dbg?.held).toBe(true);
    });
  });

  it('bohr shells grow at capacity 2n²', () => {
    expect(bohrShells(0)).toEqual([]);
    expect(bohrShells(2)).toEqual([{ n: 1, capacity: 2, filled: 2 }]);
    expect(bohrShells(5)).toEqual([
      { n: 1, capacity: 2, filled: 2 },
      { n: 2, capacity: 8, filled: 3 },
    ]);
    expect(bohrShells(12)).toEqual([
      { n: 1, capacity: 2, filled: 2 },
      { n: 2, capacity: 8, filled: 8 },
      { n: 3, capacity: 18, filled: 2 },
    ]);
  });

  it('has a bilingual nav label for every slug', () => {
    for (const slug of OPS_SLUGS) {
      const key = `ops.nav.${slug}` as keyof typeof OPS_FA;
      expect(OPS_FA[key]).toBeTypeOf('string');
      expect(OPS_FA[key]!.length).toBeGreaterThan(1);
    }
  });
});
