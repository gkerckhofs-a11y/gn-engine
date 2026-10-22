# L1k — Relevé des dotations de départ

Candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 22 octobre 2026 : `main` vérifié à `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent de travail `a0d47413498ab53b101c7a52dc770f48cac82657`. Sa [CI L1j](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39817778154) est réussie : 739 tests applicatifs et 578 tests Firebase.

## Parcours livré

Dans les Masters **Personnages**, « Relevé des dotations » affiche les réglages de départ enregistrés pour chaque personnage : crédits, objets, quantités et révisions de réglage. Recherche par personnage/objet, filtre non archivés/archivés, consultation et export XLSX des personnages affichés sont disponibles en scénario et en session, même après lancement.

Une absence de réglage est distincte d’un zéro explicite ou d’un inventaire explicitement vide. Les objets utilisent les noms et unités de la définition de départ conservée sur le personnage. Les crédits figurent une seule fois par personnage dans le classeur ; les objets occupent une feuille distincte.

Le relevé ne propose aucune création, modification, duplication ou redistribution. La création groupée Personnages/Attributions/Dotations de L1h reste disponible. Les modifications de préparation du scénario gardent leurs outils dédiés.

## Périmètre et limite historique

La projection lit uniquement `characters.startingCredits` et `characters.startingInventory`, sous le contrôle propriétaire existant. Elle ne lit aucun compte, stock acquis, participant ou secret de fiche ; aucune donnée métier n’est dupliquée dans une collection.

Les imports peuvent additionner plusieurs dotations sur un même personnage/objet. Les reçus `masterRows` conservent identités et empreintes, mais pas toutes les cellules originales ; les réglages peuvent ensuite être modifiés par les outils de préparation. Ce relevé décrit donc les **définitions de départ actuellement conservées dans la destination**, pas une reconstitution des lignes historiques ni une preuve de leur distribution. En session, il ne représente ni le solde actuel ni le stock restant. Dans l’épisode suivant, ces définitions restent distinctes des acquis reportés.

L’export `GN_Engine_Releve_Dotations_…xlsx` comporte **Notice, Releve, ObjetsDepart**. Notice indique son format `gn-engine-dotations-report`, la destination, campagne et révision du parent. Les révisions propres aux réglages figurent dans Releve ; le rapport reflète la lecture au chargement, pas une synchronisation en direct. Rouvrir l’atelier pour actualiser.

Ce fichier est **un rapport en lecture seule, pas un Master réimportable**. Le lecteur Master le refuse ; le serveur refuse également son contenu. Aucun identifiant de ligne historique n’est inventé. Le générateur XLSX commun conserve les cellules littérales (aucune formule), contrôles XML et limites : 250 lignes de données toutes feuilles comprises, 1 Mio de contenu et 8 Mio de fichier. Filtrer les personnages pour fractionner un relevé trop grand. Un personnage dépassant seul ces limites ne peut pas être exporté par ce parcours.

Ce lot complète la restitution demandée, mais **ne clôt pas l’export Master complet des dotations**. Celui-ci devra préserver leur immutabilité et les identités lors de la conception des exports complets. L’archive de scénario existante garde son rôle de transfert d’un scénario complet.

## Compatibilité

Aucun changement du contrat Master, des quatre XLSX historiques, des règles de distribution, de schéma ou de collection. Aucun changement de permissions, règles/indexes Firebase, accès privé, workflow ou `.github/deploy-request.json`. Aucun nouveau barème [A] ; décisions [V] et propositions [P] du cadrage inchangées. Aucun déploiement ou fusion. Retour au code L1j sans migration : ce lot n’écrit aucune donnée métier.

Les vingt et un parcours précédents couvrant vingt et une feuilles sont complétés par **un relevé en lecture seule**, sans le compter comme un nouvel éditeur Master. Les exports complets, dépendances, comparateur et historiques consolidés restent à développer.

## Validation exécutée

Le **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **745 tests réussis**, aucun échec, annulation ou test ignoré.
- `npm run build` : réussi.
- Trois nouveaux scénarios partagés mémoire/Firestore : agrégation, export non réimportable, permissions et absence d’écriture ; modifications via outils existants et distinction absence/zéro/vide ; dépenses, lecture après lancement et continuité de campagne sans redistribution.
- Deux tests d’interface/export : filtres, texte échappé, refus des actions d’édition, cellules littérales, périmètre exporté, limites et compatibilité du générateur Master.
- Un test de contrôleur : navigation, filtre et téléchargement sans commande de modification.
- Empreintes des quatre Masters historiques inchangées ; diff et liens documentaires contrôlés.

Sources : [projection](../src/core/master-dotations-projection.mjs), [relevé](../web/master-dotations-report.mjs), [générateur XLSX](../web/master-xlsx-write.mjs), [suite partagée](../test/support/master-dotations-report-suite.mjs), [tests interface/export](../test/master-dotations-report-ui.test.mjs), [tests contrôleur](../test/master-upload-ui.test.mjs).

Les résultats définitifs CI seront consignés dans la PR après lecture des journaux, avec commit testé, exécution/job, versions, décomptes et date. La CI du parent n’est pas attribuée à ce lot.

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Ouvrir le relevé avec plusieurs rôles | Propriétaire autorisé, autres rôles refusés | Non exécuté |
| Comparer absence, zéro et inventaire vide | États distincts et explicites | Non exécuté |
| Filtrer puis ouvrir le XLSX dans Excel/LibreOffice | Seulement les personnages affichés, crédits séparés des objets | Non exécuté |
| Tenter de charger le rapport comme Master | Refus sans mutation | Non exécuté |
| Consulter après dépenses et dans l’épisode suivant | Départ conservé, acquis inchangés | Non exécuté |
| Consulter sur Android/iOS | Lisibilité et navigation | Non exécuté |

Aucune recette humaine, charge réelle, fusion ou publication exécutée. Recette finale isolée, rapport global et procédure de déploiement restent prévus en fin de développement.
