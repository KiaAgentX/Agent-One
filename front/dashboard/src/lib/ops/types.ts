/**
 * Ops domain types — the Zenovix Ops console model, ported 1:1 from
 * legacy/agi-main/admin/ops (Zenovix Ops 1.6.0). Every page of the 24-page
 * console reads its rows from here; Law 4 (no behavior change) means the
 * policy levels and never-auto gates survive exactly.
 */

/** Access level from the control/charter matrix. */
export type PolicyLevel = 'auto' | 'auto_rules' | 'manager' | 'manager_only';

/** A manager decision waiting in the Approvals queue (queue.html). */
export interface Approval {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
  readonly requester: string;
  readonly channel: string;
  readonly createdAt: string;
  readonly policy: PolicyLevel;
  status: 'pending' | 'approved' | 'rejected';
  readonly decidedBy?: string;
  readonly decidedAt?: string;
}

/** One immutable audit-trail line (audit.html). */
export interface AuditEntry {
  readonly time: string;
  readonly actor: string;
  readonly action: string;
  readonly result: 'executed' | 'approved' | 'rejected' | 'blocked';
  readonly idem: string;
}

/** Catalog product (catalog.html / market.html). */
export interface CatalogProduct {
  readonly code: string;
  name: string;
  nameFa: string;
  category: string;
  price: number;
  unit: 'metric ton' | 'barrel' | 'liter' | 'kg' | 'piece' | 'service';
  icon: string;
  visible: boolean;
  sales: number;
}

export interface Category {
  readonly key: string;
  name: string;
  icon: string;
  active: boolean;
}

/** Runtime variable (settings.html → Variables). */
export interface RuntimeVar {
  readonly key: string;
  value: string;
  readonly group: 'deploy' | 'bot' | 'runtime';
  readonly secret: boolean;
  readonly readonly_: boolean;
}

/** The agent's soul — identity injected into every reply (soul.html). */
export interface SoulProfile {
  name: string;
  role: string;
  company: string;
  mission: string;
  personality: string;
  tone: string;
  languages: string;
  greeting: string;
  boundaries: string;
  styleRules: string;
  signature: string;
}

/** An inbox item with its classification and proposed action (inbox.html). */
export interface MailItem {
  readonly id: string;
  cat: 'sales' | 'support' | 'ops' | 'finance';
  from: string;
  title: string;
  body: string;
  /** 'auto' = executed under rules, 'hold' = waits for the manager. */
  policy: 'auto' | 'hold';
  action: string;
  status: 'new' | 'replied' | 'held' | 'rejected';
}

export interface Ticket {
  readonly id: string;
  subject: string;
  priority: 'low' | 'normal' | 'medium' | 'high';
  sla: string;
  source: string;
  action: string;
  status: 'open' | 'firstline' | 'escalated' | 'closed';
}

export interface Lead {
  readonly account: string;
  source: string;
  stage: 'lead' | 'qualified' | 'quote' | 'won';
}

export interface QuoteRow {
  readonly no: string;
  detail: string;
  policy: PolicyLevel;
  status: string;
}

export interface SocialRow {
  readonly channel: string;
  item: string;
  policy: 'template' | 'sales_flow' | 'escalate' | 'calendar';
  status: 'published' | 'held' | 'draft';
}

export interface WebPageRow {
  readonly page: string;
  status: 'draft' | 'review' | 'published';
  step: number;
  policy: 'content' | 'change_price' | 'contract' | 'stable';
}

export interface DocRow {
  readonly doc: string;
  version: string;
  sensitivity: 'public' | 'internal' | 'confidential';
  /** Pipeline: draft → review → approved → indexed (confidential: manager only). */
  step: 'draft' | 'review' | 'approved' | 'indexed' | 'manager_only';
}

export interface CronJob {
  readonly job: string;
  every: string;
  lastRun: string;
  mayAuto: string;
  paused: boolean;
}

export interface ControlRow {
  readonly work: string;
  level: PolicyLevel;
  readonly action: string;
  readonly flow: string;
}

export interface CharterRow {
  readonly work: string;
  mode: 'auto' | 'manager' | 'manager_only';
  readonly action: string;
}

/** Database page — a browsable table backed by the ops store itself. */
export interface OpsTableRef {
  readonly id: 'products' | 'approvals' | 'mails' | 'tickets' | 'docs' | 'audit' | 'leads' | 'social';
  readonly group: string;
  readonly label: string;
}

/** Knowledge atom — Bohr model (knowledge-atom.js). Nucleus = charter. */
export interface AtomElectron {
  readonly id: string;
  title: string;
  sensitivity: 'public' | 'internal' | 'confidential';
  domain: string;
  status: 'approved' | 'draft';
  version: number;
}

export interface EcoNode {
  readonly id: string;
  readonly label: string;
  /** Orbit radius factor: 0 core · 0.55 gate · 0.72 agents · 1 channels · 1.28 stores. */
  readonly ring: number;
  readonly kind: 'core' | 'gate' | 'channel' | 'agent' | 'store';
  readonly text: string;
  readonly href: string;
}

export interface SimMessage {
  readonly kind: 'user' | 'bot' | 'sys';
  readonly text: string;
  readonly time: string;
}

/** What the pipeline decided on the last simulated turn (simulator). */
export interface SimDebug {
  readonly intent: string;
  readonly route: string;
  readonly policy: PolicyLevel;
  readonly action: string;
  readonly held: boolean;
}
