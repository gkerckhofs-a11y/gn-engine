# Entrepôts commerciaux — 15 novembre 2026

Auteur : Codex. Sources : cahier unifié de Guillaume §§11.1–11.3, `docs/source/SO_Galactic_Economy_V1.md`, et logistique native existante. Les frais sont des paramètres explicites du MJ ; aucun tarif n'est inventé.

## Base et parcours

Branche `work/commercial-storage`, base PR #42 corrigée : `b6e1ef0d4efb5aee030e6a1e2f3dd56a16b3e7a0`, arbre `110f4a8ac078f78ca58745cd03bfea95a1d517f1`. La CI du parent est en cours lors de la préparation ; pas de succès global revendiqué. Son correctif conserve les chargements à quai pendant la coordination d'une escorte, avec 66 tests ciblés réussis après deux régressions détectées par la CI intermédiaire. `main` et les PR #35–#41 ne sont pas fusionnés par ce travail.

La régie dispose d'un outil **Entrepôts commerciaux**, distinct des stocks de groupe. Un entrepôt appartient à un port ayant un marché préparé. Le MJ renseigne le nom, la description, la capacité, le loyer, la durée d'une période et, éventuellement, la caisse recevant le paiement. Le formulaire ne préremplit aucun tarif. Zéro crédit est possible uniquement si le MJ le configure explicitement. La planète d'un entrepôt existant ne change pas lors d'une modification.

Le personnage consulte les entrepôts disponibles depuis la Bourse et loue une place avec son compte ou une caisse autorisée. Le bail est personnel ; le compte qui finance le loyer est un choix distinct, conformément au moteur de location existant et au récapitulatif affiché. Cela ne transfère pas les biens au groupe qui paie. Le rôle ou la classe ne confèrent aucun droit sur le stock d'un autre locataire.

Les marchandises doivent être disponibles dans le stock commercial du **même port**, issues d'un achat local traçable ou d'une importation avec quittance. Les lots sous contrat, réservation, garde d'abordage, dissimulation ou retenue douanière restent refusés. Les objets personnels ne passent pas par cet outil.

Un dépôt ou retrait réutilise le mouvement natif de stock : capacité et arrivées déjà réservées vérifiées, quantité finie, filiation et propriétaire conservés. Le retrait revient dans le stock COMMERCIAL de ce même port, jamais dans le sac. Le propriétaire peut ensuite préparer sa vente ou son transport par les parcours existants. Attendre un changement de prix n'effectue aucune transaction automatique.

## Moteur et permissions

- `src/core/commercial-storage.mjs` adapte des noms d'actions au **même `createLogisticsService`**, avec un mode serveur explicite ; aucun deuxième moteur d'entrepôt, de monnaie ou de durée.
- `src/core/logistics.mjs` conserve le calcul de location, les paiements, les révisions, les mouvements, les capacités, les échéances et la restitution existants. Le mode commercial sélectionne seulement des entrepôts commerciaux et des lots du port concerné. Les routes de stock de groupe gardent leur mode antérieur et ne deviennent pas une porte d'accès au commerce.
- La capacité serveur `COMMERCIAL_STORAGE` est bornée aux entrepôts, inventaires et historiques, comptes, journal monétaire et historique logistique natifs. Elle exige les extensions de circuits d'objets et de logistique de la session. Le client ne peut pas fournir cette capacité.
- Les droits MJ existants contrôlent la configuration. Les actions du locataire exigent son inscription et ses droits actuels. Un paiement collectif exige réellement `payWallet` sur la caisse, sans conférer le droit de lire son solde ; aucun nom de groupe secret n'est ajouté au récapitulatif du loyer.
- Les biens d'un locataire restent privés. Un autre personnage peut consulter l'offre de location et son occupation, mais reçoit un stock vide et aucun volume utilisé ni identité privée du locataire.
- Loyer, période, révision de l'entrepôt, compte et droits sont liés à la confirmation. Une modification du tarif impose une nouvelle vérification ; un réessai ne paie pas deux fois.
- Une location expirée conserve les biens et autorise le retrait. Fermer l'entrepôt ne confisque rien et n'empêche pas les retraits. La restitution exige un entrepôt vide et ne rembourse pas implicitement le temps non utilisé. Le temps payé s'arrête pendant les pauses, selon le moteur de jeu existant.
- STOP, clôture et révocation sont recontrôlés ; les crédits initiaux protégés ne paient pas le loyer. Les stocks, propriétaire, port et durée payée sont conservés par la reprise native des épisodes.

Aucune règle Firestore, permission Google, donnée réelle ou version de Master publiée n'est modifiée.

## Interface et contrôles

Routes nouvelles : `#/commercial-storage/SESSION[/ENTREPOT]` et `#/commercial-storage-admin/SESSION`. Elles n'accordent aucun droit. Les anciennes routes d'entrepôt et de groupe restent inchangées. Retour permanent au Terminal ou à la régie, liens depuis la Bourse, noms des ports, états du bail, capacité et récapitulatifs chiffrés. Les descriptions sont échappées ; les confirmations de loyer et de mouvement exigent un consentement explicite.

Les messages de Bourse sont actualisés : une marchandise importée avec sa quittance n'est plus présentée comme systématiquement invendable. L'absence d'une preuve valable pour le port reste une cause de refus réelle, sans annoncer un dédouanement automatique.

## Validation

Neuf cas métier dédiés, un cas de rendu, tests natifs de location, stocks de groupe et caisses : succès, refus, capacité, expiration, fermeture, mauvais port, biens personnels, mutation de planète refusée, réessai, STOP/révocation, financement collectif, argent protégé, devis périmé, concurrence entre locataires et reprise d'épisode.

La même suite est enregistrée dans `test/support/firestore-suites.mjs`. Les neuf cas Firestore dédiés ont réussi sur `demo-gn-engine`. Un cas HTTP/Auth dédié a réussi : location payée, dépôt, confidentialité du stock, retrait sans téléportation et refus après révocation.

La recette Chromium ajoutée utilise l'application authentifiée et les émulateurs : configuration MJ à 1440 px, refus financier avec loyer positif, puis location à zéro explicitement configurée par le MJ de recette, confirmation au clavier et affichage à 390 px. Aucun crédit gratuit n'est ajouté au kit pour rendre le personnage solvable. Ce parcours de bail ne prétend pas être une recette humaine ou un test de dépôt via l'application authentifiée ; le dépôt est vérifié en HTTP et par la suite métier.

Compilation, syntaxe et tests ciblés sont consignés avec le SHA et les résultats CI exacts dans la PR. Les recouvrements de sélections ne sont pas additionnés.

## Suite et limites

Ce service est un stockage commercial ordinaire, **pas un entrepôt sous douane**. Les marchandises doivent déjà disposer de leur provenance régulière au port. Les stocks de groupe continuent à utiliser leurs mandats et transferts de propriété explicites, distincts du bail personnel financé par une caisse.

Le paiement des achats commerciaux par caisse, la remise COU-02 indexée et les raccords d'événements/News sont les compléments suivants. Aucune fusion ni publication dans cette tranche ; la publication Firebase autorisée par Guillaume reste conditionnée à la fin des chantiers et aux validations d'ensemble.
