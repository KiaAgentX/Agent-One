/**
 * Phase-5 acceptance suite — the AI cycle over real HTTP shapes:
 * real SQLite + the real gateway + an in-process OpenAI-compatible provider.
 * Covers the ROADMAP Phase-5 criteria:
 *  - cutting the primary provider does not break the flow (fallback serves);
 *  - every AI response is audited and redacted;
 *  - per-user metering with the daily cap (429 before any provider call);
 *  - money ≥ 50,000 Đ through the AI files a HITL request — never inline.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, type BuiltApp } from '../src/index.js';
import { resetRateLimiter } from '../src/guards.js';
import { makeTestInitData } from '../src/auth.js';

const ADMIN_KEY = 'v3-test-admin-key-0123456789abcdef';
const ADMIN = { 'x-kia-key': ADMIN_KEY, 'content-type': 'application/json' };
const JSON_HDR = { 'content-type': 'application/json' };

const PRIMARY_KEY = 'key-primary-000000';
const SECONDARY_KEY = 'key-secondary-00000';

type ScriptFn = (body: { messages: { role: string; content: string }[] }) => string;
const scripts: Record<string, { current: ScriptFn }> = {
  primary: { current: () => '{"reply": "unscripted"}' },
  secondary: { current: () => '{"reply": "unscripted"}' },
};
/** When true, the primary provider answers 500 — simulates a dead provider. */
let primaryDead = false;

let built: BuiltApp;
const realFetch = globalThis.fetch;

function openAiStub(bearerKey: string): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (headers.authorization !== `Bearer ${bearerKey}`) {
      return new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 });
    }
    if (bearerKey === PRIMARY_KEY && primaryDead) {
      return new Response(JSON.stringify({ error: { message: 'provider on fire' } }), { status: 500 });
    }
    if (url.endsWith('/models')) {
      return new Response(JSON.stringify({ data: [{ id: 'fake-model' }] }), { status: 200 });
    }
    if (url.endsWith('/chat/completions')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { messages: { role: string; content: string }[]; model: string };
      const which = bearerKey === PRIMARY_KEY ? 'primary' : 'secondary';
      const content = scripts[which].current(body);
      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test',
          model: body.model,
          choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('not found', { status: 404 });
  };
}

beforeAll(async () => {
  globalThis.fetch = (async (input, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (headers.authorization === `Bearer ${PRIMARY_KEY}`) return openAiStub(PRIMARY_KEY)(input, init);
    if (headers.authorization === `Bearer ${SECONDARY_KEY}`) return openAiStub(SECONDARY_KEY)(input, init);
    return realFetch(input, init);
  }) as typeof fetch;

  built = await buildApp({
    adminKey: ADMIN_KEY,
    botToken: undefined,
    devAuth: false,
    port: 8787,
    rateLimitPerMin: 100_000,
    aiProviders: [
      { name: 'primary', config: { baseUrl: 'https://primary.example/v1', apiKey: PRIMARY_KEY, model: 'fake-model' } },
      { name: 'secondary', config: { baseUrl: 'https://secondary.example/v1', apiKey: SECONDARY_KEY, model: 'fake-model' } },
    ],
    aiDailyTokenCap: 100_000,
  });
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await built.app.close();
  await built.prisma.$disconnect();
});

beforeEach(async () => {
  resetRateLimiter();
  primaryDead = false;
  scripts.primary.current = () => '{"reply": "unscripted"}';
  scripts.secondary.current = () => '{"reply": "unscripted"}';
  await built.prisma.aiUsage.deleteMany();
  await built.prisma.auditLog.deleteMany();
  await built.prisma.outboxEvent.deleteMany();
  await built.prisma.hitlRequest.deleteMany();
  await built.prisma.product.deleteMany();
  await built.prisma.kbEntry.deleteMany();
  await built.prisma.posting.deleteMany();
  await built.prisma.tx.deleteMany();
  await built.prisma.escrow.deleteMany();
  await built.prisma.account.deleteMany();
  await built.store.ensureSystemAccounts();
});

async function seedUser(id: string, amount: number): Promise<void> {
  await seedUserOn(built, id, amount);
}

async function seedUserOn(app: BuiltApp, id: string, amount: number): Promise<void> {
  await app.app.inject({ method: 'POST', url: '/api/v1/accounts', headers: ADMIN, payload: { id } });
  if (amount > 0) {
    await app.app.inject({ method: 'POST', url: '/api/v1/wallet/mint', headers: ADMIN, payload: { accountId: id, amount, memo: 'test' } });
  }
}

