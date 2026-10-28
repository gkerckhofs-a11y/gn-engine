# GN ENGINE — SPACE OUTLAWS EDITION

## Cahier des charges de développement dédié — Work Astra

**Version :** V3.1 — 23 octobre 2026  
**Décision stratégique :** changement de cap validé par l’organisateur : **livrer SPACE OUTLAWS en priorité**, sur le socle GN Engine existant, sans développer simultanément une plateforme universelle de création de GN.  
**Statut :** spécification de référence ; **aucune évolution du dépôt, aucun test GitHub et aucun déploiement Firebase n’ont été réalisés par la rédaction de ce document**.  
**Dépôt de développement à conserver :** `gkerckhofs-a11y/gn-engine` — https://github.com/gkerckhofs-a11y/gn-engine  
**Application historique :** https://gn-engine.web.app/  
**Règles canoniques :** *SPACE OUTLAWS — Livre des règles V0.7*, 23 octobre 2026, 26 chapitres et quatre annexes, arbitrages A01 à A38 clôturés **plus extension FOR-01, classe PNJ Jedi/Sith exclusivement**.  
**Documents de départ :** cahier GN Engine V2.1, livre SPACE OUTLAWS V0.7 et rapport de cohérence V0.7.  
**Destinataire :** ChatGPT Work, mode Astra ; l’organisateur garde seul le pouvoir d’autoriser une mise en production.

> **Instruction directrice** — Poursuivre le projet actuel **sans réécrire l’application, changer de dépôt, repartir de L0 à neuf ou perdre les travaux en cours**. Réutiliser les services, comptes, droits, QR, transactions, stocks, Masters et campagnes existants. Faire de SPACE OUTLAWS le premier produit complet livré. Désormais, la création libre de nouveaux systèmes de GN est **hors périmètre de livraison**. Les travaux sont réalisés sur une branche GitHub dédiée, testés par GitHub Actions et Firebase Emulator, puis proposés pour recette. **Aucun déploiement en production avant autorisation explicite.**

### Notation du document

- **[DÉCIDÉ]** : orientation approuvée dans cet échange du 23 octobre 2026.
- **[CANON]** : règle déjà ratifiée dans SPACE OUTLAWS V0.7 et ses arbitrages A01 à A38 ; voir annexe A.
- **[EXIGENCE]** : besoin fonctionnel ou contrainte technique à livrer/vérifier pour SPACE OUTLAWS.
- **[PROPOSITION]** : modalité d’implémentation recommandée, susceptible de s’adapter à l’architecture existante après audit.
- **[CONSTAT HISTORIQUE]** : information vérifiée lors d’une précédente reprise (22 octobre 2026), **pas** preuve de l’état courant.
- **[RECETTE]** : test ou critère à exécuter ; ne signifie pas que l’application le réussit déjà.

### Hiérarchie des références

1. Décisions de l’organisateur, arbitrages A01–A38, extension FOR-01 et livre **SPACE OUTLAWS V0.7** pour les règles de jeu.
2. **Présent V3.1** pour le périmètre produit, la simplification de la feuille de route et les critères de développement.
3. Contrats, droits et structures existants du dépôt **après inspection de sa branche réelle** ; signaler les écarts et fournir une migration compatible plutôt que supprimer des données.
4. Ancien cahier V2.1 comme source documentaire et matrice de transition : ses objectifs de généricité **ne sont plus des critères de livraison** s’ils contredisent le V3.1.

### Sommaire

1. Cap produit — application SPACE OUTLAWS dédiée
2. Point de départ — reprise sans repartir de zéro
3. Architecture — Master unique et six vues métier
4. Terminal joueur — personnages, QR et interactions
5. Compétences — droïdes, soins, actions de terrain
6. Spatioport — vaisseaux, trajets et combat
7. Commerce — missions, douanes et assurance
8. Campagnes — clôture et régie
9. Exigences techniques — sécurité, qualité, données
10. Feuille de route — lots SO-00 à SO-06
11. Recettes — 24 cas SPACE OUTLAWS + 6 cas FOR-01 et essais transversaux
Annexe A — Règles canoniques V0.7 (A01–A38 + FOR-01)
Annexe B — Transition documentaire V2.1 → V3.1
Annexe C — Références et limites

# 1. Cap produit : de GN Engine universel à SPACE OUTLAWS opérationnel

## 1.1. Objectif prioritaire [DÉCIDÉ]

Livrer **une application de GN complète pour SPACE OUTLAWS à Western City**, monde de Breach Port : personnages, classes, compétences, combats au sol, soins, QR, droïdes, boutique, spatioport, missions, économie, assurances, douanes, campagnes persistantes et régie MJ. Elle doit permettre de préparer et conduire plusieurs sessions d’un même univers sans programmation.

La qualité de la première campagne prime sur la possibilité de créer facilement d’autres univers. Le code peut rester techniquement réutilisable, mais **Astra ne doit plus construire des écrans, schémas ou éditeurs dont la seule finalité est un univers hypothétique**.

## 1.2. Ce qui change et ce qui ne change pas

| Sujet | V2.1 — cible initiale | V3.1 — décision |
|---|---|---|
| Produit | Créateur de GN extensible avec six ateliers universels | **Application dédiée SPACE OUTLAWS** avec six domaines de gestion |
| Master | Six Masters éditables et importables indépendamment, moteur de règles général | **Un Master SPACE OUTLAWS**, six rubriques métier ; imports ciblés seulement là où ils apportent une utilité réelle |
| Classes | Système destiné à accueillir toutes classes/règles imaginables | **Huit classes joueurs et règles V0.7** ; édition de personnages et dotations, pas création libre d’un nouveau système de classes |
| Combat | Formules librement définies pour chaque univers | Formules, seuils, PA et effets **A01–A38 validés** |
| Univers et apparence | Plusieurs univers et habillages | Identité visuelle et textes **SPACE OUTLAWS** uniquement pendant cette livraison |
| Socle | Services GN Engine existants | **Conservés**, migrations minimales, compatibilité sans réécriture |
| Suite du projet | Plateforme universelle avant cas d’usage complet | Recette opérationnelle SPACE OUTLAWS d’abord ; généricité réexaminée après expérience terrain |

## 1.3. Périmètre livré [EXIGENCE]

Les six domaines fonctionnels visibles dans le Dashboard sont **Personnages & Compétences ; Missions & Communication ; Boutiques ; Spatioport ; Économie & Stocks ; Informations & Fouilles**. Ce sont **six vues d’un même Master et d’un seul référentiel transactionnel**, non six applications, six bases de données ou six éditeurs de systèmes de règles.

Le Master permet de créer et modifier : personnages, groupes/factions, liens, portraits, compétences attribuées dans le cadre fixé, objets/images, stocks, produits, boutiques, contrats, missions, lieux, QR, vaisseaux, destinations/routes codées, rencontres et événements, PNJ, autorisations, tarifs de scénario et textes de jeu. Un réglage touchant une formule canonique exige une **nouvelle version explicite de règles**, jamais une modification silencieuse d’une session active.

## 1.4. Hors périmètre immédiat [DÉCIDÉ]

Créateur générique de règles et de classes, générateur multi-univers, apparences parallèles Warhammer/autres GN, éditeur de nouvelles mécaniques sans code, six formats XLSX complets obligatoires, carte galactique 3D, GPS réel, paiement bancaire, géolocalisation, déverrouillage électronique des portes, automatisation de gestes de combat physiques, application mobile native dédiée, chat externe, fonctionnement hors ligne avec écritures non vérifiées.

**Important :** « hors périmètre de livraison » ne signifie pas suppression des fonctions génériques ou des données qui existent déjà dans GN Engine. Elles doivent rester compatibles et protégées.

# 2. Point de départ et méthode de reprise sans repartir de zéro

## 2.1. État connu, non réaudité [CONSTAT HISTORIQUE]

Le cahier V2.1 avait documenté un état GN Engine `0.36.0` au **22 octobre 2026** : application web responsive, Firebase Authentication/Firestore, Masters de campagne et session, comptes, QR publics/privés, compétences, stocks, voyages, média et tests. La documentation d’alors mentionnait **648 tests applicatifs et 522 tests Firebase**. Ce sont des **résultats historiques**, et non une exécution récente ou une preuve que la branche courante est inchangée. La recette terrain sur smartphones et plusieurs comptes restait ouverte.

## 2.2. Première action d’Astra : audit différentiel de la branche en cours [EXIGENCE]

Avant toute nouvelle modification, Astra doit :

1. Vérifier `main`, les branches actives, commits, PR, tags, workflows, artefacts et éventuels travaux non fusionnés. **Ne pas supposer que l’ancien lot L1/L1b est terminé ou incomplet** sans preuve.
2. Lire `README.md`, `docs/MASTERS.md`, `docs/ESPACES-JOUEUR.md`, `docs/LOGISTIQUE.md`, `docs/CAMPAGNES.md`, `docs/ACTIONS-TERRAIN.md`, `docs/MEDIATHEQUE.md`, les rapports de validation actuels, `src/shared/master-schema.mjs`, les services métier correspondants et leurs tests.
3. Produire une matrice **exigence / code existant / branche / test existant / manque / adaptation minimale / risque données / priorité SO**.
4. Reprendre ou terminer les travaux déjà amorcés lorsqu’ils servent directement SPACE OUTLAWS ; ne pas créer une branche parallèle concurrente ni supprimer des travaux utiles. La nouvelle branche dédiée sera créée depuis une base explicitement vérifiée, ou la branche de travail existante sera conservée si elle est appropriée.
5. Identifier les migrations nécessaires et leur plan de retour arrière **avant** toute modification des collections Firestore ou du contrat des Masters.

**Sortie SO-00 :** état des lieux concret, état des tests, graphe des dépendances, fonctionnalités réutilisées, modifications de périmètre V2.1→V3.1, branche retenue et ordre de réalisation. Cet audit **n’est pas une invitation à recommencer le développement déjà effectué**.

## 2.3. Invariants de compatibilité

Préserver les comptes, les identifiants de personnages et d’objets, les collections historiques, les transactions, les campagnes passées, les connaissances, les Masters XLSX `CAMPAGNE`/`SESSION` et les exemples historiques, l’authentification, les permissions, les états de vaisseaux et les journaux. Les imports restent idempotents. Aucune règle nouvelle ne modifie rétroactivement une session close. Les migrations devront être réversibles ou restaurables et accompagnées d’essais sur données de recette.

# 3. Architecture fonctionnelle et Master SPACE OUTLAWS

## 3.1. Une seule source de vérité [EXIGENCE]

**Univers SPACE OUTLAWS → Scénario/Master versionné → Campagne → Session/épisode → Instances réelles de jeu.** Les définitions (modèle de vaisseau, objet, compétence, route) sont distinctes des instances (vaisseau acheté, dose, lot, personnage, transaction). Une publication ne modifie ni les valeurs déjà payées ni les contrats exécutés.

Le Dashboard possède **six onglets fonctionnels**, éventuellement issus des écrans déjà développés. **Un seul Master global fait foi**, exportable/importable avec version et validation des dépendances. Les imports/exporteurs partiels sont autorisés en amélioration et doivent réutiliser le contrat existant ; ils ne sont pas une condition préalable à une première session jouable.

## 3.2. Écrans MJ indispensables

| Vue | Fonctions nécessaires |
|---|---|
| Accueil et session | Sélection campagne/session, état publié, progression, QR prêts, blocages, stocks, budget, alertes |
| Personnages | Créer/attribuer, classes V0.7, nature humanoïde/droïde, XP/PA, kits, portraits, morts/successeurs, droits, compétences rares |
| Missions & annonces | Briefings, annonces, rendez-vous à Western City, missions, récompenses, destinataires, publication ciblée, preuves |
| Boutiques | Catalogues, QR des magasins, caisses, vendeurs PNJ, stocks réels, cours, transactions, vente/rachat |
| Spatioport | Trois modèles de vaisseaux, instances, pilotes, manifestes, plans/routes codées, carburant, voyages, incidents, interceptions, combat, atelier |
| Économie et douanes | Portefeuilles, lots, soutes, entrepôts, assurance financée, douaniers habilités, contrats, saisies, successions |
| Informations & QR | Indices, documents, secret, fouilles, badges publics, QR serrure prison, QR poste Rogue, niveaux d’accès |
| Régie en cours de session | Pause/STOP, arbitrages, litiges, contestations, corrections motivées, états réservés, notifications, journal d’audit |
| Publication/archives | Contrôle de cohérence, diff, prévisualisation, sauvegarde, import/export, clôture, reprise d’épisode |

Les six domaines restent les piliers de navigation ; les vues transversales régie, sécurité et publication ne créent pas trois moteurs supplémentaires.

