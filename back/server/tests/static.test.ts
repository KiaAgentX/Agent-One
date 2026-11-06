/**
 * Static-surface acceptance — the SAME origin serves the public site at /,
 * the Mini App at /app, and keeps the API's 404 JSON shape under /api.
 * The webapp-dist case skips when dist/ has not been built (fresh checkout).
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type BuiltApp } from '../src/index.js';

const ADMIN_KEY = 'v3-test-admin-key-0123456789abcdef';
let built: BuiltApp;

beforeAll(async () => {
  built = await buildApp({
    adminKey: ADMIN_KEY,
    botToken: undefined,
    devAuth: false,
    port: 8787,
    rateLimitPerMin: 100_000,
  });
});

afterAll(async () => {
  await built.app.close();
  await built.prisma.$disconnect();
});

describe('static surfaces — site at /, mini app at /app', () => {
  it('serves the public PWA at / (same origin as the API)', async () => {
    const root = await built.app.inject({ method: 'GET', url: '/' });
    expect(root.statusCode).toBe(200);
    expect(root.headers['content-type']).toContain('text/html');
    expect(root.body).toContain('<!doctype html');

    // A nested asset must resolve too (the site ships plain files).
    const asset = await built.app.inject({ method: 'GET', url: '/app.js' });
    expect(asset.statusCode).toBe(200);
  });

  it('aliases /healthz onto the API health route (the site polls it)', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/healthz' });
    expect([301, 302, 307, 308]).toContain(res.statusCode);
    expect(res.headers.location).toBe('/api/v1/health');
  });

  it('keeps the Fastify JSON 404 shape under /api and for non-GET', async () => {
    const api = await built.app.inject({ method: 'GET', url: '/api/v1/definitely-not-a-route' });
    expect(api.statusCode).toBe(404);
    expect(api.json()).toMatchObject({ error: 'Not Found', statusCode: 404 });

    const post = await built.app.inject({ method: 'POST', url: '/api/v1/definitely-not-a-route', payload: {} });
    expect(post.statusCode).toBe(404);
  });

  it('bounces unknown page paths to the site, 404s unknown files', async () => {
    const page = await built.app.inject({ method: 'GET', url: '/some-unknown-page' });
    expect([301, 302, 307, 308]).toContain(page.statusCode);
    expect(page.headers.location).toBe('/');

    const file = await built.app.inject({ method: 'GET', url: '/no-such-file.css' });
    expect(file.statusCode).toBe(404);
  });

  const dist = fileURLToPath(new URL('../../../front/webapp/dist', import.meta.url));
  const itDist = existsSync(dist) ? it : it.skip;
  itDist('serves the built Mini App under /app with an /app → /app/ hop', async () => {
    const hop = await built.app.inject({ method: 'GET', url: '/app' });
    expect([301, 302, 307, 308]).toContain(hop.statusCode);
    expect(hop.headers.location).toBe('/app/');

    const spa = await built.app.inject({ method: 'GET', url: '/app/' });
    expect(spa.statusCode).toBe(200);
    expect(spa.headers['content-type']).toContain('text/html');
    expect(spa.body).toContain('id="root"');

    // Hash routing means no server rewrites — but built assets must exist.
    const assetRef = spa.body.match(/src="(\.\/assets\/[^"]+\.js)"/)?.[1];
    expect(assetRef).toBeDefined();
    const asset = await built.app.inject({ method: 'GET', url: `/app/${assetRef?.slice(2)}` });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['content-type']).toContain('javascript');
  });
});
