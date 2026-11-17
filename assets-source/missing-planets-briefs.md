# Holopédia — archives de conception des 13 derniers portraits orbitaux

**Statut : réalisé le 17 novembre 2026.** Les 13 portraits ci-dessous ont été produits, vérifiés et rattachés à leur notice. Ce document conserve le cahier des charges visuel de leur réalisation. Sources de direction : notices publiques correspondantes dans `world-encyclopedia-data.mjs`.

## Direction artistique commune
- Vue spatiale photoréaliste d'un seul globe complet, sans noms, interface, vaisseaux ni éléments graphiques.
- Atmosphère, continents, reliefs et climat cohérents avec les éléments décrits publiquement ; image reconstituée, non carte de navigation.
- Format carré, minimum 900 × 900 px, portrait individuel sans réemploi d'une autre planète.
- Ne représenter à grande échelle que les éléments réellement perceptibles depuis l'orbite.

## Les 13 vues attendues
1. **Nal Hutta** (`nal-hutta`) : marais étendus, eaux troubles, pluie et brouillard.
2. **Cato Neimoidia** (`cato-neimoidia`) : vallées profondes, hauts reliefs et ensembles urbains suspendus à une échelle plausible.
3. **Christophsis** (`christophsis`) : formations cristallines et régions marquées par les anciens combats.
4. **Raxus** (`raxus`) : planète habitée à quartiers urbains soignés et centres institutionnels ; géographie précise à documenter avant génération.
5. **Dantooine** (`dantooine`) : vastes plaines rurales et espaces agricoles.
6. **Malastare** (`malastare`) : régions exploitées pour leurs ressources énergétiques ; relief détaillé à documenter avant génération.
7. **Saleucami** (`saleucami`) : mosaïque d'étendues arides et de zones humides, colonies dispersées.
8. **Felucia** (`felucia`) : jungles denses à flore fongique géante et colorée ; vue d'orbite naturelle, sans gros plans de plantes.
9. **Utapau** (`utapau`) : monde sec percé de gouffres majeurs, implantation au fond des puits.
10. **Mygeeto** (`mygeeto`) : glace, froid et formations cristallines.
11. **Bracca** (`bracca`) : paysages de grands chantiers de récupération et coques de guerre accumulées.
12. **Onderon** (`onderon`) : jungles vastes et dangereuses, cités fortifiées.
13. **Eriadu** (`eriadu`) : reliefs et infrastructures civilo-militaires étendues ; ne pas prétendre à une cartographie exacte.

## Contrôles avant publication
Pour chaque nouveau portrait : vérifier visuellement la fidélité à la notice ; conserver l'original dans le dossier Drive « Space Outlaws – Holopédia – illustrations orbitales » ; le partager en lecture au compte `gn-engine-deployer@gn-engine.iam.gserviceaccount.com` ; reporter son identifiant dans `assets-source/planet-images.json` ; renseigner `planetImage` et `planetImageAlt` dans la notice ; actualiser le test des illustrations ; ne publier que `hosting:holopedia`.

Les premiers essais procéduraux de Nal Hutta, Cato Neimoidia et Christophsis n'ont pas été retenus : ils ne satisfaisaient pas au réalisme du lot déjà validé.
