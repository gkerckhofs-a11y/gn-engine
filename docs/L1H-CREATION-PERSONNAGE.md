# L1h — Création groupée d’un personnage

Tranche du candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 22 octobre 2026 : `main` vérifié à `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent de travail `5bfc80ddc0cdad1b391582d6c4079466e64d1c7b`. Sa [CI L1g](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39793367955) est réussie : 720 tests applicatifs et 566 tests Firebase. Aucun déploiement.

## Parcours livré

Dans **Personnages → Fiches personnages → Créer une fiche**, l’organisateur peut choisir :

- un profil initial facultatif, une classe publiée et des ajustements de compétences publiées avec niveaux explicites ;
- la visibilité du profil au joueur, désactivée par défaut ;
- un montant initial de crédits de jeu, facultatif et sans valeur imposée ;
- des objets publiés sélectionnés par cases, avec leurs quantités explicites.

Les ajustements ajoutent une compétence ou remplacent son niveau ; les compétences non ajustées de la classe restent présentes. Le contrat Master actuel exige un niveau positif : pour composer un profil sans les autres compétences d’une classe, choisir « Aucun » comme classe. Aucune nouvelle règle ou valeur Outcasts n’est introduite.

Les choix produisent **Personnages + Attributions + Dotations**, selon les options activées, dans un seul `prepareMasterImport` puis `applyMasterImport`. L’aperçu présente toutes les lignes et leurs changements. Revenir corriger conserve le motif, la classe, les compétences, les crédits et les quantités. Aucune écriture ne précède la confirmation.

Les lignes filles utilisent des identifiants déterministes dérivés de l’identifiant neuf fourni par le serveur pour le personnage. Les reçus, versions, références, limites de quantité, droits, concurrence et réessais restent contrôlés par le moteur existant. Les identifiants existants ne sont pas renommés.

## Conservation des données et limites

La création groupée est proposée en scénario et dans une session encore en préparation initiale. Les champs de profil/dotation sont absents à la modification d’un personnage existant. Les outils dédiés d’attribution et de correction MJ restent disponibles selon leurs règles actuelles. Les dotations Master sont immuables ; les attributions Master de session exigent également un personnage créé dans le même import.

Une duplication reprend seulement la fiche en brouillon. Aucun profil, crédit ou objet n’est copié automatiquement : ces choix doivent être refaits explicitement. Archivage et modification ne redistribuent rien. Les données restent dans les personnages, comptes, inventaires et reçus existants ; aucune collection ni donnée métier parallèle.

L’export de la liste reste limité à **Meta + Personnages**. Il ne contient ni profil acquis, ni solde, ni inventaire et ne prétend pas être un export complet du module. La conversion XLSX du payload groupé est testée ; ce lot n’ajoute pas un bouton d’export de ce brouillon. Les catalogues référencés doivent déjà être publiés dans la destination. Le raccourci historique « Ajouter un personnage » en régie conserve son fonctionnement ; le parcours complet est dans le Master Personnages.

Dix-sept parcours éditoriaux couvrent toujours dix-neuf feuilles en édition/export ciblé ; le parcours Personnages permet désormais aussi la **création** des feuilles Attributions et Dotations. L1 n’est pas terminé : édition/export des attributions de scénario, restitution explicite des dotations initiales sans redistribution, paramètres, exports complets, dépendances et historiques restent ouverts.

Les quatre XLSX historiques, les workflows, `.github/deploy-request.json`, les règles/indexes/droits Firebase et les accès privés sont inchangés. Aucun schéma métier modifié et aucune migration nécessaire pour revenir au code L1g ; ce retour n’annule pas les contenus déjà créés. Les décisions `[V]`, propositions `[P]` et arbitrages configurables `[A]` restent ceux du cadrage.

## Validation exécutée

Contrôles locaux du **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **727 tests réussis**, sans échec, annulation ni test ignoré.
- `npm run build` : réussi.
- Quatre nouveaux scénarios partagés mémoire/Firestore : création complète/XLSX et première session, refus atomiques et permissions, concurrence/réessai, renfort de session et continuité après consommation de crédits/objets.
- Deux nouveaux tests de rendu/sérialisation et un test de contrôleur : valeurs explicites, sélection, exclusion des acquis, duplication, retour d’aperçu et confirmation unique.
- Empreintes des quatre Masters inchangées, liens documentaires et espaces du diff vérifiés.

Sources : [suite partagée](../test/support/master-character-creation-suite.mjs), [tests d’interface](../test/master-editors-ui.test.mjs), [tests de contrôleur](../test/master-upload-ui.test.mjs), [champs et sérialisation](../src/shared/master-character-creation.mjs), [imports réutilisés](../src/core/masters.mjs).

Les résultats définitifs de GitHub Actions avec émulateurs seront inscrits dans la PR après lecture des journaux, avec le commit exact, les liens exécution/job, les décomptes et la date. Les preuves L1g ne sont pas attribuées à L1h.

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Créer une fiche sans profil ni dotation | Fiche seule, aucun choix implicite | Non exécuté |
| Choisir classe, ajustements, crédits et objets | Aperçu commun avec toutes les lignes | Non exécuté |
| Revenir de l’aperçu, décocher un objet et corriger un niveau | Brouillon conservé, nouvelle confirmation nécessaire | Non exécuté |
| Réessayer la confirmation après perte réseau | Un seul personnage, une seule dotation | Non exécuté |
| Modifier ou dupliquer une fiche déjà jouée | Acquis conservés ; copie sans dotation automatique | Non exécuté |
| Ajouter un renfort puis préparer l’épisode suivant | Identité, compétences et valeurs acquises conservées | Non exécuté |
| Tester plusieurs rôles, Android/iOS et Excel/LibreOffice | Permissions et présentation correctes | Non exécuté |

Recette finale isolée, rapport global et procédure de déploiement restent prévus en fin de développement. Aucune fusion ni mise en production autorisée par ce lot.
