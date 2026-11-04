# Space Outlaws — MOD-05 et remorquage

## MOD-05 — catalogue préparatoire — 4 novembre 2026

Base vérifiée : `e6b67d1e072668892f2167c9c56a71457871b883`, [CI 41842333259](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41842333259) completed/success : build, 843 applicatifs, 669 Firestore, quatorze HTTP et huit jobs requis. Aucun audit historique repris. Sources métier : règles V0.7 chapitres 17 et 22, `docs/source/SO_Regles_V07.txt`.

MOD-05 Remorquage peut être défini dans le brouillon M1 : objet individuel non consommable, calibration stricte code/gabarit. Chasseur refusé ; cargo 1 000 Cr et transport 2 000 Cr (10 % de la référence). Profils préparatoires : installation MEC-03 N2, dix minutes, 1 PA ; retrait MEC-03 N2, cinq minutes, 1 PA. Interface affichant explicitement préparation uniquement et absence de remorquage créé. Aucun tarif ou effet réglable dans le formulaire.

`preparationOnly=true` : publication bloquée par SO_SHIP_MODULE_EFFECT_NOT_OPEN, même avec offre canonique ; offre diagnostiquée comme fermée, sans faux conseil de corriger le prix. Lecture d’une version contenant MOD-05 refusée même si ses empreintes sont cohérentes. Commerce, mandat et profil installé/vol refusent ce module. Aucun marqueur towingVersion émis, activation manuelle, stock, monnaie, PA, capacité ou vaisseau créé. Archiver modèle et offre permet de publier les autres domaines ; MOD-04 et sa décision B restent compatibles.

Validation locale : build et 850/850 tests applicatifs ciblés dans 66 fichiers. Preuves nouvelles : quatre cas partagés mémoire/Firestore (définition stricte/réessai, publication/offre puis archivage, injection commerce/mandat/vol sans mutation, manifeste avec empreintes recalculées), un test de devis/profil, un UI et un sélecteur. HTTP M1 existant renforcé avec MOD-05 privé et diagnostic d’effet fermé. Profil targeted-towing-catalog : 66 fichiers applicatifs, 37 suites Firestore, quatorze HTTP ; navigateur global et régression intégrale désactivés. Java 21 et émulateurs en CI seulement. Vérifier le commit exact et consigner la CI dans PR #2 avant la suite. Aucune nouvelle recette DOM ni humaine sur téléphone revendiquée.

Suite : attelage MEC-02 N2/cinq minutes/1 PA, droits et épave compatible unique, trajet à carburant doublé et Manœuvrabilité –1 (minimum 0), largage/interception et interruption, puis ouverture versionnée cohérente. PNJ, primes, revendication et casse sont des parcours distincts à raccorder selon le chapitre 22 ; ne pas attribuer de propriété ou récompense au clic. Garder achat/montage/vol MOD-05 fermés tant que les effets ne sont pas raccordés.

Sauvegarder ensemble code compatible, définitions/calibrations, brouillon/révisions/historiques/délégations et offres. Aucun changement de donnée active, collection ou migration. Ancien binaire refuse ces définitions : archivage sous code compatible ou restauration cohérente approuvée, pas d’effacement partiel. Aucune sauvegarde/restauration externe exécutée. Même branche work/space-pilot-handover et PR #2 brouillon ; aucune fusion main ni publication/déploiement Firebase.

