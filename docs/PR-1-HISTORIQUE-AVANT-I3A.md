# PR #1 — preuves C2m archivées avant I3a

Description finale de la PR #1, conservée avant la tranche I3a. Les résultats ci-dessous concernent exclusivement le candidat C2m cité.

L’atelier M3 peut désormais importer/exporter ses modèles de vaisseaux, ports et routes dans un même fichier. Les trois feuilles passent par un aperçu et une confirmation, puis une transaction unique dans le brouillon commun. Une route peut référencer un port créé dans le même lot ; une ligne invalide bloque toutes les écritures.

## Candidat C2m

- Commit distant : `6052b7ab38c3bd56b61beb803144080951ea0434`, parent C2l `944f0569b1f7815eb98ab193ed966dcc2b446b75`.
- Commit local testé : `15f4fa9d8d0a206403e2f0596875974e9b8ae4ae`. Arbre identique distant/local : `0df9b3c162b616f8a7e42152e323dda4739ed5cf`.
- Branche `work/l1-modular-workshop` ; `main` inchangé à `03eaace155b052d1b7d1960347746e9ee60ed514`. PR en brouillon, aucune fusion.
- [Contrat et validation C2m](https://github.com/gkerckhofs-a11y/gn-engine/blob/6052b7ab38c3bd56b61beb803144080951ea0434/docs/SO-04-C2M-EXCEL-SPATIOPORT.md) ; [preuves C2l archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/6052b7ab38c3bd56b61beb803144080951ea0434/docs/PR-1-HISTORIQUE-AVANT-C2M.md).

## Comportement

`Modeles`, `Ports` et `Routes` requis même vides ; 100 lignes cumulées / 1 Mio. Sélection typée `shipModel_{id}` / `port_{id}` / `route_{id}`, IDs métier nus dans les cellules, homonymes distincts. Limites natives 100 modèles / 100 ports / 200 routes, archives comprises.

Validation native V0.7 : profils, distances, risques et codes explicites ; caractéristiques et durées dérivées, champs libres et instances refusés. Blanc conserve, effacement facultatif explicite, archives/restauration sans cascade. Liens et doublons de codes calculés sur les trois feuilles finales ; codes privés absents des diagnostics. Aucune lecture étrangère ou admission.

Droits et cycle avant les deux reçus, confirmations liées aux révisions, réessais sans doublon, concurrence et interruption atomique. Provenance M3 contrôlée par type/feuille, colonnes localisées. Empreinte interne 10 ; budgets globaux 1659 changements / 16 Mio / 4 Mio inchangés.

## Validation locale — 25 octobre 2026 (Europe/Brussels)

`npm run build` réussi et **1292/1292 tests applicatifs**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés mémoire/Firestore, cinq UI/XLSX et un HTTP/Auth ; syntaxe des intégrations vérifiée. Deux assertions historiques d’indisponibilité M3 adaptées, puis suite complète verte. Les quatre XLSX historiques sont inchangés.

Firebase non exécuté localement (Java 17.0.20). **Les deux CI du candidat sont terminées avec succès au premier essai**, compilation et nettoyage compris, le 25 octobre 2026.

| Déclenchement | Exécution / job | SHA réellement extrait | Résultats | Fin UTC |
|---|---|---|---|---|
| push | [40162676521](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40162676521) / [121077328082](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40162676521/job/121077328082) | `6052b7ab38c3bd56b61beb803144080951ea0434` | 1292/1292 applicatifs + 1036/1036 Firebase/HTTP | 2026-10-25T05:11:07Z |
| pull_request | [40162679336](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40162679336) / [121077336106](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40162679336/job/121077336106) | `e1b0ab87f55913627611683f8421bb05215ba03e` (merge de test) | 1292/1292 applicatifs + 1036/1036 Firebase/HTTP | 2026-10-25T05:14:30Z |

Journaux complets des deux jobs lus et contrôlés : **zéro échec, annulé, ignoré ou todo** dans chaque suite ; émulateurs terminés avec code 0. Node **22.23.3**, npm **10.9.9**, Java **21.0.12+1**. Chaque exécution contient les **24 cas C2m mémoire, 24 cas C2m Firestore, cinq cas UI/XLSX et le nouveau parcours HTTP/Auth M3**.

Le head déclaré de la CI PR est bien `6052b7ab38c3bd56b61beb803144080951ea0434`. Le merge de test a pour parents `main` (`03eaace155b052d1b7d1960347746e9ee60ed514`) et ce candidat ; son arbre `0df9b3c162b616f8a7e42152e323dda4739ed5cf` est identique au contenu local et poussé. HEAD distant, main et statut draft/non fusionné revérifiés après les CI. Ces preuves sont ajoutées dans la PR sans nouveau commit.

## Limites et compatibilité

Les sept ateliers ont désormais un import/export de leurs types raccordés ; cela ne certifie pas les gabarits documentaires complets. Sept ateliers PARTIAL, `publicationAvailable=false`. Instances, stocks, lieux/QR, rencontres/événements, contrôles complets, publication immuable et I3/I4/I5 restent ouverts. Aucun vaisseau, voyage, carburant, tirage, compte ou ressource activé.

Conserver brouillon, provenances, droits, historiques et reçus ensemble. C2l ne contrôle pas les nouvelles provenances XLSX M3 et n’est pas un retour fonctionnel équivalent. Les exports ciblés ne constituent pas une sauvegarde complète.

MST-02/03/07/08/09 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Pas de recette visuelle navigateur/mobile, terrain, charge pilote ou restauration globale. Aucun déploiement, migration, modification de droits/règles/index Firebase, ni déclenchement de workflow de publication.

