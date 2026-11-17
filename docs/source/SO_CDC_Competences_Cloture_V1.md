# Space Outlaws

## Cahier des charges de clôture des compétences

Version 1.0 • 15 novembre 2026
Destinataire : Guillaume et l’agent chargé du développement

Objectif : achever les parcours numériques manquants, vérifier les interactions des 34 capacités joueurs et préparer une recette humaine permettant de décider de leur mise en jeu. Le travail se concentre sur six lots fonctionnels, sans réécrire les parcours déjà opérationnels.

### Base de référence

GN Engine 0.39.0, dépôt gkerckhofs-a11y/gn-engine, branche main. Commit de référence : 98a3342d6f9c789f2edcc2c75faf1776296d7171. Les constats ci-dessous portent sur cette base et sur la simulation du 15 novembre 2026. Les règles V0.7 et les décisions explicites ultérieures restent l’autorité de jeu. [S1–S5]

| Lot | Résultat attendu | Compétence |

| --- | --- | --- |

| C1 | Diagnostic technique relié aux états réels du jeu | MEC-01 |

| C2 | Réparations et protections mécaniques complètes | MEC-02 |

| C3 | Modules droïdes, technologies rares et prototypes | MEC-03 |

| C4 | Sabotages N3 à N5 avec effets et remise en service | Sabotage |

| C5 | Intrusion des soutes et coffres de vaisseaux | INF-01 |

| C6 | Services, fret et contrats PNJ négociables | COU-02 |



### Ce qui est déjà démontré

La simulation a réussi 467 cas applicatifs distincts, 39 cas Firestore émulés et 3 parcours HTTP avec authentification émulée. Une scène Toxicologie → Diagnostic → Antidote a également réussi ses 12 points de contrôle en mémoire et sur Firestore. Les sélections se recouvrent entre environnements ; ces chiffres ne s’additionnent pas en fonctionnalités couvertes. [S5]

Soins, atelier intégral de droïde, maintenance Coque/Bouclier/révision de vaisseau, modules standards, analyses préparées, documents, fouilles, traces et plusieurs parcours commerciaux disposent déjà de preuves. Leur maintien fait partie de la recette ; leur présence ne certifie pas les niveaux ou raccords encore incomplets. [S3–S5]

### Périmètre de clôture

24 capacités de classe et 10 supplémentaires. FOR-01 reste exclusivement PNJ et hors périmètre. Les gestes de combat demeurent des scènes physiques : l’application présente les règles et suit leurs conséquences prévues, sans créer une commande d’attaque à distance. La présente livraison est un cahier des charges ; elle n’exécute aucun développement ni déploiement.

## 1 Exigences communes à tous les lots

T01  Réutiliser les moteurs de personnages, actions, objets, comptes, vaisseaux, contrats et publication. Une règle métier doit avoir une seule source serveur, commune au joueur, à la régie et aux tests.

T02  À l’ouverture, à la confirmation et au réessai : contrôler session, personnage actif, compétence effective, niveau, rareté débloquée, droits, cible, version et état courant. Une compétence secondaire donne uniquement ses propres capacités ; une URL ou un QR ne donne aucun mandat.

T03  Réserver puis consommer PA, objets, pièces et crédits au moment prévu par chaque règle. Répéter une confirmation après perte réseau doit retourner le même résultat sans nouveau coût, nouveau jet ni nouvel objet. Deux acteurs concurrents ne peuvent consommer le même bien.

T04  Conserver les horloges natives : temps de jeu, délais réels, pause et STOP. La validité COU-02 de cinq minutes est réelle. Le chronomètre vital et les techniques physiques gardent leurs règles particulières. Ne pas uniformiser ces durées par commodité.

T05  Séparer PV, protection personnelle, état des modules, Coque, Bouclier et révision. Une neutralisation temporaire n’est pas un dommage durable. Un soin ne recharge pas la protection. Une remise en service ne répare pas gratuitement une avarie.

T06  Versionner les contenus et capacités du Master. Une nouvelle publication peut ouvrir les nouveaux parcours dans une nouvelle session ; elle ne modifie pas implicitement les Masters publiés, anciennes sessions ou historiques. Toute migration éventuelle est un chantier distinct.

T07  Conserver les identifiants d’objets, droits de propriété, contenus, reçus et historique. La clôture d’épisode suit A38 : aucune restauration gratuite de PV, protection, modules, carburant ou stocks. Les effets temporaires et voyages suivent leur continuité native.

T08  Projeter seulement les données accessibles : aucun inventaire complet par simple scan, aucune réponse de niveau supérieur, identité du saboteur ou code secret dans une réponse de refus, un reçu ou le navigateur d’un tiers.

### Interface exigée

