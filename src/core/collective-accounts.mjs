import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {groupVisible,memberFor} from './groups.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {accountId,groupAccountId,amountInput,currencyView,moneyState,moneyText,openGroupWallet,projectEntry,writeLedger} from './economy-state.mjs';
const actions=new Set(['prepareGroupWallet','setGroupWallet','myAccounts','readAccount','previewAccount','prepareAccountPayment','payFromAccount']);
export const collectiveAction=a=>actions.has(a);
const published=c=>c?.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED';
const identity=(c,r)=>hash(JSON.stringify([c.id,c.assignedUid,r?.accessVersion??null,c.public.displayName]));
const metadata=x=>({id:x.a.id,kind:x.a.ownerType,name:x.name,canRead:x.read,canSpend:x.spend});
const party=x=>({id:x.a.ownerType==='GROUP'?x.a.id:x.a.characterId,kind:x.a.ownerType,name:x.name});
const entry=(a,delta,next)=>({accountId:a.id,characterId:a.characterId??null,groupId:a.groupId??null,delta,before:moneyState(a),after:moneyState(next)});
export function createCollectiveService({store,signed,checkSession,checkScenario,now,uuid}){
  async function context(tx,actor,input,preview=false){
    const sid=documentId(input.sessionId),s=preview?await checkSession(tx,actor,sid):await tx.get(`sessions/${sid}`);
    requireThat(s&&s.stage!=='ARCHIVED','FORBIDDEN');
    const r=preview?null:await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
    if(!preview)requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
    const c=await tx.get(`sessions/${sid}/characters/${preview?documentId(input.characterId):r.characterId}`);
    requireThat(c&&(preview||c.assignedUid===actor.uid),'FORBIDDEN');requireThat(published(c),'CONTENT_UNPUBLISHED');
    requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
    return {s,c,r,guard:identity(c,r)};
  }
  async function access(tx,ctx,id){
    const {s,c,guard}=ctx,a=await tx.get(`sessions/${s.id}/accounts/${documentId(id)}`);
    requireThat(a?.sessionId===s.id,'FORBIDDEN');
    if(a.ownerType==='CHARACTER'){
      requireThat(a.characterId===c.id&&a.id===accountId(c.id),'FORBIDDEN');moneyState(a);
      return {a,name:c.public.displayName,read:true,spend:true,guard};
    }
    requireThat(a.ownerType==='GROUP'&&s.modules?.groups===true&&a.id===groupAccountId(a.groupId),'FORBIDDEN');
    const g=await tx.get(`sessions/${s.id}/groups/${a.groupId}`);requireThat(groupVisible(g,c.id)&&g.walletConfig,'FORBIDDEN');
    const m=memberFor(g,c.id),read=m.permissions.readWallet===true,spend=m.permissions.payWallet===true;
    requireThat(read||spend,'FORBIDDEN');moneyState(a);requireThat(a.label===g.walletConfig.label,'INVALID_ACCOUNT');
    return {a,name:a.label,read,spend,guard:hash(JSON.stringify([guard,g.id,g.revision,m.permissions.readWallet===true,m.permissions.payWallet===true]))};
  }
  async function available(tx,ctx){
    const result=[metadata(await access(tx,ctx,accountId(ctx.c.id)))];
    if(ctx.s.modules?.groups===true){
      const groups=await tx.list(`sessions/${ctx.s.id}/groups`);
      for(const g of groups){
        const m=memberFor(g,ctx.c.id);if(!groupVisible(g,ctx.c.id)||!g.walletConfig||!(m.permissions.readWallet||m.permissions.payWallet))continue;
        result.push(metadata(await access(tx,ctx,groupAccountId(g.id))));
      }
    }
    return result;
  }
  async function recipient(tx,ctx,input){
    requireThat(!!input.recipientId!==!!input.toAccountId,'INVALID_RECIPIENT');
    if(input.toAccountId)return access(tx,ctx,input.toAccountId);
    const cid=documentId(input.recipientId),c=await tx.get(`sessions/${ctx.s.id}/characters/${cid}`);
    requireThat(published(c)&&c.assignedUid,'INVALID_RECIPIENT');const r=await tx.get(`sessions/${ctx.s.id}/registrations/${hash(c.assignedUid)}`);
    requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId===cid,'INVALID_RECIPIENT');
    const a=await tx.get(`sessions/${ctx.s.id}/accounts/${accountId(cid)}`);requireThat(a?.sessionId===ctx.s.id&&a.ownerType==='CHARACTER'&&a.characterId===cid,'ACCOUNT_UNAVAILABLE');moneyState(a);
    return {a,name:c.public.displayName,read:false,spend:false,guard:identity(c,r)};
  }
  async function payment(tx,ctx,from,input){
    requireThat(from.spend,'FORBIDDEN');requireThat(ctx.s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(ctx.s,ctx.c,'pay');
    const to=await recipient(tx,ctx,input);requireThat(from.a.id!==to.a.id,'INVALID_RECIPIENT');
    const amount=amountInput(input.amount),memo=moneyText(input.memo),before=moneyState(from.a);requireThat(before.available>=amount,'INSUFFICIENT_FUNDS');whole(to.a.balance+amount,'BALANCE_OVERFLOW');
    const after={...before,balance:before.balance-amount,available:before.available-amount,revision:before.revision+1};
    const result={source:party(from),recipient:party(to),currency:currencyView(ctx.s.economyRules),amount,memo,...(from.read?{before,after}:{})};
    // For spend-only access the proof binds the account revision, not a hidden balance.
    return {to,result:{...result,confirmation:hash(JSON.stringify([ctx.s.id,from.guard,to.guard,from.a.revision,ctx.s.healthRules,result]))}};
  }
  async function configure(tx,action,actor,input,at,id){
    requireThat(!!input.sessionId!==!!input.scenarioId,'INVALID_ECONOMY');const scenario=!!input.scenarioId,pid=documentId(scenario?input.scenarioId:input.sessionId),base=`${scenario?'scenarios':'sessions'}/${pid}`;
    const p=scenario?await checkScenario(tx,actor,pid):await checkSession(tx,actor,pid);requireThat(p.stage!=='ARCHIVED','SESSION_CLOSED');
    let op,fingerprint;if(action==='setGroupWallet'){
      op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([action,input]));const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}
    }
    requireThat(p.revision===input.revision,'STALE_REVISION');requireThat(!!p.economyRules,'ECONOMY_DISABLED');
    const gid=documentId(input.groupId),g=await tx.get(`${base}/groups/${gid}`);requireThat(g,'NOT_FOUND');
    const label=moneyText(input.label,100),reason=scenario?'Configuration du scénario':moneyText(input.reason);
    if(!scenario)requireThat(input.amount===undefined,'INVALID_AMOUNT');
    const amount=scenario?whole(input.amount,'INVALID_AMOUNT'):0,previous=g.walletConfig??null;
    const config={label,amount:scenario?amount:(previous?.amount??0),revision:(previous?.revision??0)+1};
    const a=scenario?null:await tx.get(`${base}/accounts/${groupAccountId(gid)}`);if(a){requireThat(a.ownerType==='GROUP'&&a.groupId===gid&&a.sessionId===pid,'INVALID_ACCOUNT');moneyState(a);}
    const prepared={group:{id:gid,name:g.name},currency:currencyView(p.economyRules),scenario,before:previous,after:config,opening:!scenario&&!a,confirmation:hash(JSON.stringify([p.revision,g.revision,previous,config,a?.revision??null,reason]))};
    if(action==='prepareGroupWallet')return prepared;requireThat(input.confirmation===prepared.confirmation,'STALE_REVISION');
    const next={...g,walletConfig:config,revision:g.revision+1};
    if(!scenario){if(a)tx.set(`${base}/accounts/${a.id}`,{...a,label,revision:a.revision+1});else openGroupWallet(tx,pid,next,0,at,actor.uid,'OPENING');}
    tx.set(`${base}/groups/${gid}`,next);tx.set(`${base}/groups/${gid}/history/${id}`,{id,at,actorUid:actor.uid,actorEmail:actor.email,reason,before:g,after:next});
    tx.set(base,{...p,revision:p.revision+1});if(!scenario)tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,groupId:gid,reason});
    const result={id:gid,accountId:groupAccountId(gid)};tx.set(op,{fingerprint,result,at});return result;
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),id=uuid();return store.runTransaction(async tx=>{
      if(action==='prepareGroupWallet'||action==='setGroupWallet')return configure(tx,action,actor,input,at,id);
      const preview=action==='previewAccount',ctx=await context(tx,actor,input,preview),{s,c}=ctx;
      if(action==='myAccounts')return {session:{id:s.id,stage:s.stage},character:{id:c.id,name:c.public.displayName},currency:currencyView(s.economyRules),accounts:await available(tx,ctx)};
      const from=await access(tx,ctx,action==='readAccount'||preview?input.accountId:input.fromAccountId);
      if(action==='readAccount'||preview)return {session:{id:s.id,stage:s.stage},character:{id:c.id,name:c.public.displayName},currency:currencyView(s.economyRules),preview,account:metadata(from),canRead:from.read,canPay:!preview&&from.spend&&s.stage==='EN_JEU'&&canGameAction(s,c,'pay'),...(from.read?{balances:moneyState(from.a),entries:(await tx.list(`sessions/${s.id}/accounts/${from.a.id}/history`,null,{orderBy:'at',direction:'desc',limit:30})).map(projectEntry)}:{})};
      requireThat(from.spend,'FORBIDDEN');
      if(action==='prepareAccountPayment')return (await payment(tx,ctx,from,input)).result;
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===from.guard,'FORBIDDEN');return previous.result;}
      const x=await payment(tx,ctx,from,input);requireThat(x.result.confirmation===input.confirmation,'STALE_REVISION');
      const amount=x.result.amount,a=from.a,b=x.to.a,fromNext={...a,balance:a.balance-amount,revision:a.revision+1},toNext={...b,balance:b.balance+amount,revision:b.revision+1};
      tx.set(`sessions/${s.id}/accounts/${a.id}`,fromNext);tx.set(`sessions/${s.id}/accounts/${b.id}`,toNext);
      writeLedger(tx,s.id,{id,kind:'TRANSFER',at,actorUid:actor.uid,operatorCharacterId:c.id,memo:x.result.memo,reason:'Paiement confirmé par un titulaire autorisé',source:party(from),recipient:party(x.to),createdCurrency:0,removedCurrency:0,entries:[entry(a,-amount,fromNext),entry(b,amount,toNext)]});
      tx.set(`sessions/${s.id}/audit/${id}`,{id,action,at,actorUid:actor.uid,operatorCharacterId:c.id,fromAccountId:a.id,toAccountId:b.id,amount});
      const result={id,amount,source:party(from),recipient:party(x.to),currency:x.result.currency,...(from.read?{account:moneyState(fromNext)}:{})};
      tx.set(op,{fingerprint,result,guard:from.guard,at});return result;
    });
  };
}
