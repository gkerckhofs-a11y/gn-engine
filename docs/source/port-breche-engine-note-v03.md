# Note fonctionnelle pour GN Engine

**Objet.** Cette note traduit le livre V0.3 et les demandes de Guilz du 20 octobre 2026 en fonctions à prévoir. Elle complète le cahier des charges V1.1 [2]. Elle ne constitue ni un audit du code ni une certification des fonctions déjà disponibles. Les identifiants GN ci-dessous servent au suivi du développement.

## Décisions et conventions de mise en œuvre

Les décisions validées sont : PA communs, 5 au niveau global 1, 8 au niveau 2, coût courant de 1 PA, récupération de dix minutes avec exceptions médicales, renouvellement toutes les cinq heures et réglages modifiables en session. La continuité des personnages et les quatre entrées joueur viennent de la demande de Guilz [5]. Les procédures d’import, de migration et de réservation ci-après sont les conventions proposées pour les appliquer sans ambiguïté.

| **Référence antérieure**              | **Précision apportée par cette note**                                             |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| SOC-04 et SES-01                      | Distinguer scénario modèle, campagne persistante et session datée.                |
| COM-01 à COM-04                       | Activer les PA pour Port-Brèche ; garder le module facultatif pour les autres GN. |
| ACT-01 à ACT-04                       | Ajouter réservation de PA, récupération par famille et fouille de crédits.        |
| IMP-01 et IMP-02                      | Deux masters compatibles et import complémentaire sans remise à zéro.             |
| UX-01 à UX-04                         | Navigation : Mon personnage, Mon groupe, Action et Terminal.                      |
| REC-09                                | Séparer nouvelle partie indépendante et épisode suivant de la campagne.           |
| LIV et compléments facultatifs        | La progression persistante devient nécessaire au périmètre demandé.               |
| MED-01 à MED-10 du cahier des charges | Conserver la médiathèque ; ces références ne désignent pas les soins MED du jeu.  |



## Trois périmètres visibles dans le tableau de bord

GN-01. Le scénario contient les modèles et règles réutilisables. La campagne contient les personnages durables, leurs acquis et le monde persistant. La session contient une date, ses participants, ses scènes, ses paramètres et son historique. Une session indépendante part du modèle ; une session de campagne reprend l’état validé de la campagne. Le MJ choisit ce mode avant création et voit un aperçu de ce qui sera conservé.

Le tableau de bord regroupe Contenus et masters, Campagne et personnages, Sessions et réglages, Économie et annonces, Médiathèque et Contrôle du jeu. Ces rubriques fonctionnelles ne supposent pas une architecture technique particulière. Les secrets restent accessibles aux seuls organisateurs habilités.

# Le master de campagne

GN-02. Organisation recommandée : un classeur de campagne et un classeur pour chaque session. Ils partagent les mêmes identifiants et le même dictionnaire de colonnes. Le master est éditable dans Google Sheets puis importable en XLSX. Une éventuelle lecture directe d’un lien Google Sheets doit être développée et autorisée séparément ; elle n’est pas supposée disponible.

| **Onglet proposé**         | **Informations à préparer**                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Campagne                   | campaign_id, titre, univers, version des règles, langue, textes publics et textes MJ.                             |
| Personnages                | character_id, nom, portrait media_id, classe, niveau global, histoire, interprétation, PV et protection initiaux. |
| Classes                    | class_id, nom, description immersive, valeurs initiales et compétences de départ.                                 |
| Compétences                | skill_id, textes joueur, cible, niveau requis, durée, coût PA, récupération, test, effets et visibilité.          |
| Attributions               | character_id, skill_id, niveau, XP ; relations, missions et connaissances initiales référencées.                  |
| Groupes et membres         | group_id, présentation, image, membres, rôles, visibilité publique ou secrète et droits.                          |
| Objets et effets           | item_type_id, image, texte, catégorie, bonus, conditions, consommabilité, transfert et pillage.                   |
| Dotations initiales        | grant_id unique, bénéficiaire, crédits ou exemplaires, quantité, emplacement ; appliquées une fois.               |
| Connaissances et relations | content_id, texte, image éventuelle, détenteurs, partage, visibilité et relations entre personnages.              |
| Missions et univers        | mission_id, objectifs et étapes ; articles d’univers, règles publiables et illustrations.                         |
| Références de médias       | media_id, version et usages ; les fichiers restent dans la médiathèque.                                           |



## Un catalogue ne remplace pas l’état acquis

