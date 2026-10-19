# Architecture Firebase

19 octobre 2026 — conception du moteur complet. Le premier parcours est implémenté dans `src/core/workflow.mjs`, `src/server/index.mjs` et `web/`. Firestore et Authentication sont configurés ; Functions et Hosting sont publiés sur https://gn-engine.web.app/. Voir `VALIDATION-0.2.md` pour les preuves et limites.

## Répartition

- Interface web responsive : espace organisateur, portail public d'inscription, interface joueur à quatre entrées (Personnage, Sac, Infos, Actions). QR et dégâts accessibles rapidement.
- Firebase Authentication pour l'identité humaine ; invitations privées rattachées à une inscription, à durée réelle et à usage unique. Le QR d'interaction ne sert jamais de connexion.
- Service applicatif sur Cloud Functions : toutes les commandes passent par la vérification du jeton Firebase, de sa révocation et des droits applicatifs courants.
- Firestore : données segmentées par organisateur, scénario et session ; transactions pour les effets liés.
- Cloud Storage : médias séparés selon leurs droits ; téléchargement contrôlé par le service, sans publication des pièces privées.
- Firebase Hosting pour les fichiers publics de l'interface, après configuration. Le contenu organisateur et les secrets ne sont pas embarqués dans ce bundle.

Premier parcours : Firestore Standard et Functions en `europe-west1` (Belgique), Node 22, Firebase Admin 14.5, Functions 7.4, SDK Web 13.0 et verrou de dépendances. Aucun secret de service dans le code. Storage et médias privés restent à intégrer.

## Modèle de données

| Ensemble | Responsabilité |
|---|---|
| `organizers` | Propriété des bibliothèques et scénarios ; rôles administratifs |
| `scenarios` / `versions` | Contenus réutilisables ; version publiée immuable |
| `sessions` | Référence du scénario, état, modules, capacité et horloge |
| `registrations` | Réponses personnelles, statut, suivi de préparation |
| `assignments` / `access` | Attribution active, version des droits et révocation |
| `characters` / `publicCharacters` | Fiche privée et projection publique explicitement construite |
| `groups` / `memberships` | Appartenances, couverture et autorisations indépendantes |
| `knowledge` / `grants` | Contenu et accès effectif ; vérité MJ distincte du texte reçu |
| `itemDefinitions` / `lots` / `locations` | Catalogue ; quantité, propriété, détention, emplacement et disponibilité |
| `accounts` / `reservations` / `ledger` | Soldes entiers, sommes engagées et écritures traçables |
| `listings` / `offers` | Vente de biens et versions de négociation |
| `jobPosts` / `applications` / `contracts` | Petites annonces, échanges privés, attribution et règlement |
| `fixtures` / `qrBindings` / `actions` | QR contextualisés, état, réservation, coût et résultat |
| `ships` / `routes` / `voyages` / `encounters` | Transport et interceptions avec le même fret |
| `events` / `operations` / `audit` | Déclenchements, résultat des commandes et journal organisateur |

Les collections de partie vivent sous leur session. Les modèles n'utilisent pas les identifiants d'état d'une session jouée. Les journaux techniques ne servent pas de fil d'information joueur.

## Autorisations

Le navigateur ne peut jamais déclarer son rôle MJ ou transmettre un en-tête Sites comme preuve d'identité. Le service vérifie le jeton Firebase et lit les droits applicatifs. Les SDK serveur Firestore ne s'appuient pas sur les règles client : les vérifications métier sont donc obligatoires dans chaque commande [F1, F3].

Le rôle d'accueil n'ouvre pas les secrets. Lire une caisse, dépenser, gérer le stock, lancer un trajet et lire les membres d'un groupe sont des permissions distinctes. Être un renégat n'accorde pas de liste ou de conversation avec les autres renégats.

Les révocations portent sur l'attribution et les connexions. Les lectures privées revérifient l'accès courant. Les notes non partagées appartiennent à leur auteur ; les exports MJ ne les incluent pas. Un canal exclut un ancien membre des nouveaux messages sans promettre de supprimer ce qu'il a déjà appris.

### Implémentation 0.3

