# SPACE OUTLAWS — sauvegarde, reprise et déploiement À FAIRE VALIDER

## C2e — préparation des kits initiaux M1

[C2e — huit kits de classe](SO-02-C2E-KITS-INITIAUX.md) : éléments/quantités V0.7 fermés, références aux modèles M1, diagnostics différés et contrôle commun, révisions/archives/réessais sans dotation. **1067 tests applicatifs locaux et build réussis** ; 19 nouveaux cas partagés Firestore, un cas canonique, quatre UI et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. Limite centrale 609 définitions ; fichiers Excel M1 limités aux objets. Preuves préparatoires partielles uniquement, SO-GAP-12/13/14 et 55 verdicts complets inchangés. Effets/protections actifs, publication, I3/I4/I5 et recette humaine à compléter.

## C2d — Excel des personnages M2

[C2d — import/export M2](SO-02-C2D-EXCEL-PERSONNAGES.md) : sélection privée, aperçu, fiches narratives et plans C2c, références différées/localisées, lot atomique avec révisions natives et catalogue partagé intact. **1043 tests applicatifs locaux et build réussis** ; 17 nouveaux cas partagés Firestore, quatre UI/XLSX et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. MST-01/02/07 et INS-06 : preuves préparatoires partielles ; SO-GAP-12/13/14 et les 55 verdicts complets restent inchangés. Publication, effets/dotations, I3/I4/I5 et recette humaine à compléter. Export ciblé, pas une sauvegarde globale.

## Complément C2c — plans initiaux M2

[C2c](SO-02-C2C-PROFILS-INITIAUX.md) ajoute le champ privé `creationPlan` aux définitions M2 C1e. Sauvegarder avec les changements, histoires, révisions et reçus ; les exports M1/M4 ou Masters historiques ne le couvrent pas. Omission par un ancien client conserve, null explicite retire ; un ancien lecteur C2b ne sait pas valider ces plans et ne constitue pas un retour fonctionnel équivalent. Aucun profil actif ni ressource créé, aucune migration ou restauration complète exécutée.

## Complément C2b — droit de contrôle et révisions

[C2b](SO-02-C2B-DELEGATION-CONTROLE.md) ajoute `campaignStaff.checkCentral` et lie le rapport aux droits courants. Préserver ce champ avec les révisions, historiques et reçus C1b ; les exports ciblés ne les sauvegardent pas. Désactiver efface le droit, réactiver ou rejouer un ancien reçu ne le restaure pas. Un ancien binaire C2a ferme le contrôle aux délégués et son éditeur peut effacer le champ : retrait de capacité, pas retour fonctionnel équivalent. Revalider explicitement les délégations après reprise. Aucun rapport persistant, migration, restauration complète ou production exécuté.

## Complément C2a — contrôle en lecture seule

[C2a](SO-02-C2A-CONTROLE-CENTRAL.md) ne crée ni rapport persistant, version, pointeur, reçu ni donnée économique. Son empreinte n'est pas une sauvegarde ni une autorisation de publication. Un retour logiciel conserve les contrats et états des lots antérieurs ; aucune restauration de données C2a à exécuter. Les limites agrégées du contrôleur ne sont pas une certification de charge. Publication/reprise et restauration globale restent à éprouver sur données fictives.

## Complément C1e — définitions narratives M2

[C1e](SO-01-C1E-PERSONNAGES.md) ajoute les changements `character_{id}` et délégations M2 au même ensemble cohérent du brouillon. Préserver leurs IDs, `contentRevision`, histoires et reçus avec campagne/droits/opérations. Les Masters historiques et exports ciblés M1/M4 ne les sauvegardent pas. Aucun rollback fonctionnel vers un lecteur refusant les grants M2, aucune restauration complète ni production exécutée.

## Complément C1d — reçus de lots Excel centraux

[C1d](SO-01-C1D-EXCEL-CENTRAL.md) ajoute les reçus `masterDrafts/initial/imports` à préserver avec changements/historiques et `operations`. Un export ciblé M1/M4 contient les définitions sélectionnées et le contexte, pas les droits, reçus ou historiques : il ne permet pas une restauration complète. Aucun exercice de restauration ni déploiement exécuté.

## Complément C1b — brouillon, délégations et reçus cohérents

[Contrat C1b et reprise](SO-01-C1B-BROUILLON.md) : sauvegarder ensemble le header de campagne, `masterDrafts/initial` et changements/historiques, `campaignStaff`, audit et `operations`, avec la préparation et ses admissions I1/I2. XLSX historique et archive de scénario insuffisants. Ne pas revenir à un lecteur ignorant ces droits/changements. Interruption transactionnelle, réponse perdue et restauration d’une définition archivée testées automatiquement ; **sauvegarde/restauration complète et rollback opérationnel non exécutés**. Aucun déploiement autorisé.

## Complément I2b — groupes et permissions cohérents

[Contrat et reprise I2b](SO-01-I2B-GROUPES.md) : sauvegarder ensemble `group.roster`, membres, versions, audit, opérations et autorisations, avec comptes/ledger/stocks/contrats. XLSX seul insuffisant. Ne pas revenir à un binaire pré-I2b ignorant la politique. Interruption avant commit, réessai après réponse perdue et contre-opération liée testés automatiquement ; sauvegarde/restauration complète, retour arrière opérationnel et recette mobile non exécutés. Aucun déploiement autorisé.

