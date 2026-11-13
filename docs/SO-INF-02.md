# Space Outlaws — INF-02, déchiffrement de documents M6

Date : 9 novembre 2026. Références : SO_Regles_V07.txt, chapitre 14 (INF-02), chapitre 4 (PA/D6) ; SO_CDC_V35.md §5.1 ; matrice V3.

## Périmètre de la première tranche

- Réutilisation du Master M6 (entité `knowledge` de nature DOCUMENT) : le champ `body` est le message chiffré déjà obtenu en jeu, le nouveau champ `cipher` contient le texte à révéler, le niveau requis et le seuil de difficulté.
- Seul un personnage disposant d'un reçu actif du document peut lancer INF-02. Une fiche M6 non obtenue ou non publiée est inaccessible.
- Capacité `inf02Version=1` des nouveaux Masters/sessions uniquement ; anciennes sessions inchangées.
- 1D6 + niveau INF-02 contre un seuil préparé par l'organisateur (6 par défaut), sans succès/échec automatique sur un 1/6 naturel.
- Durées canoniques : 180 / 165 / 150 / 135 / 120 secondes de jeu selon N1–N5.
- Un PA réservé au départ puis consommé au résultat, qu'il soit réussi ou raté. Annulation avant résolution restitue le PA et laisse tenter à nouveau.
- Une seule tentative **résolue** par personnage et révision du document ; récupération personnelle 10 minutes de jeu.
- Succès : mise à jour atomique du seul reçu privé du personnage pour faire apparaître le texte déchiffré dans « Mes informations ». Échec : le texte chiffré reste visible, aucun contenu secret rendu dans le résultat ni la liste.
- Reçus idempotents et état de tentative en transaction. Personnage captif (ROG-03), mort, hors combat ou déjà occupé : nouveau départ interdit.

## Préparation par le MJ

Dans l'atelier M6, préparer un DOCUMENT avec `body` chiffré. Activer INF-02 et saisir le texte à révéler dans le champ réservé MJ, le niveau et le seuil. La première publication doit respecter les gardes ordinaires du Master.

Ne jamais mettre le texte clair dans `body` : ce champ apparaît au détenteur du document avant tout déchiffrement. `gmTruth` reste une note de préparation distincte et n'est pas réutilisée automatiquement comme message.

## Limites non couvertes par la première tranche

1. Obtenir un objet physique par vol/inventaire ne crée pas encore automatiquement un reçu M6. Le MJ doit fournir le document en jeu par un parcours existant ; une intégration inventaire ↔ documents reste à planifier.
2. Les cryptogrammes à réponse textuelle préparée sont raccordés au validateur partagé avec INF-01 ; les autres formats de mini-jeu ne sont pas couverts.
3. Le décrypteur portable (+1) et l’aide compétente (+1) sont raccordés par les compléments du 13 novembre décrits ci-dessous. Les autres éventuels équipements nécessitent leur règle propre.
4. Une révision de document ne doit pas être appliquée rétroactivement à une session en cours : préserver le Master figé et le reçu historique.
5. Aucune recette d'ergonomie Android/iOS réelle, de charge ou de session humaine effectuée par le seul code.

## Vérifications

Tests Node en mémoire, même suite sur émulateur Firestore et rendu HTML ciblé : succès, échec, délai, PA, annulation, concurrence/idempotence, exclusion des documents non obtenus et ancien Master, contenu secret avant/après, permissions, version périmée. Vérifier la CI sur le SHA exact du candidat ; un profil ciblé ne remplace pas la validation générale de publication.

**Déploiement, migration, fusion main : non autorisés par cette tranche.**

## Complément de régie — 13 novembre 2026

Session → régie → Fouilles et installations → Déchiffrements en cours : un MJ disposant du droit de contenu peut saisir un motif et « Interrompre et libérer le PA ». Cette procédure utilise l’annulation native et permet de débloquer une réservation après révocation ou réaffectation du joueur, y compris en pause. Elle ne révèle aucun texte, ne consomme pas la tentative et ne rembourse jamais une tentative déjà résolue. Les appels répétés ne libèrent le PA qu’une fois ; un événement est conservé dans le journal d’audit. Joueurs et personnel d’accueil n’y ont pas accès. Aucun accès privé n’est réactivé.

