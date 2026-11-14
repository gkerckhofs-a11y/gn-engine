# Transport entre joueurs — tranche 4, 14 novembre 2026

Auteur : Codex. Sources : [demande unifiée de Guillaume, §7 et plan de développement](source/SO_Galactic_Economy_V1.md), [règles V0.7, chapitre 25](source/SO_Regles_V07.txt), chapitres 18 et 23–24 pour le voyage, les marchandises et les douanes. Le livre des règles n’est pas modifié.

## Base, audit et portée

Branche `work/commercial-transport`, base de PR `work/galactic-map` ([#40](https://github.com/gkerckhofs-a11y/gn-engine/pull/40)), SHA `e1f87539f941d706cedf8fe6bab1a7d9b0648e3e`, arbre `4fde9f9937c72e724378d480f5438b6e180fdb56`. CI de cette base : [43613904093](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43613904093), réussie. Cette preuve ne vaut pas validation du nouveau commit. `main` observé : `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`. PR #2 et #15 fusionnées ; #35 à #40 ouvertes et cumulées ; #3 reste un audit Firebase distinct.

Cette tranche raccorde une cargaison **déjà retirée physiquement**, appartenant à un Courtier, à une offre volontaire de transport. Le client publie sa demande, le transporteur saisit les codes des tronçons connus, propose vaisseau, salaire, délai et frais. Les deux parties peuvent négocier à tour de rôle. Le client choisit une offre ; le transporteur relit et signe ensuite le contrat natif.

La publication et la négociation ne débitent et ne déplacent rien. La signature réserve ensemble le salaire sur les crédits ordinaires du client et la quantité exacte de fret. Les crédits initiaux protégés ne peuvent pas financer ce salaire. Le fret garde son propriétaire. Chargement, voyage, escales et remise au port empruntent leurs services existants ; une déclaration seule ne vaut pas livraison. Validation MJ, dix minutes de contestation, règlement de la part non contestée, médiation et arbitrage restent ceux du moteur de contrats.

L’autorisation Firebase de Guillaume porte sur la publication **une fois tous les chantiers finalisés**. La logistique commerciale intégrée et la recette finale restent ouvertes : condition non remplie. Aucun déploiement, fusion, migration, changement de règle Firebase ou réactivation du pipeline de production dans cette tranche.

## Réutilisation et fichiers

| Fonction | Contrôleur réutilisé | Raccord limité |
|---|---|---|
| Demandes, offres, messages | Collections `announcements`, `applications`, leurs historiques | `commercial-transport.mjs` : demande commerciale, propositions privées et accord du client ; exclusion du flux de missions générique |
| Vaisseau et permissions | `ship-crew-state.mjs`, `inventoryPlayer`, `inventoryParty` | `commercial-transport-state.mjs` : droit opérationnel courant et pilote désigné qualifié ; aucune compétence conférée |
| Salaire, réservations, contrat | `contracts.mjs`, `space-outlaws-mission-state.mjs`, comptes et reçus natifs | Constructeur de proposition partagé ; source CHARACTER strictement liée au client pour le seul contrat commercial marqué |
| Fret confié et restitution | `space-transport.mjs`, `cargo.mjs` | Origine COMMERCIAL exacte, garde contractuelle sans transfert de propriété, restitution au lot source même si son reliquat a été vendu |
| Voyage et escales | `space-outlaws-voyages.mjs`, `soRoute`, plan multi-tronçons natif | Codes saisis, contrôle de la chaîne orientée, progression et preuve réelles ; barèmes et moteur de vol inchangés |
| Capacité | `warehouseStock`, `stockVolume`, contrats existants | Prise en compte des cargaisons déjà réservées avant chargement ; refus de surengagement |
| Continuité | Copie native des épisodes, identités et comptes | Même contrat, salaire réservé, propriétaire, historique et fret au nouvel épisode |
| Interface | Terminal, dashboard, fiche de contrat et cargo existants | `web/commercial-transport.mjs`, routes `#/freight/SESSION[/DEMANDE]` et `#/freight-admin/SESSION[/DEMANDE]`, confirmations chiffrées |

Le dispatch passe par `workflow.mjs` ; `web/app.mjs` relie les formulaires aux contrôleurs. Les entrées du Terminal, de la régie et des marchés utilisent les mêmes projections autorisées. `web/contracts.mjs` précise l’attente de la signature du transporteur ; `web/space-transport.mjs` adapte les liens selon la partie. `player-spaces.mjs` conserve le retour au Terminal. Les anciennes URL restent compatibles.

## Droits et confidentialité

| Identité | Lecture | Écriture |
|---|---|---|
| Courtier client actif | Ses lots reçus, ses demandes, toutes les offres qui lui sont adressées, son contrat | Demande, contre-proposition, choix de l’offre, fermeture sans contrat engagé, lecture explicite, contestation et recours natifs |
| Transporteur autorisé | Demandes ouvertes, ses offres et son contrat | Offre avec vaisseau autorisé, signature native, preuve et opérations permises ; pas d’accès au reste du stock ou des comptes du client |
| Propriétaire du vaisseau | Ses droits opérationnels existants | Peut porter l’offre ; un pilote désigné qualifié reste nécessaire, même si le propriétaire ne pilote pas |
| Capitaine distinct | Selon son mandat actuel | Offre seulement avec autorité logistique explicite ; aucune propriété ni compétence créée |
| Pilote d’un groupe | Vaisseau collectif selon mandat de groupe | Le mandat `pilotShip` seul ne suffit pas au contrat : autorité d’équipage logistique requise ; identité secrète du groupe absente du contrat client |
| Autre équipier / joueur | Aucune offre privée d’un autre transporteur, aucun fret privé sans mandat | Aucun droit accordé par le lien de demande, contrat, lot ou vaisseau |
| MJ / organisateur habilité | Tableau et négociations en supervision ; contrats et historiques natifs | Arbitrages et contrôles de contrat existants ; la nouvelle page de demandes n’usurpe pas le consentement d’un joueur |

Le client ne peut ni signer pour le transporteur, ni remettre sa preuve, ni se verser le salaire, ni utiliser les opérations cargo du transporteur. Les états « lus » du client et du transporteur sont distincts. Les offres concurrentes ne sont visibles qu’au client et à la régie ; chaque transporteur ne lit que les siennes. Aucune URL ne contient de droit privé. Les identités, versions et autorisations sont recontrôlées avant les reçus idempotents. Le client ne reçoit pas l’occupation des autres cargaisons du vaisseau. Le contrat commercial ne révèle que les codes explicitement transmis dans l’offre acceptée, jamais un nouveau code de port ou de route de secours.

La révocation d’équipage ne détruit ni contrat, ni réserve, ni biens. Elle interdit les nouveaux actes relevant du poste. Une tranche de manutention déjà verrouillée peut être terminée par son opérateur conformément aux contrôles natifs ; une préparation ou un vol engagé reste cohérent. Les droits contractuels historiques restent séparés des droits d’équipage. Toute nouvelle préparation exige les mandats actuels, la même propriété du vaisseau et le pilote prévu ; un changement structurel impose un nouvel accord ou un traitement MJ, sans réécriture rétroactive.

## Validation

Les tests applicatifs dédiés sont `test/commercial-transport.test.mjs` (21 cas métier) et `test/commercial-transport-ui.test.mjs` (2 cas de rendu). La même suite métier est enregistrée dans le registre Firestore officiel ; aucun profil CI ou seuil de sélection n’est contourné.

Cas couverts : double consentement, salaires et marchandises inchangés avant signature, argent protégé refusé, voyage/réception/paiement natifs, négociation privée, codes inconnus et données injectées refusés, confirmations périmées, signatures et choix concurrents, réessai après interruption, capacité déjà engagée, annulation/restitution, propriétaire/pilote/capitaine distincts, groupe secret, pause/STOP/révocation, révocation pendant manutention et vol, deux tronçons avec escale sans livraison anticipée, reprise d’épisode, lectures distinctes, contestation partielle et arbitrage.

Commandes locales :

```sh
npm run build
node --test test/commercial-transport.test.mjs test/commercial-transport-ui.test.mjs
node --test test/contracts.test.mjs test/space-transport.test.mjs test/ship-crew-cargo.test.mjs test/space-episodes.test.mjs test/space-group-pilot.test.mjs test/planet-markets.test.mjs test/planet-markets-ui.test.mjs test/galactic-map.test.mjs test/galactic-map-ui.test.mjs test/player-terminal.test.mjs
```

La compilation et les 23 tests dédiés réussissent. Le lot adjacent ci-dessus réussit : 105 tests. Le lot complémentaire contrats/UI, équipages, recours, parties de mission et navigation du joueur réussit : 129 tests. Le dernier contrôle de confidentialité réussit également : 49 tests transport/cargo/rendu ; les recouvrements ne sont pas additionnés. Les 21 cas métier ont aussi réussi sur Firestore isolé. Une première exécution élargie a été interrompue avant conclusion et n’est pas comptée comme une validation complète. Les résultats HTTP et CI du commit final sont consignés dans la PR. `node --check` et `git diff --check` sont requis avant envoi.

Le test HTTP/Auth ajouté vérifie l’accès anonyme et extérieur, le refus de supervision au joueur, l’accord des deux comptes, les réservations, le réessai et le refus après révocation avec conservation de la créance. Les émulateurs utilisent exclusivement `demo-gn-engine`.

Deux tests navigateur sont intégrés au parcours CI existant : entrées réelles sans lot reçu dans l’application locale et supervision, puis rendu mobile/PC des offres et récapitulatifs issus d’une fixture métier mémoire, navigation clavier et absence de mutation par consultation. Ce second test est un contrôle de rendu, **pas** une preuve d’achat et de paiement de bout en bout via l’application authentifiée. Pas de crédits gratuits ajoutés au kit de recette pour le rendre artificiellement solvable. Les tests automatiques ne remplacent pas une recette humaine Android/iOS ou un GN réel.

## Limites et suite

- Achat distant encore au comptoir : délégation de son retrait, garde du transporteur et remise commerciale au client à raccorder dans la tranche 5.
- La livraison produit la garde PORT native. Elle ne transforme pas automatiquement le fret en stock revendable du client ; l’entrée commerciale locale et le dédouanement restent à intégrer. La revente importée reste bloquée par les marchés actuels.
- Un contrat porte un lot, avec quantité partielle possible ; plusieurs lots nécessitent plusieurs demandes. Un itinéraire peut contenir jusqu’à douze codes connus et exige le support natif des plans à escales. Aucun trajet secret, stock de carburant d’escale ou assurance n’est créé.
- L’interface estime la consommation native ; sur vaisseau collectif, le minimum de carburant au départ inclut l’unité de sécurité supplémentaire sans la compter comme une consommation automatique.
- Les entrepôts spéculatifs, taxation d’importation, livraison issue d’un achat distant, informations économiques payantes, actualités et recette intégrée finale restent des travaux distincts. Aucun parcours partiel n’est présenté comme publication finale prête pour un GN réel.
