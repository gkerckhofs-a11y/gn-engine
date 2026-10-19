import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash,itemQuantity,publicItem,personalLot,readLot} from './inventory-state.mjs';
import {inventoryParty,inventoryPlayer} from './inventory-transfers.mjs';
import {accessAccount,accountParty,accountEntry} from './collective-accounts.mjs';
import {accountId,amountInput,currencyView,moneyState,moneyText,writeLedger} from './economy-state.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';

const actions=new Set(['prepareLotSale','proposeLotSale','lotSaleDetail','prepareLotPurchase','buyLot','declineLotSale','cancelLotSale','offerSalePickup','confirmSalePickup']);
export const saleAction=a=>actions.has(a);
export const saleView=p=>({id:p.id,status:p.status,revision:p.revision,createdAt:p.createdAt,expiresAt:p.expiresAt,
  seller:{id:p.sellerId,name:p.sellerName},buyer:{id:p.buyerId,name:p.buyerName},item:publicItem(p.item),quantity:p.quantity,
  lotId:p.lotId,amount:p.amount,currency:p.currency,conditions:p.conditions,pickupPlace:p.pickupPlace,
  purchasedLotId:p.purchasedLotId??null,paymentId:p.paymentId??null,paidAt:p.paidAt??null,payer:p.payer??null,
  pickupStatus:p.pickupStatus??null,pickedUpAt:p.pickedUpAt??null});
