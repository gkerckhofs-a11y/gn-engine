import {publishedCustomsCargoAssessment} from './space-hidden-cargo.mjs';
import {commodityQuote} from './price-state.mjs';
import {spaceCommodities,planetMarketStates} from '../shared/space-outlaws-commodities.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {requireThat} from './validation.mjs';
export const planetMarketId=(portId,itemId)=>hash(JSON.stringify([portId,itemId]));
export function planetMarketQuote(m,item){
 const reference=spaceCommodities.find(x=>x.id===m.commodityCode),state=planetMarketStates[m.marketState];
 requireThat(reference&&state&&item?.usage==='COMMERCIAL','PLANET_MARKET_INVALID');
 // Use the existing integer price engine and its half-up rounding.
 const q=commodityQuote({prices:[{id:item.id,item,enabled:m.enabled,baseUnitPrice:reference.referencePrice,revision:m.revision}],items:[{...item,publicationState:'PUBLISHED'}],events:[{id:m.id,itemId:item.id,active:true,revision:m.revision,percent:state.percent,title:state.label,description:''}]},item);
 return q?{...q,guard:hash(JSON.stringify([m,q.guard])),state:m.marketState,stateLabel:state.label}:null;
}
export async function planetOffer(tx,s,offerId){
 const rows=(await tx.list(`sessions/${s.id}/planetMarkets`)).filter(m=>m.offerId===offerId);
 requireThat(rows.length<=1,'PLANET_MARKET_INVALID');return rows[0]??null;
}
export async function planetPurchase(tx,s,c,offer,at){
 const market=await planetOffer(tx,s,offer.id);if(!market)return null;
 requireThat(market.enabled,'TRADE_SUSPENDED');
 requireThat(market.shopId===offer.shopId&&market.itemId===offer.item.id,'PLANET_MARKET_INVALID');
 const quote=planetMarketQuote(market,offer.item);requireThat(quote,'PRICE_UNAVAILABLE');
 const port=await tx.get(`sessions/${s.id}/ports/${market.portId}`);requireThat(port?.versionId===s.versionId,'PLANET_MARKET_INVALID');requireThat(ordinaryPlanetTrade(market,offer.item,port,s),'PLANET_TRADE_RESTRICTED');return {market,quote,stockPortId:market.portId,portName:port.name};
}
export const ordinaryPlanetCommodity=(market,item)=>spaceCommodities.find(c=>c.id===market.commodityCode)?.legality==='FREE'&&item?.legality==='LEGAL';

// Scoped check context only, never persisted: local commercial work is allowed at
// the verified market port, while native voyage/health/engagement checks remain.
export const planetCommerceSession=(s,portId)=>({...s,transportRules:{...s.transportRules,homePort:portId}});

// Reuse the published-port policy validator only; no vessel or voyage is granted.
export function ordinaryPlanetTrade(m,item,port,s){const assessment=publishedCustomsCargoAssessment({ship:{id:m.id,docked:true,portId:m.portId},port,sessionVersionId:s.versionId,stock:[{id:item.id,item,quantity:1}]});return ordinaryPlanetCommodity(m,item)&&assessment.portPolicy.status==='PUBLISHED'&&assessment.lots[0].customsStatus==='FREE';}
