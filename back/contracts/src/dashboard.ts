/**
 * Dashboard (command-center) wire contracts — the shapes front/public-site/app.js
 * consumes through its `api()` wrapper. EVERY dashboard route answers the
 * envelope `{ ok: true, data: … }` — the SPA treats any other 2xx shape as a
 * failure, so the envelope is part of the contract, not a convention.
 *
 * Currency note: the v3 ledger is single-currency (dinar). The dashboard UI
 * renders two revenue slots (Telegram Stars ⭐ and credits 💎) — Stars stay at
 * 0 until a Stars rail exists, credits carry the dinar figures.
 */

import { z } from 'zod';
import { DNX, isoDateTimeSchema } from './common.js';

const dashCount = z.number().int().min(0);
const dashPerson = z.object({ name: z.string().nullable(), username: z.string().nullable() });

// ── brand ────────────────────────────────────────────────────────────────────

export const brandResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    name: z.string().min(1),
    tagline: z.string(),
  }),
});
export type BrandResponse = z.infer<typeof brandResponseSchema>;

// ── overview ─────────────────────────────────────────────────────────────────

export const overviewResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    users: dashCount,
    products: dashCount,
    orders: dashCount,
    revenueStars: dashCount,
    revenueCredits: dashCount,
    pendingApprovals: dashCount,
    aiCalls: dashCount,
    /** Exactly the last 14 UTC days, zero-filled — the chart draws this. */
    series: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), revenue: dashCount, orders: dashCount })),
    topProducts: z.array(z.object({ title: z.string(), salesCount: dashCount })),
    recentOrders: z.array(
      z.object({
        id: z.string(),
        title: z.string().nullable(),
        buyer: dashPerson,
        totalStars: dashCount,
        totalCredits: dashCount,
        status: z.string(),
        createdAt: isoDateTimeSchema,
      }),
    ),
  }),
});
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;

// ── products (market) ────────────────────────────────────────────────────────

export const productViewSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priceStars: dashCount,
  priceCredits: dashCount,
  /** −1 = unlimited (the dashboard's convention). */
  stock: z.number().int(),
  salesCount: dashCount,
  featured: z.boolean(),
  status: z.enum(['active', 'archived']),
  createdAt: isoDateTimeSchema,
});
export type ProductView = z.infer<typeof productViewSchema>;

export const productListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    items: z.array(productViewSchema),
    total: dashCount,
    limit: dashCount,
    offset: dashCount,
  }),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const createProductRequestSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().max(40).optional(),
  priceStars: DNX.optional(),
  priceCredits: DNX.optional(),
  stock: z.number().int().optional(),
  featured: z.boolean().optional(),
  description: z.string().max(800).optional(),
});
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

export const updateProductRequestSchema = createProductRequestSchema.partial().extend({
  /** The edit form carries the active checkbox — maps to the `active` column. */
  active: z.boolean().optional(),
});
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

export const productMutationResponseSchema = z.object({
  ok: z.literal(true),
  data: productViewSchema,
});
export type ProductMutationResponse = z.infer<typeof productMutationResponseSchema>;

// ── orders (escrow marketplace views) ────────────────────────────────────────

export const orderViewSchema = z.object({
  id: z.string(),
  product: z.string(),
  buyer: dashPerson,
  totalStars: dashCount,
  totalCredits: dashCount,
  status: z.string(),
  createdAt: isoDateTimeSchema,
});
export type OrderView = z.infer<typeof orderViewSchema>;

export const orderListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    items: z.array(orderViewSchema),
    total: dashCount,
  }),
});
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

export const orderActionRequestSchema = z.object({
  action: z.enum(['deliver', 'cancel', 'refund']),
});
export type OrderActionRequest = z.infer<typeof orderActionRequestSchema>;

export const orderActionResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    id: z.string(),
    status: z.string(),
  }),
});
export type OrderActionResponse = z.infer<typeof orderActionResponseSchema>;

// ── users + wallets ──────────────────────────────────────────────────────────

export const dashUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().nullable(),
  role: z.string(),
  language: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type DashUser = z.infer<typeof dashUserSchema>;

export const dashUserListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ items: z.array(dashUserSchema) }),
});
export type DashUserListResponse = z.infer<typeof dashUserListResponseSchema>;

export const dashWalletSchema = z.object({
  name: z.string(),
  username: z.string().nullable(),
  role: z.string(),
  balance: z.number().int(),
  locked: dashCount,
  credits: z.number().int(),
});
export type DashWallet = z.infer<typeof dashWalletSchema>;

export const dashWalletListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ items: z.array(dashWalletSchema) }),
});
export type DashWalletListResponse = z.infer<typeof dashWalletListResponseSchema>;

// ── quests / leaderboard / bookings ─────────────────────────────────────────

export const dashListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ items: z.array(z.record(z.string(), z.unknown())) }),
});
export type DashListResponse = z.infer<typeof dashListResponseSchema>;

export const leaderboardQuerySchema = z.object({
  type: z.enum(['xp', 'sales', 'ref']).default('xp'),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export const leaderboardResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    items: z.array(
      z.object({
        rank: dashCount,
        name: z.string(),
        username: z.string().nullable(),
        xp: dashCount,
        sales: dashCount,
        refs: dashCount,
      }),
    ),
  }),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;

// ── approvals (HITL views) ───────────────────────────────────────────────────

export const approvalViewSchema = z.object({
  id: z.string(),
  type: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  note: z.string().nullable(),
  amount: dashCount,
  status: z.string(),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema.nullable(),
});
export type ApprovalView = z.infer<typeof approvalViewSchema>;

export const approvalListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired', 'all']).default('pending'),
});

export const approvalListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ items: z.array(approvalViewSchema) }),
});
export type ApprovalListResponse = z.infer<typeof approvalListResponseSchema>;

export const approvalDecisionRequestSchema = z.object({
  approve: z.boolean(),
  note: z.string().max(500).optional(),
});
export type ApprovalDecisionRequest = z.infer<typeof approvalDecisionRequestSchema>;

export const approvalDecisionResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    id: z.string(),
    status: z.string(),
    escrowId: z.string().nullable(),
    txId: z.string().nullable(),
  }),
});
export type ApprovalDecisionResponse = z.infer<typeof approvalDecisionResponseSchema>;

// ── settings + security ──────────────────────────────────────────────────────

export const settingsListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ items: z.array(z.object({ key: z.string(), value: z.string() })) }),
});
export type SettingsListResponse = z.infer<typeof settingsListResponseSchema>;

export const settingsPutRequestSchema = z.object({
  key: z.string().min(1).max(128),
  value: z.string().max(2000),
});
export type SettingsPutRequest = z.infer<typeof settingsPutRequestSchema>;

export const securityResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    layers: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        active: z.boolean(),
      }),
    ),
    audit: z.array(
      z.object({
        id: z.string(),
        actor: z.string(),
        action: z.string(),
        target: z.string().nullable(),
        status: z.string(),
        createdAt: isoDateTimeSchema,
      }),
    ),
  }),
});
export type SecurityResponse = z.infer<typeof securityResponseSchema>;
