#!/usr/bin/env bash
# package-one-source.sh — slim SOURCE-ONLY delivery (no .git genealogy).
# Companion to package-one.sh (full 141MB archive with Law-3 history).
# Use when the full history already lives in the full ZIP and/or on GitHub.
#
# QC gates: clean tree, version consistency, secret guard, layout purity.

set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
OUT="/home/z/my-project/download"
NAME="DropAgentX-One-${VERSION}-source.zip"
FULLZIP="$OUT/DropAgentX-One-${VERSION}.zip"

echo "── QC 1: clean tree"
[ -z "$(git status --porcelain)" ] || { echo "FAIL: dirty tree — commit first"; git status --short | head; exit 1; }
echo "   ok (HEAD $(git log -1 --format='%h %s'))"

echo "── QC 2: version consistency"
for f in back/*/package.json front/*/package.json packages/*/package.json; do
  [ -e "$f" ] || continue
  V=$(node -p "require('./$f').version")
  [ "$V" = "$VERSION" ] || { echo "FAIL: $f is $V ≠ $VERSION"; exit 1; }
done
echo "   ok (@ $VERSION)"

echo "── QC 3: secret guard on .env.example"
if grep -E "^(KIA_ADMIN_KEY|OPENAI_API_KEY|TELEGRAM_BOT_TOKEN)=..+" .env.example | grep -vE "^\w+=<" >/dev/null 2>&1; then
  echo "FAIL: .env.example contains a real-looking secret"; exit 1
fi
echo "   ok (blank template)"

STAGE=$(mktemp -d)
git archive --format=tar HEAD | tar -x -C "$STAGE"
cp .env.example "$STAGE/.env"
# reuse the full package's HANDOFF, prefixed with the source-only note
{ echo "# ⚡ بستهٔ فقط-سورس — بدون تاریخچهٔ .git"; echo
  echo "تاریخچهٔ کامل ۸ مخزن (قانون ۳) در بستهٔ کامل \`${FULLZIP##*/}\` است و پس از پوش، روی GitHub می‌نشیند."
  echo "برای بازگردانی هر کامیت قدیمی، بستهٔ کامل را باز کنید یا remoteهای شش‌گانه را وصل کنید."
  echo; echo "---"; echo
  unzip -p "$FULLZIP" HANDOFF.md; } > "$STAGE/HANDOFF.md"

rm -f "$OUT/$NAME" "$OUT/$NAME.sha256"
( cd "$STAGE" && zip -qr "$OUT/$NAME" . )
sha256sum "$OUT/$NAME" | tee "$OUT/$NAME.sha256"

FILES=$(unzip -l "$OUT/$NAME" | tail -1 | awk '{print $2}')
echo "── package: $OUT/$NAME (${FILES} files)"

echo "── QC 4: purity inside the zip"
LISTING=$(unzip -l "$OUT/$NAME")
for key in "package.json" "docs/RULEBOOK.md" "docs/manifest.json" "docs/MANIFEST.md" \
           "back/bot/src/commands/registry.ts" "front/webapp/src/routes.ts" \
           "front/public-site/sw.js" "packages/nation/src/charter.ts" \
           "apps/hermesa/README.md" "legacy/README.md" ".env" "HANDOFF.md"; do
  grep -q " $key" <<<"$LISTING" || { echo "FAIL: $key missing"; exit 1; }
done
if grep -q " \.git/" <<<"$LISTING"; then echo "FAIL: .git must NOT be in the source-only zip"; exit 1; fi
JUNK=$(grep -cE ' (node_modules/|dist/|\.turbo/|coverage/|.*\.tsbuildinfo)' <<<"$LISTING" || true)
[ "$JUNK" -eq 0 ] || { echo "FAIL: $JUNK build-junk entries"; exit 1; }
echo "   ok (source only — no .git, no build junk, ${FILES} files)"
rm -rf "$STAGE"
echo "DONE — source-only package ready."
