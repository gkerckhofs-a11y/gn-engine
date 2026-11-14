# Vaisseau partagé et équipages — 14 novembre 2026

## Audit et base de travail

Demande : cahier des charges « Module Vaisseau et gestion des équipages » v1.0 du 13 novembre, fourni par Guillaume. Le capitaine et ses pouvoirs de recrutement/licenciement sont une **extension fonctionnelle demandée**, pas une disposition attribuée au livre V0.7.

- `origin/main` examiné : `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`, publication Firebase suspendue. Le `main` local est plus ancien ; il n’est pas utilisé comme base.
- PR #2 et #15 fermées et fusionnées ; aucun de leurs anciens travaux n’est réimplémenté.
- Dépendances ouvertes : PR #35, navigation organisateur (`216246008b592b9278c842ccf0222b6c6cabf1b6`), puis PR #36, circuits personnels et commerciaux (`18c31953bd956540e4a8fadc7ff011332dd608fb`). Leurs CI propres sont réussies ; elles ne certifient pas ce nouveau lot.
- Branche : `work/shared-ship-crew`, issue du dernier commit de #36. La nouvelle PR doit viser cette branche de dépendance, sans fusionner les PR précédentes.
- Sources examinées : `AGENTS.md`, `SO-AGENT-OPERATIONS.md`, `docs/source/SO_Regles_V07.txt` chapitres 17–25, CDC V3.5 et V3.6, matrice Space Outlaws, audit global du 6 novembre, rapport de validation courant. Aucune de ces règles n’est modifiée.

## Matrice de réutilisation

| Besoin | Moteur ou projection conservé | Raccordement du lot |
|---|---|---|
| Vaisseaux, droits de propriétaire et pilote | `space-outlaws-voyages.mjs`, `space-outlaws-navigation-state.mjs`, groupes | Projection minimale `myShips` / `shipWorkspace`, carte et page par ressource ; ancienne navigation conservée |
| Routes et préparation | `prepareVoyage`, `departShip`, `finishSoPreparation`, PIL-01 | Formulaires natifs intégrés à Navigation ; aucune route inconnue révélée par la nouvelle projection |
| Poste cockpit et décollage | `requestSoLaunch`, `assignSoCockpit`, `cockpitStation`, `cockpit-command.mjs` | Le poste reste distinct, affecté par MJ ; même contrôle transactionnel du pilote et du voyage engagé |
| Ravitaillement | `prepareRefuel`, `refuelShip`, `finishSoRefuel` | Rubrique Carburant ; stock réel, capacité, réservations et délai natif de 120 secondes ; 0 PA |
| Contribution de carburant | `inventory-transfers.mjs`, politique personnelle et inventaire natifs | Remise volontaire au pilote courant, avec intention liée au vaisseau et contrôle serveur à la préparation ET à la réception ; puis ravitaillement séparé |
| Soute et manutention | `cargo.mjs`, `cargo-batches.mjs`, droits sur lots, contrats et groupes | Mandat d’équipage borné ajouté au contrôle d’accès ; mêmes tranches de 5 volumes / 180 secondes, propriété et réservations |
| Réparations / révision | `space-maintenance.mjs` | Interventions autorisées du même vaisseau intégrées ; demande de devis non financière du capitaine ou propriétaire |
| Modules | `space-module-mandates.mjs`, `space-module-work.mjs`, modules installés | Accords et travaux du même vaisseau intégrés ; accord spécifique du propriétaire, compétences, atelier et PA inchangés |
| Rencontres et assistance | `space-combat.mjs`, `space-rescue.mjs` | Garde complémentaire de mandat courant ; poursuite des engagements déjà verrouillés selon contrôles natifs |
| Propriété collective | Roster, `pilotShip`, pilote de groupe et contrats existants | Un mandat de capitaine collectif se propose en régie ; il ne crée aucune adhésion au groupe ni droit de pilotage de groupe |
| Journal | `logisticsHistory` et historique d’équipage | Projection bornée et expurgée, libellés génériques natifs ; ni raisons privées, ni UID, ni quantités/noms de biens tiers |
| Recrutement / retrait | Nouveau service `ship-crew.mjs`, identités et transactions existantes | Racine liée au propriétaire courant, invitations volontaires, révision des mandats, journal et reçus ; aucun moteur de jeu supplémentaire |

## Interface

Le Terminal affiche **Mes vaisseaux**, une carte par vaisseau consultable, avec nom, illustration disponible, profil, état et rôle. Les dossiers transversaux et les engagements encore à terminer restent récupérables même après la perte d’accès à la fiche du vaisseau.

