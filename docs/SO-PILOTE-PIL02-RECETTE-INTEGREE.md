# Space Outlaws — protocole de recette intégrée PIL-02

Date : 11 novembre 2026 · branche `work/space-pilot-handover` · dossier de pilote `docs/SO-PILOTE-GEL-V1.md`.

## Objet et statut

**PIL-02 : NON EXÉCUTÉ.** Ce document définit le contrôle de la traversée complète du pilote, pas une preuve que cette traversée a réussi. Les tests automatiques du préparateur (`test/recette.test.mjs`) valident surtout la création du Master, les provisions, les droits et les réserves. Les suites spécialisées testent individuellement la fouille, le comptoir et les voyages. Elles ne prouvent pas encore l'enchaînement de ces activités sur **la même session, les mêmes incarnations et les mêmes comptes**.

Ne pas transformer un statut de CI `success` en `PASS` humain. Tout résultat PIL-02 doit comporter un SHA précis, l'environnement, l'identité fictive, l'heure, l'action, le résultat observé, les soldes/quantités et la référence de preuve.

## Environnement de preuve et initialisation

1. Depuis la branche et le SHA à tester : `npm ci`, `npm run recette:check`, puis `npm run recette:pilote`. Node 22 et Java 21 requis. Ne jamais employer le projet Firebase de production pour cette préparation.
2. Ouvrir `http://127.0.0.1:4173/recette.html` sur le poste des émulateurs ; relever `/recette.json` (commit, arbre propre/modifié, identifiants de session). La session de départ est en **PAUSE**.
3. Ouvrir des profils distincts pour propriétaire, MJ, accueil, Ari, Bela et tiers. Aucune action de lecture ne doit créer un lot, un crédit, un PA ou un paiement.
4. Relever les états de départ suivants, prévus par les fixtures et à **vérifier**, sans les considérer comme un verdict : Ari = Médecin, Bela = Pilote ; cargo de Bela au port `home`, carburant embarqué 0 ; offres de carburant = 8 unités, 25 Cr/unité ; `pilot-cache` avec quatre trouvailles ; lot objet de fouille = 1, crédits de fouille = 20 ; caisse = 150 Cr dont 120 réservés (100 contrat + 20 fouille) ; Ari = 50 Cr protégés, Bela = 200 Cr protégés. Les prix sont propres à la fixture, pas des règles globales.
5. Reprendre explicitement le jeu dans la régie. Conserver une seconde préparation privée comme témoin d'isolation.

## Traversée contrôlée sur la même session

| Ordre | Acteur et parcours | Observations minimales et refus à tester |
| --- | --- | --- |
| 01 | Ari puis Bela, QR ou lien de la balise `pilot-cache` | Seul le serveur produit le D12 ; même profil de fouille pour tous, seuil caché ; vérifier PA, délai, récupération et résultat neutre d'échec. Ne pas supposer qu'un premier jet révèle toutes les trouvailles. |
| 02 | Deux joueurs, indices à voir et à prendre | Un indice à voir demeure consultable ; une prise reste unique. Contrôler les projections propres aux joueurs et absence des secrets MJ. |
| 03 | Deux joueurs, objet et 20 Cr préparés | La prise doit venir du lot réservé et de la caisse existante ; lancer aussi deux prises concurrentes sur le même identifiant. Une seule issue peut transférer ; aucune monnaie créée, aucune quantité dupliquée, aucun second reçu actif. |
| 04 | Bela, comptoir et achat de carburant | Préparer le devis, confirmer une seule commande, demander au MJ la remise, puis confirmer la réception. Vérifier une seconde soumission identique, le portefeuille de Bela, le stock de l'offre et la caisse. Le carburant n'est pas livré à bord par la seule vente. |
| 05 | Bela, plein du cargo `pilot-cargo` | Employer le lot réellement reçu ; contrôler la préparation, les deux minutes de jeu, le coût et la consommation unique. Ari et un tiers doivent être refusés comme pilotes. STOP/PAUSE ne doivent pas contourner la préparation ni les permissions. |
| 06 | Bela, voyage `home` → `away` | Le MJ communique le code requis, sans le rendre public par les lectures. Vérifier PA réservé, préparation, durée, carburant, éventuelle rencontre, arrivée confirmée, port final et unicité des reçus. Une action répétée ne doit pas relancer le même vol. |
| 07 | Ari, candidature et mission `courier` déjà acceptée | Soumettre la preuve des étapes puis faire valider par le MJ ; inspecter le contrat et le délai de contestation avant **tout** versement. La validation ne paie pas automatiquement. |
| 08 | MJ et Ari, paiement puis réception | Après échéance conforme aux règles du temps de jeu, payer le salaire et attribuer les récompenses ; remettre physiquement puis confirmer la réception. Contrôler les réserves de salaire/objets et refuser paiement ou remise en double. |
| 09 | Propriétaire/MJ, clôture et épisode suivant | Contrôler les voyages clos et les obligations résiduelles ; sauvegarder le bilan, clôturer, préparer l'épisode suivant et comparer lots, crédits, PA, droits, XP, contrats et propriétés. Aucun réapprovisionnement tacite. |

Ne jamais accélérer le temps en écrivant directement dans Firestore pendant cette recette : attendre les durées natives, utiliser les commandes de PAUSE/STOP et relever les horloges affichées.

## Contrôles croisés indispensables

- **Droits :** tiers/accueil sans lecture des données MJ ; Ari ne pilote pas le cargo de Bela ; Bela ne reçoit pas le briefing privé d'Ari ; aucune permission ne doit provenir d'un paramètre client forgé.
- **Confidentialité :** pas de `gmNotes`, `gmTruth`, secrets de route, notes MJ ou identifiants techniques dans les réponses joueur, captures ou export du relevé.
- **Conservation :** solde et quantité avant/après, provenance des lots, reçus et transferts ; même `requestId` au réessai identique ; actions périmées, sessions croisées et droits révoqués refusés.
- **Temps :** distinguer minutes réelles et minutes de jeu, PAUSE et STOP ; ne pas créditer une action simplement parce que le navigateur est resté ouvert.
- **Épisodes :** journaliser précisément ce qui est conservé et ce qui reste volontairement inaccessible ; ne pas déplacer ou réécrire de données historiques pour faire passer un test.

## Critères de sortie

**PIL-02 = PASS** uniquement si les neuf étapes ont été observées sur une même session, les refus pertinents ont été vérifiés, les comptes/objets sont réconciliés et les pièces justificatives sont liées au commit vérifié. Sinon : **FAIL** avec reproduction et cas de non-régression, ou **BLOCKED** avec cause ; **NOT_EXECUTED** tant que le parcours n'a pas eu lieu.

Pour chaque anomalie : (1) reproduire sur le même SHA ; (2) isoler un cas de test côté service/UI et un refus d'autorisation si concerné ; (3) corriger sans changer les règles V0.7 ; (4) lancer la suite ciblée puis la CI sur le **nouveau** SHA ; (5) refaire la partie du parcours et vérifier qu'aucun solde, lot, contrat ou Master existant n'a été altéré.

La publication Firebase est traitée séparément sous PIL-06 : cible et sauvegarde vérifiées, CI globale complète, procédure de retour arrière, Masters fictifs explicitement préparés, puis autorisation de déploiement. Ce document n'autorise aucune fusion, migration, remise à zéro ou publication.
