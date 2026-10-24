## Boutiques et offres M5 dans la préparation commune

M5 pouvait être consulté mais ne permettait pas encore de préparer une boutique. Cette tranche C2g ajoute création, modification, archivage et restauration des boutiques et offres dans le même brouillon que M1/M2/M4. Une offre désigne le modèle M1 également utilisé par une recette M4 ; son vendeur reste une référence M2. Les références peuvent précéder les définitions, puis se résoudre sans copie ni réécriture de l’offre.

- Révisions communes et de contenu, motif, historique, reçu idempotent et autorité courante avant réessai. Concurrence interateliers et restauration sans cascade.
- Édition M5 explicitement déléguée. Les suggestions objets/vendeurs exigent respectivement lecture M1/M2 ; M5 seul ne révèle ni existence, nom ou état de ces définitions.
- Contrôle central : nouveaux formats et liens typés, archives/corruptions signalées, prix proposés sans tarif par défaut. Limites techniques 50 boutiques / 250 offres, 909 changements globaux ; budgets 16 Mio / 4 Mio conservés.
- Aucun stock, crédit, compte, QR, droit de vente, incarnation ou publication créé. M5 reste partiel. Excel M5, lieux, statut/habilitations du vendeur, caisse/stock, tarifs de jeu et transactions restent à raccorder.
- Préservation des quatre Masters historiques, sources, contrats CAMPAGNE/SESSION, workflows, dépendances et règles/index Firebase. Aucun merge, déploiement ni migration.

## Périmètre cumulé et documentation

La PR conserve les travaux antérieurs L1 et SPACE OUTLAWS, jusqu’à C2f. Le détail et les preuves de la description précédente sont [archivés dans le dépôt](https://github.com/gkerckhofs-a11y/gn-engine/blob/fad9bc4ed8be49087b19ef3a7a5de066b0161537/docs/PR-1-HISTORIQUE-AVANT-C2G.md).

- [Contrat et limites C2g](https://github.com/gkerckhofs-a11y/gn-engine/blob/fad9bc4ed8be49087b19ef3a7a5de066b0161537/docs/SO-05-C2G-BOUTIQUES-BROUILLON.md)
- [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/fad9bc4ed8be49087b19ef3a7a5de066b0161537/docs/SO-VALIDATION.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/fad9bc4ed8be49087b19ef3a7a5de066b0161537/docs/MATRICE-SPACE-OUTLAWS-V3.md), [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/fad9bc4ed8be49087b19ef3a7a5de066b0161537/docs/SO-RECETTES-V35.md)
- [Sauvegarde/reprise à préparer](https://github.com/gkerckhofs-a11y/gn-engine/blob/fad9bc4ed8be49087b19ef3a7a5de066b0161537/docs/SO-SAUVEGARDE-DEPLOIEMENT.md) : préserver les nouveaux types et grants M5 avec l’ensemble cohérent du brouillon. C2f n’est pas un retour fonctionnel équivalent.

MST-03/06/08 : preuves préparatoires partielles uniquement. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés. Publication globale, I3/I4/I5, recette Android/iOS, charge pilote et restauration complète non livrées.

## Validation du candidat C2g

Candidat distant : [`fad9bc4ed8be49087b19ef3a7a5de066b0161537`](https://github.com/gkerckhofs-a11y/gn-engine/commit/fad9bc4ed8be49087b19ef3a7a5de066b0161537). Parent C2f : `4ed82c3f56b3c9969f6ea176edcab19ed00758cc`. Commit local `6ad36f3c52fd1991e36575cca9cadd7651e24a5c`, arbre identique `d295f9ddcc96690247187ab34651d8dc5758bf40`.

Local le 24 octobre 2026 : `npm run build` réussi ; **1 115/1 115 tests applicatifs**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas métier partagés Firestore, cinq UI et un HTTP/Auth ; syntaxe des intégrations vérifiée. Empreintes des quatre XLSX historiques inchangées. Firebase non lancé localement (Java 17). Les tests UI portent sur les formulaires HTML, sans recette visuelle de navigateur.

**CI push et PR terminées avec succès ; journaux complets vérifiés le 24 octobre 2026.**

| Exécution | Job | Checkout testé | Applicatifs | Firebase Auth/Firestore/Storage | Verdict |
|---|---|---|---:|---:|---|
| [Push 40113302332](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40113302332) | [120929325680](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40113302332/job/120929325680) | `fad9bc4ed8be49087b19ef3a7a5de066b0161537` | 1 115 / 1 115 | 884 / 884 | Succès |
| [PR 40113308233](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40113308233) | [120929342699](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40113308233/job/120929342699) | Fusion de test `a1233b7a663a38e9b34766ddce861202fbefacf6` | 1 115 / 1 115 | 884 / 884 | Succès |

Chaque exécution compile l’interface et termine avec zéro échec, annulation, test ignoré ou todo. Les logs confirment les 24 nouveaux cas métier M5 sur Firestore, les cinq UI et le parcours HTTP/Auth M5. Outils CI : Node 22.23.3, npm 10.9.9, Java Temurin 21.0.12+1. Sortie des émulateurs : code 0.

La fusion de test a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat `fad9bc4ed8be49087b19ef3a7a5de066b0161537`. Son arbre est identique à celui du commit poussé et du checkout local : `d295f9ddcc96690247187ab34651d8dc5758bf40`. Après les deux succès, main reste inchangé et la branche porte toujours ce candidat. PR ouverte en brouillon, non fusionnée ; aucun déploiement exécuté.
