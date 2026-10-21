# Validation de la version 0.30.0

État : version 0.30.0 publiée et vérifiée le 21 octobre 2026.

- Compilation : réussie, interface 0.30.0.
- Tests applicatifs : 571 réussis, 0 échec, 0 ignoré ; confirmés dans GitHub Actions à 06:51:40 UTC.
- Tests d’intégration Firebase : 461 réussis, 0 échec, 0 ignoré ; terminés à 07:04:07 UTC le 21 octobre 2026 (733,19 secondes). Total : 1 032 tests réussis.
- 13 nouveaux scénarios métier partagés entre MemoryStore et Firestore : droits/QR, filiation, propriété collective et réception par un autre membre, capacité concurrente, anciens dépôts/corrections, bateau absent, réservation commerciale, confirmations/idempotence, révocation et reprise MJ, volume nul, rollback, carburant acheté puis embarqué, continuité de campagne et commandes privées.
- 3 tests d’interface : routes et origine/session des QR, droits et confirmation de réception avec échappement HTML, entrée carburant et parcours commerciaux.
- Les quatre XLSX ne changent pas ; le carburant utilise la structure Objets existante. Les vaisseaux sont configurés en session, pas encore par master.

Aucun compte joueur réel ni stock de production n’a été modifié pour la recette. Les tests de rendu HTML ne constituent pas une recette visuelle sur téléphone. Accès privés multi-comptes, étiquetage physique, lecture QR sur téléphones et charge de 60 joueurs restent à tester en situation. Les voyages, pleins et consommation de carburant ne sont pas implémentés.

## Traçabilité

- Source : `40f98b87620e4fdda297eda7cb2744c941ec1581`.
- Demande de publication : `67d15b63868898891855f21093322e933e844f9c`.
- Workflow de déploiement : `39558008498`.
- Vérification : job `119082266344`, réussi.
- Déploiement : job `119086893963`, réussi.

## Publication vérifiée

- Firebase Hosting : publication terminée à 07:06:20 UTC.
- Quatre masters XLSX téléchargés et identiques aux fichiers validés à 07:06:21 UTC.
- Version 0.30.0 et refus anonymes de toutes les commandes privées, y compris les commandes cargo, vérifiés à 07:06:59 UTC.
- Accueil ouvert puis rechargé dans le navigateur : pied de page « GN Engine · 0.30.0 », URL vérifiée `https://gn-engine.web.app/#/`.
- Capture ci-dessous : preuve de la version de l’accueil public, pas une recette visuelle des écrans privés.

![Accueil public — version 0.30.0](images/cargo-0.30.0.jpg)
