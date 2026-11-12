# Messagerie des groupes — 12 novembre 2026

Demande de Guillaume : introduire une messagerie entre membres dans l’onglet Groupe.

Salon distinct des informations publiées. Tout personnage membre actif et révélé d’un groupe publié peut lire ses messages reçus et écrire pendant EN_JEU selon ses restrictions de santé. Les annonces et leurs mandats restent séparés. L’envoi révèle volontairement le nom fictif de son auteur, y compris si sa présence est masquée dans la liste : avertissement explicite avant le champ de saisie.

Projection privée : texte, nom fictif et heure seulement. Aucun UID, adresse, destinataire caché ou note MJ. Les nouveaux membres reçoivent uniquement les messages futurs. Une sortie, révocation de connexion, mort ou dépublication ferme l’accès. Les messages déjà reçus restent conservés ; une réintégration du même personnage permet de retrouver ceux qu’il avait déjà reçus, pas ceux émis en son absence.

50 derniers messages reçus, affichés chronologiquement ; texte de 2 000 caractères maximum. Actualisation toutes les cinq secondes sur page visible, sans remplacer le brouillon ni forcer le défilement du lecteur. En cas d’échec de vérification, le salon est masqué et demande une actualisation. Envoi indisponible en pause, STOP, briefing ou fin de jeu. Aucune pièce jointe, message direct, notification système, compteur non lu ni pagination historique dans cette tranche.

Réutilisation du contrôle groupe courant et du stockage transactionnel. Une capacité serveur GROUP_CHAT bornée aux messages et boîtes de réception ouvre cette fonction dans les sessions SO actionsVersion=1/groupsVersion=1 ; aucune migration ou modification des versions de Master. Les reçus sont idempotents, les accès revérifiés avant un réessai, et aucun PA/crédit/objet n’est consommé.

Validation locale : compilation ; 34 tests ciblés (groupes, groupes SO, UI et messagerie) ; quatre scénarios de messagerie sur émulateurs Firebase demo-gn-engine. Ajout d’un parcours Chromium utilisant l’application et des réponses API simulées : réception, protection HTML, brouillon conservé, envoi, largeur mobile et fermeture après révocation. La CI sera rapportée sur le SHA exact de la PR ; pas de recette humaine revendiquée. Aucun déploiement.
