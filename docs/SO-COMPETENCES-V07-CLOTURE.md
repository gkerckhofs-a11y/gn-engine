# Clôture fonctionnelle des compétences V0.7

Travail du 13 novembre 2026. Référence : [règles V0.7 du 23 octobre 2026](source/SO_Regles_V07.txt). Périmètre : 34 capacités joueurs ; FOR-01 reste exclu. Ce document est la matrice unique de la nouvelle clôture, pas une attestation de recette terrain.

## Base et traçabilité

Inspection initiale : main `49ec5ea12100f9efb62ea23773b216d465d06297`, PR #14 et #15 fusionnées. CI exacte de cette base : 43433207932 réussie ; déploiement précédent : 43433207514 réussi. PR #2 fusionnée ; PR #3 ouverte, audit Firebase distinct. Les anciennes lignes « candidat » de SO-VALIDATION et de la matrice V3 ne prouvent pas à elles seules la conformité actuelle.

Candidat : branche `work/skills-v07-closure`. Les SHA, la PR et les résultats CI exacts figurent dans la PR de cette branche. Aucun déploiement, changement de données réelles, migration des manifestes existants ou suppression demandé par cette clôture n'a été exécuté.

« À vérifier » désigne une couverture canonique complète encore à démontrer ; cela ne retire pas les validations antérieures de sous-parcours. « Partiel » indique un complément identifié. Les acquisitions et techniques physiques restent dans les moteurs existants. Une CI verte n'est pas une recette terrain.

## Arbitrages conservés

- Primes ouvertes : classe principale TRA exclusivement ; une compétence TRA secondaire ne donne pas cet accès.
- Marché spécialisé : restriction de PR #15 conservée. Le cahier des charges du 13 novembre demande explicitement des **cours publics gratuits pour les autres métiers** : route séparée `#/public-prices/:session`, projection native `commodityMarket`, aucune dépense de PA. Les remises spécialisées suivent les compétences acquises. Paiements et remises volontaires restent leurs parcours natifs.
- COU-02 : le propriétaire a confirmé dans cette conversation le **maintien des cinq minutes réelles** de validité. V0.7, chapitre 13, citait ce délai comme hérité de V0.3. Le délai commence au résultat réussi, ne redémarre pas à la consultation et ne permet pas une deuxième tentative sur la même version d'offre.

## Compléments de tranche 1

### MED-01

Le moteur `person-actions` porte désormais un diagnostic de 60 secondes, 1 PA, récupération personnelle de 600 secondes de jeu. Un diagnostic n'exige pas une blessure et ne soigne/stabilise jamais. Les observations de jeu sont préparées par le MJ, versionnées dans `medicalDossiers` avec historique ; aucune donnée médicale réelle n'est demandée.

N1 donne PV/état ; N2 les observations de gravité et traitement préparées ; N3 les substances fictives enregistrées, sans jet ; N4 les cas rares préparés ; N5 les interactions préparées. Un supplément facultatif peut utiliser le D6, sans retirer les informations garanties en cas d'échec. Le scanner compatible autorisé apporte +1 ; aucun bonus +2 n'est admis pour MED-01. Le résultat privé est conservé dans l'historique. Une modification du dossier pendant l'action interrompt la résolution. La version clinique du patient ne change pas seulement parce que sa protection change.

Limite : les substances sont actuellement renseignées par le MJ. Le raccord automatique avec fabrication, activation, antidote et expiration TOXI-01 doit être réalisé en tranche 3. Ne pas certifier cette intégration avant son test.

### MED-03

Les protocoles généraux `CLINIC_SAFE` et `CLINIC_FAST` sont réutilisés. La régie associe un lieu M6 publié représentant la clinique équipée, une dose de bacta M1 et les matériels bonus compatibles. La trousse vient du protocole MED-02 publié ; aucun consommable ni stock n'est créé par cette configuration.

