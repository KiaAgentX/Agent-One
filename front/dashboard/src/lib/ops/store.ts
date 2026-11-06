/**
 * Ops store — one observable console state for all 24 ops pages.
 * React binding: useSyncExternalStore (no dependency). The state seeds
 * from seed.ts (legacy Zenovix Ops 1.6.0 rows) and persists to
 * localStorage so CRUD survives reloads — the same promise the original
 * console made ("edit and save, no redeploy"). A backend bridge can
 * replace `persist()` later without touching the pages.
 */

import { useSyncExternalStore } from 'react';
import type {
  Approval, AtomElectron, AuditEntry, CatalogProduct, Category, DocRow,
  Lead, MailItem, QuoteRow, RuntimeVar, SimDebug, SimMessage, SocialRow,
  SoulProfile, Ticket, WebPageRow,
} from './types.js';
import {
  SEED_APPROVALS, SEED_AUDIT, SEED_CATEGORIES, SEED_DOCS, SEED_ELECTRONS,
  SEED_LEADS, SEED_MAILS, SEED_PRODUCTS, SEED_QUOTE_ROWS, SEED_SOCIAL,
  SEED_SOUL, SEED_TICKETS, SEED_VARS, SEED_WEBPAGES,
} from './seed.js';

export interface LiveCounters {
  /** inbound today */
  in: number;
  /** automatic replies */
  auto: number;
  /** held at the HITL gate */
  hold: number;
  /** outbound today */
  out: number;
}

export interface OpsState {
  approvals: Approval[];
  quotes: QuoteRow[];
  audit: AuditEntry[];
  products: CatalogProduct[];
  categories: Category[];
  vars: RuntimeVar[];
  soul: SoulProfile;
  mails: MailItem[];
  tickets: Ticket[];
  leads: Lead[];
  social: SocialRow[];
  webPages: WebPageRow[];
  docs: DocRow[];
  electrons: AtomElectron[];
  counters: LiveCounters;
  simMessages: SimMessage[];
  simDebug: SimDebug | null;
  /** idempotency cursor — every decision consumes one, like the legacy /decide. */
  idem: number;
}

const STORAGE_KEY = 'zenovix-ops-v1';

function seedState(): OpsState {
  return {
    approvals: structuredClone(SEED_APPROVALS) as Approval[],
    quotes: structuredClone(SEED_QUOTE_ROWS) as QuoteRow[],
    audit: structuredClone(SEED_AUDIT) as AuditEntry[],
    products: structuredClone(SEED_PRODUCTS) as CatalogProduct[],
    categories: structuredClone(SEED_CATEGORIES) as Category[],
    vars: structuredClone(SEED_VARS) as RuntimeVar[],
    soul: { ...SEED_SOUL[0]! },
    mails: structuredClone(SEED_MAILS) as MailItem[],
    tickets: structuredClone(SEED_TICKETS) as Ticket[],
    leads: structuredClone(SEED_LEADS) as Lead[],
    social: structuredClone(SEED_SOCIAL) as SocialRow[],
    webPages: structuredClone(SEED_WEBPAGES) as WebPageRow[],
    docs: structuredClone(SEED_DOCS) as DocRow[],
    electrons: SEED_ELECTRONS.map((e, i) => ({ id: `e-${i + 1}`, ...e })),
    counters: { in: 312, auto: 84, hold: SEED_APPROVALS.filter((a) => a.status === 'pending').length, out: 268 },
    simMessages: [],
    simDebug: null,
    idem: 8842,
  };
}

function hydrate(): OpsState {
  const fresh = seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return fresh;
    const saved = JSON.parse(raw) as Partial<OpsState>;
    // Seed-guard: merge saved collections over fresh seeds field by field,
    // so an older/partial snapshot never breaks a page.
    return { ...fresh, ...saved, counters: { ...fresh.counters, ...(saved.counters ?? {}) } };
  } catch {
    return fresh;
  }
}

let state: OpsState = typeof window === 'undefined' ? seedState() : hydrate();

const listeners = new Set<() => void>();

function emit(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota/private mode — in-memory only */
  }
  for (const fn of listeners) fn();
}

