/**
 * System backups — consistent SQLite snapshots via VACUUM INTO.
 * Covers the new ops option: a snapshot must be non-empty, the retention
 * window must prune, and non-SQLite databases must fail loudly (fail-closed).
 */

import { mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { backupDirFor, createBackup } from '../src/backup.js';

// tests/setup.ts already pushed a schema into process.env.DATABASE_URL (file:…)
const prisma = new PrismaClient();

describe('system backups — consistent SQLite snapshots', () => {
  it('VACUUM INTO produces a non-empty snapshot and prunes to the keep window', async () => {
    // An isolated per-run directory — parallel vitest workers share process.env,
    // so deriving the dir from DATABASE_URL would couple suites together.
    const dir = mkdtempSync(path.join(tmpdir(), 'v3-backup-test-'));

    const r1 = await createBackup(prisma, { dir, keep: 2 });
    expect(statSync(r1.file).size).toBeGreaterThan(0);
    expect(r1.kept).toBe(1);
    expect(r1.createdAt).toBeTruthy();

    await createBackup(prisma, { dir, keep: 2 });
    const r3 = await createBackup(prisma, { dir, keep: 2 });
    const files = readdirSync(dir).filter((f) => f.startsWith('v3-backup-') && f.endsWith('.db'));
    expect(files.length).toBe(2); // keep=2 enforced
    expect(r3.kept).toBe(2);
    expect(r3.sizeBytes).toBeGreaterThan(0);
  });

  it('backupDirFor derives <db-dir>/backups from a file: URL', () => {
    expect(backupDirFor('file:/app/db/v3.db')).toBe('/app/db/backups');
  });

  it('refuses non-file databases loudly (BACKUP_UNSUPPORTED — fail-closed)', async () => {
    await expect(createBackup(prisma, { databaseUrl: 'postgres://user@host/db' })).rejects.toMatchObject({
      code: 'BACKUP_UNSUPPORTED',
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
