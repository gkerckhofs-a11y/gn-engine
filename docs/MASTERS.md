# Masters de campagne et de session — format 1

GN Engine 0.26.1, format Excel introduit en 0.23 et étendu en 0.26. Date : 20 octobre 2026. Ce contrat décrit les champs réellement acceptés par le moteur. Source de référence : `src/shared/master-schema.mjs` ; validation métier : `src/core/masters.mjs`.

## Commencer

Dans un **scénario**, choisir le fichier dans **Contenus et masters → Master de campagne → Fichier master de campagne (.xlsx)**. Le master CAMPAGNE prépare le modèle réutilisable. Il ne crée pas immédiatement une campagne : après import, figer une version, puis choisir **Premier épisode d’une nouvelle campagne**.

Dans la régie d’une **session en préparation**, utiliser le champ distinct **Contenus et masters → Master de session → Fichier master de session (.xlsx)**. Ce panneau propose aussi **Ajouter un personnage**. Le formulaire direct utilise exactement le même aperçu, les mêmes contrôles et le même journal que le fichier Excel. Seul le propriétaire dispose de ces imports ; les délégations MJ conservent leurs outils d’édition habituels. Les nouveaux personnages restent sans compte joueur attribué.

Chaque zone propose uniquement son modèle et son exemple à télécharger, affiche la destination et rappelle où charger l’autre type. Après sélection, saisir le motif puis vérifier le fichier. Un master du mauvais type est refusé avant l’envoi au serveur : le message indique le champ et l’écran à utiliser. Le contrôle lit `Meta.type`, même si le fichier a été renommé. Le serveur conserve son propre contrôle de type et de destination. Aucun import n’est appliqué sans aperçu et confirmation explicite.

Le master de session complète l’épisode ouvert. Pour ajouter des personnages entre deux épisodes, clôturer le précédent, préparer le suivant, puis importer le complément dans sa régie. Le complément sera conservé à la clôture de cet épisode. Un import n’altère pas rétroactivement le scénario ni les épisodes archivés.

Fichiers fournis et accessibles depuis leurs panneaux respectifs :

- `assets/masters/GN_Engine_Master_Campagne.xlsx` : modèle vierge.
- `assets/masters/GN_Engine_Master_Session.xlsx` : modèle vierge.
- `assets/masters/GN_Engine_Exemple_Campagne.xlsx` : exemple fictif avec personnage, classe, compétences, objet consommable, groupe, connaissance et dotations.
- `assets/masters/GN_Engine_Exemple_Session.xlsx` : nouveau personnage, relation et dotations, nouvelle cache et modification d’une consigne médicale, à ajouter à une session issue de l’exemple campagne.

Les exemples ne constituent pas le canon du GN. Ils servent à essayer le mécanisme. Dans l’exemple SESSION, renseigner `Meta.campaign_id` avec l’identifiant affiché dans l’écran d’import si la session appartient à une campagne.

## Lire, vérifier, appliquer

1. Renseigner les feuilles utiles dans Excel ou Google Sheets. Conserver la ligne d’en-tête. Télécharger Sheets au format **Microsoft Excel (.xlsx)**. L’application ne lit pas directement un lien Sheets.
2. Ouvrir la destination souhaitée dans GN Engine. Choisir le fichier et saisir un motif privé.
3. Le lecteur vérifie les feuilles, colonnes, cellules et limites. Le serveur contrôle les identifiants, références, publication, médias, droits et données protégées. Les erreurs portent l’onglet, la ligne et, quand elle est identifiable, la colonne ; un contrôle global du graphe est présenté comme `References`.
4. Relire les créations, modifications et archivages, avec les valeurs avant/après, ainsi que les dotations. Une erreur bloque l’ensemble du complément.
5. Cocher la confirmation puis appliquer. L’import et son journal sont enregistrés ensemble. Un état modifié après l’aperçu exige une nouvelle vérification.

