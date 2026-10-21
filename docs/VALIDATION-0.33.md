# Validation de la version 0.33.0

État : compilation locale et 605 tests applicatifs réussis. Validation Firebase et publication en attente.

## Périmètre vérifié

- Suspension des ventes et paiements à prix fixe ou indexé, ventes privées incluses, même sans cours configuré.
- Confirmation périmée refusée sans débit, levée de suspension, annulation et retrait d’un achat déjà payé.
- Variations de carburant et durée, cumul et arrondi supérieur, suspension d’une route, coût unique et voyage figé au départ.
- Sabotage et réparation réels déclenchant ou retirant cours, suspension commerciale et perturbations de route. Pause et expiration de panne.
- Projections publiques sans référence d’installation ni motif MJ.
- Import CAMPAGNE puis SESSION, réimport inchangé, version publiée, export/import autonome et anciennes archives compatibles.
- Refus atomique des références absentes, effets incompatibles et pourcentages invalides.
- Conservation des données, styles, dimensions, validations, volets et objets des onglets préexistants des quatre XLSX, hors Guide et Dictionnaire mis à jour.
- Écrans de réglage et confirmation : champs séparés selon la cible, textes échappés, effets publics et indisponibilités explicites.

Quatre nouveaux scénarios sont partagés entre MemoryStore et Firestore. Le scénario existant de sabotage est étendu aux conséquences commerciales et de transport. Deux contrôles applicatifs supplémentaires couvrent les bornes numériques et les formulaires.

## Vérification des masters

Édition des quatre fichiers existants avec Artifact Tool. Ajout de Cours et EvenementsEco, actualisation du Guide et du Dictionnaire. Recalcul, réimport des fichiers livrés, import réel des deux exemples par le moteur et contrôle des rendus des vues modifiées. Aucun tarif de production ni dotation supplémentaire sur un personnage existant.

## Limites

Les tests de règles et transactions ne remplacent pas la recette privée sur téléphones ni un essai à 60 joueurs. Aucun compte, événement ou stock réel de production n’a été créé pour la validation. La suspension du commerce laisse possibles les dons et virements séparés, conformément au périmètre décrit dans le [guide](EVENEMENTS-ECONOMIQUES.md).

Les preuves de publication et les résultats Firebase seront ajoutés après réussite de la chaîne de livraison.