Les crédits initiaux, PV initiaux et dotations ne servent qu’à la création prévue. Après le premier jeu, le solde, les objets détenus, les connaissances acquises et les niveaux viennent de l’état de campagne. Réimporter le master ne réapplique aucune dotation. Une correction d’état passe par une opération MJ explicite et tracée.

Chaque ligne possède un identifiant stable, un périmètre, une version et une opération annoncée : créer, modifier des champs nommés ou archiver. Le nom affiché peut changer sans changer l’identité. Une cellule vide signifie « ne pas modifier » lors d’un complément ; effacer une valeur nécessite une consigne explicite du format d’import.

Les onglets et noms de colonnes ci-dessus sont une proposition de contrat d’import. Le moteur doit fournir un modèle vierge documenté et un exemple valide. Le présent livre ne prétend pas que ce format est déjà accepté par l’application.

# Le master de session

GN-03. Le classeur de session référence la campagne et sa version de départ. Il ajoute les scènes de cet épisode et peut inclure des onglets d’ajout au catalogue de campagne, avec le même format que le master principal. Un nouveau personnage reçoit un identifiant neuf ; un personnage de retour conserve le sien.

| **Onglet proposé**        | **Informations à préparer**                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Session et paramètres     | session_id, campaign_id, horaires, modules, règles, PA, récupération, régénération et politiques de clôture.    |
| Participants              | Personnages présents, attribution aux inscrits, groupes et éventuels mandats propres à la session.              |
| Lieux et QR               | location_id, lieu réel, type de cible, qr_id, état, présentation publique et conditions d’accès.                |
| Contenus de fouille       | Identifiant du contenu, cible, objet ou crédits ou information, quantité, conditions, résolution et épuisement. |
| Installations             | Profil de panne ou sabotage, fonctions dépendantes, réparation, durées et protections après remise en service.  |
| Stocks et comptoirs       | stock_id, exemplaire ou lot, propriétaire, détenteur, emplacement, quantité, état et retrait physique.          |
| Offres et cours           | Vendeur, objet, volume, prix, négociabilité, durée, référence de cours et règles de variation.                  |
| Annonces et missions      | Image, auteur, visibilité, dates, bénéficiaire individuel ou groupe, récompense et validation.                  |
| Entrepôts et frais        | Capacité, tarif, échéance, douanes, droits de passage et bénéficiaires des paiements.                           |
| Vaisseaux et routes       | Propriétaire, accès, capacité, carburant, entretien, caractéristiques et profils de trajet.                     |
| Événements et révélations | Déclencheur, destinataires, effets sur contenus, cours ou stocks, date et version.                              |
| Ajouts de campagne        | Nouveaux personnages, objets, compétences ou groupes ; références stables et portée explicite.                  |



## Préparer un contenu publiable

Un contenu de fouille indique obligatoirement s’il est unique pour tous, limité par personnage, disponible par groupe ou renouvelé par un événement précis. Il définit nombre de résultats, priorité ou tirage, coût, durée et éventuel test. Une réserve de crédits de lieu est un stock fini ; un transfert n’en crée pas de nouveaux.

Chaque image référence un média existant et une version accessible. Les textes publics, les textes du détenteur et les secrets MJ utilisent des champs ou des visibilités distincts. Les liens de connexion privés et les mots de passe ne figurent jamais dans un master de scénario.

Un export d’état après session est une sauvegarde et une source de comparaison, pas un master à réinjecter aveuglément. Le système distingue importer du contenu, reprendre une campagne et restaurer une sauvegarde.

# Importer et compléter sans perdre le jeu

GN-04. Un seul outil d’import accepte les deux masters et annonce sa destination : scénario, campagne ou session. Le MJ peut préparer les données, contrôler le résultat puis publier. Aucun chargement de fichier ne doit modifier immédiatement une partie en cours.

## Un contrôle avant toute application

L’outil vérifie le format, les identifiants uniques, les types, les quantités, les niveaux, les références croisées, les médias et les champs obligatoires. Il détecte un objet sans effet défini, une récompense sans payeur, un QR sans cible et une règle active sans paramètres. Les erreurs affichent classeur, onglet, ligne, colonne et correction attendue.

L’aperçu distingue créations, champs modifiés, archivages, conflits et éléments inchangés. Il montre séparément les données de contenu et les données acquises. Un import qui remplacerait des crédits dépensés, un niveau acquis ou un stock déplacé doit être refusé dans le mode complémentaire ; il ne devient pas une remise à zéro implicite.

## Une application cohérente