Le joueur voit ce qu’il peut faire, sur quelle cible, avec quel matériel, pendant combien de temps et pour quel coût. Afficher l’effet exact, la raison d’un refus et ce qui manque avant confirmation. Proposer QR et saisie manuelle, un état d’attente puis un résultat lisible. La régie sur PC prépare, contrôle et suit les opérations ; les écrans joueurs doivent rester utilisables sur téléphone.

### Arbitrage limité à résoudre

Pour la recharge du blindage de droïde et du bouclier personnel, les sources identifient MEC-02, la fourniture compatible et le plafond de protection, mais le barème complet d’exécution n’est pas confirmé : niveau minimal, durée, coût et récupération spécifiques. Je ne sais pas quel barème complet a été validé. Retrouver une décision explicite ou faire trancher ces seules valeurs avant activation ; ne pas recopier automatiquement Entretien de protection. [S1, chapitres 5 et 11 ; S2, annexe A]

Les profils exceptionnels N5, plans, stocks et réponses de scénario relèvent de la préparation du Master. Un contenu absent bloque sa publication ou son action ; il ne doit pas être inventé par le moteur.

## 2 Lot C1 Diagnostic technique dynamique

Compétence : MEC-01. Le parcours d’analyse technique préparée existe ; il faut le raccorder aux états natifs des droïdes, installations et vaisseaux accessibles. [S1, chapitre 11 ; S3 ; S6]

| Niveau | Information garantie selon la cible |

| --- | --- |

| N1 | État général, dommages et avaries visibles. |

| N2 | Panne, pièces et intervention nécessaires. |

| N3 | Défauts cachés et anomalies mécaniques. |

| N4 | Systèmes complexes et modifications clandestines. |

| N5 | Défaillances approfondies et interactions entre systèmes. |



C1.1  Associer chaque cible à une entité native et à une version d’état technique. Lire automatiquement les informations ordinaires accessibles au niveau ; utiliser uniquement des renseignements préparés pour les défauts cachés et compléments de scénario. Aucun indice créé à partir d’un texte libre.

C1.2  Conserver 60 secondes, 1 PA et dix minutes de récupération. Limiter la tentative approfondie à une par personnage et version de panne. Ne pas imposer un jet pour lire l’état ordinaire ; un test éventuel porte sur le renseignement caché préparé.

C1.3  Présenter séparément les PV du droïde, son blindage épuisé, un module neutralisé et un module endommagé. Pour un vaisseau : distinguer Coque, Bouclier, révision et modules. Une observation ne répare, ne recharge et ne déverrouille rien.

C1.4  Au niveau permettant le diagnostic, proposer l’intervention native compatible et ses prérequis. Le devis provient du même calcul que la réparation réelle. L’absence de compétence ou de mandat interdit l’exécution, sans falsifier le résultat du diagnostic.

C1.5  Si une panne ou un module change pendant l’analyse, appliquer la règle native de version périmée et libérer les réservations selon l’état de l’action. Une simple relecture d’un résultat reste gratuite et datée ; elle n’actualise pas secrètement le diagnostic.

### Recette obligatoire

C1-A : diagnostiquer un droïde blessé avec DR-01 épuisé et un autre module endommagé ; obtenir trois états distincts et aucune restauration. C1-B : réparer la cible pendant une seconde analyse ; empêcher une résolution sur l’ancienne version. C1-C : comparer N1, N2 et N5 sur la même cible, avec un renseignement caché préparé ; vérifier les projections privées et les coûts.

C1-D : diagnostic d’installation sabotée puis de vaisseau nécessitant une révision ; les propositions conduisent aux bonnes opérations C2/C4. C1-E : réponse réseau perdue puis confirmation répétée ; un seul diagnostic payé. Tester aussi cible non accessible, ancien Master et absence de PA.

### Critère de fin

Les trois familles de cibles produisent un diagnostic fidèle à leur état courant, avec des informations filtrées par niveau et une orientation vers les interventions autorisées. Les analyses préparées existantes restent opérationnelles. Les tests couvrent mémoire, persistance et accès HTTP.

## 3 Lot C2 Réparations et protections

Compétence : MEC-02, avec MEC-03 lorsque requis. Conserver les soins mécaniques, l’atelier intégral et la maintenance native des vaisseaux. Compléter les opérations qui agissent sur des états distincts. [S1, chapitres 5, 11, 15 et 17 ; S3–S6]

C2.1  Créer le parcours de recharge du blindage DR-01 et du bouclier personnel avec leurs fournitures compatibles. Restaurer au plus 1 point de protection, sans cumul et sans PV rendus. Un module endommagé ne devient pas opérationnel par une simple recharge. Activation subordonnée au barème à résoudre dans la section 1.

C2.2  Réparer un module de droïde durablement endommagé à l’atelier : MEC-02 N2 et MEC-03 du niveau du module ; 1 PA, sans jet. N1 : 5 minutes ; N2 : 10 minutes. Pièces réellement disponibles : 25 % du prix neuf, arrondis aux 25 Cr supérieurs. Préserver identité, propriétaire, emplacement et contenu.

