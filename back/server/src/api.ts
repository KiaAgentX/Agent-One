/**
 * API route registry — ONE definition per endpoint carries everything:
 * the zod contract (validation + OpenAPI), the security level and the handler.
 * This is the realization of ADR-005: contracts cannot drift from handlers.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import * as D from '@dropagentx/domain';
import * as C from '@dropagentx/contracts';
import { z } from 'zod';
import type { V3Store, ApplyResult } from './persistence.js';
import type { Config } from './config.js';
import { DomainFailure, HttpFailure } from './errors.js';
import { verifyKiaKey, verifyTelegramInitData } from './auth.js';
import { createBackup } from './backup.js';
import { AGENTS, AGENT_ORDER, SKILLS } from '@dropagentx/ai-gateway';
import { normalizeAccountId, type AssembledAi } from './ai.js';

export interface RouteContext {
  readonly store: V3Store;
  readonly config: Config;
  /** Phase 5 — assembled when the LLM layer is configured; undefined = AI disabled. */
  readonly ai?: AssembledAi;
}

export interface RouteInput {
  readonly params: Record<string, string>;
  readonly query: Record<string, string>;
  readonly body: unknown;
  /** Raw request headers — the AI routes need x-kia-key for staff-role gating. */
  readonly headers?: Record<string, string | string[] | undefined>;
}

export interface ApiRoute extends C.ApiRouteDef {
  handler: (ctx: RouteContext, input: RouteInput) => Promise<unknown>;
}

const RESERVED_PREFIXES = ['mint:', 'treasury:', 'burn:', 'escrow:'] as const;

function requireEscrow(result: ApplyResult): D.Escrow {
  if (result.escrow === undefined) {
    throw new HttpFailure(500, 'INTERNAL', 'Command completed without escrow state.');
  }
  return result.escrow;
}

function requireTx(result: ApplyResult): D.PostedTransaction {
  if (result.tx === undefined) {
    throw new HttpFailure(500, 'INTERNAL', 'Command completed without a transaction.');
  }
  return result.tx;
}

function escrowToView(e: D.Escrow): C.EscrowView {
  return {
    id: e.id,
    buyerId: e.buyerId,
    sellerId: e.sellerId,
    amount: e.amount,
    productRef: e.productRef ?? null,
    status: e.status,
    createdAt: e.createdAt,
    fundedTxId: e.fundedTxId ?? null,
    settleTxId: e.settleTxId ?? null,
    disputeReason: e.disputeReason ?? null,
    deliveryRef: e.deliveryRef ?? null,
    expiresAt: e.expiresAt ?? null,
  };
}

function escrowActionResponse(result: ApplyResult): C.EscrowActionResponse {
  return {
    escrow: escrowToView(requireEscrow(result)),
    txId: result.tx?.id ?? null,
    replayed: result.replayed,
  };
}

