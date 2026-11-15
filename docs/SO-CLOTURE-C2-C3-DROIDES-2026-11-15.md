# C2.2 / C3 — Modules droïdes, 15 novembre 2026

Références : [CDC de clôture V1, sections 3 et 4](source/SO_CDC_Competences_Cloture_V1.md), [règles V0.7, chapitres 5, 11, 14 et continuité](source/SO_Regles_V07.txt). Base : `adb39f076b69b72d5c2a04ec6d244fe60677aa80`, recharge C2.1 validée par la CI [43718290182](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43718290182). Branche et candidat courant : [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45). La CI d’un parent n’atteste jamais le nouveau candidat.

## Parcours livré

M1 propose les six références DR dans les objets individuels non consommables. La colonne Excel facultative `module_droide` assure leur aller-retour. Aucun stock ni dotation ne découle du modèle : le comptoir doit disposer d’une offre au prix canonique et d’un exemplaire préparé. Les modules sont refusés dans les kits gratuits. La capacité `droidModulesVersion=1` est limitée aux nouvelles publications ; aucun manifeste historique n’est réécrit.

La régie prépare les protocoles de pose/retrait/réparation et désigne l’atelier équipé publié. Pour une réparation, elle choisit un modèle de pièces dont la valeur unitaire permet de fournir exactement le montant requis. Le propriétaire autorise un technicien, un module et un protocole précis. L’autorisation lie les versions d’accès actuelles, peut être retirée et est revérifiée à la résolution. La réservation native immobilise le module et les fournitures, avec 1 PA. Une interruption restitue ces réservations, sans résultat partiel. Deux emplacements au maximum ; aucun troisième.

| Module | Prix neuf | MEC-03 | Pose / retrait | Réparation installée |
| --- | ---: | ---: | --- | --- |
| DR-01 Blindage | 300 Cr | N1 | 5 / 5 min | 5 min, 75 Cr de pièces |
| DR-02 Outillage | 200 Cr | N1 | 5 / 5 min | 5 min, 50 Cr de pièces |
| DR-03 Scanner | 350 Cr | N2 | 10 / 5 min | 10 min, 100 Cr de pièces |
| DR-04 Interface | 350 Cr | N2 | 10 / 5 min | 10 min, 100 Cr de pièces |
| DR-05 Mémoire | 300 Cr | N2 | 10 / 5 min | 10 min, 75 Cr de pièces |
| DR-06 Compartiment | 400 Cr | N2 | 10 / 5 min | 10 min, 100 Cr de pièces |

La réparation exige aussi MEC-02 N2. Pièces = `ceil(prix / 100) × 25 Cr`, soit 25 % du neuf arrondis au multiple de 25 supérieur. Ces pièces sont consommées une seule fois ; aucun débit monétaire supplémentaire n’est simulé. Les tarifs PNJ du catalogue sont des références, pas un paiement déjà raccordé.

## Effets et limites

- DR-01 : réserve personnelle plafonnée à 1. Un exemplaire neuf provisionné possède sa charge initiale ; le retrait conserve la charge restante et le remontage ne la régénère pas. Une panne ou une neutralisation empêche l’absorption sans consommer silencieusement une réserve non utilisée. La réparation ne recharge pas une protection épuisée. Recharge et PV restent distincts.
- DR-02 : objet d’outillage réutilisable suivi ; aucune compétence, fourniture ou clinique n’est créée par sa pose.
- DR-03 / DR-04 : +1 choisi avant le jet, uniquement installé et opérationnel, sur les profils explicitement compatibles. DR-03 vise MEC-01/TRA-01 ; DR-04 les terminaux INF-01. Un module retiré ne devient pas un bonus ordinaire dans le sac. Le supplément MEC-01 reste dépendant de C1 ; ses analyses actuellement automatiques ne reçoivent aucun jet ajouté ici.
- DR-05 : un document M6 associé à un objet réel, visible au propriétaire. INF-02 N2+ permet une ouverture non autorisée en fiction, avec présence déclarée, 1 PA, durée native et seuil ordinaire 6 (règles V0.7, chapitre 6). Le contenu obtenu est une lecture privée datée ; ni copie d’objet ni déchiffrement automatique d’un second chiffrement intérieur. Module, document, accès propriétaire et version sont revérifiés. Le module reste verrouillé pendant l’ouverture ; annulation MJ possible après révocation.
- DR-06 : une seule unité compatible, scindée explicitement si nécessaire, cachée au vol ROG-02. TRA-02 la révèle avant le choix natif de pillage, qui conserve ses conditions, remise par la victime et quota commun. Aucun contrôle de proximité n’a été ajouté au vol au local orga.

Les contenants doivent être vidés avant retrait. Le propriétaire reprend le même identifiant d’objet ; ni le contenu ni l’historique ne sont copiés. Un module installé n’est pas vendable/pillable comme un objet du sac. La régie peut signaler une panne durable avec motif, droits et révision courante ; elle ne dispose pas ici d’un bouton de réparation gratuite. Les états, les objets et les tentatives de mémoire sont repris dans l’épisode suivant ; un ancien accord d’atelier expire.

## Vérifications

- 15 tests métier distincts des deux nouvelles suites passent en mémoire et sur Firestore émulé. Ils comprennent des boucles sur les six références et sur leurs coûts ; ce ne sont pas 15 fonctionnalités supplémentaires.
- Après renforcement des bonus et de la preuve de possession : deux cas Firestore ciblés scanner/mémoire repassés, puis un parcours HTTP + Auth réussi (401/403, stockage, confidentialité, verrou de mémoire, consentement, révocation et annulation).
- 201 tests applicatifs ciblés réussis sur le code final (modules, import, kits, santé, déchiffrement, intrusion, actions, inventaire, épisodes, fouilles et HTML). Les groupes intermédiaires de 182 et 34 tests se recouvrent et ne s’ajoutent pas à ce total.
- Compilation et contrôle du diff exécutés avant livraison. Le test Chromium local n’a pas démarré : le runtime refuse le socket du navigateur. Aucune recette navigateur, caméra, téléphone ou terrain n’est revendiquée.

## Travail restant

Cette tranche ne clôt pas MEC-03 ni l’ensemble de C2. La réparation livrée concerne les modules installés sur un droïde ; le service PNJ et la réparation d’un module déposé restent à compléter. Les rares et prototypes de vaisseaux, leurs effets et les prestations PNJ relèvent des tranches suivantes. La neutralisation est reconnue par les effets, mais sa production par Sabotage N3 reste au lot C4. C1, C2.3/C2.4, C4, C5 et C6 restent ouverts. Les fiches de recette humaine et la publication restent séparées des preuves logicielles. Aucun déploiement Firebase, changement d’IAM ni migration de données réelles.


## Complément ultérieur du même jour

La réparation d’un module déposé dans l’inventaire de son propriétaire droïde est désormais raccordée : voir [rapport dédié et preuves](SO-CLOTURE-C2-DROIDES-DEPOSES-2026-11-15.md). Les limites ci-dessus décrivent le périmètre de la livraison initiale ; les prestations PNJ restent ouvertes. C1, C2.3/C2.4 et C4 ont leurs rapports distincts dans la PR #45.
