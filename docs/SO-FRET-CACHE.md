# Fret caché et inspections — composant préparatoire

État du 4 novembre 2026. Source métier : règles SPACE OUTLAWS V0.7, chapitre 24, [texte du projet](source/SO_Regles_V07.txt). Base vérifiée b4b21f54c9bc21f8696e90be0c6081d352d0f675, [CI 41818695160](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41818695160) réussie.

Ce lot prépare le serveur. hiddenCargoVersion=1 n’est ajouté à aucun manifeste ni à aucune naissance. MOD-04 reste preparationOnly ; publication, commerce, mandat de montage et profil/vol le refusent. Aucun nouvel écran public. Les tests utilisent une session et du fret chargés par les commandes natives, puis un module/lot monté et un marqueur synthétiques. Ils ne démontrent pas un équipement MOD-04 jouable.

## Stock et droits

Le propriétaire personnel du vaisseau peut dissimuler ses lots disponibles déjà dans la soute, à quai à la même escale, sans contrat de transport ni garde d’abordage. Le compartiment doit correspondre à un lot individuel MOD-04 réellement référencé, INSTALLED, quantité 1, propriété/calibration/emplacement/réserves cohérents. Volume caché 5 sur cargo, 10 sur transport ; capacité totale inchangée 20/50. Pas d’argent, PA ou marchandise créés.

L’API traite un lot entier. Pour une partie, utiliser d’abord le fractionnement du transfert natif. hiddenCargo conserve le vaisseau, la dissimulation et la découverte. Retirer/replacer ne supprime pas discovered/discoveredAt. Une réception de transfert retire concealed, une annulation le conserve ; les lots fractionnés conservent découverte, propriété et provenance. La manutention d’abordage ordinaire refuse un lot dissimulé inconnu même avec attestation MJ.

## Agents et contrôles

La régie attribue/révoque une habilitation N0–N5 avec motif et révision (0 = retirée). N1–N5 n’est ni une classe ni une compétence/XP. Le joueur agit personnellement ; un PNJ sans joueur assigné agit sous régie, au port de son poste. Dossier dans shipMaintenance, exclus des réparations ordinaires ; verrous natifs du vaisseau et de l’agent.

| Contrôle | Temps de jeu | PA | Résultat |
| --- | --- | --- | --- |
| ORDINARY | 120 secondes | 0 | Attestation documentaire, aucune nouvelle révélation ; lots déjà découverts visibles |
| DEEP joueur | 120 secondes | 1 réservé puis consommé | D6 serveur + niveau ≥ 7 ; découverte persistante des lots dissimulés |
| DEEP PNJ | 120 secondes | 0 | Même seuil, habilitation et durée |

Le contrôle ordinaire de ce composant ne valide ni contenu du manifeste, ni licence, ni authenticité, ni taxe. La découverte ne donne pas un code de coffre et ne révèle aucun autre secret. Aucun débit, saisie, amende ou changement de propriété automatique.

Une tentative approfondie par vaisseau et escale, agents confondus. Changer d’agent ne relance pas le dé. Une nouvelle autorisation MJ exige un motif (indice nouveau/décision), puis la prochaine tentative la consomme. L’identifiant d’escale est le voyage natif arrivé ; pour l’escale initiale, il est lié au vaisseau. Une annulation avant résolution ne consomme pas la tentative.

Présence et réalisation explicites, délai non automatique, réserve PA et verrous libérés atomiquement. Annulation rend le PA dans le plafond, même après renouvellement ; le MJ peut restituer après révocation, sans finaliser pour un joueur. PAUSE/STOP figent les délais. Droits/habilitation/marqueur sont vérifiés avant les anciens reçus. D6 calculé une fois pour la résolution, stable pendant les reprises transactionnelles ; réessai n’en produit pas un nouveau résultat.

## Limites avant ouverture

Le retrait après vidage explicite est maintenant raccordé au composant décrit ci-dessous. Il reste à raccorder le profil et le vol équipés MOD-04, la visibilité pendant une neutralisation, l’interface propriétaire/douane/régie, puis une ouverture versionnée cohérente sur nouveaux manifestes seulement. En panne MOD-04 : nouveau rangement sans capacité ; contrôles refusés par HIDDEN_CARGO_OUTAGE_NOT_OPEN, données conservées. Aucun comportement de découverte en panne n’est supposé.

Les tests ne constituent ni une recette humaine Android/iOS ni une régression globale. Profil ciblé hidden-removal : 64 fichiers applicatifs, 37 suites Firestore, treize HTTP, aucun Chromium. CI du commit exact consignée dans la PR #2 avant tout prochain lot. Aucun déploiement ou fusion main.

## Retrait après vidage — 4 novembre 2026

Le devis MOD-04 n’est utilisable que pour REMOVE avec le marqueur de composant courant ; INSTALL reste refusé. Dossier et binding portent hiddenCargoVersion=1, jamais ajouté aux manifestes. Contrôle de chaque lot encore concealed dans le HOLD correspondant, même connu ou appartenant à quelqu’un d’autre. Les propositions, accords, démarrages et ultimes confirmations réutilisent le même validateur.

Vider par un transfert natif vers le sac, ou par la sortie explicite du compartiment vers la soute ordinaire via setCargoConcealment(false), sous droits et présence existants. Aucun stock créé ou détruit, découverte conservée. Une cargaison ordinaire peut rester dans la soute ; elle ne remplit plus le compartiment. Aucun champ « contenu consigné », aucune nouvelle procédure de consignation. Les opérations de cargaison ouvertes bloquent le retrait.

Nouveau consentement personnel propriétaire/Mécano, port et atelier, MEC-03 N2. Cinq minutes de jeu et 1 PA, module/PA réservés, verrous natifs. PAUSE/STOP figent le temps, aucune fin automatique. Le Mécano confirme l’opération réellement effectuée ; le propriétaire ou la régie ne le remplace pas. Même exemplaire rendu au propriétaire, profil restant recalculé sans rendre de points, fret/autres modules/découvertes conservés. Annulation garde le module monté et rend le PA dans son plafond ; régie possible après révocation. Réserves étrangères et panne active refusées. Modification du contenu pendant le travail ferme la finalisation, même sans révision du vaisseau modifiée.

Douze cas partagés supplémentaires, un UI et un sélecteur ; HTTP/Auth étendu au refus compartiment plein puis vidage et retrait complet/reçu unique. Le module/lot monté est synthétique en tests. Le vol nu après retrait et la conservation d’un autre module passent par les consommateurs natifs. Local : build et 813/813 ciblés, aucune régression intégrale ou recette humaine.
