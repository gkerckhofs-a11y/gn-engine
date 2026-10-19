# Version 0.7 — classes et compétences passives

19 octobre 2026. Extension partielle de EDI-02/03/04, COM-01, CON-01 et SES-04 du cahier V1. Aucun lot complet déclaré terminé.

## Fonctionnalités

- Bibliothèques de compétences passives et de classes dans chaque scénario, copiées avec la version figée puis dans chaque session. Les anciennes versions sans ces bibliothèques restent utilisables.
- Compétence : identifiant stable, nom, description immersive, consignes, catégorie, notes MJ séparées, état brouillon/prêt/publié et révision. Les types actifs sont refusés par le serveur.
- Classe : nom, description, notes MJ, publication et liste de compétences avec niveaux. Une classe publiée ne peut être enregistrée avec une compétence non publiée. Duplication d'un modèle en nouveau brouillon, sans liaison aux futures modifications de l'original.
- Attribution à un personnage : classe facultative, exceptions individuelles pour ajouter ou remplacer un niveau, ou retirer une compétence avec le niveau 0. Aucun métier ou groupe n'est modifié.
- Préparation sans effet, puis récapitulatif avant/après présentant les descriptions et consignes. La confirmation remplace uniquement le profil du personnage sélectionné, dans le scénario ou la session choisie. En session, un motif est obligatoire.
- Profil publié ou non publié indépendamment du catalogue. Un profil non publié n'est ni transmis au joueur ni utilisé comme droit de découverte. La fiche du personnage doit aussi être publiée et accessible.
- Lecture des compétences sur la fiche personnelle, avec classe, descriptions, niveaux et consignes. Aucune section vide pour un personnage sans profil. L'aperçu MJ utilise la même projection, sans découverte ni confirmation de lecture.
- Condition facultative de compétence et de niveau minimum dans l'éditeur des découvertes QR. Elle s'ajoute aux destinataires, à l'accès personnel et à l'état de jeu. Une demande forgée ne peut fournir son propre niveau ou changer de personnage.

## Copies et corrections explicites

Les modèles sont rangés sous `scenarios/{id}/skills` et `classes`, puis sous les versions et sessions correspondantes. Le profil attribué est une copie sur le personnage, comprenant les noms, descriptions, consignes, niveaux et révisions confirmés. Il ne contient pas les notes MJ du catalogue.

Éditer ou dépublier un modèle ne change pas les profils déjà attribués, y compris dans le même scénario. Pour corriger un personnage, préparer puis confirmer explicitement son nouveau profil. L'écran annonce qu'il utilise les versions actuelles du catalogue. Retirer une classe du profil n'efface pas les compétences ajoutées comme exceptions individuelles ; le récapitulatif montre le résultat exact.

Une modification du profil incrémente la version de la fiche, conserve sa publication dans l'historique et impose une nouvelle confirmation de lecture au joueur. Le journal de session conserve le motif et les références de l'opération ; l'historique dédié présente les profils avant/après. Il est limité aux 30 dernières modifications consultables par ce parcours.

Les compétences appartiennent au personnage, contrairement au carnet privé du participant. Réattribuer un personnage ferme les anciens accès et donne son profil au nouveau titulaire après activation. Une nouvelle session reprend le profil de la version figée, pas les corrections de la session précédente.

## Découvertes et droits

Le niveau vient exclusivement du profil publié enregistré côté serveur. Le contrôle est relu avant un résultat mémorisé de découverte : retirer une compétence empêche aussi de rejouer une ancienne demande QR. Un refus ne révèle ni titre, ni texte, ni expertise cachée de la cible.

Le savoir mécanique et le texte acquis restent distincts. Retirer une compétence ne supprime pas les informations déjà reçues. La condition porte uniquement sur la découverte QR ; une attribution MJ, un reçu initial ou une copie autorisée suivent leurs propres règles d'accès. L'éditeur l'annonce explicitement.

