# GN ENGINE

## Cahier des charges de reprise et de développement — Work Astra

**Version :** V2.0 — 22 octobre 2026  
**Statut :** document de cadrage pour les prochains lots ; aucune modification du code n'est effectuée par ce document.  
**Application existante :** <https://gn-engine.web.app/>  
**Dépôt source :** <https://github.com/gkerckhofs-a11y/gn-engine> — branche `main`  
**Base technique vérifiée :** GN Engine `0.36.0`, documentée comme publiée le 22 octobre 2026.  
**Usage :** document de référence à fournir à ChatGPT Work en mode Astra pour piloter des lots de développement vérifiables.

> **Directive centrale à l'assistant chargé du développement** — **Étendre le moteur existant, ne pas le réécrire.** Mettre à disposition un atelier de création de GN organisé en six modules, chacun avec un Master éditable en ligne et une importation/exportation adaptée, tout en conservant un unique référentiel métier sécurisé. Toute nouvelle fonction doit réutiliser les comptes, objets, stocks, compétences, QR, droits, versions, historiques, campagnes et transactions déjà existants quand leur contrat répond au besoin.

### Convention de lecture

- **[V] Validé par l'organisateur :** intention fonctionnelle exprimée dans les échanges de conception.
- **[C] Constat vérifié :** comportement décrit par le dépôt, le code ou la documentation consultés au 22 octobre 2026. Il ne prouve pas à lui seul une recette terrain.
- **[P] Proposition de conception :** spécification recommandée, paramétrable, à formaliser dans le moteur.
- **[A] Arbitrage restant :** valeur de jeu ou variante non arrêtée ; ne jamais inventer un barème définitif.

---

# 1. Objectif produit et périmètre

## 1.1. Finalité [V]

GN Engine est un **moteur générique de jeu de rôle grandeur nature**, utilisable pour *Outcasts* (univers galactique à Western City), mais conçu pour d'autres univers sans recoder les mécanismes. L'organisateur veut travailler **par modules métiers**, chacun disposant d'un Master modifiable en ligne, y compris entre deux sessions : ajout de personnages, objets, ressources, points de commerce, informations, vaisseaux, missions et règles.

Le moteur réunit six modules visibles dans le Dashboard Master :

1. **Terminal joueur / personnage** — identité, accès privé, badge public, interactions et compétences.
2. **Communication / missions** — annonces, missions à accepter, rendez-vous physiques, diffusion ciblée.
3. **Magasins** — boutiques identifiées par QR, inventaires commerciaux, achats et ventes.
4. **Spatioport** — achat et propriété de vaisseaux, QR de vaisseau, trajets, carburant, protection, interceptions, combats et réparations.
5. **Économie / stockage** — monnaies fictives, ressources, lots, QR de stock, entrepôts, cargaisons, transport et événements économiques.
6. **Informations / fouilles** — QR de découverte, enquêtes, fouilles, informations conditionnelles et piratage ludique.

Chaque QR utilisable en jeu peut présenter, **si sa configuration l'autorise**, une ou plusieurs actions de piratage ou de contournement par compétence. **L'accès privé au personnage constitue l'exception absolue** : il n'est jamais piratable par une règle de jeu.

## 1.2. Résultats attendus [V/P]

L'organisateur doit pouvoir :

- créer un scénario, activer les modules nécessaires et le préparer sans programmation ;
- modifier chaque Master en ligne, rechercher, dupliquer, importer et exporter les entrées concernées ;
- contrôler immédiatement les dépendances : objets référencés, propriétaire, soldes, compétences, capacités, confidentialité et QR ;
- publier un scénario versionné, préparer une session ou un épisode de campagne et générer les QR adaptés ;
- piloter les missions, commerces, cargaisons, incidents et événements en temps de jeu ;
- préparer un nouvel épisode en conservant **uniquement** la progression de campagne décidée ;
- créer un nouveau GN indépendant à partir de bibliothèques réutilisables.

Le joueur doit pouvoir lire sa fiche privée, présenter son QR d'interaction, scanner un QR de terrain et effectuer des actions compatibles avec les règles et ses permissions, sans voir les secrets d'autrui.

## 1.3. Ce qui n'est pas demandé [P]

Ne pas développer un deuxième moteur indépendant, un second portefeuille parallèle, une seconde base de stock ou une application distincte pour chaque module. Ne pas imposer de carte galactique graphique, de réservation réelle, de paiement bancaire, de présence GPS, de notification push ni de chat temps réel externe pour livrer les fonctions de base. Ces options pourront être étudiées séparément.

---

# 2. État de départ vérifié : version 0.36.0

## 2.1. Référentiel de la reprise [C]

Le dépôt actuel contient une application web responsive, un service métier JavaScript, Firebase Authentication, Firestore, des outils d'administration, un jeu de tests automatisés et quatre fichiers Excel Master (`Campagne`, `Session`, et deux exemples). Au 22 octobre 2026, `package.json` indique `0.36.0` et la documentation de validation rapporte **648 tests applicatifs et 522 tests Firebase réussis**, publication comprise. Il s'agit de résultats consignés par le projet, **pas d'un nouveau lancement de tests dans la présente mission** [S1, S2].

Les documents du dépôt distinguent explicitement l'exécution des tests de la **recette privée sur smartphones, plusieurs comptes et environ 60 joueurs**, qui reste ouverte [S2].

## 2.2. Couverture fonctionnelle [C]

| Domaine | Déjà présent dans le dépôt | Écart par rapport à la cible |
|---|---|---|
| Accès et personnage | Connexion, invitation privée, attribution, fiches et badge public ; espaces `Mon personnage`, `Mon groupe`, `Action`, `Terminal` | Parcours d'activation QR privé à formaliser si retenu, ergonomie des interactions à uniformiser |
| Compétences et terrain | Classes, compétences, PV, soins, actions de terrain, fouille, sabotage, réparation d'installations, D6 serveur | Capacités génériques réutilisées sur tous les types de QR ; piratage transversal |
| Communication | Annonces, candidatures, missions, contrats, primes et participation par groupe | Publications générales, rendez-vous physiques structurés, orchestration des diffusions |
| Commerce | Ventes privées, marché, négociation, cours et événements économiques | Véritable magasin PNJ/organisation identifié par QR, catalogue et caisse propres |
| Économie | Comptes personnels/collectifs, lots, entrepôts, QR de cargaison et transferts, tarifs | Atelier unifié par module ; QR de stock configurables et rapprochement physique |
| Navigation | Vaisseaux personnels/de groupe, soutes, carburant, routes, départ et arrivée | Catalogue de modèles, achats/ventes, passagers, protection, interception, combat, réparation de vaisseau |
| Informations | Connaissances, indices, documents, QR conditionnels | Fouilles d'informations et piratage configurables de façon homogène |
| Masters | Import `CAMPAGNE`/`SESSION` `.xlsx`, aperçu, validations, versions, archives et campagnes | Six vues d'édition spécialisées et import/export par module, sans rompre les anciens masters |
| Médias | Médiathèque d'images, attributions et import en lot documentés | Association systématique aux nouveaux modèles et vérification de recette |

