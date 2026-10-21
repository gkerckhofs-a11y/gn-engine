# Entrepôts, soutes, cargaisons et carburant — 0.30

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

## QR des cargaisons et destinations — 0.30

Chaque lot possède une fiche privée et une étiquette QR téléchargeable : **Sac → Cargaison, transfert et QR**, ou le même lien dans un entrepôt et une soute. Le QR pointe vers le lot ; il ne contient ni quantité, ni prix, ni secret. La fiche lit l’état courant et vérifie l’accès du personnage connecté. Photographier un QR ne donne aucun droit de retrait. Un visiteur sans droit ne reçoit pas la nature du lot. Les QR d’entrepôts et de soutes ouvrent leurs fiches et peuvent servir de destinations de chargement.

La fiche présente nature, description, catégorie, quantité, volume, statut légal configuré, propriétaire et emplacement. Le prix de l’offre commerciale est géré au marché ; le module logistique ne fournit pas encore de valeur de référence ni de cours dynamique. Ne pas confondre un statut légal configuré par l’organisation avec une détection automatique de contrebande.

**Action** accepte désormais les liens QR de cargaisons, d’entrepôts et de soutes, en plus des personnages, lieux et informations. Scanner avec l’appareil photo du téléphone, ou coller le lien dans l’application ; il n’y a pas encore de caméra intégrée. Les liens sont liés à la session. L’identifiant d’un lot est conservé entre épisodes, mais les étiquettes URL de la nouvelle session doivent être rééditées : un lien de l’ancien épisode scellé ne donne pas accès au nouveau.

## Soutes et chargements — 0.30

**Organisation → Objets et inventaires → Vaisseaux et cargaisons** permet de créer une soute, d’attribuer son vaisseau à un personnage ou à une bande, de choisir sa capacité, son état à quai et l’ouverture des chargements. Aucune capacité n’est imposée. Ces réglages sont actuellement faits dans la régie de session ; les masters et archives de scénario n’importent pas encore les vaisseaux. Les soutes et leur cargaison sont conservées lors de la reprise d’une campagne.

**Terminal / Mon groupe → Vaisseaux et cargaisons** réunit les soutes autorisées et les chargements en attente. Pour une bande, les droits existants s’appliquent : lecture du stock, dépôt, retrait. Un droit de bail ne permet pas de configurer un vaisseau. Un vaisseau absent du quai bloque chargement et déchargement. Fermer seulement le chargement conserve les sorties possibles à quai.

Le déplacement direct conserve toujours le propriétaire : sac personnel ↔ entrepôt personnel ↔ soute personnelle, ou entrepôts et soutes d’une même bande. Le moteur refuse une destination appartenant à quelqu’un d’autre. Le don à une bande ou la sortie de ses biens vers un patrimoine personnel restent les opérations explicites du parcours sac/entrepôt existant. Le transport pour compte de tiers n’est pas encore proposé.

1. Ouvrir ou scanner le lot ; choisir la quantité et la destination autorisée. Il est aussi possible de coller le lien QR d’un entrepôt ou d’une soute dans le champ destination, prioritaire sur la sélection.
2. Vérifier le récapitulatif et **réserver le chargement**. Le serveur contrôle les droits de retrait et de dépôt, la présence à quai, le bail, le volume et les réservations existantes.
3. Les unités réservées restent comptées à la source, avec le statut « chargement réservé ». Elles ne peuvent plus être vendues, utilisées, cédées ou corrigées. La place à destination est réservée simultanément. Le reste d’un lot partiel reste disponible.
4. Déplacer les caisses selon les consignes de l’organisation, puis **confirmer la réception**. Le joueur qui réceptionne doit avoir les droits de lecture et de dépôt à destination ; un autre membre autorisé de la même bande peut le faire. L’emplacement change sans transfert de propriété ni nouveau paiement.
5. En cas d’abandon, **annuler** libère les unités et le volume réservé. Les biens restent à la source ; ramener physiquement les caisses si elles ont déjà été déplacées. L’annulation reste possible en pause. Un MJ peut annuler avec motif même si les droits du joueur ont disparu.

Un lot entièrement transféré conserve son identifiant et son QR. Un chargement partiel crée un lot fils dès la réservation, avec filiation et nouveau QR affiché dans le suivi ; le lot source garde le sien. Une annulation ne fusionne pas les deux lots. Les nouvelles étiquettes doivent être placées sur les bonnes unités physiques. L’application n’observe ni le déplacement ni la réception réels : elle enregistre la déclaration du joueur. Le fret virtuel suit le même parcours de confirmation selon les consignes du GN.

Exemple sans barème : dix caisses appartenant à une bande, quatre chargées. Pendant la préparation, six restent disponibles et quatre sont réservées dans l’entrepôt. Après réception, six sont dans l’entrepôt et quatre dans la soute, toutes au même propriétaire. Ni vente ni attribution au manutentionnaire.

Une réservation, même de volume nul, empêche de rendre le bail destinataire. La capacité d’une soute ou d’un entrepôt inclut les arrivées réservées, y compris lors d’un ancien dépôt depuis le sac ou d’une correction MJ. Il faut terminer ou annuler les opérations avant d’indiquer le départ d’un vaisseau, d’archiver une session ou de sceller un épisode. L’historique du lot et le journal logistique enregistrent réservation, réception et annulation. Aucun délai automatique d’expiration, coût en PA ou consommation de carburant n’est ajouté à ces manutentions.

## Carburant à acheter et revendre — 0.30

**Objets et inventaires → Préparer du carburant** ouvre un nouveau modèle en brouillon, catégorie « Carburant », empilable et consommable. L’organisation précise le nom, le type et le conditionnement dans la description et l’unité, puis le volume et le statut légal. Aucun stock, prix, type canonique de carburant ou quantité par bidon n’est créé automatiquement. Il faut publier le modèle et attribuer les lots au vendeur ou au personnage de comptoir.

Le carburant utilise le commerce existant : publication au marché ou vente privée, paiement, remise et réception, revente depuis le sac. Il se stocke et se charge comme les autres marchandises. Un achat payé mais non remis ne peut pas être embarqué. Les quantités commerciales sont celles de l’unité configurée ; changer le catalogue ne modifie pas les lots déjà distribués.

Il peut aussi être préparé dans l’onglet **Objets** des masters existants, avec `categorie = Carburant`, `type = STACKABLE`, `consommable = OUI`, une `unite`, un `volume_unitaire` et la publication souhaitée. Vérifier les intitulés exacts dans le dictionnaire du fichier utilisé. La catégorie reste un libellé commercial ; elle ne déclenche aucun effet caché de voyage. Le plein d’un réservoir, les carburants compatibles, l’entretien, les distances et la consommation par trajet restent à implémenter après choix des règles.

## Suite ouverte

Vaisseaux dans les masters et archives de scénario, transport pour autrui, vente directement depuis un entrepôt ou une soute, dotations directement collectives, cours variables, boutique organisation sans personnage vendeur, frais de douane/corruption et rapprochement réel du stock restent à développer. La recette sur vrais téléphones, plusieurs comptes et environ 60 connexions reste nécessaire avant un GN.
