# Masters de campagne et de session — format 1

GN Engine 0.23. Date : 20 octobre 2026. Ce contrat décrit les champs réellement acceptés par le moteur. Source de référence : `src/shared/master-schema.mjs` ; validation métier : `src/core/masters.mjs`.

## Commencer

Dans un **scénario**, ouvrir **Contenus et masters → Importer un master Excel**. Le master CAMPAGNE prépare le modèle réutilisable. Il ne crée pas immédiatement une campagne : après import, figer une version, puis choisir **Premier épisode d’une nouvelle campagne**.

Dans une **session en préparation**, le même panneau accepte le master SESSION et propose **Ajouter un personnage**. Le formulaire direct utilise exactement le même aperçu, les mêmes contrôles et le même journal que le fichier Excel. Seul le propriétaire dispose de ces imports ; les délégations MJ conservent leurs outils d’édition habituels. Les nouveaux personnages restent sans compte joueur attribué.

Le master de session complète l’épisode ouvert. Pour ajouter des personnages entre deux épisodes, clôturer le précédent, préparer le suivant, puis importer le complément dans sa régie. Le complément sera conservé à la clôture de cet épisode. Un import n’altère pas rétroactivement le scénario ni les épisodes archivés.

Fichiers fournis et accessibles depuis le panneau :

- `assets/masters/GN_Engine_Master_Campagne.xlsx` : modèle vierge.
- `assets/masters/GN_Engine_Master_Session.xlsx` : modèle vierge.
- `assets/masters/GN_Engine_Exemple_Campagne.xlsx` : exemple fictif avec personnage, classe, compétences, objet consommable, groupe, connaissance et dotations.
- `assets/masters/GN_Engine_Exemple_Session.xlsx` : nouveau personnage, relation et dotations, à ajouter à une session issue de l’exemple campagne.

Les exemples ne constituent pas le canon du GN. Ils servent à essayer le mécanisme. Dans l’exemple SESSION, renseigner `Meta.campaign_id` avec l’identifiant affiché dans l’écran d’import si la session appartient à une campagne.

## Lire, vérifier, appliquer

1. Renseigner les feuilles utiles dans Excel ou Google Sheets. Conserver la ligne d’en-tête. Télécharger Sheets au format **Microsoft Excel (.xlsx)**. L’application ne lit pas directement un lien Sheets.
2. Ouvrir la destination souhaitée dans GN Engine. Choisir le fichier et saisir un motif privé.
3. Le lecteur vérifie les feuilles, colonnes, cellules et limites. Le serveur contrôle les identifiants, références, publication, médias, droits et données protégées. Les erreurs portent l’onglet, la ligne et, quand elle est identifiable, la colonne ; un contrôle global du graphe est présenté comme `References`.
4. Relire les créations, modifications et archivages, avec les valeurs avant/après, ainsi que les dotations. Une erreur bloque l’ensemble du complément.
5. Cocher la confirmation puis appliquer. L’import et son journal sont enregistrés ensemble. Un état modifié après l’aperçu exige une nouvelle vérification.

La lecture du fichier et la préparation de l’aperçu ne modifient aucune donnée de jeu. Après une interruption réseau au moment de confirmer, réessayer : la même commande retrouve son résultat. Réimporter les mêmes lignes ne réapplique pas les dotations. L’historique des imports terminés se consulte dans leur destination ; le fichier source n’est pas conservé par l’application.

## Identifiants et versions

`id` est durable, distinct du nom affiché. Caractères autorisés : lettres, chiffres, tiret, soulignement ; maximum 128 caractères. L’identité d’une ligne est son onglet et son identifiant. Une ligne de membre, attribution, relation ou objectif ne peut pas changer de personnage ou de groupe après sa première importation.

Chaque ligne de contenu indique `operation` et `version` :

| Opération | Effet |
| --- | --- |
| `CREER` | L’identifiant doit être neuf, sauf réimport exactement identique déjà reconnu. |
| `MODIFIER` | L’élément existe. Seuls les champs renseignés sont modifiés. |
| `ARCHIVER` | Dépublie ou désactive l’élément, sans le supprimer. Les dépendances contrôlées peuvent bloquer l’opération. |

