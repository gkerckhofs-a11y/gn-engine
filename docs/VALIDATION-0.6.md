# Version 0.6 — carnet privé et copies explicites

19 octobre 2026. Extension de CON-03, des versions rédigées par le joueur de CON-02 et de l'isolation des sessions de SES-01/REC-09. Aucun lot complet déclaré terminé.

## Fonctionnalités

- Carnet de notes textuelles rattaché au compte participant et à la session, jamais au seul personnage. Création et modification avec titre, texte, dates et révision.
- Recherche par titre, ordre des modifications les plus récentes et filtre notes actives/classées/toutes. Le classement est réversible ; aucune suppression définitive ajoutée.
- Accès avec inscription acceptée, personnage publié et attribution activée, du briefing à la fin de session, y compris en pause. L'archivage de la session ferme l'accès, comme les autres espaces privés actuels.
- Le changement de personnage ne transfère pas le carnet au nouveau titulaire. Le même participant retrouve ses notes après une nouvelle attribution activée dans cette session ; une nouvelle session ne reprend aucun carnet ni copie de la précédente.
- Ni le propriétaire organisateur, ni les MJ délégués, ni le rôle Accueil n'ont de route pour consulter les notes d'un autre compte. Aucun titre, texte, identifiant ou total de notes privées dans les réponses organisateur, les aperçus joueurs, les badges ou le journal de session.
- Les notes ne sont pas présentées comme des preuves certifiées. L'interface indique que les notes non partagées sont réservées à leur auteur dans l'application.
- Enregistrement explicite. Une erreur conserve le texte saisi dans le formulaire. Un avertissement accompagne les sorties usuelles d'une édition non enregistrée ; aucun brouillon privé n'est sauvegardé dans le stockage local du navigateur.
- Partage uniquement pendant EN_JEU, via le badge public d'un personnage actif de la même session. Aucun annuaire de destinataires.
- Confirmation présentant le texte complet, le nom du destinataire, le nom de personnage de l'auteur et le droit de retransmission choisi. Par défaut : lecture sur place, sans nouvelle copie numérique ; l'auteur peut autoriser la retransmission.
- L'écran précise qu'une copie rejoint les informations du destinataire et de l'auteur et devient consultable par les MJ. Les autres notes et les modifications ultérieures restent privées.
- Le texte partagé est figé. Modifier ou classer l'original ne change ni ne retire les copies déjà reçues. Une nouvelle version volontairement partagée crée un document distinct ; une nouvelle transmission identique ne duplique pas le reçu et ne remet pas son état de lecture à zéro.
- Historique des 30 dernières transmissions effectuées depuis chaque note, visible seulement par son auteur. Il ne prétend pas retracer les retransmissions ultérieures par d'autres personnages.

## Confidentialité et stockage

Les notes sont sous `sessions/{sessionId}/notebooks/{hash(uid)}/notes/{noteId}`. L'UID provient exclusivement du jeton vérifié. Aucun paramètre `uid`, rôle client ou `characterId` ne permet de changer de carnet. Le contrôle de session, d'attribution et d'authentification précède les lectures et les résultats de commandes mémorisés.

Créer, modifier ou classer une note ne crée aucune entrée dans le journal MJ. Les résultats idempotents ne contiennent que l'identifiant et la révision, jamais le texte ou le titre privés. Les empreintes de requête sont stockées sans le corps d'origine.

Partager crée un document sous les connaissances de session, avec des reçus pour les deux personnages et un journal ne concernant que ce document partagé. L'identifiant de la note privée et ses dates d'édition ne sont pas copiés. Les règles de lecture, dépublication et retrait des connaissances de la 0.5 s'appliquent ensuite. Une correction du catalogue par le MJ ne remplace pas silencieusement le texte montré dans une nouvelle confirmation de partage de la note.

Cette confidentialité décrit les droits de l'application. Ce n'est pas un chiffrement de bout en bout et elle ne retire pas les droits techniques d'administration du projet Firebase. Aucun accès direct Firestore n'est accordé aux clients web.

## Concurrence

Les sauvegardes comparent la révision du carnet : deux éditions simultanées ne s'écrasent pas. Les confirmations de partage sont liées à la révision de la note, au personnage et à l'alias de l'auteur. Si le destinataire change d'attribution, d'alias ou de version d'accès entre préparation et confirmation, une nouvelle vérification est requise.

Le document partagé, les reçus, les journaux et le résultat idempotent sont écrits dans la même transaction. Les droits courants, retraits et dépublications sont vérifiés avant un résultat mémorisé. La clé de document distingue note, version, personnage/alias de l'auteur et mode de retransmission : plusieurs demandes identiques restent un seul document et un seul reçu par personnage.

## Vérifications locales

- `npm run build` : compilation réussie.
- `npm test` : 87 tests réussis, dont 14 parcours de carnet et 2 tests d'interface supplémentaires.
- `npm run test:emulator` : 69 tests réussis avec Auth et Firestore de `demo-gn-engine`, Java 21. Les 14 parcours du carnet sont réexécutés sur Firestore.
- Total : 156 tests réussis. Le nouveau test HTTP utilise la véritable fonction exportée et les jetons Auth de l'émulateur : accès de l'auteur, refus pour MJ/autre compte/anonyme, préparation sans effet puis copie confirmée.
- Les parcours couvrent confidentialité des métadonnées, usurpation de paramètres, délégations, réattribution, nouvelles sessions, édition concurrente, classement/restauration, snapshots, double partage, confirmation périmée, changement de destinataire, révocation, phases et droit de retransmission.
- Les tests d'interface vérifient l'échappement des contenus, les contrôles conditionnels, les filtres et les informations de confirmation. Ils ne remplacent pas une recette dans des navigateurs avec de vrais comptes distincts.
- Aucune note, copie, identité ou donnée de jeu de test créée en production.

## Parcours joueur

1. Ouvrir **Mon carnet privé** depuis le personnage ou les informations.
2. Créer une note, puis **Enregistrer ma note privée**. L'enregistrement n'est pas un partage.
3. Ouvrir une note pour la modifier, la classer, la restaurer ou consulter les transmissions effectuées depuis ce carnet.
4. Pendant le jeu, choisir **Partager une copie**, coller le lien du badge du destinataire et choisir si la retransmission sera autorisée.
5. Vérifier le texte complet et les identités, puis confirmer. Les copies sont disponibles dans **Mes informations** ; l'original demeure dans le carnet.

## Limites restantes

- Pas de pièces jointes, export de carnet, suppression définitive, historique des éditions privées, sauvegarde automatique ou fonctionnement hors ligne. Un texte non enregistré peut encore être perdu en cas de fermeture forcée, panne ou changement de page non intercepté.
- Pas de mesure de charge ni de pagination de la liste des notes ; historique des transmissions limité aux 30 dernières entrées.
- La copie explicitement partagée est accessible aux MJ ; le carnet original ne l'est pas. Le retrait d'une copie ne peut effacer ce qui a déjà été lu, photographié ou transmis.
- La recette des formulaires privés sur plusieurs comptes Google, mobile et réseau réel reste à réaliser.
- Compétences, inventaire, médias privés, économie, petites annonces et vaisseaux restent à développer selon le cahier des charges. Aucun paramètre de règle Port-Brèche ajouté.

## Publication

La version est préparée pour le workflow GitHub/Firebase autorisé. La preuve du déploiement et le contrôle du site publié seront consignés après leur réussite.