**Important :** les fonctionnalités présentes peuvent être partielles ; avant chaque lot, l'assistant doit revérifier le code actuel, et non transformer cette photographie V2.0 en affirmation intemporelle.

## 2.3. Sources opérationnelles à lire avant toute modification [C]

`README.md`, `docs/MASTERS.md`, `docs/ESPACES-JOUEUR.md`, `docs/LOGISTIQUE.md`, `docs/CAMPAGNES.md`, `docs/ACTIONS-TERRAIN.md`, `docs/MEDIATHEQUE.md`, `docs/VALIDATION-0.36.md`, `src/shared/master-schema.mjs`, `src/core/masters.mjs`, `src/core/knowledge.mjs`, `src/core/voyages.mjs`, `src/core/navigation-state.mjs`, `src/core/announcements.mjs`, `web/app.mjs` et les suites `test/`. Voir [S1] à [S8].

---

# 3. Architecture cible : un référentiel commun, six ateliers

## 3.1. Hiérarchie et séparation des états [V/P]

**Univers → Scénario → Version figée → Partie indépendante ou campagne → Session / épisode.**

Un **catalogue** décrit une espèce d'objet, une classe, un modèle de vaisseau ou une règle. Une **instance** est un objet effectivement possédé, une cargaison, un vaisseau acheté ou une mission attribuée. Une **session** contient les états joués, opérations et droits réels ; le **modèle de scénario** contient les définitions réutilisables.

Ne jamais assimiler un modèle de stock à une quantité physiquement disponible, ni un modèle de vaisseau à un vaisseau réellement possédé. Ne jamais écraser le résultat d'une session passée parce qu'un catalogue a changé.

## 3.2. Dashboard organisateur [P]

Écran cible :

- **Barre de contexte persistante :** univers, scénario, version, campagne, session/épisode, état et rôle actuel.
- **Six cartes de modules :** statut activé/désactivé, nombre de contenus, erreurs et bouton `Gérer`.
- **Dans chaque module :** onglets `Catalogue`, `Instances / affectations` si pertinent, `Règles`, `QR et impressions`, `Master / import-export`, `Historique`.
- **Éditeur en ligne :** recherche, filtres, création, duplication, édition guidée, images, aperçu joueur, suppression logique/archivage et gestion des références utilisées.
- **Actions de publication :** `Enregistrer brouillon`, `Contrôler`, `Voir les changements`, `Publier`, `Exporter`, avec états clairs.
- **Régie :** accessible séparément pour les opérations en partie : comptes, annonces, réservations, départs, incidents et arbitrages. Une modification du catalogue ne remplace pas automatiquement un état joué.

Le Dashboard doit éviter d'obliger l'organisateur à connaître les noms techniques des onglets ou les chemins internes des outils.

## 3.3. Contrat des Masters modulaires [V/P]

**MST-01** — Chacun des six modules dispose d'un éditeur en ligne permettant de créer et modifier ses données de préparation. **MST-02** — Chaque module propose l'export et l'import de son propre Master ; les fichiers contiennent le type, la version du contrat, le périmètre, les identifiants et les relations nécessaires. **MST-03** — Le moteur conserve la compatibilité des Masters `CAMPAGNE` et `SESSION` existants ; ceux-ci peuvent continuer à importer le jeu complet. **MST-04** — Un import partiel présente un aperçu exact `ajouté / modifié / archivé / inchangé / erreur`, avec feuille ou enregistrement et champ. **MST-05** — Les contenus référencés sont protégés ; une suppression durable d'une ressource utilisée nécessite une procédure de remplacement explicitement confirmée. **MST-06** — Le réimport du même contenu et les doubles confirmations ne créent ni doublons, ni nouveaux crédits, ni dotations répétées. **MST-07** — Les identifiants durables, versions et migrations sont gérés côté serveur. **MST-08** — Les imports sont strictement isolés par scénario/campagne/session et par module. **MST-09** — Un import du module A ne détruit pas les données du module B ; les références croisées sont validées. **MST-10** — Les modifications en ligne passent par les mêmes règles de validation et d'audit que les imports.

**Règle de développement :** commencer par une couche d'édition modulaire **sur le modèle de données actuel**, puis ne créer de nouvelles collections que lorsqu'un nouveau domaine métier le nécessite.

## 3.4. Bibliothèques transversales [P]

Règles et compétences, acteurs et groupes, objets et marchandises, comptes, médias, droits, temps de jeu, événements, QR et traces d'audit sont des services **communs**. Les six ateliers ne doivent pas recopier ces bibliothèques. Une compétence `Mécanique`, par exemple, peut être utilisée par une installation, un véhicule ou un service de réparation sans définir trois compétences concurrentes.

---

# 4. Module 1 — Terminal joueur, personnage et QR personnels

## 4.1. Identités et deux QR distincts [V/P]

**PER-01** — Séparer strictement personne réelle, inscription, personnage attribué et groupe. **PER-02** — Prévoir un **accès privé sécurisé** : connexion authentifiée et, si l'on emploie un QR, invitation nominative éphémère, révocable, à usage unique. Le QR privé ne doit **jamais** figurer sur le badge présenté aux autres. **PER-03** — Prévoir un **QR public durable d'interaction** lié au personnage dans une session. Scanner ce QR n'ouvre que la fiche d'identité publique et les actions autorisées. **PER-04** — La première vue après scan affiche par défaut la « carte d'identité » du personnage, dans la fiction. **PER-05** — Les éléments secrets et coordonnées du participant ne sont jamais inclus dans cette vue ou son code QR.

Le moteur actuel sépare déjà invitation privée et badge public : conserver cette propriété comme invariant de sécurité [S4].

## 4.2. Interactions possibles [V/P]

**PER-06** — Depuis le badge scanné, un joueur peut, selon ses droits et ses compétences, agir sur une cible : paiement fictif, remise/réception d'objet, soin, capacité spéciale, aide, interaction narrative ou action de piratage autorisée. **PER-07** — Une compétence doit afficher ses prérequis, son coût, sa durée et l'effet attendu avant confirmation. **PER-08** — Les actions sensibles à double acteur utilisent le consentement ou la procédure de confirmation prévue par la règle métier ; afficher le résultat sans créer de débit ou d'objet supplémentaire au double clic. **PER-09** — Les actions individuelles et collectives restent distinctes : appartenir à une bande n'accorde pas automatiquement le droit de dépenser sa caisse.

