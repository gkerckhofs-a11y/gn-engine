const fields={
 prepareShipCaptainOffer:['targetId'],prepareShipCaptainOfferAdmin:['targetId'],offerShipCaptain:['targetId'],offerShipCaptainAdmin:['targetId'],prepareShipRecruitment:['targetId'],prepareShipRecruitmentAdmin:['targetId'],inviteShipMember:['targetId'],inviteShipMemberAdmin:['targetId'],prepareSoPilot:['pilotId'],changeSoPilot:['pilotId'],
 consentTraceErasure:['recipientId'],
 personTarget:['targetId'],preparePersonAction:['targetId'],startPersonAction:['targetId'],offerAid:['targetId'],
 startSoPickpocket:['targetId'],prepareTreatment:['targetId'],applyTreatment:['targetId'],
 preparePayment:['recipientId'],payCredits:['recipientId'],payFromAccount:['recipientId'],prepareAccountPayment:['recipientId'],
 prepareLotTransfer:['recipientId'],proposeLotTransfer:['recipientId'],
 prepareLotSale:['buyerId'],proposeLotSale:['buyerId'],prepareKnowledgeShare:['recipientId'],shareKnowledge:['recipientId'],
 prepareNoteShare:['recipientId'],shareNote:['recipientId']};
export async function resolveCharacterInputs(api,action,input){
 if(!input.sessionId)return input;
 const result={...input};
 for(const key of fields[action]??[]){
  if(typeof result[key]==='string'&&/^[a-z]{3}\d{3}$/i.test(result[key].trim())){
   result[key]=(await api('resolveCharacterCode',{sessionId:input.sessionId,code:result[key]})).characterId;
  }
 }
 if(['prepareVoyage','departShip'].includes(action)&&Array.isArray(input.passengerCodes)){
  result.passengerCodes=await Promise.all(input.passengerCodes.map(async code=>/^[a-z]{3}\d{3}$/i.test(code.trim())?(await api('resolveCharacterCode',{sessionId:input.sessionId,code})).characterId:code));
 }
 return result;
}
