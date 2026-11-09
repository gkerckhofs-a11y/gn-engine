# Space Outlaws — INF-01 : intrusion fictive ordinaire

Date : 9 novembre 2026. Sources : SO_Regles_V07.txt, chapitre 14 ; SO_CDC_V35.md §5.1.

## Première tranche
- Dans le Master central M6, création d’une cible de type `INTRUSION` : LOCK (serrure), SAFE (coffre), TERMINAL (terminal fictif), description publique, niveau INF-01 minimum, seuil D6 et deux textes de résolution préparés par le MJ.
- Le QR de session peut être affiché depuis le tableau de régie des lieux. Il dirige vers un écran de jeu INF-01, sans accès à un véritable dispositif ni ouverture physique.
- Les capacités `inf01Version=1` sont émises seulement pour les nouveaux Masters et propagées aux nouvelles sessions. Les sessions antérieures restent sur leurs droits.
- Contrôle serveur de l’identité, du niveau de compétence, de l’état du personnage, des PA et de la présence déclarée au point de jeu.
- Durées 180/165/150/135/120 secondes en temps de jeu ; 1 PA réservé au lancement, consommé uniquement au jet, rendu si l’action est interrompue avant résolution.
- Jet ordinaire 1D6 + niveau INF-01 contre le seuil prévu dans M6, sans critiques automatiques. Une réussite révèle au seul personnage le texte de fiction préparé ; l’échec ne révèle pas le texte secret.
- Récupération personnelle de 10 minutes après la résolution, même en cas d’échec. Au maximum une tentative active par personnage et une par point d’intrusion. L’horloge de jeu est suspendue pendant la pause/STOP.
- Résultats et réessais enregistrés transactionnellement et idempotents ; la progression n’est jamais re-jouée par un rafraîchissement.
- Une intrusion **ne donne aucun vrai droit informatique, aucun accès MJ, aucune modification de propriété et aucune commande physique**.

## Limites et recette
- La présence physique est déclarative ; le MJ doit préparer les QR, vérifier la sécurité et les passages réellement autorisés.
- Les mini-jeux spéciaux remplacent le D6 dans le canon V0.7 : **non raccordés dans cette tranche**.
- L’intervention ne manipule ni serrure, ni réseau, ni ordinateur réel ; même un succès reste un résultat purement narratif.
- Aucun bonus d’objet, aide compétente, consommable spécifique, verrou métier autre que la cible dédiée ou effet sur l’état d’une installation native n’est ajouté. Ces capacités nécessiteront une tranche distincte et ses tests.
- Les anciennes lignes Excel M6 ne sont pas transformées automatiquement en cible `INTRUSION`. Utiliser l’édition web M6 ; auditer l’import/export avant d’annoncer ce parcours comme supporté par Excel.
- Recette terrain Android/iOS, garde et sécurité réelle non effectuées par les tests. CI ciblée du SHA exact à vérifier avant validation. Régression complète avant fusion.

## Essais attendus
Cible M6 préparée, publication et naissance, projection publique sans secret, niveaux, D6 succès et échec, durée/cooldown, interruption et PA restitué, concurrence acteur/cible, mauvais identifiant, session non compatible, STOP et étapes physiques non couvertes.
