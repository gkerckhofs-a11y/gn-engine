import {localAuthorization} from './contextual-policy.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {hasItemCircuits} from './item-circuits.mjs';
import {planetMarketQuote} from './planet-market-state.mjs';
import {announcementState} from './announcements.mjs';
import {documentId,requireThat} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {currencyView,moneyText} from './economy-state.mjs';
import {priceInput,priceEventInput,readPriceBook,priceBoard,tradeBoard,routeQuote,validateEconomicReferences} from './price-state.mjs';

export const priceCommands=['commodityMarket','priceAdmin','prepareCommodityPrice','saveCommodityPrice','preparePriceEvent','savePriceEvent'];
export const priceAction=a=>priceCommands.includes(a);
export function createPriceService({store,signed,checkSession,now,uuid,spaceEconomy=false}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),base=`sessions/${sid}`,at=now(),eventId=uuid();
  return store.runTransaction(async tx=>{
   const player=action==='commodityMarket',ctx=player?await inventoryPlayer(tx,actor,input):null,s=player?ctx.s:await checkSession(tx,actor,sid);
   requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');if(spaceEconomy)requireThat(hasItemCircuits(s)&&!s.campaignSealed,'SO_GAMEPLAY_NOT_OPEN');
   if(player)await localAuthorization(tx,ctx,action,s.id,at);
   const book=await readPriceBook(tx,s,at);if(spaceEconomy)book.items=book.items.filter(i=>i.versionId===s.versionId).map(i=>({...i,publicationState:'PUBLISHED'}));const currency=s.economyRules?currencyView(s.economyRules):null;
   if(player)return {session:{id:sid,stage:s.stage},currency,enabled:s.economyRules?.enabled===true,prices:priceBoard(book),restrictions:tradeBoard(book)};
   const routes=await tx.list(`${base}/routes`),targets=await tx.list(`${base}/fieldTargets`),markets=spaceEconomy?await tx.list(`${base}/planetMarkets`):[],ports=spaceEconomy?await tx.list(`${base}/ports`):[],bulletins=spaceEconomy?(await tx.list(`${base}/announcements`)).filter(a=>a.mode==='BULLETIN'&&a.audience?.kind==='ALL'):[];
   if(action==='priceAdmin')return {...(spaceEconomy?{spaceEconomy:true,marketItems:book.items.filter(i=>i.publicationState==='PUBLISHED'&&i.usage==='COMMERCIAL'&&markets.some(m=>m.itemId===i.id)).map(i=>({id:i.id,name:i.name})),ports:ports.filter(p=>p.versionId===s.versionId&&markets.some(m=>m.portId===p.id)).map(p=>({id:p.id,name:p.name})),bulletins:bulletins.map(a=>({id:a.id,title:a.title,status:announcementState(a,at)}))}:{}),session:{id:sid,revision:s.revision,stage:s.stage},currency,enabled:s.economyRules?.enabled===true,prices:book.prices,events:book.events,board:priceBoard(book),restrictions:tradeBoard(book),routes:spaceEconomy?[]:routes.map(r=>routeQuote(book,r)),eventItems:book.items.map(i=>({id:i.id,name:i.name,publicationState:i.publicationState})),items:book.items.filter(i=>i.publicationState==='PUBLISHED').map(i=>({id:i.id,name:i.name,unit:i.unit,kind:i.kind})),targets:targets.filter(t=>t.kind==='INSTALLATION').map(t=>({id:t.id,title:t.title,publicationState:t.publicationState})),history:(await tx.list(`${base}/priceHistory`)).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)).slice(0,30)};
   if(spaceEconomy)requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
   const save=action.startsWith('save'),op=save?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input]));
   if(save){const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}}
   requireThat(input.revision===s.revision,'STALE_REVISION');
   const isPrice=action.endsWith('CommodityPrice'),id=isPrice?documentId(input.itemId):input.eventId?documentId(input.eventId):'new-event';
   const collection=isPrice?'commodityPrices':'priceEvents',old=(isPrice?book.prices:book.events).find(p=>p.id===id)??null;
   requireThat((old?.revision??0)===input.recordRevision,'STALE_REVISION');if(spaceEconomy)requireThat(!old||old.spaceEconomy===true,'ECONOMIC_EVENT_LOCKED');
   const after=isPrice?priceInput(input,book.items.find(i=>i.id===id),old??{}):priceEventInput(input,id,old??{});
   if(spaceEconomy){requireThat(!isPrice&&after.targetKind==='COMMODITY'&&after.trigger==='MANUAL'&&book.items.some(i=>i.id===after.itemId&&i.usage==='COMMERCIAL')&&markets.some(m=>m.itemId===after.itemId),'INVALID_PRICE_EVENT');const portId=input.portId?documentId(input.portId):null,announcementId=input.announcementId?documentId(input.announcementId):null;if(portId)requireThat(ports.some(p=>p.id===portId&&p.versionId===s.versionId)&&markets.some(m=>m.portId===portId&&m.itemId===after.itemId),'MAP_DESTINATION_UNAVAILABLE');if(announcementId)requireThat(bulletins.some(a=>a.id===announcementId&&a.sessionMission&&a.missionVersionId===s.versionId),'INVALID_ANNOUNCEMENT');Object.assign(after,{spaceEconomy:true,portId,announcementId});}
   let installationTitle=null;
   if(!isPrice){
    validateEconomicReferences({priceEvents:[after],items:book.items,fieldTargets:targets,routes});
    if(after.trigger==='INSTALLATION_OFFLINE'){const t=await tx.get(`${base}/fieldTargets/${after.targetId}`);requireThat(t?.kind==='INSTALLATION'&&(!after.enabled||t.publicationState==='PUBLISHED'),'INVALID_PRICE_EVENT');installationTitle=t.title;}
   }
   const before=old?Object.fromEntries(Object.entries(old).filter(([k])=>k!=='active')):null,reason=moneyText(input.reason);
   const result={before,after,reason,commodityName:isPrice?after.item.name:after.targetKind==='ROUTE'?routes.find(r=>r.id===after.routeId).name:book.items.find(p=>p.id===after.itemId).name,installationTitle,confirmation:hash(JSON.stringify([sid,s.revision,before,after,reason]))};
   if(!save)return result;
   requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
   const record={...after,id:!isPrice&&!input.eventId?eventId:id};
   if(spaceEconomy){authorizeSpaceOutlaws(tx,s,'ECONOMIC_EVENT');authorizeSpaceOutlaws(tx,s,'PLANET_MARKET');const newer=[...book.events.filter(e=>e.id!==record.id),{...record,active:record.enabled}];const affected=markets.filter(m=>m.itemId===record.itemId||m.itemId===old?.itemId);requireThat(affected.length<=200,'ECONOMIC_EVENT_LIMIT');for(const m of affected){const item=book.items.find(i=>i.id===m.itemId),before=planetMarketQuote(m,item,book.events),afterQuote=planetMarketQuote(m,item,newer);tx.set(`${base}/planetMarkets/${m.id}`,{...m,revision:m.revision+1});if(afterQuote&&before?.unitPrice!==afterQuote.unitPrice){const hid=hash(`${eventId}:${m.id}`);tx.set(`${base}/planetPriceHistory/${hid}`,{id:hid,marketId:m.id,at,revision:m.revision+1,unitPrice:afterQuote.unitPrice,marketState:m.marketState,public:m.enabled,eventId:record.id});}}}
   tx.set(`${base}/${collection}/${record.id}`,record);tx.set(base,{...s,revision:s.revision+1});
   tx.set(`${base}/priceHistory/${eventId}`,{id:eventId,at,actorUid:actor.uid,action,reason,before,after:record});
   tx.set(`${base}/audit/${eventId}`,{id:eventId,at,actorUid:actor.uid,action,recordId:record.id,reason});
   const saved={id:record.id,revision:record.revision};tx.set(op,{fingerprint,result:saved,at});return saved;
  });
 };
}
