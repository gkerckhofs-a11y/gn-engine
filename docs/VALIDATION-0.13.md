# Version 0.13 — ventes privées et retrait physique

19 octobre 2026. Extension partielle de INV-02 à INV-05, ECO-02/03 et MAR-03/05 du cahier V1. Aucun lot complet déclaré terminé. Les montants sont des crédits de jeu fictifs, renseignés par le vendeur ; aucun prix canonique n’est inventé.

## Parcours livré

1. Dans **Mon sac**, le vendeur ouvre un lot disponible dont il est propriétaire et détenteur, puis **Proposer une vente**.
2. Il choisit le badge public d’un acheteur actif de la session, la quantité entière, le **prix total de cette quantité**, la durée de validité (1 à 10 080 minutes réelles), le lieu convenu et les conditions de remise. Il vérifie les identités et le récapitulatif avant l’envoi.
3. L’acheteur ouvre **Mes achats et ventes**, choisit son portefeuille ou une caisse autorisée pour la dépense, vérifie prix, frais nuls, compte, bénéficiaire et retrait, puis confirme l’achat.
4. Une transaction unique débite le compte choisi, crédite le portefeuille personnel du vendeur, transfère la propriété du lot et écrit les journaux. **Le détenteur et l’emplacement restent inchangés.**
5. Le vendeur voit **Objets détenus pour autrui** ; l’acheteur voit **Mes objets à récupérer**. Aucun des deux ne peut donner, revendre ou consommer ce lot avant son retrait dans ce parcours.
6. Le vendeur ouvre la vente et propose la remise de l’objet déjà payé. L’acheteur confirme la réception physique prévue par les règles. Le détenteur et l’emplacement passent à son sac, sans écriture financière supplémentaire.

Le lieu saisi est un rendez-vous narratif : il ne crée pas un entrepôt ni un droit d’entrée. Le stock reste techniquement dans le sac du vendeur jusqu’au retrait. La déclaration de réception ne constitue pas une preuve technique de présence.

La vente porte sur un seul lot, entier ou partiel. Une vente entière conserve son identifiant. Une vente partielle crée un lot distinct et conserve le modèle copié, la quantité totale, le parent et la racine de provenance. Il n’y a pas de fusion. Un exemplaire individuel n’est pas divisible.

## Proposition et consentement

Ce parcours est une **proposition privée non engageante avant acceptation**, pas une annonce de marché publiée. Les interfaces indiquent qu’aucun stock ni fonds n’est réservé : plusieurs conversations peuvent concerner le même lot, mais une modification de sa révision invalide les autres propositions. L’acceptation relit les droits, le stock et les comptes. Deux acheteurs ne peuvent acquérir le même dernier objet.

Prix, quantité, conditions et lieu sont fixés dans la proposition. Le serveur ignore une tentative d’altérer ces valeurs lors de l’achat. Une modification exige l’annulation et une nouvelle proposition ; il n’existe pas encore de contre-offre. L’échéance en temps réel continue pendant une pause. L’expiration refuse l’achat et n’a rien à libérer puisqu’aucune réserve n’a été créée. Une vente déjà payée n’expire pas et reste à retirer.

La préparation d’un achat ne débite rien. Sa confirmation lie le prix proposé, les identités, la révision du compte payeur, les permissions et les règles de santé. Un compte modifié exige une nouvelle préparation. Un encaissement sur le portefeuille vendeur ne modifie pas le prix confirmé.

## Comptes, droits et confidentialité

Le paiement réutilise exactement le contrôle d’accès aux comptes de la 0.12. Le compte personnel du joueur et les caisses pour lesquelles il possède le droit de dépense sont proposés. Un compte en lecture seule, celui d’un autre personnage ou d’une autre session ne peut financer l’achat. Les fonds réservés ne sont pas disponibles et le dépassement des entiers sûrs est refusé.

Avec une caisse sans droit de consultation, le récapitulatif ne transmet aucun solde avant/après. Le résultat d’achat ne transmet aucun solde. Le vendeur et le journal voient le libellé du compte payeur, sans nom interne du groupe, membres ou UID du caissier. Le personnage acheteur reste identifié dans la vente : **même financé par une caisse, le lot appartient à ce personnage**, ce que les formulaires annoncent avant confirmation. Les inventaires collectifs restent à développer.

Les propositions et reçus sont accessibles aux deux personnages concernés. Les tiers, badges publics et agents Accueil n’y accèdent pas. Le MJ dispose de l’aperçu du sac sans boutons d’action, des historiques de lot, des comptes et de l’audit ; aucun écran de gestion complète du marché n’est ajouté. Les notes MJ et la filiation technique des lots restent absentes des projections joueur.