/** Exact yearly minted supply, derived from the loaded ledger state (Article 3). */
function mintedThisYearFromLedger(ledger: D.LedgerState): number {
  const yearStart = Date.UTC(new Date().getUTCFullYear(), 0, 1);
  let total = 0;
  for (const t of ledger.txs.values()) {
    if (Date.parse(t.at) >= yearStart) {
      for (const p of t.postings) {
        if (p.accountId === D.MINT_ACCOUNT_ID && p.amount < 0) total += -p.amount;
      }
    }
  }
  return total;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export const API_ROUTES: ApiRoute[] = [
  {
    method: 'get',
    path: '/health',
    operationId: 'health',
    summary: 'Liveness probe of the v3 server',
    tag: 'system',
    security: 'public',
    response: C.healthResponseSchema,
    handler: async ({ store, config }) => {
      // DEEP liveness: a server that cannot talk to its ledger is NOT healthy.
      // A static ok-JSON passed Railway's healthcheck while the DB was broken —
      // Railway must restart a zombie, not keep it green.
      try {
        await store.prisma.$queryRaw`SELECT 1`;
      } catch {
        throw new HttpFailure(503, 'DB_DOWN', 'The server cannot reach its database.');
      }
      // The command center's settings page renders these chips directly.
      return {
        status: 'ok',
        service: 'dropagentx-v3-server',
        version: serverVersion(),
        llmConfigured: config.llm !== undefined,
        llmModel: config.llm?.model ?? null,
        db: 'ok',
        bot: config.botToken !== undefined ? 'ok' : 'disabled',
        ai: config.llm !== undefined ? 'ok' : 'disabled',
        uptime: process.uptime(),
      };
    },
  },
  {
    method: 'get',
    path: '/economy',
    operationId: 'getEconomy',
    summary: 'Nation economy summary — public transparency (charter Article 6)',
    tag: 'economy',
    security: 'public',
    response: C.economySummarySchema,
    handler: async ({ store }) => {
      const s = await store.economySummary();
      return {
        currency: D.CHARTER.currency,
        symbol: D.CHARTER.symbol,
        ...s,
        yearlyMintCap: D.CHARTER.yearlyMintCapDin,
        genesisSupply: D.CHARTER.genesisSupplyDin,
      };
    },
  },

  {
    method: 'post',
    path: '/accounts',
    operationId: 'createAccount',
    summary: 'Register a user account (balance starts at 0)',
    tag: 'accounts',
    security: 'admin',
    body: C.createAccountRequestSchema,
    response: C.accountViewSchema,
    status: 201,
    handler: async ({ store }, { body }) => {
      const input = body as C.CreateAccountRequest;
      if (RESERVED_PREFIXES.some((p) => input.id.startsWith(p))) {
        throw new HttpFailure(422, 'RESERVED_ID', 'The mint:/treasury:/burn:/escrow: prefixes are system-reserved.');
      }
      const createdAt = new Date();
      try {
        await store.prisma.account.create({
          data: { id: input.id, kind: 'user', ...(input.label !== undefined ? { label: input.label } : {}), createdAt },
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new HttpFailure(422, 'DUPLICATE_ACCOUNT', `Account ${input.id} already exists.`);
        }
        throw err;
      }
      await store.prisma.auditLog.create({ data: { actor: 'admin', action: 'account.create', target: input.id } });
      return { id: input.id, kind: 'user', label: input.label ?? null, balance: 0, createdAt: createdAt.toISOString() };
    },
  },
  {
    method: 'get',
    path: '/accounts',
    operationId: 'listAccounts',
    summary: 'List all accounts with derived balances',
    tag: 'accounts',
    security: 'admin',
    response: C.accountListResponseSchema,
    handler: async ({ store }) => ({ items: await store.listAccountsWithBalances() }),
  },
  {
    method: 'get',
    path: '/accounts/{id}/balance',
    operationId: 'getBalance',
    summary: 'Derived balance of one account (public transparency)',
    tag: 'accounts',
    security: 'public',
    params: z.object({ id: C.idSchema }),
    response: C.balanceResponseSchema,
    handler: async ({ store }, { params }) => {
      const balance = await store.balanceOf(params.id!);
      if (balance === null) {
        throw new DomainFailure({ code: 'UNKNOWN_ACCOUNT', message: `Account ${params.id} does not exist` });
      }
      return { accountId: params.id!, balance };
    },
  },

  {
    method: 'post',
    path: '/wallet/mint',
    operationId: 'mint',
    summary: 'Mint dinar into a user account — yearly cap enforced (charter Article 3)',
    tag: 'wallet',
    security: 'admin',
    body: C.mintRequestSchema,
    response: C.walletMoveResponseSchema,
    handler: async ({ store }, { body }) => {
      const input = body as C.MintRequest;
      const amount = D.unwrap(D.din(input.amount));
      const result = await store.apply({
        actor: 'admin',
        action: 'wallet.mint',
        target: input.accountId,
        idempotencyKey: input.idempotencyKey,
        run: async (ledger) => {
          const cap = D.assertMintWithinCap(mintedThisYearFromLedger(ledger) as D.Din, amount);
          if (!cap.ok) return cap;
          const posted = D.post(ledger, {
            idempotencyKey: input.idempotencyKey,
            postings: [
              { accountId: D.MINT_ACCOUNT_ID, amount: -amount },
              { accountId: input.accountId, amount },
            ],
            memo: input.memo ?? `mint ${input.amount} → ${input.accountId}`,
          });
          if (!posted.ok) return posted;
          return D.ok({ ledger: posted.value.state, tx: posted.value.tx, events: [] });
        },
      });
      const tx = requireTx(result);
      const balance = D.unwrap(D.balanceOf(result.ledger, input.accountId));
      return { txId: tx.id, accountId: input.accountId, balance, replayed: result.replayed };
    },
  },
  {
    method: 'post',
    path: '/wallet/burn',
    operationId: 'burn',
    summary: 'Burn dinar from a user account — overdraft-impossible (charter Article 4)',
    tag: 'wallet',
    security: 'admin',
    body: C.burnRequestSchema,
    response: C.walletMoveResponseSchema,
    handler: async ({ store }, { body }) => {
      const input = body as C.BurnRequest;
      const amount = D.unwrap(D.din(input.amount));
      const result = await store.apply({
        actor: 'admin',
        action: 'wallet.burn',
        target: input.accountId,
        idempotencyKey: input.idempotencyKey,
        run: async (ledger) => {
          const posted = D.post(ledger, {
            idempotencyKey: input.idempotencyKey,
            postings: [
              { accountId: input.accountId, amount: -amount },
              { accountId: D.BURN_ACCOUNT_ID, amount },
            ],
            memo: input.memo ?? `burn ${input.amount} ← ${input.accountId}`,
          });
          if (!posted.ok) return posted;
          return D.ok({ ledger: posted.value.state, tx: posted.value.tx, events: [] });
        },
      });
      const tx = requireTx(result);
      const balance = D.unwrap(D.balanceOf(result.ledger, input.accountId));
      return { txId: tx.id, accountId: input.accountId, balance, replayed: result.replayed };
    },
  },

  {
    method: 'post',
    path: '/escrows',
    operationId: 'createEscrow',
    summary: 'Create an escrow (CREATED; money not moved yet)',
    tag: 'escrows',
    security: 'admin',
    body: C.createEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    status: 201,
    handler: async ({ store }, { body }) => {
      const input = body as C.CreateEscrowRequest;
      const id = input.id ?? `esc_${randomUUID()}`;
      const nowIso = new Date().toISOString();
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.create',
        target: id,
        escrowId: id,
        idempotencyKey: input.idempotencyKey,
        run: (ledger, registry) =>
          D.createEscrow(ledger, registry, {
            id,
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            amount: D.unwrap(D.din(input.amount)),
            ...(input.productRef !== undefined ? { productRef: input.productRef } : {}),
            ...(input.ttlHours !== undefined
              ? { expiresAt: new Date(Date.now() + input.ttlHours * 3_600_000).toISOString() }
              : {}),
            at: nowIso,
          }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'get',
    path: '/escrows',
    operationId: 'listEscrows',
    summary: 'List escrows (optionally filtered by status)',
    tag: 'escrows',
    security: 'admin',
    query: z.object({ status: C.escrowStatusSchema.optional() }),
    response: C.escrowListResponseSchema,
    handler: async ({ store }, { query }) => ({
      items: (await store.listEscrows(query.status as C.EscrowStatusWire | undefined)).map(escrowToView),
    }),
  },
  {
    method: 'get',
    path: '/escrows/{id}',
    operationId: 'getEscrow',
    summary: 'Read one escrow (public transparency)',
    tag: 'escrows',
    security: 'public',
    params: z.object({ id: C.idSchema }),
    response: C.escrowViewSchema,
    handler: async ({ store }, { params }) => {
      const escrow = await store.getEscrow(params.id!);
      if (escrow === null) {
        throw new DomainFailure({ code: 'ESCROW_NOT_FOUND', message: `Escrow ${params.id} does not exist` });
      }
      return escrowToView(escrow);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/fund',
    operationId: 'fundEscrow',
    summary: 'Lock buyer money into the escrow account',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.fundEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.FundEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.fund',
        target: params.id!,
        escrowId: params.id!,
        idempotencyKey: input.idempotencyKey,
        run: (ledger, registry) =>
          D.fundEscrow(ledger, registry, {
            escrowId: params.id!,
            ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
          }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/deliver',
    operationId: 'deliverEscrow',
    summary: 'Mark the product as delivered (money still locked)',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.deliverEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.DeliverEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.deliver',
        target: params.id!,
        escrowId: params.id!,
        run: (ledger, registry) =>
          D.deliverEscrow(ledger, registry, {
            escrowId: params.id!,
            ...(input.deliveryRef !== undefined ? { deliveryRef: input.deliveryRef } : {}),
          }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/release',
    operationId: 'releaseEscrow',
    summary: 'Settle: seller gets net (90%), treasury gets tax (10%) — HITL gate ≥ 50,000 Đ',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.releaseEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.ReleaseEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.release',
        target: params.id!,
        escrowId: params.id!,
        idempotencyKey: input.idempotencyKey,
        run: (ledger, registry) =>
          D.releaseEscrow(ledger, registry, {
            escrowId: params.id!,
            ...(input.approvedByAdmin !== undefined ? { approvedByAdmin: input.approvedByAdmin } : {}),
            ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
          }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/dispute',
    operationId: 'disputeEscrow',
    summary: 'Open a dispute (escrow stays locked until arbitration)',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.disputeEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.DisputeEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.dispute',
        target: params.id!,
        escrowId: params.id!,
        run: (ledger, registry) =>
          D.disputeEscrow(ledger, registry, {
            escrowId: params.id!,
            reason: input.reason,
          }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/refund',
    operationId: 'refundEscrow',
    summary: 'Arbitration in favor of the buyer — full refund, no tax',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.refundEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.RefundEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.refund',
        target: params.id!,
        escrowId: params.id!,
        idempotencyKey: input.idempotencyKey,
        run: (ledger, registry) =>
          D.refundEscrow(ledger, registry, {
            escrowId: params.id!,
            ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
          }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/cancel',
    operationId: 'cancelEscrow',
    summary: 'Cancel a CREATED escrow — no money ever moved',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.cancelEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.CancelEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.cancel',
        target: params.id!,
        escrowId: params.id!,
        run: (ledger, registry) => D.cancelEscrow(ledger, registry, { escrowId: params.id! }),
      });
      return escrowActionResponse(result);
    },
  },
  {
    method: 'post',
    path: '/escrows/{id}/expire',
    operationId: 'expireEscrow',
    summary: 'TTL sweep — auto-refund a FUNDED escrow (charter Article 9)',
    tag: 'escrows',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.expireEscrowRequestSchema,
    response: C.escrowActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.ExpireEscrowRequest;
      const result = await store.apply({
        actor: 'admin',
        action: 'escrow.expire',
        target: params.id!,
        escrowId: params.id!,
        idempotencyKey: input.idempotencyKey,
        run: (ledger, registry) =>
          D.expireEscrow(ledger, registry, {
            escrowId: params.id!,
            ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
          }),
      });
      return escrowActionResponse(result);
    },
  },

  // ── HITL queue (charter Article 7) — the bot creates, humans decide ──

  {
    method: 'post',
    path: '/hitl',
    operationId: 'createHitlRequest',
    summary: 'Queue a human-approval request (amount copied from the escrow; duplicate id → replay)',
    tag: 'hitl',
    security: 'admin',
    body: C.createHitlRequestSchema,
    response: C.hitlViewSchema,
    status: 201,
    handler: async ({ store }, { body }) => {
      const input = body as C.CreateHitlRequest;
      const escrow = await store.getEscrow(input.escrowId);
      if (escrow === null) {
        throw new DomainFailure({ code: 'ESCROW_NOT_FOUND', message: `Escrow ${input.escrowId} does not exist` });
      }
      if (escrow.status !== 'DELIVERED' && escrow.status !== 'DISPUTED') {
        throw new DomainFailure({
          code: 'INVALID_TRANSITION',
          message: `Escrow ${escrow.id} is ${escrow.status} — only DELIVERED or DISPUTED escrows need release approval`,
        });
      }
      if (!D.requiresHitl(escrow.amount)) {
        throw new DomainFailure({
          code: 'HITL_NOT_REQUIRED',
          message: `Release of ${escrow.amount} Đ is below the HITL threshold (${D.CHARTER.hitlThresholdDin} Đ) — release directly`,
        });
      }
      const ttlHours = input.ttlHours ?? 24;
      const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);
      const id = input.id ?? `hitl_${randomUUID()}`;
      const existing = await store.getHitl(id);
      if (existing !== null) return hitlToView(existing); // replay-safe creation
      const row = await store.insertHitl({
        id,
        kind: input.kind,
        escrowId: escrow.id,
        amount: escrow.amount,
        requesterId: input.requesterId,
        ...(input.note !== undefined ? { note: input.note } : {}),
        expiresAt,
      });
      await store.prisma.auditLog.create({
        data: { actor: input.requesterId, action: 'hitl.create', target: escrow.id, meta: JSON.stringify({ hitlId: row.id, amount: row.amount }) },
      });
      return hitlToView(row);
    },
  },
  {
    method: 'get',
    path: '/hitl',
    operationId: 'listHitlRequests',
    summary: 'List HITL requests (optionally filtered by status)',
    tag: 'hitl',
    security: 'admin',
    query: z.object({ status: C.hitlStatusSchema.optional() }),
    response: C.hitlListResponseSchema,
    handler: async ({ store }, { query }) => ({
      items: (await store.listHitl(query.status as C.HitlStatusWire | undefined)).map(hitlToView),
    }),
  },
  {
    method: 'get',
    path: '/hitl/{id}',
    operationId: 'getHitlRequest',
    summary: 'Read one HITL request',
    tag: 'hitl',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    response: C.hitlViewSchema,
    handler: async ({ store }, { params }) => {
      const row = await store.getHitl(params.id!);
      if (row === null) {
        throw new DomainFailure({ code: 'HITL_NOT_FOUND', message: `HITL request ${params.id} does not exist` });
      }
      return hitlToView(row);
    },
  },
  {
    method: 'post',
    path: '/hitl/{id}/approve',
    operationId: 'approveHitlRequest',
    summary: 'Approve → ESCROW_RELEASE settles in the same transaction (seller 90% + treasury 10%)',
    tag: 'hitl',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.hitlDecisionRequestSchema,
    response: C.hitlActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.HitlDecisionRequest;
      const row = await store.getHitl(params.id!);
      if (row === null) {
        throw new DomainFailure({ code: 'HITL_NOT_FOUND', message: `HITL request ${params.id} does not exist` });
      }
      const decided = await store.decideHitl({
        requestId: row.id,
        decision: 'APPROVED',
        decidedBy: input.decidedBy,
        ...(input.note !== undefined ? { decisionNote: input.note } : {}),
        execute: (ledger, registry) =>
          D.releaseEscrow(ledger, registry, {
            escrowId: row.escrowId,
            approvedByAdmin: true,
            idempotencyKey: `hitl:${row.id}:approve`,
          }),
      });
      return {
        request: hitlToView(decided.request),
        escrow: decided.escrow !== undefined ? escrowToView(decided.escrow) : null,
        txId: decided.tx?.id ?? null,
        replayed: decided.replayed,
      };
    },
  },
  {
    method: 'post',
    path: '/hitl/{id}/reject',
    operationId: 'rejectHitlRequest',
    summary: 'Reject — no money moves; the escrow stays locked until arbitration decides otherwise',
    tag: 'hitl',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.hitlDecisionRequestSchema,
    response: C.hitlActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.HitlDecisionRequest;
      const row = await store.getHitl(params.id!);
      if (row === null) {
        throw new DomainFailure({ code: 'HITL_NOT_FOUND', message: `HITL request ${params.id} does not exist` });
      }
      const decided = await store.decideHitl({
        requestId: row.id,
        decision: 'REJECTED',
        decidedBy: input.decidedBy,
        ...(input.note !== undefined ? { decisionNote: input.note } : {}),
        execute: () => {
          // Unreachable for REJECTED — decideHitl only calls execute on APPROVED.
          throw new HttpFailure(500, 'INTERNAL', 'REJECTED decision must not execute a settlement.');
        },
      });
      return {
        request: hitlToView(decided.request),
        escrow: decided.escrow !== undefined ? escrowToView(decided.escrow) : null,
        txId: decided.tx?.id ?? null,
        replayed: decided.replayed,
      };
    },
  },
  {
    method: 'post',
    path: '/hitl/sweep',
    operationId: 'sweepHitl',
    summary: 'TTL sweep — expire overdue PENDING requests (bots call this on an interval)',
    tag: 'hitl',
    security: 'admin',
    response: C.hitlSweepResponseSchema,
    handler: async ({ store }) => ({ expired: await store.expireOverdueHitl(new Date()) }),
  },

  // ── System: consistent DB snapshots (the database IS the money) ──────────
  {
    method: 'post',
    path: '/system/backup',
    operationId: 'createBackup',
    summary: 'Consistent SQLite snapshot (VACUUM INTO) into db/backups — prunes to the newest KEEP_BACKUPS files. Admin-gated.',
    tag: 'system',
    security: 'admin',
    response: C.backupCreatedSchema,
    handler: async ({ store }) => await createBackup(store.prisma, { databaseUrl: process.env.DATABASE_URL }),
  },

  // ── Phase 5: AI cycle (Zenovix gateway) ──────────────────────────────────
  {
    method: 'post',
    path: '/ai/chat',
    operationId: 'aiChat',
    summary: 'Ask the Zenovix agent team — routing, skills, metering, redaction and audit run server-side',
    tag: 'ai',
    security: 'public',
    body: C.aiChatRequestSchema,
    response: C.aiChatResponseSchema,
    handler: async (ctx, input) => {
      const ai = requireAi(ctx);
      const body = input.body as C.AiChatRequest;
      // Fail-closed staff gate: role:"staff" is only honored behind the admin key.
      if (body.role === 'staff' && !verifyKiaKey(headerValue(input.headers, 'x-kia-key'), ctx.config.adminKey)) {
        throw new HttpFailure(401, 'UNAUTHORIZED', 'Staff role requires a valid X-KIA-Key.');
      }
      // Fail-closed identity gate: a PUBLIC caller may not choose whose wallet
      // the agent acts on. Trusted callers (valid admin key — the bot, the
      // dashboard) may pass userId; everyone else must prove a Telegram
      // identity via MiniApp initData (HMAC against the bot token) and the
      // server DERIVES the acting account from it, ignoring the body field.
      const trusted = verifyKiaKey(headerValue(input.headers, 'x-kia-key'), ctx.config.adminKey);
      let userId = body.userId;
      if (!trusted) {
        if (ctx.config.botToken === undefined) {
          throw new HttpFailure(503, 'AI_IDENTITY_DISABLED', 'This server cannot verify public AI callers (TELEGRAM_BOT_TOKEN unset) — send a valid X-KIA-Key.');
        }
        const identity = body.initData !== undefined ? verifyTelegramInitData(body.initData, ctx.config.botToken) : null;
        if (identity === null) {
          throw new HttpFailure(401, 'AI_IDENTITY_REQUIRED', 'Public AI callers must send valid Telegram initData — the acting account is derived from it, never from the body.');
        }
        // Same convention as the bot: a numeric Telegram id normalizes to
        // user:tg:<id> — meter keys and audit actors stay uniform.
        userId = normalizeAccountId(identity.userId);
      }
      await ai.meter.ensureAllowance(userId);
      const result = await ai.gateway.ask({
        userId,
        role: body.role,
        text: body.text,
        language: body.language,
        ...(body.directAgent !== undefined ? { directAgent: body.directAgent } : {}),
        ...(body.history !== undefined ? { history: body.history } : {}),
        ...(body.knowledge !== undefined ? { knowledge: body.knowledge } : {}),
      });
      await ai.meter.flush();
      if (!result.ok) {
        if (result.code === 'AI_BUDGET_EXCEEDED') {
          throw new HttpFailure(429, result.code, result.message);
        }
        throw new HttpFailure(502, result.code, result.message);
      }
      return {
        reply: result.reply,
        agent: result.agent,
        via: result.via,
        provider: result.provider,
        toolTraces: result.toolTraces,
        usage: result.usage,
        pendingApproval: result.pendingApproval,
        redactions: result.redactions,
      };
    },
  },
  {
    method: 'get',
    path: '/ai/agents',
    operationId: 'aiAgents',
    summary: 'The 6 Zenovix agents with the skills each one may call',
    tag: 'ai',
    security: 'public',
    response: C.aiAgentsListResponseSchema,
    handler: async () => ({ items: agentViews() }),
  },
  {
    method: 'get',
    path: '/ai/skills',
    operationId: 'aiSkills',
    summary: 'The 16 KIA-OS skills with authorization metadata',
    tag: 'ai',
    security: 'public',
    response: C.aiSkillsListResponseSchema,
    handler: async () => ({ items: skillViews() }),
  },
  {
    method: 'get',
    path: '/ai/usage',
    operationId: 'aiUsage',
    summary: 'Per-user token usage against the daily cap (admin key required)',
    tag: 'ai',
    security: 'admin',
    query: z.object({ userId: z.string().min(1) }),
    response: C.aiUsageViewSchema,
    handler: async (ctx, input) => {
      const ai = requireAi(ctx);
      const userId = input.query.userId!;
      await ai.meter.ensureAllowance(userId);
      const used = await ai.meter.usedTodayOf(userId);
      const cap = ai.meter.dailyTokenCap;
      return { userId, usedToday: used, cap, remainingToday: Math.max(0, cap - used) };
    },
  },

  // ══ Command center (front/public-site) ═════════════════════════════════════
  // The dashboard SPA consumes ONLY these shapes: every route answers the
  // `{ ok: true, data: … }` envelope its api() wrapper requires. Read models
  // are DERIVED from the ledger/escrows/products tables — no second truth.
  {
    method: 'get',
    path: '/brand',
    operationId: 'getBrand',
    summary: 'White-label shell branding (BRAND_NAME / BRAND_TAGLINE env → defaults)',
    tag: 'dashboard',
    security: 'public',
    response: C.brandResponseSchema,
    handler: async ({ config }) => ({
      ok: true as const,
      data: {
        name: config.brandName ?? 'XDrop Marketplace',
        tagline: config.brandTagline ?? 'Market, wallets & economy — inside Telegram',
      },
    }),
  },
  {
    method: 'get',
    path: '/overview',
    operationId: 'getOverview',
    summary: '24h KPIs + 14-day series + top products + recent orders, derived from live tables',
    tag: 'dashboard',
    security: 'admin',
    response: C.overviewResponseSchema,
    handler: async ({ store }) => {
      const prisma = store.prisma;
      const since24 = new Date(Date.now() - 24 * 3_600_000);
      const since14 = new Date(Date.now() - 14 * 24 * 3_600_000);
      const [users, productCount, orders24, settled24, pendingApprovals, aiCalls, escrows14, topGrouped, recent] =
        await Promise.all([
          prisma.account.count({ where: { kind: 'user' } }),
          prisma.product.count({ where: { active: true } }),
          prisma.escrow.count({ where: { createdAt: { gte: since24 } } }),
          prisma.escrow.aggregate({ _sum: { amount: true }, where: { status: 'RELEASED', createdAt: { gte: since24 } } }),
          prisma.hitlRequest.count({ where: { status: 'PENDING' } }),
          prisma.aiUsage.count({ where: { at: { gte: since24 } } }),
          prisma.escrow.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true, amount: true, status: true } }),
          prisma.escrow.groupBy({ by: ['productRef'], where: { status: 'RELEASED', productRef: { not: null } }, _count: { _all: true } }),
          prisma.escrow.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
        ]);
      // Zero-filled 14-day series (UTC calendar days).
      const series = emptySeries();
      const dayIdx = new Map(series.map((s, i) => [s.date, i]));
      for (const e of escrows14) {
        const i = dayIdx.get(utcDay(e.createdAt));
        const slot = i === undefined ? undefined : series[i];
        if (slot === undefined) continue;
        slot.orders += 1;
        if (e.status === 'RELEASED') slot.revenue += e.amount;
      }
      const refs = [...new Set([...topGrouped.map((g) => g.productRef ?? ''), ...recent.map((e) => e.productRef ?? '')])].filter(Boolean);
      const prodRows = refs.length ? await prisma.product.findMany({ where: { id: { in: refs } }, select: { id: true, title: true } }) : [];
      const titleOf = new Map(prodRows.map((p) => [p.id, p.title]));
      const buyerIds = [...new Set(recent.map((e) => e.buyerId))];
      const buyers = buyerIds.length ? await prisma.account.findMany({ where: { id: { in: buyerIds } }, select: { id: true, label: true } }) : [];
      const labelOf = new Map(buyers.map((b) => [b.id, b.label]));
      const topProducts = topGrouped
        .map((g) => ({ title: titleOf.get(g.productRef ?? '') ?? g.productRef ?? '—', salesCount: g._count._all }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 5);
      return {
        ok: true as const,
        data: {
          users,
          products: productCount,
          orders: orders24,
          revenueStars: 0,
          revenueCredits: settled24._sum.amount ?? 0,
          pendingApprovals,
          aiCalls,
          series,
          topProducts,
          recentOrders: recent.map((e) => ({
            id: e.id,
            title: e.productRef !== null ? titleOf.get(e.productRef) ?? e.productRef : null,
            buyer: { name: labelOf.get(e.buyerId) ?? e.buyerId, username: null },
            totalStars: 0,
            totalCredits: e.amount,
            status: DASH_STATUS[e.status] ?? 'pending',
            createdAt: e.createdAt.toISOString(),
          })),
        },
      };
    },
  },
  {
    method: 'get',
    path: '/products',
    operationId: 'listDashProducts',
    summary: 'Market listings for the command center (public read, q search, limit/offset)',
    tag: 'dashboard',
    security: 'public',
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(12),
      offset: z.coerce.number().int().min(0).default(0),
      q: z.string().max(80).optional(),
    }),
    response: C.productListResponseSchema,
    handler: async ({ store }, { query }) => {
      const prisma = store.prisma;
      const q = query as unknown as { limit: number; offset: number; q?: string };
      const where = q.q !== undefined ? { title: { contains: q.q } } : {};
      const [rows, total, sales] = await Promise.all([
        prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.offset, take: q.limit }),
        prisma.product.count({ where }),
        prisma.escrow.groupBy({ by: ['productRef'], where: { status: 'RELEASED', productRef: { not: null } }, _count: { _all: true } }),
      ]);
      const salesOf = new Map(sales.map((s) => [s.productRef ?? '', s._count._all]));
      return {
        ok: true as const,
        data: {
          items: rows.map((r) => productView(r, salesOf.get(r.id) ?? 0)),
          total,
          limit: q.limit,
          offset: q.offset,
        },
      };
    },
  },
  {
    method: 'post',
    path: '/products',
    operationId: 'createDashProduct',
    summary: 'Create a house listing (seller = treasury); Stars are not a ledger rail — credits only',
    tag: 'dashboard',
    security: 'admin',
    body: C.createProductRequestSchema,
    response: C.productMutationResponseSchema,
    status: 201,
    handler: async ({ store }, { body }) => {
      const input = body as C.CreateProductRequest;
      const row = await store.prisma.product.create({
        data: {
          id: `prod_${randomUUID()}`,
          sellerId: D.TREASURY_ACCOUNT_ID,
          title: input.title,
          description: input.description ?? '',
          priceDin: input.priceCredits ?? 0,
          category: input.category ?? 'general',
        },
      });
      await store.prisma.auditLog.create({ data: { actor: 'dashboard', action: 'product.create', target: row.id } });
      return { ok: true as const, data: productView(row, 0) };
    },
  },
  {
    method: 'patch',
    path: '/products/{id}',
    operationId: 'updateDashProduct',
    summary: 'Edit a listing (title/category/description/price/active; stock & stars are dashboard-only views)',
    tag: 'dashboard',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.updateProductRequestSchema,
    response: C.productMutationResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.UpdateProductRequest;
      const existing = await store.prisma.product.findUnique({ where: { id: params.id! } });
      if (existing === null) {
        throw new DomainFailure({ code: 'PRODUCT_NOT_FOUND', message: `Product ${params.id} does not exist` });
      }
      const row = await store.prisma.product.update({
        where: { id: params.id! },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priceCredits !== undefined ? { priceDin: input.priceCredits } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      await store.prisma.auditLog.create({ data: { actor: 'dashboard', action: 'product.update', target: row.id } });
      return { ok: true as const, data: productView(row, undefined) };
    },
  },
  {
    method: 'delete',
    path: '/products/{id}',
    operationId: 'archiveDashProduct',
    summary: 'Archive a listing (soft — the row stays for ledger/escrow references)',
    tag: 'dashboard',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    response: C.productMutationResponseSchema,
    handler: async ({ store }, { params }) => {
      const existing = await store.prisma.product.findUnique({ where: { id: params.id! } });
      if (existing === null) {
        throw new DomainFailure({ code: 'PRODUCT_NOT_FOUND', message: `Product ${params.id} does not exist` });
      }
      const row = await store.prisma.product.update({ where: { id: params.id! }, data: { active: false } });
      await store.prisma.auditLog.create({ data: { actor: 'dashboard', action: 'product.archive', target: row.id } });
      return { ok: true as const, data: productView(row, undefined) };
    },
  },
  {
    method: 'get',
    path: '/orders',
    operationId: 'listDashOrders',
    summary: 'Escrow marketplace orders in dashboard shapes (status filter + paging)',
    tag: 'dashboard',
    security: 'admin',
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
      status: z.enum(['all', 'paid', 'pending', 'delivered', 'refunded', 'cancelled']).default('all'),
    }),
    response: C.orderListResponseSchema,
    handler: async ({ store }, { query }) => {
      const prisma = store.prisma;
      const q = query as unknown as { limit: number; offset: number; status: 'all' | 'paid' | 'pending' | 'delivered' | 'refunded' | 'cancelled' };
      const statuses = ORDER_STATUS_FILTER[q.status];
      const where = statuses !== undefined ? { status: { in: [...statuses] } } : {};
      const [rows, total] = await Promise.all([
        prisma.escrow.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.offset, take: q.limit }),
        prisma.escrow.count({ where }),
      ]);
      const refIds = [...new Set(rows.map((e) => e.productRef).filter((v): v is string => v !== null))];
      const buyerIds = [...new Set(rows.map((e) => e.buyerId))];
      const [prodRows, buyers] = await Promise.all([
        refIds.length ? prisma.product.findMany({ where: { id: { in: refIds } }, select: { id: true, title: true } }) : [],
        buyerIds.length ? prisma.account.findMany({ where: { id: { in: buyerIds } }, select: { id: true, label: true } }) : [],
      ]);
      const titleOf = new Map(prodRows.map((p) => [p.id, p.title]));
      const labelOf = new Map(buyers.map((b) => [b.id, b.label]));
      return {
        ok: true as const,
        data: {
          items: rows.map((e) => ({
            id: e.id,
            product: e.productRef !== null ? titleOf.get(e.productRef) ?? e.productRef : '—',
            buyer: { name: labelOf.get(e.buyerId) ?? e.buyerId, username: null },
            totalStars: 0,
            totalCredits: e.amount,
            status: DASH_STATUS[e.status] ?? 'pending',
            createdAt: e.createdAt.toISOString(),
          })),
          total,
        },
      };
    },
  },
  {
    method: 'post',
    path: '/orders/{id}/status',
    operationId: 'dashOrderAction',
    summary: 'deliver → DELIVERED (from FUNDED) · cancel → CANCELLED (from CREATED) · refund → REFUNDED (from DISPUTED)',
    tag: 'dashboard',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.orderActionRequestSchema,
    response: C.orderActionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.OrderActionRequest;
      const id = params.id!;
      const escrow = await store.getEscrow(id);
      if (escrow === null) {
        throw new DomainFailure({ code: 'ESCROW_NOT_FOUND', message: `Escrow ${id} does not exist` });
      }
      const run: Parameters<typeof store.apply>[0]['run'] =
        input.action === 'deliver'
          ? (ledger, registry) => D.deliverEscrow(ledger, registry, { escrowId: id })
          : input.action === 'cancel'
            ? (ledger, registry) => D.cancelEscrow(ledger, registry, { escrowId: id })
            : (ledger, registry) => D.refundEscrow(ledger, registry, { escrowId: id });
      const result = await store.apply({
        actor: 'dashboard',
        action: `escrow.${input.action}`,
        target: id,
        escrowId: id,
        run,
      });
      return { ok: true as const, data: { id, status: requireEscrow(result).status } };
    },
  },
  {
    method: 'get',
    path: '/users',
    operationId: 'listDashUsers',
    summary: 'User accounts (kind=user) for the wallets→users subtab',
    tag: 'dashboard',
    security: 'admin',
    query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }),
    response: C.dashUserListResponseSchema,
    handler: async ({ store }, { query }) => {
      const take = Number(query.limit ?? 100);
      const rows = await store.prisma.account.findMany({
        where: { kind: 'user' },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, label: true, createdAt: true },
      });
      return {
        ok: true as const,
        data: {
          items: rows.map((a) => ({
            id: a.id,
            name: a.label ?? a.id,
            username: null,
            role: 'user',
            language: null,
            createdAt: a.createdAt.toISOString(),
          })),
        },
      };
    },
  },
  {
    method: 'get',
    path: '/wallets',
    operationId: 'listDashWallets',
    summary: 'Derived balances + escrow-locked amounts per user account',
    tag: 'dashboard',
    security: 'admin',
    query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }),
    response: C.dashWalletListResponseSchema,
    handler: async ({ store }, { query }) => {
      const take = Number(query.limit ?? 100);
      const [all, lockedRows] = await Promise.all([
        store.listAccountsWithBalances(),
        store.prisma.escrow.groupBy({ by: ['buyerId'], where: { status: 'FUNDED' }, _sum: { amount: true } }),
      ]);
      const lockedOf = new Map(lockedRows.map((r) => [r.buyerId, r._sum.amount ?? 0]));
      return {
        ok: true as const,
        data: {
          items: all
            .filter((a) => a.kind === 'user')
            .slice(0, take)
            .map((a) => ({
              name: a.label ?? a.id,
              username: null,
              role: 'user',
              balance: a.balance,
              locked: lockedOf.get(a.id) ?? 0,
              credits: a.balance,
            })),
        },
      };
    },
  },
  {
    method: 'get',
    path: '/quests',
    operationId: 'listDashQuests',
    summary: 'Quest rail — empty until the quest engine ships (renders a clean empty state)',
    tag: 'dashboard',
    security: 'public',
    response: C.dashListResponseSchema,
    handler: async () => ({ ok: true as const, data: { items: [] } }),
  },
  {
    method: 'get',
    path: '/bookings',
    operationId: 'listDashBookings',
    summary: 'Bookings rail — empty until the booking engine ships (renders a clean empty state)',
    tag: 'dashboard',
    security: 'public',
    response: C.dashListResponseSchema,
    handler: async () => ({ ok: true as const, data: { items: [] } }),
  },
  {
    method: 'get',
    path: '/leaderboard',
    operationId: 'dashLeaderboard',
    summary: 'sales = settled escrows per seller (real); xp/ref rails ship with the quest engine',
    tag: 'dashboard',
    security: 'public',
    query: C.leaderboardQuerySchema,
    response: C.leaderboardResponseSchema,
    handler: async ({ store }, { query }) => {
      const q = query as unknown as { type: 'xp' | 'sales' | 'ref'; limit: number };
      if (q.type !== 'sales') return { ok: true as const, data: { items: [] } };
      const grouped = await store.prisma.escrow.groupBy({
        by: ['sellerId'],
        where: { status: 'RELEASED' },
        _count: { _all: true },
      });
      const top = grouped
        .map((g) => ({ sellerId: g.sellerId, sales: g._count._all }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, q.limit);
      const sellers = top.length
        ? await store.prisma.account.findMany({ where: { id: { in: top.map((t) => t.sellerId) } }, select: { id: true, label: true } })
        : [];
      const labelOf = new Map(sellers.map((s) => [s.id, s.label]));
      return {
        ok: true as const,
        data: {
          items: top.map((t, i) => ({
            rank: i + 1,
            name: labelOf.get(t.sellerId) ?? t.sellerId,
            username: null,
            xp: 0,
            sales: t.sales,
            refs: 0,
          })),
        },
      };
    },
  },
  {
    method: 'get',
    path: '/approvals',
    operationId: 'listDashApprovals',
    summary: 'HITL queue in dashboard shapes (risk level derives from the charter threshold)',
    tag: 'dashboard',
    security: 'admin',
    query: C.approvalListQuerySchema,
    response: C.approvalListResponseSchema,
    handler: async ({ store }, { query }) => {
      const wire = APPROVAL_STATUS_WIRE[query.status ?? 'pending'];
      const rows = await store.listHitl(wire as C.HitlStatusWire | undefined);
      return {
        ok: true as const,
        data: {
          items: rows.map((r) => ({
            id: r.id,
            type: r.kind,
            riskLevel: riskLevel(r.amount),
            summary: `Release ${r.amount} Đ — escrow ${r.escrowId}`,
            note: r.note,
            amount: r.amount,
            status: r.status.toLowerCase(),
            createdAt: r.createdAt.toISOString(),
            expiresAt: r.expiresAt.toISOString(),
          })),
        },
      };
    },
  },
  {
    method: 'post',
    path: '/approvals/{id}/decide',
    operationId: 'dashApprovalDecision',
    summary: 'Approve settles the escrow in the same transaction; reject locks it for arbitration',
    tag: 'dashboard',
    security: 'admin',
    params: z.object({ id: C.idSchema }),
    body: C.approvalDecisionRequestSchema,
    response: C.approvalDecisionResponseSchema,
    handler: async ({ store }, { params, body }) => {
      const input = body as C.ApprovalDecisionRequest;
      const row = await store.getHitl(params.id!);
      if (row === null) {
        throw new DomainFailure({ code: 'HITL_NOT_FOUND', message: `HITL request ${params.id} does not exist` });
      }
      const decided = await store.decideHitl({
        requestId: row.id,
        decision: input.approve ? 'APPROVED' : 'REJECTED',
        decidedBy: 'dashboard',
        ...(input.note !== undefined ? { decisionNote: input.note } : {}),
        execute: input.approve
          ? (ledger, registry) =>
              D.releaseEscrow(ledger, registry, {
                escrowId: row.escrowId,
                approvedByAdmin: true,
                idempotencyKey: `hitl:${row.id}:approve`,
              })
          : () => {
              // Unreachable for REJECTED — decideHitl only calls execute on APPROVED.
              throw new HttpFailure(500, 'INTERNAL', 'REJECTED decision must not execute a settlement.');
            },
      });
      return {
        ok: true as const,
        data: {
          id: decided.request.id,
          status: decided.request.status.toLowerCase(),
          escrowId: row.escrowId,
          txId: decided.tx?.id ?? null,
        },
      };
    },
  },
  {
    method: 'get',
    path: '/settings',
    operationId: 'listDashSettings',
    summary: 'Runtime settings — empty until the KV model ships (brand lives in env today)',
    tag: 'dashboard',
    security: 'admin',
    response: C.settingsListResponseSchema,
    handler: async () => ({ ok: true as const, data: { items: [] } }),
  },
  {
    method: 'put',
    path: '/settings',
    operationId: 'putDashSetting',
    summary: '501 until the KV model ships — honest refusal beats a silent no-op',
    tag: 'dashboard',
    security: 'admin',
    body: C.settingsPutRequestSchema,
    response: C.settingsListResponseSchema,
    handler: async () => {
      throw new HttpFailure(501, 'NOT_IMPLEMENTED', 'Settings persistence is not wired yet — branding comes from BRAND_NAME / BRAND_TAGLINE env.');
    },
  },
  {
    method: 'get',
    path: '/security',
    operationId: 'dashSecurity',
    summary: 'Live defense-in-depth layers (real config flags) + the audit trail tail',
    tag: 'dashboard',
    security: 'admin',
    response: C.securityResponseSchema,
    handler: async ({ store, config }) => {
      const audit = await store.prisma.auditLog.findMany({ orderBy: { at: 'desc' }, take: 15 });
      return {
        ok: true as const,
        data: {
          layers: [
            { id: 'L01', name: 'Double-entry ledger', description: 'Balances are derived from postings — the postings table is the single source of truth', active: true },
            { id: 'L02', name: 'Idempotent commands', description: 'Replayed commands never move money twice', active: true },
            { id: 'L03', name: 'Escrow state machine', description: 'Fund → deliver → release, with disputes, refunds and TTL expiry', active: true },
            { id: 'L04', name: 'HITL threshold gate', description: `Releases ≥ ${D.CHARTER.hitlThresholdDin} Đ require human approval`, active: true },
            { id: 'L05', name: 'Admin key (X-KIA-Key)', description: 'Admin endpoints fail closed without KIA_ADMIN_KEY', active: config.adminKey !== undefined },
            { id: 'L06', name: 'Rate limiting', description: `${config.rateLimitPerMin} requests/minute per client (admin calls share one bucket)`, active: true },
            { id: 'L07', name: 'Audit log', description: 'Money-adjacent actions land in the audit trail', active: true },
            { id: 'L08', name: 'Telegram identity (initData HMAC)', description: 'Public AI callers must prove a Telegram identity; staff role is key-gated', active: config.botToken !== undefined },
            { id: 'L09', name: 'AI daily token cap', description: 'Per-user budget stops runaway agent spend', active: config.aiProviders !== undefined },
            { id: 'L10', name: 'Boot backups', description: 'VACUUM INTO snapshots at boot with pruned retention', active: true },
            { id: 'L11', name: 'Fail-closed config', description: 'Missing DATABASE_URL refuses to boot; partial LLM env refuses to boot', active: true },
            { id: 'L12', name: 'TLS at the edge', description: 'HTTPS termination and DDoS shielding by the platform edge', active: true },
          ],
          audit: audit.map((a) => ({
            id: a.id,
            actor: a.actor,
            action: a.action,
            target: a.target,
            status: 'ok',
            createdAt: a.at.toISOString(),
          })),
        },
      };
    },
  },
];