## 4.3. Parcours joueur à conserver [C/P]

Conserver les quatre entrées existantes : `Mon personnage`, `Mon groupe`, `Action`, `Terminal`. Unifier le point d'entrée `Scanner` et `Mon QR` ; ne pas ajouter six nouvelles entrées principales qui multiplieraient la navigation. Le résultat d'un scan doit ouvrir une **fiche cible contextuelle** dans la même interface.

## 4.4. Master du module [P]

`Personnages`, `Classes`, `Compétences attribuées`, `Groupes / droits`, `Relations`, `Dotations initiales`, `Portraits et médias`, `Profil public du badge`, `Interactions autorisées`. Les compétences communes restent dans une bibliothèque transverse et sont référencées par identifiant.

---

# 5. Module 2 — Communication, annonces, missions et rendez-vous

## 5.1. Trois natures de publication [V/P]

**COM-01** — Distinguer une **annonce informative** (lecture sans candidature), une **mission / contrat** (candidature, acceptation, progression et récompense) et une **convocation / rendez-vous** (lieu physique, date ou horaire de jeu, destinataires, consignes). **COM-02** — Diffuser à tous, un ou plusieurs groupes, une sélection de personnages ou une condition explicite. **COM-03** — Gérer brouillon, programmée, publiée, expirée, annulée et archivée selon les types. **COM-04** — Pouvoir publier en temps réel depuis la régie ; le contenu apparaît au Terminal et, s'il est pertinent, dans les informations ou missions privées du destinataire.

## 5.2. Missions et rendez-vous [V/P]

**COM-05** — Une mission peut être acceptée par un joueur ou un groupe habilité ; afficher les critères, la capacité éventuelle, les preuves et le règlement. **COM-06** — Un rendez-vous affiche explicitement le **lieu physique de jeu** et le moment, sans partager une adresse personnelle réelle. **COM-07** — Une modification significative conserve l'historique et notifie les destinataires concernés par l'application. **COM-08** — Les publications peuvent être liées à une découverte QR, à la fin d'un trajet, à un sabotage ou à une décision de MJ **uniquement lorsque cette règle est configurée**.

## 5.3. Master du module [P]

`Annonces`, `Missions`, `Briefings`, `Rendez-vous`, `Destinataires`, `Déclencheurs`, `Récompenses et conditions`, `Messages modèles`, `Historique de diffusion`. Réutiliser les moteurs d'annonces et de contrats déjà présents ; ne pas dédoubler leurs fonds, candidatures et règlements.

---

# 6. Module 3 — Magasins et points de vente QR

## 6.1. Une boutique est un lieu ou un acteur économique [V/P]

**MAG-01** — Le Master permet de créer un magasin ou point de vente avec un nom, une présentation, une localisation physique, un propriétaire fictif (personnage, groupe ou organisation de jeu), un QR et un état ouvert/fermé. **MAG-02** — Scanner le QR ouvre le catalogue des articles effectivement disponibles et les actions compatibles : acheter, vendre au magasin, consulter prix et conditions, éventuellement négocier. **MAG-03** — Le magasin référence les **mêmes modèles d'objets et les mêmes lots** que l'économie générale ; aucun « stock boutique » fictif parallèle ne peut permettre une double vente. **MAG-04** — La caisse utilisée et le bénéficiaire sont explicites ; un achat ne crée pas automatiquement une richesse monétaire non prévue. **MAG-05** — Le Master règle prix fixe ou indexé, plafonds, restrictions de clientèle, stocks initiaux, réapprovisionnement et disponibilités.

## 6.2. Sécuriser la vente [P]

**MAG-06** — Un achat affiche un devis puis confirme atomiquement mouvement de fonds, attribution/réservation d'un lot et reçu. **MAG-07** — Deux acheteurs concurrentiels ne peuvent acheter la dernière unité en même temps. **MAG-08** — Distinguer paiement, remise physique et détention utilisable, comme dans le marché déjà présent. **MAG-09** — Le MJ peut fermer, réapprovisionner ou corriger avec motif et audit. **MAG-10** — Le QR du magasin peut proposer une action de jeu secrète (piratage d'un terminal, remise clandestine, accès à un article caché) si le Master le définit ; cela **n'autorise pas** à contourner la sécurité technique du paiement.

## 6.3. Deux circuits commerciaux [P]

Un **marché entre personnages** demeure le circuit actuel ; un **magasin PNJ / organisation** devient un circuit complémentaire sur le même moteur économique. Le spatioport peut posséder un comptoir spécialisé pour la vente des vaisseaux, pièces et carburant, sans dupliquer les règles de paiement des magasins.

---

# 7. Module 4 — Spatioport, vaisseaux et combats spatiaux

## 7.1. Catalogue des modèles et propriété [V/P]

**SPA-01** — Distinguer `Modèle de vaisseau` (caractéristiques tarifées) et `Vaisseau individuel` (propriétaire, QR, état et historique). **SPA-02** — Un joueur ou un groupe peut **acheter**, posséder, exploiter et **vendre/transférer** un vaisseau, avec les permissions de groupe appropriées. **SPA-03** — Le catalogue de modèles décrit au minimum : type, prix, volume de soute, capacité passagers, réservoir/autonomie, caractéristiques de défense, emplacements d'amélioration et contraintes de maintenance. Les valeurs sont configurées dans le scénario, jamais inventées par le moteur. **SPA-04** — Chaque vaisseau individuel dispose d'un QR consultable avec identité publique, statut, capacité et actions autorisées ; le chargement détaillé et les consignes sont protégés par les droits.

## 7.2. Routes, coordonnées et carburant [V/P]

**SPA-05** — Définir des **coordonnées fictives** de ports, secteurs ou destinations, avec des routes utilisables et un itinéraire identifiable. Les positions ne sont pas des coordonnées GPS réelles ; le Master peut utiliser des codes, secteurs et, ultérieurement, une carte graphique. **SPA-06** — Départ soumis à permissions, capacité, carburant réellement détenu, disponibilité, état de réparation et éventuels frais. **SPA-07** — Un voyage référence l'origine, la destination, l'itinéraire, la fenêtre de transit, les passagers déclarés, le manifeste visible et le fret réel. **SPA-08** — Les consommations et capacités sont réservées ou déduites une seule fois ; les cargaisons en transit ne sont plus disponibles au comptoir local. **SPA-09** — Les durées suivent l'horloge de jeu et la pause de session. Les trajets existants ne sont pas recalculés après un changement de barème.

## 7.3. Protection et interceptions [V/P]

