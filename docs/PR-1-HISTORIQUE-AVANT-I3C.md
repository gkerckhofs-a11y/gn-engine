# PR #1 — preuve I3b archivée avant I3c

Description récupérée depuis GitHub le 25 octobre 2026 avant modification. Le candidat I3b et les deux CI ont été revérifiés ; aucune preuve n’est attribuée au candidat I3c.

+Un dossier approuvé ou sa fiche M2 peuvent changer après la première préparation I3a. **Comparer avec le dossier** présente maintenant les écarts et permet un rapprochement explicite : identité, nature et plan alignés sur l’admission approuvée, biographie conservée par défaut ou remplacée sur choix explicite, autres textes/secrets/objectifs/relations conservés.

**Candidat I3b : `8dcd82bf423e1d913d338b2a8c969b3799dddf4f`** — [guide, contrat et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/8dcd82bf423e1d913d338b2a8c969b3799dddf4f/docs/SO-01-I3B-RAPPROCHEMENT-M2.md). Arbre `06542495ea794cd4419302ef08194c5b1c6a471a`, identique au commit local `92bd84185dcc0cacfa78f3743b9b3c9e4502a969`.

- Double autorité MJ/M2 et cycle actuels ; contrôles d’approbation, consentement, choix, identité et compteurs. Retrait, archive ou incohérence bloquent une nouvelle application.
- Modification native et historiques atomiques ; fiche inchangée = relecture privée seule, sans révision centrale supplémentaire.
- Réessais historiques sans écraser les retouches ou réactiver une place. Les marqueurs privés ne sont ni exportés dans M2 ni exposés au joueur.
- Nouvelle provenance RECONCILED_SNAPSHOT, empreinte globale 12, budgets inchangés. Publication/naissance doivent encore vérifier les liens courants dans leur propre transaction ; I3 complet/INS-06 non livrés.
- Quatre Masters historiques inchangés ; aucun merge, déploiement, migration, changement Firebase/IAM/règles/index ou marqueur de déploiement.

**Validation locale — 25 octobre 2026 (Europe/Brussels)** : build et **1347/1347 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0 ; syntaxe des intégrations vérifiée. 23 nouveaux cas métier partagés mémoire/Firestore, cinq UI et un HTTP/Auth. Firebase non exécuté localement (Java 17.0.20).

Le plafond du workflow de vérification passe de **40 à 50 minutes** : le push I3a avait dépassé 38 minutes. Commandes de tests, versions d’outils, déclencheurs et frontière de production inchangés.

**CI finale — 25 octobre 2026, horodatages UTC : les deux exécutions ont réussi au premier essai.** Journaux complets et toutes les étapes vérifiés ; build, **1347/1347 tests applicatifs et 1083/1083 Firebase/HTTP dans chaque CI**, zéro échec/annulé/ignoré/todo. Node **22.23.3**, npm **10.9.9**, Java **21.0.12+1**.

| Contrôle | Exécution / job | Checkout réellement testé | Fin UTC |
|---|---|---|---|
| Push | [40170996987](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40170996987) / [121101613157](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40170996987/job/121101613157) | `8dcd82bf423e1d913d338b2a8c969b3799dddf4f` | 2026-10-25T07:29:03Z |
| Pull request | [40171000352](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40171000352) / [121101623127](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40171000352/job/121101623127) | `f89b843ab00b1006e6705552e0f532866c86d9e8` | 2026-10-25T07:29:28Z |

Les journaux contiennent chacun les **23 nouveaux cas métier mémoire, 23 équivalents Firestore, cinq UI et un HTTP/Auth**, tous réussis ; sortie émulateur de code 0. Le commit de test PR a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et `8dcd82bf423e1d913d338b2a8c969b3799dddf4f` ; son arbre `06542495ea794cd4419302ef08194c5b1c6a471a` est identique à celui du candidat et du checkout local. Main, branche et PR ont été revérifiés après la CI.

Tests UI limités à HTML/formulaires/payloads : aucune recette visuelle navigateur, Android/iOS, terrain, charge pilote ou restauration globale revendiquée. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés. PR conservée en brouillon, non fusionnée ; cette preuve ne crée aucun nouveau commit.

Base I3a `e97102c92aaef221c57003109112955368b869a9` : deux CI réussies, **1319 applicatifs + 1059 Firebase/HTTP chacune**. [Preuves archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/8dcd82bf423e1d913d338b2a8c969b3799dddf4f/docs/PR-1-HISTORIQUE-AVANT-I3B.md).
