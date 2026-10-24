# C2b — Délégation explicite du contrôle central

24 octobre 2026. Candidat 0.37.0 sur `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), sans fusion ni déploiement. Ce lot étend l'autorité du contrôle préparatoire C2a ; la publication globale reste à développer.

## Source et base vérifiées

La recherche des fichiers SO_CDC le 24 octobre retrouve comme version la plus récente `SO_CDC_V35(1).md`, modifiée le 23 octobre à 13:17:44 UTC. Son téléchargement est identique octet pour octet à [la source du dépôt](source/SO_CDC_V35.md) : 139722 octets, SHA-256 `531ed5dba4c3c3970c5500db25cfc07df8dc434408a62b82783c0b2512be92d4`. Références : CDC §§3.6–3.8, [plan central §5, point 8](SO-00-V34-PLAN-CENTRAL.md), [ordre V3.5](SO-00-V35-INSCRIPTIONS.md), contrat C2a et arbitrages V0.7 inchangés. `checkCentral` est le choix technique de cette tranche, pas un nouveau rôle canonique ni un droit de publication déduit du CDC.

Base distante C2a `a90176f65111487d284db3536b9e167194f158b6`, base locale `b1168dee113e5656c744fcb7f94652d2e4f81b02`, arbre identique `690bc43fdf0584681991f95b451f478ddfb93db7`. Main `03eaace155b052d1b7d1960347746e9ee60ed514`, PR ouverte en brouillon. CI C2a vérifiées terminées : [push 40083888265](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40083888265), job 120842775801 ; [PR 40083893166](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40083893166), job 120842789729. Chacune : build, 983 tests applicatifs et 774 Firebase réussis, aucun échec, annulé, ignoré ou todo. [Preuves C2a archivées](PR-1-HISTORIQUE-AVANT-C2B.md).

## Parcours et contrat

Le propriétaire ouvre les droits de campagne, choisit le compte Google, accorde explicitement la lecture des sept ateliers, coche **Autoriser le contrôle global** et renseigne un motif. Ces lectures donnent accès aux contenus privés des ateliers ; le formulaire l'annonce et ne coche aucun atelier automatiquement. L'édition reste facultative et indépendante. L'organisateur autorisé peut ouvrir **Contrôler le brouillon commun** depuis un atelier. Il reçoit le même rapport partiel C2a avec la révision des droits utilisés.

Le champ booléen `checkCentral` étend les `campaignStaff` existants. Aucun nouveau catalogue, rôle de session ou collection. Seul le propriétaire modifie la délégation par `setCentralStaff`, avec révision attendue, raison, reçu et historique avant/après. Une délégation de session, les sept lectures ou l'édition de tous les ateliers ne suffisent jamais à autoriser le contrôle.

| Situation | Résultat serveur |
|---|---|
| Nouveau droit vrai, compte actif, sept lectures explicites | Contrôle accordé, aucune édition ajoutée |
| Droit vrai, inactif ou lecture manquante | `CENTRAL_CHECK_ACCESS_REQUIRED`, aucune écriture |
| Valeur fournie non booléenne | `INVALID_CENTRAL_GRANT` |
| Ancien grant sans champ ou champ faux | Lectures/éditions historiques conservées, contrôle refusé |
| Ancien client omettant le champ pour modifier un grant actif déjà habilité | `CENTRAL_CHECK_CHOICE_REQUIRED`, choix explicite requis |
| Retrait explicite du contrôle | Lectures conservées selon le choix soumis, prochaines demandes de contrôle refusées |
| Désactivation, champ omis | Contrôle effacé ; une réactivation sans choix ne le restaure pas |
| Révision périmée | `STALE_REVISION`, aucune fusion des choix concurrents |
| Réessai d'une ancienne attribution après révocation | Ancien reçu seulement, aucune réattribution ni nouvel historique |

Un grant habilité incohérent (campagne/propriétaire, activité, lectures, type du flag ou révision) est refusé. La transaction relit l'autorité courante avant toute liste de changements. La révocation n'efface pas un rapport déjà reçu : un contrôle concurrent peut finir avec l'état cohérent antérieur ou être refusé ; toute requête démarrée après la révocation est refusée. Aucune autorisation réutilisable n'est déduite du rapport.

Le rapport ajoute `authority: {kind: 'OWNER'|'DELEGATED', revision}` ; `revision` vaut null pour le propriétaire. Son enveloppe reste additive, `schemaVersion:1` ; le schéma interne de l'empreinte passe à 2 et inclut l'identité du lecteur, l'autorité et la révision/listes des droits. Toute réattribution produit une nouvelle empreinte même si le brouillon n'a pas changé. L'empreinte n'est ni une preuve de droits futurs ni une signature de publication.

## Isolation et compatibilité

Le contrôle reste une lecture sans reçu ni écriture. Il ne lit aucun dossier d'admission, politique, historique privé de session, compte ou instance. Ses bornes C2a et gardes C1a/brouillon initial restent inchangées. L'API refuse toujours une tentative de publication ou un contexte déjà publié. Le nouveau droit ne confère ni édition, ni gestion des délégations, ni rôle MJ/Accueil, ni publication. Les textes privés ne sont pas ajoutés au résumé du rapport.

Sauvegarder le flag, les révisions, les historiques et reçus avec l'ensemble cohérent C1b. Les exports Excel ne sauvegardent pas les droits. Le binaire C2a conserve le contrôle propriétaire seulement ; son ancien éditeur peut effacer le flag en réécrivant un grant. Ce retour retire donc une capacité, il ne constitue pas une restauration fonctionnelle de C2b. Aucun ancien reçu, export ou rapport ne doit restaurer des droits ; revalider explicitement les délégations après une reprise. Aucune migration/adoption de campagne ni restauration opérationnelle exécutée.

Les quatre Masters historiques, profils/barèmes, anciens contrats CAMPAGNE/SESSION, dépendances, workflows, règles/index Firebase et données de production sont inchangés.

## Vérifications et limites

Local : Node 24.22.1, npm 11.9.0 ; **1002 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, `npm run build` réussi. 15 nouveaux tests métier partagés avec Firestore couvrent droits, anciens clients, audit, réessai, concurrence, révocation, empreinte, isolation et cycle. Quatre nouveaux tests UI couvrent choix explicites, payload de révocation, visibilité et rapport. Un parcours HTTP/Auth émulé est ajouté pour attribution, refus des accès voisins et révocation. Ces tests ne sont pas une recette manuelle de navigateur ou mobile.

Les émulateurs ne sont pas exécutés localement (Java 17 installé ; CI Java 21). Les résultats des deux CI sur le **nouveau commit exact**, avec runs/jobs, décomptes et runtimes, sont à consigner dans la PR après leur terminaison. Ne pas leur attribuer les résultats C2a. La base CI utilise Node 22.23.3 / npm 10.9.9 / Java 21.0.12+1 et émet des avertissements connus de compatibilité Node>=24.12.0 de neuf paquets Firebase et de runtime des actions v4 ; non corrigés dans ce lot, pas de défaut fonctionnel déduit ni masqué.

Suite : validateurs complets et profil canonique, autres ateliers, gel/version immuable READY et pointeur atomique, reprise et contrôle de parent, puis raccordements I3/I4/I5. Le contrôle C2b conserve `publicationAvailable=false`. Aucun des 55 cas de recette complète n'est certifié ; essais Android/iOS, charge pilote et restauration intégrale restent à exécuter avant toute proposition de mise en service.
