import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash,itemQuantity,lotState,newLot} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {accountId,moneyState,moneyText,currencyView,writeLedger} from './economy-state.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {settleLotSale,saleView} from './sales.mjs';
import {hasSoShops,shopAccountId,shopStockId} from './space-outlaws-shop-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {admissionKeys} from './admission-state.mjs';

const admins=new Set(['shopAdmin','prepareShopProvision','provisionShop','offerShopPickup']);
const reads=new Set(['shops','shop','shopAdmin','prepareShopProvision','prepareShopPurchase']);
export const shopActions=[...reads,'provisionShop','buyShopOffer','offerShopPickup','confirmShopPickup'];
const fields={shops:[],shop:['shopId'],shopAdmin:[],prepareShopProvision:['shopId','offerId','provisionId','quantity','restricted','source','reason'],provisionShop:['shopId','offerId','provisionId','quantity','restricted','source','reason','confirmation'],prepareShopPurchase:['shopId','offerId','quantity','useProtected'],buyShopOffer:['shopId','offerId','quantity','useProtected','quoteAt','confirmation'],offerShopPickup:['saleId','confirmation'],confirmShopPickup:['saleId','confirmation','received']};
const active=s=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const stockValid=(l,s,o)=>l?.ownerType==='SHOP'&&l.ownerId===s.id&&l.holderId===s.id&&l.location.kind==='SHOP'&&l.location.id===s.id&&l.item.id===o.item.id&&l.item.revision===o.item.revision&&l.status==='AVAILABLE';
const movement=l=>({...lotState(l),ownerType:l.ownerType,ownerId:l.ownerId,holderId:l.holderId,location:l.location});

