# GN Engine

Moteur de jeu de rôle grandeur nature, indépendant de Murder Engine.

**Version 0.20.0 publiée : export et import des scénarios avec images, en complément de la médiathèque privée. Le stockage privé doit être activé pour transférer les images.**

Application : **https://gn-engine.web.app/**. Le compte organisateur configuré est `gkerckhofs@gmail.com`. La recette complète avec plusieurs comptes joueurs reste à faire.

## Reprise sur la note Port-Brèche V0.3 — 0.21 validée, publication en cours

Le scénario et la régie de session proposent maintenant les points d’action : plafonds par niveau global, renouvellement toutes les cinq heures de jeu, pauses, corrections MJ et modification de période avec aperçu. Le joueur voit sa réserve ; les soins existants la consomment dans la même transaction que leurs effets. La récupération peut porter sur le soignant, sur le patient commun à tous les soignants, ou être absente en clinique.

Le module reste désactivé tant que l’organisateur ne l’active pas. Les soins de cette étape restent instantanés. La campagne persistante, les masters XLSX et les actions chronométrées avec D6 restent à développer. [Suivi des 19 exigences de la note](docs/NOTE-V03-SUIVI.md) · [validation de ce lot](docs/VALIDATION-0.21.md).

## Export et import des scénarios 0.20

Depuis l’atelier, **Exporter le scénario** prépare un fichier `.gnscenario.zip` pour l’état courant ou une version figée. Depuis le tableau de bord propriétaire, **Importer un scénario** permet de vérifier ce fichier, puis de créer un nouveau scénario avec ses textes privés, droits de fiction, dotations et images. Les imports interrompus peuvent être repris avec le même fichier.

Cette extension est publiée et vérifiée, avec 750 tests réussis. [Mode opératoire et format](docs/SCENARIO-ARCHIVES.md) · [preuves et limites 0.20](docs/VALIDATION-0.20.md). Le stockage privé doit être activé pour transférer les images. L’export des sessions et de l’ensemble des historiques reste à développer.

## Médiathèque 0.19

Ouvrez « Médiathèque » depuis le tableau de bord, un scénario ou une session. Importez vos images, classez-les puis choisissez-les dans les éditeurs. Les attributions en série présentent chaque cible avant confirmation. Une même image peut illustrer plusieurs contenus ; les briefings privés gardent leurs droits.

Les images inutilisées peuvent passer en corbeille et être restaurées. Les images présentes dans des versions ou historiques sont protégées ; une purge manuelle devient possible après 30 jours pour les images sans référence. Les sessions, lots et contrats ne changent pas silencieusement de visuel.

**Activation du stockage :** le propriétaire doit exécuter [le script préparé](scripts/activate-media-storage.sh) dans Google Cloud Shell pour le bucket privé dédié. L’accès initial de déploiement ne comprend pas ce nouveau stockage. La galerie indique son état d’activation. [Parcours, limites et validation 0.19](docs/VALIDATION-0.19.md).

Télécharger `activate-media-storage.sh`, importer ce fichier dans Cloud Shell avec le compte propriétaire du projet, puis lancer `bash activate-media-storage.sh`. Une fois le message « Stockage privé activé » affiché, actualiser GN Engine et ouvrir la médiathèque. Le script ne demande aucune clé à transmettre dans la conversation.

Les exports/imports de scénarios avec images sont ajoutés en 0.20 ; la recette mobile réelle reste à réaliser.

## Premier parcours

1. Connexion Google ; propriétaire, MJ et accueil selon les délégations de chaque session.
2. Scénario et personnages : identité publique, histoire, secrets, costume et notes MJ séparées.
3. Version figée puis copie indépendante en session, avec capacité, informations pratiques, questions et notice sur les données.
4. Inscription par lien/QR public. Une seule demande prend la dernière place ; les suivantes rejoignent la liste d’attente.
5. Attribution manuelle et invitation personnelle à usage unique, liée au compte Google de l’inscription.
6. Accès à la fiche publiée après activation et ouverture du briefing ; confirmation de lecture.
7. Réattribution ou révocation : nouvelles lectures privées refusées. Après révocation, nouvelle authentification obligatoire.

L’accueil et le rythme de jeu sont indépendants. Le MJ peut éditer les fiches de session sans modifier le modèle et prévisualiser la projection du joueur. Aucune invitation n’est envoyée automatiquement par courriel.

