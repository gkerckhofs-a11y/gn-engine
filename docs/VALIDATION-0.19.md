# Validation 0.19 — médiathèque privée

20 octobre 2026. Développement terminé ; publication et activation du stockage à vérifier avant de déclarer le service d’images opérationnel en production.

## Parcours développé

- Médiathèque centrale du propriétaire ; les MJ disposent du périmètre de leur session. Le rôle Accueil et les joueurs ne parcourent pas le catalogue.
- Import multisélection ou glisser-déposer : 50 fichiers maximum par sélection ; état, progression, erreur et reprise par fichier. Un réessai conserve son identifiant. Les doublons connus demandent une décision explicite.
- JPEG, PNG et WebP non animés, 5 Mio par fichier, 16 mégapixels et 8 000 pixels maximum par côté. Validation du contenu réel par sharp, orientation normalisée, métadonnées retirées, transparence conservée. Source normalisée, vignette 320 px et variante mobile 1 280 px. Aucun recadrage destructif.
- Nom, catégorie, univers, mots-clés et crédit modifiables. Recherche, filtres par utilisation, catégorie, univers, type de contenu et scénario ; pages de 24 images. Quota initial de 1 000 images / 512 Mio, réservations d’import comprises, affiché dans l’interface.
- Attribution depuis les éditeurs ou en série : portrait public, fiche privée, modèle d’objet, lot attribué, illustration d’annonce et briefing de mission. Récapitulatif avant/après et confirmation explicite. Les attributions ne sont pas déduites des noms de fichiers.
- Les visuels sont des fichiers immuables référencés par identifiant et version. Changer un visuel consiste à importer une nouvelle image puis sélectionner les cibles. Renommer une image ne change aucun contenu. Scénarios figés, matériel de départ, lots et contrats conservent leurs références. Un contrat ou lot peut recevoir une correction explicite de son image, avec historique.
- Un briefing d’annonce n’est visible qu’au titulaire du contrat après acceptation ; l’image suit les mêmes règles. Les notes et noms internes de la médiathèque ne sont pas transmis au joueur.
- Corbeille et restauration par image ou sélection. Toute référence active, y compris une version ou un historique conservé, empêche la mise en corbeille. Purge manuelle après 30 jours minimum. Détacher une image actuelle n’efface pas les anciennes versions : il ne rend donc pas forcément l’image supprimable.
- Les références inverses et compteurs sont maintenus dans la transaction Firestore de la modification de contenu, y compris les copies et historiques. Attribution et suppression concurrentes ne peuvent laisser de lien cassé.
- Contrôle des binaires avant ouverture ou reprise du jeu. Une image devenue indisponible ensuite n’empêche pas de consulter le texte et les actions de la fiche.
- Nettoyage explicite des imports interrompus après 15 minutes, limité à leurs fichiers temporaires ; les imports réussis restent intacts. Une réponse perdue après commit ne provoque pas leur effacement.

## Stockage et accès

Métadonnées, références, quotas et audit dans Firestore ; binaires dans le bucket Cloud Storage privé `gn-engine-media-936415509528`, en Belgique. Les images ne sont ni publiques ni servies avec des URL porteuses d’un jeton. Chaque lecture passe par l’API authentifiée et la projection autorisée du contenu, puis renvoie uniquement les octets. Exception explicite : le portrait d’un badge public publié suit l’accès public de ce badge.

L’API sert les variantes avec `Cache-Control: private, no-store`. Le client ne conserve pas de cache persistant des images et nettoie son interface à la déconnexion. Le correctif 0.19.1 invalide aussi les réponses privées encore en vol lors d’une déconnexion ou d’un changement de page ; elles ne peuvent rouvrir une image ensuite. La permission d’un fichier déjà consulté ne peut pas effacer les copies ou captures conservées par le lecteur.

L’autorisation GitHub initiale ne donne pas de droits Storage au compte d’exécution. L’activation est préparée dans `scripts/activate-media-storage.sh` : création du bucket dans le projet attendu, accès uniforme, interdiction d’accès public et rôle `roles/storage.objectUser` pour le seul compte `gn-engine-runtime`, sur ce seul bucket. Aucun rôle Owner/Editor, aucune clé, aucun accès Storage ajouté au compte de déploiement. Un marqueur privé vérifie l’accès réel de l’API. Tant qu’il manque, le catalogue affiche un message d’activation et désactive la sélection de fichiers.

La fonction dispose de 512 Mio, au maximum trois instances et huit requêtes simultanées par instance. Le décodage des images est limité à une opération par instance ; un import concurrent reçoit une erreur réessayable pour éviter une saturation mémoire.

## Vérifications

- Tests métier et interface : catalogue, vingt imports valides et un refus, reprise, doublons, métadonnées, quotas, pages de 24, autorisations, portraits publics et privés, objets copiés, snapshots de scénario, briefing ciblé et contrat accepté.
- Concurrence attribution / suppression, confirmation périmée, série atomique, corbeille, restauration, délai de purge, reprise de purge et panne de stockage.
- Orientation, transparence, suppression des métadonnées, faux formats et dimensions excessives.
- Suite métier partagée avec l’émulateur Firestore ; parcours HTTP réel avec Auth et Storage émulés, accès direct aux fichiers refusé, variantes et en-têtes vérifiés.
- Aucune donnée de jeu ni image de recette créée en production.
- Une fixture locale `test/ui/media-preview.mjs` (génération : `node scripts/build-media-preview.mjs`) permet la revue de l’interface sur données fictives. La revue visuelle via le navigateur distant n’a pas été exécutée : sa politique refuse les fichiers locaux. Les tests d’interface automatisés ne remplacent pas la recette sur téléphone.

Validation locale : 397 tests métier/interface et 331 intégrations Auth/Firestore/Storage réussis. La suite complète sera réexécutée sur la révision publiée dans la chaîne GitHub avant déploiement ; les références finales seront ajoutées ensuite.

## Limites et suite du cahier

Le module ne couvre pas encore les exports/imports complets de scénario avec leurs fichiers, associations et permissions, ni les sauvegardes/restaurations générales. MED-08 reste partiel malgré la séparation des binaires et le contrôle avant ouverture. Les durées sur un lot de vraies photos et le chargement sur téléphone/réseau terrain restent à mesurer (MED-09 / REC-11). La recette authentifiée avec les comptes réels et l’activation du bucket restent à confirmer.

La source conservée est une source normalisée et débarrassée de ses métadonnées, pas une copie binaire inchangée du fichier importé. Aucun éditeur de recadrage n’est inclus. La première version protège les références des historiques sans interface permettant d’effacer ces historiques ; les images qui y figurent restent conservées.

Le correctif 0.19.2 conserve également la protection contre les modifications concurrentes dans un éditeur de texte resté ouvert pendant le choix d’une image. Seule la révision produite par cette attribution peut être reprise automatiquement ; une modification intermédiaire d’un autre organisateur laisse l’enregistrement périmé et oblige à relire la fiche.
