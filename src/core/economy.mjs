import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {administrativeWallet,accountId,amountInput,currencyView,economyRulesInput,moneyState,moneyText,openWallet,partyName,projectEntry,writeLedger} from './economy-state.mjs';
const adminActions=new Set(['saveScenarioEconomy','saveSessionEconomy','prepareStartingCredits','setStartingCredits','prepareCreditAdjustment','applyCreditAdjustment','walletHistory']);
export const economyAction=a=>adminActions.has(a)||['myWallet','previewWallet','preparePayment','payCredits'].includes(a);
const identity=(c,r)=>hash(JSON.stringify([c.id,c.assignedUid,r.accessVersion,c.public.displayName]));
const published=c=>c?.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED';
const wallet=async(tx,sid,cid)=>{
  const a=await tx.get(`sessions/${sid}/accounts/${accountId(cid)}`);
  requireThat(a?.sessionId===sid&&a.characterId===cid&&a.ownerType==='CHARACTER','ACCOUNT_UNAVAILABLE');moneyState(a);return a;
};
export function createEconomyService({store,signed,checkSession,checkScenario,now,uuid}){
  async function player(tx,actor,input,preview=false){
    const sid=documentId(input.sessionId),s=preview?await checkSession(tx,actor,sid):await tx.get(`sessions/${sid}`);
    requireThat(s&&s.stage!=='ARCHIVED','FORBIDDEN');const r=preview?null:await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);
    if(!preview)requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
    const c=await tx.get(`sessions/${sid}/characters/${preview?documentId(input.characterId):r.characterId}`);
    requireThat(c&&(preview||c.assignedUid===actor.uid),'FORBIDDEN');
    requireThat(['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'BRIEFING_CLOSED');requireThat(published(c),'CONTENT_UNPUBLISHED');
    requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');return {s,c,r,a:await wallet(tx,sid,c.id),guard:preview?null:identity(c,r)};
  }
  async function payment(tx,ctx,input){
    const {s,c,a,guard}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'pay');
    const recipientId=documentId(input.recipientId);requireThat(recipientId!==c.id,'INVALID_RECIPIENT');
    const recipient=await tx.get(`sessions/${s.id}/characters/${recipientId}`);requireThat(published(recipient)&&recipient.assignedUid,'INVALID_RECIPIENT');
    const reg=await tx.get(`sessions/${s.id}/registrations/${hash(recipient.assignedUid)}`);
    requireThat(reg?.status==='ACCEPTED'&&reg.accessActive&&reg.characterId===recipientId,'INVALID_RECIPIENT');
    const to=await wallet(tx,s.id,recipientId),amount=amountInput(input.amount),memo=moneyText(input.memo),before=moneyState(a);
    requireThat(before.available>=amount,'INSUFFICIENT_FUNDS');whole(to.balance+amount,'BALANCE_OVERFLOW');
    const after={...before,balance:a.balance-amount,available:before.available-amount,revision:a.revision+1};
    const result={source:partyName(c),recipient:partyName(recipient),currency:currencyView(s.economyRules),amount,memo,before,after};
    return {to,recipient,result:{...result,confirmation:hash(JSON.stringify([s.id,guard,identity(recipient,reg),s.healthRules,result]))}};
  }
  async function administrative(tx,action,actor,input,at,newId){
    const scenario=['saveScenarioEconomy','prepareStartingCredits','setStartingCredits'].includes(action),id=documentId(scenario?input.scenarioId:input.sessionId),base=`${scenario?'scenarios':'sessions'}/${id}`;
    const parent=scenario?await checkScenario(tx,actor,id):await checkSession(tx,actor,id);
    if(action==='walletHistory'){
      const a=await administrativeWallet(tx,id,input);return {currency:currencyView(parent.economyRules),account:moneyState(a),events:await tx.list(`${base}/accounts/${a.id}/history`,null,{orderBy:'at',direction:'desc',limit:30})};
    }
    requireThat(parent.stage!=='ARCHIVED','SESSION_CLOSED');
    const preparing=action.startsWith('prepare');let op,fingerprint;
    if(!preparing){op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([action,input]));const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}}
    requireThat(parent.revision===input.revision,'STALE_REVISION');let result;
    const reason=scenario?'Préparation du scénario':moneyText(input.reason);
    if(action==='saveScenarioEconomy'||action==='saveSessionEconomy'){
      const rules=economyRulesInput(input.rules);
      if(!scenario&&parent.economyRules)requireThat(rules.name===parent.economyRules.name&&rules.unit===parent.economyRules.unit,'CURRENCY_LOCKED');
      const chars=scenario?[]:await tx.list(`${base}/characters`),existing=await Promise.all(chars.map(c=>tx.get(`${base}/accounts/${accountId(c.id)}`)));
      for(let i=0;i<chars.length;i++)if(!existing[i])openWallet(tx,id,chars[i],0,at,actor.uid,'OPENING');
      tx.set(base,{...parent,economyRules:rules,revision:parent.revision+1});result={enabled:rules.enabled};
      tx.set(`${base}/economyHistory/${newId}`,{id:newId,at,actorUid:actor.uid,reason,before:parent.economyRules??null,after:rules});
    }else{
      requireThat(!!parent.economyRules,'ECONOMY_DISABLED');
      const collective=!scenario&&!!input.groupId,c=collective?null:await tx.get(`${base}/characters/${documentId(input.characterId)}`);if(!collective)requireThat(c,'NOT_FOUND');
      if(scenario){
        const amount=whole(input.amount,'INVALID_AMOUNT'),before=c.startingCredits??{amount:0,revision:0},after={amount,revision:before.revision+1};
        const prepared={character:partyName(c),currency:currencyView(parent.economyRules),before,after,confirmation:hash(JSON.stringify([parent.revision,c.id,c.public.displayName,parent.economyRules,before,after]))};
        if(preparing)return prepared;requireThat(input.confirmation===prepared.confirmation,'STALE_REVISION');
        tx.set(`${base}/characters/${c.id}`,{...c,startingCredits:after});tx.set(`${base}/characters/${c.id}/creditHistory/${newId}`,{id:newId,at,actorUid:actor.uid,reason,before,after});result={id:c.id,amount};
      }else{
        requireThat(parent.economyRules.enabled,'ECONOMY_DISABLED');const a=await administrativeWallet(tx,id,input),before=moneyState(a),amount=amountInput(input.amount),memo=moneyText(input.memo);
        requireThat(['CREDIT','DEBIT'].includes(input.mode),'INVALID_ECONOMY');const delta=input.mode==='CREDIT'?amount:-amount;
        requireThat(delta>0||before.available>=amount,'INSUFFICIENT_FUNDS');const balance=whole(a.balance+delta,'BALANCE_OVERFLOW'),next={...a,balance,revision:a.revision+1},after=moneyState(next);
        const subject=collective?{id:a.id,name:a.label}:partyName(c);
        const prepared={character:subject,currency:currencyView(parent.economyRules),amount,delta,memo,before,after,confirmation:hash(JSON.stringify([parent.revision,subject,before,after,memo,reason]))};
        if(preparing)return prepared;requireThat(input.confirmation===prepared.confirmation,'STALE_REVISION');
        tx.set(`${base}/accounts/${a.id}`,next);
        writeLedger(tx,id,{id:newId,kind:'GM_ADJUSTMENT',at,actorUid:actor.uid,memo,reason,createdCurrency:Math.max(0,delta),removedCurrency:Math.max(0,-delta),entries:[{accountId:a.id,characterId:a.characterId??null,groupId:a.groupId??null,delta,before,after}]});result={id:newId,account:after};
      }
      tx.set(base,{...parent,revision:parent.revision+1});
    }
    if(!scenario)tx.set(`${base}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,reason,characterId:input.characterId??null,groupId:input.groupId??null});
    tx.set(op,{fingerprint,result,at});return result;
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),newId=uuid();
    return store.runTransaction(async tx=>{
      if(adminActions.has(action))return administrative(tx,action,actor,input,at,newId);
      const preview=action==='previewWallet',ctx=await player(tx,actor,input,preview),{s,c,a,guard}=ctx;
      if(action==='myWallet'||preview)return {session:{id:s.id,stage:s.stage},preview,character:partyName(c),currency:currencyView(s.economyRules),account:{id:a.id,...moneyState(a)},canPay:!preview&&s.stage==='EN_JEU'&&canGameAction(s,c,'pay'),entries:(await tx.list(`sessions/${s.id}/accounts/${a.id}/history`,null,{orderBy:'at',direction:'desc',limit:30})).map(projectEntry)};
      if(action==='preparePayment')return (await payment(tx,ctx,input)).result;
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===guard,'FORBIDDEN');return previous.result;}
      const x=await payment(tx,ctx,input);requireThat(x.result.confirmation===input.confirmation,'STALE_REVISION');
      const amount=x.result.amount,fromNext={...a,balance:a.balance-amount,revision:a.revision+1},toNext={...x.to,balance:x.to.balance+amount,revision:x.to.revision+1};
      tx.set(`sessions/${s.id}/accounts/${a.id}`,fromNext);tx.set(`sessions/${s.id}/accounts/${x.to.id}`,toNext);
      writeLedger(tx,s.id,{id:newId,kind:'TRANSFER',at,actorUid:actor.uid,memo:x.result.memo,reason:'Paiement confirmé par le payeur',source:partyName(c),recipient:partyName(x.recipient),createdCurrency:0,removedCurrency:0,
        entries:[{accountId:a.id,characterId:c.id,delta:-amount,before:moneyState(a),after:moneyState(fromNext)},{accountId:x.to.id,characterId:x.recipient.id,delta:amount,before:moneyState(x.to),after:moneyState(toNext)}]});
      const result={id:newId,amount,recipient:partyName(x.recipient),currency:x.result.currency,account:moneyState(fromNext)};
      tx.set(`sessions/${s.id}/audit/${newId}`,{id:newId,action,at,actorUid:actor.uid,sourceId:c.id,recipientId:x.recipient.id,amount});
      tx.set(op,{fingerprint,result,guard,at});return result;
    });
  };
}
