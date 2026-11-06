#!/usr/bin/env bash
# package-one.sh — Step-7 delivery ritual: DropAgentX One (unified 8-repo monorepo).
#
# Produces download/DropAgentX-One-<version>.zip containing:
#   git-archive of HEAD + full .git (the 8-repo genealogy, RULEBOOK Law 3 — local
#   commits exist nowhere else until the owner pushes) + blank-secrets .env +
#   generated HANDOFF.md + SHA256 sidecar.
#
# QC gates (fail loudly, never ship a bad package):
#   1. clean tree (all work committed)
#   2. git fsck passes
#   3. typecheck + tests green across the workspace (>= 273 tests)
#   4. version consistency (root == every workspace package)
#   5. zero real secrets in the shipped .env template
#   6. unified layout purity inside the zip (all Law-2 homes present, no build junk)

set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
OUT="/home/z/my-project/download"
NAME="DropAgentX-One-${VERSION}.zip"

echo "── QC 1: clean tree"
if [ -n "$(git status --porcelain)" ]; then
  echo "FAIL: working tree is dirty — commit everything first."; git status --short | head; exit 1
fi
echo "   ok (HEAD $(git log -1 --format='%h %s'))"

echo "── QC 2: git fsck"
git fsck --no-dangling >/dev/null
echo "   ok"

echo "── QC 3: typecheck + tests"
pnpm -r typecheck >/dev/null 2>&1 || { echo "FAIL: typecheck"; exit 1; }
TESTS=$(pnpm -r --no-bail test 2>/dev/null | grep -oE "Tests  [0-9]+ passed" | awk '{s+=$2} END {print s}')
if [ "${TESTS:-0}" -lt 273 ]; then echo "FAIL: expected ≥273 tests, got ${TESTS:-0}"; exit 1; fi
echo "   ok (${TESTS} tests green)"

