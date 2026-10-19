# Audit de la première version

Date : 19 octobre 2026. Périmètre : code Sites au commit `6a12f995c5c26aaf3891cb4bbd8168e51184551e`, confronté au cahier des charges fourni et au canon Port-Brèche. Il s'agit d'une lecture du code et de tests locaux, pas d'un audit de production.

## Résultat

Le prototype fournit une base de jeu sur le terrain. Il ne couvre pas le périmètre fonctionnel complet du nouveau cahier et n'est pas directement déployable sur Firebase.

| Domaine | Observé dans le code | Écart à traiter |
|---|---|---|
| Sessions | Préparation, jeu, pause, fin ; propriétaire unique | Accueil, briefing, archivage, assistants, scénario distinct de la session |
| Personnages | Histoire, objectifs, PV, sac, compétence, faction texte | Participant/inscription/attribution séparés, relations orientées, groupes avec permissions |
| Accès | Clé privée distincte du QR public, rotation | Invitation expirante à usage unique, authentification Firebase, révocation des attributions |
| Compétences | Catalogue de 20 définitions, copies en session, usages, récupération | Coûts en consommables/crédits, délais réservés, tests et conditions, effets temporaires |
| QR | Verrou ouvert/fermé ; équipement actif/saboté ; découverte d'indice | Codes permanents contextualisés, présence confirmée, objets uniques, interventions différées |
| Santé | Dégâts mousse/gel déclarés, soins, antidote, zéro PV | Consommables, états temporaires, capture/détention séparées, retours en jeu configurables |
| Inventaire | Lots de sac et remise immédiate | Catalogue/exemplaires, propriétaire/détenteur/lieu, réservations, capacité, réception |
| Informations | Indices individuels, annonces globales, notes privées | Droits sur documents, canaux privés, connaissances partagées, programmation |
| Économie | Pas de comptes ni journal économique | Paiements, caisses communes, réservations, marché, négociation, contrats, entrepôts, douanes |
| Petites annonces | Pas de module dédié | Publication MJ, réponses privées, attribution, briefing réservé et paiement unique |
| Vaisseaux | Pas de modèle de vaisseau ou trajet | Fret, carburant, routes, interception, conséquences sur le même stock |
| Outils MJ | Corrections motivées, journal récent, arbitrages, votes | Permissions fines, dossiers de recette, chronologie de biens, clôture d'engagements |
| Import/export | Import de personnages par lots ; export JSON paginé | Master versionné, références croisées, import idempotent, sauvegarde complète, pack imprimable |

## Points structurants

1. `app/api/engine/route.ts` utilise `cloudflare:workers` et D1. Le contrôle organisateur se fonde sur l'en-tête d'identité de Sites. Ce mécanisme ne doit pas être repris comme preuve d'identité sur une URL Firebase accessible directement.
2. `db/schema.ts` contient un personnage jouable et sa clé privée dans le même ensemble. Le modèle nouveau doit séparer identité humaine, inscription et attribution, et remplacer l'accès permanent par invitation puis session authentifiée.
3. `lib/rules.ts` calcule la récupération avec l'heure réelle. Mettre une session en pause bloque les nouvelles actions mais ne fige pas ce délai. TMP-01 demande une horloge de jeu propre.
4. Les objets sont des tableaux JSON de sac. Ajouter simplement une caisse économique ou une soute sur ce format risquerait de créer plusieurs représentations concurrentes du même lot. Le stockage localisé doit précéder marché et transport.
5. La route de résolution des QR peut enregistrer une découverte hors de l'état `EN_JEU`. Les règles de briefing, de simulation et de découverte doivent être explicitées et appliquées côté service.
6. Le scan de personnage retourne une identité publique limitée. C'est une base à conserver ; les nouveaux champs secrets ne doivent pas être ajoutés puis masqués uniquement dans l'interface.
7. La V0.1 a des lots d'import de 50, pas un plafond de 50 personnages. Son test de pagination à 123 personnages ne prouve pas la tenue à 123 connexions simultanées.

## Vérifications rejouées

Le 19 octobre 2026, la suite `tests/integration.mjs` du prototype a été exécutée contre ses deux migrations SQL. Les imports TypeScript ont été retirés via `node:module.stripTypeScriptTypes` au lieu du transpileur TypeScript, indisponible dans cet environnement ; les assertions et le code métier n'ont pas été modifiés.

Résultat : 42 assertions passent (droits propriétaire, pagination, PV, duplications, soins, QR, concurrence d'interventions, transfert d'objets, arbitrage, votes, notes, versions périmées, rollback, historique et révocation).

Le nouveau noyau passe 16 tests sous Node 24.19.0, avec un stockage transactionnel simulé en mémoire. Les tests vérifient notamment deux débits concurrents de 80 sur un solde de 100, un réessai après perte de réponse, le refus d'un montant modifié sous la même référence, les fonds réservés, l'isolation de session et les projections de secrets.

Restent non vérifiés : adaptateur Firestore réel, règles déployées, serveur d'authentification, interface mobile, charge simultanée, restauration et parcours complets REC-01 à REC-10. Aucun lot A à E n'est déclaré terminé.
