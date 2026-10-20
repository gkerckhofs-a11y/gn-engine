# Validation 0.18 — missions personnelles ou collectives

Date : 20 octobre 2026. Statut : version 0.18.0 publiée et contrôlée.

## Parcours livré

1. Régie → Petites annonces : choisir une participation personnelle, collective, ou les deux. Les annonces anciennes restent personnelles.
2. Régie → Groupes : publier le groupe, activer ses espaces, configurer sa caisse et attribuer le droit **Représenter la bande pour les missions** aux membres actifs et révélés concernés. Consulter et dépenser la caisse restent des droits indépendants.
3. Joueur → Petite annonce : choisir « En mon nom » ou une bande autorisée avant d’envoyer une question, une candidature ou une preuve de prime. Le bénéficiaire et la destination du paiement sont affichés avant confirmation.
4. Une candidature collective est commune aux représentants habilités. Ils peuvent reprendre les échanges, accepter le contrat et produire les preuves ; le briefing s’ouvre après acceptation. Le suivi de lecture reste propre à chaque représentant.
5. Une bande occupe une seule place. Le MJ valide la preuve et paie la caisse de cette bande. Les missions personnelles conservent leur accès privé et paient le personnage.
6. Une prime ouverte conserve un seul dossier et un seul paiement par bande, même si plusieurs représentants déposent ou complètent sa preuve. Quota global et paiement sont appliqués ensemble.

## Règles explicites

- Le droit de représentation donne accès aux dossiers collectifs et à leur historique, y compris ceux ouverts par un autre représentant. Il ne révèle ni les notes MJ, ni les candidatures personnelles, ni le portefeuille privé d’un membre.
- Le droit doit être accordé explicitement. Une simple appartenance ou le droit de payer avec la caisse ne suffit pas. Les configurations existantes ne l’accordent pas automatiquement.
- Retirer un mandat, masquer l’appartenance, dépublier le groupe ou désactiver les espaces de groupes ferme l’accès collectif concerné, y compris les réessais techniques. Un autre représentant actif peut poursuivre le dossier.
- Le départ du représentant d’origine ne supprime pas l’engagement collectif. Sans aucun représentant actif, le paiement est bloqué ; le MJ peut rétablir une représentation ou clôturer l’engagement pour restituer les fonds réservés.
- L’audience de l’annonce s’applique à la candidature et au représentant qui accepte l’offre. Après acceptation, le dossier appartient à la bande et reste partagé avec tous ses représentants habilités, même si l’annonce ciblait initialement un membre précis.
- Le bénéficiaire est fixé à la création du dossier. Une requête ne peut rediriger le paiement vers un autre personnage ou une autre bande.
- En mode « les deux », une candidature personnelle et une candidature de bande sont des engagements distincts. Pour les primes, la limite porte sur chaque bénéficiaire, pas sur chaque compte joueur. Le MJ arbitre les preuves et le quota global reste applicable ; aucun cumul d’une même preuve n’est automatiquement légitimé.
- Une modification du mode de participation invalide les offres en attente. Le mode est verrouillé après une première attribution ; les primes le figent dès le financement.
- Le retrait d’une candidature collective concerne toute la bande. Les représentants ne disposent pas chacun d’une candidature indépendante au nom du même groupe.
- Le journal du payeur montre le libellé de paiement de la caisse. Il ne révèle pas le nom interne d’un groupe secret ni l’identité du représentant. Les dossiers privés destinés aux représentants et au MJ identifient la bande engagée.
- Les annonces, contrats et primes personnels antérieurs restent lisibles sans migration. Aucun nouvel accès collectif n’est accordé sur ces dossiers.

## Vérifications

Local : **377 tests métier/interface réussis**, zéro échec, annulation ou test ignoré ; compilation réussie. Environnement local Node 24.19.0, cible Node 22.

Vingt nouveaux tests partagés couvrent les trois modes, les valeurs anciennes, les mandats indépendants des droits de caisse, les appartenances masquées, les accès croisés, les candidatures concurrentes d’une même bande, la lecture individuelle, les dossiers personnels séparés, les paiements personnels/collectifs, les limites de places, la révocation et le relais, la disparition de tous les représentants, les audiences, les changements de mode, les primes collectives uniques, le quota et la confidentialité des contreparties financières. Quatre tests d’interface couvrent les choix, libellés, confirmations et échappements.

La même suite métier est ajoutée aux tests Firestore émulés. Un nouveau parcours HTTP/Auth couvre candidature de bande, acceptation par un autre représentant, retrait du premier mandat, règlement du contrat et d’une prime sur la caisse, refus des accès privés et conservation des soldes.

Résultats distants sous Node 22 / Java 21 : **377 + 320 = 697 tests réussis**, sans échec, annulation ou test ignoré, dans le [run GitHub 39379578274](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39379578274), job `118485348149`, commit `7072cda44252d2fded85bfe9661240140eed0a61`. Journaux terminés consultés : tests métier/interface à 06:18:42 UTC, intégrations à 06:26:14 UTC (environ 437 secondes). Le nouveau parcours HTTP/Auth collectif est le test 320 et a réussi. Compilation réussie.

## Limites et recette restante

Pas d’acompte, de garantie, de pénalité automatique, de partage automatique du gain entre membres, de pièces jointes ou de notification poussée. Les prix et conditions restent paramétrés par le MJ.

La recette avec de vrais comptes Google distincts et des appareils mobiles n’a pas été réalisée. La charge de 60/120 joueurs et les délais de propagation restent à mesurer. REC-10 reste partiel. Aucune donnée de jeu ou de test n’a été ajoutée en production pendant cette livraison.


## Publication vérifiée

- Commit applicatif : `7072cda44252d2fded85bfe9661240140eed0a61` ; commit de publication : `c358d8d8dff451ec838647d3ee5dd3491407c76c`.
- [Déploiement GitHub 39380457993](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39380457993) terminé avec succès le 20 octobre 2026 à 06:38:11 UTC.
- Job de vérification `118488154068` : compilation puis **377 tests métier/interface et 320 intégrations réussis**, zéro échec, annulation ou test ignoré. Fin des intégrations à 06:35:45 UTC.
- Job de publication `118490794147` : fonction HTTP, règles/index Firestore et Hosting publiés. Installation Firebase terminée à 06:37:44 UTC.
- Contrôle en ligne terminé à 06:38:04 UTC : site HTTP 200, manifeste **0.18.0**, **110 commandes privées** refusées sans authentification avec HTTP 401 / LOGIN_REQUIRED. Résultats lus dans les journaux terminés.
- Application : https://gn-engine.web.app/.

Ces contrôles ne remplacent pas la recette authentifiée avec de vrais joueurs et plusieurs appareils. Aucune configuration de bande ou de mission n’est automatiquement créée en production ; le MJ choisit les modes et les mandats dans sa session.
