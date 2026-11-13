# Interface joueur : QR, identifiants et état — 13 novembre 2026

Demande organisateur du 13 novembre : retirer le bandeau GN ENGINE, déplacer la déconnexion, afficher l’ID sous le nom, scanner dans l’application et saisie de codes équivalents, retirer le renouvellement des résumés, crédits disponibles avec raccourci, curseurs descendants, séparer Santé/Protection, retirer les consignes costume et le suffixe Recette des noms affichés.

## Réalisation

- En-tête de marque retiré de la coque principale ; compte/déconnexion dans le pied de page. Cockpit conserve sa coque spécifique. Lien Sabacc renommé « Mon personnage ».
- Identifiants publics visibles dans la coque du joueur, la fiche, le badge, les fiches vaisseau/soute, entrepôt et dock. Les dialogues QR affichent le code public.
- Scanner caméra intégré, décodage jsQR 1.4.0 inclus dans le bundle, sans service externe. Caméra arrière préférée ; fermeture, navigation, page masquée et retrait du formulaire arrêtent le flux. Refus caméra : saisie manuelle conservée. Aucune action soumise automatiquement après scan.
- Badge saisi comme ID ou lien ; lieu, installation, information, cargaison, stockage, soute, dock, intrusion, falsification et serrure accessibles depuis Action. Destination logistique manuelle typée pour éviter de confondre une soute et un entrepôt. Les contrôles métier existants restent côté serveur.
- Sabacc : scanner et code public complet `tableId.qrToken` sous le QR ; la clé de révocation reste indispensable et les politiques d’accès demeurent inchangées.
- Crédit affiché = `myWallet.account.available`, donc hors réservations ; échec de lecture affiché « — », jamais un zéro inventé. Raccourci vers le portefeuille.
- Deux curseurs dans le résumé et pages dédiées, maximum égal à l’état chargé, aucun soin possible. Nouvelle lecture avant aperçu, refus si PV/protection ont changé, puis confirmation native transactionnelle. En dégâts ordinaires, protection consommée avant les PV conformément au livre V0.7, chapitre 05. Les attaques spéciales restent dans le formulaire de dégâts existant.
- Santé et protection disposent de pages distinctes ; réparation ne soigne pas. Contrôles désactivés hors phase autorisée, à zéro PV et pendant STOP. Chronométrage de chute conservé.
- Consignes de costume retirées de la lecture joueur, données conservées. Suffixe terminal « Recette » retiré des projections d’affichage des noms, sans migration ni modification des IDs, biographies, preuves ou identités canoniques. Les contrôles d’identité fictive existants continuent d’utiliser les données canoniques ; la suppression du suffixe dans les données enregistrées reste distincte.

## Validation et limites

Base inspectée : main `dffcba417cdd6670d6057d72c9fd7b02c86a0e6b`, PR #2 fusionnée le 11 novembre. Le connecteur n’a renvoyé aucune exécution CI pour ce SHA ; ne pas lui attribuer une ancienne validation.

Compilation locale réussie. Tests ciblés : contrôles des curseurs (diminution, valeur invalide, état obsolète), codes manuels et liens (type/session/origine), affichage, décodage réel d’un QR rasterisé, code Sabacc conservant sa révocation, suites santé et protection existantes. Résultat exact du candidat consigné dans la PR.

Le lancement Chromium local échoue dans l’environnement : `socket() failed: Operation not permitted`, avant ouverture d’une page. Aucun contrôle visuel ni succès caméra sur appareil réel revendiqué. La fixture `test/ui/qr-health-preview.mjs` permet de reprendre la recette avec un flux synthétique dans un navigateur autorisé. Android/iOS (permission caméra, lecture réelle, tactile), affichage et perte réseau restent à vérifier.

Aucune migration, modification des règles métier, fusion ou publication Firebase dans cette tranche.
