# Validation 0.21 — points d’action et récupération

Date : 20 octobre 2026. **Version 0.21.0 publiée et vérifiée ; 777 tests réussis.** La recette visuelle et terrain sur comptes réels reste à faire.

Base : version 0.20 du dépôt, commit `bd670dea159c5c7f01cfe83f8fcba9b81657dd44`. Demande : note Port-Brèche V0.3 fournie par Guilz, sans modification des données de production.

## Utiliser ce lot

1. Ouvrir l’atelier du scénario ou la régie d’une session comme propriétaire/MJ.
2. Dans **Points d’action et niveaux globaux**, cliquer sur **Configurer les PA**, cocher l’activation et régler les plafonds. Les valeurs proposées sont 5 PA au niveau 1, 8 PA au niveau 2, 300 minutes de jeu entre renouvellements et 600 secondes de récupération.
3. Vérifier l’aperçu puis appliquer. Une modification en session demande un motif privé. La prochaine échéance est conservée, sauf remplacement explicite par une échéance future.
4. Dans **Niveaux et réserves des personnages**, attribuer le niveau global et, si nécessaire, corriger les PA. Ajouter un plafond avant d’utiliser un niveau supérieur à 2. Une hausse de niveau ne recharge pas la réserve.
5. Configurer la portée du délai de chaque soin : personnelle, commune au patient pour les soins de terrain, ou aucune pour la clinique. Les compétences actives concernées par ce lot sont les soins instantanés déjà disponibles.

Le joueur retrouve ses PA sur sa fiche et dans les soins. La confirmation de soin indique le coût et la réserve avant/après. Paiements, lectures et remises d’objets restent sans coût en PA. Les réglages d’un scénario s’appliquent aux nouvelles copies de session ; une session déjà créée se configure dans sa propre régie.

## Vérifications locales

- Compilation de l’interface réussie.
- Suite complète locale : 427 tests réussis, aucun échec ni test ignoré, sous Node 24.19.0.
- Parmi eux : 5 tests de calcul PA et 11 parcours intégrés sur le store en mémoire. Ces 11 parcours sont également raccordés à la suite Firestore émulée.
- Parcours HTTP/Auth existant étendu : configuration MJ des PA, refus des commandes anonymes et du changement de règles par un joueur, soin débité une seule fois.
- Contrôle syntaxique et `git diff --check` réussis.
- Fixture visuelle locale fournie (`scripts/build-action-point-preview.mjs`). L’ouverture Chromium n’a pas pu être effectuée ici : navigateur absent et téléchargement indisponible. Aucune vérification visuelle n’est revendiquée.

Les tests couvrent les niveaux globaux distincts des compétences, le manque de PA, les confirmations périmées, la concurrence, les pauses, les renouvellements sans cumul, le changement de période à 4 h 40, les corrections MJ, les niveaux non configurés, les réservations, les droits Accueil/joueur et les règles conservées dans les archives.

## Validation distante

Le [run GitHub Actions 39410099924](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39410099924), terminé avec succès le 20 octobre 2026 à 10:53 UTC, vérifie le commit source `d3e563294ae3ed3dc09b3f4cbbeef992b12c4915` sous Node 22 et Java 21 : compilation, 427 tests applicatifs et 350 tests d’intégration Firebase réussis, soit 777 tests, sans échec ni test ignoré.

La chaîne Firebase [39411563488](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39411563488), déclenchée par le commit de publication `30e4454f6d2f3646e135db13c61f97a49dc07215`, a répété ces contrôles avec succès : 427 tests applicatifs terminés à 10:58:14 UTC et 350 intégrations Firebase à 11:05:48 UTC, sans échec ni test ignoré. Elle installe ensuite la fonction et le site, puis vérifie le manifeste et le refus des accès privés anonymes.

Publication réussie : fonction ACTIVE à 11:07:41 UTC, Hosting publié à 11:07:51 UTC, puis manifeste 0.21.0 et refus des commandes privées anonymes vérifiés à 11:08:15 UTC, le 20 octobre 2026. Le job de déploiement `118593568776` s’est terminé avec succès. L’application est accessible à [gn-engine.web.app](https://gn-engine.web.app/). Ces contrôles publics ne constituent pas une recette authentifiée ni une vérification visuelle mobile. Aucun scénario, personnage ou solde de production n’a été modifié pour cette livraison.

## Limites

Les soins restent instantanés. Le cycle complet des actions chronométrées, les tests au dé, les fouilles, les reçus hors réseau, les masters XLSX et la campagne persistante ne sont pas livrés dans ce lot. La progression globale au-delà de l’attribution MJ et les plafonds après le niveau 2 ne sont pas définis par le code.

Aucune recette réelle multi-comptes sur mobile et aucune mesure de charge à 60 joueurs n’est revendiquée. Le détail de couverture des 19 exigences figure dans [le suivi de la note](NOTE-V03-SUIVI.md).