## Équipe et fiches narratives

Dans une session, le propriétaire peut déléguer un accès **Accueil** ou **MJ** à une adresse Google. Accueil gère les participants sans recevoir leurs secrets de personnage ; MJ dispose aussi des fiches complètes et du pilotage du jeu. La délégation ne s’étend ni aux autres sessions ni au scénario.

Les fiches proposent des relations orientées et des objectifs narratifs, publiables séparément. L’historique conserve les versions destinées au joueur. Une modification de session demande un motif et une nouvelle confirmation de lecture. Aucun calcul de mission ni récompense automatique à ce stade.

## Groupes et partage

Le scénario et la session disposent d'un éditeur de groupes publics ou secrets. Chaque personnage peut avoir plusieurs appartenances, avec révélation et permissions séparées. Le rôle Accueil ne reçoit aucun contenu de groupe. Seules les affiliations explicitement publiques apparaissent sur les badges.

Un membre peut être autorisé à lire le briefing, consulter les membres révélés, recevoir des informations et/ou en publier pendant le jeu. Un nouveau membre ne récupère pas automatiquement les anciennes publications du fil de groupe. La désactivation des espaces ferme les lectures et publications joueurs sans effacer les données. [Parcours et limites de la version 0.4](docs/VALIDATION-0.4.md).

## Connaissances et indices

Le MJ crée des textes, choisit leurs destinataires de départ et configure une découverte QR éventuelle. Vérité MJ et présentation joueur restent séparées. Chaque personnage conserve la version reçue ; une copie explicite passe par le badge public du destinataire, sans annuaire privé. Le MJ peut attribuer ou retirer un accès avec un motif. L'espace **Mes informations** propose filtres et confirmation de lecture. [Parcours, garanties et limites 0.5](docs/VALIDATION-0.5.md).

## Carnet personnel

Les notes appartiennent au compte participant dans sa session. Un changement de personnage ne les transmet pas au nouveau joueur ; les MJ n’y accèdent pas dans l’application. Le joueur peut classer/restaurer ses notes et confirmer une copie vers un badge précis. Cette copie est consultable par les MJ, avec le droit de retransmission explicitement choisi ; le reste du carnet demeure privé. [Parcours et limites 0.6](docs/VALIDATION-0.6.md).

## Classes et compétences

Préparez des compétences passives ou des soins et assemblez-les en classes. Sur chaque personnage, choisissez une classe et des exceptions individuelles, puis confirmez le profil affiché avant/après. Les copies attribuées ne changent pas lorsque le catalogue est modifié. Une expertise publiée peut conditionner une découverte QR avec un niveau minimum ; retirer le savoir n'efface pas un texte déjà acquis. Les soins actifs sont ajoutés en 0.8 ; les autres actions et coûts restent à développer. [Parcours et limites 0.7](docs/VALIDATION-0.7.md).

## PV, dégâts et soins

Le MJ active le suivi des PV et choisit les valeurs initiales, les actions permises hors combat et la règle de retour en jeu. Le joueur déclare ses dégâts après l’affrontement, puis confirme le résultat. Les compétences de soin sur soi ou sur un autre badge ont un montant fixe, des usages facultatifs par session et un délai suivant le temps de jeu. Les effets et usages sont appliqués ensemble une seule fois. Une correction MJ conserve le reste du personnage. Les consommables médicaux sont intégrés en 0.9 ; les effets différés restent à développer. [Parcours et limites 0.8](docs/VALIDATION-0.8.md).

## Objets et sac

Le catalogue distingue les exemplaires individuels des lots empilables. Préparez le matériel de chaque personnage dans le scénario, vérifiez l’avant/après, puis figez une version : chaque session recevra ses lots indépendants. En session, le MJ peut attribuer un nouveau lot ou corriger un stock avec motif ; les modèles et lots existants restent indépendants.

Le joueur consulte **Mon sac**, avec recherche, catégories et disponibilité. Un soin peut exiger un consommable d’une version précise : le soignant choisit un lot compatible, lit la quantité retirée et le stock restant, puis confirme. Stock, PV, usage et historique sont modifiés ensemble une seule fois. [Parcours et limites 0.9](docs/VALIDATION-0.9.md).

