# Soins, aide et pillage — GN Engine 0.25

## Référence et portée

Implémentation fondée sur le **Livre des règles Port-Brèche V0.3**, fichier `Port_Breche_Livre_des_regles_V0_3.docx`, version 2, modifié le 20 octobre 2026 à 10:22:53 UTC. Sections consultées : soins, capture et pillage, résolution et aide, fiches MED-02, MED-03 et TRA-02 (pages 6–8, 16 et 24–25 du rendu fourni). [Document source](https://chatgpt.com/api/library/files/libfile_575e5b6de8d88191b6274c4920b87b21/download). Le suivi moteur reste dans [la note V0.3](NOTE-V03-SUIVI.md).

Le moteur propose cinq profils configurables, sans installer automatiquement les données de Port-Brèche. Les règles existantes de PA restent inchangées : les valeurs proposées sont 5 PA au niveau global 1, 8 au niveau 2, renouvellement toutes les 300 minutes de jeu et récupération de 600 secondes. Aucun niveau global supplémentaire n’est inventé.

## Préparer les profils

Dans le scénario ou la régie, ouvrir **Soins, aide et pillage**. Créer les expertises nécessaires dans le catalogue des compétences, les publier puis les attribuer aux personnages. Le type technique de ces expertises est `PASSIVE` : leur niveau sert aux actions chronométrées. Les anciennes compétences de soin instantané ne sont pas transformées automatiquement ; retirer leur attribution si elles ne doivent plus être utilisables.

Créer les consommables (kit, bacta) et les équipements bonus, puis renseigner les profils. Le moteur vérifie les références et exige leur publication pour publier un profil. La clinique nécessite une autre cible, une expertise et les prérequis configurés. La présence dans la clinique équipée est déclarée par les participants ; il n’existe pas encore de validation d’installation par un second QR.

| Profil | Réglage Port-Brèche à saisir | Résultat |
| --- | --- | --- |
| Soin de terrain / MED-02 | Niveau minimal 1 ; 120 s aux niveaux 1–2, 90 s aux niveaux 3–4, 60 s au niveau 5 ; 1 PA et 1 kit ; +1 PV ; réveil dès le niveau 2 | Sans dé. Réveil depuis 0 PV avec 600 s de convalescence. Le patient attend 600 s entre deux réussites de ce type, tous soignants confondus. |
| Clinique sûre / MED-03 | Niveau minimal 2 ; MED-02 niveau 2 en prérequis ; 300 s ; 1 PA, 1 kit et 1 bacta | Sans dé. Retour aux PV maximum et fin de convalescence. |
| Clinique accélérée / MED-03 | Même expertise, prérequis et fournitures ; 180 s ; seuil standard 6 ; complément 120 s | D6 + niveau + matériel + aide. Réussite : soin complet. Échec : complément sans second jet, PA ou consommable ; soin complet à son terme. |
| Fouille ordinaire | Sans expertise ; 60 s ; 1 PA ; récupération FOUILLE 600 s | La victime choisit une unité pillable. |
| Fouille méthodique / TRA-02 | Expertise requise ; 120 / 120 / 90 / 90 / 60 s selon le niveau ; 1 PA ; récupération FOUILLE 600 s | Le fouilleur choisit une unité parmi les seuls biens pillables après la durée. |

Les soins n’imposent pas de récupération personnelle au soignant ou à son aide. Le délai du patient après MED-02 n’empêche pas la clinique, et une clinique ne l’efface pas. Ce délai partage le stockage déjà utilisé par les anciens soins configurés avec une récupération « patient ».

Les durées, seuils, prérequis, quantités, coûts et délais sont configurables. L’éditeur accepte jusqu’à trois fournitures distinctes. Un seul équipement bonus peut être choisi, plafonné à +2. Les valeurs engagées sont figées au lancement ; modifier un profil règle les prochaines actions.

## Parcours joueur

Depuis **Mon personnage → Soins, aide et pillage**, coller le lien du badge rencontré. Ouvrir le QR avec le téléphone permet aussi de passer du badge public au bouton **Soigner ou fouiller ce personnage**. Le badge ne publie aucun inventaire, PV, compétence ou secret supplémentaire. L’action exige une attribution et un accès actif dans la même session.

1. Choisir le protocole, les lots de fournitures, éventuellement le matériel bonus et l’offre d’aide.
2. Relire l’aperçu et confirmer la présence. Le moteur réserve les PA et les lots, puis verrouille l’acteur et la cible.
3. Jouer la durée annoncée. Les pauses de session arrêtent ce temps. Seul l’acteur peut résoudre l’étape à son terme.
4. Le serveur applique ensemble le résultat, les coûts et les effets. Un double clic ou réessai réseau ne donne ni second soin, ni seconde consommation, ni nouveau jet.

Un patient ne peut pas recevoir simultanément un autre soin, y compris par l’ancien parcours. Le soin sur soi est limité au soin de terrain, au-dessus de 0 PV et hors convalescence. Celle-ci bloque les compétences actives couvertes par le moteur ; l’interdiction de combattre reste une règle de terrain. Le retour en combat respecte aussi le réglage de session « PV positifs » ou « décision MJ ». Le MJ peut lever explicitement la convalescence depuis la correction de santé, avec un motif.

### Interruption et clinique accélérée

Avant la résolution : interruption par l’acteur, la cible, l’aide engagée ou le MJ, libération des PA et fournitures réservés. Aucun délai de récupération n’est déclenché.

Au premier jet de clinique accélérée, le PA, le kit et le bacta sont consommés, réussite ou échec. Après échec, l’acteur, le patient et l’aide restent engagés pendant le complément. Une interruption à ce stade ne rembourse rien et ne soigne pas. Le résultat garde le premier jet ; la fin du complément est signalée séparément. L’équipement non consommable est libéré après ce premier jet.

Le serveur ne déduit pas la présence réelle, le départ d’une aide ou une interruption de scène. Les participants doivent les déclarer. Une perte d’accès ou une condition devenue invalide bloque la résolution ; le MJ peut libérer l’action.

## Aide entre personnages

L’aide ouvre le badge de l’acteur et propose une expertise depuis son écran. L’acteur sélectionne cette offre avant de commencer une action spécialisée à D6 : fouille, sabotage, réparation ou clinique accélérée. Une seule aide compétente donne **+1**, sans second PA ni consommable. Niveau, prérequis, santé, disponibilité et récupération sont contrôlés.

L’aide reste indisponible pour une autre compétence. Elle peut retirer une offre libre ou interrompre l’action déjà aidée. Après résolution, elle subit la même récupération que l’acteur, sauf exception médicale. Elle ne reçoit pas automatiquement les informations ou récompenses découvertes. Les offres non utilisées restent disponibles jusqu’au retrait ; elles ne sont pas reportées dans l’épisode suivant.

## Pillage et remise

La cible doit être hors combat ou avoir confirmé sa capture. La fouille reste verbale ou numérique, à l’abri selon les règles de scène. Aucun objet personnel réel n’est fouillé ou confisqué par l’application.

Par défaut **aucun bien n’est pillable**. Cocher « Pillable » dans un modèle affecte les attributions futures. La régie permet de corriger un lot existant disponible avec un motif. Le joueur voit ce statut dans son sac. Les crédits ne figurent jamais dans le choix. Les biens prêtés ou dont le personnage n’est pas à la fois propriétaire et détenteur, les lots réservés et les objets protégés sont exclus.

La durée achevée consomme le PA et déclenche FOUILLE, délai partagé avec les fouilles de lieux. Sans bien disponible, l’action se termine sans prise. Sinon, le choix est réservé à la victime pour la fouille ordinaire et au fouilleur pour TRA-02. Le choix ne révèle que les noms des biens pillables.

**Une unité par victime et par rencontre, tous adversaires confondus.** Convention d’exécution : ce quota est engagé au choix de l’unité et reste engagé si la remise est interrompue ensuite. Cette convention évite les annulations successives pour sonder ou renouveler le choix. La victime confirme la remise de l’objet de jeu ; une unité devient alors disponible dans le sac du fouilleur. Les quantités, provenance et historique sont conservés lors du fractionnement d’un lot.

### Rencontre et capture

La victime déclare sa capture ou sa liberté sans poursuite. Le délai de nouvelle rencontre exige 30 minutes **réelles** de liberté ; la pause de session ne l’arrête pas. Une nouvelle capture ou une blessure qui met hors combat interrompt ce délai. Une capture déclarée dispose d’une échéance de 20 minutes réelles, conservée en cas de recapture dans la même rencontre.

Ce dispositif ne constitue pas le système complet de capture du livre : poursuite réelle, consentement de scène, durée totale depuis l’incapacité, protection contre les mêmes ravisseurs et secours commun restent à arbitrer sur le terrain. Le moteur n’enregistre pas encore l’identité des ravisseurs. Le statut de capture déclaré ne remplace jamais les règles de confort.

## Persistance et contrôle

Profils copiés dans les versions figées, les nouvelles sessions, les archives de scénario et les épisodes de campagne. Les anciens fichiers sans profils restent compatibles. Les interactions ouvertes, même sans PA ou après consommation du PA, empêchent la clôture de campagne et l’archivage. La régie permet de les interrompre explicitement.

Les acquis et lots suivent la campagne. La convalescence restante est reportée avec la politique « conserver les blessures » et effacée avec « restaurer ». Actions ouvertes, offres d’aide et rencontres ne sont pas transférées ; une clôture exige d’abord de résoudre les actions. Les historiques restent dans l’épisode source.

Depuis la 0.26, les profils sont importables dans l’onglet Interactions des [masters XLSX](MASTERS.md). Les notifications DIRECT/DISCRET, diagnostic, antidotes, secours commun, progression XP, capture complète et reçus utilisables hors connexion restent à développer. L’interface affiche jusqu’à 100 interactions personnelles récentes. Le panneau MJ montre les interactions ouvertes ; les résultats médicaux apparaissent également dans l’historique de santé.

## Recette terrain à réaliser

Tester avec plusieurs téléphones : soignant, patient, aide et MJ ; perte de réseau pendant la résolution ; pause en plein protocole ; remise réelle d’un objet ; participant révoqué en cours d’action. Les tests automatisés n’établissent pas la fluidité du jeu à 60 connexions ni la qualité des consignes jouées.
