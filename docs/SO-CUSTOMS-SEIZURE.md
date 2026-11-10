# Space Outlaws — saisie formelle, quittance et inventaire officiel fictif

Date : 10 novembre 2026. Référence canonique : `docs/source/SO_Regles_V07.txt` chapitre 24 (retenue 15 minutes, décisions autorisées, inventaire officiel, quittance) et cahier des charges V3.5 §7.3.

## Tranche de développement

- Ce parcours utilise une **retenue provisoire déjà ouverte** et la capacité `customsDetentionVersion=1` des nouvelles versions Space Outlaws. Les sessions plus anciennes restent inchangées.
- La saisie n'est possible que **avant** l'échéance de 15 minutes réelles. Une retenue échue reste échue et doit être levée ; aucune saisie rétroactive n'est autorisée.
- Pour cette première version, la saisie est limitée au cas `REGULATED_NO_LICENSE` avec **régularisation échouée** attestée. Le MJ, et lui seul, renseigne la décision motivée, confirme son autorisation et la consignation matérielle dans la réserve officielle de jeu. Pas de saisie automatique à l'issue des 15 minutes.
- Le même lot conserve son identifiant, sa description, sa quantité, sa propriété d'origine et son registre de fabrication INF-03 éventuel. Son détenteur et son emplacement deviennent `CUSTOMS_OFFICIAL`, son statut `SEIZED`. Le joueur ne peut plus le transférer ou le voler par les voies `AVAILABLE`.
- Un enregistrement `customsSeizures` et une entrée `customsOfficialInventory` sont créés atomiquement avec le changement du lot et la clôture de la retenue. Aucune duplication de lot, aucune création de crédit.
- Une quittance numérique unique (référence de reçu, nom du bien, quantité, date, statut et motif public) est accessible au propriétaire via « Mes quittances douanières ». Les notes privées, anomalies de faux INF-03 et identifiants MJ ne sont pas dans la projection joueur.
- Historique de lot `SO_CUSTOMS_SEIZED` et registre MJ de saisie. Seules les personnes ayant la permission de contenu de session peuvent consulter les motifs privés et déclencher cette décision.

## Limites assumées

- Le lot saisi n'est **pas rendu automatiquement** au joueur : une restitution après saisie formelle, un recours, une confiscation définitive ou un transfert de titre nécessitent une procédure séparée. Cette tranche n'exécute aucune confiscation légale réelle, aucune amende et aucun mouvement sur des personnes.
- Ne couvre pas encore une saisie de marchandise dans une soute, un entrepôt, un conteneur verrouillé ou le coffre sécurisé : les mandats et les permissions d'accès sont distincts.
- Les marchandises interdites et la suspicion de faux documents relèvent de causes et d'enquêtes séparées : ne pas assimiler un faux papier à une marchandise saisissable sans procédure.
- La remise de l'accessoire physique et la vérification d'identité sont effectuées par le MJ ; l'application ne pilote aucun équipement réel.
- Les tests automatisés ne certifient pas la recette terrain, les smartphones, la charge ni la sauvegarde/restauration ; régression générale nécessaire avant toute fusion.

## Tests ciblés

Décision MJ avant délai, refus d'une saisie échue, refus sans motifs/consignation, droits MJ versus joueur, reçu propriétaire sans notes privées, garde de lot et originalité du registre, inventaire officiel unique, passage du statut détenu à saisi, STOP SÉCURITÉ, compatibilité des anciens Masters. CI avec profil `customs-seizure` (11 fichiers de tests applicatifs et 7 suites Firestore) ; vérifier le SHA exact.

Aucun déploiement, fusion `main` ou migration de session.
## Tranche complémentaire — restitution après saisie formelle (candidat)

Le MJ autorisé peut restituer **au propriétaire initial** un lot encore saisi et inscrit dans l'inventaire officiel fictif. Cette opération exige une décision motivée et la confirmation que l'accessoire a effectivement été remis.