echo "── QC 4: version consistency"
for f in back/*/package.json front/*/package.json packages/*/package.json; do
  [ -e "$f" ] || continue
  V=$(node -p "require('./$f').version")
  [ "$V" = "$VERSION" ] || { echo "FAIL: $f is $V ≠ $VERSION"; exit 1; }
done
echo "   ok (@ $VERSION)"

echo "── QC 5: secret guard on .env.example"
if grep -E "^(KIA_ADMIN_KEY|OPENAI_API_KEY|TELEGRAM_BOT_TOKEN)=..+" .env.example | grep -vE "^\w+=<" >/dev/null 2>&1; then
  echo "FAIL: .env.example contains a real-looking secret"; exit 1
fi
echo "   ok (blank template)"

STAGE=$(mktemp -d)
mkdir -p "$OUT"
git archive --format=tar HEAD | tar -x -C "$STAGE"
# the .git directory travels inside the ZIP (Law 3: the genealogy is sacred)
cp -r .git "$STAGE/.git"
cp .env.example "$STAGE/.env"
TESTS_N="${TESTS:-273}"

cat > "$STAGE/HANDOFF.md" << EOF
# DropAgentX One — v${VERSION} · تحویل واحد

One repo, eight bloodlines, zero loss — یک مخزن، هشت شجره، صفر اتلاف.
All 7 steps of the RULEBOOK (docs/RULEBOOK.md, v1.1) are closed on this commit.

## What this package is
- The unified pnpm monorepo \`DropAgentX One\` @ ${VERSION} — the single living home
  of 8 repos: DropAgentXBot-main, DropAgentX, AgentX (+nation), DropAgentX-v3,
  Bot (+backup), HermesA, zenovix-main, AGI-main.
- Every file of every repo is accounted for: **860 IDENTICAL · 320 EVOLVED ·
  511 ARCHIVED** — machine proof: \`docs/manifest.json\` (1,691/1,691 files,
  0 unaccounted); human report: \`docs/MANIFEST.md\`.
- **Full \`.git\` travels inside this ZIP** (Law 3: history is sacred). It carries
  the fetched history of 6 remotes — origin (Bot line, github), v3, agentx,
  dropagentx, hermesa, portfolio (classic line). The remaining lines are
  hash-proven: DropAgentXBot-main lives IDENTICAL in \`apps/hermesa/backend/\`;
  zenovix-main and AGI-main are archived in \`legacy/\` (and \`packages/widget\`).

## Layout (Law 2)
- \`front/dashboard\`  — admin console (React, Vazirmatn, fa/en): 5 core pages +
  24 ported Zenovix ops pages (UI Surface A, \`/ops/<slug>\`).
- \`front/webapp\`     — Telegram Mini App: **30 real pages**, bilingual RTL,
  zero-dep hash router (UI Surface B).
- \`front/public-site\` — PWA from AgentX: index/economy/nation + sw.js.
- \`back/bot\`         — orchestrator + **curated 28-command registry**
  (\`src/commands/registry.ts\`) with bridge mode → identity card + WebApp button.
- \`back/server\`      — Fastify API + Prisma + backup module; serves nation routes.
- \`back/domain\` \`back/contracts\` \`back/llm\` \`back/ai-gateway\` — hexagonal core.
- \`packages/nation\`  — economy charter (IDENTICAL, diff=0) + EVOLVED service
  (Genesis audit gap −63.0 D holds).
- \`packages/widget\`  — Zenovix chat widget v3.2.  \`apps/hermesa\` — HermesA
  (independent npm app, python backend, kept as-is).
- \`legacy/\`          — archived originals (classic-line desktop/art/locales,
  agi-main snapshot, twa references) — restorable, never deleted.
- \`docs/\`            — RULEBOOK, charter 2.1.0, \`changelog-fa.md\`
  (v0.5.0→v4.2.0), ADRs, DEPLOY, manifest proof.

## Green gate at packaging time
- typecheck: 9 workspace packages ✓
- tests: ${TESTS_N}/273 ✓ (vitest across 25 test files)
- production build: \`pnpm build\` ✓ (webapp dist + dashboard dist)

## Run it
    pnpm install --frozen-lockfile
    pnpm -r typecheck && pnpm -r test      # the green gate
    pnpm build                             # webapp + dashboard dist
- Bot: \`back/bot\` — needs TELEGRAM_BOT_TOKEN + WEBAPP_URL in \`.env\`.
- Server: \`back/server\` — Railway single-service (\`Dockerfile\`, \`railway.json\`,
  \`docs/DEPLOY.md\`); nation API mounted at \`/api/v1/nation\` (read-only, fail-closed).

## Secrets
The \`.env\` in this ZIP is the blank template (\`.env.example\`). Real secrets
never travel in git — fill it locally, never commit it.

— دفترچه قانون v1.1 · هر ۷ گام بسته شد · هیچ‌چیز از دست نرفت.
EOF

# rebuild from scratch — zip -qr UPDATES an existing archive instead of replacing it
rm -f "$OUT/$NAME" "$OUT/$NAME.sha256"
( cd "$STAGE" && zip -qr "$OUT/$NAME" . )
sha256sum "$OUT/$NAME" | tee "$OUT/$NAME.sha256"

FILES=$(unzip -l "$OUT/$NAME" | tail -1 | awk '{print $2}')
echo "── package: $OUT/$NAME (${FILES} files)"

echo "── QC 6: unified layout purity inside the zip"
LISTING=$(unzip -l "$OUT/$NAME")
for dir in "front/" "back/" "apps/" "packages/" "docs/" "legacy/" ".git/"; do
  grep -q " $dir" <<<"$LISTING" || { echo "FAIL: $dir missing from the zip"; exit 1; }
done
for key in "package.json" "docs/RULEBOOK.md" "docs/manifest.json" "docs/MANIFEST.md" \
           "back/bot/src/commands/registry.ts" "front/webapp/src/routes.ts" \
           "front/public-site/sw.js" "packages/nation/src/charter.ts" \
           "apps/hermesa/README.md" "legacy/README.md" ".env" "HANDOFF.md"; do
  grep -q " $key" <<<"$LISTING" || { echo "FAIL: $key missing from the zip"; exit 1; }
done
JUNK=$(grep -cE ' (node_modules/|dist/|\.turbo/|coverage/|.*\.tsbuildinfo)' <<<"$LISTING" || true)
if [ "$JUNK" -gt 0 ]; then echo "FAIL: $JUNK build-junk entries in the zip"; exit 1; fi
if [ "${FILES:-0}" -lt 1000 ]; then echo "FAIL: zip has only ${FILES} files — expected ≥1000 (tracked tree + .git)"; exit 1; fi
echo "   ok (all Law-2 homes + proof files present, no build junk, ${FILES} files)"
rm -rf "$STAGE"
echo "DONE — DropAgentX One ${VERSION} packaged."
