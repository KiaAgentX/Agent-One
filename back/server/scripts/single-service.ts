/**
 * Single-service entrypoint (Railway, DNA-v2 pattern) — ONE process runs the
 * Fastify server AND the Telegram bot. The bot talks to the server over
 * loopback HTTP (same trust boundary as any client); the HITL sweep interval
 * rides along. Development uses polling; Railway arms the webhook:
 *
 *   BOT_MODE=webhook  BOT_WEBHOOK_URL=https://<app>.up.railway.app/api/v1/bot/webhook
 *   TELEGRAM_WEBHOOK_SECRET=<random>   (optional but recommended)
 *
 *   On Railway this is AUTOMATIC: a public domain (RAILWAY_PUBLIC_DOMAIN)
 *   switches the bot to webhook mode at boot — Telegram pushes updates, there
 *   is no getUpdates long-poll to collide over, so deploy overlaps can never
 *   409-crash the bot again. Local dev (no domain) keeps long-polling; an
 *   explicit BOT_MODE always wins (BOT_MODE=polling opts out).
 *
 * Run: pnpm -F @dropagentx/server exec tsx scripts/single-service.ts
 */

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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
// Zero-config webhook: a Railway public domain means the bot defaults to
// WEBHOOK mode — no getUpdates long-poll exists, so the deploy-overlap 409
// (two instances racing for updates during a redeploy) cannot happen at all.
// A boot-ephemeral secret is armed on BOTH sides (setWebhook + handler
// verification read the same var below); regenerated per boot, so in-flight
// updates signed with the previous secret are dropped only for the seconds
// between container start and setWebhook. Single-replica by design — a multi-
// replica deploy must set a shared TELEGRAM_WEBHOOK_SECRET explicitly.
const botMode = process.env.BOT_MODE?.trim();
const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
if ((botMode === undefined || botMode === '') && publicDomain !== undefined && publicDomain !== '') {
  process.env.BOT_MODE = 'webhook';
  process.env.BOT_WEBHOOK_URL = `https://${publicDomain}/api/v1/bot/webhook`;
  if (process.env.TELEGRAM_WEBHOOK_SECRET === undefined || process.env.TELEGRAM_WEBHOOK_SECRET.trim() === '') {
    process.env.TELEGRAM_WEBHOOK_SECRET = randomBytes(32).toString('hex');
  }
  console.log(`[single] public domain present — bot defaults to WEBHOOK mode → ${process.env.BOT_WEBHOOK_URL}`);
}
// Zero-config Mini App: derive the Mini-App base (served at /app by this same
// process) so the bot's web_app buttons ("اپ تلگرام") arm without a fourth
// variable. Priority: explicit WEBAPP_BASE_URL > webhook origin > Railway's
// injected RAILWAY_PUBLIC_DOMAIN (works in POLLING mode too, where there is
// no webhook URL). Non-https origins are ignored; only https arms buttons.
if (process.env.WEBAPP_BASE_URL === undefined || process.env.WEBAPP_BASE_URL.trim() === '') {
  const hook = process.env.BOT_WEBHOOK_URL;
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  let derived: string | null = null;
  if (hook !== undefined && hook.trim() !== '') {
    try {
      const origin = new URL(hook.trim()).origin;
      if (origin.startsWith('https://')) derived = `${origin}/app/`;
    } catch {
      // non-URL webhook value — config validation will speak up, not us
    }
  }
  if (derived === null && domain !== undefined && domain.trim() !== '') {
    derived = `https://${domain.trim()}/app/`;
  }
  if (derived !== null) {
    process.env.WEBAPP_BASE_URL = derived;
    console.log(`[single] WEBAPP_BASE_URL derived → ${derived}`);
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
