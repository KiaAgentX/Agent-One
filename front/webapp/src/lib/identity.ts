/**
 * identity.ts — webapp mirror of back/bot/src/identity.ts.
 * SAME deterministic mapping (user:tg:<id>) so the Mini App shows the exact
 * account id the orchestrator and the ledger use. Kept as a tiny local copy
 * on purpose: front packages must not import from back (layering rule).
 */

export function accountIdForTelegramish(telegramId: number | string): string {
  return `user:tg:${telegramId}`;
}
