/**
 * Insights — port of insights.html: new-vs-active line, daily volume bars,
 * top products, category share, and the JSON snapshot button.
 */

import { useSession } from '../../lib/session.js';
import { tDynamic } from '../../lib/i18n.js';
import { useOps } from '../../lib/ops/store.js';
import { SEED_14D_CONTACTS, SEED_14D_LABELS, SEED_14D_VOLUME } from '../../lib/ops/seed.js';
import { Card } from '../../components/ui.js';
import { BarChart, LineChart, OpsPage, downloadJson } from '../../components/ops-ui.js';

export function OpsInsightsPage(): React.JSX.Element {
  const { t, lang } = useSession();
  const s = useOps();

  const top = [...s.products].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const salesTotal = top.reduce((acc, p) => acc + p.sales, 0);
  const catAgg = s.categories.map((c) => ({
    key: c.key,
    sales: s.products.filter((p) => p.category === c.key).reduce((acc, p) => acc + p.sales, 0),
  }));
  const catMax = Math.max(1, ...catAgg.map((c) => c.sales));

  return (
    <OpsPage
      titleKey="ops.insights.title"
      kicker={t('ops.insights.sub')}
      actions={
        <button
          type="button"
          onClick={() => downloadJson('zenovix-insights.json', { window: '14d', labels: SEED_14D_LABELS, contacts: SEED_14D_CONTACTS, volume: SEED_14D_VOLUME, topProducts: top.map((p) => ({ code: p.code, sales: p.sales })) })}
          className="glass px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10"
        >
          ⤓ JSON
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('ops.insights.newActive')}>
          <LineChart
            labels={SEED_14D_LABELS}
            series={[
              { values: SEED_14D_CONTACTS.map((p) => p[0]!), color: '#f472b6', label: t('ops.insights.newSeries') },
              { values: SEED_14D_CONTACTS.map((p) => p[1]!), color: '#22d3ee', label: t('ops.insights.activeSeries') },
            ]}
          />
        </Card>
        <Card title={t('ops.insights.dailyVolume')}>
          <BarChart labels={SEED_14D_LABELS} values={SEED_14D_VOLUME} />
        </Card>
        <Card title={t('ops.insights.topProducts')}>
          <ul className="flex flex-col gap-2.5">
            {top.map((p) => (
              <li key={p.code}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{p.icon}</span>
                    <span className="truncate font-medium">{p.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-dim">{p.sales} {t('ops.insights.sales')}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-400/60 to-cyan-300/80" style={{ width: `${Math.round((p.sales / Math.max(1, top[0]!.sales)) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('ops.insights.categories')}>
          <ul className="flex flex-col gap-2.5">
            {catAgg.map((c) => (
              <li key={c.key}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{tDynamic(lang, `ops.market.cat.${c.key}`)}</span>
                  <span className="tabular-nums text-ink-dim">{c.sales}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-emerald-400/60" style={{ width: `${Math.round((c.sales / catMax) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-ink-dim">{t('common.total')}: {salesTotal} {t('ops.insights.sales')}</p>
        </Card>
      </div>
    </OpsPage>
  );
}