Les changements dépendants forment un ensemble validé : par exemple nouvelle compétence, attribution et objet requis. Si une référence indispensable manque, cet ensemble reste non publié. L’import conserve un identifiant et un bilan ; relancer la même opération ou réimporter les mêmes lignes n’accorde ni second objet ni seconde dotation.

Une ligne absente d’un nouvel envoi reste inchangée. Archiver nécessite une opération explicite et le contrôle des dépendances. Un objet déjà détenu ou une mission acceptée ne disparaît pas parce que son modèle est archivé. Pour une nouvelle entrée, le MJ choisit création en campagne ou contenu limité à cette session.

## Un ajout pendant la partie

L’ajout d’une cachette, d’un objet ou d’une annonce peut être préparé et publié pendant le jeu. Les opérations déjà lancées conservent la version de leurs règles et de leur offre, sauf migration explicitement contrôlée. Un indice déjà trouvé ne redevient pas neuf après renommage. Toute remise de stock est un événement d’approvisionnement identifié.

Le journal d’import permet de consulter qui a appliqué quoi et quand. Avant publication, le brouillon peut être abandonné. Après publication, une correction contrôle les usages intervenus ; elle ne supprime pas l’historique des actions, ventes ou découvertes déjà réalisées. Une copie de test isolée sert à vérifier un master sans toucher à la campagne.

## Fichiers à fournir avec le moteur

Prévoir les deux modèles vierges, leur dictionnaire de colonnes, un exemple Port-Brèche, un rapport d’import téléchargeable et un export de sauvegarde documenté. Le pack terrain génère QR légendés, badges publics, fiches privées et dossier MJ séparés. Les mêmes contenus et droits alimentent les écrans et les impressions.

# Conserver la campagne entre les sessions

GN-05. Le personnage garde son identité au fil des épisodes. Le compte joueur, son inscription, le personnage et sa participation à une session restent des éléments distincts. Réattribuer un rôle change l’accès de la personne, sans dupliquer le personnage ni ses biens.

| **Élément**               | **Continuité attendue**                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Personnage et progression | Histoire, classe, niveau global, niveaux des compétences, XP et validations conservés.                   |
| Économie                  | Crédits, dettes et droits conservés ; aucun retour aux soldes du master initial.                         |
| Biens et vaisseaux        | Exemplaires, quantités, propriétaires, détenteurs, emplacements et états conservés.                      |
| Connaissances             | Découvertes et partages conservés ; nouveaux contenus ajoutés selon leur visibilité.                     |
| Groupes                   | Membres, rôles, caisse et stocks conservés ; changements explicitement enregistrés.                      |
| Missions ouvertes         | Clôturer, reporter ou annuler avec traitement des récompenses et réservations.                           |
| PV et états physiques     | Politique annoncée de reprise ; aucune guérison implicite par import.                                    |
| PA et délais de session   | Nouveau départ : dotation pleine et délais personnels remis à zéro ; simple reprise technique inchangée. |
| Fouilles et stocks        | Pas de réapparition automatique ; nouveau contenu ou réapprovisionnement explicite.                      |



## Clôturer puis préparer le prochain épisode

La clôture bloque les nouvelles actions, résout ou annule les réservations selon leur état et produit un bilan. Le MJ voit les missions, trajets, prêts, locations et effets encore ouverts, puis valide leur devenir. Les dates en temps de jeu ne s’écoulent pas entre deux sessions ; les reports sont explicites. Les frais de session ne sont pas prélevés pendant des semaines réelles par défaut.

La nouvelle session reprend cet état validé et reçoit son master complémentaire. Le MJ fixe le traitement des blessures avant ouverture. Un même personnage ne doit pas dépenser ses biens dans deux sessions actives de la même campagne ; une session de test utilise une copie isolée.

## Accorder corriger et suivre

GN-06. Le MJ peut verser ou retirer des crédits, attribuer un objet, accorder une compétence, changer un niveau ou corriger des PV et PA. Chaque opération précise cible, montant ou changement, motif, auteur et date. Elle affiche l’état avant et après. Une compétence accordée vérifie ses prérequis ou enregistre une dérogation MJ visible dans le journal.

Le niveau global n’augmente pas automatiquement avec un achat de compétence. Les valeurs de PA au-delà du niveau 2 et le barème de progression globale restent à définir. Un niveau sans plafond configuré bloque la publication de la fiche concernée ; le moteur n’invente aucune valeur.

# Régler les PA et les horloges

GN-07. Les réglages appartiennent à une version de session. Les valeurs suivantes sont celles de Port-Brèche V0.3 ; le moteur doit permettre d’autres valeurs et d’autres règles pour un autre GN.

