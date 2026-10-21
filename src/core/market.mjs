import {readPriceBook,commodityQuote,priceBoard,indexedListing} from './price-state.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash,itemQuantity,publicItem,personalLot,lotState,readLot} from './inventory-state.mjs';
import {inventoryParty,inventoryPlayer} from './inventory-transfers.mjs';
import {accessAccount,accountParty} from './collective-accounts.mjs';
import {accountId,amountInput,currencyView,moneyState,moneyText} from './economy-state.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {settleLotSale,saleView} from './sales.mjs';

const actions=new Set(['market','marketListing','prepareMarketListing','publishMarketListing','prepareMarketPurchase','buyMarketListing','withdrawMarketListing','sessionMarket','withdrawSessionListing']);
export const marketAction=a=>actions.has(a);
const view=p=>({id:p.id,status:p.status,revision:p.revision,createdAt:p.createdAt,expiresAt:p.expiresAt,seller:{id:p.sellerId,name:p.sellerName},item:publicItem(p.item),quantity:p.quantity,amount:p.amount,pricing:p.pricing??'FIXED',priceQuote:p.priceQuote??null,currency:p.currency,pickupPlace:p.pickupPlace,conditions:p.conditions});
const proof=p=>hash(JSON.stringify(view(p)));
const reserved=(lot,p)=>!!lot&&personalLot(lot,p.sellerId)&&lot.status==='RESERVED'&&lot.marketReservation?.listingId===p.id&&lot.marketReservation.expiresAt===p.expiresAt&&lot.revision===p.lotRevision&&lot.quantity===p.quantity;
async function state(tx,s,p,at){
  const seller=await inventoryParty(tx,s.id,p.sellerId),lot=await readLot(tx,s.id,p.lotId,at);
  const valid=seller.active&&seller.version===p.sellerVersion&&reserved(lot,p);
  return {seller,lot,valid,status:p.status==='ACTIVE'?(at>=p.expiresAt?'EXPIRED':valid?'ACTIVE':'STALE'):p.status};
}
function project(s,c,p,x,admin=false,book=null){
  const priced=indexedListing({...p,status:x.status},book);
  const own=c?.id===p.sellerId,manage=admin||own;
  return {...view(priced),priceAvailable:priced.priceAvailable,status:x.status,own:!!own,canBuy:priced.priceAvailable&&!admin&&!own&&x.status==='ACTIVE'&&s.stage==='EN_JEU'&&s.economyRules?.enabled===true&&canGameAction(s,x.seller.c,'transfer')&&canGameAction(s,c,'pay'),
    ...(manage?{lotId:p.lotId,confirmation:proof(p),canWithdraw:p.status==='ACTIVE',saleId:p.saleId??null}:{})};
}
export function createMarketService({store,signed,checkSession,now,uuid}){
  async function prepare(tx,ctx,input,at){
    const {s,c,version}=ctx;requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
    const lot=await readLot(tx,s.id,documentId(input.lotId),at);requireThat(lot&&personalLot(lot,c.id),'FORBIDDEN');
    const quantity=itemQuantity(lot.item,input.quantity);requireThat(lot.status==='AVAILABLE'&&lot.quantity>=quantity,'INSUFFICIENT_STOCK');
    const pricing=input.pricing??'FIXED';requireThat(['FIXED','INDEXED'].includes(pricing),'INVALID_PRICE');
    const priceQuote=pricing==='INDEXED'?commodityQuote(await readPriceBook(tx,s,at),lot.item):null;requireThat(pricing!=='INDEXED'||priceQuote,'PRICE_UNAVAILABLE');
    const amount=pricing==='INDEXED'?whole(priceQuote.unitPrice*quantity,'BALANCE_OVERFLOW'):amountInput(input.amount),minutes=whole(input.minutes,'INVALID_SALE');requireThat(minutes>=1&&minutes<=10080,'INVALID_SALE');
    const result={seller:{id:c.id,name:c.public.displayName},item:publicItem(lot.item),quantity,amount,pricing,priceQuote,currency:currencyView(s.economyRules),minutes,pickupPlace:moneyText(input.pickupPlace,200),conditions:moneyText(input.conditions,2000)};
    return {lot,result:{...result,confirmation:hash(JSON.stringify([s.id,version,lot.revision,s.healthRules,result]))}};
  }
  async function purchase(tx,ctx,p,from,at){
    const {s,c,version}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(p.status==='ACTIVE','LISTING_CLOSED');requireThat(at<p.expiresAt,'LISTING_EXPIRED');
    const x=await state(tx,s,p,at);requireThat(x.valid,'STALE_LISTING');
    p=indexedListing(p,p.pricing==='INDEXED'?await readPriceBook(tx,s,at):null);requireThat(p.priceAvailable,'PRICE_UNAVAILABLE');requireGameAction(s,x.seller.c,'transfer');requireGameAction(s,c,'pay');
    const a=await tx.get(`sessions/${s.id}/accounts/${accountId(p.sellerId)}`);requireThat(a?.sessionId===s.id&&a.ownerType==='CHARACTER'&&a.characterId===p.sellerId,'ACCOUNT_UNAVAILABLE');moneyState(a);
    const before=moneyState(from.a);requireThat(before.available>=p.amount,'INSUFFICIENT_FUNDS');whole(a.balance+p.amount,'BALANCE_OVERFLOW');
    const to={a,name:p.sellerName},after={...before,balance:before.balance-p.amount,available:before.available-p.amount,revision:before.revision+1};
    const sale={...p,id:hash(`market:${p.id}`),listingId:p.id,status:'PENDING',revision:1,buyerId:c.id,buyerName:c.public.displayName,buyerVersion:version};
    const result={sale:saleView(sale),source:accountParty(from),recipient:accountParty(to),fees:0,total:p.amount,...(from.read?{before,after}:{})};
    return {...x,sale,to,result:{...result,confirmation:hash(JSON.stringify([s.id,proof(p),x.seller.version,from.guard,from.a.revision,s.healthRules,result]))}};
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),id=uuid();return store.runTransaction(async tx=>{
      const admin=action==='sessionMarket'||action==='withdrawSessionListing';
      const ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId)),c:null,version:actor.uid}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx;
      requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');const base=`sessions/${s.id}`;
      if(action==='market'||action==='sessionMarket'){
        const book=await readPriceBook(tx,s,at);
        const all=(await tx.list(`${base}/marketListings`)).sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id)),listings=[];let closed=0;
        for(const p of all){const x=await state(tx,s,p,at);if(!admin&&p.sellerId!==c.id&&x.status!=='ACTIVE')continue;if(!admin&&x.status!=='ACTIVE'&&p.status!=='ACTIVE'&&closed++>=30)continue;listings.push(project(s,c,p,x,admin,book));}
        return {session:{id:s.id,stage:s.stage},admin,economyEnabled:s.economyRules?.enabled===true,currency:s.economyRules?currencyView(s.economyRules):null,prices:priceBoard(book),listings};
      }
      if(action==='prepareMarketListing')return (await prepare(tx,ctx,input,at)).result;
      let p,from;
      if(action!=='publishMarketListing'){
        p=await tx.get(`${base}/marketListings/${documentId(input.listingId)}`);requireThat(p,'NOT_FOUND');
        if(action==='marketListing'){const x=await state(tx,s,p,at);requireThat(c.id===p.sellerId||x.status==='ACTIVE','NOT_FOUND');return project(s,c,p,x,false,p.pricing==='INDEXED'?await readPriceBook(tx,s,at):null);}
        if(action==='withdrawMarketListing')requireThat(c.id===p.sellerId,'FORBIDDEN');
        if(['prepareMarketPurchase','buyMarketListing'].includes(action)){
          requireThat(c.id!==p.sellerId,'FORBIDDEN');requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');from=await accessAccount(tx,{...ctx,guard:version},input.fromAccountId);requireThat(from.spend,'FORBIDDEN');
          if(action==='prepareMarketPurchase')return (await purchase(tx,ctx,p,from,at)).result;
        }
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===(from?.guard??version),'FORBIDDEN');return previous.result;}
      let result,reason;
      if(action==='publishMarketListing'){
        const x=await prepare(tx,ctx,input,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        const wholeLot=x.lot.quantity===x.result.quantity,lotId=wholeLot?x.lot.id:id,expiresAt=at+x.result.minutes*60000;
        const locked={...x.lot,id:lotId,quantity:x.result.quantity,status:'RESERVED',revision:wholeLot?x.lot.revision+1:1,marketReservation:{listingId:id,expiresAt},...(!wholeLot?{createdAt:at,origin:{kind:'MARKET_SPLIT',parentLotId:x.lot.id,rootLotId:x.lot.origin?.rootLotId??x.lot.id,listingId:id}}:{})};
        p={id,status:'ACTIVE',revision:1,createdAt:at,expiresAt,sellerId:c.id,sellerName:c.public.displayName,sellerVersion:version,lotId,lotRevision:locked.revision,item:publicItem(x.lot.item),quantity:x.result.quantity,amount:x.result.amount,pricing:x.result.pricing,priceQuote:x.result.priceQuote,currency:x.result.currency,pickupPlace:x.result.pickupPlace,conditions:x.result.conditions};
        const remaining=wholeLot?locked:{...x.lot,quantity:x.lot.quantity-locked.quantity,revision:x.lot.revision+1};
        const event={id,kind:'MARKET_RESERVE',at,actorUid:actor.uid,listingId:id,expiresAt,reason:'Stock réservé pour une annonce du marché',before:lotState(x.lot),after:lotState(remaining)};
        tx.set(`${base}/inventory/${x.lot.id}`,remaining);tx.set(`${base}/inventory/${x.lot.id}/history/${id}`,event);
        if(!wholeLot){tx.set(`${base}/inventory/${lotId}`,locked);tx.set(`${base}/inventory/${lotId}/history/${id}`,{...event,before:null,after:lotState(locked),sourceLotId:x.lot.id});}
        tx.set(`${base}/marketListings/${p.id}`,p);result={id:p.id,status:p.status,lotId};
      }else if(action==='buyMarketListing'){
        const x=await purchase(tx,ctx,p,from,at);requireThat(input.confirmation===x.result.confirmation,'STALE_REVISION');
        result={...settleLotSale(tx,s,c,x.sale,x,from,at,id,actor),listingId:p.id};
        tx.set(`${base}/marketListings/${p.id}`,{...p,amount:x.sale.amount,priceQuote:x.sale.priceQuote??null,status:'SOLD',revision:p.revision+1,saleId:result.id,soldAt:at});
      }else{
        requireThat(p.status==='ACTIVE','LISTING_CLOSED');requireThat(input.confirmation===proof(p),'STALE_LISTING');
        reason=admin?moneyText(input.reason):'Annonce retirée par le vendeur';
        const lot=await readLot(tx,s.id,p.lotId,at);
        // An expired listing must never release a newer reservation on the same lot.
        if(reserved(lot,p)){
          const next={...lot,status:'AVAILABLE',marketReservation:null,revision:lot.revision+1};
          tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:'MARKET_RELEASE',at,actorUid:actor.uid,listingId:p.id,reason,before:lotState(lot),after:lotState(next)});
        }
        tx.set(`${base}/marketListings/${p.id}`,{...p,status:'WITHDRAWN',revision:p.revision+1,closedAt:at});result={id:p.id,status:'WITHDRAWN'};
      }
      tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,listingId:p.id,lotId:p.lotId,quantity:p.quantity,amount:result.amount??p.amount,result,...(reason?{reason}:{})});
      tx.set(op,{fingerprint,result,guard:from?.guard??version,at});return result;
    });
  };
}
