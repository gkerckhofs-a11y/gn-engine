# Autoriser GitHub à publier GN Engine

État au 19 octobre 2026 : autorisation configurée par le propriétaire, identité GitHub validée, fonction `api`, Hosting, règles et index Firestore publiés. Application : https://gn-engine.web.app/.

## Une seule intervention du propriétaire

Déjà effectuée sur le projet `gn-engine` ; les étapes suivantes documentent sa reproduction.

1. Ouvrir [Google Cloud Shell](https://shell.cloud.google.com/?project=gn-engine) avec le compte propriétaire du projet.
2. Importer `scripts/authorize-github-firebase.sh` avec la commande d’importation de fichiers de Cloud Shell, dans le dossier d’accueil.
3. Exécuter `bash authorize-github-firebase.sh` et, si Google le demande, autoriser Cloud Shell à utiliser le compte.
4. Attendre `AUTORISATION GN ENGINE CONFIGURÉE`, puis demander la publication à Codex, ou lancer le workflow depuis GitHub Actions sur `main`.

Aucune clé, aucun code de connexion ni jeton n’est à envoyer dans une conversation. Le script ne connecte pas le terminal de Codex au compte personnel : il donne à GitHub Actions le droit de publier. Le script s’arrête en cas d’erreur et peut être relancé ; les droits ajoutés avant une erreur restent présents. Un compte personnel autorisé à administrer IAM sur ce projet est nécessaire.

## Autorisation accordée

Le script vérifie `gn-engine` / `936415509528` avant toute modification. Il active les API nécessaires, crée trois comptes techniques et le dépôt d’images `gn-engine-functions` en `europe-west1`, puis configure Workload Identity Federation. Il ne déploie pas encore l’application et ne crée aucune clé de compte de service.

Le fournisseur accepte uniquement :

- le dépôt GitHub d’identifiant `1425514171`, appartenant au compte d’identifiant `331737602` ;
- la branche `refs/heads/main` ;
- le workflow `gkerckhofs-a11y/gn-engine/.github/workflows/deploy-firebase.yml@refs/heads/main` ;
- les événements `push` et `workflow_dispatch`.

Ces contraintes refusent les pull requests et forks. Les personnes pouvant modifier `main` peuvent modifier le code publié : cet accès reste un droit de déploiement en production. Les identifiants numériques de dépôt/propriétaire évitent qu’un autre dépôt réutilisant leur nom obtienne cet accès.

| Identité | Droits accordés | Portée |
|---|---|---|
| `gn-engine-deployer` | `roles/cloudfunctions.admin`, `roles/firebasehosting.admin`, `roles/firebaserules.admin`, `roles/datastore.indexAdmin`, `roles/firebase.viewer`, `roles/serviceusage.apiKeysViewer`, `roles/serviceusage.serviceUsageConsumer` | Projet `gn-engine` uniquement |
| `gn-engine-deployer` | `roles/iam.serviceAccountUser` | Comptes `gn-engine-runtime` et `gn-engine-build` uniquement |
| Identité GitHub filtrée ci-dessus | `roles/iam.workloadIdentityUser` | Compte `gn-engine-deployer` uniquement |
| `gn-engine-runtime` | `roles/datastore.user`, `roles/firebaseauth.viewer` | Projet `gn-engine` ; données et vérification des comptes |
| `gn-engine-build` | `roles/logging.logWriter` | Projet `gn-engine` |
| `gn-engine-build` | `roles/storage.objectViewer` avec condition IAM | Objets des deux buckets sources/upload Cloud Functions de ce projet en `europe-west1` |
| `gn-engine-build` | `roles/artifactregistry.writer` | Dépôt d’images `gn-engine-functions` uniquement |
| Agents Google Cloud Functions / Cloud Run | Leurs rôles `roles/cloudfunctions.serviceAgent` / `roles/run.serviceAgent` | Projet `gn-engine`, identités Google prévues à cet effet |

Aucun rôle global `Owner` ou `Editor`, aucun accès à l’administration IAM du projet n’est donné au compte de déploiement. Les rôles de déploiement permettent néanmoins de modifier les fonctions, les règles d’accès et le contenu publié ; ils doivent rester réservés aux personnes de confiance. Les comptes existants ne sont pas rétroactivement nettoyés de droits qu’ils possédaient déjà.

## Publication

Le workflow vérifie les tests métier et d’intégration avec les émulateurs, puis publie la fonction `api` avec ses comptes de compilation/exécution explicites. La région est `europe-west1`, le runtime Node 22, la mémoire 256 MiB, le minimum 0 instance et le maximum 3. La fonction HTTP accepte les appels au niveau réseau ; l’application vérifie ensuite le jeton Firebase et les autorisations métier avant toute lecture privée ou écriture.

Le paquet de la fonction ne contient que `src/`, `package.json` et `package-lock.json`. `gcp-build` vide empêche Cloud Build de reconstruire l’interface depuis ce paquet serveur. Les documents, fichiers locaux d’authentification, fichiers d’environnement et tests sont exclus. Firebase Hosting reçoit seulement le dossier `public` produit par la compilation.

L’identité est renouvelée entre le déploiement de la fonction et celui de Firebase, afin que la compilation distante ne consomme pas la courte durée de vie du jeton GitHub initial. Les jetons temporaires ne sont ni publiés ni conservés en artifacts. Un contrôle HTTP vérifie le site et le refus d’une lecture organisateur anonyme ; il ne constitue pas une recette complète en navigateur.

Le premier démarrage IAM peut nécessiter quelques minutes de propagation. Une erreur d’organisation ou de permissions doit être lue dans le journal avant de modifier des droits. Les autorisations de ce projet ont été confirmées par la publication réelle depuis GitHub ; les vérifications locales seules ne suffisent pas à les établir.

Validation locale du 19 octobre 2026 : compilation réussie, 28 tests métier et 14 tests d’intégration Auth/Firestore réussis. Le serveur démarre aussi dans le véritable Functions Framework et refuse une lecture `dashboard` anonyme avec HTTP 401. Syntaxe Bash, YAML et cohérence du verrou npm vérifiées. Les chemins de création/réexécution, de projet incorrect, d’erreur Google et de fournisseur désactivé ont été simulés avec un faux `gcloud` ; aucun droit réel n’a été accordé pendant ces contrôles.

## Retirer l’autorisation

Dans Cloud Shell :

```sh
gcloud iam workload-identity-pools providers update-oidc gn-engine-main \
  --workload-identity-pool=gn-engine-github --location=global \
  --project=gn-engine --disabled
```

Cela bloque l’obtention de nouveaux jetons. Les jetons déjà émis peuvent rester valides jusqu’à une heure. La fonction et le site déjà publiés restent en service. Le script d’autorisation refuse de déclarer une réussite si le fournisseur ou le pool est désactivé.

## Sources officielles

Consultées le 19 octobre 2026 :

- Google Cloud : [fédération d’identité pour les pipelines de déploiement](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).
- Google : [action d’authentification GitHub officielle](https://github.com/google-github-actions/auth).
- Google Cloud : [comptes et permissions de compilation des fonctions](https://docs.cloud.google.com/functions/docs/building).
- Google Cloud : [rôles IAM Cloud Functions](https://docs.cloud.google.com/functions/docs/reference/iam/roles).
- Firebase : [rôles prédéfinis par produit](https://firebase.google.com/docs/projects/iam/roles-predefined-product).
- Google Cloud : [runtime Node.js et script `gcp-build`](https://docs.cloud.google.com/run/docs/runtimes/nodejs).
