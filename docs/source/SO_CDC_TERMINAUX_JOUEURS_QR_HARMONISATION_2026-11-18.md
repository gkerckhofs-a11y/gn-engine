# SPACE OUTLAWS — Harmonisation des terminaux joueurs et des accès par lieu

**Cahier des charges complémentaire — V1.0, 18 novembre 2026**  
**Statut :** spécification fonctionnelle pour le prochain chantier de développement ; **aucune modification de moteur, de données ou de Firebase par la rédaction**.  
**Périmètre :** GN Engine / Space Outlaws — terminal personnel, terminaux de lieu, Sabacc à la Cantina, cours et Bourse au comptoir, spatioport, atelier, docks et modules associés.  
**Dépôt :** [gkerckhofs-a11y/gn-engine](https://github.com/gkerckhofs-a11y/gn-engine).  
**Base de lecture inspectée :** \`main\` \`a59ec255748de8c236f861e6a3ea3f29bbd44088\`, publié sur Firebase le 18 novembre 2026 selon le [rapport PR #58](https://github.com/gkerckhofs-a11y/gn-engine/pull/58) et le [workflow de déploiement #44266765917](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/44266765917). L'état exact devra être recontrôlé par l'agent avant chaque écriture.

## 1. Objet de la demande et décision de conception

### 1.1 Objectif [VALIDÉ AVEC L'ORGANISATEUR]

**Distinguer le terminal personnel permanent des terminaux d'action physiques.** Le terminal personnel sert à connaître son personnage, échanger des informations et suivre ses affaires ; les nouvelles actions qui exigent fictionnellement un bâtiment s'ouvrent **dans ce bâtiment** en scannant son QR, avec les compétences, codes et autorisations appropriés.

La présence réelle est un **engagement de fair-play** : ne pas utiliser le lien ou la photo d'un QR loin du lieu. Aucun GPS, traçage physique ou QR renouvelé en permanence n'est exigé.

**Décisions confirmées dans l'échange du 18/11/2026 :**
- **Sabacc :** le joueur rejoint une table en **scannant le QR de cette table, à la Cantina**. Supprimer le raccourci général « Sabacc — Cantina » du terminal personnel qui permet d'ouvrir librement l'accueil Sabacc. Il ne doit pas être nécessaire de rescanner entre chaque tour ou après une reconnexion à **la même table déjà rejointe**.
- **Cours généraux :** consultables par **tous les joueurs**, mais **au comptoir après scan du QR**, et non dans le terminal général depuis n'importe où.
- **Bourse galactique avancée :** réservée aux **Courtiers habilités**, à consulter et exploiter **au comptoir**, avec les permissions natives supplémentaires.
- **Services :** conserver la consultation des dossiers personnels à distance ; réserver les nouvelles opérations locales au bon lieu (spatioport, atelier, docks, bureau impérial, etc.), **sans casser les parcours de sécurité ni les interactions de terrain**.

**Les répartitions détaillées des autres services ci-dessous sont des exigences de mise en œuvre proposées**, dérivées de ces décisions et du fonctionnement du moteur ; elles ne changent pas les barèmes du Livre des règles V0.7.

### 1.2 Principes structurants

1. **Consulter ≠ agir.** On peut consulter un bien, un contrat ou une information déjà acquise sans pouvoir initier depuis n'importe où une mutation qui nécessite une présence locale.
2. **Présence ≠ permission.** Un QR donne un contexte de lieu, mais jamais une licence de Courtier, une compétence Pilotage, un mandat d'équipage, une propriété de stock ou un droit MJ.
3. **Code de table ≠ clé permanente de lieu.** Sabacc réutilise son propre QR de table existant ; le raccord à la Cantina doit éviter deux scans inutiles et préserver les mains engagées.
4. **Aucun module parallèle.** Réemployer \`src/core/contextual-access.mjs\`, les contrôleurs natifs, les QR, la régie PC et les systèmes de comptes/stock/reçus.
5. **Sécurité serveur.** Masquer une carte ne sécurise pas l'action. Toute mutation locale doit être refusée côté serveur hors contexte valide, y compris sur une URL enregistrée ou un appel API direct.
6. **Rétrocompatibilité.** Ne pas changer implicitement les sessions historiques ni les Masters publiés ; adoption explicite/versionnée, et diagnostics de configuration manquante.
7. **Progression autonome de l'agent.** Développer par tranches verticales, tests ciblés, PR brouillon, **sans fusion dans \`main\` ni déploiement Firebase** sans autorisation.

## 2. État vérifié avant chantier — audit du code \`main\`

Les faits de cette section décrivent le **code consulté**, pas une certification d'une session réelle configurée dans la régie.

| Composant | Constat sur le code actuel | Écart fonctionnel |
|---|---|---|
| \`web/player-terminal.mjs\` | Ajoute \`sabacc\` lorsque \`sabaccHome.enabled\`; lien vers \`/sabacc/\`. | Accueil accessible directement depuis le terminal personnel. |
| \`web/player-terminal.mjs\` | Ajoute \`public-prices\` dès \`economyEnabled\`, pour toutes les classes. | Absence d'obligation de présence au comptoir. |
| \`web/app.mjs\` + \`src/core/prices.mjs\` | \`commodityMarket\` renvoie les cours publiés à un joueur autorisé de la session, sans garde de lieu. | L'API permet la consultation distante des cours à actualisation directe. |
| \`web/player-terminal.mjs\` + \`src/core/planet-markets.mjs\` | Bourse affichée pour \`isBroker\`; \`galacticMarkets\` vérifie également le Courtier côté serveur. | Filtrage métier correct ; manque le contexte de comptoir pour la vue détaillée et les opérations locales. |
| \`src/core/contextual-access.mjs\` | \`localOperations\` limitées à \`dockEntry\`, \`shop\`, \`prepareShopPurchase\`, \`buyShopOffer\`. Sans \`binding\`, contrat natif historique maintenu. | Le contexte local n'est pas encore transversal. |
| \`src/sabacc/service.mjs\` | Table/adhésion exigent le jeton QR de la table ; pas de garde \`localAccess\` Cantina. Les participants déjà assis conservent une présence Sabacc propre. | QR Sabacc natif utile, mais aucun rapprochement systématique avec le lieu physique. |
| \`web/player-terminal.mjs\` | Fiches de vaisseaux, soutes, maintenance, modules et douanes mélangent suivi et commandes. | La navigation ne différencie pas clairement consultation permanente et opérations de quai/atelier. |
| \`docs/SO-ACCESS-AC06-VALIDATION.md\` | AC-06 documente les limites de la recette terrain et des contrôles douaniers de cellule. | Ne pas annoncer une couverture terrain ni des douanes étendues inexistantes. |

**Sources de vérification** : chemins ci-dessus au commit de base, \`test/player-terminal.test.mjs\`, \`test/contextual-access-ui.test.mjs\`, \`docs/SO-CONTEXTUAL-ACCESS-57.md\`, \`docs/SO-ACCESS-AC06-VALIDATION.md\`, [PR #58](https://github.com/gkerckhofs-a11y/gn-engine/pull/58). Vérifier HEAD, CI et éventuelles branches concurrentes au démarrage.

## 3. Organisation cible de l'espace joueur

Conserver la navigation de premier niveau déjà validée : **Identité / Action / Terminal / News**. Ne pas créer un nouvel onglet permanent par bâtiment.

### 3.1 Terminal personnel — accessible partout [CIBLE]

Regrouper dans des familles courtes et lisibles :

- **Mon activité** : dossiers en cours, contrats signés/proposés, demandes de transport et offres reçues, opérations en attente, alertes me concernant, suivi des voyages et réparations, reçus douaniers, preuves acquises.
- **Mes ressources** : crédits, sac et objets personnels, patrimoine/stock **déjà autorisé à la lecture**, soutes et vaisseaux que je possède ou pour lesquels j'ai un mandat, caisses de groupe selon droits.
- **Mes informations** : Holopedia, missions/News, messages de groupe, coordonnées et informations **déjà acquises**, registre des identités si autorisé, historique et cours **mémorisés** éventuellement acquis sur place (voir §5).
- **Accéder à un lieu** : une seule entrée évidente « Scanner un terminal de lieu » ouvrant la caméra et la saisie du code de secours.

Une notification ou un dossier en cours peut toujours être ouvert depuis le terminal ; **le bouton « Exécuter / Acheter / Vendre / Réparer / Décoller » est alors absent ou désactivé** tant que le contexte local correspondant n'est pas actif, avec indication du lieu à rejoindre.

**Ne pas supprimer les suivis, preuves, historiques ni opérations commencées** lorsqu'un joueur quitte le lieu. Les titres, paiements, réservations et contrats déjà validés persistent.

### 3.2 Écran après scan

Afficher :
- nom et catégorie du lieu, QR/terminal actif et durée restante ;
- services proposés selon le personnage et la version de la session ;
- **consultations publiques**, puis **actions professionnelles disponibles**, puis **actions verrouillées** avec motif compréhensible sans dévoiler de secrets ;
- retour évident au terminal personnel ;
- si session expirée : « Retournez au terminal physique et rescanner », sans perdre les données acquises.

Aucun écran ne doit proposer une action sans contrôleur métier et permission serveur correspondants. Les codes/identifiants sensibles restent absents du QR public et du rendu non autorisé. Réutiliser les exports PNG/SVG/PDF/ZIP et la saisie manuelle déjà en place.

## 4. Matrice fonctionnelle : consultation permanente et actions sur place

Cette matrice est la cible fonctionnelle de la refonte. Elle **n'accorde jamais de compétence, classe, licence ou mandat nouveau**.

| Service | Depuis le terminal personnel, partout | Après QR local | Condition métier restante |
|---|---|---|---|
| **Sabacc — Cantina** | Suivre/reprendre **sa table déjà rejointe** ; solde et historique personnel éventuel sans découverte de nouvelles tables. | **QR de table Sabacc** : rejoindre une nouvelle table, s'asseoir, jouer. | Jeton de table natif, règles du Sabacc, sièges, mises, compte, session et accès éventuels. |
| **Cours publics — Comptoir** | Pas de **cours actualisés en direct**. Historique/snapshot personnel, si mémorisation prévue par ce lot. | Lire et actualiser les cours publics de marchandises. | Tout joueur actif éligible à la session ; aucun droit Courtier requis. |
| **Bourse galactique — Comptoir** | Voir ses commandes, contrats, lots, quittances et informations déjà obtenues. | Consulter **cours planétaires détaillés**, historiques et offres ; initier achats/ventes. | Courtier (\`isBroker\`) + règles de marché, crédits, offres, ports, stock et mandats. |
| **Boutiques d'objets — Comptoir** | Commandes, paiement/achat déjà conclu, historique, suivi « à retirer », sac. | Consulter offres actualisées, préparer/confirmer achat nouveau ; retrait selon protocole. | Catalogue, stock, prix, circuit \`PERSONAL\`, crédit et mode livraison existant. |
| **Négociation COU-02 / contact COU-03** | Messages, contrats, informations acquises et suivi des démarches existantes. | Démarrer négociation ou rechercher un fournisseur/contact commercial dans le point de service approprié. | Niveau de compétence canonique et disponibilité du contenu MJ. |
| **Vaisseaux — Spatioport** | État du vaisseau, position, équipage, missions, voyages actifs, reçus, invitations. | Préparer nouveau trajet, opérations de quai, carburant ou autorisations de décollage concernées. | Pilotage \`PIL-01\`, mandat/équipage, localisation du vaisseau, règles du vol et validation MJ. |
| **Carte galactique** | Consulter les destinations et routes **connues** par un personnage possédant \`PIL-01\`. | Calcul ou validation d'un **nouveau voyage réel** depuis le spatioport lorsque cette opération requiert le quai. | Compétence PIL-01 et connaissances/mandats natifs. Ne pas supprimer la consultation personnelle. |
| **Cockpit / voyage actif** | Continuité du suivi autorisé ; commandes dans le contexte propre au cockpit une fois activé. | QR de spatioport pour initier le départ, **pas de rescans de quai pendant un voyage déjà commencé**. | Procédure MJ existante, cockpit et pilote désigné. |
| **Atelier** | Voir devis, travaux confiés, demandes/accords et résultats. | Démarrer ou réaliser entretien, réparation, montage/démontage de modules qui exigent un atelier. | Compétence MEC-02/03 selon action, présence d'un vaisseau compatible, consentement, PA et coûts canoniques. |
| **Docks / cellules** | Voir ses entrepôts, titres, capacités, lots dont la lecture est autorisée, transferts et alertes. | Ouvrir cellule, initier chargement/déchargement, transfert entre soute à quai et cellule, espionnage/vol si admissible. | Accès local, code/clé ou INF-01, droits sur source et destination, capacité, règles du vol validées. |
| **Formalités impériales** | Voir licences/consentements/reçus personnels, dossiers et recours. | Initier les nouvelles procédures officielles au bureau approprié ; inspection effective **à l'emplacement du bien**. | Habilitation spécifique et règles douanières natives. Aucune saisie nouvelle implicite. |
| **Hospice** | Voir son état de santé, prescriptions, historique et demandes. | Services de soin de comptoir/installation selon scénarisation. | MED-xx et soins existants ; **les secours d'urgence de terrain restent réalisables au point de jeu** avec leurs QR propres. |
| **Cantina — renseignements** | Lire ses rumeurs/informations déjà acquises. | Obtenir de nouveaux contacts/offres réservés par QR de service, si préparés. | Visibilité MJ et codes/compétences selon scénario ; ne pas créer d'informations gratuites. |
| **Missions / primes / News** | Lire annonces et offres auxquelles le personnage a droit, accepter/répondre selon parcours narratif existant si non local. | Actions de terrain/localisées seulement lorsqu'une mission désigne un point QR. | Visibilité de classes (ex. Traqueur), preuves, contrats et droits natifs. |
| **Messagerie / groupe / sac / crédits** | Accessibles partout selon droits personnels ; donner un objet ou répondre à un message conserve son mode d'interaction canonique. | Aucune présence de lieu imposée sans raison narrative définie. | Vérifications de propriétaire, groupe, fonds et sécurité. |

**Important :** cette matrice n'est pas une promesse que tous les modules ont actuellement une porte QR. L'agent réalise chaque raccord, identifie les opérations réellement localisables et signale les exceptions sans masquer artificiellement des fonctionnalités indispensables.

## 5. Cours publics et informations commerciales — règles détaillées

### 5.1 Consultation des cours [VALIDÉ]

- **Tous les personnages** doivent pouvoir consulter le tableau des **cours publics** après scan du QR du **Comptoir** et établissement d'une présence locale valide.
- Le terminal personnel **ne comporte plus de carte « Cours publics » accessible à distance**.
- La route \`#/public-prices/{sessionId}\` et l'action serveur \`commodityMarket\` doivent appliquer une permission locale dès qu'une nouvelle session/version adopte la fonctionnalité. Une URL conservée dans les favoris, le bouton « Actualiser » et les appels API directs ne contournent pas le contrôle.
- Le tableau « public » ne dévoile ni secrets de Courtiers, ni inventaires privés, ni comptes marchands. Il ne débloque pas les transactions commerciales avancées.

### 5.2 Bourse avancée [VALIDÉ]

- La **classe Courtier effective** reste exigée côté serveur pour \`galacticMarkets\`, les achats distants et les ventes/rachats, conformément aux droits canoniques du moteur.
- La **consultation actualisée du tableau des marchés par planète**, l'ouverture de nouvelles offres et les commandes professionnelles requièrent un **contexte de Comptoir actif** en plus de la classe et des autres règles.
- Pour les **opérations distantes contractuelles déjà en cours** (réponses, confirmations, suivi), préciser action par action celles qui sont de simples échanges d'information et celles qui impliquent une nouvelle transaction exigeant le comptoir ; **ne pas interrompre un contrat ou un voyage existant uniquement parce que la session QR expire**.
- Les connaissances/coordonnées de destinations achetées ou découvertes restent acquises et consultables par leurs titulaires selon leurs droits. Les codes de navigation et l'autorisation d'atterrissage restent distincts.

### 5.3 Informations obtenues sur place [PROPOSITION D'ERGONOMIE]

Prévoir éventuellement un **instantané horodaté des cours consultés** dans « Mes informations » : lisible hors comptoir, **non rafraîchi à distance** et explicitement daté (« cours relevés le… »). Ne pas transformer cet instantané en cours applicable à un achat ultérieur ; le prix reste recalculé côté serveur lors de l'opération autorisée. Si le stockage personnel exige un modèle supplémentaire, l'agent peut traiter cette option après les gardes métier prioritaires. Pas d'export de carnet de cours contenant des informations privées.

## 6. Sabacc — QR de table comme porte d'entrée de la Cantina

### 6.1 Ce qui doit changer [VALIDÉ]

- Retirer du menu personnel la **carte générale « Sabacc — Cantina »** et le lien libre vers \`/sabacc/\`, y compris de la page d'accueil du personnage.
- **Une nouvelle participation** démarre en scannant **le QR physique d'une table à la Cantina** ; garder le système Sabacc natif (\`tableId\` + \`qrToken\`) pour l'accès à la table.
- Ne pas créer un **double parcours obligatoire** « scanner le QR de la Cantina, puis scanner le QR de table » : le QR de table fait office de point d'accès physique convenu pour rejoindre une partie.
- Le jeu **continue sans rescans** pendant la main, les mises et les tours. Une personne déjà assise peut retrouver sa **même table** après changement de page, fermeture du navigateur ou reconnexion, à partir de sa présence Sabacc native, tant que ses droits sont valides. L'accès de reprise **ne donne pas la liste des autres tables**.
- Changer de table ou participer à une **nouvelle** table demande son QR spécifique. La rotation d'un QR et la révocation d'accès doivent respecter les protections existantes et ne pas effacer les mises ni laisser un joueur bloqué dans une main sans recours.
- La régie MJ conserve l'administration des tables, les QR imprimables, la rotation, les modèles et la récupération d'urgence.

### 6.2 Contrôles et risques

- **Un lien vers une table n'est pas une preuve technique de présence physique.** La règle de fair-play s'applique ; ne pas promettre de géolocalisation ou de détection de photo.
- Vérifier côté serveur \`sabaccTable\`, \`sabaccJoin\`, \`sabaccReady\`, \`sabaccPlay\`, \`sabaccTick\` et l'état de reprise : la continuité d'un siège existant peut s'appuyer sur \`sabaccPresence\`; aucune commande ne doit être ouverte à un personnage qui n'a ni jeton valide ni siège autorisé.
- Préserver Sabacc en **mode LOCAL hors GN**, qui constitue un produit distinct, et ne pas lui appliquer les restrictions de lieu des sessions Space Outlaws.
- Les opérations d'administration Sabacc ne dépendent pas d'un scan Cantina lorsqu'elles sont exercées par un MJ habilité dans sa régie.

## 7. Extension du moteur d'accès transversal

### 7.1 Contrat de permission

Réutiliser les opérations locales déjà existantes (\`dockEntry\`, \`shop\`, \`prepareShopPurchase\`, \`buyShopOffer\`) et étendre le catalogue de permissions à **des actions métier réellement raccordées** : cours, Bourse, transactions, navigation/quai, atelier, docks et formalités au rythme des lots de développement. **Ne jamais autoriser un nom d'opération sans service serveur effectif**.

Chaque règle doit associer :

\`sessionId + terminalId + placeId + action + resourceId (+ optional subResource) + actor\`

Le garde serveur contrôle, lors de chaque nouvelle opération locale : session/étape/STOP, version, présence locale du personnage, validité de la session QR, politique par action, classe/compétence, licences/codes/clés et **mandat réel sur la ressource**. Les prix, fonds, stocks, niveaux de compétence, PA, durées, reçus et propriétés restent au moteur métier.

Pour des **lectures publiques** comme \`commodityMarket\`, créer un garde en lecture et une projection minimale, sans journaliser des secrets privés. Pour une **mutation**, vérifier contexte et règles natives dans **la même transaction** que les effets.

### 7.2 Éviter les nouveaux accès cachés ou libres

Le comportement actuel de \`localAuthorization\` retourne \`null\` lorsqu'aucune liaison n'existe, pour préserver les sessions historiques. **Ne pas retirer ce comportement globalement**, car cela casserait les versions existantes.

Pour les **nouvelles sessions qui activent le mode « lieux obligatoires »** :
- imposer au MJ une configuration explicite des terminaux requis avant la mise en jeu ;
- refuser une **nouvelle opération locale** sans \`binding\` valide au lieu de retomber silencieusement sur l'accès historique ;
- conserver le fonctionnement natif des **anciennes versions**, non migrées ;
- afficher dans le dashboard MJ un diagnostic « opération locale sans terminal associé » ;
- prévoir un mode préparatoire/test explicite pour les MJ, sans ouvrir de faux droits joueur.

**Aucune modification destructive ni activation rétroactive** des anciennes sessions. La sémantique exacte du marqueur versionné est à aligner sur les conventions de publication existantes plutôt que créer un flag concurrent.

### 7.3 Accès, expiration et continuité

- Conserver les durées de session configurables et les contrôles serveur existants. Le scan constitue une convention RP de présence sur site.
- Une consultation déjà acquise reste dans le patrimoine informationnel du joueur ; une nouvelle consultation live exige le lieu.
- Une réservation/commande **déjà engagée** se poursuit selon ses règles métier ; en cas d'expiration du QR, ne pas dupliquer, annuler arbitrairement ou facturer deux fois. Distinguer **initier une opération** et **réceptionner/terminer une opération native**.
- Les raccourcis depuis un contrat, une notification ou l'historique doivent respecter la même vérification que les liens d'un terminal de lieu.
- L'accès à un cockpit en vol, les soins d'urgence et les contrôles/réparations liés à un événement en cours ne doivent pas se retrouver impossibles par changement de contexte QR.

## 8. Régie MJ — paramétrage et vérification

### 8.1 Nouvelle grille « Modules × Lieux »

Créer un écran synthétique dans **Lieux & Terminaux** (dashboard PC), regroupant **les opérations**, plutôt que seulement les noms de bâtiments :

| Colonne | Contenu |
|---|---|
| Module / opération | Exemple : cours publics, Bourse Courtier, achat boutique, entretien, cargaison |
| Type | Consultation live / nouvelle action / dossier personnel / exception d'urgence |
| Terminal | Comptoir, table Sabacc, spatioport, atelier, docks ou lieu choisi |
| Public | Tous / classe / niveau de compétence / licence / code / clé / mandat |
| Activation | Actif, en préparation, non raccordé, désactivé |
| Contrôle serveur | Garde effectivement raccordé ? Diagnostic obligatoire |
| Recette MJ | Tester sous identité d'un personnage sans effet réel |

Le MJ doit pouvoir obtenir une **vue « ce que voit ce personnage, depuis ce lieu »** et identifier les services dont l'accès ne répond pas à la nouvelle politique.

### 8.2 QR et configurations

- Conserver les exports PNG haute résolution, SVG nu, PDF A4, ZIP.
- Les QR Sabacc restent **des QR de table**, gérés par le module Sabacc ; les QR des autres lieux restent dans la régie de terminaux.
- Pouvoir désactiver le terminal d'un lieu, révoquer un code ou des droits, et afficher le motif d'un refus au MJ.
- Distinguer **QR d'identification du lieu** et **QR de ressource/lot**, qui ne donne pas de permission.
- Ajouter une vue de contrôle des **opérations sans liaison locale** pour les sessions dont le mode contextuel est activé. Ne pas masquer les erreurs de configuration par un simple bouton désactivé.

## 9. Ergonomie et contenu RP / HRP

- Sur mobile : **moins de cartes** dans le terminal personnel, libellés RP courts et explications HRP en italique si nécessaires. Priorité à « Mes affaires » et « Scanner un lieu ».
- Ne pas présenter « Services du port » comme une liste de boutiques accessibles de n'importe où. Préférer « Mes dossiers » et « Mes accès sur place ».
- Après scan, montrer les **services du lieu uniquement**, sans recopier l'ensemble du terminal personnel.
- Exemple de refus compréhensible : « Pour consulter les cours actualisés, rendez-vous au comptoir et scannez son QR. »
- Si l'accès est professionnel : « Ce service exige une licence de Courtier » plutôt que révéler des offres/quantités privées.
- Depuis un écran ouvert sans QR : bouton « Aller au terminal du lieu » ouvre l'instruction/scan, **pas un accès distant à l'action**.
- Sur un lien historique/notification : basculer sur le **suivi** autorisé plutôt que provoquer une erreur 403 sans explication quand cela est possible.
- Préserver la navigation **Identité / Action / Terminal / News**, les capacités de lecture du sac, les missions et la messagerie de groupe.

## 10. Lots de développement recommandés

Le prochain agent doit lire \`AGENTS.md\` et les références, **vérifier HEAD et travaux concurrents**, puis travailler sur **une nouvelle branche de code dédiée**, avec PR en brouillon. Aucune reprise aveugle d'un ancien état.

| Lot | Parcours vertical complet | Contrôles ciblés |
|---|---|---|
| **TQ-01 — Cours et comptoir** | Retirer cours live du terminal personnel ; \`commodityMarket\` accessible après scan du comptoir à tous, garde lecture serveur ; Bourse \`galacticMarkets\` réservée au Courtier + comptoir. | Non-Courtier au comptoir : cours oui, Bourse non ; accès direct/expiré refusé ; anciennes sessions préservées. |
| **TQ-02 — Sabacc Cantina** | Retirer l'accès générique ; nouvelle table par QR natif ; reprise fiable de la même table, sans rescans à chaque tour ni découverte à distance. | QR valide/invalide/rotatif ; reprise siège/mise ; sessions GN vs LOCAL ; aucune perte d'une main engagée. |
| **TQ-03 — Terminal personnel** | Reclasser cartes en dossiers, ressources, informations, scanner ; ne plus présenter une action locale comme libre ; écrans de refus et liens intelligibles. | 8 classes, compétences secondaires, groupes/mandats, pause/STOP, mobile, historique. |
| **TQ-04 — Spatioport et atelier** | Préserver consultation d'un vaisseau/mission ; imposer QR au lancement des nouvelles opérations de quai et d'atelier concernées ; exceptions cockpit/vol actif. | PIL-01, mandats, pièces, réparations, vols en cours, arrêt sécurité, API direct. |
| **TQ-05 — Docks, douanes, services** | Harmoniser lancements de transferts/contrôles là où le moteur supporte l'opération ; conserver vols/surveillance/stock actuels ; extension limitée des autres services réellement disponibles. | Stock et droits, pas de téléportation ni double paiement, contrôle/saisie séparés. |
| **TQ-06 — Régie & recette intégrée** | Matrice de raccordement, diagnostic des bindings, test MJ en lecture seule, QR, vérification complète de la navigation. | Tests ciblés à chaque lot, CI complète au jalon, revue UX mobile/PC et protocole d'essai humain. |

Ordre pragmatique : **TQ-01 puis TQ-02 en priorité**, car ce sont les deux écarts signalés par l'organisateur. Les autres lots suivent sans interrompre les fonctions natives tant que leur garde contextuel n'est pas entièrement opérationnel.

### Tests de réception minimaux

| ID | Scénario de recette | Résultat attendu |
|---|---|---|
| TQ-01 | Joueur non Courtier sans scan demande \`commodityMarket\` en session contextuelle | Refus local sans prix live |
| TQ-02 | Même joueur scanne le Comptoir puis consulte les cours | Accès autorisé et prix réellement publiés |
| TQ-03 | QR expiré, lien \`public-prices\` conservé | Nouveau chargement refusé, sans fuite |
| TQ-04 | Courtier sans scan demande \`galacticMarkets\` | Refus côté serveur |
| TQ-05 | Courtier au comptoir demande \`galacticMarkets\` | Tableau détaillé autorisé selon droits |
| TQ-06 | Non-Courtier au comptoir demande \`galacticMarkets\` | Refus \`FORBIDDEN\`, pas de données privées |
| TQ-07 | Joueur ouvre son terminal personnel | Pas de carte « Cours publics » live ni « Sabacc — Cantina » générale |
| TQ-08 | Joueur rejoint table GN Sabacc via son QR, sans carte terminal | Accès possible selon statut/jeton/sièges/solde |
| TQ-09 | Joueur déjà assis revient après fermeture/reconnexion | Même table et mises retrouvées sans rescanner |
| TQ-10 | Joueur tente d'ouvrir une nouvelle table Sabacc sans son QR | Aucune nouvelle participation |
| TQ-11 | QR Sabacc révoqué pendant une main | Politique de reprise/continuité claire ; aucune mise perdue ni accès de tiers |
| TQ-12 | Sabacc en mode \`LOCAL\` indépendant | Aucun changement d'accès hors GN |
| TQ-13 | Consulter fiche vaisseau à distance | Données personnelles autorisées conservées |
| TQ-14 | Départ/chargement initié sans QR requis dans session nouvelle | Refus serveur sans mutation |
| TQ-15 | Intervention en cours lorsque le QR expire | Suivi et résolution native possibles sans double PA/coût |
| TQ-16 | Médecin effectue un secours d'urgence en terrain | Pas de blocage artificiel par QR d'hospice |
| TQ-17 | Ancien Master sans activation du nouveau mode | Comportement historique et droits préexistants préservés |
| TQ-18 | Nouveau mode activé avec opération locale non liée | Diagnostic MJ bloquant avant mise en jeu ; pas de contournement par absence de binding |
| TQ-19 | Code de QR de lieu partagé hors site | Rappel de fair-play ; pas de GPS revendiqué |
| TQ-20 | Docks et vol de lot régressés | Destination cellule/soute obligatoire, volume/PA/quota/douanes conservés |
| TQ-21 | Accès MJ à la régie sans scan joueur | Autorités MJ natives conservées ; journalisation appropriée |
| TQ-22 | Lien/URL vers opération hors classe ou sans permission | Refus serveur, même si interface masquée |
| TQ-23 | Comptoir vendu/mission prolongée, session QR change de lieu | Contrat/reçu non dupliqué ni annulé rétroactivement |
| TQ-24 | Parcours Android/iPhone avec QR papier et plusieurs joueurs | À effectuer en recette terrain ; ne pas présenter la CI comme preuve réelle |

## 11. Exigences de sécurité et de qualité

- Aucune modification des taux, prix, volumes, règles PA, compétences, douanes, vols, crédits ou règles canoniques V0.7.
- Aucun nouveau traitement de stockage ou de marché indépendant des services natifs.
- Contrôles transactionnels et idempotents pour toutes les mutations ; lecture minimum autorisée et projection sans secrets.
- Les prix/course live ne doivent pas survivre hors contexte dans un rafraîchissement en arrière-plan ; une capture d'écran ou une information **déjà vue** demeure sous le contrôle du joueur, sans tentative de surveillance.
- Séparer classes et compétences réelles (Courtier ≠ compétence COU secondaire, Pilote ≠ possession d'un vaisseau, Rogue ≠ INF-01).
- Conserver les traces et les reçus, la reprise d'épisode, la compatibilité Masters publiés, et les protections des sessions anciennes.
- Exécuter build et tests ciblés de succès **et de refus** par tranche, CI complète sur SHA exact au jalon, vérifications ciblées des interfaces mobile et PC.
- **Ne pas prétendre à une recette humaine ou à un essai avec 60 joueurs** en l'absence de ces tests.

## 12. Sorties attendues de l'agent

1. Une **PR de code en brouillon** propre à ce chantier, contenant des commits séparés TQ-01 à TQ-06 et un rapport d'écarts.
2. Une **matrice des opérations** prouvant quelle lecture/action exige quelle présence, quelle classe et quelle compétence, avec les fonctions/commandes exactes.
3. Des preuves de tests **sur le SHA exact**, une liste de régressions vérifiées et les cas restant à essayer physiquement.
4. Une **recette MJ guidée** : QR de Cantina et Comptoir, personnage non Courtier, Courtier, pilote et mécano ; quelques interactions de dock.
5. Aucune fusion \`main\`, publication Firebase, migration, altération de secrets ou permissions d'infrastructure sans **nouvel accord explicite de l'organisateur**.

## 13. Points à surveiller sans bloquer le chantier

- **Reprise Sabacc** : l'agent doit choisir une solution compatible avec \`sabaccPresence\` et la rotation de QR. Ne pas supprimer les accès nécessaires à une table déjà engagée.
- **Cours hors ligne** : l'instantané de cours dans « Mes informations » est un complément **proposé**, non une nécessité préalable à TQ-01.
- **Achat distant / vente** : certains services de Bourse permettent des contrats ou achats à distance d'un autre port. La commande commerciale peut se réaliser **au comptoir courant** tout en achetant une marchandise stockée ailleurs ; ne pas confondre présence au comptoir et présence physique dans le port vendeur.
- **Scans dans des lieux de soin et sur les personnes** : les soins d'urgence, fouilles V3.6 et interactions terrain ont leurs propres QR ; ne pas les supprimer.
- **Opérations en cours** : l'expiration d'une présence locale ne doit pas rendre impossible une confirmation ou une réception native déjà engagée ; l'agent doit définir une frontière explicite de lancement/continuité pour chaque opération.
- **Autres lieux** : la Cantina, le Bureau impérial et l'Hospice doivent être associés à des fonctionnalités **réellement existantes** ; ne pas inventer des services opérationnels ou permissions sans contrat métier.

**Règle finale :** le joueur garde ses informations partout ; **le monde s'active quand il se déplace et scanne le terminal du lieu**.
