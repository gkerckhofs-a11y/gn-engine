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

## Publication vérifiée

Source : `fc690dd783bc158a432e258489bbfe58406c4d74`. Demande de publication : `3306703c6fe714854229a6db600d5b3beee511ed`.

[Exécution GitHub Actions 39451222957](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39451222957), terminée avec succès. Jobs `verify` : 118726234989 ; `deploy` : 118731390475.

| Contrôle | Résultat du 20 octobre 2026 (UTC) |
| --- | --- |
| Compilation et tests applicatifs | 513 réussis, 0 échec, 0 ignoré ; tests terminés à 15:45:07 |
| Intégrations Firebase | 420 réussies, 0 échec, 0 ignorée ; terminées à 15:54:19 |
| Publication Firebase | Réussie à 15:56:24 |
| Quatre masters XLSX | Téléchargés et identiques aux fichiers validés à 15:56:31 |
| Site et API | Version 0.26.1 accessible et commandes privées anonymes refusées à 15:57:01 |
| Navigateur | Accueil rechargé, pied de page GN Engine 0.26.1 confirmé |

Total : **933 tests réussis**. L’inspection navigateur a porté sur l’accueil public ; les champs privés et leurs parcours sont couverts par les tests automatisés ci-dessus.

## Limites

Deux types de masters existent : campagne et session. Les feuilles de personnages, objets, lieux et interactions restent dans leur classeur respectif ; ce correctif n’ajoute pas de format de fichier par onglet. Les imports de session restent réservés à la préparation avant le premier lancement. La recette sur plusieurs appareils et comptes réels reste ouverte.
