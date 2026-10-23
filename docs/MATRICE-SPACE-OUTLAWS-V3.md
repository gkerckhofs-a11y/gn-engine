# Matrice SPACE OUTLAWS V3.2 / V0.7

## I2 — décisions et quotas sur branche

[Matrice ciblée et limites](SO-01-I2-DECISIONS.md) : file, approbation OWNER/MJ, unicité fictive par session, compteurs confirmés globaux/par classe, attente/retrait/correction/refus, transfert de classe et exception motivée. 846 tests locaux et build réussis ; CI exacte dans la PR. SO-GAP-14 partiellement couvert, passage M2 encore absent ; I2b/SO-GAP-16 puis C1/C2/I3 restent nécessaires. Les sections I1/C1a ci-dessous décrivent leurs périmètres historiques.


## I1 — admission et proposition sur branche

[Parcours I1 et matrice ciblée](SO-01-I1-ADMISSIONS.md) : liens sécurisés, choix V0.7, espèces narratives du brouillon M2, dossiers privés et réessais sans dotation. 825 tests locaux/build réussis ; CI exacte dans la PR. **SO-GAP-14 partiel** : confirmation des quotas, approbation, identité fictive unique et passage personnage M2 restent I2/I3. Aucun autre écart clos, aucun historique migré.

## C1a — contexte disponible sur branche

[Préparation sans dotation](SO-01-C1A-PREPARATION.md) : création/édition privée, authentification et délégation de session, garde transactionnelle et réessais. **808 tests locaux et build réussis** ; Firestore/HTTP sur CI à relever sur le commit exact. Pré-requis de SO-GAP-14 partiellement livré, aucun autre écart clos. À cette étape historique, ces fonctions restaient absentes ; I1 ajoute depuis les candidatures, les quotas confirmés/publication/dotations/relève restent à développer. Aucun fichier historique migré.

## Complément V3.5

[Matrice différentielle détaillée, dépendances et ordre minimal](SO-00-V35-INSCRIPTIONS.md). [Registre des 55 recettes ciblées](SO-RECETTES-V35.md), plus 10 SEC transversaux. Aucun INS complet validé : deux tests nouveaux couvrent seulement révocation de droit de caisse/paiement concurrents. Les verdicts historiques ci-dessous conservent leur périmètre d’origine ; ils ne valent pas validation des nouveaux parcours centraux.

| Nouvel écart | À créer/adapter | Priorité |
|---|---|---|
| SO-GAP-14 | Admission sécurisée distincte du lien privé, proposition, identité/espèce, classes/initiation canoniques, quotas et approbation MJ, passage M2 | SO-01 I1/I2/I3 |
| SO-GAP-15 | Naissance/reçu, QR à activation, réserve jamais jouée, progression participant, crédits/kit protégés et relève sans republish | SO-01/02 I4/I5 |
| SO-GAP-16 | Capacité/type/responsable de groupe, transfert atomique entre groupes et contre-opération, révocation lors de décès/relève | SO-01/SO-06 I2b/I5 |

SO-GAP-01…13 restent ouverts. Aucune migration ni réinitialisation d’une session.

## Actualisation V3.4 — 23 octobre 2026

La matrice différentielle courante, le graphe des sept ateliers, les migrations proposées et les dix REC-SO-MST figurent dans [SO-00 V3.4](SO-00-V34-PLAN-CENTRAL.md). Les dix MST sont **NON EXÉCUTÉS** ; les tests historiques constituent des preuves partielles seulement. Les tableaux ci-dessous restent le registre métier V0.7 issu des tranches V3.0–V3.2, sans requalification de leurs succès en validation V3.4.

Remappage §10 V3.4 : SO-00 conception centrale ; SO-01 M1/M2 ; SO-02 QR/TOXI/FOR ; SO-03 droïdes ; SO-04 M3 ; SO-05 M4/M5 et autorités ; SO-06 M6/M7, continuité et recette. Les anciens noms de tranches SO-06a et SO-06b sont conservés dans l’historique ; ils ne changent pas le statut des nouveaux lots.

