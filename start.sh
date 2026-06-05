#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Kill anything on the dev ports and wait until they're free
free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing process(es) on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
  # Wait until the port is actually free (up to 5 s)
  for i in $(seq 1 10); do
    lsof -ti:"$port" > /dev/null 2>&1 || break
    sleep 0.5
  done
}

free_port 3000
free_port 5173

echo ""
echo "Starting backend  → http://localhost:3000"
cd "$ROOT/server" && npm run start:dev &
SERVER_PID=$!

echo "Starting frontend → http://localhost:5173"
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Press Ctrl+C to stop both servers."
trap 'echo ""; echo "Stopping..."; kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM
wait