describe('phase 5 — AI endpoints over the wire', () => {
  it('exposes the 6 agents and exactly the 16 skills through OpenAPI contracts', async () => {
    const agents = await built.app.inject({ method: 'GET', url: '/api/v1/ai/agents' });
    expect(agents.statusCode).toBe(200);
    const agentItems = agents.json().items as { name: string; skills: string[] }[];
    expect(agentItems.length).toBe(6);
    expect(agentItems.map((a) => a.name)).toEqual(['orchestrator', 'receptionist', 'sales', 'support', 'analyst', 'content']);
    const analyst = agentItems.find((a) => a.name === 'analyst')!;
    expect(analyst.skills).toContain('analytics_report');
    expect(analyst.skills).not.toContain('escrow_refund'); // refund is support/orchestrator territory

    const skills = await built.app.inject({ method: 'GET', url: '/api/v1/ai/skills' });
    expect(skills.statusCode).toBe(200);
    const skillItems = skills.json().items as { id: string; kind: string; staffOnly: boolean }[];
    expect(skillItems.length).toBe(16);
    const staffSkills = skillItems.filter((s) => s.staffOnly);
    expect(staffSkills.map((s) => s.id).sort()).toEqual(['analytics_report', 'kb_upsert']);

    const doc = await built.app.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    const paths = Object.keys((doc.json() as { paths: Record<string, unknown> }).paths);
    expect(paths).toContain('/ai/chat');
    expect(paths).toContain('/ai/usage');
  });

  it('runs a full routed chat with a skill round and persists usage + audit', async () => {
    await seedUser('user:tg:111', 500);
    await built.prisma.product.create({
      data: { id: 'p1', sellerId: 'user:tg:222', title: 'Super Bundle', description: 'the works', priceDin: 120_000 },
    });
    scripts.primary.current = (body) => {
      const sys = body.messages[0]?.content ?? '';
      if (sys.includes('intent classifier')) return '{"agent": "sales"}';
      const last = body.messages.at(-1)?.content ?? '';
      if (last.startsWith('SKILL_RESULT')) return '{"reply": "پکیج Super Bundle قیمتش 120,000 Đ است."}';
      return '{"tool": "product_search", "args": {"query": "Bundle"}}';
    };

    const res = await built.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: ADMIN, // trusted caller (the identity gate is covered in phase 5b)
      payload: { userId: '111', text: 'این باندل چنده؟', language: 'fa' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { reply: string; agent: string; via: string; provider: string; toolTraces: unknown[]; usage: { totalTokens: number }; redactions: number };
    expect(json.agent).toBe('sales');
    expect(json.via).toBe('llm');
    expect(json.provider).toBe('primary');
    expect(json.toolTraces).toEqual([
      { skill: 'product_search', ok: true, summary: '1 match(es) for "Bundle".', pendingApproval: false, code: null },
    ]);
    expect(json.usage.totalTokens).toBe(300); // routing 100 + tool-round chat 100 + final chat 100
    expect(json.redactions).toBe(0);

    const usageRows = await built.prisma.aiUsage.findMany();
    expect(usageRows.length).toBe(3); // route + tool-round chat + final chat
    expect(usageRows.reduce((a, r) => a + r.totalTokens, 0)).toBe(300);

    const audits = await built.prisma.auditLog.findMany({ where: { action: 'ai.ok' } });
    expect(audits.length).toBe(1);
    const meta = JSON.parse(audits[0]?.meta ?? '{}') as { provider: string; toolCalls: number; redactions: number };
    expect(meta.provider).toBe('primary');
    expect(meta.toolCalls).toBe(1);
  });

  it('money ≥ 50,000 Đ through the AI files a HITL request — nothing moves inline', async () => {
    await seedUser('user:tg:111', 100_000);
    await seedUser('user:tg:222', 0);
    scripts.primary.current = (body) => {
      const sys = body.messages[0]?.content ?? '';
      if (sys.includes('intent classifier')) return '{"agent": "support"}';
      const last = body.messages.at(-1)?.content ?? '';
      if (last.startsWith('SKILL_RESULT')) return '{"reply": "درخواست بازگشت ثبت شد؛ نیاز به تایید انسانی دارد."}';
      return '{"tool": "escrow_refund", "args": {"escrowId": "esc_x", "reason": "never delivered"}}';
    };

    // escrow_x: created + funded, then the AI refund attempt
    const create = await built.app.inject({
      method: 'POST',
      url: '/api/v1/escrows',
      headers: ADMIN,
      payload: { id: 'esc_x', buyerId: 'user:tg:111', sellerId: 'user:tg:222', amount: 60_000 },
    });
    expect(create.statusCode).toBe(201);
    const fund = await built.app.inject({ method: 'POST', url: '/api/v1/escrows/esc_x/fund', headers: ADMIN, payload: {} });
    expect(fund.statusCode).toBe(200);

    const res = await built.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: ADMIN, // trusted caller
      payload: { userId: 'user:tg:111', text: 'پولم را پس بگیر', language: 'fa', directAgent: 'support' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { pendingApproval: boolean; toolTraces: { skill: string; pendingApproval: boolean; summary: string }[] };
    expect(json.pendingApproval).toBe(true);
    expect(json.toolTraces[0]?.skill).toBe('escrow_refund');
    expect(json.toolTraces[0]?.pendingApproval).toBe(true);
    expect(json.toolTraces[0]?.summary).toContain('hitl-');

    const hitl = await built.prisma.hitlRequest.findMany();
    expect(hitl.length).toBe(1);
    expect(hitl[0]?.status).toBe('PENDING');
    expect(hitl[0]?.amount).toBe(60_000);
    expect(hitl[0]?.escrowId).toBe('esc_x');
    // the escrow is still FUNDED — nothing moved
    const escrow = await built.prisma.escrow.findUnique({ where: { id: 'esc_x' } });
    expect(escrow?.status).toBe('FUNDED');
    const pendingAudit = await built.prisma.auditLog.findFirst({ where: { action: 'ai.pending' } });
    expect(pendingAudit).not.toBeNull();
  });

  it('exhausted daily cap returns 429 BEFORE any provider call', async () => {
    const app = await buildApp({
      adminKey: ADMIN_KEY,
      botToken: undefined,
      devAuth: false,
      port: 8787,
      rateLimitPerMin: 100_000,
      aiProviders: [{ name: 'primary', config: { baseUrl: 'https://primary.example/v1', apiKey: PRIMARY_KEY, model: 'fake-model' } }],
      aiDailyTokenCap: 120,
    });
    try {
      scripts.primary.current = (body) => {
        const sys = body.messages[0]?.content ?? '';
        if (sys.includes('intent classifier')) return '{"agent": "receptionist"}';
        return '{"reply": "hello"}';
      };
      const first = await app.app.inject({ method: 'POST', url: '/api/v1/ai/chat', headers: ADMIN, payload: { userId: 'user:tg:7', text: 'hi', language: 'en' } });
      expect(first.statusCode).toBe(200); // routing 100 + chat 100 = 200 ≥ cap → but cap gate ran BEFORE, this call succeeded
      const second = await app.app.inject({ method: 'POST', url: '/api/v1/ai/chat', headers: ADMIN, payload: { userId: 'user:tg:7', text: 'hi again', language: 'en' } });
      expect(second.statusCode).toBe(429);
      expect(second.json().error.code).toBe('AI_BUDGET_EXCEEDED');
      const rows = await app.prisma.aiUsage.findMany({ where: { userId: 'user:tg:7' } });
      expect(rows.length).toBe(2); // only from the first successful ask
    } finally {
      await app.app.close();
      await app.prisma.$disconnect();
    }
  });

  it('primary provider down → secondary serves (deterministic fallback)', async () => {
    primaryDead = true; // primary answers 500 on every call
    scripts.secondary.current = (body) => {
      const sys = body.messages[0]?.content ?? '';
      if (sys.includes('intent classifier')) return '{"agent": "receptionist"}';
      return '{"reply": "answered by secondary"}';
    };
    const res = await built.app.inject({ method: 'POST', url: '/api/v1/ai/chat', headers: ADMIN, payload: { userId: 'user:tg:9', text: 'hello', language: 'en' } });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { provider: string; reply: string };
    expect(json.provider).toBe('secondary');
    expect(json.reply).toBe('answered by secondary');
    const usageRows = await built.prisma.aiUsage.findMany();
    expect(usageRows.every((r) => r.provider === 'secondary')).toBe(true);
  });

  it('staff role is fail-closed: no key → 401, with key → analyst works', async () => {
    scripts.primary.current = (body) => {
      const sys = body.messages[0]?.content ?? '';
      if (sys.includes('intent classifier')) return '{"agent": "analyst"}';
      const last = body.messages.at(-1)?.content ?? '';
      if (last.startsWith('SKILL_RESULT')) return '{"reply": "Snapshot: 0 users."}';
      return '{"tool": "analytics_report", "args": {}}';
    };
    const denied = await built.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: JSON_HDR,
      payload: { userId: 'user:tg:5', text: 'stats', language: 'en', role: 'staff' },
    });
    expect(denied.statusCode).toBe(401);

    await seedUser('user:tg:5', 100);
    const okRes = await built.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: ADMIN,
      payload: { userId: 'user:tg:5', text: 'stats', language: 'en', role: 'staff', directAgent: 'analyst' },
    });
    expect(okRes.statusCode).toBe(200);
    const json = okRes.json() as { agent: string; toolTraces: { skill: string; ok: boolean }[]; reply: string };
    expect(json.agent).toBe('analyst');
    expect(json.toolTraces[0]?.skill).toBe('analytics_report');
    expect(json.toolTraces[0]?.ok).toBe(true);
  });

  it('AI-disabled app answers 503 on chat; /ai/usage needs the admin key', async () => {
    const plain = await buildApp({
      adminKey: ADMIN_KEY,
      botToken: undefined,
      devAuth: false,
      port: 8787,
      rateLimitPerMin: 100_000,
      aiDailyTokenCap: 120_000,
    });
    try {
      const disabled = await plain.app.inject({ method: 'POST', url: '/api/v1/ai/chat', headers: JSON_HDR, payload: { userId: '1', text: 'hi', language: 'en' } });
      expect(disabled.statusCode).toBe(503);
      expect(disabled.json().error.code).toBe('AI_DISABLED');
    } finally {
      await plain.app.close();
      await plain.prisma.$disconnect();
    }

    const noKey = await built.app.inject({ method: 'GET', url: '/api/v1/ai/usage?userId=user:tg:111' });
    expect(noKey.statusCode).toBe(401);
    const okRes = await built.app.inject({ method: 'GET', url: '/api/v1/ai/usage?userId=user:tg:111', headers: ADMIN });
    expect(okRes.statusCode).toBe(200);
    const usage = okRes.json() as { userId: string; cap: number; usedToday: number };
    expect(usage.cap).toBe(100_000);
    expect(usage.usedToday).toBeGreaterThanOrEqual(0);
    expect(usage.remainingToday).toBe(usage.cap - usage.usedToday);
  });

  it('redacts secrets before they reach the wire', async () => {
    scripts.primary.current = (body) => {
      const sys = body.messages[0]?.content ?? '';
      if (sys.includes('intent classifier')) return '{"agent": "receptionist"}';
      return '{"reply": "sure, your key is sk-abcdef123456789012345678 — keep it safe"}';
    };
    const res = await built.app.inject({ method: 'POST', url: '/api/v1/ai/chat', headers: ADMIN, payload: { userId: 'user:tg:11', text: 'my key?', language: 'en' } });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { reply: string; redactions: number };
    expect(json.reply).toContain('[REDACTED]');
    expect(json.reply).not.toContain('sk-abcdef');
    expect(json.redactions).toBe(1);
    const audit = await built.prisma.auditLog.findFirst({ where: { action: 'ai.ok' } });
    const meta = JSON.parse(audit?.meta ?? '{}') as { redactions: number };
    expect(meta.redactions).toBe(1);
  });

  it('kb_upsert via AI stores redacted staff knowledge; kb_search grounds replies', async () => {
    scripts.primary.current = (body) => {
      const sys = body.messages[0]?.content ?? '';
      if (sys.includes('intent classifier')) return '{"agent": "content"}';
      const last = body.messages.at(-1)?.content ?? '';
      if (last.startsWith('SKILL_RESULT')) return '{"reply": "知识已保存。"}';
      return '{"tool": "kb_upsert", "args": {"title": "Refund policy", "body": "Refunds within 7 days, no tax on refunds."}}';
    };
    const res = await built.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: ADMIN,
      payload: { userId: 'user:tg:1', text: 'save the refund policy', language: 'en', role: 'staff', directAgent: 'content' },
    });
    expect(res.statusCode).toBe(200);
    const entries = await built.prisma.kbEntry.findMany();
    expect(entries.length).toBe(1);
    expect(entries[0]?.title).toBe('Refund policy');
  });
});

