#!/usr/bin/env bash
# hostnsoft Deploy — standalone CLI script
#
# Packages the current directory and deploys it to hostnsoft. Works with any
# app that reads PORT and binds to 0.0.0.0 (no Dockerfile needed).
#
# Usage:
#   export HOSTNSOFT_TOKEN="hns_live_..."
#   ./hostnsoft-deploy.sh <app-name> [version]
#
# Example:
#   ./hostnsoft-deploy.sh order-tracker v1.0.0

set -euo pipefail

APP_NAME="${1:-}"
VERSION="${2:-$(date +%Y%m%d%H%M%S)}"   # unique version by default

if [[ -z "${HOSTNSOFT_TOKEN:-}" ]]; then
  echo "error: set HOSTNSOFT_TOKEN first (export HOSTNSOFT_TOKEN=\"hns_live_...\")" >&2
  exit 1
fi
if [[ -z "$APP_NAME" ]]; then
  echo "usage: ./hostnsoft-deploy.sh <app-name> [version]" >&2
  exit 1
fi

ARCHIVE="/tmp/${APP_NAME}.tar.gz"

echo "› Packaging ${APP_NAME} (no Dockerfile needed)…"
tar -czf "$ARCHIVE" \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' \
  --exclude='venv' --exclude='__pycache__' \
  -C . .

echo "› Deploying ${APP_NAME} @ ${VERSION}…"
RESPONSE=$(curl -sS -X POST "https://ship.hostnsoft.com/apps" \
  -H "Authorization: Bearer ${HOSTNSOFT_TOKEN}" \
  -H "X-App-Name: ${APP_NAME}" \
  -H "X-App-Version: ${VERSION}" \
  -F "source=@${ARCHIVE}")

echo "$RESPONSE"

URL=$(printf '%s' "$RESPONSE" | grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\(https\?:[^"]*\)".*/\1/')

if [[ -n "${URL:-}" ]]; then
  echo "› Verifying ${URL}…"
  if curl -sSf "$URL" >/dev/null; then
    echo "✓ Live at ${URL}"
  else
    echo "! Deploy accepted but the app did not respond yet — check the console." >&2
  fi
fi