La lecture du fichier et la préparation de l’aperçu ne modifient aucune donnée de jeu. Après une interruption réseau au moment de confirmer, réessayer : la même commande retrouve son résultat. Réimporter les mêmes lignes ne réapplique pas les dotations. L’historique des imports terminés se consulte dans leur destination ; le fichier source n’est pas conservé par l’application.

## Identifiants et versions

`id` est durable, distinct du nom affiché. Caractères autorisés : lettres, chiffres, tiret, soulignement ; maximum 128 caractères. L’identité d’une ligne est son onglet et son identifiant. Une ligne de membre, attribution, relation ou objectif ne peut pas changer de personnage ou de groupe après sa première importation.

Chaque ligne de contenu indique `operation` et `version` :

| Opération | Effet |
| --- | --- |
| `CREER` | L’identifiant doit être neuf, sauf réimport exactement identique déjà reconnu. |
| `MODIFIER` | L’élément existe. Seuls les champs renseignés sont modifiés. |
| `ARCHIVER` | Dépublie ou désactive l’élément, sans le supprimer. Les dépendances contrôlées peuvent bloquer l’opération. |

La version est un entier positif. Même version et même contenu : inchangé. Même version avec un contenu différent : erreur. Version plus ancienne : erreur. Nouvelle modification : augmenter la version. Une **dotation est immuable**, même avec une version supérieure ; son identifiant ne peut pas servir à un autre bénéficiaire.

Une cellule vide signifie conserver. `!EFFACER` vide explicitement un texte facultatif, une liste ou une référence effaçable. Les champs obligatoires, nombres et booléens ne deviennent pas effaçables. Une ligne absente reste inchangée. Les colonnes inconnues et les onglets non pris en charge sont refusés ; seules les feuilles explicatives `Guide` et `Dictionnaire` sont ignorées.

Les empreintes des lignes sont transmises aux versions figées et aux sessions suivantes. Les anciens imports restent consultables dans l’épisode où ils ont été appliqués. L’archive `.gnscenario.zip` conserve le contenu modèle, mais pas le journal des imports ni leur provenance : après réimport d’une telle archive, les identifiants existants empêchent toujours une seconde création ; les lignes doivent être adaptées en modifications explicites.

## Feuilles

| Feuille | Contenu et règles |
| --- | --- |
| Meta | Une ligne : format `gn-engine-master`, version du format `1`, type `CAMPAGNE` ou `SESSION`. `destination_id` et `base_revision` sont facultatifs mais vérifiés si renseignés. `campaign_id` est obligatoire pour une session de campagne. |
| Parametres | Une clé par ligne et sa valeur. Une valeur vide ne change rien. Voir les réglages ci-dessous. |
| Personnages | Identité publique, histoire, interprétation, secrets joueur, notes MJ, publication, niveau initial, maximum de PV initial, références de portraits. |
| Objets | Modèles `INDIVIDUAL` ou `STACKABLE`, consommabilité, unité, description, catégorie, volume, légalité, image et caractère pillable (NON par défaut). Aucun stock détenu n’est remplacé. |
| Competences | Texte immersif et instructions ; `PASSIVE`, ou soins `ACTIVE_SELF` / `ACTIVE_TARGET`. Les seules actions actives exécutables importées ici sont les soins de PV déjà présents dans le moteur. |
| Classes | Nom, description et compétences au format `skill_id:1;autre_id:2`. Une classe publiée dépend de compétences publiées. |
| Attributions | Classe et compétences du personnage, publiées ou non. En session, uniquement pour un personnage créé dans le même import. Les niveaux déjà acquis se modifient via l’outil MJ dédié. |
| Groupes | Présentation, briefing et notes MJ ; visibilité `PUBLIC` ou `SECRET`. Les caisses de groupe se configurent avec leur outil dédié. |
| Membres | Personnage, groupe, rôle et droits explicites. Les anciens messages ne sont pas distribués aux nouveaux membres. |
| Connaissances | `KNOWLEDGE`, `CLUE` ou `DOCUMENT`, texte, vérité MJ, partage `SHOW` / `COPY`, destinataires initiaux et accès QR. Les reçus existants ne sont pas réécrits par une modification du catalogue. |
| Objectifs | Une ligne par objectif d’un personnage. Les étapes détaillées restent dans l’éditeur de fiche. |
| Relations | Une ligne par relation d’un personnage, avec cible facultative ; une cible doit être un autre personnage existant ou créé dans ce même import. |
| Lieux | Fouille SEARCH ou installation INSTALLATION, présentation, publication, dépendance et durées de panne/protection. |
| ActionsTerrain | Profil SEARCH, SABOTAGE ou REPAIR lié par lieu_id. Expertise, durée, jet, coût, récupération, consommable et bonus. |
| Recompenses | Réserve finie liée par lieu_id : CREDITS, ITEM ou KNOWLEDGE, quantité par découverte, stock initial et plafond individuel. |
| Interactions | Profils FIELD_CARE, CLINIC_SAFE, CLINIC_FAST, LOOT_COMMON et LOOT_METHODICAL. Expertises, durées, consommables, bonus et paramètres médicaux. |
| Dotations | `CREDIT` ou `OBJET`, quantité positive et bénéficiaire créé dans le même import. En session, crée effectivement le portefeuille ou le lot initial. Dans le scénario, prépare la dotation de la future session. |

