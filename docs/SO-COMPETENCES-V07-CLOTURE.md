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

- Documents liés aux objets : décision du propriétaire du 13 novembre 2026, « Selon la fiche ». SHOW / Montrer seulement : accès lié à la possession de l’original ; COPY / Copie permise : texte déjà acquis conservé sans duplication de l’objet. Les révélations indépendantes du MJ restent distinctes.

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
| COM-01 Vétéran | Combattant | ch. 7, 3, 6 | naissance, santé, succession | Personnage | À vérifier | entry/health/succession existants | B | Non vérifié | À faire | 4 PV naissance/santé/relève vérifiés localement (L) ; CI du candidat et recette terrain restantes |
| COM-02 Désarmement | Combattant | ch. 7, 5 | règles joueur | Physique | À vérifier | présentation à contrôler | B | Non vérifié | À faire | Consignes ch. 5 complétées et testées (L) ; CI du candidat et recette terrain restantes |
| COM-03 Lecture tactique | Combattant | ch. 7, 4 | field-actions ANALYZE | Action | À vérifier | space-outlaws-actions | B/C | Non vérifié | À faire | Cinq niveaux et refus de baisse de niveau testés sur Firestore (L) ; CI du candidat et recette terrain restantes |
| ROG-01 Neutralisation furtive | Rogue | ch. 8, 5 | santé et procédure physique | Physique/Action | Partiel | santé existante | B | Non vérifié | À faire | Suivi spécifique des tentatives/récupération à raccorder |
| ROG-02 Vol à la tire | Rogue | ch. 8, A12 | space-pickpocket | Action | À vérifier | space-pickpocket | B | Non vérifié | À faire | Recette identité, quotas et notification différée |
| ROG-03 Évasion | Rogue | ch. 8, 6 | space-escape | Action | À vérifier | space-escape | B | Non vérifié | À faire | Recette surveillance et verrous concurrents |
| TRA-01 Lecture des traces | Traqueur | ch. 9, 4 | field-actions ANALYZE | Action | À vérifier | space-outlaws-actions | B/C | Non vérifié | À faire | Recette garantie/supplément et version |
| TRA-02 Fouille méthodique | Traqueur | ch. 9, 6 | person-actions LOOT_METHODICAL | Action | Partiel | space-loot-concealment + person-actions | B + K | Non | À faire | Parcours et opposition raccordés ; CI exacte et recette intégrée restantes |
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
| INF-02 Déchiffrement | Infiltrateur | ch. 14 | space-decryption/knowledge | Action | Partiel | space-decryption : cas métier de transfert, copies, droits et intégration ciblée | B + D + E + F + G + H + I | Non vérifié | À faire | Originaux M1/M6 et transferts raccordés ; validation CI du candidat et recette intégrée restantes |
| INF-03 Falsification | Infiltrateur | ch. 14 | space-forgery/evidence | Action | Partiel | space-forgery | B | Non vérifié | À faire | Raccord TRA-03 et inspection du document transféré |
| Entretien de protection | Supplémentaire | ch. 15, 5 | person-actions PROTECTION | Action | À vérifier | identity-news-health | B/C | Non vérifié | À faire | Banc de protection et recette des consommables compatibles |
| Riposte | Supplémentaire | ch. 15, 5 | règles joueur | Physique | À vérifier | présentation à contrôler | B | Non vérifié | À faire | Règles canoniques et fiche sans commande testées (L) ; CI du candidat et recette terrain restantes |
| Garde du corps | Supplémentaire | ch. 15, 5 | règles joueur, déclaration santé | Physique | À vérifier | présentation à contrôler | B | Non vérifié | À faire | Désignation, 2 m, transfert immédiat et exclusions documentés/testés (L) ; CI et recette terrain restantes |
| Sabotage | Supplémentaire | ch. 15 | field-actions SABOTAGE/REPAIR | Action | Partiel | space-installation, field-actions | S | Non | À faire | Installations N1–N2 raccordées ; modules de droïdes N3, vaisseaux N4 et profils exceptionnels N5 à compléter |
| Dissimulation | Supplémentaire | ch. 15 | person-actions / inventaire natif | Action/sac | Partiel | space-loot-concealment | K | Non | À faire | Cache, expiration et oppositions raccordées ; CI exacte et recette intégrée restantes |
| FIL-01 Pistage | Supplémentaire | ch. 15 | traces fictives à raccorder | Action | À développer | Pas de parcours spécifique identifié | B | Non vérifié | À faire | Registre commun fictif, niveaux et suivi spatial |
| TOXI-01 Toxicologie | Supplémentaire | ch. 15 | recettes/inventaire à raccorder | Action | À développer | Catalogue préparatoire, pas de cycle complet identifié | B/C | Non | À faire | Fabrication, activation volontaire, antidote, expiration et MED-01 |
| ESC-01 Escorte spatiale | Supplémentaire | ch. 15, 20, 25 | escort/maneuvers/combat | Cockpit/Terminal | À vérifier | space-escort-maneuvers | B | Non vérifié | À faire | Recette intégrée avec PIL-03 et mandats |
| EFF-01 Effacement de traces | Supplémentaire | ch. 15 | traces fictives à raccorder | Action | À développer | Pas de parcours spécifique identifié | B | Non vérifié | À faire | Masquage/opposition FIL sans aucune suppression d'audit |
| LAS-01 Maîtrise du sabre | Supplémentaire | ch. 15, 5 | apprentissage, santé, règles | Personnage/physique | À vérifier | health/learning | B | Non vérifié | À faire | Règles, apprentissage et dégâts contrôlés (L) ; CI du candidat et recette avec matériel réel restantes |

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