Écarts ajoutés : **SO-GAP-12** brouillon central/pointeur de version/publication globale/rollback non implémentés ; **SO-GAP-13** habilitations de campagne et sept contrats de préparation non implémentés. Aucun changement d’état joué ni de règles canoniques effectué.


23 octobre 2026 — complément à [SO-00](SO-00-REPRISE.md). `Existant` désigne un service observé, pas une conformité V0.7. `Adapté` décrit SO-06a, SO-01a et SO-06b. Les tests cités sont des suites réellement présentes ; leurs résultats globaux figurent dans [SO-VALIDATION](SO-VALIDATION.md). Une couverture historique partielle ne valide jamais automatiquement une recette REC-SO.

## Exigences, code, tests et migrations

| Exigence V3 / arbitrages | Existant à réutiliser | Adapté dans SO-06a / SO-01a | Manquant / adaptation requise | Tests / preuve à obtenir | Migration et lot |
|---|---|---|---|---|---|
| Priorité SPACE OUTLAWS, pas de créateur universel | Socle GN Engine, L1a–m | Consignes, documentation et titres des six vues | Profil versionné V0.7 opérationnel | Audit sources/branche ; recette produit | Pas de conversion automatique ; SO-00/01 |
| Master unique, six vues | `masters`, `master-workspace`, éditeurs/projections L1 | Export cohérent de tous les catalogues exportables, réimport existant | Référentiel complet, dotations et schéma SO | `master-global-export-suite`, UI et suites Masters historiques | Format 1 inchangé maintenant ; extension explicite ultérieure SO-06 |
| Version publiée, définition ≠ instance | Versions scénario, campagnes, archives | Aucun changement | Profil fermé et contrôle de compatibilité de règles | Versions historiques et import répété | Jamais réécrire une instance jouée ; SO-01/06 |
| Huit classes joueurs, deux natures, 34 compétences joueurs ; A08 | `abilities`, Classes/Competences/Attributions | Nature explicite conservée, projection privée, imports/exports | Classes canoniques, exclusivités, initiation hors classe et 5 places secondaires | REC-SO-01, tests profils existants partiels | Ajouter référence de profil sans changer les anciens ; SO-01 |
| XP, progression, niveau utilisateur, succession ; A08–A09 | Compte authentifié, niveau de personnage et réservations PA | — | 3 XP/utilisateur/session, quatre sessions puis 8 PA, coûts, rareté, reconversion, 25 % plafonné 9, nouvelle incarnation | REC-SO-02, double décès et clôture concurrente | Historique utilisateur et incarnation distincts ; SO-01 |
| 200 Cr protégés et huit kits ; A10 | Comptes, journal, lots, dotations idempotentes | Exclusion des dotations à l'export global | Solde protégé dans compte réel, restrictions d'achat/don/revente, provenance des kits, déprotection et disparition au décès | REC-SO-03, paiements/stock en concurrence | Ne pas protéger rétroactivement un solde acquis ; SO-01/05 |
| PV/protection et sécurité ; A01–A07 | `health`, PV, horloge, `person-actions` | — | 3/4 PV, protection unique, fenêtre 2 s, immunités, mort 5 min, stabilisation 60 s, STOP critique | REC-SO-04 ; homologation physique distincte | Ajouter états explicites, ne pas déduire un décès d'un ancien 0 PV ; SO-01 |
| Soins MED/MEC et atelier ; A05–A07 | FIELD_CARE, CLINIC_SAFE/FAST, réservations, complément d'échec | Filtre patient serveur sur soins temporisés/instantanés, contrôle avant réserve et à résolution | Stabilisation intermédiaire, durées fixes, modules/protection indépendants, PNJ financé | REC-SO-05, interruption 59/60 s, pause et ressource unique | Anciennes actions gardent leur devis/profil ; SO-01/03 |
| Compétences à durée ; A11 | Profils terrain et soins | — | Tables canoniques COM/PIL/INF/Entretien/ROG, effets réels et exceptions de consommation | Limites temporelles, rôle, idempotence | Nouveaux types via routeur existant ; SO-01/02 |
| ROG-02 ; A12 | QR public, inventaire, transfert et remise physique du pillage | — | Poste orga, nom/prénom sans suggestion, choix par niveau, quotas victime globaux, coût au transfert, notification +10 min | REC-SO-06/07, deux voleurs et panne réseau | Champs d'éligibilité des biens, tentatives/notifications persistantes ; SO-02 |
| ROG-03 ; A13 | Captivité 20 min, cibles QR | — | Issue scénarisée, garde, interruption, récupération conditionnelle, interdiction à 0 PV | REC-SO-08 et sortie physique sûre | Aucun droit sur une serrure réelle ; SO-02 |
| Modules droïdes ; A14 | Biens individuels, propriétaires, consommables | — | Six références, 2 emplacements, prix/installation, quatre états, contenu et retrait même ID | REC-SO-12, slots et transfert concurrents | Même lot/objet équipé, pas de copie ; SO-03 |
| Sabotage ; A15 | Pannes d'installation, D6, verrou et réparation | — | Cibles droïde/navire, mandat admissible, 15 min max, protection après restauration, neutralisation ≠ dommage durable | REC-SO-09 | Distinguer temporaire/durable, anciens états conservés ; SO-02/03/04 |
| Dissimulation ; A16 | Lots, pillage et fouille | — | Une unité, 30 min, découverte TRA-02 à égalité, expiration sur transaction | REC-SO-10, transaction pendant cache | Métadonnée temporaire du lot ; SO-02 |
| FIL-01 / EFF-01 ; A17–A18 | Audit, événements, connaissances | — | Journal fictif séparé, traces ≤15 min, opposition/égalité, fausse piste unique, aucune géolocalisation | REC-SO-10, secrets et journal technique intact | Ne jamais modifier le journal transactionnel ; SO-02/04 |
| Toxicologie ; A19 | Items consommables et QR d'action | — | Dose unique, recette/labo, consentement QR, malaise 15 min sans PV, immunité droïde, antidote | REC-SO-11 | Dose = lot réel avec cycle suivi ; SO-02 |
| Modèles, achats/ventes, passagers ; A20–A24 | Ships, propriétaires, comptes, navigation | — | Trois modèles fermés, fret 0 accepté, places/embarquement, transactions de navire, 10 modules et compatibilités | REC-SO-13/16, manifeste et double vente | Étendre ship sans remplacer ses ID/stock ; SO-04/05 |
| Combat spatial ; A20–A23 | PA, D6 serveur et transactions | — | Rounds 90 s, ordres verrouillés, simultanéité, défense ciblée, poursuite unique, reddition, fin après 2 rounds non hostiles | REC-SO-13 ; SEC-SO-06 | Nouvelles opérations liées aux ships existants ; SO-04 |
| PIL-03 / ESC-01 | Profils de compétences et réservation PA | — | Seuils, bonus non cumulés, usage voyage/rencontre, remboursement sans effet, escorte N4 sans second décrochage | REC-SO-14 | Usages persistants et liés à une exécution ; SO-04 |
| Révision/réparation conditionnelle ; A22–A29 | Consommables, comptes, états de navire | — | Tir réellement exécuté déclenche 1 %, Coque/Bouclier/module séparés, réparation partielle par point | REC-SO-15 ; tir esquivé vs aucune attaque | Pas de réparation automatique à la clôture ; SO-04 |
| Trajet/carburant/détour ; A24–A29 | `voyages`, débit au départ, pause, devis de route | — | Facteurs taille, ravitaillement 2 min, panne/surcharge, détour/convoi, reprise sans débit/tirage supplémentaire | REC-SO-16 | Voyages existants gardent conditions initiales ; SO-04/06 |
| Événement/embuscade | Événements économiques et routes | — | D6 par trajet/convoi, table V0.7, priorité ciblée, une interception/tronçon, PNJ préparé et financé | REC-SO-17, concurrence | Tirages enregistrés une seule fois ; SO-04 |
| Abordage et fret | `cargo`, réservations, capacité, propriété distincte | — | Arrimage 2 min puis tranches 5 unités/3 min, source unique, interruption sans transfert inachevé | REC-SO-18 | Réutiliser les lots réels et droits ; SO-04 |
| Remorquage/épaves/casse ; A29–A32 | Vaisseaux et inventaire | — | Gabarit/attelage, fuel ×2, publicité S+1, caution, récupération financée, rendement unique 10 %, démantèlement irréversible | REC-SO-19 | Aucun transfert de fret déduit de la propriété du navire ; SO-04 |
| Prix et magasins ; A24, A31–A32 | `market`, `prices`, `sales`, `payments`, stocks | — | 12 prix et marchés canoniques, caisses/stock PNJ, arrondi total de ligne, exceptions négociation/modules/pièces | Paiements, arrondis multi-unités, fonds insuffisants | Ancien devis figé ; pas de conversion des transactions ; SO-05 |
| Douanes/identités ; A33–A34 | Tarifs de fret et bénéficiaire réel | — | Mandat N1–5, une inspection/escale, licences, retenue 15 min, faux/transpondeur distincts ID permanent | REC-SO-20 | Conserver identité durable et journal MJ ; SO-05 |
| Contrat/escorte/litige ; A35–A36 | Contrats financés et réservations | — | Réserves réelles obligatoires, 10/20 min, 100/50/0 %, avenants, carburant distinct, recours S+1 | REC-SO-21, budgets et preuves | Pas de `GM_EXTERNAL` SO ; garder contrats historiques ; SO-05 |
| Assurance ; A37 | Accounts/Ledger et lots identifiés | — | 2/4/6 %, couverture unique, réserve maximale, 80 % cap 5000, récupération/restitution proportionnelle | REC-SO-22, doublons/sous-financement | Référence lot/voyage/police ; ne pas effacer le butin pirate ; SO-05 |
| Clôture/reprise ; A38 | `campaigns`, source scellée, copies/version | — | Conserver voyages/contrats/réserves, expirer effets provisoires, interdire guérison automatique, résoudre urgences | REC-SO-23 | Migration de copie des opérations ouvertes, test interruption/reprise obligatoire ; SO-06 |
| Imports répétés et sessions historiques | Master v1, opérations/digests, snapshots | Catalogue global et réimport idempotent | Import du profil canonique complet et migration publiée explicite | REC-SO-24 encore non testé ; suites Masters conservées | Les quatre XLSX restent identiques ; SO-01/06 |
| Permissions, QR, secrets et médias | `workflow`, projections, `staff`, médias privés | Export global propriétaire seulement | Vérifier chaque nouveau service SO, aucun secret envoyé pour masquage client | SEC-SO-01/05, suites existantes partielles | Aucun nouveau privilège Firebase ; transversal |
| Concurrence, réessais, réseau | Transactions Firestore, requestId/digest, réservations | Révision commune et refus de réimport obsolète | Vols, combat, assurance et clôture concurrente ; reprise d'état incertain | SEC-SO-02/04, émulateurs et recette réseau | Pas de fonctionnement transactionnel hors ligne annoncé |
| Mobile, ~60 participants, sécurité terrain | UI responsive et scanner/code de secours | Navigation six vues maintenue | Mesures Android/iOS, multicomptes, réseau, homologation et évacuation | SEC-SO-08/09, recette humaine non exécutée | Projet de recette isolé à identifier |
| Livraison et sauvegarde | PR, `check.yml`, archives scénario | Rapport/procédure, tests nouveaux reliés aux émulateurs | Sauvegarde complète et restauration isolée prouvées avant migration | SEC-SO-10 ; journaux CI | Aucune production autorisée |

