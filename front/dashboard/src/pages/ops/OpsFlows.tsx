/**
 * The five flow pages — ports of website.html, social.html, sales.html,
 * support.html and operations.html. Each keeps its original tables,
 * policies and actions (advance / publish / escalate / close).
 */

import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Badge, Button, Card } from '../../components/ui.js';
import { KpiRow, OpsPage, OpsTable, PolicyTag } from '../../components/ops-ui.js';
import { SEED_DAILY } from '../../lib/ops/seed.js';

/* ── website.html ───────────────────────────────────────────────────── */

export function OpsWebsitePage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const statusTone = { draft: 'neutral', review: 'amber', published: 'mint' } as const;

  const previewHtml = (): void => {
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Zenovix — preview</title>` +
      `<body style="font-family:system-ui;background:#0b0f1a;color:#e2e8f0;padding:40px;line-height:1.7">` +
      s.webPages.map((p) => `<h2 style="color:#67e8f9">${p.page}</h2><p>status: <b>${p.status}</b> · flow step ${p.step} · policy: ${p.policy}</p>`).join('') +
      `</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
  };

  return (
    <OpsPage
      titleKey="ops.web.title"
      kicker={t('ops.web.sub')}
      actions={<Button onClick={previewHtml}>{t('ops.web.previewHtml')}</Button>}
    >
      <Card title={t('ops.web.pagesEdit')}>
        <OpsTable
          columns={[
            { key: 'page', label: t('ops.web.tblPage') },
            { key: 'status', label: 'status' },
            { key: 'step', label: t('ops.web.tblStep'), num: true },
            { key: 'policy', label: t('ops.sim.dPolicy') },
            { key: 'act', label: '' },
          ]}
          rows={s.webPages.map((p) => ({
            page: p.page,
            status: <Badge tone={statusTone[p.status]}>{t(`ops.web.status.${p.status}`)}</Badge>,
            step: p.step,
            policy: <Badge tone={p.policy === 'stable' ? 'mint' : 'amber'}>{p.policy}</Badge>,
            act: p.step < 5 ? <Button onClick={() => ops.advanceWebPage(p.page)}>{t('ops.common.advance')}</Button> : <span className="text-[11px] text-slate-600">✓</span>,
          }))}
        />
      </Card>
      <Card title={t('ops.web.formLead')}>
        <p className="text-xs leading-relaxed text-ink-dim">
          form → lead → sales flow · every submission is stored before any AI work
        </p>
      </Card>
    </OpsPage>
  );
}

/* ── social.html ────────────────────────────────────────────────────── */

export function OpsSocialPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const policyTone = { template: 'cyan', sales_flow: 'violet', escalate: 'amber', calendar: 'mint' } as const;
  return (
    <OpsPage titleKey="ops.social.title" kicker={t('ops.social.sub')}>
      <Card title={t('ops.social.schedule')}>
        <OpsTable
          columns={[
            { key: 'channel', label: t('ops.social.tblChannel') },
            { key: 'item', label: t('ops.social.tblItem') },
            { key: 'policy', label: t('ops.sim.dPolicy') },
            { key: 'status', label: 'status' },
            { key: 'act', label: '' },
          ]}
          rows={s.social.map((r) => ({
            channel: r.channel,
            item: r.item,
            policy: <Badge tone={policyTone[r.policy]}>{r.policy}</Badge>,
            status: <Badge tone={r.status === 'published' ? 'mint' : r.status === 'held' ? 'amber' : 'neutral'}>{t(`ops.social.status.${r.status}`)}</Badge>,
            act: r.status !== 'published'
              ? <Button variant="primary" onClick={() => ops.publishSocial(r.channel, r.item)}>{r.policy === 'escalate' ? t('ops.common.escalate') : t('ops.common.publish')}</Button>
              : <span className="text-[11px] text-slate-600">✓</span>,
          }))}
        />
      </Card>
      <Card title={t('ops.social.engagement')}>
        <p className="text-xs leading-relaxed text-ink-dim">
          IG comment → template · IG DM (price) → sales flow · claims (“guaranteed…”) → escalate, never answered by the agent
        </p>
      </Card>
    </OpsPage>
  );
}

/* ── sales.html ─────────────────────────────────────────────────────── */

