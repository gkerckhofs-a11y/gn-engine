# Cours des marchandises — version 0.32

## Préparer l’économie

Dans la régie de la session, ouvrez **Objets et inventaires → Cours et événements**. L’économie de la session doit être activée pour acheter ou publier une offre. Les réglages peuvent être préparés avant le jeu ou modifiés pendant la session, y compris en pause. Le rôle Accueil et les joueurs n’ont pas accès à cette régie.

1. Créez et publiez les modèles d’objets concernés, par exemple le carburant.
2. Choisissez **Définir un cours** : sélectionnez l’objet et saisissez le prix entier d’une unité commerciale dans la monnaie du jeu. Cochez l’ouverture du cours, indiquez un motif privé, relisez puis confirmez.
3. Créez un événement pour cette marchandise : titre et explication publics, variation entière de −100 % à +1 000 %, déclenchement et activation. Aucun tarif ni événement n’est installé implicitement.

Un cours est attaché à l’identifiant du modèle d’objet, avec son unité et son type. Il vaut pour les lots des différentes versions qui gardent cette même unité et ce même type. Changer l’unité ou le type du modèle rend son ancien cours indisponible jusqu’à sa reconfiguration ; les anciens lots dont l’unité diffère ne sont pas convertis automatiquement.

## Déclencher les événements

**Manuel** : l’effet s’applique dès que le MJ active l’événement ; il cesse à sa désactivation. Il reste actif pendant les pauses et d’un épisode à l’autre jusqu’à intervention du MJ. Il n’a pas d’échéance automatique.

**Pendant une panne d’installation** : le MJ choisit une installation publiée et active l’événement. L’effet s’applique seulement lorsque cette installation est effectivement hors service. Il cesse à la réparation ou à l’expiration de la panne. Cette échéance suit l’horloge de jeu et s’arrête en pause. Le titre interne, l’identifiant de l’installation et ses notes ne sont pas communiqués aux joueurs par le tableau des cours : seuls le titre et l’explication publics de l’événement sont affichés.

Un événement concerne une marchandise. Pour une crise affectant plusieurs produits, créez un événement par produit avec des variations adaptées. La panne ne retire pas d’objets et ne produit pas de crédits.

## Calculer un cours

Les pourcentages de tous les événements actifs sur la marchandise s’additionnent. Le cours unitaire est le prix de base multiplié par `(100 + somme des variations) / 100`, arrondi à l’entier le plus proche ; une moitié est arrondie vers le haut. Le cours ne descend pas sous une unité monétaire. Les calculs intermédiaires utilisent des entiers exacts. Un résultat ou un total hors de la plage entière autorisée rend l’offre indexée indisponible.

Exemple purement illustratif, non chargé dans le jeu : une base de 11 crédits, une hausse de 50 % et une baisse de 25 % donnent `11 × 1,25 = 13,75`, soit 14 crédits par unité. Trois unités coûtent 42 crédits. Le moteur arrondit le cours unitaire avant de multiplier par la quantité.

## Vendre et acheter

Le tableau des cours est intégré au **Marché** du Terminal. Il affiche le cours, la base, la variation cumulée et les événements actifs au dernier chargement. Utilisez **Actualiser le marché** pour voir une évolution.

Depuis un lot disponible dans **Mon sac**, le vendeur choisit :

- **Prix fixe** : montant total librement saisi, conservé malgré les événements. Les annonces existantes gardent ce fonctionnement.
- **Prix indexé** : cours unitaire actuel multiplié par la quantité publiée. Le vendeur accepte que ce montant varie jusqu’à la vente. Un cours ouvert et compatible est nécessaire.

La publication réserve la quantité existante. Toute la quantité est achetée en une fois. Le paiement utilise le portefeuille personnel de l’acheteur ou une caisse pour laquelle il dispose du droit de dépense ; la propriété revient au personnage acheteur et la recette au portefeuille du vendeur, selon le fonctionnement existant.

Le serveur recalcule le montant avant paiement et le compare à la confirmation consultée. Un changement de cours impose une nouvelle confirmation et ne débite rien. Un réessai réseau ne paie pas deux fois ; deux acheteurs concurrents ne peuvent pas acheter le même lot. Les fonds, la propriété et le reçu sont modifiés ensemble.

Après paiement, le prix et les effets utilisés sont conservés dans la vente. Aucun changement ultérieur de cours ne modifie cette somme. Le retrait physique reste à confirmer, sans second paiement, avant de pouvoir utiliser ou revendre les objets.

Suspendre un cours bloque les achats indexés correspondants. L’offre ne passe pas au prix fixe et son stock reste réservé jusqu’à retrait, expiration ou clôture de campagne. Le vendeur et le MJ peuvent retirer l’offre même si son cours est indisponible.

## Campagne, historique et limites

Les cours et événements sont conservés lors de la reprise d’une campagne. Les effets automatiques retrouvent l’état de panne repris par le moteur ; ils ne prolongent pas sa durée. Les annonces sont clôturées suivant le bilan de campagne existant et ne sont pas republiées automatiquement.

Les modifications MJ sont historisées avec leur motif privé et leurs valeurs avant/après ; la régie affiche les 30 dernières. Les événements automatiques sont évalués à la consultation et au paiement, sans tâche planifiée. Le journal de terrain reste la trace du sabotage et de la réparation ; leur activation ne crée pas une nouvelle entrée dans l’historique de configuration des cours.

Depuis la 0.33, les cours et événements se préparent aussi dans les masters et sont conservés dans les versions et archives de scénario. La régie ajoute les suspensions commerciales et les conséquences sur les routes : [guide des événements économiques](EVENEMENTS-ECONOMIQUES.md). Les cours ne varient pas encore selon les volumes achetés ou vendus. Négociation commerciale, taxes, corruption, achats/ventes distants et comptoirs PNJ restent à développer.

Les essais automatiques couvrent les règles et les transactions. La recette des écrans privés sur de vrais téléphones et la charge simultanée de 60 joueurs restent à réaliser.
