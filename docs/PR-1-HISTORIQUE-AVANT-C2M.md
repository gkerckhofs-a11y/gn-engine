M5 permet désormais de préparer les boutiques et leurs offres dans un même fichier Excel : export privé, aperçu des différences et références, puis confirmation d’un lot atomique. Les liens sont calculés sur les deux feuilles finales, et une boutique et une offre homonymes restent deux définitions distinctes.

## Candidat C2l
- Commit distant : `944f0569b1f7815eb98ab193ed966dcc2b446b75` ; base C2k `78699b2a483191fdd3243d5dc90ec69b02ae96ea`.
- Commit local : `8069d69a93acbb01330d419b9818b609f75059e7` ; arbre identique `f8cd7bf4d81096f112293fcb9d91a3dd27ac088a`.
- 23 fichiers ; [contrat et validation C2l](https://github.com/gkerckhofs-a11y/gn-engine/blob/944f0569b1f7815eb98ab193ed966dcc2b446b75/docs/SO-05-C2L-EXCEL-BOUTIQUES-OFFRES.md) ; [preuves C2k archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/944f0569b1f7815eb98ab193ed966dcc2b446b75/docs/PR-1-HISTORIQUE-AVANT-C2L.md).

## Comportement
- Deux feuilles Boutiques/Offres requises, même vides ; même lot, transaction et révision centrale. Une offre invalide bloque aussi les boutiques du fichier.
- Sélection typée des homonymes, IDs métier nus conservés dans les cellules jusqu’à 128 caractères. Validateurs natifs, prix entiers strictement positifs sans défaut, blanc conserve, effacement explicite, archives/restauration sans cascade.
- Lecture M1 et lecture M2 indépendantes avant toute requête étrangère. Révocation avant reçus de commande/lot, confirmations liées à auteur/contenu/droits/révisions, concurrence et interruption atomique.
- Diagnostics fichier/feuille/ligne/colonne par type, nouvelles provenances M5 au contrôle commun ; empreinte interne 9.
- 100 lignes au total/1 Mio ; 50 boutiques et 250 offres archives comprises. Bornes globales 1659 changements/16 Mio/4 Mio et formats M1/M2/M4/M6/M7 conservés.
- Aucun stock, compte, QR, mandat de vendeur, transaction, récompense ou publication activé. Excel M3 reste indisponible.

## Vérification locale — 25 octobre 2026, Europe/Brussels
`npm run build` réussi ; **1263/1263 tests applicatifs**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés mémoire/Firestore, cinq UI/XLSX, un HTTP/Auth. Syntaxe des intégrations vérifiée ; Firebase non exécuté localement (Java 17.0.20). SHA-256 des quatre Masters historiques inchangés.

## CI du candidat — vérifiée le 25 octobre 2026, Europe/Brussels
Les **deux exécutions sont réussies à la première tentative**, build compris. Journaux complets relus : **1263/1263 tests applicatifs + 1011/1011 tests Firebase/HTTP par exécution**, zéro échec/annulé/ignoré/todo dans chaque suite ; émulateurs terminés avec le code 0.

| Événement | Exécution / job | SHA checkout constaté dans les journaux | Fin UTC | Résultat |
|---|---|---|---|---|
| push | [40138794040](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40138794040) / [121005920763](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40138794040/job/121005920763) | `944f0569b1f7815eb98ab193ed966dcc2b446b75` | 2026-10-24T22:59:38Z | build + 1263 applicatifs + 1011 Firebase réussis |
| pull_request | [40138797976](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40138797976) / [121005933330](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40138797976/job/121005933330) | `7e5bda0c8019213cbcb3ceaf94723055afadd73e` | 2026-10-24T22:57:06Z | build + 1263 applicatifs + 1011 Firebase réussis |

Le SHA déclaré des deux runs est `944f0569b1f7815eb98ab193ed966dcc2b446b75`. Le checkout PR est le commit de test de fusion `7e5bda0c8019213cbcb3ceaf94723055afadd73e`, avec parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat. Son arbre est identique au push et au commit local : `f8cd7bf4d81096f112293fcb9d91a3dd27ac088a`. Main, branche et PR revérifiés après terminaison.

Outils constatés dans chaque journal : **Node 22.23.3, npm 10.9.9, Java 21.0.12+1**. Les 24 nouveaux cas mémoire et 24 cas Firestore C2l, cinq UI/XLSX et un HTTP/Auth M5 apparaissent dans chacun des deux jobs. Toutes les étapes build/test/émulateurs et de nettoyage sont réussies.

## Limites et suite
Sept ateliers toujours partiels et `publicationAvailable=false`. MST-02/03/06/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Restent Excel M3, propositions de stock, lieux/QR communs, caisses et habilitations, prix de jeu, publication immuable et I3/I4/I5. Conserver brouillon, droits, historiques et reçus ensemble ; les exports ciblés ne constituent pas une sauvegarde globale et C2k ne contrôle pas les nouvelles provenances M5.

Tests UI sur HTML/formulaires/XLSX ; aucune recette visuelle navigateur, Android/iOS, terrain, charge pilote ou restauration globale revendiquée. **PR brouillon, aucun merge, déploiement, migration ou changement Firebase de production.**

