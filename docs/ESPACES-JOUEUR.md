# Les quatre espaces joueur — GN Engine 0.27

20 octobre 2026. Guide des fonctions effectivement regroupées dans cette version.

## Navigation commune

Après attribution, activation de l’invitation et ouverture du briefing, le joueur retrouve quatre entrées sur ses écrans privés. La navigation reste en haut pendant le défilement. L’entrée active est indiquée visuellement et par `aria-current` ; les quatre entrées et la sous-navigation du personnage conservent une cible tactile d’au moins 44 px. Les données ne sont pas conservées hors connexion.

Le bandeau affiche la session, le personnage, son niveau global et son QR public. Les PA, le prochain renouvellement et les PV apparaissent lorsque ces suivis sont activés. Les valeurs correspondent au dernier chargement ; **Actualiser** recharge l’état autorisé. Le temps restant d’une action déjà commencée continue d’être affiché par les contrôleurs existants, en tenant compte de la pause.

| Espace | Contenus et accès |
| --- | --- |
| Mon personnage | Fiche, histoire, secrets joueur, relations, objectifs, lecture du briefing. Accès secondaires : compétences et classe publiées, sac, informations, carnet, missions personnelles. |
| Mon groupe | Groupes révélés au personnage, rôle, briefing, membres et informations autorisés. Caisse, droits et missions du groupe selon les permissions existantes. Un indépendant voit un message explicite. |
| Action | Saisie unique d’un code ou lien QR de lieu, personnage ou information ; accès aux soins sur soi. Historiques et actions en cours sur les lieux et personnages, aide, pillage et déclarations de capture/liberté existantes. |
| Terminal | Petites annonces et candidatures, missions et contrats accessibles ; marché et primes si l’économie est active. Présentation de la session, consignes pratiques et résumé des règles numériques en vigueur. |

## Sac et missions

Le sac présente les crédits disponibles et le solde total au-dessus des objets. **Donner des crédits** ouvre le parcours de paiement existant : destinataire, montant, motif, aperçu puis confirmation. Le journal complet reste accessible. Les objets conservent les filtres, remises, ventes et retraits existants.

Les contrats personnels sont filtrés dans Mon personnage. Les missions d’un groupe sont visibles uniquement dans les données que le serveur autorise au représentant. Le Terminal permet de retrouver l’ensemble des contrats accessibles. Ces entrées ouvrent les mêmes contrats et les mêmes confirmations, sans duplication ni nouveau financement.

## QR et actions

Le joueur scanne avec l’appareil photo de son téléphone, ou colle le lien dans Action. Un lien reconnaît automatiquement sa cible ; pour un code court, le joueur choisit lieu, personnage ou information. Un ancien lien de badge public ouvre les interactions sur ce personnage. L’ouverture d’une cible ne lance pas d’action et ne consomme pas de PA.

La saisie refuse une autre origine, une autre session, un chemin inattendu, un lien privé d’invitation ou un lien arbitraire. Les autorisations et prérequis sont toujours vérifiés par le serveur à l’ouverture et à l’exécution. Les aperçus, confirmations, réservations, durées, jets et conséquences restent ceux des modules existants.

## Compatibilité et confidentialité

- Routes principales : `play/:session`, `groups/:session`, `action/:session`, `terminal/:session`.
- `actions/:session` et `interactions/:session` restent utilisables et ouvrent Action.
- Les liens existants vers sac, connaissances, carnet, groupes, contrats et cibles restent utilisables.
- Les badges publics et les écrans organisateur ne reçoivent pas la navigation privée.
- Une session sans accès actif affiche le parcours d’accès, sans appeler les outils privés de la destination.
- Une réponse arrivée après navigation ou déconnexion ne réaffiche pas l’ancien contenu privé.
- Le résumé de règles utilise une liste explicite de champs ; aucun dossier de session ni motif MJ n’est envoyé dans ce résumé. Il est absent avant ouverture de la fiche et après révocation de l’accès.

## Périmètre restant

La caméra n’est pas intégrée à la web app : le scan passe par l’appareil photo du téléphone, avec saisie manuelle en complément. La protection/armure, l’XP, les stocks collectifs, les entrepôts et les vaisseaux restent des développements séparés. Le Terminal reprend la présentation et les consignes existantes ; il ne crée pas encore une bibliothèque d’articles d’univers, de nouvelles ou de règlements narratifs. Seule la version des règles PA est exposée ; un historique général des changements de règles reste à développer.

La recette sur plusieurs téléphones et comptes réels reste nécessaire. Les vérifications exécutées pour cette livraison sont consignées dans [VALIDATION-0.27.md](VALIDATION-0.27.md).
