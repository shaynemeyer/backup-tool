#!/usr/bin/env bash
set -euo pipefail
set -m

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_DIR="$SCRIPT_DIR/.logs"
mkdir -p "$LOG_DIR"

if [ ! -f "server/.env" ]; then
  echo "Note: server/.env not found. Copy server/.env.example to server/.env and set WEBDAV_URL/WEBDAV_USERNAME/WEBDAV_PASSWORD before backups will work."
fi

PIDS=()
CLEANED_UP=0

cleanup() {
  if [ "$CLEANED_UP" -eq 1 ]; then
    return
  fi
  CLEANED_UP=1
  echo
  echo "Stopping..."
  for pid in "${PIDS[@]}"; do
    kill -- "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

start() {
  local name="$1"
  local logfile="$2"
  shift 2
  "$@" > "$logfile" 2>&1 &
  PIDS+=("$!")
  echo "Started $name (pid $!, log: $logfile)"
}

start "WebDAV test server" "$LOG_DIR/webdav.log" \
  bash -c "cd '$SCRIPT_DIR/server' && npx tsx webdav-test-server/serve.ts"

start "Backend" "$LOG_DIR/server.log" \
  bash -c "cd '$SCRIPT_DIR/server' && npm run dev"

start "Frontend" "$LOG_DIR/client.log" \
  bash -c "cd '$SCRIPT_DIR/client' && npm run dev"

echo
echo "WebDAV test server: http://localhost:1900 (demo/demo)"
echo "Backend:            http://localhost:3001"
echo "Frontend:           http://localhost:5173"
echo
echo "Logs in $LOG_DIR. Press Ctrl+C to stop everything."

wait
