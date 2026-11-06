/**
 * Desk — port of legacy ops index.html ("Manager desk / Today").
 * Metrics, needs-your-decision, latest conversations, hourly traffic,
 * system panel and quick doors. Every number derives from the ops store.
 */

import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { navigate } from '../../lib/router.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { SEED_HOURLY } from '../../lib/ops/seed.js';
import { Card } from '../../components/ui.js';
import { KpiRow, OpsPage, PolicyTag, SystemDot, downloadJson } from '../../components/ops-ui.js';

export function OpsDeskPage(): React.JSX.Element {
  const { t, adminKey } = useSession();
  const s = useOps();
  const [selected, setSelected] = useState<string | null>(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = (): void => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const pending = s.approvals.filter((a) => a.status === 'pending');
  const approvedToday = s.audit.filter((a) => a.result === 'approved').length;
  const maxHourly = Math.max(1, ...SEED_HOURLY);
  const selectedMail = s.mails.find((m) => m.id === selected) ?? null;

  return (
    <OpsPage
      titleKey="ops.desk.title"
      kicker={t('ops.desk.sub')}
      actions={
        <button type="button" onClick={() => ops.tick()} className="glass px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10">
          <span aria-hidden className="me-1.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
          {clock}
        </button>
      }
    >
      <KpiRow
        items={[
          { label: t('ops.desk.mPending'), value: String(pending.length), tone: 'amber' },
          { label: t('ops.desk.mMsgs'), value: String(s.counters.in) },
          { label: t('ops.desk.mActive'), value: String(s.counters.out) },
          { label: t('ops.desk.mApproved'), value: String(approvedToday), tone: 'mint' },
          { label: t('ops.desk.mTickets'), value: String(s.tickets.filter((x) => x.status !== 'closed').length) },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('ops.desk.pDecide')} subtitle={t('ops.desk.pDecideHint')}>
          {pending.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">{t('ops.desk.noPending')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.slice(0, 4).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                  <span className="font-mono text-[11px] text-cyan-300">{a.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs">{a.summary}</span>
                  <PolicyTag level={a.policy} />
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-400/30 bg-emerald-400/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-400/30"
                    onClick={() => ops.decide(a.id, 'approved', adminKey !== null ? 'manager' : 'Manager')}
                  >
                    {t('ops.common.approve')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/30 bg-red-400/15 px-2.5 py-1 text-[11px] font-medium text-red-300 hover:bg-red-400/25"
                    onClick={() => ops.decide(a.id, 'rejected', adminKey !== null ? 'manager' : 'Manager')}
                  >
                    {t('ops.common.reject')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('ops.desk.pConv')} subtitle={t('ops.desk.pConvHint')}>
          <ul className="flex flex-col gap-1.5">
            {s.mails.slice(0, 5).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m.id === selected ? null : m.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition-colors ${selected === m.id ? 'bg-white/10' : 'bg-white/[0.03] hover:bg-white/[0.07]'}`}
                >
                  <span className={`size-2 shrink-0 rounded-full ${m.status === 'new' ? 'bg-cyan-400' : m.status === 'held' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span className="min-w-0 flex-1 truncate font-medium">{m.title}</span>
                  <span className="shrink-0 text-[11px] text-ink-dim">{m.from}</span>
                </button>
                {selectedMail !== null && selectedMail.id === m.id && (
                  <p className="mt-1 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
                    {selectedMail.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t('ops.desk.pTraffic')}>
          <div className="flex h-32 items-end gap-1" aria-hidden>
            {SEED_HOURLY.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-cyan-400/25 to-cyan-300/70"
                style={{ height: `${Math.round((v / maxHourly) * 100)}%` }}
                title={`${String(i).padStart(2, '0')}:00 — ${v}`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
        </Card>

        <Card title={t('ops.desk.pSystem')}>
          <div className="flex flex-col gap-2">
            <SystemDot label={t('ops.desk.sysApi')} ok detail="v1.6.0" />
            <SystemDot label={t('ops.desk.sysDb')} ok detail="postgres" />
            <SystemDot label={t('ops.desk.sysRedis')} ok detail="streams" />
            <SystemDot label={t('ops.desk.sysTg')} ok detail="@zenovix_bot" />
          </div>
        </Card>
      </div>

      <Card title={t('ops.desk.pDoors')}>
        <div className="flex flex-wrap gap-2">
          {([
            ['/ops/catalog', '+', 'ops.nav.catalog'],
            ['/ops/variables', '⚙', 'ops.nav.variables'],
            ['/ops/soul', '♥', 'ops.nav.soul'],
            ['/ops/queue', '≡', 'ops.nav.queue'],
            ['/ops/hub', '◎', 'ops.nav.hub'],
          ] as const).map(([href, icon, key]) => (
            <button
              key={href}
              type="button"
              onClick={() => navigate(href as never)}
              className="glass inline-flex items-center gap-2 px-3 py-2 text-xs text-slate-200 transition-colors hover:bg-white/10"
            >
              <b aria-hidden className="text-cyan-300">{icon}</b>
              {t(key)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => downloadJson('zenovix-desk.json', { pending: pending.length, counters: s.counters, audit: s.audit.slice(0, 20) })}
            className="glass inline-flex items-center gap-2 px-3 py-2 text-xs text-slate-200 transition-colors hover:bg-white/10"
          >
            <b aria-hidden className="text-cyan-300">⇩</b>
            {t('ops.common.export')}
          </button>
        </div>
      </Card>
    </OpsPage>
  );
}
