# Recette STARFIGHTER · 22 novembre 2026

## Reproduction

Utiliser Node 22, Java 21 et un checkout du SHA de la PR. Installer les dépendances avec `npm ci`, lancer `npm run build` et générer l’entraînement avec `node scripts/starfighter-demo.mjs`. Le guide du joueur est dans `docs/SO-STARFIGHTER-COCKPIT.md`.

- Mémoire : `node --test test/starfighter-*.test.mjs test/cockpit-launch.test.mjs test/space-combat-state.test.mjs test/galactic-map.test.mjs`.
- Firestore : `GN_FIRESTORE_SUITES='["starfighter-navigation","starfighter-encounter","starfighter-fleet","cockpit-launch"]' npm run test:emulator:firestore`. Le projet des émulateurs est `demo-gn-engine`.
- Navigateur : `npm run test:recette:browser -- --grep 'STARFIGHTER|Cockpit|cockpit'`. Les captures de l’entraînement vont dans les pièces jointes de la recette Playwright.
- En CI, les profils starfighter-training, starfighter-navigation, starfighter-encounter puis starfighter-fleet conservent le périmètre cumulé. La PR consigne les SHAs, exécutions et résultats externes.

## Exécution locale sur données synthétiques

Le 22 novembre : build réussi avec Node 24.22.3. Profil applicatif cumulé : 251 tests réussis. Un parcours HTTP avec Auth émulée a vérifié la lecture par le pilote, les refus anonyme et tiers, le réseau vide sans code et le refus du réglage de régie par le pilote. Les sept parcours dédiés des suites starfighter-navigation, starfighter-encounter et starfighter-fleet passent également sur l’émulateur Firestore 1.22.0 avec Java 21 (sept réussites, zéro échec). Ils couvrent la réservation concurrente, le second départ, la négociation, le duel, la résolution concurrente, les quatre postes, le STOP, la révocation, le changement de pilote et la fermeture du poste archivé. Le démarrage local de Chromium a échoué à la création de son socket. Le résultat navigateur provient de la CI lorsqu’elle a terminé le parcours sur le SHA indiqué dans la PR.

## Essai à deux puis quatre PC

Dans une session fictive préparée, affecter chaque pilote à un vaisseau, donner les routes prévues et charger du carburant. À la régie du spatioport, saisir le nombre d’ordinateurs physiques et cocher le combat immersif. Sur un seul poste libre, deux préparations simultanées doivent aboutir à une seule réservation. Les pilotes distincts ouvrent leurs postes et vérifient le manifeste.

Faire décoller les deux équipages et armer une embuscade native sur la même liaison. Vérifier la négociation, la paix unanime ou le passage au combat. Tester une pause en négociation et une autre en round. Soumettre deux ordres différents. Chaque pilote doit voir son propre ordre avant résolution. Couper la liaison d’un poste, laisser l’autre atteindre l’échéance et rouvrir le premier. Comparer les journaux et la télémétrie avec la régie. Révoquer le poste et essayer une commande depuis un ancien écran. Refaire le parcours avec deux alliances à deux vaisseaux sur une version prenant en charge les duels d’alliances. Pour une escale, comparer le carburant et les PA avant et après chaque confirmation.

## Critères et preuves

Statuts fondés sur les essais du moteur avec données synthétiques. Le matériel du site et la recette humaine restent à éprouver. Les suites sont dans `test/` et `test/support/`.