**SPA-10** — Avant le départ, le pilote peut choisir un **niveau de protection acheté** ; le Master définit prix, avantages, limites et bénéficiaire du paiement. Distinguer protection contractée pour le trajet et résistance propre au vaisseau. **SPA-11** — Un adversaire ne peut tenter d'interception que s'il dispose d'un renseignement exploitable sur l'itinéraire et la fenêtre de trajet, ainsi que d'un moyen d'action valide. **SPA-12** — Réserver le droit d'attaque et le vaisseau ciblé afin d'éviter deux combats incompatibles. **SPA-13** — Proposer les choix tactiques paramétrés de la défense (par exemple fuir, combattre ou négocier) ; si une décision nécessite une réponse dans un délai, prévoir une consigne de repli configurée avant départ.

## 7.4. Combat, butin et dégâts [V/P]

**SPA-14** — Le combat spatial est **virtuel**, résolu par le moteur serveur sur les caractéristiques, protections, décisions, compétences éventuellement applicables et aléa explicitement réglé. **SPA-15** — La formule, ses seuils, sa présentation et l'équilibrage sont **[A] à définir dans les règles du scénario** : ne pas imposer de chiffres arbitraires. **SPA-16** — Le gagnant obtient le droit de saisir la cargaison du perdant selon le résultat, avec transfert de lots réels et vérification du volume de destination. Il ne reçoit jamais une copie des biens. Si le butin dépasse ses capacités, un arbitrage configuré s'applique. **SPA-17** — Les éventuelles pertes, rançons, immobilisations et dommages sont enregistrés une fois, avec historique et visibilité différenciée. **SPA-18** — Une personne passagère n'est ni supprimée ni automatiquement « capturée » numériquement sans règle distincte de présence et de conséquences humaines.

## 7.5. Réparation obligatoire après combat [V/P]

**SPA-19** — Après **tout combat**, le vaisseau reçoit l'état `Révision / réparation requise`, y compris lorsqu'il a gagné. La gravité et les besoins peuvent varier selon les dommages. **SPA-20** — Un mécanicien possédant la compétence adaptée doit effectuer une action sur le QR du vaisseau ; consommation de pièces, durée, éventuel coût et réussite dépendent du Master. **SPA-21** — Un vaisseau qui nécessite une réparation ne peut reprendre un trajet incompatible tant que la remise en service n'est pas validée. **SPA-22** — Les améliorations et changements de propriétaire ne doivent pas modifier un combat déjà résolu ou un trajet engagé.

## 7.6. Présence des joueurs et limites de la fiction [A/P]

La façon dont les passagers « voyagent » doit rester paramétrable : rotation virtuelle du vaisseau avec des joueurs qui restent sur le site, déplacement symbolique sur zone, ou mission physiquement jouée. Le choix doit être déclaré au niveau du scénario ; l'application ne doit pas inférer un déplacement humain réel à partir d'un chronomètre. Prévoir un mécanisme d'arbitrage MJ avant de prétendre couvrir tous les cas.

## 7.7. Master du module [P]

`Modèles de vaisseaux`, `Instances et propriétaires`, `Ports et coordonnées`, `Routes`, `Carburants et coûts`, `Protections`, `Caractéristiques de combat`, `Règles d'interception`, `Pièces et réparations`, `QR et permissions`, `Historique`. Intégrer les instances et trajets déjà existants : ne pas les migrer à la légère.

---

# 8. Module 5 — Économie, ressources, entrepôts et cargaisons

## 8.1. Catalogue et stock réel [V/P]

**ECO-01** — Le Master définit chaque ressource : nom, catégorie, unité, image, description, valeur de référence ou mode de prix, volume unitaire, restrictions et éventuels effets (dont le carburant). **ECO-02** — Un **lot** identifie la quantité réellement disponible, son propriétaire, son détenteur éventuel, son emplacement, sa disponibilité et son historique. **ECO-03** — Le QR d'un lot/stock permet de reconnaître sa nature et de proposer les actions autorisées ; la nature, valeur et capacité viennent du serveur, pas de paramètres modifiables dans l'URL. **ECO-04** — Le QR d'un entrepôt, coffre, quai ou soute donne accès au dépôt/retrait/transfert selon le propriétaire et les droits.

## 8.2. Mouvements et continuité [V/P]

**ECO-05** — Déplacer une quantité vers un autre emplacement (personnage, groupe, magasin, entrepôt, vaisseau, quai) conserve le total de biens et son lien de filiation. **ECO-06** — Un transfert de propriété ne se déduit pas automatiquement de la personne qui a physiquement chargé le lot. **ECO-07** — Le moteur valide les capacités de chaque destination et bloque la double réservation. **ECO-08** — Les transactions fictives restent équilibrées et traçables ; pas de double débit, crédit ou stock négatif. **ECO-09** — Les événements de jeu peuvent modifier des cours, suspendre le commerce ou affecter le coût d'un voyage, conformément aux mécanismes existants. **ECO-10** — La réception physique d'un bien et l'état numérique doivent être explicitement rapprochés par les acteurs autorisés ; un scan ne prouve pas en soi le transport d'une caisse sur le terrain.

## 8.3. Stock et vaisseau [V/P]

**ECO-11** — Depuis un QR de stock ou d'entrepôt, proposer un mouvement vers le vaisseau autorisé ; inversement depuis le QR de sa soute. **ECO-12** — Le carburant reste un objet commercial achetable et vendable avant d'être transféré au réservoir. **ECO-13** — Pendant un voyage, empêcher retraits et chargements locaux incompatibles. **ECO-14** — Après une interception, appliquer les mêmes transferts de lots et journaux qu'un mouvement économique ordinaire, sans créer un système de butin indépendant.

## 8.4. Master du module [P]

`Modèles de ressources/objets`, `Stocks initiaux`, `Entrepôts`, `Emplacements`, `Monnaies et comptes`, `Cours`, `Événements`, `Tarifs et douanes`, `QR`, `Règles de transfert`. Les portefeuilles et historiques joués ne doivent pas être réinitialisés par import.

---

# 9. Module 6 — Informations, fouilles et découvertes

## 9.1. Découvrir de l'information [V/P]

**INF-01** — Créer un QR de découverte donnant un texte, une image, un document, un objet ou une progression de mission, sous conditions. **INF-02** — Définir cible, lieu physique, destinataires, droits de partage, confidentialité et état de publication. **INF-03** — Un QR peut lancer une fouille avec compétence, durée, coût, matériel, test serveur et résultat narratif ; une réussite attribue seulement les récompenses disponibles. **INF-04** — La découverte acquise rejoint les informations du personnage avec son origine et son historique, sans distribuer à nouveau ce qui a déjà été obtenu si la règle l'interdit.