| Module | Niveau MEC-03 | Pièces | Durée |

| --- | --- | --- | --- |

| DR-01 | N1 | 75 Cr | 5 min |

| DR-02 | N1 | 50 Cr | 5 min |

| DR-03 | N2 | 100 Cr | 10 min |

| DR-04 | N2 | 100 Cr | 10 min |

| DR-05 | N2 | 75 Cr | 10 min |

| DR-06 | N2 | 100 Cr | 10 min |



Exemple de calcul : DR-03 vaut 350 Cr ; 25 % = 87,50 Cr, arrondis au multiple supérieur de 25 Cr = 100 Cr. Prestation PNJ supplémentaire : 50 Cr pour N1, 100 Cr pour N2. Une interruption avant fin libère les éléments réservés, sans réparation partielle. Réparer DR-01 ne recharge pas sa protection épuisée.

C2.3  Raccorder la réparation durable des modules de vaisseau au moteur de maintenance et au catalogue C3 : MEC-02 N2 + MEC-03 requis ; 1 PA ; 5 minutes standard, 10 minutes rare N4, 15 minutes prototype N5 ; pièces = 25 % du neuf. Supplément PNJ : 0,5 % de la valeur du vaisseau par intervention. Vérifier le raccord existant avant toute extension : la maintenance inspectée expose révision, Coque et Bouclier, pas une preuve de réparation complète des modules.

C2.4  Vérifier le parcours de panne durable d’installation, distinct de la levée d’un sabotage. Profil ordinaire canonique : 5 minutes, 2 pièces, test au seuil de la cible, consommables au jet même sur échec. Les cibles avancées annoncent leurs propres conditions. Compléter seulement les raccords manquants démontrés par l’audit initial.

### Recette obligatoire et fin du lot

C2-A : révision intégrale du droïde, puis recharge, puis réparation de module : chaque action ne modifie que son état. C2-B : DR-03 réparé pour 100 Cr de pièces, consommées une seule fois, sans débit monétaire doublé. C2-C : interruption et concurrence sur le même module. C2-D : module vaisseau réparé sans restaurer Coque/Bouclier. C2-E : ancienne maintenance conserve ses points déjà achevés après interruption. Le lot est terminé lorsque ces opérations ont des effets natifs et que le barème de recharge est sourcé.

## 4 Lot C3 Modules des droïdes

Compétence : MEC-03. Installer, retirer, réparer et neutraliser doivent agir sur les mêmes objets persistants. Le module ne donne jamais la compétence nécessaire pour l’utiliser. [S1, chapitre 11 ; S2, annexe modules]

| Module | Prix et niveau | Effet à raccorder |

| --- | --- | --- |

| DR-01 Blindage | 300 Cr • N1 | 1 protection personnelle, sans cumul ; réserve épuisable. |

| DR-02 Outillage | 200 Cr • N1 | Outils réutilisables ; aucun consommable, atelier ou savoir offert. |

| DR-03 Scanner | 350 Cr • N2 | +1 aux tests compatibles MEC-01 ou TRA-01 ; pas de bonus doublé. |

| DR-04 Interface | 350 Cr • N2 | +1 INF-01 sur terminal compatible ; compétence exigée. |

| DR-05 Mémoire | 300 Cr • N2 | Un document numérique ; ouverture non autorisée INF-02 N2+ ; aucune copie créée. |

| DR-06 Compartiment | 400 Cr • N2 | Une unité compatible cachée à ROG-02 ; découverte TRA-02 selon ses règles. |



C3.1  Deux emplacements par droïde joueur, aucun troisième ni module de départ gratuit. Atelier, permission du propriétaire et conditions hors combat. Pose N1 : 5 minutes ; pose N2 : 10 minutes ; retrait N1/N2 : 5 minutes. Chaque opération coûte 1 PA et exige MEC-03 au niveau du module.

C3.2  Faire circuler le même identifiant entre inventaire, installation, retrait, réparation et vente. Un module installé ne peut être vendu ou pillé directement. Lors d’un retrait, son effet cesse et son contenu reste suivi sans duplication. L’interruption restitue les ressources seulement réservées.

C3.3  Suivre les états opérationnel, épuisé pour DR-01, neutralisé temporairement et endommagé durablement. Si panne et protection vide coexistent, conserver ces deux informations. Neutraliser ou retirer un module ne soigne pas le droïde ; passer à 0 PV ne détruit pas automatiquement ses modules.

C3.4  Raccorder DR-03/04 aux calculs de bonus natifs, DR-05 aux droits documentaires et DR-06 aux fouilles et quotas existants. Le contenu privé reste invisible à un tiers non autorisé. Une installation interrompue ne produit aucun bonus. Une révocation bloque la poursuite d’une intervention non autorisée.