const view=saleView;
const proof=p=>hash(JSON.stringify(view(p)));
const movement=l=>({quantity:l.quantity,status:l.status,revision:l.revision,ownerId:l.ownerId,holderId:l.holderId,location:l.location});
async function state(tx,s,p,at){
  const seller=await inventoryParty(tx,s.id,p.sellerId),buyer=await inventoryParty(tx,s.id,p.buyerId);
  const lot=await readLot(tx,s.id,p.purchasedLotId??p.lotId,at);
  const identities=seller.active&&buyer.active;
  const valid=identities&&seller.version===p.sellerVersion&&buyer.version===p.buyerVersion&&!!lot&&personalLot(lot,p.sellerId)&&lot.status==='AVAILABLE'&&lot.revision===p.lotRevision&&lot.quantity>=p.quantity;
  const custody=identities&&!!lot&&lot.ownerId===p.buyerId&&lot.holderId===p.sellerId&&lot.location.kind==='CHARACTER'&&lot.location.id===p.sellerId&&lot.status==='AVAILABLE'&&lot.quantity===p.quantity;
  const ready=custody&&p.pickupStatus==='READY'&&lot.revision===p.pickupLotRevision&&seller.version===p.pickupSellerVersion&&buyer.version===p.pickupBuyerVersion;
  const status=p.status==='PENDING'?(at>=p.expiresAt?'EXPIRED':valid?'PENDING':'STALE'):p.status;
  const running=s.stage==='EN_JEU',pickupAllowed=running&&custody&&canGameAction(s,seller.c,'transfer')&&canGameAction(s,buyer.c,'transfer');
  return {seller,buyer,lot,valid,custody,ready,status,pickupAllowed,
    canBuy:status==='PENDING'&&running&&s.economyRules?.enabled===true&&canGameAction(s,seller.c,'transfer')&&canGameAction(s,buyer.c,'pay'),
    pickupConfirmation:hash(JSON.stringify([view(p),lot?.revision??null,seller.version,buyer.version]))};
}
async function projection(tx,s,c,p,at,preview=false){
  const x=await state(tx,s,p,at),seller=c.id===p.sellerId;
  return {...view(p),status:x.status,direction:seller?'OUT':'IN',confirmation:proof(p),pickupConfirmation:x.pickupConfirmation,
    ...(p.status==='SOLD'&&x.seller.active&&x.buyer.active?{pickupParties:{seller:{id:x.seller.c.id,name:x.seller.c.public.displayName},buyer:{id:x.buyer.c.id,name:x.buyer.c.public.displayName}}}:{}),
    canBuy:!preview&&!seller&&x.canBuy,
    canClose:!preview&&p.status==='PENDING'&&(seller?x.seller.version===p.sellerVersion:x.buyer.version===p.buyerVersion),
    canOfferPickup:!preview&&seller&&p.status==='SOLD'&&p.pickupStatus!=='RECEIVED'&&x.pickupAllowed&&!x.ready,
    canPickup:!preview&&!seller&&p.status==='SOLD'&&x.ready&&x.pickupAllowed,
    pickupStatus:p.pickupStatus==='READY'&&!x.ready?'STALE':p.pickupStatus??null};
}
export async function listLotSales(tx,s,c,at,preview=false){
  const base=`sessions/${s.id}/lotSales`,sent=await tx.list(base,['sellerId',c.id]),received=await tx.list(base,['buyerId',c.id]);
  const all=[...sent,...received].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
  const ongoing=p=>p.status==='PENDING'||p.status==='SOLD'&&p.pickupStatus!=='RECEIVED';
  return Promise.all([...all.filter(ongoing),...all.filter(p=>!ongoing(p)).slice(0,30)].map(p=>projection(tx,s,c,p,at,preview)));
}
export function settleLotSale(tx,s,c,p,x,from,at,id,actor){
  const base=`sessions/${s.id}`;
  const wholeLot=x.lot.quantity===p.quantity,purchasedLotId=wholeLot?x.lot.id:id;
  const acquired={...x.lot,id:purchasedLotId,quantity:p.quantity,ownerId:p.buyerId,status:'AVAILABLE',...(x.lot.marketReservation?{marketReservation:null}:{}),revision:wholeLot?x.lot.revision+1:1,
    ...(!wholeLot?{createdAt:at,origin:{kind:'SALE_SPLIT',parentLotId:x.lot.id,rootLotId:x.lot.origin?.rootLotId??x.lot.id,saleId:p.id}}:{})};
  const remaining=wholeLot?acquired:{...x.lot,quantity:x.lot.quantity-p.quantity,revision:x.lot.revision+1};
  const a=from.a,b=x.to.a,an={...a,balance:a.balance-p.amount,revision:a.revision+1},bn={...b,balance:b.balance+p.amount,revision:b.revision+1};
  tx.set(`${base}/accounts/${a.id}`,an);tx.set(`${base}/accounts/${b.id}`,bn);
  writeLedger(tx,s.id,{id,kind:'SALE',at,actorUid:actor.uid,operatorCharacterId:c.id,saleId:p.id,lotId:purchasedLotId,memo:`Achat : ${p.item.name} · ${p.quantity} ${p.item.unit}`,reason:'Vente immédiate confirmée, sans déplacement physique',source:accountParty(from),recipient:accountParty(x.to),createdCurrency:0,removedCurrency:0,entries:[accountEntry(a,-p.amount,an),accountEntry(b,p.amount,bn)]});
  const event={id,kind:'SALE',at,actorUid:actor.uid,saleId:p.id,paymentId:id,quantity:p.quantity,reason:'Paiement et propriété transférés, détention et emplacement conservés',before:movement(x.lot),after:movement(remaining),purchasedLotId};
  tx.set(`${base}/inventory/${x.lot.id}`,remaining);tx.set(`${base}/inventory/${x.lot.id}/history/${id}`,event);
  if(!wholeLot){tx.set(`${base}/inventory/${purchasedLotId}`,acquired);tx.set(`${base}/inventory/${purchasedLotId}/history/${id}`,{...event,before:null,after:movement(acquired),sourceLotId:x.lot.id});}
  const next={...p,status:'SOLD',revision:p.revision+1,purchasedLotId,paymentId:id,paidAt:at,payer:accountParty(from),pickupStatus:'WAITING'};
  tx.set(`${base}/lotSales/${p.id}`,next);return {id:p.id,status:next.status,purchasedLotId,paymentId:id,amount:p.amount,currency:p.currency};
}
export function createSaleService({store,signed,now,uuid}){
  async function prepare(tx,ctx,input,at){
    const {s,c,version}=ctx;requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
    const buyerId=documentId(input.buyerId);requireThat(buyerId!==c.id,'INVALID_RECIPIENT');
    const buyer=await inventoryParty(tx,s.id,buyerId);requireThat(buyer.active,'INVALID_RECIPIENT');
    const lot=await readLot(tx,s.id,documentId(input.lotId),at);requireThat(lot&&personalLot(lot,c.id),'FORBIDDEN');
    const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.status==='AVAILABLE'&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');
    const amount=amountInput(input.amount),minutes=whole(input.minutes,'INVALID_SALE');requireThat(minutes>=1&&minutes<=10080,'INVALID_SALE');
    const conditions=moneyText(input.conditions,2000),pickupPlace=moneyText(input.pickupPlace,200);
    const result={seller:{id:c.id,name:c.public.displayName},buyer:{id:buyerId,name:buyer.c.public.displayName},item:publicItem(lot.item),lotId:lot.id,quantity,amount,currency:currencyView(s.economyRules),minutes,conditions,pickupPlace};
    return {lot,buyer,result:{...result,confirmation:hash(JSON.stringify([s.id,version,buyer.version,lot.revision,result]))}};
  }
  async function purchase(tx,ctx,p,from,at){
    const {s,c}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(p.status==='PENDING','SALE_CLOSED');
    requireThat(at<p.expiresAt,'SALE_EXPIRED');const x=await state(tx,s,p,at);requireThat(x.valid,'STALE_SALE');
    requireGameAction(s,x.seller.c,'transfer');requireGameAction(s,c,'pay');
    const a=await tx.get(`sessions/${s.id}/accounts/${accountId(p.sellerId)}`);
    requireThat(a?.sessionId===s.id&&a.ownerType==='CHARACTER'&&a.characterId===p.sellerId,'ACCOUNT_UNAVAILABLE');moneyState(a);
    const before=moneyState(from.a);requireThat(before.available>=p.amount,'INSUFFICIENT_FUNDS');whole(a.balance+p.amount,'BALANCE_OVERFLOW');
    const to={a,name:p.sellerName},after={...before,balance:before.balance-p.amount,available:before.available-p.amount,revision:before.revision+1};
    const result={sale:view(p),source:accountParty(from),recipient:accountParty(to),fees:0,total:p.amount,...(from.read?{before,after}:{})};
    return {...x,to,result:{...result,confirmation:hash(JSON.stringify([s.id,proof(p),from.guard,from.a.revision,s.healthRules,result]))}};
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),id=uuid();return store.runTransaction(async tx=>{
      const ctx=await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
      if(action==='prepareLotSale')return (await prepare(tx,ctx,input,at)).result;
      let p,role,from;
      if(action!=='proposeLotSale'){
        p=await tx.get(`${base}/lotSales/${documentId(input.saleId)}`);requireThat(p&&(p.sellerId===c.id||p.buyerId===c.id),'FORBIDDEN');role=p.sellerId===c.id?'seller':'buyer';
        if(action==='lotSaleDetail')return projection(tx,s,c,p,at);
        requireThat(['cancelLotSale','offerSalePickup'].includes(action)?role==='seller':role==='buyer','FORBIDDEN');
        if(['buyLot','prepareLotPurchase'].includes(action)){
          requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');from=await accessAccount(tx,{...ctx,guard:version},input.fromAccountId);requireThat(from.spend,'FORBIDDEN');
          if(action==='prepareLotPurchase')return (await purchase(tx,ctx,p,from,at)).result;
        }
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===(from?.guard??version),'FORBIDDEN');return previous.result;}
      let result;
      if(action==='proposeLotSale'){
        const x=await prepare(tx,ctx,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        p={id,status:'PENDING',revision:1,createdAt:at,expiresAt:at+x.result.minutes*60000,sellerId:c.id,sellerName:c.public.displayName,sellerVersion:version,
          buyerId:x.buyer.c.id,buyerName:x.buyer.c.public.displayName,buyerVersion:x.buyer.version,lotId:x.lot.id,lotRevision:x.lot.revision,
          item:publicItem(x.lot.item),quantity:x.result.quantity,amount:x.result.amount,currency:x.result.currency,conditions:x.result.conditions,pickupPlace:x.result.pickupPlace};
        tx.set(`${base}/lotSales/${p.id}`,p);result={id:p.id,status:p.status};
      }else if(action==='buyLot'){
        const x=await purchase(tx,ctx,p,from,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        result=settleLotSale(tx,s,c,p,x,from,at,id,actor);
      }else if(action==='offerSalePickup'||action==='confirmSalePickup'){
        requireThat(p.status==='SOLD'&&p.pickupStatus!=='RECEIVED','SALE_CLOSED');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');
        const x=await state(tx,s,p,at);requireThat(x.custody,'STALE_PICKUP');requireThat(input.confirmation===x.pickupConfirmation,'STALE_PICKUP');
        requireGameAction(s,x.seller.c,'transfer');requireGameAction(s,x.buyer.c,'transfer');
        let next={...p,revision:p.revision+1};
        if(action==='offerSalePickup'){
          next={...next,pickupStatus:'READY',pickupLotRevision:x.lot.revision,pickupSellerVersion:x.seller.version,pickupBuyerVersion:x.buyer.version};
        }else{
          requireThat(x.ready,'STALE_PICKUP');requireThat(input.received===true,'HANDOVER_REQUIRED');
          const moved={...x.lot,holderId:p.buyerId,location:{kind:'CHARACTER',id:p.buyerId},revision:x.lot.revision+1};
          tx.set(`${base}/inventory/${moved.id}`,moved);tx.set(`${base}/inventory/${moved.id}/history/${id}`,{id,kind:'PICKUP',at,actorUid:actor.uid,saleId:p.id,reason:'Retrait physique confirmé, sans paiement supplémentaire',before:movement(x.lot),after:movement(moved)});
          next={...next,pickupStatus:'RECEIVED',pickedUpAt:at};
        }
        tx.set(`${base}/lotSales/${p.id}`,next);result={id:p.id,status:p.status,pickupStatus:next.pickupStatus,purchasedLotId:p.purchasedLotId};
      }else{
        requireThat(p.status==='PENDING','SALE_CLOSED');requireThat(version===p[`${role}Version`],'STALE_SALE');requireThat(input.confirmation===proof(p),'STALE_SALE');
        const status=action==='cancelLotSale'?'CANCELLED':'DECLINED';tx.set(`${base}/lotSales/${p.id}`,{...p,status,revision:p.revision+1});result={id:p.id,status};
      }
      tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,saleId:p.id,sellerId:p.sellerId,buyerId:p.buyerId,lotId:p.lotId,quantity:p.quantity,amount:p.amount,...result,id});
      tx.set(op,{fingerprint,result,guard:from?.guard??version,at});return result;
    });
  };
}
