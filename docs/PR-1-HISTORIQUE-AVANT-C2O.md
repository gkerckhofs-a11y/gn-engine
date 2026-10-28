C2n permet au propriétaire de conserver une révision précise du brouillon central et son rapport, puis de les relire après des éditions. Les sept ateliers, archives et catalogue narratif M2 sont copiés ensemble. Le brouillon reste modifiable ; les diagnostics restent visibles. Cette capture privée ne publie aucune version et n’active aucune session.

## Parcours et garanties

- Aperçu, confirmation motivée, capture atomique, liste et relecture historique ; téléchargement JSON après nouvelle vérification serveur des droits et de l’intégrité.
- Capture réservée au propriétaire. Consultation sous droits C2b courants ; le contrôleur délégué reste en lecture seule, sans accès implicite aux admissions.
- Manifeste et pages privés dans `masterDrafts/initial/checks`, avec audit et reçu. Réutilisation du helper de pagination de campagne, comportement historique inchangé.
- Réessais sans doublon ni écrasement, conflit si la préparation a changé avant une nouvelle capture, autorité/cycle vérifiés avant reçus. Pages manquantes ou altérées refusées, sans reconstruction depuis le brouillon courant.
- 6 Mio d’entrées et 100 pages au maximum, refus intégral au-delà. Source native invalide refusée ; références non résolues conservées dans le rapport.

## Candidat et validation locale

- Candidat distant : [`fdf0c4e0056e83b365df09e147a9fa1192efff04`](https://github.com/gkerckhofs-a11y/gn-engine/commit/fdf0c4e0056e83b365df09e147a9fa1192efff04).
- Commit local : `03a65573a91935a4af9832566106cae41990eb9b` ; arbre identique `23ca7a34ad9a5616e83622dfa3df629714a813c9`.
- Base de travail I3c : `c4a5d105077c0dde53848aeb1e55effa87e38a5c` ; main inchangé `03eaace155b052d1b7d1960347746e9ee60ed514`.
- 25 octobre 2026 (Europe/Brussels) : compilation et **1399/1399 tests applicatifs locaux réussis**, aucun échec/annulé/ignoré/todo. Node **24.22.1**, npm **11.9.0**.
- Ajouts : **21 cas métier partagés mémoire/Firestore, quatre UI et un HTTP/Auth**. Intégrations vérifiées syntaxiquement ; Firebase non exécuté localement, Java **17.0.20**. UI : HTML/formulaires, contenu échappé, payloads et réponses tardives, sans recette visuelle.
- Quatre Masters historiques : SHA-256 inchangés. `git diff --check` et liens documentaires vérifiés.

## CI du candidat

**Les deux CI du candidat sont réussies, tentative 1**, avec logs intégraux vérifiés le 25 octobre 2026. Chaque exécution compile l’interface, réussit **1399/1399 tests applicatifs et 1129/1129 tests Firebase/HTTP**, zéro échec/annulé/ignoré/todo dans les deux suites. Toutes les étapes sont terminées avec succès et la commande émulateurs sort avec le code 0.

| Exécution | Job | Checkout réel dans les logs | Fin UTC |
|---|---|---|---|
| [Push 40178093482](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40178093482) | [121123056033](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40178093482/job/121123056033) | `fdf0c4e0056e83b365df09e147a9fa1192efff04` | 2026-10-25T09:18:40Z |
| [PR 40178095107](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40178095107) | [121123061067](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40178095107/job/121123061067) | `19f6eea3be4c4a0dbeec9979b67db60485d209fc` | 2026-10-25T09:18:22Z |

Les deux journaux contiennent les **21 nouveaux cas mémoire + 21 Firestore + quatre UI + un HTTP/Auth** de C2n. Environnement réellement observé : Node **22.23.3**, npm **10.9.9**, Java **21.0.12+1** ; workflow `.github/workflows/check.yml`, projet d’émulation `demo-gn-engine`.

La fusion virtuelle PR `19f6eea3be4c4a0dbeec9979b67db60485d209fc` a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` puis `fdf0c4e0056e83b365df09e147a9fa1192efff04`, et pour arbre `23ca7a34ad9a5616e83622dfa3df629714a813c9`, identique au candidat local/distant. Main et branche revérifiés inchangés, PR ouverte en brouillon et non fusionnée. Aucun commit supplémentaire de preuve : ces résultats concernent exactement le candidat ci-dessus.

## Compatibilité et limites

Empreinte du contrôle central **12**, bornes **1659 changements / 16 Mio sources / 4 Mio rapport**, couverture partielle et `publicationAvailable=false` conservées. Les empreintes ne sont pas des signatures contre un administrateur capable de réécrire données et empreintes. Le JSON contient récits/secrets et identifiants techniques ; les dossiers privés I3, politiques, consentements et données de jeu ne sont pas copiés. Ce fichier ne remplace pas une sauvegarde complète, aucun import/restauration n’est exposé.

Préserver manifestes/pages/audits/reçus avec l’ensemble cohérent du brouillon, droits et données d’admission. Retour I3c sans conversion des définitions, mais sans lecteur des captures. Le rapport conservé ne dispense jamais des validations et autorités courantes d’une future publication.

C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts. Aucune recette mobile, charge, terrain ou restauration globale revendiquée. Aucun déploiement, fusion main, migration/adoption, règle/index/IAM ou marqueur de production modifié.

[Guide C2n](https://github.com/gkerckhofs-a11y/gn-engine/blob/fdf0c4e0056e83b365df09e147a9fa1192efff04/docs/SO-02-C2N-INSTANTANES-CENTRAUX.md) · [Preuves finales I3c archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/fdf0c4e0056e83b365df09e147a9fa1192efff04/docs/PR-1-HISTORIQUE-AVANT-C2N.md). Les suivis, la matrice, le registre des recettes, la sauvegarde, README et AGENTS sont actualisés. La CI vérifie Node 22/Java 21 et les émulateurs `demo-gn-engine` ; elle ne déploie pas.
