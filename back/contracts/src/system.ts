/**
 * System meta contracts (health).
 * LLM fields (ADR-006) expose CONFIGURATION presence only — never the key,
 * never the base URL. A null model means the AI cycle is disabled.
 */

import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('dropagentx-v3-server'),
  version: z.string(),
  llmConfigured: z.boolean(),
  llmModel: z.string().nullable(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const backupCreatedSchema = z.object({
  /** Absolute path of the snapshot inside the volume (db/backups/…). */
  file: z.string(),
  sizeBytes: z.number().int().min(0),
  /** Snapshots retained on disk after pruning. */
  kept: z.number().int().min(0),
  createdAt: z.string(),
});

export type BackupCreated = z.infer<typeof backupCreatedSchema>;

// ── route definitions (one per endpoint — ADR-005) ──────────────────────────

export const SYSTEM_ROUTES = [
  {
    method: 'POST' as const,
    path: '/system/backup',
    operationId: 'createBackup',
    summary: 'Consistent SQLite snapshot (VACUUM INTO) into db/backups — prunes to the newest KEEP_BACKUPS files. Admin-gated.',
    tag: 'system',
    security: 'admin' as const,
    response: backupCreatedSchema,
    status: 200,
  },
];
