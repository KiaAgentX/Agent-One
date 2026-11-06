/**
 * Market — port of market.html: the DropAgent storefront over the Zenovix
 * catalog — search, category chips, sort, product modal. A quote request
 * lands in Approvals (HITL), never automatic.
 */

import { useMemo, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Banner, Badge, Button, Card, Empty } from '../../components/ui.js';
import { OpsModal, OpsPage } from '../../components/ops-ui.js';
import type { CatalogProduct } from '../../lib/ops/types.js';
import type { I18nKey } from '../../lib/i18n.js';
import { tDynamic } from '../../lib/i18n.js';

type SortKey = 'newest' | 'low' | 'high' | 'best';

const SORTS: ReadonlyArray<readonly [SortKey, I18nKey]> = [
  ['newest', 'ops.market.sortNewest'],
  ['low', 'ops.market.sortLow'],
  ['high', 'ops.market.sortHigh'],
  ['best', 'ops.market.sortBest'],
];

export function OpsMarketPage(): React.JSX.Element {
  const { t, lang } = useSession();
  const s = useOps();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [open, setOpen] = useState<CatalogProduct | null>(null);
  const [requested, setRequested] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = s.products.filter((p) => p.visible);
    if (cat !== 'all') list = list.filter((p) => p.category === cat);
    const needle = q.trim().toLowerCase();
    if (needle !== '') {
      list = list.filter((p) => `${p.name} ${p.nameFa} ${p.code}`.toLowerCase().includes(needle));
    }
    switch (sort) {
      case 'low': return [...list].sort((a, b) => a.price - b.price);
      case 'high': return [...list].sort((a, b) => b.price - a.price);
      case 'best': return [...list].sort((a, b) => b.sales - a.sales);
      default: return list;
    }
  }, [s.products, cat, q, sort]);

  const requestQuote = (p: CatalogProduct): void => {
    ops.simSend(`quote for ${p.code} — ${p.name}`, true);
    setRequested(p.code);
    setOpen(null);
  };

  return (
    <OpsPage titleKey="ops.market.title" kicker={t('ops.market.sub')}>
      <Banner tone="amber">{t('ops.market.quoteHITL')}</Banner>
      {requested !== null && <Banner tone="mint">{`create_quote · ${requested} → ${t('ops.nav.queue')}`}</Banner>}

      <div className="flex flex-wrap items-center gap-2">
        <input className="inp w-44 text-xs" placeholder={t('ops.market.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" onClick={() => setCat('all')}
          className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${cat === 'all' ? 'bg-cyan-400/20 font-bold text-cyan-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
          {t('ops.market.all')}
        </button>
        {s.categories.filter((c) => c.active).map((c) => (
          <button key={c.key} type="button" onClick={() => setCat(c.key)}
            className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${cat === c.key ? 'bg-cyan-400/20 font-bold text-cyan-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {c.icon} {tDynamic(lang, `ops.market.cat.${c.key}`)}
          </button>
        ))}
        <select className="inp ms-auto w-auto py-1.5 text-[11px]" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="sort">
          {SORTS.map(([key, labelKey]) => (
            <option key={key} value={key}>{t(labelKey)}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <Empty icon="🛍" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <button key={p.code} type="button" onClick={() => setOpen(p)} className="glass group flex flex-col items-start p-4 text-start transition-colors hover:bg-white/10">
              <span aria-hidden className="text-2xl">{p.icon}</span>
              <span className="mt-2 line-clamp-2 min-h-9 text-xs font-bold">{p.name}</span>
              <span className="mt-1 text-[11px] text-ink-dim">{tDynamic(lang, `ops.market.cat.${p.category}`)} · {p.unit}</span>
              <span className="mt-2 flex w-full items-center justify-between">
                <b className="text-sm text-cyan-300">{p.price === 0 ? t('ops.market.free') : `$${p.price}`}</b>
                <span className="text-[10px] text-slate-500">{p.sales} {t('ops.insights.sales')}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Card title={t('ops.catalog.products')}>
        <p className="text-[11px] text-ink-dim">
          {visible.length}/{s.products.length} · {s.products.filter((p) => !p.visible).length} {t('ops.market.hidden')}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.products.filter((p) => !p.visible).map((p) => (
            <Badge key={p.code} tone="neutral">{p.icon} {p.code}</Badge>
          ))}
        </div>
      </Card>

      {open !== null && (
        <OpsModal
          title={`${open.icon} ${open.name}`}
          onClose={() => setOpen(null)}
          footer={
            <>
              <Button onClick={() => setOpen(null)}>{t('common.close')}</Button>
              <Button variant="primary" onClick={() => requestQuote(open)}>{t('ops.market.requestQuote')}</Button>
            </>
          }
        >
          <ul className="flex flex-col gap-2 text-xs">
            <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.catalog.fCode')}</span><b className="font-mono">{open.code}</b></li>
            {open.nameFa !== '' && (
              <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.catalog.fNameFa')}</span><b dir="rtl">{open.nameFa}</b></li>
            )}
            <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.catalog.fCategory')}</span><Badge tone="cyan">{tDynamic(lang, `ops.market.cat.${open.category}`)}</Badge></li>
            <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.catalog.fPrice')}</span><b className="text-cyan-300">{open.price === 0 ? t('ops.market.free') : `$${open.price}`}</b></li>
            <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.catalog.fUnit')}</span><b>{open.unit}</b></li>
          </ul>
        </OpsModal>
      )}
    </OpsPage>
  );
}
