# Holopédia — Livre du monde public dans le Terminal joueur

Source de contenu : Google Docs *SO_Monde_V3*, édition joueurs enrichie du 16 novembre 2026 (document d'origine : `14uZMdpyKvyuV9Od5jv6AVrfuSm8PxaWFzgqOszhPJg0`).

## Portée de cette première tranche

- 56 articles dérivés exclusivement du texte déjà public : 30 planètes, 7 lieux, 16 chapitres, prologue, chronologie et introduction à l'atlas.
- Données conservées dans `web/world-encyclopedia-data.mjs`; aucune lecture des Masters privés ou des données de session.
- Depuis le Terminal joueur : carte **Holopédia**, route `#/holopedia/SESSION`, puis `#/holopedia/SESSION/ARTICLE`.
- Recherche instantanée par titre ou corps du texte, filtres de rubriques, lecture sur téléphone, fil d'Ariane et liens vers articles apparentés.
- Les 30 mondes sont des connaissances de culture générale ; cette encyclopédie ne donne aucun code de navigation, tarif en cours, accès commercial particulier ou connaissance privée.

## Limites et intégration

Les contenus sont un **instantané éditorial** de l'édition joueurs au 16 novembre 2026 ; les modifications ultérieures de Google Docs devront être réconciliées manuellement ou par un import contrôlé. Ne jamais importer le document MJ `SO_Canon12` ou les Master M6 dans ces fichiers statiques.

L'Holopédia n'est **pas** le carnet galactique personnel. Les routes connues, contacts, contrats et informations spécialisées continueront d'être contrôlés côté serveur dans les services existants. Les trente planètes évoquées dans le livre ne constituent pas à elles seules trente marchés ou routes publiés dans une session.

Aucun moteur métier, schéma Firebase, droit de transaction, progression de classe, API ou document source n'a été modifié par cette tranche.

La branche est destinée à la revue et aux tests ciblés. **Aucun déploiement Firebase n'est effectué ni autorisé par cette PR.**

## Recette recommandée

1. Depuis une session SO, ouvrir Terminal → Holopédia.
2. Rechercher « Corellia », « Amarres », « Vent d'aiguilles » et vérifier les résultats.
3. Ouvrir un article, puis revenir à l'index et au Terminal.
4. Sur mobile 390 px et PC 1440 px, vérifier la mise en page, la navigation clavier, les accents et la fluidité du filtre.
5. Tester un personnage non-Courtier et non-Pilote : les 30 descriptions communes restent consultables, sans déblocage d'itinéraire ou de marché.
6. Vérifier les protections habituelles des routes joueur et confirmer que le contenu du livre est bien autorisé à être publié aux joueurs.
