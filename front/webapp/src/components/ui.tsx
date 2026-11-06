/**
 * ui.tsx — the shared Aurora building blocks for all 30 pages.
 * Small, typed, RTL-safe (logical properties only). Pages compose these;
 * no page invents its own primitives (Law 9-B: one design system).
 */

import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { getLang, subscribeLang, t, type Lang } from '../lib/i18n';

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

export function useT(): (key: string) => string {
  return t;
}

export function Page({ children }: { children: ReactNode }) {
  return <section className="page">{children}</section>;
}

export function PageHead({
  title,
  sub,
  onBack,
}: {
  title: string;
  sub?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <header className="page-head">
      {onBack && (
        <button type="button" className="back-btn" onClick={onBack} aria-label="back">
          ›
        </button>
      )}
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
    </header>
  );
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`card ${onClick !== undefined ? 'card-tap' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

export function Badge({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function Row({
  title,
  sub,
  end,
  onClick,
}: {
  title: ReactNode;
  sub?: ReactNode;
  end?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={`row ${onClick !== undefined ? 'row-tap' : ''}`} onClick={onClick}>
      <div className="row-main">
        <span className="row-title">{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </div>
      {end && <div className="row-end">{end}</div>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

export function Progress({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ inlineSize: `${pct}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          className={o.id === value ? 'seg seg-active' : 'seg'}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  return <span className="avatar" aria-hidden="true">{initials || '•'}</span>;
}

export function Timeline({ steps }: { steps: readonly { label: string; done: boolean }[] }) {
  return (
    <ol className="timeline">
      {steps.map((s, i) => (
        <li key={i} className={s.done ? 'tl tl-done' : 'tl'}>
          <span className="tl-dot" />
          {s.label}
        </li>
      ))}
    </ol>
  );
}

export function Loading() {
  return <p className="loading">{t('common.loading')}</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return <p className="error-box">{t('common.error')}: {message}</p>;
}
