/**
 * DropAgentX v3 bot — process entrypoint.
 * Polling in development, webhook for Railway (phase 6 wires the single service).
 * Also sweeps the HITL queue on an interval so expired approvals never linger.
 */

import { createV3Client } from '@dropagentx/contracts';
import { webhookCallback } from 'grammy';
import type { Bot } from 'grammy';
import { loadBotConfig, type BotConfig } from './config.js';
import { telegramCommandsFor } from './commands/registry.js';
import { Orchestrator } from './core/orchestrator.js';
import { createTelegramBot } from './telegram/bot.js';

// The single-service entry imports '@dropagentx/bot/main' and destructures BOTH
// factory and config loader — re-export so that contract is explicit (a missing
// named export here surfaces as "loadBotConfig is not a function" at runtime).
export { loadBotConfig, type BotConfig } from './config.js';

export interface RunningBot {
  readonly orchestrator: Orchestrator;
  readonly client: ReturnType<typeof createV3Client>;
  sweepTimer: ReturnType<typeof setInterval> | null;
  /**
   * Standard-Web fetch handler for the webhook mode (grammY 'std/http') —
   * the single-service entry mounts it on its own HTTP framework.
   */
  readonly handleWebhook?: (request: Request) => Promise<Response>;
  readonly webhookSecret?: string;
  stop(): Promise<void>;
}

/** A polling 409 means ANOTHER live instance holds the getUpdates long-poll.
 *  During a Railway redeploy this is the old container still draining — the
 *  conflict self-heals within seconds once it dies. With two PERMANENT
 *  operators (e.g. the bot also running on a laptop) it is a real
 *  misconfiguration: retries are bounded, then the honest crash-loop returns.
 *  Exported for the acceptance test — this classification is the contract. */
export function isPollingConflict(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b409\b|terminated by other getupdates|conflict:/i.test(msg);
}

/** Bounded backoff for polling conflicts — sums to ≈105s, comfortably above
 *  Railway's container-drain window, comfortably below "forever". */
export const POLLING_CONFLICT_RETRY_DELAYS_MS: readonly number[] = [
  2_000, 4_000, 6_000, 8_000, 10_000, 15_000, 15_000, 15_000, 15_000, 15_000,
];

/** Arm the Telegram command menu (the ☰ button) from the SAME curated registry
 *  (Law 10) — users see the commands in Telegram's own UI, not a wall of text.
 *  Non-fatal by design: a menu glitch must never keep a money bot down. */
async function armBotMenu(bot: Bot, config: BotConfig): Promise<void> {
  try {
    const user = telegramCommandsFor('default', 'fa');
    await bot.api.setMyCommands(user, { scope: { type: 'all_private_chats' } });
    await bot.api.setMyCommands(user, { scope: { type: 'all_group_chats' } });
    if (config.adminChatId !== undefined && /^\d+$/.test(config.adminChatId)) {
      await bot.api.setMyCommands(telegramCommandsFor('admin', 'fa'), {
        scope: { type: 'chat', chat_id: Number(config.adminChatId) },
      });
    }
    console.log(
      `[bot] command menu armed — ${user.length} user command(s)${
        config.adminChatId !== undefined ? ' + admin scope' : ''
      }`,
    );
  } catch (err) {
    console.warn('[bot] setMyCommands failed (menu stays default):', err instanceof Error ? err.message : err);
  }
}