## 9.2. Information commune, secrète ou personnalisée [V/P]

**INF-05** — Distinguer information publique, information réservée à un groupe, information personnelle, indice unique, résultat répété et vérité MJ. **INF-06** — Un joueur qui scanne un QR ne reçoit pas une information non autorisée par défaut ; un mécanisme de piratage narratif peut accorder un contenu précis uniquement si la règle de jeu le prévoit. **INF-07** — Les images, titres, miniatures, exports et notifications respectent les mêmes droits que les textes.

## 9.3. Master du module [P]

`Informations`, `Indices`, `Documents`, `Cibles QR`, `Fouilles`, `Conditions / compétences`, `Récompenses`, `Droits de partage`, `Déclencheurs`. Réutiliser le service de connaissance, les actions de terrain et la médiathèque existants.

---

# 10. Moteur QR universel et piratage de jeu

## 10.1. Résolution commune [V/P]

**QR-01** — Centraliser le décodage et l'ouverture contextuelle des types `PERSONNAGE_PUBLIC`, `MAGASIN`, `VAISSEAU`, `ENTREPOT`, `LOT`, `LIEU`, `INFORMATION` et `INSTALLATION` (liste extensible). **QR-02** — Chaque cible possède une identité stable, une session et une politique de visibilité ; le QR ne constitue pas une autorisation. **QR-03** — Une lecture normale affiche les informations publiques et **uniquement les actions disponibles pour le personnage connecté**. **QR-04** — Chaque cible peut définir zéro, une ou plusieurs **actions spéciales de piratage ludique**, ayant une compétence et un niveau requis. **QR-05** — Les actions peuvent révéler une information, ouvrir une option narrative, modifier un état de jeu explicitement permis ou déclencher un événement ; leurs effets sont validés côté serveur.

## 10.2. Modèle de règle de piratage [P]

Une règle décrit : `id`, `type_cible`, `compétence_id`, `niveau_min`, `préconditions`, `durée_jeu`, `coût_PA_ou_ressource`, `outil_bonus`, `méthode_résolution`, `seuil`, `effet_succès`, `effet_échec`, `récupération`, `nombre_essais`, `visibilité_du_résultat`, `notification_MJ` et `version`. L'éditeur doit exposer des choix prédéfinis et **ne jamais exécuter du code arbitraire rédigé dans une description narrative**.

Le système de jets doit utiliser un service contrôlé par le serveur et l'horloge de jeu actuelle. Les coûts et délais ne sont appliqués qu'aux effets définis ; les nombres restent paramétrables.

## 10.3. Invariants de sécurité non négociables [V/P]

**QR-06** — Aucun piratage ne doit casser Firebase Authentication, les invitations privées, les permissions d'organisateur ou les contrôles Firestore. **QR-07** — Un joueur ne peut s'approprier la session d'un autre, lire sa fiche privée, voler ses données de connexion ou devenir MJ grâce à un QR. **QR-08** — Les secrets ne sont jamais envoyés au navigateur puis simplement masqués ; chaque projection de données est adaptée aux droits. **QR-09** — Une URL photographiée ou recopiée ne donne aucun droit supplémentaire ; le scan d'un QR ne prouve pas à lui seul la présence physique. **QR-10** — Les actions sont protégées contre réemploi, concurrence, changement de session, révocation et double récompense.

Le seul « accès privé par QR » éventuellement proposé est l'**activation protégée d'une connexion** avec authentification, expiration et révocation, **jamais une cible de hacking de jeu**.

---

# 11. Objets de données et contrats entre modules

Ces noms sont **indicatifs** : le développeur doit les rapprocher des collections réelles avant de créer quoi que ce soit.

| Famille logique | Entités ou attributs nécessaires | Références incontournables |
|---|---|---|
| Contexte | `Universe`, `Scenario`, `Version`, `Campaign`, `Session` | Source des règles, version, état de jeu, horloge |
| Personnes | `Participant`, `Registration`, `Character`, `Group`, `Membership` | Distinction réelle/fiction ; droits par action |
| Compétences | `SkillTemplate`, `CharacterSkill`, `ActionProfile` | Une règle, différentes cibles |
| Cibles QR | `QrTarget`, `QrActionProfile`, `HackAttempt` | Session, cible, permissions, version |
| Communication | `Announcement`, `Mission`, `Application`, `Appointment` | Destinataires, déclencheur, statut et messages |
| Magasins | `Shop`, `ShopListing`, `ShopAccount` | Lot réel, prix/cours, bénéficiaire, QR |
| Inventaire | `ItemDefinition`, `InventoryLot`, `StockLocation`, `Movement` | Quantité, propriétaire, détenteur, emplacement, filiation |
| Économie | `Account`, `LedgerEntry`, `PriceRule`, `EconomicEvent` | Transfert atomique, devis, journal |
| Spatioport | `ShipModel`, `Ship`, `Port`, `Route`, `Journey` | Propriétaire, capacités, carburant, coordonnées |
| Conflits | `Interception`, `SpaceCombat`, `ShipDamage`, `RepairOrder` | Renseignements, issue, cargaison, état de maintenance |
| Narration | `Knowledge`, `Discovery`, `Document`, `EventTrigger` | Secrets, droits, conséquences, origine |
| Médias / audit | `MediaAsset`, `AuditEntry`, `MasterImport` | Usages, révisions, acteur, motif, état |

**DAT-01** — Toute écriture porte contexte de session, identité authentifiée, rôle et commande unique. **DAT-02** — Les références intermodules sont stables, non calculées à partir des libellés. **DAT-03** — Un catalogue ne réécrit pas rétroactivement une instance acquise ou un paiement confirmé. **DAT-04** — Les migrations fournissent compatibilité descendante, sauvegarde testable et stratégie de retour arrière. **DAT-05** — Les identifiants d'une instance ne sont jamais réutilisés pour une autre quantité, un autre propriétaire ou une autre session sans opération explicite.

---

# 12. Règles de modification entre les sessions

## 12.1. Scénario modèle [V/P]

**LIF-01** — Les Masters sont éditables tout au long de la vie du scénario : ajout de personnages, objets, missions, marchandises, modèles de vaisseaux, lieux, QR et règles. **LIF-02** — Chaque publication crée ou référence une version cohérente ; l'organisateur peut prévisualiser les changements et tester sans toucher à la partie en cours.

## 12.2. Avant une session ou un épisode [V/P]

**LIF-03** — L'import de préparation peut enrichir les données et créer de nouvelles instances, sous contrôle des références et des dotations initiales. **LIF-04** — Un nouveau personnage doit rester non attribué tant qu'un joueur n'a pas été choisi. **LIF-05** — Les modules activés et désactivés sont reflétés dans le Terminal, sans boutons inertes.

