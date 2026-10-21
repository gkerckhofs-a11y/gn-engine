# Validation de la version 0.32.0

État : version publiée et vérifiée le 21 octobre 2026. Compilation, 599 tests applicatifs et 482 tests Firebase réussis.

## Périmètre

- Cours par modèle d’objet, unité compatible, configuration explicite et historique MJ.
- Événements manuels ou liés à l’état effectif d’une installation, avec projection publique distincte de leur cible interne.
- Calcul entier exact, cumul des variations, arrondi unitaire, minimum d’un crédit et dépassement de capacité fermé.
- Annonces fixes conservées, annonces indexées facultatives, confirmation avant publication et paiement.
- Montant payé figé, reçu conservé, retrait physique sans nouveau paiement.
- Suspension d’un cours sans perte ni libération implicite des réservations.
- Reprise des cours et événements dans les campagnes existantes.

## Vérifications automatiques

Sept scénarios sont partagés entre MemoryStore et Firestore :

1. Configuration sans effet avant confirmation, répétition unique, cumul et arrondi, absence de données MJ dans les cours joueurs.
2. Variation entre aperçu et paiement, refus sans débit, paiement unique, montant conservé malgré un événement ultérieur et réception physique.
3. Prix fixe indépendant du cours, suspension du cours indexé et retrait libérant le stock.
4. Transaction interrompue sans modification partielle et deux acheteurs concurrents pour un lot.
5. Accès anonymes, rôle falsifié, rôle Accueil, délégation MJ, révocation prioritaire aux réessais et fermeture de l’archive.
6. Variation avant publication, fonds insuffisants et incompatibilité après changement d’unité commerciale.
7. Sabotage, réparation, expiration de panne suspendue en pause et continuité de campagne.

Quatre tests supplémentaires contrôlent le calcul aux limites entières, les projections HTML, l’échappement des textes, le consentement, les champs requis et les branchements de navigation.

## Limites de recette et de livraison

Aucun compte joueur réel, tarif, événement ou stock de production n’a été créé pour cette validation. Le contrôle visuel public après publication atteste uniquement la version installée. Les écrans privés sur téléphone, la lecture QR réelle et la charge simultanée de 60 joueurs restent à tester.

La configuration de ce lot passe par la régie de session ; l’import des cours par master et leur inclusion dans les scénarios/archives restent à ajouter. Les quatre XLSX de la 0.31 sont inchangés. La variation selon les volumes échangés, les frais et la négociation ne font pas partie de ce lot. [Fonctionnement détaillé](COURS-MARCHANDISES.md).

## Traçabilité

- Source : `65b9728a1cfdd77113c1a20fd49892f1f3ca1df3`.
- Demande de publication : `d3a33260cd0c5b73f466a7fc6df8f71bc9326a46`.
- Workflow de déploiement : `39590599237`.
- Vérification : job `119190282912`, réussi.
- Publication : job `119195987106`, réussi.

## Résultats du contrôle automatisé

Horaires du 21 octobre 2026, Europe/Brussels.

- Compilation réussie à 13:15:49.
- 599 tests applicatifs réussis à 13:16:03, aucun échec ni test ignoré.
- 482 tests Firebase réussis à 13:29:04, aucun échec ni test ignoré ; durée de 769,31 secondes.
- Total : 1 081 tests réussis.

## Contrôle après publication

Horaires du 21 octobre 2026, Europe/Brussels.

- Firebase Hosting : publication terminée à 13:31:15.
- Quatre téléchargements XLSX vérifiés à 13:31:17, identiques octet par octet aux fichiers validés du dépôt.
- Version 0.32.0 accessible et refus des accès anonymes aux commandes privées vérifiés à 13:32:05.
- Accueil rechargé dans Chrome : pied de page « GN Engine · 0.32.0 » visible à l’adresse `https://gn-engine.web.app/#/`.
- La capture atteste la version publique ; elle ne constitue pas une vérification visuelle des écrans privés de marché.

![Accueil publié affichant GN Engine 0.32.0](images/cours-0.32.0.jpg)