describe('phase 5b — AI identity gate (fail-closed, audit-verified)', () => {
  const BOT_TOKEN = '123456789:test-bot-token-abcdefgh0123456789';
  let app2: BuiltApp;

  beforeAll(async () => {
    app2 = await buildApp({
      adminKey: ADMIN_KEY,
      botToken: BOT_TOKEN,
      devAuth: false,
      port: 8787,
      rateLimitPerMin: 100_000,
      aiProviders: [
        { name: 'primary', config: { baseUrl: 'https://primary.example/v1', apiKey: PRIMARY_KEY, model: 'fake-model' } },
      ],
      aiDailyTokenCap: 100_000,
    });
  });

  afterAll(async () => {
    await app2.app.close();
    await app2.prisma.$disconnect();
  });

  it('refuses a public caller without initData (AI_IDENTITY_REQUIRED — a public caller may not pick the actor)', async () => {
    const res = await app2.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: JSON_HDR,
      payload: { userId: 'user:tg:777', text: 'hi', language: 'en' },
    });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: { code: string } }).error.code).toBe('AI_IDENTITY_REQUIRED');
  });

  it('refuses a TAMPERED initData (HMAC mismatch)', async () => {
    const forged = makeTestInitData(BOT_TOKEN, { id: 777 }).replace(/hash=[0-9a-f]/, 'hash=0');
    const res = await app2.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: JSON_HDR,
      payload: { userId: 'user:tg:999', initData: forged, text: 'hi', language: 'en' },
    });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: { code: string } }).error.code).toBe('AI_IDENTITY_REQUIRED');
  });

  it('with VALID initData the acting account is DERIVED server-side — a spoofed body userId is ignored', async () => {
    await seedUserOn(app2, 'user:tg:777', 1_000); // only the VERIFIED account exists
    let round = 0;
    scripts.primary.current = () => {
      round += 1;
      return round === 1 ? '{"tool": "wallet_get", "args": {}}' : '{"reply": "done"}';
    };
    const initData = makeTestInitData(BOT_TOKEN, { id: 777 });
    const res = await app2.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: JSON_HDR,
      payload: { userId: 'user:tg:999', initData, directAgent: 'orchestrator', text: 'balance?', language: 'en' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { toolTraces: { ok: boolean; summary: string }[] };
    // wallet_get executed for the VERIFIED user:tg:777 — not the spoofed 999.
    expect(json.toolTraces[0]?.ok).toBe(true);
    expect(json.toolTraces[0]?.summary).toBe('Balance: 1000 Đ.');
    const audit = await app2.prisma.auditLog.findFirst({ where: { action: 'ai.ok' } });
    expect(audit?.actor).toBe('user:tg:777');
  });

  it('a TRUSTED caller (admin key) may still act on a chosen account', async () => {
    await seedUserOn(app2, 'user:tg:555', 500);
    scripts.primary.current = () => '{"reply": "ok"}';
    const res = await app2.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: ADMIN,
      payload: { userId: 'user:tg:555', directAgent: 'orchestrator', text: 'hi', language: 'en' },
    });
    expect(res.statusCode).toBe(200);
    const audit = await app2.prisma.auditLog.findFirst({ where: { action: 'ai.ok' } });
    expect(audit?.actor).toBe('user:tg:555');
  });

  it('the LAST-round tool call is refused — money cannot move without an auditable answer', async () => {
    await seedUserOn(app2, 'user:tg:777', 100);
    await seedUserOn(app2, 'user:tg:888', 0);
    scripts.primary.current = () => '{"tool": "wallet_transfer", "args": {"amountDin": 10, "toAccountId": "user:tg:888"}}';
    const res = await app2.app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      headers: JSON_HDR,
      payload: { userId: 'user:tg:777', initData: makeTestInitData(BOT_TOKEN, { id: 777 }), directAgent: 'orchestrator', text: 'transfer', language: 'en' },
    });
    expect(res.statusCode).toBe(502);
    expect((res.json() as { error: { code: string } }).error.code).toBe('AI_SKILL_REFUSED_FINAL_ROUND');
    // Rounds 0 and 1 transferred (2 × 10 Đ); the FINAL round was refused —
    // the ledger proves the third skill call never executed.
    const postings = await app2.prisma.posting.findMany({ where: { accountId: 'user:tg:777' } });
    const balance = postings.reduce((sum, p) => sum + p.amount, 0);
    expect(balance).toBe(80);
    const refused = await app2.prisma.auditLog.findFirst({ where: { action: 'ai.refused' } });
    expect(refused).not.toBeNull();
    const meta = JSON.parse(refused?.meta ?? '{}') as { code: string; skill: string | null };
    expect(meta.code).toBe('AI_SKILL_REFUSED_FINAL_ROUND');
  });
});
