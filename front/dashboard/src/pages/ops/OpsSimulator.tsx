/**
 * Simulator — port of simulator.html: the bot inside the console. A local
 * pipeline reproduces the real one (intent → route → policy gate → reply
 * or hold), with session files, quick commands and the "last turn" panel.
 * Holds mirror the never-auto gates exactly.
 */

import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Badge, Button, Card } from '../../components/ui.js';
import { OpsPage, PolicyTag } from '../../components/ops-ui.js';

const QUICK = ['/start', 'menu', 'services', 'quote', 'support', 'contact', 'faq', 'my requests'] as const;

const LANGS = ['auto', 'English', 'العربية', 'فارسی', 'Türkçe', 'Русский', 'Deutsch', 'Français', 'Español'] as const;

interface SimFile {
  readonly name: string;
  readonly size: number;
}

export function OpsSimulatorPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [text, setText] = useState('');
  const [lang, setLang] = useState<(typeof LANGS)[number]>('auto');
  const [files, setFiles] = useState<SimFile[]>([]);
  const [session, setSession] = useState<string>(() => `s${Date.now().toString(36)}`);
  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [s.simMessages.length]);

  const send = (raw?: string): void => {
    const msg = raw ?? text;
    if (msg.trim() === '') return;
    ops.simSend(msg + (files.length > 0 ? ` [${files.length} file(s)]` : ''), true);
    setText('');
    setFiles([]);
  };

  const onPick = (fl: FileList | null): void => {
    if (fl === null) return;
    const next = [...files];
    for (const f of Array.from(fl)) {
      if (next.length >= 8) break;
      next.push({ name: f.name, size: f.size });
    }
    setFiles(next);
  };

  return (
    <OpsPage titleKey="ops.sim.title" kicker={t('ops.sim.sub')}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card
          title={t('ops.sim.chat')}
          subtitle={`session — ${session}`}
          actions={
            <>
              <Button onClick={() => { setSession(`s${Date.now().toString(36)}`); ops.simReset(); }}>{t('ops.sim.newSession')}</Button>
              <Button variant="danger" onClick={() => ops.simReset()}>{t('ops.sim.forget')}</Button>
            </>
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
              >
                {q}
              </button>
            ))}
            <select className="inp ms-auto w-auto py-1 text-[11px]" value={lang} onChange={(e) => setLang(e.target.value as (typeof LANGS)[number])} aria-label={t('ops.sim.lang')}>
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div ref={logRef} className="flex h-80 flex-col gap-2 overflow-y-auto rounded-lg border border-white/5 bg-black/30 p-3" dir="ltr">
            {s.simMessages.length === 0 && <p className="my-auto text-center text-xs text-slate-500">{t('ops.sim.empty')}</p>}
            {s.simMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.kind === 'user'
                    ? 'ms-auto bg-emerald-400/20 text-emerald-100'
                    : m.kind === 'bot'
                      ? 'me-auto bg-white/10 text-slate-200'
                      : 'mx-auto bg-cyan-400/10 font-mono text-[10px] text-cyan-300'
                }`}
              >
                {m.text}
                <span className="mt-1 block text-[9px] opacity-50">{m.time}</span>
              </div>
            ))}
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="inp flex-1 text-xs"
              dir="ltr"
              value={text}
              placeholder={t('ops.sim.placeholder')}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" variant="primary" title={t('ops.sim.attach')} onClick={() => fileRef.current?.click()}>＋</Button>
            <Button type="submit" variant="primary">{t('ops.sim.send')}</Button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
          </form>
          {files.length > 0 && (
            <p className="mt-2 text-[11px] text-ink-dim">
              📎 {files.map((f) => f.name).join(' · ')} ({files.length}/8)
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card title={t('ops.sim.lastTurn')}>
            {s.simDebug === null ? (
              <p className="py-4 text-center text-xs text-slate-500">—</p>
            ) : (
              <ul className="flex flex-col gap-2 text-xs">
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.sim.dIntent')}</span><b className="font-mono text-[11px]">{s.simDebug.intent}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.sim.dRoute')}</span><b>{s.simDebug.route}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.sim.dPolicy')}</span><PolicyTag level={s.simDebug.policy} /></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.sim.dAction')}</span><b className="font-mono text-[11px]">{s.simDebug.action}</b></li>
                <li className="flex justify-between gap-2"><span className="text-ink-dim">{t('ops.sim.dHeld')}</span>
                  <Badge tone={s.simDebug.held ? 'amber' : 'mint'}>{s.simDebug.held ? t('ops.sim.yes') : t('ops.sim.no')}</Badge>
                </li>
              </ul>
            )}
          </Card>
          <Card title={t('ops.sim.how')} subtitle={t('ops.sim.howText')}>
            <p className="text-[11px] leading-relaxed text-ink-dim">v1.6.0 · simulator = the real bot</p>
          </Card>
        </div>
      </div>
    </OpsPage>
  );
}
