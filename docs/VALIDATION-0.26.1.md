# Validation GN Engine 0.26.1 — champs d’import séparés

20 octobre 2026. Correctif demandé avant le prochain lot fonctionnel.

## Changement

- Champ « Fichier master de campagne » dans l’atelier du scénario.
- Champ « Fichier master de session » dans la régie de l’épisode en préparation, pour son propriétaire.
- Destination affichée ; chaque zone propose uniquement son modèle et son exemple, avec une indication pour trouver l’autre zone.
- Contrôle de `Meta.type` avant la préparation serveur. Un fichier inversé indique l’écran et le champ corrects ; son nom ne détermine pas son type.
- Sélection, motif, aperçu puis confirmation restent distincts. Fermer pendant la lecture abandonne le fichier sans appel serveur. Les contrôles serveur et le format des quatre XLSX restent inchangés.

## Vérification locale

Compilation réussie. 513 tests applicatifs réussis, sans échec ni test ignoré. Cinq nouveaux tests couvrent les champs et liens distincts, les types invalides ou inversés, l’absence d’appel serveur en cas d’erreur, les deux destinations jusqu’à la confirmation et l’abandon pendant la lecture. Les quatre classeurs fournis restent lisibles et les exemples importables.

La validation Firebase et la publication sont en attente. Les résultats de la chaîne de publication seront inscrits ici après leur exécution.

## Limites

Deux types de masters existent : campagne et session. Les feuilles de personnages, objets, lieux et interactions restent dans leur classeur respectif ; ce correctif n’ajoute pas de format de fichier par onglet. Les imports de session restent réservés à la préparation avant le premier lancement. La recette sur plusieurs appareils et comptes réels reste ouverte.
