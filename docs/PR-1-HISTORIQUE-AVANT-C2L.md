Les informations M6 et missions M7 peuvent désormais être préparées par fichier Excel : export privé, aperçu localisé des différences et références, puis confirmation d’un lot atomique dans le brouillon commun. Une mission peut référencer une information M6 absente ; l’import de celle-ci résout le lien sans copier son contenu ni modifier la mission.

## Candidat C2k
- Commit distant : `78699b2a483191fdd3243d5dc90ec69b02ae96ea` ; base C2j `1fb8a7a47e4a185f3f50bde784fb58dd4995853c`.
- Commit local : `e9752c79b95f58607477515c3eb211efb2680439` ; arbre identique `42f6046f2d5161f72c34478f918b97fee9aca51a`.
- 25 fichiers ; [contrat, limites et validation](https://github.com/gkerckhofs-a11y/gn-engine/blob/78699b2a483191fdd3243d5dc90ec69b02ae96ea/docs/SO-06-C2K-EXCEL-INFORMATIONS-MISSIONS.md) ; [historique et preuves C2j](https://github.com/gkerckhofs-a11y/gn-engine/blob/78699b2a483191fdd3243d5dc90ec69b02ae96ea/docs/PR-1-HISTORIQUE-AVANT-C2K.md).

## Comportement
- Contrat central v1 : feuilles Informations et Missions, validateurs natifs, révisions/archives/restauration, secrets et IDs préservés. Blanc conserve, effacement explicite, listes JSON entières ; retirer une condition QR exige identifiant et niveau.
- M6→M2 et M7→M1/M2/M6 : lectures explicites indépendantes, aucune requête étrangère sans droit. Révocation avant reçus, confirmations liées à l’auteur et aux droits, concurrence et interruption atomique.
- Localisation fichier/feuille/ligne/colonne dans l’aperçu et le contrôle commun. Empreinte interne 8 ; limites globales 1659 changements, 16 Mio/4 Mio inchangées.
- 100 lignes/1 Mio par fichier, 32 000 caractères par cellule sans troncature ; bornes natives inchangées. Excel M1/M2/M4 conservé, M3/M5 toujours indisponible.
- Aucune activation de savoir, QR, mission jouée, progression, annonce, récompense, stock, XP ou crédit. Publication indisponible.

## Vérification locale — 24 octobre 2026
`npm run build` réussi ; **1234/1234 tests applicatifs**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés mémoire/Firestore, cinq UI/XLSX, un HTTP/Auth. Syntaxe des intégrations vérifiée ; Firebase non exécuté localement (Java 17). SHA-256 des quatre Masters historiques inchangés.

## CI du candidat — vérifiée le 24 octobre 2026
Les **deux exécutions sont réussies à la première tentative**, build compris. Journaux complets relus : **1234/1234 tests applicatifs + 986/986 tests Firebase/HTTP par exécution**, zéro échec/annulé/ignoré/todo dans chaque suite, sortie émulateurs code 0.

| Événement | Exécution / job | SHA checkout constaté dans les journaux | Fin UTC | Résultat |
|---|---|---|---|---|
| push | [40133779918](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40133779918) / [120990861603](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40133779918/job/120990861603) | `78699b2a483191fdd3243d5dc90ec69b02ae96ea` | 2026-10-24T21:55:31Z | build + 1234 applicatifs + 986 Firebase réussis |
| pull_request | [40133783565](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40133783565) / [120990871689](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40133783565/job/120990871689) | `76f2e42aa40634d32312897c2b60956513539e4e` | 2026-10-24T21:48:54Z | build + 1234 applicatifs + 986 Firebase réussis |

Le SHA déclaré des deux runs est `78699b2a483191fdd3243d5dc90ec69b02ae96ea`. Le checkout PR est le commit de test de fusion `76f2e42aa40634d32312897c2b60956513539e4e`, avec parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat. Son arbre est identique au push et au commit local : `42f6046f2d5161f72c34478f918b97fee9aca51a`. Main, branche et PR revérifiés après terminaison.

Outils constatés dans chaque journal : **Node 22.23.3, npm 10.9.9, Java 21.0.12+1**. Les 24 nouveaux cas mémoire et 24 cas Firestore C2k, cinq UI/XLSX et un HTTP/Auth M6/M7 apparaissent bien dans chacun des deux jobs. Les étapes build/test/émulateurs et de nettoyage sont toutes réussies.

## Limites et suite
Sept ateliers toujours partiels ; `publicationAvailable=false`. MST-02/05/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Restent notamment Excel M3/M5, lieux/QR communs, sources réelles des récompenses, publication immuable et I3/I4/I5. Exports ciblés insuffisants pour sauvegarder droits, historiques et reçus ; C2j ne contrôle pas les nouvelles provenances XLSX M6/M7.

Tests UI sur HTML/formulaires/XLSX, aucune recette visuelle navigateur, Android/iOS, terrain, charge pilote ou restauration globale revendiquée. **PR brouillon ; aucun merge, déploiement, migration ou changement Firebase de production.**
