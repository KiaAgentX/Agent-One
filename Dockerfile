# DropAgentX v3 — single service (server + bot in one process), Railway-ready.
# Multi-stage: dependency manifests are copied first so the install layer is
# cached; tsx runs TS directly — no build step to drift (packages are
# source-linked).
#
# Three cold-deploy facts this file encodes (learned the hard way on Railway):
# 1. `prisma generate` runs as a workspace postinstall during `pnpm install`,
#    so the schema must exist in the install stage. Manifests alone are not
#    enough — the postinstall fails with "Could not find Prisma Schema" and
#    takes the whole install down with exit code 1.
# 2. better-sqlite3 v13 ships no prebuilt binaries — it compiles from source,
#    which needs python3/make/g++. node:24-slim carries none of them, so the
#    tools are installed in the install stage ONLY; the runtime stage stays a
#    clean slim image.
# 3. BOTH stages need system OpenSSL: Prisma's engines (query + schema) link
#    against it, while node:24-slim ships none (Node's own OpenSSL is static).
#    Without it the boot gate crash-loops: variant detection falls back to
#    openssl-1.1.x, no 3.0.x engine is found, Prisma tries to download one
#    into root-owned node_modules as the `node` user → "Can't write to …".
#    With openssl-3.0.x present in BOTH stages, the engines fetched at build
#    time are reused read-only at runtime — no writes, no downloads.
# NOTE: no --mount=type=cache here. Railway rejects cache-mount ids without a
# service-scoped prefix (id=s/<service-id>-…), and hard-coding a service id in
# a public Dockerfile kills portability. Plain layer caching does the same job
# on every builder (Railway, GH Actions, local Docker).

FROM node:24-slim AS deps
ENV PNPM_HOME=/pnpm-store \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_HOME=/usr/local/share/corepack
# Native-module toolchain (better-sqlite3 has no prebuilds) + openssl so the
# Prisma engines postinstall detects and fetches the debian-openssl-3.0.x
# variant deterministically (it used to arrive only as a transitive dep of
# python3 — explicit beats implicit).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ openssl \
 && rm -rf /var/lib/apt/lists/*
# Pin the exact pnpm from root package.json `packageManager` — no per-run
# registry drift, and the runtime stage has no package.json yet when it needs
# the binary.
RUN corepack enable pnpm && corepack prepare pnpm@9.15.9 --activate \
 && mkdir -p /pnpm-store
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json turbo.json .npmrc ./
COPY back/server/package.json back/server/
# The postinstall above runs `prisma generate` — it needs the schema here.
COPY back/server/prisma back/server/prisma/
COPY back/bot/package.json back/bot/
COPY front/dashboard/package.json front/dashboard/
COPY back/domain/package.json back/domain/
COPY back/contracts/package.json back/contracts/
COPY back/llm/package.json back/llm/
COPY back/ai-gateway/package.json back/ai-gateway/
# append-only keeps every postinstall line in build logs; the default bar
# reporter can bury the one error that matters on CI.
RUN pnpm install --frozen-lockfile --reporter=append-only --fetch-retries=5

# The Mini App (front/webapp) is a Vite SPA — it must be BUILT into static
# files before it can be served. A dedicated stage keeps the heavy React/Vite
# toolchain out of the runtime image; only dist/ travels. Its build (base './'
# + hash router) mounts under /app with zero rewrite rules. This stage installs
# ONLY the webapp closure (webapp + contracts + nation) — no prisma postinstall
# here, and no python/make/g++ needed (nothing native compiles for the SPA).
FROM node:24-slim AS webapp
ENV PNPM_HOME=/pnpm-store \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_HOME=/usr/local/share/corepack
RUN corepack enable pnpm && corepack prepare pnpm@9.15.9 --activate \
 && mkdir -p /pnpm-store
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json .npmrc ./
COPY front/webapp/package.json front/webapp/
COPY back/contracts/package.json back/contracts/
COPY packages/nation/package.json packages/nation/
RUN pnpm install --frozen-lockfile --filter @dropagentx/webapp... --reporter=append-only --fetch-retries=5
COPY front/webapp front/webapp
COPY back/contracts back/contracts
COPY packages/nation packages/nation
RUN pnpm --filter @dropagentx/webapp build

FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_HOME=/usr/local/share/corepack \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1
# The two Prisma vars silence the "Update available" banner the CLI prints to
# STDERR on every boot — Railway paints stderr red and a red boot log reads
# like a crash even when the db push succeeded.
# pnpm is prepared INTO the image (world-readable corepack cache) so the boot
# gate (`prisma db push` on a fresh volume) never waits on a runtime download.
RUN corepack enable pnpm && corepack prepare pnpm@9.15.9 --activate
# OpenSSL 3 for the Prisma engines — see fact 3 at the top. The engine binaries
# shipped in node_modules were fetched against 3.0.x at build time and are
# reused read-only here; nothing ever writes into node_modules at runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app /app
# Source ships whole (TS-first deploy); .dockerignore keeps host state and
# secrets out. The runtime volume (mounted at /app/db) is created empty on
# first boot — never ship a host database inside the image (.dockerignore
# excludes db/).
COPY . .
# The webapp dist is gitignored (and .dockerignore'd from the context) — take
# the built Mini App from its dedicated stage so /app serves the real UI.
COPY --from=webapp /app/front/webapp/dist /app/front/webapp/dist
RUN mkdir -p /app/db && chown -R node:node /app/db
# Zero-config boot: the image itself satisfies the fail-closed DATABASE_URL
# gate with the canonical volume path, so a bare `docker run` (or a platform
# with no env vars set) boots an API-only SQLite service instead of
# crash-looping in config validation. Platform-set env vars always win over
# image ENV — pointing DATABASE_URL at a managed Postgres needs no rebuild.
# The single-service boot gate then finds file: and runs `prisma db push`
# against this path on the (possibly empty) mounted volume.
ENV DATABASE_URL=file:/app/db/v3.db
USER node
EXPOSE 8787
# SQLite lives on the mounted volume; the single-service entry boots server + bot.
CMD ["pnpm", "-F", "@dropagentx/server", "exec", "tsx", "scripts/single-service.ts"]
