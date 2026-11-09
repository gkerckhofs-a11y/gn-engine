# Space Outlaws — ROG-02 : première tranche jouable
Date : 9 novembre 2026. Références : `docs/source/SO_Regles_V07.txt`, chapitre Rogue ; CDC V3.5 §4.4, §5.1 ; matrice REC-SO-06/07.

## Portée
Capacité `pickpocketVersion=1` seulement sur les nouvelles publications de Master et leurs sessions. Une session ancienne sans ce marqueur est fermée. L'objet du Master peut être configuré « volable à la tire » indépendamment de `pillable` ; ancien stock non réécrit. Le vol ne porte que sur une unité explicitement éligible, disponible dans le sac du personnage ciblé, jamais sur les crédits, objets cachés, kits de naissance protégés ou lots non transférables.

## Procédure
Le Rogue doit être en jeu au poste organisation, scanner/coller le badge public de sa cible et saisir prénom + nom fictifs. Le serveur vérifie les champs contre la candidature actuelle, sans révéler les données du personnage. Erreur de nom : aucune tentative comptée pour la victime et aucun PA dépensé, mais récupération personnelle de 10 minutes. Après validation, un PA est réservé, pas consommé ; durée selon niveau 60/45/45/30/30 secondes de jeu. Annulation avant résolution : libération du PA et du verrou, aucun quota. Après résolution : deux tentatives au maximum par victime dans la session, tous Rogues confondus, et succès unique ; récupération 10 minutes même à vide. À vide, le PA est restitué. À N1–2, un type est tiré de manière déterministe à partir de l'identifiant serveur de la tentative (non contrôlé par le joueur). À N3–4, le choix est parmi deux types éligibles au maximum ; à N5, parmi tous. Un seul type passe automatiquement. La liste des types n'est projetée qu'après la durée prescrite.
Le succès déplace une unité en une transaction, consomme 1 PA et crée une notification sans identité de voleur, visible après 10 minutes de jeu. L'absence est visible immédiatement dans le sac. Les tentatives et ressources sont journalisées dans des collections distinctes ; les reçus empêchent les doubles mutations.

## Limites et vérifications avant partie
Le service n'atteste **pas** physiquement qu'un smartphone se trouve au local organisation : la case d'attestation est une consigne de jeu, pas une preuve de géolocalisation ou de scan. Les objets/accessoires réels ne doivent être marqués volables que si le MJ a prévu une remise physique discrète, sûre, et un protocole de non-utilisation avant remise. Le nouveau drapeau est éditable dans les formulaires web ; les colonnes des anciens fichiers Excel M1 ne sont pas modifiées et une valeur existante reste préservée lors de l'import. Une notification est consultable dans l'espace « Action » et non envoyée en push.
Ces limites doivent être vérifiées lors de la recette humaine. Ne jamais déclarer un GN prêt sur la seule base de tests CI.

## Contrôle
Tests dédiés : `test/space-pickpocket.test.mjs` et `test/space-pickpocket-ui.test.mjs` ; même suite métier sur émulateur via `space-pickpocket`. Le profil CI `[ci targeted:rogue-pickpocket]` reprend le profil `episode-master` pour ne pas masquer les changements Master antérieurs non validés, et ajoute les suites inventaire/terrain et ROG-02.
