/**
 * router.ts — hash router with `:param` support, zero dependencies.
 * Same philosophy as the dashboard router (RULEBOOK Law 2): hash routing
 * keeps the Mini App deployable as static files from Fastify with no
 * rewrite rules, and behaves identically in RTL and LTR.
 */

import { useSyncExternalStore } from 'react';
import { matchRoute, PAGES, type PageDef } from '../routes';

export const DEFAULT_HASH = '/home';

function parse(hash: string): { page: PageDef; params: Record<string, string> } {
  return matchRoute(hash) ?? { page: PAGES[0]!, params: {} };
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

/**
 * useSyncExternalStore requires a STABLE snapshot (Object.is between calls)
 * — parse returns a fresh object, so we cache by hash string. Without this,
 * every render parses anew and React loops (Maximum update depth).
 */
let lastHash: string | null = null;
let lastParsed = parse(DEFAULT_HASH);

function current(): { page: PageDef; params: Record<string, string> } {
  const hash = window.location.hash;
  if (hash !== lastHash) {
    lastHash = hash;
    lastParsed = parse(hash);
  }
  return lastParsed;
}

export function useRoute(): { page: PageDef; params: Record<string, string> } {
  return useSyncExternalStore(subscribe, current, () => parse(DEFAULT_HASH));
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}
