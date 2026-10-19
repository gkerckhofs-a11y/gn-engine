# GN Engine

Moteur de jeu de rôle grandeur nature, indépendant de Murder Engine.

**Version 0.5 : connaissances privées, découverte par QR et copies explicites entre personnages.**

Application : **https://gn-engine.web.app/**. Le compte organisateur configuré est `gkerckhofs@gmail.com`. La recette complète avec plusieurs comptes joueurs reste à faire.

## Premier parcours

1. Connexion Google ; propriétaire, MJ et accueil selon les délégations de chaque session.
2. Scénario et personnages : identité publique, histoire, secrets, costume et notes MJ séparées.
3. Version figée puis copie indépendante en session, avec capacité, informations pratiques, questions et notice sur les données.
4. Inscription par lien/QR public. Une seule demande prend la dernière place ; les suivantes rejoignent la liste d’attente.
5. Attribution manuelle et invitation personnelle à usage unique, liée au compte Google de l’inscription.
6. Accès à la fiche publiée après activation et ouverture du briefing ; confirmation de lecture.
7. Réattribution ou révocation : nouvelles lectures privées refusées. Après révocation, nouvelle authentification obligatoire.

L’accueil et le rythme de jeu sont indépendants. Le MJ peut éditer les fiches de session sans modifier le modèle et prévisualiser la projection du joueur. Aucune invitation n’est envoyée automatiquement par courriel.

## Équipe et fiches narratives

Dans une session, le propriétaire peut déléguer un accès **Accueil** ou **MJ** à une adresse Google. Accueil gère les participants sans recevoir leurs secrets de personnage ; MJ dispose aussi des fiches complètes et du pilotage du jeu. La délégation ne s’étend ni aux autres sessions ni au scénario.

Les fiches proposent des relations orientées et des objectifs narratifs, publiables séparément. L’historique conserve les versions destinées au joueur. Une modification de session demande un motif et une nouvelle confirmation de lecture. Aucun calcul de mission ni récompense automatique à ce stade.

## Groupes et partage

Le scénario et la session disposent d'un éditeur de groupes publics ou secrets. Chaque personnage peut avoir plusieurs appartenances, avec révélation et permissions séparées. Le rôle Accueil ne reçoit aucun contenu de groupe. Seules les affiliations explicitement publiques apparaissent sur les badges.

Un membre peut être autorisé à lire le briefing, consulter les membres révélés, recevoir des informations et/ou en publier pendant le jeu. Un nouveau membre ne récupère pas automatiquement le passé du groupe. La désactivation des espaces ferme les lectures et publications joueurs sans effacer les données. [Parcours et limites de la version 0.4](docs/VALIDATION-0.4.md).

## Connaissances et indices

Le MJ crée des textes, choisit leurs destinataires de départ et configure une découverte QR éventuelle. Vérité MJ et présentation joueur restent séparées. Chaque personnage conserve la version reçue ; une copie explicite passe par le badge public du destinataire, sans annuaire privé. Le MJ peut attribuer ou retirer un accès avec un motif. L'espace **Mes informations** propose filtres et confirmation de lecture. [Parcours, garanties et limites 0.5](docs/VALIDATION-0.5.md).

## Infrastructure configurée

- GitHub privé : `gkerckhofs-a11y/gn-engine`.
- Firebase `gn-engine`, numéro `936415509528`, application `GN Engine Web` enregistrée.
- Firestore Standard `(default)` créé en `europe-west1` (Belgique), accès directs clients refusés.
- Firebase Authentication : Google activé.
- Firebase Hosting et fonction HTTP `api` publiés ; serveur en Belgique, Node 22.

L’autorisation Google a été configurée par le propriétaire et validée par un déploiement GitHub utilisant Workload Identity Federation. Aucune clé privée de compte de service n’est nécessaire. Le terminal local de Codex n’est pas connecté au compte personnel Google.

## Vérifier

Node 22 et Java 21 pour les émulateurs :

```sh
npm ci
npm run build
npm test
npm run test:emulator
```

La version 0.5 est publiée sur Firebase. **71 tests métier/interface et 54 intégrations** passent sur GitHub, soit 125 tests. Les vérifications locales, la preuve de déploiement et les limites sont consignées dans [le rapport 0.5](docs/VALIDATION-0.5.md).

## Publier

La configuration initiale est déjà effectuée pour `gn-engine`. Pour la reproduire, le propriétaire exécute une seule fois dans Google Cloud Shell :

```sh
bash scripts/authorize-github-firebase.sh
```

Si le fichier a été importé seul dans le dossier d’accueil de Cloud Shell, utiliser `bash authorize-github-firebase.sh`.

Ensuite, lancer **Déployer GN Engine sur Firebase** dans l’onglet Actions de GitHub, sur `main`. Le workflow est aussi déclenché par une modification explicite de `.github/deploy-request.json` sur `main`, ce qui permet à Codex de demander une publication via le connecteur GitHub. Les autres commits ne lancent que les vérifications.

L’autorisation utilise une identité temporaire GitHub, sans clé privée ni secret GitHub à configurer. [Droits exacts, procédure et révocation](docs/DEPLOIEMENT-GITHUB.md).

Pour publier depuis un terminal local après la même configuration, avec `gcloud` et Firebase CLI connectés au projet :

```sh
npm ci
gcloud auth login
npx firebase login
npm run deploy
```

Le workflow vérifie les tests, compile puis publie la fonction `api` via Google Cloud CLI et le site/règles/index via Firebase CLI. Deux comptes dédiés distinguent compilation et exécution. Le canon, les documents et les données d’essai ne sont pas chargés. Le propriétaire doit présenter une identité Google vérifiée correspondant à `OWNER_EMAIL` ; aucun rôle n’est accepté depuis le JSON client.

## Périmètre restant

Ce premier parcours ne termine pas tout le lot A ni les 132 exigences : classes et permissions de caisse/stock/transport, invitations de groupe entre joueurs, autres modes de connexion, récupération sans Google, pièces jointes, import/export, terrain, économie et vaisseaux restent à intégrer. Pas de démonstration de charge à 60/120 joueurs ni de recette navigateur en production.

Les versions et copies utilisent des transactions Firestore. Aucun plafond métier de casting ; les limites de taille des transactions devront être mesurées sur les contenus réels.

## Références

- [Cahier V1](docs/source/GN_Engine_Cahier_des_charges_V1.docx), [texte](docs/source/cahier-des-charges-v1.txt), [132 exigences](docs/exigences-v1.json).
- [Canon Port-Brèche](docs/source/port-breche-canon-v1.txt) : organisateur uniquement, jamais embarqué dans l’interface publique.
- [Audit initial](docs/AUDIT.md), [architecture](docs/ARCHITECTURE.md), [lots A à E](docs/LIVRAISON.md).
- `reference/sites-v0.1-source.tar.gz` : prototype Sites/D1 conservé au commit `6a12f995c5c26aaf3891cb4bbd8168e51184551e`. Le prototype privé existant n’a pas été remplacé.
