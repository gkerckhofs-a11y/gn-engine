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