## Registre des recettes

Les critères ci-dessous sont repris littéralement du V3. Toutes les recettes métier complètes sont **NON TESTÉES** à ce stade. Un test d'une primitive historique ou de SO-06a ne remplace pas la recette du parcours V0.7. Pour chaque exécution future, consigner commit, environnement, date, rôle/compte fictif, appareil, étapes, attendu, constat, preuve, anomalie et nouveau verdict. Les scénarios physiques exigent en plus l'observation terrain.

## 24 parcours métier

| ID | Situation | Attendu V3 | État observé |
|---|---|---|---|
| REC-SO-01 | Créer 8 classes, 8 initiations et 2 natures humanoïde/droïde | Trois compétences initiales N2 ou fixes, initiation N1 admissible occupant une place secondaire, cinq places max, Vétéran réservé au Combattant | NON TESTÉ |
| REC-SO-02 | Jouer quatre sessions, mourir deux fois dans une session | Passage utilisateur à 8 PA après quatre sessions, 3 XP max/session, XP successeur plancher(25 % carrière) plafonné à 9, réserve PA complète à chaque nouvelle incarnation | NON TESTÉ |
| REC-SO-03 | Dépenser et tenter de transférer les 200 Cr protégés | Services PNJ autorisés oui ; don, module, achat-revente, transmission à successeur non ; déprotection au début de l’épisode suivant | NON TESTÉ |
| REC-SO-04 | Frapper, absorber protection et déclencher secours à 0 PV | 3 ou 4 PV, une seule protection, fenêtre de 2 s, compte de survie réel 5 min, stabilisation seulement après 60 s continues ; STOP SÉCURITÉ suspend la conséquence mortelle | NON TESTÉ |
| REC-SO-05 | Soins MED-02/MEC-02 et atelier de droïde | Timing N2/N3/N4/N5, 1 PV puis 10 min récupération ; réparation complète du droïde ne restaure ni module endommagé ni protection épuisée | NON TESTÉ |
| REC-SO-06 | ROG-02 au poste organisation : nom faux, cible vide, un objet, plusieurs objets | Faux nom = 10 min de récupération sans PA ni quota cible ; vide = quota et récupération, pas PA ; N3/N4 deux types ; un seul objet transféré | NON TESTÉ |
| REC-SO-07 | ROG-02 avec deux voleurs concurrents et notification | Max 2 tentatives/1 réussite par victime/session ; pas de double transfert ; notification sans auteur à +10 min ; remise physique en attente | NON TESTÉ |
| REC-SO-08 | ROG-03 au QR serrure prison avec gardien | Surveillance directe empêche la sortie ; interruption zéro temps restant ; repéré = 10 min récupération sans PA ; sortie physique sûre ; max 20 min de captivité | NON TESTÉ |
| REC-SO-09 | Sabotage sur installation, module droïde et vaisseau à quai | Niveaux d’accès respectés, 1 PA et kit au test, neutralisation max 15 min ; pas d’avarie durable créée implicitement | NON TESTÉ |
| REC-SO-10 | Dissimulation vs TRA-02, Pistage vs EFF-01 | Une unité/30 min, égalité favorable à la découverte ; traces de jeu ≤ 15 min, comparaison directe des niveaux, journal technique intact | NON TESTÉ |
| REC-SO-11 | Toxicologie QR et droïde | Dose consignée, activation volontaire par la cible ; Malaise 15 min humanoïde, 0 perte PV et non cumul ; droïde immunisé | NON TESTÉ |
| REC-SO-12 | Installer, neutraliser, endommager, retirer module droïde | 2 emplacements, 6 références et prix ; états indépendants, coûts et ressources distincts, pas de copie au retrait | NON TESTÉ |
| REC-SO-13 | Combat : tirs simultanés, deux défenseurs et deux fuyards | D6 et seuils, hits simultanés même à 0 Coque, bouclier puis Coque, un poursuivant principal, égalité poursuivant, deux rounds sans hostilité terminent | NON TESTÉ |
| REC-SO-14 | PIL-03 N1, N3, N4, N5 ; ESC-01 N4 et N5 | Décrochage ≥ 6, Feinte seuil de défense min 6, non-cumul des bonus de fuite, escorte +1 au résultat même au-delà +3, réservations PA remboursées si aucune exécution | NON TESTÉ |
| REC-SO-15 | Rencontre avec interception sans tirs puis tirs entièrement esquivés | Première : aucune révision ; seconde : révision 1 % obligatoire ; Coque/Bouclier/modules traités indépendamment | NON TESTÉ |
| REC-SO-16 | Départ, panne sèche, ravitaillement, détour de convoi, reprise intersession | 5/10/15 min, carburant 1/2/3 × taille à 25 Cr, un débit départ, surcharge/détour payé par appareil, pas de second tirage | NON TESTÉ |
| REC-SO-17 | Événement routier, escorte et embuscades concurrentes | Un tirage par convoi/trajet, deuxième D6 si incident, ciblée prioritaire, une seule interception par tronçon, pas de double menace PNJ | NON TESTÉ |
| REC-SO-18 | Arrimer et transférer 12 unités puis interrompre la dernière tranche | Après 2+3+3 min (dont arrimage), 10 unités transférées, les 2 dernières restent ; aucune prise sans soute receveuse compatible | NON TESTÉ |
| REC-SO-19 | Revendiquer, remorquer et mettre une épave à la casse | Gabarit/attelage, carburant ×2, publicité S+1, caution 5 %, droit sur bâtiment ≠ droit sur fret ; 10 % de lots de pièces, sans doublon | NON TESTÉ |
| REC-SO-20 | Contrôle douanier N1–N5 et falsification INF-03 | 1D6 + contrôle ≥ 7, une inspection par escale, retenue max 15 min ; faux N3/N4/N5 passent sur 4+/3+/2+, pas de saisie automatique | NON TESTÉ |
| REC-SO-21 | Contrat/escorte, litige et annulation | Réserves réelles, 10 min contestation, 20 min médiation, salaire 100/50/0 %, avenants +25 %, provisions carburant distinctes, recours S+1 | NON TESTÉ |
| REC-SO-22 | Assurer mêmes lots deux fois, perdre puis retrouver du fret | Double souscription refusée, prime 2/4/6 %, indemnité 80 % plafonnée à 5 000 Cr, réserve assurantielle financée, récupération déclenche restitution proportionnelle | NON TESTÉ |
| REC-SO-23 | Fermer session avec 0 PV stabilisé, modules défectueux et voyages | PV/Coque/fonds/fret/trajets conservés, effets provisoires expirés, PA au maximum, aucun soin/fuel/reroll automatique ; clôture des délais critiques vérifiée | NON TESTÉ |
| REC-SO-24 | Importer même profil SPACE OUTLAWS V0.7 plusieurs fois | Aucune dotation/compétence/stock/argent supplémentaire ; anciennes sessions intactes ; changement du référentiel uniquement sur version publiée | NON TESTÉ |

