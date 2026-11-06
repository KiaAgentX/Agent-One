/**
 * Audit + Automation — ports of audit.html (the trail: every automatic
 * run and manager decision, with idempotency ids) and automation.html
 * (phase-5 cron jobs + the two rule lists).
 */

import { useMemo, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { useOps } from '../../lib/ops/store.js';
import { SEED_JOBS } from '../../lib/ops/seed.js';
import { Badge, Button, Card } from '../../components/ui.js';
import { FlowStrip, OpsPage, OpsTable } from '../../components/ops-ui.js';
import type { I18nKey } from '../../lib/i18n.js';

const RESULT_TONE = { executed: 'mint', approved: 'cyan', rejected: 'red', blocked: 'amber' } as const;

const RESULT_KEYS: Record<string, I18nKey> = {
  executed: 'ops.common.result.executed',
  approved: 'ops.common.result.approved',
  rejected: 'ops.common.result.rejected',
  blocked: 'ops.common.result.blocked',
};

export function OpsAuditPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [actor, setActor] = useState('all');
  const [result, setResult] = useState('all');

  const actors = useMemo(() => ['all', ...new Set(s.audit.map((a) => a.actor))], [s.audit]);
  const rows = s.audit.filter((a) => (actor === 'all' || a.actor === actor) && (result === 'all' || a.result === result));

  return (
    <OpsPage titleKey="ops.audit.title" kicker={t('ops.audit.sub')} flowStep={5}>
      <Card
        title={`${t('ops.audit.trail')} · ${rows.length}`}
        actions={
          <div className="flex flex-wrap gap-1.5">
            {actors.map((a) => (
              <button key={a} type="button" onClick={() => setActor(a)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${actor === a ? 'bg-cyan-400/20 font-bold text-cyan-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                {a === 'all' ? t('ops.audit.all') : a}
              </button>
            ))}
            {(['all', 'executed', 'approved', 'rejected', 'blocked'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setResult(r)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${result === r ? 'bg-violet-400/20 font-bold text-violet-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                {r === 'all' ? t('ops.audit.all') : t(RESULT_KEYS[r]!)}
              </button>
            ))}
          </div>
        }
      >
        <OpsTable
          columns={[
            { key: 'time', label: t('ops.audit.tblTime'), mono: true },
            { key: 'actor', label: t('ops.audit.tblActor') },
            { key: 'action', label: t('ops.audit.tblAction'), mono: true },
            { key: 'result', label: t('ops.audit.tblResult') },
            { key: 'idem', label: t('ops.audit.tblIdem'), mono: true },
          ]}
          rows={rows.map((a, i) => ({
            time: a.time,
            actor: <b className={a.actor === 'agent' ? 'text-slate-300' : 'text-amber-300'}>{a.actor}</b>,
            action: a.action,
            result: <Badge tone={RESULT_TONE[a.result]}>{t(RESULT_KEYS[a.result]!)}</Badge>,
            idem: <span key={i} className="text-slate-500">{a.idem}</span>,
          }))}
        />
      </Card>
    </OpsPage>
  );
}

export function OpsAutomationPage(): React.JSX.Element {
  const { t } = useSession();
  const [jobs, setJobs] = useState(SEED_JOBS.map((j) => ({ ...j })));

  const toggle = (job: string): void => {
    setJobs((js) => js.map((j) => (j.job === job ? { ...j, paused: !j.paused } : j)));
  };

  return (
    <OpsPage titleKey="ops.auto.title" kicker={t('ops.auto.sub')} flowStep={1}>
      <Card title={t('ops.auto.jobs')}>
        <OpsTable
          columns={[
            { key: 'job', label: t('ops.auto.tblJob'), mono: true },
            { key: 'every', label: t('ops.auto.tblEvery'), num: true },
            { key: 'last', label: t('ops.auto.tblLast'), num: true },
            { key: 'may', label: t('ops.auto.tblMay') },
            { key: 'act', label: '' },
          ]}
          rows={jobs.map((j) => ({
            job: j.job,
            every: j.every,
            last: j.lastRun,
            may: j.paused ? <Badge tone="neutral">{t('ops.auto.pause')}</Badge> : <Badge tone="mint">{j.mayAuto}</Badge>,
            act: <Button onClick={() => toggle(j.job)}>{j.paused ? t('ops.auto.resume') : t('ops.auto.pause')}</Button>,
          }))}
        />
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`✓ ${t('ops.auto.autoRules')}`}>
          <p className="text-xs leading-relaxed text-emerald-200/90">{t('ops.auto.autoList')}</p>
        </Card>
        <Card title={`⛔ ${t('ops.auto.stopRules')}`}>
          <p className="text-xs leading-relaxed text-red-200/90">{t('ops.auto.stopList')}</p>
        </Card>
      </div>
      <FlowStrip current={1} />
    </OpsPage>
  );
}
