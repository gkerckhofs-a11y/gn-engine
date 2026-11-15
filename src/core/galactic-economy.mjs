import {createPriceService} from './prices.mjs';
import {admissionKeys} from './admission-state.mjs';
import {requireThat,documentId,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {hasItemCircuits} from './item-circuits.mjs';
import {shopAccountId} from './space-outlaws-shop-state.mjs';
import {amountInput,moneyState,moneyText,currencyView} from './economy-state.mjs';
import {settleAccountTransfer} from './collective-accounts.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
const eventActions={galacticEventsAdmin:'priceAdmin',prepareGalacticEvent:'preparePriceEvent',saveGalacticEvent:'savePriceEvent'};
export const galacticEconomyCommands=[...Object.keys(eventActions),'galacticBudgetsAdmin','prepareShopBudgetTransfer','transferShopBudget'];
export function createGalacticEconomyService(options){
 const {store,signed,checkSession,now,uuid}=options,prices=createPriceService({...options,spaceEconomy:true});
 return async(action,actor,input)=>{
  if(Object.hasOwn(eventActions,action)){
   const fields=action==='galacticEventsAdmin'?[]:['revision','recordRevision','eventId','itemId','title','description','percent','tradeBlocked','enabled','portId','announcementId','reason',...(action==='saveGalacticEvent'?['confirmation','requestId']:[])];admissionKeys(input,['sessionId',...fields]);
   return prices(eventActions[action],actor,action==='galacticEventsAdmin'?input:{...input,targetKind:'COMMODITY',trigger:'MANUAL'});
  }
  signed(actor);const write=action==='transferShopBudget',at=now(),id=uuid();admissionKeys(input,['sessionId',...(action==='galacticBudgetsAdmin'?[]:['sourceShopId','targetShopId','amount','reason']),...(write?['confirmation','requestId']:[])]);
  return store.runTransaction(async tx=>{
   const s=await checkSession(tx,actor,documentId(input.sessionId)),b=`sessions/${s.id}`;requireThat(hasItemCircuits(s)&&s.economyRules?.enabled,'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED'&&!s.campaignSealed,'SESSION_CLOSED');
   const shops=(await tx.list(`${b}/shops`)).filter(sh=>sh.versionId===s.versionId),rows=[];for(const sh of shops){const a=await tx.get(`${b}/accounts/${shopAccountId(sh.id)}`);requireThat(!a||a.sessionId===s.id&&a.ownerType==='SHOP'&&a.shopId===sh.id,'ACCOUNT_UNAVAILABLE');rows.push({id:sh.id,name:sh.name,account:a?moneyState(a):null});}
   if(action==='galacticBudgetsAdmin')return {session:{id:s.id,stage:s.stage},shops:rows,currency:currencyView(s.economyRules)};
   requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
   const op=write?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input])),previous=op?await tx.get(op):null;if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
   const sourceId=documentId(input.sourceShopId),targetId=documentId(input.targetShopId);requireThat(sourceId!==targetId,'INVALID_RECIPIENT');const source=shops.find(sh=>sh.id===sourceId),target=shops.find(sh=>sh.id===targetId);requireThat(source&&target,'ACCOUNT_UNAVAILABLE');
   const a=await tx.get(`${b}/accounts/${shopAccountId(sourceId)}`),to=await tx.get(`${b}/accounts/${shopAccountId(targetId)}`);requireThat(a&&to,'ACCOUNT_UNAVAILABLE');const amount=amountInput(input.amount),reason=moneyText(input.reason),before=moneyState(a),targetBefore=moneyState(to);requireThat(before.available>=amount,'INSUFFICIENT_FUNDS');whole(to.balance+amount,'BALANCE_OVERFLOW');
   const confirmation=hash(JSON.stringify([s.id,s.revision,sourceId,targetId,a.revision,to.revision,amount,reason]));if(!write)return {source:{id:sourceId,name:source.name,before,after:moneyState({...a,balance:a.balance-amount})},target:{id:targetId,name:target.name,before:targetBefore,after:moneyState({...to,balance:to.balance+amount})},amount,reason,confirmation};
   requireThat(input.confirmation===confirmation,'STALE_REVISION');authorizeSpaceOutlaws(tx,s,'PAYMENT');settleAccountTransfer(tx,s,{a,name:source.name},{a:to,name:target.name},amount,{id,at,actorUid:actor.uid,memo:'Réaffectation de budget PNJ',reason});const result={id,amount,sourceShopId:sourceId,targetShopId:targetId};tx.set(`${b}/audit/${id}`,{...result,at,action,actorUid:actor.uid,reason});tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
