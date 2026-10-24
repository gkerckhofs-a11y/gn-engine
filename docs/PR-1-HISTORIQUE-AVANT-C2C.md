# PR #1 — état C2b avant C2c

Description conservée le 24 octobre 2026 avant le lot C2c. Les résultats ci-dessous concernent uniquement le commit C2b cité.

Le propriétaire peut maintenant déléguer explicitement le contrôle préparatoire du Master central à un organisateur ayant la lecture des sept ateliers. Ce droit est distinct de l’édition, des rôles de session et de la publication. Retrait, désactivation et anciens réessais ne rétablissent aucun accès.

Le formulaire annonce l’accès aux contenus privés, exige un choix explicite et ne coche aucun atelier automatiquement. Le rapport indique la révision des droits utilisés ; son empreinte est liée à l’autorité courante. Les anciens grants sans champ restent non habilités. Une modification active d’un grant déjà habilité ne peut omettre le nouveau choix.

Les limites C2a restent visibles : préparation initiale seulement, contrôles partiels M1/M2/M4, autres validations incomplètes, `publicationAvailable=false`. Aucun gel, version READY, pointeur, naissance, stock ou crédit. Aucun accès aux candidatures ajouté.

### Sources et changements

- CDC V3.5 le plus récent retrouvé, daté du 23 octobre 2026, vérifié identique à la source du dépôt : SHA-256 `531ed5dba4c3c3970c5500db25cfc07df8dc434408a62b82783c0b2512be92d4`.
- [Contrat C2b, compatibilité et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/dcf9bebb31db2d76d4d70c342f21341cd5538b7e/docs/SO-02-C2B-DELEGATION-CONTROLE.md).
- [Preuves C2a conservées](https://github.com/gkerckhofs-a11y/gn-engine/blob/dcf9bebb31db2d76d4d70c342f21341cd5538b7e/docs/PR-1-HISTORIQUE-AVANT-C2B.md).
- Matrice, registre des 55 recettes, rapport de validation, consignes et reprise mis à jour. Aucun verdict complet de recette humaine requalifié.

### Validation locale — 24 octobre 2026

- Node 24.22.1 / npm 11.9.0 : **1002 tests applicatifs**, aucun échec/annulé/ignoré/todo ; build réussi.
- 15 nouveaux cas métier partagés avec Firestore, quatre UI, un parcours HTTP/Auth ajouté pour attribution et révocation.
- Syntaxe HTTP/Firestore/application, diff et SHA-256 des quatre Masters historiques vérifiés.
- Émulateurs non exécutés localement (Java 17 disponible). Aucun test humain Android/iOS, charge pilote ou restauration globale exécuté.

### CI du candidat

Commit distant **`dcf9bebb31db2d76d4d70c342f21341cd5538b7e`** ; local `fe4140a699484f71a5ec52a2bbc254d80e5d6570`, arbre identique `0ec4a725489a6714192063fececce41e87db5f41`.
**Deux CI terminées avec succès le 24 octobre 2026, première tentative.** Journaux et SHA de checkout vérifiés ; aucun échec, annulé, ignoré ou todo dans chaque suite.

| Déclencheur | Exécution et job | Compilation | Tests applicatifs | Tests Firebase |
|---|---|---|---:|---:|
| Push | [40087456503](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40087456503) · [job 120853198706](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40087456503/job/120853198706) | Réussie | 1002/1002 | 790/790 |
| PR | [40087460591](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40087460591) · [job 120853210104](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40087460591/job/120853210104) | Réussie | 1002/1002 | 790/790 |

Les 15 nouveaux cas C2b partagés Firestore et le nouveau parcours HTTP/Auth sont présents et réussis dans **les deux journaux**. Runtimes constatés dans les deux jobs : Node **22.23.3**, npm **10.9.9**, Temurin **21.0.12+1**.

Le push extrait `dcf9bebb31db2d76d4d70c342f21341cd5538b7e`. La PR extrait le commit de fusion de vérification `0bfef7e988f1fa368d0a3c4b2638bd6153474103`, parents `03eaace155b052d1b7d1960347746e9ee60ed514` et `dcf9bebb31db2d76d4d70c342f21341cd5538b7e`, arbre identique `0ec4a725489a6714192063fececce41e87db5f41`. Cette vérification n’est pas une fusion de la PR dans main.

### Compatibilité et suite

Les anciens clients gardent les délégations d’atelier ; le contrôle exige le nouveau flag. Une désactivation l’efface. Sauvegarder droits/révisions/historiques/reçus ensemble ; un ancien binaire C2a retire la capacité déléguée et peut effacer le flag lors d’une édition. Le rapport n’est jamais une autorisation réutilisable.

Les quatre Masters, anciens contrats, dépendances, workflows, règles/index Firebase restent inchangés. Avertissements connus de la base CI : neuf paquets Firebase réclament Node >=24.12.0 ; actions v4 signalées pour leur runtime Node20. Non corrigés par ce lot.

Suite : validateurs/profil canoniques, ateliers restants et publication immuable atomique, puis I3/I4/I5. PR conservée en brouillon ; aucun merge, déploiement ou migration. Main revérifié inchangé à 11:15 UTC le 24 octobre 2026 : `03eaace155b052d1b7d1960347746e9ee60ed514`.

