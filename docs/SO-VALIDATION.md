# SPACE OUTLAWS — rapport de conformité courant

## État courant V3.5 — SO-00 différentiel

**Produit complet non conforme à V3.5/V0.7.** [Diagnostic, matrice, sources et ordre des tranches](SO-00-V35-INSCRIPTIONS.md), [55 recettes](SO-RECETTES-V35.md). Base distante 54c7868c, main 03eaace, branche/PR #1 conservées. Aucun service applicatif ni schéma modifié ; sept sondes diagnostiques et deux tests métier supplémentaires dans la suite Caisses partagée avec Firestore.

Local : **795/795 tests et build réussis**, Node 24.19.0, logs `verification/so35-*`. Nouveaux tests : révocation/dépense concurrentes dans les deux ordres de lancement ; droits retirés après commit, opérations antérieures conservées, aucune version Master créée. Partie de INS-10 seulement, pas transfert entre groupes ou recette sur appareil. Firebase du nouveau commit : consulter les runs/logs exacts consignés dans la PR après leur fin ; ne pas utiliser le résultat de la base à sa place.

Les 55 recettes complètes et Android/iOS sont NON TESTÉS dans ce nouveau périmètre ; preuves partielles répertoriées séparément. SO-GAP-14/15/16 ajoutés. G0 incomplet sur sauvegarde/restauration réelle ; G1–G5 non franchis. Prochaine tranche I1, dépendances centrales explicites avant activation I4. Aucune migration, fusion ou production.

## État courant V3.4 — audit SO-00

**Produit complet non conforme à V3.4/V0.7 ; plan en attente de validation avant migration.** [Audit, architecture proposée et preuves](SO-00-V34-PLAN-CENTRAL.md), [contrats des gabarits](SO-00-V34-GABARITS.md). Base distante vérifiée `80c3a9cbce56d4dd7661c1b57f2fb01b348a9888`, main `03eaace155b052d1b7d1960347746e9ee60ed514`. La branche et la PR #1 sont conservées. Commit documentaire/CI exacts consignés dans la PR après exécution.

Nouveau contrôle local de la base : **793 tests applicatifs réussis et build réussi**, Node 24.19.0 ; journaux `docs/verification/so34-*`. Sondes en mémoire : sept gabarits refusés par le lecteur réel ; références contrôlées dans un seul import historique ; deux demandes de publication distinctes créent deux snapshots ; archive d’une version réimportée en copie avec réessai sans modifier comptes/stock de la session témoin. Ce dernier essai ne valide ni une restauration complète ni le rollback central futur.

CI SO-06b relue : push 39953481233 et PR 39953486474, chacun build + **793 applicatifs / 611 Firebase**, succès. Résultats de la base uniquement, pas une exécution de V3.4. Les dix MST, la démonstration cruciale M1/M4/M5 activée, la recette mobile et la restauration complète restent **NON EXÉCUTÉS**. SO-GAP-12/13 ajoutés à la matrice ; aucun blocage métier antérieur levé par cet audit. G0 reste incomplet sur la sauvegarde restaurée ; G1–G5 non franchis. Aucune fusion, migration ou production.

## Historique V3.2 et tranches conservées

23 octobre 2026. **Produit complet non conforme à V3.2/V0.7 et non prêt pour une session réelle.** SO-00 documente la reprise ; SO-06a complète un parcours Master existant ; SO-01a ajoute les natures et filtres de soins ; SO-06b prépare les recettes en brouillon. Les lots métier SO-01 à SO-05 et la clôture A38 restent ouverts. Ce rapport est le point de départ du rapport global final, pas une attestation de réalisation des 24 recettes, six recettes FOR et cinq recettes Recettes & Potions.

## Périmètre candidat

Package 0.37.0, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Base distante avant SO-06b `c5b18d72713f1273dd7456607e44bc7d19a8531a`, main `03eaace155b052d1b7d1960347746e9ee60ed514`. Le commit de la tranche et son résultat CI exact sont consignés dans la description de PR après publication. Ne pas attribuer une CI de référence au nouveau commit.

