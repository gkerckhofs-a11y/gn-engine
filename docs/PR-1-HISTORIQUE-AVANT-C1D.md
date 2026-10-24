# Description de PR #1 avant C1d

Conservée le 24 octobre 2026. Tête C1c : `b7217acf843b66619637dbbe3063a1a8f4aaeb4a`.

## État courant : C1c — recettes dans le brouillon central

Une nouvelle préparation SPACE OUTLAWS peut maintenant préparer ses formules M4 dans le même brouillon que les modèles M1 et le catalogue narratif M2. Un ingrédient peut être référencé avant sa création : le rapport indique le lien manquant, puis se met à jour quand M1 est complété, sans recopier le catalogue ni créer une dose.

Commit : [b7217acf843b66619637dbbe3063a1a8f4aaeb4a](https://github.com/gkerckhofs-a11y/gn-engine/commit/b7217acf843b66619637dbbe3063a1a8f4aaeb4a), parent C1b `6c0027e5c34eaa688aae453f98b3285a3d7c4a6c`, arbre `5279be8129772bf4f559091a941927398f451807`, identique au checkout local testé. Version 0.37.0. PR en brouillon, non fusionnée ; main reste `03eaace155b052d1b7d1960347746e9ee60ed514`.

### C1c livré sur branche

- Création, modification, archive/restauration de formules M4 au format natif `recipeInput`, toujours DRAFT.
- Un seul brouillon/révision M1/M2/M4 ; IDs stables, provenance WEB, historique avant/après, motif et auteur.
- Sélecteur M1 et diagnostics de références absentes, archivées ou incompatibles. Les liens compétence/effet/lieu/connaissance restent explicitement en attente de raccordement.
- Délégation M4 indépendante de M1 et des rôles de session. Sans lecture M1, aucun nom, état ni existence de modèle révélé ; aucune requête à son catalogue.
- Autorité courante avant reçu, réessais idempotents, conflits explicites entre ateliers/éditeurs et reprise après interruption.
- Aucun stock, dose, crédit, PA, XP, QR actif ou personnage créé. Aucun import central, publication globale ni fabrication activé.
- Contrats historiques, quatre Masters, gardes C1a/C1b et inscriptions conservés.

[Guide et contrat C1c](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/SO-01-C1C-RECETTES.md) · [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/SO-VALIDATION.md) · [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/SO-RECETTES-V35.md).

### Validation locale exécutée

**908 tests applicatifs réussis**, zéro échec/annulé/ignoré/TODO, 7 889,853021 ms ; **build réussi**, Node 24.22.1, npm 11.9.0. [Journal npm test](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/verification/so-c1c-npm-test.log) · [Journal build](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/verification/so-c1c-build.log).

14 nouveaux cas métier partagés avec Firestore, quatre rendus UI et un HTTP/Auth raccordé aux émulateurs. Syntaxe HTTP vérifiée localement ; émulateurs non exécutés localement (Java 17). Tests de rendu uniquement, pas une recette navigateur ou mobile.

### CI du commit courant

**Deux exécutions terminées avec succès le 24 octobre 2026**, journaux complets récupérés et vérifiés. Chaque run exécute build, npm test et Firebase Auth/Firestore/Storage Emulator sur `demo-gn-engine`.

| Exécution | Checkout réellement testé | Applicatifs | Firebase | Verdict |
|---|---|---:|---:|---|
| Push [40074594801](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40074594801), [job 120815147589](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40074594801/job/120815147589) | `b7217acf843b66619637dbbe3063a1a8f4aaeb4a` | 908 réussis | 711 réussis | Build et suite réussis |
| PR [40074597559](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40074597559), [job 120815156759](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40074597559/job/120815156759) | `9d7d4e9b4ec1b143b66d3cd2abebc3e3fd773f85` | 908 réussis | 711 réussis | Build et suite réussis |

**Zéro échec, annulation, test ignoré ou TODO dans les quatre suites.** Les 14 cas Firestore C1c sont présents et réussis en `ok 50–63`, le nouveau HTTP/Auth en `ok 686`, dans les deux runs. Les quatre rendus UI C1c sont également exécutés et réussis.

- Outils vérifiés : **Node 22.23.3, npm 10.9.9, Temurin 21.0.12+1**.
- Push : tests applicatifs 20 019,436545 ms ; Firebase 1 256 190,478417 ms, fin de suite le 24 octobre à 07:55:10 UTC.
- PR : tests applicatifs 11 240,2032 ms ; Firebase 968 989,631478 ms, fin de suite à 07:50:01 UTC.
- Fusion virtuelle de test : arbre `5279be8129772bf4f559091a941927398f451807`, identique au commit poussé et au checkout local. Parents main `03eaace155b052d1b7d1960347746e9ee60ed514` et commit C1c vérifiés. Aucune fusion de la PR.
- Workflow `.github/workflows/check.yml` uniquement ; isolation du projet de démonstration confirmée dans les journaux. Aucun workflow de déploiement déclenché.
- Avertissements non bloquants de dépendances `EBADENGINE` et de runtime des actions GitHub conservés ; aucune dépendance ni aucun workflow modifié par C1c.
- Après validation : main inchangé, PR toujours en brouillon/non fusionnée, tête distante C1c vérifiée.

Ces preuves complètent les journaux locaux du commit, sans ajouter un nouveau commit auquel attribuer les résultats du précédent.

### Limites et suite

- C1 reste partiel : autres types/adaptateurs, import/export central et contrôle global/publication atomique C2 restent à développer.
- M2 personnage I3, naissance I4 (kit/200 Cr protégés/PA/QR), décès/succession I5 restent absents.
- Les recettes M4 ne sont pas fabricables : effets fermés, TOXI, laboratoires et déblocages restent nécessaires. Aucune démonstration M1/M4/M5 activée revendiquée.
- Limites : base vide C1a, 250 modèles M1, 250 formules M4 (archives comprises), 20 composants par formule, 50 délégations.
- Aucun des 55 parcours complets, Android/iOS, charge ou restauration d'infrastructure certifié. Produit complet toujours non conforme V3.5/V0.7.
- Conserver brouillon/changements/historiques/délégations/reçus avec admissions et préparation. XLSX historique seul insuffisant ; rollback vers C1b ignorant M4 non sûr. [Procédure de mise en service à faire valider](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/SO-SAUVEGARDE-DEPLOIEMENT.md), non exécutée.
- Aucune adoption/migration historique avant validation explicite du plan.

### Historique conservé

[C1b et ses preuves intégrales](https://github.com/gkerckhofs-a11y/gn-engine/blob/b7217acf843b66619637dbbe3063a1a8f4aaeb4a/docs/PR-1-HISTORIQUE-AVANT-C1C.md) : 890 applicatifs et 696 Firebase chacun, build réussi, runs 40043661037 et 40043665062 revérifiés avec succès. Les historiques I2b, I2 et L1→I1 sont conservés et liés depuis ce document.

**Aucun déploiement, workflow de déploiement, merge, migration, accès/donnée de production ni changement Firebase/IAM/DNS/secrets. `.github/deploy-request.json`, les workflows et les quatre Masters restent inchangés.**
