# Identité, News et état après combat — 12 novembre 2026

Candidat développé sur `work/identity-news-health`, depuis la production `19b3133e7f0e52f653089c6dc671ce9f5c97fd5e`. Aucune migration ni publication de ce candidat effectuée.

## Demande et références

Décision utilisateur du 12 novembre : navigation Identité / Action / Terminal / News ; Groupe devient un accès d’Identité. Cette décision remplace les libellés historiques du CDC V3.5 §4.1. Fiche, Compétences, Sac, Information, Mission, Groupe, Santé et Protection disposent chacun d’une icône. Les modules qui ne sont pas ouverts dans une ancienne version restent fermés.

Références canoniques : `docs/source/SO_Regles_V07.txt`, chapitre 5 (touches, protection, survie), chapitre 15 (Entretien de protection : 1 PA, une plaque, 600 s de récupération, durées 120/105/90/75/60 s). Missions : CDC V3.5 §7.2, registre et financement natifs. Images : complément V3.6 §7, médiathèque et références existantes.

## Parcours livrés

- Identité ouvre les huit accès illustrés ; Groupe sort du menu principal. Anciennes URL conservées. Bandeau GN ENGINE masqué seulement dans l’espace joueur ; accès Compte conservé.
- Niveau et PA mis en évidence, PV et protection dans une barre persistante. Actualisation des valeurs toutes les 15 secondes lorsque la page est visible, sans remplacement des formulaires.
- Santé / Protection conduisent à la déclaration de touches avec boutons tactiles −/+ et aperçu serveur des deux valeurs avant confirmation. Les impacts ordinaires épuisent la protection avant les PV. Aucun compteur de récupération libre.
- Un scan de personnage expose PV/protection à l’intervenant connecté et les protocoles correspondant à ses compétences. Les soins natifs ne réparent jamais la protection.
- Correction MJ motivée, journalisée, avec contrôle des révisions ; plafond de PV canonique conservé et protection bornée à 0/1. Pas de correction pendant une intervention, après décès enregistré ou STOP. Une correction à 0 PV ouvre le délai vital si nécessaire ; elle ne réinitialise pas un délai déjà ouvert.
- News reprend le service d’annonces : transmissions sans candidature, missions libres de session, missions issues du Master, texte et illustration. Aucune duplication des registres.
- Les publications futures restent absentes des réponses joueur ; l’ouverture et la fermeture sont évaluées à l’heure serveur. Le fil ouvert se rafraîchit à l’échéance connue et au plus toutes les 15 secondes pour découvrir une nouvelle programmation. Aucun besoin de garder la régie ouverte. Un téléphone hors ligne ne reçoit pas de mise à jour instantanée.
- La régie choisit les classes admises aux missions individuelles avec sélection. La lecture publique ne dépend pas de la classe. Contrôle serveur à la candidature, à la proposition et à l’acceptation du contrat. Les anciennes audiences ciblées restent privées.
- Une mission libre peut n’avoir aucune récompense : contrat à zéro autorisé explicitement pour cette origine, avec le parcours de preuves et de validation natif. Les récompenses positives utilisent toujours une caisse PNJ et les réservations existantes. Pas de crédits créés par un texte d’annonce.

## Réparation d’armure : préparation MJ nécessaire

Dans « Soins, aide et pillage » de la régie, ajouter un protocole Entretien de protection. Le MJ associe explicitement l’objet d’armure ordinaire et la plaque consommable déjà présents dans la version de session. Les noms d’objets ne sont jamais utilisés pour deviner la compatibilité. Cela ajoute une configuration de session journalisée sans modifier le Master publié.

Le joueur intervenant doit posséder `ENTRETIEN_PROTECTION` ; le personnage cible doit être actif et porter l’objet compatible dans son sac. Une protection déjà pleine est refusée. Le moteur d’interactions existant réserve 1 PA et une plaque, verrouille les participants, contrôle la durée et les droits à la fin, restaure uniquement la protection et applique 10 minutes de récupération. Annulation : restitution des ressources encore réservées. Réessai : aucune double consommation.

Le métier Mécano seul ne donne pas Entretien de protection. Les réparations de protection des boucliers personnels et de blindage DR-01 ne sont **pas ajoutées** : les profils d’équipement/module et leurs fournitures spécifiques ne sont pas raccordés dans cette tranche. MEC-02 continue à réparer les PV des droïdes selon son protocole existant. Ne pas confondre ces effets.

## Vérifications

- Compilation : `npm run build`.
- Suite applicative complète : `npm test` — 2 868 réussites, aucun échec.
- Six parcours partagés mémoire / Firestore : publication différée et confidentialité ; classes à candidature/acceptation ; mission libre sans récompense et règlement ; correction/soin/QR et protection ; durée/coût/réessai de réparation ; annulation et refus sans compétence ou référence valide.
- Firebase local : `GN_FIRESTORE_SUITES='["identity-news-health"]' npm run test:emulator:firestore` — six réussites. Aucun appel de mutation sur la production.
- Recette visuelle Android/iOS et CI du commit candidat distinctes de ces preuves locales ; à effectuer avant publication.

## Ajustements avant publication — 12 novembre 2026

À la demande de Guillaume : en-tête joueur avec nom complet en grand et métier public en dessous ; retrait du titre et du statut de session de cet en-tête. Les cartes du Terminal expliquent en italique leur usage, les choix et confirmations, sans codes de compétence ni vocabulaire interne.

Une capacité de soute nulle supprime le lien depuis la navigation du vaisseau et la liste des soutes. Le serveur Space Outlaws exclut cette soute de myCargo et refuse shipHold ; le dépôt et la sélection comme destination restent refusés. Les vaisseaux de capacité positive restent accessibles. Aucun changement de capacité, de stock ou de propriété en production.

Validation locale des ajustements : 81 tests ciblés réussis (player-spaces, player-capabilities, space-outlaws-voyages-ui, cargo-ui, space-logistics), puis compilation réussie. Ce résultat ne vaut pas résultat CI du candidat complet ni recette sur téléphone réel. Publication explicitement autorisée après les corrections.
