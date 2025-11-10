#!/usr/bin/env bash

set -euo pipefail

ALIAS_DOMAIN=${1:-echodynamo.vercel.app}

echo "🚀 Deploying latest production build to Vercel..."
DEPLOY_OUTPUT=$(vercel deploy --prod --yes)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -n 1)

if [[ -z "$DEPLOY_URL" ]]; then
  echo "❌ Failed to obtain deployment URL from Vercel CLI output."
  exit 1
fi

echo "✅ Deployment complete: $DEPLOY_URL"
echo "🔗 Updating alias \"$ALIAS_DOMAIN\" to point to the new deployment..."
# Remove existing alias (ignore errors if it does not exist)
yes | vercel alias rm "$ALIAS_DOMAIN" >/dev/null 2>&1 || true
vercel alias set "$DEPLOY_URL" "$ALIAS_DOMAIN"

echo "🎉 Alias updated! $ALIAS_DOMAIN now points to $DEPLOY_URL"

