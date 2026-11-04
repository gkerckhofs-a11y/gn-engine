import {hasHiddenCargo} from './space-module-flight.mjs';
import {inventoryHash as hash,publicItem} from './inventory-state.mjs';
import {playableShipModuleQuote} from '../shared/space-ship-modules.mjs';

export const hasSoShops=s=>s.spaceOutlaws?.shopsVersion===1;
export const hasSoModulePurchases=s=>hasSoShops(s)&&s.spaceOutlaws?.modulePurchasesVersion===1;
export function moduleOfferValid(offer,options={}){
 const item=offer?.item,q=playableShipModuleQuote(item?.shipModule,options);
 return !!q&&Object.keys(item.shipModule).length===2&&item.kind==='INDIVIDUAL'&&item.consumable===false&&offer.unitPrice===q.price;
}
export const shopOfferAvailable=(s,o)=>o?.item?.shipModule?hasSoModulePurchases(s)&&moduleOfferValid(o,{hiddenCargo:hasHiddenCargo(s)}):o?.item?.consumable===true;
export const shopAccountId=id=>hash(`shop:${id}`);
export const shopStockId=id=>hash(`shop-stock:${id}`);
// Definitions only. Stock and a zero-balance till require a separate MJ command.
export function soShops(changes){
 const active=changes.filter(c=>c.operation==='UPSERT'),find=(type,id)=>active.find(c=>c.type===type&&c.entityId===id)?.data;
 return active.filter(c=>c.type==='shop').map(({data:s})=>({id:s.id,name:s.name,description:s.description,sellerCharacterId:s.sellerCharacterId,locationTargetId:s.locationTargetId,
  location:find('fieldTarget',s.locationTargetId)?.title??'',offers:active.filter(c=>c.type==='offer'&&c.data.shopId===s.id).map(({data:o})=>({id:o.id,name:o.name,unitPrice:o.unitPrice,conditions:o.conditions,item:publicItem(find('item',o.itemId))}))}));
}
export function shopBlockers(changes){
 const active=changes.filter(c=>c.operation==='UPSERT'),out=[];
 const add=(c,message)=>out.push({code:'SO_SHOP_NOT_CONNECTED',entityId:c.entityId,message});
 for(const c of active){
  if(c.type==='shop'){
   const seller=active.find(x=>x.type==='character'&&x.entityId===c.data.sellerCharacterId);
   if(!seller||seller.data.creationPlan!=null||seller.source==='ADMISSION')add(c,'Le comptoir PNJ doit référencer une fiche narrative M2 sans création de personnage joueur. Les opérateurs du comptoir sont les MJ autorisés.');
  }
  if(c.type==='offer'){
   const item=active.find(x=>x.type==='item'&&x.entityId===c.data.itemId);
   if(item?.data.shipModule){
    if(!moduleOfferValid({...c.data,item:item.data},{hiddenCargo:true})||c.data.buybackPrice!==null)add(c,'Un module standard exige le tarif canonique de son gabarit, sans rachat PNJ.');
   }else if(!item?.data.consumable||c.data.buybackPrice!==null)add(c,'Ce parcours ouvre la vente de consommables et de modules standards PNJ, sans rachat. Préparer les autres offres lors de leur raccordement.');
  }
 }
 return out;
}
export function seedSoShops(tx,sid,changes,versionId){
 for(const {offers,...shop} of soShops(changes)){
  tx.set(`sessions/${sid}/shops/${shop.id}`,{...shop,versionId,revision:1});
  for(const offer of offers)tx.set(`sessions/${sid}/shops/${shop.id}/offers/${offer.id}`,{...offer,shopId:shop.id,versionId,revision:1});
 }
}