Prestation PNJ : installation 50 Cr N1 / 100 Cr N2, retrait 50 Cr, en plus du prix réel du module. Utiliser les paiements existants et les restrictions de crédits protégés ; aucune recharge gratuite par démontage et remontage.

### Recette obligatoire

C3-A : installer deux modules, refuser le troisième et refuser N2 avec MEC-03 N1. C3-B : activer le bonus d’un scanner, le neutraliser, le rétablir puis le retirer : effet présent une seule fois au bon moment. C3-C : ouvrir une mémoire sans autorisation par INF-02 N2, sans copie d’objet ; refuser N1. C3-D : protéger une unité par DR-06, puis la soumettre à TRA-02. C3-E : changer d’épisode avec un module endommagé et un blindage vide ; conserver les états.

## 5 Lot C3 Technologies rares et prototypes

Étendre le parcours des modules standards aux quatre références canoniques, avec fabrication, pose, effets, entretien, retrait et propriété. Les niveaux N4/N5 ne sont pas de simples textes de fiche. [S1, chapitre 17]

| Référence | Effet effectif en jeu |

| --- | --- |

| R04-01 Brouilleur | +1 à une fuite ordinaire ou au décrochage initial PIL-03 N1 ; une fois par voyage, annoncé avant le jet, sans autre bonus spécial sur ce test. |

| R04-02 Coffre sécurisé | Protège jusqu’à 5 unités déjà comprises dans le fret ; cargo/transport seulement. Clé, autorisation ou INF-01 N3+ sur cible préparée. |

| R05-01 Bouclier régénératif | +1 Bouclier en fin d’un round choisi, une fois par combat, sans dépasser le maximum et seulement si Coque > 0. |

| R05-02 Transpondeur fantôme | Identité de couverture secondaire préparée et vérifiable ; le registre permanent et l’identité d’origine restent conservés. |



| Fabrication et pose | N4 | N5 |

| --- | --- | --- |

| MEC-03 requis | N4 | N5 |

| Valeur totale sur vaisseau | 30 % | 50 % |

| Ressources courantes incluses | 20 % | 30 % |

| Composants rares inclus | 10 % | 20 % |

| Durée et PA | 20 min • 1 PA | 30 min • 1 PA |

| Retrait | 10 min • 1 PA | 15 min • 1 PA |



C3.5  Exiger plan accessible, composants réellement disponibles, atelier, mandat valide et emplacement libre. Conserver le plan. Fabrication et pose constituent le profil canonique unique, sans supplément d’installation. Ne pas créer de boutique illimitée ni convertir automatiquement des crédits en composants rares.

C3.6  Raccorder chaque effet aux voyages, rounds de combat, documents et mouvements de fret natifs. Contrôler les quotas côté serveur et leur reprise après reconnexion. Le coffre ne crée pas de volume ; découvrir la soute ne déverrouille pas son coffre.

C3.7  Conserver identité, état et calibration au retrait. Bloquer le démontage d’un contenant avant transfert ou consignation explicite de son contenu. Une diminution des maxima ne rend pas de points. Réparation par C2 ; reprise PNJ seulement sur offre disponible : 50 % du neuf en bon état, 20 % endommagé.

### Recette obligatoire et fin du lot

C3-F : sur cargo de référence 10 000 Cr, fabrication N4 = 3 000 Cr de ressources au total, dont 2 000 courantes et 1 000 rares ; aucun second coût de pose. C3-G : refuser plan absent, composants insuffisants ou coffre sur chasseur. C3-H : quota du brouilleur et du bouclier résistant au double clic et à la reconnexion. C3-I : identité de couverture contrôlée sans effacement du registre. C3-J : coffre plein non démontable ; aucun module dupliqué. Fin : les dix références DR/R ont une chaîne complète d’usage et de persistance.

## 6 Lot C4 Sabotage avancé et restauration

Compétence supplémentaire rare : Sabotage. Conserver les installations N1–N2 déjà raccordées et étendre les cibles préparées aux niveaux supérieurs. [S1, chapitre 15, A15 ; S3]

| Niveau | Cible admissible | Remise en service anticipée |

| --- | --- | --- |

| N3 | Un module installé de droïde ; hors combat, capture ou scène de maintenance autorisée. | MEC-02 N2 • 3 min • 1 PA. |

| N4 | Un système précis de vaisseau à quai, sur un point technique accessible. | MEC-02 N3 + MEC-03 N2 • 5 min • 1 PA. |

| N5 | Équipement exceptionnel explicitement préparé. | Profil du Master obligatoire. |



C4.1  Réutiliser le profil ordinaire : 5 minutes, 1 PA, kit consommable, D6 + niveau + bonus matériel/aide admissible ≥ 6 ou seuil de scénario annoncé. Consommer kit et PA au jet même en cas d’échec ; récupération personnelle de dix minutes.