## 3.3. Contrat d’édition du Master [EXIGENCE]

Créer, éditer, dupliquer, rechercher, archiver et associer des images aux personnages, objets, missions, lieux et ressources ; téléversement par lot, attribution par lot et suppression sous vérification des références. Prévisualiser la projection joueur publique/privée, les QR imprimables et les stocks/fonds disponibles.

Publier implique : vérification des identifiants, liens inter-objets, prérequis, capacités, droits, QR actifs, stocks, budgets, tarifs et cohérence avec les règles A01–A38. Réimporter le même Master n’ajoute ni kit, ni vaisseau, ni crédits, ni récompense. L’import d’une catégorie ne détruit pas une autre. Le Master n’exécute jamais de code libre inséré dans un champ texte.

## 3.4. Bibliothèques techniques réutilisées, pas refondues

Un référentiel de compétences, un routeur QR, un système de comptes/transactions, un registre de stocks et un journal d’événements suffisent. Les contraintes spécifiques du scénario résident dans des règles métier et des profils identifiables ; **ne pas créer un second portefeuille « SPACE OUTLAWS », ni un deuxième inventaire de modules ou de marchandises**. Utiliser des espaces de noms pour éviter `COM-01` (compétence de combat) versus `COM-01` (ancienne exigence communication) : `SKILL-COM-01`, `REQ-COM-01`, etc.

# 4. Terminal joueur, personnages et interactions

## 4.1. Navigation conservée [EXIGENCE]

Conserver si possible les quatre espaces existants : **Mon personnage, Mon groupe, Action, Terminal**. Un scan ouvre une fiche de cible dans la même application, avec seulement les données et opérations autorisées. Prévoir les états `éligible / verrouillé avec explication non sensible / réservé / en cours / réussi / échoué / annulé / remboursé`. Aucun bouton inerte. Tous les textes et habillages de la livraison sont orientés **SPACE OUTLAWS**.

## 4.2. Identités et QR [EXIGENCE]

Un joueur réel, son compte authentifié et son personnage fictif sont trois entités distinctes. Deux identifiants QR jamais confondus : **invitation privée** éphémère à usage unique, révocable et liée à l’authentification ; **badge public** durable donnant une identité publique de personnage et les interactions permises. Scans publics jamais autorisés à accéder à la fiche privée, aux coordonnées réelles ou au rôle MJ.

Les interactions disponibles comprennent dons, paiements, soins, missions, objets, fouilles, actions autorisées et effets de compétences V0.7. Si une action de jeu est appelée « intrusion », elle manipule uniquement des données fictives explicitement exposées dans le Master, **jamais les permissions Firebase ni un mot de passe réel**.

## 4.3. Progression et états [CANON]

Les **huit classes joueurs** (Combattant, Rogue, Traqueur, Médecin, Mécano, Pilote, Courtier, Infiltrateur), natures humanoïde/droïde, XP/PA, compétences secondaires, initiations limitées, déblocages rares, reconversion, soins, capture et décès suivent l’**annexe A** sans règles alternatives. Ne pas déduire une compétence d’un accessoire équipé. Ne pas restaurer automatiquement les PV, modules ou protections lors d’une reconnexion.

À créer : affectation d’un kit de classe non pillable/non revendable, dotation de **200 Cr protégés** à la création, puis passage en crédits ordinaires uniquement au début de l’épisode suivant si personnage survivant ; succession sans transfert de fortune/dettes implicite et XP du successeur selon V0.7 ; PA **réinitialisés entièrement lors de chaque nouvelle incarnation** selon la décision utilisateur A09.2.

## 4.4. ROG-02 — Vol à la tire : poste d’organisation [CANON]

Par exception aux scans de proximité, le Rogue réalise le vol **au local de l’organisation**. Un poste explicitement habilité fournit le QR d’interaction du personnage cible ; le Rogue doit connaître et saisir **nom et prénom fictifs**. Pas d’autocomplétion, pas de projection d’inventaire privé ni localisation physique réelle de la victime. Erreur d’identité = 10 minutes de récupération, aucun PA et aucun quota sur la cible. Cible sans objet éligible = aucun PA, mais récupération et tentative comptabilisées.

Durées **60/45/45/30/30 secondes** aux niveaux 1–5 ; N1–N2 un objet aléatoire, N3–N4 choix parmi deux objets éligibles distincts (ou l’unique objet disponible), N5 choix parmi tous les objets éligibles, **une seule unité**. Quota global victime : **deux tentatives au plus et une seule réussite par session**, tous Rogues confondus. Coût 1 PA seulement pour transfert effectif. Résolution atomique du butin et des quotas. Notification de la victime **10 minutes après le vol**, sans auteur ; consultation anticipée de l’inventaire autorisée. Remise physique par MJ si indispensable à l’utilisation ; aucun vol réel de poches/objets.

## 4.5. ROG-03 — Évasion : QR serrure de la prison [CANON]

Le QR est **physiquement placé sur la serrure de la prison de Western City**. Il déclenche exclusivement une sortie *fictive*, jamais une commande matérielle. Durées **60/45/45/30/30 secondes**. Surveillance directe d’un gardien bloque l’évasion ; interruption par découverte = 10 minutes de récupération, zéro PA, progression remise à zéro ; abandon sans découverte gratuit. Coût 1 PA si action réellement réussie. N1–N2 issue prévue ; N3–N4 escorte scénarisée ; N5 occasion crédible sans QR après validation MJ. **Captivité maximale 20 minutes réelles**, sortie physique toujours sûre.

## 4.6. Classe exceptionnelle « Sensitif de la Force » — PNJ seul [CANON FOR-01]

Créer un **profil de classe `PNJ_FORCE_SENSITIVE`**, assignable uniquement par une autorité MJ côté serveur, invisible des listes de création, achats XP, initiations secondaires, reconversions et recherches joueurs. Le profil contient `alignment=JEDI|SITH`, `force_level=1..5` et une éventuelle attribution de `LAS-01` ; un sensitif non formé peut disposer de FOR-01 N1 sans sabre. Pour un Jedi/Sith formé, `LAS-01` est attribuée par le MJ sans XP. **LAS-01 n’accorde jamais FOR-01**. Les huit classes joueurs restent intactes, avec les mêmes XP, PA, PV et kits.

L’identité publique du PNJ peut être celle d’un voyageur ordinaire jusqu’à une révélation scénarisée. Les détails de la Force, l’orientation réelle et les niveaux ne doivent pas apparaître dans le QR public ni dans les exports joueurs. Les droits `npc_force` et `game_master` sont validés **à chaque action côté serveur** ; un joueur ne peut obtenir ces privilèges par QR, import, équipement ou modification de profil.

# 5. Compétences, droïdes, soins et actions de terrain

## 5.1. Résolveur d’actions [EXIGENCE]

Un profil de compétence comporte : identifiant stable, niveau, statut fixe/évolutif/rare, droits de cible, condition, durée, PA réservé, consommable réservé, test serveur, bonus compatibles, résultat, récupération, nombre d’essais, secrets projetés, journal et cause d’interruption. La dépense effective dépend de l’exécution : un jet/effet non exécuté restitue les ressources réservées selon A22 ; les exceptions ROG-02, ROG-03, Sabotage et soins sont déterminées par leur règle canonique. Le serveur, et non le navigateur, tranche chaque effet.

Mettre en œuvre COM-03, PIL-01/02, INF-01/02/03, Entretien avec les durées de l’annexe A. Pour les compétences rares (Sabotage, Dissimulation, FIL-01, EFF-01, TOXI-01, ESC-01, LAS-01), le déblocage, les droits, les cibles et les tables sont strictement ceux de la V0.7. Les événements `traces de jeu` sont séparés de l’audit technique sécurisé, qui ne peut jamais être masqué ou altéré par EFF-01.

## 5.2. Sécurité du combat au sol [CANON]

3 PV de base (4 avec Vétéran), une protection personnelle au plus, dommages ordinaires 1, sabre laser 0 PV en cas de touche valide, fenêtre des deux secondes, riposte, désarmement, garde du corps, neutralisation furtive et soins selon V0.7. L’application gère états/timers/conséquences ; **aucun capteur ou QR ne certifie la sécurité physique d’un geste**. STOP SÉCURITÉ suspend les minuteries concernées. Matériel de mousse, gel blasters et sabres individuellement homologués par l’organisation, selon la recette physique distincte.

## 5.3. Soins et mort [CANON]

À 0 PV, fenêtre de survie **5 minutes réelles** ; stabilisation par n’importe qui après **60 secondes continues** ; soins MED-02/MEC-02 selon niveaux, PV positifs puis 10 minutes de convalescence/réétalonnage. Séparer état critique, stabilisé, mort et indisponible ; aucune mort automatique pendant STOP SÉCURITÉ. Les PNJ médicaux suivent prix et prérequis arrêtés. Une clôture de session ne peut pas éluder le décompte mortel.

## 5.4. Modules de droïdes [CANON]

Deux emplacements par droïde ; six références DR-01 à DR-06 et leurs prix (300, 200, 350, 350, 300, 400 Cr), qualifications MEC-03 et durées de pose/retrait déjà validées. Quatre états : opérationnel, protection épuisée, neutralisé temporairement, endommagé durablement. PV, protection et module restent **indépendants**. Réparation complète des PV n’efface pas les avaries des modules ni ne rétablit gratuitement le blindage. Réparation spécifique : MEC-02 + MEC-03 qualifiés, 25 % du prix du module arrondi à 25 Cr supérieurs, pièces réellement disponibles ; PNJ payant possible. Une installation/désinstallation conserve l’identifiant, les objets contenus et la propriété, sans duplication.

## 5.5. Sabotage, Dissimulation, Pistage, Effacement, Toxicologie [CANON]

Implémenter les seuils, niveaux, risques, protections et tableaux de la V0.7. Sabotage : temporaire 15 minutes maximum par défaut, accès dépendant du niveau, avarie durable **seulement par événement distinct** ; la maintenance d’un droïde joueur n’autorise pas une agression technique arbitraire. Dissimulation : une unité cachée/30 minutes. FIL-01 vs EFF-01 : opposition sur traces **fictives**, jamais sur identifiants Firebase. Toxicologie : objets/recettes fictifs, **activation volontaire par la cible via QR**, Malaise 15 minutes sur humanoïde sans diminution de PV, droïde immunisé. Aucun produit réel dans une boisson, un aliment ou sur une personne.

## 5.6. FOR-01 — Pouvoirs de la Force : règles et interactions [CANON]

Une compétence unique `FOR-01` évolutive de N1 à N5 pour le seul profil PNJ `Sensitif de la Force`. Les pouvoirs conservés aux niveaux supérieurs suivent le référentiel ci-dessous ; **N4 dépend de l’orientation** et N5 ne modifie que N1 et N3.

| Niveau | Pouvoir | Cibles, conditions, effets |
|---|---|---|
| N1 | Influence mentale | Un humanoïde conscient, vue et voix directes, ≤3 m ; suggestion simple et plausible exécutable dans 30 s ; exclut aveu forcé, secrets, transferts, trahison, combat imposé, accès réels ; droïdes immunisés |
| N2 | Soin par la Force | Humanoïde blessé ; 90 s continues ; stabilisation après 60 s avant échéance 5 min à 0 PV ; +1 PV à 90 s puis 10 min de convalescence ; **une application par cible et par session** ; ni droïde ni résurrection |
| N3 | Projection | Humanoïde ou droïde en ligne de vue, ≤5 m ; 3 s sans attaque, défense/retrait possibles ; zéro PV, aucun recul dangereux |
| N4 Jedi | Protection par la Force | Sans jet : annule immédiatement une touche ordinaire sur soi ou un allié ≤2 m visible ; pas rétroactif, ni sabre, ni neutralisation furtive déjà réussie, ni double annulation |
| N4 Sith | Étouffement par la Force | Humanoïde en vue, ≤5 m ; 10 s sans attaque ni compétence active ; défense, parole et retrait de sécurité possibles ; zéro PV ; cesse si Sith blessé, concentration/vue interrompue ; aucun geste réel au cou |
| N5 | Maîtrise supérieure | Influence OU Projection sur deux cibles valides avec **un jet par cible**, résultat indépendant ; une activation et un PA, pas de double Soin/Protection/Étouffement |

**Opposition pour N1/N3/N4 Sith :** `1D6 + niveau FOR-01` du PNJ contre `1D6 + max(2, niveau FOR-01 cible si présent)` ; réussite du PNJ uniquement si strictement supérieure, égalité à la cible. Deux jets cibles distincts au N5. N2 et N4 Jedi automatiques sous conditions.

