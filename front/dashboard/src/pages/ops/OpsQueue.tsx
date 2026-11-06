/**
 * Approvals — port of queue.html. Live queue (decide with a real id),
 * legacy console cards kept for the /decide contract, and the four hard
 * gates that never run automatically.
 */

import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { SEED_HARD_GATES } from '../../lib/ops/seed.js';
import { Badge, Card, Empty } from '../../components/ui.js';
import { FlowStrip, OpsPage, OpsTable, PolicyTag } from '../../components/ops-ui.js';

export function OpsQueuePage(): React.JSX.Element {
  const { t, adminKey } = useSession();
  const s = useOps();
  const pending = s.approvals.filter((a) => a.status === 'pending');
  const decided = s.approvals.filter((a) => a.status !== 'pending');
  const manager = adminKey !== null ? 'manager' : 'Manager';

  return (
    <OpsPage titleKey="ops.queue.title" kicker={t('ops.queue.sub')} flowStep={3}>
      <Card title={`${t('ops.queue.live')} · ${pending.length}`} subtitle={t('ops.queue.liveHint')}>
        {pending.length === 0 ? (
          <Empty icon="✓" />
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((a) => (
              <li key={a.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-cyan-300">{a.id}</span>
                  <Badge tone="neutral">{a.kind}</Badge>
                  <PolicyTag level={a.policy} />
                  <span className="ms-auto text-[11px] text-ink-dim">{a.createdAt} · {t('ops.queue.channel')}: {a.channel}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{a.summary}</p>
                <p className="mt-0.5 text-[11px] text-ink-dim">{t('ops.queue.requester')}: {a.requester}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-400/30 bg-emerald-400/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/30"
                    onClick={() => ops.decide(a.id, 'approved', manager)}
                  >
                    {t('ops.common.approve')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/30 bg-red-400/15 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-400/25"
                    onClick={() => ops.decide(a.id, 'rejected', manager)}
                  >
                    {t('ops.common.reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('ops.queue.legacy')} subtitle={t('ops.queue.legacyHint')}>
          <OpsTable
            columns={[
              { key: 'no', label: t('ops.sales.tblNo'), mono: true },
              { key: 'detail', label: t('ops.sales.tblDetail') },
              { key: 'policy', label: t('ops.sim.dPolicy') },
              { key: 'status', label: t('hitl.status') },
            ]}
            rows={s.quotes.map((q) => ({
              no: q.no,
              detail: q.detail,
              policy: <PolicyTag level={q.policy} />,
              status: q.status,
            }))}
          />
        </Card>

        <Card title={t('ops.queue.gates')} subtitle={t('ops.queue.gatesHint')}>
          <OpsTable
            columns={[
              { key: 'action', label: t('ops.queue.gAction'), mono: true },
              { key: 'why', label: t('ops.queue.gWhy') },
            ]}
            rows={SEED_HARD_GATES.map(([action, why]) => ({ action: <span className="text-red-300">{action}</span>, why }))}
          />
          {decided.length > 0 && (
            <p className="mt-3 text-[11px] text-ink-dim">
              {decided.map((d) => `${d.id} → ${d.status === 'approved' ? '✓' : '✕'}`).join(' · ')}
            </p>
          )}
        </Card>
      </div>
    </OpsPage>
  );
}