## 10 essais transversaux

| ID | Situation | Attendu V3 | État observé |
|---|---|---|---|
| SEC-SO-01 | Badge QR public, QR privé et faux rôle MJ | Aucun accès privé ou changement de privilège par simple scan | NON TESTÉ |
| SEC-SO-02 | Double clic, deux joueurs concurrents et réseau coupé pendant débit | Aucun paiement, butin, PA, stock ou lot dupliqué | NON TESTÉ |
| SEC-SO-03 | Import réitéré, changement de session et session fermée | Données des épisodes anciens intactes, aucun nouveau kit | NON TESTÉ |
| SEC-SO-04 | Deux Rogues visent simultanément la même victime | Quota global, transfert unique, aucune information secrète révélée | NON TESTÉ |
| SEC-SO-05 | Joueurs avec groupes, caisse commune et propriétés de vaisseaux | Être membre ne donne pas pouvoir de dépense ou de transfert | NON TESTÉ |
| SEC-SO-06 | Attaque après deux rounds passifs, après reddition et en poursuite | Fin/repli/consommation corrects, non-révision sans tirs | NON TESTÉ |
| SEC-SO-07 | Caisse PNJ et assureur insuffisamment financés | Refus explicite, pas de soldes négatifs ni monnaie créée | NON TESTÉ |
| SEC-SO-08 | Arrêt sécurité pendant minuteur médical/captivité | Pas de décès indu ; limites réelles et sorties sûres respectées | NON TESTÉ |
| SEC-SO-09 | Plusieurs téléphones Android/iOS et ~60 utilisateurs en test | Droits, QR, ergonomie, temps de réponse mesurés et consignés | NON TESTÉ |
| SEC-SO-10 | Déclenchement de workflows GitHub | Exécution des tests sans job de déploiement ni changement Firebase production | CI de référence exécutée ; nouveau commit à contrôler, résultats dans PR #1 |