Publication des catalogues et personnages : `DRAFT`, `READY`, `PUBLISHED`. Publication des objectifs, relations et profils, ainsi que les autres booléens : `OUI` ou `NON`. Les listes d’identifiants sont séparées par `;`.

Droits de groupe : `readBriefing`, `readMembers`, `readUpdates`, `publishUpdates`, `readWallet`, `payWallet`, `representMissions`. Seuls les droits présents dans une cellule renseignée sont accordés. Une cellule vide conserve les droits, `!EFFACER` les retire.

Pour un soin : `soin_pv` positif, `usages` positif ou vide pour absence de plafond à la création, `recuperation_secondes` positif ou nul et `portee_recuperation` parmi `ACTOR`, `PATIENT`, `NONE`. Un consommable doit être publié et consommable, avec une quantité compatible. Les profils attribués restent des instantanés ; modifier le catalogue ne met pas automatiquement à jour les compétences des personnages.

Une nouvelle connaissance publiée peut distribuer ses reçus initiaux aux personnages désignés. Les destinataires initiaux d’une connaissance déjà présente en session se gèrent par l’outil MJ, afin de conserver les retraits et les versions reçues. Son archivage est bloqué tant qu’un reçu actif existe.

## Paramètres

| Clé | Valeur et portée |
| --- | --- |
| titre, resume | Textes du scénario ou de la session. Le titre est obligatoire. |
| date, horaires, lieu, infos_pratiques, confidentialite | Session uniquement. Date en texte `AAAA-MM-JJ`. La notice de confidentialité ne peut pas être effacée. |
| capacite | Session : entier positif, au moins égal au nombre d’inscrits acceptés. |
| groupes_actifs | Session : OUI ou NON. |
| pa_actifs | OUI ou NON. |
| pa_niveau_1, pa_niveau_2 | Plafonds PA entiers positifs. Les autres niveaux se configurent dans l’éditeur PA. |
| pa_renouvellement_minutes | Entier positif. Valeur de départ du moteur : 300 minutes. |
| pa_cout | Entier positif ou nul. Valeur de départ : 1. |
| pa_recuperation_secondes, pa_recuperation_patient_secondes | Entiers positifs ou nuls. Valeurs de départ : 600 secondes. |
| economie_active, monnaie_nom, monnaie_unite | Scénario uniquement : OUI/NON et libellés de la monnaie. |
| sante_active, pv_max_defaut | Scénario uniquement : OUI/NON et maximum de PV positif. Les autres règles de santé restent dans l’éditeur. |