## 12.3. Pendant une session [P]

**LIF-06** — Séparer modifications de **régie à chaud** (publier une annonce, donner une mission, ajuster un cours, corriger un stock avec motif, déclencher un incident) des **imports structurels de Master**. **LIF-07** — Ne pas autoriser l'import de masse pendant le jeu tant qu'une stratégie de migration explicite, transactionnelle et testée n'est pas mise en place. Conserver pour l'instant la contrainte actuelle d'import `SESSION` en préparation avant premier lancement [S3]. **LIF-08** — Le MJ voit l'historique de toutes les corrections sensibles.

## 12.4. Après la session [V/P]

**LIF-09** — Sceller l'historique, produire un bilan et préparer l'épisode suivant. **LIF-10** — Une campagne persistante conserve les biens, crédits, personnages, droits, avaries et connaissances prévus, avec contrôles de clôture ; une partie indépendante ne conserve pas les états joués. **LIF-11** — Les secrets acquis et les transactions passées ne sont pas rejoués automatiquement après un réimport. **LIF-12** — Prévoir un comparateur de versions et un rapport clair de migration d'épisode.

---

# 13. Expérience d'administration et de jeu

## 13.1. Écrans maîtres requis [P]

1. **Tableau de bord des six modules :** contexte, état, erreurs, raccourcis.
2. **Éditeur modulaire :** liste filtrable, formulaire détaillé, image, dépendances, actions et validation.
3. **Gestion des QR :** cible, profil d'action normale, profil de piratage, aperçu, téléchargement, localisation physique, statut.
4. **Régie de session :** annonces, missions, magasins, stocks, comptes, trajets, interceptions, réparations, litiges et audit.
5. **Contrôle pré-jeu :** liens manquants, ressources inexistantes, cibles QR non publiées, droits cachés, capacities impossibles et tests de parcours.
6. **Exports :** six Masters partiels, Master complet rétrocompatible, badges, QR imprimables, listes terrain et dossier MJ.

## 13.2. Écrans joueur [P]

Conserver la navigation existante en quatre espaces. Un scan doit ouvrir une page cohérente, même en provenance d'un QR de vaisseau, boutique ou stock. Le contexte offre seulement les actions possibles : consulter, acheter/vendre, transférer, piloter, réparer, intercepter, fouiller ou pirater. Les erreurs doivent expliquer **l'empêchement de jeu** (droits insuffisants, matériel manquant, quota, vaisseau en transit) sans divulguer de secret.

## 13.3. Habillage [C/P]

Préserver l'habillage galactique existant pour *Outcasts* et séparer les textes/visuels du moteur. Le Dashboard reste sobre et efficace ; l'apparence du joueur peut varier par univers. Aucun nom, image ou règle Star Wars ne doit être codé comme dépendance obligatoire du moteur commun.

---

# 14. Exigences transversales de qualité

**SEC-01** — Authentification, isolation intersession, permissions et audit vérifiés **côté serveur** à chaque action, y compris sur commande rejouée. **SEC-02** — Secrets, portraits privés, fichiers, recherches et notifications sont projetés selon les droits ; refus par défaut. **TX-01** — Économie, attribution de lots, achats, interceptions et réparations utilisent des transactions ou procédures de réservation récupérables. **TX-02** — Les commandes sont idempotentes : un clic répété ou une coupure réseau ne double aucun effet. **TMP-01** — Temps de jeu et temps réel restent distingués ; une pause suspend les délais scénaristiques. **OPS-01** — Aucune donnée de production n'est modifiée par les tests ; environnements de démonstration et de recette séparés. **OPS-02** — Sauvegarde et restauration documentées avant toute migration majeure.

**UX-01** — Parcours mobile réels Android/iOS, textes lisibles, boutons tactiles cohérents, navigation simple, QR lisibles et possibilité de saisie du code si la caméra est indisponible. **UX-02** — Une action importante présente un aperçu et un résultat confirmé avec référence. **UX-03** — Ne pas supposer un mode hors connexion transactionnel : la version existante n'en fournit pas. Les comportements réseau dégradé doivent être expliqués et testés. **PERF-01** — Tester la charge cible du cas pilote d'environ **60 participants**, sans la confondre avec une capacité illimitée. **PRI-01** — Séparer informations des participants et secrets des personnages ; vérifier les règles de conservation et obligations applicables avant exploitation publique.

---

# 15. Recette fonctionnelle : scénarios obligatoires

Les cas sont numérotés pour permettre un rapport de validation par lot. Ils sont exécutés sur des comptes de rôles distincts, puis vérifiés autant que pertinent avec Firebase émulé et navigateur réel.

| ID | Scénario de recette | Critère de réussite |
|---|---|---|
| REC-01 | Scanner le QR public d'un personnage depuis un autre compte | Carte publique seulement ; aucune fiche privée ou connexion détournée |
| REC-02 | Activer, réutiliser puis révoquer un accès personnel | Invitation unique, récupération contrôlée, réutilisation interdite |
| REC-03 | Transférer des crédits depuis un badge | Un débit et un crédit, permissions vérifiées, double clic sans second paiement |
| REC-04 | Exécuter une compétence depuis un badge | Coût et effet corrects ; refus si compétence/ressource absente |
| REC-05 | Pirater un QR habilité et un QR non habilité | Succès/échec de jeu selon les règles ; zéro contournement d'authentification |
| REC-06 | Importer trois données dans un Master modulaire | Aperçu précis et seules cibles voulues modifiées |
| REC-07 | Réimporter le même fichier et tenter un import dans la mauvaise session | Aucun doublon ; erreur de périmètre explicite |
| REC-08 | Modifier le modèle entre deux épisodes | Nouvel épisode enrichi, épisode clos intact, acquis préservés selon configuration |
| REC-09 | Publier une annonce générale puis une mission réservée | Diffusion exacte, secret préservé, candidature et règlement uniques |
| REC-10 | Fixer un rendez-vous physique et le modifier | Lieu et horaire visibles des destinataires, historique consultable |
| REC-11 | Scanner un magasin et acheter la dernière unité à deux | Un seul gagnant, pas de stock négatif ni double débit |
| REC-12 | Vendre au magasin et réapprovisionner | Propriété, caisse, stock et audit cohérents |
| REC-13 | Acheter un vaisseau par un personnage | Un paiement et un vaisseau possédé, QR et droits corrects |
| REC-14 | Acheter et transférer un vaisseau de groupe | Permission de caisse et droit de pilotage distincts ; aucun transfert sans mandat |
| REC-15 | Charger un lot et du carburant dans une soute/réservoir | Nature et capacités contrôlées ; lot non dupliqué |
| REC-16 | Faire voyager un vaisseau avec passagers et fret | Coût/temps cohérents ; soute indisponible en transit |
| REC-17 | Tenter une interception sans renseignement | Refus sans exposer toutes les routes en cours |
| REC-18 | Intercepter pendant la bonne fenêtre | Combat unique, résultat stable, coûts et protections appliqués une fois |
| REC-19 | Capturer une cargaison après combat | Débit du perdant et transfert physique logique au gagnant ; capacité respectée |
| REC-20 | Reprendre un voyage sans entretien après combat | Refus tant que la réparation obligatoire n'est pas validée |
| REC-21 | Réparer via QR avec compétence et pièces | Consommation et état enregistrés une seule fois |
| REC-22 | Scanner une cache d'information publique, secrète et épuisée | Bons destinataires, secret protégé, récompense non reproduite |
| REC-23 | Mettre en pause pendant mission, fouille et transit | Délais de jeu figés ; reprise cohérente |
| REC-24 | Couper le réseau au moment d'un achat ou d'un combat | Résultat récupérable ; ni double débit ni nouveau tirage |
| REC-25 | Clôturer une campagne avec opérations ouvertes | Blocage ou résolution explicite, pas d'état incohérent |
| REC-26 | Recette sur smartphones et plusieurs comptes | Scan, lecture, actions, droits et UX réellement utilisables |
| REC-27 | Essai de charge de l'objectif pilote | Mesures consignées, seuil d'acceptation arrêté avant l'essai |

