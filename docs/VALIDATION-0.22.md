# Validation 0.22 — continuité de campagne

20 octobre 2026. **Version 0.22.0 publiée et vérifiée ; 807 tests réussis.** La recette des écrans privés sur comptes réels et mobiles reste à faire.

Base vérifiée : version 0.21.0, commit GitHub `a0122f83b8fef95cc2102674e2ce832fe48ef7a9`. Source fonctionnelle : [note Port-Brèche V0.3](source/port-breche-engine-note-v03.md), particulièrement GN-01 et GN-05. Aucune donnée de production n’est utilisée par les tests.

## Fonctionnement

Choix campagne/partie indépendante avant création, bilan de clôture confirmé, état source scellé, reprise par étapes et exclusion de deux épisodes ouverts. Conservation des soldes, lots, profils attribués, niveaux, images, connaissances et droits de groupes. Politique explicite des blessures ; nouveaux PA, usages et délais de session. Inscription et attribution à renouveler avec suggestion du rôle précédent. [Mode opératoire et limites](CAMPAGNES.md).

## Vérifications

Treize parcours métier de campagne sont exécutés sur le store en mémoire et raccordés à Firestore émulé : création et réessai, indépendance, soldes modifiés, profils attribués, connaissances retirées, audiences des messages, blessures, PA, engagements ouverts, annulation des offres, aperçu périmé, protection de l’état scellé, concurrence entre reprises, interruption et répétition d’une page, nouvelle attribution, rôles, caisses, images et lots épuisés. Un état synthétique de 60 personnages vérifie la copie en plusieurs pages ; il ne simule pas 60 connexions concurrentes.

Trois tests d’interface vérifient l’échappement des textes, l’absence de confirmation de clôture lorsque des blocages subsistent, la reprise d’une préparation et le choix obligatoire des blessures. Un parcours HTTP réel avec Auth et Firestore émulés couvre la création, la clôture, le refus des accès anonymes et joueurs non autorisés, puis la conservation d’un solde dépensé lors de la reprise.

Validation locale : **443 tests réussis**, sans échec ni test ignoré, sous Node 24.19.0. Compilation 0.22.0, vérification syntaxique et `git diff --check` réussis. La validation Node 22 / Java 21 sur Firebase émulé et la preuve de publication sont détaillées ci-dessous.

## Validation distante

La chaîne [39416514386](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39416514386) a réussi la compilation et **807 tests** sous Node 22 / Java 21 : 443 tests applicatifs terminés le 20 octobre 2026 à 11:40:12 UTC et 364 intégrations Firebase à 11:49:28 UTC, sans échec ni test ignoré. Commit fonctionnel `22dd5f3476f0793dcf31240fea48242f8e158dd8`, demande de publication `2a2b6a3821b64c8eee1d125b59865a4d8b2e3475`. Les 18 fichiers de ce lot ont été comparés aux objets GitHub et correspondent aux fichiers validés localement.

Le contrôle du site dans le navigateur a ensuite révélé que son pied de page conservait un numéro écrit en dur, 0.20.0. La correction `9d961c0966b6105ae5366a0a3cb2b5bfd8d3157e` génère désormais le numéro depuis le même paquet que le manifeste. La concordance a été vérifiée localement, et le contrôle de publication vérifie aussi le numéro affiché. La demande finale `6fc0ad4e26cb9c633ecae02e85dbb55e0291e851` passe par [la chaîne 39416858262](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39416858262).

## Limites de validation

Aucune recette authentifiée dans un navigateur mobile et aucun test de charge à 60 joueurs ne sont revendiqués. Les tests de fragments HTML ne constituent pas une vérification visuelle des écrans.

Le report automatique des contrats, les masters XLSX complémentaires, l’ajout de personnages, la progression XP, les actions chronométrées avec D6 et la sauvegarde/restauration complète restent à développer. Les limites de taille et de clôture sont documentées dans le mode opératoire.

## Publication finale et contrôle navigateur

La révision finale `6fc0ad4e26cb9c633ecae02e85dbb55e0291e851` a réussi la compilation et les 807 tests dans [la vérification 39416858201](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39416858201), puis à nouveau dans [la chaîne de publication 39416858262](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39416858262). Dans cette dernière, les 443 tests applicatifs se terminent à 11:53:03 UTC et les 364 intégrations à 12:02:49 UTC, sans échec ni test ignoré.

Le job de publication `118616050078` est terminé avec succès : fonction ACTIVE à 12:04:44 UTC, Hosting publié à 12:04:54 UTC, version 0.22.0 et refus des accès anonymes aux commandes privées vérifiés à **12:05:20 UTC le 20 octobre 2026** (14:05:20 à Bruxelles). Le contrôle exige désormais aussi que le pied de page affiche la même version.

Après rechargement dans le navigateur, l’accueil de [gn-engine.web.app](https://gn-engine.web.app/) affiche bien **GN Engine · 0.22.0** et son interface de connexion. Cette observation publique confirme le chargement de l’accueil ; elle ne valide pas les écrans privés de campagne sur un compte organisateur. Aucune donnée de jeu n’a été créée ou modifiée en production pour ces vérifications.