Aucune valeur inscrite dans un modèle vierge n’active implicitement un module. Pour activer les PA pour la première fois, renseigner les plafonds ; l’exemple fourni utilise 5 au niveau 1 et 8 au niveau 2. Les règles de session ne peuvent être importées que si aucune réserve PA n’a encore été enregistrée ; sinon utiliser l’éditeur PA, qui applique ses règles de conservation. La monnaie et la santé d’une session existante se règlent toujours avec leurs outils MJ.

Le `pv_max_initiaux` d’un personnage modèle est utilisé à sa création en session lorsque le module santé est actif ; il est aussi conservé dans l’export de scénario. Le maximum propre au personnage prévaut alors sur le maximum par défaut. Cela ne soigne pas les personnages existants.

## Protections et limites

Les imports de session sont réservés à `PREPARATION`, avant le premier lancement. Aucun import direct dans une partie en cours, en pause ou clôturée. Les corrections MJ restent disponibles selon leurs propres permissions et règles.

Les champs permettant de remplacer un solde, un stock détenu, une compétence acquise, des PA consommés, un compte utilisateur ou un accès privé ne sont pas acceptés. Les références d’images doivent désigner des médias `READY` du propriétaire. Les identifiants réels des participants, invitations, mots de passe et liens de connexion ne figurent pas dans les modèles.

Limites de cette version : fichier XLSX de 8 Mio, décompression de 16 Mio, 250 lignes de données par import (Meta et Parametres compris), charge JSON de 1 Mio. Le catalogue combiné reste soumis au plafond existant de 500 fiches. Le lot de changements est limité à 420 écritures de contenu, 480 avec les index de médias et la commande, 800 Ko par document et 3 Mio de données écrites. Les publications et historiques comptent aussi. Un complément trop gros est refusé avant application ; le fractionner en ensembles cohérents, avec les dotations jointes à leurs nouveaux personnages.

Les formules, erreurs Excel, macros et liens vers des classeurs externes sont refusés. Les rendus et tests de lecture des fichiers fournis ne remplacent pas une recette dans les applications natives Excel et Google Sheets.

Restent hors de ce format : participants réels, petites annonces et leurs contrats, caisses de groupe initiales, stocks collectifs initiaux, XP, protections de combat et effets avancés d’objets. Les outils déjà disponibles pour les annonces et les caisses restent utilisables dans la régie.

Depuis la 0.26, les lieux et profils peuvent être préparés dans les quatre nouveaux onglets ci-dessus ou dans leurs éditeurs dédiés. Les anciens classeurs de format 1 restent acceptés. Les profils importés voyagent dans les versions figées, archives et campagnes avec les mêmes règles que les profils créés à l’écran.

## Préparer les lieux et leurs actions

1. Créer chaque lieu dans **Lieux**, avec son `id`, `titre`, `type` et sa publication. `SEARCH` correspond à une fouille. `INSTALLATION` correspond à un équipement sabotable/réparable.
2. Dans **ActionsTerrain**, renseigner une ligne `SEARCH` pour une fouille ; une ligne `SABOTAGE` et une ligne `REPAIR` pour une installation. Chaque ligne possède son propre `id` durable, unique dans l’onglet, ainsi que `lieu_id` et `type`. Le couple lieu/type ne peut être défini deux fois. Une ligne existante ne peut changer de lieu ou de type. Un profil obligatoire ne s’archive pas seul : archiver son lieu.
3. Pour une fouille, renseigner entre 1 et 20 lignes **Recompenses**, chacune avec son `id` durable et `lieu_id`. Renseigner explicitement `quantite`, `stock_initial` et `limite_personnage`. Une installation n’a pas de récompense.
4. Une fouille peut référencer une installation par `installation_id` ; elle devient indisponible quand cette installation est hors service. Le QR est généré par le moteur à partir de l’identifiant du lieu. Aucun code de connexion privé dans le classeur.