Le serveur impose MED-03 N2 et MED-02 N2, autrui, patient humanoïde, lieu en service, 1 PA et deux consommables distincts. Durées sûres N2–N5 : 300/270/240/210 s ; accélérées : 180/165/150/135 s. D6 + MED-03 + bonus autorisés ≥ 6. Échec : 120 s supplémentaires, sans second jet ni coût ; interruption après le jet sans remboursement ni soin. Succès : PV maximum et fin de convalescence, protection et délai patient MED-02 conservés.

La continuation d'un soin urgent utilise la même horloge vitale que son démarrage et conserve la stabilisation entre les étapes. Annulation/MJ utilisent les commandes natives. La présence physique et l'équipement réel du lieu demeurent attestés dans le parcours et à vérifier sur le terrain. Les révisions complètes de droïdes en atelier restent distinctes, à raccorder sous MEC-02.

### COU-01

Profil M6 d'analyse canonique : 60 s, 1 PA, récupération 600 s, informations préparées par niveau et supplément facultatif au D6. Pas de jet en l'absence de supplément accessible au niveau du personnage. Reçus privés natifs, une tentative par personnage/version, relecture sans PA, aucune création de stock/crédits ni ouverture de comptes ou soutes privés. Cartes Action et Terminal conduisent au même parcours QR/ID. Les cours publics utilisent le service gratuit distinct.

### COU-02

Une offre M5 doit être explicitement marquée négociable et affectée à un niveau 1–5. La publication prépare sa cible d'action ; une offre ordinaire ne devient pas implicitement négociable. Le joueur peut choisir la quantité du lot, puis joue 120 s, 1 PA, D6 + compétence + aide autorisée ≥ 6, récupération 600 s, une tentative par version d'offre.

Réussite : 90 % du total initial, arrondi au crédit supérieur, minimum 1. L'achat natif vérifie personnage, accès, compétence, offre, révision du lot, quantité, prix initial, expiration et non-utilisation ; paiement, stock, reçu et utilisation de la remise sont atomiques. Échec : PA consommé, aucune remise. Un prix/stock changé pendant la scène empêche sa résolution sur l'ancien lot. Les crédits de création restent soumis aux restrictions existantes.

Limite : les offres M5 déjà ouvertes au jeu sont les consommables et modules standards. Les prestations, offres de fret et contrats exclusifs doivent être raccordés à leurs opérations natives avant de considérer COU-02 complet pour toutes ses catégories. Une remise ne constitue jamais une licence.

### COU-03

Profil M6 de contact à réponse préparée : niveau minimal du réseau 1–5, 300 s, 1 PA, sans dé, récupération 600 s. Quota de réponses par personnage et session/épisode : 2/2/3/3/4. L'annulation ne consomme pas de réponse. Le compteur utilise le registre natif de récupération ; les réponses utilisent le carnet privé natif. Un dossier déjà obtenu reste relisible gratuitement. Chaque question/réponse préparée correspond à une cible/version ; le MJ doit préparer un autre dossier pour une autre demande.

Aucune réponse inventée en l'absence de dossier. Trouver un fournisseur, acheteur, transporteur ou contrat ne crée ni stock, crédit, accord ni contrat signé. Aucun effet financier automatique.

Les nouvelles capacités MED-01 et COU sont inscrites dans les nouveaux manifestes de publication. Les anciens manifestes restent fermés ; aucune session réelle n'a été migrée. Les protocoles cliniques, comme ceux d'entretien de protection, sont configurés explicitement en régie de session avec des références existantes.

## Matrice des 34 capacités

Dans « Commit / PR », **B** = base main `49ec5ea12100f9efb62ea23773b216d465d06297` ; **C** = branche candidate ci-dessus, SHA/CI exacts consignés dans sa PR. « Publication non vérifiée » porte sur la compétence complète, pas sur l'existence du déploiement de B. Les numéros de chapitre renvoient au livre canonique.

