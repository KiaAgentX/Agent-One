/**
 * Ops UI kit — shared primitives for the 24-page Zenovix Ops port.
 * Same Aurora-glass language as ui.tsx, plus the console's own shapes:
 * the 5-step flow strip, policy tags, data tables, SVG gauges/charts,
 * the orbital board and a small editor modal. Logical CSS only — RTL-safe.
 */

import type { ReactNode } from 'react';
import { navigate } from '../lib/router.js';
import { useSession } from '../lib/session.js';
import type { I18nKey } from '../lib/i18n.js';
import { formatMessage } from '../lib/i18n.js';
import type { PolicyLevel } from '../lib/ops/types.js';
import { Badge, Button, Card, type Tone } from './ui.js';

/* ── page frame ─────────────────────────────────────────────────────── */

export function OpsPage({
  titleKey,
  kicker,
  flowStep,
  actions,
  children,
}: {
  titleKey: I18nKey;
  kicker?: string;
  /** 1..5 — highlight the current step of Queue→Review→Decide→Execute→Audit. */
  flowStep?: 1 | 2 | 3 | 4 | 5;
  actions?: ReactNode;
  children: ReactNode;
}): React.JSX.Element {
  const { t } = useSession();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t(titleKey)}</h2>
          {kicker !== undefined && <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-ink-dim">{kicker}</p>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {flowStep !== undefined && <FlowStrip current={flowStep} />}
      {children}
    </div>
  );
}

const FLOW_STEPS: readonly I18nKey[] = ['ops.flow.1', 'ops.flow.2', 'ops.flow.3', 'ops.flow.4', 'ops.flow.5'];

