# PR #1 avant C2a

Description vérifiée le 24 octobre 2026, head C1e `3ae52a724ac3dba610d27d1f700ae0e498a70cb9`. Source : https://github.com/gkerckhofs-a11y/gn-engine/pull/1.

## Master central SPACE OUTLAWS : fiches narratives M2 dans le brouillon commun

M2 permet de préparer des personnages fictifs avec identité/nature, biographie, consignes, secrets, objectifs à étapes et relations orientées. Les cibles encore absentes peuvent être créées ensuite dans le même brouillon ; les diagnostics se recalculent sans réécrire la fiche source. Modifier, archiver et restaurer sont des opérations auditées, protégées par les révisions et les reçus.

Les fiches restent privées et DRAFT, sans compte joueur, candidature convertie, personnage de session, badge, compétence ou dotation. Le catalogue narratif I1 reste la même source. Le candidat conserve les acquis L1/SO, C1a/I1/I2/I2b, les modèles M1, recettes M4 et imports/exports centraux C1d.

### Lot C1e

- Réutilisation du nettoyeur natif `characterInput`, extrait sans changement de sémantique des anciens éditeurs. Identifiants et `contentRevision` natifs conservés ; pas de catalogue parallèle.
- Fiches/relations/objectifs/étapes éditables, alias et contact libre possibles, cibles absentes/archivées signalées. Aucun message, lien inverse ou récompense automatique.
- Délégation M2 explicite avec lecture/édition, indépendante des rôles et admissions de session. Droits et cycle revérifiés avant les reçus. Historique filtré par type/atelier et liste blanche de champs, sans politique d'admission ni quotas.
- Révision unique du brouillon M1/M2/M4 ; concurrence avec M1 et les espèces M2, réessais et interruption transactionnelle couverts.
- 100 fiches maximum, archives comprises ; 96 Kio de contenu par fiche ; limites narratives natives 60 objectifs/60 relations/40 étapes. Ces bornes sont techniques, sans certification de charge.
- Publication, données civiles structurées, ressources, profils/classes/Force et médias injectés refusés. Quatre Masters historiques inchangés. XLSX M2 et gabarits V0.1 non raccordés.

### Candidat et contrôles locaux

- Commit distant : [`3ae52a724ac3dba610d27d1f700ae0e498a70cb9`](https://github.com/gkerckhofs-a11y/gn-engine/commit/3ae52a724ac3dba610d27d1f700ae0e498a70cb9), parent C1d `6df260644d49dab4ccee47a703fb8e4a5608ffc7`.
- Checkout testé : `2b2723538e4db73288e218c5ae527ab8891303de`. Arbre local/distant identique : `27db00570c410d423c8a85c2ff41dadb0b4a4d24`.
- Le 24 octobre 2026, Node 24.22.1 / npm 11.9.0 : **957 tests applicatifs réussis**, 0 échec/annulation/ignoré/todo ; build réussi ; diff-check et empreintes des quatre Masters conformes.
- 20 nouveaux cas métier partagés mémoire/Firestore, quatre tests UI et un parcours HTTP/Auth. Les anciens tests où M2 représentait un atelier non éditable utilisent désormais M3 ; les nouveaux tests vérifient explicitement les grants M2.
- **CI du commit exact réussie** sur push et PR : résultats définitifs ci-dessous. Les émulateurs n'ont pas été exécutés localement (Java 17).

### CI définitive du 24 octobre 2026

Les deux runs sont terminés avec conclusion `success` sur le head `3ae52a724ac3dba610d27d1f700ae0e498a70cb9`. Chacun a réussi la compilation, **957 tests applicatifs** et **754 tests Firebase**, avec **0 échec, 0 annulation, 0 test ignoré et 0 todo** dans les deux suites. Les journaux confirment les 20 nouveaux cas « Personnages centraux C1e sur Firestore » et le parcours HTTP/Auth M2.

| Événement | Run et job | Checkout réellement testé | Résultat |
|---|---|---|---|
| Push | [run 40081440414](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40081440414) · [job 120835665655](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40081440414/job/120835665655) | `3ae52a724ac3dba610d27d1f700ae0e498a70cb9` | Build + 957 applicatifs + 754 Firebase réussis |
| PR | [run 40081443076](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40081443076) · [job 120835673254](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40081443076/job/120835673254) | Merge virtuel `b1f9ea333183d5bc0bd90619b03560572298164c` | Build + 957 applicatifs + 754 Firebase réussis |

Le merge virtuel de la PR a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` et `3ae52a724ac3dba610d27d1f700ae0e498a70cb9` ; son arbre `27db00570c410d423c8a85c2ff41dadb0b4a4d24` est identique au candidat local et distant. Aucun merge effectif n'a été réalisé.

Versions constatées dans les deux journaux : **Node 22.23.3, npm 10.9.9, Temurin 21.0.12+1**. Les dépendances verrouillées et le workflow sont inchangés dans C1e. `npm ci` émet des avertissements `EBADENGINE` pour des paquets Firebase demandant Node >=24.12.0, ainsi qu'un avertissement sur les actions v4 ciblant Node 20 et exécutées par GitHub sous Node 24. Ces avertissements restent à traiter ; la réussite des tests ne certifie pas cette compatibilité. Les contrôles locaux ont aussi réussi sous Node 24.22.1.

Les preuves définitives sont consignées ici sans créer un nouveau commit auquel seraient attribués les résultats de l'ancien.

### Documentation et suites

- [Contrat et preuves C1e](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-01-C1E-PERSONNAGES.md), [ordre de développement](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-00-V35-INSCRIPTIONS.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/MATRICE-SPACE-OUTLAWS-V3.md), [rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-VALIDATION.md), [recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-RECETTES-V35.md).
- [Description et preuves C1d conservées](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/PR-1-HISTORIQUE-AVANT-C1E.md). Les deux CI C1d ont réussi avec 933 applicatifs et 733 Firebase chacune ; ces résultats ne sont pas attribués à C1e.
- Restent notamment profils canoniques/factions/dotations préparées M2, médias/XLSX M2, contrôle/version/publication globale C2, conversion des propositions I3, naissance protégée I4, relève I5 et autres ateliers.
- Aucun navigateur réel, Android/iOS, charge ou exercice complet de restauration validé pour C1e. Les 55 recettes complètes restent non validées de bout en bout.
- PR conservée en brouillon, main `03eaace155b052d1b7d1960347746e9ee60ed514` inchangé. Aucun merge, déploiement, migration, IAM/DNS/secret ni modification de `.github/deploy-request.json`. Une CI verte n'autorise aucune mise en production.