## Remises entre joueurs

Depuis **Mon sac**, choisissez un lot, une quantité et le lien du badge public du destinataire. Vérifiez les identités et les quantités, puis envoyez une proposition gratuite. Le destinataire consulte **Mes remises** et accepte après avoir confirmé la remise matérielle prévue par les règles. Il devient propriétaire et détenteur des objets dans son sac.

Une remise complète déplace le même lot ; une remise partielle crée un lot distinct lié à sa provenance. Rien n’est réservé ou retiré lors de la proposition. Un changement de stock ou d’accès la rend périmée, sans coût. Refus, annulation, répétitions techniques et opérations concurrentes sont contrôlés. Les remises sont disponibles pendant le jeu ; le MJ peut autoriser explicitement les deux parties à agir hors combat. [Parcours et limites 0.10](docs/VALIDATION-0.10.md).

## Crédits et paiements

Configurez le nom et l’unité entière de la monnaie, puis les crédits de départ de chaque personnage avant de figer le scénario. Chaque session reçoit des portefeuilles indépendants. Pour une session existante sans monnaie, l’activation ouvre les comptes à zéro. Réactiver conserve les soldes.

Dans **Mon portefeuille**, le joueur consulte son solde total, réservé et disponible, puis prépare un paiement vers le badge public d’un autre personnage. Le récapitulatif indique les identités, le montant, le motif et son solde après paiement. La confirmation débite et crédite ensemble, une seule fois. Le MJ peut ajouter ou retirer des crédits avec un libellé joueur et un motif privé, après comparaison avant/après. Les écritures d’origine sont conservées. [Parcours et limites 0.11](docs/VALIDATION-0.11.md).

Les paiements simples ne transfèrent pas d’objet. Les caisses collectives prolongent ce parcours en 0.12 et les ventes privées en 0.13 ; les contrats sont disponibles depuis la 0.16.

## Caisses collectives

Préparez la caisse d’un groupe dans le scénario avec son libellé de paiement et sa dotation, puis figez une version. En session, une nouvelle caisse s’ouvre à zéro ; les ajouts/retraits MJ passent par une confirmation motivée. Les droits **Consulter la caisse** et **Payer avec la caisse** sont indépendants, attribués aux personnages dans les appartenances du groupe.

Depuis **Mes comptes et caisses**, le joueur choisit un compte autorisé. Il peut payer un personnage identifié par badge ou transférer vers une autre caisse de sa liste. Un caissier sans droit de consultation peut payer sans recevoir les champs de solde ni le journal. Les contreparties voient le libellé choisi par le MJ, pas le nom interne d’un groupe secret ni l’identité du caissier. Retirer les droits bloque immédiatement lectures, nouvelles commandes et réessais concernés. [Parcours et limites 0.12](docs/VALIDATION-0.12.md).

## Ventes privées et retrait

Depuis **Mon sac**, proposez un lot à un joueur identifié par badge : quantité, prix total, durée, lieu et conditions de remise. L’acheteur choisit son portefeuille ou une caisse autorisée, vérifie le récapitulatif puis paie. Le paiement et la propriété changent ensemble ; le lot reste chez le vendeur. Même financé par une caisse, le lot appartient au personnage acheteur.

Les objets à récupérer et ceux détenus pour autrui apparaissent séparément. Le vendeur propose ensuite la remise et l’acheteur confirme la réception physique, sans second paiement. Les propositions ne réservent rien avant acceptation. Le marché de session prolonge ce parcours en 0.14 ; négociation et contrats restent à développer. [Parcours et limites 0.13](docs/VALIDATION-0.13.md).

## Marché de la session

Depuis **Mon sac**, publiez une quantité à prix total fixe, avec durée, lieu et conditions. La publication réserve ce stock : dons, soins et autres ventes ne peuvent plus l’utiliser. L’expiration ou le retrait de l’annonce le libère. Le marché propose recherche, catégorie et **Mes annonces**.

Un joueur actif achète toute la quantité depuis un compte autorisé ; paiement et propriété changent ensemble, puis la remise physique suit le parcours du sac. Le MJ peut retirer une annonce avec motif avant de corriger son lot. [Parcours et limites 0.14](docs/VALIDATION-0.14.md).

## Petites annonces et recrutement