| ID | État | Preuve et portée |
|---|---|---|
| AC-01 | OK en test automatisé | starfighter-training contrôle les entrées, la pause et l’émission locale. Recette navigateur dédiée. |
| AC-02 | OK en mémoire | cockpit-launch et starfighter-navigation refusent un autre pilote. |
| AC-03 | OK en mémoire | Cent salves simulées. Le module de visée ne possède aucun client d’API. |
| AC-04 | OK sur émulateur | starfighter-encounter vérifie 90 secondes, deux ordres et un seul round résolu. |
| AC-05 | Partiel | Le journal natif contient tirs et dégâts. Un test de présentation distingue tir manqué, défendu, bouclier et coque. Les effets utilisent l’état confirmé du round et la télémétrie précédente. Inspection humaine des effets à faire. |
| AC-06 | OK côté moteur | cockpit-launch couvre révocation et pause ; les suites natives couvrent STOP et refus. |
| AC-07 | Partiel | Double demande de départ et résolution concurrente testées. Perte réelle du réseau sur PC à recetter. |
| AC-08 | OK sur émulateur | starfighter-encounter utilise deux identités ; starfighter-fleet utilise quatre postes distincts et vérifie les projections. |
| AC-09 | OK en régression ciblée | cockpit-launch et cockpit historique. Opt-in par session et marqueur de poste. |
| AC-10 | Non testé · hors mission | Aucun bonus d’adresse ni activation arcade. |
| AC-11 | OK en mémoire | starfighter-training teste destination, trajet et amarrage. HTML autonome reproductible. |
| AC-12 | OK en mémoire | Trois tronçons, deux escales, préparation et décollage distincts. |
| AC-13 | OK côté moteur | galactic-map et starfighter-navigation couvrent PIL-01, code personnel, réseau vide et refus d’un autre équipage. |
| AC-14 | OK sur émulateur | Attribution du poste, PA réservé, départ rejoué une fois et course à un poste. |
| AC-15 | OK côté moteur | space-outlaws-voyages contrôle 300/600/900 secondes ; aucune commande de passage de scène dans le parcours connecté. |
| AC-16 | OK en mémoire | Interception native, négociation, paix et reprise ou round ; les incidents scénarisés gardent leur procédure native. |
| AC-17 | OK sur émulateur | Amarrage explicite par cockpitCommand après le délai natif. |
| AC-18 | OK en mémoire | Stock fini de démonstration ; préparation au quai et aucun carburant créé par la carte connectée. |
| AC-19 | OK en architecture et tests ciblés | Entrées et scripts distincts, aucun import Firebase dans l’entraînement. Bandeaux distincts. |
| AC-20 | Partiel | Les lectures de poste et les reçus natifs reconstruisent le vol. Reprise simultanée de quatre navigateurs après coupure à vérifier sur place. |

## Limites de reprise

Une recherche automatique d’embuscade est déclenchée par un poste actif. Si tous les navigateurs sont fermés, aucune tâche d’arrière-plan ne joue à la place des pilotes. Le prochain poste autorisé fait constater l’échéance par le serveur. Le mode QR peut exiger une nouvelle présence physique au terminal du spatioport. Aucune destination ni liaison n’est fabriquée : la carte native actuelle exploite les codes présentés et les analyses acquises. La dotation narrative en dossiers des 30 planètes dépend des données et des modules de connaissance de la session.

Pour revenir au fonctionnement historique, désactiver les nouveaux départs automatiques dans la session de test et décocher le combat immersif. Les réservations et voyages en cours doivent être terminés ou annulés par les mécanismes natifs. Toute mise en service réelle demande une décision distincte.

## Duel arcade à deux postes

Depuis la branche de la PR, lancer `node scripts/starfighter-duel.mjs` (Node 22+, aucune dépendance). Ouvrir les deux invitations affichées dans deux navigateurs. Chaque lien donne le contrôle d’un seul cockpit. Le serveur calcule mouvements, collisions et dégâts à 20 Hz. Une déconnexion suspend la simulation et les anciennes entrées expirent. Relancer le processus pour créer une autre paire d’invitations.

Pour deux ordinateurs sur le même LAN, fournir un certificat TLS reconnu par les deux postes et son fichier de clé au serveur de test. Exemple de lancement sous bash, avec le nom DNS local correspondant au certificat :

```bash
DUEL_HOST=0.0.0.0 DUEL_ORIGIN=https://cockpit.example.test:8787 \
DUEL_CERT=cert.pem DUEL_KEY=key.pem node scripts/starfighter-duel.mjs
```

Le navigateur demande la caméra et le micro au décrochage. Liaison WebRTC directe sur le LAN. Pas de relais TURN. À deux liaisons confirmées, le délai de parole est de 90 secondes. Sans liaison, le délai de réponse est de 30 secondes. Une rupture explicite ouvre le feu, une paix bilatérale termine la rencontre. L’exercice démarre avec 30 points de protection et 4 points de coque.

La page autonome `dist/starfighter/duel.html`, générée avec `node scripts/starfighter-demo.mjs`, permet de tester le pilotage contre un adversaire simulé. Le test à deux navigateurs est reproductible avec `node scripts/test-starfighter-duel-browser.mjs` après installation du Chromium Playwright ; CHROMIUM_PATH peut désigner un exécutable local.

