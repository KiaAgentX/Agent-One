/**
 * SQLite snapshotting — the v3 database IS the money, so it must never live
 * in exactly one copy. `VACUUM INTO` produces a consistent online snapshot
 * (safe while the server keeps serving; SQLite ≥ 3.25) into the volume's
 * backups directory, then prunes the oldest files down to `keep`.
 *
 * Two triggers:
 *  - boot time (single-service.ts): the pre-boot state is captured before
 *    anything (including a schema push) can touch it;
 *  - on demand: POST /api/v1/system/backup (admin-gated, typed contract).
 */

import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { HttpFailure } from './errors.js';

export interface BackupResult {
  readonly file: string;
  readonly sizeBytes: number;
  readonly kept: number;
  readonly createdAt: string;
}

export function backupDirFor(databaseUrl: string | undefined, override?: string): string {
  if (override !== undefined) return override;
  if (databaseUrl === undefined || !databaseUrl.startsWith('file:')) {
    throw new HttpFailure(503, 'BACKUP_UNSUPPORTED', 'Backups apply to file: (SQLite) databases only.');
  }
  return path.join(path.dirname(databaseUrl.slice('file:'.length)), 'backups');
}

export async function createBackup(
  prisma: PrismaClient,
  opts: { readonly databaseUrl?: string; readonly dir?: string; readonly keep?: number } = {},
): Promise<BackupResult> {
  const dir = backupDirFor(opts.databaseUrl ?? process.env.DATABASE_URL, opts.dir);
  const createdAt = new Date();
  // ISO with ':' and '.' swapped out — filesystem- and volume-friendly.
  const name = `v3-backup-${createdAt.toISOString().replace(/[:.]/g, '-')}.db`;
  const target = path.join(dir, name);

  mkdirSync(dir, { recursive: true });
  try {
    // VACUUM INTO refuses to overwrite an existing file — the timestamped
    // name makes that impossible; quote-escape anyway (defense in depth).
    await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : 'unknown SQLite failure';
    throw new HttpFailure(500, 'BACKUP_FAILED', `VACUUM INTO failed — ${message}`);
  }

  const keep = Math.max(1, opts.keep ?? 7);
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('v3-backup-') && f.endsWith('.db'))
    .sort(); // ISO-timestamped names sort chronologically
  let removed = 0;
  while (files.length > keep) {
    const oldest = files.shift();
    if (oldest === undefined) break;
    rmSync(path.join(dir, oldest), { force: true });
    removed += 1;
  }

  return {
    file: target,
    sizeBytes: statSync(target).size,
    kept: files.length,
    createdAt: createdAt.toISOString(),
  };
}
