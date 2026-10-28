#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Kissanmart (Unified Hostable Package)"
echo "=========================================================="

# Check if frontend/dist exists, otherwise build it
if [ ! -d "frontend/dist" ]; then
  echo "--> Building React frontend..."
  npm --prefix frontend install
  npm --prefix frontend run build
fi

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "--> Launching FastAPI server on http://${HOST}:${PORT}"
echo "    - Web App: http://localhost:${PORT}/"
echo "    - API Docs: http://localhost:${PORT}/docs"
echo "    - Health: http://localhost:${PORT}/api/v1/health"

python -m uvicorn app.main:app --app-dir backend --host "$HOST" --port "$PORT"