## Extension V3.1/V0.7 et sous-lot SO-01a

Références intégrales, différences documentaires et limites dans [SO-01a](SO-01A-NATURES-SOINS.md). Les sources V3.0/V0.6 restent archivées. La classe PNJ Force est distincte des huit classes joueurs ; aucun attribut de nature ne lui accorde de droit.

| Exigence | Existant réutilisable / adaptation | Manquant | Tests / migration |
|---|---|---|---|
| PNJ Force caché, orientation Jedi/Sith, LAS indépendante | Permissions OWNER/MJ, profils et projections | Statut réservé, attribution MJ, confidentialité et exclusion XP/initiation/import joueur | REC-SO-FOR-01, aucun ajout automatique à un ancien Master |
| FOR-01 N1–N5 | Actions, réservations PA, horloges, D6 et audit | Pouvoirs, limites, résistance, activation unique, récupération commune, médiation de scène et STOP | REC-SO-FOR-02 à 06 ; nouveau profil publié requis |
| Breach Port | Libellé narratif du référentiel actuel | Contenu de chaque Master à préparer | Aucun renommage d’ID, QR ou archive historique |
| Natures / soins | SO-01a : dix tests métier mémoire/Firestore + trois UI, données réelles existantes | Profil fermé imposant toutes les règles MED/MEC | Couverture partielle REC-SO-01/05/23/24 ; aucune migration de session |

