# Space Outlaws — ROG-03 : première tranche de captivité et d’évasion

Date : 9 novembre 2026. Références : règles V0.7 chapitre 8 ; CDC V3.5 §4.5 ; REC-SO-08.

## Périmètre livré dans la branche candidate
- Capacité `escapeVersion=1` sur **nouveaux Masters** uniquement ; aucune activation implicite des sessions antérieures.
- Enregistrement d'une captivité par propriétaire/MJ avec personnage, occasion CELL (QR de serrure/décor), ESCORT (ROG N3+) ou OPEN (ROG N5 avec validation MJ). Code d'occasion aléatoire lié à la session et à la captivité.
- Gardien directement présent : action bloquée au départ ; si présence déclarée pendant l'action, tentative découverte, PA remboursé et 10 minutes de récupération personnelle.
- Durée 60/45/45/30/30 secondes de temps de jeu, un PA réservé puis consommé **seulement lors de la réussite** ; abandon ordinaire sans coût ni récupération.
- STOP SÉCURITÉ : blocage des actions et interruption du temps de jeu via l'horloge native. Pas de commande d'ouverture de serrure.
- Échéance de captivité à **20 minutes réelles**, indépendante de l'horloge du jeu. Le MJ peut clôturer la captivité sans attendre l'application ; les actions au-delà de l'échéance sont bloquées avec instruction de libération.
- Contrôles serveur sur accès privé, compétence, état du personnage, version, code, surveillance, réservation de PA, reçus et transactions.

## Limites explicites
- La position physique, la surveillance, la capture et la sécurité de la sortie restent **attestées par le MJ**, pas détectées par le logiciel. La limite de 20 minutes reste une obligation humaine de libération physique, jamais une autorisation de retenir quelqu'un.
- Les autres systèmes (combat, pillage, transport, santé et autres actions simultanées) ne sont **pas encore universellement bloqués** par le statut de captivité. Il reste une recette d'interopérabilité.
- La lecture du QR montre une invitation à jouer et ne commande aucun dispositif physique.
- Pas de certification smartphone, terrain, sécurité globale ou charge. Résultat CI à relever sur le **SHA exact** avant de déclarer le lot validé.

## Contrôles d’interactions complémentaires
- Une capture est refusée tant qu'une action terrain, une intervention personnelle, un voyage, une maintenance, une cargaison ou un vol ROG-02 demeure actif pour le personnage.
- Un captif actif ne peut initier ni ROG-02, ni une nouvelle action de terrain, ni une intervention personnelle ; les lectures privées et la libération MJ restent permises.
- Le démarrage de l'évasion refuse également un ROG-02 en cours, et toutes ces gardes sont vérifiées côté serveur sur les données courantes.
- Ces verrous sont limités aux parcours raccordés : un audit ultérieur est nécessaire pour l’ensemble des services commerciaux et spatiaux, et pour la recette physique.
