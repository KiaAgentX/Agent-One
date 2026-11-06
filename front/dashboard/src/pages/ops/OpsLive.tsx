/**
 * Live — port of live.html: four gauges, the six status rows and the mock
 * event stream (demo-only by design — the original never touched the real
 * database either, and the port keeps that contract).
 */

import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Button, Card } from '../../components/ui.js';
import { Gauge, OpsPage } from '../../components/ops-ui.js';

const STREAM_POOL: readonly string[] = [
  'inbound · email — catalog request classified',
  'auto · reply_common — FAQ hit (MOQ)',
  'hold · create_quote q-1046 → Approvals',
  'executed · publish_calendar — ordinary post 10:00',
  'inbound · telegram — /menu',
  'auto · create_lead — website form',
  'blocked · payment — never-auto gate',
  'executed · create_ticket — chat medium',
  'auto · followup-check — 3 tasks reopened',
  'hold · change_price — PET-001 gate',
];

export function OpsLivePage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [paused, setPaused] = useState(false);
  const [lines, setLines] = useState<string[]>([STREAM_POOL[0]!, STREAM_POOL[1]!]);
  const idx = useRef(2);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setLines((ls) => [STREAM_POOL[idx.current % STREAM_POOL.length]!, ...ls].slice(0, 12));
      idx.current += 1;
    }, 2600);
    return () => window.clearInterval(id);
  }, [paused]);

  const openTickets = s.tickets.filter((x) => x.status !== 'closed').length;

  return (
    <OpsPage
      titleKey="ops.live.title"
      kicker={t('ops.live.sub')}
      actions={<Button onClick={() => setPaused((p) => !p)}>{paused ? t('ops.live.resume') : t('ops.live.pause')}</Button>}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Gauge ratio={s.counters.in / 400} label={t('ops.live.gInbound')} value={String(s.counters.in)} tone="#22d3ee" />
        <Gauge ratio={s.approvals.filter((a) => a.status === 'pending').length / 6} label={t('ops.live.gQueue')} value={String(s.approvals.filter((a) => a.status === 'pending').length)} tone="#fbbf24" />
        <Gauge ratio={s.counters.auto / 200} label={t('ops.live.gAuto')} value={String(s.counters.auto)} tone="#34d399" />
        <Gauge ratio={openTickets / 10} label={t('ops.live.gTickets')} value={String(openTickets)} tone="#f472b6" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="status">
          <ul className="flex flex-col gap-2 text-xs">
            {([
              ['ops.live.rLeads', 'ops.live.rLeadsHint', 7, 'mint'],
              ['ops.live.rQuotes', 'ops.live.rQuotesHint', s.approvals.filter((a) => a.kind === 'create_quote' && a.status === 'pending').length, 'amber'],
              ['ops.live.rPay', 'ops.live.rPayHint', s.approvals.filter((a) => a.kind === 'payment' && a.status === 'pending').length, 'red'],
              ['ops.live.rWd', 'ops.live.rWdHint', 0, 'red'],
              ['ops.live.rPend', 'ops.live.rPendHint', s.products.filter((p) => !p.visible).length, 'cyan'],
              ['ops.live.rTik', 'ops.live.rTikHint', openTickets, 'mint'],
            ] as const).map(([labelKey, hintKey, value, tone]) => (
              <li key={labelKey} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                <span>
                  <b className="text-xs">{t(labelKey)}</b>
                  <span className="block text-[11px] text-ink-dim">{t(hintKey)}</span>
                </span>
                <span className={`text-lg font-bold tabular-nums ${tone === 'mint' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : tone === 'red' ? 'text-red-300' : 'text-cyan-300'}`}>{value}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={t('ops.live.stream')}
          actions={
            <Button onClick={() => ops.tick()} title="refresh">↻</Button>
          }
        >
          <div className="flex h-72 flex-col gap-1.5 overflow-hidden font-mono text-[11px]" dir="ltr">
            {lines.map((l, i) => (
              <p key={`${i}-${l}`} className={`rounded px-2 py-1.5 ${i === 0 ? 'bg-cyan-400/10 text-cyan-200' : 'text-slate-400'}`} style={{ opacity: 1 - i * 0.07 }}>
                <span className="text-slate-600">{String(12 - i).padStart(2, '0')}s</span> · {l}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">{t('ops.live.demoNote')}</p>
        </Card>
      </div>
    </OpsPage>
  );
}
