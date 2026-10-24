# L1f — Lieux, actions et récompenses groupés

Tranche du candidat **0.37.0**, sur `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Aucun déploiement. À la reprise du 22 octobre 2026, `main` est toujours `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0) et le parent de travail est `4646c5abb57380bbdc5831ddbd7ba56206810d0e`. Sa [CI L1e](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39779188266) a réussi avec 702 tests applicatifs et 555 tests Firebase ; ces résultats ne sont pas attribués à L1f.

## Parcours livré

Dans **Informations / Fouilles**, ouvrir **Lieux, actions et récompenses**. Le formulaire assemble les trois feuilles du contrat Master existant avant le même aperçu et la même confirmation que les imports XLSX. Il ajoute un parcours groupé aux quinze éditeurs précédents : **seize parcours couvrent dix-huit feuilles**, Tarifs compris. L1 reste ouvert.

| Contenu | Parcours |
| --- | --- |
| Lieu | Recherche, filtre, consultation, création, modification, duplication en brouillon, archivage et réactivation |
| Fouille | Une action SEARCH et au moins une récompense, vérifiées ensemble |
| Installation | Deux actions SABOTAGE et REPAIR, vérifiées ensemble ; aucune récompense |
| Action | Compétence et niveau, instructions, durées, résolution sans jet ou D6, seuil, PA, récupération, bonus et consommable |
| Récompense | Objet, crédits de jeu ou connaissance ; quantité, nombre de découvertes et limite par personnage |
| Export | Meta + Lieux + ActionsTerrain + Recompenses des lieux affichés |

Ajouter ou retirer une récompense ne modifie que le brouillon du formulaire. Le retrait peut être annulé avant confirmation. Le motif et les saisies sont conservés lors des changements de type et du retour depuis l’aperçu. Les chiffres nécessaires sont à renseigner explicitement, y compris zéro. PA et récupération laissés vides utilisent les règles de session existantes. Les durées par niveau et bonus d’objets utilisent le format du Master indiqué dans les aides.

La nature d’un lieu existant est verrouillée. Une action obligatoire ne se supprime pas seule : archiver le lieu la rend indisponible avec lui. Les dépendances sont contrôlées par le moteur : une installation utilisée par une fouille publiée ne peut pas être archivée tant que cette dépendance publiée subsiste.

Une duplication reçoit de nouveaux identifiants de lieu, d’actions et de récompenses ; elle reste en brouillon. Elle copie les **définitions initiales**, dont les quantités de récompenses configurées, sans état de jeu, découvertes déjà obtenues ni stock restant. Ces quantités doivent être relues dans l’aperçu avant confirmation.

## Réutilisation et compatibilité

Les données restent dans `fieldTargets[].profiles` et `fieldTargets[].rewards`. Aucun service de fouille, de récompense, de transaction, de QR ou d’accès privé n’est recréé. `prepareMasterImport` et `applyMasterImport` conservent leurs validateurs, permissions, transactions, révisions, audits et réessais. Le rendu des champs des autres éditeurs est mutualisé sans changer leurs contrats.

Les identifiants des actions importées sont retrouvés dans les reçus `masterRows` / `masterRowBaseline`, par l’empreinte historique du couple lieu/type. Une action issue des anciens outils, sans reçu, reçoit à la projection un identifiant déterministe côté serveur ; son premier import l’enregistre dans le mécanisme existant. Les récompenses gardent leur identifiant interne. Les nouvelles lignes utilisent l’identifiant neuf fourni par le serveur pour éviter de réutiliser celui d’une récompense supprimée précédemment.

Plusieurs identifiants historiques pour une même action, un reçu d’action sans identité, une collision ou des identifiants de récompenses répétés entre lieux bloquent l’édition et l’export de ce parcours. Aucun renommage silencieux ni migration automatique n’est effectué. Les outils et imports historiques restent disponibles ; la résolution d’un historique ambigu reste un travail ciblé ultérieur.

En session, le formulaire affiche les récompenses existantes en lecture seule et les omet de ses modifications. Le stock consommé, les découvertes attribuées, les protections et les autres états de lieu restent conservés. Le réapprovisionnement MJ garde son outil dédié. Un nouveau lieu reçoit son état initial une seule fois. Un lieu réservé par une action ne peut pas être modifié ; les imports restent fermés après la préparation initiale. L’épisode suivant conserve les identités, les réglages et les stocks épuisés.

