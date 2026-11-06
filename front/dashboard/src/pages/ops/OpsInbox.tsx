/**
 * Inbox — port of inbox.html: classify → read → decide. Ordinary mail
 * executes under rules; sensitive mail (finance, quotes) holds for the
 * manager. Every decision logs into the audit trail via the store.
 */

import { useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Badge, Button, Card, Empty } from '../../components/ui.js';
import { FlowStrip, OpsPage } from '../../components/ops-ui.js';
import type { I18nKey } from '../../lib/i18n.js';

const CATS: ReadonlyArray<readonly [string, I18nKey]> = [
  ['all', 'ops.inbox.filterAll'],
  ['sales', 'ops.inbox.filterSales'],
  ['support', 'ops.inbox.filterSupport'],
  ['ops', 'ops.inbox.filterOps'],
  ['finance', 'ops.inbox.filterFinance'],
];

export function OpsInboxPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [cat, setCat] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = s.mails.filter((m) => cat === 'all' || m.cat === cat);
  const open = s.mails.find((m) => m.id === openId) ?? null;

  const statusTone = (st: string): 'mint' | 'amber' | 'red' | 'cyan' =>
    st === 'replied' ? 'mint' : st === 'held' ? 'amber' : st === 'rejected' ? 'red' : 'cyan';

  return (
    <OpsPage titleKey="ops.inbox.title" kicker={t('ops.inbox.sub')} flowStep={2}>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card
          title={`${t('ops.nav.inbox')} · ${list.length}`}
          actions={
            <div className="flex flex-wrap gap-1.5">
              {CATS.map(([key, labelKey]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCat(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${cat === key ? 'bg-cyan-400/20 font-bold text-cyan-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          }
        >
          {list.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(m.id === openId ? null : m.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-start transition-colors ${
                      openId === m.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`size-2 shrink-0 rounded-full ${m.status === 'new' ? 'bg-cyan-400' : m.status === 'held' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold">{m.title}</span>
                      <Badge tone={statusTone(m.status)}>{t(`ops.inbox.status.${m.status}`)}</Badge>
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-ink-dim">
                      <span className="truncate">{m.from}</span>
                      <span className="ms-auto shrink-0 font-mono text-cyan-300/80">{m.action}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('ops.inbox.reader')}>
          {open === null ? (
            <Empty icon="✉" />
          ) : (
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <p className="text-[11px] text-ink-dim">{open.cat} · {t('ops.inbox.proposed')}</p>
                <h3 className="mt-1 text-sm font-bold text-ink">{open.title}</h3>
                <p className="mt-0.5 text-[11px] text-ink-dim">{open.from}</p>
              </div>
              <p className="rounded-lg border border-white/5 bg-black/20 p-3 leading-relaxed text-slate-300">{open.body}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={open.policy === 'auto' ? 'mint' : 'amber'}>
                  {open.policy === 'auto' ? t('ops.inbox.autoTag') : t('ops.inbox.holdTag')}
                </Badge>
                <span className="font-mono text-[11px] text-cyan-300">{open.action}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {open.policy === 'hold' ? (
                  <>
                    <Button variant="primary" onClick={() => ops.decideMail(open.id, 'replied')}>{t('ops.inbox.approveSend')}</Button>
                    <Button variant="danger" onClick={() => ops.decideMail(open.id, 'rejected')}>{t('ops.common.reject')}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="primary" onClick={() => ops.decideMail(open.id, 'replied')}>{t('ops.inbox.keepAuto')}</Button>
                    <Button onClick={() => ops.decideMail(open.id, 'held')}>{t('ops.inbox.holdManager')}</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </OpsPage>
  );
}
