# SO-01 I2b — régie des groupes et mandats de session

23 octobre 2026. Candidat 0.37.0, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Développement additif sur sessions synthétiques ; aucune adoption de campagne, migration historique, fusion ou production.

## Reprise vérifiée

- `main` : `03eaace155b052d1b7d1960347746e9ee60ed514`, 0.36.0.
- Branche distante avant I2b : `e35504a3da0b32c02c6d141aa4955da3524ce6b5` ; checkout local `7a20ff50dcf45bc7dbbb728a9b31438a0ab94edd`, arbre commun `082ac22d69ef6bf391d67c3a756ac8caae98195b`. PR ouverte, draft, non fusionnée. Autres branches conservées.
- I2 revérifié : push [39985131605](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985131605), job 120522208581 ; PR [39985139814](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39985139814), job 120522238880. Deux succès, chacun 846 tests applicatifs, 658 Firebase, build ; zéro échec/annulé/ignoré/todo. Node 22.23.3, Temurin 21.0.12+1. Fin le 23 octobre à 18:34:39 et 18:35:52, heure de Bruxelles. Ces preuves concernent I2 seulement.
- [Description I2 conservée](PR-1-HISTORIQUE-AVANT-I2B.md) ; l’historique L1→I1 est déjà conservé dans `PR-1-HISTORIQUE-AVANT-I2.md`.
- `check.yml` : push/PR, Node 22, Java 21, délai 40 min, tests avec `demo-gn-engine`. Le workflow de déploiement et son marqueur sont inchangés et ne sont pas déclenchés.

## Matrice V3.5 / existant / adaptation / nouveau

| Exigence §4.11, INS-09/10 | Réutilisé | I2b | Limite / dépendance |
|---|---|---|---|
| Création, type, capacité, responsable, archivage | Documents `groups`, membres et permissions actuels | Politique optionnelle `group.roster`, interface de régie, opérations motivées | Configuration explicite seulement ; pas de conversion des groupes historiques |
| Affecter, retirer, transférer | `groups.members`, caractères de session | Préparation sans écriture puis transaction source/destination, confirmation liée aux révisions | Ne crée pas de personnage ni d’incarnation ; I3/I4 requis pour les préparations I2 |
| Droits indépendants du souhait de groupe | 12 permissions existantes | Toutes décochées dans le formulaire ; autorisation explicite des nouveaux droits | Aucune mécanique d’espèce/classe/Force ajoutée |
| Accès caisse/stock/pilotage/missions | Contrôles des consommateurs existants | Révocation et lecture de l’état actuel ; garde d’archivage commune | Un paiement déjà commis reste valide ; contrat/stock demeurent au groupe |
| Responsable | Appartenance existante | Membre actif seulement ; départ libère le poste | Aucun droit déduit du titre |
| Recherche et sélection MJ | Personnages actuels de session | Filtre nom / affecté / non affecté / hors combat ; lien depuis fiche | Hors combat n’est pas décès ; réserve jamais incarnée et relève I5 absentes |
| Audit et annulation | `audit`, `groups/*/history`, `operations` | Événement commun avant/après, auteur, motif, source/destination ; contre-opération liée et revalidée | Pas de restauration aveugle ni annulation financière |
| Masters et campagnes historiques | Importeur, groupes, snapshots, archives existants | Contenu modifiable, politique préservée ; contournement des membres gérés refusé | Nouveaux champs de régie non représentés dans les colonnes XLSX historiques |
| Opération en cours de GN | Transactions de session | Aucune publication/republication de campagne | Nouvelle naissance et retrait automatique des mandats au décès restent I5 |

SO-GAP-16 est **partiellement traité** ; SO-GAP-14/15 et SO-GAP-12/13 restent ouverts. I2b appartient à SO-01/SO-06 et ne remplace pas le Master central M2.

## Contrat minimal

`groups/{id}.members` reste l’unique liste d’appartenances. Aucun annuaire ou catalogue parallèle. L’ajout optionnel est :

```json
{"roster":{"kind":"TEAM","capacity":6,"leaderId":null,"archived":false}}
```

Le 6 est un exemple technique, pas un barème canonique. `TEAM` représente une équipe principale, au plus une active par personnage parmi les groupes explicitement gérés ; `FACTION` permet plusieurs affiliations. Capacité entière ≥ 0 ; `null` signifie sans limite explicite, 0 ferme les places. Tous les membres actifs comptent, y compris cachés. La configuration d’un groupe déjà rempli doit respecter ces contraintes. Les groupes sans `roster` gardent leur comportement historique ; ils doivent être configurés explicitement avant un transfert dans la régie. Aucune qualification automatique d’un ancien groupe.

