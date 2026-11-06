#!/usr/bin/env bash
cd "$(dirname "$0")"
set -a; . ./.env; set +a
export WEB_PORT="${WEB_PORT:-8080}"
export WEB_HOST=0.0.0.0
exec python3 -m web_admin
