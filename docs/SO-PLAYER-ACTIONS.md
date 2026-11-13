# Mes actions — parcours directs

13 novembre 2026. Base : `81dff44f1687f38c46d63c991749b3fadfe0c9c0`, PR #12, comprenant le dashboard PC et les corrections joueur. Demande : pièce jointe « Refonte ergonomique de l’espace joueur Mes actions » et ajout explicite du parcours choisir → cible → conditions → exécuter.

## Audit des parcours réellement raccordés

| Capacité | Condition de présentation | Cible et parcours conservés |
|---|---|---|
| Fouille D12 | `actionsVersion`, `searchVersion` | Code du lieu → profil SEARCH autorisé → `prepareFieldAction` |
| Examiner un élément | Actions ouvertes | Code d’information → parcours `discover` natif |
| Secours communs | `healthVersion` | Personnage → STABILIZE → `preparePersonAction`, 0 PA |
| Soins / réparation de droïde | MED-02 / MEC-02 acquis, santé ouverte | Personnage compatible → FIELD_CARE de cette compétence → aperçu natif |
| Entretien de protection | Compétence acquise, santé ouverte | Personnage équipé et protocole PROTECTION publié → aperçu natif |
| Lecture tactique, traces, documents, diagnostic | COM-03, TRA-01, TRA-03, MEC-01 acquis | Code de cible → analyse correspondant exactement à cette compétence |
| Analyse d’itinéraire | PIL-01 acquis et `routeAnalysisVersion` | Code de liaison → `fieldTarget.navigationCode` → analyse native |
| Intrusion / falsification | INF-01 / INF-03 acquis et manifeste compatible | Code de cible → module natif correspondant |
| Déchiffrement | INF-02 acquis et manifeste compatible | Sélection parmi les documents déjà obtenus, puis parcours natif |
| Vol à la tire | ROG-02 acquis et manifeste compatible | Formulaire natif directement ouvert, QR/ID et identité fictive, au poste organisation |
| Évasion | ROG-03 acquis et manifeste compatible | Captivité connue, issue préparée → formulaire natif |
| Vol | PIL-01 acquis, navigation ouverte | Choix d’un vaisseau dont le personnage est pilote → préparation native |
| Entretien de vaisseaux | MEC-02 N2, logistique ouverte | Interventions proposées : accords et étapes natifs, aucun devis inventé |
| Travaux de modules | MEC-03 acquis, mandats ouverts | Mandats existants ; niveau, propriétaire, matériel et accord vérifiés par le service |
| Aide | Compétences admissibles renvoyées par `myPersonActions` | Formulaire d’aide ouvert directement, choix de l’allié et de la compétence |

MED-01, clinique MED-03, compétences COU et sabotage d’installation ne sont pas ajoutés comme commandes jouables : les routes examinées ne les exécutent pas actuellement pour une session SO. Leur description dans les règles ne suffit pas à ouvrir un droit. Les catégories ne créent aucune capacité.

## Interface et conservation du choix

`web/player-action-menu.mjs` est une couche de présentation, alimentée par `mySession`, les historiques natifs et les projections spécialisées. Elle n’écrit aucune règle serveur. Le routeur `#/act/session/action/cible` conserve l’intention lors du scan, de la saisie, d’une actualisation et du retour navigateur. Les données et compétences sont relues après chaque navigation ; aucun droit n’est mémorisé entre personnages.

Le QR doit être du type et de la session attendus. Une cible incompatible affiche un refus et permet de saisir une autre cible pour **la même action** ; aucun repli vers une autre action. Les profils non qualifiés sont retirés de la présentation terrain. L’aperçu automatique des soins et actions de terrain appelle uniquement une commande `prepare`, jamais `start` ou `finish`. La confirmation native de présence reste obligatoire. Un consommable absent est signalé ; les choix de matériel restent modifiables et revérifiables.

Les cartes expliquent les blocages connus : phase, STOP, hors combat, décès, convalescence, captivité, récupération, PA et action en cours. Le matériel exact, les délais propres à une cible et les droits de celle-ci sont vérifiés par l’aperçu serveur. Les urgences pendant une pause restent soumises à la validation native du patient. Les modules spécialisés conservent leurs propres validations et formulaires.

Les historiques sont regroupés dans un panneau secondaire, ouvert si une action nécessite un suivi. Les commandes de résolution, d’interruption, les délais et les résultats utilisent les contrôleurs existants. Un bouton principal actualise tout l’écran ; le raccourci historique ouvre et fait défiler le panneau sans changer de route.

## Validation et limites

