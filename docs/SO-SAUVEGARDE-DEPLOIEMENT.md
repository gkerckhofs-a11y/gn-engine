# SPACE OUTLAWS — sauvegarde, reprise et déploiement À FAIRE VALIDER

**Procédure préparée, jamais lancée. Aucune mise en production autorisée.** Le candidat actuel n'est pas prêt : voir [rapport de conformité](SO-VALIDATION.md). Aucun nom de projet de recette, URL, compte ni stockage de sauvegarde disponible n'est présumé. Aucun changement de droits Firebase, IAM, DNS ou comptes de production n'est inclus dans les autorisations actuelles.

## 1. Préparer le candidat et la recette isolée

1. Figer le SHA de branche, la version applicative, le référentiel publié et les éventuelles migrations. Relire le diff, l'intégrité des quatre Masters et les dépendances. Identifier la base main réelle et les changements concurrents.
2. Vérifier la CI de ce SHA : build, `npm test`, Firestore/Auth/Storage Emulator avec Node 22 et Java 21. Vérifier l'absence de job ou déclenchement de déploiement. Ne pas modifier `.github/deploy-request.json`.
3. Identifier un environnement de test séparé, sa configuration, son stockage et ses comptes fictifs propriétaire/MJ/accueil/joueurs. Tester les identifiants de projet réellement utilisés avant toute écriture ; refuser les identifiants de production. Les émulateurs `demo-gn-engine` suffisent aux tests automatiques, pas à l'homologation des appareils et du terrain.
4. Préparer la recette REC-SO-01 à 24, REC-SO-FOR-01 à 06, REC-SO-REC-01 à 05 et SEC-SO-01 à 10 ; utiliser les barèmes FINAL, comptes PNJ/assureur réellement provisionnés, stocks et lots fictifs identifiés. Fixer les seuils de performance avant la mesure à environ 60 utilisateurs ; ne pas assimiler une fixture de 60 fiches à une charge de 60 utilisateurs.
5. Jouer les cas sur Android/iOS, plusieurs rôles, coupure/reprise réseau, double clic et concurrence. L'organisation valide séparément armes, protections, sorties sûres et scénographie. Tout blocage de sécurité, perte/duplication ou résultat inconnu suspend la validation.

## 2. Sauvegarde préalable à une future migration

L'export catalogue XLSX et l'archive `.gnscenario.zip` ne couvrent pas une session vivante. Une sauvegarde complète doit être définie et restaurée en test avant toute demande de déploiement avec migration.

| Ensemble à inventorier | Exigence de sauvegarde / vérification |
|---|---|
| Scénarios, versions, campagnes, sessions et sous-collections | Export cohérent des documents, identifiants et relations, comprenant profils, santé, PA, horloges, clôtures et constructions d'épisodes en cours |
| Comptes, ledger, opérations/idempotence, contrats, réservations et stocks | Même point de cohérence ; total par compte, réservé/disponible, nombre/quantité de lots, propriétaires et liens aux opérations |
| Navires, trajets, états terrain et futurs combats/assurances | Temps restant, tirages, ordres, usages, sinistres et réserves associés ; aucun effet rejoué à la restauration |
| Authentification et attributions | Plan distinct de conservation/restauration des UID et des liens, sans exposer de secrets dans Git ; éviter restauration partielle incompatible avec les sessions |
| Storage et médias | Objets et métadonnées, empreintes, références et autorisations associées ; vérifier objets manquants et références privées |
| Configuration et code | SHA, lockfile, versions outils, règles/index/configuration existants, inventaire des secrets et droits sans valeur secrète dans le rapport |

Après autorisation dédiée d'accès à la cible réelle : définir la fenêtre cohérente de sauvegarde et la suspension des mutations, le responsable, la destination protégée, la rétention et les restrictions d'accès. Relever date, projet, volumes, inventaire et empreintes. Vérifier le statut de chaque export. Aucune commande de production n'est exécutée dans le cadre de cette préparation.

## 3. Répéter la reprise en environnement isolé