Les profils fixes OWNER, MJ et RECEPTION sont vérifiés côté serveur via `sessionStaff`. Le propriétaire délègue par adresse Google vérifiée pour une session. Accueil reçoit une projection réduite des personnages et aucun journal de contenu. Une révocation ou diminution de rôle est contrôlée avant de retourner un résultat de commande mémorisé. Les groupes et permissions fines du modèle cible restent à implémenter.

Les relations sont stockées uniquement sur leur personnage source. Leur projection ne contient ni référence technique vers la cible, ni notes MJ, ni éléments non publiés. Les publications sont conservées sous chaque fiche ; la confirmation de lecture mémorise sa révision. Voir `VALIDATION-0.3.md`.

### Implémentation 0.4

Les groupes contiennent des appartenances rattachées aux personnages. Activation, révélation, visibilité dans la liste autorisée et affiliation publique sont distinctes. `readBriefing`, `readMembers`, `readUpdates` et `publishUpdates` sont les seuls droits actuellement exposés pour ces espaces. Le modèle de droits économiques et logistiques reste à intégrer.

Les contenus de groupe sont absents des projections Accueil. Les badges reçoivent uniquement les affiliations publiques explicitement autorisées. Les nouveaux membres ne reçoivent pas rétroactivement les messages : chaque publication crée les copies destinées aux seuls personnages alors autorisés. Chaque lecture vérifie à nouveau les droits, y compris après réattribution ou révocation. Les fils et historiques lisent les 30 derniers éléments ; pagination et charge restent à valider. Voir `VALIDATION-0.4.md`.

### Implémentation 0.5

Les connaissances ont leur bibliothèque de scénario/version/session et des reçus sous chaque personnage de session. Un reçu conserve les champs joueurs et la révision effectivement acquise, sans vérité MJ, liste de détenteurs ni conditions cachées. L'édition du catalogue ne remplace pas le texte reçu ; une attribution MJ explicite peut le faire avec motif et contrôle de révision. Dépublication et révocations ferment les lectures courantes.

La découverte QR exige un personnage actif et les conditions configurées sur la cible. La copie exige un texte partageable et un autre personnage actif identifié par son badge public. Les droits sont relus avant le résultat idempotent ; reçu, journal et opération sont atomiques. Voir `VALIDATION-0.5.md`. Le carnet privé est ajouté en 0.6 ; Storage reste à développer.

### Implémentation 0.6

Le carnet est rangé sous la session puis sous l'empreinte de l'UID authentifié, indépendamment de l'attribution du personnage. Il n'est inclus ni dans les projections MJ, ni dans les aperçus, ni dans l'audit de session. Une copie n'entre dans la bibliothèque de connaissances qu'après confirmation explicite par l'auteur ; la note originale, ses dates et son identifiant ne sont pas transmis. Les copies utilisent les reçus et contrôles de la 0.5. Voir `VALIDATION-0.6.md` pour le comportement, la concurrence et la portée applicative de cette confidentialité.

### Implémentation 0.7

Les compétences passives et classes sont conservées dans les bibliothèques de scénario, versions figées et sessions. Chaque personnage reçoit un profil copié et publié explicitement, avec ses exceptions individuelles. La projection joueur filtre les données réservées aux MJ ; le badge et le rôle Accueil ne reçoivent pas ce profil. Une confirmation lie le profil calculé à la révision du contexte et de la fiche. Les changements de catalogue ne réécrivent pas les profils attribués.

Une découverte QR peut exiger un identifiant de compétence et un niveau minimum dans le profil publié du personnage authentifié. Ce contrôle précède le résultat mémorisé. Les reçus de connaissances restent distincts du savoir mécanique et demeurent lisibles selon leurs propres droits après le retrait de la compétence. Voir `VALIDATION-0.7.md` pour cette étape ; les soins actifs sont ajoutés en 0.8.

### Implémentation 0.8

Les règles facultatives `healthRules` sont copiées du scénario à la version puis à la session. Les personnages portent `hp`, `maxHp`, `outOfCombat` et `healthRevision`. Activer une session ancienne initialise seulement les personnages sans maximum ; les valeurs existantes ne sont jamais remises à zéro par une réactivation. Les PV ne constituent pas une nouvelle version du texte de briefing.

