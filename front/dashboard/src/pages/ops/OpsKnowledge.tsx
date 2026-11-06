/**
 * Knowledge + Brain — ports of knowledge.html (draft → review → approve →
 * index pipeline; only approved docs answer) and brain.html (the Bohr
 * atom: nucleus = charter, shell n holds 2n² particles, overflow spawns
 * shell n+1 — the knowledge-atom.js math rendered as SVG).
 */

import { useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Badge, Button, Card, Field } from '../../components/ui.js';
import { OpsPage, OpsTable } from '../../components/ops-ui.js';
import { formatMessage } from '../../lib/i18n.js';

/* ── knowledge.html ─────────────────────────────────────────────────── */

const SENS_TONE = { public: 'mint', internal: 'cyan', confidential: 'red' } as const;
const STEP_TONE = { draft: 'neutral', review: 'amber', approved: 'violet', indexed: 'mint', manager_only: 'red' } as const;

export function OpsKnowledgePage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  return (
    <OpsPage titleKey="ops.knowledge.title" kicker={t('ops.knowledge.sub')}>
      <Card title={t('ops.nav.knowledge')}>
        <OpsTable
          columns={[
            { key: 'doc', label: t('ops.knowledge.tblDoc') },
            { key: 'version', label: t('ops.knowledge.tblVersion'), num: true },
            { key: 'sens', label: t('ops.knowledge.tblSens') },
            { key: 'step', label: t('ops.knowledge.tblStep') },
            { key: 'act', label: '' },
          ]}
          rows={s.docs.map((d) => ({
            doc: d.doc,
            version: d.version,
            sens: <Badge tone={SENS_TONE[d.sensitivity]}>{t(`ops.knowledge.sens.${d.sensitivity}`)}</Badge>,
            step: <Badge tone={STEP_TONE[d.step]}>{t(`ops.knowledge.step.${d.step}`)}</Badge>,
            act: d.step !== 'indexed' && d.step !== 'manager_only'
              ? <Button variant="primary" onClick={() => ops.advanceDoc(d.doc)}>{t('ops.common.advance')}</Button>
              : <span className="text-[11px] text-slate-600">✓</span>,
          }))}
        />
      </Card>
      <Card title={t('ops.knowledge.mayUse')}>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {s.docs.filter((d) => d.step === 'indexed' && d.sensitivity !== 'confidential').map((d) => (
            <span key={d.doc} className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
              ✓ {d.doc} v{d.version}
            </span>
          ))}
          {s.docs.filter((d) => d.step !== 'indexed' || d.sensitivity === 'confidential').map((d) => (
            <span key={d.doc} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-500 line-through">
              {d.doc}
            </span>
          ))}
        </div>
      </Card>
    </OpsPage>
  );
}

/* ── brain.html — Bohr atom ─────────────────────────────────────────── */

export function bohrShells(count: number): ReadonlyArray<{ n: number; capacity: number; filled: number }> {
  const shells: Array<{ n: number; capacity: number; filled: number }> = [];
  let left = count;
  for (let n = 1; left > 0; n++) {
    const capacity = 2 * n * n;
    const filled = Math.min(capacity, left);
    shells.push({ n, capacity, filled });
    left -= filled;
  }
  return shells;
}

export function OpsBrainPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [selId, setSelId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('ops');
  const [sens, setSens] = useState<'public' | 'internal' | 'confidential'>('internal');

  const shells = bohrShells(s.electrons.length);
  const selected = s.electrons.find((e) => e.id === selId) ?? null;
  const posById = new Map<string, { x: number; y: number }>();
  let ei = 0;
  for (const shell of shells) {
    for (let k = 0; k < shell.filled; k++) {
      const e = s.electrons[ei];
      ei += 1;
      if (e === undefined) break;
      const angle = (2 * Math.PI * k) / shell.capacity - Math.PI / 2;
      const r = shell.n * 34;
      posById.set(e.id, { x: 110 + r * Math.cos(angle), y: 110 + r * Math.sin(angle) });
    }
  }
  const SENS_COLOR: Record<string, string> = { public: '#34d399', internal: '#22d3ee', confidential: '#f87171' };

  return (
    <OpsPage titleKey="ops.brain.title" kicker={t('ops.brain.sub')}>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card title={t('ops.brain.nucleus')}>
          <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[320px]" role="img">
            {shells.map((sh) => (
              <circle key={sh.n} cx="110" cy="110" r={sh.n * 34} fill="none" stroke="rgba(255,255,255,0.10)" strokeDasharray="3 5" />
            ))}
            <circle cx="110" cy="110" r="17" fill="url(#nuc)" />
            <defs>
              <radialGradient id="nuc">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="100%" stopColor="#0891b2" />
              </radialGradient>
            </defs>
            <text x="110" y="146" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)">charter</text>
            {s.electrons.map((e) => {
              const p = posById.get(e.id);
              if (p === undefined) return null;
              return (
                <g key={e.id} onClick={() => setSelId(e.id)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r={selId === e.id ? 7 : 5} fill={SENS_COLOR[e.sensitivity]} opacity={selId === e.id ? 1 : 0.85} />
                  <title>{e.title}</title>
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px]">
            {shells.map((sh) => (
              <span key={sh.n} className="rounded-full bg-white/5 px-2 py-0.5 text-slate-400">
                shell {sh.n} · {formatMessage(t('ops.brain.capacity'), { n: sh.filled, cap: sh.capacity })}
              </span>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title={t('ops.brain.electron')}>
            {selected === null ? (
              <p className="py-4 text-center text-xs text-slate-500">{t('ops.brain.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-xs">
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.knowledge.tblDoc')}</span><b>{selected.title}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.knowledge.tblSens')}</span><Badge tone={SENS_TONE[selected.sensitivity]}>{t(`ops.knowledge.sens.${selected.sensitivity}`)}</Badge></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.brain.fDomain')}</span><b className="font-mono text-[11px]">{selected.domain}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.knowledge.tblVersion')}</span><b>v{selected.version}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.knowledge.tblStep')}</span><b>{t(`ops.knowledge.step.${selected.status === 'approved' ? 'indexed' : 'draft'}`)}</b></li>
              </ul>
            )}
          </Card>
          <Card title={t('ops.brain.addElectron')}>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim() === '') return;
                ops.addElectron(title.trim(), sens, domain.trim() || 'ops');
                setTitle('');
              }}
            >
              <Field label={t('ops.brain.fTitle')}>
                <input className="inp text-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('ops.brain.fDomain')}>
                  <input className="inp text-xs" dir="ltr" value={domain} onChange={(e) => setDomain(e.target.value)} />
                </Field>
                <Field label={t('ops.knowledge.tblSens')}>
                  <select className="inp text-xs" value={sens} onChange={(e) => setSens(e.target.value as typeof sens)}>
                    <option value="public">{t('ops.knowledge.sens.public')}</option>
                    <option value="internal">{t('ops.knowledge.sens.internal')}</option>
                    <option value="confidential">{t('ops.knowledge.sens.confidential')}</option>
                  </select>
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={title.trim() === ''}>{t('ops.common.add')}</Button>
            </form>
          </Card>
        </div>
      </div>
    </OpsPage>
  );
}
