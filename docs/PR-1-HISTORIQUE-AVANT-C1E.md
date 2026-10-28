# Description de PR #1 avant C1e

Conservée le 24 octobre 2026. Tête C1d : `6df260644d49dab4ccee47a703fb8e4a5608ffc7`.

## Master central SPACE OUTLAWS : brouillon commun et import/export Excel M1/M4

Un MJ peut préparer les modèles M1 et recettes M4 dans le même brouillon que le catalogue narratif M2, par édition web ou fichier Excel. Le fichier central porte la campagne, le profil, la base vide, le brouillon, ses révisions, l'atelier et un ID de lot. L'import affiche les différences et erreurs avant une confirmation avec motif ; le lot est accepté atomiquement ou refusé. Un fichier périmé n'écrase pas une édition récente ; un lot déjà appliqué retrouve son résultat sans créer de nouvelle révision ni réappliquer des valeurs anciennes.

Le candidat conserve les acquis historiques L1/SO, les préparations C1a, candidatures I1, décisions/quotas I2 et régie des groupes I2b. Il ajoute C1b/C1c/C1d pour l'écriture centrale privée. Publication globale C2, autres ateliers, fabrication, personnages M2/I3, naissance/I4, relève/I5 et validation humaine restent incomplets. Aucun stock, crédit, dose, PA, XP, QR actif ou instance n'est créé par ces imports.

### Lot C1d

- Export XLSX d'une sélection M1 ou M4, ou gabarit vide ; 100 lignes métier / 1 Mio maximum, sans troncature. Réutilisation des validations natives et du lecteur ZIP/XML sécurisé.
- Blanc conserve, `!EFFACER` explicite, texte commençant par ! échappé, absence de ligne sans suppression. Archivage/restauration explicites ; export archivé sans restauration accidentelle. Formules et macros refusées ; textes =/+/-/@ exportés littéralement.
- Droits de campagne et cycle revalidés avant reçus de commande/lot ; lecture M1 distincte de M4. Sans lecture M1, aucune consultation ni révélation de ses modèles. Références manquantes conservables uniquement dans le brouillon, avec diagnostics.
- Historique avant/après, auteur, date, motif, requestId, schéma et provenance fichier/feuille/ligne/lot. Les exports ciblés ne constituent pas une sauvegarde globale.
- Contrats CAMPAGNE/SESSION et quatre fichiers historiques inchangés ; gabarits documentaires V0.1 non convertis implicitement.

### Candidat et contrôle local

- Commit distant : [`6df260644d49dab4ccee47a703fb8e4a5608ffc7`](https://github.com/gkerckhofs-a11y/gn-engine/commit/6df260644d49dab4ccee47a703fb8e4a5608ffc7), parent C1c `b7217acf843b66619637dbbe3063a1a8f4aaeb4a`.
- Checkout testé : `bb9afb1e46c8d309d5f6d7788c70065071fdaf56`. Arbre local/distant identique : `2296394bd6bfcd49a743b9cdfd428e23634dec53`.
- Le 24 octobre 2026, Node 24.22.1 / npm 11.9.0 : **933 tests applicatifs réussis**, aucun échec/annulé/ignoré/todo ; build réussi ; diff-check et quatre empreintes Masters conformes.
- 21 nouveaux cas métier partagés mémoire/Firestore, trois rendus UI et un cas sécurité XLSX ; un parcours HTTP/Auth ajouté avec import >128 Ko.
- Émulateurs non exécutés localement (Java 17) ; les preuves Firebase proviennent des deux CI ci-dessous.

### CI définitive du 24 octobre 2026

Les deux exécutions du workflow `check.yml` sont terminées avec succès. Journaux complets relus : **933 tests applicatifs + 733 tests Firebase** par exécution, build réussi, **0 échec, 0 annulation, 0 test ignoré, 0 todo**. Les 21 nouveaux cas métier C1d sont présents dans les logs Firestore, ainsi que le parcours HTTP/Auth d'import >128 Ko.

| Déclenchement | Run / job | Checkout réellement testé | Résultat |
|---|---|---|---|
| Push | [40077778620](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40077778620) / [120824777783](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40077778620/job/120824777783) | `6df260644d49dab4ccee47a703fb8e4a5608ffc7` | Succès ; terminé à 08:46:17 UTC |
| PR | [40077782580](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40077782580) / [120824789230](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40077782580/job/120824789230) | Merge virtuel `8acf76070cffa97256d7ed650babbe891b7fb3a0` | Succès ; terminé à 08:45:02 UTC |

Le merge virtuel a pour parents main `03eaace155b052d1b7d1960347746e9ee60ed514` et le candidat `6df260644d49dab4ccee47a703fb8e4a5608ffc7`. Son arbre `2296394bd6bfcd49a743b9cdfd428e23634dec53` est identique à celui du candidat distant et du checkout local testé. Les logs confirment Node **22.23.3**, npm **10.9.9** et Temurin **21.0.12+1** dans les deux jobs.

Ce bilan complète les documents figés dans le commit, rédigés avant la fin de CI. Aucun commit supplémentaire n'est créé pour lui attribuer les résultats d'un autre SHA. Le lot C1d est validé automatiquement ; la recette humaine complète et la mise en production ne le sont pas.


### Documentation et limites

- [Contrat et preuves C1d](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-01-C1D-EXCEL-CENTRAL.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/MATRICE-SPACE-OUTLAWS-V3.md), [rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-VALIDATION.md), [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-RECETTES-V35.md), [sauvegarde/déploiement](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-SAUVEGARDE-DEPLOIEMENT.md).
- [Description précédente et preuves C1c conservées](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/PR-1-HISTORIQUE-AVANT-C1D.md). C1c : deux CI réussies, chacune 908 tests applicatifs et 711 Firebase ; ces résultats ne sont pas attribués à C1d.
- Recette navigateur réel, Android/iOS, multicomptes, charge et restauration complète non exécutées pour C1d. Aucun des 55 verdicts complets n'est requalifié en réussite.
- PR conservée en brouillon. Aucun merge, déploiement, migration, IAM/DNS/secret ni modification de `.github/deploy-request.json`. Main reste `03eaace155b052d1b7d1960347746e9ee60ed514`. La CI verte n'autorise aucune mise en production.