Les profils de compétences acceptent les soins instantanés sur soi ou sur un autre personnage actif de la même session. Leurs paramètres sont copiés avec le profil attribué. La préparation lie le récapitulatif aux règles, au profil, aux droits courants, à l’état de la cible et aux usages. La confirmation relit ces données et applique atomiquement l’état, l’usage, l’historique et le résultat idempotent. Le cooldown utilise `gameTime`, donc exclut les pauses. Les compteurs `characters/{id}/skillUses/{skillId}` survivent aux changements de profil et de titulaire ; seule une nouvelle session recommence sans usages consommés.

Le serveur applique les permissions hors combat aux découvertes, partages de connaissances et notes, publications de groupe et soins. La lecture et les notes privées restent accessibles. L’état zéro PV n’entraîne ni mort définitive ni transfert. Les historiques joueurs retirent les UID et motifs MJ ; le soignant voit les PV nécessaires au récapitulatif de sa cible. Le rôle Accueil et les badges ne reçoivent pas les PV. Voir `VALIDATION-0.8.md` pour la portée exacte et les limites.

### Implémentation 0.9

Le catalogue `items` existe sous scénario, version figée et session. Un personnage de scénario possède une copie `startingInventory`, attribuée après préparation et confirmation des modèles publiés. Créer une session produit ses propres documents `inventory/{lotId}` à partir de ces copies. Chaque lot conserve une projection de sa définition, sa quantité, propriétaire, détenteur, emplacement, disponibilité et révision. Le parcours courant attribue propriétaire et détention au même personnage et localise le lot dans son sac ; les remises personnelles sont ajoutées en 0.10 ; entrepôts, prêts et transport restent à implémenter.

Le coût facultatif du soin référence l’identifiant et la révision exacte du modèle consommable. Le lot choisi doit être personnel, dans le sac du soignant, compatible avec cette version, disponible et assez fourni. Le montant requis est engagé uniquement à la confirmation instantanée. Le stock, les PV, l’usage, les deux historiques et le résultat mémorisé utilisent la même transaction Firestore. Une correction concurrente du stock invalide la confirmation. Les lots épuisés restent enregistrés avec quantité zéro et état `CONSUMED`.

Les attributions MJ créent de nouveaux lots et demandent une confirmation avec motif. Les corrections modifient quantité/disponibilité avec contrôle de révision, sans déplacer ni changer de propriétaire. Un lot consommé ou détruit est terminal ; réapprovisionner crée un nouveau lot. Catalogue, dotation de départ et lots ont des historiques séparés, limités aux 30 derniers événements consultables. Le sac joueur exclut motifs, UID, origine interne et notes MJ. Voir `VALIDATION-0.9.md`.

## Commandes et concurrence

Une commande contient session, référence unique, type, ressources ciblées et version attendue lorsqu'elle s'applique. L'acteur vient du jeton vérifié, jamais du corps de requête. Le service conserve une empreinte de la demande et son résultat dans la même transaction que ses effets.

Un réessai restitue le résultat enregistré. Réutiliser la même référence pour un autre montant est refusé. Toutes les lectures transactionnelles précèdent les écritures. Le callback d'une transaction pouvant être rejoué, il ne doit ni envoyer un message ni déclencher un effet externe [F2]. Les notifications passent par une boîte d'envoi transactionnelle et un traitement dédoublonné.

Les achats transfèrent propriété et crédits, sans déplacer automatiquement le lot. Les transports réservent le même bien. Une interception déplace ou partage un lot existant et respecte la capacité du vainqueur. Les doubles paiements, doubles réservations et doubles récompenses utilisent les mêmes invariants.

Le fichier `src/core/payments.mjs` reste un prototype isolé, non appelé par l’API actuelle. Les paiements intégrés de la 0.11 passent par `src/core/economy.mjs`, raccordé aux inscriptions, attributions et droits courants. Contrats, taxes et ventes atomiques restent à développer.

## Temps et arrêt

L'horloge de jeu cumule le temps écoulé lorsqu'elle tourne. Les pauses ne font avancer ni voyages ni loyers ni effets. Les invitations restent liées au temps réel. L'état d'accueil doit pouvoir être rouvert sans redémarrer le jeu.