## Complément — aide compétente INF-02

**F** = branche `work/skills-v07-decryption-aid`, basée sur `ea7a5287a118c39612d1777c189656a1a2df2425` (PR #20). Sources : V0.7 chapitre 4 « Tests ordinaires au D6 » et chapitre 14 INF-02. Réemploi exclusif de `aid-state`, des offres d’aide et des délais de compétence natifs.

Une offre INF-02 peut être proposée depuis le parcours d’aide existant, puis sélectionnée avant le lancement du déchiffrement. Une seule aide compatible apporte +1. L’aidant doit satisfaire le niveau requis du document, être disponible, présent et hors récupération ; son personnage est réservé pendant l’action, sans réservation ou consommation de PA. Le résultat reste privé au détenteur du document, sans reçu ni texte clair accordé à l’aidant.

À la résolution, les accès, l’état et la compétence de l’aidant sont revérifiés. Les deux participants récupèrent dix minutes de jeu, que le jet réussisse ou échoue. Le délai de l’aide est aussi lu lors d’un déchiffrement personnel ; le délai personnel historique est contrôlé avant d’accepter une aide. Une annulation par l’initiateur, l’aidant ou le MJ libère les deux personnages et le PA réservé sans appliquer de récupération. Le retrait de l’aidant passe par « Interrompre l’action aidée », sans deuxième moteur d’action.

Les parcours sans aide et les actions déjà enregistrées sans champ d’aide restent compatibles. Aucune modification de Master publié ni migration de données. Tests ciblés : succès avec +1, PA, immobilisation, délai partagé, refus de compétence, révocation de l’aidant, retrait et annulation MJ. Résultats locaux et Firestore, SHA et CI exacts consignés dans la PR. INF-02 reste **Partiel** : matériel bonus, cryptogrammes préparés et intégration des documents transférés restent à compléter. Ni fusion, ni déploiement, ni recette terrain.

## Complément — décrypteur portable INF-02

**G** = branche `work/skills-v07-decryption-equipment`, basée sur `4481273a3f8cac96cdaa6ef8ff16015624e7abd2` (PR #21). Sources : V0.7 chapitre 4 (un bonus matériel choisi avant le jet), chapitre 14 INF-02 et tableau « Équipements améliorés conservés de la V0.3 » (décrypteur portable +1 compatible).

M6 permet de déclarer les identifiants M1 des décrypteurs compatibles avec chaque document. La liste facultative `cipher.bonusItemIds` est bornée, sans doublons, contrôlée par les références du Master et à la publication : équipement existant non consommable, hors module de vaisseau. Sans déclaration, aucun bonus n’est acquis par le simple nom d’un objet ou par la dotation initiale. Les anciens documents sans cette propriété conservent leur forme et leur fonctionnement.

Le détenteur sélectionne un lot personnel disponible avant le lancement. Un seul lot apporte +1, cumulable avec l’unique aide +1. Le statut natif `FIELD_RESERVED` empêche une utilisation concurrente. La résolution revérifie propriétaire, quantité, lot, révision et compatibilité ; le bonus ne change ni la durée ni le coût. Succès, échec et annulations joueur/aidant/MJ libèrent l’équipement sans le consommer, avec historique natif de lot. Un matériel modifié de façon incohérente pendant la réservation bloque la résolution et demande une régularisation MJ ; aucune restitution forcée n’écrase un changement concurrent.

Vérifications ciblées : bonus et aide cumulés, non-consommation, annulation idempotente, refus des matériels incompatibles/étrangers/consommables, changement de révision, contrôles du schéma et de publication, formulaires M6/joueur. Résultats locaux, Firestore, SHA et CI exacts consignés dans la PR. INF-02 demeure **Partiel** pour les cryptogrammes alternatifs et le raccordement des transferts documentaires. Aucune fusion, publication Firebase, migration ou recette terrain.

## Complément — cryptogrammes INF-02 à réponse préparée

**H** = branche `work/skills-v07-decryption-cryptograms`, basée sur `87b6401a5c1e3621ac263e22ae6caa60b86f5293` (PR #22). Références : V0.7 chapitre 14 INF-02, « Une mission particulière peut proposer un cryptogramme au lieu du test », et durée annoncée des mini-jeux. Le validateur de défi à code déjà utilisé par INF-01 est extrait et partagé ; aucune seconde mécanique de mini-jeu n’est créée.

M6 prépare la consigne, la durée et une réponse textuelle. La réponse est normalisée et hachée selon le contrat existant INF-01 (4–64 lettres/chiffres/espaces/tirets ; durée préparée 1–3600 s). L’édition peut conserver la solution en laissant le champ vide. Ni réponse brute ni empreinte n’entrent dans la projection joueur. La consigne est accessible après lancement aux seuls détenteurs autorisés du document et disparaît si reçu, accès, niveau ou version ne correspondent plus.

Un PA est réservé au départ. Le parcours CODE utilise exclusivement la durée préparée, en temps de jeu ; aucune génération de D6, même en cas de reprise réseau. Réponse correcte : révélation native du texte préparé. Réponse incorrecte : échec sans destruction du document. La règle INF-02 d’une tentative résolue par personnage/version et la récupération de dix minutes restent appliquées ; la relance propre à INF-01 n’est pas importée. Les bonus au dé (matériel/aide) sont refusés dans ce mode. Annulation et régie conservent leurs procédures natives.

Vérifications : absence de jet mesurée, confidentialité de la solution, normalisation de réponse, succès/échec, reçu idempotent, pause, annulation, refus des bonus, version et reçu révoqués, préparation M6 et non-régression INF-01. Résultats locaux, Firestore, SHA et CI exacts dans la PR. INF-02 reste **Partiel** pour les transferts documentaires ; les défis sans réponse textuelle ne sont pas couverts par ce format. Ni fusion, ni publication Firebase, ni migration ou recette terrain.

## Complément — originaux documentaires et droit de lecture

**I** = branche `work/skills-v07-inventory-documents`, basée sur `d5ffc09be903f5aa7686cf9f3980944e3006c611` (PR #23). Références : V0.7 chapitre 14 INF-02 et décision explicite du propriétaire « Selon la fiche », 13 novembre 2026.

Un modèle M1 individuel non consommable peut référencer un DOCUMENT M6 par `knowledgeId`. La préparation centrale vérifie la référence ; la publication refuse une cible absente, archivée ou d’un autre type. Le texte secret reste dans M6, jamais dans l’objet ni sa projection publique. Les modèles existants conservent leur forme lorsqu’aucune association n’est ajoutée. L’éditeur M1 propose ce champ ; les anciens exports Excel M1 ne le transportent pas encore.

Le sac ouvre un reçu natif du carnet. L’écran INF-02 propose aussi les originaux non encore lus, avec retour au déchiffrement sans repasser par le menu Action. Aucun nouvel inventaire ni moteur de transfert n’est créé. Le don existant conserve l’identifiant du lot, sa provenance et son historique. Un document SHOW est relu uniquement tant que son original reste dans le sac autorisé ; les contrôles du carnet et de résolution INF-02 appliquent la même règle. La perte de possession pendant une tentative bloque le résultat ; l’annulation MJ libère le PA réservé. Un document COPY conserve le texte déjà acquis, sans créer un lot supplémentaire. Un reçu explicitement révoqué par le MJ ne peut être rétabli par une nouvelle lecture du sac.

Ouvrir plusieurs fois le même original ne change pas le reçu et n’invalide pas une tentative en cours. Les requêtes de lecture sont liées au personnage et à sa version d’accès. La restitution de l’original ne remet pas à zéro une tentative résolue. Les droits du carnet acquis indépendamment par attribution MJ, QR autorisé ou copie permise restent indépendants de la possession d’un objet.

Validation locale : 3 038 tests complets réussis avant le dernier raccordement de sélection directe ; après celui-ci, 65 tests ciblés réussis, 32 cas métier partagés Firestore réussis sur le candidat final, compilation et diff sans erreurs. Ces campagnes se recouvrent et leurs décomptes ne s’additionnent pas. SHA et CI exacte consignés dans la PR ; CI non présumée réussie. Aucun déploiement, fusion dans main, migration ni suppression de données. Le statut reste Partiel tant que les contrôles d’intégration et la clôture complète ne sont pas démontrés.

## Correction — révision mécanique accélérée au niveau 5

**J** = branche `work/skills-v07-workshop-auto`, base `da38760748b786a7529e61babc620b630de21a3c` (PR #24). V0.7 chapitre 6, « Clinique mécanique N2–N5 » : succès automatique par défaut à N5.

Écart établi : le protocole accélérait correctement la révision mais produisait encore un D6 à N5. Le profil effectif du Mécano N5 devient AUTO, sans matériel bonus ni aide au dé ; durée de 135 secondes, PA et fournitures restent inchangés. L’interface annonce l’automatisme. Les niveaux N2–N4 gardent le D6 et leur continuation après échec. Le moteur ne génère désormais un dé qu’au moment où un protocole D6 en a réellement besoin, jamais pour un soin automatique, une résolution trop précoce ou un réessai déjà résolu.

Le niveau utilisé au lancement est revérifié avant le résultat : une baisse de compétence ne conserve pas un ancien bonus ni l’automatisme N5. L’annulation libère les réservations. Les soins biologiques et les autres protocoles conservent leurs règles.

Validation : 57 tests ciblés réussis (clinique, atelier, santé et interactions), 14 cas partagés Firestore réussis, compilation et diff sans erreurs. CI du commit exact à vérifier dans la PR. Aucun déploiement, fusion, migration ou recette terrain. MEC-02 reste Partiel pour ses autres profils techniques.

## Complément — fouilles de personnages et Dissimulation

**K** = branche `work/skills-v07-loot-concealment`, base `e7a2af8db6c876665bc3e78d12785c6f85921056` (PR #25). Sources : V0.7 chapitres 4 (délai FOUILLE), 6 (prise et rencontres), 9 (TRA-02), 15 (Dissimulation). Le moteur natif `person-actions`, les réservations de PA/objets et les transferts unitaires sont réutilisés.

- Fouille ordinaire : 60 s, 1 PA, choix de l’unité par la victime. TRA-02 : 120/105/90/75/60 s, 1 PA, choix par le Traqueur. Aucun D6. Les deux parcours partagent le délai FOUILLE de 600 s avec les fouilles de lieux. Une prise par victime/rencontre, tous adversaires confondus. Les kits protégés, crédits et objets non pillables sont exclus.
- La cible doit être hors combat ou dans une captivité native encore valide. Pour une cible qui n’est plus hors combat, libération ou expiration interdit la résolution et le choix ; la liste privée n’est plus projetée après libération. Une fouille ne stabilise jamais la victime à zéro PV et ne suspend pas son délai vital. Les annulations natives et la régie restent disponibles.
- V0.7 précise que trente minutes sont un repère contre les boucles, pas une permission de recommencer la même affaire. Le quota SO n’est donc pas réinitialisé par une horloge, une nouvelle connexion ou une nouvelle capture. La régie valide explicitement une **nouvelle rencontre**, avec motif, numéro courant et journal. Aucun changement de délai de captivité.
- M1 identifie les objets admissibles par le champ facultatif `concealable`. Aucun objet réel ni crédit n’entre dans ce champ. Dissimulation choisit une unité du sac, à couvert, avec 120/105/90/75/60 s, 1 PA, sans dé et récupération personnelle de 600 s. Une pile est scindée transactionnellement sans augmenter sa quantité totale ; un original individuel conserve son identifiant.
- Une seule cache active, valable 1 800 secondes de jeu ; les pauses suspendent ce délai. La cache est liée au personnage, à l’unité et à sa révision : un transfert, une consommation ou une utilisation qui modifie le lot ne la réactive pas au retour. La reprise d’épisode retire cet état temporaire sans supprimer l’historique.
- Fouille commune et ROG-02, même N5, ne présentent pas l’unité cachée. TRA-02 de niveau égal ou supérieur la découvre sans dé ; la cache cesse immédiatement, sans accorder une seconde prise. Un niveau inférieur ne révèle rien. Le sac du propriétaire affiche la cache ; aucune liste d’objets cachés n’est projetée au Rogue.
- Les cartes Action conduisent au parcours natif. Dissimulation sélectionne son propre sac, sans demander de QR de personnage. M1 propose l’admissibilité ; la régie des interactions propose la nouvelle rencontre motivée. Les nouvelles publications portent `personLootVersion` et `concealmentVersion` ; aucune ancienne session n’est migrée.

Validation locale : campagne complète de 3 051 tests réussie avant le dernier contrôle de confidentialité après libération ; 53 tests ciblés réussis après ce contrôle, compilation et diff sans erreurs. Onze cas partagés Firestore réussis sur le candidat final ; un cas de reprise d’épisode réussi localement et sur Firestore vérifie l’expiration de la cache sans altérer la session source. CI exacte à consigner dans la PR. Ces campagnes se recouvrent. Pas de fusion main, de déploiement Firebase, de données réelles modifiées ou de recette terrain. L’export Excel M1 historique ne transporte pas encore `concealable` ; préparer ce champ dans l’éditeur M1.


## L — Niveaux des analyses et procédures physiques (13 novembre 2026)

Branche `work/skills-v07-analysis-guards`, base K / PR #26, `6fcab6a4adbdd9d6214ebdae08d7fe9f15d86dfc`. Références : V0.7 ch. 4, 5, 7, 9 et 15. Le commit et la CI du candidat sont à relever dans sa PR ; aucune fusion, publication Firebase ni recette humaine effectuée.

Un défaut reproduit sur COM-03, TRA-01 et TRA-03 permettait de recevoir les informations préparées au niveau 3 après une baisse au niveau 1 pendant l’action. La résolution native revérifie désormais le niveau engagé pour toute compétence de terrain Space Outlaws. Le refus ne distribue aucune information, ne consomme aucun dé et conserve les réservations jusqu’à l’annulation native. Les tirages D6/D12 ne sont effectués qu’à une résolution admissible qui les exige, et sont conservés lors des reprises transactionnelles. COM-03 ne tire donc plus de dé inutilisé ; une résolution déjà enregistrée ou trop précoce n’en tire pas non plus.

La fiche expose désormais les extraits canoniques des 34 compétences, dont les dix supplémentaires. COM-02 reprend les contacts sûrs, l’interruption de séquence et le retrait de dix secondes ; Riposte et Garde du corps reprennent leurs limites par confrontation. LAS-01 distingue apprentissage et arme, sans attribuer de pouvoirs. Les techniques physiques restent des consignes de scène, sans commande de combat ; les pertes de santé sont déclarées ensuite à l’abri. La présence de ces textes ne vaut pas implémentation des capacités numériques supplémentaires encore absentes.

Preuves locales sur ce lot :

- 39 tests ciblés actions/terrain/fouilles/expertise marchande réussis ; cinq niveaux COM-03 et TRA-01, informations garanties et bonus, durées, coût, récupération et tentative par version.
- 45 tests de non-régression négociation/contacts/installations/diagnostic technique/navigation réussis.
- 18 cas de la suite `space-outlaws-actions` réussis sur Firestore, incluant les baisses de niveau, concurrence, réessais, interruption et confidentialité.
- 29 tests santé et interface réussis ; règles présentes pour les 34 entrées du catalogue, aucune commande dans les fiches de techniques physiques.
- 21 tests de succession réussis, avec vérification explicite des 4 PV et du maximum de 4 à la relève d’un Combattant.
- Deux cas Firestore supplémentaires réussis : neutralisation déclarée après la scène (Vétéran à 0 PV, protection inchangée, survie réelle, immunité du droïde) et naissance du successeur Combattant. La suite santé complète antérieure à ce nouveau cas a aussi passé ses 20 cas Firestore.
- Compilation réussie et `git diff --check` sans erreur. Ces contrôles ciblés ne sont pas une recette complète Android/iOS.

CI précédente vérifiée : PR #24, commit `da38760748b786a7529e61babc620b630de21a3c`, [exécution 43478788053](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43478788053), réussie. PR #25, commit `e7a2af8db6c876665bc3e78d12785c6f85921056`, [exécution 43479691734](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43479691734), également réussie. Cela ne valide pas automatiquement L ni la PR #26 encore en cours au relevé.

Restent distincts : raccord des faux documents à TRA-03, suivi des tentatives ROG-01, capacités numériques supplémentaires et recette terrain. Aucune fermeture artificielle de ces lignes.
