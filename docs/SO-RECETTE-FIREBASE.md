# SPACE OUTLAWS — préparation Firebase de recette

**Décision ultérieure du 28 octobre :** l’utilisateur autorise la recette sur le projet existant `gn-engine`, sans projet distinct. La publication emploie donc le circuit natif GitHub/WIF, sa configuration Auth et son bucket privé existant ; aucun seed, changement IAM ou migration. Le générateur ci-dessous reste destiné à un projet distinct et conserve ses refus. L’autorisation est acquise ; les résultats réels de publication seront consignés dans la PR et le suivi courant.

État de la préparation initiale au 28 octobre 2026 : outillage local livré, cible réelle non désignée ni vérifiée, aucun projet provisionné, accès créé ou déploiement effectué. Ce document prépare le bloc 5 demandé après le point du 27 octobre ; il ne certifie ni le cahier des charges complet ni la recette humaine.

## Paquet local

Depuis un checkout du candidat avec ses dépendances installées, créer un fichier `configuration.private.json` ignoré par Git, avec exactement ces cinq champs, renseignés depuis la configuration réelle de l’application Web Firebase de recette :

```json
{
  "projectId": "A_RENSEIGNER",
  "projectNumber": "A_RENSEIGNER",
  "apiKey": "A_RENSEIGNER",
  "appId": "A_RENSEIGNER",
  "ownerEmail": "A_RENSEIGNER"
}
```

Les valeurs ci-dessus sont volontairement refusées. Ne pas les remplacer par celles de production. La clé Web est une configuration publique, jamais une clé de compte de service. Le compte propriétaire devra être un compte Google réellement accessible, avec adresse vérifiée ; les personnages et données de jeu seront fictifs. Les identités `example.test` du kit local ne peuvent pas servir de connexion Google réelle.

```sh
node scripts/prepare-firebase-recette.mjs configuration.private.json
```

Cette commande ne contacte aucun service distant, ne lance ni Firebase CLI ni gcloud, et ne crée aucun compte. Elle génère `dist/so-firebase-recette/`, distinct du `public/` de production et de `dist/so-recette/` réservé aux émulateurs. Un dossier déjà présent est refusé : conserver ou déplacer explicitement le paquet précédent avant une nouvelle préparation.

Le paquet comprend :

- `public/` : interface native compilée avec la configuration Firebase de recette, connexion Google native et bandeau visible ; quatre Masters historiques inchangés ; manifeste public avec SHA, arbre, état propre/modifié et verdict humain NON EXÉCUTÉ.
- `server/` : sources serveur natives, manifestes npm et règles d’archivage gcloud ; aucune copie des données de campagne, des comptes ou du stock.
- `firebase.json` et les règles/index natifs : Hosting, Firestore et Storage. La fonction reste publiée par gcloud, comme dans le parcours existant.
- `runtime-env.json` et `deployment-plan.json`, hors répertoire public : propriétaire, cible, variables et liste ordonnée de commandes **à examiner, non exécutées**.
- `package-hashes.json` : empreintes SHA-256 des autres fichiers, pour contrôler le paquet approuvé. Ces empreintes ne sont ni une signature ni une preuve d’autorisation.

Le mode serveur `GN_DEPLOYMENT_ENV=recette` exige un projet explicite distinct de `gn-engine` et des projets `demo-*`, un propriétaire et le bucket dédié. Admin Auth/Firestore reçoit explicitement ce projet. Les variables de projet contradictoires, buckets étrangers et hôtes d’émulateur sont refusés avant l’initialisation. Le mode historique sans marqueur conserve son comportement ; ce dispositif n’interdit pas à un administrateur d’exécuter les anciens scripts de production.

## Ressources à identifier puis faire approuver

Le générateur propose une seule topologie, sans prétendre que les ressources existent :

| Ressource | Configuration à vérifier |
| --- | --- |
| Projet | Identifiant et numéro réels, distincts de la production ; clé Web et App ID appartenant à ce projet |
| Hosting / Google Auth | Site par défaut `PROJECT_ID.web.app`, domaine Auth `PROJECT_ID.firebaseapp.com`, fournisseur Google et domaines autorisés, comptes réels distincts propriétaire/MJ/accueil/joueurs |
| Firestore | Base `(default)`, localisation explicitement choisie, règles et index du candidat ; aucun import de production |
| Médias | Bucket par défaut `PROJECT_ID.firebasestorage.app`, localisation et rattachement au même projet vérifiés, règles Storage natives ; aucun accès public aux objets |
| API | Fonction `api`, Node 22, `europe-west1`, 512 Mio, concurrence 8, maximum 3 instances et délai 60 s, comme le serveur actuel |
| Identité d’exécution | `gn-engine-runtime@PROJECT_ID.iam.gserviceaccount.com`, droits nécessaires sur Auth/Firestore et ce seul bucket ; aucun droit sur les ressources de production |
| Construction | `gn-engine-build@PROJECT_ID.iam.gserviceaccount.com` et dépôt Docker `gn-engine-functions` dans `europe-west1` ; permissions de construction à vérifier séparément |
| Exploitation | Identité de déploiement, APIs, facturation, budget/alertes, responsables, fenêtre et procédure d’arrêt à confirmer |

