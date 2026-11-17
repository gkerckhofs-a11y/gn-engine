# C2/C3 — Conserver la panne lors du retrait et du remontage

15 novembre 2026. Dépôt `gkerckhofs-a11y/gn-engine`, branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45). Base exacte : `ae83845c39323b018bd829882180b76e482709c0`, arbre `4299689cce8e710c27945455d94d03285c02fbc5`.

## Problème et comportement corrigé

Le parcours standard refusait le retrait d'un module endommagé et créait systématiquement un état opérationnel au montage. Ce comportement devait être corrigé avant l'extension du cycle aux technologies rares. Source : [CDC de clôture V1, C2.3 et C3.7](source/SO_CDC_Competences_Cloture_V1.md), conservation de l'identité, de l'état et de la calibration ; [règles V0.7, chapitre 17](source/SO_Regles_V07.txt).

Pour une session publiée avec `moduleRepairVersion=1`, un module MOD-01 à MOD-06 endommagé peut désormais être retiré par le parcours natif. Le même lot revient dans le sac du propriétaire avec sa calibration et son état. Un remontage conserve la panne : aucun effet de module, point de Coque/Bouclier ou pièce n'est rendu. Une réparation distincte par le moteur de maintenance est nécessaire. Après une réparation réelle, le retrait suivant enregistre l'état opérationnel courant, et non l'ancien état déposé.

L'accord du propriétaire lie aussi l'état réel. Une modification de cet état pendant l'intervention invalide sa finalisation, même sans augmentation de révision. Les réservations, le délai, le PA du technicien et l'annulation utilisent les services existants. Un sabotage en cours réserve déjà le lot et bloque une demande concurrente. Les gardes de neutralisation active, de quai et de compartiment non vide restent appliquées.

L'interface indique la panne dans les accords, la sélection du module et les confirmations du technicien. Le parcours des anciennes sessions opérationnelles reste inchangé ; un état endommagé ne peut pas être remonté en contournant l'absence de la capacité de réparation. Aucun manifeste existant n'est modifié.

## Fichiers et preuves locales

- `src/core/space-module-mandates.mjs` : état et calibration liés au consentement, contrôle des réservations.
- `src/core/space-module-work.mjs` : conservation de l'état entre vaisseau et inventaire, annulation native.
- `web/space-module-mandates.mjs`, `web/space-module-work.mjs` : avertissement explicite.
- `test/support/space-module-repair-suite.mjs`, `test/integration/http.test.mjs` : cycle complet, annulations, état périmé, refus d'autorisation, ancien périmètre et sabotage réservé.

Commandes exécutées sous Node 22 :

```sh
node --test test/space-module-repair.test.mjs test/space-module-removal.test.mjs test/space-module-installation.test.mjs test/space-module-work.test.mjs test/space-module-mandates.test.mjs test/space-module-flight.test.mjs test/space-hidden-cargo.test.mjs test/space-towing-work.test.mjs test/space-module-mandates-ui.test.mjs test/space-module-work-ui.test.mjs test/space-native-sabotage.test.mjs
GN_FIRESTORE_SUITES='["space-module-repair"]' node_modules/.bin/firebase emulators:exec --project demo-gn-engine --only firestore,auth,storage 'node --test --test-name-pattern="cycle durable" test/integration/firestore.test.mjs test/integration/http.test.mjs'
npm run build
git diff --check
```

Résultats : **192 tests applicatifs réussis**, **4 scénarios Firestore et 1 HTTP/Auth réussis**, compilation et contrôle du diff réussis. Le premier scénario déroule le cycle sur les six références ; un scénario n'est pas compté six fois. Les exécutions initiales de 55 et 11 tests recouvrent la sélection de 192 et ne s'ajoutent pas au total. Les émulateurs utilisent exclusivement `demo-gn-engine`.

## CI et limites

À la rédaction, [CI de la base 43736632388](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43736632388) en cours : plan, application et HTTP réussis ; six lots Firestore encore actifs. Ce résultat ne valide pas le candidat de cette tranche. Le SHA exact livré et sa CI sont consignés dans la PR #45.

**C3 rares/prototypes reste non livré** : fabrication/pose, effets, composants rares, plans, retrait avancé, réparation et reprise PNJ restent à raccorder aux quatre références canoniques. Cette correction est un préalable du cycle standard, pas la clôture C3. La réparation du module de vaisseau directement dans le sac n'est pas ajoutée. C5, C6 et recette intégrée restent ouverts. Aucun navigateur, téléphone ou test terrain certifié ; aucun merge, déploiement Firebase, migration ou modification de permissions externes.