| **Paramètre fonctionnel** | **Valeur ou comportement retenu**                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| PA activés                | Oui pour Port-Brèche ; module facultatif dans le moteur.                                  |
| Plafond par niveau global | Niveau 1 : 5 ; niveau 2 : 8 ; autres niveaux à renseigner.                                |
| Coût courant              | 1 PA par compétence active ou fouille ; grille des exceptions prioritaire.                |
| Renouvellement            | 300 minutes de jeu ; retour au plafond, sans cumul.                                       |
| Origine du cycle          | Départ officiel de la session ; échéances communes.                                       |
| Récupération personnelle  | 600 secondes de jeu ; par personnage et skill_id.                                         |
| Famille FOUILLE           | 600 secondes communes aux fouilles ordinaires, TRA-02 et fouilles de lieu.                |
| Début de récupération     | Jet ou résolution automatique ; réussite comme échec.                                     |
| Soins                     | Pas de récupération du soignant pour MED-02, MED-03 et antidote ; MED-01 conserve 10 min. |
| Patient MED-02            | 600 secondes entre réussites, tous soignants confondus.                                   |
| Verrous de cible          | Conserver les 5 min après échec technique et les autres protections des profils.          |
| Pause générale            | Suspend délais, actions et régénération en temps de jeu.                                  |
| Limites de confort        | Horloge réelle distincte ; capture et immobilisation continuent pendant la pause.         |
| Intervention MJ           | Ajout, retrait, correction ou remise au plafond, avec motif et journal.                   |



## Renouveler avec une action en cours

À l’échéance, le total disponible plus réservé revient au plafond. Les PA déjà réservés restent réservés et sont déduits du disponible. Exemple : plafond 5 et 1 PA réservé donnent 4 disponibles après renouvellement. Si l’action réussit ou échoue ensuite, ce PA est consommé ; si elle est annulée avant résolution, il redevient disponible, sans dépasser 5.

Chaque échéance ne s’applique qu’une fois, même hors connexion. Plusieurs cycles manqués ne s’additionnent pas. Le moteur traite l’échéance puis la résolution lorsqu’elles ont exactement le même instant logique. Les règles et la durée de l’action restent celles annoncées lors de son lancement.

# Modifier les réglages pendant le jeu

GN-08. Le MJ habilité peut modifier période de régénération, plafonds, coûts et récupérations sans arrêter la campagne. L’écran indique la valeur actuelle, la nouvelle valeur, les personnages concernés, les effets immédiats éventuels et l’heure d’application. Le joueur reçoit les règles publiées qui le concernent et son prochain renouvellement lisible.

## Une modification ne constitue pas une distribution de PA

Par défaut, changer la période conserve la prochaine échéance déjà annoncée, puis applique la nouvelle période aux cycles suivants. Le MJ peut explicitement remplacer cette prochaine échéance par une date de jeu future. Le moteur ne recalcule pas rétroactivement une série de renouvellements et ne redonne pas de PA au simple enregistrement du paramètre.

Exemple : à 4 h 40 de jeu, passer de cinq à deux heures conserve l’échéance de 5 h, puis programme 7 h. Si le MJ veut un renouvellement immédiat, il utilise une commande distincte, avec aperçu et motif ; cette commande ne déplace pas l’échéance suivante, sauf choix explicite.

## Préserver ce qui a déjà été engagé

Modifier un coût ou un délai s’applique par défaut aux prochaines actions. Une action en cours garde sa version. Un délai déjà déclenché conserve son heure de fin. Réduire les délais existants nécessite une opération de migration séparée, listant les compteurs touchés ; un changement de paramètres ne les efface jamais silencieusement.

Une hausse du plafond ne remplit pas immédiatement les PA. Une baisse plafonne le disponible après prise en compte des réservations. Si les réservations seules dépassent le nouveau plafond, le changement est différé ou nécessite l’annulation explicite des actions concernées avant application. La régie ne peut pas créer un solde négatif.

## Piloter les incidents et le réseau

Le tableau de bord permet pause, reprise, consultation d’une action, annulation avant résolution et correction motivée après arbitrage. Une correction produit un événement compensateur ; l’historique initial reste consultable. Les compteurs visibles sont recalculés à partir de l’horloge de référence, pas de l’heure du téléphone.

Sans réseau, une dépense n’est pas validée seulement sur le téléphone. Le MJ tient un reçu numéroté contenant PA, coût matériel, résultat et heure de jeu. Le périmètre pris en charge passe sous arbitrage manuel afin d’éviter une dépense parallèle dans l’application. La reprise réconcilie chaque reçu une seule fois, avec l’état effectivement enregistré ; elle ne rejoue pas les jets.

