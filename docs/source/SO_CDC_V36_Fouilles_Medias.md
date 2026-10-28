# SO_CDC_V36_Fouilles_Medias

Source : extension fournie par l’organisateur le 26 octobre 2026, « SO_CDC_V36_Fouilles_Medias_D12 ». Texte extrait du document DOCX ; les lignes des tableaux sont conservées dans leur ordre. V3.6 prévaut sur V3.5 pour les fouilles de lieux, trouvailles et médias.

GN ENGINE — SPACE OUTLAWS
Extension V3.6 — Fouilles de lieux, trouvailles et médias
Complément autoritaire au cahier des charges V3.5 — 26 octobre 2026 — Fouilles au D12
Statut : cette extension complète V3.5 sans rouvrir les décisions déjà validées. En cas de contradiction sur les fouilles de lieux, les types de trouvailles ou les médias, la présente V3.6 prévaut. Elle ne modifie pas les règles TRA-02 de fouille d’un personnage capturé.
1. Objectif et principe de reprise
Ajouter au parcours jouable SPACE OUTLAWS un système simple de fouille de lieux par QR, accessible à tous les joueurs, avec difficulté, jet de D12, bonus applicables et résultats transactionnels. Ajouter en parallèle une association d’images explicite aux personnages, objets, annonces et vaisseaux.
Cette extension doit être implémentée sur le socle actuel. Elle ne justifie ni nouvel audit historique, ni refonte du Master central, ni nouveau moteur de règles, ni reprise des imports XLSX déjà considérés comme suffisants.
2. Deux mécaniques de fouille à ne jamais confondre
Mécanique
Qui peut l’utiliser ?
Règle
Fouille d’un lieu
Tout personnage actif
QR du lieu → jet 1D12 + bonus admissibles → comparaison à la difficulté → trouvailles.
TRA-02 — Fouille méthodique d’un personnage
Personnage possédant TRA-02
Règle V0.7 inchangée : cible capturée/hors combat, durée selon niveau, réussite automatique, interaction avec Dissimulation.
Décision V3.6 : la fouille d’un lieu est une action universelle. TRA-02 n’est pas un prérequis pour fouiller un lieu et ne doit pas être détourné pour bloquer l’accès des autres classes.
3. Fouille universelle des lieux
3.1. Déclenchement
Chaque lieu fouillable possède un QR ou un code de secours. Après scan, tout joueur actif peut choisir « Fouiller ». Le serveur vérifie la session, l’état du lieu, les éventuelles limites de tentative et les bonus réellement applicables.
3.2. Résolution
Formule de base : 1D12 + bonus de fouille admissibles ≥ difficulté.
L’indice de difficulté de fouille est enregistré sur une échelle D12 de 1 à 12. Cette échelle augmente la granularité des seuils sans modifier les autres jets canoniques de SPACE OUTLAWS V0.7, qui restent en D6 lorsqu’ils sont définis ainsi.
La difficulté principale est définie par lieu. Une trouvaille peut, si le MJ le souhaite, posséder une difficulté propre supérieure ou inférieure ; à défaut, elle hérite de la difficulté du lieu. Le jet doit être produit et journalisé côté serveur ou validé par un arbitre authentifié si le mode terrain impose un dé physique.
Un échec ne doit jamais révéler qu’un objet, un indice ou de l’argent reste caché. Un nouveau joueur peut donc revenir plus tard et obtenir un meilleur résultat.
3.3. Bonus
Le moteur doit accepter des bonus issus de compétences, équipements ou effets explicitement autorisés par les règles publiées. Il ne doit jamais inventer un bonus à partir d’un nom d’objet ou d’une classe. Chaque bonus doit avoir une source, une valeur et une condition d’application vérifiables.
TRA-01 peut fournir des informations d’enquête préparées conformément à V0.7 ; il ne donne pas automatiquement le droit de prendre le stock d’un lieu. TRA-02 conserve sa fonction séparée sur les personnages capturés.
4. Quatre types de trouvailles
Type
Effet joueur
Reste sur le lieu ?
État/transaction
Exemple
Indice à voir
Affiche/révèle une information.
Oui
Découverte personnelle ou de groupe ; aucun retrait du contenu.
Une inscription gravée sur une caisse.
Indice à prendre
Ajoute l’indice/document au joueur ou groupe.
Non après prise
Réservation puis attribution atomique ; une seule prise si quantité 1.
Un datapad abandonné.
Objet à trouver
Ajoute une instance d’objet à l’inventaire.
Non après prise
Transfert d’une instance/quantité existante depuis le stock du lieu.
Kit médical, pièce de réparation.
Crédits à trouver
Crédite le portefeuille du joueur/groupe.
Non après prise
Débit d’une caisse/réserve réelle du lieu puis crédit atomique.
Cache de 150 Cr.
Interdiction : une fouille, un import M6 ou une publication de Master ne crée jamais de crédits ou d’objets joués ex nihilo. Les objets et crédits à trouver doivent provenir d’un stock ou d’une caisse de session réellement initialisés.
5. Comportement des découvertes
Un indice à voir peut être découvert par plusieurs joueurs et reste disponible selon sa visibilité.
Un indice à prendre, un objet ou des crédits de quantité limitée doivent être protégés contre les doubles prises concurrentes.
Le résultat d’une fouille réussie ne montre que les trouvailles auxquelles le joueur a effectivement accès.
Le MJ peut définir une disponibilité par session/épisode et réinitialiser explicitement une trouvaille lors de la préparation d’une nouvelle session.
Une trouvaille déjà prise ne réapparaît pas après reconnexion, nouveau scan, double clic ou coupure réseau.
Les secrets de scénario non révélés ne doivent jamais être envoyés au navigateur puis seulement masqués côté interface.
6. Données minimales d’un lieu et d’une trouvaille
Lieu fouillable — champs attendus :
identifiant stable du lieu ; nom public ; QR/code ; état actif/inactif ; difficulté de base ; éventuelles limites de tentative ; version de campagne/session ;
liste de trouvailles référencées ; règles de visibilité ; éventuels bonus/conditions autorisés ; historique des prises et découvertes.
Trouvaille — champs attendus :
identifiant stable ; type parmi VOIR / PRENDRE / OBJET / CREDITS ; titre et contenu affichable ;
difficulté propre facultative ; quantité/disponibilité ; cible joueur ou groupe si nécessaire ;
référence M1 pour un objet ; montant et caisse source pour des crédits ;
règles de persistance/réinitialisation ; image facultative ; audit de découverte/prise.
7. Médias et images
La médiathèque existante doit être réutilisée. Une image est stockée une seule fois et référencée par identifiant ; ne pas dupliquer les octets du fichier dans les fiches métier.
Entité
Exigence V3.6
Usage principal
Personnage
Image/portrait principal facultatif
Fiche, interactions, régie
Objet
Image principale facultative
Inventaire, boutique, découverte
Annonce
Image principale facultative
Terminal, mission, communication
Vaisseau
Image principale facultative
Fiche vaisseau, spatioport, marché
Extension recommandée sans bloquer V3.6 : le même mécanisme de média peut être réutilisé ultérieurement pour lieux, missions, boutiques et produits. Ce n’est pas un prérequis à la livraison des quatre entités ci-dessus.
8. Interface joueur
Scan du QR → fiche du lieu → bouton « Fouiller » si disponible.
Affichage clair du jet, des bonus effectivement appliqués et du résultat final, sans révéler la difficulté cachée si le MJ choisit de la masquer.
En cas de succès : cartes de découverte distinguant « Voir », « Prendre », « Objet » et « Crédits ».
Pour une ressource à prendre : confirmation serveur avant affichage comme acquise.
Après prise : inventaire/portefeuille mis à jour sans rechargement ambigu.
En cas d’échec : message neutre du type « Vous ne trouvez rien de plus » ; aucune indication du contenu restant.
9. Interface MJ / M6
Créer/éditer un lieu fouillable et sa difficulté.
Ajouter, ordonner, activer/désactiver les quatre types de trouvailles.
Référencer un objet M1 existant ou une caisse de crédits existante ; aucune création implicite par libellé.
Définir une difficulté propre facultative par trouvaille.
Voir état : disponible / découvert / pris / épuisé / réinitialisable.
Voir qui a découvert ou pris quoi, quand et dans quelle session.
Réinitialiser explicitement une trouvaille pour une nouvelle session avec audit ; jamais par simple republication.
Associer une image via médiathèque aux quatre entités V3.6.
10. Sécurité et concurrence
Jet et résolution autoritative côté serveur.
Réservation/prise atomique pour indices à prendre, objets et crédits.
Idempotence par action_id : double clic, reprise réseau ou répétition ne dupliquent rien.
Débit et crédit de monnaie dans une même opération logique avec source réelle.
Aucun secret non autorisé envoyé au client.
Droits MJ distincts pour création, réinitialisation et correction.
Audit de toute correction manuelle.
11. Critères de recette V3.6
ID
Scénario
Résultat attendu
V36-01
Joueur sans compétence scanne un lieu facile
Il peut fouiller et réussir : la fouille de lieu n’est pas réservée au Traqueur.
V36-02
Même lieu, deux joueurs avec bonus différents
Le même D12 produit des totaux différents ; seuls les bonus autorisés sont appliqués.
V36-03
Échec sur lieu contenant encore une trouvaille
Aucune information sur le contenu restant ou sa difficulté n’est divulguée.
V36-04
Indice à voir
Deux joueurs peuvent le découvrir ; il reste présent.
V36-05
Indice à prendre
Le premier le prend ; le second ne peut ni le prendre ni provoquer un doublon.
V36-06
Objet à trouver
L’instance quitte le stock du lieu et apparaît une fois dans l’inventaire.
V36-07
Crédits à trouver
La caisse du lieu est débitée et le joueur crédité atomiquement ; fonds insuffisants = refus propre.
V36-08
Deux prises simultanées sur la même ressource
Une seule réussit ; aucune duplication.
V36-09
Coupure réseau après validation serveur
La reprise affiche l’état réel sans seconde prise.
V36-10
Trouvaille avec difficulté propre
Elle peut rester cachée malgré réussite de la difficulté générale du lieu.
V36-11
TRA-02 sur personnage capturé
Le comportement V0.7 reste inchangé et distinct de la fouille d’un lieu.
V36-12
Images personnage/objet/annonce/vaisseau
Upload/sélection/remplacement/suppression de référence sans casser la fiche ni dupliquer le fichier.
12. Ordre d’implémentation recommandé
V36-A — Contrat minimal lieu/trouvaille + résolution de fouille universelle.
V36-B — Quatre types de trouvailles et transactions objet/crédits.
V36-C — Interface joueur QR → fouille → résultat.
V36-D — Interface MJ M6 pour configurer lieux et trouvailles.
V36-E — Références médias personnage/objet/annonce/vaisseau.
V36-F — Tests ciblés V36-01 à V36-12 puis CI complète au jalon.
Ne pas créer un nouveau système d’import/export XLSX uniquement pour V3.6 avant que le parcours joueur soit fonctionnel. Si le contrat M6 actuel peut transporter ces champs avec une adaptation minimale, le réutiliser ; sinon privilégier d’abord l’édition web et le modèle métier.
13. Priorité par rapport au développement courant
La V3.6 est un ajout fonctionnel du parcours jouable. Le socle Master central C2a–C2q est considéré comme suffisant. Le travail doit se faire par tranche verticale : configurer un lieu → scanner → fouiller → résoudre → attribuer → voir l’état MJ. Les améliorations de généricité, de compatibilité XLSX non nécessaires et la documentation historique détaillée passent après ce parcours.
