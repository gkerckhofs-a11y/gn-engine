# L1 — Dashboard et Masters modulaires

**Cible complète L1, puis tranche L1a livrée en PR.** L1a ne clôture pas L1. Le V2 autorise des tranches fondées sur les domaines déjà présents ; les nouvelles entités magasin, rendez-vous et spatioport avancé restent dans leurs lots métier.

## L1 complet : résultat attendu

1. Un atelier à six modules, avec contexte exact scénario/version/campagne/épisode, phase et rôle, et accès aux opérations réellement disponibles. L’entité Univers reste une évolution à concevoir ; ne pas la déduire arbitrairement du titre d’un scénario.
2. Dans chaque module, des éditeurs en ligne des données existantes, imports et exports ciblés, validation des références, version/identité durables, aperçu, confirmation et audit communs. Les variantes de jeu demeurent paramétrables.
3. Des définitions séparées des états joués ; aucune importation ne réécrit les comptes, acquisitions ou réservations confirmées. Les quatre fichiers globaux Campagne/Session continuent de fonctionner.
4. Des historiques et erreurs lisibles, un comparateur de versions/rapport de migration et les règles de cycle de vie affichées. Publication d’une version n’affectant pas une session existante.
5. Couverture automatisée des périmètres, références, concurrence, reprise réseau, conservation des campagnes et compatibilité des fichiers ; recette humaine documentée séparément.

Les onglets Catalogue / Instances / Règles / QR / Master / Historique sont une proposition d’interface V2. Ils seront ouverts seulement là où un parcours fonctionne. Aucun bouton fictif n’est créé pour annoncer une fonction future.

## L1a — candidat 0.37.0

| Inclus et utilisable dans la branche | Limite explicite |
| --- | --- |
| Six cartes et six sections dans atelier et régie, avec contexte et raccourcis vers les outils réels | Pas de nouveau moteur, de sélection Univers ou de comparateur complet |
| Comptages des collections et objectifs existants pour le propriétaire | Pas de somme trompeuse des lignes filles ; une donnée non comptée ne devient pas un zéro de contrôle |
| Import XLSX limité au module choisi, avec contrôle côté serveur | Ce n’est pas encore l’export complet de chacun des six modules |
| Contrat facultatif `Meta.module`, compatible avec les quatre Masters globaux | Anciennes lignes et anciens fichiers restent lisibles ; les quatre fichiers téléchargés sont inchangés |
| Master Tarifs : lecture, création, modification, archivage et export XLSX | Premier parcours d’édition/export complet ; les autres données continuent par leurs outils existants et les imports |
| ID de nouveau tarif et prochaine version fournis par le serveur | Les identifiants personnalisés des anciens fichiers restent acceptés ; pas de migration générale des IDs |
| Même aperçu/validation/audit/transaction pour formulaire Tarifs et fichier | Modification par Master de session uniquement en PREPARATION avant premier lancement |
| Export des tarifs de la destination, avec version et contexte | Export de définitions, pas sauvegarde de stocks ou de session ; réexport si une autre modification intervient |
| Réimport identique sans doublon et protection des modifications périmées | Les données absentes ne sont jamais supprimées ; ARCHIVER reste explicite |

Le **prix fixe et le prix par unité restent vides à la création** : aucun barème de jeu n’est imposé. Le tarif est désactivé tant que l’organisateur ne choisit pas de l’activer. La réactivation d’un tarif archivé est explicite dans l’éditeur.

## Répartition des Masters

| Module | Feuilles acceptées | Paramètres propres |
| --- | --- | --- |
| Personnages | Personnages, Classes, Competences, Attributions, Groupes, Membres, Relations, Dotations, Interactions | Groupes, PA, santé (selon les restrictions existantes scénario/session) |
| Communication | Objectifs | Aucun ; annonces et contrats restent dans la régie de session |
| Magasins | Objets | Aucun ; catalogue commun, aucune boutique autonome encore |
| Spatioport | Vaisseaux, Routes | `astroport_id` |
| Économie / Stockage | Entrepots, Cours, EvenementsEco, Tarifs | Économie et monnaie (scénario seulement pour ces réglages) |
| Informations / Fouilles | Connaissances, Lieux, ActionsTerrain, Recompenses | Aucun |

