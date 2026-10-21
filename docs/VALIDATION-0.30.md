# Validation de la version 0.30.0

État : validation locale terminée ; intégration Firebase et publication à confirmer.

- Compilation : réussie, interface 0.30.0.
- Tests applicatifs : 571 réussis, 0 échec, 0 ignoré.
- 13 nouveaux scénarios métier partagés entre MemoryStore et Firestore : droits/QR, filiation, propriété collective et réception par un autre membre, capacité concurrente, anciens dépôts/corrections, bateau absent, réservation commerciale, confirmations/idempotence, révocation et reprise MJ, volume nul, rollback, carburant acheté puis embarqué, continuité de campagne et commandes privées.
- 3 tests d’interface : routes et origine/session des QR, droits et confirmation de réception avec échappement HTML, entrée carburant et parcours commerciaux.
- Les quatre XLSX ne changent pas ; le carburant utilise la structure Objets existante. Les vaisseaux sont configurés en session, pas encore par master.

Aucun compte joueur réel ni stock de production n’a été modifié pour la recette. Les tests de rendu HTML ne constituent pas une recette visuelle sur téléphone. Accès privés multi-comptes, étiquetage physique, lecture QR sur téléphones et charge de 60 joueurs restent à tester en situation. Les voyages, pleins et consommation de carburant ne sont pas implémentés.
