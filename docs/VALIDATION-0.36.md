# Validation 0.36 — Tarifs dans les masters

État : compilation locale et 648 tests applicatifs réussis ; contrôles Firebase et publication non encore confirmés.

Le lot ajoute l’onglet Tarifs aux quatre XLSX, le contrôle serveur et l’héritage des définitions dans les versions, archives et sessions. Les montants des exemples sont fictifs et désactivés. Le format du master reste 1.

Les tests partagés exécutent l’import, le réimport sans effet, les montants invalides et manquants, les bénéficiaires, le plafond de 50 règles, l’archivage, les références actives, les comptes de session, les confirmations périmées, l’héritage et le règlement utilisant un tarif importé. Ils tournent en mémoire et dans la porte de déploiement Firebase.

Les quatre classeurs sont importés et édités avec Artifact Tool, puis recalculés, inspectés et rendus. Les 22 onglets importés préexistants de chaque fichier ont été comparés au XML original : valeurs, styles, validations et volets sont inchangés ; seuls Guide, Dictionnaire et le nouvel onglet Tarifs sont concernés. Les rendus des nouveaux tableaux, du guide et du dictionnaire ont été inspectés. Leurs exemples sont également lus par le lecteur XLSX de l’app et appliqués par le moteur dans les tests.

La recette privée sur téléphone et la charge réelle à 60 joueurs restent ouvertes. Aucun scénario de production, stock ou tarif de jeu n’est ajouté automatiquement.
