# Sabotages natifs — tranche C4, 15 novembre 2026

Base : `a798a236f65a640dd700889e56de2de8b0a8907a`, PR brouillon #45.
Sources : `docs/source/SO_CDC_Competences_Cloture_V1.md` §6 ; `docs/source/SO_Regles_V07.txt`, sabotage et remise en service A15.

## Parcours livré

Une fiche M6 publiée désigne un module DR-01–06 N3 ou MOD-01–06 N4. Le profil N5 exige une référence et ses conditions explicites de remise en service ; une fiche incomplète est refusée. Le MJ associe ensuite le point à un exemplaire installé, dans un contexte physique autorisé. L'association conserve l'entité et le lot ; une seule association active par lot. Les anciens Masters ne reçoivent pas `nativeSabotageVersion=1` rétroactivement.

Le moteur terrain réserve le personnage, le module, le PA et le kit. Sabotage : 300 secondes, 1 PA, kit consommé au jet réussi ou échoué, récupération personnelle 600 secondes. Échec sans effet et verrou 300 secondes. Succès : fonction native neutralisée au maximum 900 secondes ; protection 900 secondes depuis la véritable fin, même sans consultation. La remise en service anticipée utilise MEC-02 N2 / 180 secondes pour droïde, MEC-02 N3 + MEC-03 N2 / 300 secondes pour vaisseau, ou les conditions N5 publiées ; 1 PA sans pièces.

Le scanner perd réellement son bonus ; le profil du vaisseau réutilise ses neutralisations de modules. La panne durable, les PV, la protection épuisée et les autres systèmes restent distincts. Aucun module n'est créé ou dupliqué. La fin contrôle encore l'état, la scène, les niveaux et le quai. Un départ intervenu depuis le début refuse la résolution sans réécrire le voyage ; l'annulation libère les réserves. Une captivité active est contrôlée dans le registre natif, y compris après une libération pendant l’intervention. DR-05 neutralisé ferme aussi la lecture du propriétaire. DR-06 neutralisé ou endommagé conserve son unité mais cesse de la cacher aux vols/fouilles admissibles ; une prise suit le transfert natif et vide la référence du module, sans duplication ni retour automatique de l’objet. Les épisodes conservent association, module et échéances. Audit et historique du lot identifient l'action source.

La régie propose l'association et affiche le motif et les délais. Le joueur voit la référence, les conditions de restauration et l'effet temporaire, sans motif privé ni identité interne du module. Les conditions physiques hors combat/maintenance autorisée restent préparées par le MJ ; la capture active et la localisation disponibles dans l'application sont contrôlées côté serveur.

## Vérification locale

Node 22, projet isolé `demo-gn-engine`, aucun service de production.

- 82 tests applicatifs ciblés réussis : sabotages natifs, installations ordinaires/durables, droïdes, réparations des modules, entrée SO et ateliers M6.
- 9 cas partagés Firestore réussis (huit initiaux, puis un cas ciblé capture/libération/STOP) : deux acteurs concurrents ; bonus DR-03/restauration/reçu ; expiration/protection/panne durable ; vaisseau et MEC-03 ; départ réel avant résolution ; échec/verrou/révocation ; N5 complet/incomplet ; accès/interface/épisode.
- 1 parcours HTTP/Auth réussi : refus anonyme et tiers, préparation et réalisation, effet sur le module installé, reçu unique et refus après révocation.
- Trois cas Firestore supplémentaires réussis : mémoire neutralisée, vol dans un compartiment neutralisé, fouille ordinaire avec choix de la victime et remise. Dernière sélection de 82 tests applicatifs réussie sur ces consommateurs, les sabotages, l’inventaire, les documents et l’Excel ; les sélections se recouvrent et ne s’additionnent pas.
- Complément Excel : 57 tests applicatifs ciblés réussis (sélection recouvrant la précédente) et un cas Firestore ciblé d’aller-retour et de refus.
- Compilation et contrôle des espaces réussis. Les derniers ajouts de texte/projection joueur ont été revérifiés dans les tests applicatifs et la compilation après les émulateurs.

Commandes :

```sh
node --test test/space-native-sabotage.test.mjs test/space-installation.test.mjs test/space-installation-repair.test.mjs test/space-droid-work.test.mjs test/space-module-repair.test.mjs test/space-outlaws-entry.test.mjs test/central-field-targets*.test.mjs
GN_FIRESTORE_SUITES='["space-native-sabotage"]' firebase emulators:exec --project demo-gn-engine --only firestore,auth,storage 'node --test test/integration/firestore.test.mjs && node --test --test-name-pattern="sabotage de module installé" test/integration/http.test.mjs'
npm run build
```

## Limites

Cette tranche ne clôt pas tout le cahier des charges. Les modules rares R04/R05 doivent encore être construits et raccordés à C2/C3/C4/C5. Le N5 ici concerne un module natif déjà pris en charge, avec restauration explicitement préparée ; aucun effet arbitraire n'est exécuté depuis un texte libre. La préparation avancée utilise le formulaire M6 web et la colonne facultative `sabotage_systeme_json` de l’Excel M6. Un aller-retour conserve la fiche sans changement ; une restauration N5 incomplète est refusée à cette colonne. Les anciens fichiers sans cette colonne conservent les données existantes. Pas de recette sur appareil réel : Chromium local est bloqué avant le lancement de l'application dans cet environnement. Pas de fusion, déploiement ou migration. Le résultat CI du commit exact est consigné séparément dans la PR, sans réutiliser celui de sa base.