Les récompenses utilisent `CREDITS` sans référence supplémentaire, `ITEM` avec `objet_id`, ou `KNOWLEDGE` avec `connaissance_id`. Un objet individuel se donne à l’unité. Utiliser une quantité de 1 pour une connaissance. Le stock désigne des **découvertes**, pas des unités : quantité 10 et stock 2 représentent deux découvertes de 10 crédits. Les crédits exigent une économie active. La première récompense encore disponible et admissible est attribuée, dans l’ordre enregistré. Modifier une récompense conserve sa position ; une nouvelle récompense est ajoutée en fin de liste.

Pour un profil nouveau, `duree_secondes` et le `test` de terrain sont obligatoires, même si la durée vaut 0. Le test est `AUTO` ou `D6` ; le second compare D6 + niveau + bonus au `seuil`. La compétence éventuelle doit être `PASSIVE`. Les délais suivent l’horloge du jeu.

| Colonne | Syntaxe et effet |
| --- | --- |
| durees_niveaux | `1:60;2:30` : durée en secondes selon le niveau. Chaque niveau apparaît une fois. |
| bonus_objets | `outil:1;scanner:2` : bonus matériel de 0 à 2 par objet. Le joueur choisit un objet admissible au lancement. |
| cout_pa | De 0 à 1000 ; vide à la création ou `!EFFACER` hérite du coût de session. `0` est explicitement gratuit. |
| recuperation_secondes | Terrain et pillage : de 0 à 86400 ; vide à la création ou `!EFFACER` hérite du réglage de session. Soins : 0, utiliser le délai patient. |
| consommable_id / consommable_quantite | Objet consommable et quantité. Une nouvelle référence exige sa quantité. `!EFFACER` dans l’identifiant retire le coût matériel ; laisser alors la quantité vide. |
| instructions / texte_reussite / texte_echec | Textes joueur ; `!EFFACER` les vide. Les notes MJ du lieu restent privées. |
| panne_secondes | De 0 à 604800 ; 0 signifie une réparation nécessaire. |
| verrou_echec_secondes | De 0 à 86400 ; 300 par défaut. |
| protection_reparation_secondes | De 0 à 86400 ; 0 par défaut. |

Les listes renseignées remplacent leur liste précédente. Une cellule vide conserve ; `!EFFACER` vide la liste. Les durées sont limitées à 86400 secondes, les niveaux requis à 100, les bonus à 20 objets par profil et les catalogues à 100 lieux et 100 interactions. Ces limites s’ajoutent aux plafonds globaux de l’import.

## Préparer les soins et le pillage

**Interactions** reprend les cinq profils décrits dans [Soins, aide et pillage](SOINS-AIDE-PILLAGE.md). La durée est obligatoire à la création. `LOOT_COMMON` n’a aucune compétence principale ; les quatre autres profils en exigent une. Les compétences référencées sont des expertises `PASSIVE`, dont l’effet actif est porté par le profil d’interaction. Elles restent distinctes des anciens soins instantanés `ACTIVE_TARGET` et `ACTIVE_SELF`.

`prerequis` accepte des expertises supplémentaires au format `secours:2;clinique:1` (10 maximum). `consommables_supplementaires` accepte `bacta:1` ; au plus trois consommables distincts au total, principal compris. Aucun consommable pour le pillage. Les listes vides et effacements suivent les conventions ci-dessus.

Les soins utilisent `soin_pv` (1 par défaut, soin de terrain), `niveau_reanimation` (2), `convalescence_secondes` (600), `recuperation_patient_secondes` (600) et `complement_secondes` (120, clinique accélérée). Les deux cliniques rendent le maximum de PV selon leurs règles existantes. Seule `CLINIC_FAST` utilise D6 ; les autres profils sont automatiques. Les valeurs détaillées et les conditions restent celles du guide des soins.

L’aide +1 se rattache aux actions D6 avec une expertise compatible. Aucun sixième type AIDE : l’assistant utilise le mécanisme d’offre d’aide existant, sans second PA.

