# Validation 0.23 — masters complémentaires

20 octobre 2026. Développement local terminé ; validation distante et publication à consigner avant livraison.

Base GitHub : `a9be939ac2530b9d5e683ec4085463fd362d084d`, GN Engine 0.22. Périmètre : masters CAMPAGNE et SESSION, imports complémentaires, création de nouveaux personnages et préservation des acquis.

## Contrôles prévus et preuves locales

- Tests métier partagés par le store mémoire et Firestore émulé : scénario complet, aperçu sans mutation, création et dotations, import identique, réessai de commande, versions conflictuelles, ajout en épisode, solde réellement dépensé conservé, reprise dans l’épisode suivant, champs vides et effacement, références, droits, phase, concurrence et archivage.
- Contrôles de connaissances : instantané reçu conservé après modification du catalogue, archivage bloqué avec un reçu actif.
- Contrôles de médias : référence étrangère refusée avant application.
- Les quatre fichiers XLSX livrés sont lus par le même lecteur que le navigateur. Les deux exemples sont importés successivement dans un scénario puis une session de campagne.
- Le lecteur refuse les formules, déclarations XML externes, feuilles/colonnes inconnues et fichiers excessifs. Les tests d’interface couvrent l’échappement des différences, l’absence de confirmation en cas d’erreur et le masquage des commandes selon le rôle et la phase.
- Un test HTTP avec Auth et Firestore émulés utilise le véritable gestionnaire exporté : droits, aperçu, import, réessai, erreur de version et journal.
- Les classeurs ont été générés avec Artifact Tool. Les aperçus des 60 feuilles ont été inspectés. Ils n’utilisent aucune formule de calcul. La vérification native dans Excel et Google Sheets n’est pas revendiquée.

## Limites de validation

Pas de recette authentifiée sur appareils mobiles ni de test de charge à 60 connexions simultanées. Les tests HTML ne prouvent pas l’affichage visuel des nouveaux écrans privés. Aucun scénario ou compte joueur de production ne doit être modifié pour ces contrôles de publication.

## Publication

À compléter avec les résultats de la chaîne GitHub Actions et du contrôle de déploiement. Le contrôle doit inclure la version affichée, le refus des accès anonymes et la disponibilité des quatre fichiers XLSX.
