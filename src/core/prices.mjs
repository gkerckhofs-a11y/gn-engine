import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {currencyView,moneyText} from './economy-state.mjs';
import {priceInput,priceEventInput,readPriceBook,priceBoard} from './price-state.mjs';

export const priceCommands=['commodityMarket','priceAdmin','prepareCommodityPrice','saveCommodityPrice','preparePriceEvent','savePriceEvent'];
export const priceAction=a=>priceCommands.includes(a);
export function createPriceService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),base=`sessions/${sid}`,at=now(),eventId=uuid();
  return store.runTransaction(async tx=>{
   const player=action==='commodityMarket',s=player?(await inventoryPlayer(tx,actor,input)).s:await checkSession(tx,actor,sid);
   requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const book=await readPriceBook(tx,s,at),currency=s.economyRules?currencyView(s.economyRules):null;
   if(player)return {session:{id:sid,stage:s.stage},currency,enabled:s.economyRules?.enabled===true,prices:priceBoard(book)};
   if(action==='priceAdmin')return {session:{id:sid,revision:s.revision,stage:s.stage},currency,enabled:s.economyRules?.enabled===true,prices:book.prices,events:book.events,board:priceBoard(book),items:book.items.filter(i=>i.publicationState==='PUBLISHED').map(i=>({id:i.id,name:i.name,unit:i.unit,kind:i.kind})),targets:(await tx.list(`${base}/fieldTargets`)).filter(t=>t.kind==='INSTALLATION'&&t.publicationState==='PUBLISHED').map(t=>({id:t.id,title:t.title})),history:(await tx.list(`${base}/priceHistory`)).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)).slice(0,30)};
   const save=action.startsWith('save'),op=save?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input]));
   if(save){const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}}
   requireThat(input.revision===s.revision,'STALE_REVISION');
   const isPrice=action.endsWith('CommodityPrice'),id=isPrice?documentId(input.itemId):input.eventId?documentId(input.eventId):'new-event';
   const collection=isPrice?'commodityPrices':'priceEvents',old=(isPrice?book.prices:book.events).find(p=>p.id===id)??null;
   requireThat((old?.revision??0)===input.recordRevision,'STALE_REVISION');
   const after=isPrice?priceInput(input,book.items.find(i=>i.id===id),old??{}):priceEventInput(input,id,old??{});
   let installationTitle=null;
   if(!isPrice){
    requireThat(book.prices.some(p=>p.id===after.itemId),'PRICE_REQUIRED');
    if(after.trigger==='INSTALLATION_OFFLINE'){const t=await tx.get(`${base}/fieldTargets/${after.targetId}`);requireThat(t?.kind==='INSTALLATION'&&(!after.enabled||t.publicationState==='PUBLISHED'),'INVALID_PRICE_EVENT');installationTitle=t.title;}
   }
   const before=old?Object.fromEntries(Object.entries(old).filter(([k])=>k!=='active')):null,reason=moneyText(input.reason);
   const result={before,after,reason,commodityName:isPrice?after.item.name:book.prices.find(p=>p.id===after.itemId).item.name,installationTitle,confirmation:hash(JSON.stringify([sid,s.revision,before,after,reason]))};
   if(!save)return result;
   requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
   const record={...after,id:!isPrice&&!input.eventId?eventId:id};
   tx.set(`${base}/${collection}/${record.id}`,record);tx.set(base,{...s,revision:s.revision+1});
   tx.set(`${base}/priceHistory/${eventId}`,{id:eventId,at,actorUid:actor.uid,action,reason,before,after:record});
   tx.set(`${base}/audit/${eventId}`,{id:eventId,at,actorUid:actor.uid,action,recordId:record.id,reason});
   const saved={id:record.id,revision:record.revision};tx.set(op,{fingerprint,result:saved,at});return saved;
  });
 };
}
