# Compétences V0.7 — publication intermédiaire du 14 novembre 2026

Auteur : Codex. Autorisation : Guillaume, réponse « ok vas-y » après le point sur le développement, l’intégration et la publication des compétences.

## Publication reportée — décision du 14 novembre 2026

Après la fusion #34 dans main `43a2c7359c09c014db126cc121ea36dcf15c80b7`, Guillaume a demandé : « On publiera sur firebase plus tard, j’ai encore des modifs à travailler ». La CI complète de la candidate est réussie (43572314612) ; la CI main est distincte et était encore en cours. Le pipeline Firebase 43574851449 attendait la CI, sans étape de déploiement engagée.

La publication automatique est suspendue : verify et deploy sont explicitement désactivés. Un job sans accès cloud indique la pause ; le groupe de concurrence annule l’ancien pipeline en attente. Les sources intégrées restent dans main, sans retour de code ni migration. Une future publication nécessitera une instruction explicite puis le rétablissement des gardes de validation. Le résultat d’annulation et l’état public doivent être constatés séparément.

## Candidat et portée

Dépôt gkerckhofs-a11y/gn-engine, PR #34, base main `49ec5ea12100f9efb62ea23773b216d465d06297`. Version candidate `0.38.0-rc.2`. Les lots #16–#33 sont ancêtres de cette branche ; la fusion cumulative conserve leurs commits. Le complément FIL conserve la balise pendant la préparation native du vol. Les preuves exactes et l’état final sont consignés dans la description de #34, sans modifier le candidat uniquement pour y ajouter son propre SHA.

La clôture des 34 capacités n’est pas attestée. La matrice SO-COMPETENCES-V07-CLOTURE.md conserve les manques techniques et commerciaux. Aucun test humain, Android/iOS réel, charge pilote ou restauration de production revendiqué.

## Vérifications

Sur l’arbre `36f5fe48df7314ea03fe770dca837b583f3ec803` : 3 130 tests applicatifs complets, 27 tests ciblés recouvrants, compilation et git diff --check réussis. Runtime local Node 24.22.1 ; la CI utilise Node 22 et Java 21. La CI complète du SHA candidat doit réussir : build, application, HTTP/navigateur, six lots Firestore et contrôle final. La CI complète du SHA main de fusion est aussi obligatoire avant déploiement.

## Ordre et conditions d’arrêt

1. Vérifier que main et la tête #34 n’ont pas bougé ; ne fusionner qu’après succès complet du candidat, avec SHA attendu et merge conservant les ancêtres.
2. Le changement .github/deploy-request.json déclenche le workflow existant sur main. Son garde attend les dix jobs de la CI complète du SHA main exact. Aucune identité ou permission supplémentaire n’est créée.
3. Le workflow déploie api, projet gn-engine, région europe-west1, runtime nodejs22, puis règles/index Firestore et Hosting sur https://gn-engine.web.app. Les règles de cette candidate sont comparées à la base avant fusion.
4. Le contrôle existant vérifie version HTML/JSON, quatre Masters XLSX identiques, ressources Sabacc et refus anonyme de commandes privées. Tout échec arrête la publication ; ne pas désactiver le garde ou accepter une CI de parent.
5. Constater séparément succès CI, succès déploiement et disponibilité publique ; consigner les URLs exactes dans #34.

## Données et retour

Aucune migration, suppression ou nouvelle dotation de session réelle. Les versions de Master existantes restent figées. Cette publication de code ne transforme pas les anciens essais : les nouvelles capacités exigent une nouvelle version de Master et une nouvelle session préparée explicitement.

Aucune sauvegarde récente de production ni restauration réelle n’a été vérifiée pendant ce lot. Ne pas en prétendre l’existence. L’absence de migration évite une conversion automatique ; les nouvelles actions produisent néanmoins leurs historiques natifs si utilisées. En cas d’anomalie, suspendre les nouvelles actions et conserver ces données ; un retour logiciel vers l’ancienne version ne certifie pas leur prise en charge. Toute conversion ou suppression reste une opération distincte.

## Recette après publication

Créer explicitement un nouvel essai depuis les commandes natives, sans supprimer l’ancien. Vérifier les huit profils, le diagnostic, la clinique/atelier préparés, les cours publics, les remises, les documents et indices préparés, la toxicologie volontaire, les traces et la navigation. Les profils, consommables, dossiers et cibles nécessaires doivent être préparés par le MJ ; un bouton de compétence ne crée pas ces contenus. Les appareils réels et une scène terrain restent nécessaires.