1. Restaurer une copie autorisée dans une cible isolée ; utiliser des données fictives pour les essais actuels. Toute utilisation de données réelles exige un traitement approprié et ne doit pas être copiée dans les fixtures Git.
2. Vérifier les comptes Auth/UID et relations de médias sans élargir les droits. Contrôler les totaux des comptes, crédits réservés, lots et propriétés avant/après ; aucune création de monnaie ou d'objet.
3. Exécuter une migration versionnée en aperçu, l'appliquer sur la copie, interrompre/reprendre à une frontière prévue, puis répéter. Exiger l'idempotence et une trace de chaque décision ; ne pas réécrire les versions historiques.
4. Tester spécialement la reprise des voyages/contrats/réserves, les horloges et expirations A38, la mort stabilisée et les demandes en attente. Une sauvegarde Firestore sans Auth/Storage cohérents n'est pas déclarée restaurable.
5. Consigner commandes exactes, durées mesurées, volumes, erreurs et preuve de restauration. Les objectifs de perte de données et délai de reprise restent à fixer ; aucune durée n'est promise ici.

SO-06a n'a aucune migration : le retour arrière du code d'export suffit pour cette tranche. Les futures migrations économiques ou de campagne nécessiteront leur propre procédure ; restaurer une sauvegarde après reprise des transactions peut perdre des opérations nouvelles. Prévoir une compensation auditée ou une reprise contrôlée, jamais une restauration aveugle en activité.

## 4. Dossier à soumettre avant publication

- SHA exact et diff final, version du profil, CI complète de ce SHA et registre des 24 recettes + 6 FOR + 5 Recettes & Potions et 10 essais avec preuves ; anomalies résiduelles et acceptation motivée des seules limites non bloquantes.
- Cible exacte, services affectés et migrations, preuve de sauvegarde/restauration, fenêtre, responsable et possibilité de retour arrière.
- Plan de déploiement détaillé adapté aux workflows réels de ce jour, contrôles après publication et conditions d'arrêt. Le présent document ne vaut pas demande d'exécution implicite.
- Autorisation explicite du propriétaire pour la mise en production et pour les éventuelles opérations de configuration distinctes. Sans cet accord, conserver branche/PR et ne déclencher aucun workflow de déploiement.

## 5. Ordre proposé après autorisation future seulement

Reconfirmer les prérequis et le SHA approuvé → sauvegarde cohérente vérifiée → suspension des mutations si nécessaire → migrations approuvées et journalisées → déploiement du seul candidat approuvé selon le mécanisme alors autorisé → contrôles de version, accès privé, QR, transactions, comptes/stock, médias et reprise → décision de réouverture.

Arrêter si cible/SHA inattendu, backup incomplet, test bloquant, dérive de droits, divergence de compte/lot, duplication, rupture d'accès privé ou migration non idempotente. Conserver les preuves, empêcher les nouvelles mutations selon la procédure approuvée et choisir le retour arrière adapté au code **et** aux données. Ne pas improviser de changement IAM/DNS pour débloquer un incident.

**État actuel :** sauvegarde de production non réalisée ; restauration non exécutée ; recette terrain non passée ; procédure de déploiement non validée et non lancée.

## Complément V3.2 / SO-06b

Inclure `recipes`, ses historiques et reçus Master dans toute sauvegarde future, ainsi que les objets, compétences, connaissances et lieux référencés. Les archives scénario de ce candidat incluent ces définitions, mais restent distinctes d’une sauvegarde de session vivante. Aucun stock de potions n’est créé dans SO-06b. Les futures doses devront conserver version de recette, origine des composants et opération idempotente.

Aucune migration des anciens documents n’est requise. Un ancien code ignorant `recipes` ne doit pas servir à exporter ou copier une campagne qui en contient : il omettrait cette collection. Un retour arrière devra préserver les nouvelles données et empêcher ces opérations, ou utiliser un correctif compatible. Ne pas effacer les brouillons pour revenir à un ancien code. Les contrôles automatisés d’archive/campagne de SO-06b ne remplacent pas une restauration complète Auth/Firestore/Storage en environnement isolé.

Avant de rendre les recettes jouables, exécuter les cinq REC-SO-REC avec une publication valide comme témoin, ainsi que refus de droits, double clic, interruption avant/après commit et reprise réseau. Tester l’activation volontaire sur mobile et l’absence totale d’effet depuis un compte tiers. Préparer ces essais ne vaut pas autorisation de provisionner ou publier en production.
