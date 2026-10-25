La régie dispose désormais de **Contrôler les dossiers M2** : un instantané privé confronte les dossiers actuels, leurs fiches M2, les choix approuvés, les places et les verrous d’identité. Il localise les premières préparations manquantes, divergences, retraits encore liés, archives et orphelins, sans correction automatique.

**Candidat I3c : `c4a5d105077c0dde53848aeb1e55effa87e38a5c`** — [guide, contrat et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/c4a5d105077c0dde53848aeb1e55effa87e38a5c/docs/SO-01-I3C-CONTROLE-DOSSIERS-M2.md). Arbre `abcfc1c0a20ac278d5397e0f3e16cbeca32e36df`, identique au commit local `43d035ccd801cb723e0390111d22ff0ae8fe75d1`.

- MJ de session **et lecture M2** requis ; l’édition demeure nécessaire pour préparer/rapprocher, pas pour ce contrôle. Un contrôleur central sans accès aux admissions ne peut pas lire ce rapport.
- Consentement, choix, liens natifs, compteurs et verrous revérifiés. Exceptions I2 explicites conservées ; biographie MJ différente signalée sans blocage.
- Lecture seule, sans nouvel état persistant, révision ni reçu. Aucun email, UID, récit, souhait d’amis, décision ou secret renvoyé ; aucune lecture des autres ateliers.
- Empreinte liée à l’instantané, jamais un consentement. **Publication et naissance indisponibles** ; leurs futurs actes doivent revalider l’état et la version cible. C2, I3/INS-06 complet, I4/I5 et SO-GAP-12/13/14 restent ouverts.
- Budgets de lecture 1000 dossiers/1000 verrous actifs/100 M2/16 Mio sources/4 Mio rapport, refus intégral sans troncature ; ce ne sont pas des quotas de participation.
- Quatre Masters historiques inchangés, empreinte centrale 12 conservée. Aucun merge, déploiement, migration, changement Firebase/IAM/règles/index ou marqueur de déploiement.

**Validation locale — 25 octobre 2026 (Europe/Brussels)** : build et **1374/1374 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0 ; intégrations vérifiées syntaxiquement. 23 nouveaux cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth. Firebase non exécuté localement (Java 17.0.20).

**CI finale — 25 octobre 2026, horodatages UTC : les deux exécutions ont réussi au premier essai.** Journaux complets et toutes les étapes vérifiés ; build, **1374/1374 tests applicatifs et 1107/1107 Firebase/HTTP dans chaque CI**, zéro échec/annulé/ignoré/todo. Node **22.23.3**, npm **10.9.9**, Java **21.0.12+1**.

| Contrôle | Exécution / job | Checkout réellement testé | Fin de l’exécution UTC |
|---|---|---|---|
| Push | [40174122510](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40174122510) / [121111032302](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40174122510/job/121111032302) | `c4a5d105077c0dde53848aeb1e55effa87e38a5c` | 2026-10-25T08:19:39Z |
| Pull request | [40174126009](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40174126009) / [121111043343](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40174126009/job/121111043343) | `a74b8990db2c1683f4cb9301484d573984873248` | 2026-10-25T08:24:19Z |

Les journaux contiennent chacun les **23 nouveaux cas métier mémoire, 23 équivalents Firestore, quatre UI et un HTTP/Auth**, tous réussis ; sortie émulateur de code 0. Le commit de test PR a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et `c4a5d105077c0dde53848aeb1e55effa87e38a5c` ; son arbre `abcfc1c0a20ac278d5397e0f3e16cbeca32e36df` est identique au candidat et au checkout local. Main, branche et PR ont été revérifiés après la CI.

Workflow inchangé : émulateurs `demo-gn-engine`, plafond 50 minutes et aucun déploiement. Cette preuve complète la description de PR sans créer un nouveau commit.

Tests UI limités à HTML/contenu/payloads/navigation : aucune recette visuelle navigateur, Android/iOS, terrain, charge pilote ou restauration globale revendiquée. PR conservée en brouillon, non fusionnée.

Base I3b `8dcd82bf423e1d913d338b2a8c969b3799dddf4f` revérifiée : deux CI réussies, **1347 applicatifs + 1083 Firebase/HTTP chacune**. [Preuves archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/c4a5d105077c0dde53848aeb1e55effa87e38a5c/docs/PR-1-HISTORIQUE-AVANT-I3C.md).