**Consommation et récupération :** 1 PA à l’exécution du pouvoir, succès comme échec au jet ; 10 minutes de récupération **partagée entre tous les pouvoirs FOR-01**, y compris hors combat ; au maximum **une activation par confrontation** (définition existante : fin après 60 s sans hostilité et séparation, reddition ou arbitrage MJ). Le PA réservé est restitué si la cible est absente ou si l’effet/le jet est impossible avant résolution ; toute activation effective crée un résultat idempotent journalisé. N5 double cible compte pour une seule activation.

**Mise en scène et sécurité :** annonces `Influence !`, `Soin par la Force !`, `Projection !`, `Protection par la Force !`, `Étouffement !`. Aucune interaction physique imposée, aucun déplacement risqué, aucune apnée ni pression au cou ; STOP SÉCURITÉ suspend ou annule avec motif. Pour les scènes de combat, annoncer immédiatement le pouvoir et permettre la validation/enregistrement par un arbitre au lieu de demander un téléphone sous les tirs. La Protection doit intervenir **au moment de la touche**, sans modifier après coup une attaque résolue.

**Contrat GN Engine :** réutiliser le résolveur des compétences et les événements de statut, sans créer un second moteur de combat. Entrées `npc_character_id`, `power_id`, `target_ids` (une ou deux selon niveau), `ruleset_version`, `declared_scene_context`, `activation_id`. Le serveur vérifie rôle/alignement, compétences, cible biologique ou droïde, PA, délais, quota de confrontation, quota de soin/cible/session et conditions déclarées ; les jets doivent être serveur, ou rapportés par arbitre authentifié si action physique. Stocker résultats par cible, statuts expirables, PA/récupération, audit MJ. Projeter au joueur uniquement **l’effet subi**, sans divulguer l’identité secrète du PNJ.

**Frontières de sécurité :** Influence ne change jamais les comptes, permissions, stocks, propriétés, mots de passe ou accès Firebase ; la suggestion reste du jeu de rôle. Aucun déclenchement FOR-01 par QR public non autorisé. L’expiration d’un statut ne restaure pas de PV perdus. Le soin FOR-01 respecte la même mortalité 5 min que MED-02 ; il ne contourne pas le protocole de sécurité.

# 6. Spatioport, vaisseaux, trajets et conflits

## 6.1. Les trois modèles de départ [CANON]

| Vaisseau | Prix | Coque | Boucliers | Manœuvrabilité |
|---|---:|---:|---:|---:|
| Chasseur léger | 5 000 Cr | 3 | 1 | +2 |
| Cargo léger | 10 000 Cr | 4 | 2 | +1 |
| Transport renforcé | 20 000 Cr | 6 | 3 | +0 |

| Vaisseau | Places | Fret | Réservoir | Modules |
|---|---:|---:|---:|---:|
| Chasseur léger | 1 | 0 | 8 | 1 |
| Cargo léger | 6 | 20 | 16 | 2 |
| Transport renforcé | 15 | 50 | 24 | 3 |

Le prix est une référence pour réparation, services et modules. Chaque **instance** possède propriétaire, droits de gestion, état technique, transpondeur permanent, identités de couverture, modules, QR, carnet de bord et historique. Le capitaine/pilote n’est pas implicitement propriétaire.

## 6.2. Voyage et convoi [CANON]

Destinations fictives et codes configurés dans le Master, route courte/moyenne/longue **5/10/15 minutes**, carburant 25 Cr/unité et consommation 1/2/3 × gabarit 1/2/3, un débit initial unique. Manifeste d’équipage enregistré avant le départ, passagers limités aux places autorisées ; cargaison indisponible en escale pendant le voyage. L’horloge de jeu conserve la progression, la pause, les détours et l’événement déjà tiré. Ravitaillements réels de stock, dépannage et remorquage selon annexe A.

## 6.3. Embuscade et combat [CANON]

Une interception doit avoir un fondement légitime dans les données de jeu : embuscade ciblée via renseignement valide, ou opportuniste sur liaison connue. Les priorités, le convoi protégé sur le tronçon et l’unicité de rencontre sont gérés côté serveur ; aucun renseignement de navigation privé ne peut fuiter. En combat spatial virtuel : round de **90 secondes**, ordres verrouillés et replis pré-déclarés, tirs simultanés, seuils D6, fuite après dégâts, un seul poursuivant principal, fin après deux rounds sans hostilité. Les manœuvres PIL-03 et ESC-01, leurs PA et non-cumul sont celles de l’annexe A.

Une reddition sans réponse **n’est pas acceptée tacitement**. Un vaisseau à 0 Coque est immobilisé ; il n’est pas détruit automatiquement et son équipage ne meurt pas d’un simple résultat spatial. Un combat ne transfère jamais automatiquement le vaisseau ni la cargaison au vainqueur.

## 6.4. Révision conditionnelle et atelier [CANON]

Supprimer la règle obsolète « révision obligatoire après tout combat ». La révision à **1 % du prix du vaisseau** n’est obligatoire qu’après **un échange de tirs effectivement exécuté, même manqués ou esquivés**, ou une avarie spéciale qui la déclenche explicitement. Réparation Coque **5 % du prix/point**, Bouclier **0,5 %/point**, module **25 % de sa valeur neuve**, avec MEC et durées spécifiques. Une reprise est possible dès Coque ≥1, pilote et carburant disponibles et révision requise terminée. Renouveler les pièces uniquement par lots existants, et payer un PNJ depuis sa vraie caisse.

## 6.5. Abordage, épaves et identité [CANON]

Arrimage 2 minutes ; scène de sécurité ou reddition ; transfert de fret **5 unités par 3 minutes**, dans un vaisseau cargo receveur ayant la capacité, chaque tranche atomique et résumable. Propriétés du vaisseau, des marchandises et des accessoires distinctes. Soute clandestine non révélée automatiquement, coffre sécurisé à accès distinct. Épaves : remorquage adapté au gabarit, délais de revendication jusqu’à session S+1, droits reconnus, caisse/casse à rendement unique et impossibilité de vendre simultanément les modules et leurs pièces. Transpondeur original conservé dans journal, documents falsifiés soumis aux contrôles.

# 7. Commerce, missions, douanes et assurance

## 7.1. Boutiques et stocks [EXIGENCE]

Boutiques identifiées par QR : catalogue d’objets réels, stocks disponibles, prix par route/état de marché, propriétaire ou caisse PNJ distincts. Devis puis transaction atomique (débit, transfert de lot, reçu), remise matérielle si nécessaire et notifications selon droits. Les crédits protégés à la création ne servent qu’aux consommables/services PNJ non transmissibles et non revendables. Les références de marchandises, coefficients 85/100/115/130 %, barèmes de revente particuliers et arrondis sont décrits en annexe A.

Les services économiques (banque fictive, transport, boutique, douanes, assurance, primes) **ne créent jamais de crédits par défaut** : stocks, comptes source et réserves financées, plafond et journal comptable obligatoires.

## 7.2. Missions et contrats [EXIGENCE]

Permettre annonces ouvertes ou ciblées, missions de personnage ou de groupe, rendez-vous physiques à Western City, conditions, récompenses, preuves et événements de QR ou de voyage. Les missions et contrats n’utilisent qu’un seul registre de paiement ; signature = fonds disponibles réservés, livraison/fin validée par QR ou MJ, contestation dix minutes, médiation et recours selon V0.7. L’avenant de détour et le carburant aller-retour provisionné pour l’escorteur sont calculés distinctement du salaire.

## 7.3. Douanes et contrôles [CANON]

Habilitations de contrôle **N1–N5 attribuées par le MJ**, sans achat de compétence/XP ; contrôles ordinaires et approfondis, une inspection par vaisseau/escale sauf élément nouveau, formules D6 validées, taxes et licences, quittance unique. Retenue provisoire quinze minutes réelles maximum ; saisie formelle distincte, aucune confiscation automatique de biens ou de vaisseau sur un seul échec documentaire.

## 7.4. Assurances et recours [CANON]

Prime **2/4/6 %** selon risque, indemnité **80 %** des pertes reconnues et maximum **5 000 Cr par police**, une police par unité de fret et par voyage, caisse assurantielle préfinancée et fonds réservés. Récupération ultérieure de biens indemnisés ⇒ restitution proportionnelle et verrou temporaire du lot, sans duplication ni effacement de l’inventaire d’un pirate par l’application. Litiges, créances et paiement effectif persistent entre épisodes.

# 8. Campagnes, clôtures et opérations de régie

## 8.1. Persistance [CANON]

Conserver entre sessions : personnages/nature/classe/XP et niveau global, crédits et dettes, biens, droits, PV manquants, protection épuisée, modules, Coque/Boucliers/carburant, stocks, équipages, contrats, assurances, litiges, voyages en cours, temps restant et tirages déjà réalisés. Aucun soin, carburant, argent, lot, Bouclier ou nouveau tirage gratuit en début d’épisode.

Expirent selon A38 : récupération ordinaire de 10 minutes, malaise et neutralisations temporaires, caches, convalescence temporelle (sans guérison des PV). PA au maximum au début de nouvelle session, puis selon cadence de cinq heures ; mort et succession selon règles ratifiées. Captivité max 20 minutes ne traverse pas artificiellement l’intersession, urgence de survie résolue avant clôture.

## 8.2. Clôture de session [EXIGENCE]

La régie propose un état de clôture détaillé : personnages critiques, propriété et lots, ressources réservées, voyages/combats inachevés, preuves de livraison, sinistres, dettes et décisions MJ. Les décisions de règlement sont auditées. Publier l’épisode suivant depuis un instantané validé ; les barèmes nouveaux n’écrasent pas les contrats ou acquisitions anciens.

## 8.3. Évolutions du Master entre épisodes [EXIGENCE]

Ajouter/modifier portraits, missions, stocks, scénarios, lieux, QR, routes et PNJ sans transformer automatiquement un état déjà joué. Publier explicitement une nouvelle version avec diff et dépendances. Les éventuelles migrations de règles ne sont jamais implicites. La régie en jeu autorise seulement les opérations à chaud prévues, avec motif et historique ; import massif de données vivantes interdit avant mécanisme transactionnel éprouvé.

# 9. Contrats techniques, sécurité et qualité

## 9.1. Domaines de données [PROPOSITION — à raccorder au schéma réel]

| Domaine | Données à tracer | Invariants |
|---|---|---|
| Personne et personnage | Participant, compte, rôle, Character, classe, XP, PA, kits, **classe PNJ cachée + orientation Force** | Séparer réel/fiction ; droits serveur, jamais créable par joueur |
| QR | QrTarget, ActionProfile, poste d’organisation, serrure prison | Session, permissions, cibles et chemins sûrs |
| Compétence | Skill, prérequis, niveau, réservation, tentative, jet, horodatage, **ForcePowerAttempt et états FOR-01** | Une exécution par commande ; quotas globaux, cooldown commun, confidentialité PNJ |
| Droïde | Deux modules, états, réparation, protection, contenus | Pas de copie, PV/modules indépendants |
| Inventaire et fonds | ItemDefinition, lot, détenteur, propriétaire, StockLocation, Account, Ledger | Source et destination réelles ; totaux conservés |
| Spatioport | Ship, modèle, manifeste, Route, Journey, Interception, SpaceCombat | Un événement / trajet-convoi, un combat / interception |
| Autorités | Inspection, mandat, retenue, saisie, identité de couverture | Journal permanent et procédures séparées |
| Contrat et assurance | Contract, escrow, FreightLotCoverage, Claim, Dispute | Argent réellement immobilisé, une police active par lot |
| Campagne et Master | Version, épisode, publication, archive, import | Pas de réécriture rétroactive |

Les noms de tables/classes sont indicatifs. Astra doit **réutiliser les vrais identifiants du dépôt**, documenter toute extension et ne pas lancer de migration destructive sans recette et sauvegarde.

## 9.2. Sécurité, confidentialité et concurrence [EXIGENCE]

Autorisations vérifiées côté serveur sur **chaque** lecture sensible et mutation. Données de participant et secrets de personnage séparés. Pas de données privées envoyées au navigateur pour être seulement masquées. Scan QR public ≠ droit d’accès. Pas de contournement des règles Firebase sous prétexte de hacking ludique. Les actions économiques, vols, jet de dé, créations d’objets, assurances, retraits et réparations doivent être **idempotents** et sûrs en concurrence ; règles transactionnelles ou réservations récupérables, résultats stables après coupure réseau et reprise.

