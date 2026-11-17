# Illustrations orbitales — Holopédia

## État confirmé : 17 novembre 2026
- **30 planètes, 30 illustrations orbitales distinctes** (aucun portrait dupliqué).
- Les 30 originaux sont conservés dans le dossier Google Drive « Space Outlaws – Holopédia – illustrations orbitales ».
- Chaque fichier est partagé en lecture seule avec le compte de service `gn-engine-deployer@gn-engine.iam.gserviceaccount.com`.
- Toutes les notices publiques disposent désormais des champs `planetImage` et `planetImageAlt`, compatibles avec les descriptions géographiques de l'univers.
- Les vues sont des **reconstitutions illustrées**, pas des photographies réelles ou des cartes de navigation certifiées.
- Les images sont importées depuis le manifeste `planet-images.json`, optimisées en WebP 900 × 900 puis publiées par Firebase Hosting, sans liens temporaires vers les conversations.
- Le workflow cible exclusivement le site secondaire `hosting:holopedia`, sans redéployer l'application principale GN Engine.

## Publication et contrôle
1. Vérifier `test/world-encyclopedia-links.test.mjs` (30 images et IDs uniques).
2. Mettre à jour `main:.github/holopedia-request.json` pour déclencher le workflow ciblé.
3. Contrôler le job `deploy-holopedia` : 30 conversions WebP, déploiement réussi, site public accessible.
4. Contrôler les URL des visuels et leur présence sur les fiches.

## Règles éditoriales
- Ne jamais intervertir les illustrations entre planètes.
- Tenir compte de la géographie : Bespin gazeuse, Geonosis désertique, Felucia aux jungles fongiques, Utapau aux gouffres, Mygeeto glacée, Bracca industrielle, etc.
- Ne pas inférer de données secrètes : itinéraires, coûts, codes de navigation, relations privées et connaissances réservées aux personnages ne découlent pas des images.
