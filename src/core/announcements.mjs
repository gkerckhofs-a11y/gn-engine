import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {groupVisible} from './groups.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
const adminActions=new Set(['sessionAnnouncements','prepareAnnouncement','saveAnnouncement','announcementHistory','sessionApplications','sessionApplication','prepareApplicationReply','replyApplication']);
const actions=new Set([...adminActions,'announcements','announcementDetail','myApplications','applicationDetail','prepareAnnouncementResponse','respondAnnouncement','withdrawApplication','markApplicationRead']);
export const announcementAction=a=>actions.has(a);
const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_ANNOUNCEMENT');return v.trim();};
const oneOf=(v,values)=>{requireThat(values.includes(v),'INVALID_ANNOUNCEMENT');return v;};
const state=(a,at)=>a.publication==='PUBLISHED'?(at<a.opensAt?'SCHEDULED':at>=a.deadline?'EXPIRED':a.mode==='ASSIGNMENT'&&(a.assignedCount??0)>=a.places?'FILLED':'OPEN'):a.publication;
const view=(a,at)=>({id:a.id,revision:a.revision,status:state(a,at),title:a.title,category:a.category,mode:a.mode,description:a.description,sponsor:{kind:a.sponsorKind,name:a.sponsorName},rewardType:a.rewardType,rewardText:a.rewardText,places:a.places,conditions:a.conditions,proofExpected:a.proofExpected,opensAt:a.opensAt,deadline:a.deadline});
const digest=v=>hash(JSON.stringify(v));
const closed=t=>['DECLINED','WITHDRAWN','ASSIGNED'].includes(t.status);
const threadId=(a,ctx,actor)=>digest([a.id,actor.uid,ctx.version]);
const own=(t,ctx,actor)=>!!t&&t.applicantUid===actor.uid&&t.characterId===ctx.c.id&&t.applicantVersion===ctx.version;
async function audienceAllowed(tx,s,a,cid){
  if(a.audience.kind==='ALL'||a.audience.characterIds.includes(cid))return true;
  if(s.modules?.groups!==true)return false;
  for(const id of a.audience.groupIds)if(groupVisible(await tx.get(`sessions/${s.id}/groups/${id}`),cid))return true;
  return false;
}
const readable=async(tx,s,a,cid,at)=>!!a&&!['DRAFT','SCHEDULED'].includes(state(a,at))&&await audienceAllowed(tx,s,a,cid);
const responseAllowed=(s,c,a,at)=>state(a,at)==='OPEN'&&s.stage==='EN_JEU'&&canGameAction(s,c,'publish');
const summary=(t,a,at,admin=false)=>({id:t.id,revision:t.revision,announcementId:t.announcementId,title:t.terms.title,announcementRevision:a.revision,announcementStatus:state(a,at),reviewedRevision:t.reviewedTerms.revision,status:t.status,intent:t.intent,contractId:t.contractId??null,applicant:{id:t.characterId,name:t.applicantName},createdAt:t.createdAt,updatedAt:t.updatedAt,unread:!admin&&(t.lastReadRevision<t.revision||t.lastReadAnnouncementRevision!==a.revision)});
const messageView=m=>({id:m.id,sequence:m.sequence,at:m.at,from:m.from,authorName:m.authorName,body:m.body,proposedReward:m.proposedReward,announcementRevision:m.announcementRevision});
export function createAnnouncementService({store,signed,checkSession,now,uuid}){
  async function prepare(tx,s,input,at){
    const old=input.announcementId?await tx.get(`sessions/${s.id}/announcements/${documentId(input.announcementId)}`):null;
    if(input.announcementId)requireThat(old,'NOT_FOUND');requireThat((old?.revision??0)===input.revision,'STALE_REVISION');
    const draft={id:old?.id??null,assignedCount:old?.assignedCount??0,revision:(old?.revision??0)+1,title:text(input.title,150,true),category:oneOf(input.category,['BOUNTY','MERCENARY','ESCORT','TRANSPORT','INFORMATION','OTHER']),mode:oneOf(input.mode,['ASSIGNMENT','OPEN_BOUNTY']),description:text(input.description,10000,true),sponsorKind:oneOf(input.sponsorKind,['CHARACTER','GROUP','AUTHORITY','NPC']),sponsorName:text(input.sponsorName,150,true),rewardType:oneOf(input.rewardType,['FIXED','NEGOTIABLE']),rewardText:text(input.rewardText,1000,true),places:whole(input.places,'INVALID_ANNOUNCEMENT'),conditions:text(input.conditions,4000,true),proofExpected:text(input.proofExpected,2000,true),briefing:text(input.briefing??'',12000),gmNotes:text(input.gmNotes??'',12000),publication:oneOf(input.publication,['DRAFT','PUBLISHED','CLOSED','CANCELLED']),opensAt:whole(input.opensAt,'INVALID_ANNOUNCEMENT'),deadline:whole(input.deadline,'INVALID_ANNOUNCEMENT')};
    requireThat(draft.places>0&&draft.places<=1000&&draft.deadline>draft.opensAt&&draft.deadline<=8640000000000000,'INVALID_ANNOUNCEMENT');if(draft.publication==='PUBLISHED')requireThat(draft.deadline>at,'ANNOUNCEMENT_EXPIRED');
    requireThat(draft.places>=draft.assignedCount&&(!draft.assignedCount||draft.mode===old.mode),'MISSION_PLACES_LOCKED');
    const a=input.audience;requireThat(a&&['ALL','TARGETED'].includes(a.kind)&&Array.isArray(a.characterIds)&&Array.isArray(a.groupIds)&&a.characterIds.length<=200&&a.groupIds.length<=100,'INVALID_AUDIENCE');
    const characterIds=[...new Set(a.characterIds.map(documentId))].sort(),groupIds=[...new Set(a.groupIds.map(documentId))].sort();
    requireThat(a.kind==='ALL'?characterIds.length+groupIds.length===0:characterIds.length+groupIds.length>0,'INVALID_AUDIENCE');
    const audienceNames=[];
    for(const id of characterIds){const c=await tx.get(`sessions/${s.id}/characters/${id}`);requireThat(c,'INVALID_AUDIENCE');audienceNames.push(c.public.displayName);}
    for(const id of groupIds){const g=await tx.get(`sessions/${s.id}/groups/${id}`);requireThat(g,'INVALID_AUDIENCE');audienceNames.push(`Groupe : ${g.name}`);}
    draft.audience={kind:a.kind,characterIds,groupIds};const reason=text(input.reason,500,true);
    return {old,draft,reason,result:{preview:view(draft,at),audience:draft.audience,audienceNames,briefing:draft.briefing,gmNotes:draft.gmNotes,confirmation:digest([s.id,draft,reason])}};
  }
  async function applicationContext(tx,s,ctx,actor,input,admin,at){
    const t=await tx.get(`sessions/${s.id}/applications/${documentId(input.applicationId)}`);requireThat(t&&(admin||own(t,ctx,actor)),'FORBIDDEN');
    const a=await tx.get(`sessions/${s.id}/announcements/${t.announcementId}`);requireThat(a,'NOT_FOUND');
    if(!admin)requireThat(await readable(tx,s,a,ctx.c.id,at),'FORBIDDEN');return {t,a};
  }
  async function candidateCurrent(tx,s,t,a,at){
    const p=await inventoryParty(tx,s.id,t.characterId);return p.active&&p.c.assignedUid===t.applicantUid&&p.version===t.applicantVersion&&await readable(tx,s,a,t.characterId,at);
  }
  async function detail(tx,s,ctx,t,a,at,admin){
    const messages=await tx.list(`sessions/${s.id}/applications/${t.id}/messages`,null,{orderBy:'sequence',direction:'desc',limit:50});
    const current=admin?await candidateCurrent(tx,s,t,a,at):true;
    return {admin,session:{id:s.id},application:summary(t,a,at,admin),terms:t.terms,reviewedTerms:t.reviewedTerms,announcement:view(a,at),messages:messages.reverse().map(messageView),messageCount:t.messageCount,
      canRespond:!admin&&!closed(t)&&responseAllowed(s,ctx.c,a,at),canWithdraw:!admin&&!closed(t),canReply:admin&&current&&!closed(t),candidateCurrent:current,
      ...(!admin?{confirmation:digest([t.id,t.revision,ctx.version])}:{})};
  }
  async function response(tx,s,ctx,actor,input,at){
    const a=await tx.get(`sessions/${s.id}/announcements/${documentId(input.announcementId)}`);requireThat(await readable(tx,s,a,ctx.c.id,at),'FORBIDDEN');
    requireThat(state(a,at)==='OPEN','ANNOUNCEMENT_CLOSED');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,ctx.c,'publish');
    const id=threadId(a,ctx,actor),t=await tx.get(`sessions/${s.id}/applications/${id}`);requireThat(!t||!closed(t),'APPLICATION_CLOSED');
    const intent=oneOf(input.intent,['QUESTION','APPLICATION']);requireThat(!(t?.intent==='APPLICATION'&&intent==='QUESTION'),'INVALID_ANNOUNCEMENT');
    const body=text(input.body,5000,true),proposedReward=text(input.proposedReward??'',300);requireThat(!proposedReward||a.rewardType==='NEGOTIABLE','PRICE_PROPOSAL_DISABLED');
    const result={announcement:view(a,at),applicant:{id:ctx.c.id,name:ctx.c.public.displayName},intent,body,proposedReward};
    return {a,t,id,body,intent,proposedReward,result:{...result,confirmation:digest([s.id,ctx.version,a.revision,t?.revision??0,s.healthRules,result])}};
  }
  async function reply(tx,s,t,a,input,at){
    requireThat(!closed(t),'APPLICATION_CLOSED');requireThat(await candidateCurrent(tx,s,t,a,at),'STALE_APPLICATION');
    const status=oneOf(input.status,['DISCUSSION','DECLINED']),body=text(input.body,5000,true);
    const result={announcement:view(a,at),application:summary(t,a,at,true),body,status,authorName:a.sponsorName};
    return {body,status,result:{...result,confirmation:digest([s.id,t.revision,t.applicantVersion,a.revision,result])}};
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),id=uuid();return store.runTransaction(async tx=>{
      const admin=adminActions.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId)),version:actor.uid}:await inventoryPlayer(tx,actor,input),{s}=ctx,base=`sessions/${s.id}`;
      requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      if(action==='sessionAnnouncements')return {session:{id:s.id},announcements:(await tx.list(`${base}/announcements`)).sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id)).map(a=>({...a,status:state(a,at)}))};
      if(action==='announcements'){
        const announcements=[];for(const a of await tx.list(`${base}/announcements`))if(state(a,at)==='OPEN'&&await audienceAllowed(tx,s,a,ctx.c.id))announcements.push(view(a,at));
        announcements.sort((a,b)=>a.deadline-b.deadline||a.id.localeCompare(b.id));return {session:{id:s.id},announcements};
      }
      if(action==='myApplications'){
        const applications=[];for(const t of await tx.list(`${base}/applications`,['applicantUid',actor.uid])){if(!own(t,ctx,actor))continue;const a=await tx.get(`${base}/announcements/${t.announcementId}`);if(await readable(tx,s,a,ctx.c.id,at))applications.push(summary(t,a,at));}
        applications.sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));return {session:{id:s.id},applications};
      }
      if(action==='announcementDetail'){
        const a=await tx.get(`${base}/announcements/${documentId(input.announcementId)}`);requireThat(await readable(tx,s,a,ctx.c.id,at),'FORBIDDEN');const t=await tx.get(`${base}/applications/${threadId(a,ctx,actor)}`);
        return {session:{id:s.id},announcement:view(a,at),application:t?summary(t,a,at):null,canRespond:(!t||!closed(t))&&responseAllowed(s,ctx.c,a,at)};
      }
      if(action==='announcementHistory'||action==='sessionApplications'){
        const a=await tx.get(`${base}/announcements/${documentId(input.announcementId)}`);requireThat(a,'NOT_FOUND');
        if(action==='announcementHistory')return {events:await tx.list(`${base}/announcements/${a.id}/history`,null,{orderBy:'at',direction:'desc',limit:30})};
        const applications=[];for(const t of await tx.list(`${base}/applications`,['announcementId',a.id]))applications.push({...summary(t,a,at,true),candidateCurrent:await candidateCurrent(tx,s,t,a,at)});return {session:{id:s.id},announcement:view(a,at),applications:applications.sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id))};
      }
      if(action==='prepareAnnouncement')return (await prepare(tx,s,input,at)).result;
      if(action==='prepareAnnouncementResponse')return (await response(tx,s,ctx,actor,input,at)).result;
      let t,a;
      if(['applicationDetail','sessionApplication','prepareApplicationReply','replyApplication','withdrawApplication','markApplicationRead'].includes(action)){
        ({t,a}=await applicationContext(tx,s,ctx,actor,input,admin,at));
        if(action==='applicationDetail'||action==='sessionApplication')return detail(tx,s,ctx,t,a,at,admin);
        if(action==='prepareApplicationReply')return (await reply(tx,s,t,a,input,at)).result;
        // Replayed replies must not expose prior results through revoked or reassigned candidate access.
        if(action==='replyApplication')requireThat(await candidateCurrent(tx,s,t,a,at),'STALE_APPLICATION');
      }
      if(action==='respondAnnouncement'){
        a=await tx.get(`${base}/announcements/${documentId(input.announcementId)}`);requireThat(await readable(tx,s,a,ctx.c.id,at),'FORBIDDEN');
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=digest([action,input]),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===ctx.version,'FORBIDDEN');return previous.result;}
      let result;
      if(action==='saveAnnouncement'){
        const x=await prepare(tx,s,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');a={...x.draft,id:x.old?.id??id,createdAt:x.old?.createdAt??at,updatedAt:at};
        tx.set(`${base}/announcements/${a.id}`,a);tx.set(`${base}/announcements/${a.id}/history/${id}`,{id,at,actorUid:actor.uid,reason:x.reason,before:x.old,after:a});result={id:a.id,revision:a.revision,status:state(a,at)};
      }else if(action==='respondAnnouncement'){
        const x=await response(tx,s,ctx,actor,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');a=x.a;
        t={...(x.t??{id:x.id,announcementId:a.id,applicantUid:actor.uid,characterId:ctx.c.id,applicantName:ctx.c.public.displayName,applicantVersion:ctx.version,createdAt:at,terms:view(a,at)}),revision:(x.t?.revision??0)+1,messageCount:(x.t?.messageCount??0)+1,status:x.t?.status??'SENT',intent:x.intent,updatedAt:at,reviewedTerms:view(a,at),lastReadRevision:x.t?(x.t.lastReadRevision===x.t.revision?x.t.revision+1:x.t.lastReadRevision):1,lastReadAnnouncementRevision:a.revision};
        tx.set(`${base}/applications/${t.id}`,t);tx.set(`${base}/applications/${t.id}/messages/${id}`,{id,sequence:t.messageCount,at,from:'CANDIDATE',authorName:ctx.c.public.displayName,authorUid:actor.uid,body:x.body,proposedReward:x.proposedReward,announcementRevision:a.revision});result={id:t.id,revision:t.revision,status:t.status};
      }else if(action==='replyApplication'){
        const x=await reply(tx,s,t,a,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');const next={...t,status:x.status,revision:t.revision+1,messageCount:t.messageCount+1,updatedAt:at};
        tx.set(`${base}/applications/${t.id}`,next);tx.set(`${base}/applications/${t.id}/messages/${id}`,{id,sequence:next.messageCount,at,from:'ORGANISER',authorName:a.sponsorName,authorUid:actor.uid,body:x.body,proposedReward:'',announcementRevision:a.revision});result={id:t.id,status:next.status,revision:next.revision};
      }else if(action==='withdrawApplication'){
        requireThat(!closed(t),'APPLICATION_CLOSED');requireThat(input.confirmation===digest([t.id,t.revision,ctx.version]),'STALE_REVISION');const next={...t,status:'WITHDRAWN',revision:t.revision+1,updatedAt:at,lastReadRevision:t.revision+1,lastReadAnnouncementRevision:a.revision};tx.set(`${base}/applications/${t.id}`,next);result={id:t.id,status:next.status};
      }else{
        requireThat(input.revision===t.revision&&input.announcementRevision===a.revision,'STALE_REVISION');tx.set(`${base}/applications/${t.id}`,{...t,lastReadRevision:t.revision,lastReadAnnouncementRevision:a.revision});result={id:t.id,readRevision:t.revision};
      }
      tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,announcementId:a.id,...(t?{applicationId:t.id}:{})});tx.set(op,{fingerprint,result,guard:ctx.version,at});return result;
    });
  };
}

export {state as announcementState,view as announcementView,readable as announcementReadable};
