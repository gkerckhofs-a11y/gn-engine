# Terminal personnel — 13 novembre 2026

Demande et autorisation : pièce jointe « Refonte du Terminal » et instruction de Guillaume de publier toutes les modifications après réalisation. Base : `8e2c1d85affda10a0141c9945a286a16b1a4ac74` (PR #13), intégrant les PR #10–12 et l’interface organisateur PC. Main inspectée : `dffcba417cdd6670d6057d72c9fd7b02c86a0e6b`. PR #2 fusionnée ; PR #10–13 ouvertes à la reprise.

Sources : règles V0.7 du 23 octobre 2026 (`docs/source/SO_Regles_V07.txt`), classes/secondaires et chapitres navigation, commerce et douanes ; CDC V3.5 §4/7 ; matrice et audit global. La nouvelle exclusivité de classe des primes est une décision explicite du propriétaire, appliquée uniquement au mode spécialisé OPEN_BOUNTY des sessions SO.

## Matrice des services

| Ancienne rubrique | Fonction / route et lecture native | Condition effective | Nouvelle rubrique | Sans accès / indisponibilité |
|---|---|---|---|---|
| Boutiques du port | `shops`, lecture `shops` | Boutique ou commande retournée par le serveur | Services du port / Boutiques | Masquée sans comptoir ni commande |
| Mes crédits | `wallet`, `myWallet` | Économie activée, portefeuille personnel | Services du port / Mes crédits | Masquée si économie éteinte |
| Marché (absent du Terminal SO) | `market` | Économie activée et lecture native réussie | Services du port / Marché | Aucun monopole de classe |
| Missions proposées | `missions`, `announcements` | Audience native et offres accessibles | Services du port / Missions proposées | Masquée si aucune offre ; restrictions natives de candidature conservées |
| Mes missions | `contracts`, `myContracts` | Contrat personnel ou collectif retourné par les contrôles de conservation | Services du port / Mes contrats | Historique conservé, aucune appartenance ne suffit |
| Réseau d’informateurs | `intelligence`, `myIntelligence` | Offre destinée au personnage ou achat conservé | Services du port / Réseau d’informateurs | Masqué sans dossier |
| Sabacc | `/sabacc/`, `sabaccHome` | Module global activé | Services du port / Sabacc — Cantina | Masqué si désactivé ; accès à une table vérifié par Sabacc |
| Registre | `directory`, permission `mySession.directoryAllowed` | Classes habilitées par le MJ, état courant | Services du port / Registre des identités | Masqué sans habilitation |
| Primes ouvertes | `bounties`, `bountyDetail`, `prepareBountyClaim`, `submitBountyClaim` | Classe principale TRA, modules et audience natifs | Services spécialisés / Primes ouvertes | Invisible et endpoints refusés aux autres classes, TRA secondaire insuffisant |
| Mes vaisseaux et vols | `spaceport`, `mySpaceport` | Propriété, mandat ou consultation/passager autorisé par le service | Biens et mandats / Mes vaisseaux et vols | Masqué sans vaisseau ni invitation ; aucun ordre de pilote créé |
| Soutes et fret | `cargo`, `myCargo` | Soute ou transfert accessible par droits natifs | Biens et mandats / Soutes et fret | Pas de contenu de soute dans le menu ; `shipHold` conserve le contrôle de lecture |
| Entretien des vaisseaux | `space-maintenance`, `spaceMaintenance` | Intervention concernant propriétaire, payeur ou technicien | Biens et mandats / Entretien | Masqué sans intervention ; commandes métier existantes uniquement |
| Travaux de modules | `module-mandates`, `moduleMandates` | Mandat retourné par les contrôles natifs | Biens et mandats / Travaux de modules | Aucun pouvoir MEC reçu par propriété |
| Mes attelages | `towing`, `towingDesk` | Travail ou récupération autorisé | Biens et mandats / Mes attelages | Masqué sans dossier, droits techniques conservés |
| Rencontres spatiales | `space-combats`, `spaceCombats` | Rencontre ou embuscade visible | Biens et mandats / Rencontres | Masquée sans dossier ; commandes pilotes inchangées |
| Assistance spatiale | `space-rescues`, `spaceRescues` | Offre au pilote concerné | Biens et mandats / Assistance | Masquée sans offre ; pas de demande fictive |
| Mes accords douaniers | `customs-consents`, `myCustomsConsents` | Lot réglementé/vaisseau éligible ou consentement antérieur | Biens et mandats / Autorisations de transport | Masquée sans bien ni consentement concerné |
| Contrôle douanier (via fret) | `customs`, `customsDesk` | Habilitation organisation de niveau ≥1, indépendante de classe/XP | Services spécialisés / Contrôle douanier | Aucun droit automatique COU ou TRA-03 |
| Reçus et recours douaniers | `customs-receipts`, `myCustomsSeizures` puis `myCustomsAppeals` | Reçu appartenant au personnage, autorisations natives de conservation | Biens et mandats / Mes dossiers douaniers | Historique des restitutions conservé |
| Caisses de groupe | `accounts/.../groups`, `myAccounts` | Permission de lecture/paiement et compte renvoyé par le serveur | Biens et mandats / Caisses de groupe | Appartenance seule insuffisante |

## Portée et écarts constatés

- Le menu utilise les projections **joueur** existantes, sans lire un catalogue privé pour le filtrer dans le navigateur. Il est recalculé à chaque navigation/personnage/session. Une réponse tardive ne remplace pas la page courante. Les erreurs inattendues de chargement sont signalées, pas assimilées à une absence de droits.
- Trois ensembles visuels, cartes tactiles ouvrant les routes existantes, dossiers actifs en premier. Les captures Chromium du parcours Action ont été inspectées : les grands curseurs restent sur la fiche et les pages dédiées, les résumés PV/Protection restent accessibles ailleurs ; la navigation fixe ne chevauche plus le résumé. Les dossiers terminés restent accessibles en historique ; pause et STOP sont expliqués sans bloquer la consultation légitime. Les contrôleurs natifs vérifient les conditions particulières, PA, ressources, mandat et état de chaque opération.
- Les primes spécialisées sont aussi filtrées dans les annonces SO et refusées sur les endpoints de consultation/participation. Les fonctions MJ et les contrats déjà attribués restent accessibles selon leurs droits. Aucune suppression de données, modification de classe réelle, ou restriction des contrats ordinaires, escortes et récupérations.
- COU-01/02/03 n’ont pas de parcours de service marchand spécialisé raccordé dans les modules examinés. Les commerces généraux restent ouverts aux autres classes. Aucun bouton fictif d’expertise ou de réseau commercial ajouté.
- « Commerce et licences » n’est pas présenté comme un guichet exploitable : le module douanier existant offre des estimations et procédures préparatoires, pas un portefeuille joueur de licences délivrées. Les consentements, contrôles, saisies, recours et restitutions existants sont conservés séparément.
- Les devis d’entretien, de modules et de dépannage sont proposés par l’organisation dans l’implémentation actuelle ; le joueur reçoit, approuve, réalise ou suit selon ses droits. Cette refonte ne crée pas une demande autonome ni un nouveau droit technique. Les compétences seules ne produisent pas de carte vide sans intervention.

## Vérification

171 tests ciblés locaux réussis (96 menus/primes/UI et 75 sécurité/non-régression des caisses, mandats de pilotage, fret, saisies et recours) : menus et changements de contexte, classes, services, anciens UI, exclusivité serveur des primes, annonce, accès direct, contrat antérieur conservé. Build et syntaxe réussis. Fixtures de primes explicitement Traqueur ; test HTTP enrichi avec refus des quatre endpoints pour un autre personnage avant activation du profil Traqueur de test.

Recette navigateur ajoutée : 390 × 844, cartes accessibles, absence de primes/douanes pour un médecin, absence de débordement, route directe des primes refusée HTTP 403. Résultat effectif à suivre dans la CI sur le SHA exact ; aucune recette physique Android/iOS certifiée.

La publication doit passer par le workflow Firebase existant, après CI complète du commit main exact. L’autorisation de publication ne modifie ni secrets, ni permissions d’infrastructure, ni données de session.
