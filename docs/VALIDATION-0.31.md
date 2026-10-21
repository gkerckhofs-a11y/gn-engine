# Validation de la version 0.31.0

État : version publiée et vérifiée le 21 octobre 2026. Compilation, 588 tests applicatifs et 475 tests Firebase réussis.

## Périmètre vérifié

- Réservoirs configurables, plein depuis un lot réellement détenu, unité commerciale égale à une unité de réservoir et compatibilité explicite par modèle.
- Achat, réception commerciale, consommation du lot, plein et départ testés dans un même scénario métier.
- Routes à sens unique, coût et durée confirmés avant départ, consommation unique, transit, pause de l’horloge, arrivée confirmée et retour à l’astroport.
- Chargements interdits en transit et échanges avec les sacs/entrepôts locaux interdits à distance. La cargaison est conservée, sans création ni transfert implicite de propriété.
- Droit de pilotage de bande distinct des droits de stock, révocation d’appartenance et changement de propriétaire effectifs même sur une requête mémorisée.
- Capacité, carburant incompatible, lot réservé, lots déjà achetés mais non reçus, confirmations périmées, concurrence et rollback.
- Arbitrage MJ avec motif, sans restitution de carburant, blocage d’archivage et reprise de campagne avec réserve, position et routes conservées.
- 11 nouveaux scénarios métier de navigation et 3 d’import sont partagés entre MemoryStore et Firestore. 3 tests HTML couvrent droits, confirmation, champs de configuration et intégration dans la soute/capitainerie.

## Masters

Les quatre XLSX sont importables par le lecteur de l’application. Les exemples campagne puis session s’appliquent avec succès. Les modèles vierges ne créent aucun vaisseau ni route. Les exemples sont fictifs, avec réservoir vide et sans distribution de carburant.

Édition avec Artifact Tool, recalcul, recherche d’erreurs, export et inspection des vues modifiées. Comparaison avant/après : données des onglets non concernés conservées ; anciennes lignes d’objets et paramètres préservées. Les validations, volets figés, fusions, objets, tableaux et largeurs de colonnes des onglets existants sont conservés. Les nouvelles entrées sont renseignables et les en-têtes lisibles. Aucun calcul Excel n’est utilisé dans les données importées.

## Limites de la vérification

Aucun compte joueur réel ni stock de production modifié pour la recette. Les tests HTML ne constituent pas une recette visuelle des écrans privés sur téléphone. Accès privés multi-comptes, étiquetage physique, lecture QR sur téléphones et charge de 60 joueurs restent à tester en situation.

L’arrivée exige une actualisation et une confirmation après l’échéance. Le commerce et le ravitaillement distants, l’entretien et les combats spatiaux ne font pas partie de cette livraison. Le MJ définit les ports, capacités, carburant et barèmes du GN avant de permettre les voyages.

## Traçabilité

- Source : `cc3718090a765eddbaca34d451a9df39145ea3f1`.
- Demande de publication : `b5c42d31d76aa6540b2a91b0c4eae493cd836b9a`.
- Workflow : `39574011123`.
- Vérification Firebase : job `119134919848`, réussi.
- Publication : job `119141142711`, réussi.

## Résultats du contrôle automatisé

- Compilation réussie le 21 octobre 2026 à 09:03:59 UTC.
- 588 tests applicatifs réussis à 09:04:08 UTC, aucun échec ou test ignoré.
- 475 intégrations Firebase réussies à 09:18:01 UTC, aucun échec ou test ignoré, durée de 818,72 secondes.
- Total : 1 063 tests réussis.

## Contrôle après publication

- Firebase Hosting : publication terminée à 09:19:56 UTC.
- Quatre téléchargements XLSX vérifiés à 09:19:58 UTC, identiques octet par octet aux fichiers validés du dépôt.
- Version 0.31.0 accessible et refus des accès anonymes aux commandes privées vérifiés à 09:20:40 UTC.
- Accueil rechargé dans Chrome : pied de page « GN Engine · 0.31.0 » visible à l’adresse `https://gn-engine.web.app/#/`.
- La capture ci-dessous atteste la version publique ; elle ne constitue pas une vérification visuelle des écrans privés de navigation.

![Accueil publié affichant GN Engine 0.31.0](images/navigation-0.31.0.jpg)
