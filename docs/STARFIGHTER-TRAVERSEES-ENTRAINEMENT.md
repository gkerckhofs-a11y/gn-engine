# Traversées et école de vol

## Réglage de campagne

Dans **Régie du spatioport → Réglages STARFIGHTER**, cocher **Jets de traversée, patrouilles pirates PNJ et pluies d’astéroïdes**. La préparation mémorise le réglage pour tout le tronçon. Pour un convoi, la première préparation fixe la règle commune.

Le pilote lance son D6 pendant la préparation, depuis son vaisseau ou son cockpit connecté. Le dé est calculé par le serveur. Il reste acquis en cas de rechargement, de double clic et d’annulation suivie d’une nouvelle préparation. En convoi, le meneur lance le dé pour les deux vaisseaux. L’activation de cette option modifie le seuil de déclenchement de la table A.6.

| Risque d’un événement | Court, 5 min | Moyen, 10 min | Long, 15 min |
| --- | ---: | ---: | ---: |
| Sécurisée | 1/6 | 2/6 | 3/6 |
| Dangereuse | 2/6 | 3/6 | 4/6 |
| Hostile | 3/6 | 4/6 | 5/6 |

Un résultat inférieur ou égal au seuil déclenche le D6 de la table de voyage native. Deux entrées donnent un contact jouable après 30 secondes de temps de jeu.

- **4 — Astéroïdes.** Le pilote traverse le champ depuis la verrière STARFIGHTER. Le radar indique le rocher le plus proche. Chaque front laisse quinze secondes de vol et cinq secondes pour transmettre les commandes. Le serveur rejoue la trajectoire et vérifie si le vaisseau a touché un rocher. Chacun des trois fronts traversés sans impact retire un tiers du retard initial. Un passage manqué ou une collision conserve ce tiers. Le retard maximal est de trois minutes sur route sécurisée et de cinq minutes ailleurs.
- **6 — Pirates PNJ.** Un patrouilleur émet une sommation. Le pilote dispose de 20 secondes pour s’identifier ou brouiller le signal. S’il garde le silence, la patrouille s’éloigne. Ce contact radio autonome se termine sans échange de tirs, rançon ni récompense. Les combats entre équipages restent gérés par le module existant et prennent la priorité lors d’une interception.

Sur une liaison longue et hostile, la probabilité d’une pluie d’astéroïdes est de 5/6 × 1/6 = 5/36. Celle du contact pirate est également de 5/36. Un détour conserve le résultat du trajet.

## Piloter dans le champ

Le duel et le champ partagent la verrière, les instruments, les commandes et la physique du vaisseau. Une pression sur un bouton du joystick le rend détectable par le navigateur. Dans **Commandes de vol et réglage du joystick**, le pilote peut affecter les axes de virage, tangage, roulis et poussée. Le navigateur conserve ces affectations pour les deux activités sur la même origine. Au clavier, les flèches contrôlent le virage et le tangage, A/E le roulis et Z/S la poussée. Le levier permet aussi de choisir une vitesse cible. Sur écran tactile, le pilote peut virer et cabrer par glissement sur la verrière.

L’exercice individuel propose six fronts et un poste de réparation d’entraînement. Les trois fronts de campagne utilisent les mêmes commandes et le poste mécano de l’équipage.

## Poste du mécano en vol

Le personnage embarqué avec **MEC-02 Réparation N1** rejoint **Terminal → Poste mécano en vol**. Sur un vaisseau doté d’un équipage géré, le mandat d’entretien s’applique également. Un choc ou une vague manquée signale une avarie de propulsion, de radar ou de stabilisation. Le mécano lit le symptôme et intervient sur le circuit correspondant, y compris pendant que le pilote négocie le passage suivant.

Le barème de cette version accorde **la moitié du retard de cet impact** pour une réparation réussie, soit 30 secondes sur une liaison sécurisée ou 50 secondes ailleurs. Une esquive rapporte le double et laisse le circuit intact. Chaque impact ouvre une seule réparation pour le vaisseau ou son convoi. L’intervention remet en état un circuit de vol fictif et conserve la coque, les boucliers, les PA et les stocks. Sans mécano, le trajet se termine avec le retard accumulé.

## Programmer un exercice

Dans **Régie du spatioport → Simulateur de vol**, choisir voyage et navigation, duel contre le pilote automatique ou slalom dans les astéroïdes. Entrer l’ouverture et la fermeture dans le fuseau affiché, puis programmer. Plusieurs créneaux peuvent coexister. La régie peut annuler individuellement chaque créneau.

Les personnages ayant accès à la session trouvent **Terminal → Simulateur de vol** dès qu’un créneau est prévu. Le lancement est disponible pendant le briefing ou le jeu, selon l’heure réelle programmée. Une pause, un arrêt de sécurité, une annulation ou une révocation ferment l’exercice lors du prochain contrôle (toutes les cinq secondes en ligne). Le vaisseau d’exercice et son score sont locaux. Les exercices publics indépendants restent disponibles aux adresses habituelles.

## Recette sur une session de test

1. Programmer un créneau et l’ouvrir depuis un personnage sans vaisseau. Vérifier la sortie du cockpit à la fermeture.
2. Préparer une route de chaque distance au même niveau de danger, relever les seuils et lancer le dé avant le décollage.
3. En convoi, confirmer les deux préparations, lancer le dé avec le meneur et observer le même événement à bord des deux appareils.
4. Pour une démonstration déterministe, exécuter `node --test test/flight-activities.test.mjs`. Les jets forcés existent dans les tests. La campagne utilise les dés du serveur.

Règles de référence du dépôt : [Voyage, événements et remorquage, annexe A.6](source/SO_CDC_V35.md) et [Règles V0.7](source/SO_Regles_V07.txt).
