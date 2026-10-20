#!/usr/bin/env bash
# À exécuter une fois dans Google Cloud Shell par le propriétaire du projet.
# Accès aux seuls objets de ce bucket ; aucune clé ni URL publique.
set -euo pipefail
readonly PROJECT='gn-engine'
readonly NUMBER='936415509528'
readonly BUCKET='gn-engine-media-936415509528'
readonly RUNTIME='gn-engine-runtime@gn-engine.iam.gserviceaccount.com'
[[ "$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')" == "$NUMBER" ]] || { echo 'Projet inattendu. Arrêt.' >&2; exit 1; }
if ! gcloud storage buckets describe "gs://$BUCKET" --project="$PROJECT" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" --project="$PROJECT" --location=europe-west1 --uniform-bucket-level-access --public-access-prevention
fi
[[ "$(gcloud storage buckets describe "gs://$BUCKET" --raw --format='value(projectNumber)')" == "$NUMBER" ]] || { echo 'Le bucket n’appartient pas au projet. Arrêt.' >&2; exit 1; }
gcloud storage buckets update "gs://$BUCKET" --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$RUNTIME" --role=roles/storage.objectUser --quiet >/dev/null
# Le marqueur permet à l’API de vérifier son accès sans droits sur la configuration du bucket.
printf 'GN Engine private media storage ready\n' | gcloud storage cp - "gs://$BUCKET/system/ready" --cache-control='private, no-store' >/dev/null
printf '\nStockage privé activé. Actualisez la médiathèque GN Engine.\n'
