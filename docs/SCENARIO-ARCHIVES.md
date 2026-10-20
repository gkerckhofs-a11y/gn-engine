# Exporter et réimporter un scénario

## Parcours 0.20

Depuis l’atelier de scénario, choisir **Exporter le scénario**, puis l’état courant ou une version figée. Le récapitulatif annonce les fiches et les images incluses. Le fichier `.gnscenario.zip` se télécharge après récupération de toutes les images. Il contient aussi les secrets et notes MJ : il est réservé à la préparation par l’organisateur et n’est pas chiffré.

Depuis le tableau de bord propriétaire, choisir **Importer un scénario**, sélectionner le fichier, vérifier les compteurs et le titre, puis confirmer. L’import copie les images dans la médiathèque et crée un nouveau scénario seulement lorsque toutes les images et références ont été vérifiées. Les scénarios existants et leurs sessions restent indépendants.

Après une interruption, rouvrir **Importer un scénario**, sélectionner l’import à reprendre et choisir à nouveau le même fichier. Les images déjà reçues ne sont pas dupliquées. Fermer la fenêtre suspend la suite des envois ; une requête déjà envoyée peut se terminer. Une création de scénario déjà confirmée peut également finir après fermeture. L’état du serveur fait foi lors du réessai.

Un import en attente peut être annulé depuis cette liste. Ses images déjà importées restent dans la médiathèque ; elles peuvent être mises en corbeille si aucun contenu ne les utilise. L’annulation ne détruit donc pas une image réutilisée entre-temps.

## Contenu conservé

- Personnages : identité publique, histoire, secrets, notes MJ, objectifs, relations et leurs niveaux de publication.
- Groupes : membres fictifs, visibilité publique/secrète, permissions, briefing, notes MJ et dotation de caisse.
- Connaissances et indices : destinataires initiaux, conditions QR, droit de copie ou de simple lecture, vérité MJ et notes.
- Compétences, classes et profils déjà copiés ; règles de PV et d’économie, crédits et matériel de départ avec leurs snapshots.
- Modèles d’objets, images des fiches et du matériel de départ ; une image réutilisée est présente une seule fois dans le fichier.

Les identifiants des contenus sont conservés à l’intérieur du nouveau scénario, ce qui préserve les relations et conditions. Les images importées reçoivent de nouveaux identifiants dans la médiathèque, et toutes leurs références sont réécrites ensemble. La source normalisée de chaque image est conservée exactement ; les variantes d’affichage sont régénérées. Un modèle modifié depuis une attribution ne remplace pas le snapshot déjà copié.

Les états de publication sont conservés, mais l’import ne crée aucune session ni inscription. Les accès réels propriétaire/MJ/Accueil, comptes de connexion, invitations, notes personnelles de joueurs, transactions et données de sessions ne sont pas transportés. Les petites annonces et contrats sont actuellement des contenus de session et ne font pas partie de cet export de scénario.

## Format version 1

Archive ZIP à entrées non compressées, sans chiffrement, chemins relatifs prédéfinis :

- `manifest.json` en UTF-8 : `format: "gn-engine-scenario"`, `version: 1`, source courante ou figée et sa révision, paramètres du scénario, collections de contenu et catalogue des images référencées.
- `images/<identifiant>.png`, `.jpg` ou `.webp` : source normalisée de chaque visuel, avec nom, catégories, crédit et mots-clés dans le manifeste ; type, taille exacte et empreinte SHA-256 attendus.

Limites de cette première version : 128 Mio par archive, 2 Mio pour le manifeste, 500 fiches de contenu et 250 images. Un document de contenu doit rester sous 750 000 octets. Une source déjà normalisée peut atteindre 16 Mio ; l’import ordinaire d’une nouvelle photo reste limité à 5 Mio. Les limites existantes de pixels, dimensions, formats non animés et quota total de la médiathèque s’appliquent également. Les formats d’archives ZIP compressés ou modifiés par un autre logiciel ne sont pas pris en charge.

Le lecteur refuse les chemins inattendus, doublons d’entrées, dépassements de taille, fichiers supplémentaires ou manquants et empreintes incohérentes. Le serveur revalide le manifeste et toutes les références, contrôle le contenu réel des images et refuse les sources contenant les métadonnées que l’export normal retire. Une empreinte détecte une altération des fichiers par rapport au manifeste ; ce n’est ni une signature d’auteur ni une preuve d’authenticité d’un fichier reçu d’un tiers.

## Autorisations et reprise

Les commandes sont réservées au compte propriétaire Google vérifié, y compris les reprises et la lecture d’un import connu. Le fichier ne transporte aucun chemin de bucket, URL privée porteuse de jeton, clé ou droit d’accès réel. Les images restent servies par l’API de contenu avec ses vérifications habituelles et `private, no-store`.

La préparation d’import est liée au contenu exact et au titre confirmé. Le serveur conserve temporairement le manifeste dans des documents privés découpés sans rompre les caractères Unicode. Les images sont envoyées et contrôlées individuellement, avec des identifiants de reprise stables. La création du scénario, la réécriture des références, leur index d’utilisation et le reçu final se font dans une transaction Firestore. Un réessai après une réponse perdue renvoie le même scénario. Les copies temporaires du texte sont retirées à la fin ou à l’annulation ; le reçu et l’audit sont conservés.

## Périmètre restant

Il s’agit de l’export d’un état de scénario, courant ou figé au choix. L’arbre complet des versions et historiques, l’export/restauration d’une session en cours ou terminée, les sauvegardes générales du projet et le bilan de partie restent à développer. EXP-01 et MED-08 restent donc partiels.

Le stockage privé doit être activé pour transférer les images. Un scénario sans images peut être importé sans ce stockage. La recette sur les comptes réels et téléphones, les temps sur de vrais lots d’images et les gros fichiers restent à mesurer. REC-11 n’est pas déclaré terminé sur la seule base des tests automatisés.
