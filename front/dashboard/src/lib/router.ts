/**
 * Minimal hash router — no dependency. Hash routing keeps the SPA deployable
 * as static files straight out of Fastify (Phase 6 single service) with zero
 * rewrite rules, and works identically in RTL and LTR.
 *
 * Ops routes (Law 9 Level-A): the 24 Zenovix Ops console pages ported from
 * legacy/agi-main/admin/ops live under /ops/<slug> — `settings` became
 * `variables` and `index` became `desk` to avoid clashing with core routes.
 */

import { useSyncExternalStore } from 'react';

/** The 24 ops slugs, in the console's own order (desk = legacy index). */
export const OPS_SLUGS = [
  'desk', 'hub', 'queue', 'catalog', 'variables', 'soul', 'simulator', 'database',
  'charter', 'inbox', 'website', 'social', 'sales', 'support', 'operations',
  'knowledge', 'brain', 'control', 'audit', 'automation', 'live', 'insights',
  'market', 'ecosystem',
] as const;

export type OpsSlug = (typeof OPS_SLUGS)[number];

export type CoreRoute = '/overview' | '/accounts' | '/escrows' | '/hitl' | '/settings';

export type RoutePath = CoreRoute | `/ops/${OpsSlug}`;

export const CORE_ROUTES: readonly CoreRoute[] = ['/overview', '/accounts', '/escrows', '/hitl', '/settings'];

export const OPS_ROUTES: readonly RoutePath[] = OPS_SLUGS.map((s) => `/ops/${s}` as RoutePath);

export const ROUTES: readonly RoutePath[] = [...CORE_ROUTES, ...OPS_ROUTES];

export const DEFAULT_ROUTE: RoutePath = '/overview';

function isOpsSlug(v: string): v is OpsSlug {
  return (OPS_SLUGS as readonly string[]).includes(v);
}

export function parse(hash: string): RoutePath {
  const raw = hash.replace(/^#/, '') || DEFAULT_ROUTE;
  const candidate = (raw.startsWith('/') ? raw : `/${raw}`) as RoutePath;
  if (candidate.startsWith('/ops/')) {
    const slug = candidate.slice('/ops/'.length);
    return isOpsSlug(slug) ? candidate : DEFAULT_ROUTE;
  }
  return CORE_ROUTES.includes(candidate as CoreRoute) ? candidate : DEFAULT_ROUTE;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function current(): RoutePath {
  return parse(window.location.hash);
}

export function useRoute(): RoutePath {
  return useSyncExternalStore(subscribe, current, () => DEFAULT_ROUTE);
}

export function navigate(path: RoutePath): void {
  if (window.location.hash === `#${path}`) return;
  window.location.hash = path;
}