Les échéances sont résolues par le service même si aucun écran n'est ouvert. Un déclenchement possède une référence stable et ne s'applique qu'une fois. La fin examine les engagements ouverts avant de les régler ou de les annuler selon les règles choisies.

## Accès privés et médias

La première version Sites utilisait des clés privées permanentes. Le premier parcours Firebase implémente une invitation aléatoire, stockée sous forme d'empreinte et consommée atomiquement par le compte Google vérifié de l'inscription. Le MJ peut renouveler ou révoquer l'accès. Après révocation, une date minimale de nouvelle authentification exclut les anciens appareils. Courriels et autres modes de récupération restent à intégrer.

Les pièces jointes suivent les droits du contenu, y compris titres, noms de fichiers et miniatures. Une prévisualisation MJ doit utiliser les mêmes projections que le joueur, sans modifier les découvertes. Le cache hors ligne sera limité aux contenus déjà autorisés, avec durée explicite et suppression à la déconnexion ; les opérations économiques exigent une confirmation serveur.

## Références techniques consultées

- [F1] Google Firebase, *Verify ID Tokens*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/auth/admin/verify-id-tokens
- [F2] Google Firebase, *Transactions and batched writes*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/firestore/manage-data/transactions
- [F3] Google Firebase, *Secure data in Cloud Firestore*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/firestore/security/overview
- [F4] Google Firebase, *Manage User Sessions*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/auth/admin/manage-sessions

Ces sources étayent l'usage technique proposé ; elles ne certifient ni l'implémentation ni la sécurité globale du moteur.

### Implémentation 0.10

Les propositions `sessions/{sid}/lotTransfers/{id}` conservent les deux identités publiques, leurs empreintes d’attribution/accès, le modèle copié, la quantité, le lot et sa révision. Une proposition ne réserve rien. Son acceptation relit les deux accès, les règles hors combat, la phase de jeu et la révision du lot. Un changement du lot ou des droits invalide la proposition ; l’interface la présente comme « À refaire » sans changer le stock.

La transaction d’acceptation déplace le même lot s’il est remis entièrement. Sinon, elle diminue le lot source et crée un lot enfant avec `parentLotId`, `rootLotId` et `transferId`, sans fusion. Elle écrit les historiques, la proposition acceptée, l’audit et le résultat idempotent ensemble. La propriété, la détention et l’emplacement passent au même destinataire. Les corrections MJ et consommations médicales concurrentes sont détectées par les lectures/révisions Firestore. Les commandes vérifient l’accès actuel avant les résultats mémorisés.

Les joueurs voient uniquement leurs remises, sans UID, empreinte d’accès, motif MJ ni solde du sac de l’autre partie. Les propositions en attente restent listées ; l’historique terminé est limité aux 30 dernières. Les requêtes utilisent deux égalités séparées (`sourceId`, `recipientId`) sans nouvel index composé. Le volume de lecture n’est pas encore paginé. Les remises sont gratuites, sans capacité ni déplacement extérieur ; aucune réservation commerciale ou preuve automatique de présence n’est déduite du QR.


### Implémentation 0.11

Les `economyRules` du scénario sont copiées dans sa version figée puis dans la session. Les dotations `startingCredits` des personnages sont préparées et confirmées sans modifier les sessions existantes. `seedWallets` crée les comptes `sessions/{sid}/accounts/{hash(character:id)}` et leurs écritures initiales. Un compte appartient au personnage, indépendamment du participant qui l’incarne. L’activation d’une ancienne session ouvre seulement les comptes manquants à zéro. Nom et unité sont immuables une fois la monnaie de session configurée ; désactiver ne supprime aucun compte.

Les valeurs `balance` et `reserved` sont des entiers sûrs non négatifs, et `available = balance - reserved`. Le parcours ne crée aucune réservation. La disponibilité est vérifiée avant débit ; les dépassements numériques sont refusés avant crédit. Chaque modification augmente la révision du compte. La préparation d’un paiement n’écrit rien. Sa confirmation lie le payeur autorisé, le bénéficiaire courant, les règles hors combat, le motif, le montant et le solde/révision du payeur. Le solde du bénéficiaire ne figure ni dans la réponse ni dans cette empreinte : un encaissement concurrent reste compatible avec le paiement préparé.

