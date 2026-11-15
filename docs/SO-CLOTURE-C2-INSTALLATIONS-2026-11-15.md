# C2.4 — Pannes durables d’installations

15 novembre 2026. Sources : [CDC de clôture V1, section 3](source/SO_CDC_Competences_Cloture_V1.md), [règles V0.7, MEC-02 et chapitre 15](source/SO_Regles_V07.txt). Branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45), complément après `e05d2373c22f3118bae5de4c26ef849353115bb7`.

La régie prépare les conditions d’une panne durable sur une installation M6 publiée : niveau MEC-02 annoncé, seuil et modèle de pièces compatibles. Aucun niveau ni seuil n’est déduit du sabotage. Le profil ordinaire reste fixé à cinq minutes, 1 PA et deux pièces consommées au jet, succès ou échec, avec récupération de dix minutes. Les conditions avancées non définies ne sont pas inventées.

L’incident durable est une commande MJ avec motif et révision courante. Il possède son identité de panne ; son état ne partage pas le délai d’une neutralisation. L’installation peut donc subir les deux états simultanément. Le serveur, les interfaces et le diagnostic distinguent « réparer la panne durable » et « remettre en service après sabotage ».

Les actions réutilisent les réservations, le jet, les bonus, l’aide compétente, les reçus et les annulations de `field-actions`. Une réparation durable échouée dépense ses ressources et laisse la panne intacte ; aucun verrou de sabotage supplémentaire n’est ajouté. Une réparation réussie ne supprime pas le sabotage temporaire. La levée ou l’expiration du sabotage ne répare pas la panne durable. La protection temporaire est toujours calculée depuis la véritable fin du sabotage, pas depuis une consultation tardive.

Le résultat ne rend aucun PV ni point de protection. Une modification des conditions pendant l’action invalide la résolution. L’interruption restitue les ressources réservées ; le MJ peut l’effectuer après révocation du joueur. Les conditions, la panne et les historiques suivent l’épisode suivant. `installationRepairVersion=1` ne concerne que les nouvelles publications ; aucun Master ou session historique n’est migré.

Le diagnostic C1 utilise le même profil : cinq minutes et deux pièces pour la panne, trois minutes sans pièces pour la neutralisation temporaire. Sa relecture reste datée. Les données privées de l’incident ne sont pas exposées par le scan.

## Validation

- Sept cas métier mémoire et Firestore émulé réussis : succès, échec payé, récupération, coexistence dans les deux ordres, expiration, version périmée, concurrence, révocation, annulation, épisode et raccord du diagnostic.
- Un HTTP/Auth réussi : 401/403, échec consommant deux pièces, réparation suivante, confirmation répétée sans double dépense et refus après révocation.
- 59 tests ciblés de régression réussis : installation, terrain, diagnostic, toxicologie, traces, épisodes et HTML. Le renforcement final de contrôle de capacité avant retour de reçu est revérifié sur le cas Firestore de droits/version.
- Compilation et contrôle du diff. Aucun navigateur local ni appareil réel validé.

Le complément inclut la correction des deux fixtures UI signalées par la CI du parent : valeurs de pièces de 50 Cr explicitement renseignées, assertion négative sur les pièces de 25 Cr, 64 tests logistique/modules/UI réussis. La CI historique 43725283024 reste en échec ; la nouvelle CI doit être vérifiée sur le nouveau SHA.

La clôture générale reste partielle : modules déposés et prestations PNJ droïdes, rares/prototypes C3, sabotages N3–N5 C4, intrusions C5 et négociations C6. Ni fusion, déploiement Firebase, migration ni modification de permissions.
