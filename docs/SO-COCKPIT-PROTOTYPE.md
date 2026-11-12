# Cockpit Space Outlaws — prototype visuel, 12 novembre 2026

## Périmètre livré

Première tranche demandée par Guillaume : un ordinateur partagé dans une pièce décorée en vaisseau, avec une scène spatiale animée. Démonstration autonome à `/cockpit/` après compilation. Aucun raccord Firebase, aucune authentification, aucun départ réel, aucun changement de ressources. Les noms, lieux, instruments et messages de cette démonstration sont fictifs.

Huit scènes : quai, décollage, navigation, hyperespace, contact, combat, approche, amarrage. Canvas avec perspective des étoiles, planète, sortie du hangar, silhouette originale du contact, salve et impact. Instruments, radar, communications et journal ; progression manuelle et sélection des scènes. Son facultatif pour les effets, désactivé au départ. Pause, plein écran et mouvement réduit (préférence du système respectée). Textes immersifs et explications HRP en italique. Les boutons de combat sont explicitement des simulations, sans tir d’adresse.

## Frontière avec les règles

Référence : règles V07, chapitre 22 (combat virtuel, ordres simultanés, 90 secondes maximum). Le moteur de visualisation reçoit des événements identifiés et des valeurs finales ; il ne lance aucun dé, ne retire aucun point et ne remplace pas les commandes serveur. Réception répétée d’un identifiant récent : effet ignoré (fenêtre locale de 256 événements). Ce mécanisme visuel ne remplace jamais l’idempotence serveur des opérations réelles.

La démonstration se poursuit au clic : elle ne représente ni les durées, ni les coûts, ni les chances de succès du GN. Une animation de salve ne prouve pas un tir valide et un impact ne modifie pas les instruments. Les valeurs ne changeront en mode connecté que depuis les projections autorisées.

## Raccordement suivant

1. Appairer un poste de cockpit à une session et un vaisseau avec une autorisation révocable du MJ ; ne jamais afficher le compte ni les secrets du pilote sur le poste partagé.
2. Réutiliser les parcours existants d’embarquement, de mandat du pilote, de carburant, de préparation, départ et arrivée ; confirmation personnelle sur téléphone ou dispositif explicitement arbitré.
3. Projeter uniquement les informations d’équipage autorisées ; synchroniser pause, STOP, reconnexion et état réel du voyage.
4. Relier les événements visuels aux résultats confirmés de rencontre. Conserver les ordres, délais, coûts et résolutions du moteur existant. Aucun arbitrage automatique créé par le cockpit.

À décider avant mise en jeu : opérateur physique du poste, validation personnelle des ordres, nombre de pièces et mode d’affectation. Aucune décision n’est nécessaire pour essayer la démonstration autonome.

## Vérification

Tests ciblés du moteur visuel : effets sans dépense, répétition d’événements, valeurs reçues et refus des états inconnus. Compilation de l’application. Les contrôles navigateur et le rendu visuel sont distincts : aucune recette sur appareil réel revendiquée. Aucun déploiement de cette tranche.
