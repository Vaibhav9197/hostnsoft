#!/usr/bin/env bash
# Embarko Deploy — standalone CLI script
#
# Packages the current directory and deploys it to Embarko. Works with any
# app that reads PORT and binds to 0.0.0.0 (no Dockerfile needed).
#
# Usage:
#   export DEPLOY_TOKEN="hns_live_..."
#   ./embarko-deploy.sh <app-name> [version]
#
# Example:
#   ./embarko-deploy.sh order-tracker v1.0.0

set -euo pipefail

APP_NAME="${1:-}"
VERSION="${2:-$(date +%Y%m%d%H%M%S)}"   # unique version by default

# Accept the former variable name too, so setups that predate the rename
# keep working.
DEPLOY_TOKEN="${DEPLOY_TOKEN:-${HOSTNSOFT_TOKEN:-}}"
if [[ -z "${DEPLOY_TOKEN}" ]]; then
  echo "error: set DEPLOY_TOKEN first (export DEPLOY_TOKEN=\"hns_live_...\")" >&2
  exit 1
fi
if [[ -z "$APP_NAME" ]]; then
  echo "usage: ./embarko-deploy.sh <app-name> [version]" >&2
  exit 1
fi

ARCHIVE="/tmp/${APP_NAME}.tar.gz"

echo "› Packaging ${APP_NAME} (no Dockerfile needed)…"
tar -czf "$ARCHIVE" \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' \
  --exclude='venv' --exclude='__pycache__' \
  -C . .

echo "› Deploying ${APP_NAME} @ ${VERSION}…"
RESPONSE=$(curl -sS -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer ${DEPLOY_TOKEN}" \
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