Les journaux techniques/audit sont immuables aux compétences de jeu (EFF-01 ne masque que les traces fictives). Le MJ voit les références de chaque correction, transaction et arbitrage. Les retards réels critiques (0 PV, captivité) sont séparés des durées suspendables de jeu (voyages, fouilles, activités), en respectant STOP SÉCURITÉ.

## 9.3. Plateformes et capacités [EXIGENCE]

Interface mobile responsive Android/iOS, scanner QR ou saisie de code de secours, lisibilité en extérieur et limitation des données personnelles exposées. Réseau instable : indiquer l’état certain/incertain et vérifier la commande serveur avant réessai. Tests multicomptes et charge cible initiale **environ 60 participants**, valeur de recette et non promesse de capacité illimitée. Aucun fonctionnement hors ligne transactionnel non prouvé.

## 9.4. Recette de sécurité terrain [EXIGENCE]

Aucune ouverture réelle de la serrure de prison. Sortie sûre et accessible préparée. Homologation des gel blasters, épées mousse et sabres adaptés, protections oculaires, distances et lieux de tir par l’organisation ; **aucune valeur physique n’est inventée par Astra**. Les substances de toxicologie sont uniquement fictives. Une décision de sécurité humaine prévaut toujours sur l’action numérique.

# 10. Feuille de route de livraison centrée sur SPACE OUTLAWS

**Principe :** il s’agit de lots de **conformité fonctionnelle**, à raccorder au travail réel déjà effectué sur GitHub. Astra peut fusionner ou scinder les sous-lots selon l’état constaté, mais ne modifie pas leurs critères d’acceptation. Chaque tranche se termine par un commit documenté et des tests, **sans production**.

| Lot | Objectif | Critères de sortie incontournables | Recettes principales |
|---|---|---|---|
| **SO-00 — Reprise** | Audit actuel, branche et travail L1/L1b en cours ; matrice d’écarts | État GitHub constaté, pas de rollback caché, plan minimal | Vérifications de base + import historique |
| **SO-01 — Personnages** | Huit classes joueurs + PNJ Force caché, XP/PA, dotations, combat au sol, soins et mort | Progression, doubles décès, crédits protégés, soin et secrets | SO-01 à 05 + FOR-01 |
| **SO-02 — QR et compétences** | Routeur QR existant adapté, ROG-02 au poste orga, ROG-03 prison, rares et FOR-01 | Notifications, quotas, droits, timers, traces et états | SO-06 à 11 + FOR-02 à 06 |
| **SO-03 — Droïdes et techniques** | Six modules, ateliers, sabotage, réparations | Deux emplacements, états indépendants, coûts, retrait | SO-09, 12 |
| **SO-04 — Spatioport** | Vaisseaux, trajets, combats, PIL-03/ESC-01, remorquage et abordage | Jet unique, simultanéité, soutes/PI, maintenance conditionnelle | SO-13 à 19 |
| **SO-05 — Économie et autorités** | Magasins, stocks, douanes, contrats, assurances et litiges | Comptes financés, transferts uniques, procédures légales | SO-20 à 22 |
| **SO-06 — Master, campagne et recette globale** | Finalisation du Master unique, régie, sécurité, reprise et essais terrain | Imports rétrocompatibles, 24 recettes + 6 FOR, droits, UX, rapport | SO-23, 24 + régression |

**Les écrans déjà développés pour l’ancien L1 ne sont pas à jeter.** Les réutiliser comme six rubriques du Master dédié ; renoncer uniquement aux abstractions superflues. Chaque nouvelle tranche doit proposer un **parcours opérationnel de bout en bout**, pas de simples écrans de démonstration déconnectés des stocks et comptes réels.

## 10.1. Jalons de validation [EXIGENCE]

- **G0 — Baseline vérifiée** : branches/commit/CI réels, sauvegardes et plan d’évolution documentés.
- **G1 — Flux personnage+QR** : création → activation → action → état réel → historique.
- **G2 — Flux économie+vaisseau** : magasin → paiement → chargement → voyage → événement → combat → fret → réparation.
- **G3 — Flux campagne** : clôture → session suivante → actifs, PA, voyages, contrats, états, réservations corrects.
- **G4 — Recette terrain et sécurité** : smartphones, MJ, joueurs, organisation, QR, prison et zones de jeu approuvés.
- **G5 — Proposition de mise en service** : rapport global, limites et procédure de déploiement **non exécutée** ; décision explicite demandée au propriétaire.

## 10.2. Méthode GitHub non négociable [DÉCIDÉ]

1. Développer exclusivement sur `gkerckhofs-a11y/gn-engine`, sur une **branche dédiée contrôlée**. Examiner et préserver toute branche de travail appropriée déjà en cours avant de sélectionner la base.
2. Ne jamais déployer Firebase production pendant ces lots ; **ne pas déclencher de workflow de déploiement** et **ne pas modifier `.github/deploy-request.json`**.
3. Après chaque ensemble fonctionnel validé : commit, tests applicatifs, build, tests d’intégration Firebase Emulator, workflows **GitHub Actions de test seulement**, rapport avec commandes, commits, succès et échecs.
4. Corriger les régressions avant le lot suivant ; sauvegarder et tester les migrations dans un environnement isolé.
5. Conserver les comptes, anciens Masters, campagnes et sessions. Ne pas demander de clés privées en chat ni modifier IAM, DNS, comptes de production ou règles Firebase production pour faciliter les tests.
6. À la fin : PR ou branche de livraison, état du code, couverture de recette, limites résiduelles, sauvegarde et procédure de déploiement **pour validation du propriétaire uniquement**.

## 10.3. Définition de « livré »

Une fonction est « développée » seulement si elle s’appuie sur le service métier réel et passe ses tests d’autorisation, transactions, erreurs et répétitions. « Validée » implique la recette métier multi-comptes et, lorsqu’il y a interaction physique, la recette terrain. « En production » exige l’autorisation explicite et un déploiement réellement constaté. Ne pas confondre ces trois états.

# 11. Recette obligatoire et critères d’acceptation

Les **24 scénarios REC-SO**, complétés par **6 scénarios REC-SO-FOR**, sont des **tests fonctionnels** (pas 24 aventures à écrire). Ils sont la grille minimale d’acceptation du moteur pour SPACE OUTLAWS. Les tests historiques `REC-01` à `REC-27` de la V2.1 restent à réutiliser **lorsqu’ils couvrent encore une fonction conservée**, mais il n’est plus nécessaire de prouver une généricité pour d’autres univers.

## 11.1. Les 24 recettes SPACE OUTLAWS (critères de validation)

| ID | Action / situation | Attendu vérifiable |
|---|---|---|
| REC-SO-01 | Créer 8 classes, 8 initiations et 2 natures humanoïde/droïde | Trois compétences initiales N2 ou fixes, initiation N1 admissible occupant une place secondaire, cinq places max, Vétéran réservé au Combattant |
| REC-SO-02 | Jouer quatre sessions, mourir deux fois dans une session | Passage utilisateur à 8 PA après quatre sessions, 3 XP max/session, XP successeur plancher(25 % carrière) plafonné à 9, réserve PA complète à chaque nouvelle incarnation |
| REC-SO-03 | Dépenser et tenter de transférer les 200 Cr protégés | Services PNJ autorisés oui ; don, module, achat-revente, transmission à successeur non ; déprotection au début de l’épisode suivant |
| REC-SO-04 | Frapper, absorber protection et déclencher secours à 0 PV | 3 ou 4 PV, une seule protection, fenêtre de 2 s, compte de survie réel 5 min, stabilisation seulement après 60 s continues ; STOP SÉCURITÉ suspend la conséquence mortelle |
| REC-SO-05 | Soins MED-02/MEC-02 et atelier de droïde | Timing N2/N3/N4/N5, 1 PV puis 10 min récupération ; réparation complète du droïde ne restaure ni module endommagé ni protection épuisée |
| REC-SO-06 | ROG-02 au poste organisation : nom faux, cible vide, un objet, plusieurs objets | Faux nom = 10 min de récupération sans PA ni quota cible ; vide = quota et récupération, pas PA ; N3/N4 deux types ; un seul objet transféré |
| REC-SO-07 | ROG-02 avec deux voleurs concurrents et notification | Max 2 tentatives/1 réussite par victime/session ; pas de double transfert ; notification sans auteur à +10 min ; remise physique en attente |
| REC-SO-08 | ROG-03 au QR serrure prison avec gardien | Surveillance directe empêche la sortie ; interruption zéro temps restant ; repéré = 10 min récupération sans PA ; sortie physique sûre ; max 20 min de captivité |
| REC-SO-09 | Sabotage sur installation, module droïde et vaisseau à quai | Niveaux d’accès respectés, 1 PA et kit au test, neutralisation max 15 min ; pas d’avarie durable créée implicitement |
| REC-SO-10 | Dissimulation vs TRA-02, Pistage vs EFF-01 | Une unité/30 min, égalité favorable à la découverte ; traces de jeu ≤ 15 min, comparaison directe des niveaux, journal technique intact |
| REC-SO-11 | Toxicologie QR et droïde | Dose consignée, activation volontaire par la cible ; Malaise 15 min humanoïde, 0 perte PV et non cumul ; droïde immunisé |
| REC-SO-12 | Installer, neutraliser, endommager, retirer module droïde | 2 emplacements, 6 références et prix ; états indépendants, coûts et ressources distincts, pas de copie au retrait |
| REC-SO-13 | Combat : tirs simultanés, deux défenseurs et deux fuyards | D6 et seuils, hits simultanés même à 0 Coque, bouclier puis Coque, un poursuivant principal, égalité poursuivant, deux rounds sans hostilité terminent |
| REC-SO-14 | PIL-03 N1, N3, N4, N5 ; ESC-01 N4 et N5 | Décrochage ≥ 6, Feinte seuil de défense min 6, non-cumul des bonus de fuite, escorte +1 au résultat même au-delà +3, réservations PA remboursées si aucune exécution |
| REC-SO-15 | Rencontre avec interception sans tirs puis tirs entièrement esquivés | Première : aucune révision ; seconde : révision 1 % obligatoire ; Coque/Bouclier/modules traités indépendamment |
| REC-SO-16 | Départ, panne sèche, ravitaillement, détour de convoi, reprise intersession | 5/10/15 min, carburant 1/2/3 × taille à 25 Cr, un débit départ, surcharge/détour payé par appareil, pas de second tirage |
| REC-SO-17 | Événement routier, escorte et embuscades concurrentes | Un tirage par convoi/trajet, deuxième D6 si incident, ciblée prioritaire, une seule interception par tronçon, pas de double menace PNJ |
| REC-SO-18 | Arrimer et transférer 12 unités puis interrompre la dernière tranche | Après 2+3+3 min (dont arrimage), 10 unités transférées, les 2 dernières restent ; aucune prise sans soute receveuse compatible |
| REC-SO-19 | Revendiquer, remorquer et mettre une épave à la casse | Gabarit/attelage, carburant ×2, publicité S+1, caution 5 %, droit sur bâtiment ≠ droit sur fret ; 10 % de lots de pièces, sans doublon |
| REC-SO-20 | Contrôle douanier N1–N5 et falsification INF-03 | 1D6 + contrôle ≥ 7, une inspection par escale, retenue max 15 min ; faux N3/N4/N5 passent sur 4+/3+/2+, pas de saisie automatique |
| REC-SO-21 | Contrat/escorte, litige et annulation | Réserves réelles, 10 min contestation, 20 min médiation, salaire 100/50/0 %, avenants +25 %, provisions carburant distinctes, recours S+1 |
| REC-SO-22 | Assurer mêmes lots deux fois, perdre puis retrouver du fret | Double souscription refusée, prime 2/4/6 %, indemnité 80 % plafonnée à 5 000 Cr, réserve assurantielle financée, récupération déclenche restitution proportionnelle |
| REC-SO-23 | Fermer session avec 0 PV stabilisé, modules défectueux et voyages | PV/Coque/fonds/fret/trajets conservés, effets provisoires expirés, PA au maximum, aucun soin/fuel/reroll automatique ; clôture des délais critiques vérifiée |
| REC-SO-24 | Importer même profil SPACE OUTLAWS V0.7 plusieurs fois | Aucune dotation/compétence/stock/argent supplémentaire ; anciennes sessions intactes ; changement du référentiel uniquement sur version publiée |

Les cas REC-SO sont des **exigences de recette**, pas des tests déclarés exécutés. Aucun succès ne peut être revendiqué sans trace CI/émulateur + tests multi-comptes/terrain pertinents.


---

## 11.1 bis. Six recettes supplémentaires — extension FOR-01 (PNJ)

Ces six cas **s’ajoutent** aux 24 REC-SO initiaux sans les renuméroter. Ils sont des tests à exécuter, pas des fonctionnalités considérées comme réalisées.

