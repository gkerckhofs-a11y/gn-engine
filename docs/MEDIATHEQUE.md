# Médiathèque des images personnalisées

20 octobre 2026 — spécification du cahier V1.1. Première implémentation publiée en 0.19.2, avec 728 tests réussis : voir [parcours, validation et limites](VALIDATION-0.19.md). L’export/import d’un état de scénario avec ses images est développé en 0.20 : voir [SCENARIO-ARCHIVES.md](SCENARIO-ARCHIVES.md). Activation du stockage privé, sauvegardes complètes des historiques/sessions et recette terrain encore à confirmer ou réaliser.

Ajout du 20 octobre 2026. L’organisateur dispose d’une base d’images réutilisables pour illustrer les objets, les personnages et PNJ, ainsi que les missions et petites annonces. Le module est obligatoire dans le périmètre initial. Il complète EDI-01, PER-01, INV-05, ANN-03, EXP-03 et SEC-04.

## MED-01 — Catalogue central

Une médiathèque organisateur rassemble les images, avec vignette, nom modifiable, catégorie, mots-clés, origine ou crédit facultatif et état d’utilisation. Recherche et filtres permettent de retrouver les images par univers, scénario, type de contenu et statut utilisé ou inutilisé. Chaque image possède un identifiant stable indépendant de son nom de fichier.

## MED-02 — Import par lot

Le MJ peut sélectionner plusieurs fichiers ou les glisser ensemble. Avant envoi, il voit les miniatures, formats et tailles ; pendant l’import, chaque fichier affiche progression, réussite ou erreur. Un échec n’annule pas les fichiers réussis. Il peut retirer un fichier de la sélection et relancer seulement les échecs. Un réessai technique ne crée pas de doublon ; un fichier identique est signalé avant réimport volontaire.

## MED-03 — Formats et rendu

La première version accepte JPEG, PNG et WebP, y compris les PNG transparents. Les limites de taille, de dimensions et de nombre de fichiers sont configurées et affichées avant envoi. Le service contrôle le contenu réel, normalise l’orientation et retire les métadonnées de localisation. Il prépare des vignettes et des versions adaptées au mobile. L’image entière reste visible sans déformation, avec agrandissement ; le recadrage de présentation ne détruit pas la source.

## MED-04 — Attribution aux contenus

Depuis une fiche objet, personnage ou PNJ, mission ou petite annonce, le MJ choisit une image de la médiathèque, peut la remplacer ou retirer son association. Une image peut illustrer plusieurs contenus. Une sélection multiple permet des attributions en série avec un récapitulatif explicite image par cible avant confirmation. Le nom de fichier ne déclenche jamais une attribution silencieuse. Portrait public, fiche privée et briefing de mission restent des usages distincts.

## MED-05 — Réutilisation et versions

Un visuel peut être réutilisé dans plusieurs scénarios autorisés. Chaque contenu référence une version précise. Remplacer l’image dans la bibliothèque ne modifie pas silencieusement une session démarrée, un objet déjà attribué ou un contrat accepté. Une propagation demande un choix des cibles et une comparaison avant confirmation. Sans image, un visuel neutre conserve une fiche lisible.

## MED-06 — Droits sur les images

La gestion est réservée au propriétaire et aux organisateurs explicitement habilités dans leur périmètre. Les joueurs ne parcourent pas la médiathèque et ne voient que les images des contenus auxquels ils ont accès. Vignettes, versions agrandies et accès directs appliquent les mêmes droits. Réutiliser une image ne donne accès ni aux autres fiches qui l’emploient ni à leurs usages secrets. Les noms internes et métadonnées ne doivent pas révéler un secret.

## MED-07 — Suppression et restauration

Le MJ peut sélectionner une image ou un lot à supprimer. Avant confirmation, l’écran liste les utilisations concernées, y compris dans les versions de scénarios et sessions. Retirer une association n’efface pas l’image partagée. Une image référencée ne peut être détruite définitivement avant remplacement ou détachement explicite de chaque usage, selon les droits et règles de version. Les images sans usage passent en corbeille restaurable ; la durée de conservation et la purge sont explicites. Aucun lien cassé ni effacement de contenu de jeu ne doit résulter de la suppression.

## MED-08 — Sauvegarde et import

Les exports de scénario et les sauvegardes incluent les fichiers nécessaires, leurs versions, leurs associations et leurs permissions. Restaurer ou importer un ensemble retrouve les bonnes images sans les rendre publiques. Les fichiers binaires sont stockés séparément des métadonnées et références de la base de données. Le contrôle avant ouverture signale une image absente ou inaccessible.

## MED-09 — Usage mobile et quotas

La galerie charge progressivement ses vignettes et propose une pagination ou un défilement maîtrisé. Les écrans joueurs ne téléchargent pas tous les originaux. Un échec d’image laisse le texte et les actions utilisables. L’organisateur voit le volume occupé et les limites disponibles. Les durées d’import et le chargement mobile sont mesurés sur un lot de recette représentatif.

## MED-10 — Traçabilité

Import, attribution, remplacement, retrait, suppression, restauration et purge conservent l’acteur, la date, le périmètre et les références utiles. Deux actions concurrentes ne peuvent supprimer une image pendant sa nouvelle attribution sans contrôle. Les fichiers incomplets sont nettoyés sans effacer les imports réussis. Les journaux n’exposent pas les liens privés d’accès.

## REC-11 — Importer illustrer puis supprimer

Importer ensemble vingt images valides et un fichier refusé, puis relancer sans dupliquer les réussites. Illustrer un objet, un personnage et une mission privée ; réutiliser une image sur deux fiches. Vérifier vignette, agrandissement et accès direct avec deux comptes de droits différents. Tester suppression d’une image inutilisée, blocage d’une image utilisée, remplacement contrôlé, restauration et export puis réimport. Une session déjà démarrée garde sa version tant qu’aucune propagation explicite n’est confirmée.