**Critère de mise en service :** aucun défaut connu ne doit permettre de lire une fiche privée non autorisée, de dupliquer un lot, de payer deux fois ou de modifier rétroactivement une transaction acquise. Les cas de recette correspondants sont bloquants.

---

# 16. Feuille de route pour Work Astra

L'ordre décrit les **dépendances techniques** et non une promesse de délai. Chaque lot constitue une livraison vérifiable ; un numéro de version n'est attribué qu'après inspection de `main` et décision de versionnement.

| Lot | Objectif / périmètre | Livrable de sortie |
|---|---|---|
| **L0 — Audit de reprise** | Vérifier HEAD, modules réels, tests, schéma des masters, données, droits et déploiement ; comparer chaque exigence du présent document au code | Matrice **existant / à adapter / nouveau**, risques, tests de référence et plan de migration |
| **L1 — Atelier Master modulaire** | Dashboard six modules, éditeurs en ligne spécialisés, filtres, validation des références, imports/exports partiels ; conserver les quatre anciens XLSX | Un premier flux complet de création/import d'un contenu par module, sans régression des imports Campagne/Session |
| **L2 — QR universels / compétences** | Résolveur commun des QR, actions contextuelles, profils de piratage en jeu, génération/impression, tests de sécurité | Scanner puis agir sur des cibles diverses depuis `Action`, sans fuite d'authentification |
| **L3 — Magasins et économie QR** | Magasins PNJ, catalogue partagé, caisse, achats/ventes, prix/stock, QR de lot/stock et transfert rationalisé | Achat magasin et chargement vers vaisseau de bout en bout |
| **L4 — Communication enrichie** | Publications, rendez-vous, messages ciblés, lien aux déclencheurs ; conserver les contrats actuels | Missions et rendez-vous pilotables depuis régie et reçus dans Terminal |
| **L5 — Spatioport avancé** | Modèles et vente/achat vaisseaux, passagers, coordonnées, protections, renseignements, interceptions et combats, transferts de butin, réparations | Chaîne complète achat → fret → départ → interception → butin → réparation → nouveau départ |
| **L6 — Validation intégrale** | Audit de droits, migrations, recette multi-comptes et mobiles, performance, reprise, sauvegardes, documentation MJ | Pack de mise en service et rapport explicite des limites restantes |

**Remarque sur L1 :** il peut être livré en tranches sans exiger immédiatement toutes les nouvelles entités : commencer par les domaines déjà pilotés par des Masters, puis ajouter les nouveaux écrans à mesure que leurs services métiers sont développés. Le résultat final doit toutefois permettre l'édition en ligne des six modules.

## 16.1. Dépendances et limites du lot Spatioport [P]

L5 doit réutiliser la soute, le carburant, les transactions et les voyages de L3 et du code existant. Les règles de protection, de combat et de réparation doivent être configurables avant d'exécuter une première bataille réelle. Si le système d'interception n'est pas encore prêt, ne pas simuler un résultat de combat « décoratif » qui ne modifie pas les vrais stocks.

## 16.2. Aucun déploiement automatique non consenti [P]

Créer une branche et une PR pour les évolutions majeures ; utiliser les workflows du dépôt et publier seulement dans le cadre d'une autorisation de déploiement explicite. Ne jamais demander de clé privée ou secret Firebase dans le chat, changer IAM/DNS ou modifier des comptes réels pour faciliter les tests.

---

# 17. Méthode de développement imposée à l'assistant Work Astra

## 17.1. Au démarrage d'une session de travail

1. Ouvrir le **dépôt réel** et constater commit, branche, version et dernier état de CI ; ne pas supposer que `0.36.0` est encore la version courante.
2. Lire le cahier des charges V2.0, les documents techniques du dépôt et les modifications déjà intervenues.
3. Établir une matrice `ID d'exigence / code existant / test existant / lacune / action proposée` ; distinguer un test unitaire d'une vérification terrain.
4. Identifier les services et collections à réutiliser, les scénarios de migration et les droits concernés.
5. Choisir le **plus petit lot cohérent** apportant un parcours complet, plutôt que créer beaucoup d'écrans fictifs.

## 17.2. Pour chaque lot à développer

1. Écrire les critères d'acceptation précis et sélectionner les cas REC applicables.
2. Modifier le code de la branche de travail avec migrations compatibles et protection des anciennes sessions.
3. Ajouter tests métier **et** intégration Firebase pour transactions, permissions, conflits et réessais ; ajouter tests d'interface pour le parcours utilisateur.
4. Exécuter au minimum les suites prévues dans le dépôt (`npm test`, `npm run build`, tests émulateurs si disponibles), vérifier les résultats et ne pas revendiquer des tests non exécutés.
5. Préserver les quatre XLSX Masters existants, vérifier les exports/imports et documenter tout changement du contrat.
6. Mettre à jour les guides (`README`, `MASTERS`, guide du module), les limites et un rapport de validation daté.
7. Livrer le lien PR/commit, les fonctionnalités **réellement** terminées, les contrôles réussis/échoués, les blocages et la proposition du lot suivant.

## 17.3. Définition de « terminé »

