/**
 * Command Registry tests — the curated surface as executable law (Law 10).
 * Covers: count/unique, identity-card completeness, access scoping,
 * orchestrator bridging (menu, cards, admin gating, deep-link buttons),
 * and the Telegram setMyCommands scope builders.
 */
import { describe, expect, it } from 'vitest';
import {
  COMMANDS,
  COMMAND_COUNT,
  commandsForAccess,
  findCommand,
  renderCard,
  renderMenu,
  telegramCommandsFor,
} from '../src/commands/registry.js';
import { Orchestrator, type BotActor } from '../src/core/orchestrator.js';
import type { V3Client } from '@dropagentx/contracts';

const actor = (isAdmin = false, id = '100'): BotActor => ({
  telegramId: id,
  chatId: id,
  isAdmin,
});

const stubV3 = {} as V3Client;

const orch = (webAppBaseUrl?: string) =>
  new Orchestrator({ v3: stubV3, ...(webAppBaseUrl !== undefined ? { webAppBaseUrl } : {}) });

describe('registry integrity', () => {
  it('has exactly 28 unique curated commands', () => {
    expect(COMMANDS).toHaveLength(COMMAND_COUNT);
    expect(COMMAND_COUNT).toBe(28);
    expect(new Set(COMMANDS.map((c) => c.name)).size).toBe(COMMAND_COUNT);
  });

  it('covers every command discovered in the classic line (AgentX/DropAgentX)', () => {
    const classic = [
      'addproduct', 'approvals', 'book', 'bookings', 'broadcast', 'cancel', 'crm', 'help',
      'history', 'id', 'kill', 'lang', 'lead', 'leaderboard', 'market', 'menu', 'orders',
      'owner', 'panel', 'quests', 'ref', 'referral', 'sales', 'start', 'stats', 'transfer',
      'wallet', 'withdraw',
    ];
    expect(classic).toHaveLength(COMMAND_COUNT);
    for (const name of classic) expect(findCommand(name)?.name, name).toBeDefined();
  });

  it('every command has a complete standard identity card', () => {
    for (const c of COMMANDS) {
      expect(c.name).toMatch(/^[a-z][a-z0-9_]{1,31}$/);
      expect(c.fa.length, c.name).toBeGreaterThan(2);
      expect(c.en.length, c.name).toBeGreaterThan(2);
      expect(['all', 'seller', 'admin']).toContain(c.access);
      expect(['core', 'market', 'wallet', 'growth', 'seller', 'gov']).toContain(c.category);
      expect(['live', 'evolved', 'bridge']).toContain(c.status);
      expect(c.lineage.length, c.name).toBeGreaterThan(3);
      if (c.webapp !== undefined) expect(c.webapp).toMatch(/^\/[a-z0-9\-/:]*$/);
    }
  });

  it('alias ref points at referral; evolved commands document their supersession', () => {
    expect(findCommand('ref')?.aliasOf).toBe('referral');
    const evolved = COMMANDS.filter((c) => c.status === 'evolved');
    expect(evolved.length).toBeGreaterThan(0);
    for (const c of evolved) expect(c.note, c.name).toBeDefined();
  });
});

describe('access scoping', () => {
  it('non-admins see only "all" commands; admins see everything', () => {
    const user = commandsForAccess(false);
    const admin = commandsForAccess(true);
    expect(user.every((c) => c.access === 'all')).toBe(true);
    expect(admin).toHaveLength(COMMAND_COUNT);
    expect(user.length).toBeGreaterThan(10);
    expect(user.length).toBeLessThan(COMMAND_COUNT);
  });

  it('all six categories are populated', () => {
    for (const cat of ['core', 'market', 'wallet', 'growth', 'seller', 'gov'] as const) {
      expect(COMMANDS.some((c) => c.category === cat), cat).toBe(true);
    }
  });
});

describe('orchestrator bridging (Law 10)', () => {
  it('/menu renders the categorized curated surface', async () => {
    const out = await orch().handle(actor(), { text: '/menu', commandId: 't1' });
    expect(out.reply.text).toContain('28');
    expect(out.reply.text).toContain('/market');
    expect(out.reply.text).toContain('/wallet');
    expect(out.reply.text).not.toContain('/kill'); // admin-gated, hidden from users

    const adminOut = await orch().handle(actor(true), { text: '/menu', commandId: 't2' });
    expect(adminOut.reply.text).toContain('/kill');
    expect(adminOut.reply.text).toContain('/broadcast');
  });

  it('bridge commands answer with an identity card + Mini-App deep-link button', async () => {
    const out = await orch('https://app.example.com').handle(actor(), {
      text: '/market',
      commandId: 't3',
    });
    expect(out.reply.text).toContain('/market');
    expect(out.reply.text).toContain('بازار');
    const btn = out.reply.keyboard?.[0]?.[0];
    expect(btn?.webAppUrl).toBe('https://app.example.com#/market');
  });

  it('without webAppBaseUrl the card is text-only — never a broken button', async () => {
    const out = await orch().handle(actor(), { text: '/wallet', commandId: 't4' });
    expect(out.reply.text).toContain('کیف پول');
    expect(out.reply.keyboard).toBeUndefined();
  });

  it('admin-only registry commands stay fail-closed for regular users', async () => {
    const out = await orch().handle(actor(), { text: '/kill', commandId: 't5' });
    expect(out.reply.text).not.toContain('fail-stop');
    const adminOut = await orch().handle(actor(true), { text: '/kill', commandId: 't6' });
    expect(adminOut.reply.text).toContain('fail-stop');
  });

  it('genuinely unknown commands remain unknown (no fake help)', async () => {
    const out = await orch().handle(actor(), { text: '/definitelynotacommand', commandId: 't7' });
    expect(out.reply.keyboard).toBeUndefined();
    expect(out.reply.text.length).toBeGreaterThan(0);
  });

  it('live commands are untouched by the registry (Law 4)', async () => {
    const card = renderCard(findCommand('help')!, 'fa');
    expect(card.title).toContain('/help');
    expect(findCommand('help')?.status).toBe('live');
    expect(findCommand('start')?.status).toBe('live');
    expect(findCommand('orders')?.status).toBe('live');
    expect(findCommand('lang')?.status).toBe('live');
  });

  it('locale switch flips the card language', async () => {
    const o = orch();
    await o.handle(actor(), { text: '/lang en', commandId: 't8' });
    const out = await o.handle(actor(), { text: '/market', commandId: 't9' });
    expect(out.reply.text).toContain('Market — product listing');
  });
});

describe('setMyCommands scope builders', () => {
  it('default ⊆ seller ⊆ admin, alias ref not duplicated, wire constraints hold', () => {
    const def = telegramCommandsFor('default', 'fa');
    const seller = telegramCommandsFor('seller', 'en');
    const admin = telegramCommandsFor('admin', 'fa');

    expect(def.length).toBeLessThan(seller.length);
    expect(seller.length).toBeLessThan(admin.length);
    expect(def.every((c) => seller.some((s) => s.command === c.command))).toBe(true);
    expect(seller.every((c) => admin.some((a) => a.command === c.command))).toBe(true);

    expect(def.some((c) => c.command === 'ref')).toBe(false); // alias hidden
    expect(admin.some((c) => c.command === 'referral')).toBe(true);

    for (const list of [def, seller, admin]) {
      for (const c of list) {
        expect(c.command).toMatch(/^[a-z][a-z0-9_]{0,31}$/);
        expect(c.description.length).toBeGreaterThanOrEqual(1);
        expect(c.description.length).toBeLessThanOrEqual(256);
      }
    }
  });
});
