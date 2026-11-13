import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {readLot,personalLot} from './inventory-state.mjs';
import {forgedLotIntegrity} from './space-forgery-evidence.mjs';
import {abilityLevel} from './abilities.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const isDocumentReviewTemplate=t=>t?.kind==='ANALYSIS'&&t.documentOnly===true&&t.profiles?.ANALYZE?.skillId==='TRA-03';
export async function documentReviewTarget(tx,s,c,lotId,at){
 requireThat(s.spaceOutlaws?.actionsVersion===1&&abilityLevel(c,'TRA-03')>0,'FIELD_SKILL_REQUIRED');
 const lot=await readLot(tx,s.id,documentId(lotId),at);
 requireThat(lot?.item?.reviewTargetId&&lot.item.kind==='INDIVIDUAL'&&!lot.item.consumable,'SO_DOCUMENT_REVIEW_ACCESS');
 const held=lot.quantity===1&&personalLot(lot,c.id)&&['AVAILABLE','FIELD_RESERVED'].includes(lot.status);
 let knowledge=null,copy=false;
 if(lot.item.knowledgeId){
  knowledge=await tx.get(`sessions/${s.id}/knowledge/${lot.item.knowledgeId}`);
  const receipt=await tx.get(`sessions/${s.id}/characters/${c.id}/knowledge/${lot.item.knowledgeId}`);
  requireThat(!receipt||receipt.active,'SO_DOCUMENT_REVIEW_ACCESS');
  copy=receipt?.active===true&&receipt.inventoryCopy===true&&receipt.documentLotId===lot.id&&receipt.snapshot?.revision===knowledge?.revision;
  requireThat(knowledge?.publicationState==='PUBLISHED'&&knowledge.kind==='DOCUMENT','SO_DOCUMENT_REVIEW_ACCESS');
 }
 requireThat(held||copy,'SO_DOCUMENT_REVIEW_ACCESS');
 requireThat(await forgedLotIntegrity(tx,s.id,lot,{allowArchived:copy}),'SO_DOCUMENT_REVIEW_ACCESS');
 const template=await tx.get(`sessions/${s.id}/fieldTargets/${lot.item.reviewTargetId}`);
 requireThat(template?.publicationState==='PUBLISHED'&&isDocumentReviewTemplate(template),'SO_DOCUMENT_REVIEW_UNAVAILABLE');
 // Ownership and inventory revisions never renew an original's analysis quota.
 // No provenance, author identity, quality or private anomaly is projected.
 return {...template,id:`review_${hash(lot.id)}`,title:lot.item.name,description:lot.item.description,
  revision:hash([lot.id,lot.item.id,lot.item.revision,lot.item.description,knowledge?.revision??null,template.id,template.revision]),
  documentReview:{lotId:lot.id,templateId:template.id}};
}
export async function myDocumentReviews(tx,s,c,at){
 requireThat(s.spaceOutlaws?.actionsVersion===1&&abilityLevel(c,'TRA-03')>0,'FIELD_SKILL_REQUIRED');
 const lots=await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id],{limit:1001});
 const receipts=await tx.list(`sessions/${s.id}/characters/${c.id}/knowledge`,null,{limit:1001});
 requireThat(lots.length<=1000&&receipts.length<=1000,'SO_RELEASE_LIMIT');
 const ids=new Set([...lots.filter(l=>l.item.reviewTargetId).map(l=>l.id),...receipts.filter(r=>r.active&&r.inventoryCopy&&r.documentLotId).map(r=>r.documentLotId)]),documents=[];
 for(const id of ids){try{const t=await documentReviewTarget(tx,s,c,id,at);documents.push({id,name:t.title});}catch(e){if(!['SO_DOCUMENT_REVIEW_ACCESS','SO_DOCUMENT_REVIEW_UNAVAILABLE'].includes(e.code))throw e;}}
 return {session:{id:s.id,stage:s.stage},documents};
}
