/**
 * Charter + Control — ports of charter.html ("employer charter as code,
 * v21") and control.html (the access matrix every specialist obeys).
 * The matrix rows are the policy backbone; they render from seed.ts.
 */

import { useSession } from '../../lib/session.js';
import { SEED_CHARTER_MATRIX, SEED_CONTROL } from '../../lib/ops/seed.js';
import type { PolicyLevel } from '../../lib/ops/types.js';
import { Card } from '../../components/ui.js';
import { OpsPage, OpsTable, PolicyTag } from '../../components/ops-ui.js';
import type { I18nKey } from '../../lib/i18n.js';

const MODE_KEYS: Record<'auto' | 'manager' | 'manager_only', I18nKey> = {
  auto: 'ops.policy.auto',
  manager: 'ops.policy.manager',
  manager_only: 'ops.policy.manager_only',
};

const PHASES: readonly I18nKey[] = [
  'ops.charter.p1', 'ops.charter.p2', 'ops.charter.p3', 'ops.charter.p4', 'ops.charter.p5', 'ops.charter.later',
];

export function OpsCharterPage(): React.JSX.Element {
  const { t } = useSession();
  return (
    <OpsPage titleKey="ops.charter.title" kicker={t('ops.charter.sub')}>
      <Card title={t('ops.charter.role')}>
        <p className="text-sm leading-relaxed text-slate-300">{t('ops.charter.roleText')}</p>
      </Card>

      <Card title={t('ops.charter.matrix')}>
        <OpsTable
          columns={[
            { key: 'work', label: t('ops.control.tblWork') },
            { key: 'mode', label: t('ops.charter.mode') },
            { key: 'action', label: t('ops.control.tblAction'), mono: true },
          ]}
          rows={SEED_CHARTER_MATRIX.map((r) => ({
            work: r.work,
            mode: <span className={`text-[11px] font-medium ${r.mode === 'auto' ? 'text-emerald-300' : r.mode === 'manager' ? 'text-amber-300' : 'text-red-300'}`}>{t(MODE_KEYS[r.mode])}</span>,
            action: r.action,
          }))}
        />
      </Card>

      <Card title={t('ops.charter.blocks')}>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {['1 orchestrator', '6 specialists', 'HITL gates locked', 'knowledge: approved only', 'audit: every decision'].map((b) => (
            <span key={b} className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-cyan-200">{b}</span>
          ))}
        </div>
      </Card>

      <Card title={t('ops.charter.phases')}>
        <ol className="flex flex-col gap-2">
          {PHASES.map((key, i) => (
            <li key={key} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-[11px] font-bold text-cyan-300">{i + 1}</span>
              <span className={i === PHASES.length - 1 ? 'text-ink-dim' : ''}>{t(key)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </OpsPage>
  );
}

export function OpsControlPage(): React.JSX.Element {
  const { t } = useSession();
  return (
    <OpsPage titleKey="ops.control.title" kicker={t('ops.control.sub')}>
      <Card title={t('ops.control.roles')}>
        <OpsTable
          columns={[
            { key: 'work', label: t('ops.control.tblWork') },
            { key: 'level', label: t('ops.control.tblLevel') },
            { key: 'action', label: t('ops.control.tblAction'), mono: true },
            { key: 'flow', label: t('ops.control.tblFlow') },
          ]}
          rows={SEED_CONTROL.map((r) => ({
            work: r.work,
            level: <PolicyTag level={r.level} />,
            action: r.action,
            flow: <Badge_ flow={r.flow} />,
          }))}
        />
      </Card>
      <Card title={t('ops.control.future')}>
        <p className="text-xs leading-relaxed text-ink-dim">{t('ops.control.futureText')}</p>
      </Card>
    </OpsPage>
  );
}

function Badge_({ flow }: { flow: string }): React.JSX.Element {
  return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{flow}</span>;
}

export type { PolicyLevel };