Les commandes réutilisent l’autorité serveur OWNER/MJ de la session. Accueil et joueurs exclus. Lecture des droits actuels avant tout reçu d’idempotence. Session finie, archivée ou scellée : consultation seulement. Préparation C1a : refus, car aucune incarnation n’y existe ; la garde n’est pas affaiblie.

| Commande | Effet |
|---|---|
| `groupManagement` | Vue MJ des groupes/personnages et opérations de groupe parmi les 100 derniers événements de session |
| `saveGroupRoster` | Créer/configurer explicitement contenu et politique ; révision de groupe requise ; aucune caisse/dotation |
| `setGroupArchived` | Archiver en révoquant toutes les permissions et appartenances, ou restaurer sans réactiver les droits |
| `prepareGroupMembership` | Lire et vérifier source/destination, capacité, équipe unique, mandat explicite ; retourner conséquences + empreinte ; aucune écriture |
| `applyGroupMembership` | Revérifier la préparation puis modifier les deux groupes, leur historique, l’audit, la révision de session et le reçu dans une transaction |

Source absente = ajout ; destination absente = retrait ; même source/destination = modification explicite du mandat. Un transfert désactive la source, retire révélation/visibilité/affiliation publique et les 12 droits ; les nouveaux droits sont ceux expressément choisis. Le responsable sortant n’est pas remplacé automatiquement. Une contre-opération référence l’événement inverse du même personnage, revérifie les contraintes actuelles et exige de nouveaux choix de permissions. Elle conserve l’opération initiale et les transactions financières.

L’empreinte lie session/révision, personnage, révisions des groupes, source/destination, permissions, motif et événement inversé. Concurrence ou préparation périmée : refus ou nouvelle préparation, jamais de combinaison partielle. Un reçu connu rejoue uniquement le résultat déjà enregistré si l’autorité est encore valable. Identifiant de commande réutilisé avec un autre contenu : refus.

Les caisses, lots, entrepôts, navires, contrats et informations personnelles déjà acquises ne changent ni de propriétaire ni de quantité. L’accès futur aux espaces collectifs est relu depuis les permissions courantes par les services existants. Aucune suppression rétroactive de ce que le joueur a déjà appris.

## Parcours organisateur

Dans une session ordinaire : **Régie des groupes**, ou **Gérer ses groupes** depuis une fiche. Configurer le groupe avec un type/capacité explicites ; choisir son contenu public/secret et son état de publication local. La publication d’un contenu de groupe ici est le mécanisme historique de session, pas une publication du futur Master central.

Sélectionner un personnage, puis le groupe à quitter et le destinataire ; choisir les révélations et nouvelles permissions. Vérifier le récapitulatif et appliquer. Le groupe doit être publié, révélé au personnage et le module activé pour rendre les accès effectifs. Le titre de responsable n’accorde aucune permission. Les historiques détaillent avant/après ; le journal propose une contre-opération. Les formulaires conservent l’identité de commande lors d’un réessai réseau dans la page.

## Compatibilité et conservation

- Quatre fichiers XLSX inchangés, empreintes revérifiées identiques à SO-00. Aucun identifiant QR renommé.
- `groupInput` conserve la politique existante. Sur un groupe géré, les anciens éditeurs/imports ne peuvent modifier les membres ; ils retournent `GROUP_ROSTER_MANAGED`. Les éditions de contenu continuent et conservent membres/politique. Ce refus est intentionnel : passer par la commande atomique de régie.
- Pas de colonne ajoutée aux Masters historiques : un export XLSX seul n’est pas une sauvegarde de la nouvelle politique de régie. Réimport dans le même groupe géré conserve la politique ; import vers une destination vide nécessite une configuration explicite ultérieure. Ne pas annoncer ce fichier comme un export intégral de session.
- L’archive de scénario conserve/valide la politique optionnelle et les références ; les copies intégrales de groupes du moteur de campagne restent utilisées. Les archives historiques sans ce champ restent lisibles. La politique ne devient pas un second catalogue M2.
- Aucun changement de règles/index Firebase, production, secrets, IAM, DNS, configuration Firebase ou `.github/deploy-request.json`.

## Preuves réellement exécutées