| Compétence | Classe | Règle | Moteur | Interface | Statut | Tests | Commit / PR | Publication | Recette terrain | Reste à faire |
|---|---|---|---|---|---|---|---|---|---|---|
| COM-01 Vétéran | Combattant | ch. 7, 3, 6 | naissance, santé, succession | Personnage | À vérifier | entry/health/succession existants | B | Non vérifié | À faire | Recette complète 4 PV, relève et persistance |
| COM-02 Désarmement | Combattant | ch. 7, 5 | règles joueur | Physique | À vérifier | présentation à contrôler | B | Non vérifié | À faire | Vérifier consignes et limites sans téléphone en confrontation |
| COM-03 Lecture tactique | Combattant | ch. 7, 4 | field-actions ANALYZE | Action | À vérifier | space-outlaws-actions | B/C | Non vérifié | À faire | Contrôle de clôture des cinq niveaux et cibles défensives |
| ROG-01 Neutralisation furtive | Rogue | ch. 8, 5 | santé et procédure physique | Physique/Action | Partiel | santé existante | B | Non vérifié | À faire | Suivi spécifique des tentatives/récupération à raccorder |
| ROG-02 Vol à la tire | Rogue | ch. 8, A12 | space-pickpocket | Action | À vérifier | space-pickpocket | B | Non vérifié | À faire | Recette identité, quotas et notification différée |
| ROG-03 Évasion | Rogue | ch. 8, 6 | space-escape | Action | À vérifier | space-escape | B | Non vérifié | À faire | Recette surveillance et verrous concurrents |
| TRA-01 Lecture des traces | Traqueur | ch. 9, 4 | field-actions ANALYZE | Action | À vérifier | space-outlaws-actions | B/C | Non vérifié | À faire | Recette garantie/supplément et version |
| TRA-02 Fouille méthodique | Traqueur | ch. 9, 6 | person-actions LOOT_METHODICAL | Action | Partiel | person-actions général | B | Non vérifié | À faire | Ouvrir profil SO, quota commun et opposition Dissimulation |
| TRA-03 Vérification documentaire | Traqueur | ch. 9, 14 | analyse M6, faux suivis | Action | Partiel | analyses et forgery séparés | B | Non vérifié | À faire | Raccorder l'inspection au faux effectivement possédé |
| MED-01 Diagnostic | Médecin | ch. 10, 4 | person-actions, medicalDossiers | Action | Partiel | space-medical-diagnosis | C | Non | À faire | Intégration automatique TOXI-01 et recette mobile |
| MED-02 Soins de terrain | Médecin | ch. 10, 6 | person-actions, santé SO | Action | À vérifier | space-outlaws-health | B/C | Non vérifié | À faire | Clôture intégrée avec diagnostics, clinique et toxicologie |
| MED-03 Traitement clinique | Médecin | ch. 10, 4 | person-actions CLINIC | Action/régie | À vérifier | space-clinic | C | Non | À faire | CI exacte, interaction avec états TOXI et recette clinique |
| MEC-01 Diagnostic technique | Mécano | ch. 11 | analyse M6/space-technical-analysis | Action | Partiel | space-technical-analysis | B/C | Non vérifié | À faire | Profils de droïdes, installations et pannes dynamiques |
| MEC-02 Réparation | Mécano | ch. 11, 17 | person-actions, maintenance/vaisseaux | Action/Terminal | Partiel | health, maintenance, space-clinic/workshop | B/C/W | Non vérifié | À faire | Révision atelier raccordée sur W ; blindage/boucliers, modules et autres profils spécialisés à compléter |
| MEC-03 Amélioration | Mécano | ch. 11, 17 | module-mandates/module-work | Action/Terminal | Partiel | module-work/module-mandates | B | Non vérifié | À faire | Couvrir modules droïdes, rares et prototypes |
| PIL-01 Navigation | Pilote | ch. 12, 18 | route-analysis, detours | Action/Terminal | À vérifier | route-analysis/detours | B/C | Non vérifié | À faire | Recette cinq niveaux, codes et changements de route |
| PIL-02 Préparation de vol | Pilote | ch. 12, 18 | voyages/cockpit-launch | Terminal/cockpit | À vérifier | voyages/cockpit-launch | B | Non vérifié | À faire | Recette mandats, manifeste et décollage |
| PIL-03 Manœuvres | Pilote | ch. 12, 20 | space-combat/round | Cockpit | À vérifier | space-combat | B | Non vérifié | À faire | Recette cinq niveaux, usage/voyage et simultanéité |
| COU-01 Expertise marchande | Courtier | ch. 13, 4 | field-actions ANALYZE | Action/Terminal | À vérifier | space-merchant-analysis | C | Non | À faire | CI exacte, dossiers économiques préparés et recette mobile |
| COU-02 Négociation | Courtier | ch. 13, arbitrage 5 min | field-actions, shops/sales | Terminal/Action | Partiel | space-merchant-negotiation | C | Non | À faire | Prestations, fret et contrats exclusifs hors offres M5 actuelles |
| COU-03 Réseau de contacts | Courtier | ch. 13, 4 | field-actions/carnet/récupérations | Terminal/Action | À vérifier | space-merchant-contacts | C | Non | À faire | CI exacte, reprise intersession et recette des réponses préparées |
| INF-01 Intrusion | Infiltrateur | ch. 14 | space-intrusion | Action | Partiel | space-intrusion | B | Non vérifié | À faire | Bonus, consommables et couverture des cibles |
| INF-02 Déchiffrement | Infiltrateur | ch. 14 | space-decryption/knowledge | Action | Partiel | space-decryption : 15 cas métier + 2 schémas ; intégration ciblée | B + D + E | Non vérifié | À faire | Bonus, cryptogrammes spécifiques et transferts à compléter ; accès et reçus renforcés |
| INF-03 Falsification | Infiltrateur | ch. 14 | space-forgery/evidence | Action | Partiel | space-forgery | B | Non vérifié | À faire | Raccord TRA-03 et inspection du document transféré |
| Entretien de protection | Supplémentaire | ch. 15, 5 | person-actions PROTECTION | Action | À vérifier | identity-news-health | B/C | Non vérifié | À faire | Banc de protection et recette des consommables compatibles |
| Riposte | Supplémentaire | ch. 15, 5 | règles joueur | Physique | À vérifier | présentation à contrôler | B | Non vérifié | À faire | Vérifier règles par adversaire/confrontation, aucune commande exigée |
| Garde du corps | Supplémentaire | ch. 15, 5 | règles joueur, déclaration santé | Physique | À vérifier | présentation à contrôler | B | Non vérifié | À faire | Désignation, distance et transfert joué au bon moment |
| Sabotage | Supplémentaire | ch. 15 | field-actions SABOTAGE/REPAIR | Action | Partiel | space-installation, field-actions | S | Non | À faire | Installations N1–N2 raccordées ; modules de droïdes N3, vaisseaux N4 et profils exceptionnels N5 à compléter |
| Dissimulation | Supplémentaire | ch. 15 | inventaire natif à étendre | Action/sac | À développer | Pas de parcours spécifique identifié | B | Non vérifié | À faire | Unité cachée, expiration et opposition TRA-02 |
| FIL-01 Pistage | Supplémentaire | ch. 15 | traces fictives à raccorder | Action | À développer | Pas de parcours spécifique identifié | B | Non vérifié | À faire | Registre commun fictif, niveaux et suivi spatial |
| TOXI-01 Toxicologie | Supplémentaire | ch. 15 | recettes/inventaire à raccorder | Action | À développer | Catalogue préparatoire, pas de cycle complet identifié | B/C | Non | À faire | Fabrication, activation volontaire, antidote, expiration et MED-01 |
| ESC-01 Escorte spatiale | Supplémentaire | ch. 15, 20, 25 | escort/maneuvers/combat | Cockpit/Terminal | À vérifier | space-escort-maneuvers | B | Non vérifié | À faire | Recette intégrée avec PIL-03 et mandats |
| EFF-01 Effacement de traces | Supplémentaire | ch. 15 | traces fictives à raccorder | Action | À développer | Pas de parcours spécifique identifié | B | Non vérifié | À faire | Masquage/opposition FIL sans aucune suppression d'audit |
| LAS-01 Maîtrise du sabre | Supplémentaire | ch. 15, 5 | apprentissage, santé, règles | Personnage/physique | À vérifier | health/learning | B | Non vérifié | À faire | Attribution, arme compatible et procédure physique |

