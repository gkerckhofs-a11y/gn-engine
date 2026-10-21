# Négociation commerciale — 0.34

Depuis **Terminal → Marché**, un acheteur peut ouvrir une annonce puis **Négocier le prix**. Les échanges se retrouvent dans **Mes négociations**, pour l’acheteur comme pour le vendeur. Actualiser le marché permet de consulter les nouvelles réponses ; il n’y a pas de notification automatique.

## Parcours joueur

1. L’acheteur propose un prix total pour tout le lot, une validité en minutes et, s’il le souhaite, un message privé. Un écran récapitule le montant, le destinataire et les conditions avant l’envoi.
2. Le vendeur accepte, clôture ou propose un autre prix. Après une contre-offre, c’est à l’autre joueur de répondre. Chaque nouvelle proposition remplace la précédente.
3. L’acceptation fixe le prix mais ne déclenche aucun paiement. L’acheteur choisit son portefeuille personnel ou une caisse pour laquelle il possède le droit de dépense, puis vérifie le total avant de payer.
4. Le paiement attribue la propriété du lot à son personnage. Les objets restent chez le vendeur : la remise physique se confirme ensuite dans **Mon sac → Mes achats et ventes**, sans second débit.

**Un accord de prix n’est pas une réservation exclusive.** Plusieurs acheteurs peuvent négocier la même annonce. Elle reste achetable au prix public ; seul le premier paiement validé attribue le stock. Les autres accords deviennent indisponibles. Aucun fonds n’est bloqué pendant les discussions.

La négociation concerne le personnage acheteur. Une caisse peut financer son achat, avec ses autorisations actuelles ; cela ne donne pas automatiquement la propriété du lot à la bande. Les transferts de propriété collective passent par les actions de logistique existantes.

## Échéances et conditions

- Validité choisie par l’acheteur : de 1 à 10 080 minutes, plafonnée par l’échéance de l’annonce. Le temps continue pendant les pauses. Une contre-offre ou une acceptation ne prolonge pas ce délai.
- Un seul échange ouvert ou accepté par couple annonce/acheteur. Après clôture ou expiration, une nouvelle offre peut ouvrir un nouveau cycle dans le même historique, si l’annonce est encore disponible.
- Le lot entier, le lieu de retrait et les conditions de l’annonce restent inchangés. Seuls le prix et le message font l’objet d’une contre-offre. Pour modifier la quantité ou les conditions, le vendeur retire son annonce et en publie une nouvelle.
- Le prix proposé est fixe, y compris sur une annonce indexée. Une hausse, baisse ou fermeture du cours ne réécrit pas un prix convenu. Une suspension commerciale bloque les offres, contre-offres, acceptations et paiements ; elle n’empêche pas de clôturer l’échange ou de remettre un lot déjà payé.
- Chaque participant peut clôturer l’échange, même après acceptation, tant que l’achat n’a pas été payé. Le prix convenu cesse alors d’être utilisable.
- Les échanges nouveaux et les paiements exigent une session en jeu, l’économie active et les permissions de santé nécessaires. Le stock, les identités, les droits sur la caisse et les fonds sont revérifiés au paiement.

Exemple fictif : trois caisses sont annoncées à 60 crédits. Un acheteur propose 45 ; le vendeur répond 50 ; l’acheteur accepte. Il devra confirmer un paiement de 50 crédits pour les trois caisses. L’annonce reste disponible aux autres joueurs à son prix public jusqu’à un paiement effectif ou son retrait.

## Configuration du moteur

Aucun nouveau master ni barème n’est requis. Les quatre fichiers XLSX de la version 0.33 restent utilisables sans modification. Les conversations sont des données de jeu propres à la session ; elles ne sont pas des définitions de scénario et ne sont pas transférées à l’épisode suivant. La clôture de campagne retire les annonces ouvertes selon le mécanisme existant, ce qui rend leurs négociations indisponibles. Les crédits et lots déjà acquis suivent les règles de continuité habituelles.

| Commande | Fonction |
| --- | --- |
| `myMarketNegotiations` | Échanges du personnage actif ; états calculés et 30 derniers échanges terminés |
| `marketNegotiation` | Détail privé, actions disponibles et 50 dernières étapes |
| `prepareMarketOffer` | Vérification d’une offre initiale ou d’une contre-offre |
| `sendMarketOffer` | Envoi après confirmation, création ou nouvelle révision de l’échange |
| `acceptMarketOffer` | Acceptation par le destinataire de la dernière proposition |
| `closeMarketNegotiation` | Clôture par l’un des participants |
| `prepareMarketPurchase`, `buyMarketListing` | Achat existant avec `negotiationId` facultatif ; prix accepté imposé par le serveur |

Les documents `sessions/{sessionId}/marketNegotiations/{id}` conservent la référence d’annonce, sa révision, les deux personnages, l’identité d’accès de l’acheteur, le dernier auteur, le prix, le message, l’échéance et l’état. L’identifiant est déterminé par annonce et acheteur. Une sous-collection `history` conserve les offres, contre-offres, acceptations, clôtures et paiements ; le journal d’audit de session trace les écritures. Les projections joueur ne contiennent ni UID de compte, ni version d’accès, ni notes MJ, ni soldes d’autrui. Le marché public ne contient pas les messages ou prix négociés.

États persistés : `OPEN`, `ACCEPTED`, `CLOSED`, `PAID`. États calculés : `EXPIRED`, `UNAVAILABLE` (annonce vendue, retirée ou stock/accès vendeur invalidé), `STALE` (identité acheteur modifiée). Les révisions et confirmations empêchent l’emploi d’une ancienne contre-offre. Les mutations sont idempotentes ; paiement, écritures des comptes, transfert du lot et état de négociation sont transactionnels.

Les reçus de ventes négociées conservent `negotiationId` et le prix fixe payé. Une négociation n’est ni un panier, ni une vente partielle, ni un compte vendeur collectif. Les droits de douane, la corruption et les frais commerciaux restent à développer après définition de leurs règles.

## Recette à effectuer sur le terrain

Avec deux comptes joueurs actifs sur téléphone : envoyer une offre, actualiser côté vendeur, faire une contre-offre, accepter côté acheteur, payer, puis confirmer la remise physique. Vérifier aussi un accord expiré, un achat concurrent et une caisse dont le droit de dépense a été retiré. La preuve de validation automatisée et de publication est conservée séparément.
