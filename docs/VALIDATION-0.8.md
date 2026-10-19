# Version 0.8 — PV, dégâts et soins

19 octobre 2026. Extension partielle du cahier V1 : COM-01/02/03, ACT-01/02/03, VIE-01 à 05, UX-01 et REC-07. Aucun lot complet déclaré terminé.

## Fonctionnalités et parcours

1. Dans le scénario, ouvrir **PV et soins → Configurer**. Le suivi est facultatif, sans valeur initiale imposée. Définir le maximum de départ, le retour après soin et les actions autorisées hors combat.
2. Créer une compétence **Soin sur soi** ou **Soin sur un autre personnage** dans le catalogue. Choisir un montant fixe de PV, un nombre d’usages par session facultatif et un délai en secondes de jeu. Le montant ne dépend pas du niveau.
3. Publier le modèle et attribuer le profil au personnage, directement ou via sa classe, après comparaison et confirmation. Les modifications du catalogue ne changent pas les paramètres déjà attribués.
4. Figer la version puis créer la session. Les règles et valeurs initiales sont copiées ; une autre session ne reprend ni les dégâts ni les usages consommés.
5. En jeu, le joueur utilise **Déclarer mes dégâts** depuis sa fiche. Il entre la quantité comptée sur le terrain, vérifie le résultat puis confirme. Les PV ne descendent pas sous zéro.
6. Dans **Soins & historique**, le soignant prépare un soin sur lui-même ou fournit le lien du badge public de l’autre personnage. Le récapitulatif indique la cible, les PV avant/après, le gain effectif, l’usage consommé et le délai. La confirmation applique le soin une fois.
7. Le MJ peut corriger les PV actuels, le maximum et le statut hors combat depuis la fiche de session. Le motif reste dans l’historique MJ. Le reste du personnage et ses usages ne sont pas réinitialisés.

Le badge identifie la cible ; une photographie ne prouve pas la présence sur place. Il n’y a pas encore de scan caméra intégré. Le soin est direct et instantané : il n’exige pas une seconde confirmation par le destinataire. Le destinataire voit le nom de personnage du soignant et le soin reçu dans son historique.

## Règles de santé de jeu

À zéro PV, le personnage est hors combat. La session choisit soit un retour après soin rendant les PV positifs, soit une validation MJ même après soin. La lecture des informations déjà autorisées et le carnet personnel restent accessibles. Quatre permissions configurent les autres actions intégrées : découverte QR, partage de connaissances ou notes, publication de groupe et soin. Les phases de jeu et autres droits continuent de s’appliquer.

Les soins sont plafonnés au maximum de la cible. Un personnage déjà à son maximum ne consomme aucun usage. Les nouvelles actions sont bloquées pendant la pause, avant le jeu et après sa fin. Le délai de récupération suit exclusivement le temps de jeu ; les pauses le suspendent. L’écran indique le délai au dernier chargement et propose une actualisation.

Activer le suivi dans une ancienne session initialise seulement les personnages sans PV configurés. Changer le maximum par défaut ne soigne pas les personnages existants et ne change pas leur maximum individuel. Désactiver puis réactiver conserve leur état. Le défaut est visible dans les écrans du scénario et de la session ; aucune valeur d’équilibrage Port-Brèche n’a été inventée.

Le quota est conservé par personnage et identifiant de compétence. Réattribuer le profil ou changer le titulaire ne rend pas les usages consommés. Une correction de catalogue devient effective pour un personnage seulement après nouvelle attribution confirmée ; elle peut modifier son quota autorisé sans effacer le compteur déjà consommé. Aucun bouton de remise à zéro des usages n’est fourni.

## Accès, concurrence et traçabilité

L’acteur provient du jeton Google vérifié. Le serveur détermine le personnage du compte actif, refuse une cible d’une autre session et exige un profil publié contenant le soin. Le rôle Accueil et les badges publics ne reçoivent ni les PV ni les paramètres privés. La préparation autorisée du soin expose uniquement l’identité de personnage, les PV et le résultat utiles pour cette interaction ; elle n’ouvre pas sa fiche narrative, son compte ou son carnet.

La préparation ne modifie rien. Sa confirmation est liée aux règles, au profil, à l’état du soignant et de la cible, à leurs versions d’accès et aux usages. Si l’état change, il faut préparer à nouveau ; faire passer quelques secondes sans autre changement n’invalide pas le récapitulatif. Le serveur calcule lui-même le temps et les ressources, indépendamment des valeurs envoyées par le navigateur.

