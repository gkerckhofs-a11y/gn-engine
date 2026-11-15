# C3 — Brouilleur R04-01, raccord préparatoire

15 novembre 2026. Dépôt `gkerckhofs-a11y/gn-engine`, branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45). Base `821b0c14af35606d8f754e00ec49d3cf02ccc256` : [CI 43738212280](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43738212280) entièrement réussie, dix jobs.

Sources : [CDC de clôture V1, C3.5–C3.7](source/SO_CDC_Competences_Cloture_V1.md) ; [règles Space Outlaws V0.7, chapitre 17](source/SO_Regles_V07.txt).

## Ce qui est raccordé

La référence R04-01 possède un devis canonique de fabrication : 30 % de la valeur du vaisseau (20 % de ressources courantes, 10 % de composants rares), MEC-03 N4, 20 minutes et 1 PA ; retrait N4, 10 minutes et 1 PA ; réparation 25 % de la valeur neuve, 10 minutes. Ce devis **ne débite ni ne crée de ressource** : il prépare le futur parcours de fabrication. La vente ordinaire en boutique demeure rejetée.

Le moteur de montage, retrait, vol et réparation reconnaît un exemplaire d'origine `SHIP_RARE_FABRICATION` dans une session explicitement dotée de `sensorJammerVersion=1`. Il conserve le même lot, sa calibration et sa panne. Les autres origines et un Mécano sous N4 sont refusés. Le brouilleur opérationnel donne +1 à une fuite ordinaire contestée ou au décrochage initial PIL-03 N1, si le pilote l'annonce avant le jet. Il n'est consommé qu'au jet, une fois par voyage, dans les duels et convois, et ne s'ajoute pas au bonus d'une autre manœuvre spéciale ou de l'interposition. La panne durable ou une neutralisation active le rend indisponible. Le journal du round montre le bonus appliqué.

L'interface du pilote permet de l'annoncer avant le décrochage ou l'enregistrement d'une fuite ordinaire. Le serveur conserve l'usage dans le voyage, y compris après reconnexion. L'indicateur de capacité n'est **pas** émis dans `releaseCapabilities` : une publication ordinaire ne peut encore activer cette technologie ni publier un modèle R04-01. Les tests de l'effet préparent explicitement un exemplaire synthétique et son marqueur de session ; ils démontrent la résolution technique, pas une fabrication réelle.

## Preuves et limite de livraison

- `node --test` sur douze suites adjacentes : 152/152 tests réussis, dont cinq nouveaux scénarios en mémoire.
- `npm run build` et `git diff --check` réussis sous Node 22.
- Cinq scénarios sur émulateurs `demo-gn-engine` : 5/5 réussis, notamment origine fabriquée, niveau du Mécano, décrochage, duel et convoi. La CI du nouveau SHA sera suivie dans la PR.

**C3 n'est pas jouable en entier** : il faut préparer le plan, identifier les composants rares dans M1, réserver/consommer les quantités réelles et produire puis poser l'unique exemplaire dans une transaction finale après 20 minutes et 1 PA. Le code ne crée aucun objet à partir du seul devis. R04-02, R05-01, R05-02, leurs effets et le reste du cahier des charges demeurent ouverts. Aucun déploiement ni recette GN réelle.
