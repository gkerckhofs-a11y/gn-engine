C2o ajoute les groupes et factions au brouillon M2 : textes privés, appartenances proposées et permissions explicitement choisies. Les références vers les fiches sont contrôlées, y compris lorsque la fiche est préparée plus tard, archivée ou importée. Aucun groupe ni mandat de session n’est activé.

## Parcours et garanties

- Création, modification, archive/restauration motivées, lecture des textes et propositions, audit avant/après et reçus dans le service central existant.
- Réutilisation de `groupInput`, des douze permissions et du formulaire natif des membres. Définitions privées `DRAFT`, clés typées `group_{id}`, révision commune M2 ; aucun catalogue concurrent.
- Lecture/édition M2 requises, autorité et cycle avant reçus. Permissions indépendantes, aucun droit sélectionné implicitement à l’ajout ; champs d’instance, UID, politiques de caisse/roster et droits inconnus refusés.
- Liens différés vers les fiches avec diagnostics absente/archivée/invalide. Un groupe archivé est exclu du graphe actif. Groupe et personnage homonymes restent distincts.
- Excel M2 demeure ciblé sur les personnages : groupes conservés et liens recalculés après import. I3c accepte les groupes natifs sans les traiter comme des admissions ou mandats.
- Les instantanés C2n conservent ces définitions ; une capture réellement produite par l’arbre C2n précédent est relue sans réécriture du contenu ni recalcul du rapport.

## Candidat et validation locale

- Candidat distant : [`c599ddacfeb88ec83f285759f6e34e0471ffdb87`](https://github.com/gkerckhofs-a11y/gn-engine/commit/c599ddacfeb88ec83f285759f6e34e0471ffdb87).
- Commit local : `cec84c5475b440d3ad1219eecb539d2a76e19957` ; arbre identique `8262e35f888fd14ba42151b68c1a37f314bbae4d`.
- Base C2n : `fdf0c4e0056e83b365df09e147a9fa1192efff04` ; main inchangé `03eaace155b052d1b7d1960347746e9ee60ed514`.
- 25 octobre 2026 (Europe/Brussels) : **compilation et 1426/1426 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo. Node **24.22.1**, npm **11.9.0**.
- Ajouts : **23 cas métier partagés mémoire/Firestore, quatre UI et un HTTP/Auth**. Intégrations vérifiées syntaxiquement ; Firebase non exécuté localement, Java **17.0.20**.
- Couverture : droits/révocation, confidentialité, validation stricte, affiliations publiques, absence d’effets, références, réessais, concurrence, archives, interruption, limites/volume, imports homonymes, I3c avec 100 fiches + 50 groupes, captures et compatibilité C2n. UI : HTML/formulaires, échappement, payloads, droits et visibilité ; aucune recette visuelle.
- Quatre Masters historiques : SHA-256 inchangés ; `git diff --check` et liens documentaires vérifiés.

## CI du candidat

**Les deux CI ont réussi le 25 octobre 2026, tentative 1, sur le candidat `c599ddacfeb88ec83f285759f6e34e0471ffdb87`.** Journaux complets des deux jobs examinés, étapes toutes terminées avec succès.

| Événement | Exécution et job | Checkout réel relevé dans le journal | Fin du journal (UTC, 25/10/2026) |
|---|---|---|---|
| push | [40182971788](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40182971788) · [job 121137744112](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40182971788/job/121137744112) | `c599ddacfeb88ec83f285759f6e34e0471ffdb87` | 10:34:03 |
| pull_request | [40182975578](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40182975578) · [job 121137755205](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40182975578/job/121137755205) | `966b0fd4d4af496de6fafaf90f1457edf17062eb` | 10:31:21 |

Dans **chacune** des deux exécutions : compilation réussie, **1426/1426 tests applicatifs + 1153/1153 tests Firebase/HTTP réussis**, zéro échec, annulé, ignoré ou todo ; sortie des émulateurs avec code 0. Les nouveaux cas apparaissent tous dans chaque journal : **23 mémoire + 23 Firestore + quatre UI + un HTTP/Auth**.

Versions réellement relevées : **Node 22.23.3 / npm 10.9.9 / Java 21.0.12+1**. Workflow `.github/workflows/check.yml`, émulateurs `demo-gn-engine`, aucun déploiement.

Le checkout PR est la fusion virtuelle `966b0fd4d4af496de6fafaf90f1457edf17062eb`, dont les parents sont main `03eaace155b052d1b7d1960347746e9ee60ed514` et le candidat `c599ddacfeb88ec83f285759f6e34e0471ffdb87`. Son arbre `8262e35f888fd14ba42151b68c1a37f314bbae4d` est identique à ceux du candidat distant et du commit local. Branche, base, PR ouverte en brouillon et absence de fusion revérifiées après les CI ; espace de travail local propre. Preuves ajoutées à cette description sans commit supplémentaire.

## Compatibilité et limites

Budgets propres : **50 groupes archives comprises, 100 propositions de membres et 96 Kio par groupe** ; plafonds techniques, pas des quotas de participants ou capacités de groupes de jeu. Central : **1709 changements / 16 Mio sources / 4 Mio rapport**, empreinte **13**. I3c : lecture de **100 fiches + 50 groupes + catalogue**, budgets dossiers/verrous/octets inchangés, empreinte interne **2**. Captures : **6 Mio / 100 pages**, rapport historique conservé.

Les appartenances de session, équipe principale, capacité, responsable, succession et droits courants relèvent toujours de la régie I2b et de `groups.members`. Aucun compte, caisse, stock, notification, badge ou incarnation créé. L’import/export central des groupes reste à développer ; le JSON d’instantané n’est pas une sauvegarde complète ni un format de restauration.

Préserver définitions, historiques, droits, imports, reçus et captures/pages avec les dossiers et données de session cohérents. Retour C2n non équivalent : ancien lecteur/contrôle/import M2 non adapté aux groupes. Pas de conversion ou suppression implicite. Les groupes préparés n’autorisent jamais une publication ni une naissance.

C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts. Lieux/laboratoires, compétences/effets et version activable restent à raccorder. Aucun déploiement, fusion main, migration/adoption, règle/index/IAM ou marqueur de production modifié ; aucune recette mobile, terrain, charge ou restauration globale revendiquée.

[Guide C2o](https://github.com/gkerckhofs-a11y/gn-engine/blob/c599ddacfeb88ec83f285759f6e34e0471ffdb87/docs/SO-02-C2O-GROUPES-CENTRAUX.md) · [Preuves finales C2n archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/c599ddacfeb88ec83f285759f6e34e0471ffdb87/docs/PR-1-HISTORIQUE-AVANT-C2O.md). Matrice, registre des recettes, sauvegarde, validation, README et AGENTS actualisés. Workflow Node 22/Java 21, émulateurs `demo-gn-engine`, plafond 50 minutes ; aucun déploiement.