Le catalogue, les exceptions, les historiques et les notes MJ sont réservés aux organisateurs habilités. Le rôle Accueil ne les reçoit pas. Le joueur reçoit seulement son profil publié, sans notes MJ ni choix internes. Le badge public ne montre ni classe ni compétences. Les droits courants sont vérifiés avant les réessais de commandes, notamment après révocation d'un MJ.

## Concurrence et validation

La confirmation est liée à la révision du contexte, à la fiche et au profil calculé. Une modification de catalogue ou une correction concurrente exige une nouvelle préparation. Même en remplaçant la révision dans une requête périmée, le récapitulatif ne peut être confirmé avec un contenu différent.

Le profil, la fiche publiée, les historiques, le journal et le résultat idempotent sont écrits dans une transaction. Une demande répétée ne crée qu'un changement. Deux corrections concurrentes ne s'écrasent pas. Les niveaux sont des entiers sûrs positifs, avec 0 réservé au retrait dans une exception ; doublons et références étrangères sont refusés.

## Parcours organisateur

1. Ouvrir un scénario, puis **Classes et compétences**.
2. Créer les compétences passives, renseigner leurs consignes et les publier.
3. Créer une classe avec les compétences et niveaux souhaités, puis la publier.
4. Sur un personnage, choisir **Compétences**, sélectionner la classe et les exceptions, puis choisir de publier le profil avec la fiche.
5. Cliquer sur **Voir les changements avant confirmation**, relire l'avant/après puis confirmer pour ce personnage.
6. Dans une connaissance, activer sa découverte QR et, si nécessaire, choisir l'expertise et le seuil minimum.
7. Figer la version du scénario et créer la session. Les corrections en session utilisent le même parcours avec un motif.

## Vérifications

- `npm run build` : compilation réussie.
- `npm test` : 103 tests métier/interface réussis, dont 13 parcours de compétences et 3 tests d'interface ajoutés.
- `npm run test:emulator` : 83 tests réussis avec Auth et Firestore de `demo-gn-engine`, Java 21. Les 13 parcours de compétences sont réexécutés sur Firestore.
- Total local : 186 tests, aucun échec. Les tests couvrent profils, publication, copies, rôles, révocations, réattribution, historique, concurrence, seuils QR et compatibilité avec les anciennes données.
- Le nouveau test HTTP emploie le véritable gestionnaire exporté, les jetons Auth et Firestore émulés : refus anonyme et joueur, préparation sans effet, attribution confirmée, puis découverte conditionnelle.
- Tous les comptes et contenus de test sont synthétiques et confinés aux émulateurs. Aucun profil ni aucune règle de scénario n'a été créé en production.
- Résultats GitHub et publication à consigner après le workflow.

## Limites

- Compétences passives uniquement. Pas d'action active sur soi/cible, coût, dé, délai, soin, sabotage, réparation, état temporaire, objet accordant une capacité ni apprentissage automatique. Le catalogue initial complet demandé par COM-01 reste à préparer ; aucune règle Port-Brèche inventée.
- Une classe contient les compétences de départ, pas encore les PV, crédits ou objets initiaux. Pas de bibliothèque partagée entre univers, migration collective ou import/export de modèles.
- La condition QR porte sur une expertise avec seuil minimum. Pas de combinaisons ET/OU, conditions d'objet/état/crédit, ni contrôle de présence physique. Le QR peut être photographié.
- Aucun changement rétroactif des profils lorsque le catalogue est modifié ou dépublié. Les historiques de classes conservent les références et niveaux ; leurs libellés d'affichage viennent du catalogue actuel. Les historiques des profils conservent, eux, les textes réellement attribués.
- Pas de suppression définitive des modèles. Maximum de 60 compétences par classe/profil et 60 exceptions par préparation ; aucun plafond de personnages ajouté. Charge réelle et pagination des bibliothèques non mesurées.
- Recette des formulaires authentifiés sur comptes Google distincts, mobile et réseau réel encore à faire. Les tests d'interface et émulateurs ne la remplacent pas.

## Publication

Publication et vérification du site à consigner après réussite du workflow GitHub/Firebase autorisé. Aucune donnée de test de jeu créée en production.
