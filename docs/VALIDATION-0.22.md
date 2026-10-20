# Validation 0.22 — continuité de campagne

20 octobre 2026. Statut : code préparé, validation distante et publication en attente.

Base vérifiée : version 0.21.0, commit GitHub `a0122f83b8fef95cc2102674e2ce832fe48ef7a9`. Source fonctionnelle : [note Port-Brèche V0.3](source/port-breche-engine-note-v03.md), particulièrement GN-01 et GN-05. Aucune donnée de production n’est utilisée par les tests.

## Fonctionnement

Choix campagne/partie indépendante avant création, bilan de clôture confirmé, état source scellé, reprise par étapes et exclusion de deux épisodes ouverts. Conservation des soldes, lots, profils attribués, niveaux, images, connaissances et droits de groupes. Politique explicite des blessures ; nouveaux PA, usages et délais de session. Inscription et attribution à renouveler avec suggestion du rôle précédent. [Mode opératoire et limites](CAMPAGNES.md).

## Vérifications

Treize parcours métier de campagne sont exécutés sur le store en mémoire et raccordés à Firestore émulé : création et réessai, indépendance, soldes modifiés, profils attribués, connaissances retirées, audiences des messages, blessures, PA, engagements ouverts, annulation des offres, aperçu périmé, protection de l’état scellé, concurrence entre reprises, interruption et répétition d’une page, nouvelle attribution, rôles, caisses, images et lots épuisés. Un état synthétique de 60 personnages vérifie la copie en plusieurs pages ; il ne simule pas 60 connexions concurrentes.

Trois tests d’interface vérifient l’échappement des textes, l’absence de confirmation de clôture lorsque des blocages subsistent, la reprise d’une préparation et le choix obligatoire des blessures. Un parcours HTTP réel avec Auth et Firestore émulés couvre la création, la clôture, le refus des accès anonymes et joueurs non autorisés, puis la conservation d’un solde dépensé lors de la reprise.

Validation locale : **443 tests réussis**, sans échec ni test ignoré, sous Node 24.19.0. Compilation 0.22.0, vérification syntaxique et `git diff --check` réussis. La validation Node 22 / Java 21 sur Firebase émulé et la preuve de publication seront ajoutées après exécution.

## Limites de validation

Aucune recette authentifiée dans un navigateur mobile et aucun test de charge à 60 joueurs ne sont revendiqués. Les tests de fragments HTML ne constituent pas une vérification visuelle des écrans.

Le report automatique des contrats, les masters XLSX complémentaires, l’ajout de personnages, la progression XP, les actions chronométrées avec D6 et la sauvegarde/restauration complète restent à développer. Les limites de taille et de clôture sont documentées dans le mode opératoire.