| Contrôle | Résultat à la constitution du commit |
|---|---|
| Tests ciblés mémoire + rendu | 23 réussis : 19 métier et 4 UI ; zéro échec/ignoré/annulé/todo |
| `npm test` complet | **869 réussis**, zéro échec/annulé/ignoré/todo ; 20 366,628413 ms ; Node 24.19.0 |
| `npm run build` | Réussi ; interface compilée |
| Syntaxe HTTP/Auth ajouté | `node --check test/integration/http.test.mjs` réussi ; cela n’est pas une exécution HTTP |
| Intégrité | `git diff --check` réussi ; quatre SHA-256 Masters identiques ; fichiers protégés inchangés |
| Firebase Emulator local | **Non exécuté** ; Java local 17, workflow de test configuré Java 21 |
| GitHub Actions de ce commit | À vérifier après push ; SHA, runs/jobs, décomptes et outils consignés dans la PR après terminaison, conformément à AGENTS |
| Navigateur, Android/iOS, réseau réel, restauration complète | **Non exécutés** |

Journaux locaux : [npm test](verification/so-i2b-npm-test.log), [build](verification/so-i2b-build.log). Les 19 cas métier sont aussi raccordés à Firestore. Un nouveau cas HTTP utilise le véritable handler avec Auth/Firestore Emulator : propriétaire/joueur, transfert et reçu, absence de création de patrimoine. Aucun résultat Firebase anticipé dans ce document.

Couverture ciblée : capacités, type et responsable, absence de dotation, préparation sans effet, autorisation explicite, transfert et patrimoine, unicité TEAM/factions cumulables, dernière place concurrente, même personnage concurrent, double clic/réponse perdue, interruption avant commit, modification/retrait/contre-opération, archive/restauration sans réactivation, clôture/scellement, frontière C1a, rôles/révocation avant reçu, isolation de session, accès briefing/stock/pilotage/missions, paiement concurrent dans les deux ordres, compatibilité Master, archive de scénario et champs échappés UI.

Les droits stock/pilotage/représentation sont vérifiés via leurs fonctions métier de contrôle réelles ; ce ne sont pas de nouveaux parcours complets de fret/mission sur navigateur. Une interruption est injectée dans la transaction ; aucun téléphone n’a subi de coupure réseau physique.

## Reprise, contre-opération et retour arrière

1. En environnement isolé, préparer un transfert puis injecter une interruption avant commit : état des deux groupes et session strictement identique ; rejouer une seule fois après reprise. **Exécuté automatiquement**.
2. Après commit avec réponse perdue, rejouer le même identifiant : même événement, pas d’autre appartenance ou histoire. **Exécuté automatiquement**, ainsi que double clic.
3. Pour corriger une décision déjà validée, préparer une contre-opération liée ; si le groupe est plein, refuser ; après libération de place, appliquer sans droits hérités. **Exécuté automatiquement**.
4. Sauvegarde complète future : capturer ensemble sessions, groupes avec `roster` et membres, historiques, audit, reçus d’opérations, autorisations, comptes/ledger/stocks/contrats et liens Auth/Storage. Export XLSX insuffisant. Restaurer ce point cohérent sur cible isolée, vérifier les propriétés, puis rejouer les contrôles de droits avant réouverture. **Procédure seulement, non exécutée**.
5. Ne pas revenir à un binaire pré-I2b sur des données contenant `roster` : il ignorerait unicité/capacité/garde des membres et risquerait de perdre les métadonnées. Conserver un lecteur et les gardes compatibles, ou concevoir/faire valider un retour arrière spécifique sur sauvegarde isolée. Aucune conversion rétrograde ni restauration réelle effectuée.

## Limites et suite minimale

INS-09 reste incomplet tant que le successeur réel n’est pas créé par I5. INS-10 possède une preuve automatique de transfert/paiement concurrents, mais pas la recette sur deux appareils. Les 55 recettes complètes restent NON TESTÉ dans le registre ; aucun certificat V3.5/V0.7 global.

Ordre suivant : **C1/C2** brouillon central, contrôle global/version et publication atomique, puis **I3** proposition approuvée → M2, **I4** incarnation/kit/200 Cr protégés/QR avec revalidation des quotas, **I5** décès/succession et révocation automatique des anciens mandats. La régie I2b sera réutilisée. Toute adoption ou migration de campagne réelle exige la validation préalable du plan V3.4 ; aucune opération de ce type ici.

Le produit complet n’est pas prêt pour une session réelle. La procédure de déploiement demeure [à faire valider](SO-SAUVEGARDE-DEPLOIEMENT.md), jamais lancée par cette tranche.
