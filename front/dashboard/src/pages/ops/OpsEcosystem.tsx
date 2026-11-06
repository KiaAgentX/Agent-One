/**
 * Ecosystem — port of ecosystem.html: the orbital board (channels, agents,
 * HITL gate, stores around the orchestrator core). The original used a
 * THREE 3D scene with a canvas fallback; the port keeps the model and the
 * interactions (node → HUD detail → open the door) as an animated SVG —
 * same nodes, same rings, same copy, no heavy dependency.
 */

import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { navigate } from '../../lib/router.js';
import { useOps } from '../../lib/ops/store.js';
import { SEED_ECO_NODES } from '../../lib/ops/seed.js';
import { Button, Card } from '../../components/ui.js';
import { KpiRow, OpsPage } from '../../components/ops-ui.js';
import type { I18nKey } from '../../lib/i18n.js';

const COLORS: Record<string, string> = {
  core: '#22d3ee',
  gate: '#f472b6',
  channel: '#60a5fa',
  agent: '#a78bfa',
  store: '#34d399',
};

const KIND_KEYS: Record<string, I18nKey> = {
  core: 'ops.eco.kind.core',
  gate: 'ops.eco.kind.gate',
  channel: 'ops.eco.kind.channel',
  agent: 'ops.eco.kind.agent',
  store: 'ops.eco.kind.store',
};

const R = 150;
const CX = 210;
const CY = 210;

function nodePos(ring: number, i: number, count: number): { x: number; y: number } {
  const angle = (2 * Math.PI * i) / Math.max(1, count) - Math.PI / 2;
  return { x: CX + ring * R * Math.cos(angle), y: CY + ring * R * Math.sin(angle) };
}

export function OpsEcosystemPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [selId, setSelId] = useState<string>('core');
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (burst === 0) return;
    const id = window.setTimeout(() => setBurst(0), 1600);
    return () => window.clearTimeout(id);
  }, [burst]);

  const selected = SEED_ECO_NODES.find((n) => n.id === selId) ?? SEED_ECO_NODES[0]!;
  const channels = SEED_ECO_NODES.filter((n) => n.ring === 1);
  const agents = SEED_ECO_NODES.filter((n) => n.ring === 0.72);
  const stores = SEED_ECO_NODES.filter((n) => n.ring === 1.28);

  const packetAnim = (from: { x: number; y: number }, dur: number, delay: number, color: string): React.JSX.Element => (
    <circle r="3" fill={color} opacity="0.9">
      <animate attributeName="cx" values={`${from.x};${CX};${from.x}`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
      <animate attributeName="cy" values={`${from.y};${CY};${from.y}`} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  );

  return (
    <OpsPage
      titleKey="ops.eco.title"
      kicker={t('ops.eco.sub')}
      actions={<Button variant="primary" onClick={() => setBurst((b) => b + 1)}>✦ {t('ops.eco.burst')}</Button>}
    >
      <KpiRow
        items={[
          { label: t('ops.eco.cIn'), value: String(s.counters.in), tone: 'cyan' },
          { label: t('ops.eco.cAuto'), value: String(s.counters.auto), tone: 'mint' },
          { label: t('ops.eco.cHold'), value: String(s.counters.hold), tone: 'amber' },
          { label: t('ops.eco.cOut'), value: String(s.counters.out) },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <svg viewBox="0 0 420 420" className="mx-auto w-full max-w-[460px]" role="img" aria-label={t('ops.eco.title')}>
            {[0.55, 0.72, 1, 1.28].map((ring) => (
              <circle key={ring} cx={CX} cy={CY} r={ring * R} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" />
            ))}
            <circle cx={CX} cy={CY} r="26" fill={COLORS.core!} opacity="0.25" />
            <circle cx={CX} cy={CY} r="16" fill={COLORS.core!} />
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#083344">core</text>

            {/* HITL gate */}
            <g onClick={() => setSelId('hitl')} className="cursor-pointer">
              <circle cx={CX} cy={CY - 0.55 * R} r="13" fill={COLORS.gate!} opacity="0.9" />
              <text x={CX} y={CY - 0.55 * R + 26} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.6)">HITL</text>
            </g>

            {/* agents */}
            {agents.map((n, i) => {
              const p = nodePos(0.72, i, agents.length);
              return (
                <g key={n.id} onClick={() => setSelId(n.id)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="10" fill={COLORS.agent} opacity={selId === n.id ? 1 : 0.8} />
                  <text x={p.x} y={p.y + 20} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.55)">{n.label.split(' ')[0]}</text>
                </g>
              );
            })}

            {/* channels */}
            {channels.map((n, i) => {
              const p = nodePos(1, i, channels.length);
              return (
                <g key={n.id} onClick={() => setSelId(n.id)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="10" fill={COLORS.channel} opacity={selId === n.id ? 1 : 0.8} />
                  <text x={p.x} y={p.y + 20} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.55)">{n.label.split(' ')[0]}</text>
                </g>
              );
            })}

            {/* stores */}
            {stores.map((n, i) => {
              const p = nodePos(1.28, i, stores.length);
              return (
                <g key={n.id} onClick={() => setSelId(n.id)} className="cursor-pointer">
                  <rect x={p.x - 9} y={p.y - 9} width="18" height="18" rx="4" fill={COLORS.store} opacity={selId === n.id ? 1 : 0.8} />
                  <text x={p.x} y={p.y + 22} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.55)">{n.label.split(' ')[0]}</text>
                </g>
              );
            })}

            {/* packets: channels → core → stores */}
            {channels.slice(0, 5).map((n, i) => {
              const p = nodePos(1, i, channels.length);
              return (
                <g key={`pk-${n.id}`}>
                  {packetAnim(p, 2.4 + i * 0.3, i * 0.5, COLORS.channel!)}
                </g>
              );
            })}
            {burst > 0 && stores.map((n, i) => {
              const p = nodePos(1.28, i, stores.length);
              return <g key={`bb-${n.id}`}>{packetAnim({ x: CX, y: CY }, 1.2, i * 0.15, COLORS.store!)}</g>;
            })}
          </svg>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] text-slate-400">
            {(['core', 'gate', 'channel', 'agent', 'store'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: COLORS[k] }} />
                {t(KIND_KEYS[k]!)}
              </span>
            ))}
          </div>
        </Card>

        <Card title={selected.label} subtitle={`${t(KIND_KEYS[selected.kind]!)} · ring ${selected.ring}`}>
          <p className="text-xs leading-relaxed text-slate-300" dir="ltr">{selected.text}</p>
          <Button
            variant="primary"
            onClick={() => navigate(selected.href as never)}
          >
            {t('ops.eco.openDoor')} →
          </Button>
        </Card>
      </div>
    </OpsPage>
  );
}
