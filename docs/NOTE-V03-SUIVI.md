# Reprise du développement — note Port-Brèche V0.3

Source : demande et note fonctionnelle fournies par Guilz le 20 octobre 2026, conservées dans [la note source](source/port-breche-engine-note-v03.md). Base inspectée : commit GitHub `bd670dea159c5c7f01cfe83f8fcba9b81657dd44`, version 0.20. Les statuts ci-dessous décrivent le code, pas une validation terrain. Les lots 0.22 et 0.23, publiés et vérifiés le 20 octobre 2026, ajoutent la continuité décrite dans [Campagnes](CAMPAGNES.md) et les [masters complémentaires](MASTERS.md).

## Lot 0.25 : soins, aide et pillage

Cinq profils configurables, actions sur badge, soins chronométrés, clinique accélérée avec complément sans second coût, récupération commune du patient, convalescence et aide +1 sans second PA. Pillage d’une unité, choix selon la méthode, quota par victime et rencontre, remise confirmée, objets protégés par défaut. Profils conservés dans les versions, archives et campagnes. [Guide et limites](SOINS-AIDE-PILLAGE.md) · [Validation](VALIDATION-0.25.md).

499 tests applicatifs locaux réussis. Validation Firebase et publication à confirmer. La capture complète, les effets non médicaux, les notifications et l’import XLSX de ces profils restent ouverts.

## Lot 0.24 : actions de terrain

Fouilles et installations configurables dans le scénario ou la session, QR, aperçu, présence déclarée, durée en temps de jeu, réservation des PA et du matériel, D6 serveur et bonus d’équipement. Résolution unique, interruption, récupération commune FOUILLE, réserve finie de crédits/objets/informations, sabotage, réparation et protection. Les paramètres engagés sont figés ; le résultat, les coûts et les effets sont enregistrés ensemble. Les lieux voyagent dans les archives ; réserves, plafonds utilisés et durées de panne restantes suivent les épisodes.

Les soins en deux étapes, l’aide et le pillage sont ajoutés en 0.25. Les notifications DIRECT/DISCRET restent ouvertes. Les dépendances d’installation bloquent seulement les fouilles configurées. Les onglets XLSX de terrain restent à ajouter. [Parcours et limites](ACTIONS-TERRAIN.md) · [Validation](VALIDATION-0.24.md).

Compilation et 867 tests réussis sur GitHub (476 applicatifs et 391 intégrations Firebase). Publication, fichiers XLSX et refus des commandes privées anonymes vérifiés à 13:34:23 UTC ; accueil 0.24.0 confirmé dans le navigateur. Recette mobile, multi-comptes et charge réelle toujours ouverte.

## Lot 0.23 : masters complémentaires et personnages ajoutés

Modèles XLSX CAMPAGNE et SESSION, deux exemples fictifs validés, import avec aperçu, différences, contrôles des références et médias, application atomique et journal. Les identifiants et versions des lignes suivent les épisodes. Le bouton d’ajout de personnage utilise le même parcours. Les dotations sont réservées aux personnages créés ensemble et restent immuables. Les imports de session sont réservés au propriétaire, en préparation avant le premier lancement.

Ce format couvre les catalogues déjà exécutables. Les annonces, caisses, fouilles, installations, entrepôts, vaisseaux et progression XP ne deviennent pas importables implicitement. [Contrat et limites](MASTERS.md) · [Validation](VALIDATION-0.23.md).

Compilation et 831 tests réussis sur GitHub ; publication, quatre téléchargements XLSX et refus des accès privés anonymes vérifiés à 12:53:45 UTC. Accueil 0.23.0 confirmé dans le navigateur. La recette multi-comptes et mobile reste ouverte.

## Lot 0.21 : PA et récupération des soins existants

Le tableau de bord du scénario et de la session propose « Points d’action et niveaux globaux ». Le MJ prépare une modification, relit les valeurs et les personnages concernés, puis confirme. Les interventions de session demandent un motif privé.

- Module facultatif, désactivé pour les scénarios existants tant que le MJ ne l’active pas. Valeurs proposées : niveau global 1 = 5 PA, niveau 2 = 8 PA, renouvellement complet toutes les 300 minutes de jeu, coût 1 PA, récupération 600 secondes. Aucun plafond supplémentaire n’est inventé.
- Le niveau global est indépendant des niveaux des compétences. Il peut être attribué dans le scénario ou corrigé en session. La hausse du plafond ne remplit pas les PA ; la baisse réduit le disponible sans toucher aux PA réservés.
- Renouvellement calculé sur l’horloge de session, arrêté pendant les pauses. Les cycles manqués ne se cumulent pas. Une reconnexion ne distribue rien. Le premier cycle part du début de la session ; activer en cours de jeu initialise les réserves une fois et conserve ce calendrier commun.
- Une modification de période conserve la prochaine échéance puis utilise le nouvel intervalle. À 4 h 40, passer à deux heures donne des échéances à 5 h puis 7 h. Un remplacement explicite de l’échéance exige une date future en minutes de jeu.
- Correction ou remise au plafond distincte, motivée et unique, sans déplacer l’échéance. Changer les règles ne déclenche pas de recharge supplémentaire.
- Un soin instantané existant consomme son PA, son consommable, son usage et ses effets dans la même transaction. Le dernier PA ne peut pas financer deux actions concurrentes. Un réessai réseau retrouve son résultat sans dépenser de nouveau.
- L’éditeur du soin permet récupération personnelle, récupération du patient commune à tous les soins de terrain, ou aucune récupération pour le soin en clinique. La portée est explicite ; aucun nom ou identifiant de compétence n’est deviné. Le délai de terrain ne bloque pas la clinique. Les échéances déjà déclenchées sont conservées après changement des paramètres ou du profil.
- Les écrans personnage et soins affichent la réserve et le prochain renouvellement. Les confirmations de soin montrent le coût et le disponible avant/après. Les PA privés restent absents du badge et du rôle Accueil.
- Les règles et niveaux sont copiés dans les versions de scénario et exportés/importés dans les archives existantes. Cela n’est pas encore un import Sheets de campagne ni une sauvegarde de session.

