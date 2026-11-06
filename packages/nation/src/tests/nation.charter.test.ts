/**
 * Nation economy tests — the monetary charter as executable law.
 * IDENTICAL port of AgentX tests/nation-economy.test.ts (node:test → vitest):
 * all 10 original cases, same assertions, same fail-closed expectations.
 */
import { describe, expect, it } from 'vitest';
import {
  assertWithinMintCap,
  checkInvariant,
  clampTaxPercent,
  HITL_THRESHOLD_DINAR,
  MINT_DAILY_CAPS,
  requiresHitl,
  splitTax,
  TAX_DEFAULT_PERCENT,
  TAX_MAX_PERCENT,
  validateDinarAmount,
} from '../charter.js';

describe('charter A4 — tax law', () => {
  it('default tax is the real code default (10%), cap is 90%', () => {
    expect(TAX_DEFAULT_PERCENT).toBe(10);
    expect(TAX_MAX_PERCENT).toBe(90);
  });

  it('clampTaxPercent rejects non-integers and clamps beyond the legal cap', () => {
    expect(() => clampTaxPercent(12.5)).toThrow(RangeError);
    expect(() => clampTaxPercent(Number.NaN)).toThrow(RangeError);
    expect(clampTaxPercent(-5)).toBe(0);
    expect(clampTaxPercent(95)).toBe(TAX_MAX_PERCENT);
    expect(clampTaxPercent(42)).toBe(42);
  });
});

describe('charter A3 — treasury split', () => {
  it('splitTax floors the treasury share — integer exact, no mint/burn by rounding', () => {
    const s = splitTax(105); // 10% of 105 = 10.5 → treasury 10, seller 95
    expect(s).toEqual({ gross: 105, percent: 10, treasury: 10, seller: 95 });
    expect(s.treasury + s.seller).toBe(s.gross);
  });

  it('splitTax conserves the gross at every legal percent', () => {
    for (const p of [0, 1, 7, 10, 33, 90]) {
      const s = splitTax(9_999, p);
      expect(s.treasury + s.seller).toBe(9_999);
      expect(s.treasury).toBeGreaterThanOrEqual(0);
      expect(s.seller).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('charter money validation', () => {
  it('money is integer & positive: floats, negatives and zero are fail-closed', () => {
    expect(() => validateDinarAmount(0)).toThrow(RangeError);
    expect(() => validateDinarAmount(-100)).toThrow(RangeError);
    expect(() => validateDinarAmount(10.5)).toThrow(RangeError);
    expect(() => validateDinarAmount(Number.NaN)).toThrow(RangeError);
    expect(() => validateDinarAmount(1)).not.toThrow();
  });
});

describe('charter A8 — mint caps', () => {
  it('caps are quest 10,000/day, referral 5,000/day', () => {
    expect(MINT_DAILY_CAPS).toEqual({ quest: 10_000, referral: 5_000 });
  });

  it('a mint that crosses the daily cap is rejected, one inside it passes', () => {
    expect(() => assertWithinMintCap('quest', 500, 9_500)).not.toThrow(); // exactly at cap
    expect(() => assertWithinMintCap('quest', 501, 9_500)).toThrow(RangeError);
    expect(() => assertWithinMintCap('referral', 1, 5_000)).toThrow(RangeError);
  });
});

describe('charter A9 — HITL threshold', () => {
  it('actions ≥ 50,000 Đ require a human decision', () => {
    expect(HITL_THRESHOLD_DINAR).toBe(50_000);
    expect(requiresHitl(49_999)).toBe(false);
    expect(requiresHitl(50_000)).toBe(true);
    expect(requiresHitl(-50_000)).toBe(true); // debits count too
  });
});

describe('charter A7 — sacred invariant', () => {
  it('holds when balances ≡ ledger + adjustments', () => {
    const r = checkInvariant(1000, 900, 100);
    expect(r.ok).toBe(true);
    expect(r.gap).toBe(0);
  });

  it('an unexplained gap FAILS the audit — fail-closed, always', () => {
    const r = checkInvariant(187_672, 187_735, 0); // heritage gap without itemization
    expect(r.ok).toBe(false);
    expect(r.gap).toBe(-63);
    expect(r.detail).toMatch(/audit failed/);
  });
});
