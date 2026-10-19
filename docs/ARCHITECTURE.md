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

La découverte QR exige un personnage actif et les conditions configurées sur la cible. La copie exige un texte partageable et un autre personnage actif identifié par son badge public. Les droits sont relus avant le résultat idempotent ; reçu, journal et opération sont atomiques. Voir `VALIDATION-0.5.md`. Le carnet privé et Storage restent à développer.

## Commandes et concurrence

Une commande contient session, référence unique, type, ressources ciblées et version attendue lorsqu'elle s'applique. L'acteur vient du jeton vérifié, jamais du corps de requête. Le service conserve une empreinte de la demande et son résultat dans la même transaction que ses effets.

Un réessai restitue le résultat enregistré. Réutiliser la même référence pour un autre montant est refusé. Toutes les lectures transactionnelles précèdent les écritures. Le callback d'une transaction pouvant être rejoué, il ne doit ni envoyer un message ni déclencher un effet externe [F2]. Les notifications passent par une boîte d'envoi transactionnelle et un traitement dédoublonné.

Les achats transfèrent propriété et crédits, sans déplacer automatiquement le lot. Les transports réservent le même bien. Une interception déplace ou partage un lot existant et respecte la capacité du vainqueur. Les doubles paiements, doubles réservations et doubles récompenses utilisent les mêmes invariants.

Le fichier `src/core/payments.mjs` prépare ce contrat pour un transfert simple uniquement. Il ne couvre encore ni contrats, ni paiement partiel, ni taxes, ni création/correction de crédits, ni détention, ni conditions de soins.

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