## Une règle publiée et consultable

Chaque session conserve sa version de règles et son historique de paramètres. Le Terminal montre la version effective, la date des changements et les éléments utiles au joueur. Les motifs secrets d’un événement restent privés. Le moteur peut expliquer « compétence disponible dans 6 min » sans révéler un saboteur caché ni l’inventaire d’autrui.

# Exécuter les compétences et les effets

GN-09. Chaque action est une opération identifiable, commune à tous ses points d’entrée. Scanner un QR, ouvrir un objet ou agir depuis une mission conduit à la même règle et au même résultat. Le serveur ou service de référence vérifie droits, session, état, compétence, niveau, PA, délai, matériel, présence et disponibilité de la cible.

## Du choix à la résolution

L’aperçu montre cible autorisée, coût, durée, test éventuel et effets connus. Après confirmation, le système réserve PA, objets, aide et cible incompatible. Il peut recevoir une confirmation locale, mais ne la confond pas avec un jet. Avant résolution, il vérifie de nouveau les conditions puis enregistre ensemble dépense, résultat, délai et effets.

Le calcul Port-Brèche est 1D6 + niveau de compétence + un bonus matériel au maximum de 2 + une aide au maximum de 1, comparé au seuil. Les valeurs, le dé et le résultat sont conservés. Les protocoles automatiques ne lancent pas de dé. La progression globale qui fixe les PA n’est jamais ajoutée au test.

## Décrire les règles dans le master

Une compétence conserve : skill_id et version, classe ou apprentissage, texte immersif, consigne, type de cible, minimum requis, prérequis, durée par niveau, coût PA, famille de récupération, portée du délai, consommables, formule, seuil, succès, échec, interruption, reprise et visibilité. Le moteur fournit un catalogue d’effets guidé ; un texte narratif ou une formule de tableur ne devient pas du code exécuté librement.

Un effet décrit sa cible, sa valeur, son origine, sa durée, son cumul, son échéance et ses conditions de levée. Il doit pouvoir soigner, modifier protection ou état, accorder une connaissance, déplacer un bien ou des crédits, ouvrir un accès et bloquer une fonction d’installation. Les limites de PV, quantités, permissions et modules restent contrôlées.

## Cas particuliers à prendre en charge

GN-10. Prévoir la grille d’exceptions des PA ; les soins en deux étapes MED-03 sans second coût ; les tentatives d’information limitées par version ; le quota COU-03 par session ; les fouilles de lieu et de personnage ; les plafonds de pillage ; les pannes à expiration automatique ; les durées réelles de capture ; et les actions DIRECT ou DISCRET avec notifications distinctes.

L’aide possède la compétence et une récupération disponible. Elle ne réserve pas de PA supplémentaire mais reste occupée, et partage la récupération déclenchée selon l’exception applicable. Un objet bonus est réservé sur un seul usage concurrent ; le prêter ou le vendre n’en double pas l’effet. Un rafraîchissement, double clic ou réessai de réseau retrouve l’opération déjà connue.

Les QR publics identifient une cible et ne donnent jamais accès à sa fiche privée. Saisie manuelle et photographie suivent les mêmes contrôles. Les résultats secrets, pièces jointes, portraits et notifications appliquent les mêmes droits que leur contenu.

# Faire fonctionner le commerce du port

GN-11. Le marché doit prendre en charge la contrebande en gros et le commerce au détail. Les offres décrivent vendeur, bien, quantité, prix, frais connus, emplacement, mode de retrait ou de transport et conditions d’annulation. Les joueurs peuvent acheter, proposer un prix, accepter une contre-offre, revendre et transférer dans la limite de leurs droits.

## Un inventaire et une comptabilité cohérents

Les caisses, lots et exemplaires ont une identité, une provenance et un état. Diviser ou réunir des lots conserve les quantités. Tout paiement désigne un compte débité et un compte crédité ; il vérifie les droits et les fonds au moment de l’engagement. Les crédits personnels, la caisse de groupe et la trésorerie du commerce restent distincts.

Le stock du comptoir et celui de l’application sont communs. L’achat réserve ou transfère la propriété selon l’offre ; le retrait confirme la remise physique. Un objet à retirer n’accorde aucun bonus. Deux acheteurs ne peuvent acquérir la dernière unité. Réessayer une transaction ou une confirmation de retrait ne la reproduit pas.

## Des prix et frais que le MJ peut piloter

