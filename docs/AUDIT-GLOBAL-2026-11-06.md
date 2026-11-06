# GN Engine / Space Outlaws — audit fonctionnel du 6 novembre 2026

**Auteur : Codex, à la demande de l’organisateur. Périmètre : V3.5 + extension V3.6 D12 + règles V0.7 et décision B sur MOD-05.**

Mise à jour du même jour : [première régie de groupes SO](SO-GROUPES-SESSION.md) raccordée sur la branche candidate, sans publication des définitions M2 ni opérations collectives. Les résultats CI exacts du candidat sont consignés dans la PR nº 2.

## Décision et état du produit

Le socle, la première publication, les inscriptions, la naissance/succession, la santé, les fouilles D12 et une grande partie de la chaîne spatiale sont développés. Le parcours individuel de remorquage est désormais raccordé à l’achat/montage réel de MOD-05, au plein, aux trajets et à la récupération PNJ payante. **Le produit complet n’est pas encore conforme à tout le cahier des charges et ne peut pas être déclaré prêt pour un GN réel.**

Les principaux travaux restants sont : les compétences de terrain non raccordées (Rogue, Infiltrateur, plusieurs actions rares/médicales/commerciales), les modules de droïdes, la Force PNJ, les recettes et doses, la publication des groupes M2 et leurs opérations collectives, l’évolution du Master après publication initiale, les assurances, la propriété/revendication/casse des épaves et l’identité documentaire. La recette Android/iOS, la charge et une vraie restauration restent à réaliser.

Ne pas utiliser les anciennes sections « restant à développer » du README ou des rapports historiques comme état courant : certaines décrivent des étapes de préparation antérieures à la publication/naissance effectivement livrée. À l’inverse, une compétence présente dans un catalogue d’apprentissage n’est pas la preuve que son action fonctionne en jeu.

## Références, méthode et limites

