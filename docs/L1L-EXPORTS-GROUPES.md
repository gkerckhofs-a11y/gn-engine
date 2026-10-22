# L1l — Exports groupés des modules

Candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 22 octobre 2026 : `main` à `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent `b96976513a3ae706afd0cb97de80f3a1d65dc2c2`. Sa [CI L1k](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39826233380) a réussi : 745 tests applicatifs et 581 tests Firebase.

## Parcours livré

Dans chaque atelier Master, **Préparer l’export groupé du module** charge les feuilles exportables dans une même transaction de lecture. L’écran annonce destination, révision, feuilles et nombres de lignes avant téléchargement. Toutes les fiches sont prises, y compris les archives, indépendamment du filtre de la liste précédente. Les exports filtrés par feuille restent disponibles.

| Module | Feuilles regroupées |
| --- | --- |
| Personnages | Personnages, Attributions en scénario, Interactions, Competences, Classes, Groupes, Relations, Membres, Parametres autorisés |
| Communication | Objectifs |
| Magasins | Objets |
| Spatioport | Routes, Vaisseaux, Parametres |
| Économie / Stockage | Entrepots, Cours, EvenementsEco, Tarifs, Parametres en scénario |
| Informations / Fouilles | Connaissances, Lieux, ActionsTerrain, Recompenses |

Les dotations ne sont pas intégrées : leur relevé L1k reste distinct et non réimportable. Les Attributions acquises ainsi que la santé et la monnaie de session restent exclues conformément aux restrictions existantes. Les entités des lots métier futurs ne sont pas annoncées comme exportées.

Le classeur conserve le contrat historique `Meta`, les identifiants et versions calculés par les projections existantes, les opérations explicites d’archivage et le module d’écriture. Les références extérieures au module doivent déjà exister. Cet export concerne la **destination existante**, pas le clonage autonome d’un scénario. Pour transférer un scénario complet, utiliser son archive dédiée.

L’import du fichier utilise les contrôles, aperçu, confirmation, audit et idempotence existants. Un premier réimport peut enregistrer les versions de lignes projetées ; il n’est pas présenté comme une opération nécessairement sans écriture. Le réimport identique suivant est idempotent. Une projection ambiguë bloque le téléchargement groupé entier ; aucun fichier partiel silencieux. Toute autre modification exige de refaire le contrôle de révision. Le retour à la liste invalide le téléchargement préparé ; fermer pendant le chargement abandonne la réponse tardive.

## Architecture et compatibilité

`masterWorkspace` accepte l’option de lecture `bundle: true`, seulement avec un module valide et sans feuille individuelle. Le contrôle propriétaire reste commun. Les collections et reçus sont lus une fois par requête ; les projections existantes produisent les feuilles dans le même contexte transactionnel. Les tarifs réutilisent leur projection historique, extraite sans changement de format. Le navigateur assemble les feuilles et utilise le générateur XLSX existant, avec cellules littérales.

Aucune collection métier, migration, règle de distribution ou nouvelle permission. Aucun solde, stock acquis, réservation, carburant actuel ou accès joueur exporté. Les contenus privés des fiches restent réservés au propriétaire comme dans l’export individuel. Les quatre Masters historiques et leur contrat restent inchangés. Les exports de session restent lisibles après lancement, mais leur import demeure interdit hors préparation initiale.

Les décisions [V] et propositions [P] du cadrage sont préservées ; aucun barème [A] ajouté. Aucun changement de workflow, `.github/deploy-request.json`, règles/indexes/droits Firebase ou accès privé. Aucun déploiement ni fusion. Retour au code L1k sans migration.

## Limites et suite

- 250 lignes de données au total, 1 Mio de contenu et 8 Mio de fichier selon le générateur existant. Si dépassé, téléchargement refusé : utiliser les exports filtrés par feuille. Aucun fractionnement automatique.
- L’export ne comprend que les champs représentables dans les feuilles existantes. Options hors contrat, métadonnées générales et états joués gardent leurs outils dédiés.
- Les dépendances externes sont contrôlées à l’import ; pas encore de visualisation détaillée des dépendances ni de comparateur de versions.
- L’export Master complet des dotations, le comparateur et les historiques consolidés restent ouverts. Ce regroupement ne clôt pas L1.

## Validation exécutée

Le **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **752 tests réussis**, aucun échec, annulation ni test ignoré.
- `npm run build` : réussi.
- Trois nouveaux scénarios partagés mémoire/Firestore : six exports XLSX et réimports idempotents ; droits, références, périmètre et révisions ; conservation des comptes/stocks de session, exclusions et fermeture des imports au lancement.
- Deux tests d’interface/assemblage : archives, comptages, métadonnées cohérentes, blocage des ambiguïtés et limites.
- Deux tests de contrôleur : préparation/téléchargement sans mutation ; fermeture pendant chargement.
- Empreintes des quatre Masters, liens documentaires et espaces du diff contrôlés.

L’environnement s’est momentanément déconnecté pendant la suite complète. Après reconnexion, son journal final indique 752 réussites ; la compilation a ensuite été exécutée avec succès. Les résultats définitifs GitHub Actions seront consignés dans la PR après lecture des journaux, avec commit, exécution/job, versions, décomptes et date. Aucune CI du parent n’est attribuée à ce lot.

Sources : [projection](../src/core/master-workspace.mjs), [assemblage et écran](../web/master-module-export.mjs), [suite partagée](../test/support/master-module-export-suite.mjs), [tests interface](../test/master-module-export-ui.test.mjs), [contrôleur](../test/master-upload-ui.test.mjs).

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Préparer depuis chacun des six modules | Feuilles, exclusions et destination lisibles | Non exécuté |
| Filtrer la liste puis exporter le module | Ensemble du module explicitement annoncé | Non exécuté |
| Ouvrir et modifier avec Excel/LibreOffice | Classeur lisible, aperçu avant application | Non exécuté |
| Réimporter avec une référence absente ou une révision périmée | Refus sans écriture partielle | Non exécuté |
| Fermer pendant chargement ou changer de feuille | Aucune réponse tardive affichée | Non exécuté |
| Tester après lancement et avec un autre rôle | Export propriétaire, import fermé | Non exécuté |
| Utiliser Android/iOS et un grand module | Lisibilité et limites explicites | Non exécuté |

Aucune recette humaine, charge réelle, fusion ou publication exécutée. Recette finale isolée, rapport global et procédure de déploiement restent prévus en fin de développement.