Les cours affichent leur date et leur origine. Un événement MJ peut modifier références, nouvelles offres, disponibilité et frais futurs. Le prix accepté reste celui du contrat. La négociation libre entre joueurs est gratuite en PA ; seul l’usage de COU-02 suit son coût de compétence et sa réduction encadrée.

Les entrepôts ont capacité, occupation, propriétaire, locataire, tarif, échéance et accès. Une cargaison réservée ou stockée occupe réellement sa capacité. Douanes, loyers et paiements de corruption sont des écritures distinctes avec bénéficiaire. Le paiement ne donne un droit ou un accès que si la règle le prévoit ; les conséquences d’un impayé sont configurées, pas inventées en cours de calcul.

## Les recharges laser

GN-12. Le moteur gère OBJ-LAZ par portions fermées et lots physiques. Achat, remise, transfert et ouverture sont distincts. À l’ouverture, une unité est consommée et reste dans l’historique ; aucun compteur de tirs n’est exigé. Les portions ouvertes ne redeviennent pas vendables ou pillables. Les munitions initialement chargées ont aussi leur trace de dotation.

Le MJ suit les quantités prêtes, les recharges remises, les ouvertures et les réapprovisionnements. Un stock virtuel ne promet aucune portion physique absente. Les prix en crédits et achats réels de l’organisation sont séparés. Les dons, achats et ouvertures de recharges ne consomment pas de PA dans cette version.

## Contrôler les ressources rares

Le tableau de bord filtre stocks, réservations, commandes à retirer, fonds bloqués et échéances. Il permet un réapprovisionnement identifié, une correction motivée et un export des mouvements. La pause suspend les frais en temps de jeu. Un contrat déjà engagé indique comment sa clôture libère ou transfère argent, stock et capacité.

# Groupes annonces missions et vaisseaux

GN-13. Le groupe possède une présentation, des membres, des rôles, une caisse, un inventaire et éventuellement un vaisseau. Les droits sont séparés : lire, payer, vendre, gérer le stock, accepter une mission, publier ou commander un départ. Être membre ne donne pas automatiquement tous ces droits. Une appartenance secrète ne doit pas devenir visible par un annuaire ou une notification.

## Publier une annonce et recevoir des réponses

GN-14. Depuis le tableau de bord, l’organisateur crée une annonce avec titre, texte immersif, image, auteur apparent, dates, visibilité, places ou quantité, critères, preuve attendue et récompense. Il choisit destinataire individuel, groupe ou les deux. Emploi, prime, escorte et mission de contrebande utilisent ce même cadre.

Le joueur répond avec un message et choisit en son nom ou au nom d’un groupe autorisé. Le commanditaire accepte, refuse ou négocie. Candidature, contrat accepté, mission en cours, preuve déposée, validation, paiement, refus et annulation sont des états distincts. Répondre ou accepter ne valide pas la mission et ne verse pas la récompense.

Une mission de groupe occupe une candidature collective et paie la caisse désignée. Une mission personnelle paie son personnage. La récompense précise sa source et sa disponibilité ; une création de crédits par la régie reste une dotation explicitement enregistrée. Le paiement ne se déclenche qu’une fois, après la validation prévue. Le nombre de bénéficiaires et le budget global empêchent de multiplier une prime.

## Préparer les transports et les affrontements virtuels

GN-15. Un vaisseau conserve propriétaire, droits de commandement, équipage, capacité, carburant, état, entretien et améliorations. Un trajet réserve navire, capacité, cargaison et coûts. Départ, transit, interception éventuelle, arrivée et déchargement sont enregistrés. Une cargaison en transit ne peut être vendue comme stock local immédiatement retirable.

Une interception exige un renseignement ou une condition de rencontre, des navires disponibles, un choix ou une consigne du défenseur, un calcul paramétré et une part de hasard enregistrée. Le résultat applique une seule fois avaries, fret transféré, carburant, récompenses et capacités. Le profil annonce les limites de perte, les réparations et la récupération ; l’absence de réponse du joueur ne provoque pas une destruction automatique.

Le module spatial reste désactivé pour Port-Brèche tant que les caractéristiques, coûts, routes, formule de résolution et conséquences ne sont pas arrêtés. La note exige les fonctions du moteur mais n’invente pas ces barèmes. Les missions et transports peuvent être arbitrés par le MJ dans un mode annoncé, sans faire croire à une simulation automatisée déjà disponible.

# Les écrans du joueur et la médiathèque

GN-16. La navigation principale comporte les quatre entrées demandées. Mon QR, scan, PA disponibles, prochain renouvellement, PV et protection restent rapidement accessibles. Le vocabulaire des écrans est celui du jeu ; les identifiants techniques et rapports d’import appartiennent à la régie.