Livré sur branche : audit des sources et branches, matrice V3, six vues nommées selon V3, catalogue global XLSX cohérent et réimport par le circuit existant. Aucun nouveau compte, bien ou stockage parallèle ; aucune migration des sessions. L1a–L1m conservés. Les quatre Masters historiques gardent leurs empreintes, répertoriées dans [SO-00](SO-00-REPRISE.md).

## Tranche actuelle SO-06b

[Audit V3.2, mapping du tableur, guide et limites](SO-06B-RECETTES-BROUILLONS.md). Parent distant `c5b18d72713f1273dd7456607e44bc7d19a8531a`, main inchangé. **793 tests applicatifs locaux et build réussis**, Node 24.19.0 ; onze nouveaux cas métier reliés également à Firestore et quatre tests UI/contrat/contrôleur. Logs dans `docs/verification/so-06b-*.log`. Résultat final de CI et SHA exact à relever dans la PR après les runs. Aucune preuve d’émulateur local, recette humaine ou mobile n’est revendiquée.

Recettes privées en brouillon, composants dans les objets existants, export autonome, diff/version et conservation de campagne livrés sur branche. Publication bloquée. REC-SO-REC-01 exécuté automatiquement, REC-05 partiel, REC-02/03/04 non exécutés. **SO-GAP-11** : laboratoire TOXI, droits de découverte, fabrication transactionnelle, doses et effets biologiques manquants ; portes G1/G3/G4 non franchies. La CI ne vaut pas validation du module complet.

## SO-01a (historique)

[Guide et sources V3.1/V0.7](SO-01A-NATURES-SOINS.md). Base de cette tranche : `133ea159e5574fdac9d05f759c8ae3e14700038f`, main inchangé. **778 tests applicatifs locaux réussis et build réussi**, Node 24.19.0. Dix nouveaux tests métier sont aussi raccordés à Firestore émulé, trois tests UI supplémentaires. Résultats GitHub Actions de TEST sur le nouveau commit consignés dans la PR après fin réelle. Aucune recette humaine, mobile, charge ou recette FOR effectuée. Les preuves de SO-06a ci-dessous restent historiques.

Le statut PNJ secret, l’attribution MJ de FOR-01, les pouvoirs, leur récupération commune et les six REC-SO-FOR sont manquants : nouveau bloquant SO-GAP-10, portes G1/G4. Les reliquats éditoriaux V0.6 des nouvelles sources sont consignés dans SO-01a.

## Contrôles exécutés pour SO-06a (historique)

| Contrôle | Environnement / date | Résultat et preuve |
|---|---|---|
| Tests ciblés export, réimport et droits | Local, Node 24.19.0, 23 octobre 2026 | 8 tests ciblés puis 24 tests UI/contrôleur réussis ; sous-ensembles de la suite complète, ne pas les additionner |
| `npm test` | Même checkout, Node 24.19.0 ; contrôlé avant 10:28:08 UTC / 12:28:08 Bruxelles | **765 réussis**, 0 échec, 0 ignoré, 0 annulé ; durée 12,6 s. Huit nouveaux cas dont quatre partagés avec les émulateurs |
| `npm run build` | Même checkout et date | Succès, interface compilée dans `public/` |
| SHA-256 quatre Masters et sources | Après build | Quatre binaires historiques inchangés ; copies/transcriptions et provenance consignées |
| CI antérieure relue | [Run 39911044989](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39911044989) | 757 + 586 tests réussis sur l'ancien HEAD ; **pas** un résultat de SO-06a |
| CI du nouveau commit, `npm run test:emulator` | GitHub Actions de test, Node 22 / Java 21, `demo-gn-engine` | À compléter après commit dans la PR avec run, job, commit, décomptes et conclusion réelle |
| Recette navigateur, multi-comptes, Android/iOS, charge | Non exécutée pour cette tranche | Les contrôleurs DOM simulés ne sont pas une recette humaine ni un test de téléphone |
| REC-SO-01 à 24 et sécurité terrain | Non exécutés de bout en bout | Voir [registre](MATRICE-SPACE-OUTLAWS-V3.md) : NON TESTÉ, aucune ouverture de jeu autorisée |