// ── Phase 5 helpers ──────────────────────────────────────────────────────────

function requireAi(ctx: RouteContext): AssembledAi {
  if (ctx.ai === undefined) {
    throw new HttpFailure(503, 'AI_DISABLED', 'The AI cycle is not configured — set OPENAI_BASE_URL / OPENAI_API_KEY / MODEL (ADR-006).');
  }
  return ctx.ai;
}

function headerValue(headers: RouteInput['headers'], name: string): string | undefined {
  if (headers === undefined) return undefined;
  const raw = headers[name];
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function agentViews(): C.AiAgentView[] {
  return AGENT_ORDER.map((name) => {
    const def = AGENTS[name];
    return {
      name,
      emoji: def.emoji,
      titleFa: def.titleFa,
      titleEn: def.titleEn,
      description: def.description,
      skills: Object.values(SKILLS)
        .filter((s) => s.allowedAgents.includes(name))
        .map((s) => s.id),
    };
  });
}

function skillViews(): C.AiSkillView[] {
  return Object.values(SKILLS).map((s) => ({
    id: s.id,
    kind: s.kind,
    titleFa: s.titleFa,
    titleEn: s.titleEn,
    description: s.description,
    allowedAgents: [...s.allowedAgents],
    staffOnly: s.staffOnly === true,
  }));
}

function hitlToView(row: {
  id: string;
  kind: string;
  escrowId: string;
  amount: number;
  requesterId: string;
  note: string | null;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
}): C.HitlView {
  return {
    id: row.id,
    kind: row.kind as C.HitlKind,
    escrowId: row.escrowId,
    amount: row.amount,
    requesterId: row.requesterId,
    note: row.note,
    status: row.status as C.HitlStatusWire,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt !== null ? row.decidedAt.toISOString() : null,
    decisionNote: row.decisionNote,
  };
}

// ── Command-center helpers ───────────────────────────────────────────────────

/** Real package version — the footer and settings page render it verbatim. */
export function serverVersion(): string {
  try {
    const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? 'dev';
  } catch {
    return 'dev';
  }
}

/** Escrow status → the dashboard's chip vocabulary. */
const DASH_STATUS: Record<string, string> = {
  CREATED: 'pending',
  FUNDED: 'paid',
  DELIVERED: 'delivered',
  RELEASED: 'delivered',
  DISPUTED: 'pending',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  EXPIRED: 'cancelled',
};

/** Dashboard order filter → the escrow statuses it means on the wire. */
const ORDER_STATUS_FILTER: Record<string, readonly string[] | undefined> = {
  all: undefined,
  pending: ['CREATED', 'DISPUTED'],
  paid: ['FUNDED'],
  delivered: ['DELIVERED', 'RELEASED'],
  refunded: ['REFUNDED'],
  cancelled: ['CANCELLED', 'EXPIRED'],
};

const APPROVAL_STATUS_WIRE: Record<string, string | undefined> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  expired: 'EXPIRED',
  all: undefined,
};

function riskLevel(amount: number): 'low' | 'medium' | 'high' {
  if (amount >= D.CHARTER.hitlThresholdDin) return 'high';
  if (amount >= 10_000) return 'medium';
  return 'low';
}

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 14 UTC calendar days ending today, zero-filled — the chart draws exactly this. */
function emptySeries(): { date: string; revenue: number; orders: number }[] {
  const out: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    out.push({ date: utcDay(new Date(Date.now() - i * 24 * 3_600_000)), revenue: 0, orders: 0 });
  }
  return out;
}

interface ProductRowLike {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceDin: number;
  category: string | null;
  active: boolean;
  createdAt: Date;
}

/** Product row → the dashboard's card shape (stock/stars/featured are view-only). */
function productView(r: ProductRowLike, salesCount?: number): C.ProductView {
  return {
    id: r.id,
    sellerId: r.sellerId,
    title: r.title,
    description: r.description,
    category: r.category ?? 'general',
    priceStars: 0,
    priceCredits: r.priceDin,
    stock: -1,
    salesCount: salesCount ?? 0,
    featured: false,
    status: r.active ? 'active' : 'archived',
    createdAt: r.createdAt.toISOString(),
  };
}
