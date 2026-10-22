# Validation — candidat 0.37.0 / L1a

**Branche `work/l1-modular-workshop`, non déployée.** L1a ajoute les six entrées de l’atelier, le cloisonnement des imports et le parcours complet de Master Tarifs. L1 complet et les nouvelles fonctions de V2 ne sont pas déclarés terminés.

## Contrôles exécutés localement le 22 octobre 2026

| Contrôle | Résultat |
| --- | --- |
| Socle main 0.36 avant modification | Compilation réussie ; 648 tests réussis |
| Compilation du candidat | `npm run build` réussi ; syntaxe des modules modifiés contrôlée |
| Suite applicative du candidat | `npm test` : **661 tests réussis**, 0 échec, 0 ignoré, 0 annulé ; Node **24.19.0** |
| Compatibilité des quatre XLSX | Tests existants de lecture/application réussis ; les quatre SHA-256 correspondent à l’audit L0 |
| Fichier de cadrage joint | Copie intégrale, SHA-256 identique à la source |
| Diff | `git diff --check` sans erreur ; aucune modification de règles, index, demande de déploiement ou workflow |
| Production | Accueil public relu en 0.36.0 ; aucune écriture ni recette privée |

La CI de la PR doit exécuter le candidat sous **Node 22 / Java 21**, avec build, suite applicative et émulateurs Firestore/Auth/Storage du projet **demo-gn-engine**. Les **checks de la PR et leurs journaux** constituent la preuve de cette exécution sur le commit indiqué ; un succès local ou historique 0.36 ne les remplace pas. Les liens et résultats définitifs sont consignés dans la description de la PR, sans lancer un déploiement.

## Nouveaux cas automatisés

Sept scénarios partagés s’exécutent en mémoire et dans la suite Firestore :

1. Lecture de l’atelier réservée au propriétaire, six modules, absence d’écriture à la lecture et export sans états joués ; refus joueur et MJ.
2. Frontières de tous les modules, paramètres hors périmètre, désaccord entre Meta et écran, module inconnu ; Master global encore accepté.
3. Import modulaire de trois tarifs, référence absente sans effet partiel, application atomique, réimport et historique du module.
4. Export XLSX, modification, aperçu, version suivante et réimport sans doublon.
5. Mauvais scénario/session, changement de module après aperçu et révision périmée sans écriture.
6. Édition en ligne avec ID serveur, confirmation rejouée après perte de réponse, modifications concurrentes, archivage puis export préservant l’archivage.
7. Modification des définitions de session sans changement des comptes, stocks, vaisseaux et états de terrain ; lecture seule du Master dès briefing.

Six autres scénarios portent sur l’interface/format : six cartes et restrictions d’affichage, XLSX à cellules littérales (formules non exécutées, XML échappé, accents/retours), affectation unique des feuilles, formulaire sans prix imposé, mauvais fichier arrêté avant requête, édition en ligne utilisant le même aperçu puis la même confirmation. Ce sont des tests automatisés de rendu/contrôleur, **pas une recette visuelle humaine**.

Les suites existantes couvrent aussi publications figées, archives, campagnes, dotations uniques, références et règlements de tarifs. Voir [matrice V2](MATRICE-V2.md) pour distinguer fonction existante, extension et absence.

## Recette manuelle de cette tranche — non exécutée

À réaliser dans une session/scénario de recette isolé, après disponibilité d’un environnement de prévisualisation autorisé. Ne pas saisir de données d’essai dans la production.

| Étape | Résultat à observer | État |
| --- | --- | --- |
| Ouvrir atelier puis régie sur ordinateur et téléphone | Six modules, contexte correct, navigation sans perte d’outil ni débordement | Non exécutée |
| Se connecter comme propriétaire, MJ puis Accueil | Masters réservés au propriétaire ; outils MJ existants ; aucun secret au rôle Accueil | Non exécutée |
| Créer un tarif à montants choisis dans Économie / Stockage | Aperçu avant enregistrement, bénéficiaire lisible, motif et historique | Non exécutée |
| Modifier puis archiver le tarif | Différences correctes ; archive désactivée, historique conservé | Non exécutée |
| Exporter et ouvrir dans Excel ou LibreOffice | Meta + Tarifs lisibles, contexte/version corrects, texte commençant par = traité comme texte | Non exécutée |
| Modifier puis réimporter le XLSX dans le module | Seuls tarifs concernés ; nouveau contrôle et confirmation obligatoires | Non exécutée |
| Réimporter le même fichier / charger dans l’autre module ou session | Aucun doublon ; erreurs compréhensibles sans modification | Non exécutée |
| Modifier depuis deux fenêtres | La seconde version périmée est refusée, réexport possible | Non exécutée |
| Couper puis rétablir le réseau à la confirmation | Un seul import ; reprise ou nouveau contrôle explicite | Non exécutée |
| Passer au briefing puis au jeu | Import structurel fermé ; lecture/export et outils de régie selon leurs droits | Non exécutée |
| Préparer un nouvel épisode à partir d’une campagne de recette | Acquis et historique conservés ; ajout indépendant du modèle initial | Non exécutée |

## Limites et suite

- Export et édition homogènes de tous les Masters modulaires restent à compléter ; seul Tarifs fournit ici le nouveau parcours complet.
- Univers, comparateur de versions, diagnostics consolidés et rapport complet de migration ne sont pas livrés.
- Boutiques, rendez-vous, achats/modèles de vaisseaux, passagers, protection achetée, interception, combat, transfert du butin et réparation obligatoire restent dans les lots L2–L5.
- Aucune recette Android/iOS, essai physique de scan, coupure réseau réelle, ouverture Excel/LibreOffice ou mesure simultanée à 60 joueurs n’est revendiquée.
- Aucun nouveau barème Outcasts ni migration de production. Une autorisation explicite reste nécessaire avant fusion/publication ; aucune demande de déploiement n’est préparée dans cette PR.

[Audit L0](AUDIT-V2-L0.md) · [L1 complet et L1a](L1-ATELIER-MODULAIRE.md).
