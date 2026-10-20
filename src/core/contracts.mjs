import {participantOf,participantAllowed,participantAccount,participantAccess,participantCurrent,missionReadState,withMissionRead} from './mission-parties.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {announcementState,announcementView,announcementReadable} from './announcements.mjs';
import {accountId,amountInput,currencyView,moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry} from './collective-accounts.mjs';
import {gameTime} from './clock.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
const adminActions=new Set(['sessionContracts','sessionContract','prepareMissionContract','proposeMissionContract','prepareContractReview','reviewContract','prepareContractClosure','closeContract']);
const actions=new Set([...adminActions,'myContracts','contractDetail','prepareContractAcceptance','acceptContract','declineContract','prepareContractProof','submitContractProof','markContractRead']);
export const contractAction=a=>actions.has(a);
const digest=x=>hash(JSON.stringify(x));
const text=(v,max=5000)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_CONTRACT');return v.trim();};
const active=c=>['ACTIVE','SUBMITTED'].includes(c.status);
const terminal=c=>['PAID','CANCELLED','EXPIRED','DECLINED'].includes(c.status);
const status=(c,s,at)=>c.status==='ACTIVE'&&gameTime(s.clock,at)>=c.deadlineGameMs?'OVERDUE':c.status;
const summary=(c,s,at,ctx=null)=>({id:c.id,revision:c.revision,title:c.terms.title,announcementId:c.announcementId,applicationId:c.applicationId,status:status(c,s,at),applicant:c.terms.applicant,sponsor:c.terms.sponsor,amount:c.terms.amount,currency:c.terms.currency,createdAt:c.createdAt,updatedAt:c.updatedAt,unread:(ctx?missionReadState(c,ctx).revision:c.lastReadRevision??0)<c.revision});
const candidate=participantCurrent;
async function wallet(tx,s,id){const a=await tx.get(`sessions/${s.id}/accounts/${documentId(id)}`);requireThat(a?.sessionId===s.id,'ACCOUNT_UNAVAILABLE');moneyState(a);return a;}
export function createContractService({store,signed,checkSession,now,uuid}){
  async function authorisedOffer(tx,s,c,a,at,ctx){
    requireThat(a&&a.revision===c.announcementRevision,'STALE_CONTRACT');
    requireThat(a.mode==='ASSIGNMENT'&&announcementState(a,at)==='OPEN','ANNOUNCEMENT_CLOSED');
    requireThat((a.assignedCount??0)<a.places,'MISSION_FULL');
    const t=await tx.get(`sessions/${s.id}/applications/${c.applicationId}`);
    requireThat(t?.contractId===c.id&&['SENT','DISCUSSION'].includes(t.status)&&t.intent==='APPLICATION','STALE_CONTRACT');
    requireThat((await candidate(tx,s,c)).current&&participantAllowed(a,participantOf(c))&&await announcementReadable(tx,s,a,ctx.c.id,at),'STALE_CONTRACT');
    await checkSession(tx,c.approvedBy,s.id);
  }
  async function prepare(tx,s,actor,input,at){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
    const t=await tx.get(`sessions/${s.id}/applications/${documentId(input.applicationId)}`);requireThat(t&&t.intent==='APPLICATION'&&['SENT','DISCUSSION'].includes(t.status),'APPLICATION_CLOSED');
    const a=await tx.get(`sessions/${s.id}/announcements/${t.announcementId}`);requireThat(a?.mode==='ASSIGNMENT','ASSIGNMENT_REQUIRED');
    requireThat(announcementState(a,at)==='OPEN','ANNOUNCEMENT_CLOSED');requireThat((a.assignedCount??0)<a.places,'MISSION_FULL');
    const p=await candidate(tx,s,t);let eligible=false;for(const cid of p.representatives)if(await announcementReadable(tx,s,a,cid,at))eligible=true;requireThat(p.current&&eligible&&participantAllowed(a,participantOf(t)),'STALE_APPLICATION');
    if(t.contractId){const old=await tx.get(`sessions/${s.id}/contracts/${t.contractId}`);requireThat(!old||['CANCELLED','EXPIRED','DECLINED'].includes(old.status),'CONTRACT_EXISTS');}
    const amount=amountInput(input.amount),durationMinutes=whole(input.durationMinutes,'INVALID_CONTRACT');requireThat(durationMinutes>0&&durationMinutes<=10080,'INVALID_CONTRACT');
    requireThat(input.advance===0&&input.guarantee===0,'UNSUPPORTED_CONTRACT');requireThat(['ACCOUNT','GM_EXTERNAL'].includes(input.funding),'INVALID_CONTRACT');
    const to=await wallet(tx,s,participantAccount(participantOf(t)));let source=null,sourceGuard=null,sourceName=null;
    if(input.funding==='ACCOUNT'){
      source=await wallet(tx,s,input.sourceAccountId);requireThat(source.id!==to.id,'INVALID_RECIPIENT');requireThat(moneyState(source).available>=amount,'INSUFFICIENT_FUNDS');
      if(source.ownerType==='CHARACTER'){const payer=await inventoryParty(tx,s.id,source.characterId);requireThat(payer.active,'INVALID_RECIPIENT');sourceGuard=payer.version;sourceName=payer.c.public.displayName;}
      else {requireThat(source.ownerType==='GROUP','INVALID_ACCOUNT');sourceName=source.label;}
    }
    const reason=text(input.reason,500),terms={title:a.title,description:a.description,sponsor:{kind:a.sponsorKind,name:a.sponsorName},applicant:participantOf(t),announcementReward:a.rewardText,amount,currency:currencyView(s.economyRules),funding:input.funding,durationMinutes,conditions:text(input.conditions),proofExpected:text(input.proofExpected,2000),confidentiality:text(input.confidentiality,2000),failureTerms:text(input.failureTerms,2000),validator:'MJ',advance:0,guarantee:0};
    const result={terms,announcement:announcementView(a,at),briefing:a.briefing,source:source?{id:source.id,name:sourceName,before:moneyState(source)}:null,reason};
    return {t,a,terms,source,sourceGuard,sourceName,reason,result:{...result,confirmation:digest([s.id,t.revision,t.applicantVersion,p.version,to.revision,a.revision,a.briefing,source?.revision??null,sourceGuard,result])}};
  }
  async function acceptance(tx,s,c,ctx,at){
    requireThat(c.status==='PROPOSED','CONTRACT_CLOSED');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,ctx.c,'publish');requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
    const a=await tx.get(`sessions/${s.id}/announcements/${c.announcementId}`);await authorisedOffer(tx,s,c,a,at,ctx);
    const to=await wallet(tx,s,participantAccount(participantOf(c)));let source=null;
    if(c.sourceAccountId){source=await wallet(tx,s,c.sourceAccountId);requireThat(source.id!==to.id,'INVALID_RECIPIENT');requireThat(moneyState(source).available>=c.terms.amount,'INSUFFICIENT_FUNDS');
      if(c.sourceGuard){const p=await inventoryParty(tx,s.id,source.characterId);requireThat(p.active&&p.version===c.sourceGuard,'STALE_CONTRACT');}}
    const result={contract:{...summary(c,s,at),terms:c.terms},confirmation:digest([c.id,c.revision,c.termsHash,ctx.partyGuard??ctx.version,source?.revision??null,to.revision,s.healthRules])};return {a,to,source,result};
  }
  async function proof(s,c,ctx,input,at){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,ctx.c,'publish');requireThat(c.status==='ACTIVE','CONTRACT_CLOSED');requireThat(gameTime(s.clock,at)<c.deadlineGameMs,'CONTRACT_OVERDUE');
    const body=text(input.body,6000),result={contract:summary(c,s,at),body,proofExpected:c.terms.proofExpected};return {body,result:{...result,confirmation:digest([c.id,c.revision,ctx.partyGuard??ctx.version,body,s.healthRules])}};
  }
  async function review(tx,s,c,input,at){
    requireThat(c.status==='SUBMITTED','CONTRACT_NOT_SUBMITTED');requireThat(['PAY','RETURN'].includes(input.decision),'INVALID_CONTRACT');
    const reason=text(input.reason,2000),p=await candidate(tx,s,c);requireThat(p.current,'STALE_CONTRACT');
    let source=null,to=null;
    if(input.decision==='PAY'){
      requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');to=await wallet(tx,s,participantAccount(participantOf(c)));whole(to.balance+c.terms.amount,'BALANCE_OVERFLOW');
      if(c.sourceAccountId){source=await wallet(tx,s,c.sourceAccountId);requireThat(source.reserved>=c.terms.amount,'INVALID_ACCOUNT');}
    }else requireThat(s.stage!=='FINISHED'&&gameTime(s.clock,at)<c.deadlineGameMs,'CONTRACT_OVERDUE');
    const result={contract:summary(c,s,at),proof:c.proof,decision:input.decision,reason,amount:input.decision==='PAY'?c.terms.amount:0,currency:c.terms.currency,createdCurrency:input.decision==='PAY'&&!source?c.terms.amount:0,source:source?{name:c.sourceName,before:moneyState(source),after:moneyState({...source,balance:source.balance-c.terms.amount,reserved:source.reserved-c.terms.amount,revision:source.revision+1})}:null};
    return {source,to,reason,result:{...result,confirmation:digest([c.id,c.revision,p.version,source?.revision??null,to?.revision??null,result])}};
  }
  async function closure(tx,s,c,input,at){
    requireThat(!terminal(c),'CONTRACT_CLOSED');requireThat(['CANCEL','EXPIRE'].includes(input.decision),'INVALID_CONTRACT');
    if(input.decision==='EXPIRE')requireThat((c.status==='ACTIVE'&&gameTime(s.clock,at)>=c.deadlineGameMs)||(c.status==='PROPOSED'&&at>=c.offerDeadline),'CONTRACT_NOT_OVERDUE');
    const reason=text(input.reason,2000),source=active(c)&&c.sourceAccountId?await wallet(tx,s,c.sourceAccountId):null;
    if(source)requireThat(source.reserved>=c.terms.amount,'INVALID_ACCOUNT');
    const a=await tx.get(`sessions/${s.id}/announcements/${c.announcementId}`),t=await tx.get(`sessions/${s.id}/applications/${c.applicationId}`);requireThat(a&&t,'NOT_FOUND');
    const result={contract:summary(c,s,at),decision:input.decision,reason,released:source?c.terms.amount:0,currency:c.terms.currency};
    return {source,a,t,reason,result:{...result,confirmation:digest([c.id,c.revision,source?.revision??null,result])}};
  }
  async function readable(tx,s,c,ctx,actor,at){
    const access=await participantAccess(tx,s,ctx,actor,c);requireThat(access,'FORBIDDEN');ctx.partyGuard=access.guard;if(c.status==='PROPOSED'){const a=await tx.get(`sessions/${s.id}/announcements/${c.announcementId}`);requireThat(await announcementReadable(tx,s,a,ctx.c.id,at),'FORBIDDEN');}
  }
  async function detail(tx,s,c,ctx,at,admin){
    const p=await candidate(tx,s,c);let canAccept=false,unavailable=null;
    if(!admin&&c.status==='PROPOSED')try{await acceptance(tx,s,c,ctx,at);canAccept=true;}catch(e){if(!e.code)throw e;unavailable=e.code;}
    const history=await tx.list(`sessions/${s.id}/contracts/${c.id}/history`,null,{orderBy:'at',direction:'desc',limit:30});
    return {session:{id:s.id},admin,contract:{...summary(c,s,at,ctx),terms:c.terms,acceptedAt:c.acceptedAt??null,deadlineGameMs:c.deadlineGameMs??null,remainingGameMs:c.deadlineGameMs==null?null:Math.max(0,c.deadlineGameMs-gameTime(s.clock,at)),proof:c.proof??null,briefing:c.acceptedAt!=null||admin?c.briefing:null},
      history:admin?history:history.map(e=>({id:e.id,at:e.at,action:e.action,body:e.body??'',reason:e.publicReason??'',decision:e.decision??'',amount:e.amount??0})),candidateCurrent:p.current,canAccept,unavailable,
      canDecline:!admin&&c.status==='PROPOSED',canSubmit:!admin&&c.status==='ACTIVE'&&gameTime(s.clock,at)<c.deadlineGameMs&&s.stage==='EN_JEU'&&canGameAction(s,ctx.c,'publish'),
      canReview:admin&&p.current&&c.status==='SUBMITTED',canClose:admin&&!terminal(c),canExpire:admin&&((c.status==='ACTIVE'&&gameTime(s.clock,at)>=c.deadlineGameMs)||(c.status==='PROPOSED'&&at>=c.offerDeadline)),
      ...(admin?{finance:{funding:c.terms.funding,sourceName:c.sourceName,sourceAccountId:c.sourceAccountId,approvedBy:c.approvedBy.email,reason:c.reason}}:{})};
  }
  function ledger(tx,s,c,id,at,actor,kind,source,to,sourceNext,toNext,reason){
    const entries=[];if(source)entries.push(accountEntry(source,sourceNext.balance-source.balance,sourceNext));if(to)entries.push(accountEntry(to,toNext.balance-to.balance,toNext));
    if(source)tx.set(`sessions/${s.id}/accounts/${source.id}`,sourceNext);if(to)tx.set(`sessions/${s.id}/accounts/${to.id}`,toNext);
    writeLedger(tx,s.id,{id,kind,at,actorUid:actor.uid,memo:`${kind==='CONTRACT_RESERVE'?'Réservation':kind==='CONTRACT_RELEASE'?'Libération':'Règlement'} · ${c.terms.title}`,reason,contractId:c.id,announcementId:c.announcementId,source:{name:c.terms.sponsor.name},recipient:participantOf(c).kind==='GROUP'?{kind:'GROUP',id:participantAccount(participantOf(c)),name:to?.label??'Caisse de bande'}:c.terms.applicant,createdCurrency:kind==='GM_CONTRACT_PAY'?c.terms.amount:0,removedCurrency:0,entries});
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),id=uuid();return store.runTransaction(async tx=>{
      const admin=adminActions.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId)),version:actor.uid}:await inventoryPlayer(tx,actor,input),{s}=ctx,base=`sessions/${s.id}`;requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      if(action==='sessionContracts'||action==='myContracts'){
        const contracts=[];for(const c of await tx.list(`${base}/contracts`)){
          if(!admin){if(!await participantAccess(tx,s,ctx,actor,c))continue;if(c.status==='PROPOSED'){const a=await tx.get(`${base}/announcements/${c.announcementId}`);if(!await announcementReadable(tx,s,a,ctx.c.id,at))continue;}}
          contracts.push(summary(c,s,at,ctx));}
        return {session:{id:s.id},admin,contracts:contracts.sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id))};
      }
      if(action==='prepareMissionContract')return (await prepare(tx,s,actor,input,at)).result;
      let c;
      if(action!=='proposeMissionContract'){
        c=await tx.get(`${base}/contracts/${documentId(input.contractId)}`);requireThat(c,admin?'NOT_FOUND':'FORBIDDEN');if(!admin)await readable(tx,s,c,ctx,actor,at);
        if(action==='sessionContract'||action==='contractDetail')return detail(tx,s,c,ctx,at,admin);
        if(action==='prepareContractAcceptance')return (await acceptance(tx,s,c,ctx,at)).result;
        if(action==='prepareContractProof')return (await proof(s,c,ctx,input,at)).result;
        if(action==='prepareContractReview')return (await review(tx,s,c,input,at)).result;
        if(action==='prepareContractClosure')return (await closure(tx,s,c,input,at)).result;
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=digest([action,input]),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===(ctx.partyGuard??ctx.version),'FORBIDDEN');return previous.result;}
      let next,event={id,action,at,actorUid:actor.uid};
      if(action==='proposeMissionContract'){
        const x=await prepare(tx,s,actor,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        c={id,revision:1,status:'PROPOSED',announcementId:x.a.id,announcementRevision:x.a.revision,applicationId:x.t.id,participant:participantOf(x.t),applicantUid:x.t.applicantUid,characterId:x.t.characterId,applicantVersion:x.t.applicantVersion,terms:x.terms,termsHash:digest(x.terms),briefing:x.a.briefing,sourceAccountId:x.source?.id??null,sourceGuard:x.sourceGuard,sourceName:x.sourceName,reason:x.reason,approvedBy:{uid:actor.uid,email:actor.email,emailVerified:true,provider:actor.provider},offerDeadline:x.a.deadline,createdAt:at,updatedAt:at,lastReadRevision:0};next=c;
        tx.set(`${base}/applications/${x.t.id}`,{...x.t,contractId:c.id,revision:x.t.revision+1,updatedAt:at});event.terms=c.terms;event.reason=x.reason;
      }else if(action==='acceptContract'){
        const x=await acceptance(tx,s,c,ctx,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');const t=await tx.get(`${base}/applications/${c.applicationId}`),gameAt=gameTime(s.clock,at);
        next={...c,status:'ACTIVE',acceptedAt:at,acceptedGameMs:gameAt,deadlineGameMs:whole(gameAt+c.terms.durationMinutes*60000,'INVALID_CONTRACT'),acceptedTermsHash:c.termsHash,acceptedBy:actor.uid};
        if(x.source)ledger(tx,s,c,id,at,actor,'CONTRACT_RESERVE',x.source,null,{...x.source,reserved:x.source.reserved+c.terms.amount,revision:x.source.revision+1},null,'Accord organisateur et candidat sur la même version');
        tx.set(`${base}/announcements/${x.a.id}`,{...x.a,assignedCount:(x.a.assignedCount??0)+1});tx.set(`${base}/applications/${t.id}`,{...t,status:'ASSIGNED',revision:t.revision+1,updatedAt:at});
      }else if(action==='declineContract'){
        requireThat(c.status==='PROPOSED','CONTRACT_CLOSED');requireThat(input.revision===c.revision,'STALE_REVISION');next={...c,status:'DECLINED'};
      }else if(action==='submitContractProof'){
        const x=await proof(s,c,ctx,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');next={...c,status:'SUBMITTED',proof:{body:x.body,at,gameMs:gameTime(s.clock,at)}};event.body=x.body;
      }else if(action==='reviewContract'){
        const x=await review(tx,s,c,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        next={...c,status:input.decision==='PAY'?'PAID':'ACTIVE'};event.publicReason=x.reason;event.decision=input.decision;
        if(input.decision==='PAY'){
          next.paidAt=at;next.paymentId=id;event.amount=c.terms.amount;
          ledger(tx,s,c,id,at,actor,x.source?'CONTRACT_PAY':'GM_CONTRACT_PAY',x.source,x.to,x.source?{...x.source,balance:x.source.balance-c.terms.amount,reserved:x.source.reserved-c.terms.amount,revision:x.source.revision+1}:null,{...x.to,balance:x.to.balance+c.terms.amount,revision:x.to.revision+1},x.reason);
        }
      }else if(action==='closeContract'){
        const x=await closure(tx,s,c,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');next={...c,status:input.decision==='EXPIRE'?'EXPIRED':'CANCELLED'};event.publicReason=x.reason;event.decision=input.decision;
        if(active(c)){
          requireThat((x.a.assignedCount??0)>0,'INVALID_CONTRACT');tx.set(`${base}/announcements/${x.a.id}`,{...x.a,assignedCount:x.a.assignedCount-1});
          if(x.source)ledger(tx,s,c,id,at,actor,'CONTRACT_RELEASE',x.source,null,{...x.source,reserved:x.source.reserved-c.terms.amount,revision:x.source.revision+1},null,x.reason);
          if(x.t.contractId===c.id)tx.set(`${base}/applications/${x.t.id}`,{...x.t,status:'DISCUSSION',revision:x.t.revision+1,updatedAt:at});
        }
      }else{
        requireThat(action==='markContractRead'&&input.revision===c.revision,'STALE_REVISION');next=withMissionRead(c,ctx,c.revision);
      }
      if(action!=='proposeMissionContract'&&action!=='markContractRead')next={...next,revision:c.revision+1,updatedAt:at};
      const result={id:c.id,status:next.status,revision:next.revision};tx.set(`${base}/contracts/${c.id}`,next);
      if(action!=='markContractRead'){tx.set(`${base}/contracts/${c.id}/history/${id}`,event);tx.set(`${base}/audit/${id}`,{...event,contractId:c.id,announcementId:c.announcementId,applicationId:c.applicationId});}
      tx.set(op,{fingerprint,guard:ctx.partyGuard??ctx.version,result,at});return result;
    });
  };
}

