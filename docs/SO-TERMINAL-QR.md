# Terminaux joueurs et QR de lieu — réalisation PR #59

Source : cahier des charges PR #59, commit fe172a20c6ce558ca86961c024240d53558ceb14 (18 novembre 2026).
Base : main a59ec255748de8c236f861e6a3ea3f29bbd44088, validation globale réussie 44266765944.

## TQ-01 — Cours et comptoir

Adoption explicite et irréversible du mode `spaceOutlaws.terminalQrVersion=1` par le MJ via Lieux & Terminaux, au briefing ou en pause. Aucun changement implicite des anciennes sessions. Les permissions de modification de session limitent cette écriture à ce seul marqueur et à la révision.

| Commande | Présence | Droit natif | Hors contexte |
| --- | --- | --- | --- |
| commodityMarket | Comptoir, ressource = session | Joueur actif | Refus, aucun cours renvoyé |
| galacticMarkets | Comptoir, ressource = session | Courtier principal | Refus, aucun prix professionnel |
| preparePlanetSale / sellToPlanetMarket | Comptoir | Courtier et propriété/stock/prix natifs | Refus avant mutation |
| shop / prepareShopPurchase / buyShopOffer | Comptoir lié | Achat natif et conditions M5 | Raccordement historique conservé |
| Retraits et reçus déjà acquis | Suivi natif | Propriété/consentements natifs | Pas de nouveau contrôle local |

L’achat distant reste natif : la présence au comptoir ne téléporte aucune marchandise et n’impose pas la planète du vendeur au joueur.
Les cours ne sont plus une entrée permanente du terminal personnel en mode QR.

## TQ-02 — Sabacc

Nouvelle entrée : QR natif `tableId + qrToken`, sans second QR de Cantina. Le mode QR GN autorise la consultation et les tours de la même table avec `sabaccPresence` ET siège ET identité native courante. La rotation du QR ne retire ni siège, ni main, ni mise. La reprise ne fournit aucun token ni catalogue de tables. Une nouvelle entrée exige toujours le QR courant. Révocation d'accès et expulsion restent prioritaires. Le mode LOCAL et les sessions GN historiques gardent leur contrôle QR existant.

Les tranches suivantes sont décrites ci-dessous. Les résultats CI seront consignés dans la PR de code sur le SHA réellement testé. Aucun déploiement ou changement de main autorisé par ce chantier.

## TQ-03 — Terminal personnel

En mode QR : Mon activité / Mes ressources / Mes informations, suivis et commandes conservés, informations et messages permanents, scanner unique avec saisie manuelle et caméra native. Les nouvelles négociations et recherches de contacts ne sont plus proposées comme des actions libres à distance. Navigation principale Identité / Action / Terminal / News préservée. Les sessions historiques conservent leur classement.
L'écran de lieu présente le temps restant, un message d'accès absent/expiré, les refus et le retour au terminal personnel. Le Courtier est vérifié avant de proposer le lien professionnel.

## TQ-04 — Spatioport et atelier

| Lancement natif | Ressource locale | Continuité sans nouveau scan |
| --- | --- | --- |
| prepareRefuel / refuelShip | Port du vaisseau | finishSoRefuel |
| prepareVoyage / departShip (manifeste inclus) | Port du vaisseau | Cockpit, préparation engagée, vol et arrivée |
| prepareCargoTransfer / startCargoTransfer | Port de la soute | Préparation de réception, réception et annulation |
| prepareSpaceMaintenance / acceptSpaceMaintenance / startSpaceMaintenance | Port, uniquement à quai | Points engagés, intervention dans un voyage suspendu, annulation |
| prepareModuleWorkStart / startModuleWork | Port de l’atelier | Montage/retrait final et annulation |

