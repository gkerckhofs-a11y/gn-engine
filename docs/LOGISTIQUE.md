# Entrepôts et recharges laser — 0.28

## Parcours joueur

**Terminal → Entrepôts** présente les espaces ouverts à la location et les baux personnels, y compris ceux dont l’entrepôt a été fermé. Le joueur consulte le tarif, choisit son portefeuille ou une caisse qu’il est autorisé à débiter, vérifie le récapitulatif et confirme. Le bail reste au nom de son personnage : payer avec une bande ne crée pas un stock collectif.

Une location réserve un entrepôt entier à un seul personnage. La capacité est exprimée dans la même unité abstraite que le volume unitaire des objets. L’organisation décide de cette unité, des capacités, des tarifs et des durées ; aucune valeur de jeu n’est imposée par la livraison.

Le locataire dépose des quantités depuis son sac et retire ses biens depuis l’entrepôt. Chaque opération comporte un aperçu avant confirmation. Un mouvement partiel crée un lot lié au lot d’origine ; un mouvement complet conserve son identifiant. Quantité totale, propriété et détenteur restent conservés. Le déplacement physique suit les consignes de l’organisation : l’application ne l’observe pas.

Un lot entreposé apparaît dans **Mon personnage → Sac → Mes biens en entrepôt**. Il doit rejoindre le sac avant une vente, une remise, un pillage sur le personnage, une utilisation comme matériel de compétence ou une ouverture de recharge. Un lot réservé, saisi ou payé mais non encore reçu n’est pas déposable. Un volume absent bloque le dépôt ; zéro est une valeur explicite autorisée pour un objet sans volume de jeu.

## Durée et loyers

La durée suit l’horloge de session : les pauses et l’intervalle entre deux épisodes ne la consomment pas. À l’échéance, les biens restent conservés, les retraits sont possibles en jeu et les dépôts sont bloqués. Il n’y a ni débit automatique, ni expulsion, ni dette calculée en arrière-plan.

Un renouvellement achète une période supplémentaire au tarif alors affiché. La période s’ajoute au temps encore payé, ou commence au moment de la confirmation si le bail a expiré. Une modification de tarif ne retire pas du temps déjà acheté. Le joueur peut rendre un entrepôt vide ; le temps restant n’est pas remboursé.

Le loyer peut être versé à une caisse de groupe choisie par l’organisation, ou être retiré explicitement de la monnaie en circulation. Un paiement utilise seulement les crédits disponibles, hors réservations existantes. La caisse destinataire et sa véritable identité de groupe ne sont pas exposées aux locataires ; leur historique mentionne l’exploitant. Un compte ne peut pas se payer lui-même.

## Configuration de l’organisation

Dans la session : **Objets et inventaires → Entrepôts et recharges**.

- Créer un entrepôt : nom, description publique, capacité, loyer, minutes de jeu par période, destination du loyer et ouverture aux locations/dépôts.
- Modifier avec un motif privé. La capacité ne peut pas passer sous le volume déjà occupé. Fermer un entrepôt conserve le bail et les retraits.
- Consulter le locataire, le volume occupé, le temps restant et les 50 dernières opérations de logistique. Les événements complets restent enregistrés côté serveur et chaque mouvement figure dans l’historique de son lot.
- Corriger une quantité depuis l’inventaire de session reste possible pour le MJ ; la correction respecte elle aussi la capacité de l’entrepôt et conserve sa trace.

Les entrepôts se configurent **dans la régie de session**. Ils suivent ensuite les épisodes d’une campagne avec leur stock, leur locataire et leur durée restante. Ils ne sont pas encore dans le catalogue de scénario, les archives de scénario ou les masters XLSX. Une nouvelle session indépendante ne copie pas les entrepôts d’une partie jouée.

## Recharges laser et comptoir

Dans le catalogue d’objets, cocher **Consommable** et renseigner **Billes de gel par recharge laser**. Le nombre correspond au conditionnement réel préparé par l’organisation. Laisser ce champ vide pour un autre objet. Chaque lot conserve le conditionnement qui existait à sa création ; modifier le catalogue ne transforme pas rétroactivement les lots.

Le vendeur ou personnage de comptoir reçoit ses lots par les dotations et attributions habituelles. Il les vend au marché ou par vente privée. Le paiement transfère la propriété ; la remise physique existante transfère ensuite la détention au destinataire. Le joueur ne peut ouvrir une recharge achetée qu’après réception dans son sac.

**Mon personnage → Sac → Ouvrir des recharges** demande la quantité, présente le nombre de billes correspondant et exige une confirmation de l’ouverture physique. Le stock de recharges scellées diminue une seule fois ; un lot épuisé reste conservé comme consommé. L’historique enregistre le personnage, le lot, le nombre de recharges et la quantité de billes déclarée. Il ne compte ni les tirs ni les billes restantes dans le blaster.

Les recharges configurées dans le catalogue et les dotations sont conservées dans les versions et archives de scénario. Les masters XLSX actuels n’ont pas de colonne dédiée à ce conditionnement : utiliser l’éditeur, puis attribuer les lots correspondants. Les quatre fichiers existants gardent leur format.

## Contrôles du moteur

Toutes les écritures sont authentifiées, vérifiées côté serveur, transactionnelles, journalisées et protégées contre les doubles requêtes. Les confirmations lient l’identité active, les droits, la version du bail, le tarif, le compte et/ou le lot concernés. Une modification concurrente oblige à relire le récapitulatif. Le scellement de campagne bloque les écritures de l’ancien épisode.

Les transactions de stockage, location et ouverture sont disponibles en jeu selon les permissions de santé pour les échanges ; payer un loyer exige aussi le droit de paiement. Elles ne lancent pas de dé et ne consomment pas de PA ou de récupération de compétence. Les actions de terrain et de soin gardent leurs propres règles existantes.

## Suite ouverte

Stocks collectifs avec droits distincts, import des entrepôts et du conditionnement depuis les masters, boutique organisation sans personnage vendeur, rapprochement physique du stock au comptoir, douanes/corruption automatiques, cours variables et vente directement depuis un entrepôt restent à développer. Le commerce existant permet déjà de vendre des quantités de lots ; cette livraison ne crée pas un marché de gros avec cours et frais de transport. La recette sur vrais téléphones, plusieurs comptes et environ 60 connexions reste nécessaire avant un GN.
