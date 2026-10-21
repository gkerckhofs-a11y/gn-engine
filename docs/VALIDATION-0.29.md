# Validation 0.29 — stocks collectifs et masters logistiques

## Périmètre

Location personnelle ou collective avec payeur distinct, permissions explicites, dépôt et retrait avec transfert de propriété, préservation des stocks entre épisodes. Import de définitions d’entrepôts, des droits et du conditionnement des recharges dans les quatre fichiers XLSX. Les versions et archives de scénario conservent les définitions sans les états joués.

## Contrôles

Les suites couvrent les droits indépendants, groupes secrets, membres masqués et révoqués, confirmations anciennes, doubles requêtes, retraits concurrents, propriété typée et collision d’identifiants entre groupes/personnages. Elles vérifient les quantités, la filiation, le transfert entre deux membres, la fermeture, les locations personnelles existantes et la continuité de campagne.

Les imports sont vérifiés sans écriture à l’aperçu, atomiquement en cas d’erreur, avec tarifs/capacités invalides, bénéficiaires absents, cellule vide/effacement, anciens conditionnements figés, absence de bail implicite et conservation de baux/stocks lors d’un complément. Les quatre XLSX sont relus par le parseur de production ; les exemples sont importés ensemble dans une campagne.

Résultats complets de compilation, tests Firebase et publication : en attente du pipeline de livraison.

## Limites de recette

Les parcours privés sont couverts par les tests métier et de rendu. Recette sur plusieurs téléphones et comptes réels, caméra, conditions réseau du terrain et charge de 60 connexions non effectuées. Aucun mouvement de stock ou paiement de test ne sera effectué en production. Les exemples Excel sont fictifs ; aucune règle économique du GN n’est imposée.