La confirmation relit les deux comptes et les accès. Une transaction écrit ensemble débit, crédit, journal commun `ledger/{id}`, projection par compte `accounts/{id}/history/{id}`, audit et résultat idempotent. Les entrées du transfert ont une somme nulle. Les dotations et corrections indiquent séparément la monnaie créée ou retirée. Le journal conserve toutes les écritures ; l’interface consulte les 30 dernières par compte. Les projections joueurs excluent UID, motif MJ et solde de l’autre partie. Le rôle Accueil et les badges ne reçoivent aucun compte.

L’accès courant précède tout résultat mémorisé. Après changement d’attribution ou nouvelle invitation, le garde d’identité empêche un ancien payeur de rejouer sa commande. Une répétition d’un paiement déjà réussi peut restituer son résultat en pause, sans nouveau mouvement ; l’archive, la révocation ou le module désactivé ferment la lecture. Un nouveau paiement exige la phase En jeu et la permission de payer hors combat si applicable. Recevoir est passif : les PV du bénéficiaire ne bloquent pas un crédit.

Les interventions MJ nécessitent un montant, un mode ajout/retrait, un libellé joueur et un motif privé, puis un récapitulatif avant/après. Révision du parent et état du compte empêchent une confirmation périmée d’écraser un paiement. Aucun mouvement d’objet ni annulation de dépendances n’est lié à ce parcours. Voir `VALIDATION-0.11.md`.


### Implémentation 0.12

`collective-accounts.mjs` prolonge le service économique avec les caisses de groupe, dans les mêmes collections de comptes et de journal. L’identifiant du compte est l’empreinte `group:{groupId}`, distincte de celle d’un portefeuille. Le groupe conserve un `walletConfig` (libellé, montant de départ, révision), préparé puis confirmé. L’éditeur narratif de groupe préserve cette configuration et ne permet pas de la remplacer par un champ JSON libre. Les versions et sessions copient les réglages ; une ouverture tardive de session crée zéro crédit. Un renommage augmente les révisions sans toucher au solde ni aux anciennes écritures.

Les permissions `readWallet` et `payWallet` sont booléennes, indépendantes et fausses par défaut. L’accès impose économie et groupes activés, groupe publié, appartenance active/révélée et personnage courant autorisé. `myAccounts` ne retourne que les métadonnées des comptes accessibles. `readAccount` omet soldes et historique si `readWallet` est absent ; `prepareAccountPayment` et `payFromAccount` exigent `payWallet` pour une source collective. Les portefeuilles personnels sont résolus à partir du personnage authentifié. Les anciennes commandes personnelles restent compatibles.

Une cible collective doit appartenir à la propre liste de comptes autorisés du payeur ; une cible personnelle peut être un autre personnage actif de la session. Un caissier peut aussi verser vers son portefeuille personnel. Le bénéficiaire est projeté par identité publique pour un personnage et par libellé de compte pour une caisse ; aucun identifiant de groupe, nom interne ou opérateur n’est placé dans la contrepartie du journal joueur. L’acteur et le personnage caissier sont conservés dans le journal technique MJ.

Le récapitulatif et le résultat omettent les champs de solde pour un caissier sans droit de consultation. L’empreinte de confirmation lie la révision du compte et les droits, sans inclure son solde caché. Les réponses de refus pour fonds insuffisants restent inhérentes au droit de proposer un paiement. La révision de groupe est incluse dans le garde mémorisé : retirer puis rétablir un droit ne ressuscite pas un ancien consentement. Retirer la consultation interdit de relire un résultat ancien qui contenait le solde.

Les opérations utilisent `writeLedger` et la même transaction Firestore pour comptes, journal, historiques, audit et résultat. Les corrections MJ acceptent une cible groupe sans modifier son appartenance. Toutes les lectures précèdent les écritures ; les accès et commandes croisées restent limités à la session. Voir `VALIDATION-0.12.md` pour les preuves et limites.