| ID | Action / situation | Résultat attendu |
|---|---|---|
| REC-SO-FOR-01 | Joueur tente de créer/acheter/importer classe Force ou FOR-01 ; MJ crée PNJ N1/N4 Jedi/Sith | Accès refusé au joueur sur serveur ; PNJ caché, orientation valide ; 8 classes joueur inchangées ; LAS-01 indépendante |
| REC-SO-FOR-02 | Influence N1 sur garde et droïde, suggestions interdites, égalité des dés | Cible humanoïde admissible seulement ; suggestion ≤30 s ; égalité protège victime ; pas d’accès secret ou transfert imposé |
| REC-SO-FOR-03 | Soigner cible à 0 PV à temps, démarrer trop tard, interrompre à 50/70 s, retenter même cible | Stabilisation seulement à 60 s avant décès, +1 PV à 90 s, convalescence 10 min ; interruption conforme ; quota 1 soin/cible/session ; droïdes non soignés |
| REC-SO-FOR-04 | Projection N3, Protection Jedi N4, Étouffement Sith N4 pendant scène physique | Portées et types de cible ; 3 s / 10 s ; protection instantanée sans jet sur UNE touche ordinaire ; sortie sûre ; interruption concentration Sith |
| REC-SO-FOR-05 | N5 double cible : un succès et un échec ; répétition dans même confrontation | Deux jets indépendants, 1 PA total, 10 min communs, 1 activation/confrontation ; aucun double Soin/Protection/Étouffement |
| REC-SO-FOR-06 | Usurpation droit PNJ/MJ, double clic, coupure réseau, annonce orale avec validation arbitre et STOP SÉCURITÉ | Jet et dépense uniques, droits serveur, audit, statut cohérent ; pas de retouche rétroactive d’une touche ; aucune fuite d’identité secrète ; jamais de contrainte physique réelle |

## 11.2. Essais transversaux supplémentaires [RECETTE]

| ID | Essai transversal | Critère de réussite |
|---|---|---|
| SEC-SO-01 | Badge QR public, QR privé et faux rôle MJ | Aucun accès privé ou changement de privilège par simple scan |
| SEC-SO-02 | Double clic, deux joueurs concurrents et réseau coupé pendant débit | Aucun paiement, butin, PA, stock ou lot dupliqué |
| SEC-SO-03 | Import réitéré, changement de session et session fermée | Données des épisodes anciens intactes, aucun nouveau kit |
| SEC-SO-04 | Deux Rogues visent simultanément la même victime | Quota global, transfert unique, aucune information secrète révélée |
| SEC-SO-05 | Joueurs avec groupes, caisse commune et propriétés de vaisseaux | Être membre ne donne pas pouvoir de dépense ou de transfert |
| SEC-SO-06 | Attaque après deux rounds passifs, après reddition et en poursuite | Fin/repli/consommation corrects, non-révision sans tirs |
| SEC-SO-07 | Caisse PNJ et assureur insuffisamment financés | Refus explicite, pas de soldes négatifs ni monnaie créée |
| SEC-SO-08 | Arrêt sécurité pendant minuteur médical/captivité | Pas de décès indu ; limites réelles et sorties sûres respectées |
| SEC-SO-09 | Plusieurs téléphones Android/iOS et ~60 utilisateurs en test | Droits, QR, ergonomie, temps de réponse mesurés et consignés |
| SEC-SO-10 | Déclenchement de workflows GitHub | Exécution des tests sans job de déploiement ni changement Firebase production |

L’équipe doit consigner les **résultats observés** (version, commit, environnement, test, acteur, date, preuve, verdict, anomalie). Un cas non exécuté porte le statut « NON TESTÉ » et non « VALIDÉ ».

## 11.3. Bloquants avant première session

Lecture de fiche privée non autorisée ; attribution indue de rôle ; création de crédits, objets ou modules ; duplication de butin ou d’indemnité ; conditions de mort et sécurité défaillantes ; ouverture réelle non autorisée ; perte d’intégrité d’un Master ou d’une campagne ; modification rétroactive de transactions ; compte assurantiel négatif ; double voyage ou interception contradictoire ; incapacité de revenir d’une erreur de réseau. **Aucun défaut bloquant connu** n’est acceptable à l’ouverture du GN.

# Annexe A — Référentiel normatif SPACE OUTLAWS V0.7 (A01 à A38)

## A.1. Portée et hiérarchie des règles

Ce chapitre est un **profil de données de scénario**, non une modification universelle de GN Engine. Identifiant proposé : `SPACE_OUTLAWS_V0_7`, **version 0.6, arrêtée le 23 octobre 2026** ; tous les A01 à A38 sont clos, et FOR-01 est une extension PNJ approuvée ultérieurement. Il sert aux nouveaux Masters et aux migrations **explicitement autorisées**. Une modification de paramètre, un épisode ultérieur ou une expérience ne réécrit jamais l'historique des instances, transactions et contrats déjà exécutés.

Ordre de référence : (1) décisions explicites validées A01–A38 et livre **SPACE OUTLAWS V0.7** ; (2) exigences du présent cahier des charges ; (3) contrats techniques actuels du dépôt, après rapprochement. En cas de conflit technique, **signaler et corriger** dans une migration ou une nouvelle version du Master, sans effacer de données. Ne pas reconsidérer un arbitrage validé au motif que le code existant ne le prévoit pas.

Distinction obligatoire : **règle validée** ≠ **donnée de session à préparer** ≠ **fonction déjà développée** ≠ **recette terrain passée**. Les QR de prison, objets et registres, les budgets PNJ, les modèles de documents, les trajets codés, les réels accessoires et la sécurité physique nécessitent une préparation/validation distincte.

## A.2. Personnages, compétences, PA, dotations et relève (A01 à A10)

- Deux natures : humanoïde biologique / droïde. Huit classes ouvertes aux deux natures : **Combattant, Rogue, Traqueur, Médecin, Mécano, Pilote, Courtier, Infiltrateur**. Trois compétences principales initiales à N2 lorsqu'elles évoluent, ou trait fixe déjà acquis : `COM-01/02/03`, `ROG-01/02/03`, `TRA-01/02/03`, `MED-01/02/03`, `MEC-01/02/03`, `PIL-01/02/03`, `COU-01/02/03`, `INF-01/02/03`. `COM-01 Vétéran` (+1 PV, max 4) n'est pas achetable hors Combattant ; `ROG-01 Neutralisation furtive` reste propre au Rogue. Le périmètre et les effets particuliers des compétences figurent dans le livre V0.7.
- Initiation secondaire **gratuite N1** au choix **dans une autre classe** : `COM-03`, `ROG-03`, `TRA-01`, `MED-02`, `MEC-02`, `PIL-01`, `COU-01`, `INF-02`. Elle occupe 1 des **5 places de compétences secondaires** ; les compétences fixes apprises hors classe en occupent également une. L'acquisition ordinaire utilise XP+prérequis sans mentor obligatoire ; mentor RP N3+ (ou PNJ qualifié) peut proposer entraînement de 5 min/0 PA ; rare = déblocage préalable MJ (mission, plan, découverte ou mentor autorisé) puis XP. Une reconversion secondaire entre sessions nécessite l'accord MJ, sans remboursement, et utilise l'unique changement de cette intersession ; jamais de seconde initiation gratuite ni de suppression d'un prérequis restant.
- XP : **3 XP maximum par participant et par session** ; attribués au dernier personnage actif lors de la clôture, sinon réservés sur profil participant. Achat N1 d'une évolutive = 2 XP ; passages vers N2/N3/N4/N5 = 4/6/8/10 XP ; technique fixe hors classe = 4 XP. **Une seule acquisition ou augmentation entre deux sessions**. Le niveau global relève du **participant** : niveau 1 = 5 PA ; **niveau 2 = 8 PA après 4 sessions jouées**, effectif dès la cinquième. Aucun niveau global supérieur ni bonus au combat implicite.
- PA : réserve complète au début de session et à l'échéance commune de **5 heures de jeu** ; pauses générales suspendent cette horloge, reconnexion n'accorde rien. Exception volontaire A09 : **chaque nouveau personnage créé après décès reçoit immédiatement 5 ou 8 PA complets**, sans modifier le prochain cycle global. Les PA sont réservés lors de l'action et dépensés selon la **phase effectivement exécutée** ; abandon ordinaire avant résolution rend la réservation sauf exception définie (sabotage au jet, tentative ROG-02 résolue sans butin, etc.).
- Après mort : personnage successeur distinct, sans héritage automatique d'argent, objets, documents, secrets ni contrats personnels. XP hérités = **plancher(25 % des XP de carrière gagnés par le défunt), maximum 9**, en excluant les XP eux-mêmes hérités et les XP de session non encore attribués. Le niveau global du joueur est conservé. Le MJ valide la nouvelle naissance et enregistre son ordre dans une transaction idempotente.
- Création et remplacements : **200 Cr protégés** et un kit de classe neuf, non pillable/non revendable (consommables de kit utilisables et consommés normalement). Les 200 Cr protégés ne servent durant la première session qu'aux **services et consommables PNJ approuvés, non transférables et non revendables** ; pas de don, achat-revente, module revendable ou transfert au successeur. Solde protégé restant déprotégé à la session suivante si le personnage vit encore ; crédits gagnés par jeu = ordinaires.

| Classe | Kit de départ spécialisé, en plus de 200 Cr protégés, QR individuel, communicateur et arme homologuée appropriée |
|---|---|
| Combattant | Armure légère 1 protection + fournitures de terrain |
| Rogue | Pochette de discrétion (aucune Dissimulation gratuite) |
| Traqueur | Scanner d'enquête (aucun bonus automatique) |
| Médecin | Outil médical + 2 trousses médicales consommables |
| Mécano | Outils mécaniques + 2 kits réparations consommables + 1 lot de pièces d'usage 50 Cr |
| Pilote | Terminal navigation + codes commerciaux publics |
| Courtier | Terminal commercial et contacts initiaux |
| Infiltrateur | Interface fictive + 2 formulaires vierges |

**Sécurité/combat au sol [A01–A07] :** homologation individuelle de tout matériel (gel blaster, arme mousse, sabre apte au contact), paramètres réels seulement après essais. Base 3 PV ou 4 Vétéran ; une **seule protection personnelle** de 1 point maximum, sans cumul ; tir/blessure ordinaire 1 dégât, touches dans fenêtre de **2 secondes comptées comme une touche** ; sabre homologué et ROG-01 contre humanoïde surpris = 0 PV, ignore protection (sabre indépendant de la fenêtre). ROG-01 s'annonce « Égorgement ! » depuis l'arrière à **≤ 1,5 m**, sans contact ni geste vers le cou, seulement si surprise hors combat ; droïdes immunisés ; récupération de 10 min pour **chaque tentative annoncée**, même ratée. Disarm COM-02 : deux parades/contacts offensifs contrôlés sur arme compatible, dix secondes sans attaque ; autre arme blanche peut parer, jamais de saisie ni parade avec blaster rigide. Riposte : deux parades successives contre même adversaire, annonce ≤3 s, un coup contrôlé, victime incapable d'attaquer 3 s mais peut défendre/reculer, une réussite par adversaire et confrontation. Garde du corps : à ≤2 m et vue du protégé désigné à l'avance, annonce « Protection ! » instantanée, un transfert d'attaque éligible par garde et confrontation. Captivité joueur : **20 min réelles maximum** ; aucune contrainte physique.

**Urgence :** 0 PV lance **5 min réelles avant mort ou destruction** ; n'importe quel joueur actif stabilise en **60 s continues**, 0 PA, sans restaurer de PV. Traitement direct MED-02 N2+ (humanoïde) / MEC-02 N2+ (droïde) : à 60 s stabilisé ; durée totale selon N2/N3/N4/N5 = **105/90/75/60 s**, puis **+1 PV** et **10 min convalescence/recalibrage** ; si interruption avant 60 s, recommencer, chronomètre vital non réinitialisé ; après 60 s, sécurisation maintenue. Prestataire PNJ : **100 Cr / 5 min**, 1 PV pour personnage précédemment stabilisé puis 10 min de récupération. Réparation complète de droïde A07 : atelier + MEC-02 N2/MEC-01 N2, 1 PA, composant compatible + 1 lot de pièces 50 Cr ; soin complet des PV et fin recalibrage, **pas** de point de protection ni modules restaurés ; durée sûre **5/4:30/4/3:30 min**, mode accéléré **3/2:45/2:30/2:15**, test `1D6 + niveau MEC-02 + bonus matériel ≥ 6` si accéléré, échec +2 min sans nouveau PA/ressources. STOP SÉCURITÉ suspend les effets temporels dangereux. Aucun coup de grâce ordinaire ; exécution scénarisée seulement sur accord préalable MJ et sans frappe/tir réel.