L’accès courant au personnage est contrôlé avant tout résultat mémorisé. Pour un achat, le droit de dépense et sa version sont aussi contrôlés avant le réessai. Une révocation, réattribution ou nouvelle activation ne ressuscite pas un ancien consentement. Les récapitulatifs deviennent périmés après une modification pertinente du compte, du lot ou de l’accès.

Les nouveaux achats exigent **En jeu**, l’économie active, la permission de remise du vendeur et la permission de paiement de l’acheteur selon les règles hors combat. La remise physique exige la permission de remise des deux parties et En jeu ; elle reste possible si l’économie a été désactivée après le paiement. Consultation, refus et annulation restent possibles en pause ou fin de partie ; une archive ferme les accès joueurs.

Une proposition de retrait enregistre les identités courantes et la révision du lot. Une correction, saisie, révocation ou réattribution oblige le vendeur à proposer une nouvelle remise. Une quantité corrigée ne correspondant plus à la vente bloque ce retrait et demande l’intervention du MJ. La correction ne rembourse pas automatiquement la vente.

## Cohérence et journaux

Paiement, crédit vendeur, changement de propriétaire, éventuel fractionnement, historique de lot, écritures des deux comptes, journal commun, audit et résultat idempotent sont validés ensemble dans Firestore. Tous les documents sont lus avant les écritures. La réception physique est une seconde transaction portant sur le stock, la vente, l’audit et le résultat, sans toucher aux comptes.

Le reçu financier comporte les références du paiement, de la vente et du lot. La vente conserve le prix et le libellé payeur confirmés. Les historiques précédents ne sont pas réécrits. Répéter le même achat ou retrait renvoie son résultat initial sans nouveau débit ou mouvement, y compris après une transmission ultérieure du lot, sous réserve des droits courants. Réutiliser un identifiant de commande avec un autre contenu est refusé.

Une réponse réseau incertaine doit être vérifiée dans la vente et les journaux avant une nouvelle proposition. La page active conserve l’identifiant de réessai, mais pas après fermeture/rechargement ; il n’y a pas de file hors ligne. Une vente ne peut cependant être achetée deux fois, même avec deux identifiants différents.

## Vérifications

- `npm test` : **244 tests réussis**, aucun échec, annulation ou test ignoré. Ajout de 20 parcours métier et 4 tests de rendu d’interface.
- `npm run build` : compilation réussie et manifeste **0.13.0** généré.
- Les 20 parcours partagés couvrent proposition privée, prix fixé, lot entier/partiel, séparation propriété/détention, retrait sans second paiement, interdiction d’usage avant retrait, deux acheteurs, double dépense, concurrence avec soin/annulation, échéance, comptes collectifs, confidentialité, révisions, réservations, dépassements, révocation, réattribution, panne avant commit, modules, hors combat, aperçu et accès anonymes.
- Un parcours du gestionnaire HTTP réel utilise Auth et Firestore émulés : 20 caisses fictives, achat de 8 pour 40, solde 100 → 60, réception vendeur 40, stock conservé chez le vendeur jusqu’au retrait, réessais uniques et révocation prioritaire.
- `npm run test:emulator` : **203 tests réussis**, aucun échec, annulation ou test ignoré, en environ 232 secondes avec Java 21. Total local : **244 + 203 = 447**.
- Publication GitHub/Firebase en cours. Données synthétiques dans `demo-gn-engine` exclusivement ; aucune donnée de test créée en production.

## Limites et recette restante

- Pas de place de marché publique, recherche d’annonces, accès au marché noir, alias vendeur, vendeur extérieur, stocks engagés par annonce active, achat partiel d’une annonce ou panier. MAR-01/02 restent ouverts.
- Pas de négociation, contre-offre, séquestre, contrat de livraison, frais/taxes configurables, réservations commerciales, remboursement automatique ni gestion formelle de litige. MAR-04 et le reste de MAR-05 restent ouverts.
- Les petites annonces de missions, candidatures et recrutement ANN-01 à ANN-06 restent à réaliser dans le périmètre prévu.
- Vente limitée aux objets présents dans le sac du vendeur ; pas de vente par mandataire, de propriété collective, de revente avant retrait, de transporteur, d’entrepôt, de capacité ou de QR physique.
- Listes non paginées : propositions brutes en attente (y compris expirées ou périmées), retraits non terminés et 30 dernières ventes fermées/retirées. Actualisation manuelle, sans notifications automatiques.
- Recette avec comptes Google réels distincts, téléphones et réseau terrain à effectuer. Les tests de rendu et émulateurs ne la remplacent pas. Charge 60/120 joueurs et reprise après incident restent à mesurer.

## Publication

En attente des résultats du workflow et de la vérification en ligne.
