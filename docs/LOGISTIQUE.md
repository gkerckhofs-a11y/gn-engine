# Entrepôts personnels et collectifs, recharges laser — 0.29

## Parcours joueur

**Terminal → Entrepôts** présente les espaces ouverts et les locations accessibles, y compris les entrepôts fermés dont le joueur conserve des droits. **Mon groupe → Stocks et entrepôts** donne également accès à ce parcours. Le joueur choisit séparément le titulaire du bail (son personnage ou une bande autorisée) et le compte à débiter (portefeuille ou caisse autorisée), vérifie puis confirme. Payer avec une caisse ne rend pas le stock collectif : le titulaire choisi détermine sa propriété.

Une location réserve un entrepôt entier à un seul personnage ou à une seule bande. La capacité est exprimée dans la même unité abstraite que le volume unitaire des objets. L’organisation décide de cette unité, des capacités, des tarifs et des durées ; aucune valeur de jeu n’est imposée par la livraison.

Le locataire dépose des quantités depuis son sac et retire ses biens depuis l’entrepôt. Chaque opération comporte un aperçu avant confirmation. Un mouvement partiel crée un lot lié au lot d’origine ; un mouvement complet conserve son identifiant. La quantité totale reste conservée. Un dépôt personnel conserve propriétaire et détenteur. Un dépôt collectif cède les biens à la bande ; un retrait collectif les attribue au personnage qui les retire. La confirmation annonce ce transfert de propriété et l’historique conserve les états avant/après, le lot déplacé, sa filiation et l’acteur. Un lot collectif porte `ownerType: GROUP`, le groupe comme propriétaire et aucun détenteur personnage. Il ne rejoint un sac personnel qu’après retrait autorisé. Le déplacement physique suit les consignes de l’organisation : l’application ne l’observe pas.

Un lot personnel entreposé apparaît dans **Mon personnage → Sac → Mes biens en entrepôt**. Les biens cédés à une bande sont consultables dans son entrepôt avec les droits appropriés, et disparaissent du patrimoine personnel du déposant. Il doit rejoindre le sac avant une vente, une remise, un pillage sur le personnage, une utilisation comme matériel de compétence ou une ouverture de recharge. Un lot réservé, saisi ou payé mais non encore reçu n’est pas déposable. Un volume absent bloque le dépôt ; zéro est une valeur explicite autorisée pour un objet sans volume de jeu.

## Droits des bandes

Les permissions se règlent dans les appartenances de groupe, à l’écran ou dans `Membres.droits` du master. Elles sont inactives par défaut pour les anciens groupes. Le groupe doit être publié, le module activé et l’appartenance active et révélée.

| Droit | Effet |
| --- | --- |
| `readStock` | Voir les lots collectifs et leurs quantités. |
| `depositStock` | Déposer ses propres biens. Sans lecture, seuls le volume occupé et son propre sac sont exposés. |
| `withdrawStock` | Retirer vers son sac. Exige également `readStock`. |
| `manageStorage` | Louer pour la bande, renouveler ou rendre un entrepôt vide. Ne donne aucun droit sur les objets. |

Le droit de payer avec la caisse reste distinct. Le gestionnaire peut payer avec son portefeuille. Révoquer un droit ou masquer le groupe bloque aussi les confirmations en attente et les réessais mémorisés. Les autres joueurs voient un entrepôt occupé sans connaître sa bande, ses stocks ou sa durée restante. Le bail ne change pas de titulaire pendant un renouvellement : il faut d’abord vider et rendre l’entrepôt.

## Durée et loyers

La durée suit l’horloge de session : les pauses et l’intervalle entre deux épisodes ne la consomment pas. À l’échéance, les biens restent conservés, les retraits sont possibles en jeu et les dépôts sont bloqués. Il n’y a ni débit automatique, ni expulsion, ni dette calculée en arrière-plan.

Un renouvellement achète une période supplémentaire au tarif alors affiché. La période s’ajoute au temps encore payé, ou commence au moment de la confirmation si le bail a expiré. Une modification de tarif ne retire pas du temps déjà acheté. Le joueur peut rendre un entrepôt vide ; le temps restant n’est pas remboursé.

Le loyer peut être versé à une caisse de groupe choisie par l’organisation, ou être retiré explicitement de la monnaie en circulation. Un paiement utilise seulement les crédits disponibles, hors réservations existantes. Le nom de la caisse destinataire et sa véritable identité de groupe ne sont pas exposés aux locataires ; leur historique mentionne l’exploitant. Un compte ne peut pas se payer lui-même.

## Configuration de l’organisation

Dans la session : **Objets et inventaires → Entrepôts et recharges**.

- Créer un entrepôt : nom, description publique, capacité, loyer, minutes de jeu par période, destination du loyer et ouverture aux locations/dépôts.
- Modifier avec un motif privé. La capacité ne peut pas passer sous le volume déjà occupé. Fermer un entrepôt conserve le bail et les retraits.
- Consulter le locataire, le volume occupé, le temps restant et les 50 dernières opérations de logistique. Les événements complets restent enregistrés côté serveur et chaque mouvement figure dans l’historique de son lot.
- Corriger une quantité depuis l’inventaire de session reste possible pour le MJ ; la correction respecte elle aussi la capacité de l’entrepôt et conserve sa trace.

