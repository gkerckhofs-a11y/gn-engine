# Validation GN Engine 0.27 — quatre espaces joueur

20 octobre 2026. Auteur : Codex. Demande : Mon personnage, Mon groupe, Action et Terminal.

## Livré dans le code

Navigation commune aux routes privées, état et QR rapides, sous-navigation du personnage, crédits et objets dans le sac, groupes et missions selon leurs droits, Action regroupant lieux et personnes, saisie des QR/codes, Terminal regroupant les contenus déjà disponibles et une projection explicite des règles. [Guide et limites](ESPACES-JOUEUR.md).

## Vérifications locales

523 tests applicatifs réussis, sans échec ni test ignoré ; compilation réussie. La feuille de styles est analysée par esbuild sans avertissement.

Neuf nouveaux tests d’interface couvrent les quatre entrées et l’état actif, la compatibilité des routes, la protection contre les réponses tardives, les groupes et filtres de contrats, le paiement depuis le sac, les modules du Terminal, les cibles QR, les liens refusés et l’intégration des deux historiques d’action. Un nouveau cas métier vérifie l’exposition limitée des règles, leur actualisation et leur disparition après révocation ; il est partagé par les suites mémoire et Firestore.

La maquette à données fictives `test/ui/player-spaces-preview.mjs` est fournie pour la recette locale. Le navigateur distant n’a pas pu joindre le serveur local de prévisualisation (`ERR_CONNECTION_REFUSED`) : aucune validation visuelle de cette maquette n’est revendiquée. La recette mobile avec comptes réels reste ouverte.

## Publication

Validation Firebase et publication en attente. Les identifiants d’exécution et résultats seront ajoutés après leur réussite.

## Limites

Ce lot réorganise les fonctions existantes et ajoute le résumé des règles. Il ne termine pas les modules d’XP, protection, logistique, vaisseaux ou articles d’univers. Le scan caméra passe par l’application photo du téléphone. Aucun personnage ni donnée de jeu réelle n’est créé ou modifié pour les tests.