La validation locale contrôle les formats et leur cohérence, pas la propriété réelle de la clé, l’existence du projet, la configuration OAuth ou les politiques IAM. Le bucket par défaut récent est le seul format pris en charge par ce paquet ; un ancien bucket `appspot.com` ou un bucket personnalisé exige une adaptation explicite, pas un remplacement manuel silencieux. La documentation Firebase exige Blaze pour créer le bucket récent ; aucun coût réel ni disponibilité de projet n’est affirmé.

Avant toute création de ressources, soumettre la cible exacte, les droits, la facturation et les opérations nécessaires. La présente tranche ne vaut pas cette autorisation. Aucun secret ni fichier de compte de service n’est demandé dans le fichier de configuration.

## Plan de publication à approuver

Après vérification des prérequis et autorisation, utiliser le paquet du **candidat propre exact**, avec sa CI complète réussie. Vérifier ses empreintes et les cinq valeurs contre la console Firebase. Le plan JSON fournit des programmes et tableaux d’arguments, pas un script shell à concaténer. Les chemins sont relatifs à la racine du paquet ; Firebase CLI doit être installé et disponible via `npx --no-install`, gcloud configuré pour l’identité autorisée. Le générateur ne les installe pas.

Ordre préparé : règles Firestore/index/Storage → fonction native avec comptes et fichier d’environnement dédiés → Hosting. Chaque commande porte explicitement le projet. Le fichier d’environnement remplace les anciennes variables utilisateur de la fonction : ce plan est destiné à un environnement de recette dédié, pas à une fonction partagée. Les APIs, ressources, identités, domaines Auth et autorisations nécessaires doivent exister auparavant ; le plan n’automatise pas leur provisionnement.

Les scripts `deploy.sh`, `deploy-api.sh`, le workflow de production et `verify-deployment.mjs` ciblent encore la production : **ne pas les utiliser pour cette recette**. Les contrôles distants sur la cible de recette restent à exécuter et consigner :

1. URL effective, version et SHA/arbre attendus, bandeau de recette et quatre fichiers Masters identiques ; observer les destinations réseau Auth/API et vérifier le projet serveur/bucket.
2. Lecture privée anonyme refusée, connexion Google réelle, séparation propriétaire/MJ/accueil/joueurs et absence d’accès à une autre session.
3. Upload/lecture/remplacement/suppression d’une image fictive par les commandes natives ; accès direct anonyme au bucket refusé et aucun objet dans la production.
4. Préparation de données fictives depuis les commandes natives, puis parcours du [kit de recette](SO-RECETTE-LOCALE.md) adaptés aux comptes réels. Ne pas lancer son seed Auth Emulator sur Firebase réel.
5. Android/iOS, délais réels, concurrence, réseau dégradé, charge et sauvegarde/restauration selon le registre des 55 cas et dix SEC-SO ; ne pas transformer les résultats CI en verdicts humains.

Arrêt sur cible/version inattendue, accès privé accepté à tort, médias dirigés ailleurs ou échec de configuration. Pour un premier environnement vide, conserver le site fermé tant que les contrôles ne sont pas terminés. Pour une mise à jour d’une recette existante, sauvegarde cohérente et candidat de retour compatible avec les données sont requis avant publication ; un simple ancien binaire ne restaure pas les données. Ni sauvegarde ni retour arrière réel exécutés ici.

## Sources techniques

Consultées le 28 octobre 2026, documentation officielle Google/Firebase : [déploiement par produit](https://firebase.google.com/docs/cli#deploy_specific_firebase_services), [Cloud Storage Web, bucket et facturation](https://firebase.google.com/docs/storage/web/start), [gcloud functions deploy, comptes et variables](https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy), [identité de construction](https://docs.cloud.google.com/functions/docs/building). Consignes du dépôt : [recette finale](../AGENTS.md#recette-finale-avant-publication) et [sauvegarde/déploiement](SO-SAUVEGARDE-DEPLOIEMENT.md).