| Recette supplémentaire | Fonction à valider | État de recette complète |
|---|---|---|
| REC-SO-FOR-01 | Refus joueur, classe PNJ secrète, orientations et LAS indépendante | NON TESTÉ ; non implémenté |
| REC-SO-FOR-02 | Influence, droïde immunisé, suggestions interdites, égalité | NON TESTÉ ; non implémenté |
| REC-SO-FOR-03 | Soin 60/90 s, survie, interruptions et quota cible/session | NON TESTÉ ; non implémenté |
| REC-SO-FOR-04 | Projection, Protection Jedi, Étouffement Sith et sécurité | NON TESTÉ ; non implémenté |
| REC-SO-FOR-05 | Double cible, jets séparés, un PA, récupération et confrontation | NON TESTÉ ; non implémenté |
| REC-SO-FOR-06 | Usurpation, réessai, réseau, arbitre, STOP et secrets | NON TESTÉ ; non implémenté |

Les statuts NON TESTÉ des 24 REC-SO complets restent inchangés. Les succès unitaires, transactionnels et de rendu ne valent pas recette terrain.

## Extension V3.2 — Recettes & Potions

[Audit, mapping du tableur et résultats SO-06b](SO-06B-RECETTES-BROUILLONS.md). La préparation de brouillons constitue une tranche achevée d’édition ; elle n’autorise pas la publication du module complet.