Un transfert impliquant une cellule conserve le contrôle natif dockEntry de cette cellule, sans ajouter un deuxième QR incompatible avec la présence unique. Le scan ne donne jamais Pilotage, mandat de vaisseau, propriété de fret, qualification MEC ou pièces. Consultation des vaisseaux, carte connue, accords et dossiers permanente selon droits natifs. Pas de scan imposé au cockpit ou au secours déjà engagé.

## TQ-05 — Docks, douanes et services préparés

| Service raccordé | Contrôle local au lancement | Suivi permanent |
| --- | --- | --- |
| COU-02 / COU-03 via prepareFieldAction et startFieldAction | merchantService sur la cible M6 préparée | Fin, résultat et carnet M6 |
| Clinique/atelier droïde via preparePersonAction et startPersonAction | clinicCare sur clinicTargetId pour soins programmés | Action engagée, continuation et fin |
| prepareIntelligencePurchase / buyIntelligence | Comptoir PNJ lié à l’offre native | Renseignement acquis et reçu |
| prepareCustomsInspection / startCustomsInspection | Bureau du port de la marchandise/vaisseau | Inspection engagée et clôture |
| Cellules, manutentions et vol des docks | Contrôles dockEntry existants | Vol engagé, destination réelle, volumes, PA, quotas et reçus natifs |

Urgence : soins de terrain et stabilisation inchangés ; les urgences à zéro PV conservent aussi leur parcours natif de survie. Aucun QR d’hospice ajouté à ces gestes. Les saisies, contestations et restitutions restent des procédures natives séparées ; aucune nouvelle taxe ou permission de saisie. La régie conserve ses commandes administrateur sans scan joueur.

## TQ-06 — Diagnostic et simulation de régie

`contextual-readiness.mjs/localReadiness` construit Modules × lieux depuis les définitions natives : session, ports publiés, comptoirs M5, cellules et cibles commerciales/centres préparés. Les bindings réels et terminaux actifs sont vérifiés. Chaque ligne distingue lecture live/lancement, droits natifs, ressource, lieu et état actif/non raccordé/désactivé. Les exceptions (dossiers, urgence, régie et QR Sabacc natif) sont explicites.

`setStage` refuse EN_JEU en mode QR s’il manque un raccordement requis ; le contrôle appartient à la même transaction que le changement de phase. Un épisode qui hérite du mode QR doit lui aussi préparer ses lieux avant démarrage ; les présences ne sont pas copiées. Les anciennes sessions ne sont pas activées implicitement.

Le simulateur appelle les véritables commandes de lecture/préparation avec le personnage choisi, son incarnation, ses compétences, ses lots et ses permissions actuels. La présence hypothétique reste dans une vue en mémoire ; aucun accès n’est enregistré. Aucune écriture n’atteint le stockage réel : les préparations restent en lecture, le journal technique de consultation est ignoré et le démarrage de réparation, sans préparation native pour le Mécano, utilise un plan d’écritures éphémère. Le contrôleur natif vérifie entièrement ce démarrage, sans réserver réellement PA, stocks ou crédits. Un résultat d’entrée au dock sans autorisation est traité comme un refus. Les devis de vente, vaisseau, atelier, patient ou inspection peuvent recevoir leurs arguments natifs dans le champ JSON avancé. Un argument manquant produit le refus natif, sans résultat « autorisé » fictif. En briefing/pause, les restrictions natives de phase restent visibles.

### Recette MJ guidée avant mise en jeu