export function OpsSalesPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  return (
    <OpsPage titleKey="ops.sales.title" kicker={t('ops.sales.sub')} flowStep={4}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('ops.sales.leads')}>
          <OpsTable
            columns={[
              { key: 'account', label: t('ops.sales.tblAccount') },
              { key: 'source', label: t('ops.sales.tblSource') },
              { key: 'stage', label: t('ops.sales.tblStage') },
              { key: 'act', label: '' },
            ]}
            rows={s.leads.map((l) => ({
              account: l.account,
              source: l.source,
              stage: <Badge tone={l.stage === 'won' ? 'mint' : l.stage === 'quote' ? 'violet' : l.stage === 'qualified' ? 'cyan' : 'neutral'}>{t(`ops.sales.stage.${l.stage}`)}</Badge>,
              act: l.stage !== 'won' ? <Button onClick={() => ops.advanceLead(l.account)}>{t('ops.common.advance')}</Button> : '✓',
            }))}
          />
        </Card>
        <Card title={t('ops.sales.quotes')}>
          <OpsTable
            columns={[
              { key: 'no', label: t('ops.sales.tblNo'), mono: true },
              { key: 'detail', label: t('ops.sales.tblDetail') },
              { key: 'policy', label: t('ops.sim.dPolicy') },
              { key: 'status', label: 'status' },
            ]}
            rows={s.quotes.map((q) => ({
              no: q.no,
              detail: q.detail,
              policy: <PolicyTag level={q.policy} />,
              status: q.status,
            }))}
          />
        </Card>
      </div>
    </OpsPage>
  );
}

/* ── support.html ───────────────────────────────────────────────────── */

export function OpsSupportPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const prioTone = { high: 'red', medium: 'amber', normal: 'cyan', low: 'neutral' } as const;
  return (
    <OpsPage titleKey="ops.support.title" kicker={t('ops.support.sub')}>
      <Card title={`${t('ops.nav.support')} · ${s.tickets.filter((x) => x.status !== 'closed').length}`}>
        <OpsTable
          columns={[
            { key: 'subject', label: t('ops.support.tblSubject') },
            { key: 'priority', label: t('ops.support.tblPriority') },
            { key: 'sla', label: t('ops.support.tblSla'), num: true },
            { key: 'source', label: t('ops.support.tblSource') },
            { key: 'action', label: t('ops.support.tblAction'), mono: true },
            { key: 'status', label: 'status' },
            { key: 'act', label: '' },
          ]}
          rows={s.tickets.map((x) => ({
            subject: x.subject,
            priority: <Badge tone={prioTone[x.priority]}>{x.priority}</Badge>,
            sla: x.sla,
            source: x.source,
            action: x.action,
            status: <Badge tone={x.status === 'escalated' ? 'red' : x.status === 'closed' ? 'neutral' : x.status === 'firstline' ? 'cyan' : 'amber'}>{t(`ops.support.status.${x.status}`)}</Badge>,
            act: (
              <span className="flex justify-end gap-1.5">
                {x.status !== 'escalated' && x.status !== 'closed' && <Button variant="danger" onClick={() => ops.escalateTicket(x.id)}>↑</Button>}
                {x.status !== 'closed' && <Button onClick={() => ops.closeTicket(x.id)}>✓</Button>}
              </span>
            ),
          }))}
        />
      </Card>
    </OpsPage>
  );
}

/* ── operations.html ────────────────────────────────────────────────── */

export function OpsOperationsPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  return (
    <OpsPage titleKey="ops.operations.title" kicker={t('ops.operations.sub')} flowStep={5}>
      <KpiRow
        items={SEED_DAILY.map(([label, value]) => ({
          label,
          value: String(value),
          tone: label === 'Errors' ? 'red' : undefined,
        }))}
      />
      <Card title={t('ops.operations.extract')}>
        <p className="text-xs leading-relaxed text-ink-dim">{t('ops.operations.note')}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {['08:00 daily-report → compiled', '09:00 followup-check → 11 open', '09:05 calendar-publish → ordinary', 'pending → approvals'].map((chip) => (
            <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">{chip}</span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-dim">
          {t('ops.audit.trail')}: {s.audit.length} · last → {s.audit[0]?.action ?? '—'} @ {s.audit[0]?.time ?? '—'}
        </p>
      </Card>
    </OpsPage>
  );
}