## Complément I2 — confirmations cohérentes

[Contrat I2 et reprise](SO-01-I2-DECISIONS.md) : sauvegarder ensemble registrations/historiques, total de session, compteurs par classe, réservations d’identité, invitations/usages, reçus/audit et contexte central. Ne jamais restaurer un seul compteur ou revenir à un binaire I1 qui ignore les confirmations. Annulation avant commit et réessai après réponse perdue sont testés automatiquement ; restauration complète et retour arrière opérationnel restent non exécutés. Aucun déploiement autorisé par ces preuves.


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

## Complément V3.4 — conception à valider avant migration

Le [plan central SO-00](SO-00-V34-PLAN-CENTRAL.md) est soumis à validation explicite conformément à la demande utilisateur. Aucune adoption de campagne ni conversion de données n’a été exécutée. Les sept ateliers importent dans un brouillon commun ; la future publication active une version complète par pointeur après contrôle global. Les sessions restent épinglées à leur configuration, et le jeu déjà effectué n’est jamais restauré par un rollback de configuration.

Inclure les futurs en-têtes/pointeurs, révisions, brouillons, changements, imports et provenance, manifestes, graphes de dépendances, publications en cours, pages et reçus idempotents dans le plan de sauvegarde. Les permissions de campagne sont distinctes des droits de session : aucune attribution héritée implicitement lors d’une adoption/restauration.

Tester REC-SO-MST-01 à 10, en plus des 24 SO, six FOR, cinq REC et dix SEC. Le test crucial doit refuser globalement une recette référençant un ingrédient absent, puis activer M1/M4/M5 en une version après correction. Tester M3 seul, deux MJ publiant sur une base obsolète, une coupure entre préparation et bascule et un rollback conservant achats/XP/stock/contrats.

La sonde SO-00 a seulement exécuté l’archive existante sans images vers un nouveau scénario et vérifié les comptes/stock de la session source inchangés. Elle ne démontre pas la restauration complète de Firebase ni un retour de pointeur V3.4, qui n’existe pas encore. Aucune sauvegarde de production effectuée. Une autorisation de ce plan ne permet ni migration d’une session active ni déploiement ; la procédure de production reste à faire approuver séparément.

## Complément V3.5 — admissions, naissances et groupes

[Diagnostic et dépendances](SO-00-V35-INSCRIPTIONS.md). Le registre comporte désormais **55 cas ciblés** (24 SO, 6 FOR, 5 REC, 10 MST, 10 INS) et 10 SEC transversaux. Aucun résultat de recette Android/iOS ou de restauration complète n’est affirmé.

Inclure dans les sauvegardes futures : propositions et historiques privés, invitations par but et reçus de consommation (jamais jetons en clair), quotas et clés d’identité fictive, progression participant/XP, réserves déjà incarnées, naissances et reçus de dotation, mandats et contre-opérations de groupe. Les liens UID restent cohérents avec Auth ; ni données civiles ni préférences d’amis dans les exports publics/M2.

Réessayer une naissance après restauration ne doit créer aucun kit, crédit protégé ou PA supplémentaire ; rejouer une vieille permission ne doit pas restaurer un mandat retiré. Tester réserve et création à chaud, deux décès dans une session, quota concurrent et transfert de groupe pendant une dépense. Les contre-opérations de groupe corrigent l’appartenance sans annuler les transactions passées ou transférer les actifs de la caisse. La restauration d’un Master n’est pas le retour arrière du jeu vécu.

Cette tranche ne change que documentation et tests : aucun retour arrière de données nécessaire, aucun revert exécuté. Une future adoption de campagne reste soumise au plan de migration validé et à la preuve de restauration isolée. Le déploiement reste **À FAIRE VALIDER, NON LANCÉ**.


## C1a — contexte neuf et retour logiciel

[Guide C1a](SO-01-C1A-PREPARATION.md). Les nouvelles préparations conservent une identité campagne/session, une empreinte d’intention, des révisions, reçus d’opérations et grants de session. Inclure ces éléments et leurs journaux dans la sauvegarde cohérente avec Auth. Ne jamais supprimer les reçus puis rejouer une création.

Un ancien binaire ignorant `preparationKind` ne protège pas ces contextes. Dès qu’ils existent, un rollback exige suspension des écritures et conservation d’une garde compatible, ou restauration cohérente explicitement approuvée ; un simple revert n’est pas présenté comme sûr. Les tests simulent seulement une exception avant commit puis un réessai. Sauvegarde/restauration intégrale et rollback logiciel réels : NON EXÉCUTÉS. Aucun environnement de production n’est modifié.

## Complément I1 — aucune opération de production exécutée

Conserver avec C1a le brouillon initial et ses changements/historiques, les paramètres d’admission, registrations/historiques, invitations/usages, grants, audit et reçus operations. Ne jamais restaurer isolément les compteurs de liens ou supprimer les reçus pour rejouer une création. Le test d’exception avant commit démontre l’atomicité, pas une restauration complète. Retour à un ancien binaire ignorant C1a/I1 interdit comme procédure implicite ; geler les écritures puis conserver une garde compatible ou faire valider une restauration cohérente. [Détails et limites I1](SO-01-I1-ADMISSIONS.md).
