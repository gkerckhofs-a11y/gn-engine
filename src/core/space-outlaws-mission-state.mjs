import {requireThat,documentId,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {moneyState,accountId} from './economy-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {shopAccountId} from './space-outlaws-shop-state.mjs';

export function soMissionAccess(tx,s){
 if(!s.spaceOutlaws)return;
 requireThat(s.spaceOutlaws.missionsVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 authorizeSpaceOutlaws(tx,s,'MISSIONS');
}
export function seedSoMissions(tx,sid,changes,versionId){
 for(const c of changes)if(c.type==='mission'&&c.operation==='UPSERT')tx.set(`sessions/${sid}/missions/${c.entityId}`,{...c.data,versionId,publicationState:'PUBLISHED'});
}
export async function soAnnouncement(tx,s,input,old){
 if(!s.spaceOutlaws)return {};
 requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
 requireThat(input.mode==='ASSIGNMENT'&&(input.participation??'PERSONAL')==='PERSONAL'&&['INFORMATION','MERCENARY','OTHER'].includes(input.category)&&['NPC','AUTHORITY'].includes(input.sponsorKind),'SO_MISSION_UNSUPPORTED');
 requireThat(input.audience?.groupIds?.length===0,'SO_MISSION_UNSUPPORTED');
 const mid=documentId(input.missionId),m=await tx.get(`sessions/${s.id}/missions/${mid}`);
 requireThat(m?.versionId===s.spaceOutlaws.versionId&&m.publicationState==='PUBLISHED'&&!m.rewardItems.length,'SO_MISSION_UNSUPPORTED');
 requireThat(!old||old.missionId===mid,'SO_MISSION_SOURCE_LOCKED');
 return {missionId:mid,missionVersionId:m.versionId,requiredKnowledgeIds:m.requiredKnowledgeIds,missionSteps:m.steps.map(({id,title,description})=>({id,title,description})),giverCharacterId:m.giverCharacterId};
}
export async function soMissionReadable(tx,s,a,cid){
 if(!s.spaceOutlaws)return true;
 if(s.spaceOutlaws.missionsVersion!==1||a.missionVersionId!==s.spaceOutlaws.versionId)return false;
 for(const id of a.requiredKnowledgeIds??[])if(!await tx.get(`sessions/${s.id}/characters/${cid}/knowledge/${id}`))return false;
 return true;
}
export async function soMissionFunding(tx,s,a,source){
 if(!s.spaceOutlaws)return null;
 requireThat(source?.ownerType==='SHOP'&&source.id===shopAccountId(source.shopId),'SO_MISSION_FUNDING_REQUIRED');
 const shop=await tx.get(`sessions/${s.id}/shops/${source.shopId}`);
 requireThat(shop?.versionId===s.spaceOutlaws.versionId&&(!a.giverCharacterId||a.giverCharacterId===shop.sellerCharacterId),'SO_MISSION_FUNDING_REQUIRED');
 return shop.name;
}
export function soMissionRunning(s){if(s.spaceOutlaws)requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');}
export function soProofSteps(s,c,input){
 if(!s.spaceOutlaws)return {};
 const ids=input.completedStepIds;
 requireThat(Array.isArray(ids)&&ids.length===c.missionSteps.length&&new Set(ids).size===ids.length&&c.missionSteps.every(st=>ids.includes(st.id)),'SO_MISSION_STEPS_REQUIRED');
 return {completedStepIds:c.missionSteps.map(st=>st.id)};
}
const kinds={prepareContractAppeal:'APPEAL',appealContract:'APPEAL',prepareContractAppealAdmin:'APPEAL',appealContractAdmin:'APPEAL',prepareContractAppealDecision:'APPEAL_DECISION',decideContractAppeal:'APPEAL_DECISION',prepareContractDispute:'DISPUTE',disputeContract:'DISPUTE',prepareContractDisputeAdmin:'DISPUTE',disputeContractAdmin:'DISPUTE',prepareContractSettlement:'SETTLE',settleContract:'SETTLE',prepareContractArbitration:'ARBITRATE',arbitrateContract:'ARBITRATE'};
export const soResolutionKind=a=>kinds[a];
export const soResolutionActions=Object.keys(kinds);
export const soResolutionAdminActions=soResolutionActions.filter(a=>!['prepareContractDispute','disputeContract','prepareContractAppeal','appealContract'].includes(a));
export function soResolutionView(s,c,at,admin){
 if(!s.spaceOutlaws)return {};
 const g=gameTime(s.clock,at),running=s.stage==='EN_JEU'&&!s.safetyStop?.active,open=['REVIEWED','DISPUTED'].includes(c.status),window=c.contestUntilGameMs??null;
 return {canAppeal:['PAID','SETTLED'].includes(c.status)&&!s.safetyStop?.active&&c.appeal?.status!=='PENDING',canDecideAppeal:admin&&c.appeal?.status==='PENDING'&&!s.safetyStop?.active,settlement:{paid:c.paidAmount??0,disputed:c.disputedAmount??0,contestRemainingMs:window==null?null:Math.max(0,window-g),mediationRemainingMs:c.mediationUntilGameMs==null?null:Math.max(0,c.mediationUntilGameMs-g)},
 canDispute:running&&open&&g<window,canSettle:admin&&running&&open&&g>=window&&(c.status==='REVIEWED'||c.terms.amount-(c.disputedAmount??0)-(c.paidAmount??0)>0),canArbitrate:admin&&running&&open&&(c.disputedAmount??0)>0&&g>=Math.max(window,c.mediationUntilGameMs)};
}
export async function prepareSoResolution(tx,s,c,ctx,input,at,kind,candidate){
 requireThat(s.spaceOutlaws?.missionsVersion===1&&c.terms.spaceOutlaws===true,'SO_GAMEPLAY_NOT_OPEN');if(kind.startsWith('APPEAL'))requireThat(['EN_JEU','PAUSE','FINISHED'].includes(s.stage)&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');else soMissionRunning(s);
 const g=gameTime(s.clock,at),open=['REVIEWED','DISPUTED'].includes(c.status);requireThat(kind.startsWith('APPEAL')?['PAID','SETTLED'].includes(c.status):open,'CONTRACT_CLOSED');
 const reason=input.reason;requireThat(typeof reason==='string'&&reason.trim()&&reason.length<=2000,'INVALID_CONTRACT');
 const disputed=c.disputedAmount??0,paid=c.paidAmount??0;
 let amount=0,pay=0,release=0,source=null,to=null,newEvidence=null,outcome=null;
 if(kind==='APPEAL'){requireThat(c.appeal?.status!=='PENDING','SO_APPEAL_PENDING');newEvidence=input.newEvidence;requireThat(typeof newEvidence==='string'&&newEvidence.trim()&&newEvidence.length<=4000,'INVALID_CONTRACT');}
 else if(kind==='APPEAL_DECISION'){requireThat(c.appeal?.status==='PENDING','CONTRACT_CLOSED');outcome=input.outcome;requireThat(['CLOSED','FOLLOW_UP'].includes(outcome),'INVALID_CONTRACT');}
 else if(kind==='DISPUTE'){
  requireThat(g<c.contestUntilGameMs,'SO_CONTEST_CLOSED');amount=whole(input.amount,'INVALID_AMOUNT');requireThat(amount>0&&amount>=disputed&&amount<=c.terms.amount-paid,'INVALID_AMOUNT');
 }else{
  requireThat(g>=c.contestUntilGameMs,'SO_CONTEST_OPEN');
  if(kind==='ARBITRATE'){
   requireThat(disputed>0&&g>=c.mediationUntilGameMs,'SO_MEDIATION_OPEN');amount=whole(input.payAmount,'INVALID_AMOUNT');requireThat(amount<=disputed,'INVALID_AMOUNT');pay=c.terms.amount-disputed-paid+amount;release=disputed-amount;
  }else{pay=c.terms.amount-disputed-paid;requireThat(pay>0||c.status==='REVIEWED','CONTRACT_CLOSED');}
  source=await tx.get(`sessions/${s.id}/accounts/${c.sourceAccountId}`);moneyState(source);requireThat(source.reserved>=c.terms.amount-paid,'INVALID_ACCOUNT');await soMissionFunding(tx,s,c,source);
  if(pay){requireThat((await candidate(tx,s,c)).current,'STALE_CONTRACT');to=await tx.get(`sessions/${s.id}/accounts/${accountId(c.characterId)}`);moneyState(to);whole(to.balance+pay,'BALANCE_OVERFLOW');}
 }
 const result={contract:{id:c.id,title:c.terms.title},kind,newEvidence,outcome,reason:reason.trim(),amount,pay,release,remainingDisputed:kind==='ARBITRATE'?0:kind==='DISPUTE'?amount:disputed,currency:c.terms.currency};
 return {source,to,result:{...result,confirmation:hash(JSON.stringify([c.id,c.revision,ctx.partyGuard??ctx.version,source?.revision??null,to?.revision??null,result]))}};
}
export function applySoResolution(tx,s,c,x,kind,at,actor,id,ledger){
 const r=x.result,g=gameTime(s.clock,at);
 if(kind==='APPEAL')return {...c,appeal:{id,at,body:r.reason,newEvidence:r.newEvidence,status:'PENDING'}};
 if(kind==='APPEAL_DECISION')return {...c,appeal:{...c.appeal,status:r.outcome,decision:r.reason,decidedAt:at,financialEffect:'NONE'}};
 if(kind==='DISPUTE')return {...c,disputedAmount:r.amount,mediationUntilGameMs:c.mediationUntilGameMs??g+1200000};
 if(r.pay||r.release){
  const sourceNext={...x.source,balance:x.source.balance-r.pay,reserved:x.source.reserved-r.pay-r.release,revision:x.source.revision+1},toNext=x.to?{...x.to,balance:x.to.balance+r.pay,revision:x.to.revision+1}:null;
  ledger(tx,s,c,id,at,actor,'CONTRACT_PAY',x.source,x.to,sourceNext,toNext,r.reason);
 }
 const paid=(c.paidAmount??0)+r.pay,status=r.remainingDisputed?'DISPUTED':paid===c.terms.amount?'PAID':'SETTLED';
 return {...c,status,paidAmount:paid,disputedAmount:r.remainingDisputed,...(!r.remainingDisputed?{paidAt:at,paymentId:id}:{})};
}
