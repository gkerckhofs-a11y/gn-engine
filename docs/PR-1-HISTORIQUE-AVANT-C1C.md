## État courant : C1b — brouillon central, droits de campagne et modèles M1

Une nouvelle préparation SPACE OUTLAWS permet d’éditer ses modèles de biens M1 dans le même brouillon central que le catalogue narratif M2 des inscriptions. Les délégations de campagne autorisent explicitement les ateliers lisibles et l’édition M1 ; les rôles de session et dossiers de candidature restent séparés.

Commit : [6c0027e5c34eaa688aae453f98b3285a3d7c4a6c](https://github.com/gkerckhofs-a11y/gn-engine/commit/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c), parent I2b `ea7f47e45ce3f14722b273301bb8e2cab2eedf43`, arbre `0f444b9e3e1f4d8168bd70bf7bfc842f1bd49ef6`, identique au checkout local testé. Version 0.37.0 ; main `03eaace155b052d1b7d1960347746e9ee60ed514` inchangé. PR en brouillon, non fusionnée.

### C1b livré sur branche

- Sept entrées d’atelier dans les six domaines existants ; M1 éditable et espèces narratives M2 consultables. Les contenus centraux M3–M7 restent à raccorder.
- Modèles natifs de biens, IDs stables, état DRAFT, archive/restauration auditée. Aucune création de stock, crédits, PA, XP, dose ou QR.
- Un seul `masterDrafts/initial` et une révision commune M1/M2 ; la source narrative I1 est conservée, sans catalogue d’admission dupliqué.
- Droits par campagne/atelier, propriétaire seul gestionnaire, refus des rôles de session sans délégation centrale, projections filtrées et tableau de bord dédié.
- Autorité et contexte revérifiés avant les reçus, révisions et empreintes de commandes, double clic/reprise, conflits explicites sans mélange des changements.
- Historique avant/après, motif, auteur et provenance WEB ; pas d’effacement ni de réécriture de session.
- Campagnes historiques, cycles publiés/rebasés et dotations refusés dans ce parcours. Masters/importeurs historiques et gardes C1a conservés.

[Guide, matrice, contrat et reprise C1b](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/SO-01-C1B-BROUILLON.md) · [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/SO-VALIDATION.md) · [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/SO-RECETTES-V35.md).

### Validation locale exécutée

**890 tests applicatifs réussis**, zéro échec/annulé/ignoré/TODO, 14 113,666229 ms ; **build réussi**, Node 24.19.0. Journaux : [npm test](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/verification/so-c1b-npm-test.log), [build](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/verification/so-c1b-build.log).

17 nouveaux cas métier partagés avec Firestore, quatre rendus UI, un nouveau HTTP/Auth raccordé aux émulateurs. Syntaxe HTTP vérifiée localement ; émulateurs non exécutés localement (Java 17).

Cas ciblés : lecture sans effet ; définitions natives sans ressources ; M1→M2 et M2→M1 ; concurrence M1/M2 ; rôles et cloisonnement ; lecture seule ; révocation avant reçu ; délégations concurrentes ; édition sans mélange ; double clic/réponse perdue ; interruption avant commit ; archive/restauration ; champs étrangers refusés ; cycle publié/rebasé refusé ; limite de 250 modèles incluant les archives. UI : six domaines, échappement, formulaires/révisions et absence de délégation de publication. Ces rendus ne sont pas une recette navigateur.

### CI du commit courant

**Deux exécutions terminées avec succès le 24 octobre 2026**, journaux complets récupérés et vérifiés. Chaque run exécute build, npm test et Firebase Auth/Firestore/Storage Emulator sur `demo-gn-engine`.

| Exécution | Checkout réellement vérifié | Applicatifs | Firebase | Build / verdict |
|---|---|---:|---:|---|
| Push [40043661037](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40043661037), [job 120720287425](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40043661037/job/120720287425) | `6c0027e5c34eaa688aae453f98b3285a3d7c4a6c` | 890 réussis | 696 réussis | Succès |
| PR [40043665062](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40043665062), [job 120720295470](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40043665062/job/120720295470) | `03b1d275ed43a0feb2d129169ec6c7824cbca94a` | 890 réussis | 696 réussis | Succès |

**Zéro échec, annulation, test ignoré ou TODO dans les quatre suites.** Les 17 nouveaux cas Firestore C1b figurent en `ok 33–49`, le nouveau HTTP/Auth en `ok 672`, dans chacun des deux runs. Les quatre rendus UI sont également présents et réussis dans npm test.

- Outils vérifiés dans les deux journaux : **Node 22.23.3, npm 10.9.9, Temurin 21.0.12+1**.
- Job push : **00:10:47 → 00:34:13 UTC**, le 24 octobre. Durées des suites : 20 229,430011 ms applicatifs ; 1 351 531,888097 ms Firebase.
- Job PR : **00:10:48 → 00:33:17 UTC**. Durées : 19 687,607537 ms applicatifs ; 1 291 099,669566 ms Firebase.
- Fusion virtuelle de test : arbre `0f444b9e3e1f4d8168bd70bf7bfc842f1bd49ef6`, identique au commit poussé et au checkout local. Parents main `03eaace155b052d1b7d1960347746e9ee60ed514` et commit C1b vérifiés. Aucune fusion de la PR.
- Les deux runs utilisent uniquement `.github/workflows/check.yml`. Commande et message d’isolation du projet de démonstration vérifiés. Aucun workflow de déploiement déclenché ; main inchangé et PR toujours draft/non fusionnée après les tests.
- Les journaux contiennent des avertissements non bloquants de dépendances `EBADENGINE` et de runtime des actions GitHub. Ils ne sont pas corrigés par C1b ; aucune dépendance ni aucun workflow modifié.

Ces preuves complètent les journaux locaux du commit. Conformément à AGENTS, la CI définitive est consignée dans la PR après terminaison, sans nouveau commit auquel attribuer le résultat du précédent.

### Limites et ordre suivant

- C1b est une tranche de C1, pas le Master central complet : import/export central, projection des autres types, références différées, contrôle global et publication atomique C2 restent à développer.
- M2 ne contient pas encore de définition de personnage : I3 approbation → M2, puis I4 naissance/kit/200 Cr protégés/PA/QR, puis I5 décès/succession et révocation des mandats.
- Aucun test crucial M1/M4/M5 activé ni publication M3 isolée, aucune recette complète parmi les 55, aucun essai Android/iOS, charge, coupure physique ou restauration d’infrastructure exécuté.
- Limites C1b : base vide C1a, 250 modèles M1 (archives comprises), 50 délégations ; aucun média ni effet nouveau autorisé dans ce contrat.
- SO-GAP-12/13 partiels seulement ; produit complet toujours non conforme V3.5/V0.7.
- Sauvegarder header/brouillon/changements/historiques/`campaignStaff`/audit/reçus avec admissions et préparation. XLSX historique insuffisant ; ne pas revenir à un binaire ignorant ces états. [Procédure de sauvegarde/déploiement à faire valider](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/SO-SAUVEGARDE-DEPLOIEMENT.md), jamais lancée.
- Aucune adoption/migration historique avant validation explicite du plan.

### Historique préservé

I2b revérifié : push [40006390251](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006390251), PR [40006400292](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006400292), chacun build + **869 applicatifs et 678 Firebase**, succès sans échec/annulation/ignoré/TODO. [Description I2b et preuves complètes](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/PR-1-HISTORIQUE-AVANT-C1B.md) ; [historique I2](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/PR-1-HISTORIQUE-AVANT-I2B.md) ; [L1→I1](https://github.com/gkerckhofs-a11y/gn-engine/blob/6c0027e5c34eaa688aae453f98b3285a3d7c4a6c/docs/PR-1-HISTORIQUE-AVANT-I2.md).

**Aucun déploiement, workflow de déploiement, merge, migration, accès/donnée de production ni changement Firebase/IAM/DNS/secrets. `.github/deploy-request.json` et les quatre Masters restent inchangés.**