Les logs locaux complets sont archivés dans `docs/verification/so-06a-npm-test.log` et `so-06a-build.log`. Les tests portent sur le code de cette tranche ; les documents de rapport sont rédigés après leur exécution. Le référentiel CI cible Node 22, distinct du runtime local Node 24. Aucun émulateur local n'est revendiqué : l'exécution Firebase de cette tranche doit être constatée dans GitHub Actions.

Cas nouveaux : export global des six vues sans écriture ; aller-retour XLSX et répétition idempotente ; refus non propriétaire, références absentes et fichier obsolète ; conservation réelle des comptes, stocks, profils, PV blessés et carburant épuisé ; lecture après briefing mais import refusé ; projections incohérentes/limites bloquant tout téléchargement ; téléchargement puis aperçu/confirmation ; abandon d'une réponse tardive, succès comme refus serveur. Les tests partagés résident dans `test/support/master-global-export-suite.mjs` et sont appelés par les suites mémoire **et** Firebase.

## Anomalies et limites bloquantes restantes

| ID | Écart | Porte concernée |
|---|---|---|
| SO-GAP-01 | Aucun profil fermé V0.7, progression utilisateur/XP/succession ou crédits protégés | G1, REC-01/02/03/24 |
| SO-GAP-02 | Pas de mort/stabilisation/STOP critique conformes, protection non modélisée ; nature et filtre patient développés seulement | G1/G4, REC-04/05 |
| SO-GAP-03 | ROG-02/03, traces, toxicologie et leurs quotas/notifications absents | G1, REC-06 à 11 |
| SO-GAP-04 | Modules droïdes, états distincts et réparations absents | G1/G2, REC-09/12 |
| SO-GAP-05 | Chaîne spatiale canonique absente ; capacité nulle actuellement refusée | G2, REC-13 à 19 |
| SO-GAP-06 | Prix/arrondis, autorités, contrats V0.7, assurances et restitution à compléter | G2, REC-20 à 22 |
| SO-GAP-07 | Clôture bloque les voyages/contrats ouverts ; RESTORE peut soigner ; effets temporaires reportés | G3, REC-23 |
| SO-GAP-08 | Catalogue global partiel, 250 lignes ; pas de Master SO complet ni sauvegarde des sessions | G3/G5, REC-24 |
| SO-GAP-09 | Environnement de recette identifié, sauvegarde/restauration et essais mobiles/60 utilisateurs non prouvés | G4/G5, SEC-08/09 |

Ces écarts sont des fonctions manquantes du nouveau périmètre, pas des régressions attribuées sans preuve à SO-06a. Une CI verte autorise la tranche suivante, pas une mise en service. Aucun seuil physique, résultat de recette ou capacité de charge n'est inventé.

## Validation manuelle de cette tranche à réaliser

Sur un environnement isolé, propriétaire fictif : ouvrir les six vues ; exporter un scénario contenant tous les catalogues, modifier un titre et réimporter avec aperçu ; vérifier historique et absence de redistribution. Refaire sur session blessée et navire sans carburant ; vérifier conservation. Essayer avec MJ/joueur, après briefing, sur un fichier obsolète, avec >250 lignes, et fermer la fenêtre pendant le chargement. Tester le téléchargement/réimport sur Android et iOS. Relever commit, navigateur/appareil, date, captures et résultat ; ne pas cocher REC-SO-24 avant l'implémentation du véritable profil V0.7.

## Décision

Conserver le candidat sur branche/PR. Aucun merge, aucune production, aucun changement du marqueur de déploiement. La [procédure de sauvegarde/reprise et de déploiement](SO-SAUVEGARDE-DEPLOIEMENT.md) est préparée, non exécutée et non approuvée. G1 à G5 ne sont pas franchis ; G0 dispose d'un audit et d'un plan, pas d'une sauvegarde réelle restaurée.
