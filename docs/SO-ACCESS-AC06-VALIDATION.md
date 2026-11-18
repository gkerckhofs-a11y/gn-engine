# Accès contextuels — validation intégrée AC-06

17 novembre 2026 · mission [#57](https://github.com/gkerckhofs-a11y/gn-engine/issues/57), PR de code [#58](https://github.com/gkerckhofs-a11y/gn-engine/pull/58), spécification documentaire #56 conservée séparément.

## Candidat et preuves

Ce rapport accompagne le candidat AC-05/06 descendant de `e9e10de250cf4701772dbd33df3a4d46a9fbd2a3`. La description de PR consigne le SHA final et son exécution CI : un résultat ancestral ne valide pas ce candidat. Le parent AC-04 a sa [CI ciblée 44135616348](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/44135616348) réussie, vérifiée avant AC-05. Les trois premiers lots ont leurs preuves exactes dans `SO-CONTEXTUAL-ACCESS-57.md`.

La CI complète est explicitement demandée par `[ci full]` au commit d'intégration : build, application entière, règles et suites Firestore, HTTP/Auth/Storage, recette Chromium. Son état et ses décomptes doivent être lus sur le SHA exact dans la PR. Aucun résultat en cours n'est un succès.

Commandes locales de cette tranche : build ; sélection cumulative `contextual-docks` complétée par les tests de vol ; `node --test test/dock-theft.test.mjs test/dock-theft-ui.test.mjs test/inventory.test.mjs` ; trois suites Firestore `dock-theft`, `docks`, `dock-intrusion` et les deux HTTP/Auth dédiés. Résultats locaux : build et 882 tests applicatifs ciblés réussis ; la commande plus courte inventaire/vol/UI compte 39 succès (déjà inclus). Les trois suites Firestore totalisent 27 succès. Les deux HTTP dédiés sont suivis séparément. Les décomptes se recouvrent et ne s'additionnent pas. Node local 24.22.1, Java 21 ; Node CI 22. Les suites partagées mémoire/Firestore injectent des états fictifs et une horloge contrôlée, contrairement au kit navigateur ci-dessous.

## AC-05 livré

- Opération distincte du forçage et du retrait ordinaire : source connue, quantité, destination effectivement autorisée, aperçu puis confirmation sur place. Trois minutes de jeu, réserve de 1 PA consommée uniquement à la réussite, limite de cinq unités de volume, récupération de dix minutes après résolution, quota par personnage/cellule/session.
- Réservation et réception par les fonctions natives `reserveCargoBatch`/`finishCargoBatch`. Le volume entrant réserve la destination. Vérifications courantes à la résolution : santé, inscription, présence/accès source, port, droits et état de la destination, capacité, lot, quota. Échec résolu : aucun PA consommé, réservations libérées et récupération. Abandon avant résolution : libération sans quota ni récupération supplémentaire. Annulation MJ disponible après révocation joueur.
- Réussite automatique au terme si les préconditions restent satisfaites, sans jet supplémentaire ni décision de réussite MJ. Le suivi joueur relit toutes les cinq secondes ; la régie toutes les dix secondes. Reprise à l'ouverture du suivi ; **pas de tâche serveur planifiée**. Si toutes les pages sont fermées, la mutation reste en attente de cette prochaine résolution. Le temps de jeu et STOP restent natifs.
- Physique : état `HANDOVER` après le délai ; la garde et le PA ne sont finalisés que par l'attestation MJ de la remise effective. Aucun déverrouillage matériel.
- Détenteur mis à jour, propriétaire légal et documents/provenance conservés. Le propriétaire victime ne reçoit ni localisation destination ni identité du détenteur dans son inventaire. Les commandes ordinaires de fret, stockage et revente ne peuvent pas utiliser la garde volée pour détourner le titre. Restitution, recel, nouvelle cession de garde et vente légale ultérieure restent fermés faute de parcours défini ; aucune mécanique inventée.
- Alarmes fictives par cellule : activation explicite, événements, destinataires et délai explicitement choisis, indépendants de N1–N5. Boîte privée par personnage ; pas de révélation d'intrus ou de cargaison, pas de mandat de stock, pas d'envoi externe. Une révocation de destinataire est relue avant affichage. Le délai de dix minutes proposé dans l'addendum n'est pas imposé.
- Reprise d'épisode : garde/propriété et preuves terminées conservées ; quota et présence locale ne sont pas réactivés. Les réservations en cours utilisent les blocages de clôture natifs.

## Couverture des recettes

« Automatisé » décrit une couverture dans les fichiers cités, à confirmer par la CI du candidat. Ce terme ne signifie pas essai humain. « Partiel » désigne une limite concrète, jamais un succès complet implicite.

| Cas | Couverture et limites |
|---|---|
| ACT-01, 02, 04, 05, 06, 17 | Automatisé : `contextual-access-suite.mjs` (scan, expiration, révocation, portée, code, clé réellement transférée, compétence), HTTP/Auth et parcours navigateur. |
| ACT-03 | Automatisé : circuits personnels/commerciaux et `contextual-delivery-suite.mjs`, sans droit courtier implicite. |
| ACT-07, 08, 09, 10, 11, 12, 15, 16 | Automatisé : `contextual-delivery-suite.mjs`, comptes/stock/reçus natifs, concurrence et interruption transactionnelle ; HTTP/Auth et navigateur. |
| ACT-13 | Automatisé : `contextual-qr.test.mjs`, lectures PNG/SVG, structure PDF/ZIP ; PDF rendu et inspecté lors d'AC-02. QR papier non exécuté. |
| ACT-14 | Régression automatisée : suite `space-search`, fouille publique indépendante du terminal ; confirmation globale attendue de la CI. |
| ACT-18 | Automatisé : droits stock/groupes/fret dans `docks-suite.mjs`, `dock-theft-suite.mjs` et HTTP/Auth. Le scan seul ne confère aucun mandat. |
| DOCK-01, 02 | Automatisé : acquisition native et reçus dans `docks-suite.mjs`, location concurrente dans `commercial-storage-suite.mjs`. Achat définitif concurrent exercé localement lors d'AC-04 ; pas d'essai humain. |
| DOCK-03, 04, 05, 13 | Automatisé : mouvement natif, réception/capacité/port, absence de nouveau prélèvement local, `docks-suite.mjs`. |
| DOCK-06, 07, 08, 09 | Automatisé : révélations limitées, INF-01 success/failure et refus des commandes ordinaires sans mandat, `docks-suite.mjs`. |
| DOCK-10, 11 | Automatisé : réservation, conservation, concurrence, interruption et réception atomique, `dock-theft-suite.mjs`. |
| DOCK-12 | **Partiel** : justificatifs conservés, droits douaniers natifs inchangés. Pas de nouvel écran d'inspection documentaire de cellule ni pouvoir douanier supplémentaire. |
| DOCK-14 | **Partiel** : pas de nouvelle vente/regularisation, garde volée fermée aux ventes ordinaires. Le stockage sous douane et le contrôle de transit en cellule ne sont pas ouverts. |
| DOCK-15 | **Partiel** : aucun pouvoir de saisie ajouté. Le parcours d'inspection de cellule sans saisie n'est pas développé. |
| DOCK-16 | Automatisé : extensions optionnelles, anciens formats/réponses conservés hors marqueur ; régression complète à vérifier en CI. Pas de migration. |
| DOCK-17, 18, 19, 20, 21, 22 | Automatisé : code/clé et INF-01, niveau réel, absence de réussite automatique, preuve ciblée et retrait séparé, `docks-suite.mjs` ; refus HTTP direct. |
| DOCK-23 | Avertissement prix/sécurité dans la régie, vérification UI/local AC-04. Les prix restent saisis par l'organisateur ; aucun barème ajouté. |
| DOCK-24, 26 | Texte de fair-play et séparation du réel ; aucune géolocalisation/serrure. **Essai terrain non exécuté.** |
| DOCK-25 | Automatisé : changement de sécurité sans retoucher titre ou biens, `docks-suite.mjs`. |
| DOCK-27, 28, 29, 30, 31, 32 | Automatisé : tests nommés dans `dock-theft-suite.mjs`, succès/échec, PA, délai, quota, destinations et intrusion seule sans mouvement. |
| DOCK-33, 34, 35 | Automatisé : N5 silencieux, N2 immédiat/différé, destinataire révoqué, anonymat et absence de mandat. |
| DOCK-36, 37, 38 | Automatisé : reprise/rejeu/concurrence, pause/STOP natifs, conservation des justificatifs, `dock-theft-suite.mjs`. |
| DOCK-39, 40, 41 | Automatisé : aucune destination possible, source identique, sac refusé avant toute réserve et sans PA. |
| DOCK-42, 43, 44, 45, 46, 47, 48 | Automatisé : cellule/soute, quai, capacité réelle/réservée, droits de dépôt seul, révocation et capacité perdue, ports distincts. |
| DOCK-49, 50 | Automatisé : lot réglementé/provenance inchangés et interruption/abandon libérant toutes les réserves. |

Les noms des cas DOCK sont attachés aux tests partagés afin de pouvoir retrouver leur exécution mémoire et Firestore. Une étiquette commune ne garantit pas toutes les variantes d'un scénario : la colonne ci-dessus signale les parties non raccordées.

## Recette navigateur isolée

Le troisième scénario du kit ne touche que `demo-gn-engine`. Préparation par commandes réelles : Masters, naissance, achats, provision d'un stock fini, caisse réelle du comptoir, trouvaille de six crédits financée sur cette caisse avec une minute native réellement écoulée et D12 serveur, achat de six caisses à un crédit, remise physique native, locations explicitement gratuites, dépôt et terminal codé. Aucun crédit gratuit, stock directement injecté, horloge forcée ou code secret dans `recette.json`.

Le parcours Chromium « Vol de cellule » prévoit scan mobile simulé, code, choix de cellule, trois minutes réelles, résolution automatique et vérification de garde, avec vues régie PC. Résultat du candidat attendu en CI. Chromium local ne démarre pas ; ce rapport n'affirme donc aucun succès navigateur local. Ni appareil Android/iOS réel, ni QR papier, ni test de charge 60 personnes, ni recette MJ humaine effectués.

## Préparation à la validation et publication ultérieure

Le candidat reste en PR brouillon. La réussite de la CI complète rend le code disponible pour validation MJ, pas certifié pour un GN réel. Inspection documentaire/saisie en cellule, stockage sous douane, restitution/recel et cession de titre restent explicitement fermés. Préparer les prix/capacités, cibles INF-01, terminaux, codes/clés, mandats, durée de présence, mode physique et alarmes de chaque cellule avant une recette MJ.

Aucune fusion, publication Firebase, migration, suppression, modification de secret ou permission d'infrastructure effectuée. Une future publication exige une autorisation distincte sur un SHA validé, puis la procédure existante `SO-SAUVEGARDE-DEPLOIEMENT.md` : cible vérifiée, sauvegarde/restauration vérifiées, configuration et contrôles post-publication, retour arrière préparé. Aucune cible active ou sauvegarde réussie n'est présumée ici.

## Correction issue de la première CI intégrée

Candidat `58907f9206b521c2236a8233f99643ca57653cda`, [CI 44148194614](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/44148194614) : build et 3 334 applicatifs complets réussis ; 119 HTTP/Auth réussis ; 29 parcours Chromium réussis, le nouveau vol échoue avant son lancement. Le relevé Playwright montre une saisie sur l'ancien formulaire pendant l'actualisation consécutive au scan : le formulaire est remplacé et le bouton de code devient invisible. Ce résultat n'est pas un succès global ; Firestore encore en cours lors du correctif.

Le conteneur local est désormais inerte et marqué occupé jusqu'à la fin de la commande **et** de l'actualisation. Un deuxième envoi est bloqué ; un refus restaure le formulaire et son message sans effacer la saisie. Le scénario navigateur reste inchangé, sans clic forcé ni délai artificiel masquant le défaut. Test ciblé du cycle asynchrone ajouté : attente API, attente rendu, double envoi et restauration après refus. Build et 17 tests ciblés réussis localement. La CI complète du correctif doit confirmer le parcours utilisateur et tous les contrôles requis ; les résultats du parent ne lui sont pas attribués.

## Finalisation du 18 novembre 2026

Sur `3e8e600fcb72391c03b71b0779197c69ca3c4db6`, [CI 44151147807](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/44151147807) terminée : build, 3 335 applicatifs, 119 HTTP/Auth et 2 516 Firestore (464 + 456 + 373 + 468 + 366 + 389) réussis sans échec ni test ignoré. Les 29 autres parcours Chromium réussissent. Le nouveau parcours franchit maintenant le formulaire de code ; il échoue ensuite car son sélecteur de préparation correspond à deux boutons : le scanner QR injecté et la confirmation du vol. La validation globale reste donc échouée sur ce SHA.

Correction limitée au sélecteur de recette : `button.primary` désigne la confirmation ; scanner, application, règles et assertions métier inchangés. Vérification syntaxique, build et trois tests UI ciblés réussis localement. Chromium système a de nouveau échoué au lancement ; aucun résultat navigateur local revendiqué. Le nouveau commit demande `[ci full]`. Le verdict définitif de cette version sera consigné dans la description de PR avec son SHA et son exécution exacts, sans créer un commit documentaire auquel un ancien résultat serait attribué.