C4.2  Échec : aucun effet, verrou de cinq minutes sur cette cible et ce type de sabotage. Succès : neutralisation temporaire de quinze minutes au maximum, une seule panne active par cible. Annulation avant jet : restituer les réservations. Après remise en service ou expiration : protection de quinze minutes contre un nouveau sabotage ordinaire.

C4.3  La fiche publiée désigne l’entité et le système affectés, l’effet exact, le seuil, la durée et le rétablissement. Désactiver réellement la fonction concernée : bonus de module, capacité ou système choisi. Un simple message « saboté » sans contrôle par le service dépendant ne satisfait pas le lot.

C4.4  Rétablir seulement la neutralisation à l’échéance ou après intervention. Une panne durable préexistante reste présente, de même que la protection épuisée. Ne pas consommer de pièces pour lever la neutralisation seule. Le journal conserve l’effet, son origine autorisée et sa fin.

C4.5  Recontrôler le quai avant résolution. Si le voyage a commencé, ne pas modifier rétroactivement ses paramètres. Le sabotage d’un droïde ne retire pas de PV et ne prive jamais le joueur de ses moyens hors jeu. Une cible N5 incomplète reste non publiable et non jouable.

### Recette obligatoire

C4-A : saboter DR-03, constater la disparition du bonus, lever la panne puis retrouver le seul bonus légitime. C4-B : tester expiration sans consultation, puis visite tardive : la protection démarre à l’échéance réelle. C4-C : deux saboteurs sur le même système ; un seul effet et des coûts cohérents. C4-D : système à quai ciblé puis départ intervenu avant résolution : refus sans modification du voyage. C4-E : neutralisation sur module déjà endommagé ; expiration ne le répare pas. C4-F : N5 préparé et N5 incomplet, succès et refus documentés.

### Critère de fin

Les niveaux N1–N5 produisent les effets préparés et leurs restaurations natives. Les restrictions de situation, niveaux, récupération, protection et état durable sont testées. Le MJ voit les pannes actives, leur échéance et leur motif sans devoir les annuler manuellement pour rétablir le système.

## 7 Lot C5 Intrusion des soutes et coffres

Compétence : INF-01. Le moteur gère déjà des serrures, coffres et terminaux préparés. Il faut relier une cible préparée aux droits effectifs sur MOD-04 et R04-02, en conservant les contrôles de fret. [S1, chapitres 14, 17 et capture ; S3]

C5.1  Associer chaque cible d’intrusion à un contenant et à sa version de verrouillage. Exiger INF-01 N3 au minimum pour les soutes/coffres de vaisseaux concernés. Conserver les voies distinctes : code valide, autorisation de jeu, intrusion ou inspection habilitée. La capture du bâtiment seule ne donne pas accès à tout son contenu.

C5.2  Réemployer D6 et seuil préparé, ou mini-jeu préparé en remplacement du D6. Pour le profil ordinaire : 1 PA, récupération dix minutes, durées N1→N5 de 180/165/150/135/120 secondes. Sur cible exigeant N3, N1/N2 sont refusés. Consommables, aides et verrous suivent la fiche ; aucun second jet après un mini-jeu réussi.

C5.3  En cas de réussite, produire un droit de jeu limité au contenant désigné, utilisable par les services natifs de lecture ou de mouvement autorisés. Définir dans le profil ce qui est révélé et ce qui est ouvert. Ne pas donner un rôle de propriétaire, un mandat de pilotage, un accès à la caisse ou des droits MJ.

C5.4  Séparer découverte de la soute cachée, ouverture du coffre et transfert de biens. Le succès ne téléporte pas le stock et n’annule ni capacité de fret, ni localisation, ni garde, retenue, propriété ou licence applicable. Tout transfert utilise le journal et les transactions existants.

C5.5  Lier la preuve d’ouverture au personnage, à la cible et à sa version. Recontrôler changement de serrure, déplacement ou retrait du module, changement de personnage et fin d’épisode selon les règles natives. Aucune durée d’accès universelle nouvelle : tout paramètre non défini doit être préparé ou arbitré avant activation.

C5.6  Révéler uniquement les éléments obtenus. Avant réussite, les listes et erreurs ne donnent ni code, ni contenu complet, ni clé interne de l’objet. Le résultat reste consultable selon ses droits sans recommencer artificiellement l’action.

### Recette obligatoire

C5-A : INF-01 N2 refuse un coffre R04-02 ; N3 peut le tenter. C5-B : ouvrir une soute contenant un coffre verrouillé ; le coffre demeure fermé. C5-C : réussir l’ouverture puis transférer une unité admissible par le mouvement natif, avec contrôle de capacité. C5-D : réessai réseau et deux tentatives simultanées ne dupliquent ni objet ni débit. C5-E : serrure révisée pendant la tentative ; ancien résultat inutilisable. C5-F : inspection habilitée et autorisation ordinaire continuent à fonctionner sans compétence d’intrusion.

