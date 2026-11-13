# Essai commun, codes courts et corbeille — 13 novembre 2026

Demandes de l’organisateur : un seul essai jouable, huit profils à tester seul,
groupe commun, casino, codes personnages de trois lettres et trois chiffres,
suppression des sessions et des images, Marché réservé aux Courtiers.

## Comportement

- Le propriétaire crée/reprend « Le convoi disparu · Essai jouable ». La préparation
  utilise les commandes natives d’admission, de publication, de naissance, de
  provisionnement, de groupe et de Sabacc. Les huit kits restent canoniques.
- Le sélecteur solo ne fonctionne que pour le propriétaire authentifié d’une
  session créée par `createSoloDemo`. Les identités fictives sont propres à cet
  essai, sans compte Google ni jeton de connexion émis. Chaque requête revalide
  le propriétaire, la session, le rôle et, pour Sabacc, la table de cette session.
  Les droits métier du personnage choisi restent vérifiés par les services natifs.
- L’Équipage des Confins réunit les huit personnages (lecture du briefing et des
  membres). Une table Sabacc GN à huit places est ouverte ; aucune mise automatique.
- Dotation spécifique de démonstration : 1 000 crédits ordinaires par personnage,
  journalisés par l’ajustement MJ natif, en plus des 200 crédits protégés et du kit
  de naissance. Cet ajustement SO est autorisé uniquement pour les identités
  fictives de cette session et son propriétaire. Ce n’est pas un barème de jeu.
- Chaque personnage obtient un alias stable `ABC123`, unique dans sa session,
  attribué transactionnellement dans un index distinct. Les IDs techniques,
  anciens QR et références de jeu sont conservés. Les collisions sont vérifiées.
  Les parcours de soins, remise, paiement, partage et passagers résolvent les alias.
- Le Marché SO et ses cours/négociations sont réservés à la classe principale COU,
  interface et serveur. Les boutiques de fournitures et le portefeuille restent
  disponibles selon leurs droits existants. Les sessions hors SO sont inchangées.
- Les boutons de suppression des images ouvrent le contrôle natif des usages et
  la corbeille existante. Les images référencées restent protégées.
- La suppression d’une session/scénario est restaurable. Elle masque les lectures
  et interdit les écritures natives sur le périmètre, tout en gardant intégralement
  les versions, ressources et historiques. Une session en jeu doit être clôturée ;
  les blocages natifs (contrats, voyages, actions, survie) restent applicables.
  Les données ne sont pas purgées définitivement.
- Le retrait des anciens essais cible les huit sessions de découverte de
  Port-Brèche, après création réussie du nouvel essai. Un dialogue liste les cibles.
  Le scénario ancien « Star Wars » est également proposé à la corbeille.

## Reprise et validation

La création web conserve les étapes et la commande en attente dans le stockage de
session du navigateur, avant envoi. Un réessai conserve le requestId natif après
réponse perdue. Ne pas fermer l’onglet pendant la préparation.

Tests dédiés : création des huit classes, groupe et casino ; isolation des rôles,
refus hors session et autre compte ; reprise après réponse perdue sans double
session, personnage ou dotation ; allocation des codes, collision et révocation ;
corbeille, accès directs fermés et restauration ; refus du marché aux sept autres
classes, même avec compétence COU secondaire.

La réussite automatisée ne certifie pas une recette humaine sur Android/iOS.
La publication et les changements de données réels doivent être constatés séparément.