Les entrepôts se configurent dans la régie de session ou par le master. Les définitions du scénario sont visibles dans l’atelier, figées dans les versions et incluses dans les archives. Une nouvelle partie les reçoit sans bail ni stock. Les épisodes suivants conservent les stocks personnels et collectifs, les droits, le titulaire et le temps payé restant. Une archive de scénario ne contient aucun bail ni bien joué.

## Recharges laser et comptoir

Dans le catalogue d’objets, cocher **Consommable** et renseigner **Billes de gel par recharge laser**. Le nombre correspond au conditionnement réel préparé par l’organisation. Laisser ce champ vide pour un autre objet. Chaque lot conserve le conditionnement qui existait à sa création ; modifier le catalogue ne transforme pas rétroactivement les lots.

Le vendeur ou personnage de comptoir reçoit ses lots par les dotations et attributions habituelles. Il les vend au marché ou par vente privée. Le paiement transfère la propriété ; la remise physique existante transfère ensuite la détention au destinataire. Le joueur ne peut ouvrir une recharge achetée qu’après réception dans son sac.

**Mon personnage → Sac → Ouvrir des recharges** demande la quantité, présente le nombre de billes correspondant et exige une confirmation de l’ouverture physique. Le stock de recharges scellées diminue une seule fois ; un lot épuisé reste conservé comme consommé. L’historique enregistre le personnage, le lot, le nombre de recharges et la quantité de billes déclarée. Il ne compte ni les tirs ni les billes restantes dans le blaster.

Les recharges et leurs dotations sont conservées dans les versions et archives de scénario. Depuis 0.29, `Objets.billes_par_recharge` importe le conditionnement : entier strictement positif avec `consommable = OUI`. Vide conserve ; `!EFFACER` retire la fonction du modèle sans modifier les lots existants. Les quatre fichiers proposés dans l’application gardent le format 1 et incluent ces colonnes.

## Contrôles du moteur

Toutes les écritures sont authentifiées, vérifiées côté serveur, transactionnelles, journalisées et protégées contre les doubles requêtes. Les confirmations lient l’identité active, les droits, la version du bail, le tarif, le compte et/ou le lot concernés. Une modification concurrente oblige à relire le récapitulatif. Le scellement de campagne bloque les écritures de l’ancien épisode.

Les transactions de stockage, location et ouverture sont disponibles en jeu selon les permissions de santé pour les échanges ; payer un loyer exige aussi le droit de paiement. Elles ne lancent pas de dé et ne consomment pas de PA ou de récupération de compétence. Les actions de terrain et de soin gardent leurs propres règles existantes.

## Suite ouverte

### Prolongement demandé : QR des cargaisons et chargement des vaisseaux

Ce parcours est une proposition pour le prochain lot ; les QR de lots, les soutes et les transferts directs entre entrepôts ne sont pas implémentés en 0.29.

- Chaque lot traçable ou caisse possède un identifiant durable et un QR qui le référence. La nature, la quantité, le volume, la légalité, la propriété et l’emplacement sont lus dans la base selon les droits du joueur. Le QR ne contient pas les secrets de la cargaison et n’accorde pas de droit de retrait à celui qui le photographie.
- La valeur de référence du modèle, l’estimation au cours courant et le prix négocié sont distincts. Une étiquette imprimée ne fige pas un cours futur. Aucun montant ne sera inventé si le barème n’est pas configuré. Les cours dynamiques restent à développer.
- Les sacs, entrepôts et futures soutes sont des destinations de stockage. Chaque destination indique son type, sa capacité, ses droits de dépôt/retrait et ses éventuelles restrictions configurées. Un QR de destination identifie le lieu où déposer ; il ne remplace pas les droits d’accès.
- Parcours proposé : scanner la cargaison, choisir la quantité, scanner ou sélectionner une destination autorisée, vérifier puis confirmer. Le serveur contrôle disponibilité, emplacement source, droits des deux côtés et volume libre. Le mouvement et sa trace sont atomiques et protégés contre les doubles requêtes.
- Déplacer un lot entier conserve son identifiant et son QR. Un déplacement partiel conserve le lot source avec sa quantité restante et crée un lot fils avec un nouveau QR. Les étiquettes physiques des nouvelles caisses doivent être remises par le parcours prévu avec l’organisation.
- Un déplacement entre l’entrepôt et le vaisseau d’une même bande conserve la propriété. Un changement de propriétaire relève d’une cession distincte et explicite. Transporter pour autrui devra également distinguer propriétaire, gardien et emplacement.
- Pour une caisse physique, le QR ne prouve pas son déplacement. Prévoir une confirmation de réception à destination et une réservation des unités pendant le chargement. Pour un fret entièrement virtuel, la règle de déplacement devra être configurée ; aucune durée, taxe, consommation de carburant ou jet spatial n’est fixée ici.

Exemple fonctionnel, sans barème : une bande possède dix caisses dans son entrepôt et en charge quatre dans sa soute. Le résultat doit être six dans l’entrepôt, quatre dans la soute, dix toujours à la même bande et un mouvement consultable dans l’historique. Un vaisseau absent, inaccessible ou plein doit bloquer le chargement avant toute sortie du stock.

Boutique organisation sans personnage vendeur, dotations directement collectives, rapprochement physique du stock au comptoir, douanes/corruption automatiques, cours variables et vente directement depuis un entrepôt restent à développer. Le commerce existant permet déjà de vendre des quantités de lots ; cette livraison ne crée pas un marché de gros avec cours et frais de transport. La recette sur vrais téléphones, plusieurs comptes et environ 60 connexions reste nécessaire avant un GN.
