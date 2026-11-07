# Space Outlaws — groupes et factions en session

Depuis le 7 novembre 2026, les versions avec `groupStockVersion=1` permettent au MJ d’attribuer des entrepôts privés dans **Groupes et mandats → Entrepôts de groupe**. Le MJ choisit le groupe et la capacité. L’entrepôt est attribué à ce groupe pour la session et se retrouve à l’épisode suivant.

Un mandat de dépôt permet de céder un bien ordinaire du sac au groupe. Un mandat de consultation permet de voir le stock. Un retrait exige la consultation et le droit de retrait. Les confirmations annoncent le changement de propriétaire. La régie peut fermer les dépôts tout en laissant les retraits autorisés. Les opérations confirmées figurent au journal. La caisse, la location et le pilotage relèvent de parcours distincts.

Depuis le 7 novembre 2026, les sessions issues d’une version publiée avec `groupWalletVersion=1` disposent des deux mandats de caisse. Les propositions M2 conservent leurs droits de briefing et de liste des membres. Les mandats financiers se valident explicitement dans la régie de session.

Dans **Groupes et mandats**, le MJ ouvre la caisse d’un groupe configuré à zéro et choisit le libellé visible lors des paiements. Les joueurs la retrouvent sous **Mon groupe → Mes caisses de groupe**. Un titulaire autorisé peut l’alimenter depuis son portefeuille ordinaire. Consulter ouvre le solde et l’historique. Payer autorise la dépense pendant le jeu et masque ces données si le droit de consultation est absent. Les paiements confirmés réutilisent le journal natif. Un changement de mandat invalide la confirmation, et le solde reste attaché au groupe. Cette tranche couvre la caisse. Les biens et le pilotage collectif restent à raccorder.

Mise à jour : [raccord des définitions et propositions M2](SO-GROUPES-M2.md). La limitation historique sur leur publication, décrite ci-dessous pour la première tranche, est levée pour les nouvelles versions compatibles.

6 novembre 2026. Auteur : Codex. Base `f40023ab225295a7cdf7241a16e0c7758ee582f9`, [CI 42206813645](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42206813645) completed/success, huit jobs, 957 applicatifs / 750 Firestore / 22 HTTP. Même branche et PR nº 2.

## Parcours livré

Source : [CDC V3.5 §§4.8, 4.10, 4.11 et INS-05/09/10](source/SO_CDC_V35.md). Les commandes de régie existantes sont réutilisées : créer/configurer, affecter/retirer/transférer, responsable, archivage/restauration et contre-opération auditée. Équipe principale unique ; factions cumulables ; capacité explicite, membres cachés compris. Aucun personnage, kit, crédit, inventaire, vaisseau ou compte n’est créé par cette régie.

`groupsVersion=1` entre dans la confirmation de publication et le manifeste vérifié ; propagation à la naissance, cohérence contrôlée et activation des espaces de groupe pour cette version seulement. Les anciens manifestes/sessions restent inchangés et fermés. Le premier import de définitions `group` depuis M2 reste explicitement bloqué : cette tranche concerne les opérations de session. Aucun contournement des gardes ni réédition du Master scellé.

La capacité serveur GROUP_MANAGEMENT autorise uniquement les groupes et leur historique ; session limitée à sa révision par le garde existant. Autorité propriétaire/MJ courante avant lecture, aperçu, mutation et ancien reçu ; Accueil/joueurs refusés. STOP ferme les mutations et la préparation ; PAUSE conserve la régie, clôture/archive/scellement ferme les mutations. La limite technique de 50 groupes reste cohérente avec les parcours de décès/relève existants ; ce n’est pas une nouvelle règle d’effectif. La capacité de chaque groupe reste choisie explicitement (vide : non bornée dans le groupe, zéro : aucun membre actif).

Les permissions offertes dans ce premier raccord sont Lire le briefing et Lire les membres. Toutes les autres attributions SO sont refusées côté serveur et absentes du formulaire ; aucune permission de caisse, stock, mission ou pilotage n’est ouverte implicitement. Un responsable n’acquiert aucun droit supplémentaire. Un transfert révoque tout le mandat précédent, ne conserve que les nouvelles cases explicitement validées et libère le poste de responsable. La contre-opération doit préciser les nouveaux droits et respecte les contraintes actuelles.

Le décès confirmé retire les appartenances et responsabilités par le service existant ; les lectures joueur sont également fermées au personnage décédé. La relève ne reprend aucun mandat : une nouvelle affectation est nécessaire. Les groupes/mandats continuent dans l’épisode suivant par la sauvegarde native, sans réaffectation ni nouvelle dotation.

## Écrans et validation

Lien depuis l’entrée SO et la session vers la régie native. Les boutons historiques de création/modification/activation non raccordés sont remplacés par ce lien. La page montre le décès et les seules permissions disponibles ; les anciennes sessions sont en consultation. Aucun module métier parallèle.

Onze nouveaux tests partagés mémoire/Firestore : parcours natif, confidentialité, transfert/contre-opération, dernière place concurrente, équipe unique/factions, privilèges/STOP/ancienne version, décès/relève, idempotence/archivage, MJ révoqué avant reçu, rollback, capacité bornée, continuité d’épisode et ancien manifeste. Les suites génériques de groupes, régie et succession restent sélectionnées. HTTP/Auth : identités authentifiées avant les accords, création/affectation/transfert, secret quitté inaccessible, joueurs/tiers refusés (Accueil contrôlé dans la suite partagée), aucun changement du portefeuille et accès joueur révoqué.

Profil targeted-space-groups : 82 fichiers applicatifs et 48 suites Firestore, 23 HTTP sélectionnés, navigateur global désactivé. Borne technique du sélecteur applicatif portée de 80 à 96 pour conserver les régressions cumulées de la branche et la relève ; aucune suite globale lancée ou prétendue. Résultats locaux exacts et CI du commit candidat consignés dans PR nº 2 après exécution. Émulateurs réservés à CI Node 22/Java 21 ; Node 24.22.1 local.

Navigateur local : quatre parcours Chromium 153.0.8010.0, bureau 1280×900 et petit écran 360×800 tactile simulé : création et affectation confirmée, transfert sans héritage, STOP. Composants réels et commandes natives sur MemoryStore, sans réseau distant ; absence de débordement contrôlée et captures inspectées. Aucun appareil réel, authentification Firebase navigateur ou recette humaine complète revendiqué.

## Limites et reprise

Cette tranche améliore §4.11 et INS-09/10 sans les certifier intégralement. Restent : publication des définitions M2 et réserves affiliées, demandes d’amis intégrées à cette régie, recherche unifiée des réserves/remplacés et mandats collectifs de caisse/stock/mission/pilotage. Le cycle Master Vn+1 reste distinct et absent. Aucun pourcentage global ou conformité complète n’est déduit des tests.

Conserver code, version publiée/marqueur, modules, appartenances/révélations/permissions/responsables, révisions/historiques, accès courants, transitions décès/relève, sauvegardes/épisodes et reçus cohérents. Ne pas ajouter le marqueur à une ancienne session, recopier une adhésion vers un successeur ni rejouer une dotation. Aucun déploiement Firebase, fusion main, migration ou restauration externe.
