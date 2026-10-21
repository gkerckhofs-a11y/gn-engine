# Douanes et corruption locale — 0.35

Les frais de passage relient les cargaisons à l’économie du GN. Un chargement affiche son tarif avant réservation ; sa réception déplace le stock et règle les bénéficiaires dans la même transaction. Aucun tarif, bénéficiaire ni montant de jeu n’est créé automatiquement.

## Configuration en régie

Ouvrir **Régie de session → Vaisseaux et chargements → Douanes et corruption**. Créer un tarif, vérifier l’aperçu avant/après puis confirmer. Le motif de modification reste réservé au MJ ; le titre, la description et le nom du bénéficiaire sont visibles aux joueurs concernés par le mouvement.

| Paramètre | Fonctionnement |
| --- | --- |
| Nature | Droits de douane ou corruption locale. Les deux types se cumulent ; la corruption n’annule pas les droits de douane. |
| Mouvement | Vers une soute (`LOAD`), depuis une soute (`UNLOAD`) ou entre deux soutes (`TRANSSHIP`). |
| Marchandise | Un modèle d’objet publié, ou tous les objets. Le modèle du lot détermine l’application du tarif. |
| Montant fixe | Prélevé une fois par mouvement confirmé. |
| Montant unitaire | Multiplié par la quantité commerciale du lot déplacée, sans utiliser le volume de soute, le cours de référence ni le prix d’achat. |
| Bénéficiaire | Portefeuille d’un personnage, caisse de bande ou retrait explicite des crédits de la circulation. |
| Activation | Un tarif désactivé reste dans la régie et l’historique. Il ne s’applique plus aux nouvelles réservations. |

Tous les montants sont des entiers positifs ou nuls dans la monnaie fictive de la session. Les calculs hors plage sont refusés. Au plus 50 définitions de tarifs sont autorisées par session : modifier ou désactiver les anciennes définitions au besoin.

Les tarifs de toutes marchandises et ceux d’un objet précis sont **additionnés** lorsqu’ils correspondent au même mouvement. Un mouvement entre deux soutes utilise uniquement les tarifs `TRANSSHIP` : il ne compte pas comme un chargement puis un déchargement. Un transfert sac ↔ entrepôt ne déclenche aucun tarif de ce module.

Le bénéficiaire doit posséder un compte valide dans la même session. Pour une bande secrète, seul l’alias de sa caisse apparaît dans le détail public ; choisir cet alias avec soin. Le paiement à ce bénéficiaire ne révèle ni ses membres ni son solde et ne donne aucun accès à sa caisse. Il ne nécessite pas un droit de dépense sur le compte bénéficiaire.

## Parcours joueur

1. Depuis le QR d’un lot ou le manifeste, choisir la quantité et la destination autorisée.
2. Vérifier le chargement : quantité, volume, source, destination, chaque ligne de frais, bénéficiaires et total.
3. Confirmer la réservation. Le stock reste à la source mais devient indisponible ; la capacité est réservée à destination. **Aucun crédit n’est débité ou réservé à cette étape.** Le tarif est alors conservé sur le chargement.
4. Déplacer réellement les caisses selon les règles du GN. En cas de séparation de lot, poser le nouveau QR sur les unités transférées.
5. À réception, choisir son portefeuille ou une caisse autorisée. Vérifier le récapitulatif puis cocher la confirmation de réception physique et payer. Le stock et tous les paiements sont enregistrés ensemble.

Le joueur qui réceptionne peut différer de celui qui a réservé, à condition de conserver les droits de lecture et de dépôt à destination. Le portefeuille choisi lui est personnel ou appartient à une bande pour laquelle il possède le droit `payWallet`. Sans `readWallet`, l’aperçu ne révèle aucun solde. Le paiement ne change ni le propriétaire du lot ni celui du vaisseau.

Le montant total doit être disponible au moment de la réception. Les crédits réservés ailleurs sont indisponibles. Si le compte payeur est également bénéficiaire, ses lignes sont compensées dans une seule écriture nette ; le montant brut reste exigé en disponible avant règlement et le récapitulatif présente le solde final lorsque les droits le permettent.

