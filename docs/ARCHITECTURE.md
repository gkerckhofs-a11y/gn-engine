# Conception Firebase proposée

19 octobre 2026 — choix de conception pour répondre au cahier, pas description d'une infrastructure déjà configurée.

## Répartition

- Interface web responsive : espace organisateur, portail public d'inscription, interface joueur à quatre entrées (Personnage, Sac, Infos, Actions). QR et dégâts accessibles rapidement.
- Firebase Authentication pour l'identité humaine ; invitations privées rattachées à une inscription, à durée réelle et à usage unique. Le QR d'interaction ne sert jamais de connexion.
- Service applicatif sur Cloud Functions : toutes les commandes passent par la vérification du jeton Firebase, de sa révocation et des droits applicatifs courants.
- Firestore : données segmentées par organisateur, scénario et session ; transactions pour les effets liés.
- Cloud Storage : médias séparés selon leurs droits ; téléchargement contrôlé par le service, sans publication des pièces privées.
- Firebase Hosting pour les fichiers publics de l'interface, après configuration. Le contenu organisateur et les secrets ne sont pas embarqués dans ce bundle.

Les dépendances et la région ne sont pas figées dans ce dépôt. Leurs versions et la disponibilité de la région devront être vérifiées lors de l'intégration. Aucun secret de service n'est ajouté au code.

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

## Commandes et concurrence

Une commande contient session, référence unique, type, ressources ciblées et version attendue lorsqu'elle s'applique. L'acteur vient du jeton vérifié, jamais du corps de requête. Le service conserve une empreinte de la demande et son résultat dans la même transaction que ses effets.

Un réessai restitue le résultat enregistré. Réutiliser la même référence pour un autre montant est refusé. Toutes les lectures transactionnelles précèdent les écritures. Le callback d'une transaction pouvant être rejoué, il ne doit ni envoyer un message ni déclencher un effet externe [F2]. Les notifications passent par une boîte d'envoi transactionnelle et un traitement dédoublonné.

Les achats transfèrent propriété et crédits, sans déplacer automatiquement le lot. Les transports réservent le même bien. Une interception déplace ou partage un lot existant et respecte la capacité du vainqueur. Les doubles paiements, doubles réservations et doubles récompenses utilisent les mêmes invariants.

Le fichier `src/core/payments.mjs` prépare ce contrat pour un transfert simple uniquement. Il ne couvre encore ni contrats, ni paiement partiel, ni taxes, ni création/correction de crédits, ni détention, ni conditions de soins.

## Temps et arrêt

L'horloge de jeu cumule le temps écoulé lorsqu'elle tourne. Les pauses ne font avancer ni voyages ni loyers ni effets. Les invitations restent liées au temps réel. L'état d'accueil doit pouvoir être rouvert sans redémarrer le jeu.

Les échéances sont résolues par le service même si aucun écran n'est ouvert. Un déclenchement possède une référence stable et ne s'applique qu'une fois. La fin examine les engagements ouverts avant de les régler ou de les annuler selon les règles choisies.

## Accès privés et médias

La première version Sites utilisait des clés privées permanentes. La cible est une invitation aléatoire stockée sous forme d'empreinte, consommée atomiquement, puis une session authentifiée. Les modalités de récupération et d'envoi restent à intégrer. La détection d'expiration seule du noyau n'est pas un service d'invitations complet.

Les pièces jointes suivent les droits du contenu, y compris titres, noms de fichiers et miniatures. Une prévisualisation MJ doit utiliser les mêmes projections que le joueur, sans modifier les découvertes. Le cache hors ligne sera limité aux contenus déjà autorisés, avec durée explicite et suppression à la déconnexion ; les opérations économiques exigent une confirmation serveur.

## Références techniques consultées

- [F1] Google Firebase, *Verify ID Tokens*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/auth/admin/verify-id-tokens
- [F2] Google Firebase, *Transactions and batched writes*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/firestore/manage-data/transactions
- [F3] Google Firebase, *Secure data in Cloud Firestore*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/firestore/security/overview
- [F4] Google Firebase, *Manage User Sessions*, documentation évolutive, consultée le 19 octobre 2026 : https://firebase.google.com/docs/auth/admin/manage-sessions

Ces sources étayent l'usage technique proposé ; elles ne certifient ni l'implémentation ni la sécurité globale du moteur.
