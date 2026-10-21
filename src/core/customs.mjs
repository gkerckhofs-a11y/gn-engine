import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {moneyText,currencyView} from './economy-state.mjs';
import {cargoTariffInput,feeRecipient} from './customs-state.mjs';

export const customsCommands=['cargoTariffsAdmin','prepareCargoTariff','saveCargoTariff'];
export const customsAction=a=>customsCommands.includes(a);
export function createCustomsService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const at=now(),eventId=uuid();return store.runTransaction(async tx=>{
   const sid=documentId(input.sessionId),base=`sessions/${sid}`,s=await checkSession(tx,actor,sid);requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const rules=await tx.list(`${base}/cargoTariffs`),items=await tx.list(`${base}/items`);
   if(action==='cargoTariffsAdmin'){
    const recipients=[];for(const a of await tx.list(`${base}/accounts`)){try{const r=await feeRecipient(tx,sid,a.id);recipients.push({id:a.id,...r.party,accountId:a.id});}catch(e){if(e.code!=='ACCOUNT_UNAVAILABLE')throw e;}}
    return {session:{id:sid,revision:s.revision,stage:s.stage},currency:s.economyRules?currencyView(s.economyRules):null,economyEnabled:s.economyRules?.enabled===true,tariffs:rules,items:items.map(i=>({id:i.id,name:i.name,publicationState:i.publicationState})),recipients,history:(await tx.list(`${base}/cargoTariffHistory`,null,{orderBy:'at',direction:'desc',limit:30}))};
   }
   const save=action==='saveCargoTariff',op=save?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input]));
   if(save){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}}
   requireThat(s.revision===input.revision,'STALE_REVISION');const id=input.tariffId?documentId(input.tariffId):'new-tariff',old=rules.find(r=>r.id===id)??null;
   requireThat((old?.revision??0)===input.recordRevision,'STALE_REVISION');if(input.tariffId)requireThat(old,'NOT_FOUND');
   requireThat(old||rules.length<50,'CARGO_TARIFF_LIMIT');const after=cargoTariffInput(input,id,old??{});
   if(after.enabled){requireThat(s.economyRules,'ECONOMY_DISABLED');requireThat(!after.itemId||items.some(i=>i.id===after.itemId&&i.publicationState==='PUBLISHED'),'INVALID_CARGO_TARIFF');await feeRecipient(tx,sid,after.recipientAccountId);}
   const reason=moneyText(input.reason),result={before:old,after,reason,confirmation:hash(JSON.stringify([sid,s.revision,old,after,reason]))};
   if(!save)return result;requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
   const next={...after,id:old?id:eventId};tx.set(`${base}/cargoTariffs/${next.id}`,next);tx.set(base,{...s,revision:s.revision+1});
   tx.set(`${base}/cargoTariffHistory/${eventId}`,{id:eventId,at,actorUid:actor.uid,reason,before:old,after:next});tx.set(`${base}/audit/${eventId}`,{id:eventId,at,action,actorUid:actor.uid,reason,tariffId:next.id});
   const saved={id:next.id,revision:next.revision};tx.set(op,{fingerprint,result:saved,at});return saved;
  });
 };
}