PV, compteur d’usage, dernier temps d’utilisation, historique et résultat mémorisé sont écrits dans une même transaction. Deux demandes concurrentes ne consomment pas le dernier usage deux fois et deux soignants ne valident pas silencieusement un ancien résultat sur la même cible. Un refus ne consomme rien. Les accès courants, la compétence et le statut sont revérifiés avant les résultats mémorisés ; révocation, réattribution ou retrait du soin peuvent en interdire la lecture.

Un résultat déjà acquis peut être restitué en pause ou après la fin, tant que les droits courants autorisent sa lecture. Une session archivée ou un module désactivé ferme ce parcours. Les historiques consultables montrent les 30 dernières opérations. Les projections joueurs retirent les UID et les motifs privés des corrections MJ. Les PV de jeu ne modifient pas la révision du texte de briefing.

## Vérifications

- `npm run build` : compilation réussie.
- `npm test` : 125 tests métier et interface réussis, aucun échec. Les 18 nouveaux parcours de PV/soins couvrent notamment plafonds, pause, concurrence, double envoi, révocation, réattribution, quota conservé et activation d’anciennes sessions. Quatre tests d’interface vérifient aperçu neutre, disponibilité, récapitulatif, confidentialité et texte échappé.
- `npm run test:emulator` : 102 tests réussis, aucun échec, sur Auth et Firestore émulés avec Java 21. Les 18 parcours de PV/soins sont également exécutés sur Firestore. Total local : 227 tests.
- Un test HTTP utilise le véritable gestionnaire exporté avec Auth et Firestore émulés : identité issue du jeton, dégâts personnels malgré un identifiant forgé, refus des opérations MJ et anonymes, soin confirmé et usage unique malgré un réessai.
- GitHub : les 125 tests métier/interface et 102 intégrations passent aussi sur Node 22, sans échec ni test ignoré, pour le commit `d819238ce28fa9aac68cf70ce827da47d8928d65` ([workflow 39277123668](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39277123668), job de vérification `118144321541`).
- Les comptes et contenus de tests restent synthétiques dans `demo-gn-engine`. Aucun compte, personnage ou scénario de test créé en production.

## Limites et recette restante

- Soins instantanés restaurateurs de PV uniquement. Aucun crédit, PA, objet médical ou injecteur consommé, aucun dé, effet différé, stabilisation, blessure particulière, protection, immunité ou modificateur d’arme. REC-07 n’est donc pas entièrement validée.
- Aucun transfert automatique de biens ni mort définitive à zéro PV. Détention, désarmement, capture et alertes après une durée restent à développer.
- PV initiaux définis par scénario/session et correction individuelle en session ; les valeurs initiales par classe, crédits et objets ne sont pas encore intégrés.
- Pas de réservation longue ou d’interruption d’action, de mode discret, de notification poussée ou de confirmation par la cible. Le niveau du soin n’augmente pas son montant.
- Pas de mise à jour temps réel des PV et délais : actualisation explicite. Charge 60/120 joueurs, pagination de l’éditeur et grands volumes non mesurés.
- Les tests purs d’interface et les émulateurs ne remplacent pas une recette des formulaires authentifiés sur plusieurs comptes Google, mobile et réseau terrain. Cette recette reste à réaliser.

## Publication

Le [workflow 39277123668](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39277123668), sur le commit `d819238ce28fa9aac68cf70ce827da47d8928d65`, est terminé avec succès le 19 octobre 2026. Les journaux du job de déploiement `118145687729` confirment la publication et les contrôles HTTP à 15:25 UTC (17:25 à Bruxelles).

- Fonction `api` active en Belgique ; Hosting, règles et index Firestore publiés dans `gn-engine` par le workflow autorisé.
- Manifeste exact `0.8.0` et accueil HTTP 200 vérifiés. Les commandes anonymes existantes et nouvelles sont refusées avec `401 LOGIN_REQUIRED`, dont `myHealth`, `prepareDamage`, `applyDamage`, `prepareTreatment`, `applyTreatment`, `correctHealth` et `healthHistory`.
- Navigateur : accueil chargé avec pied de page 0.8 ; route **PV et soins** non connectée présentant uniquement l’accès Google, sans PV ni action privée. [Capture de cet accès protégé](verification/gn-engine-0.8-1792423768264.jpg).
- La capture prouve la version et le contrôle d’accès visibles ; elle ne constitue pas une recette des formulaires authentifiés ou de soins entre comptes réels. Aucun contenu de jeu ni compte de test créé en production.
