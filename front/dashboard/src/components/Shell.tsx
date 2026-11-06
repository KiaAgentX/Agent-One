/**
 * Shell — RTL-aware chrome: brand header, sidebar nav (logical start side),
 * language toggle and admin session indicator. The sidebar has two
 * sections: the v3 economy console and the 24-door Zenovix Ops console
 * (ported from legacy/agi-main/admin/ops, Law 9 Level-A). The sidebar
 * collapses to a horizontal chip row on small screens.
 */

import type { ReactNode } from 'react';
import { useSession } from '../lib/session.js';
import { navigate, useRoute, CORE_ROUTES, type CoreRoute, type RoutePath } from '../lib/router.js';
import type { I18nKey } from '../lib/i18n.js';
import { Badge } from './ui.js';

const NAV_ICONS: Record<CoreRoute, string> = {
  '/overview': '◈',
  '/accounts': '◆',
  '/escrows': '⬡',
  '/hitl': '✋',
  '/settings': '⚙',
};

const NAV_LABEL: Record<CoreRoute, I18nKey> = {
  '/overview': 'nav.overview',
  '/accounts': 'nav.accounts',
  '/escrows': 'nav.escrows',
  '/hitl': 'nav.hitl',
  '/settings': 'nav.settings',
};

const ADMIN_ROUTES: ReadonlySet<string> = new Set(['/accounts', '/escrows', '/hitl']);

/** The ops rail mirrors the legacy console: 7 command doors, the rest under "More". */
const OPS_PRIMARY: ReadonlyArray<readonly [string, string]> = [
  ['/ops/desk', '⌘'],
  ['/ops/queue', '☰'],
  ['/ops/catalog', '▬'],
  ['/ops/variables', '⚑'],
  ['/ops/soul', '♥'],
  ['/ops/simulator', '🗨'],
  ['/ops/database', '🗄'],
];

const OPS_MORE: ReadonlyArray<readonly [string, string]> = [
  ['/ops/hub', '◎'],
  ['/ops/charter', '⚖'],
  ['/ops/control', '⚙'],
  ['/ops/inbox', '✉'],
  ['/ops/website', '🌐'],
  ['/ops/social', '▦'],
  ['/ops/sales', '📈'],
  ['/ops/support', '☎'],
  ['/ops/operations', '✳'],
  ['/ops/knowledge', '▤'],
  ['/ops/brain', '◉'],
  ['/ops/audit', '≡'],
  ['/ops/automation', '↻'],
  ['/ops/live', '●'],
  ['/ops/insights', '📈'],
  ['/ops/market', '🛍'],
  ['/ops/ecosystem', '∴'],
];

function opsLabelKey(slug: string): I18nKey {
  return `ops.nav.${slug}` as I18nKey;
}

export function Shell({ children }: { children: ReactNode }): React.JSX.Element {
  const { t, lang, setLang, adminKey } = useSession();
  const route = useRoute();

  const coreItems = CORE_ROUTES.map((path) => {
    const locked = ADMIN_ROUTES.has(path) && adminKey === null;
    const active = route === path;
    return (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          active ? 'bg-white/10 font-bold text-ink' : 'text-ink-dim hover:bg-white/5 hover:text-slate-200'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        <span className={active ? 'text-emerald-300' : 'text-slate-500'}>{NAV_ICONS[path]}</span>
        <span className="flex-1 text-start">{t(NAV_LABEL[path])}</span>
        {locked && <span className="text-[10px] text-amber-300/80">🔒</span>}
      </button>
    );
  });

  const opsButton = ([path, icon]: readonly [string, string]): React.JSX.Element => {
    const locked = adminKey === null;
    const active = route === path;
    const slug = path.slice('/ops/'.length);
    return (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path as RoutePath)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
          active ? 'bg-cyan-400/15 font-bold text-cyan-200' : 'text-ink-dim hover:bg-white/5 hover:text-slate-200'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        <span aria-hidden className={active ? 'text-cyan-300' : 'text-slate-500'}>{icon}</span>
        <span className="flex-1 truncate text-start">{t(opsLabelKey(slug))}</span>
        {locked && <span className="text-[10px] text-amber-300/80">🔒</span>}
      </button>
    );
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DropAgentX v3 logo"
            className="size-10 rounded-xl object-cover ring-1 ring-white/10"
          />
          <div>
            <h1 className="text-lg font-bold leading-tight">
              <span className="brand-gradient">{t('app.brand')}</span>
              <span className="text-slate-400"> v3</span>
            </h1>
            <p className="text-[11px] text-ink-dim">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="violet">{t('ops.consoleTag')}</Badge>
          {adminKey !== null ? (
            <Badge tone="mint">admin</Badge>
          ) : (
            <Badge tone="neutral">{t('settings.keyUnset')}</Badge>
          )}
          <button
            type="button"
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="glass px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
            title="fa / en"
          >
            {lang === 'fa' ? 'EN' : 'فا'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 lg:flex-row">
        <nav className="lg:sticky lg:top-5 lg:h-fit lg:w-60 lg:shrink-0" aria-label="main">
          <div className="glass flex gap-2 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {coreItems}
          </div>
          <details className="glass mt-2 hidden p-2 lg:block" open>
            <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">
              {t('ops.section.command')}
            </summary>
            <div className="mt-1 flex flex-col gap-0.5">{OPS_PRIMARY.map(opsButton)}</div>
            <details className="mt-1">
              <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('ops.section.flows')}
              </summary>
              <div className="mt-1 flex flex-col gap-0.5">{OPS_MORE.map(opsButton)}</div>
            </details>
          </details>
          {/* mobile: flat chip row of the ops doors */}
          <div className="glass mt-2 flex gap-2 overflow-x-auto p-2 lg:hidden">
            {[...OPS_PRIMARY, ...OPS_MORE].map(opsButton)}
          </div>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
