# L1c — Masters des compétences, classes et groupes

22 octobre 2026. Candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Suite de L1b ; L1 reste ouvert. Référence de départ : commit distant `137aee08609b41d0b53b03602eb8541ea4891e8e`, dont la CI a réussi avant cette tranche. `main` reste à `03eaace155b052d1b7d1960347746e9ee60ed514` lors de cette reprise.

## Périmètre livré

Le module **Personnages → Masters du module** propose quatre feuilles : Fiches personnages, Compétences, Classes et Groupes. Les trois nouvelles feuilles disposent de recherche, filtre, consultation, création, modification, duplication en brouillon, archivage/réactivation et export des fiches affichées. Toutes les écritures passent par l’aperçu et la confirmation d’import existants.

| Feuille | Champs et comportement | Éléments exclus |
| --- | --- | --- |
| Competences | Nom, textes, catégorie, publication, notes MJ ; expertise passive ou soin sur soi/cible ; PV rendus, plafond d’usages facultatif, récupération et consommable choisi dans le catalogue | Nouveaux effets de capacité, usages consommés et profils déjà attribués |
| Classes | Nom, description, publication, notes MJ ; sélection de compétences avec leur niveau explicite | Attribution ou mise à jour automatique des personnages, nouvelles règles de progression |
| Groupes | Nom, description, briefing, visibilité, publication, notes MJ | Membres, permissions, caisse, crédits, stocks et messages |

Les champs de soin apparaissent seulement pour une compétence active. La quantité de consommable apparaît quand un consommable est choisi. Changer ces choix conserve les autres saisies et le motif. Les valeurs de soin, durée, quantité et niveau restent à renseigner ; aucun barème de jeu n’est ajouté. Les règles PA existantes peuvent remplacer la durée de récupération du catalogue lorsqu’elles sont actives, ce que le formulaire précise.

Le choix des compétences d’une classe affiche leur nom, leur identifiant et leur publication. Une compétence manquante reste visible pour correction. La sélection est sérialisée dans la cellule `competences` du contrat existant (`id:niveau;id:niveau`). Une classe publiée exige des compétences publiées ; les références et les niveaux sont contrôlés par le serveur.

## Compatibilité et protections

- `masterWorkspace` accepte une feuille facultative en plus du module. Une feuille inconnue, sans module ou appartenant à un autre module est refusée. Les anciens appels sans feuille et l’espace Tarifs restent compatibles.
- Les données viennent des collections existantes `skills`, `classes` et `groups`. Les métadonnées de formulaire ne constituent pas un nouveau catalogue métier.
- Les nouveaux identifiants et prochaines versions de lignes viennent du serveur. L’export reste lié à la destination, campagne, module et révision. Il contient **Meta + la feuille affichée**, pas le module Personnages complet.
- Modifier les définitions ne réattribue pas les profils des personnages et ne remet pas à zéro les PV, usages, récupération, comptes ou stocks. Modifier un groupe conserve ses membres, permissions et configuration de caisse.
- Dupliquer crée un nouvel identifiant en brouillon. Un groupe dupliqué est secret, sans membre ni caisse ; aucun crédit ni stock n’est créé. Une classe dupliquée référence les mêmes compétences du catalogue, sans les dupliquer.
- Les dépendances existantes bloquent les archivages incompatibles : compétence encore utilisée, classe attribuée, groupe avec membres actifs. Il n’y a ni suppression durable ni remplacement automatique.
- Lecture/export réservés au propriétaire. En session, l’écriture Master reste limitée à la préparation initiale ; les outils de régie conservent leurs contrôles.
- Les quatre XLSX, le format 1, les règles et droits Firebase, les workflows et `.github/deploy-request.json` sont inchangés. Aucune migration ni intervention en production.

## Validation exécutée

Contrôles locaux du 22 octobre 2026, Node **24.19.0** :

- `npm run build` : réussi.
- `npm test` : **681 tests réussis**, aucun échec, annulation ou test ignoré.
- Six nouveaux scénarios métier partagés mémoire/Firestore : sélection des feuilles et permissions ; création/modification/export/duplication/archivage/réactivation ; configuration des soins et passage en expertise passive ; conservation des acquis et caisses en session ; dépendances et refus atomiques ; concurrence et réessai.
- Trois nouveaux tests d’interface : navigation et champs conditionnels ; sélection des compétences/niveaux et correction des références ; contrôleur, saisies conservées et confirmation de la bonne feuille.

Sources des preuves : [suite métier](../test/support/master-catalog-editors-suite.mjs), [rendu des formulaires](../test/master-editors-ui.test.mjs), [contrôleur](../test/master-upload-ui.test.mjs). La suite générale vérifie aussi les quatre Masters historiques.

La CI Node 22 / Java 21 exécutera les tests avec émulateurs sur le commit de ce lot. Sa conclusion, le commit exact, les décomptes, l’heure et le lien du job seront consignés dans la PR après vérification des journaux. Les résultats de L1b ne sont pas attribués à L1c.

## Recette humaine en environnement de test

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Naviguer entre les quatre feuilles, sur ordinateur et téléphone | Feuille et destination claires ; lecture seule après lancement | Non exécuté |
| Créer une compétence passive puis un soin avec consommable | Champs adaptés, valeurs explicites, motif conservé, confirmation obligatoire | Non exécuté |
| Composer une classe et retirer une compétence | Niveaux lisibles, sélection exacte, refus de publication si dépendance non publiée | Non exécuté |
| Dupliquer un groupe public possédant une caisse | Nouveau groupe secret et en brouillon, sans membre ni caisse | Non exécuté |
| Exporter un filtre et ouvrir dans Excel/LibreOffice | Seulement les fiches sélectionnées ; réimport dans la bonne destination | Non exécuté |
| Modifier un catalogue en préparation d’épisode | Profils acquis, membres, droits et comptes conservés | Non exécuté |

Les tests de rendu et de contrôleur ne constituent pas une recette visuelle dans un navigateur. Aucune ouverture humaine Excel/LibreOffice, recette sur téléphone ou mesure de charge n’est revendiquée.

## Limites et suite

Attributions, membres, relations, dotations et interactions conservent leurs outils et imports existants ; leurs éditeurs Master dédiés ne sont pas ajoutés ici. Les autres feuilles des modules, paramètres, exports complets, comparateur et historiques consolidés restent dans [L1](L1-ATELIER-MODULAIRE.md). Les futurs systèmes métier demeurent dans leurs lots V2. Aucun arbitrage `[A]` n’est fixé par cette tranche et les marquages `[V]` / `[P]` de la [matrice](MATRICE-V2.md) restent inchangés.

Un retour au code L1b reste possible sans migration de schéma. Il n’annulerait pas des modifications de définitions effectuées ensuite par un organisateur. La recette finale isolée, le rapport global et la procédure de déploiement restent des livrables de fin de développement selon [AGENTS.md](../AGENTS.md), avant toute demande d’autorisation de publication.