## Vérification et limites de clôture

Les suites des cinq compléments sont partagées entre mémoire et Firestore local. Elles couvrent notamment : niveau, durée, PA, garantie d'informations, données privées, annulation, récupération, concurrence, état/version modifié, fournitures, réussite/échec, stock et paiement natifs, réessai après réponse perdue. Les résultats exécutés et la CI exacte sont consignés dans la PR ; ne pas transformer une suite prévue en résultat réussi.

Première vérification ciblée avant les derniers compléments : 202 tests réussis ; 13 cas cliniques/expertise réussis sur Firestore local. Ces chiffres ne décrivent pas le dernier commit et ne s'ajoutent pas aux campagnes suivantes. La compilation a réussi pendant le développement ; elle doit être refaite sur le candidat final.

La tranche 1 n'est pas une clôture des 34 compétences. MED-01 attend TOXI-01 ; COU-02 attend les catégories d'offres hors comptoirs actuels. Les tranches 2 et 3 et la recette intégrée huit classes restent à exécuter. Aucun statut Validé n'est attribué globalement sur la seule présence des nouveaux boutons.

## Checklist terrain à conserver

- [ ] Session isolée, huit classes, compétences initiales et secondaires ; aucune suppression de la session réelle.
- [ ] Humanoïde et droïde ; refus biologique, urgence réelle, STOP, convalescence, protection séparée.
- [ ] Clinique et atelier équipés, consommables réels de jeu ; protocoles sûr/accéléré et interruption.
- [ ] QR et ID manuels sur smartphones ; action conservée, absence de double choix, matériel sélectionnable avant confirmation.
- [ ] Cours gratuits depuis un métier non Courtier ; expertise privée ; contact avec réponse préparée et quota.
- [ ] Négociation refusée sur offre non autorisée ; prix arrondi, cinq minutes réelles, même lot et reçu de paiement unique.
- [ ] Fouilles/vol/dissimulation avec quota commun ; faux transmis puis inspecté ; déchiffrement acquis.
- [ ] Vaisseaux mandatés, préparation, révision après tirs, coque/bouclier distincts, PIL-03 et ESC-01.
- [ ] Sabotage/remise en service, pistage/effacement fictif, toxicologie volontaire/antidote/expiration.
- [ ] Deux utilisateurs concurrents, réseau interrompu, reprise, changement de personnage et révocation.
- [ ] Historiques joueur/MJ, aucune fuite des secrets ni altération de l'audit technique.

