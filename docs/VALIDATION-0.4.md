# Version 0.4 — groupes et informations partagées

19 octobre 2026. Extension des fondations et du partage de groupe. Ce livrable ne clôt pas l'ensemble des lots A/B ni la recette REC-04.

## Fonctionnalités

- Groupes publics ou secrets, brouillons/prêts/publiés, avec présentation, briefing privé et notes MJ séparés.
- Appartenances liées aux personnages ; plusieurs affiliations peuvent coexister. Activation, révélation au personnage, présence dans la liste autorisée et affiliation sur le badge public sont distinctes.
- Quatre droits effectifs et indépendants : lire le briefing, voir les membres révélés, recevoir les informations, publier une information. Aucune permission de caisse, stock ou transport n'est implicitement accordée ; ces modules restent à raccorder.
- Aucun membre n'obtient automatiquement la liste du groupe. La liste ne contient que les appartenances actives, révélées, marquées visibles et dont le personnage a une identité publiée. Elle ne transmet ni total caché, ni UID, ni coordonnées du participant.
- Un badge n'affiche une affiliation que si le groupe est public et publié et si cette affiliation est explicitement autorisée. Les groupes secrets n'apparaissent jamais sur un badge.
- Les groupes et permissions sont figés dans les versions de scénario puis copiés en session. L'édition d'un modèle ne modifie aucune copie existante. Une nouvelle partie ne récupère aucun message de la précédente.
- Les sessions créées depuis une version comportant des groupes activent leurs espaces de groupe. Le MJ peut les désactiver/réactiver avec un motif ; données conservées, mais consultations/publications joueurs et affiliations publiques fermées lorsque le module est désactivé. Les sessions existantes sans ce module restent désactivées par défaut.
- Publication d'informations pendant EN_JEU seulement. Briefing, pause, fin et archivage interdisent les nouvelles publications. Une demande déjà réussie peut retrouver son résultat en pause, sous réserve des droits courants.
- Les destinataires sont les personnages membres actifs et informés disposant du droit de réception à l'instant de publication. Un nouveau membre n'hérite pas automatiquement des anciennes informations. Un auteur apparaît sous son identité publique de personnage, pas son nom réel ni sa loyauté MJ.
- Fil des 30 dernières informations reçues, ordre antéchronologique. L'interface annonce explicitement que publier partage le texte et le nom de personnage. Les textes ne sont pas présentés comme une vérité certifiée.
- Aperçu MJ utilisant les mêmes projections que le joueur, sans publication ni découverte. Historique des 30 dernières modifications de groupe avec auteur, date, motif et états avant/après ; réservé aux MJ. Le rôle Accueil ne reçoit aucune donnée de groupe.

## Vérifications locales

- Compilation `npm run build` réussie.
- `npm test` : 54 tests réussis, dont 15 nouveaux parcours de groupes et 2 vérifications de rendu/échappement HTML.
- `npm run test:emulator` avec Java 21, Auth et Firestore de `demo-gn-engine` : 39 tests réussis. Les 15 parcours de groupes sont aussi exécutés sur Firestore.
- Auth HTTP : l'essai de délégation vérifie aussi l'absence des groupes dans la réponse Accueil, l'interdiction de l'historique/aperçu pour ce rôle et l'exigence d'authentification pour l'espace de groupe.
- Les nouveaux cas couvrent coexistence public/secret, permissions indépendantes, roster filtré, copies/versionnage, nouveau membre sans passé partagé, double publication concurrente/idempotence, révocation avant réessai, phases/module, autre session, références invalides, concurrence des éditions, historique et limite de 30 informations.
- Toutes les données et identités de test sont synthétiques et utilisées dans les émulateurs. Aucun groupe, membre, message ou compte de test ajouté à la production.

Les résultats de publication seront consignés après le workflow GitHub.

## Stockage et garanties

Groupes sous `scenarios/{id}/groups`, leurs versions figées puis `sessions/{id}/groups`. Les appartenances et leurs droits sont embarqués dans le document du groupe, avec sa révision. La révision du scénario/de la session protège les éditions concurrentes. Les références sont vérifiées dans ce même scénario/cette même session.

Chaque publication possède une entrée canonique sous `groups/{id}/updates`, avec auteur technique et destinataires pour l'audit. Une copie de lecture est écrite dans `groups/{id}/inboxes/{characterId}/updates` pour chaque destinataire autorisé, dans la même transaction que l'opération et le journal. Ces boîtes de réception ne sont jamais directement accessibles au client : l'API relit le module, l'attribution, l'authentification, la publication du personnage/groupe, l'appartenance et ses droits.

Les lectures des fils et historiques utilisent un tri serveur par date et une limite de 30, avec les index simples. Les vérifications d'accès précèdent la restitution d'un résultat idempotent. Un rôle envoyé dans le corps JSON n'accorde rien.

L'exclusion bloque les nouvelles lectures. Elle ne peut effacer ce qui a été lu ou copié. Si le MJ réactive une ancienne appartenance et son droit de réception, les informations précédemment adressées à ce personnage peuvent redevenir consultables ; celles publiées pendant son exclusion ne lui sont pas adressées.

## Parcours organisateur

1. Dans le scénario ou la session, ouvrir **Groupes**, puis **Créer un groupe**.
2. Saisir le nom, la visibilité et les textes, puis ajouter les personnages sélectionnés.
3. Pour chacun, choisir explicitement révélation, visibilité dans la liste et droits utiles. L'ajout seul n'accorde aucun de ces droits.
4. Publier le groupe. Dans une session ancienne, activer également les espaces de groupe. Le joueur accède à ses groupes après activation de son personnage et ouverture du briefing.
5. Utiliser **Voir comme le joueur**, puis **Voir cet espace**, pour contrôler exactement le contenu projeté.
6. En jeu, les membres habilités publient depuis l'espace du groupe. Le MJ peut retirer leurs droits depuis la fiche du groupe et consulter l'historique des modifications.

## Limites restantes

- Recette des formulaires privés dans plusieurs navigateurs avec de vrais comptes Google, affichage mobile et réseau réel encore nécessaire ; les tests de rendu ne la remplacent pas.
- Pas de mesure de charge 60/120 ou de taille maximale des documents/transactions. Les écritures d'une publication augmentent avec le nombre de destinataires. Aucun plafond de casting métier ajouté.
- Pas encore de caisse, paiement, stock, départ, invitation entre joueurs, création autonome de cercle, document/pièce jointe, transfert de connaissance, notification poussée ou partage d'un ancien message. Les autres droits de SES-02 restent à intégrer avec leurs modules.
- Les 30 derniers éléments sont consultables ; la pagination de l'historique et des informations plus anciennes reste à intégrer.
- Groupes et appartenances sont des données de scénario. Aucune classe de personnage ni valeur de règle Port-Brèche n'a été inventée ou préchargée.