| **Entrée**     | **Contenu et actions**                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mon personnage | Portrait, classe, niveau global, PA, PV, protection, histoire, missions personnelles, connaissances, compétences, XP et inventaire unifié objets et crédits. Donner des crédits ou un objet autorisé. |
| Mon groupe     | Groupes accessibles, membres visibles, rôle, droits, caisse, stock, achats et missions collectives ; vaisseau et actions autorisées si actifs. Sans groupe, message simple.                           |
| Action         | Scanner ou saisir le code ; choisir une compétence ou une action commune ; voir prérequis, coût, durée, bonus, récupération et résultat.                                                              |
| Terminal       | Missions accessibles, petites annonces et candidatures, marketplace, univers, nouvelles et règles en vigueur. Recherche et filtres selon les droits.                                                  |



Une même mission peut être ouverte depuis le Terminal puis suivie dans Mon personnage ou Mon groupe ; ces accès montrent le même contrat. L’inventaire affiche disponibilité, emplacement, transfert et retrait. Les compétences affichent leur description immersive, leur niveau, leur coût et le temps restant avant réutilisation.

## Des images réutilisables sans ambiguïté

GN-17. La médiathèque existante dans le cahier des charges reste requise : import de plusieurs fichiers, aperçus, catégories, recherche, attribution et suppression par lot. Portraits, objets, missions et annonces référencent une image et sa version. Le master utilise ces identifiants ; il ne duplique pas les images dans toutes les lignes.

Une attribution en lot affiche image et cible avant validation. Supprimer une image utilisée montre ses usages et demande remplacement ou détachement explicite ; retirer une association ne supprime pas les autres usages. Les aperçus et images agrandies respectent les mêmes droits que la fiche. Une image manquante laisse le texte et les actions utilisables.

## Accueillir et protéger les accès

GN-18. Chaque session possède un lien et un QR publics d’inscription. Le MJ gère les places, valide les demandes et attribue les personnages existants ou nouveaux. L’accès privé est distinct du QR porté. Une réattribution révoque l’accès précédent ; l’inscription suivante à la campagne retrouve le même personnage après validation.

Le joueur ne voit que ses connaissances, missions et groupes autorisés. Le mode Voir comme ce personnage applique aussi ces limites aux recherches et médias. Les alliés infiltrés n’obtiennent que les contenus effectivement partagés ; aucun écran ne certifie leur loyauté. Le fonctionnement sans smartphone reste possible par fiche privée et intervention MJ.

# Recette de la configuration et de la campagne

GN-19. Les essais suivants complètent ceux du cahier des charges. Ils décrivent le résultat attendu, pas un test déjà exécuté sur l’application. Utiliser une campagne de test isolée et des comptes joueur, MJ et assistant aux droits différents.

| **Essai**                      | **Résultat attendu**                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| PA et niveau                   | Global 1 = 5 PA ; global 2 = 8 ; compétence niveau 2 ne change pas seule ce plafond.                           |
| Action et échec                | Un jet raté dépense 1 PA et le consommable prévu ; dix minutes sur cette compétence.                           |
| Fouilles alternées             | Fouille commune puis TRA-02 ou lieu avant dix minutes : refus sans débit.                                      |
| Compétence différente          | Pendant une récupération, autre compétence utilisable si tous ses prérequis sont remplis.                      |
| Soins et secours               | Deux patients différents peuvent être traités successivement ; un patient respecte son délai. Secours gratuit. |
| Cycle de cinq heures           | À 5 h de jeu, réserve au maximum sans cumul ; une pause retarde l’échéance réelle.                             |
| Réservation au renouvellement  | Plafond 5 et 1 PA réservé donnent 4 disponibles ; annulation libère au maximum 5.                              |
| Changement en session          | Nouvelle période appliquée selon aperçu ; aucun renouvellement rétroactif ni effacement de délai.              |
| Double clic et reconnexion     | Un seul coût, un seul jet et un seul effet ; aucune dotation supplémentaire.                                   |
| Import complémentaire          | Ajouter zone et personnage sans changer les soldes, objets ou niveaux déjà acquis.                             |
| Réimport identique             | Aucune nouvelle dotation, aucun doublon de personnage ou de recharge.                                          |
| Clôture et épisode suivant     | Acquis conservés, contrats traités, PA de nouvelle session attribués une seule fois.                           |
| Fouille concurrente            | Un seul objet attribué ; crédit de cachette débité une seule fois ; résultat conservé.                         |
| Achat et comptoir              | Stock commun, prix accepté conservé et remise physique confirmée une fois.                                     |
| Mission individuelle ou groupe | Mandat vérifié ; candidature et récompense affectées au bon bénéficiaire.                                      |
| Média et secret                | Image privée inaccessible sans droit ; suppression contrôlée sans lien cassé.                                  |



