# PR #1 — preuves I3a archivées avant I3b

Description finale de la PR #1 conservée avant la tranche I3b. Ces résultats concernent exclusivement le candidat I3a cité.

Une candidature approuvée peut maintenant produire, après aperçu et confirmation motivée, une fiche privée du brouillon M2. Le lien reste dans le dossier d’inscription ; seule la fiction est copiée. Deux autorisations indépendantes sont requises : MJ de session et lecture/édition M2. Les réessais retrouvent la même fiche sans écraser les éditions ou archives ultérieures.

**Candidat I3a : `e97102c92aaef221c57003109112955368b869a9`** — [guide et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/e97102c92aaef221c57003109112955368b869a9/docs/SO-01-I3A-ADMISSION-VERS-M2.md). Arbre `cf9760df0756d6fdd148f8cf96314335f6aceb47`, identique au commit local `550e10d4da55a98e72cbe1a122cb53001a9c4d34`.

- Transaction unique : définition native, révision commune, lien privé, historiques, audit et reçu ; aucune place supplémentaire ni ressource de jeu.
- Consentement, choix et confirmation I2 revérifiés ; auteur, droits et révisions liés à l’aperçu.
- Retrait/changement de classe après préparation conserve le travail M2 et signale le rapprochement requis.
- Publication, rapprochement courant admission/définition, naissance I4, relève I5 et recette humaine restent à développer. I3 complet/INS-06 ne sont pas livrés. Sept ateliers PARTIAL, publication indisponible ; empreinte de contrôle 11, budgets inchangés.
- Quatre Masters historiques inchangés. Aucun merge, déploiement, migration, changement Firebase/IAM/règles/index ou marqueur de déploiement.

**Validation locale — 25 octobre 2026 (Europe/Brussels)** : build réussi, **1319/1319 tests applicatifs**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 22 nouveaux cas métier partagés mémoire/Firestore, cinq UI et un HTTP/Auth ; syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17.0.20).

**CI finale — 25 octobre 2026, horodatages UTC : deux exécutions réussies au premier essai.** Journaux complets et toutes les étapes vérifiés ; build, **1319/1319 tests applicatifs et 1059/1059 Firebase/HTTP dans chaque CI**, zéro échec/annulé/ignoré/todo. Node **22.23.3**, npm **10.9.9**, Java **21.0.12+1**.

| Contrôle | Exécution / job | Checkout réellement testé | Fin UTC |
|---|---|---|---|
| Push | [40166524985](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40166524985) / [121088600613](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40166524985/job/121088600613) | `e97102c92aaef221c57003109112955368b869a9` | 2026-10-25T06:21:16Z |
| Pull request | [40166528966](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40166528966) / [121088613482](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40166528966/job/121088613482) | `fab172796c6a125bbbc140ae969d48298aa0a06b` | 2026-10-25T06:16:10Z |

Les journaux contiennent chacun les **22 nouveaux tests métier mémoire, 22 équivalents Firestore, cinq UI et un HTTP/Auth**, tous réussis. Les deux sorties émulateur sont de code 0. Le commit de test PR a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat `e97102c92aaef221c57003109112955368b869a9` ; son arbre `cf9760df0756d6fdd148f8cf96314335f6aceb47` est identique à celui du candidat et du checkout local. Main, branche et PR ont été revérifiés après les CI.

Les tests UI portent sur HTML/formulaires/payloads ; aucune recette visuelle navigateur, Android/iOS, terrain, charge pilote ou restauration complète n’est revendiquée. Les 55 verdicts fonctionnels complets et SO-GAP-12/13/14 restent inchangés. PR conservée en brouillon, non fusionnée ; cette consignation de preuve ne crée aucun nouveau commit.

Base C2m `6052b7ab38c3bd56b61beb803144080951ea0434` : deux CI réussies, 1292 applicatifs + 1036 Firebase/HTTP chacune. [Preuves archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/e97102c92aaef221c57003109112955368b869a9/docs/PR-1-HISTORIQUE-AVANT-I3A.md).

