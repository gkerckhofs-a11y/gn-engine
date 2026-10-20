#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Ces limites sont aussi définies dans src/server/index.mjs.
gcloud functions deploy api \
  --project=gn-engine --region=europe-west1 --gen2 --runtime=nodejs22 \
  --entry-point=api --source=. --ignore-file=.gcloudignore \
  --trigger-http --allow-unauthenticated --ingress-settings=all \
  --service-account=gn-engine-runtime@gn-engine.iam.gserviceaccount.com \
  --build-service-account=projects/gn-engine/serviceAccounts/gn-engine-build@gn-engine.iam.gserviceaccount.com \
  --docker-repository=projects/gn-engine/locations/europe-west1/repositories/gn-engine-functions \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 \
  --concurrency=8 --timeout=60s \
  --update-env-vars=OWNER_EMAIL=gkerckhofs@gmail.com,MEDIA_BUCKET=gn-engine-media-936415509528 \
  --quiet
