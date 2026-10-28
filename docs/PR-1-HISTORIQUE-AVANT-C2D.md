# PR #1 — état C2c avant le lot C2d

Archive du 24 octobre 2026, avant remplacement du titre et de la description. PR ouverte en brouillon, non fusionnée. Titre : SPACE OUTLAWS — profils joueurs initiaux préparés dans M2 (C2c)

M2 permet désormais de préparer un **profil joueur initial V0.7** dans une fiche narrative : classe, référence à l’espèce du catalogue partagé et une initiation autorisée d’une autre classe. L’aperçu dérive les trois principales à N2 ou fixes (COM-01/02, ROG-01) et l’initiation N1 ; aucun niveau ou pouvoir libre n’est accepté.

Les références d’espèce peuvent être préparées avant leur cible et sont contrôlées avec la nature dans les diagnostics M2 et le rapport commun. Une ancienne édition conserve le plan omis ; null le retire explicitement avec audit. Révisions, concurrence, réessais, archive/restauration et révocation restent ceux du brouillon central.

Ce plan reste privé et sans effet en jeu : aucun profil de compétences actif, compte, admission, quota, kit, crédit, XP, PA, PV ou QR créé. Les profils Force/PNJ, la progression, les dotations, I3/I4/I5 et la publication globale restent à développer. `publicationAvailable=false`.

### Références et suivi

- Organisateur, [CDC V3.5 du 23 octobre 2026](https://github.com/gkerckhofs-a11y/gn-engine/blob/1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95/docs/source/SO_CDC_V35.md), §§3.6, 4.7–4.9 et annexe A ; [règles V0.7](https://github.com/gkerckhofs-a11y/gn-engine/blob/1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95/docs/source/SO_Regles_V07.txt), chapitre 3 et fiches des classes.
- [Contrat C2c, sources, compatibilité et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95/docs/SO-02-C2C-PROFILS-INITIAUX.md).
- [État et preuves C2b archivés](https://github.com/gkerckhofs-a11y/gn-engine/blob/1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95/docs/PR-1-HISTORIQUE-AVANT-C2C.md).
- Matrice, registre des 55 recettes, suivi V3.5, rapport de validation, consignes et reprise mis à jour. REC-SO-01 / INS-06 : preuves partielles seulement ; aucun verdict complet requalifié.

### Validation locale — 24 octobre 2026

- Node **24.22.1** / npm **11.9.0** : **1022 tests applicatifs réussis**, aucun échec/annulé/ignoré/todo ; build réussi.
- 15 nouveaux cas métier partagés avec Firestore, un test exhaustif des **56 combinaisons** (8 classes × 7 initiations), quatre UI et un parcours HTTP/Auth ajouté.
- Les huit classes et les deux natures, traits fixes, refus Force/compétences non initiables/injections, référence absente/incohérente, ancien client, audit, réessai, concurrence et absence d’effets sont couverts.
- Syntaxe application/HTTP/Firestore, diff et empreintes des quatre Masters vérifiés.
- Émulateurs non exécutés localement (Java 17). Aucun test manuel mobile, charge pilote ou restauration globale exécuté.

### CI du candidat

Commit distant **`1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95`** ; local `ff9c036142af796f430b8eeff12713e1df7bd68b`, arbre identique `69adc2edcc18e0767e1393f9ccad1b6a5e42e733`.

**Deux CI terminées avec succès le 24 octobre 2026, première tentative.** Les journaux et SHA extraits sont vérifiés ; chaque suite compte zéro échec, annulé, ignoré et todo.

| Déclencheur | Exécution et job | Compilation | Tests applicatifs | Tests Firebase |
|---|---|---|---:|---:|
| Push | [40090745083](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40090745083) · [job 120862711396](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40090745083/job/120862711396) | Réussie | 1022/1022 | 806/806 |
| PR | [40090747073](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40090747073) · [job 120862717323](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40090747073/job/120862717323) | Réussie | 1022/1022 | 806/806 |

Les **15 nouveaux cas C2c partagés Firestore** et le **parcours HTTP/Auth de plan initial M2** sont présents et réussis dans les deux journaux. Runtimes constatés dans chaque job : Node **22.23.3**, npm **10.9.9**, Temurin **21.0.12+1**.

Checkout push : `1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95`. Checkout PR : commit de fusion de vérification `1cf0d5b8b39c2ffc5570cd30e63be972fe21de6a`, parents main `03eaace155b052d1b7d1960347746e9ee60ed514` et candidat `1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95`. Les deux arbres sont identiques : `69adc2edcc18e0767e1393f9ccad1b6a5e42e733`. La PR demeure non fusionnée.

### Compatibilité et suite

Les anciennes fiches narratives ne reçoivent aucun plan implicite. Le flag d’espèce `available` reste un choix d’ouverture aux candidatures, pas un archivage de définition M2. Le plan ne remplace ni une admission approuvée ni une naissance : I3/I4 devront encore revalider les droits et quotas.

Préserver le plan avec changements/historiques/révisions/reçus. Le lecteur C2b ne sait pas valider ces nouvelles données ; aucun retour fonctionnel équivalent ni restauration complète n’est revendiqué. Les exports M1/M4 et Masters historiques ne sauvegardent pas cette extension M2.

Les quatre Masters, contrats historiques, dépendances, workflows et règles/index Firebase restent inchangés. Avertissements de compatibilité Node des paquets Firebase et actions v4 documentés depuis C2b, non corrigés par ce lot.

Suite : effets/profils exécutables, dotations M1 et autres ateliers, validations complètes, publication immuable atomique, I3/I4/I5. PR en brouillon ; aucun merge, déploiement ou migration. Main revérifié inchangé le 24 octobre 2026 à 14:06, heure de Bruxelles : `03eaace155b052d1b7d1960347746e9ee60ed514`.