- Compilation réussie ; 30 tests ciblés locaux : menu, acquis simples/multiples, changements de personnage/niveau/session, blocages, QR étranger/type incorrect, filtrage de cible, aperçu sans mutation, historique et interfaces natives.
- Parcours Chromium ajouté à la recette : écran 390 × 844, menu d’un médecin avec COM-03, absence d’INF-01, caméra refusée et saisie manuelle, QR incorrect, cible `counter-place`, aperçu serveur automatique, une seule action affichée et historique accessible. Aucune mutation de jeu exécutée ; la phase de recette est restaurée en pause.
- Chromium ne démarre pas dans ce conteneur. Le résultat navigateur et les captures seront ceux de la CI sur le commit exact, pas une recette physique Android/iOS.
- La CI du parent #12 a révélé deux tests HTTP qui chargeaient encore des objets personnels. Leurs données de préparation sont corrigées : stock de fret explicite / stock historique de soute ; un appel HTTP vérifie désormais le refus du chargement d’un sac. Les contrôles métier ne sont pas assouplis.
- Aucun backend de production changé par cette refonte, aucune donnée existante modifiée, aucune fusion main, aucun déploiement Firebase.

## Documents du sac et INF-02

L’écran de déchiffrement présente aussi les originaux non encore lus du sac et conserve le parcours sélectionné. Un original M1 associé à un DOCUMENT M6 propose « Lire le document » dans le sac. Son texte rejoint le carnet, sous les droits de la fiche : « Montrer seulement » requiert de conserver l’original ; « Copie permise » conserve le texte déjà acquis après son don. Le don utilise le transfert personnel existant et garde l’identifiant et la provenance de l’objet. Aucun fret de soute ni deuxième exemplaire n’est créé.

Le déchiffrement revérifie le droit de lecture à la résolution. Une perte d’original SHOW empêche la révélation ; le joueur ou le MJ peut interrompre l’action pour libérer les réservations. Une révocation explicite du reçu par le MJ reste prioritaire. Les documents préparés avant cette extension restent utilisables selon leurs droits existants.

## Fouilles de personnages et cache d’un objet

« Fouiller un personnage » et « Fouille méthodique » conservent le choix d’action après identification du personnage. La cible doit être hors combat ou capturée selon l’état enregistré. La fouille ordinaire laisse la victime choisir ; la fouille méthodique laisse le Traqueur choisir. La remise d’une unité est confirmée par la victime. La liste privée cesse d’être accessible après libération.

« Dissimuler un objet » ouvre directement son propre sac. Seuls les modèles M1 préparés comme admissibles sont proposés. Une cache protège une unité pendant trente minutes de jeu ; elle résiste au Rogue et à la fouille commune. Un Traqueur de niveau au moins égal la découvre immédiatement à la résolution de sa fouille. Le quota de prise ne change pas.

Le MJ utilise « Nouvelle rencontre » uniquement pour une situation réellement distincte, avec motif. Attendre dix ou trente minutes, changer de fouilleur ou recapturer la même victime ne recrée pas automatiquement un droit de prise.


### Clôture V0.7 — analyses et techniques physiques

Les analyses de terrain revérifient le niveau engagé avant de remettre les informations. Si la fiche a changé, l’action peut être interrompue par son parcours natif pour libérer les ressources. Une analyse automatique ne tire pas de dé ; une résolution déjà enregistrée ne relance pas le test.

La fiche Compétences contient les conditions canoniques des 34 capacités. Désarmement, Neutralisation furtive, Riposte, Garde du corps et Maîtrise du sabre restent des techniques physiques : lire avant la scène, jouer sans téléphone, déclarer ensuite les pertes de santé à l’abri. Afficher la règle d’une capacité ne signifie pas que tous ses parcours numériques sont déjà raccordés : voir la matrice unique de clôture.


### ROG-01 — après la scène

La carte « Neutralisation furtive · après la scène » ouvre un formulaire personnel. À l’abri, déclarer toute tentative annoncée, réussie ou échouée, et le temps de jeu écoulé depuis l’annonce, hors pauses. Le délai restant se consulte ici. Une déclaration pendant la récupération est signalée au MJ ; ce formulaire n’autorise jamais une nouvelle attaque et n’applique aucun dégât à une cible. La victime utilise sa déclaration de santé habituelle. La lecture des règles avant la scène et la sécurité physique restent prioritaires.


### Vérifier un document présenté (TRA-03)

La carte ouvre les originaux accessibles et les copies dont la lecture est autorisée. Le QR du document ou son code `DOC:<identifiant>` mène au même dossier sans rechoisir l’action. Le modèle M1 ou le modèle de faux M6 doit référencer une analyse TRA-03 réservée aux originaux. La possession, le reçu, le niveau et la version sont revérifiés à la résolution. Une remise ne remet pas à zéro une tentative déjà résolue ; une copie autorisée ne crée aucun objet. Les résultats sont les informations préparées par l’organisation, sans révélation automatique du faussaire.

Dans le contrôle MJ des faux documents, les fabrications en cours peuvent être interrompues avec motif, y compris après retrait d’accès du joueur. Le PA et le formulaire encore réservés sont libérés ; les fabrications terminées restent dans l’historique.