La régie propose **Gérer les petites annonces** : préparation, prévisualisation, publication ou programmation, modification et clôture avec historique. Choisissez les personnages/groupes destinataires, le commanditaire de fiction, les conditions et la récompense descriptive ; briefing réservé et notes MJ restent séparés du texte joueur.

Dans le marché, **Petites annonces** rassemble les missions accessibles et les candidatures personnelles ou collectives autorisées. Question, candidature et éventuel tarif proposé restent privés. Les réponses de l’organisation apparaissent dans **Infos**, avec lecture explicite. Depuis la candidature, le MJ propose maintenant un contrat de mission avec conditions et financement explicites. [Petites annonces 0.15](docs/VALIDATION-0.15.md).

## Contrats de missions

Le joueur relit et accepte les conditions : une place et les crédits du compte payeur sont réservés, puis le briefing privé est ouvert. **Mes missions et contrats** sépare propositions, missions attribuées et accords terminés. Une preuve textuelle doit être validée par le MJ avant le paiement unique. Le financement extérieur est enregistré comme création de crédits.

Le délai suit le temps de jeu et s’arrête en pause. Une expiration ou annulation confirmée par le MJ restitue les fonds réservés. L’archivage exige de traiter les contrats ouverts. La représentation de groupe est ajoutée en 0.18 ; les acomptes et les garanties restent à développer. [Parcours, preuves et limites 0.16](docs/VALIDATION-0.16.md).

## Primes ouvertes

Publiez une annonce **Prime ouverte** avec une récompense fixe, puis choisissez **Financer la prime**. Le MJ saisit le montant par récompense et le compte payeur, ou autorise un financement extérieur. Le budget de toutes les récompenses est réservé immédiatement sur le compte. Les conditions, le quota, l’échéance et l’audience de l’annonce sont ensuite verrouillés.

Les joueurs déposent des preuves privées depuis **Primes ouvertes**. Aucun dépôt ne réserve de récompense ; le MJ arbitre, peut demander un complément, refuser ou payer. Une seule récompense par bénéficiaire (personnage ou bande) et par prime, sans priorité automatique à l’ordre de dépôt. Le quota et les crédits sont mis à jour dans la même transaction. La clôture restitue le budget non versé et indique combien de preuves resteront sans paiement.

L’échéance suit l’heure réelle, comme celle des petites annonces, même en pause. Une preuve reçue à temps reste payable après cette échéance, jusqu’à clôture MJ ou épuisement du quota. Le briefing réservé de l’annonce n’est pas révélé par ce parcours. [Parcours et limites 0.17](docs/VALIDATION-0.17.md).

## Participation personnelle ou collective

Dans chaque petite annonce, le MJ choisit **En son nom uniquement**, **Au nom d’une bande uniquement** ou **En son nom ou au nom d’une bande**. Le joueur choisit le bénéficiaire avant sa candidature ou sa preuve. Ce choix reste attaché à l’engagement : une mission personnelle paie le portefeuille du personnage, une mission collective la caisse de la bande. Les anciennes annonces restent personnelles.

Dans les membres du groupe, le MJ accorde le droit **Représenter la bande pour les missions**. Il exige une appartenance active et révélée, un groupe publié, les espaces de groupes activés et une caisse configurée. Il ne donne aucun droit de consulter ou dépenser la caisse. Les représentants habilités partagent la candidature, le contrat, le briefing accepté et les preuves, y compris leur historique ; chacun garde son propre suivi de lecture.

Une bande occupe une seule place et ne reçoit qu’une récompense par prime, même si plusieurs représentants interviennent. Le retrait d’un mandat bloque immédiatement les accès concernés, tandis qu’un autre représentant peut poursuivre. Sans représentant actif, le MJ doit rétablir une représentation ou clôturer l’engagement avant de libérer les fonds. Le mode « les deux » autorise des engagements distincts par bénéficiaire : ce n’est pas une limite par compte joueur. [Règles, vérifications et limites 0.18](docs/VALIDATION-0.18.md).

## Infrastructure configurée

- GitHub privé : `gkerckhofs-a11y/gn-engine`.
- Firebase `gn-engine`, numéro `936415509528`, application `GN Engine Web` enregistrée.
- Firestore Standard `(default)` créé en `europe-west1` (Belgique), accès directs clients refusés.
- Firebase Authentication : Google activé.
- Firebase Hosting et fonction HTTP `api` publiés ; serveur en Belgique, Node 22.

