import {negotiationTarget} from './space-merchant-negotiation.mjs';
import {initialFieldState} from './field-state.mjs';
import {hasCompleteTowing} from './space-module-flight.mjs';
import {hasHiddenCargo} from './space-module-flight.mjs';
import {inventoryHash as hash,publicItem} from './inventory-state.mjs';
import {playableShipModuleQuote,standardShipModuleQuote} from '../shared/space-ship-modules.mjs';

export const hasSoShops=s=>s.spaceOutlaws?.shopsVersion===1;
export const hasSoModulePurchases=s=>hasSoShops(s)&&s.spaceOutlaws?.modulePurchasesVersion===1;
export function moduleOfferValid(offer,options={}){
 const item=offer?.item,q=playableShipModuleQuote(item?.shipModule,options);
 return !!q&&Object.keys(item.shipModule).length===2&&item.kind==='INDIVIDUAL'&&item.consumable===false&&offer.unitPrice===q.price;
}
export const shopOfferAvailable=(s,o)=>o?.item?.shipModule?hasSoModulePurchases(s)&&moduleOfferValid(o,{hiddenCargo:hasHiddenCargo(s),towing:hasCompleteTowing(s)}):o?.item?.consumable===true;
export const shopAccountId=id=>hash(`shop:${id}`);
export const shopStockId=id=>hash(`shop-stock:${id}`);
// Definitions only. Stock and a zero-balance till require a separate MJ command.
export function soShops(changes){
 const active=changes.filter(c=>c.operation==='UPSERT'),find=(type,id)=>active.find(c=>c.type===type&&c.entityId===id)?.data;
 return active.filter(c=>c.type==='shop').map(({data:s})=>({id:s.id,name:s.name,description:s.description,sellerCharacterId:s.sellerCharacterId,locationTargetId:s.locationTargetId,
  location:find('fieldTarget',s.locationTargetId)?.title??'',offers:active.filter(c=>c.type==='offer'&&c.data.shopId===s.id).map(({data:o})=>({id:o.id,...(o.negotiationLevel!=null?{negotiationLevel:o.negotiationLevel}:{}),name:o.name,unitPrice:o.unitPrice,conditions:o.conditions,item:publicItem(find('item',o.itemId))}))}));
}
export function shopBlockers(changes){
 const active=changes.filter(c=>c.operation==='UPSERT'),out=[];
 const add=(c,detailField,message)=>out.push({detailField,code:'SO_SHOP_NOT_CONNECTED',changeId:c.id,entityId:c.entityId,message});
 for(const c of active){
  if(c.type==='shop'){
   const seller=active.find(x=>x.type==='character'&&x.entityId===c.data.sellerCharacterId);
   if(!seller||seller.data.creationPlan!=null||seller.source==='ADMISSION')add(c,'sellerCharacterId','Le comptoir marchand doit référencer une fiche narrative M2 sans création de personnage joueur. Les opérateurs du comptoir sont les MJ autorisés.');
  }
  if(c.type==='offer'){
   const item=active.find(x=>x.type==='item'&&x.entityId===c.data.itemId);
   if(item?.data.shipModule){
    if(!moduleOfferValid({...c.data,item:item.data},{hiddenCargo:true,towing:true})||c.data.buybackPrice!==null)add(c,c.data.buybackPrice!==null?'buybackPrice':'unitPrice','Un module standard exige le tarif canonique de son gabarit, sans reprise par le comptoir.');
   }else if(!item?.data.consumable||c.data.buybackPrice!==null)add(c,c.data.buybackPrice!==null?'buybackPrice':'itemId','Ce parcours ouvre la vente de consommables et de modules standards du comptoir, sans rachat. Préparer les autres offres lors de leur raccordement.');
  }
 }
 return out;
}
export function seedSoShops(tx,sid,changes,versionId){
 for(const {offers,...shop} of soShops(changes)){
  tx.set(`sessions/${sid}/shops/${shop.id}`,{...shop,versionId,revision:1});
  for(const offer of offers){tx.set(`sessions/${sid}/shops/${shop.id}/offers/${offer.id}`,{...offer,shopId:shop.id,versionId,revision:1});if(offer.negotiationLevel){const target=negotiationTarget(shop,{...offer,revision:1});tx.set(`sessions/${sid}/fieldTargets/${target.id}`,target);tx.set(`sessions/${sid}/fieldStates/${target.id}`,initialFieldState(target));}}
 }
}
