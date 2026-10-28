# L1m — Références des exports modulaires

Candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 23 octobre 2026 : `main` vérifié à `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent `265a38713a77be7d2d78aa94cee2c4ef8fb67cd5`. Sa [CI L1l](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39849604751) est réussie : 752 tests applicatifs et 584 tests Firebase.

## Parcours livré

L’écran de préparation de l’export groupé présente un panneau **Références du classeur**, avec deux listes dépliables : références vers les autres modules et références internes. Chaque entrée précise la feuille, l’identifiant et la ligne source, la colonne, la feuille et l’identifiant ciblés, le module concerné, ainsi que :

- présence dans la destination au chargement : présente, archivée, absente ou non vérifiée ;
- présence dans le classeur : ligne incluse, archivage inclus ou hors classeur.

Les numéros de ligne incluent l’en-tête XLSX. Les références répétées dans une même cellule de liste sont regroupées ; plusieurs usages dans des cellules différentes restent distincts. Un identifiant commun à plusieurs catalogues est résolu dans sa feuille cible, jamais par son seul nom.

Le constat est informatif. Il ne bloque pas un export existant, ne remplace pas l’aperçu d’import et n’autorise aucune opération. Une référence présente peut rester invalide selon sa publication, son type, les permissions de fiction ou les règles métier. L’aperçu existant continue de vérifier le fichier réellement soumis après modification.

## Couverture explicite

| Sources | Références analysées |
| --- | --- |
| Classes, Attributions, Compétences | Compétences, classe, personnage, consommable |
| Membres, Relations, Objectifs | Personnage, groupe, cible de relation |
| Vaisseaux | Propriétaire personnage/groupe, modèle de carburant |
| Cours, Entrepôts, Tarifs | Objet coté, caisse, marchandise et bénéficiaire |
| Événements économiques | Objet ou route selon la cible ; installation selon le déclencheur |
| Connaissances | Personnages initiaux, audience QR explicite et compétence QR |
| Lieux, ActionsTerrain, Récompenses | Installation, lieu, compétence, bonus/consommable, objet/connaissance de récompense |
| Interactions | Compétence, prérequis, bonus et consommables |

Cellules vides et `!EFFACER` ne produisent pas de référence. Les lignes ARCHIVER ne décrivent pas de nouveaux liens et sont exclues comme sources ; elles restent identifiables comme cibles incluses dans le classeur.

**Hors couverture** : médias, codes de ports, paramètres, dépendances indirectes et liens conservés dans des champs absents de l’export. Les dotations restent exclues des exports groupés. Une liste vide signifie seulement qu’aucune référence de catalogue n’a été relevée dans les champs analysés. Aucun diagnostic global de validité ou de possibilité de suppression n’est annoncé.

## Architecture et compatibilité

La requête propriétaire `masterWorkspace` de L1l fournit un index transitoire des catalogues déjà lus dans sa transaction : identifiant et indicateur d’archivage uniquement. Aucun compte, stock, nom de participant, secret ou nouvelle collection n’est ajouté à cet index. La présence est vérifiée dans la destination précise, pas dans un autre scénario ou épisode. Le panneau analyse les cellules produites par les projections existantes.

Le panneau ne devient pas une feuille XLSX : les exports gardent exactement leur contrat. Il ne modifie ni les validateurs d’import ni les droits existants. Il reste disponible en lecture après lancement. Rouvrir l’export pour actualiser le constat ; ce n’est pas une surveillance en direct.

Aucun changement des quatre Masters, de schéma, collection, règles/indexes/droits Firebase, accès privé, workflow ou `.github/deploy-request.json`. Aucun nouveau barème [A]. Décisions [V] et propositions [P] du cadrage inchangées. Aucune fusion ni publication. Retour au code L1l sans migration ni réécriture de données.

L1 reste ouvert : export Master complet des dotations, dépendances indirectes, comparateur et historiques consolidés. Ce panneau contribue aux exigences MST-02 et MST-09, sans déclarer MST-05 (remplacement avant suppression) achevée.

## Validation exécutée

Le **23 octobre 2026**, Node **24.19.0** :

- `npm test` : **757 tests réussis**, sans échec, annulation ni test ignoré.
- `npm run build` : réussi.
- Deux nouveaux scénarios partagés mémoire/Firestore : références réelles, référence absente et absence d’écriture ; isolation scénario/session, consultation après lancement, permissions et acquis conservés.
- Trois tests d’analyse/interface : catalogues distincts, listes, références conditionnelles, archives, inconnus, limites explicites, intégration et échappement HTML.
- Empreintes des quatre Masters, liens documentaires et espaces du diff contrôlés.

Sources : [analyse](../src/shared/master-dependencies.mjs), [index transactionnel](../src/core/master-workspace.mjs), [panneau](../web/master-dependencies.mjs), [tests partagés](../test/support/master-dependencies-suite.mjs), [tests analyse/interface](../test/master-dependencies.test.mjs).

Les résultats définitifs GitHub Actions seront inscrits dans la PR après lecture des journaux, avec commit testé, exécution/job, versions, décomptes et date. La CI du parent n’est pas attribuée à ce lot.

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Préparer chaque module puis déplier les références | Sources, cibles et modules lisibles | Non exécuté |
| Comparer les références avec le XLSX exporté | Identifiants, colonnes et lignes correspondants | Non exécuté |
| Examiner une référence absente ou archivée | Constat explicite, sans promesse de validation | Non exécuté |
| Modifier le scénario après création d’une session | Références propres à chaque destination | Non exécuté |
| Consulter après lancement avec plusieurs rôles | Lecture propriétaire, autres rôles refusés | Non exécuté |
| Vérifier sur Android/iOS | Tableaux et dépliants utilisables | Non exécuté |

Aucune recette humaine, charge réelle, fusion ou publication exécutée. Recette finale isolée, rapport global et procédure de déploiement restent prévus en fin de développement.