export function buildBot(config: BotConfig): RunningBot {
  const client = createV3Client({
    baseUrl: config.serverBaseUrl,
    headers: { 'x-kia-key': config.adminKey },
  });
  const orchestrator = new Orchestrator({
    v3: client,
    hitlTtlHours: config.hitlTtlHours,
    escrowTtlHours: config.escrowTtlHours,
    ...(config.webAppBaseUrl !== undefined ? { webAppBaseUrl: config.webAppBaseUrl } : {}),
  });

  const botToken = config.botToken;
  if (botToken === undefined) {
    throw new Error('TELEGRAM_BOT_TOKEN is required to run the bot process (fail-closed).');
  }
  const buildTelegramBot = (): Bot =>
    createTelegramBot(
      { botToken, ...(config.adminChatId !== undefined ? { adminChatId: config.adminChatId } : {}) },
      orchestrator,
    );
  const bot = buildTelegramBot();

  // Webhook mode: expose a transport-agnostic handler so the single-service
  // entry (Railway) can mount it on Fastify without a second port. Webhook
  // mode needs ONE stable bot instance — the mounted handler closes over it.
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const handleWebhook =
    config.mode === 'webhook'
      ? webhookCallback(bot, 'std/http', 'throw', undefined, webhookSecret)
      : undefined;

  // Polling retries rebuild the bot on a fresh instance (grammY does not
  // guarantee a clean restart after a failed start) — shutdown must target
  // whichever instance is actually polling, so this cell is the single truth.
  let activeBot: Bot = bot;

  const state: RunningBot = {
    orchestrator,
    client,
    sweepTimer: null,
    ...(handleWebhook !== undefined ? { handleWebhook, ...(webhookSecret !== undefined ? { webhookSecret } : {}) } : {}),
    async stop(): Promise<void> {
      if (state.sweepTimer !== null) clearInterval(state.sweepTimer);
      state.sweepTimer = null;
      await activeBot.stop();
    },
  };

  // TTL sweep — the queue never grows stale, even without traffic.
  state.sweepTimer = setInterval(() => {
    void client.sweepHitl().then(
      (res) => {
        if (res.ok && res.value.expired > 0) {
          console.log(`[hitl] sweep expired ${res.value.expired} stale request(s)`);
        }
      },
      () => undefined,
    );
  }, 60_000);

  void (async () => {
    if (config.mode === 'webhook' && config.webhookUrl !== undefined) {
      await bot.init();
      // Arm the secret on BOTH sides: Telegram must SEND x-telegram-bot-api-
      // secret-token (setWebhook secret_token) for the handler's verification
      // (webhookCallback secretToken) to accept updates. Verifying without
      // arming rejects every update; arming without verifying protects nothing.
      await bot.api.setWebhook(config.webhookUrl, {
        ...(webhookSecret !== undefined ? { secret_token: webhookSecret } : {}),
      });
      console.log(`[bot] webhook armed → ${config.webhookUrl}${webhookSecret !== undefined ? ' (secret-token active)' : ''}`);
      await armBotMenu(bot, config);
    } else {
      // Deploy-overlap resilience: the fresh container races the DRAINING old
      // one for the getUpdates long-poll and can lose with a transient 409 —
      // retry on a fresh instance instead of crash-looping the whole service
      // (each retry also re-arms the command menu). Non-conflict errors and a
      // genuinely permanent second instance still fail fast, unchanged.
      const delays = POLLING_CONFLICT_RETRY_DELAYS_MS;
      for (let attempt = 0; ; attempt++) {
        const poller = attempt === 0 ? bot : buildTelegramBot();
        activeBot = poller;
        try {
          await poller.init();
          await armBotMenu(poller, config);
          console.log('[bot] starting long-polling…');
          await poller.start({
            drop_pending_updates: true,
            onStart: () => console.log('[bot] polling — connected to Telegram'),
          });
          return; // start() resolves only when stopped — clean shutdown
        } catch (err) {
          if (!isPollingConflict(err) || attempt >= delays.length - 1) throw err;
          const delay = delays[Math.min(attempt, delays.length - 1)] ?? 15_000;
          console.warn(
            `[bot] getUpdates 409 — previous instance still draining; retry ${attempt + 1}/${delays.length} in ${Math.round(delay / 1000)}s`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  })().catch((err) => {
    console.error('[bot] startup failed:', err instanceof Error ? err.message : err);
    // Fail-fast: setting process.exitCode alone does NOT stop a serving
    // process — the container stayed green with a dead bot forever (and the
    // old /health was static, so Railway never restarted it). Exit loudly;
    // the restart loop is the honest state for a money bot.
    setTimeout(() => process.exit(1), 250);
  });

  return state;
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  buildBot(loadBotConfig());
}
