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

function current(): { page: PageDef; params: Record<string, string> } {
  return parse(window.location.hash);
}

export function useRoute(): { page: PageDef; params: Record<string, string> } {
  return useSyncExternalStore(subscribe, current, () => parse(DEFAULT_HASH));
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}
