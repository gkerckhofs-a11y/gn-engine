# Entraînement STARFIGHTER

Dans le dépôt, lancer `python3 -m http.server 8000 --bind 127.0.0.1 --directory web/cockpit`, puis ouvrir http://127.0.0.1:8000/starfighter.html. Le serveur local distribue uniquement les fichiers du cockpit. Aucun compte n’est requis.

À Sillage, choisir Vesper. Le trajet rapide consomme six unités et en exige sept au départ. Le trajet économe passe par Nacre et Balise Orme. Préparer, confirmer puis laisser le voyage avancer. Les commandes de passage de scène servent à accélérer l’entraînement. À chaque escale, consulter la réserve et préparer le prochain tronçon. « Essayer une pénurie » démarre avec une unité ; le stock local est limité. Tous ces chiffres sont fictifs.

Pour emporter l’exercice hors ligne, exécuter `node scripts/starfighter-demo.mjs` après installation des dépendances. Ouvrir `dist/starfighter/STARFIGHTER.html` directement dans un navigateur. Les graphismes et le son sont calculés localement. Le fichier fonctionne hors connexion.

Au contact de démonstration, négocier la paix ou attendre douze secondes d’exercice. En combat, viser à la souris ou avec les flèches dans la verrière. L verrouille une cible proche, Espace ou un clic émet une salve. Les boutons offrent les mêmes commandes. Choisir attaque, défense ou fuite. L’exercice résout les manœuvres toutes les six secondes fictives. Son et mouvement réduit sont réglables. La partie connectée conserve son propre temps de jeu.

## Poste connecté

Dans une session de test, la régie configure le nombre d’ordinateurs physiques (postes nommés cockpit-1, cockpit-2, etc.). Zéro conserve le parcours historique pour les nouvelles préparations. Les options de présentation STARFIGHTER sont absentes par défaut.

Le premier vol se prépare au spatioport natif. L’attribution du poste se fait avec la réservation du PA. Si tous les postes sont occupés, la transaction refuse toute la préparation. Le pilote ouvre le lien indiqué, s’authentifie sur le poste, vérifie le manifeste et confirme le décollage à la fin de la préparation. Le moteur vérifie à nouveau présence, mandat et ressources.

Sur le poste, ouvrir « Carte et plan de vol », saisir les codes personnellement connus, puis choisir une planète pour comparer les itinéraires. Une analyse acquise peut déjà rendre une liaison visible. La carte nécessite PIL-01. Le serveur vérifie séparément le droit de piloter. La réservation du prochain tronçon se fait à quai. Les stocks, réservations et éventuelles obligations de présence au terminal local gardent leur fonctionnement habituel.
