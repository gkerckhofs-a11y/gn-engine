# Actions de terrain — GN Engine 0.24

20 octobre 2026. Ce guide décrit le code de cette version. Source fonctionnelle : [note Port-Brèche V0.3](source/port-breche-engine-note-v03.md), GN-07 à GN-10. Les paramètres proposés dans les formulaires servent à préparer un scénario ; ils ne constituent pas une nouvelle validation des barèmes du GN.

## Préparer les lieux

Depuis un scénario ou une régie de session, ouvrir **Fouilles et installations**. Le propriétaire et les MJ habilités pour la session peuvent préparer ses lieux. Le rôle Accueil et les joueurs n’accèdent pas à cet éditeur.

Créer un **lieu de fouille** ou une **installation**. Renseigner son nom, sa description publique, les notes privées MJ et sa publication. Une installation possède un profil Saboter et un profil Réparer. Un lieu de fouille possède un profil Fouiller et peut dépendre d’une installation en service.

Chaque profil règle :

- La compétence requise et son niveau minimum, ou une action commune sans compétence. Les compétences de terrain utilisent les expertises `PASSIVE` déjà attribuées aux personnages ; les soins actifs existants gardent leur parcours.
- La consigne immersive, la durée de base et des durées par niveau, par exemple `1:60;2:30`. Une valeur absente utilise la durée de base.
- Une résolution automatique ou un test **1D6 + niveau de compétence + un bonus matériel, compris entre 0 et 2**, avec un seuil explicite. Le niveau global ne s’ajoute pas au jet. Sans compétence requise, le terme compétence vaut zéro.
- Le coût en PA et la récupération. Les champs vides utilisent les règles de session ; sans module PA, le coût est nul. Une récupération explicite de zéro est possible. Les paramètres déjà engagés restent figés au lancement.
- Les objets compatibles et le bonus propre à chacun. Le joueur choisit un seul lot. Il doit en être propriétaire, détenteur, et l’avoir dans son sac. Un achat en attente de retrait n’est pas utilisable.
- Un consommable facultatif et sa quantité. Il est consommé à la résolution, réussite comme échec. Le même lot peut servir de matériel bonus et de consommable s’il remplit les deux conditions.
- Les textes de réussite et d’échec.

Le matériel et les connaissances proviennent des catalogues existants. Un profil publié doit référencer des éléments publiés. Aucun texte libre ou formule de tableur n’est exécuté comme du code.

## Constituer une réserve de fouille

Chaque contenu possède un identifiant durable, un type, une quantité par découverte, un nombre de découvertes disponibles et un plafond par personnage. Types disponibles : crédits, objet, information.

Une réussite attribue le premier contenu encore accessible dans l’ordre de configuration. Par exemple, quantité de 10 crédits et réserve de 3 découvertes représentent 30 crédits finis. Chaque attribution retire une découverte de cette réserve et inscrit le mouvement dans l’historique économique. Les informations déjà reçues ou retirées par un MJ ne sont pas distribuées à nouveau par cette fouille.

Les stocks sont créés une seule fois à la création de la session ou du nouveau lieu. Dans une session existante, les contenus et leur nature sont immuables : le bouton **Réapprovisionner** ajoute un nombre explicite de découvertes, avec motif et révision contrôlée. Cette opération ne remet pas à zéro les plafonds déjà utilisés par les personnages. Pour un nouveau contenu ou un nouvel événement de découverte, créer un nouveau lieu identifié.

Les réserves sont globales, avec plafonds individuels ; les réserves par groupe et le tirage aléatoire entre plusieurs contenus ne sont pas implémentés dans cette version. Limites : 100 lieux par destination dans l’éditeur, 20 contenus par lieu, 1 000 000 de découvertes restantes au maximum par contenu.

## Utiliser le QR et lancer une action

Dans la régie, **Afficher le QR** fournit le lien, le code du lieu et un PNG téléchargeable. Le joueur scanne avec l’appareil photo de son téléphone ou utilise **Actions de terrain** dans sa fiche pour saisir le lien ou le code. Le lien doit désigner un lieu de sa session.

Le QR ne donne ni la réserve cachée, ni les notes MJ, ni une fiche de personnage. L’accès requiert une inscription acceptée, une attribution active, un compte Google vérifié et une fiche publiée.

Le joueur choisit l’action et le matériel, lit l’aperçu, puis confirme sa présence. Le serveur réserve ensemble : personnage, lieu, PA et lots de matériel. Une seule action de terrain peut être engagée par personnage et par lieu. Un lot réservé ne peut pas être vendu, transféré ou consommé dans un autre parcours. La réservation porte sur le lot entier, même si seule une unité doit être consommée.