### Critère de fin

Une intrusion réussie permet réellement l’action préparée sur le bon contenant, tout en conservant les limites de propriété et de logistique. La recette couvre aussi le coffre rare créé par C3, une cargaison sous retenue et un acteur dépourvu de droit de lecture du reste du vaisseau.

## 8 Lot C6 Négociation de services et contrats

Compétence : COU-02. Conserver la remise déjà raccordée aux offres PNJ et au cours planétaire. Étendre les offres éligibles aux services, fret PNJ et marchés ou contrats exclusifs préparés, via leurs opérations natives. La négociation libre entre joueurs conserve son prix convenu. [S1, chapitre 13 ; S3–S4]

| Niveau | Accès canonique selon scénario |

| --- | --- |

| N1 | Marchandises ordinaires. |

| N2 | Fournitures spécialisées. |

| N3 | Offres de gros. |

| N4 | Marchandises rares et services négociables. |

| N5 | Marchés et contrats exclusifs préparés. |



C6.1  Une offre PNJ porte explicitement sa négociabilité, le niveau requis, la version, le prix initial, le lot ou service concerné et l’opération native qui la réalise. Aucun tarif, taxe, amende, salaire ou service ne devient négociable automatiquement. Le fret PNJ doit avoir une offre préparée ; un contrat entre joueurs ne reçoit pas une remise unilatérale.

C6.2  Conserver deux minutes, 1 PA, récupération dix minutes, une tentative par Courtier et version d’offre ; D6 + compétence + aide autorisée ≥ 6. Réussite : total à 90 %, arrondi au crédit supérieur, minimum 1 Cr. La remise reste 10 % à tous les niveaux et ne se cumule pas.

C6.3  Validité de cinq minutes réelles depuis la réussite, sur le lot ou service concerné ; une consultation ne prolonge rien. Préparer le devis à partir du tarif courant et refuser la preuve si ce tarif, sa version ou les conditions liées ont changé.

C6.4  Appliquer la remise au paiement natif et à la création de la prestation ou du contrat en une opération cohérente : solde et réservations, budget PNJ, stock ou capacité de service, reçu et preuve utilisée. Une confirmation répétée ne facture pas deux fois. Une offre exclusive ne peut être attribuée deux fois.

C6.5  La remise ne paie pas les frais annexes non inclus et n’efface aucune licence ou obligation. Afficher base négociable, remise, taxes/frais séparés et total final. Si une règle ne fixe pas le traitement d’un frais, l’offre doit l’annoncer explicitement avant publication.

C6.6  Après acceptation, conserver prix et obligations contractuels ; un changement ultérieur du marché ne recalcule pas le contrat historique. Les paiements par caisse de groupe exigent leurs mandats propres ; le seul droit de payer ne révèle pas le solde.

### Recette obligatoire et fin du lot

C6-A : offre préparée de 101 Cr, prix négocié = 91 Cr (101 × 0,90 = 90,90, arrondi supérieur). C6-B : utiliser à la limite des cinq minutes puis après expiration. C6-C : prix modifié entre devis et règlement, aucune ancienne remise appliquée. C6-D : deux acheteurs sur un contrat exclusif, un seul bénéficiaire. C6-E : fret PNJ négocié et réglé ; contrat joueur libre inchangé. C6-F : fonds insuffisants ou mandat révoqué, aucune prestation ni preuve consommée à tort. Fin : les trois familles nouvelles aboutissent à une prestation ou un contrat réel et traçable.

## 9 Recette intégrée et livraison

### Ordre de réalisation proposé

Vérifier HEAD et les travaux concurrents. Réaliser C3 droïdes et C2 avec un état de module commun ; raccorder C1. Terminer les rares C3, puis C4 et C5. C6 est indépendant. Chaque tranche comprend préparation MJ, parcours joueur, effet serveur, tests et documentation.

### Préparation nécessaire

Créer un Master et une session isolés : huit classes, un droïde, niveaux de test, ateliers, clinique, cibles N1–N5, plans, dix modules DR/R, offres PNJ, documents et stocks finis. Prévoir vaisseau personnel et vaisseau de groupe avec mandats limités. Identifier les dotations de test.

Contrôler brouillon, références, publication, session et aller-retour export/import sans perte silencieuse. Les anciens manifestes restent lisibles et fermés aux nouvelles capacités. Tester aussi XP, prérequis, déblocage rare et compétence secondaire sans droit de classe supplémentaire.

| Scène intégrée | Résultat à observer |

| --- | --- |

