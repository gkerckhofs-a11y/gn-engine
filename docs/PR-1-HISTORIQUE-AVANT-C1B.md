# Description PR #1 avant C1b

Capturée le 24 octobre 2026, avant la tranche C1b ; preuves I2b conservées intégralement.

## État courant : SO-01 I2b — régie des groupes et mandats de session

La régie permet au MJ d’affecter, retirer ou transférer un personnage entre groupes dans une seule transaction. Les anciens mandats sont révoqués ; les nouveaux droits exigent un choix explicite. Les caisses, lots, navires, entrepôts et contrats gardent leurs propriétaires.

Commit courant : [ea7f47e45ce3f14722b273301bb8e2cab2eedf43](https://github.com/gkerckhofs-a11y/gn-engine/commit/ea7f47e45ce3f14722b273301bb8e2cab2eedf43), parent I2 `e35504a3da0b32c02c6d141aa4955da3524ce6b5`, arbre `a134fe1f02689e1eeb498b4205a7560295d8dd22`, identique au checkout local testé. Version 0.37.0 ; main `03eaace155b052d1b7d1960347746e9ee60ed514` inchangé. PR en brouillon, non fusionnée.

### I2b livré sur branche

- Politique optionnelle sur les groupes existants : équipe principale/faction, capacité explicite, responsable sans droits implicites, archivage et restauration sans réactivation des mandats.
- Préparation sans effet, récapitulatif, contrôle des révisions puis transfert/retrait/modification atomique. Dernière place et équipe unique contrôlées en concurrence.
- Permissions existantes réutilisées ; aucun nouveau catalogue de membres. Les consommateurs de caisse, stock, pilotage et missions relisent les autorisations courantes.
- Historique avant/après des deux groupes, auteur/motif/date et événement commun ; contre-opération liée, avec capacités/droits revalidés et sans annulation du ledger.
- Accès OWNER/MJ actuel, refus Accueil/joueur ; clôture et scellement en lecture seule ; garde des préparations C1a conservée.
- Ancien éditeur/Master : texte modifiable, politique conservée, modification des membres gérés refusée pour éviter de contourner la régie. Les quatre XLSX historiques restent inchangés.

[Guide, matrice, compatibilité, preuves et reprise I2b](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/SO-01-I2B-GROUPES.md) · [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/SO-VALIDATION.md) · [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/SO-RECETTES-V35.md).

### Validation locale exécutée

Le 23 octobre 2026, Node 24.19.0 : **869 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo (20 366,628413 ms), **build réussi**. 19 nouveaux cas métier + 4 UI ; un nouveau cas HTTP/Auth raccordé aux émulateurs. Syntaxe HTTP vérifiée, pas d’émulateur local (Java 17). [Journal npm test](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/verification/so-i2b-npm-test.log) · [Journal build](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/verification/so-i2b-build.log).

Cas ciblés : capacité et type, consentement des droits, équipe unique, transferts/factions, patrimoine conservé, dernière place et même personnage concurrents, double clic/réponse perdue, interruption transactionnelle, contre-opération, archive/restauration, rôles/révocation avant reçu, frontières C1a/clôture/scellement, contrôles briefing/stock/pilotage/missions, transfert/paiement dans les deux ordres, Master historique et archive, échappement UI. Les vérifications de rendu ne sont pas une recette navigateur.

### CI du commit courant

**Deux exécutions terminées avec succès**, vérifiées le 23 octobre 2026. Chaque run a exécuté build, npm test et Firebase Auth/Firestore/Storage Emulator sur `demo-gn-engine`.

| Exécution | Checkout réellement vérifié | Applicatifs | Firebase | Build / verdict |
|---|---|---:|---:|---|
| Push [40006390251](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006390251), [job 120595268129](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006390251/job/120595268129) | `ea7f47e45ce3f14722b273301bb8e2cab2eedf43` | 869 réussis | 678 réussis | Succès |
| PR [40006400292](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006400292), [job 120595302799](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006400292/job/120595302799) | `c9e65a0236e267cc12e369946b8ad9f4d8f24833` | 869 réussis | 678 réussis | Succès |

**Zéro échec, annulation, test ignoré ou TODO dans les quatre suites.** Journaux complets récupérés et vérifiés. Les 19 nouveaux cas Firestore figurent en `ok 57–75` et le nouveau HTTP/Auth en `ok 655` dans chacun des deux runs. Les quatre nouveaux tests UI sont exécutés dans npm test.

- Outils vérifiés dans les deux journaux : **Node 22.23.3, npm 10.9.9, Temurin 21.0.12+1**.
- Job push : **20:49:00 → 21:11:58**, heure de Bruxelles le 23 octobre (18:49:00 → 19:11:58 UTC). Durées des suites : 19 931,091561 ms applicatifs, 1 313 149,148185 ms Firebase.
- Job PR : **20:49:04 → 21:07:14**, heure de Bruxelles (18:49:04 → 19:07:14 UTC). Durées : 12 115,784239 ms applicatifs, 1 034 402,506112 ms Firebase.
- Fusion virtuelle de test seulement : arbre `a134fe1f02689e1eeb498b4205a7560295d8dd22`, identique au commit poussé et au checkout local. Parents vérifiés : main `03eaace155b052d1b7d1960347746e9ee60ed514` et `ea7f47e45ce3f14722b273301bb8e2cab2eedf43`.
- Les deux runs utilisent uniquement `.github/workflows/check.yml`. Aucun workflow de déploiement déclenché. Main inchangé, branche contrôlée, PR toujours draft et non fusionnée après les tests.

Ces résultats complètent les journaux locaux immuables du commit ; conformément à AGENTS, ils sont consignés ici après terminaison sans créer un nouveau commit auquel attribuer artificiellement la CI précédente.

### Limites et ordre suivant

- Préparations I2 encore sans personnages : raccordement régie au parcours de naissance après C1/C2/I3/I4. I2b a été testé sur sessions synthétiques du moteur existant.
- Décès/succession I5, réserve jamais incarnée et révocation automatique des mandats à la relève restent manquants. Hors combat n’est pas assimilé à mort.
- INS-09/10 : preuves automatiques partielles, **aucune recette Android/iOS, deux appareils, coupure physique, charge ou restauration complète exécutée**. Produit complet non conforme V3.5/V0.7 à ce stade.
- XLSX historique seul ne sauvegarde pas la politique de régie ; pas de certification des sept gabarits préparatoires.
- Suite : **C1/C2** (brouillon central et publication globale atomique), **I3** (approbation → M2), **I4** (incarnation/kit/200 Cr protégés/QR), **I5** (décès/succession). Adoption/migration réelle toujours soumise à validation préalable du plan.
- Sauvegarde et déploiement : [procédure à faire valider](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/SO-SAUVEGARDE-DEPLOIEMENT.md). Interruption/reprise et contre-opération testées automatiquement ; aucune restauration d’infrastructure revendiquée. Ne pas revenir à un ancien binaire ignorant `group.roster`.

### Historique préservé

I2 a été revérifié : push [39985131605](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985131605) et PR [39985139814](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985139814), chacun **846 applicatifs + 658 Firebase**, build et zéro échec/annulé/ignoré/todo. [Description I2 intégrale et preuves](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/PR-1-HISTORIQUE-AVANT-I2B.md) ; [historique L1→I1](https://github.com/gkerckhofs-a11y/gn-engine/blob/ea7f47e45ce3f14722b273301bb8e2cab2eedf43/docs/PR-1-HISTORIQUE-AVANT-I2.md).

**Aucun déploiement, workflow de déploiement, merge, migration, accès/donnée de production ou changement Firebase/IAM/DNS/secrets. `.github/deploy-request.json` et les quatre Masters restent inchangés.**
