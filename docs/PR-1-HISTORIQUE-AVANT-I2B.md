# PR #1 — description vérifiée avant I2b

Capture du 23 octobre 2026 avant modification de la description. Les résultats ci-dessous concernent le commit I2 `e35504a3da0b32c02c6d141aa4955da3524ce6b5`, pas I2b.

SPACE OUTLAWS dispose maintenant, sur la branche de préparation, d’un parcours privé **lien d’inscription → proposition → décision MJ et confirmation de place**. Deux MJ validant la dernière place obtiennent un confirmé et une attente ; les réessais ne créent pas de seconde réservation. Les travaux L1/L1b et les services historiques sont conservés.

## État du candidat

- Commit I2 : [e35504a3da0b32c02c6d141aa4955da3524ce6b5](https://github.com/gkerckhofs-a11y/gn-engine/commit/e35504a3da0b32c02c6d141aa4955da3524ce6b5), parent I1 `5a921aec9afa686d76b98e4f89d8eb4ca2930a53`.
- Arbre exact : `082ac22d69ef6bf391d67c3a756ac8caae98195b`, identique au checkout local validé.
- Package **0.37.0**, main vérifié `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0). PR conservée **en brouillon**, sans merge.
- **846 tests locaux réussis**, zéro échec/annulé/ignoré/todo ; build réussi, Node 24.19.0.
- **CI I2 entièrement réussie** : les deux workflows de TEST push/PR ont terminé avec succès, chacun avec build + **846 tests applicatifs et 658 tests Firebase**, zéro échec/annulé/ignoré/todo. Les émulateurs locaux ne sont pas exécutés (Java 17 local ; exécution Firebase prouvée en CI).

## Changement fonctionnel I2

File MJ filtrable, états approuvé/attente/correction/refus/retrait, identité fictive réservée par session, quotas globaux/par classe dans une seule transaction, changement de classe atomique et exception explicitement motivée. Retrait possible après expiration du lien, resoumission sans second dossier, notification privée dans le dossier, historique et acquittement. Aucun email automatique.

Les autorisations actuelles sont vérifiées avant restitution d’un reçu. La registration reste inerte : aucun personnage, crédit, kit, XP, PA, lot ou QR actif n’est créé. Préparation M2, publication globale et naissance sont des tranches ultérieures. Un ancien reçu rejoué après retrait ne confirme pas la place à nouveau.

18 nouveaux tests métier partagés mémoire/Firestore, trois nouveaux tests UI, un test HTTP/Auth sur le handler réel. La limite de temps du **seul workflow TEST** passe de 25 à 40 minutes, après un run I1 de 24 min 51 s. Aucun workflow de déploiement modifié ou lancé.

## Documents et preuves

- [I2 : architecture, matrice, parcours, tests, reprise et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/SO-01-I2-DECISIONS.md)
- [Journal local applicatif](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/verification/so-i2-npm-test.log) · [build](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/verification/so-i2-build.log)
- [Matrice de conformité](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/MATRICE-SPACE-OUTLAWS-V3.md) · [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/SO-RECETTES-V35.md)
- [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/SO-VALIDATION.md) · [sauvegarde/reprise et procédure de déploiement à faire valider](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/SO-SAUVEGARDE-DEPLOIEMENT.md)
- [Archive intégrale de la description précédente de PR : L1 → I1 et leurs preuves datées](https://github.com/gkerckhofs-a11y/gn-engine/blob/e35504a3da0b32c02c6d141aa4955da3524ce6b5/docs/PR-1-HISTORIQUE-AVANT-I2.md)

Base I1 vérifiée avant ce lot : push [39974996974](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39974996974), job 120487154764 ; PR [39975002847](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39975002847), job 120487173905. Chacun **825 applicatifs + 639 Firebase**, build réussi, zéro échec/annulé/ignoré/todo. Ce sont les résultats d’I1, pas ceux d’I2.

## Validation CI finale — 23 octobre 2026

Journaux complets relus après terminaison. Node **22.23.3**, npm **10.9.9**, Temurin **21.0.12+1** ; émulateurs du projet `demo-gn-engine`. Horaires ci-dessous en **Europe/Brussels (UTC+2)**.

| Exécution | Commit effectivement checkouté | Résultat | Horaire |
|---|---|---|---|
| [Push 39985131605](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985131605), [job 120522208581](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985131605/job/120522208581) | `e35504a3da0b32c02c6d141aa4955da3524ce6b5` | Build, 846/846 applicatifs, 658/658 Firebase ; succès | 18:14:33–18:34:39 |
| [PR 39985139814](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985139814), [job 120522238880](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985139814/job/120522238880) | Merge de test `fa78d7397edc48e6eb97fa24c594458d64bdbdd2` | Build, 846/846 applicatifs, 658/658 Firebase ; succès | 18:14:37–18:35:52 |

Dans **chaque** journal Firebase : les 18 nouveaux cas « Décisions SO sur Firestore » sont `ok 618–635` et le nouveau cas HTTP/Auth est `ok 637`. Les tests couvrent dernière place de classe/globale, unicité fictive, retrait, correction, exception motivée, changement de classe, concurrence paramètres/approbation, droits actuels, absence de dotation, interruption simulée, réponse perdue et confidentialité des projections.

Durées des suites : push applicatif 18 841,027 ms / Firebase 1 134 206,250 ms ; PR applicatif 18 258,199 ms / Firebase 1 220 029,349 ms. Tous les compteurs échec/annulé/ignoré/todo sont à zéro.

L’arbre du merge **de test GitHub** est `082ac22d69ef6bf391d67c3a756ac8caae98195b`, identique à celui de la branche et du checkout local. Parents vérifiés : main `03eaace…` et I2 `e35504a3…`. Ce merge de test n’est pas une fusion dans main. Vérification finale des refs : main et les deux autres branches restent inchangés ; HEAD de travail reste `e35504a3…`.

## Limites et suite

Application complète **non conforme V3.5/V0.7 et non prête à jouer**. SO-GAP-14 reste ouvert sur M2 central ; I2b groupes, C1/C2/I3 publication centrale, I4 naissance et I5 relève restent à développer. Recettes humaines, Android/iOS, deux appareils, vraie coupure réseau, charge pilote et restauration complète **non exécutés** ; aucune des 55 recettes complètes certifiée.

Les quatre Masters XLSX historiques gardent leurs empreintes. Aucune migration/adoption de campagne, configuration Firebase production, IAM, DNS, secret, donnée/compte de production ni `.github/deploy-request.json` modifiés. **Aucun déploiement ni workflow de déploiement.** Le retour à un binaire I1 ignorant les confirmations I2 n’est pas un rollback sûr. Migration historique et mise en production restent soumises aux autorisations explicites et à la recette isolée.

