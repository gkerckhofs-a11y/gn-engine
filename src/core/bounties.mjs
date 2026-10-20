import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {announcementState,announcementReadable} from './announcements.mjs';
import {accountId,amountInput,currencyView,moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry} from './collective-accounts.mjs';
import {requireGameAction,canGameAction} from './health-state.mjs';
const admins=new Set(['sessionBounties','sessionBounty','prepareBounty','openBounty','prepareBountyReview','reviewBounty','prepareBountyClosure','closeBounty']);
export const bountyCommands=[...admins,'bounties','bountyDetail','prepareBountyClaim','submitBountyClaim'];
export const bountyAction=a=>bountyCommands.includes(a);
const digest=x=>hash(JSON.stringify(x));
const text=(v,max)=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=max,'INVALID_BOUNTY');return v.trim();};
const state=(b,at)=>b.status==='OPEN'&&at>=b.terms.deadline?'OVERDUE':b.status;
const own=(c,ctx,actor)=>c&&c.applicantUid===actor.uid&&c.characterId===ctx.c.id&&c.applicantVersion===ctx.version;
const claimView=c=>c?{id:c.id,revision:c.revision,status:c.status,applicant:{id:c.characterId,name:c.applicantName},body:c.body,submittedAt:c.submittedAt,reason:c.reason??'',paidAt:c.paidAt??null}:null;
const view=(b,at)=>({id:b.id,revision:b.revision,status:state(b,at),terms:b.terms,paidCount:b.paidCount,remaining:b.terms.quota-b.paidCount,closeReason:b.closeReason??''});
async function wallet(tx,s,id){const a=await tx.get(`sessions/${s.id}/accounts/${documentId(id)}`);requireThat(a?.sessionId===s.id,'ACCOUNT_UNAVAILABLE');moneyState(a);return a;}
export function createBountyService({store,signed,checkSession,now,uuid}){
  async function setup(tx,s,input,at){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
    const a=await tx.get(`sessions/${s.id}/announcements/${documentId(input.announcementId)}`);
    requireThat(a?.mode==='OPEN_BOUNTY'&&a.rewardType==='FIXED','BOUNTY_REQUIRED');requireThat(announcementState(a,at)==='OPEN','ANNOUNCEMENT_CLOSED');
    requireThat(!await tx.get(`sessions/${s.id}/bounties/${a.id}`),'BOUNTY_EXISTS');
    const amount=amountInput(input.amount),total=whole(amount*a.places,'INVALID_AMOUNT');requireThat(['ACCOUNT','GM_EXTERNAL'].includes(input.funding),'INVALID_BOUNTY');
    let source=null,sourceName=null;
    if(input.funding==='ACCOUNT'){
      source=await wallet(tx,s,input.sourceAccountId);requireThat(moneyState(source).available>=total,'INSUFFICIENT_FUNDS');
      if(source.ownerType==='CHARACTER'){const p=await inventoryParty(tx,s.id,source.characterId);requireThat(p.active,'INVALID_RECIPIENT');sourceName=p.c.public.displayName;}
      else {requireThat(source.ownerType==='GROUP','INVALID_ACCOUNT');sourceName=source.label;}
    }
    const reason=text(input.reason,500),terms={title:a.title,description:a.description,sponsor:{kind:a.sponsorKind,name:a.sponsorName},conditions:a.conditions,proofExpected:a.proofExpected,amount,quota:a.places,currency:currencyView(s.economyRules),funding:input.funding,deadline:a.deadline};
    const result={terms,total,reason,source:source?{name:sourceName,before:moneyState(source)}:null};
    return {a,source,sourceName,reason,terms,result:{...result,confirmation:digest([s.id,a.revision,a.audience,source?.revision??null,result])}};
  }
  async function proof(tx,s,b,c,ctx,actor,input,at){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,ctx.c,'publish');requireThat(state(b,at)==='OPEN','BOUNTY_CLOSED');
    requireThat(await announcementReadable(tx,s,b.audienceSnapshot,ctx.c.id,at),'FORBIDDEN');
    requireThat(!c||(own(c,ctx,actor)&&c.status==='RETURNED'),'BOUNTY_CLAIM_EXISTS');
    requireThat(accountId(ctx.c.id)!==b.sourceAccountId,'INVALID_RECIPIENT');await wallet(tx,s,accountId(ctx.c.id));
    const body=text(input.body,6000),result={bounty:view(b,at),body,applicant:{id:ctx.c.id,name:ctx.c.public.displayName}};
    return {body,result:{...result,confirmation:digest([b.id,b.revision,c?.revision??0,ctx.version,s.healthRules,result])}};
  }
  async function review(tx,s,b,c,input,at){
    requireThat(b.status==='OPEN','BOUNTY_CLOSED');requireThat(c?.status==='SUBMITTED','BOUNTY_NOT_SUBMITTED');requireThat(['PAY','RETURN','REJECT'].includes(input.decision),'INVALID_BOUNTY');
    const reason=text(input.reason,2000);let source=null,to=null;
    if(input.decision==='PAY'){
      requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireThat(b.paidCount<b.terms.quota,'BOUNTY_CLOSED');
      const p=await inventoryParty(tx,s.id,c.characterId);requireThat(p.active&&p.c.assignedUid===c.applicantUid&&p.version===c.applicantVersion,'STALE_BOUNTY_CLAIM');
      to=await wallet(tx,s,accountId(c.characterId));requireThat(to.id!==b.sourceAccountId,'INVALID_RECIPIENT');whole(to.balance+b.terms.amount,'BALANCE_OVERFLOW');
      if(b.sourceAccountId){source=await wallet(tx,s,b.sourceAccountId);requireThat(source.reserved>=(b.terms.quota-b.paidCount)*b.terms.amount,'INVALID_ACCOUNT');}
    }else if(input.decision==='RETURN')requireThat(s.stage!=='FINISHED'&&at<b.terms.deadline,'BOUNTY_CLOSED');
    const result={bounty:view(b,at),claim:claimView(c),decision:input.decision,reason,paid:input.decision==='PAY'?b.terms.amount:0,createdCurrency:input.decision==='PAY'&&!source?b.terms.amount:0};
    return {source,to,reason,result:{...result,confirmation:digest([b.id,b.revision,c.id,c.revision,source?.revision??null,to?.revision??null,result])}};
  }
  async function closure(tx,s,b,input,at){
    requireThat(b.status==='OPEN','BOUNTY_CLOSED');const reason=text(input.reason,2000),source=b.sourceAccountId?await wallet(tx,s,b.sourceAccountId):null,total=(b.terms.quota-b.paidCount)*b.terms.amount;
    if(source)requireThat(source.reserved>=total,'INVALID_ACCOUNT');
    const pending=(await tx.list(`sessions/${s.id}/bounties/${b.id}/claims`)).filter(c=>c.status==='SUBMITTED').length;
    const result={bounty:view(b,at),reason,released:source?total:0,pending};return {source,total,reason,result:{...result,confirmation:digest([b.id,b.revision,source?.revision??null,result])}};
  }
  function ledger(tx,s,b,eventId,at,actor,kind,source,to,reserveDelta,amount,reason,c=null){
    const entries=[];
    if(source){const next={...source,balance:source.balance-amount,reserved:source.reserved+reserveDelta,revision:source.revision+1};entries.push(accountEntry(source,-amount,next));tx.set(`sessions/${s.id}/accounts/${source.id}`,next);}
    if(to){const next={...to,balance:to.balance+amount,revision:to.revision+1};entries.push(accountEntry(to,amount,next));tx.set(`sessions/${s.id}/accounts/${to.id}`,next);}
    writeLedger(tx,s.id,{id:eventId,kind,at,actorUid:actor.uid,memo:`Prime · ${b.terms.title}`,reason,bountyId:b.id,claimId:c?.id??null,source:{name:b.terms.sponsor.name},recipient:c?{id:c.characterId,name:c.applicantName}:null,createdCurrency:kind==='GM_BOUNTY_PAY'?amount:0,removedCurrency:0,entries});
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),eventId=uuid();return store.runTransaction(async tx=>{
      const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId)),version:actor.uid}:await inventoryPlayer(tx,actor,input),{s}=ctx,base=`sessions/${s.id}`;
      requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      if(action==='sessionBounties'||action==='bounties'){
        const bounties=[];
        for(const b of await tx.list(`${base}/bounties`)){
          const c=admin?null:await tx.get(`${base}/bounties/${b.id}/claims/${hash(ctx.c.id)}`);
          if(admin||own(c,ctx,actor)||await announcementReadable(tx,s,b.audienceSnapshot,ctx.c.id,at))bounties.push({...view(b,at),myClaim:own(c,ctx,actor)?claimView(c):null});
        }
        return {session:{id:s.id},admin,bounties:bounties.sort((a,b)=>a.terms.deadline-b.terms.deadline)};
      }
      if(action==='prepareBounty')return (await setup(tx,s,input,at)).result;
      let b,c,a;
      if(action!=='openBounty'){
        b=await tx.get(`${base}/bounties/${documentId(input.bountyId)}`);requireThat(b,admin?'NOT_FOUND':'FORBIDDEN');
        if(!admin){c=await tx.get(`${base}/bounties/${b.id}/claims/${hash(ctx.c.id)}`);requireThat(own(c,ctx,actor)||await announcementReadable(tx,s,b.audienceSnapshot,ctx.c.id,at),'FORBIDDEN');}
        if(action==='sessionBounty'||action==='bountyDetail'){
          const claims=admin?await tx.list(`${base}/bounties/${b.id}/claims`):own(c,ctx,actor)?[c]:[];
          const history=admin?await tx.list(`${base}/bounties/${b.id}/history`,null,{orderBy:'at',direction:'desc',limit:50}):own(c,ctx,actor)?await tx.list(`${base}/bounties/${b.id}/claims/${c.id}/history`,null,{orderBy:'at',direction:'desc',limit:30}):[];
          return {session:{id:s.id},admin,bounty:view(b,at),claims:claims.map(claimView),history:history.map(e=>({at:e.at,action:e.action,body:e.body??'',reason:e.reason??'',decision:e.decision??''})),canClaim:!admin&&state(b,at)==='OPEN'&&s.stage==='EN_JEU'&&canGameAction(s,ctx.c,'publish')&&(!c||(own(c,ctx,actor)&&c.status==='RETURNED'))&&accountId(ctx.c.id)!==b.sourceAccountId&&await announcementReadable(tx,s,b.audienceSnapshot,ctx.c.id,at),canClose:admin&&b.status==='OPEN',...(admin?{finance:{sourceName:b.sourceName,sourceAccountId:b.sourceAccountId,reason:b.reason}}:{})};
        }
        if(action==='prepareBountyClaim')return (await proof(tx,s,b,c,ctx,actor,input,at)).result;
        if(['prepareBountyReview','reviewBounty'].includes(action))c=await tx.get(`${base}/bounties/${b.id}/claims/${documentId(input.claimId)}`);
        if(action==='prepareBountyReview')return (await review(tx,s,b,c,input,at)).result;
        if(action==='prepareBountyClosure')return (await closure(tx,s,b,input,at)).result;
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=digest([action,input]),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===ctx.version,'FORBIDDEN');return previous.result;}
      let next,event={id:eventId,action,at,actorUid:actor.uid};
      if(action==='openBounty'){
        const x=await setup(tx,s,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');a=x.a;
        b={id:a.id,revision:0,status:'OPEN',terms:x.terms,paidCount:0,audienceSnapshot:{publication:'PUBLISHED',opensAt:a.opensAt,deadline:a.deadline,mode:a.mode,audience:a.audience},sourceAccountId:x.source?.id??null,sourceName:x.sourceName,reason:x.reason,createdAt:at};next=b;event.reason=x.reason;
        if(x.source)ledger(tx,s,b,eventId,at,actor,'BOUNTY_RESERVE',x.source,null,x.result.total,0,x.reason);
      }else if(action==='submitBountyClaim'){
        const x=await proof(tx,s,b,c,ctx,actor,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        c={id:hash(ctx.c.id),revision:(c?.revision??0)+1,status:'SUBMITTED',applicantUid:actor.uid,characterId:ctx.c.id,applicantVersion:ctx.version,applicantName:ctx.c.public.displayName,body:x.body,submittedAt:at};event.body=x.body;next=b;
        tx.set(`${base}/bounties/${b.id}/claims/${c.id}`,c);
      }else if(action==='reviewBounty'){
        const x=await review(tx,s,b,c,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        a=await tx.get(`${base}/announcements/${b.id}`);event.reason=x.reason;event.decision=input.decision;
        c={...c,revision:c.revision+1,status:input.decision==='PAY'?'PAID':input.decision==='RETURN'?'RETURNED':'REJECTED',reason:x.reason};next=b;
        if(input.decision==='PAY'){
          c.paidAt=at;c.paymentId=eventId;next={...b,paidCount:b.paidCount+1,status:b.paidCount+1===b.terms.quota?'EXHAUSTED':'OPEN'};
          ledger(tx,s,b,eventId,at,actor,x.source?'BOUNTY_PAY':'GM_BOUNTY_PAY',x.source,x.to,-b.terms.amount,b.terms.amount,x.reason,c);
        }
        tx.set(`${base}/bounties/${b.id}/claims/${c.id}`,c);
      }else{
        requireThat(action==='closeBounty','INVALID_BOUNTY');const x=await closure(tx,s,b,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');a=await tx.get(`${base}/announcements/${b.id}`);
        next={...b,status:'CLOSED',closeReason:x.reason,closedAt:at};event.reason=x.reason;
        if(x.source)ledger(tx,s,b,eventId,at,actor,'BOUNTY_RELEASE',x.source,null,-x.total,0,x.reason);
      }
      next={...next,revision:b.revision+1,updatedAt:at};
      if(a)tx.set(`${base}/announcements/${a.id}`,{...a,bountyId:b.id,publication:next.status==='OPEN'?'PUBLISHED':'CLOSED'});
      tx.set(`${base}/bounties/${b.id}`,next);
      tx.set(`${base}/bounties/${b.id}/history/${eventId}`,{...event,claimId:c?.id??null});
      if(c)tx.set(`${base}/bounties/${b.id}/claims/${c.id}/history/${eventId}`,event);
      tx.set(`${base}/audit/${eventId}`,{...event,bountyId:b.id,claimId:c?.id??null});
      const result={id:b.id,revision:next.revision,status:next.status};tx.set(op,{fingerprint,guard:ctx.version,result,at});return result;
    });
  };
}
