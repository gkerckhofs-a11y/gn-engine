# GN Engine

Moteur de jeu de rôle grandeur nature, indépendant de Murder Engine.

**Version 0.2 : premier parcours développé et testé sur les émulateurs Firebase. Le service et l’interface ne sont pas encore déployés.**

## Premier parcours

1. Connexion Google et espace organisateur réservé au compte propriétaire configuré.
2. Scénario et personnages : identité publique, histoire, secrets, costume et notes MJ séparées.
3. Version figée puis copie indépendante en session, avec capacité, informations pratiques, questions et notice sur les données.
4. Inscription par lien/QR public. Une seule demande prend la dernière place ; les suivantes rejoignent la liste d’attente.
5. Attribution manuelle et invitation personnelle à usage unique, liée au compte Google de l’inscription.
6. Accès à la fiche publiée après activation et ouverture du briefing ; confirmation de lecture.
7. Réattribution ou révocation : nouvelles lectures privées refusées. Après révocation, nouvelle authentification obligatoire.

L’accueil et le rythme de jeu sont indépendants. Le MJ peut éditer les fiches de session sans modifier le modèle et prévisualiser la projection du joueur. Aucune invitation n’est envoyée automatiquement par courriel.

## Infrastructure configurée

- GitHub privé : `gkerckhofs-a11y/gn-engine`.
- Firebase `gn-engine`, numéro `936415509528`, application `GN Engine Web` enregistrée.
- Firestore Standard `(default)` créé en `europe-west1` (Belgique), accès directs clients refusés.
- Firebase Authentication : Google activé.
- Cible de publication : Firebase Hosting et fonction HTTP `api` en Belgique, Node 22. **Publication restante.**

Cloud Shell a retourné « Site Unavailable » dans le navigateur de travail. Le terminal local n’est pas authentifié auprès de Firebase. Aucune clé de service ni délégation de déploiement GitHub n’a été créée.

## Vérifier

Node 22 et Java 21 pour les émulateurs :

```sh
npm ci
npm run build
npm test
npm run test:emulator
```

28 tests métier et 14 tests d’intégration passent localement. Voir [le rapport exact et ses limites](docs/VALIDATION-0.2.md).

## Publier

Dans le dépôt, depuis un terminal ayant accès à ton projet Firebase :

```sh
npm ci
npx firebase login
bash scripts/deploy.sh
```

Le script compile et déploie uniquement Hosting, la fonction `api` et les règles/index Firestore. Il ne charge ni le canon, ni les documents, ni les données d’essai. Le propriétaire doit présenter une identité Google vérifiée correspondant à `OWNER_EMAIL` ; aucun rôle n’est accepté depuis le JSON client.

## Périmètre restant

Ce premier parcours ne termine pas tout le lot A ni les 132 exigences : délégation MJ/accueil, groupes et permissions fines, autres modes de connexion, récupération sans Google, pièces jointes, import/export, terrain, économie et vaisseaux restent à intégrer. Pas de démonstration de charge à 60/120 joueurs ni de recette navigateur en production.

Les versions et copies utilisent des transactions Firestore. Aucun plafond métier de casting ; les limites de taille des transactions devront être mesurées sur les contenus réels.

## Références

- [Cahier V1](docs/source/GN_Engine_Cahier_des_charges_V1.docx), [texte](docs/source/cahier-des-charges-v1.txt), [132 exigences](docs/exigences-v1.json).
- [Canon Port-Brèche](docs/source/port-breche-canon-v1.txt) : organisateur uniquement, jamais embarqué dans l’interface publique.
- [Audit initial](docs/AUDIT.md), [architecture](docs/ARCHITECTURE.md), [lots A à E](docs/LIVRAISON.md).
- `reference/sites-v0.1-source.tar.gz` : prototype Sites/D1 conservé au commit `6a12f995c5c26aaf3891cb4bbd8168e51184551e`. Le prototype privé existant n’a pas été remplacé.
