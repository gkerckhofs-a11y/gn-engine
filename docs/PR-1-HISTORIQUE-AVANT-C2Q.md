C2p ajoute les lieux natifs au brouillon M6 et raccorde les références des ports M3, recettes M4 et boutiques M5. Une fouille ou une installation peut être préparée avec ses profils et récompenses proposés ; les liens absents, archivés ou invalides sont signalés sans créer d’état de jeu.

## Parcours et garanties

- Réutilisation de `fieldTargetInput` / `fieldProfile`, des champs du formulaire terrain et du service central : aucun catalogue parallèle. Création, lecture, modification, archive/restauration motivées, révision commune, audit avant/après et reçus atomiques.
- Lecture/édition M6 indépendantes des rôles de session. Autorité et cycle avant reçu historique ; aucun écrasement d’une retouche ou d’une archive par réessai.
- Champs imbriqués stricts. Publication, état courant, compte, code public et habilitation injectés refusés. Dépendance de fouille vers une installation ; consommables et quantités individuelles contrôlés selon le contrat natif.
- Références M1 sous lecture M1, informations et dépendances M6 locales. M3/M4/M5 consultent les lieux uniquement avec lecture M6 ; sans elle, aucune requête étrangère ni révélation d’existence/archive.
- Suggestions minimales : ID, titre, nature, archive, révision et source. Aucun profil, récompense, texte de réussite ou note privée de M6 renvoyé aux autres ateliers.
- Excel M6 reste limité aux informations, préserve les lieux homonymes et recalcule leurs liens sans leur attribuer une fausse ligne Excel. Les imports M3/M4/M5 localisent les références vers M6.
- Les captures C2n conservent profils et récompenses proposés ; les captures antérieures restent relues avec leur rapport historique, sans recalcul.

## Candidat et validation locale

- Candidat distant : [`204d4e53c837222df201b5ea9bb97af05ec83b89`](https://github.com/gkerckhofs-a11y/gn-engine/commit/204d4e53c837222df201b5ea9bb97af05ec83b89).
- Commit local : `f7d17c65ee39cbcdf70f5143679bffc46334b182` ; arbre identique `68d19e1db9135cd65d23ac8e9276a74597aec118`.
- Base C2o : `c599ddacfeb88ec83f285759f6e34e0471ffdb87` ; main inchangé `03eaace155b052d1b7d1960347746e9ee60ed514`.
- **25 octobre 2026 (Europe/Brussels) : compilation et 1456/1456 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo. Node **24.22.1**, npm **11.9.0**.
- Ajouts : **25 cas métier partagés mémoire/Firestore, cinq UI et un HTTP/Auth**. Intégrations vérifiées syntaxiquement ; Firebase non exécuté localement, Java **17.0.20**.
- Couverture : formes natives/champs injectés, droits/révocation, confidentialité des requêtes, références différées/archives/corruptions, trois ateliers consommateurs, imports homonymes/localisés, concurrence M1/M2/M6, interruption, bornes Unicode, absence d’effets et captures. UI : HTML/formulaires, payloads natifs, échappement, lecture seule et commandes ; aucune recette visuelle.
- Anciennes assertions adaptées aux liens M6 désormais contrôlés et à la nouvelle borne ; une attente erronée de refus des admissions corrigée pour un compte explicitement MJ de session. Aucun contrôle métier assoupli.
- Les quatre Masters historiques ont les mêmes SHA-256 ; liens documentaires et `git diff --check` vérifiés.

## CI du candidat

**25 octobre 2026 : les deux exécutions complètes sont réussies sur ce candidat, tentative 1.** Journaux intégraux lus et contrôlés ; toutes les étapes sont terminées avec succès.

| Événement | Exécution / job | Checkout réel | Fin du journal (UTC) | Tests applicatifs | Tests Firebase/HTTP |
| --- | --- | --- | --- | --- | --- |
| Push | [40189590975](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40189590975) / [121157547052](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40189590975/job/121157547052) | `204d4e53c837222df201b5ea9bb97af05ec83b89` | 2026-10-25 12:09:03.2903439Z | 1456/1456 | 1179/1179 |
| PR | [40189594014](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40189594014) / [121157555906](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40189594014/job/121157555906) | `daba85350a6235f5caf419456ce23dc77a011174` | 2026-10-25 12:02:16.4245022Z | 1456/1456 | 1179/1179 |

- Chaque suite et chaque exécution : **zéro échec, annulé, ignoré ou todo**, aucune ligne de test en échec ; émulateurs terminés avec le code 0.
- Dans chacun des deux journaux : **25 nouveaux cas mémoire + 25 Firestore + 5 UI + 1 HTTP/Auth C2p**, tous exécutés avec succès.
- Versions réellement constatées dans les deux journaux : **Node 22.23.3, npm 10.9.9, Java 21.0.12+1**. Workflow `.github/workflows/check.yml`, projet d’émulateurs `demo-gn-engine`.
- Fusion virtuelle PR `daba85350a6235f5caf419456ce23dc77a011174` : parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et `204d4e53c837222df201b5ea9bb97af05ec83b89` (candidat). Arbre `68d19e1db9135cd65d23ac8e9276a74597aec118`, identique au candidat distant et au commit local.
- Contrôle final des références : main inchangé, tête distante et tête PR sur ce candidat ; PR **ouverte, en brouillon, non fusionnée**. Branche locale `work/c2p-central-field-targets` propre. Preuves inscrites dans cette description, sans commit supplémentaire.

## Compatibilité et limites

**100 lieux archives comprises, 96 Kio par définition**, bornes natives de 20 récompenses, 20 bonus et 20 durées par profil. Global : **1809 changements / 16 Mio sources / 4 Mio rapport**, empreinte interne **14**. I3c inchangé ; captures **6 Mio / 100 pages**, rapport historique conservé. Refus sans troncature.

Un lieu résolu ne certifie ni laboratoire autorisé ni QR de fabrication. Les diagnostics `LABORATORY_AUTHORIZATION_PENDING`, `FIELD_RULES_PENDING` et `FIELD_REWARD_SOURCE_PENDING` maintiennent les contrôles encore manquants. Paramètres et quantités sont préparatoires : aucun `fieldState`, stock réel, réserve, découverte, objet, crédit, PA, action, QR ou droit de laboratoire créé.

Excel terrain central reste à développer. Préserver lieux, références, droits, révisions, historiques, imports, reçus et captures/pages avec l’ensemble cohérent de campagne/session. Le JSON d’instantané n’est pas une sauvegarde complète ni un format de restauration. Retour C2o non équivalent : ancien contrôleur ignorant les lieux centraux et ancien import M6 non adapté aux homonymes ; aucune suppression/conversion implicite.

Conformité canonique des compétences/effets/actions, sources réelles des récompenses, habilitations/QR, publication/version activable, naissance et relève restent à livrer. C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts. Aucun déploiement, fusion main, migration/adoption, règle/index/IAM ou marqueur de production modifié ; aucune recette mobile, terrain, charge ou restauration globale revendiquée.

[Guide C2p](https://github.com/gkerckhofs-a11y/gn-engine/blob/204d4e53c837222df201b5ea9bb97af05ec83b89/docs/SO-02-C2P-LIEUX-CENTRAUX.md) · [Preuves finales C2o archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/204d4e53c837222df201b5ea9bb97af05ec83b89/docs/PR-1-HISTORIQUE-AVANT-C2P.md). Matrice, registre des recettes, sauvegarde, validation, README et AGENTS actualisés. Workflow Node 22/Java 21, émulateurs `demo-gn-engine`, plafond 50 minutes ; aucun déploiement.