Recette terrain à réaliser : lancer INF-02 avec un personnage test, révoquer son accès, interrompre depuis la régie en indiquant le motif, puis vérifier le PA, le journal et l’absence de révélation. Les validations automatisées sont suivies dans la matrice unique `SO-COMPETENCES-V07-CLOTURE.md` et la PR du commit testé.

## Aide au déchiffrement — 13 novembre 2026

Depuis Action → Proposer mon aide, un personnage compétent propose INF-02 au détenteur du document et confirme sa présence. Celui-ci choisit l’offre dans le formulaire de déchiffrement avant de lancer la durée. Une seule aide apporte +1 au jet, sans PA supplémentaire. L’aidant reste occupé jusqu’au résultat et récupère dix minutes comme l’initiateur. Les anciens délais de déchiffrement et ceux de l’aide se cumulent par échéance maximale, jamais par addition de durées.

L’aidant peut interrompre depuis ses offres d’aide actives ; l’initiateur et le MJ conservent leurs annulations. Toute interruption avant résolution libère les réservations et ne consomme pas la tentative. Aider n’accorde ni possession du document ni accès au texte déchiffré. Le matériel bonus et les cryptogrammes alternatifs restent hors de ce complément.

Recette : deux personnages INF-02, offre d’aide, lancement avec l’offre, indisponibilité de l’aidant, résultat, contrôle de son PA inchangé et de ses dix minutes de récupération ; recommencer avec interruption et avec révocation de l’aidant.

## Décrypteur portable — 13 novembre 2026

Dans la fiche de document M6, renseigner les identifiants des équipements M1 compatibles dans « Décrypteurs compatibles (+1) ». Le contrôle du Master vérifie les références ; la publication refuse un consommable ou un module de vaisseau. Le champ reste facultatif : aucun objet initial ne reçoit automatiquement de bonus.

Le joueur choisit un décrypteur présent dans son sac avant de lancer INF-02. Le lot est réservé pendant la durée puis libéré sur succès, échec ou annulation, sans perte de quantité. Son bonus +1 peut s’ajouter à l’aide +1. Les transferts et usages concurrents restent soumis au verrou natif d’inventaire. Un changement incohérent de lot bloque la résolution plutôt que d’écraser les données.

Recette : publier un document compatible, fournir le décrypteur au personnage, sélectionner le lot, vérifier sa réservation, terminer puis vérifier le +1 et la quantité conservée. Refaire avec annulation et matériel incompatible. Le formulaire M6 prend en charge la préparation ; aucun Master déjà publié n’est modifié automatiquement.

## Cryptogramme à réponse préparée — 13 novembre 2026

Dans M6, activer « Cryptogramme à réponse préparée », saisir la consigne, la durée annoncée (secondes de jeu) et la solution. Le contrat partagé avec INF-01 accepte 4–64 lettres, chiffres, espaces ou tirets et une durée de 1–3600 secondes. En modification, une réponse vide conserve l’empreinte existante ; désactiver le cryptogramme revient au D6. La réponse brute n’est jamais réaffichée. Les compatibilités de matériel ne sont pas enregistrées dans ce mode.

Après lancement, le joueur lit la consigne puis valide sa réponse une fois la durée écoulée. Aucun D6 n’est généré et aucun bonus au dé ne s’applique. Une mauvaise réponse consomme le PA et la tentative de cette version ; une réponse correcte révèle le texte privé préparé. Le document chiffré n’est jamais détruit. Les espaces multiples, la casse et la normalisation Unicode suivent INF-01. Une saisie hors format demande correction sans résoudre la tentative.

Recette : publier un document avec une consigne à 90 secondes ; vérifier que le formulaire annonce cette durée, puis la suspend pendant une pause. Résoudre avec la bonne réponse, vérifier l’absence de jet et le débit unique. Sur un autre personnage, essayer une mauvaise réponse et confirmer l’absence de nouvelle tentative sur cette version après récupération.
