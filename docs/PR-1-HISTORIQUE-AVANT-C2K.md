## Modèles et navigation M3 dans la préparation commune

M3 ne permettait pas encore de préparer le réseau spatial dans le Master central. C2j ajoute création, modification, archivage et restauration des modèles de vaisseaux, ports et routes. Une route peut référencer deux ports encore absents ; leur préparation ou restauration résout les liens sans recopier le contenu ni réécrire la route.

- Trois familles V0.7 aux caractéristiques fixes, dont le chasseur à fret nul. Distances 5/10/15 min et facteurs carburant 1/2/3 ; risque indépendant 1/6, 2/6 ou 3/6. Aucun barème libre injecté.
- Validation native des routes réutilisée pour les champs communs ; le coût fixe et les états des anciennes routes restent séparés des définitions centrales.
- Édition M3 explicitement déléguée, révision commune et de contenu, motif, historique, reçus idempotents, autorité courante avant réessai. Concurrence vérifiée avec les six autres ateliers.
- Codes privés saisis sans exemple automatique, doublons actifs du même type signalés. Suggestions minimales, aucun catalogue étranger ou admission consulté. Codes, descriptions et notes absents du résumé global.
- Contrôle commun des formats, valeurs dérivées, archives et références typées ; cible corrompue non résolue par homonymie. Lieu commun facultatif explicitement non contrôlé, sans catalogue ni QR parallèle.
- Limites techniques : 100 modèles, 100 ports, 200 routes archives comprises ; 1659 changements globaux, budgets 16 Mio/4 Mio conservés, empreinte interne 7.
- Les sept ateliers ont désormais une édition préparatoire partielle. M3 reste sans création d’instance, achat, pilote, carburant, voyage, rencontre, événement, combat, import/export XLSX ou publication.

Quatre Masters historiques, sources canoniques, contrats CAMPAGNE/SESSION, anciennes navigations, dépendances, workflows et règles/index Firebase préservés. Aucun merge, déploiement ou migration.

## Périmètre cumulé et documentation

La PR conserve les travaux antérieurs L1 et SPACE OUTLAWS jusqu’à C2i. [Description et preuves précédentes archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/1fb8a7a47e4a185f3f50bde784fb58dd4995853c/docs/PR-1-HISTORIQUE-AVANT-C2J.md).

- [Contrat C2j, barèmes et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/1fb8a7a47e4a185f3f50bde784fb58dd4995853c/docs/SO-04-C2J-SPATIOPORT-BROUILLON.md)
- [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/1fb8a7a47e4a185f3f50bde784fb58dd4995853c/docs/SO-VALIDATION.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/1fb8a7a47e4a185f3f50bde784fb58dd4995853c/docs/MATRICE-SPACE-OUTLAWS-V3.md), [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/1fb8a7a47e4a185f3f50bde784fb58dd4995853c/docs/SO-RECETTES-V35.md)
- [Sauvegarde/reprise à préparer](https://github.com/gkerckhofs-a11y/gn-engine/blob/1fb8a7a47e4a185f3f50bde784fb58dd4995853c/docs/SO-SAUVEGARDE-DEPLOIEMENT.md) : conserver les trois types et grants M3 avec le brouillon, ses révisions, historiques et reçus. C2i n’est pas un retour fonctionnel équivalent ; les exports ciblés ne sauvegardent pas M3.

REC-SO-13 à 19 et MST-09 restent non certifiés : préparation de définitions, sans trajet joué ni publication de version complète. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés. Publication globale, I3/I4/I5, recette Android/iOS, charge pilote et restauration complète restent à livrer.

## Validation du candidat C2j

Candidat distant : [`1fb8a7a47e4a185f3f50bde784fb58dd4995853c`](https://github.com/gkerckhofs-a11y/gn-engine/commit/1fb8a7a47e4a185f3f50bde784fb58dd4995853c). Parent C2i : `1a30c227ea85ebf149442015dc056a99984a08b3`. Commit local `13e628fc95b091db4bbaa5f495bfed5d0356cba4`, arbre identique `69eb2dd303dd6b2b153418949bf049b1ffae1968`.

Local le 24 octobre 2026 : `npm run build` réussi ; **1205/1205 tests applicatifs**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas métier partagés Firestore, cinq UI et un HTTP/Auth ; syntaxe des intégrations vérifiée. Empreintes des quatre XLSX historiques inchangées. Firebase non exécuté localement (Java 17). Tests UI HTML/logique, sans recette visuelle navigateur.

**CI push et PR terminées avec succès ; journaux complets vérifiés le 24 octobre 2026.**

| Exécution | Job | Checkout testé | Applicatifs | Firebase Auth/Firestore/Storage | Verdict |
|---|---|---|---:|---:|---|
| [Push 40127917036](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40127917036) | [120973199676](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40127917036/job/120973199676) | `1fb8a7a47e4a185f3f50bde784fb58dd4995853c` | 1205 / 1205 | 961 / 961 | Succès |
| [PR 40127921600](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40127921600) | [120973216014](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40127921600/job/120973216014) | Fusion de test `487407719461443334ed8ba2fc2f14aab68a7ac7` | 1205 / 1205 | 961 / 961 | Succès |

Chaque exécution compile l’interface et termine avec zéro échec, annulation, test ignoré ou todo. Les logs confirment les 24 nouveaux cas M3 sur Firestore, les cinq UI et le parcours HTTP/Auth M3. Outils CI : Node 22.23.3, npm 10.9.9, Java Temurin 21.0.12+1. Sortie des émulateurs : code 0. Première tentative réussie pour chaque exécution.

La fusion de test a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat `1fb8a7a47e4a185f3f50bde784fb58dd4995853c`. Son arbre est identique au commit poussé et au checkout local : `69eb2dd303dd6b2b153418949bf049b1ffae1968`. Après les deux succès, main reste inchangé et la branche porte toujours ce candidat. PR ouverte en brouillon, non fusionnée ; aucun déploiement exécuté.