| R1 Mécano et droïde | Diagnostic → réparation PV → module → recharge ; états indépendants ; retrait et épisode suivant. |

| R2 Saboteur et Mécano | Sabotage N3/N4 → fonction indisponible → remise en service ; expiration et panne durable distinctes. |

| R3 Infiltrateur et Traqueur | Soute → coffre → bien/document → déchiffrement/vérification ; aucun accès ou objet supplémentaire. |

| R4 Courtier et Pilote | Offre PNJ → remise → contrat → préparation → vol → livraison → règlement ; coûts et obligations conservés. |

| R5 Médecin et toxicologue | Dose volontaire → diagnostic → antidote ; refus droïde, aucun dégât ou soin inventé. |

| R6 Terrain et concurrence | Techniques physiques, deux téléphones, perte réseau, révocation, STOP, reprise et changement de personnage. |



### Preuves à livrer

Par lot : compilation, tests ciblés de succès, refus, version périmée, interruption et concurrence ; Firestore émulé et HTTP selon l’impact. Utiliser la sélection CI existante. Avant intégration/publication : CI complète sur le SHA exact. Ne pas additionner les campagnes qui se recouvrent.

Recette humaine : organisateur sur PC, joueurs Android et iOS, QR et saisie manuelle, chronomètres réels et coordination. Observer séparément Désarmement, Riposte, Garde du corps, Neutralisation furtive et sabre avec les conventions du livre. Un test logiciel ne valide pas leurs gestes.

### Décision de clôture

Pour chaque ligne de la matrice : statut fonctionnel, preuve automatisée avec SHA et commande, résultat humain, anomalie restante et décision. Zéro défaut bloquant sur droits, secrets, PA, biens, paiements et effets de jeu. Un manque de contenu préparé n’est pas un succès. Livrer une PR, la matrice actualisée, un Master de test, le rapport et les consignes de reprise. La mise en ligne suit les autorisations applicables à la mission et ne migre aucune session par défaut.

## 10 Matrice de réception 1 sur 2

Base : simulation du 15 novembre 2026, version 0.39.0. « Testé » décrit les parcours exécutés, pas la certification intégrale de la capacité. Tous les résultats doivent être réévalués sur le candidat de clôture. [S5]

| Capacité | Preuve de départ | Condition de réception restante |

| --- | --- | --- |

| COM-01 Vétéran | PV et progression testés | Vérifier naissance, santé et relève en session. |

| COM-02 Désarmement | Règles numériques vérifiées | Valider le geste et les dix secondes sur le terrain. |

| COM-03 Lecture tactique | Analyse préparée testée | Niveaux, contenu MJ et confidentialité. |

| ROG-01 Neutralisation furtive | Déclaration et délais testés | Scène physique, immunité droïde, aucun dégât à distance. |

| ROG-02 Vol à la tire | Vol, quotas et notification testés | Local orga, identité fictive exacte ; aucune proximité à inventer. |

| ROG-03 Évasion | Cellule et évasion testées | Surveillance et conditions réelles de la scène. |

| TRA-01 Lecture des traces | Analyses préparées testées | Contenus et bonus DR-03 après C3. |

| TRA-02 Fouille méthodique | Fouille et opposition testées | Raccord DR-06, consentement et quotas communs. |

| TRA-03 Vérification documentaire | Vrais/faux et transfert testés | R05-02 et chaîne documentaire sans fuite du faussaire. |

| MED-01 Diagnostic | Niveaux et toxicologie testés | Diagnostic distinct du soin ; données fictives seulement. |

| MED-02 Soins de terrain | Soin et stabilisation testés | Chronomètre réel, interruption et STOP sur appareil. |

| MED-03 Traitement clinique | Protocoles et ressources testés | Clinique équipée ; aucune restauration de protection. |

| MEC-01 Diagnostic technique | Partiel | Achever C1 sur les états natifs. |

| MEC-02 Réparation | Partiel | Achever C2 ; préserver atelier et maintenance existants. |

| MEC-03 Amélioration | Partiel | Achever les deux volets C3 et leurs effets. |

| PIL-01 Navigation | Analyses et routes testées | Codes, garanties et routes préparées. |

| PIL-02 Préparation de vol | Scène commerciale même SHA | Rejouer avec C4, mandats et cockpit MJ. |



Règle particulière à préserver : le vol à la tire ROG-02 se réalise au local organisation avec nom et prénom fictifs exacts ; aucune proximité physique avec la victime n’est requise. Ne pas ajouter de contrôle de distance. [S1, chapitre 8 ; S2, A12]

## 10 Matrice de réception 2 sur 2

Base : simulation du 15 novembre 2026, version 0.39.0. « Testé » décrit les parcours exécutés, pas la certification intégrale de la capacité. Tous les résultats doivent être réévalués sur le candidat de clôture. [S5]

| Capacité | Preuve de départ | Condition de réception restante |