La version est un entier positif. Même version et même contenu : inchangé. Même version avec un contenu différent : erreur. Version plus ancienne : erreur. Nouvelle modification : augmenter la version. Une **dotation est immuable**, même avec une version supérieure ; son identifiant ne peut pas servir à un autre bénéficiaire.

Une cellule vide signifie conserver. `!EFFACER` vide explicitement un texte facultatif, une liste ou une référence effaçable. Les champs obligatoires, nombres et booléens ne deviennent pas effaçables. Une ligne absente reste inchangée. Les colonnes inconnues et les onglets non pris en charge sont refusés ; seules les feuilles explicatives `Guide` et `Dictionnaire` sont ignorées.

Les empreintes des lignes sont transmises aux versions figées et aux sessions suivantes. Les anciens imports restent consultables dans l’épisode où ils ont été appliqués. L’archive `.gnscenario.zip` conserve le contenu modèle, mais pas le journal des imports ni leur provenance : après réimport d’une telle archive, les identifiants existants empêchent toujours une seconde création ; les lignes doivent être adaptées en modifications explicites.

## Feuilles

| Feuille | Contenu et règles |
| --- | --- |
| Meta | Une ligne : format `gn-engine-master`, version du format `1`, type `CAMPAGNE` ou `SESSION`. `destination_id` et `base_revision` sont facultatifs mais vérifiés si renseignés. `campaign_id` est obligatoire pour une session de campagne. |
| Parametres | Une clé par ligne et sa valeur. Une valeur vide ne change rien. Voir les réglages ci-dessous. |
| Personnages | Identité publique, histoire, interprétation, secrets joueur, notes MJ, publication, niveau initial, maximum de PV initial, références de portraits. |
| Objets | Modèles `INDIVIDUAL` ou `STACKABLE`, consommabilité, unité, description, catégorie, volume, légalité et image. Aucun stock détenu n’est remplacé. |
| Competences | Texte immersif et instructions ; `PASSIVE`, ou soins `ACTIVE_SELF` / `ACTIVE_TARGET`. Les seules actions actives exécutables importées ici sont les soins de PV déjà présents dans le moteur. |
| Classes | Nom, description et compétences au format `skill_id:1;autre_id:2`. Une classe publiée dépend de compétences publiées. |
| Attributions | Classe et compétences du personnage, publiées ou non. En session, uniquement pour un personnage créé dans le même import. Les niveaux déjà acquis se modifient via l’outil MJ dédié. |
| Groupes | Présentation, briefing et notes MJ ; visibilité `PUBLIC` ou `SECRET`. Les caisses de groupe se configurent avec leur outil dédié. |
| Membres | Personnage, groupe, rôle et droits explicites. Les anciens messages ne sont pas distribués aux nouveaux membres. |
| Connaissances | `KNOWLEDGE`, `CLUE` ou `DOCUMENT`, texte, vérité MJ, partage `SHOW` / `COPY`, destinataires initiaux et accès QR. Les reçus existants ne sont pas réécrits par une modification du catalogue. |
| Objectifs | Une ligne par objectif d’un personnage. Les étapes détaillées restent dans l’éditeur de fiche. |
| Relations | Une ligne par relation d’un personnage, avec cible facultative ; une cible doit être un autre personnage existant ou créé dans ce même import. |
| Dotations | `CREDIT` ou `OBJET`, quantité positive et bénéficiaire créé dans le même import. En session, crée effectivement le portefeuille ou le lot initial. Dans le scénario, prépare la dotation de la future session. |

Publication des catalogues et personnages : `DRAFT`, `READY`, `PUBLISHED`. Publication des objectifs, relations et profils, ainsi que les autres booléens : `OUI` ou `NON`. Les listes d’identifiants sont séparées par `;`.

Droits de groupe : `readBriefing`, `readMembers`, `readUpdates`, `publishUpdates`, `readWallet`, `payWallet`, `representMissions`. Seuls les droits présents dans une cellule renseignée sont accordés. Une cellule vide conserve les droits, `!EFFACER` les retire.

Pour un soin : `soin_pv` positif, `usages` positif ou vide pour absence de plafond à la création, `recuperation_secondes` positif ou nul et `portee_recuperation` parmi `ACTOR`, `PATIENT`, `NONE`. Un consommable doit être publié et consommable, avec une quantité compatible. Les profils attribués restent des instantanés ; modifier le catalogue ne met pas automatiquement à jour les compétences des personnages.