Une annulation libère la réservation sans frais ; les biens restent à la source. Si des caisses ont déjà été déplacées, il faut les y ramener. Le MJ peut annuler un chargement bloqué avec un motif privé. Une réception déjà confirmée ne peut pas être annulée par ce parcours : les corrections économiques MJ existantes restent des opérations distinctes, journalisées.

## Exemple de jeu à configurer

Exemple indicatif, **non installé en production** : douane de 10 crédits fixes + 2 par caisse, et corruption de 5 crédits fixes. Pour 4 caisses chargées vers une soute, le récapitulatif annonce 18 crédits de douane et 5 de corruption, soit 23. Le préfet peut être bénéficiaire d’une ligne ; la caisse de la mafia d’une autre. Annuler avant réception coûte zéro ; réceptionner règle 23 crédits une seule fois.

Scinder le chargement en plusieurs mouvements répète chaque montant fixe. L’organisation choisit ce barème en fonction de l’effet de jeu souhaité. Le carburant commercial et les recharges laser sont traités comme les autres objets si un tarif les vise ; le plein d’un réservoir n’est pas un mouvement de cargaison et ne déclenche pas ces frais.

## Conditions figées et protection des écritures

- Modifier, désactiver ou ajouter un tarif invalide les aperçus de réservation concernés. Le joueur doit vérifier le nouveau montant avant de réserver.
- Une réservation confirmée garde ses tarifs, sa monnaie et ses bénéficiaires annoncés. Changer la régie n’augmente pas sa facture et ne l’efface pas. Pour appliquer d’autres conditions, annuler puis préparer un nouveau mouvement.
- À la réception, les comptes bénéficiaires doivent encore être valides. Un solde insuffisant, une caisse inaccessible, un bénéficiaire indisponible ou un dépassement de capacité monétaire bloque toute l’opération, sans paiement partiel.
- Un changement de solde ou de droits après l’aperçu impose une nouvelle confirmation. Les doubles clics et réessais d’une même commande ne créent pas un second paiement. Deux issues concurrentes ne peuvent pas déplacer et facturer deux fois le même stock.
- La réception exige une session en jeu, l’économie activée et les permissions de santé pour le transfert et le paiement. L’annulation reste possible hors jeu selon les droits de manutention existants. Aucun PA, délai de compétence ou jet de dé n’est ajouté à ce parcours commercial.
- Les mouvements réservés avant cette version, dépourvus de tarif enregistré, restent gratuits. Aucun recalcul rétroactif n’est effectué.

Le reçu apparaît sur le chargement. Le journal des comptes concernés affiche « Droits de passage » et la référence du chargement. Le journal MJ conserve les montants, bénéficiaires, crédits retirés de la circulation, acteur et lien au mouvement ; les historiques publics des comptes n’exposent pas les motifs MJ.

## Sessions, campagne et périmètre

Les tarifs se règlent dans la **régie de session**. Ils suivent la continuité d’une campagne avec les comptes et les soldes. Les écritures historiques restent dans l’épisode où elles ont été effectuées ; le nouvel épisode reprend les soldes sans refaire les paiements. Tout chargement ouvert doit être reçu et payé ou annulé avant clôture de campagne.

Les quatre masters XLSX, les versions de scénario et leurs archives n’intègrent pas encore la création de ces tarifs. Une session indépendante démarre sans tarif ; son organisation les configure en régie. Un import des masters existants ne sert pas à gérer les tarifs et ne les remplace pas. Leur ajout aux masters constitue la prochaine extension de configuration.

Ce lot ne modifie pas le prix négocié des marchandises, les loyers, les coûts de carburant des trajets ni les effets économiques existants. Une suspension du commerce bloque les ventes selon ses règles ; elle ne bloque pas implicitement les déplacements de stock. Les interdictions de départ s’appliquent aux voyages. Les contrôles douaniers avec détection, saisie, exemption, pot-de-vin négocié ou compétence de contrebande restent des règles à définir.

La recette privée sur téléphone et un essai avec environ 60 joueurs restent nécessaires. Les tests automatisés vérifient les comptes, autorisations, collisions et confirmations ; ils ne prouvent ni le déplacement réel des caisses ni la fluidité en conditions de GN.
