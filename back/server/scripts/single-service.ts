/**
 * Single-service entrypoint (Railway, DNA-v2 pattern) — ONE process runs the
 * Fastify server AND the Telegram bot. The bot talks to the server over
 * loopback HTTP (same trust boundary as any client); the HITL sweep interval
 * rides along. Development uses polling; Railway arms the webhook:
 *
 *   BOT_MODE=webhook  BOT_WEBHOOK_URL=https://<app>.up.railway.app/api/v1/bot/webhook
 *   TELEGRAM_WEBHOOK_SECRET=<random>   (optional but recommended)
 *
 * Run: pnpm -F @dropagentx/server exec tsx scripts/single-service.ts
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { buildApp } from '../src/index.js';

// Zero-config boot: Railway does not reliably surface image-level ENV to the
// process, and a fresh service ships no variables at all — so the entrypoint
// itself defaults the database to the canonical volume path BEFORE the
// fail-closed config gate runs. An explicitly set DATABASE_URL always wins;
// empty-string vars count as unset (dotenv-style files leave empties behind).
if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = 'file:/app/db/v3.db';
  console.log('[single] DATABASE_URL unset — defaulting to file:/app/db/v3.db');
}
// Zero-config Mini App: when the webhook is armed the deployment origin is
// known — derive the Mini-App base (served at /app by this same process) so
// the bot's web_app buttons ("اپ تلگرام") arm without a fourth variable.
// An explicit WEBAPP_BASE_URL always wins; non-https origins are ignored.
if (process.env.WEBAPP_BASE_URL === undefined || process.env.WEBAPP_BASE_URL.trim() === '') {
  const hook = process.env.BOT_WEBHOOK_URL;
  if (hook !== undefined && hook.trim() !== '') {
    try {
      const origin = new URL(hook.trim()).origin;
      if (origin.startsWith('https://')) {
        process.env.WEBAPP_BASE_URL = `${origin}/app/`;
        console.log(`[single] WEBAPP_BASE_URL derived from webhook origin → ${process.env.WEBAPP_BASE_URL}`);
      }
    } catch {
      // non-URL webhook value — config validation will speak up, not us
    }
  }
}
const config = loadConfig();

// Launch gate: a fresh Railway volume is an EMPTY SQLite file — ensure the
// schema exists before the first upsert. `db push` is idempotent: it creates
// tables on a fresh volume, syncs additive drift, and refuses destructive
// changes loudly (fail-closed). Only meaningful for file: (SQLite) databases.
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl !== undefined && databaseUrl.startsWith('file:')) {
  // Boot-time snapshot BEFORE anything touches the file — even a failing
  // schema push can no longer destroy the previous state unnoticed. A fresh
  // volume (no db file yet) simply skips with a warning.
  try {
    const { PrismaClient } = await import('@prisma/client');
    const { createBackup } = await import('../src/backup.js');
    const snapshotter = new PrismaClient();
    const snap = await createBackup(snapshotter, { databaseUrl, keep: 7 });
    await snapshotter.$disconnect();
    console.log(`[single] boot backup → ${snap.file} (${Math.round(snap.sizeBytes / 1024)} KB, keeping ${snap.kept})`);
  } catch (err) {
    console.warn(`[single] boot backup skipped — ${err instanceof Error ? err.message : err}`);
  }
  console.log('[single] ensuring database schema (prisma db push)…');
  execSync('pnpm exec prisma db push --skip-generate', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit',
  });
}
const built = await buildApp(config);

let stopBot: (() => Promise<void>) | null = null;
if (config.botToken !== undefined) {
  const { buildBot, loadBotConfig } = await import('@dropagentx/bot/main');
  const botConfig = loadBotConfig({
    ...process.env,
    SERVER_BASE_URL: process.env.SERVER_BASE_URL ?? `http://127.0.0.1:${config.port}/api/v1`,
    KIA_ADMIN_KEY: process.env.KIA_ADMIN_KEY ?? config.adminKey ?? '',
  });
  const running = buildBot(botConfig);
  stopBot = () => running.stop();

  if (running.handleWebhook !== undefined) {
    const handleWebhook = running.handleWebhook;
    const secret = running.webhookSecret;
    built.app.post('/api/v1/bot/webhook', async (req, reply) => {
      const url = `http://127.0.0.1:${config.port}${req.url}`;
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(typeof req.headers['x-telegram-bot-api-secret-token'] === 'string'
            ? { 'x-telegram-bot-api-secret-token': req.headers['x-telegram-bot-api-secret-token'] }
            : {}),
        },
        body,
      });
      const response = await handleWebhook(request);
      const text = await response.text();
      reply.code(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(text);
    });
    console.log('[single] Telegram webhook mounted at /api/v1/bot/webhook');
  } else {
    console.log('[single] bot in polling mode (development)');
  }
}

await built.app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`[single] DropAgentX v3 on :${config.port} — site at /, mini app at /app, docs at /api/v1/docs${stopBot !== null ? ' · bot attached' : ''}`);

const shutdown = async (): Promise<void> => {
  console.log('[single] shutting down…');
  if (stopBot !== null) await stopBot();
  await built.app.close();
  await built.prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
