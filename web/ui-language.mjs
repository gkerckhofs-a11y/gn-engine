// Presentation only. Domain codes remain unchanged; these messages never infer a
// precise cause or a remaining duration from a broad refusal code.
export const commonUiErrors={
 FORBIDDEN:'Vous n’êtes pas autorisé à effectuer cette opération. Demandez au responsable concerné ou à l’organisateur de vérifier votre accès.',
 STALE_REVISION:'Les informations ont changé. Actualisez la page, puis vérifiez à nouveau le récapitulatif avant de confirmer.',
 OUT_OF_COMBAT:'Votre personnage ne peut pas effectuer cette action dans son état actuel. Consultez son état et ses opérations en cours avant de réessayer.',
 NOT_ENOUGH_ACTION_POINTS:'Vous n’avez pas assez de points d’action disponibles. Consultez votre réserve et les points engagés dans vos actions en cours.',
 COOLDOWN_ACTIVE:'Cette compétence est en récupération. Consultez le délai indiqué dans votre action, puis actualisez lorsqu’il est écoulé.',
 INSUFFICIENT_STOCK:'L’objet demandé n’est pas disponible en quantité suffisante. Actualisez votre sac ou le comptoir, puis vérifiez la quantité.',
 SO_PERSONAL_TRANSFER_RESTRICTED:'Les règles de cet objet ne permettent pas sa remise. Consultez ses restrictions dans votre sac ; aucun don n’a été confirmé.',
 SESSION_NOT_RUNNING:'Cette action n’est pas disponible dans la phase actuelle. Consultez l’état de la session ou contactez l’organisateur.',
 REQUEST_ID_REUSED:'Cette confirmation a déjà servi pour une autre demande. Actualisez la page et préparez une nouvelle confirmation.',
 INVALID_FUEL:'Ce carburant ne peut pas être utilisé dans ces conditions. Vérifiez le lot compatible, sa quantité et vos droits avant de recommencer.',
 SHIP_UNAVAILABLE:'Ce vaisseau ne peut pas partir pour le moment. Consultez son état, son carburant, ses travaux et ses préparatifs avant de réessayer.',
 SERVER_ERROR:'Cette opération n’a pas pu être confirmée. Actualisez pour vérifier son état ou contactez l’organisateur.',
};
export const unknownUiError='Cette opération n’a pas pu être confirmée. Actualisez pour vérifier son état ou contactez l’organisateur.';
export function explainUiError(code,known={}){return commonUiErrors[code]??known[code]??unknownUiError;}
export const uiStatusLabels={AVAILABLE:'Disponible',CONSUMED:'Utilisé',INSTALLED:'Installé',FIELD_RESERVED:'Engagé dans une action',CARGO_RESERVED:'Engagé dans un chargement',RESERVED:'Mis de côté',SEIZED:'Saisi',DESTROYED:'Détruit',OPEN:'Ouvert',DEPLETED:'Épuisé',GUARDED:'Surveillé',ESCAPED:'Évadé',RELEASED:'Libéré',RETURNED:'Restitué',REJECTED:'Refusé',WAITING:'En attente',ACTIVE:'En cours',RUNNING:'En cours',PENDING:'En attente',APPROVED:'Approuvé',DECLINED:'Refusé',ACCEPTED:'Accepté',CANCELLED:'Annulé',CLOSED:'Clôturé',FINISHED:'Terminé',COMPLETED:'Terminé',RETIRED:'Retiré',STALE:'À vérifier',LOCKED:'Indisponible',UNAVAILABLE:'Indisponible',DRAFT:'Brouillon',PUBLISHED:'Publié',ARCHIVED:'Archivé',READY:'Prêt',BLOCKED:'Bloqué'};
export const uiStatus=value=>uiStatusLabels[value]??value??'Non renseigné';
export function uiErrorMessage(error,known={}){if(['NETWORK_UNAVAILABLE','RESPONSE_UNREADABLE'].includes(error?.code))return error.message||'La réponse n’a pas été reçue. L’opération peut déjà être enregistrée ; actualisez pour vérifier son état.';return error?.code?explainUiError(error.code,known):error?.message||unknownUiError;}