Les primitives de réservation, résolution et libération des PA sont testées, notamment à travers une échéance. Les soins restent instantanés dans ce lot : il n’existe pas encore d’action chronométrée pouvant être lancée, interrompue puis reprise. Aucun coût n’est ajouté aux paiements, remises, lectures ou déclarations de dégâts.

## Correspondance avec les exigences de la note

| Exigence | État après ce lot | Suite nécessaire |
| --- | --- | --- |
| GN-01 | Choix partie indépendante / nouvelle campagne et sessions successives | Conversion des anciennes sessions indépendantes non proposée. |
| GN-02 | Master CAMPAGNE XLSX, dictionnaire, exemple et import dans le scénario ; archives conservées | Étendre aux futurs modules et champs non encore importables. |
| GN-03 | Master SESSION complémentaire, identifiants durables, ajouts de personnages et paramètres avant jeu | Étendre aux lieux, installations, spatial et annonces. |
| GN-04 | Aperçu avant/après, versions, acquis protégés, archivage contrôlé et journal d’import | Import en cours de jeu non proposé ; sauvegarde complète distincte. |
| GN-05 | Bilan, clôture scellée, acquis conservés, reprise et verrou de campagne | Report des contrats, copie de campagne de test et états de modules futurs. |
| GN-06 | Crédits, objets, profils, PV et maintenant PA/niveau global | XP et progression de campagne, prérequis avancés. |
| GN-07 | PA, horloge, pauses, plafonds, renouvellement, soins et famille FOUILLE des actions de terrain | Raccordés en 0.25 au pillage, à la clinique et à l’aide ; autres effets à couvrir. |
| GN-08 | Réglages en session, aperçu, échéances stables, corrections | Migration explicite des actions engagées, journal consultable dédié et reçus hors réseau. |
| GN-09 | Actions de terrain avec durée, D6 serveur, bonus, réservations, interruption, effets atomiques et règles figées au lancement | Aide et clinique en deux étapes ajoutées en 0.25 ; catalogue général d’effets et reprise partielle de durée ouverts. |
| GN-10 | Fouilles à stock fini et plafonds individuels, sabotage, réparation, protection, récupération du patient et doubles dépenses contrôlées | Pillage, soins en deux étapes et aide ajoutés en 0.25 ; réserves par groupe, capture complète, DIRECT/DISCRET et effets économiques ouverts. |
| GN-11 | Marché, comptes, ventes et retrait physique existants | Gros/détail, négociation commerciale, cours, entrepôts, douanes et corruption. |
| GN-12 | Lots et remises existants | Ouverture explicite des recharges et suivi de leur stock physique. |
| GN-13 | Groupes, caisses et mandat de mission existants | Droits distincts sur les stocks, les ventes et les départs. |
| GN-14 | Annonces, candidatures, preuves et paiement personnel/collectif existants | Compléter selon la recette finale de la note. |
| GN-15 | Non implémenté | Vaisseaux et trajets ; barèmes Port-Brèche à définir avant activation. |
| GN-16 | PA, QR de lieux, liens/code manuel, actions en cours et résultats | Réorganiser les quatre espaces joueur, inventaire unifié et scan caméra intégré. |
| GN-17 | Médiathèque et images présentes en 0.19–0.20 | Activation du stockage selon sa procédure existante et recette sur les contenus réels. |
| GN-18 | Nouvelles inscriptions et invitations ; rôle précédent proposé sans accès automatique | Compléter le pack sans smartphone et la recette terrain. |
| GN-19 | PA, campagnes, masters et terrain couverts par les suites automatisées ; 867 tests réussis en 0.24 | Recette terrain, plusieurs comptes réels et charge simultanée. |

## Ordre de reprise proposé

1. Socle PA livré en 0.21 et vérifié sur Firestore/Auth : 777 tests réussis et publication contrôlée. Recette terrain encore nécessaire.
2. Continuité de campagne implémentée en 0.22 : bilan, clôture et reprise sans remettre les soldes à zéro ; voir le rapport de validation.
3. Masters XLSX et imports complémentaires implémentés en 0.23 ; compléter les nouveaux modules au fil de leur développement.
4. Exécuteur de terrain implémenté en 0.24 : fouilles, durée, D6, bonus, sabotage/réparation et réservations. Compléter avec soins en deux étapes, aide et pillage ; étendre les masters aux lieux.
5. Réorganiser les quatre espaces joueur et compléter l’économie, les entrepôts et les recharges.
6. Traiter le spatial après définition de ses règles, puis réaliser la recette terrain.

Les montants économiques, les plafonds au-delà du niveau 2, les durées du GN, la portion de billes par recharge et les barèmes spatiaux restent des décisions de jeu. Cette reprise n’en fixe aucune implicitement.