Les quatre XLSX Campagne/Session, modèles et exemples, conservent leurs empreintes. Aucun changement de schéma, règle, index, droit Firebase, workflow ou `.github/deploy-request.json`. Revenir au code L1e ne nécessite pas de migration et n’annulerait pas les modifications de contenu réalisées ensuite par l’organisateur.

## Validation exécutée

Contrôles locaux du **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **713 tests réussis**, aucun échec, annulation ou test ignoré.
- `npm run build` : réussi.
- Sept nouveaux scénarios partagés mémoire/Firestore : export et permissions ; création atomique ; modification/retrait/duplication/archivage ; identités anciennes ; protection des états de session ; refus/concurrence/réessai ; continuité d’épisode.
- Trois tests de rendu et de brouillon, plus un test de contrôleur : champs conditionnels, quantités explicites, récompenses, verrouillage de session, retour depuis l’aperçu et confirmation des trois feuilles.
- Contrôle des espaces du diff et empreintes des quatre Masters historiques inchangées.

Sources : [suite métier](../test/support/master-terrain-editors-suite.mjs), [interface](../test/master-terrain-editor-ui.test.mjs), [contrôleur](../test/master-upload-ui.test.mjs), [projection](../src/core/master-terrain-projection.mjs), [import inchangé](../src/core/master-terrain.mjs).

La CI Node 22 / Java 21 doit exécuter compilation, tests applicatifs et émulateurs sur cette tranche. Sa conclusion, le commit exact, les totaux, les versions des outils, l’heure et les liens exécution/job seront consignés dans la PR après lecture des journaux. Un résultat en attente n’est pas un succès.

## Recette humaine à exécuter en environnement de test

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Créer une fouille, ajouter et retirer des récompenses, corriger après aperçu | Un seul enregistrement confirmé des trois feuilles | Non exécuté |
| Créer une installation, puis une fouille qui en dépend | Deux profils complets ; refus d’archivage incohérent | Non exécuté |
| Dupliquer un lieu et relire les quantités | Nouveaux identifiants, brouillon, aucune copie d’état joué | Non exécuté |
| Consommer une récompense puis corriger le lieu en préparation de l’épisode suivant | Aucun stock reconstitué ; identité et définition conservées | Non exécuté |
| Exporter un filtre, ouvrir dans Excel/LibreOffice et réimporter | Trois feuilles cohérentes, mêmes identifiants et destination | Non exécuté |
| Consulter et modifier sur ordinateur et Android/iOS | Sections lisibles, champs adaptés et saisie conservée | Non exécuté |
| Deux fenêtres, interruption réseau, compte non propriétaire | Concurrence et réessai contrôlés ; accès refusé au rôle non autorisé | Non exécuté |

Aucune recette humaine, ouverture Excel/LibreOffice, mesure de charge ou publication n’est revendiquée. Les tests de rendu et de contrôleur sont automatisés.

## Limites et suite

L’export est ciblé sur les lieux affichés ; il n’inclut pas leurs catalogues externes ni les installations non sélectionnées. Ce n’est pas un paquet autonome à importer dans une destination vide. Les limites d’import/export existantes restent applicables, notamment 250 lignes, en comptant les actions et récompenses : filtrer les lieux si nécessaire.

Ce lot expose les règles actuelles du moteur sans fixer de barème Outcasts. Les plafonds existants, notamment les bonus d’objet de 0 à 2, ne sont pas présentés comme un nouvel arbitrage `[A]`. Les décisions `[V]` et propositions `[P]` du cadrage ne sont pas modifiées. Les effets de jeu futurs restent à développer dans leurs lots métier.

Les autres feuilles de préparation (Attributions, Dotations, Interactions), paramètres, exports complets, comparateur et historiques consolidés restent ouverts. Voir [L1](L1-ATELIER-MODULAIRE.md), [matrice V2](MATRICE-V2.md) et [stratégie](../AGENTS.md). La recette finale isolée, le rapport global et la procédure de déploiement restent à produire en fin de développement, avant toute demande d’autorisation de production.