| Exigence | Existant | Adapté SO-06b | Manquant | Test / migration |
|---|---|---|---|---|
| Référentiel unique, six vues | Master, items/inventory, versions | Feuille Recettes de Boutiques, 20 composants max, références communes | Métadonnées structurées d’autorisation/rareté et profil fermé | Import identique, objets historiques et sessions inchangés ; collection optionnelle `recipes` |
| Import/export autonome et édition sans code | Éditeurs L1, XLSX strict, diff/version | CRUD brouillon, sous-Master recettes + objets référencés, exemple source adapté | Publication versionnée jouable et compatibilité des doses | Onze cas métier partagés Memory/Firestore + quatre UI ; aucun lot créé |
| Laboratoires et déblocages | fieldTargets, QR, knowledge, droits et missions | Références préparatoires vérifiées seulement | Labo actif, habilitations personnage/groupe/faction, droits issus de découverte | REC-02, refus non propriétaire ; aucune attribution implicite |
| TOXI-01 : 1 PA, 300 s, 600 s, une dose | Actions, horloge, réservations PA et fournitures | Aucun moteur parallèle | Réservation multi-lots, achèvement/annulation, dose et provenance | REC-03 ; tests de fabrication non exécutés |
| Effets, activation volontaire et antidote compatible | Natures SO-01a, soins et QR | Publication entièrement bloquée au serveur | Registre implémenté, Malaise, états compatibles, dose placée/consommée/retirée | REC-04/05 ; pas d’effet à partir d’un texte libre |
| Propositions de prix/formule | Cours/commerce réels | Prix indicatif privé, exemples DRAFT, aucune formule Excel exécutée | Vente des vraies doses avec même état et règles | Pas de cours, stock ni compte créés par cette tranche |
| Versions/campagne/archives | Copies et reçus existants | Définitions conservées, import absent rétrocompatible | Snapshots de doses jouées, A38 toujours ouvert | Archives nouvelles et anciennes, copie d’épisode ; retour ancien code à encadrer |