### Lecture des instruments dans le duel

L’horizon artificiel suit le tangage et le roulis. Le cap, la vitesse et le radar se lisent depuis le siège occupé. Les trois anneaux autour du plan de coque indiquent la charge globale des boucliers ; les quatre segments mesurent l’intégrité de la coque. L’optique ×4 agrandit le contact lorsqu’il apparaît dans la verrière. Les salves orange suivent les projectiles de la simulation.

Dans le test Chromium à deux postes, contrôler la rotation de l’horizon, le rendu du vaisseau sous deux angles, le tir orange dans l’axe, puis le passage de trois boucliers à zéro avant le premier dégât de coque. La visio est exercée avec des périphériques simulés.

### Élimination et réglage de la vitesse

À la perte du dernier point de coque, le vaisseau disparaît de la verrière et du radar. Depuis l’autre poste, l’explosion apparaît à sa dernière position et dans l’optique si le contact est en vue. Le cockpit éliminé montre la lueur de l’impact et les fissures sur la verrière. L’effet s’éteint après 2,2 secondes. Avec la préférence de mouvement réduit, le résultat final apparaît immédiatement. Une reconnexion reprend l’état du duel et son temps écoulé.

Pendant les pourparlers et le combat, utiliser la manette de poussée pour fixer la vitesse voulue entre 0 et 120 m/s. Vérifier la vitesse mesurée pendant l’accélération, le freinage jusqu’à l’arrêt, la reprise manuelle avec Z ou S et la remise à zéro sur un nouvel exercice.

Essai du 23 novembre sur le commit `1cffab1` : build et 258 tests applicatifs ciblés réussis. Dans Chromium, deux postes ont vérifié la commande indépendante de vitesse, le passage par zéro, l’impact fatal depuis chaque siège et la reconnexion après la dissipation de l’effet. Le parcours solo a vérifié la paix, le rejeu pendant l’explosion et la préférence de mouvement réduit. Le HTML autonome a également répondu au toucher simulé à 390 px.


## Pilotage dans GN Engine · 26 novembre 2026

Depuis le vaisseau, ouvrir **Navigation**, puis **Prendre les commandes** sur le poste attribué au pilote. La consigne de vitesse, le roulis et le cap agissent sur les manœuvres locales. La durée du voyage galactique et son prix en carburant suivent la liaison choisie.

Pour préparer une recette fictive à deux pilotes, activer les rencontres automatiques et **Duels de pilotage en temps réel entre deux postes** dans les réglages STARFIGHTER du spatioport. Armer une embuscade sur une liaison commune. Les deux pilotes peuvent ouvrir la visio et conclure la paix pendant les 90 secondes de négociation. À leur expiration, le serveur ouvre le duel. Les projectiles, positions, boucliers et coques viennent de la même simulation pour les deux sièges. Le MJ peut reprendre par rounds après un incident.

Le réglage initial est de 10 points de protection par point de bouclier. La régie peut choisir un facteur de 1 à 30 pour les rencontres suivantes. Avec 2 points de bouclier sur la fiche, le cadran affiche 20 points disponibles à pleine charge. Un impact standard retire 1 point, un impact lourd en retire 2. Le reliquat de bouclier est conservé pendant les reconnexions. Une coque à zéro immobilise le voyage et laisse les suites techniques et l’abordage au moteur GN. La révision après tir suit la règle de campagne. Les rencontres en convoi, en alliance, avec remorquage et les sessions sans option de duel conservent leurs rounds.

La boucle autoritaire utilise des pas de 50 ms et les navigateurs échangent leurs commandes environ toutes les 300 ms. La simulation suspend le duel à l’expiration de la présence d’un siège. Les essais locaux couvrent une paire de postes. La latence et la charge au nombre de postes prévu sur le site restent à mesurer. La visio utilise une liaison WebRTC directe avec consentement caméra et micro, à essayer sur le réseau des équipages.

Recette navigateur reproductible avec `npm run build` puis `node scripts/test-starfighter-pilot-browser.mjs` (Chromium Playwright ou `CHROMIUM_PATH`). Deux identités de test pilotent le véritable service de campagne en mémoire. La suite Firestore `starfighter-encounter` rejoue les transactions sur émulateur.
