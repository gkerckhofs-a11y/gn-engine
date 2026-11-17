# Illustrations orbitales — Holopédia

## État : 17 novembre 2026
- 30 planètes dans les articles publics.
- 16 illustrations orbitales distinctes déjà associées à la bonne planète ; fichiers originaux transférés dans le dossier Drive "Space Outlaws – Holopédia – illustrations orbitales" et partagés en lecture seule avec le compte de service `gn-engine-deployer@gn-engine.iam.gserviceaccount.com`.
- 14 planètes restent sans portrait orbital unique : Rodia, Nal Hutta, Cato Neimoidia, Christophsis, Raxus, Dantooine, Malastare, Saleucami, Felucia, Utapau, Mygeeto, Bracca, Onderon, Eriadu.
- Images hébergées directement par Firebase après conversion 900×900 WebP, via les IDs du manifeste `planet-images.json`, non via des liens temporaires du chat.
- Site actuel : **images non encore publiées**, car le job d'import Drive a obtenu 403 `accessNotConfigured` sur le projet GCP `gn-engine`; le compte de déploiement n'a pas le droit `serviceusage.services.enable` pour l'activer.

## Action manuelle unique
Dans [Google Cloud API Library](https://console.cloud.google.com/apis/library/drive.googleapis.com?project=gn-engine) ouvrir le projet `gn-engine`, choisir **Activer** pour Google Drive API et attendre quelques minutes. Ensuite relancer la publication Holopédia via `.github/holopedia-request.json` sur `main`. Le workflow ne publie que `hosting:holopedia`.

## Règles éditoriales
- Chaque planète doit recevoir sa propre image, compatible avec son relief et son atmosphère (Bespin est gazeuse ; Geonosis désertique et restreinte ; etc.).
- Ne pas réattribuer au hasard une photographie d'Alderaan ou de Naboo à une autre planète. Les doublons issus des deux premiers lots ne comptent pas comme des planètes distinctes.
- La vue depuis l'espace est une **illustration reconstituée**, pas une photographie réelle ni une carte de navigation certifiée.
- Les 30 routes, les prix et les informations privées des personnages ne découlent pas des photographies.