Recommandation actuelle : **recette isolée des parcours développés**, pas certification d'aptitude de l'ensemble du GN pour une session réelle.

### Preuves du candidat de tranche 1 — 13 novembre 2026

PR [#16](https://github.com/gkerckhofs-a11y/gn-engine/pull/16), brouillon, non fusionnée. Premier candidat `41eadec08c3f3022498c0702f68ae2e11f3ac811` : campagne locale complète de 2 987 tests réussis puis 25 tests d'interface réussis ; 26 cas des cinq nouvelles suites réussis sur émulateur Firestore. CI [43459484221](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43459484221) : application et HTTP/navigateur réussis ; Firestore encore en cours au moment de cette rédaction.

Correctif suivant : dossiers médicaux, historique et tentatives diagnostiques repris par la copie native d'épisode ; remise liée à sa session d'origine ; identifiants ASCII des liens cliniques pour conserver la sélection dans le fragment d'URL du navigateur. Vérification locale : 50 tests de persistance et non-régression réussis, 19 tests de menu/clinique réussis, deux cas ciblés Firestore réussis, compilation réussie. Ces campagnes se recouvrent et ne doivent pas être additionnées. Le SHA et la conclusion de CI du correctif sont à consulter dans la PR.

Aucune publication Firebase, modification de session réelle ou recette terrain dans cette tranche.

## Tranche 2 — révision intégrale des droïdes

**W** = branche `work/skills-v07-workshop`, basée sur `901648aae6ef59ed117a1428ff8e474693cc153e` de la PR #16. Complément proposé séparément ; main demeure `49ec5ea12100f9efb62ea23773b216d465d06297`. SHA et CI exacts consignés dans la PR du complément.

Référence canonique : livre V0.7, chapitre 6 (révision intégrale) et chapitre 11, MEC-02. Réemploi du moteur `person-actions` et de ses protocoles `CLINIC_SAFE` / `CLINIC_FAST`, sans moteur de réparation parallèle.

- Atelier M6 publié et en service, MEC-02 N2 + MEC-01 N2 ; cible droïde distincte de l'intervenant. Un médecin sans ces compétences n'obtient aucun droit mécanique.
- Protocole sûr : 300/270/240/210 s aux niveaux 2/3/4/5 ; accéléré : 180/165/150/135 s, D6 + MEC-02 + bonus autorisés ≥ 6. Échec : 120 s supplémentaires, sans nouveau jet ou coût.
- Un PA, un composant compatible et un lot de pièces de 50 Cr d'usage. Références du kit Mécano publié, jamais déduites du nom d'un objet. Le lot de pièces initial non marqué consommable reste utilisable dans ce seul protocole et est consommé une fois ; aucun débit additionnel de 50 crédits.
- Tous les PV restaurés et recalibrage terminé ; protection, modules et délai de réparation de terrain conservés. Stabilisation et STOP utilisent les horloges natives. Annulation avant résolution : réservations libérées ; après échec du jet : aucun remboursement.
- Deux cartes Action, sélection du droïde par le parcours QR/ID existant, atelier/fournitures vérifiés avant confirmation. Préparation depuis les profils cliniques de la régie avec choix explicite Humanoïde/Droïde.
- Capacité `workshopVersion=1` des nouvelles publications. Les empreintes des anciens profils médicaux restent vérifiables à l'identique ; aucune session ni version publiée n'est migrée implicitement.

Validation locale : 59 tests ciblés réussis (atelier, clinique, santé, publication, épisodes, menu), puis campagne complète de 2 996 tests réussis ; après les derniers ajustements de projection/interface, 25 tests clinique/atelier/menu réussis. Six cas dédiés réussis sur Firestore local, compilation et `git diff --check` réussis. Ces campagnes se recouvrent. Aucune CI exacte de W encore validée à cette rédaction ; aucune fusion, publication Firebase ni recette terrain. Ce complément ne clôture pas MEC-02 : rechargement des blindages/boucliers et réparation des modules restent distincts et à compléter.

## Complément — sabotage et remise en service des installations A15 N1–N2

**S** = branche `work/skills-v07-installations`, basée sur `c2538a134cca411685880d4de68de776d555118b` (PR #17). Référence : V0.7 chapitre 15, Sabotage/A15 ; récupération par défaut du chapitre 4. Les moteurs natifs `field-actions` et `fieldStates` sont réutilisés.

- M6 prépare explicitement une installation simple N1 ou protégée N2, son kit consommable, les bonus compatibles, les conséquences et le seuil annoncé (6 par défaut). Les paramètres canoniques sont contrôlés avant publication. Aucun QR quelconque, module ou vaisseau n'acquiert ces droits.
- Sabotage : 300 secondes, 1 PA, un kit consommé au jet même sur échec, D6 serveur + compétence + bonus/aide, récupération personnelle 600 secondes. Échec : verrou 300 secondes sur la cible ; succès : panne temporaire de 900 secondes au maximum.
- Remise en service : MEC-02 N2, 180 secondes, 1 PA, sans dé ni pièces ; récupération par défaut de 600 secondes. Aucun PV ou module durablement endommagé n'est réparé.
- Une panne active par cible ; verrou natif d'intervention, confirmations et réservations transactionnelles. Annulation avant résolution sans consommation ; changement de version et accès révoqué refusés.
- Protection de 900 secondes après remise en service, y compris expiration automatique. La protection est calculée depuis l'échéance réelle de la panne, jamais depuis une consultation tardive. L'historique technique n'est pas supprimé.
- Cartes directes Action « Saboter une installation » et « Remettre une installation en service », sur QR ou code de cible. Préparation via l'éditeur M6 ; capacité des nouvelles publications `sabotageVersion=1`. Anciennes sessions fermées, sans migration implicite.

Validation locale : 77 tests ciblés, campagne complète de 3 002 tests, six cas Firestore dédiés, compilation et `git diff --check` réussis. Les campagnes se recouvrent ; leurs nombres ne sont pas additionnables. SHA et état de CI exacts consignés dans la PR. Aucun déploiement ou test terrain. Le statut Sabotage demeure **Partiel** : les niveaux avancés demandent les raccordements spécifiques aux modules, aux vaisseaux à quai et aux exceptions préparées.

## Complément — confidentialité et résolution INF-02

**D** = branche `work/skills-v07-decryption-guards`, basée sur `f5752b5cf6a6de02f0184bfad3df659acb887960` (PR #18). Référence : V0.7 chapitre 14, INF-02 ; règles générales d’indisponibilité du personnage. Aucun coût, durée, seuil ou bonus canonique modifié.

Le moteur existant `space-decryption` vérifie maintenant la version d’accès de l’action à la résolution et à l’annulation. Les reçus de requête sont liés au personnage et à la version d’accès : une reprise réseau dans le même contexte renvoie le résultat enregistré sans nouvelle dépense ; une réaffectation ne donne pas accès au résultat précédent. Les anciens reçus dépourvus de cette liaison sont refusés, sans migration ni suppression. Une action ouverte avant révocation ne peut pas être résolue ou annulée avec la nouvelle version d’accès ; la gestion de ces réservations après révocation est désormais raccordée au MJ dans le complément E ci-dessous.

Les restrictions communes de santé, convalescence, aide et déplacement sont réutilisées au départ et à la résolution. La résolution contrôle également la compétence actuelle, le reçu actif du document et un D6 serveur entier compris entre 1 et 6. Les refus transactionnels ne dépensent pas le PA réservé et ne révèlent pas le texte.

Validation locale : 70 tests ciblés déchiffrement, interface, santé et documents réussis (dont 13 tests INF-02/schéma). Compilation réussie. Résultat Firestore et SHA/CI exacts consignés dans la PR du complément. INF-02 reste **Partiel** ; aucune fusion dans main, aucun déploiement Firebase, aucune recette terrain.

## Complément — annulation MJ des déchiffrements bloqués

**E** = branche `work/skills-v07-decryption-moderation`, basée sur `b73ae574d674cd0f3132b85058186447bc8b995d` (PR #19). Référence : V0.7 chapitre 14 INF-02 et intégrité des réservations/permissions du cahier de clôture §7. La procédure d’annulation existante est mutualisée, sans moteur parallèle ni modification des barèmes.

Dans la régie de session → Fouilles et installations, un MJ habilité au contenu voit les déchiffrements en cours et peut les interrompre avec un motif obligatoire. L’annulation libère exactement le PA réservé et le personnage ; la tentative n’est pas consommée et aucun texte clair n’est révélé. Elle reste possible en pause ou après révocation/réaffectation du joueur. Un résultat déjà résolu n’est pas remboursable. Les accès organisateur sont revérifiés avant les réessais ; le journal d’audit conserve l’intervenant, l’action, le personnage et le motif. Les anciens Masters sans INF-02 n’affichent pas cette rubrique.

Tests : succès après révocation, absence de divulgation, motif, refus joueur/réception, révocation MJ avant rejeu, pause, nouvelle tentative et course annulation/résolution. Résultats des campagnes locales, SHA et CI exacts consignés dans la PR du complément. Statut INF-02 toujours **Partiel** pour les bonus, cryptogrammes et transferts documentaires. Aucune fusion dans main, publication Firebase ou recette terrain.

Suivi CI vérifié le 13 novembre 2026 : PR #17, commit `c2538a134cca411685880d4de68de776d555118b`, [exécution 43465628740](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43465628740) réussie. Ce résultat ne valide pas les commits suivants.