La transaction conserve l'identifiant du lot, sa quantité, sa propriété, son origine et les preuves de falsification INF-03. Elle rétablit le détenteur initial dans son sac, inscrit un événement `SO_CUSTOMS_RETURNED`, clôt le dossier de saisie avec l'état `RETURNED` et conserve la quittance d'origine, désormais marquée restituée.

Le registre du stock officiel est **historisé** avec le statut `RETURNED` et ne représente plus un bien disponible en douane. Une seconde restitution est refusée, comme toute tentative sans autorisation, pendant un STOP SÉCURITÉ, ou si le lot et le registre divergent.

Cette restitution n'est ni une annulation rétroactive de la saisie ni un règlement d'appel : elle ne crée aucun crédit, ne change pas les mandats, ne juge pas une faute et n'habilite aucun joueur. La décision de remise physique est prise par le MJ.

Les recours juridiques scénarisés, confiscations définitives, amendes et transferts de titre restent distincts. Validation sur le SHA exact par tests applicatifs, Firestore et HTTP, puis recette humaine Android/iOS avant production.

## Contester une saisie — dépôt de demande (candidat)

Le propriétaire initial d'un lot encore saisi peut déposer **une contestation écrite unique** depuis sa quittance, avec motif de fiction. Le serveur vérifie l'inscription personnelle, la saisie en cours, l'appartenance du bien et l'absence de demande préalable.

Le MJ autorisé consulte les contestations reçues dans sa régie. Les demandes restent des dossiers `PENDING` : ce module ne prononce aucun jugement, n'ouvre aucune remise forcée, ne crée aucun crédit et ne modifie ni le stock officiel ni la propriété du bien. Toute restitution reste soumise à la procédure distincte de remise physique confirmée.

Les identités techniques, secrets INF-03 et notes douanières privées ne sont pas transmis au joueur. Les anciennes sessions non activées conservent leurs permissions inchangées.

Cette tranche n'intègre pas encore la décision MJ sur la contestation, les créances, les amendes, un appel hiérarchique ou un tribunal scénarisé. Tests ciblés du dossier personnel, doublons, accès aux données et anciennes versions, CI sur le SHA exact et recette multi-smartphones à effectuer.

## Décision MJ sur contestation — extension candidate

Après le dépôt d'une contestation par le propriétaire, un MJ autorisé peut enregistrer une décision motivée : maintien de la saisie (MAINTAINED) ou recommandation de restitution (RETURN_RECOMMENDED). Une réponse écrite destinée au joueur est distincte des notes privées MJ.

La recommandation ne déplace aucun objet, ne libère pas le stock officiel, ne paie aucune indemnité et ne change pas la quittance : la remise physique doit encore être effectuée par le parcours distinct returnCustomsSeizure. Une demande déjà décidée ne peut être réécrite par une seconde décision ; une saisie déjà restituée est close.

Les joueurs ne voient que leur propre demande et la réponse publique. Les notes privées MJ, identités techniques et justificatifs internes restent hors de leur projection. STOP SÉCURITÉ suspend la décision. Les tests automatisés et la CI du SHA exact sont requis ; la médiation financière et les tribunaux de fiction restent hors de cette tranche.

## Présentation des contestations après restitution — 10 novembre 2026

Lorsque le MJ restitue physiquement le lot par le parcours natif `returnCustomsSeizure`, les lectures des contestations présentent l’état dérivé `CLOSED_RETURNED` sans altérer la demande, la décision antérieure ni l’historique du dossier. La régie et le joueur voient explicitement que la saisie est close ; un recours encore en attente n’affiche plus de formulaire de jugement. Si une décision existe, elle reste visible comme décision **historique** et ne contredit pas la restitution actuelle.

L’interface joueur ne reçoit aucune note MJ privée et aucune opération d’argent, de déplacement ou de nouvelle sanction ne découle de ce changement d’affichage. Le libellé de la régie des retenues mentionne désormais correctement la saisie formelle déjà raccordée. Tests d’interface ciblés et CI sur le commit exact à vérifier ; recette terrain multi-appareils restant à effectuer.
