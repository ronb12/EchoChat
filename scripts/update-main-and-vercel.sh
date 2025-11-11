#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

function log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

cd "$ROOT_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  log "Abort: you are on branch '$CURRENT_BRANCH'. Checkout 'main' before running."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  log "Abort: working tree has uncommitted changes. Commit or stash before proceeding."
  git status
  exit 1
fi

log "Fetching latest changes from origin..."
git fetch origin

log "Fast-forwarding local main..."
git pull --ff-only origin main

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  log "Installing production dependencies (npm install)..."
  npm install
else
  log "Skipping npm install (SKIP_INSTALL=1)."
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  log "Running build (npm run build)..."
  npm run build
else
  log "Skipping build (SKIP_BUILD=1)."
fi

if [[ -n "$(git status --porcelain)" ]]; then
  log "Abort: build generated new changes. Review them before pushing."
  git status
  exit 1
fi

log "Pushing main to origin..."
git push origin main

if ! command -v vercel >/dev/null 2>&1; then
  log "Abort: 'vercel' CLI not found. Install it (npm i -g vercel) and try again."
  exit 1
fi

VERCEL_ARGS=("--prod")
if [[ "${USE_PREBUILT:-0}" == "1" ]]; then
  VERCEL_ARGS+=("--prebuilt")
fi

log "Deploying to Vercel with: vercel deploy ${VERCEL_ARGS[*]}"
vercel deploy "${VERCEL_ARGS[@]}"

log "GitHub main and Vercel update complete."