Une nouvelle connaissance publiée peut distribuer ses reçus initiaux aux personnages désignés. Les destinataires initiaux d’une connaissance déjà présente en session se gèrent par l’outil MJ, afin de conserver les retraits et les versions reçues. Son archivage est bloqué tant qu’un reçu actif existe.

## Paramètres

| Clé | Valeur et portée |
| --- | --- |
| titre, resume | Textes du scénario ou de la session. Le titre est obligatoire. |
| date, horaires, lieu, infos_pratiques, confidentialite | Session uniquement. Date en texte `AAAA-MM-JJ`. La notice de confidentialité ne peut pas être effacée. |
| capacite | Session : entier positif, au moins égal au nombre d’inscrits acceptés. |
| groupes_actifs | Session : OUI ou NON. |
| pa_actifs | OUI ou NON. |
| pa_niveau_1, pa_niveau_2 | Plafonds PA entiers positifs. Les autres niveaux se configurent dans l’éditeur PA. |
| pa_renouvellement_minutes | Entier positif. Valeur de départ du moteur : 300 minutes. |
| pa_cout | Entier positif ou nul. Valeur de départ : 1. |
| pa_recuperation_secondes, pa_recuperation_patient_secondes | Entiers positifs ou nuls. Valeurs de départ : 600 secondes. |
| economie_active, monnaie_nom, monnaie_unite | Scénario uniquement : OUI/NON et libellés de la monnaie. |
| sante_active, pv_max_defaut | Scénario uniquement : OUI/NON et maximum de PV positif. Les autres règles de santé restent dans l’éditeur. |

Aucune valeur inscrite dans un modèle vierge n’active implicitement un module. Pour activer les PA pour la première fois, renseigner les plafonds ; l’exemple fourni utilise 5 au niveau 1 et 8 au niveau 2. Les règles de session ne peuvent être importées que si aucune réserve PA n’a encore été enregistrée ; sinon utiliser l’éditeur PA, qui applique ses règles de conservation. La monnaie et la santé d’une session existante se règlent toujours avec leurs outils MJ.

Le `pv_max_initiaux` d’un personnage modèle est utilisé à sa création en session lorsque le module santé est actif ; il est aussi conservé dans l’export de scénario. Le maximum propre au personnage prévaut alors sur le maximum par défaut. Cela ne soigne pas les personnages existants.

## Protections et limites

Les imports de session sont réservés à `PREPARATION`, avant le premier lancement. Aucun import direct dans une partie en cours, en pause ou clôturée. Les corrections MJ restent disponibles selon leurs propres permissions et règles.

Les champs permettant de remplacer un solde, un stock détenu, une compétence acquise, des PA consommés, un compte utilisateur ou un accès privé ne sont pas acceptés. Les références d’images doivent désigner des médias `READY` du propriétaire. Les identifiants réels des participants, invitations, mots de passe et liens de connexion ne figurent pas dans les modèles.

Limites de cette version : fichier XLSX de 8 Mio, décompression de 16 Mio, 250 lignes de données par import (Meta et Parametres compris), charge JSON de 1 Mio. Le catalogue combiné reste soumis au plafond existant de 500 fiches. Le lot de changements est limité à 420 écritures de contenu, 480 avec les index de médias et la commande, 800 Ko par document et 3 Mio de données écrites. Les publications et historiques comptent aussi. Un complément trop gros est refusé avant application ; le fractionner en ensembles cohérents, avec les dotations jointes à leurs nouveaux personnages.

Les formules, erreurs Excel, macros et liens vers des classeurs externes sont refusés. Les rendus et tests de lecture des fichiers fournis ne remplacent pas une recette dans les applications natives Excel et Google Sheets.

Restent hors de ce format : participants réels, petites annonces et leurs contrats, caisses de groupe initiales, lieux de fouille, installations, entrepôts, vaisseaux, XP, protections de combat et effets avancés d’objets. Les outils déjà disponibles pour les annonces et les caisses restent utilisables dans la régie. Les autres modules seront ajoutés à mesure de leur développement.
