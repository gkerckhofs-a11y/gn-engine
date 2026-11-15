# C2.3 — Réparer les modules standards des vaisseaux

15 novembre 2026. Sources : [CDC de clôture V1, section 3](source/SO_CDC_Competences_Cloture_V1.md), [règles V0.7, chapitre 17](source/SO_Regles_V07.txt). Branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45). Cette tranche complète le diagnostic C1 et réutilise le moteur `space-maintenance`.

La régie peut signaler une avarie durable sur un module standard réellement installé, à quai, hors intervention et sans attelage. Le motif, l’opérateur et la révision sont journalisés. La panne supprime l’effet du module ; elle ne détruit pas son objet ni son contenu. Le calcul de profil reste canonique, sans multiplication des améliorations ni restauration de points.

Le devis natif identifie le module précis. Réparation : MEC-02 N2 et MEC-03 du niveau du module, atelier confirmé à quai, 5 minutes, 1 PA, pièces égales à 25 % de sa valeur neuve. Les pièces personnelles compatibles sont réservées puis consommées sans débit monétaire supplémentaire ; les pièces réellement stockées au comptoir peuvent être achetées. Une prestation PNJ ajoute 0,5 % de la valeur du vaisseau. Les fournitures doivent représenter exactement la valeur nécessaire : aucun arrondi ni conversion de crédits en objets n’est ajouté.

Le propriétaire ou son pilote mandaté accepte le devis ; un technicien joueur accepte ensuite personnellement et réserve son PA. L’interruption avant fin restitue les réservations et laisse la panne intacte. Le module, la qualification, les droits, l’atelier déclaré, la présence, le quai et les versions sont revérifiés. Un reçu ne permet aucun double paiement ; sa relecture est refusée après révocation ou changement de propriété.

La réparation ne rend aucun point de Coque ou de Bouclier, ne clôt aucune révision et n’efface pas une neutralisation temporaire encore active. Réciproquement, l’expiration d’une neutralisation ne répare pas une panne durable. Le même objet, le propriétaire, l’emplacement et le contenu sont conservés. Le diagnostic MEC-01 propose le devis issu du même calcul serveur. Les pannes durables suivent l’épisode suivant.

`moduleRepairVersion=1` est émis uniquement pour les nouvelles publications. Les anciens manifestes ne sont pas modifiés. Les entretiens Coque/Bouclier/révision conservent leur fonctionnement par points et leurs pièces personnelles de 50 Cr ; les valeurs explicitement préparées pour les modules utilisent leur propre devis.

## Preuves locales

- 7 tests métier, avec une boucle sur les six modules MOD-01 à MOD-06 : prix et qualification, pièces personnelles, PNJ, idempotence, concurrence, annulation après révocation, version périmée, neutralisation distincte et épisode.
- Les 7 cas réussissent en mémoire et sur Firestore émulé ; 1 parcours HTTP/Auth réussit, avec refus 401/403, pièces consommées une fois, aucun point rendu et révocation.
- 126 tests ciblés de régression réussis (réparation, vol équipé, montage, logistique, interface, diagnostic et remorquage). Après normalisation des objets du jeu de données de test : les 7 cas mémoire et Firestore ont été rejoués avec succès. Ces sélections se recouvrent.
- Compilation et contrôle du diff réussis sous Node 22. Les premières exécutions Firestore ont révélé des champs absents dans les objets synthétiques de la fixture ; celle-ci utilise désormais le validateur d’objets natif. Aucun validateur de production n’a été assoupli.

La CI exacte du candidat reste à consulter dans la PR. Aucun test navigateur ou téléphone, fusion, déploiement Firebase, migration ou changement de permissions.

## Limites

Seuls les six modules standards déjà exécutables sont ouverts. Les durées et effets des rares N4/prototypes N5 seront raccordés avec leur catalogue C3 ; aucune technologie absente n’est inventée. La réparation d’un module déposé n’est pas incluse ici. C2.4 (installation durable), les compléments droïdes/PNJ, C3 rare et C4–C6 restent ouverts. Un test terrain demeure nécessaire après intégration et publication autorisées.