| Cas V3.2 | Attendu | Preuve actuelle / état |
|---|---|---|
| REC-SO-REC-01 | Ajouter recette et ingrédient, importer deux fois, diff correct, pas de stock/crédit, autres rubriques et anciennes sessions intactes | **Scénario automatisé exécuté localement** dans `master-recipes-suite`, aussi raccordé à Firestore ; résultat CI exact dans la PR après exécution. Recette humaine non exécutée |
| REC-SO-REC-02 | Recette secrète apprise en mission, formule réservée au joueur qualifié et habilité, pas de fuite navigateur | **NON EXÉCUTÉ**, parcours mission/déblocage non implémenté ; seuls refus d’accès aux brouillons testés |
| REC-SO-REC-03 | Fabrication multi-ingrédients, clic simultané, interruption/réseau, un PA/une consommation/une dose à l’achèvement | **NON EXÉCUTÉ**, fabrication non implémentée ; tests de double clic/interruption portent uniquement sur l’import |
| REC-SO-REC-04 | Activation volontaire humanoïde, 15 min sans perte PV, non-cumul, immunité droïde, scan tiers sans effet | **NON EXÉCUTÉ**, effets/dose non implémentés |
| REC-SO-REC-05 | Rejeter effet absent, antidote universel, N5 sans droit et ingrédient supprimé | **COUVERTURE PARTIELLE AUTOMATISÉE** : toute publication est refusée, références absentes/archivage bloqués. Pas encore de publication valide servant de témoin ni de droits N5 réels |

Les 24 cas initiaux, six FOR et dix SEC complets gardent leurs statuts ci-dessus. Aucune recette humaine, téléphone réel, sécurité terrain, charge ou restauration de production n’est ajoutée aux preuves automatiques.