L’autorisation Google a été configurée par le propriétaire et validée par un déploiement GitHub utilisant Workload Identity Federation. Aucune clé privée de compte de service n’est nécessaire. Le terminal local de Codex n’est pas connecté au compte personnel Google.

## Vérifier

Node 22 et Java 21 pour les émulateurs :

```sh
npm ci
npm run build
npm test
npm run test:emulator
```

La 0.20.0 a réussi **750 tests en une exécution complète sur GitHub** (411 métier/interface et 339 intégrations Auth/Firestore/Storage), sans échec ni test ignoré, ainsi que la compilation. Ces contrôles ont aussi réussi dans la chaîne de déploiement. Version **0.20.0 publiée** ; manifeste et refus des accès anonymes aux **132 commandes privées** vérifiés après installation. Preuves dans le [rapport 0.20](docs/VALIDATION-0.20.md). L’activation effective du stockage privé et la recette authentifiée sur plusieurs comptes et mobile restent à confirmer.

## Publier

La configuration initiale est déjà effectuée pour `gn-engine`. Pour la reproduire, le propriétaire exécute une seule fois dans Google Cloud Shell :

```sh
bash scripts/authorize-github-firebase.sh
```

Si le fichier a été importé seul dans le dossier d’accueil de Cloud Shell, utiliser `bash authorize-github-firebase.sh`.

Ensuite, lancer **Déployer GN Engine sur Firebase** dans l’onglet Actions de GitHub, sur `main`. Le workflow est aussi déclenché par une modification explicite de `.github/deploy-request.json` sur `main`, ce qui permet à Codex de demander une publication via le connecteur GitHub. Les autres commits ne lancent que les vérifications.

L’autorisation utilise une identité temporaire GitHub, sans clé privée ni secret GitHub à configurer. [Droits exacts, procédure et révocation](docs/DEPLOIEMENT-GITHUB.md).

Pour publier depuis un terminal local après la même configuration, avec `gcloud` et Firebase CLI connectés au projet :

```sh
npm ci
gcloud auth login
npx firebase login
npm run deploy
```

Le workflow vérifie les tests, compile puis publie la fonction `api` via Google Cloud CLI et le site/règles/index via Firebase CLI. Deux comptes dédiés distinguent compilation et exécution. Le canon, les documents et les données d’essai ne sont pas chargés. Le propriétaire doit présenter une identité Google vérifiée correspondant à `OWNER_EMAIL` ; aucun rôle n’est accepté depuis le JSON client.

## Périmètre restant

Ce premier parcours ne termine pas tout le lot A ni l’ensemble des exigences : valeurs initiales de classe (PV, crédits, objets), compétences actives, permissions étendues de caisse/stock/transport, invitations de groupe entre joueurs, autres modes de connexion, récupération sans Google, pièces jointes hors images, exports/restauration de sessions et historiques complets, terrain, suite de l’économie et vaisseaux restent à intégrer. Pas de démonstration de charge à 60/120 joueurs ni de recette complète des formulaires authentifiés en production.

Les versions et copies utilisent des transactions Firestore. Aucun plafond métier de casting ; les limites de taille des transactions devront être mesurées sur les contenus réels.

## Références

- [Cahier courant V1.1](docs/source/cahier-des-charges-v1.1.txt), [Word V1 archivé](docs/source/GN_Engine_Cahier_des_charges_V1.docx), [143 exigences](docs/exigences-v1.json).
- [Bilan du 20 octobre 2026](docs/BILAN-2026-10-20.md) et [médiathèque à développer](docs/MEDIATHEQUE.md) : import multiple, attribution aux objets/personnages/missions et suppression contrôlée.
- [Canon Port-Brèche](docs/source/port-breche-canon-v1.txt) : organisateur uniquement, jamais embarqué dans l’interface publique.
- [Audit initial](docs/AUDIT.md), [architecture](docs/ARCHITECTURE.md), [lots A à E](docs/LIVRAISON.md).
- `reference/sites-v0.1-source.tar.gz` : prototype Sites/D1 conservé au commit `6a12f995c5c26aaf3891cb4bbd8168e51184551e`. Le prototype privé existant n’a pas été remplacé.


