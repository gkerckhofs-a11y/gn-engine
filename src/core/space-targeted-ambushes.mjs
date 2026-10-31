import {documentId,requireThat} from './validation.mjs';

export const hasTargetedAmbushes=s=>s.spaceOutlaws?.targetedAmbushVersion===1&&s.spaceOutlaws?.intelligenceVersion===1&&s.spaceOutlaws?.combatVersion===1;
export const targetedKnowledge=k=>k?.active&&['FLIGHT_PLAN','CONFIDENTIAL'].includes(k.intelligence?.category)&&typeof k.intelligence.voyageId==='string';
export async function ambushKnowledge(tx,s,c,knowledgeId){
 requireThat(hasTargetedAmbushes(s),'SO_GAMEPLAY_NOT_OPEN');
 const k=await tx.get(`sessions/${s.id}/characters/${c.id}/knowledge/${documentId(knowledgeId)}`);
 requireThat(targetedKnowledge(k),'SPACE_TARGET_KNOWLEDGE_REQUIRED');
 // Deliberately do not read the target voyage: arming must not disclose expiry,
 // route changes, or whether the prepared document describes the actual plan.
 return k;
}
export async function targetedCandidate(tx,s,a,pilotId,voyageIds){
 if(!hasTargetedAmbushes(s)||!voyageIds.includes(a.targetVoyageId))return false;
 const k=await tx.get(`sessions/${s.id}/characters/${pilotId}/knowledge/${a.knowledgeId}`);
 return !!(targetedKnowledge(k)&&k.grantRevision===a.knowledgeGrantRevision&&k.intelligence.voyageId===a.targetVoyageId);
}
export async function ambushKnowledgeOptions(tx,s,c){
 if(!hasTargetedAmbushes(s))return [];
 return (await tx.list(`sessions/${s.id}/characters/${c.id}/knowledge`)).filter(targetedKnowledge).map(k=>({id:k.id,title:k.snapshot.title}));
}
