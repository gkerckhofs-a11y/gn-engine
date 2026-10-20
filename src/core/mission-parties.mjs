import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {groupVisible,memberFor} from './groups.mjs';
import {accountId,groupAccountId,moneyState} from './economy-state.mjs';

export const participationOf=a=>a?.participation??'PERSONAL';
export function participationInput(value='PERSONAL'){
  requireThat(['PERSONAL','GROUP','EITHER'].includes(value),'INVALID_PARTICIPATION');return value;
}
export const participantOf=r=>r.participant??{kind:'CHARACTER',id:r.characterId,name:r.applicantName??r.terms?.applicant?.name??''};
export const participantAccount=p=>p.kind==='GROUP'?groupAccountId(p.id):accountId(p.id);
export const participantAllowed=(a,p)=>participationOf(a)==='EITHER'||participationOf(a)===(p.kind==='GROUP'?'GROUP':'PERSONAL');
export const participantClaimId=p=>p.kind==='GROUP'?hash(`group:${p.id}`):hash(p.id);
const representative=(s,g,cid)=>s.modules?.groups===true&&groupVisible(g,cid)&&memberFor(g,cid)?.permissions.representMissions===true;
const accessGuard=(ctx,g)=>hash(JSON.stringify([ctx.version,g.id,g.revision]));

// Access is checked again before replaying an operation. Group authority is not
// derived from wallet permissions or from the original representative's UID.
export async function participantAccess(tx,s,ctx,actor,record){
  if(!record)return null;const p=participantOf(record);
  if(p.kind==='GROUP'){
    const g=await tx.get(`sessions/${s.id}/groups/${p.id}`);
    return representative(s,g,ctx.c.id)?{participant:p,guard:accessGuard(ctx,g),group:g}:null;
  }
  return record.applicantUid===actor.uid&&record.characterId===ctx.c.id&&record.applicantVersion===ctx.version?{participant:p,guard:ctx.version}:null;
}
export async function selectParticipant(tx,s,ctx,input,a){
  if(!input.groupId){const p={kind:'CHARACTER',id:ctx.c.id,name:ctx.c.public.displayName};requireThat(participantAllowed(a,p),'PARTICIPATION_NOT_ALLOWED');return {participant:p,guard:ctx.version};}
  const gid=documentId(input.groupId),g=await tx.get(`sessions/${s.id}/groups/${gid}`);
  requireThat(representative(s,g,ctx.c.id),'FORBIDDEN');const p={kind:'GROUP',id:gid,name:g.name};requireThat(participantAllowed(a,p),'PARTICIPATION_NOT_ALLOWED');
  const wallet=await tx.get(`sessions/${s.id}/accounts/${groupAccountId(gid)}`);
  requireThat(g.walletConfig&&wallet?.sessionId===s.id&&wallet.ownerType==='GROUP'&&wallet.groupId===gid,'GROUP_WALLET_REQUIRED');moneyState(wallet);
  return {participant:p,guard:accessGuard(ctx,g)};
}
export async function participantOptions(tx,s,ctx,a){
  const result=[];
  if(participationOf(a)!=='GROUP')result.push({kind:'CHARACTER',id:ctx.c.id,name:ctx.c.public.displayName,groupId:null,ready:true});
  if(participationOf(a)!=='PERSONAL'&&s.modules?.groups===true){
    for(const g of await tx.list(`sessions/${s.id}/groups`)){
      if(!representative(s,g,ctx.c.id))continue;
      const wallet=await tx.get(`sessions/${s.id}/accounts/${groupAccountId(g.id)}`);
      const ready=!!(g.walletConfig&&wallet?.sessionId===s.id&&wallet.ownerType==='GROUP'&&wallet.groupId===g.id&&wallet.status==='ACTIVE');
      result.push({kind:'GROUP',id:g.id,name:g.name,groupId:g.id,ready});
    }
  }
  return result;
}
export async function participantCurrent(tx,s,record){
  const p=participantOf(record);
  if(p.kind!=='GROUP'){
    const x=await inventoryParty(tx,s.id,record.characterId),current=x.active&&x.c.assignedUid===record.applicantUid&&x.version===record.applicantVersion;
    return {...x,current,representatives:current?[record.characterId]:[]};
  }
  const g=await tx.get(`sessions/${s.id}/groups/${p.id}`),representatives=[];
  if(g&&s.modules?.groups===true&&g.publicationState==='PUBLISHED')for(const m of g.members){
    if(representative(s,g,m.characterId)&&(await inventoryParty(tx,s.id,m.characterId)).active)representatives.push(m.characterId);
  }
  return {current:representatives.length>0,version:g?.revision??null,representatives};
}
export function missionReadState(record,ctx){
  return participantOf(record).kind==='GROUP'?(record.readStates?.[ctx.version]??{revision:0,announcementRevision:0}):{revision:record.lastReadRevision??0,announcementRevision:record.lastReadAnnouncementRevision??0};
}
export function withMissionRead(record,ctx,revision,announcementRevision=0){
  return participantOf(record).kind==='GROUP'?{...record,readStates:{...record.readStates,[ctx.version]:{revision,announcementRevision}}}:{...record,lastReadRevision:revision,lastReadAnnouncementRevision:announcementRevision};
}