1. Organisateur, 23 octobre 2026 : [CDC V3.5](source/SO_CDC_V35.md), exigences §§3–9 et recettes §11.
2. Organisateur, 26 octobre 2026 : [extension V3.6 D12](source/SO_CDC_V36_Fouilles_Medias.md). Le document Word actuel a également été relu pour cet audit ; même distinction lieux D12 / TRA-02.
3. Organisateur, 23 octobre 2026 : [règles V0.7](source/SO_Regles_V07.txt), notamment chapitres 3–22 et annexes A01–A38 ; [vade-mecum](source/SO_Vademecum_V01.txt).
4. Organisateur, 5 novembre 2026 : décision B conservée dans [le rapport courant](SO-VALIDATION.md) : panne MOD-05 = attelage conservé et attente du rétablissement.
5. Code et tests du candidat de la branche `work/space-pilot-handover`, [PR nº 2](https://github.com/gkerckhofs-a11y/gn-engine/pull/2). Base de reprise `05c1eec4afe3ed4fbde294c3a50de149e41b08f5`, [CI 42201564805](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42201564805) terminée avec succès (8 jobs requis).

Audit de couverture fonctionnelle : lecture des contrats, portes de publication/naissance, services, tests et parcours ciblés ; deux sondes natives isolées pour lever les ambiguïtés groupes/Master. Ce n’est pas une certification de sécurité exhaustive, un test physique, ni une mesure de charge. Aucun état de production ou résultat humain n’est déduit de la présence d’un fichier ou d’une CI verte.

**Légende : D = développé et raccordé dans le périmètre indiqué ; P = partiel ; A = parcours canonique absent/non raccordé ; R = recette externe ou terrain non exécutée.** Les tests cités sont des preuves de couverture du code, pas une attestation que chaque recette globale a été rejouée intégralement dans cette intervention.

## Remorquage : résultat et frontière exacte

| Parcours | État du candidat | Preuve principale |
|---|---|---|
| MOD-05 cargo/transport : modèle M1, offre au tarif canonique, publication sans dotation, achat en crédits ordinaires, remise réelle | D | `space-ship-module-catalog`, `space-module-purchases`, `space-towing-completion` |
| Montage/retrait du même exemplaire : mandat propriétaire, MEC-03 N2, 10 min/1 PA à la pose ; 5 min/1 PA au retrait | D | `space-module-mandates`, `space-module-work`, `space-towing-completion` |
| Attelage individuel : propriétaire(s), MEC-02 N2, 5 min/1 PA, gabarit compatible, épave à 0 Coque | D | `space-towing-work`, `space-towing-desk` |
| Plein attaché, annulation et confirmations d’arrivée joueur/régie | D | `space-towing-flight`, UI/navigation et HTTP |
| Plusieurs tronçons successifs du même attelage, un PA de préparation par départ | D | `space-towing-completion` : aller-retour sans second attelage |
| Carburant ×2, Manœuvrabilité −1 minimum 0, même voyage/épave/propriété/fret | D | `space-towing-flight`, `space-towing-completion` |
| Interception d’un remorqueur victime seul par un pirate seul ; largage avant résolution ; interruption à 0 Coque | D dans ce composant | `space-towing-combat` ; autres combinaisons fermées |
| Panne MOD-05 et décision B ; horloge, dette, MJ, combat et STOP distincts | D | `space-towing-outage` |
| Panne sèche sous attelage : stock réel, dépannage natif, paiement unique et reprise sans détachement | D | `space-towing-completion`, service `space-rescue.mjs` |
| PNJ disponible : devis de 5 % (carburant compris), payeur volontaire, réserve de fonds, retour effectivement attesté en régie | D | `space-towing-recovery`, deux parcours UI/HTTP |
| Épave larguée : récupération PNJ après clôture de l’affrontement, même bâtiment et fret de tiers conservés | D | `space-towing-recovery` ; aucun raccrochage pendant la même rencontre |
| Rendez-vous/raccrochage dans l’espace par un autre remorqueur joueur | A | Voie PNJ disponible ; ce parcours joueur n’est pas livré |
| Remorqueur attaquant, convois/alliances avec attelage, abordage/capture d’un remorqueur attaché | A/fermés | Gardes explicites des services ; pas de conformité globale revendiquée pour ces combinaisons |
| Prime spontanée 10 %, caution/revendication S+1, attribution d’une épave, casse et changement documentaire | A, séparés du transport | Chapitre 22 et REC-SO-19 restent partiels |

La récupération PNJ enregistre une prestation réelle : pas de minuteur de vol PNJ inventé, pas de vaisseau PNJ généré, pas de déplacement automatique au paiement, pas de prime créée. Un retour au quai où le bâtiment se trouve déjà est refusé. Le prix n’est pas prélevé de force sur le propriétaire : seul le payeur désigné peut accepter sa réserve. Le dispositif utilise pour l’instant le solde ordinaire, comme le dépannage natif ; la combinaison de crédits protégés pour ce service n’est pas développée.

Les six capacités de remorquage sont émises ensemble pour les nouvelles versions compatibles. Les anciens manifestes ne sont pas enrichis. Les composants partiels de test ne constituent pas une activation autorisée dans une partie existante. Les revendications de propriété ne doivent pas être simulées en changeant `ownerId`.

Sources de code : [catalogue](../src/shared/space-ship-modules.mjs), [publication/naissance](../src/core/space-outlaws-entry.mjs), [travail](../src/core/space-towing-work.mjs), [vol](../src/core/space-towing-flight.mjs), [combat](../src/core/space-towing-combat.mjs), [panne](../src/core/space-towing-outage.mjs), [récupération PNJ](../src/core/space-towing-recovery.mjs), [dépannage](../src/core/space-rescue.mjs).

## Matrice fonctionnelle de l’ensemble du produit

| Domaine / exigence | État | Ce qui existe | Ce qui reste / limite | Source de code ou test |
|---|---|---|---|---|
| M1, objets et kits (§3) | D | Définitions, calibrations, références et kits distincts des stocks. | Catalogue commercial complet et usages non raccordés restent distincts. | `central-master.mjs ; central-class-kits.mjs` |
| M2, fiches et admissions (§3, §4.7–4.9) | D | Invitation, brouillon privé, espèce/nature, 8 classes, initiation, quotas, décisions MJ, rapprochement M2. | Recette humaine multi-comptes à achever ; ne pas confondre texte narratif et effet mécanique. | `admissions.mjs ; admission-review.mjs ; admission-m2*.mjs` |
| M3, modèles/ports/routes (§3, §6) | D/P | Modèles canoniques, ports et liaisons codés, édition et Excel. | Toutes les rencontres/identités/propriétés du chapitre spatial ne sont pas couvertes. | `central-space.mjs ; central-space-import.mjs` |
| M4, recettes (§3.5, §5.5 bis) | P | Formules privées, références M1, composants et échanges de brouillon. | Déblocage, laboratoire, fabrication, doses, activation volontaire et antidotes ; publication M4 non raccordée. | `central-recipes.mjs ; master-recipes.mjs ; master-schema.mjs` |
| M5, boutiques (§3, §7.1) | D/P | Offres PNJ publiées, vrais stocks/caisses, achat et remise ; modules standards. | Le parcours SO ne publie pas toutes les marchandises/rachats du marché canonique. | `space-outlaws-shop-state.mjs ; shops.mjs` |
| M6, informations et fouilles (§3, V3.6) | D/P | Informations/lieux, quatre trouvailles, D12 serveur, prise atomique, édition et réinitialisation explicite. | Interventions spécialisées non raccordées ; groupes et publications ultérieures restent incomplets. | `central-field-targets.mjs ; space-outlaws-search-*.mjs ; field-actions.mjs` |
| M7, missions et communication (§3, §7.2) | D/P | Missions publiées, annonces, contrats, preuves, récompenses financées et remises. | Toutes les clauses, donneurs d’ordre et mises à jour d’une campagne ne sont pas couverts. | `space-outlaws-mission-*.mjs ; contracts.mjs ; announcements.mjs` |
| Publication centrale initiale (§3.6) | D | Contrôle consolidé, version figée, références et refus global, naissance/dotation distinctes. | Une recette/perspective non supportée reste bloquée ; sept ateliers ne signifie pas sept domaines jouables complets. | `space-outlaws-entry.mjs : supported / releasePlan` |
| Évolution centrale après publication (§3.6–3.8, §8.3) | P | Instantanés privés et versions initiales ; épisodes persistants. | Nouveau brouillon Vn+1 à partir de la version publiée, diff/impact/rollback central et restauration complète. | `central-master.mjs : requireCentralPreparation ; campaigns.mjs` |
| XLSX et historique (§3.7–3.8) | D/P | Contrats/imports/exports existants, aperçu, références, anciens Masters conservés. | La sauvegarde/restauration complète ne se réduit pas aux exports des ateliers. Pas de refonte XLSX proposée. | `central-*-import.mjs ; masters.mjs ; scenario-package.mjs` |
| Interface joueur et QR (§4.1–4.2) | D/P | Espaces privés, badge public distinct de l’invitation, révocation et projections autorisées. | Recette smartphones, scanner/codes sur appareils réels et réseau dégradé. | `workflow.mjs ; web/player-spaces.mjs` |
| Création, XP et apprentissage (§4.3) | D/P | Profils initiaux, initiation, limite des secondaires, PA, XP de campagne, reconversion encadrée. | Apprendre une compétence ne raccorde pas son effet ; complétude des actions à finir. | `initial-character-profile.mjs ; space-outlaws-learning.mjs` |
| Succession et réserve (§4.10, §8.4) | D/P | Mort puis proposition/réserve et incarnation unique ; XP hérités, kit/PA/fonds distincts. | Affectation complète aux groupes et recette de relève avec toutes les mécaniques. | `space-outlaws-succession.mjs ; space-succession tests` |
| Groupes/factions en partie (§4.11) | P — première régie SO raccordée | Création/affectation/transfert/archivage natifs, briefings/membres, révocation au décès et affectation explicite du successeur ; groupes conservés entre épisodes. | Définitions M2, demandes d’amis/réserves intégrées et permissions collectives restantes ; anciennes sessions non activées. | `group-management.mjs ; space-outlaws-entry-guard.mjs` |
| PV, protection, survie, STOP (§5.2–5.3) | D/P | Dégâts déclarés, survie réelle, stabilisation 60 s, soins MED-02/MEC-02, convalescence et STOP. | Cliniques/protocoles complets et effets spécialisés non tous raccordés ; recette terrain distincte. | `space-outlaws-health-state.mjs ; health.mjs ; person-actions.mjs` |
| Analyses COM-03, TRA-01/03, MEC-01, PIL-01 (§5.1) | D/P | Contenus préparés par niveau ; route/diagnostic et durées autorisées. | Une analyse préparée ne répare pas et ne donne aucun droit de prise ; MED-01 complet à raccorder. | `space-outlaws-analysis.mjs ; space-technical-analysis.mjs ; space-route-analysis.mjs` |
| ROG-02 / ROG-03 (§4.4–4.5) | A | Compétences présentes dans les profils/catalogues ; certaines briques de fouille génériques existent. | Poste organisation, identité/quota/notification du vol ; prison, gardien, évasion et captivité 20 min. | `person-state.mjs ; person-actions.mjs : portes SO` |
| INF-01/02/03 et actions du Courtier (§5.1) | A/P | Catalogue et services commerciaux/renseignements distincts. | Crochetage, déchiffrement, falsification et effets canoniques des compétences non raccordés comme actions de jeu. | `space-outlaws-learning.mjs ; field-actions.mjs` |
| Sabotage, cache personnelle, FIL/EFF (§5.5) | A/P | Catalogue d’apprentissage et moteur générique de terrain conservés. | Parcours canoniques, quotas/effets/traces fictives et opposition ; la soute clandestine ne remplace pas Dissimulation personnelle. | `space-outlaws-entry.mjs : types de fieldTarget admis` |
| Modules droïdes (§5.4) | A | Nature droïde et réparation de PV distincte existent. | DR-01 à DR-06, deux emplacements, quatre états, pose/retrait/avaries/réparations et contenus. | `character-nature.mjs ; space-outlaws-health-state.mjs` |
| Force PNJ et LAS (§4.6, §5.6) | A/P | Création/achat de pouvoirs Force par joueur refusés ; LAS existe dans le catalogue rare. | Profil PNJ secret Jedi/Sith, pouvoirs, jets/cibles, quotas, effets et arbitrage oral. | `admission-rules.mjs ; space-outlaws-learning.mjs` |
| Toxicologie et fabrication (§5.5 bis) | A/P | Édition de formules privées. | Recette connue, labo QR, ingrédients/PA réservés, dose unique, consommation volontaire, malaise et traitement. | `master-schema.mjs : Recettes DRAFT uniquement` |
| Vaisseaux, pilotes et identité (§6.1) | D/P | Attribution autorisée d’un exemplaire, mandat pilote, nom d’usage/transpondeur et historique. | Achat/titre complet, identité de couverture, transpondeur technique et faux papiers. | `space-outlaws-voyages.mjs ; space-ship-names tests` |
| Carburant, voyage, détour (§6.2) | D | Stock réel, plein, préparation, manifestes, routes/événement, panne sèche, arrivée et détour. | Toutes les combinaisons avec remorquage/alliances ne sont pas ouvertes. | `space-outlaws-voyages.mjs ; space-detours.mjs` |
| Convoi, escorte et avenants (§6–7) | D/P | Convoi consenti, préparations individuelles, ESC-01, salaire/provision et avenants distincts. | Attelage dans ces flottes encore fermé ; autres clients/clauses exceptionnelles à compléter. | `space-convoy.mjs ; space-escort*.mjs` |
| Embuscades et combat (§6.3) | D/P | Opportuniste/ciblée, renseignement acquis, ordres, rounds, fuite, alliances et tirs simultanés. | Pas de couverture globale des combinaisons remorquage/abordage ; recette multi-appareils. | `space-combat*.mjs ; space-targeted-ambushes.mjs` |
| Atelier et modules vaisseaux (§6.4) | D/P | Révision conditionnelle, Coque/Bouclier/pièces, PNJ, modules standards, neutralisation temporaire. | Avancées/prototypes, toutes avaries de modules et interactions de propriété à compléter selon règles. | `space-maintenance.mjs ; space-module-*.mjs` |
| Abordage et fret (§6.5) | D/P | Arrimage, remise, tranches, garde, rançon volontaire, fret PNJ et restitution. | Capture/titre du bâtiment et remorqueur attaché non raccordés ; ne pas assimiler butin et propriété du vaisseau. | `space-boarding*.mjs ; cargo*.mjs` |
| Épaves et remorquage (§6.5, ch.22) | P global ; principal développé | Voir matrice dédiée ci-dessus. | Revendication S+1, caution, primes reconnues financées, casse unique et récupérations joueur. | `space-towing-*.mjs` |
| Économie, paiements et marché (§7.1) | D/P | Comptes/caisses, paiements, réserves, achats, remises et journal existants. | Barèmes canoniques de toutes marchandises/rachats et crédits protégés pour tous les services PNJ. | `economy*.mjs ; shops.mjs ; market*.mjs` |
| Douanes et soute clandestine (§7.3) | P | MOD-04, fret caché, habilitation/inspection ordinaire et approfondie, tentative d’escale, PNJ et PA. | Licences/faux papiers, retenue réelle 15 min, saisie formelle et quittances canoniques complètes. | `space-hidden-cargo.mjs ; customs.mjs` |
| Assurances et restitution (§7.4) | A | Aucun service canonique de police/sinistre identifié. | Prime 2/4/6 %, fonds réservés, 80 %/5000 Cr, unicité et restitution après récupération. | `Absence de parcours dans les services et commandes actuels` |
| Contrats, recours et primes (§7.2) | D/P | Registre natif, fonds, preuves, contestation, recours, primes financées, garde du fret. | Couverture complète A35–A38 et cas assureur/propriété/clients non PNJ. | `space-contract-appeals.mjs ; space-bounties.mjs ; contracts.mjs` |
| Clôture et épisode suivant (§8) | D/P | Instantané, conservation des acquis, horloges, progression, PA, effets temporaires et obligations. | Groupes, nouvelles versions centrales, systèmes manquants et vraie restauration ne sont pas validés. | `space-outlaws-episodes.mjs ; campaigns.mjs` |
| Médias V3.6 | D/P | Médiathèque commune, références portrait/objet/annonce/vaisseau, autorisations de lecture. | Recette complète sur quatre entités et appareils ; autres entités facultatives non bloquantes. | `media.mjs ; media-state.mjs ; workflow.mjs` |
| Transactions et autorisations (§9.2) | D/P | Vérifications serveur, reçus, concurrence, frontières public/privé ; nouveaux parcours testés. | Pas d’attestation générale de sécurité ; vérifier les nouveaux parcours à chaque livraison et en recette. | `space-outlaws-entry-guard.mjs ; tests partagés Firestore/HTTP` |
| Téléphones, réseau, charge, restauration (§9.3) | R | Tests de composants et émulateurs disponibles. | Android/iOS réels, environ 60 utilisateurs, seuils et mesures, réseau dégradé, sauvegarde restaurée. | `SO-RECETTE-LOCALE.md ; SO-SAUVEGARDE-DEPLOIEMENT.md` |

## Deux écarts reproduits avant le raccord des groupes

Sondes historiques exécutées le 6 novembre avant cette mise à jour, avec `soVoyagesFixture` et le workflow natif sur MemoryStore isolé (aucun compte ni donnée de production) :

| Sonde | Résultat observé | Conséquence |
|---|---|---|
| Création d’un groupe par `saveGroupRoster`, avec un propriétaire autorisé, après naissance SO | Refus `SO_GAMEPLAY_NOT_OPEN` | Blocage de régie levé par groupsVersion=1 pour les nouvelles versions compatibles ; publication M2/opérations collectives restent partielles. |
| Réouverture de l’atelier central après publication initiale et naissance | Refus `CENTRAL_PREPARATION_REQUIRED` | Le brouillon initial scellé ne fournit pas encore le cycle de révision Vn+1 demandé au §8.3. La continuité d’épisode ne remplace pas cette édition. |

Ces sondes identifient des raccordements à développer ; elles ne justifient pas de retirer les gardes ou de forcer les données en base.

## Grille des 55 recettes V3.5

La colonne « couverture » décrit le code et les tests disponibles. **Aucune ligne de ce tableau n’est une certification de recette humaine complète.** Un critère dépendant d’une fonction manquante reste partiel même si les sous-tests techniques réussissent.

| ID | Couverture | Réalisé / restant décisif |
|---|---|---|
| REC-SO-01 | D/P | Création, natures, initiations et limite des secondaires développées ; effets de toutes les compétences incomplets. |
| REC-SO-02 | D/P | XP, PA, épisodes et succession testés ; recette longue multi-incarnations/terrain à confirmer. |
| REC-SO-03 | P | 200 Cr protégés et séparation des fonds ; toutes les prestations PNJ et restrictions à recetter. |
| REC-SO-04 | D/P | PV/protection, survie, stabilisation et STOP développés ; validation des gestes physiques distincte. |
| REC-SO-05 | P | Soins de terrain humanoïde/droïde ; atelier complet et modules droïdes manquants. |
| REC-SO-06 | A | ROG-02 organisation, erreur d’identité, vide et choix selon niveau non raccordés. |
| REC-SO-07 | A | Quota global du vol et notification différée non raccordés. |
| REC-SO-08 | A | Évasion, surveillance et captivité canonique non raccordées. |
| REC-SO-09 | P | Moteur terrain conservé ; sabotage canonique sur installations/droïdes/vaisseaux non livré. |
| REC-SO-10 | A | Dissimulation personnelle, traces FIL-01/EFF-01 non raccordées ; fret caché distinct. |
| REC-SO-11 | A | Cycle de dose et activation volontaire TOXI non livré. |
| REC-SO-12 | A | Modules droïdes DR-01–06 et états/réparation distincts non livrés. |
| REC-SO-13 | D/P | Duels/flottes et tirs simultanés développés ; recette globale multi-joueurs non certifiée. |
| REC-SO-14 | D/P | PIL-03 et ESC-01 développés ; combinaisons remorquage/flotte encore fermées. |
| REC-SO-15 | D | Révision conditionnée aux tirs exécutés et événements prévus ; tests existants. |
| REC-SO-16 | D/P | Voyages/détours/carburant/reprise et dépannage attaché ; recette intersession complète à confirmer. |
| REC-SO-17 | D/P | Événements/convoi et embuscades natives ; toutes combinaisons non certifiées. |
| REC-SO-18 | D/P | Arrimage, tranches et interruptions développés ; conditions d’abordage remorqueur non ouvertes. |
| REC-SO-19 | P | Remorquage individuel et PNJ développés ; revendication/caution S+1 et casse absentes. |
| REC-SO-20 | P | Inspection et MOD-04 développés ; faux, licences, retenue/saisie complets manquants. |
| REC-SO-21 | P | Contrats/escortes/avenants/recours développés par parcours ; toute la chaîne A35–A38 non certifiée. |
| REC-SO-22 | A | Police, indemnisation et restitution après récupération non livrées. |
| REC-SO-23 | P | Continuité développée pour domaines raccordés ; domaines absents et vraie restauration restent ouverts. |
| REC-SO-24 | P | Publication/naissance et réessais sans redotation ; profil V0.7 complet encore partiel. |
| REC-SO-FOR-01 | P | Refus des privilèges Force aux joueurs ; profil PNJ et activation autorisée manquants. |
| REC-SO-FOR-02 | A | Pouvoirs, quotas/effets/consentements et validation arbitre PNJ non raccordés. |
| REC-SO-FOR-03 | A | Pouvoirs, quotas/effets/consentements et validation arbitre PNJ non raccordés. |
| REC-SO-FOR-04 | A | Pouvoirs, quotas/effets/consentements et validation arbitre PNJ non raccordés. |
| REC-SO-FOR-05 | A | Pouvoirs, quotas/effets/consentements et validation arbitre PNJ non raccordés. |
| REC-SO-FOR-06 | A | Pouvoirs, quotas/effets/consentements et validation arbitre PNJ non raccordés. |
| REC-SO-REC-01 | D/P | Définitions M1/M4 et imports privés sans ressources ; pas de production en jeu. |
| REC-SO-REC-02 | A | Droit de recette connue et laboratoire joueur non raccordés. |
| REC-SO-REC-03 | A | Fabrication transactionnelle d’une dose non raccordée. |
| REC-SO-REC-04 | A | Activation volontaire et effet de malaise non raccordés. |
| REC-SO-REC-05 | P | Formules refusées à la publication ; registre d’effets autorisés et parcours jouable manquants. |
| REC-SO-MST-01 | D/P | Compatibilité des anciens Masters testée ; restauration réelle non certifiée. |
| REC-SO-MST-02 | D | Brouillon central partagé, provenance et conflits initiaux. |
| REC-SO-MST-03 | P | Référence M1 unique préparée ; fabrication/antidote M4 non jouables. |
| REC-SO-MST-04 | P | M1 et recette en brouillon ; publication M4 toujours fermée. |
| REC-SO-MST-05 | D | Références manquantes bloquent le contrôle global. |
| REC-SO-MST-06 | D | Publication sans stock ; provision distincte et idempotente. |
| REC-SO-MST-07 | P | Concurrence du brouillon initial testée ; cycle général Vn+1 manquant. |
| REC-SO-MST-08 | D/P | Références et archivage contrôlés dans types raccordés ; dépendances de domaines non jouables à finir. |
| REC-SO-MST-09 | P | Publication initiale consolidée ; correction isolée d’une version déjà publiée non disponible. |
| REC-SO-MST-10 | P | Instantanés préparatoires ; restauration globale sans annulation d’acquis non prouvée. |
| REC-SO-INS-01 | D | Invitations et révocation/expiration/authentification. |
| REC-SO-INS-02 | D | Catalogue administré, classes/initiations, refus Force/choix interdits. |
| REC-SO-INS-03 | D | Quotas et dernière place transactionnels. |
| REC-SO-INS-04 | D | Brouillon/reprise/correction et confidentialité des propositions. |
| REC-SO-INS-05 | P | Préférence d’amis distincte des droits ; groupes SO après naissance à raccorder. |
| REC-SO-INS-06 | D/P | M2 puis publication/naissance uniques ; recette humaine privée à achever. |
| REC-SO-INS-07 | D/P | Successeur/réserve, XP et nouvelle dotation ; affectation explicite du successeur raccordée ; publication M2 et opérations collectives restent partielles. |
| REC-SO-INS-08 | D/P | Proposition de successeur sous règles publiées ; toutes interactions du nouveau personnage à recetter. |
| REC-SO-INS-09 | P | Retrait des mandats au décès ; réaffectation SO explicite livrée ; mandats collectifs restent fermés. |
| REC-SO-INS-10 | P | Concurrence/révocation générique testée ; commande de régie SO raccordée et testée ; recette humaine et mandats collectifs restent ouverts. |

## Grille V3.6 D12 et médias

Sources : [extension](source/SO_CDC_V36_Fouilles_Medias.md), `space-outlaws-search-state.mjs`, `space-outlaws-search-finds.mjs`, `field-actions.mjs`, `media.mjs` et leurs tests. Ces lignes portent sur la couverture numérique ; elles n’attestent pas une recette complète sur téléphones.

| ID | Couverture | Constat |
|---|---|---|
| V36-01 | D | Fouille universelle sans prérequis TRA-02. |
| V36-02 | D | D12 et bonus explicitement configurés ; pas de bonus déduit du nom. |
| V36-03 | D | Projection d’échec neutre sans contenu restant. |
| V36-04 | D | Découverte répétable d’un indice à voir. |
| V36-05 | D | Prise unique d’indice limitée et transactionnelle. |
| V36-06 | D | Objet transféré d’un stock provisionné. |
| V36-07 | D | Crédits débités d’une source réelle et crédités atomiquement. |
| V36-08 | D | Concurrence et idempotence des prises. |
| V36-09 | D/P | Reprise de reçu ; coupure réelle sur téléphone non recettée. |
| V36-10 | D | Difficulté propre à une trouvaille. |
| V36-11 | P | D12 des lieux distinct ; TRA-02 canonique sur prisonnier reste non raccordé. |
| V36-12 | D/P | Références médias des quatre entités ; recette complète Android/iOS à faire. |

## Grille des dix essais transversaux

| ID | Couverture | Constat |
|---|---|---|
| SEC-SO-01 | D/P | Frontière public/privé et révocations testées ; pas d’audit de sécurité exhaustif. |
| SEC-SO-02 | D/P | Transactions/reçus et concurrence testés ; scénario de réseau réellement dégradé à recetter. |
| SEC-SO-03 | D/P | Imports et acquis conservés ; toutes évolutions de version non disponibles. |
| SEC-SO-04 | A | ROG-02 et quota de plusieurs voleurs non raccordés. |
| SEC-SO-05 | P | Droits collectifs génériques ; régie SO raccordée ; publication M2 et mandats collectifs encore partiels. |
| SEC-SO-06 | D/P | Combat et consommation testés ; toutes combinaisons de flotte/remorquage non ouvertes. |
| SEC-SO-07 | P | Stocks/comptes PNJ vérifiés ; assureur absent. |
| SEC-SO-08 | P/R | STOP médical testé numériquement ; captivité et recette physique à terminer. |
| SEC-SO-09 | R | Pas de mesure Android/iOS et environ 60 utilisateurs. |
| SEC-SO-10 | D | CI de vérification distincte du déploiement ; aucune publication de cette intervention. |

## Validation de cette intervention

| Contrôle | Preuve et portée |
|---|---|
| Base de reprise | CI 42201564805, tête 05c1eec, completed/success, 8 jobs requis ; build, 944 applicatifs et 20 HTTP ; lots Firestore réussis. |
| Candidat local du remorquage | Build réussi ; **957/957 applicatifs ciblés**, 76 fichiers, zéro échec/annulé/ignoré/todo ; Node 24.22.1, npm 11.9.0. |
| Nouveaux cas métier | 3 cas de chaîne complète et 6 de récupération partagés mémoire/Firestore ; test de périmètre de capacité, 2 UI/protocole, sélection CI et HTTP dédiés. |
| Navigateur local | **8/8 cas** Chromium 153.0.8010.0, 1280×900 et 360×800 tactile simulé ; deux cas de récupération revérifiés après derniers libellés/garde de quai. Rendu réel des composants et workflow MemoryStore ; pas de réseau distant, débordement horizontal vérifié, captures examinées. |
| Firestore et HTTP du nouveau candidat | Émulateurs réservés à la CI Node 22/Java 21 ; 44 suites sélectionnées et 22 HTTP prévus. **Résultat final du commit exact à lire dans la PR nº 2**, consigné après terminaison ; ces nombres ne sont pas un résultat avant cette preuve. |
| Non exécuté | Régression intégrale, authentification Firebase dans le navigateur, téléphones réels, test humain complet, charge, restauration externe et déploiement. |

Les chiffres ciblés ne s’additionnent pas aux suites historiques pour produire un total de couverture. Aucun pourcentage d’avancement global n’est déduit du nombre de tests ou de commits.

La première CI du candidat (42206048685) a signalé deux attentes HTTP périmées : fermeture historique de MOD-05 et identité remplacée après consentement. Le correctif vérifie le refus du consentement périmé, puis renouvelle physiquement l’attelage par les commandes natives. Aucun contrôle métier retiré. Les résultats définitifs du correctif sont consignés dans PR nº 2 après terminaison ; la réussite locale ne remplace pas cette preuve.

## Ordre de travail proposé à partir de cet audit

1. **Terminer le cycle d’organisation de campagne** : groupes M2, demandes/réserves et mandats collectifs après la première régie SO, puis nouvelle version du Master sans réinitialiser les acquis.
2. **Terminer les actions de personnage** : Rogue, Infiltrateur, diagnostic/soins avancés, Courtier et entretien ; conserver les gestes physiques sous arbitrage humain.
3. **Terminer les systèmes absents** : modules droïdes, sabotage/cache/traces, TOXI/recettes/doses, puis extension Force PNJ selon la priorité de scénario.
4. **Fermer les écarts spatiaux/économiques** : combinaisons restantes de remorquage, titre/identité/épaves/casse, douanes complètes, marché canonique et assurances financées.
5. **Recette et publication** : configuration fictive représentative, multicomptes, Android/iOS, réseau, charge définie et sauvegarde réellement restaurée ; rapport global, candidat testé puis procédure de mise en service.

Cet ordre est une proposition issue des dépendances observées. Il ne change aucun arbitrage de jeu ni le périmètre décidé. Le développement reste sur la même branche/PR ; aucun nouveau déploiement Firebase n’est attesté par ce rapport.