1. Dans **Lieux & Terminaux**, consulter **Modules × lieux**. Créer les terminaux et publier uniquement les opérations réellement proposées : comptoir, spatioport/atelier, cellules, bureau habilité et centres/contacts préparés. Pour les opérations de port, renseigner le port concerné ; pour une cible préparée, son ID doit correspondre au lieu. Une ressource/opération ne peut pas être déplacée silencieusement vers un autre terminal.
2. Au **briefing ou en pause, hors STOP sécurité**, confirmer l’adoption du mode QR pour la session. Compléter tous les raccordements indiqués. Le serveur doit refuser un démarrage incomplet. Une fermeture de terminal redevient visible au diagnostic.
3. Exporter les QR depuis la régie. Pour la **Cantina**, utiliser exclusivement le QR natif de chaque table Sabacc : aucun second QR de lieu à scanner pour jouer.
4. Avec un **non-Courtier**, vérifier le terminal personnel, puis le QR du comptoir : cours publics disponibles, cours professionnels refusés. Après expiration, un favori ou une actualisation ne doit fournir aucun nouveau cours.
5. Avec un **Courtier**, vérifier les prix professionnels après scan. Acheter au comptoir un lot stocké dans un autre port : le paiement crée le dossier natif ; aucun lot n’est téléporté. Après changement de lieu, consulter et retirer le dossier selon son parcours natif.
6. Avec le **pilote désigné**, ouvrir le vaisseau à distance, puis tenter un nouveau ravitaillement/départ sans scan : refus. Scanner le spatioport, engager l’opération et vérifier sa fin après expiration. Tester le cockpit et un vol déjà engagé sans nouveau scan du quai.
7. Avec un **Mécano qualifié**, scanner l’atelier et lancer le travail autorisé avec les pièces et l’accord requis. Vérifier PA, durée et fin/annulation ; le scan seul ne crée ni qualification ni mandat.
8. Tester une cellule autorisée et une refusée, les droits de dépôt, la destination réelle et la capacité disponible. Pour le vol numérique : quota, PA, volume et récupération restent natifs ; ne pas créer de taxe ou saisir depuis un simple accès au dock.
9. À Sabacc, rejoindre via QR, lancer une main, tourner le QR en régie puis reprendre le même siège. Aucun autre joueur ne doit entrer avec l’ancien QR. Vérifier siège, cartes et crédits conservés.
10. Exécuter physiquement les essais **Android, iPhone, QR imprimés et plusieurs utilisateurs réels**. Ces essais restent **NON EXÉCUTÉS** par la validation automatisée.

### Preuves et écarts

Tests partagés mémoire/Firestore : cours, classe principale, expiration, catalogues sans prix, achat distant/retrait, pilote et mandat, fin après expiration, module/PA/annulation, soins programmés/urgence, contact/information, renseignement payé/reçu, douane et diagnostic de démarrage. Sabacc GN : même main après rotation, absence de token/catalogue de découverte, révocation et remboursement natif. HTTP/Auth : scan, refus de classe et expiration par le point d’entrée réel. Chromium : écran mobile et matrice PC, en plus de la recette de régression existante.

L’instantané hors ligne des cours est facultatif et n’est pas ajouté. Aucun GPS, migration de données, changement de main, secret, droit d’infrastructure ou déploiement dans ce chantier. Les SHAs et résultats finaux sont consignés dans la PR de code, sans attribuer au dernier commit les résultats d’un commit antérieur.

L’ancien marché entre joueurs est également couvert : `market` ne renvoie hors comptoir que les annonces personnelles, sans cours ni nouvelles annonces tierces ; `marketListing` conserve le dossier de son vendeur. `prepareMarketListing` / `publishMarketListing`, un achat sans négociation engagée et une nouvelle `prepareMarketOffer` / `sendMarketOffer` réutilisent le contrôle `commodityMarket` du comptoir. Les échanges déjà négociés, retraits d’annonce et reçus gardent leur continuité native. Le terminal expose un suivi des annonces et négociations existantes, et le comptoir propose le marché entre joueurs au Courtier. Aucune règle de localisation commerciale native n’est élargie.

Le dossier du Mécano masque le démarrage direct à quai lorsque l’accès local manque ou expire, et affiche le lien de scan. Les boutons de suivi/annulation d’un travail actif restent disponibles selon le contrôleur natif. Les autres lancements passent par leur préparation serveur avant d’afficher une confirmation.
