# C2f — Cohérence entre plans initiaux M2 et kits de classe M1

24 octobre 2026. Développement additif dans la PR #1, après C2e. Aucun merge, déploiement, migration ni publication de campagne.

## Problème et parcours livré

Un personnage peut porter un plan initial Médecin valide alors qu’aucun kit Médecin n’est préparé. C2e contrôlait les kits présents, sans vérifier leur présence pour les classes utilisées par M2. Le contrôle commun signale désormais cette dépendance et expose les fiches concernées, puis recalcule son résultat après correction dans M1 ou M2.

Parcours : préparer une fiche avec plan initial M2 → contrôler le brouillon → lire le kit manquant sur la fiche → préparer le kit et ses modèles M1 → relancer à la nouvelle révision. Archiver ensuite le kit ou un objet signale de nouveau les fiches concernées. Une correction de modèle par import M1 est reconnue sans réimporter ni réécrire les personnages ou les kits.

Sources de l’organisateur : [CDC V3.5](source/SO_CDC_V35.md), §§3.3–3.6 et 4.7–4.9 ; [règles V0.7](source/SO_Regles_V07.txt), chapitre 3, socle et dotation par classe ; [vade-mecum V0.1](source/SO_Vademecum_V01.txt), §§3–7. Les [sept gabarits documentaires](SO-00-V34-GABARITS.md) restent distincts des contrats d’import certifiés. Aucune nouvelle règle ni composition de kit n’est ajoutée.

## Contrat de contrôle

- Réutilisation de `checkCentralDraft`, des plans C2c, des kits C2e et du même brouillon initial sans version publiée. Aucun endpoint, stockage, catalogue ou commande de jeu supplémentaire.
- Chaque définition M2 valide, active et munie d’un `creationPlan` référence `classKit_{classId}`. Seule la classe principale compte : l’initiation hors classe n’ajoute pas un kit.
- Le graphe contient une arête typée `character → classKit` sur `creationPlan.classId`. Son statut indique l’existence de la définition cible ; une cible présente peut rester incomplète, ce que précisent les diagnostics et le résumé.
- `CLASS_KIT_MISSING`, `CLASS_KIT_ARCHIVED`, `CLASS_KIT_INVALID` et `CLASS_KIT_INCOMPLETE` localisent la correction sur chaque fiche concernée. Les erreurs d’objets restent détaillées dans M1. Provenance Excel conservée : fichier, feuille Personnages, ligne, colonne `classe_id`, lot et révision.
- Un kit est incomplet si ses slots ne sont pas tous reliés, si un modèle manque, est archivé/invalide, ou si un consommable requis ne l’est pas. Réutilisation du validateur C2e ; aucune inférence par nom d’objet.
- Un objet nommé MED ne remplace jamais le kit MED. Un kit dupliqué/incohérent ne sert pas de cible valide. Campagnes voisines et inventaires de session ne résolvent aucun lien.

Le rapport ajoute `initialPreparation` à son enveloppe existante : huit classes, IDs et nombre des fiches avec plan, statut du kit, nombre des classes requises, fiches actives sans plan et archives exclues. Les nombres concernent des **définitions**, jamais des participants ni des places confirmées. Une fiche sans plan n’est ni assimilée à un PNJ ni déclarée prête à jouer ; les définitions invalides restent signalées dans les totaux/diagnostics globaux et exclues de ce résumé.

Les classes sans fiche ne déclenchent pas une obligation de kit supplémentaire. Les contrôles C2e continuent toutefois de vérifier tout kit effectivement préparé. Le tableau distingue cette absence d’usage d’un kit manquant pour une classe employée.

## Autorité, cohérence et effets

Le rapport reste réservé au propriétaire ou à la délégation C2b active avec les sept lectures. Le résumé est calculé dans la transaction de contrôle existante, à la révision demandée. Il n’apparaît pas dans une lecture d’atelier M2 isolée et ne lit aucune admission, politique, identité civile ou ressource de session.

Une course contrôle/archivage retourne le rapport cohérent de l’ancienne révision ou un refus de révision périmée. Le rapport suivant voit la nouvelle dépendance. Révocation vérifiée avant lecture ; aucun texte narratif privé ou note de kit ajouté au résumé. Empreinte interne de contrôle portée de 2 à 3 afin de distinguer la nouvelle sémantique ; enveloppe additive, aucun rapport persistant à migrer.

`REFERENCES_CHECKED` signifie seulement que le kit préparé passe les contrôles de références/consommables disponibles. Les effets, protections, homologation d’armes, codes commerciaux publics du Pilote et contacts du Courtier ne sont pas certifiés. Aucun lot, crédit, XP, PA, QR ou incarnation créé. `publicationAvailable=false`, couvertures partielles et contrôles restants conservés.

## Vérifications

14 nouveaux cas métier partagés entre mémoire et Firestore : dépendance principale/secondaire ; résolution complète ; huit classes et deux natures ; fiches sans plan et archives ; archive/restauration ; slots/cibles/consommables ; corruption et homonymes ; changement de classe/retrait ; provenance XLSX ; réparation par import M1 ; droits/révocation ; concurrence ; confidentialité/lecture seule ; isolation des campagnes.

Deux cas purs couvrent les kits dupliqués et l’exclusion des plans invalides avec stabilité d’ordre. Trois cas UI couvrent tableau, navigation, limites, échappement et compatibilité d’un ancien rapport. Un nouveau parcours HTTP/Auth couvre diagnostic, réparation, révision périmée et révocation. Les attentes de cinq anciens cas C2c/C2d et du parcours HTTP C2c sont actualisées : la référence d’espèce peut être correcte alors que le kit reste manquant.

Les résultats locaux et CI du commit exact figurent dans [SO-VALIDATION](SO-VALIDATION.md) et la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Les nouveaux tests Firestore/HTTP ne sont pas déclarés réussis avant leur exécution en CI.

## Compatibilité et suite

Contrats historiques CAMPAGNE/SESSION, quatre Masters XLSX, dépendances, workflows et règles/index Firebase inchangés. Aucun état persistant nouveau : pas de migration de données C2f ni de restauration à exécuter. Revenir à C2e conserve les données mais supprime ces contrôles : relancer la vérification avec un binaire connaissant C2f avant toute suite. Les exportations ciblées ne deviennent pas des sauvegardes globales.

REC-SO-01/24, MST-03/06/08 et INS-06 reçoivent des preuves préparatoires partielles ; aucun des 55 parcours complets n’est déclaré validé. SO-GAP-12/13/14 restent ouverts. Pas de recette humaine Android/iOS, charge pilote ou restauration complète réalisée.

Suite : raccordement des effets/profils canoniques et des autres domaines nécessaires au contrôle complet, version centrale immuable/activation atomique, puis I3 admission vers M2, I4 naissance protégée et I5 succession. Les dépendances de publication ne sont pas contournées pour activer un personnage.
