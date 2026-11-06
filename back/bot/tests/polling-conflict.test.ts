/**
 * Deploy-overlap resilience — the polling 409 contract.
 * A fresh container racing the DRAINING old one can lose the getUpdates
 * long-poll with a transient 409; the bot must retry (bounded) instead of
 * crash-looping the whole service. A genuinely permanent second instance
 * still exhausts the budget and fails fast — the honest state for a money bot.
 */

import { describe, expect, it } from 'vitest';
import { isPollingConflict, POLLING_CONFLICT_RETRY_DELAYS_MS } from '../src/main.js';

describe('polling 409 — deploy-overlap resilience', () => {
  it('classifies Telegram polling conflicts as transient', () => {
    expect(isPollingConflict(new Error("Call to 'getUpdates' failed! (409: Conflict: terminated by other getUpdates request; make sure that only one bot instance is running)"))).toBe(true);
    expect(isPollingConflict(new Error('409: Conflict: can\'t use getUpdates method while webhook is active'))).toBe(true);
    expect(isPollingConflict('terminated by other getUpdates request')).toBe(true);
  });

  it('never treats other startup failures as retryable (fail-fast stays intact)', () => {
    expect(isPollingConflict(new Error('Call to \'getMe\' failed! (401: Unauthorized)'))).toBe(false);
    expect(isPollingConflict(new Error('TELEGRAM_BOT_TOKEN is required'))).toBe(false);
    expect(isPollingConflict(new Error('fetch failed'))).toBe(false);
    expect(isPollingConflict(undefined)).toBe(false);
  });

  it('retry budget covers Railway\'s drain window, then gives up (< 2.5 min)', () => {
    expect(POLLING_CONFLICT_RETRY_DELAYS_MS.length).toBeGreaterThanOrEqual(5);
    const total = POLLING_CONFLICT_RETRY_DELAYS_MS.reduce((sum, d) => sum + d, 0);
    expect(total).toBeGreaterThan(60_000); // long enough for the old container to die
    expect(total).toBeLessThan(150_000); // short enough that a real double-run still crash-loops
    for (const delay of POLLING_CONFLICT_RETRY_DELAYS_MS) expect(delay).toBeGreaterThan(0);
  });
});