**Mes actions de terrain** affiche le temps restant. La résolution n’est pas automatique à la fin du compte à rebours : le joueur confirme qu’il est toujours présent et qu’il a exécuté la consigne. Le serveur vérifie sa propre horloge et les conditions actuelles ; le compte à rebours du téléphone n’est qu’une aide visuelle. Une pause de session suspend les durées, les protections et la récupération.

Le D6 est tiré côté serveur. Coût, consommable, résultat, récupération et effets sont enregistrés ensemble. Le résultat montre le dé et le détail du calcul, avec une courte animation respectant la préférence de réduction des animations. Actualiser, double-cliquer ou réessayer après une perte réseau ne donne pas un second résultat.

Toutes les fouilles de lieu partagent la famille **FOUILLE**. Les autres profils utilisent la compétence requise comme famille, ou leur type d’action sans compétence. La récupération commence à la résolution, réussite comme échec. Les autres parcours du moteur ne sont pas encore tous raccordés à ces familles.

## Interrompre et récupérer

Avant résolution, le joueur peut interrompre avec un motif. Les PA et lots réservés sont libérés ; aucun jet, effet ni récupération n’est appliqué. Recommencer demande une nouvelle durée complète, sans reprise partielle du temps écoulé.

Après révocation, blessure bloquante, modification des conditions ou déconnexion durable, le MJ peut libérer l’action depuis la liste des actions en cours. La réservation ne s’annule pas simplement en fermant un onglet. Les actions non résolues bloquent l’archivage et le scellement de campagne, même si les PA sont désactivés. Une session terminée permet encore l’interruption, mais pas une nouvelle résolution.

Une régénération avec un PA réservé conserve cette réservation : plafond 5, réservation 1, disponible 4. Annuler libère le PA jusqu’au plafond ; résoudre le consomme. Modifier un réglage ne transforme pas cette réservation en crédits de PA supplémentaires.

## Saboter et réparer

Un sabotage réussi fait passer une installation en **hors service**. La panne peut être permanente jusqu’à réparation, ou prendre fin après une durée configurée de jeu. L’expiration est calculée lors des consultations et des actions ; aucun navigateur ouvert n’est nécessaire pour faire avancer l’horloge serveur.

Une réparation réussie remet l’installation en service et peut créer une protection temporaire contre un nouveau sabotage. Un échec technique peut verrouiller la cible pour tous pendant un délai configuré ; la valeur proposée est 300 secondes. Les délais de cible sont distincts de la récupération du personnage.

Dans cette version, la conséquence automatique d’une panne est le blocage des **fouilles explicitement dépendantes**. Les achats, entrepôts, voyages, douanes et autres fonctions économiques ne sont pas encore raccordés à ces installations. Le MJ peut gérer leurs conséquences narratives avec les outils existants.

## Versions, imports et campagne

Les lieux sont inclus dans les versions figées et dans les archives `.gnscenario.zip`. Les anciennes archives sans lieux restent lisibles. Modifier le scénario ne change pas une session déjà créée.

L’épisode suivant conserve les réserves restantes et les plafonds utilisés. Il conserve aussi les pannes et protections avec leur temps de jeu restant : une panne avec dix minutes restantes repart avec dix minutes, sans s’écouler pendant les semaines entre deux événements. Les récupérations personnelles repartent au nouvel épisode selon la règle de campagne existante. Les résultats et journaux restent consultables dans leur session d’origine par les organisateurs habilités ; l’écran joueur liste ses actions de l’épisode courant.

Les masters Excel 0.23 restent compatibles. Les lieux, leurs profils et leurs réserves se configurent **dans l’éditeur de terrain**, pas encore dans de nouveaux onglets XLSX. Un complément de master doit cependant préserver les références des lieux déjà présents : il ne peut archiver silencieusement un objet requis par un lieu publié.

## Limites de ce lot

Ce lot ne comprend pas l’aide entre personnages, le pillage de personnages, les notifications DIRECT/DISCRET, les soins MED-03 en deux étapes, les états de capture, la progression XP ni un catalogue général d’effets. Les soins déjà présents restent instantanés. Un seul matériel bonus est pris en compte ; le terme aide vaut zéro.

La présence est déclarée par le joueur, pas prouvée par la géolocalisation ni par un QR photographié. Le jeu physique et la remise des accessoires restent supervisés sur place. Pas de mode hors connexion ni de scan caméra intégré à l’application dans cette version. La recette sur comptes réels, sur mobile et sous charge simultanée reste distincte des tests automatisés.