Une feuille métier ne possède qu’un module d’écriture. Les autres modules la référencent par ID : par exemple le spatioport utilise le modèle de carburant du catalogue commun. Importer plusieurs domaines liés au même moment reste possible par le **Master global**. Dans un import modulaire, les références d’un autre module doivent déjà exister. Les onglets étrangers vides sont tolérés ; toute ligne étrangère est refusée. Les paramètres généraux titre/date/capacité restent dans les outils ou le Master global.

`Meta.module` accepte `personnages`, `communication`, `magasins`, `spatioport`, `economie`, `informations`. Si le fichier déclare un module différent de celui du bouton choisi, le serveur refuse. Un fichier modulaire chargé dans le champ global conserve sa frontière déclarée. L’absence de module maintient le comportement historique global ; elle ne crée aucun nouveau droit.

## Parcours Tarifs

Dans le module Économie / Stockage, ouvrir **Master des tarifs**. Choisir Créer, Modifier ou Archiver, puis renseigner le motif. L’aperçu expose les différences et le bénéficiaire. Rien n’est enregistré avant confirmation. Le résultat est conservé dans l’historique habituel des imports avec le module `economie`.

**Exporter les tarifs** produit un fichier XLSX limité à Meta + Tarifs, pour cette destination et cette révision. Les cellules sont des textes littéraux, jamais des formules. Un tarif archivé est exporté comme ARCHIVER pour ne pas le réactiver accidentellement. Le classeur n’inclut aucun solde, lot, accès joueur ou secret de personnage. Modifier puis charger le fichier par l’entrée Économie / Stockage ou par le champ global conserve les validations et les droits.

Une autre modification entre export/aperçu et application oblige à actualiser. Un fichier déjà appliqué à l’identique est reconnu inchangé, sans dotation ou historique répété. Les opérations de régie sur les tarifs d’une session en jeu restent dans leur écran existant, avec leurs propres contrôles.

## L1b — six premiers éditeurs spécialisés

La [tranche L1b](L1B-EDITEURS-MODULAIRES.md) ajoute un parcours complet dans chaque module pour Personnages, Objectifs, Objets, Routes, Entrepots et Connaissances : recherche, édition, duplication en brouillon et export ciblé. Le Master Tarifs reste disponible. Les exports portent sur ces feuilles, pas encore sur toutes les feuilles du module. Le rapport L1b distingue les contrôles locaux, la CI sur le commit exact et les recettes humaines non exécutées.

## L1c — catalogues des personnages

La [tranche L1c](L1C-CATALOGUES-PERSONNAGES.md) ajoute les feuilles Compétences, Classes et Groupes au même espace Master du module Personnages. Sélection guidée des compétences et niveaux, champs de soin conditionnels, duplication, archivage et export ciblé réutilisent les imports existants. Profils acquis, membres, droits et caisses ne sont pas remplacés. Les quatre Masters globaux restent inchangés.

## Suite de L1 après L1c

- Export et édition structurée des autres feuilles, y compris relations, membres, profils, récompenses et paramètres ; générer leurs identités et versions sans collisions.
- Interface de dépendances et comparateur de versions/rapport de préparation d’épisode ; publication/test isolés explicitement.
- Consolidation des historiques et diagnostics par module. Aucune erreur fictive « 0 » n’est affichée avant un vrai contrôle.
- Définition d’Univers/bibliothèques si elle devient nécessaire, avec migration préalable documentée et autorisée.
- Extension ultérieure des Masters aux nouvelles entités après leurs lots métier ; ne pas importer des boutiques ou combats qui n’ont pas de service.

[Audit](AUDIT-V2-L0.md) · [matrice V2](MATRICE-V2.md) · [validation et recette](VALIDATION-0.37.md).