`#/ship/SESSION/VAISSEAU` ouvre le module partagé : Navigation, Carburant, Soute si capacité positive, Maintenance si pertinente, Équipage et Journal selon permissions. Retour permanent au Terminal ; interface adaptable au téléphone. La révocation ferme aussi l’accès résiduel du pilote dans les listes de fret et d’alliances ; les historiques dont il est personnellement participant restent indépendants. Les anciennes routes `flight`, `spaceport`, `hold`, entretien, modules et rencontres restent disponibles.

`#/ship-admin/SESSION/VAISSEAU` ouvre la supervision du même objet depuis le spatioport MJ, avec retour à la régie. Les droits `content` de l’organisation sont contrôlés par les services natifs. La route ne donne aucun droit.

Les invitations apparaissent dans le Terminal personnel. Le code court, l’identifiant ou le QR public du personnage passent par le parseur et le résolveur d’identité existants. Le scanner n’envoie jamais l’invitation automatiquement. Le destinataire voit les permissions proposées et accepte ou refuse.

## Droits ajoutés et limites de délégation

| Identité ou mandat | Droits du nouveau module | Droits conservés séparément |
|---|---|---|
| Propriétaire personnage | Consultation, invitations, proposition/retrait de capitaine, gestion d’équipage, demande de travaux | Propriété, biens, portefeuille et accords natifs ; aucun pilotage automatique si un autre pilote est désigné |
| Capitaine accepté | Seulement les pouvoirs accordés : recruter, gérer les rôles, désigner un pilote, déléguer la logistique, demander des travaux | Aucune propriété, compétence, capacité financière ni adhésion à une faction accordée |
| Pilote recruté | Appartenance volontaire ; qualification PIL-02 vérifiée | Affectation native au vaisseau également nécessaire ; contrôles de port, disponibilité, qualification et cockpit conservés |
| Mécano | Consultation générale et suivi des interventions si autorisé | Chaque travail conserve son accord, ses consommables et le niveau MEC-02 / MEC-03 requis ; le rôle ne crée aucune compétence |
| Responsable fret, toute classe | Soute et ses propres marchandises avec mandat logistique ; fret du propriétaire seulement si délégation supplémentaire | Pas de vente de biens tiers, de fret réservé à un contrat, de sac personnel tiers ni d’accès à un compartiment clandestin par ce seul mandat |
| Courtier sans mandat | Même accès général que les autres membres | La centrale reste son service professionnel ; sa classe ne donne pas accès à cette soute |
| Passager temporaire | Consultation, journal facultatif ; durée explicite en minutes de jeu | Aucun droit logistique, technique, de contribution ou de pilotage ; présence au manifeste traitée indépendamment |
| Membre extérieur / révoqué | Pas d’accès au vaisseau par URL | Biens, contrats, créances, groupes et mandats natifs indépendants ne sont pas supprimés |

La portée d’écriture `SHIP_CREW` ne couvre que `shipCrews` (membres, historique, demandes) et `shipCrewInvitations`. Les opérations de gouvernance n’écrivent ni les vaisseaux, ni les personnages, compétences, PA, comptes ou inventaires. Les droits sont relus **avant** les reçus réutilisés ; une ancienne commande de recrutement ne rétablit pas un mandat révoqué.

Les invitations sont liées à la session, au propriétaire courant, aux versions d’identité et à l’autorité de leur émetteur. Une candidature à PILOT sans PIL-02 est refusée. Les propositions émises par un capitaine deviennent périmées après sa révocation. Un propriétaire de groupe doit passer par la régie pour nommer un capitaine : le statut de chef du groupe n’est pas interprété comme un nouveau pouvoir de propriété.

Une mise à jour de rôle vers PASSENGER exige une nouvelle invitation temporaire. Les fonctions ordinaires du capitaine ne modifient pas sa propre autorité ; elles ne retirent pas les droits du propriétaire et ne changent pas le propriétaire.

## Opérations engagées et données conservées

