# GN Engine / Space Outlaws — gel fonctionnel du pilote

Date : 11 novembre 2026 · PR #2, branche `work/space-pilot-handover`.

## Décision

**Objectif : valider un premier épisode jouable, pas compléter l'intégralité de la V0.7.**
Développer seulement ce qui empêche les parcours retenus. Chaque défaut doit avoir une reproduction, un cas PIL et un test de non-régression. Plus de tranches fonctionnelles LIC-02, droïdes, Force PNJ, recettes, assurances ou autres systèmes avant le verdict du pilote, sauf blocage avéré.

## Périmètre choisi et données fictives

| Source | Parcours de preuve | Limite |
|---|---|---|
| M1 + M2 | Deux personnages, kits, PNJ, stocks | Personnages de test, pas les seize fiches finales |
| M3 | Cargo léger, deux ports et deux routes sécurisées | Manifeste/compétences de pilotage réellement contrôlés |
| M4 | Hors pilote | Formules en brouillon, aucune potion jouable inventée |
| M5 | Comptoir, trousses, carburant et caisse réelle | Pas de stocks fabriqués par des lectures |
| M6 | Balise `pilot-cache`, D12, les quatre catégories de trouvailles | Objet et 20 Cr prélevés sur le stock et la caisse |
| M7 | Annonce, candidature, mission et récompense financée | Pas de paiement avant les validations |
| Campagne | Naissance, rôles, STOP, clôture et épisode suivant | Conservation et compatibilité à vérifier par essais |

La variante est lancée uniquement en **émulateurs locaux** via `npm run recette:pilote`, et laisse le kit précédent (`npm run recette`) inchangé. La session commence en PAUSE ; le guide propose 7 cas LOCAL et 3 cas PILOT. Tout relevé commence **NOT_EXECUTED**. Une exécution CI n'est jamais une certification humaine.

## Registre fermé

| Blocage | Condition de sortie | État actuel |
|---|---|---|
| PIL-01 | Master fictif, session née, stock et comptes financés, fixture et tests verts | Candidat à certifier sur le HEAD |
| PIL-02 | Deux joueurs et rôles d'équipe parcourent D12, objets/crédits, achat, plein, voyage, mission et clôture | Non attesté de bout en bout |
| PIL-03 | Anomalies PIL-01/02 corrigées avec preuves et tests | Selon anomalies observées, aucune invention |
| PIL-04 | Vrais QR sur Android et iOS, connexion, réseau et ergonomie terrain | Non exécuté |
| PIL-05 | Régression complète, sécurité multicomptes, charge pilote et restauration vérifiée | Non attesté |
| PIL-06 | Candidat, cible Firebase, sauvegarde, plan de retour et Masters de test approuvés | Publication non effectuée |

## Sécurité des données et décision Firebase

La demande de publication Firebase et de Masters de test est **envisagée après PIL-01**, mais publier le code, créer/activer les Masters et lancer une session sont des opérations différentes. Vérifier d'abord le projet cible, ses données et droits, les éventuels marqueurs/versionnements, l'URL, la sauvegarde/retour arrière et la CI globale. **Aucune fusion dans main, aucun déploiement ni migration sans autorisation distincte de la cible et de la procédure.** Les Masters fictifs ne réinitialisent jamais une session historique.

Références : `docs/source/SO_CDC_V35.md`, `docs/source/SO_CDC_V36_Fouilles_Medias.md`, `docs/source/SO_Regles_V07.txt`, `docs/SO-RECETTE-LOCALE.md`, `docs/AUDIT-GLOBAL-2026-11-06.md`.