La colonne `Objets.pillable` définit les nouveaux exemplaires du modèle. Modifier ce catalogue ne modifie pas les lots déjà détenus ; le réglage explicite d’un lot reste dans la régie.

## Préserver un lieu entre deux épisodes

Un nouveau lieu importé en session reçoit son état et son stock initial une seule fois. Un lieu existant conserve stock restant, découvertes individuelles, panne, protection et récupération. Son type et sa liste de récompenses sont immuables en session, y compris pendant la préparation d’un nouvel épisode. Les changements de texte, publication et profils d’action restent possibles. Pour apporter du stock, utiliser le réapprovisionnement MJ identifié ; pour une nouvelle cache, créer un nouvel identifiant.

Le master refuse une modification d’un lieu réservé par une action. Il ne recrée pas un état de lieu manquant et ne réutilise pas un identifiant possédant déjà un état orphelin. Un changement d’état après l’aperçu invalide la confirmation. Toute erreur bloque l’ensemble du complément, y compris les nouvelles fiches et réserves.

L’archivage d’un lieu ou d’une interaction dépublie sans supprimer ses historiques ou stocks. Les dépendances publiées doivent rester cohérentes : retirer le lien d’une fouille, ou la dépublier, avant d’archiver l’installation qu’elle exige. Une récompense peut être retirée d’un scénario par ARCHIVER avec son id, sa version et lieu_id, tant que sa fouille garde au moins une récompense. Cette suppression est interdite pour un lieu déjà créé en session.

Les imports restent limités à la préparation avant lancement. La publication de nouveaux contenus par XLSX pendant le jeu, les réserves par groupe, les notifications DIRECT/DISCRET, les annonces et les vaisseaux restent hors de ce lot. La logistique est ajoutée en 0.29 ci-dessous.


## Logistique — 0.29

L’onglet **Entrepots** accepte `CREER`, `MODIFIER` et `ARCHIVER`. Une création exige explicitement le nom, `capacite_volume` (entier positif), `loyer` (entier positif ou nul) et `periode_minutes` (entier positif). `ouvert` accepte OUI ou NON, avec NON par défaut. `description` est publique. Aucun montant ni délai du jeu n’est ajouté par défaut.

`loyer_groupe_id` désigne un groupe dont la caisse est déjà configurée dans le scénario ou la session. Vide à la création, ou `!EFFACER`, signifie que les crédits sont retirés de la circulation. Une cellule vide en modification conserve le bénéficiaire. L’aperçu refuse une caisse absente ou indisponible.

Le master CAMPAGNE prépare des définitions réutilisables. Le master SESSION, toujours limité à la préparation avant lancement, préserve le titulaire, le temps de bail restant, les lots, leurs quantités et leurs propriétaires. La capacité ne peut pas passer sous le volume occupé. `ARCHIVER` ferme aux locations et dépôts, conserve les biens et autorise les retraits selon les droits. L’import ne crée aucun bail, ne débite aucun loyer et ne dote pas un stock collectif.

`Objets.billes_par_recharge` est un entier strictement positif et exige `consommable = OUI`. Vide conserve le réglage ; `!EFFACER` retire cette fonction du catalogue. Les lots déjà créés gardent leur conditionnement. Les dotations personnelles peuvent référencer un modèle de recharge.

`Membres.droits` accepte `readStock`, `depositStock`, `withdrawStock` et `manageStorage`. Le retrait exige lecture et retrait ; gérer le bail ne donne pas accès au stock ou à la caisse. Les anciens classeurs sans ces colonnes et sans Entrepots restent acceptés. Les valeurs des exemples sont fictives et ne constituent aucun barème du GN. Voir [Logistique](LOGISTIQUE.md).


## Navigation — extension 0.31, format 1 conservé

Les quatre téléchargements incluent maintenant **Vaisseaux** et **Routes**. Le master CAMPAGNE définit les vaisseaux du scénario et leurs routes ; le master SESSION complète ou modifie un épisode en préparation. Les anciens fichiers restent acceptés sans ces onglets.