- Retrait à quai sans engagement : membre retiré, nouvelles opérations interdites.
- Membre au manifeste actif : retrait programmé pour l’escale ; aucun manifeste, voyage ou pilote en manœuvre n’est réécrit. Les informations générales nécessaires au voyage restent consultables.
- Pilote déjà engagé : seule la continuation du vol ou de l’opération verrouillée reste possible. Nouveau départ, nouveau plein ou nouvelle embuscade ne réutilisent pas le mandat retiré. La relève effective passe par le contrôleur natif, à quai et hors opérations bloquantes.
- Manutention réservée : instantané de sa permission, lié à l’identité et à cet unique transfert. Le retrait ou le remplacement du capitaine n’empêche pas la clôture de cette réservation ; aucun nouveau mouvement n’est permis. Le reçu de clôture reste idempotent pour son acteur authentifié.
- Les devis/travaux techniques nominatifs préexistants gardent leurs autorisations spécifiques et leurs contrôles natifs ; ils ne sont pas annulés par un changement de rôle d’équipage.
- STOP, phase de session, PA, compétences, indisponibilité, capacité, port, durées et réservations restent vérifiés par les commandes concernées. Les gouvernances volontaires sont possibles en briefing, en jeu et en pause, hors STOP ; elles ne font pas progresser le jeu.
- Aucun changement de personnage, lot, crédit, contrat, rémunération ou appartenance à un groupe/faction lors d’une simple navigation ou d’un retrait d’équipage.

## Carburant : procédure effectivement retenue

Le pilote désigné garde **seul** la confirmation du ravitaillement. Un équipier autorisé peut proposer un voucher compatible et transférable à ce pilote. Le donateur reste propriétaire jusqu’à l’acceptation ; aucune quantité n’est réservée par une simple proposition. Le destinataire accepte la remise dans son sac, puis prépare le ravitaillement natif, qui réserve réellement les unités et vérifie la capacité.

Un changement de pilote, de mandat ou de lot invalide une contribution ouverte. Deux propositions concurrentes ne consomment pas deux fois les unités. Les lots protégés ou initialement personnels non transférables restent refusés. Aucun carburant collectif synthétique, aucun portefeuille de carburant parallèle et aucune réécriture de la règle V0.7.

## Validation constatée

Sur les arbres locaux successifs du lot, sans additionner les sélections qui se recouvrent :

- 184 tests de régression ciblés réussis, puis **199 tests ciblés réussis** après compléments : module, équipages, fret, carburant, navigation, pilotage collectif, cockpit, maintenance, modules, rencontres, terminal et résolution des identités. Compilation réussie.
- 24 parcours dédiés **réussis sur Firestore**, projet fictif `demo-gn-engine` ; contrôle complémentaire ajouté pour changement de capitaine pendant manutention. **58 tests Firestore élargis réussis**, dont le changement de capitaine pendant manutention, navigation, cockpit et pilotage collectif. Puis **5/5** pour la projection finale, dont le profil équipé. Le complément de fermeture des anciennes listes après révocation est couvert par 69 tests ciblés réussis ; un cas supplémentaire de retrait du pilote au cockpit passe en mémoire, avec départ/arrivée et réessai natifs. CI exacte à constater dans la PR.
- Nouveau parcours HTTP/Auth **réussi** : propriétaire joueur, capitaine volontaire, extérieur, refus anonyme, refus de régie pour joueur, confidentialité et refus après révocation, y compris une commande ayant déjà un reçu.
- Trois tests de l’essai solo réussis, dont les **huit classes recrutées dans la même session** avec égalité des personnages, vaisseaux, inventaires et comptes avant/après. Ni nouveaux comptes Google ni sessions dupliquées.
- Recette Chromium ajoutée : accord du capitaine, recrutement d’un Mécano, parcours à 390 px, clavier, suppression de mandat, refus par URL, régie sur PC. Résultat CI et captures à constater ; le navigateur local est bloqué par l’environnement de lancement. Aucune recette humaine Android/iOS ou partie GN réelle n’est revendiquée.

Première CI du lot : 3 181/3 183 tests applicatifs réussis, deux attentes d’interface encore dirigées vers l’ancien lien du Terminal. Elles ont été actualisées vers la page Vaisseau avec maintien du contrôle de la route `flight` ; 17/17 tests concernés réussis localement. La CI complète du nouveau commit doit être constatée avant toute conclusion globale.

Commandes : `node --test` avec les fichiers ciblés du lot et régressions mentionnées ; `npm run build` ; `git diff --check` ; `firebase emulators:exec --project demo-gn-engine --only firestore,auth,storage` avec suites nommées et cas HTTP ciblé. Les commandes d’émulateur utilisent uniquement le projet fictif ; ce ne sont pas des publications Firebase.

**Aucune fusion, aucun déploiement, aucune migration, aucune modification d’un Master publié ou d’une session réelle.** Le workflow de publication Firebase reste suspendu. Le candidat exact, l’état CI final et les éventuelles limites sont consignés dans la PR ; une CI parent ne remplace jamais ces preuves.
