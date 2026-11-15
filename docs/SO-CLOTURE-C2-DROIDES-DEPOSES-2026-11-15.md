# C2.2 — Réparation des modules droïdes déposés

15 novembre 2026. Branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45).
Base `f6862d85c55a283595fb0786fcab494663866e18`, arbre `a3be8e538d484371efb3424926035f0d6e80a110`.
[CI 43728819222](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43728819222) : dix jobs réussis sur cette base, dont six lots Firestore. Cette preuve ne valide pas le nouveau commit, dont la CI est suivie dans la PR.

## Exigence et résultat

Sources : [CDC de clôture V1, C2.2 et C3.2–C3.3](source/SO_CDC_Competences_Cloture_V1.md) et [règles V0.7, chapitre 11, MEC-02/MEC-03](source/SO_Regles_V07.txt). Une réparation conserve l’identité, le propriétaire, l’emplacement et le contenu. Elle ne recharge pas DR-01.

Le protocole de réparation préparé par la régie accepte désormais un module endommagé dans l’inventaire personnel de son propriétaire droïde, en plus du module installé. Il réutilise le même moteur d’intervention, le consentement précis au technicien et les réservations de PA, de module et de pièces. Le propriétaire peut aussi intervenir lui-même s’il possède les compétences requises. Le module reste dans son sac après réparation ; aucun emplacement n’est consommé, même si ses deux emplacements sont déjà occupés. La pose demeure une opération séparée.

Les six références conservent leurs barèmes : MEC-02 N2 et MEC-03 du niveau du module, 1 PA, 5 minutes au N1 ou 10 minutes au N2, sans jet. Les pièces réellement réservées valent `ceil(prix neuf / 100) × 25 Cr`. Le lieu doit rester un atelier publié disponible. Les PV, la charge de protection, la neutralisation temporaire et le contenu ne changent pas.

La preuve de l’intervention lie aussi le détenteur, l’emplacement et le statut du lot. Une réparation ne transfère pas au client un module personnel du technicien. Le changement d’état ou de contenu invalide la résolution ; l’annulation libère les réservations. Un verrou de sabotage actif interdit une nouvelle intervention concurrente.

L’interface distingue « installé » et « dans l’inventaire » et ne propose à la réparation que les modules endommagés appartenant à la cible. Aucun stock, compte, protocole ou manifeste historique n’est créé ou migré implicitement. Le raccord utilise la capacité `droidModulesVersion=1` de cette PR, encore non fusionnée.

## Preuves locales

- Node 22 : `node --test test/space-droid-work.test.mjs test/space-droid-storage.test.mjs test/person-actions.test.mjs test/person-ui.test.mjs test/space-native-sabotage.test.mjs` — **55 tests réussis**.
- Firestore/Auth/Storage isolés sur `demo-gn-engine`, sélection `GN_FIRESTORE_SUITES='["space-droid-work"]'`, motif `module déposé|module droïde déposé` sur les deux fichiers d’intégration : **quatre tests Firestore et un test HTTP/Auth réussis**. Le premier test Firestore parcourt les six références ; ce ne sont pas six tests supplémentaires.
- Cas : réparation avec les deux emplacements occupés, propriétaire distinct et accord révocable, mêmes biens/contenus, pièces consommées une fois, confirmation répétée, refus sans authentification ou par un tiers, délai, compétence manquante, atelier hors service, contenu périmé et restitution après annulation. Cycle natif pose → panne MJ → retrait → réparation → remontage de DR-01 sans recharge gratuite.
- `npm run build` et `git diff --check` réussis.

## Limites et prochaine étape

C2.2 est complété pour les modules installés et déposés appartenant à un droïde joueur actif. Une réparation pour un propriétaire humanoïde, un entrepôt ou un comptoir n’est pas ouverte par ce parcours. Les prestations PNJ droïdes restent à raccorder aux paiements natifs. C3 rares/prototypes, C5 soutes/coffres, C6 services/fret/contrats et la recette intégrée restent ouverts. Cette tranche ne certifie ni navigateur réel, ni téléphone, ni GN grandeur nature. Aucun déploiement Firebase, fusion, migration ni changement de permissions.