- `Parametres.astroport_id` : identifiant du port local, commun aux routes et aux positions des vaisseaux.
- `Vaisseaux` : propriétaire `CHARACTER` ou `GROUP`, capacité de soute, disponibilité à quai, ouverture, modèle de carburant, capacité de réservoir, carburant et port initiaux.
- `Routes` : nom, description, départ, arrivée, durée positive en secondes de jeu, coût entier positif ou nul en unités du réservoir, ouverture. Créer séparément chaque sens.
- `Membres.droits` : `pilotShip` pour piloter et ravitailler. Lecture et retrait du carburant collectif restent des droits distincts.
- Le carburant est un modèle Objets empilable et consommable, sans recharge laser. Une unité commerciale = une unité de réservoir. La catégorie « Carburant » seule ne crée aucun effet.

Les quatre champs de navigation d’un vaisseau se renseignent ensemble à sa première activation. Un réimport ne réinitialise ni le carburant restant ni le port actuel. Il protège les capacités occupées et interdit un changement de propriétaire si la soute contient des biens. ARCHIVER ferme le vaisseau ou la route sans supprimer de stock ou de carburant. Un voyage commencé conserve sa définition de départ et doit être terminé avant la clôture de campagne.

Les exemples sont fictifs, avec réservoir vide et sans distribution de carburant. L’organisation choisit ses propres barèmes et attribue les stocks au comptoir. Les imports ne créent aucune dotation supplémentaire sur un personnage existant. Voir [le parcours de navigation](LOGISTIQUE.md#réservoirs-et-voyages--031).


## Économie — extension 0.33, format 1 conservé

Les quatre fichiers incluent **Cours** et **EvenementsEco**. Le premier définit le prix unitaire de base d’un modèle et l’ouverture de son cours. Le second cible une marchandise ou une route, avec pourcentages entiers, suspensions, activation et déclenchement manuel ou lié à une installation hors service.

Les références sont contrôlées sur l’ensemble du master, y compris les objets, installations et routes créés dans le même import. Les versions publiées, les archives et les campagnes conservent ces définitions. ARCHIVER désactive. Les soldes, lots et voyages joués ne sont pas recalculés par un import. Les exemples proposent trois événements désactivés.

Le [guide des conséquences économiques](EVENEMENTS-ECONOMIQUES.md) détaille les colonnes, le cumul, les arrondis et les cas de suspension. Les paramètres et opérations des onglets existants restent identiques.


## Douanes et corruption — extension 0.36, format 1 conservé

L’onglet **Tarifs** figure dans les quatre XLSX. Il configure les définitions de droits de passage du scénario ou de la session, sans paiement immédiat. Les anciens fichiers sans cet onglet restent valides et conservent les tarifs existants.

| Colonnes | Règle |
| --- | --- |
| `id`, `operation`, `version` | Identifiant stable ; CREER, MODIFIER ou ARCHIVER ; version entière à augmenter lorsque le contenu change. |
| `titre`, `description` | Titre obligatoire, 150 caractères maximum ; description facultative, 2 000 caractères. Visibles dans le devis joueur. |
| `nature` | CUSTOMS (douane) ou CORRUPTION (pot-de-vin). Aucun effet automatique d’exemption. |
| `mouvement` | LOAD vers une soute, UNLOAD depuis une soute, TRANSSHIP entre soutes. |
| `objet_id` | Modèle existant, publié si le tarif est actif. Vide à la création : tous les objets. En modification, vide conserve ; `!EFFACER` vise tous les objets. |
| `montant_fixe`, `montant_unitaire` | Entiers positifs ou nuls, tous deux obligatoires à la création, même pour zéro. Total : fixe + unitaire × quantité commerciale. |
| `beneficiaire_type` | CHARACTER, GROUP ou SINK. Obligatoire à la création. |
| `beneficiaire_id` | Identifiant du personnage ou du groupe dans le master. Jamais l’identifiant technique du compte. Changer vers CHARACTER ou GROUP exige de renseigner cet identifiant. |
| `actif` | OUI ou NON ; NON par défaut. Économie configurée et références publiées pour activer. |

Pour **GROUP**, configurer d’abord la caisse dans l’éditeur de scénario ou dans la régie, puis importer le tarif. Créer un groupe dans le master ne suffit pas à lui ouvrir une caisse. Pour **SINK**, laisser le bénéficiaire vide ou utiliser `!EFFACER` : les crédits seront retirés de la circulation au paiement. Aucun compte ni crédit n’est créé par une ligne Tarifs. Un nouveau personnage créé dans le même import de session peut recevoir les paiements : son compte est initialisé par le mécanisme de création du personnage.

Toutes les règles applicables se cumulent. Maximum **50 définitions**, désactivées comprises. Un transfert sac ↔ entrepôt ne passe pas par une soute et reste hors de ces droits. Le carburant et les recharges laser peuvent être visés comme toute autre marchandise ; remplir un réservoir n’est pas un transfert de cargaison.

**ARCHIVER** ne contient que `id`, `operation` et `version` : il désactive sans supprimer. MODIFIER avec `actif=OUI` peut réactiver. Une ligne absente ne supprime rien. Les montants vides en modification conservent leur valeur. Une référence active empêche de dépublier son objet ou bénéficiaire ; désactiver le tarif dans le même import permet de retirer cette dépendance, sous réserve des autres usages.

Le contrôle serveur porte sur l’ensemble des données après import : montants, références, bénéficiaires et comptes existants de session. L’aperçu montre le bénéficiaire lisible en plus des différences. Si les données ou le compte bénéficiaire changent après l’aperçu, une nouvelle confirmation est nécessaire. Le motif et les différences sont conservés dans l’historique d’import et celui de la ligne ; le journal de la régie conserve ses propres modifications.

Les tarifs suivent la version publiée, les nouvelles sessions indépendantes ou de campagne et les archives de scénario. Les anciennes versions et archives sans tarifs restent valides. Les archives contiennent les définitions, sans soldes ni reçus de paiement.

Le master SESSION reste réservé à **PREPARATION, avant le premier lancement**. Pendant la partie, utiliser **Régie → Vaisseaux et chargements → Douanes et corruption**. Un import ne modifie ni les soldes, ni les lots, ni les reçus, ni les devis des transferts déjà réservés. Le paiement conserve le montant annoncé à la réservation et intervient à réception.

Les exemples sont **fictifs et désactivés** : droit de chargement de 2 + 1 par unité, arrangement de déchargement du carburant de 3 + 0 par unité. L’exemple session modifie le fixe du premier à 4 et ajoute un droit de transbordement de 0 + 1 par unité. Le modèle vierge n’impose aucun montant.


## Atelier modulaire — candidat 0.37 (non déployé)

Les six entrées de l’atelier acceptent des imports limités à leur module. La colonne facultative `Meta.module` conserve cette frontière même si le fichier est chargé dans le champ global. Les références croisées sont contrôlées sur les données existantes ; pour créer plusieurs domaines ensemble, continuer d’utiliser le Master global. Les quatre fichiers téléchargeables sont inchangés.

Le premier éditeur/export complet concerne **Tarifs**, dans Économie / Stockage. Ses formulaires et XLSX passent par le même plan et la même confirmation que les anciens imports. Les identifiants des nouveaux tarifs et versions suivantes viennent du serveur. Un export contient le contexte et la révision : réexporter après une autre modification. Un réimport strictement identique déjà appliqué reste sans effet, même si cette première application a fait avancer la révision.

Ce lot ne fournit pas encore l’export complet des six modules. Les nouveaux magasins, rendez-vous, achats de vaisseaux et combats ne sont pas simulés. Voir le [périmètre L1](L1-ATELIER-MODULAIRE.md) et la [recette distincte des tests](VALIDATION-0.37.md).
