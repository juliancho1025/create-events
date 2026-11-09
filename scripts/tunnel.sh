#!/usr/bin/env bash
# Runs the app behind a public ngrok URL: `pnpm tunnel` (instead of `pnpm dev`).
#
# 1. Starts `ngrok http 5173` (the web dev server; it proxies /api to the API).
# 2. Points apps/api/.env at the tunnel: WEB_URL, GOOGLE_CALLBACK_URL, and turns
#    DEV_LOGIN_ENABLED off (on the internet anyone could log in as admin).
# 3. Runs `pnpm dev`. On exit (Ctrl+C) stops ngrok and restores the .env values.
#
# The URL changes every run: add the printed redirect URI to the Google OAuth
# client (Authorized redirect URIs) each time.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/api/.env"
WEB_PORT=5173
API_PORT=3000

command -v ngrok >/dev/null || { echo "ngrok is not installed (brew install ngrok)"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (cp .env.example apps/api/.env)"; exit 1; }
for port in $WEB_PORT $API_PORT; do
  if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is in use. Stop \`pnpm dev\` first; this script starts it."
    exit 1
  fi
done

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }
set_var() {
  if grep -qE "^$1=" "$ENV_FILE"; then
    KEY="$1" VALUE="$2" perl -pi -e 's/^\Q$ENV{KEY}\E=.*/$ENV{KEY}=$ENV{VALUE}/' "$ENV_FILE"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV_FILE"
  fi
}

ORIG_WEB_URL="$(get WEB_URL)"
ORIG_CALLBACK="$(get GOOGLE_CALLBACK_URL)"
ORIG_DEV_LOGIN="$(get DEV_LOGIN_ENABLED)"
NGROK_PID=""
DEV_PID=""

cleanup() {
  trap - EXIT INT TERM
  [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null || true
  [ -n "$NGROK_PID" ] && kill "$NGROK_PID" 2>/dev/null || true
  set_var WEB_URL "$ORIG_WEB_URL"
  set_var GOOGLE_CALLBACK_URL "$ORIG_CALLBACK"
  set_var DEV_LOGIN_ENABLED "$ORIG_DEV_LOGIN"
  echo
  echo "Tunnel closed; apps/api/.env restored."
}
trap cleanup EXIT INT TERM

ngrok http "$WEB_PORT" --log stderr --log-level warn >/dev/null &
NGROK_PID=$!

URL=""
for _ in $(seq 1 20); do
  URL="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | python3 -c 'import sys, json; t = json.load(sys.stdin)["tunnels"]; print(next((x["public_url"] for x in t if x["public_url"].startswith("https")), ""))' 2>/dev/null || true)"
  [ -n "$URL" ] && break
  sleep 0.5
done
[ -n "$URL" ] || { echo "ngrok did not start (is another ngrok session running? check http://127.0.0.1:4040)"; exit 1; }

set_var WEB_URL "$URL"
set_var GOOGLE_CALLBACK_URL "$URL/api/auth/google/callback"
set_var DEV_LOGIN_ENABLED false

cat <<EOF

  Public URL:   $URL
  Google OAuth: add this to "Authorized redirect URIs" (Google Cloud → Credentials):
                $URL/api/auth/google/callback
  Dev login is OFF while the tunnel runs. Ctrl+C stops everything and restores .env.

EOF

cd "$ROOT"
pnpm dev &
DEV_PID=$!
wait "$DEV_PID"