## A.3. Compétences à durées et interactions particulières (A11 à A13)

| Compétence | N1 | N2 | N3 | N4 | N5 |
|---|---:|---:|---:|---:|---:|
| COM-03 Lecture tactique | 120 s | 105 s | 90 s | 75 s | 60 s |
| PIL-01 Navigation | 120 s | 105 s | 90 s | 75 s | 60 s |
| PIL-02 Préparation de vol | 180 s | 150 s | 120 s | 90 s | 60 s |
| INF-01 Intrusion | 180 s | 165 s | 150 s | 135 s | 120 s |
| INF-02 Déchiffrement | 180 s | 165 s | 150 s | 135 s | 120 s |
| INF-03 Falsification | 300 s | 270 s | 240 s | 210 s | 180 s |
| Entretien de protection | 120 s | 105 s | 90 s | 75 s | 60 s |
| ROG-02 Vol à la tire | 60 s | 45 s | 45 s | 30 s | 30 s |
| ROG-03 Évasion | 60 s | 45 s | 45 s | 30 s | 30 s |

**Coûts :** COM-03, PIL-01/02, INF-01/02/03 et Entretien de protection : 1 PA, récupération de 10 min ; COM-03 donne un renseignement préparé sans D6 ; Entretien nécessite un consommable compatible. ROG-02 et ROG-03 appliquent les exceptions ci-dessous (notamment PA uniquement au résultat effectif).

**ROG-02 [A12] :** uniquement **local organisation** de Western City ; le Rogue utilise le QR d'interaction de la cible et renseigne **son nom ET prénom fictifs exacts**. Pas d'autocomplétion, pas de consultation préalable de l'inventaire, pas de proximité physique requise. Nom faux : **zéro PA, récupération personnelle 10 min, zéro quota victime**. Cible sans objet *volable_a_la_tire* : **zéro PA, récupération 10 min, tentative comptée**. Quotas par victime/session **partagés entre tous Rogues : max 2 tentatives, dont 1 vol réussi**, la première réussite clôt immédiatement la cible. N1–2 un type aléatoire ; N3–4 choix parmi deux **types distincts** aléatoires, si seulement un type il est proposé ; N5 choix de tous les types éligibles. Transfert **une seule unité** atomique et coût de **1 PA si et seulement si transfert effectif**. Les crédits, dotations protégées, caches et objets non marqués volables sont exclus. Notification de perte après **10 minutes**, ou découverte plus tôt par inventaire ; jamais d'identité du voleur. Accessoire physique de jeu indispensable : statut *remise matérielle MJ en attente* avant usage ; objet non sûrement transmissible = non éligible. Tentative annulée avant résolution sans exécution rend réservation, sans quota ; droits et idempotence serveur, pas de deux Rogues volant la même unité.

**ROG-03 [A13] :** QR d'issue scénique, dont **QR sur la serrure de la vraie prison** : aucun déverrouillage réel, ni forçage ni déplacement dangereux. N1–2 issue QR préparée ; N3–4 occasion d'escorte scénarisée ; N5 occasion crédible hors surveillance, validée MJ si sans QR. Gardien exerçant une surveillance directe et effective empêche/rompt la tentative. En cas de découverte : **0 PA, récupération 10 min** ; abandon ordinaire avant résolution : 0 PA, pas de récupération ; succès : 1 PA, récupération 10 min. Durée continue repart de 0 après interruption, sans D6. **20 minutes réelles maximum de captivité**, même pendant le délai de récupération ; 0 PV ne peut pas s'évader.

## A.4. Compétences spéciales, traces, substances et droïdes (A14 à A19)

**Six modules standards de droïde [A14.2]**, maximum **2 emplacements** par droïde, un exemplaire de chaque type, non fournis gratuitement :

| Module | Prix et niveau MEC-03 | Effet |
|---|---|---|
| DR-01 — Blindage intégré | 300 Cr · N1 | Protection 1, sans cumul ; point épuisable |
| DR-02 — Outillage intégré | 200 Cr · N1 | Outil réutilisable compatible, sans compétence/ressources offertes |
| DR-03 — Scanner multispectral | 350 Cr · N2 | +1 à test compatible MEC-01/TRA-01, sans bonus doublé |
| DR-04 — Interface de données | 350 Cr · N2 | +1 à test INF-01 sur terminal fictif compatible |
| DR-05 — Mémoire chiffrée | 300 Cr · N2 | Un document numérique protégé ; accès propriétaire ou INF-02 N2+ |
| DR-06 — Compartiment dissimulé | 400 Cr · N2 | Une unité protégée de ROG-02, découvrable par TRA-02 |

Installation N1 : 5 min/1 PA ; N2 : 10 min/1 PA ; retrait (N1/N2) : 5 min/1 PA ; atelier équipé et mandat propriétaire, sans combat. PNJ installation N1 50 Cr, N2 100 Cr, retrait 50 Cr, **en plus** du module. État distinct : `opérationnel`, `épuisé` (DR-01 seulement), `neutralisé` temporairement, `endommagé` durablement. Une neutralisation cesse à échéance sans réparation ; module durablement endommagé nécessite **MEC-02 N2 + MEC-03 au niveau du module**, 5 min pour N1 ou 10 min N2, 1 PA, ressources **25 % du neuf arrondies aux 25 Cr supérieurs** : 75/50/100/100/75/100 Cr pour DR-01 à DR-06. Prestation PNJ supplémentaire 50/100 Cr N1/N2. Réparation intégrale des PV du droïde n'efface ni panne ni point de protection épuisé. Module retiré = objet transférable avec identifiant unique, reprise PNJ 50 % bon / 20 % endommagé seulement si marché disponible. Contenu d'une mémoire ou d'un compartiment est suivi à part : pas de duplication au démontage.

**Sabotage [A15] :** rare. Cibles admissibles selon N1 installation simple ; N2 infrastructure protégée ; N3 module droïde admissible ; N4 système précis de vaisseau **à quai** ; N5 équipement exceptionnel préparé. Droïde : uniquement hors combat, capturé ou en maintenance scénarisée autorisant cette action. 1 PA, kit consommable, **5 min**, `1D6 + niveau Sabotage + bonus admissible ≥ 6` (exception niveau cible Master annoncée), kit et PA consommés **lors du jet même sur échec**, récupération 10 min ; échec = blocage de 5 min sur cible/type. Succès = neutralisation fonctionnelle **≤ 15 min**, une par cible ; après remise en service protection de 15 min contre nouvelle neutralisation ordinaire. Pas de dommage durable implicite. Levée anticipée pour 1 PA : MEC-02 N2/3 min installation ou module ; MEC-02 N3 + MEC-03 N2/5 min pour système de vaisseau à quai ; cibles N5 selon Master. Aucun sabotage de matériel réel.

**Dissimulation [A16] :** une unité cachée active maximum / personnage, pas de crédits ou biens personnels, 1 PA, durées **120/105/90/75/60 s**, récupération 10 min, validité **30 min de jeu**. Cache exclut fouille ordinaire et ROG-02. TRA-02 ≥ niveau Dissimulation révèle **sans dé** et détruit le statut caché immédiatement ; aucune unité additionnelle pillable. Vente, don, utilisation, consommation, découverte ou expiration lèvent la cache.

**FIL-01 Pistage [A17] :** compétence **ordinaire**, 1 PA, récupération 10 min, **120/105/90/75/60 s**. N1 dernier acteur d'une interaction fictive traçable ; N2 heure/terminaux protégés ; N3 dernier départ d'un vaisseau connu ; N4 filature spatiale clandestine avec pilote/vaisseau/carburant et cible encore en voyage ; N5 tronçon suivant / fenêtre d'arrivée **uniquement si enregistrés**. Test opposé filature `1D6 + FIL-01` vs `1D6 + PIL-01 du pilote cible`, égalité à la cible ; si cible gagne d'au moins 2, alerte sans identité du pisteur. Changement de route = nouveau test ; aucune géolocalisation ni droit automatique de combat.

**EFF-01 Effacement de traces [A18] :** rare, 1 PA, récupération 10 min, **120/105/90/75/60 s** ; seules interactions fictives **≤ 15 min d'âge**. N1 dernière trace personnelle ; N2 terminaux protégés ; N3 trace d'un complice présent/consentant ; N4 signature fictive de départ ; N5 **une seule fausse piste active** (horaire, point, signal) prévue par le Master. Masquage jusqu'à découverte ou fin de session. `FIL-01 ≥ EFF-01` reconstitue sans D6. Audit réel, droits et transactions jamais modifiés.

**TOXI-01 Toxicologie [A19] :** rare ; état `STAT-MALAISE-01` distinct. N1 antidotes ordinaires ; N2 substances courantes/Malaise ; N3 spécialisées ; N4 rares ; N5 expérimentales Master. Fabrication d'**une dose** : recette acquise, laboratoire QR, ingrédients réels, 1 PA, 5 min, 10 min récupération, réussite automatique, identifiant et cycle `fabriquée / placée / consommée / retirée`. Administration **uniquement par activation volontaire du QR par la cible**, sans ajout de substance réelle ; droïdes biologiquement immunisés. Malaise : **15 min**, humanoïde ≥1 PV, ni combat ni compétences actives, **0 perte PV**, aucune accumulation/prolongation. Antidote après identification (notamment MED-01 N3), compétence TOXI-01 et consommable compatible : 1 PA, **120/105/90/75/60 s**, sans récupération entre patients ; aucune guérison de PV.

## A.5. Vaisseaux, combat, PIL-03 et ESC-01 (A20 à A29)

| Modèle | Valeur | Coque | Bouclier | Manœuvrabilité |
|---|---:|---:|---:|---:|
| Chasseur léger | 5 000 Cr | 3 | 1 | +2 |
| Cargo léger | 10 000 Cr | 4 | 2 | +1 |
| Transport renforcé | 20 000 Cr | 6 | 3 | +0 |

| Modèle | Fret | Places dont pilote | Modules | Réservoir |
|---|---:|---:|---:|---:|
| Chasseur léger | 0 | 1 | 1 | 8 |
| Cargo léger | 20 | 6 | 2 | 16 |
| Transport renforcé | 50 | 15 | 3 | 24 |

**Modules standards vaisseau :** `MOD-01 Bouclier +1` (15 % prix vaisseau), `MOD-02 Coque +1` (15 %), `MOD-03 propulsion Manœuvrabilité +1` (25 %, maximum permanent +3), `MOD-04 soute clandestine` (10 %, cargo = 5 unités cachées, transport = 10, aucun fret ajouté), `MOD-05 remorquage` (10 %, cargo/transport), `MOD-06 canon lourd` (20 %, remplace standard, 2 dégâts sur D6≥5). Un emplacement chacun, pas de doublon, calibrés au gabarit et non interchangeables à prix réduit. Installation MOD-01/02/04/05 MEC-03 N2/10 min/1 PA ; MOD-03/06 N3/15 min/1 PA ; retrait standard MEC-03 N2/5 min/1 PA.

**Quatre modules rares :** `R04-01 Brouilleur` N4 +1 à une fuite ou décrochage PIL-03 N1 **une seule fois par voyage**, annoncé avant jet et sans cumul bonus spécial ; `R04-02 Coffre sécurisé` N4 pour cargo/transport, 5 unités déjà dans la soute inaccessibles au transbordement ordinaire, ouverture par droit ou INF-01 N3+ ; `R05-01 Bouclier régénératif` N5 récupère 1 Bouclier à la fin d'un round choisi, une fois/combat, Coque >0 ; `R05-02 Transpondeur fantôme` N5, identité de couverture documentaire séparée, jamais changement d'identifiant permanent. Coûts N4 = **30 %** vaisseau (20 % courant + 10 % rare inclus), fabrication+installation 20 min/1 PA ; N5 **50 %** (30 % courant + 20 % rare inclus), 30 min/1 PA ; démontage N4 10 min / N5 15 min au même niveau, 1 PA. Plans et composants nécessaires ; pas de boutique PNJ ordinaire par défaut.