| --- | --- | --- |

| PIL-03 Manœuvres | Manœuvres et permissions testées | R04-01/R05-01, coordination cockpit et quotas. |

| COU-01 Expertise marchande | Analyses et refus testés | Cours publics gratuits, aucun renseignement inventé. |

| COU-02 Négociation commerciale | Partiel | Achever C6 et préserver les offres déjà raccordées. |

| COU-03 Réseau de contacts | Réponses et quotas testés | Contenus préparés ; aucun contrat ou argent créé seul. |

| INF-01 Intrusion | Partiel | Achever C5 et bonus DR-04 de C3. |

| INF-02 Déchiffrement | Droits et résolution testés | Raccord DR-05 ; original et copie selon la fiche. |

| INF-03 Falsification | Faux et vérification testés | Préserver provenance, confidentialité et R05-02. |

| Entretien de protection | Armure et consommables testés | Reste distinct de C2 et des soins de PV. |

| Riposte | Texte canonique vérifié | Geste physique et rythme à valider sur le terrain. |

| Garde du corps | Règle et santé vérifiées | Distance, annonce et touche transférée en scène réelle. |

| Sabotage | Partiel N1 et N2 testés | Achever C4 sur les modules et vaisseaux. |

| Dissimulation | Cache et opposition testées | Interaction DR-06 et quotas sans cumul inventé. |

| FIL-01 Pistage | Traces sol et espace testées | Vrais départs, données préparées, aucune géolocalisation. |

| TOXI-01 Toxicologie | Fabrication et antidote testés | Malaise défini seulement, activation volontaire et préparation. |

| ESC-01 Escorte spatiale | Manœuvres et quotas testés | Coordination des pilotes et effets des rares C3. |

| EFF-01 Effacement de traces | Masquage et opposition testés | Aucun effacement des journaux techniques. |

| LAS-01 Maîtrise du sabre | Règles et apprentissage vérifiés | Matériel et geste à valider sur le terrain. |



Chaque fiche finale comporte quatre champs distincts : implémentation, tests automatiques, recette humaine et publication. Un parcours physique peut être numériquement conforme tout en restant « recette terrain à faire ». La colonne de droite définit une réception, pas une annonce de travaux déjà réalisés.

## 11 Sources et consigne de reprise

Sources primaires du projet, consultées le 15 novembre 2026. Les liens du dépôt ci-dessous sont figés sur le commit de référence afin de conserver la traçabilité de ce cahier des charges. Une évolution ultérieure doit être comparée avant développement.

S1  Western City / Breach Port, Livre des règles Space Outlaws V0.7, 23 octobre 2026. Chapitres 3–6, 8, 11, 13–15, 17 et continuité des épisodes.

docs/source/SO_Regles_V07.txt

S2  Projet GN Engine, Cahier des charges V3.5, version archivée dans le commit de référence. Annexes des compétences, modules et tests de réception.

docs/source/SO_CDC_V35.md

S3  Projet GN Engine, Clôture fonctionnelle des compétences V0.7, 13–14 novembre 2026. Lire les compléments successifs ; les statuts historiques ne certifient pas le code actuel.

docs/SO-COMPETENCES-V07-CLOTURE.md

S4  Projet GN Engine, Intégration et publication du 15 novembre 2026, version 0.39.0. Complément économique, droits et limites.

docs/SO-RELEASE-2026-11-15.md

S5  ChatGPT, simulation locale des compétences, 15 novembre 2026. Archive contenant rapport, matrice, scripts, résultats et journaux ; référence des preuves citées dans la matrice de réception.

SO_Simulation_Competences_2026-11-15.zip

S6  Projet GN Engine, code au commit 98a3342d : analyse technique, maintenance, mandats de modules, intrusion et négociation. Les noms ci-dessous sont des points de raccord à inspecter, pas une architecture imposée.

src/core/space-technical-analysis.mjs

src/core/space-maintenance.mjs

src/core/space-module-mandates.mjs

src/core/space-intrusion.mjs

src/core/space-merchant-negotiation.mjs

CI de référence du commit 98a3342d

### Consigne prête à transmettre à l’agent

Terminer les compétences Space Outlaws selon ce cahier des charges. Vérifier d’abord HEAD, travaux concurrents, AGENTS.md et règles canoniques ; réconcilier les exigences avec le code présent. Réutiliser les services existants. Livrer C1 à C6 par tranches verticales jouables, avec tests ciblés, refus et preuves sur le SHA exact. Ne pas rouvrir les arbitrages A01–A38. Faire trancher uniquement une règle réellement manquante, notamment le barème complet de recharge mécanique, en citant les sources. Tenir la matrice des 34 capacités à jour. Terminer par la recette intégrée et un bilan des écarts ; séparer conformité logicielle, essais humains et autorisation de publication.
