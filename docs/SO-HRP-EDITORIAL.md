# Textes HRP — audit et refonte pédagogique

Auteur : Codex, 14 novembre 2026. Candidat sur `work/pedagogical-hrp`, après la PR #37. Aucune fusion ni publication Firebase.

## Sources et périmètre

Demande de Guillaume du 13 novembre 2026 ; règles [V0.7](source/SO_Regles_V07.txt), cahiers [V3.5](source/SO_CDC_V35.md) et [V3.6](source/SO_CDC_V36_Fouilles_Medias.md). Les règles intégrales déjà affichées dans `web/player-skill-rules.mjs` sont conservées sans modification.

Base : `8fb3df5ec33fb8e15f6537c656008fd4a4405db9`, PR [#37](https://github.com/gkerckhofs-a11y/gn-engine/pull/37), après #36 et #35. Inspection de main, des PR ouvertes et des PR historiques #2/#15. Les changements Vaisseau et navigation sont réutilisés, sans modification de leurs moteurs. Le SHA exact et la CI du candidat sont consignés dans sa PR.

## Audit et corrections

Repérage transversal des interfaces joueur, organisateur, cockpit, messages et ateliers. Le premier inventaire textuel détecte 259 fragments dans 50 fichiers ; ce chiffre comprend des termes légitimes, des formats techniques et des faux positifs de gabarits, et ne mesure pas 259 erreurs. Les corrections sont contextuelles, sans remplacement global de codes ou de données.

| Problème | Correction et contrôle |
|---|---|
| Jargon dans les parcours ordinaires | Fiche personnage, objets, informations et version du scénario remplacent les références architecturales dans les phrases concernées. Liste vérifiable avant/après dans [SO-HRP-CORRECTIONS.json](SO-HRP-CORRECTIONS.json). |
| Compétences trop longues | 34 aides : utilité visible, modalités/conditions/coût/résultat dans un premier volet, texte intégral inchangé dans « Voir les règles détaillées ». Aucun pouvoir supplémentaire promis par l’aide. |
| Explication insuffisante | Conseils courts selon l’écran : personnage, actions, sac, achats, contrats, vaisseau, travaux, voyage et groupes. PA, PV et crédits expliqués dans l’espace joueur. |
| Erreurs et interruptions | Messages communs pédagogiques ; causes larges conservées pour les codes ambigus. Aucun délai chiffré inventé. Une réponse réseau perdue ne signifie jamais une annulation confirmée. |
| États techniques | Traduction de statuts connus à l’affichage uniquement. Un état inconnu reste visible ; aucune valeur enregistrée ou condition métier modifiée. |
| Import trop dense | Aide immédiate puis format et règles détaillés dans un volet facultatif. Colonnes, identifiants et sémantique d’effacement restent consultables. |
| Mélange typographique | Fiction `.rp` et `.prose` droite ; aide `.hrp` italique ; boutons, données, références et indicateurs droits. Les paragraphes statiques corrigés et classés HRP reçoivent leur classe explicite. |
| Conséquences d’un don | Acceptation nécessaire et absence de mise de côté avant acceptation expliquées ; références internes secondaires. Quantités et récapitulatifs existants conservés. |

Les descriptions narratives préparées par l’organisateur ne sont pas réécrites. Les noms de fonctions, paramètres, codes, routes et attributs de commande restent inchangés. Les noms M1–M7 restent nécessaires dans les ateliers avancés et formats d’import. Les livres de règles détaillés gardent leurs exceptions et leur terminologie canonique : la refonte n’est pas une révision du livre.

## Validation locale

- `node --test $(rg -l '../web/' test -g '*.test.mjs' | rg -v '/integration/')` : **633 tests réussis**, aucun échec. Dont 4 nouveaux tests de présentation : 34 compétences et texte intégral préservé, erreurs et réseau, fiction échappée et quantités réelles, aides sans commandes.
- Dix assertions de libellés historiques adaptées ; les assertions de permissions, d’échappement, de données et de commandes sont conservées.
- `npm run build` : réussi.
- `node --check` sur les modules web et le scénario navigateur ; `git diff --check` : réussis.
- Comparaison des attributs de commandes et des noms de champs des modules existants modifiés avec la base : aucune différence.

La nouvelle recette Chromium vérifie les volets au clavier, la typographie calculée, l’absence de débordement à 390 px et les vues PC à 1440 px ; captures jointes par la CI. Son exécution et la CI globale doivent être constatées sur le SHA candidat dans la PR. Chromium local est bloqué par les restrictions de lancement de processus ; aucun succès navigateur local n’est revendiqué. La recette automatisée ne remplace pas une prise en main humaine Android/iOS.

Aucun changement dans `src/`, dans les règles Firebase, les permissions, stocks, transactions, PA ou données de session. Aucune nouvelle autorisation. Aucun déploiement, aucune migration et aucune fusion.

## Fichiers concernés

- `test/admission-m2-ui.test.mjs`
- `test/admissions-ui.test.mjs`
- `test/browser/recette.spec.mjs`
- `test/central-initial-coherence-ui.test.mjs`
- `test/central-knowledge-ui.test.mjs`
- `test/central-recipes-ui.test.mjs`
- `test/hrp-guidance.test.mjs`
- `test/space-boarding-freight-ui.test.mjs`
- `test/space-module-mandates-ui.test.mjs`
- `test/space-outlaws-entry-ui.test.mjs`
- `test/transfers-ui.test.mjs`
- `web/admission-m2-check.mjs`
- `web/admission-m2-reconciliation.mjs`
- `web/admissions.mjs`
- `web/announcements.mjs`
- `web/app.mjs`
- `web/boarding-custody.mjs`
- `web/central-characters.mjs`
- `web/central-check.mjs`
- `web/central-class-kits.mjs`
- `web/central-field-targets.mjs`
- `web/central-groups.mjs`
- `web/central-import.mjs`
- `web/central-knowledge.mjs`
- `web/central-missions.mjs`
- `web/central-recipes.mjs`
- `web/cockpit/connected.mjs`
- `web/collective-accounts.mjs`
- `web/fictional-traces.mjs`
- `web/field-actions.mjs`
- `web/intelligence.mjs`
- `web/logistics.mjs`
- `web/masters.mjs`
- `web/media.mjs`
- `web/place-search.mjs`
- `web/player-action-menu.mjs`
- `web/player-guidance.mjs`
- `web/player-spaces.mjs`
- `web/preparations.mjs`
- `web/ship-workspace.mjs`
- `web/shops.mjs`
- `web/skill-guidance.mjs`
- `web/solo-demo-navigation.mjs`
- `web/space-customs-detention.mjs`
- `web/space-decryption.mjs`
- `web/space-escape.mjs`
- `web/space-forgery.mjs`
- `web/space-hidden-cargo.mjs`
- `web/space-intrusion.mjs`
- `web/space-maintenance.mjs`
- `web/space-module-mandates.mjs`
- `web/space-outlaws-entry.mjs`
- `web/space-outlaws-episodes.mjs`
- `web/style.css`
- `web/transfers.mjs`
- `web/ui-language.mjs`
- `web/workshop.mjs`