**Combat spatial virtuel :** tours de **90 secondes** pour ordres, une action principale par navire (`attaquer`, `défendre`, `fuir`, `poursuivre`, `reddition`, `passif`) ; ordre de repli prévu avant clôture en cas de reddition rejetée ou non répondue. Silence ≠ acceptation ; cessez-le-feu total sur consentement unanime ou commandant habilité. Attaques engagées **simultanées**, même si tireur tombe à 0 Coque ; Bouclier absorbe d'abord. Canon standard **D6≥4 =1** ; lourd **D6≥5=2** ; défense ordinaire **D6+Manœuvrabilité≥5** annule **un attaquant désigné**, pas tous les tirs. Poursuite contre fuyard = **D6+Manœuvrabilité opposés**, **égalité favorable au poursuivant**. Chaque round, **un seul poursuivant principal**, décidé avant verrouillage (coalition choisit ; indépendants meilleur bonus, égalité hasard journalisé), autres ordres poursuite passifs. Fuite résolue **après** tirs et dégâts ; à 0 Coque, sortie inexécutable et réservations de PA/usage spécial remboursées. **Deux rounds sans acte hostile effectivement exécuté** terminent sans vainqueur : défense, fuite, négociation, ordre invalide non hostiles ; tir tenté même manqué et poursuite valide hostiles. 0 Coque immobilise, ne détruit pas automatiquement et ne tue pas l'équipage.

**PIL-03** : techniques cumulatives par niveau, **1 PA + une utilisation spéciale unique par voyage**, dépensés seulement si une sous-action/test prévu est réellement exécuté. N1 **décrochage initial avant combat** `D6 + Manœuvrabilité effective ≥ 6`, succès = aucune interception, aucun combat, aucune révision ; N2 esquive multiple d'au plus deux tirs désignés avec **D6+Manœuvrabilité≥6** ; N3 Feinte = **+1 au tir**, seuil MINIMAL de défense adverse 6 (défense ordinaire 5→6, une défense spéciale déjà 6 reste 6, jamais 7), pas de dégâts augmentés ; N4 fuite dangereuse **+2** au test opposé pour **+1 unité de carburant** et 1 dégât Bouclier/Coque sur échec, sans empiler un autre bonus spécial de fuite ; N5 tir et défense indépendante contre un attaquant désigné, seuil 6, une seule action et usage. Si le tir N5 a réellement lieu, PA consommé même si volet défense est devenu inutile. Une manoeuvre inexécutable avant toute phase restitue PA/usage sans réaffecter une nouvelle action.

**ESC-01**, rare et distinct de la simple prestation escorte : N1 interposition pendant poursuite, test du navire escorteur `D6 + Manœuvrabilité effective` vs jet de poursuivant **réutilisé** (égalité = échec) ; N2 observation tactique sans lecture des ordres privés ; N3 si interposition échoue, +1 fuite du cargo (pas cumul avec +2 PIL-03 N4) ; N4 interposition **avant combat** après échec du décrochage initial du cargo ; N5 +1 sur propre interposition, pouvant porter le bonus effectif à +4 (plafond +3 uniquement sur Manœuvrabilité permanente). Si interposition précombat N4 sauve le cargo, escorteur hérite de la poursuite et **ne peut pas demander son propre second décrochage PIL-03 N1**. 1 PA/1 usage spécial par rencontre si tentative effectivement testée, en remplacement de l'action principale.

## A.6. Voyage, événements, réparations et remorquage (A22, A24–A29)

- Liaison **courte/moyenne/longue : 5 / 10 / 15 min**, quel que soit le gabarit. Carburant = **25 Cr/unité**, consommation facteur distance 1/2/3 × facteur gabarit 1/2/3 ; chasseur 1/2/3, cargo 2/4/6, transport 3/6/9. **Un seul débit au départ.** Arriver avec réservoir 0 n'est pas une panne rétroactive ; événement/détour demandant un supplément indisponible = voyage suspendu sans propriété perdue, reprise après apport de carburant au temps restant. Transfert carburant entre vaisseaux sur place 2 min/0 PA et dans les plafonds ; dépannage PNJ **100 Cr +25 Cr/unité** ; ravitaillement port **2 min/0 PA** dans stocks PNJ.
- Détour PIL-01 avant interception : **1 PA, un essai/trajet, D6+PIL-01 ≥7** ; surcharge consommée même sur échec **1/2/3 unités par vaisseau** ; différence de distance payée sans remboursement de carburant initial ; sur succès conserver temps déjà parcouru et au moins 2 min restantes. En convoi, **un jet de meneur**, surcharges propres à chaque navire ; appareil incapable de payer ne suit pas gratuitement.
- Danger de route : sécurisée **1/6**, dangereuse **2/6**, hostile **3/6** de déclencher un événement. **Un seul tirage par trajet et par convoi**, puis second D6 de table contextualisée V0.7 (réaliser le barème de la V0.7 en Master, **ne pas inventer**). Une surcharge ou neutralisation vise un appareil tiré au sort ; une rencontre/retard peut viser le convoi. Un événement pirate PNJ crée combat seulement si rencontre **préparée, activée et financée**. Interception joueur : une seule par convoi/tronçon, **embuscade ciblée prioritaire**, égalité hasard serveur journalisé, pas d'empilement PNJ. Un détour ne reroll pas l'événement ; les minutes de voyage sont suspendues pendant la résolution d'une rencontre.
**Table D6 d’événement lorsque le premier tirage a effectivement déclenché un événement** (affectation au voyage/convoi, une seule résolution) :

| D6 | Route sécurisée | Route dangereuse | Route hostile |
|---:|---|---|---|
| 1 | Rencontre commerciale | Renseignement commercial | Balise abandonnée |
| 2 | Patrouille officielle | Contrôle documentaire | Patrouille suspecte |
| 3 | Appel de détresse | Appel de détresse | Détresse potentiellement piégée |
| 4 | Retard +3 min | Retard +5 min | Retard +5 min |
| 5 | +1 carburant à payer, un appareil | Module neutralisé 15 min | Module neutralisé 15 min |
| 6 | Alerte pirate, aucune interception automatique | Menace pirate PNJ préparée | Menace pirate PNJ préparée |

Si aucun module admissible n’est présent, l’événement de neutralisation se remplace par un retard de cinq minutes. Sans rencontre pirate PNJ préparée, aucune bataille n’est déclenchée automatiquement.

