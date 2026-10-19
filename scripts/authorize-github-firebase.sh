#!/usr/bin/env bash
# À exécuter une fois par le propriétaire dans Google Cloud Shell.
# Aucun secret n'est demandé, créé ou affiché. Relançable après interruption.
set -euo pipefail
trap 'printf "\nÉCHEC à la ligne %s : autorisation incomplète. Corriger l’erreur ci-dessus puis relancer.\n" "$LINENO" >&2' ERR

readonly PROJECT_ID='gn-engine'
readonly PROJECT_NUMBER='936415509528'
readonly REGION='europe-west1'
readonly REPOSITORY='gkerckhofs-a11y/gn-engine'
readonly REPOSITORY_ID='1425514171'
readonly OWNER_ID='331737602'
readonly POOL='gn-engine-github'
readonly PROVIDER='gn-engine-main'
readonly DEPLOYER="gn-engine-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
readonly RUNTIME="gn-engine-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
readonly BUILDER="gn-engine-build@${PROJECT_ID}.iam.gserviceaccount.com"
readonly REGISTRY='gn-engine-functions'

command -v gcloud >/dev/null || { echo 'Ouvrir Google Cloud Shell : https://shell.cloud.google.com/'; exit 1; }
account="$(gcloud auth list --filter='status:ACTIVE' --format='value(account)')"
[[ -n "$account" ]] || { echo 'Aucun compte Google actif. Se connecter avec gcloud auth login, puis relancer.'; exit 1; }
number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
[[ "$number" == "$PROJECT_NUMBER" ]] || { echo 'Le numéro de projet ne correspond pas. Arrêt sans modification.'; exit 1; }

printf '\nCompte Google : %s\nProjet : %s (%s)\nDépôt autorisé : %s\n' "$account" "$PROJECT_ID" "$PROJECT_NUMBER" "$REPOSITORY"
cat <<'NOTICE'
Ce script active les API nécessaires et crée trois comptes techniques :
- déploiement : fonction HTTP, site, règles et index Firestore ;
- exécution : données Firestore et lecture des identités Firebase ;
- compilation : sources de la fonction, images et journaux de compilation.
Il autorise uniquement le workflow deploy-firebase.yml du dépôt indiqué,
sur la branche main, via une identité GitHub temporaire. Aucune clé privée.
Il ne déploie pas encore l'application et n'accorde ni Owner ni Editor.
NOTICE

gcloud services enable \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com serviceusage.googleapis.com \
  cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com logging.googleapis.com storage.googleapis.com \
  firebase.googleapis.com firebasehosting.googleapis.com firebaserules.googleapis.com \
  firestore.googleapis.com identitytoolkit.googleapis.com \
  --project="$PROJECT_ID" --quiet

ensure_account() {
  local name="$1" display="$2"
  if ! gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$name" --display-name="$display" --project="$PROJECT_ID" --quiet
  fi
}
grant_project_role() {
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$1" --role="$2" --condition=None --quiet >/dev/null
}
ensure_account gn-engine-deployer 'GN Engine - déploiement GitHub'
ensure_account gn-engine-runtime 'GN Engine - API'
ensure_account gn-engine-build 'GN Engine - compilation'

# Google crée ses agents de service ; aucun rôle d'agent n'est donné à GitHub.
gcloud beta services identity create --service=cloudfunctions.googleapis.com --project="$PROJECT_ID" --quiet >/dev/null
gcloud beta services identity create --service=run.googleapis.com --project="$PROJECT_ID" --quiet >/dev/null
grant_project_role "service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com" roles/cloudfunctions.serviceAgent
grant_project_role "service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com" roles/run.serviceAgent

for role in \
  roles/cloudfunctions.admin \
  roles/firebasehosting.admin \
  roles/firebaserules.admin \
  roles/datastore.indexAdmin \
  roles/firebase.viewer \
  roles/serviceusage.apiKeysViewer \
  roles/serviceusage.serviceUsageConsumer; do
  grant_project_role "$DEPLOYER" "$role"
done
grant_project_role "$RUNTIME" roles/datastore.user
grant_project_role "$RUNTIME" roles/firebaseauth.viewer
grant_project_role "$BUILDER" roles/logging.logWriter

