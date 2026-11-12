# Postes cockpit et départs contrôlés — 12 novembre 2026

## Décision de l’organisateur

Guillaume valide les commandes sur l’ordinateur du cockpit, avec pilote désigné et activation du poste par le MJ. Le terminal prépare le vaisseau et transmet une demande lorsque la préparation est terminée. Plusieurs espaces physiques peuvent fonctionner en parallèle. Les règles de voyage et de combat restent celles des services natifs (V0.7, chapitre 22 ; CDC V3.5 §6.2).

## Parcours livré sur branche

1. Dans la régie du spatioport, le MJ peut activer les départs contrôlés. Ce réglage s’applique aux nouvelles préparations : même un ancien client ne peut le contourner en omettant l’option cockpit. Les préparations déjà engagées restent compatibles. Le terminal actuel choisit également ce parcours pour ses nouveaux vols autonomes.
2. Le pilote mandaté prépare son vol avec les contrôles existants : manifeste, carburant, PA réservé, durée PIL-02. Au terme de la préparation il demande le décollage. La demande n’ajoute aucune dépense.
3. La régie du spatioport affiche la file des demandes. Une vérification toutes les huit secondes actualise le compteur et affiche une notification lorsque le nombre augmente. Il s’agit d’une notification dans cette régie ouverte, pas d’une notification système ou d’un courriel.
4. Le MJ affecte un identifiant de poste, par exemple `cockpit-1`. Un poste ne peut accueillir deux vols actifs. Vingt identifiants de poste au maximum par session (borne technique). Le lien fixe est `/cockpit/live.html?session=SESSION&station=POSTE` ; aucune clé privée dans ce lien.
5. Sur cet ordinateur, le pilote désigné se connecte avec son propre compte. Le MJ n’est pas substitué au pilote. Le bouton Décoller demande la présence de l’équipage puis appelle la fin de préparation native, avec une nouvelle vérification serveur. PA, carburant, événements et position sont mis à jour par le moteur existant.
6. Le cockpit consulte l’état réel toutes les trois secondes. Il affiche coque, boucliers, carburant, destination, pause et rencontre. L’amarrage, les ordres du round et leur résolution passent par les commandes natives. Une embuscade opportuniste peut être préparée depuis le cockpit ; les interceptions et le début des rounds restent dans la régie des rencontres existante.
7. Le MJ peut révoquer un poste, puis réaffecter le même vol à un autre poste, y compris pendant une rencontre. Cela ne modifie pas le voyage ni les réservations. À la fin d’un voyage, le poste peut accueillir un autre équipage ; déconnecter d’abord le précédent pilote.

## Frontières de sécurité

Le lien identifie le poste, sans donner de permission. Chaque lecture recontrôle l’accès actif et le pilote mandaté. Le compte du pilote utilise la persistance de session du navigateur. Aucun dossier privé, inventaire personnel ou note MJ n’est projeté dans l’interface cockpit.

`cockpitCommand` vérifie l’affectation et exécute la commande native dans la même transaction. Une révocation concurrente provoque la reprise de cette vérification. Le client ne choisit ni son acteur ni ses droits. Identifiant de requête conservé en cas de réponse réseau perdue ; les reçus natifs empêchent les doubles dépenses. Les tirages et identifiants sont conservés lors des reprises transactionnelles.

En cas de perte de connexion ou d’autorisation, l’interface masque la projection et bloque les boutons jusqu’à une lecture valide. Pause et STOP gardent leurs règles serveur. L’annulation libère les réservations natives et invalide l’ancienne affectation.

L’affectation n’est pas une attestation matérielle : le pilote autorisé peut ouvrir le lien sur un autre appareil. L’installation physique et la déconnexion entre équipages restent sous le contrôle de l’organisateur.

## Limites de cette tranche

Les postes et vols sont indépendants : plusieurs peuvent voler et combattre en parallèle. Il n’y a pas de bouton MJ qui force plusieurs départs à la même milliseconde. Chaque pilote confirme son départ, puis les rencontres utilisent les rounds simultanés existants.

Les convois liés conservent leur ancien parcours tant que le mode contrôlé n’est pas activé ; ce mode refuse leurs nouvelles préparations jusqu’au raccordement de leur accord collectif. Détours spécialisés, renseignements d’embuscade ciblée, abordage et dépannage conservent leurs interfaces existantes. Les animations ne calculent jamais les dégâts et ne représentent pas une nouvelle simulation de pilotage temps réel.

Aucune activation de session, migration ni publication de cette tranche n’est effectuée par le développement. Le prototype autonome publié reste distinct.

## Vérification

- 88 tests applicatifs ciblés réussis : cockpit, voyages, interface, pilotage collectif, remorquage et workflow.
- 8 scénarios réussis sur mémoire et sur les émulateurs Firebase (projet fictif `demo-gn-engine`) : demande, mauvais acteur, préparation incomplète, pause, révocation, annulation, changement de carburant, double requête, poste occupé, deux vols parallèles, ordre de combat, réaffectation en vol et activation imposée au serveur.
- Compilation réussie. Deux parcours Chromium présents dans la recette : démonstration autonome et cockpit connecté (authentification et réseau simulés dans ce dernier test uniquement).
- Le navigateur local ne démarre pas : création de socket refusée par l’environnement. Résultats Chromium en CI à vérifier sur le commit exact. Aucune recette humaine ou validation sur appareils physiques revendiquée.
