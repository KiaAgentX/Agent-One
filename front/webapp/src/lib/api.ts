/**
 * api.ts — the webapp data layer.
 *
 * Pages consume typed async calls through `useAsync`. Today the store runs in
 * DEMO mode (structured datasets in demo.ts, 150ms latency) so every one of
 * the 30 pages renders fully offline — same contract the live server will
 * serve via the contracts client (ADR-005). Swapping a method from demo to
 * live is a one-line change HERE; no page ever changes.
 */

import { useCallback, useEffect, useState } from 'react';
import * as demo from './demo';

export type ApiResult<T> = { data: T | null; loading: boolean; error: string | null };

const LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

/** React-friendly async loader — re-runs when the key changes. */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]): ApiResult<T> {
  const [state, setState] = useState<ApiResult<T>>({ data: null, loading: true, error: null });
  const run = useCallback(loader, deps);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    run()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        alive &&
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Local, page-level mutation store — demo mode persists to memory only. */
const listeners = new Set<() => void>();
function emit(): void {
  listeners.forEach((l) => l());
}
export function subscribeStore(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const api = {
  // wallet
  wallet: () => delay(demo.walletState),
  transactions: () => delay([...demo.transactions].sort((a, b) => b.ts.localeCompare(a.ts))),
  deposit: (amount: number) => {
    demo.applyDeposit(amount);
    emit();
    return delay(demo.walletState);
  },
  withdraw: (amount: number) => {
    demo.applyWithdraw(amount);
    emit();
    return delay(demo.walletState);
  },
  transfer: (to: string, amount: number) => {
    demo.applyTransfer(to, amount);
    emit();
    return delay(demo.walletState);
  },

  // market
  products: () => delay(demo.products),
  product: (id: string) => delay(demo.products.find((p) => p.id === id) ?? null),
  orders: () => delay(demo.orders),
  order: (id: string) => delay(demo.orders.find((o) => o.id === id) ?? null),
  escrows: () => delay(demo.escrows),
  bookings: () => delay(demo.bookings),
  booking: (id: string) => delay(demo.bookings.find((b) => b.id === id) ?? null),

  // economy & growth
  economy: () => delay(demo.economyIndicators),
  quests: () => delay(demo.quests),
  quest: (id: string) => delay(demo.quests.find((q) => q.id === id) ?? null),
  leaderboard: () => delay(demo.leaderboard),
  referral: () => delay(demo.referralState),

  // seller
  sales: () => delay(demo.salesStats),
  crm: () => delay(demo.customers),
  addProduct: (input: demo.NewProduct) => {
    const p = demo.applyNewProduct(input);
    emit();
    return delay(p);
  },

  // account & core
  notifications: () => delay(demo.notifications),
  markAllRead: () => {
    demo.markAllRead();
    emit();
    return delay(true);
  },
};