# La compilation ne lit que les sources Cloud Functions de ce projet/région.
source_condition="resource.type == 'storage.googleapis.com/Object' && (resource.name.startsWith('projects/_/buckets/gcf-v2-sources-${PROJECT_NUMBER}-${REGION}/') || resource.name.startsWith('projects/_/buckets/gcf-v2-uploads-${PROJECT_NUMBER}-${REGION}.cloudfunctions.appspot.com/'))"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILDER" --role=roles/storage.objectViewer \
  --condition="title=gn-engine-function-sources,expression=$source_condition" --quiet >/dev/null

if ! gcloud artifacts repositories describe "$REGISTRY" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REGISTRY" --repository-format=docker \
    --location="$REGION" --description='Images de la fonction GN Engine' --project="$PROJECT_ID" --quiet
fi
gcloud artifacts repositories add-iam-policy-binding "$REGISTRY" \
  --location="$REGION" --project="$PROJECT_ID" --member="serviceAccount:$BUILDER" \
  --role=roles/artifactregistry.writer --quiet >/dev/null

# actAs porte uniquement sur les deux comptes dédiés, jamais sur tout le projet.
for service_account in "$RUNTIME" "$BUILDER"; do
  gcloud iam service-accounts add-iam-policy-binding "$service_account" \
    --member="serviceAccount:$DEPLOYER" --role=roles/iam.serviceAccountUser \
    --project="$PROJECT_ID" --quiet >/dev/null
done

if ! gcloud iam workload-identity-pools describe "$POOL" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --location=global \
    --display-name='GN Engine GitHub' --project="$PROJECT_ID" --quiet
fi
pool_state="$(gcloud iam workload-identity-pools describe "$POOL" --location=global --project="$PROJECT_ID" --format='value(state)')"
[[ "$pool_state" == 'ACTIVE' ]] || { echo "Le pool $POOL est désactivé ou supprimé : arrêt."; exit 1; }
pool_disabled="$(gcloud iam workload-identity-pools describe "$POOL" --location=global --project="$PROJECT_ID" --format='value(disabled)')"
[[ "${pool_disabled,,}" != 'true' ]] || { echo "Le pool $POOL a été désactivé : arrêt."; exit 1; }

mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref,attribute.event_name=assertion.event_name'
condition="assertion.repository_id == '$REPOSITORY_ID' && assertion.repository_owner_id == '$OWNER_ID' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${REPOSITORY}/.github/workflows/deploy-firebase.yml@refs/heads/main' && (assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch')"
provider_action=create-oidc
if gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  provider_action=update-oidc
fi
gcloud iam workload-identity-pools providers "$provider_action" "$PROVIDER" \
  --workload-identity-pool="$POOL" --location=global --project="$PROJECT_ID" \
  --issuer-uri='https://token.actions.githubusercontent.com' \
  --attribute-mapping="$mapping" --attribute-condition="$condition" --quiet
provider_state="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project="$PROJECT_ID" --format='value(state)')"
[[ "$provider_state" == 'ACTIVE' ]] || { echo "Le fournisseur $PROVIDER est désactivé ou supprimé : arrêt."; exit 1; }
provider_disabled="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project="$PROJECT_ID" --format='value(disabled)')"
[[ "${provider_disabled,,}" != 'true' ]] || { echo "Le fournisseur $PROVIDER a été désactivé : arrêt."; exit 1; }

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
  --project="$PROJECT_ID" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/${REPOSITORY_ID}" \
  --quiet >/dev/null

cat <<'DONE'

AUTORISATION GN ENGINE CONFIGURÉE
Aucun secret à copier. Les nouveaux droits peuvent prendre quelques minutes.
Tu peux maintenant demander à Codex de lancer le déploiement GitHub.

Pour retirer l'autorisation de créer de nouveaux jetons :
gcloud iam workload-identity-pools providers update-oidc gn-engine-main --workload-identity-pool=gn-engine-github --location=global --project=gn-engine --disabled
Les jetons déjà émis peuvent rester valables jusqu'à une heure.
DONE
