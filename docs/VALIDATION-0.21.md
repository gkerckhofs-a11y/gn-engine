# Validation 0.21 — points d’action et récupération

Date : 20 octobre 2026. Statut : code préparé ; validation distante et publication à confirmer.

Base : version 0.20 du dépôt, commit `bd670dea159c5c7f01cfe83f8fcba9b81657dd44`. Demande : note Port-Brèche V0.3 fournie par Guilz, sans modification des données de production.

## Vérifications locales

- Compilation de l’interface réussie.
- Suite complète locale : 427 tests réussis, aucun échec ni test ignoré, sous Node 24.19.0. La cible de production Node 22 doit être vérifiée par GitHub Actions.
- Parmi eux : 5 tests de calcul PA et 11 parcours intégrés sur le store en mémoire. Ces 11 parcours sont également raccordés à la suite Firestore émulée.
- Parcours HTTP/Auth existant étendu : configuration MJ des PA, refus des commandes anonymes et du changement de règles par un joueur, soin débité une seule fois.
- Contrôle syntaxique et `git diff --check` réussis.
- Fixture visuelle locale fournie (`scripts/build-action-point-preview.mjs`). L’ouverture Chromium n’a pas pu être effectuée ici : navigateur absent et téléchargement indisponible. Aucune vérification visuelle n’est revendiquée.

Les tests couvrent les niveaux globaux distincts des compétences, le manque de PA, les confirmations périmées, la concurrence, les pauses, les renouvellements sans cumul, le changement de période à 4 h 40, les corrections MJ, les niveaux non configurés, les réservations, les droits Accueil/joueur et les règles conservées dans les archives.

## Limites

Les soins restent instantanés. Le cycle complet des actions chronométrées, les tests au dé, les fouilles, les reçus hors réseau, les masters XLSX et la campagne persistante ne sont pas livrés dans ce lot. La progression globale au-delà de l’attribution MJ et les plafonds après le niveau 2 ne sont pas définis par le code.

Aucune recette réelle multi-comptes sur mobile et aucune mesure de charge à 60 joueurs n’est revendiquée. Le détail de couverture des 19 exigences figure dans [le suivi de la note](NOTE-V03-SUIVI.md).