- **Révision** seulement si **échange de tirs effectivement exécuté** (même manqué ou esquivé) ou dommage matériel spécial marqué déclenchant. Coût **1 % du prix vaisseau** et opération MEC-02 N2/5 min/1 PA. Aucune révision automatique pour course-poursuite seule, reddition avant tir ou voyage calme. Recharge Bouclier **0,5 % par point** (MEC-02 N2, 2 min/point, 1 PA/intervention) ; Coque **5 % par point** (MEC-02 N2, 5 min/point, 1 PA/intervention) ; module endommagé **25 % de sa valeur neuve**. Standard MEC-02 N2 + MEC-03 requis, 5 min/1 PA ; N4 rare 10 min/1 PA MEC-03 N4 ; N5 prototype 15 min/1 PA MEC-03 N5. Prestation PNJ **0,5 % prix vaisseau par intervention** en plus des pièces, avec budget/stock réel. Un premier point réparé débite PA ; points suivants conservés/annulés selon progression en cas d'interruption. Une remise en navigation est permise dès **Coque ≥ 1**, pilote, carburant et révision obligatoire achevée ; Bouclier non obligatoirement rechargé.
- **Remorquage** : cargo/transport avec MOD-05, gabarit remorqueur ≥ épave, **une épave** ; attelage MEC-02 N2/**5 min/1 PA**, carburant trajet **×2**, Manœuvrabilité **–1 minimum 0**. Largage gratuit avant résolution d'un round, bonus de manœuvre immédiatement restauré, pas de raccrochage même combat. Service PNJ **5 % valeur épave** carburant compris, non confondu avec prime de sauvetage.

## A.7. Abordage, épaves, marché, douanes, identité (A30–A34)

**Abordage [A30] :** manifeste d'équipage déclaré au départ, pilote habilité, places maximum 1/6/15 pilote compris ; une personne ne voyage pas simultanément ailleurs. Arrimage initial **2 minutes** ; scène physique sûre/MJ ou reddition fictive. Le bâtiment capturé n'est pas automatiquement transféré en propriété. **Transbordement : 5 unités de fret par tranche de 3 minutes**, réservées puis transférées atomiquement **seulement à achèvement**, une opération par soute source, volume réel libre et **cargo receveur** présent ; chasseur (fret 0) ne vole pas de cargaison commerciale. Soute clandestine MOD-04 non révélée par capture ni contrôle ordinaire ; coffre sécurisé R04-02 à autorisation séparée.

**Épaves [A31] :** déclaration gratuite puis publicité pendant **une session complète suivant la session de déclaration** ; déclaration S ⇒ appropriation finale **pas avant fin S+1**, décision MJ, contestation suspend l'attribution. Revendication d'appropriation d'épave au propriétaire non établi : **caution remboursable 5 %** valeur référence, conservée en réserve ; la simple absence du propriétaire n'éteint aucun droit. Propriétaire reconnu : dépenses nécessaires justificatives plafonnées ordinairement à **10 %** valeur, sans débit forcé. Primes distinctes : sauvetage commandé **5 %**, récupération spontanée reconnue et **financée** **10 %**. Fret et biens de tiers sont distincts du titre sur le vaisseau. Litiges tardifs : arbitrage MJ, pas de révocation automatique.

**Casse [A32] :** lots de pièces d'usage **50 Cr**, valeur de reprise ferrailleur PNJ **25 Cr** (barème spécial) et **1 unité de fret par lot**. Casse totale = **10 % valeur vaisseau**, convertis en lots 50 Cr, arrondi inférieur : **10/20/40 lots** pour chasseur/cargo/transport ; chantier habilité, MEC-02 N2, 1 PA et **10/15/20 min**, destruction unique après validation MJ. Prélèvement partiel plafonné à **25 % du rendement** : 2/5/10 lots, **5 min/1 PA**, et transforme définitivement le vaisseau en `démantèlement engagé`, impropre à naviguer. Lots extraits déduits de rendement final, aucun second paiement pour mêmes modules ; modules à conserver retirés **avant** casse, autres détruits. Vaisseau neuf 100 %, occasion PNJ 70 %, reprise PNJ **50 % moins réparations**, joueurs prix négocié.

**Marché [A24] :** prix de référence par lot (Cr) : eau purifiée **40**, rations **60**, minerai brut **100**, alliages **160**, pièces détachées **50**, composants électroniques **200**, cellules énergétiques **140**, pièces de droïdes **200**, fournitures bacta réglementées **320**, armement militaire réglementé **450**, épices prohibées **500**, technologies interdites **700**. Multiplicateurs locaux **85/100/115/130 %** ; achat PNJ de marchandises ordinaires auprès des joueurs **85 % du prix local**, hors régimes spéciaux. Arrondir **au crédit le plus proche, 0,5 vers le haut, sur le total de chaque poste**, pas sur chaque unité.

**Douanes [A33] :** fonction d'agent habilité par organisation **N1–N5 indépendante des classes/XP**, contrôle ordinaire documentaire **2 min/0 PA**, inspection approfondie **2 min/1 PA joueur**, **D6 + niveau inspection ≥7** ; une tentative par vaisseau et escale, tous agents confondus sauf nouvel indice/MJ. Soute clandestine résiste au simple contrôle ; découverte d'une soute ≠ ouverture du coffre sécurisé. Transit 0 %, importation libre **5 %**, réglementée **10 %**, marchandises interdites hors dédouanement ordinaire ; licence commerciale permanente **100 Cr**, permis réglementé **2 % du fret, minimum 50 Cr** + taxation normale, autorisation exceptionnelle MJ. Quittance unique par lot/importation. Erreur mineure avertissement ; libre non déclarée droits dus + amende **10 % valeur référence non déclarée** ; réglementée sans permis retenue/régularisation ; interdite saisie scénarisée ; faux document enquête. Retenue provisoire **max 15 min réelles**, puis libération ou saisie formelle et libération du joueur ; jamais retrait arbitraire automatique.

**Identités falsifiées [A34] :** changement d'identité d'un vaisseau capturé = transpondeur technique **MEC-02 N3, 5 min, 1 PA, 10 %** prix référence + faux administratifs **INF-03 N3, 5 min, 1 PA, 10 %** ; chaque prestation PNJ externalisée +5 % prix navire ; **validation MJ** pour changement de propriété, identité technique originelle/historique intacts. Contrôle de papier seulement lors de contrôle autorisé : **D6 + qualité des faux ≥7** ; qualité INF-03 N3/N4/N5 = 3/4/5 (réussite sur 4+/3+/2+), PNJ ordinaire = 3. Un échec fournit anomalie documentaire, jamais propriétaire original ni nom faussaire automatiquement, pas de saisie implicite. Un second jet sur mêmes pièces pendant un passage exige élément nouveau/MJ. Transpondeur fantôme suit les mêmes contrôles pour son identité secondaire.

## A.8. Contrats, escorte, assurances et persistance (A35–A38)

**Contrats [A35–A36] :** fret ordinaire **10 % valeur/min 100 Cr**, fret à risque **15 %/min 100 Cr** ; escorte sur route sécurisée/dangereuse **5 % du fret / vaisseau, min 100 Cr**, hostile **7,5 %, min 150 Cr** (montants négociables). Salaire escorte : mission réussie, même si escorteur neutralisé en sauvant cargo **100 %** ; défense réelle, cargaison non livrée **50 %** ; trahison/abandon fautif **0 %**. Avenant de détour client accepté : **+25 % du salaire initial par tronçon supplémentaire**, max +50 % sans MJ ; départ anticipé après refus de détour, séparation sûre et 50 % salaire initial. **Carburant aller-retour provisionné séparément** par le client, 25 Cr/unité au réel, reliquat financier reversé ; frais/risques supplémentaires selon contrat. Obligation sans sacrifice forcé ; responsabilité ordinaire limitée au salaire sans garantie spéciale.

À signature, bloquer les fonds **existants** dans réserve/escrow ; ne pas verser avant fait générateur. Livraison confirmée par QR destinataire ou MJ. Délai contestation après achèvement **10 min** ; payer seulement part non contestée. Médiation initiale **20 min**, gel litigieux possible jusqu'à fin session suivante sur enquête. Retard fautif : **0/10/25 % du salaire**, jamais valeur fret, seuils intra-session ≤10 / >10 à 30 / >30 min, ou intersession zéro/une/deux sessions et plus ; **pas de cumul des deux grilles**. Force majeure : après départ et impossibilité définitive sans faute, **50 %** sous réserve garde/restitution ; avant départ salaire 0, remboursement frais reconnus possible. Client annule avant départ : salaire 0, frais nécessaires jusqu'à 10 % salaire ; après départ 50 %. Recours après paiement jusqu'à **fin de session complète suivante** pour pièce nouvelle, erreur matérielle ou fraude ; si argent déjà versé, restitution ou créance, jamais débit fictif négatif.

**Assurance [A37] :** prime sur valeur de fret assuré **2 % sécurisée / 4 % dangereuse / 6 % hostile**, pertes éligibles indemnisées **80 %**, **5 000 Cr max cumulés par police**, un **contrat actif par lot et voyage**. Assureur PNJ dispose d'une **caisse financée** et réserve dès souscription sa responsabilité maximale ; refuser la police si réserve indisponible. Valeur assurée par lot ≤ valeur de marché reconnue avant départ ; exclusions : retards seuls, dommages vaisseau, fraude de l'assuré, ventes volontaires, saisie légitime, marchandises interdites non déclarées. Trahison du transporteur/escorteur ne prive pas un assuré innocent. Recouvrement de fret : le propriétaire garde les biens récupérés mais **rend proportionnellement l'indemnité déjà versée**, avec verrou des lots jusqu'à régularisation. Aucune indemnisation fictivement créée si les fonds manquent.

**Persistance [A38] :** conserver entre épisodes : personnage/XP/niveau global, crédits ordinaires et dettes, biens/propriétaires, PV manquants, protection épuisée, modules endommagés, Coque/Boucliers/carburant, contrats/fonds réservés, amendes/litiges, primes/assurances, cargaisons en transit, droits et événements déjà tirés. **Aucun** soin, recharge carburant, Bouclier ou création de stock gratuite. Délais personnels de 10 min, malaise, caches et neutralisations temporaires expirent ; convalescence se termine sans restauration de PV. PA reviennent au maximum en début de session puis chaque 5 h de jeu. Un personnage stabilisé à 0 PV reste à 0 jusqu'à un vrai soin, **mais le délai vital de 5 minutes doit avoir été résolu avant clôture**. Captivité max 20 min ne traverse jamais artificiellement une session. Voyage inachevé suspend temps restant, carburant déjà consommé, manifestes, événement fixé et protection interception ; reprise sans nouveau paiement ou tirage. Une décision MJ post-clôture est auditée ; anciens contrats gardent leurs tarifs même si marché de nouvelle session change. Successeur ne récupère ni biens ni dettes automatiquement, les organismes et successions légitimes conservent leurs droits.

## A.9. Matrice de clôture des arbitrages

| Groupe | Décisions closes | Modules techniques impactés |
|---|---|---|
| A01–A07 | Sécurité, combat au sol, protection, secours, réparation de droïdes | Personnage, action terrain, statut, équipements, horloge critique |
| A08–A10 | Initiation, apprentissage, XP de relève, PA successeur, kits et crédits protégés | Personnage, progression, portefeuilles, boutique, naissance |
| A11–A13 | Durées, Vol à la tire local organisation, quotas/notifications, Évasion/serrure QR | Compétences, QR, régie, inventaire, notifications |
| A14–A19 | Modules droïdes, Sabotage, Dissimulation, Pistage, Effacement, Toxicologie | Compétences, objets, média, journal ludique, statut |
| A20–A23 | Décrochage, poursuivant principal, fin de combat, PA/ordres, Feinte et ESC-01 | Spatioport, résolution combat, conditions, transactions |
| A24–A29 | Barèmes vaisseaux/commerce, modules rares, entretien, remorquage, routes, événements | Spatioport, navigation, magasins, stocks, journaux |
| A30–A34 | Abordage, épaves, casse, douanes, identité falsifiée | Spatioport, économie, droits MJ, transactions |
| A35–A38 | Escortes, contrats/recours, assurance financée, persistance | Missions, comptabilité, voyages, campagne |

## A.10. Configurations terrain et contenu de Master qui restent à préparer

Ne pas inventer les **paramètres de sécurité physique** : homologation individuelle des gel blasters, lames souples, sabres de contact, distances, lunettes, protections réelles, zones de tir, estocs et STOP SÉCURITÉ. Vérifier le QR de la serrure de prison et son **issue réelle sûre**, sans mécanisme d'ouverture automatique. Publier explicitement les **codes de navigation et routes**, les postes douaniers et niveaux de mandats, les indices et infos FIL-01/TRA-02, les cibles de sabotage, les recettes fictives Toxicologie, les caractéristiques d'équipements, les fournitures de réparation, les PNJ et leurs **caisses/stock**, les annonces, les attestations, les rencontres pirates et les fonds d'assurance. Paramètres de Master absents ⇒ fonctions refusées ou non activées, jamais effets inventés silencieusement.

---

## A.11. Extension validée FOR-01 — classe exclusivement PNJ (postérieure aux A01–A38)

Ce bloc ne modifie ni ne rouvre A01–A38. Une neuvième **classe technique réservée aux PNJ**, `Sensitif de la Force`, propose deux orientations Jedi et Sith ; aucune création, apprentissage, initiation ou achat joueur n’est autorisé. Un PNJ formé peut recevoir LAS-01 automatiquement, mais LAS-01 et FOR-01 restent indépendantes. Aucun avantage de PV/PA/dégâts à la Force ; mêmes risques de mort et règles de sécurité que les autres personnages.

**FOR-01 N1→N5 :** Influence (humanoïde, 3 m, suggestion 30 s) ; Soin (humanoïde, 90 s, sécurisation après 60 s, +1 PV, convalescence 10 min, une fois par cible/session) ; Projection (humanoïde/droïde, 5 m, 3 s sans attaque) ; N4 Jedi Protection (une touche ordinaire, soi ou allié à 2 m, pas de jet, pas rétroactif) OU N4 Sith Étouffement (humanoïde, 5 m, 10 s sans attaque/compétence, 0 PV, fin si concentration/vu interrompue) ; N5 Influence ou Projection à deux cibles, tests séparés.

**Résolution :** pour Influence/Projection/Étouffement, `1D6 + FOR-01 du PNJ > 1D6 + max(2, FOR-01 de la cible s’il est supérieur à 2)` ; égalité défavorable au PNJ. Soin et Protection Jedi automatiques sous conditions. **1 PA** par exécution (y compris échec), **10 min** de récupération commune à tous les pouvoirs, **une activation FOR-01 par confrontation** ; absence de cible ou impossibilité avant exécution rembourse le PA réservé. N5 double cible = une seule activation/PA.

**Interactions :** choix dans terminal PNJ et QR public ou désignation de cible par MJ, test serveur et états temporaires expirables, annonces vocales ; arbitrage de scène physique sans téléphone obligatoire ; audit sécurisé, aucune divulgation d’identité PNJ secrète. Aucun pouvoir n’altère droits Firebase, comptes, stocks ou propriétaires ; aucune simulation d’étouffement réel, chute forcée ou geste physique dangereux ; STOP SÉCURITÉ prioritaire.

**Versionnement :** nouvelle version de profil `SPACE_OUTLAWS_V0_7` ; aucun historique V0.6 ne doit être réécrit, et aucun Master actif ne reçoit la classe PNJ automatiquement sans migration explicitement validée. Nom fictionnel d’affichage : **Breach Port** (ancien intitulé Port-Brèche), sans changement silencieux des IDs/QR ou archives.

# Annexe B — Migration documentaire V2.1 → V3.1

| Prescription ancienne | Nouveau traitement | Motif |
|---|---|---|
| GN Engine « moteur générique », nouveaux univers immédiatement | **Priorité exclusive SPACE OUTLAWS** ; socle réutilisable conservé | Décision du propriétaire |
| Six ateliers universels et six Masters obligatoires | **Un Master SPACE OUTLAWS avec six rubriques** ; imports existants maintenus | Réduire complexité et éviter six contrats artificiels |
| Éditeur libre de toute formule/mécanique | Paramètres de contenu et profil V0.7 **stables** ; nouvelle version nécessaire pour varier une règle | A01–A38 déjà arbitrés |
| Interface multi-thèmes pour univers hypothétiques | Parcours et habillage SPACE OUTLAWS ; ne pas supprimer code existant utile | Livraison pilotable et jouable |
| Spatioport « niveau de protection acheté » générique | Escortes contractées + assurances de cargaison financées, différentes des Boucliers | A35–A37 |
| Révision du vaisseau « après tout combat » | **Seulement tirs effectivement échangés ou dommage spécial déclenchant** | A22/A26 |
| Interception uniquement sur renseignement ciblé | Possibilité d’embuscade opportuniste sur route connue, ciblée prioritaire | A29 |
| ROG-02 exige rapprochement physique de la victime | **Local organisation, QR + nom/prénom du personnage** | A12 |
| Projets nouveaux univers / généricité comme blocants L1 | **Suspendus** ; anciens travaux utiles repris | Éviter de recommencer Astra |
| Ancien découpage L0–L6 | **Sous-lots SO-00 à SO-06**, raccordés aux branches/lots réellement avancés | Dépendances pratiques |
| Documentation V2.1 + V0.7 séparée | V3.1 fournit le cap et le référentiel canonique en annexe A | Réduire les ambiguïtés |

# Annexe C — Références, traçabilité et statut

**[R1]** *SPACE OUTLAWS — Livre des règles V0.7*, 23 octobre 2026, 26 chapitres et quatre annexes ; arbitrages A01–A38 clôturés, extension PNJ FOR-01 validée. **Autorité canonique du gameplay.**  
**[R2]** *SPACE OUTLAWS V0.6 — Rapport de cohérence*, 23 octobre 2026 : vérifications documentaires et recette à réaliser ; ne prouve ni implémentation ni homologation.  
**[R3]** *GN_Engine_Cahier_des_charges_Work_Astra_V2_1_SPACE_OUTLAWS.md*, 23 octobre 2026 : exigences techniques antérieures, 24 recettes et annexe de règles reprises dans la V3.1.  
**[R4]** Dépôt `gkerckhofs-a11y/gn-engine`, README, guides Masters, campagnes, logistique, actions, média, scripts de tests. **État actuel à contrôler sur la branche lors de SO-00**.  
**[R5]** Décision utilisateur du 23 octobre 2026 : consacrer la version en développement à SPACE OUTLAWS, conserver le socle existant et différer le créateur universel.  
**[R6]** Décision explicite utilisateur, 23 octobre 2026 : une classe PNJ Sensitif de la Force, orientations Jedi/Sith, FOR-01 N1 à N5, test opposé, 1 PA, récupération commune de 10 minutes et interactions GN Engine.  
**[R7]** Convention de nommage validée : la ville est désormais **Breach Port**, sans obligation de renommer les identifiants techniques historiques.

**Limites de ce livrable :** document de cadrage et de recette ; il **ne prétend pas** avoir modifié le code, vérifié HEAD aujourd’hui, exécuté la CI, appliqué les règles sur Firebase ni homologué des armes ou lieux. L’approbation du présent cahier autorise un travail documentaire/de développement sur branche, **pas une mise en production**.