export function FlowStrip({ current }: { current: 1 | 2 | 3 | 4 | 5 }): React.JSX.Element {
  const { t } = useSession();
  return (
    <nav aria-label={t('ops.flow.title')} className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {FLOW_STEPS.map((key, i) => {
        const step = (i + 1) as 1 | 2 | 3 | 4 | 5;
        const active = step === current;
        const done = step < current;
        return (
          <span key={key} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-slate-600">→</span>}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                active
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : done
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200/80'
                    : 'border-white/10 text-slate-500'
              }`}
            >
              <span className={`grid size-4 place-items-center rounded-full text-[9px] font-bold ${active ? 'bg-cyan-400/30' : done ? 'bg-emerald-400/25' : 'bg-white/10'}`}>{step}</span>
              {t(key)}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

/* ── policy tags ────────────────────────────────────────────────────── */

export const POLICY_TONES: Record<PolicyLevel, Tone> = {
  auto: 'mint',
  auto_rules: 'cyan',
  manager: 'amber',
  manager_only: 'red',
};

export function PolicyTag({ level }: { level: PolicyLevel }): React.JSX.Element {
  const { t } = useSession();
  return <Badge tone={POLICY_TONES[level]}>{t(`ops.policy.${level}`)}</Badge>;
}

/* ── data table ─────────────────────────────────────────────────────── */

export interface OpsColumn {
  readonly key: string;
  readonly label: string;
  readonly num?: boolean;
  readonly mono?: boolean;
}

export function OpsTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: readonly OpsColumn[];
  rows: ReadonlyArray<Record<string, ReactNode>>;
  emptyLabel?: string;
}): React.JSX.Element {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">{emptyLabel ?? '—'}</p>;
  }
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[540px] text-xs">
        <thead>
          <tr className="text-ink-dim">
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap border-b border-white/10 px-2 py-2 font-medium ${c.num === true ? 'text-end' : 'text-start'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/5">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-2 py-2 align-middle ${c.num === true ? 'text-end tabular-nums' : ''} ${c.mono === true ? 'font-mono text-[11px]' : ''}`}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── hub glass link ─────────────────────────────────────────────────── */

export function GlassLink({ href, icon, titleKey, desc }: { href: string; icon: string; titleKey: I18nKey; desc: string }): React.JSX.Element {
  const { t } = useSession();
  return (
    <button
      type="button"
      onClick={() => navigate(href as never)}
      className="glass group flex items-start gap-3 p-4 text-start transition-colors hover:bg-white/10"
    >
      <span aria-hidden className="text-xl text-cyan-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{t(titleKey)}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-dim" title={desc}>{desc}</span>
      </span>
      <span aria-hidden className="self-center text-slate-600 transition-transform group-hover:text-cyan-300">→</span>
    </button>
  );
}

/* ── SVG gauge (live.html port) ─────────────────────────────────────── */

export function Gauge({ ratio, label, value, tone = '#34d399' }: { ratio: number; label: string; value: string; tone?: string }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(1, ratio));
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="glass flex flex-col items-center p-4">
      <svg viewBox="0 0 120 120" className="size-28" role="img" aria-label={label}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={R} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${clamped * C} ${C}`} transform="rotate(-90 60 60)"
        />
      </svg>
      <p className="-mt-[86px] translate-y-[43px] text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-[43px] text-[11px] uppercase tracking-wider text-ink-dim">{label}</p>
    </div>
  );
}

/* ── SVG charts (insights.html port) ────────────────────────────────── */

export function LineChart({
  labels, series, height = 150,
}: {
  labels: readonly string[];
  /** up to two series, normalized independently */
  series: ReadonlyArray<{ readonly values: readonly number[]; readonly color: string; readonly label: string }>;
  height?: number;
}): React.JSX.Element {
  const { t } = useSession();
  const W = 560;
  const H = height;
  const P = 22;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const px = (i: number): number => P + (i * (W - 2 * P)) / Math.max(1, labels.length - 1);
  const py = (v: number): number => H - P - (v / max) * (H - 2 * P);
  const every = Math.max(1, Math.ceil(labels.length / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={py(max * f)} y2={py(max * f)} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 5" />
      ))}
      {series.map((s, si) => (
        <g key={si}>
          <polyline fill="none" stroke={s.color} strokeWidth="2" points={s.values.map((v, i) => `${px(i)},${py(v)}`).join(' ')} />
          {s.values.map((v, i) => (
            <circle key={i} cx={px(i)} cy={py(v)} r="2.4" fill={s.color} />
          ))}
        </g>
      ))}
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)">{l}</text>
        ) : null,
      )}
      {series.length > 1 && (
        <g>
          {series.map((s, si) => (
            <g key={si} transform={`translate(${P + si * 110}, 12)`}>
              <rect width="8" height="3" y="-3" fill={s.color} rx="1.5" />
              <text x="12" y="1" fontSize="9" fill="rgba(255,255,255,0.6)">{s.label === '__other' ? '' : s.label}</text>
            </g>
          ))}
        </g>
      )}
      {series.length === 1 && (
        <text x={P} y="12" fontSize="9" fill="rgba(255,255,255,0.6)">{t('common.total')} {max}</text>
      )}
    </svg>
  );
}

export function BarChart({ labels, values, color = '#22d3ee', height = 150 }: { labels: readonly string[]; values: readonly number[]; color?: string; height?: number }): React.JSX.Element {
  const W = 560;
  const H = height;
  const P = 22;
  const max = Math.max(1, ...values);
  const bw = (W - 2 * P) / values.length;
  const every = Math.max(1, Math.ceil(labels.length / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {values.map((v, i) => {
        const h = (v / max) * (H - 2 * P);
        return (
          <g key={i}>
            <rect x={P + i * bw + bw * 0.15} y={H - P - h} width={bw * 0.7} height={Math.max(2, h)} rx="2" fill={color} opacity={0.35 + 0.65 * (v / max)} />
            {i % every === 0 && (
              <text x={P + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)">{labels[i]}</text>
            )}
          </g>
        );
      })}
      <text x={P} y="12" fontSize="9" fill="rgba(255,255,255,0.6)">{`max ${max}`}</text>
    </svg>
  );
}

/* ── editor modal (database/catalog row editors) ────────────────────── */

export function OpsModal({
  title, onClose, children, footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="glass max-h-[85vh] w-full max-w-xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <Button onClick={onClose} title="close">{'✕'}</Button>
        </header>
        {children}
        {footer !== undefined && <footer className="mt-5 flex justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  );
}

/* ── misc ───────────────────────────────────────────────────────────── */

export function KpiRow({ items }: { items: ReadonlyArray<{ label: string; value: string; tone?: Tone }> }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="glass p-3">
          <p className="text-[11px] text-ink-dim">{it.label}</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${it.tone === 'mint' ? 'text-emerald-300' : it.tone === 'amber' ? 'text-amber-300' : it.tone === 'red' ? 'text-red-300' : 'text-ink'}`}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Read-only row for the system panel on the desk. */
export function SystemDot({ label, ok, detail }: { label: string; ok: boolean; detail?: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <span className="flex items-center gap-2 text-xs">
        <span aria-hidden className={`size-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <span className="font-medium text-slate-200">{label}</span>
      </span>
      {detail !== undefined && <span className="text-[11px] text-ink-dim">{detail}</span>}
    </div>
  );
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { formatMessage };
