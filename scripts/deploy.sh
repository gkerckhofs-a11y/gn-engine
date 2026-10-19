#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.gn-engine ]]; then
  printf '%s\n' 'OWNER_EMAIL=gkerckhofs@gmail.com' > .env.gn-engine
fi
npm run build
npx firebase deploy --project gn-engine --only hosting,functions:api,firestore:rules,firestore:indexes