export function createShopService({store,signed,checkSession,now,uuid}){
 async function definition(tx,s,input){
  const base=`sessions/${s.id}/shops`,shop=await tx.get(`${base}/${documentId(input.shopId)}`);
  requireThat(shop?.versionId===s.versionId,'NOT_FOUND');
  const offer=await tx.get(`${base}/${shop.id}/offers/${documentId(input.offerId)}`);
  requireThat(offer?.versionId===s.versionId&&offer.shopId===shop.id&&offer.item.consumable,'NOT_FOUND');
  const lot=await tx.get(`sessions/${s.id}/inventory/${shopStockId(offer.id)}`);
  return {shop,offer,lot};
 }
 async function purchase(tx,ctx,input,at){
  const {s,c,version}=ctx;active(s);requireGameAction(s,c,'pay',at);requireGameAction(s,c,'transfer',at);
  requireThat(typeof input.useProtected==='boolean','INVALID_ECONOMY');
  const x=await definition(tx,s,input),{shop,offer,lot}=x,quantity=itemQuantity(offer.item,input.quantity);
  requireThat(stockValid(lot,shop,offer)&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');
  const a=await tx.get(`sessions/${s.id}/accounts/${accountId(c.id)}`),b=await tx.get(`sessions/${s.id}/accounts/${shopAccountId(shop.id)}`);
  requireThat(a?.ownerType==='CHARACTER'&&a.characterId===c.id&&a.sessionId===s.id&&b?.ownerType==='SHOP'&&b.shopId===shop.id&&b.sessionId===s.id,'ACCOUNT_UNAVAILABLE');
  const before=moneyState(a);moneyState(b);
  const eligible=lot.transferable===false&&lot.resellable===false&&lot.pillable===false&&lot.item.consumable;
  requireThat(!input.useProtected||eligible,'SO_PROTECTED_PURCHASE');
  const amount=whole(offer.unitPrice*quantity,'BALANCE_OVERFLOW'),protectedAmount=input.useProtected?Math.min(before.protectedCredits??0,amount):0,ordinaryAmount=amount-protectedAmount;
  requireThat(amount>0&&before.available>=ordinaryAmount,'INSUFFICIENT_FUNDS');whole(b.balance+amount,'BALANCE_OVERFLOW');
  const quoteAt=input.quoteAt??at;requireThat(Number.isSafeInteger(quoteAt)&&quoteAt<=at&&at-quoteAt<=300000,'SHOP_QUOTE_EXPIRED');
  const sale={id:uuid(),shopId:shop.id,sellerKind:'SHOP',sellerId:shop.id,sellerName:shop.name,buyerId:c.id,buyerName:c.public.displayName,buyerVersion:version,status:'PENDING',revision:1,createdAt:at,expiresAt:quoteAt+300000,lotId:lot.id,item:offer.item,quantity,amount,protectedAmount,currency:currencyView(s.economyRules),conditions:offer.conditions,pickupPlace:shop.location};
  const after=moneyState({...a,balance:a.balance-ordinaryAmount,...(a.protectedCredits!==undefined?{protectedCredits:a.protectedCredits-protectedAmount}:{}),revision:a.revision+1});
  const result={shop:{id:shop.id,name:shop.name,location:shop.location},offer:{id:offer.id,name:offer.name,item:offer.item,unitPrice:offer.unitPrice,conditions:offer.conditions},quantity,amount,protectedAmount,ordinaryAmount,restricted:eligible,before,after,quoteAt,expiresAt:quoteAt+300000};
  return {...x,sale,from:{a,name:c.public.displayName},to:{a:b,name:shop.name},result:{...result,confirmation:hash(JSON.stringify([s.id,s.revision,version,lot.revision,b.revision,result]))}};
 }
 async function order(tx,s,p,at){
  const buyer=await inventoryParty(tx,s.id,p.buyerId),lot=await tx.get(`sessions/${s.id}/inventory/${p.purchasedLotId}`);
  const custody=buyer.active&&lot?.ownerType==='CHARACTER'&&lot.ownerId===p.buyerId&&lot.holderId===p.shopId&&lot.location.kind==='SHOP'&&lot.location.id===p.shopId&&lot.status==='AVAILABLE'&&lot.quantity===p.quantity;
  const ready=custody&&p.pickupStatus==='READY'&&p.pickupLotRevision===lot.revision&&p.pickupBuyerVersion===buyer.version;
  const allowed=custody&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&canGameAction(s,buyer.c,'transfer',at);
  return {buyer,lot,custody,ready,allowed,view:{...saleView(p),pickupStatus:p.pickupStatus==='READY'&&!ready?'STALE':p.pickupStatus,canOfferPickup:!!allowed&&p.pickupStatus!=='RECEIVED'&&!ready,canPickup:!!allowed&&ready,confirmation:hash(JSON.stringify([p.id,p.revision,lot?.revision??null,buyer.version]))}};
 }
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);
  const at=now(),eventId=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
   requireThat(hasSoShops(s)&&s.economyRules?.enabled,'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   if(['shops','shop','shopAdmin'].includes(action)){
    const shops=action==='shop'?[await tx.get(`${base}/shops/${documentId(input.shopId)}`)]:await tx.list(`${base}/shops`),result=[];
    for(const shop of shops){
     requireThat(shop?.versionId===s.versionId,'NOT_FOUND');const offers=[];
     for(const o of await tx.list(`${base}/shops/${shop.id}/offers`)){
      const lot=await tx.get(`${base}/inventory/${shopStockId(o.id)}`),valid=stockValid(lot,shop,o),quantity=valid?lot.quantity:0;
      offers.push({...o,stock:quantity,restricted:valid&&lot.transferable===false,canBuy:!admin&&quantity>0&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&canGameAction(s,c,'pay',at)});
     }
     const a=admin?await tx.get(`${base}/accounts/${shopAccountId(shop.id)}`):null;
     result.push({id:shop.id,name:shop.name,description:shop.description,location:shop.location,offers,...(admin?{account:a?moneyState(a):null}:{})});
    }
    const sales=await tx.list(`${base}/lotSales`,admin?null:['buyerId',c.id]),orders=[];
    for(const p of sales.filter(p=>p.shopId&&(action!=='shop'||p.shopId===input.shopId)).sort((a,b)=>b.createdAt-a.createdAt))orders.push((await order(tx,s,p,at)).view);
    return {session:{id:s.id,stage:s.stage},admin,shops:result,orders,...(admin?{canProvision:['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active}:{})};
   }
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const prev=await tx.get(op);if(prev){requireThat(prev.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||prev.guard===version,'FORBIDDEN');return prev.result;}}
   let result;
   if(action==='prepareShopProvision'||action==='provisionShop'){
    const provisionId=documentId(input.provisionId),source=moneyText(input.source),reason=moneyText(input.reason),x=await definition(tx,s,input),{shop,offer,lot}=x;
    const quantity=itemQuantity(offer.item,input.quantity);requireThat(quantity<=10000&&typeof input.restricted==='boolean','INVALID_QUANTITY');
    const provisionPath=`${base}/shopProvisions/${hash(provisionId)}`,intent=hash(JSON.stringify([shop.id,offer.id,provisionId,quantity,input.restricted,source,reason])),prior=await tx.get(provisionPath);
    if(prior){requireThat(prior.intent===intent,'SHOP_PROVISION_REUSED');return action==='prepareShopProvision'?{alreadyProvisioned:true,...prior.result}:prior.result;}
    requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
    requireThat(!lot||stockValid(lot,shop,offer),'SHOP_STOCK_CONFLICT');
    requireThat(!lot||input.restricted===(lot.transferable===false),'SHOP_RESTRICTIONS_LOCKED');
    const total=itemQuantity(offer.item,(lot?.quantity??0)+quantity),a=await tx.get(`${base}/accounts/${shopAccountId(shop.id)}`);
    if(a){requireThat(a.ownerType==='SHOP'&&a.shopId===shop.id&&a.sessionId===s.id,'ACCOUNT_UNAVAILABLE');moneyState(a);}
    const preview={shop:shop.name,offer:offer.name,quantity,before:lot?.quantity??0,after:total,restricted:input.restricted,source,reason,confirmation:hash(JSON.stringify([s.id,s.revision,actor.uid,intent,lot?.revision??0,a?.revision??0]))};
    if(action==='prepareShopProvision')return preview;
    requireThat(input.confirmation===preview.confirmation,'STALE_REVISION');
    const next=lot?{...lot,quantity:total,revision:lot.revision+1}:{...newLot(shopStockId(offer.id),{...offer.item,pillable:input.restricted?false:offer.item.pillable},quantity,shop.id,at,{kind:'SHOP_PROVISION',offerId:offer.id,versionId:s.versionId}),ownerType:'SHOP',location:{kind:'SHOP',id:shop.id},pillable:input.restricted?false:offer.item.pillable,transferable:!input.restricted,resellable:!input.restricted};
    tx.set(`${base}/inventory/${next.id}`,next);tx.set(`${base}/inventory/${next.id}/history/${eventId}`,{id:eventId,kind:'SHOP_PROVISION',at,actorUid:actor.uid,reason,source,provisionId,before:lot?movement(lot):null,after:movement(next)});
    if(!a){const opened={id:shopAccountId(shop.id),sessionId:s.id,ownerType:'SHOP',shopId:shop.id,label:shop.name,status:'ACTIVE',balance:0,reserved:0,revision:1,createdAt:at};tx.set(`${base}/accounts/${opened.id}`,opened);writeLedger(tx,s.id,{id:eventId,kind:'OPENING',at,actorUid:actor.uid,memo:`Caisse PNJ : ${shop.name}`,reason,createdCurrency:0,removedCurrency:0,entries:[{accountId:opened.id,delta:0,before:{balance:0,reserved:0,available:0,revision:0},after:moneyState(opened)}]});}
    result={provisionId,lotId:next.id,quantity,stock:total};tx.set(provisionPath,{id:hash(provisionId),intent,result,actorUid:actor.uid,at,source,reason});
   }else if(action==='prepareShopPurchase'||action==='buyShopOffer'){
    const x=await purchase(tx,ctx,input,at);if(action==='prepareShopPurchase')return x.result;
    requireThat(x.result.confirmation===input.confirmation,'STALE_REVISION');
    result=settleLotSale(tx,s,c,x.sale,x,x.from,at,eventId,actor);
   }else{
    active(s);const p=await tx.get(`${base}/lotSales/${documentId(input.saleId)}`);requireThat(p?.shopId&&(admin||p.buyerId===c.id),'FORBIDDEN');requireThat(p.status==='SOLD'&&p.pickupStatus!=='RECEIVED','SALE_CLOSED');
    const x=await order(tx,s,p,at);requireThat(x.allowed&&input.confirmation===x.view.confirmation,'STALE_PICKUP');
    let next={...p,revision:p.revision+1};
    if(action==='offerShopPickup')next={...next,pickupStatus:'READY',pickupBuyerVersion:x.buyer.version,pickupLotRevision:x.lot.revision};
    else{
     requireThat(x.ready,'STALE_PICKUP');requireThat(input.received===true,'HANDOVER_REQUIRED');
     const moved={...x.lot,holderId:c.id,location:{kind:'CHARACTER',id:c.id},revision:x.lot.revision+1};tx.set(`${base}/inventory/${moved.id}`,moved);tx.set(`${base}/inventory/${moved.id}/history/${eventId}`,{id:eventId,kind:'PICKUP',at,actorUid:actor.uid,saleId:p.id,reason:'Remise PNJ présentée puis réception confirmée par le joueur',before:movement(x.lot),after:movement(moved)});
     next={...next,pickupStatus:'RECEIVED',pickedUpAt:at};
    }
    tx.set(`${base}/lotSales/${p.id}`,next);result={id:p.id,pickupStatus:next.pickupStatus,purchasedLotId:p.purchasedLotId};
   }
   authorizeSpaceOutlaws(tx,s,'SHOP');
   tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,result});tx.set(op,{fingerprint,result,guard:version??null,at});return result;
  });
 };
}