Un lot n'est terminé que lorsque : fonction reliée au **vrai** service métier ; permissions contrôlées côté serveur ; écrans utilisables ; tests pertinents exécutés ; aucun doublon de données ou effet ; imports et campagnes compatibles ; documentation et limites explicites. Le statut **publié** exige en plus une preuve de déploiement. Le statut **validé terrain** exige une recette avec les rôles et appareils nécessaires. Ne jamais confondre ces trois statuts.

---

# 18. Arbitrages à réserver au scénario (ne pas inventer)

| Domaine | Valeurs ou variantes non fixées | Consigne au développeur |
|---|---|---|
| Piratage | Difficultés, durée, nombre d'essais, effets, récupération | Créer des champs ; proposer des exemples non actifs uniquement |
| Magasins | Prix, catégories vendables, possibilité de vente au comptoir, stock de départ | Ne pas doter ou créditer un magasin réel sans barème |
| Vaisseaux | Prix d'achat, passagers, volume, carburant, puissance et classe | Catalogues vides/illustratifs ; validation de valeurs avant jeu |
| Routes | Coordonnées fictionnelles, distances, temps, coût en carburant | Ne pas inventer une carte ou des routes canoniques |
| Protection | Niveaux payants, garanties, bénéficiaire du paiement | Paramètres modifiables ; pas d'assurance implicite |
| Combat | Formule, chances, choix tactiques, aléa, dommages, rançons | Tester avec barème fictif clairement identifié |
| Butin | Limite du fret saisi, destination si soute du gagnant pleine | Prévoir arbitrage et jamais dupliquer le stock |
| Réparation | Niveau mécanicien, pièces, durée, lieu autorisé, coût | Obligation après combat validée ; chiffres à configurer |
| Passagers | Voyage virtuel, physique ou hybride ; conséquences humaines | Aucune conséquence physique automatique non décidée |
| Calendrier / capacité | Nombre réel d'épisodes, simultanéité, objectifs de performance | Mesurer la capacité pilote sans promettre l'illimité |

Les exemples techniques n'ont **aucune valeur canonique** pour *Outcasts*. Les règles de jeu définitives sont le contenu du Master validé par l'organisateur, et non des constantes cachées dans le code.

---

# 19. Livrables attendus à l'issue de la reprise

Le projet devra disposer d'un Dashboard cohérent, des six ateliers en ligne, des exports/imports fiables et compatibles, d'une bibliothèque de compétences commune, du routeur QR et de ses piratages ludiques, des six modules opérationnels, de tests automatisés et scénarios de recette, d'une documentation Master et joueur, d'un pack QR imprimable, de procédures de sauvegarde et de reprise, et d'un bilan de conformité par rapport aux exigences `MST`, `PER`, `COM`, `MAG`, `SPA`, `ECO`, `INF`, `QR`, `DAT`, `LIF`, `SEC`, `TX`, `TMP`, `OPS`, `UX`, `PERF` et `REC`.

La première démonstration intégrée devrait montrer, sur une session **de test isolée**, la séquence suivante : un personnage scanne un magasin, achète une ressource et du carburant, charge un lot sur un vaisseau de groupe, reçoit une mission, part vers une destination, subit une tentative d'interception, perd ou capture du fret, puis fait réparer son vaisseau par un mécanicien avant de poursuivre. Les écritures et les droits restent corrects à chaque étape.

---

# 20. Prompt de démarrage à remettre à Work Astra

> Tu reprends le projet **GN Engine** sur le dépôt `gkerckhofs-a11y/gn-engine`. Lis intégralement le cahier des charges **GN Engine — Work Astra V2.0** ci-joint. **Ne recrée pas l'application** : vérifie la branche `main`, la version publiée, les contrats des Masters, les fonctionnalités et tests déjà présents. Commence par **L0 — audit de reprise**, avec une matrice exigence / existant / manquant, puis prépare **L1 — atelier Master modulaire** en six espaces. Conserve la compatibilité des quatre Masters XLSX, les sessions et campagnes, la sécurité des QR privés et les transactions. Travaille par petits lots complets, avec tests, documentation, liens de commits/PR et état de publication distinct de la recette terrain. N'invente pas de règles chiffrées de GN et ne déploie pas en production sans autorisation dans ce flux de travail.

---

# 21. Références vérifiables

**Sources primaires du projet** — dépôt GitHub `gkerckhofs-a11y/gn-engine`, consulté le 22 octobre 2026. Les auteurs individuels de chaque fichier ne sont pas établis ici ; attribution au **projet GN Engine / propriétaire du dépôt**.

- **[S1]** GN Engine, *README* et *package.json*, état documenté `0.36.0`, 22 octobre 2026 : [dépôt](https://github.com/gkerckhofs-a11y/gn-engine) · [package.json](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/package.json).
- **[S2]** GN Engine, *Validation 0.36 — Tarifs dans les masters*, 22 octobre 2026, résultats et limites : [rapport de validation](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/VALIDATION-0.36.md).
- **[S3]** GN Engine, *Masters de campagne et de session — format 1*, actualisé jusqu'à la version 0.36 : [contrat des Masters](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/MASTERS.md).
- **[S4]** GN Engine, *Architecture Firebase* et *Espaces joueur*, 19–20 octobre 2026 : [architecture](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/ARCHITECTURE.md) · [guide joueur](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/ESPACES-JOUEUR.md).
- **[S5]** GN Engine, *Entrepôts, soutes, cargaisons et voyages*, actualisé jusqu'à la version 0.36 : [logistique](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/LOGISTIQUE.md).
- **[S6]** GN Engine, *Actions de terrain* et *Médiathèque*, 20 octobre 2026 : [actions](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/ACTIONS-TERRAIN.md) · [médias](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/MEDIATHEQUE.md).
- **[S7]** GN Engine, *Campagnes persistantes* et *Archives de scénario*, 20 octobre 2026 : [campagnes](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/CAMPAGNES.md) · [archives](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/SCENARIO-ARCHIVES.md).
- **[S8]** GN Engine, fichiers du moteur : [schéma Master](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/src/shared/master-schema.mjs) · [import](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/src/core/masters.mjs) · [voyages](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/src/core/voyages.mjs) · [connaissances](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/src/core/knowledge.mjs).
- **[S9]** Western City / GN Engine, *Cahier des charges V1.1 — Fonctions, parcours et critères de validation*, 20 octobre 2026 : [texte de référence V1.1](https://github.com/gkerckhofs-a11y/gn-engine/blob/main/docs/source/cahier-des-charges-v1.1.txt).

**Hiérarchie documentaire pour la suite :** le présent V2.0 précise la nouvelle organisation modulaire et les objectifs fonctionnels ; les contrats techniques en vigueur du dépôt et les décisions explicites du propriétaire restent prioritaires pour éviter toute migration destructrice. Toute divergence doit être signalée avec le fichier, la version et le choix proposé.