## À arrêter avant la première session réelle

Restent à fixer : durée et horaires du GN, progression globale au-delà des attributions MJ, plafonds après le niveau 2, tarifs, stocks, portion Q des recharges et barème spatial. Les règles de reprise des blessures et contrats doivent être annoncées. Mesurer ensuite la pénurie de PA, les attentes de soins et la fréquence des actions ; les réglages pourront être adaptés dans le cadre décrit.

Livrables attendus : moteur configuré, deux masters documentés, données Port-Brèche validées, pack terrain, guide MJ, procédure de secours et bilan de recette. Cette note s’ajoute au livre ; elle ne modifie pas à elle seule le code ou le cahier des charges conservé dans l’autre fil.

# Références et statut du livre

## Les sources du cadre et des besoins

[1] Conception de Port-Brèche avec Guilz, Canon du jeu de Port Brèche Groupes et dépendances, version 1, 19 octobre 2026. Document interne de référence : factions, répartition des 60 places, quatre renégats, infiltré, Comptoir, dépendances économiques et distinction entre combats au sol et spatiaux. Les classes et barèmes n’y étaient pas fixés.

Fichier : Port_Breche_Canon_Groupes_Dependances_V1.docx

https\://chatgpt.com/api/library/files/libfile_e73ebd4205c081919d1e322c2cdc9d39/download

[2] Conception de GN Engine avec Guilz, Cahier des charges de GN Engine, version 1.1, mise à jour du 20 octobre 2026. Référence fonctionnelle, notamment COM-01 à COM-04, ACT-01 à ACT-04, VIE-01 à VIE-05 et INV-01 à INV-05. Ces exigences décrivent les comportements attendus, pas une disponibilité technique certifiée.

Fichier : GN_Engine_Cahier_des_charges_V1_1.docx

https\://chatgpt.com/api/library/files/libfile_bc4199e400b08191a9e6420d529473fa/download

## La référence de sécurité consultée

[3] Gel Blaster Inc., notice du Gel Blaster Starfire, copyright 2023, section Important Safety Information, page 2 du PDF. Notice du fabricant hébergée par Salling Group, consultée le 20 octobre 2026. Utilisée uniquement pour les précautions du chapitre Sécurité du jeu physique ; les réglages techniques du matériel de Western City ne sont pas déduits de ce modèle.

https\://digitalassets.sallinggroup.com/image/upload/8bf24378037fcec7db3d573d4f564b85

## Les règles créées dans cette version

[4] Proposition de conception de Port-Brèche, présente version 0.3, 20 octobre 2026, élaborée à la demande de Guilz. Conception des sept classes, 21 compétences, textes immersifs, PV, coûts, délais et profils de jeu. Les échanges du 20 octobre 2026 ajoutent QR, progression entre sessions, bonus matériels, boutique et recharges laser. La forte demande attendue de billes est une hypothèse de Guilz à mesurer. Ces règles sont des choix de conception, non des faits du canon Star Wars. Les PA et délais décidés sont décrits en V0.3 [5] ; leur équilibre nécessite aussi un essai.

La proposition ne modifie pas le canon narratif et n’introduit aucun personnage célèbre, pouvoir ou événement officiel supplémentaire. Les noms bacta, blaster et Empire servent au vocabulaire de fiction ; les effets chiffrés décrits ici sont propres au GN.

## Passage à la version validée

Après discussion et essai, conserver les codes de règle, réviser les valeurs et publier une version datée. La fiche joueur résumera uniquement ses compétences et les règles communes approuvées. Les secrets de l’annexe organisateur seront retirés de l’édition destinée aux participants. La configuration du GN Engine devra référencer cette même version pour éviter des divergences entre le livre, les écrans et le terrain.

[5] Guilz, décisions de conception du 20 octobre 2026 : 1 PA par compétence active ou fouille ; réserve de 5 PA au niveau global 1 et 8 au niveau 2 ; récupération personnelle de dix minutes avec exception des soins ; retour au maximum toutes les cinq heures de jeu. Demande de masters, de continuité de campagne, de réglages en session et de quatre entrées joueur. Source : échanges directs de ce projet. Les conventions détaillées de la note sont des spécifications proposées pour mettre ces décisions en œuvre.