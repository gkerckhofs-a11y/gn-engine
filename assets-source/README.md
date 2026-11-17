# Illustrations orbitales — Holopédia

## État : 17 novembre 2026
- 30 planètes dans les articles publics.
- 17 illustrations orbitales distinctes déjà associées à la bonne planète ; fichiers originaux transférés dans le dossier Drive "Space Outlaws – Holopédia – illustrations orbitales" et partagés en lecture seule avec le compte de service `gn-engine-deployer@gn-engine.iam.gserviceaccount.com`.
- 13 planètes restent sans portrait orbital unique : Nal Hutta, Cato Neimoidia, Christophsis, Raxus, Dantooine, Malastare, Saleucami, Felucia, Utapau, Mygeeto, Bracca, Onderon, Eriadu.
- Images hébergées directement par Firebase après conversion 900×900 WebP, via les IDs du manifeste `planet-images.json`, non via des liens temporaires du chat.
- Les 17 premiers portraits, dont Rodia, ont été importés et publiés avec succès le 17 novembre 2026 après activation manuelle de Google Drive API. Déploiement Firebase ciblé Holopédia confirmé (workflow GitHub Actions 44036588596). Les 13 autres planètes restent sans image, sans duplication d'une illustration existante.

## Publication
La Google Drive API est désormais activée. L’import et le déploiement s’effectuent via le workflow `Déployer GN Engine sur Firebase`, cible **holopedia** (fichier `.github/holopedia-request.json` sur `main`). Il ne publie que `hosting:holopedia`.

## Règles éditoriales
- Chaque planète doit recevoir sa propre image, compatible avec son relief et son atmosphère (Bespin est gazeuse ; Geonosis désertique et restreinte ; etc.).
- Ne pas réattribuer au hasard une photographie d'Alderaan ou de Naboo à une autre planète. Les doublons issus des deux premiers lots ne comptent pas comme des planètes distinctes.
- La vue depuis l'espace est une **illustration reconstituée**, pas une photographie réelle ni une carte de navigation certifiée.
- Les 30 routes, les prix et les informations privées des personnages ne découlent pas des photographies.
