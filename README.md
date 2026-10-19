# GN Engine

Développement indépendant de Murder Engine, préparé le 19 octobre 2026.

**État : cadrage intégré et premiers modules métier testés. Ce dépôt n'est pas encore une application Firebase utilisable et aucun déploiement n'a été effectué.**

## Références

- [Cahier des charges V1 fourni](docs/source/GN_Engine_Cahier_des_charges_V1.docx), 19 octobre 2026 : 132 exigences identifiées, dont 10 parcours de recette.
- [Texte extrait du cahier](docs/source/cahier-des-charges-v1.txt), pour recherche et comparaison.
- [Canon Port-Brèche](docs/source/port-breche-canon-v1.txt), texte extrait du document organisateur du 19 octobre 2026. Ce contenu contient des secrets et ne doit jamais être inclus dans les fichiers publics de l'application.
- [Audit de l'existant](docs/AUDIT.md), [architecture proposée](docs/ARCHITECTURE.md), [ordre de livraison](docs/LIVRAISON.md).
- [Suivi des exigences](docs/exigences-v1.json) : distinguer présence dans le prototype, noyau testé et fonctionnalité intégrée.

## Ressources vérifiées

- Dépôt : `gkerckhofs-a11y/gn-engine`.
- Projet Firebase : `gn-engine`, numéro `936415509528`. Console accessible le 19 octobre 2026, aucune application enregistrée lors de la vérification.
- Prototype privé : https://gn-engine.swiftclove64.chatgpt.site
- Source Sites auditée : commit `6a12f995c5c26aaf3891cb4bbd8168e51184551e`.

## Ce qui est dans ce dépôt

`src/core` contient le temps de jeu, des projections publiques/privées et un transfert atomique de crédits fictifs avec contrôle des droits et répétition sans double effet. `src/adapters/firestore.mjs` adapte le contrat de stockage aux transactions d'une instance Firebase Admin injectée. Il reste à tester avec l'émulateur.

`reference/sites-v0.1-source.tar.gz` conserve les fichiers suivis du prototype, sauf son identité de publication. Ce n'est pas le code à déployer directement sur Firebase : son serveur dépend de D1 et de l'identité transmise par Sites. L'archive ne contient ni base de données ni accès des joueurs.

Les règles Firestore et Storage sont des fichiers de préparation refusant les accès directs. Elles ne sont pas déployées. Aucun serveur HTTP, fournisseur d'authentification, écran Firebase ou dispositif de publication automatique n'est livré à ce stade.

## Vérification locale

Node.js 22.13 ou ultérieur, sans dépendance externe :

```sh
npm test
```

16 tests de contrat métier passent en mémoire. Ils ne remplacent ni les tests Firebase Emulator Suite, ni une recette navigateur, ni un test de charge à 60/120 joueurs. Le workflow GitHub exécute seulement ces tests, sans accès Firebase.

La suite du prototype a également été rejouée : 42 assertions passent sur SQLite avec adaptateur D1. Voir les conditions exactes dans [l'audit](docs/AUDIT.md).

## Suite du travail

Le lot A vient en premier : identité, scénarios versionnés, inscriptions, attribution, groupes et permissions. La construction complète reste organisée en lots A à E. Les petites annonces et candidatures font partie du lot C, pas d'une extension facultative.
