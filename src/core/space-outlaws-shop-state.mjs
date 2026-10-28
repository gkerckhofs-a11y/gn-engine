import {inventoryHash as hash,publicItem} from './inventory-state.mjs';

export const hasSoShops=s=>s.spaceOutlaws?.shopsVersion===1;
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
   if(!item?.data.consumable||c.data.buybackPrice!==null)add(c,'Ce parcours ouvre la vente de consommables PNJ, sans rachat. Préparer les autres offres lors de leur raccordement.');
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
