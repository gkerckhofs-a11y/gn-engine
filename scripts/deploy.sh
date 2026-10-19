#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
bash scripts/deploy-api.sh
npx firebase deploy --project gn-engine --only hosting,firestore:rules,firestore:indexes --non-interactive
node scripts/verify-deployment.mjs
