# Validation 0.29 — stocks collectifs et masters logistiques

## Périmètre

Location personnelle ou collective avec payeur distinct, permissions explicites, dépôt et retrait avec transfert de propriété, préservation des stocks entre épisodes. Import de définitions d’entrepôts, des droits et du conditionnement des recharges dans les quatre fichiers XLSX. Les versions et archives de scénario conservent les définitions sans les états joués.

## Contrôles

Les suites couvrent les droits indépendants, groupes secrets, membres masqués et révoqués, confirmations anciennes, doubles requêtes, retraits concurrents, propriété typée et collision d’identifiants entre groupes/personnages. Elles vérifient les quantités, la filiation, le transfert entre deux membres, la fermeture, les locations personnelles existantes et la continuité de campagne.

Les imports sont vérifiés sans écriture à l’aperçu, atomiquement en cas d’erreur, avec tarifs/capacités invalides, bénéficiaires absents, cellule vide/effacement, anciens conditionnements figés, absence de bail implicite et conservation de baux/stocks lors d’un complément. Les quatre XLSX sont relus par le parseur de production ; les exemples sont importés ensemble dans une campagne.

Compilation locale réussie et **555 tests applicatifs réussis**, aucun échec ni test ignoré. Les quatre XLSX ont été recalculés, exportés, relus et contrôlés visuellement. Les données préexistantes des onglets sont conservées, avec les ajouts logistiques prévus. L’ajout de la nouvelle colonne vide ne change pas les empreintes d’import des anciennes lignes d’objets.

Code source : `6643b56890c977dfb781d934d969f7632a092149`. Demande de déploiement : `10c95c47c6c15d32e28e8c4faef2f027a64f084f`. Pipeline : `39553613666`.

Validation distante réussie : **555 tests applicatifs et 448 tests d’intégration Firebase, soit 1 003 tests**, aucun échec ni test ignoré. La compilation a également réussi sur Node 22. Le job `verify` (`119068146701`) s’est terminé avec succès ; la suite Firebase a fini le 21 octobre 2026 à 06:20:43 UTC, en 681,58 secondes.

Le job `deploy` (`119072081342`) a réussi. Fonction publiée en Belgique, règles/index Firestore et Hosting publiés. La release Hosting s’est terminée le 21 octobre 2026 à 06:22:32 UTC. Le vérificateur a confirmé la version 0.29.0, les quatre masters XLSX identiques aux fichiers compilés et le refus des commandes privées sans connexion à 06:23:04 UTC.

L’accueil public a été rechargé dans le navigateur et affiche **GN Engine · 0.29.0** à l’adresse vérifiée `https://gn-engine.web.app/#/`. Cette observation valide l’accueil et la version, pas une recette manuelle des écrans privés.

![Accueil public de GN Engine 0.29.0](images/stocks-0.29.0.jpg)

La note de logistique décrit désormais la proposition demandée pendant ce lot : QR des lots et destinations, valeur séparée du QR, propriété distincte de l’emplacement, chargements réservés et réception physique. Ce prolongement est documenté, pas encore implémenté dans cette release.

## Limites de recette

Les parcours privés sont couverts par les tests métier et de rendu. Recette sur plusieurs téléphones et comptes réels, caméra, conditions réseau du terrain et charge de 60 connexions non effectuées. Aucun mouvement de stock ou paiement de test ne sera effectué en production. Les exemples Excel sont fictifs ; aucune règle économique du GN n’est imposée.