function set(patch: Partial<OpsState>): void {
  state = { ...state, ...patch };
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Live snapshot (identity keeps useSyncExternalStore quiet). */
const getSnapshot = (): OpsState => state;

export function useOps(): OpsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Non-React snapshot read — for tests and plain-TS consumers. */
export const getOps = (): OpsState => state;

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function nextIdem(): string {
  const v = `ops-${state.idem}`;
  set({ idem: state.idem + 1 });
  return v;
}

function log(action: string, result: AuditEntry['result'], actor = 'agent'): void {
  const entry: AuditEntry = { time: now(), actor, action, result, idem: nextIdem() };
  set({ audit: [entry, ...state.audit].slice(0, 200) });
}

/* ── actions ───────────────────────────────────────────────────────── */

export const ops = {
  /** Approve/reject a pending item — the customer is told, the trail logs it. */
  decide(id: string, decision: 'approved' | 'rejected', manager: string): void {
    const target = state.approvals.find((a) => a.id === id);
    if (target === undefined || target.status !== 'pending') return;
    const approvals = state.approvals.map((a) =>
      a.id === id ? { ...a, status: decision, decidedBy: manager, decidedAt: now() } : a,
    );
    const kind = target.kind;
    set({ approvals, counters: { ...state.counters, hold: approvals.filter((x) => x.status === 'pending').length } });
    log(`${kind} ${id}`, decision, manager);
    if (kind === 'create_quote') {
      set({ quotes: state.quotes.map((q) => (q.no === id ? { ...q, status: decision } : q)) });
    }
  },

  /** Inbox: reply under rules, hold for manager, or reject the draft. */
  decideMail(id: string, decision: 'replied' | 'held' | 'rejected'): void {
    const mail = state.mails.find((m) => m.id === id);
    if (mail === undefined) return;
    set({ mails: state.mails.map((m) => (m.id === id ? { ...m, status: decision } : m)) });
    if (decision === 'replied') set({ counters: { ...state.counters, auto: state.counters.auto + 1, out: state.counters.out + 1 } });
    log(`${mail.action} ${id}`, decision === 'rejected' ? 'rejected' : decision === 'held' ? 'blocked' : 'executed', decision === 'replied' ? 'agent' : 'Manager');
  },

  saveProduct(product: CatalogProduct): void {
    const exists = state.products.some((p) => p.code === product.code);
    set({ products: exists ? state.products.map((p) => (p.code === product.code ? product : p)) : [product, ...state.products] });
    log(`catalog.upsert ${product.code}`, 'executed', 'Manager');
  },

  deleteProduct(code: string): void {
    set({ products: state.products.filter((p) => p.code !== code) });
    log(`catalog.delete ${code}`, 'executed', 'Manager');
  },

  saveCategory(cat: Category): void {
    const exists = state.categories.some((c) => c.key === cat.key);
    set({ categories: exists ? state.categories.map((c) => (c.key === cat.key ? cat : c)) : [...state.categories, cat] });
    log(`catalog.category ${cat.key}`, 'executed', 'Manager');
  },

  saveSoul(soul: SoulProfile): void {
    set({ soul });
    log('soul.save', 'executed', 'Manager');
  },

  saveVar(key: string, value: string): void {
    set({ vars: state.vars.map((v) => (v.key === key ? { ...v, value } : v)) });
    log(`vars.set ${key}`, 'executed', 'Manager');
  },

  advanceDoc(doc: string): void {
    const order: DocRow['step'][] = ['draft', 'review', 'approved', 'indexed'];
    set({
      docs: state.docs.map((d) => {
        if (d.doc !== doc) return d;
        if (d.step === 'manager_only') return d;
        const i = order.indexOf(d.step);
        return i >= 0 && i < order.length - 1 ? { ...d, step: order[i + 1]! } : d;
      }),
    });
    log(`knowledge.advance ${doc}`, 'executed', 'Manager');
  },

  escalateTicket(id: string): void {
    set({ tickets: state.tickets.map((t) => (t.id === id ? { ...t, status: 'escalated' } : t)) });
    log(`support.escalate ${id}`, 'executed', 'Manager');
  },

  closeTicket(id: string): void {
    set({ tickets: state.tickets.map((t) => (t.id === id ? { ...t, status: 'closed' } : t)) });
    log(`support.close ${id}`, 'executed', 'agent');
  },

  advanceLead(account: string): void {
    const order: Lead['stage'][] = ['lead', 'qualified', 'quote', 'won'];
    set({
      leads: state.leads.map((l) => {
        if (l.account !== account) return l;
        const i = order.indexOf(l.stage);
        return i >= 0 && i < order.length - 1 ? { ...l, stage: order[i + 1]! } : l;
      }),
    });
    log(`sales.advance ${account}`, 'executed', 'agent');
  },

  publishSocial(channel: string, item: string): void {
    set({ social: state.social.map((s) => (s.channel === channel && s.item === item ? { ...s, status: 'published' } : s)) });
    log('publish_content', 'executed', 'Manager');
  },

  advanceWebPage(page: string): void {
    set({
      webPages: state.webPages.map((p) => {
        if (p.page !== page || p.step >= 5) return p;
        const status: WebPageRow['status'] = p.step + 1 >= 5 ? 'published' : p.step + 1 >= 4 ? 'review' : 'draft';
        return { ...p, step: p.step + 1, status };
      }),
    });
    log(`website.step ${page}`, 'executed', 'Manager');
  },

  toggleJob(job: string): void {
    // jobs live in the automation page seed — mirrored in store for trail
    log(`automation.toggle ${job}`, 'executed', 'Manager');
  },

  addElectron(title: string, sensitivity: AtomElectron['sensitivity'], domain: string): void {
    const e: AtomElectron = { id: `e-${state.electrons.length + 1}-${Date.now().toString(36)}`, title, sensitivity, domain, status: 'approved', version: 1 };
    set({ electrons: [...state.electrons, e] });
    log(`knowledge.add ${title}`, 'executed', 'Manager');
  },

  /** Simulator — a faithful mini-pipeline: intent → route → policy gate. */
  simSend(text: string, holdPolicy: boolean): void {
    const t = text.trim();
    if (t.length === 0) return;
    const userMsg: SimMessage = { kind: 'user', text: t, time: now() };
    let intent = 'smalltalk';
    let route = 'orchestrator';
    let policy: SimDebug['policy'] = 'auto';
    let action = 'reply_common';
    let reply = state.soul.greeting;
    const lower = t.toLowerCase();
    if (lower.startsWith('/start')) {
      intent = 'start'; action = 'send_welcome'; reply = state.soul.greeting;
    } else if (lower === 'menu' || lower.startsWith('/menu')) {
      intent = 'menu'; action = 'send_menu'; reply = '1) Services  2) Quote  3) Support  4) Contact  5) FAQ  6) My requests';
    } else if (lower.includes('price') || lower.includes('quote') || lower.includes('drum') || lower.startsWith('/quote')) {
      intent = 'quote'; route = 'sales agent'; policy = 'manager'; action = 'create_quote';
      reply = 'Drafted your quote — it waits for a manager approval before sending (never-auto gate).';
    } else if (lower.includes('payment') || lower.includes('invoice') || lower.includes('wire')) {
      intent = 'payment'; route = 'approvals'; policy = 'manager_only'; action = 'payment'; reply = 'Payments never run automatically — a manager must approve this.';
    } else if (lower.includes('support') || lower.includes('problem') || lower.includes('error') || lower.startsWith('/support')) {
      intent = 'support'; route = 'support agent'; action = 'create_ticket'; reply = 'I opened a ticket — first-line reply follows within the SLA.';
    } else if (lower.includes('contact')) {
      intent = 'contact'; action = 'send_contact'; reply = `You can reach us at ${state.vars.find((v) => v.key === 'BOT_MENU_CONTACT')?.value ?? 'sales@zenovix.example'}.`;
    } else if (lower.includes('warranty') || lower.includes('faq') || lower.includes('moq')) {
      intent = 'faq'; action = 'reply_common'; reply = 'From the approved FAQ: MOQ is 1 drum; warranty covers manufacturing defects for 12 months.';
    } else if (lower.includes('delete') || lower.includes('access')) {
      intent = 'danger'; route = 'approvals'; policy = 'manager'; action = 'delete_data'; reply = 'Deletes and access changes wait for a manager decision.';
    } else {
      reply = 'Noted — I classified your message and routed it to the right specialist.';
    }
    // manager_only (payment/contract) is NEVER auto — the hold is absolute;
    // 'manager' actions hold whenever the policy gate is on.
    const held = policy === 'manager_only' ? true : policy === 'manager' ? holdPolicy : false;
    const botMsg: SimMessage = { kind: 'bot', text: reply, time: now() };
    const sysMsg: SimMessage = { kind: 'sys', text: `${action} · ${policy}`, time: now() };
    set({
      simMessages: [...state.simMessages, userMsg, botMsg, sysMsg].slice(-60),
      simDebug: { intent, route, policy, action, held },
      counters: { ...state.counters, in: state.counters.in + 1, out: state.counters.out + 1, auto: held ? state.counters.auto : state.counters.auto + 1, hold: state.counters.hold + (held ? 1 : 0) },
    });
    log(action, held ? 'blocked' : 'executed');
  },

  simReset(): void {
    set({ simMessages: [], simDebug: null });
  },

  /** desk/live refresh tick — the console refreshed every 15s; here on demand. */
  tick(): void {
    const jitter = (n: number, d: number): number => Math.max(0, n + Math.round((Math.random() - 0.4) * d));
    set({ counters: { in: jitter(state.counters.in, 6), auto: jitter(state.counters.auto, 4), hold: state.counters.hold, out: jitter(state.counters.out, 6) } });
  },

  resetAll(): void {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    state = seedState();
    emit();
  },
};
