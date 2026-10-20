# Validation GN Engine 0.28.0 — logistique

20 octobre 2026. Suite du développement demandée après l’habillage galactique. [Périmètre et configuration](LOGISTIQUE.md).

## Vérification locale

Les tests métier de logistique couvrent : location confirmée et paiement unique, caisse bénéficiaire et retrait monétaire, droits de caisse, comptes tiers et accès révoqués, confidentialité du stock et des groupes secrets, capacité et concurrence, mouvements partiels, corrections MJ, expiration et pause, renouvellement, fermeture, restitution, refus de vente/utilisation d’un lot stocké, réception physique avant ouverture de recharge, doubles clics, panne transactionnelle et continuité entre épisodes.

Les tests d’interface couvrent les routes, les formulaires, les confirmations, l’échappement des textes, les états indisponibles et l’absence d’actions dans la prévisualisation MJ. Les quinze tests métier sont également raccordés à la suite Firestore émulée.

Les nombres définitifs et les preuves de publication sont complétés après l’exécution de la chaîne de déploiement. Aucune donnée de session réelle n’est créée pour ces tests. La recette visuelle des écrans privés avec comptes réels, mobiles et charge de 60 connexions reste ouverte.
