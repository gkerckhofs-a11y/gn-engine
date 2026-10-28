# L1j — Paramètres des Masters modulaires

Candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 22 octobre 2026 : `main` vérifié à `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent de travail `b153ec06572cc4169e92d594eaf2e5609c048055`. Sa [CI L1i](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39807496624) est réussie : 732 tests applicatifs et 574 tests Firebase.

## Parcours livré

Dans les Masters des modules concernés, la feuille **Parametres** propose consultation, modification avec motif, aperçu, retour pour correction, confirmation et export XLSX ciblé.

| Module | Paramètres exposés | Destination autorisée |
| --- | --- | --- |
| Personnages | Activation PA, plafonds niveaux 1 et 2, renouvellement, coût commun, récupération acteur/patient | Scénario et session en préparation initiale |
| Personnages | Activation santé, PV maximum par défaut | Scénario seulement |
| Personnages | Activation des groupes | Session en préparation initiale seulement |
| Économie / Stockage | Activation, nom et unité de monnaie | Scénario seulement |
| Spatioport | Identifiant du port local | Scénario et session en préparation initiale |

La feuille est absente des trois modules sans paramètres déclarés. Économie/Stockage ne propose pas ce parcours en session ; une requête directe est aussi refusée. Santé et monnaie de session conservent leurs outils MJ dédiés.

Les valeurs viennent des règles existantes de la destination. Une valeur absente reste vide : aucun nouveau barème Outcasts. Pour la première configuration d’un groupe PA, santé ou monnaie, le formulaire demande tous les champs de ce groupe, y compris les zéros autorisés. Ensuite, un champ vide conserve sa valeur ; ce formulaire ne supprime pas une configuration. Les paramètres ne se dupliquent ni ne s’archivent.

## Réutilisation et compatibilité

Le formulaire produit le contrat historique **Meta + Parametres (cle, valeur)**, puis utilise `prepareMasterImport` / `applyMasterImport`. La révision de destination, le motif et le contrôle de confirmation restent ceux du moteur. Les imports XLSX historiques ne sont pas modifiés. Aucun service ni catalogue métier parallèle.

L’export ne contient que les paramètres renseignés, autorisés pour le module et la destination. Il ne contient aucun solde, inventaire, PV individuel, réserve de PA ou état de voyage. Les plafonds PA au-delà du niveau 2, les options de santé hors contrat Master et les métadonnées générales conservent leurs outils existants et ne sont pas exportés ici. Une modification conserve ces réglages hors périmètre.

Les paramètres définissent le comportement futur des règles : modifier les PA peut changer les plafonds et coûts applicables ; modifier le port local change les contrôles de présence au port. Le formulaire ne réécrit ni les ressources détenues, ni la position et le carburant des vaisseaux. Après la préparation initiale, la feuille devient en lecture/export seulement ; le serveur continue de refuser les imports correspondants.

Aucun changement de schéma, collection, permission, règle/index Firebase, accès privé, workflow ou `.github/deploy-request.json`. Les quatre Masters historiques sont inchangés. Aucun déploiement. Les décisions [V], propositions [P] et arbitrages configurables [A] restent ceux du cadrage. Revenir au code L1i ne nécessite pas de migration, mais ne révoque pas les paramètres déjà confirmés.

Vingt et un parcours couvrent désormais vingt et une feuilles distinctes : les trois formulaires de paramètres utilisent la même feuille Parametres dans leur module. L1 reste ouvert pour la restitution des dotations initiales, les exports complets, dépendances, comparateur et historiques consolidés. Les métadonnées générales de scénario/session ne sont pas intégrées à ces formulaires.

## Validation exécutée

Le **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **739 tests réussis**, sans échec, annulation ni test ignoré.
- `npm run build` : réussi.
- Quatre nouveaux scénarios partagés mémoire/Firestore : configurations et XLSX, refus atomiques/permissions/périmètres, ressources de session et fermeture après lancement, concurrence/réessai et réglages hors contrat préservés.
- Deux nouveaux tests de formulaire et un test de contrôleur : nombres explicites, restrictions, export, échappement, retour depuis aperçu et confirmation unique.
- Empreintes des quatre Masters, liens documentaires et espaces du diff contrôlés.

Sources : [projection](../src/core/master-parameters-projection.mjs), [définitions](../src/shared/master-parameters-editor.mjs), [formulaires](../web/master-parameters-editor.mjs), [suite partagée](../test/support/master-parameters-editors-suite.mjs), [tests interface](../test/master-editors-ui.test.mjs), [tests contrôleur](../test/master-upload-ui.test.mjs).

Les résultats définitifs CI seront inscrits dans la PR après lecture des journaux : commit testé, liens exécution/job, versions, décomptes et date. Les preuves du parent L1i ne sont pas attribuées à L1j.

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Configurer un groupe de paramètres absent | Valeurs explicites, aucun barème prérempli | Non exécuté |
| Corriger les réglages après aperçu | Motif et saisie conservés, confirmation du nouvel aperçu | Non exécuté |
| Exporter et réimporter avec Excel/LibreOffice | Module, destination et révision contrôlés | Non exécuté |
| Modifier les PA avant lancement | Règles ajustées sans redistribution des ressources stockées | Non exécuté |
| Ouvrir une session démarrée | Consultation/export, modification refusée | Non exécuté |
| Tester plusieurs rôles et Android/iOS | Accès propriétaire et formulaire lisible | Non exécuté |

Aucune recette humaine, charge réelle, fusion ou publication exécutée. Recette finale isolée, rapport global et procédure de déploiement restent prévus en fin de développement.
