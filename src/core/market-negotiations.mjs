import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {amountInput} from './economy-state.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {readPriceBook,commodityTrade} from './price-state.mjs';
import {marketState,marketView} from './market.mjs';
import {negotiationId,negotiationView,negotiationProof,negotiationState} from './market-negotiation-state.mjs';

export const negotiationCommands=['myMarketNegotiations','marketNegotiation','prepareMarketOffer','sendMarketOffer','acceptMarketOffer','closeMarketNegotiation'];
export const negotiationAction=a=>negotiationCommands.includes(a);
const messageInput=value=>{requireThat(typeof value==='string'&&value.trim().length<=2000,'INVALID_NEGOTIATION');return value.trim();};
const live=(s,x,buyer,trade)=>{
  requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
  requireThat(x.status==='ACTIVE','STALE_LISTING');requireThat(!trade.blocked,'TRADE_SUSPENDED');
  requireGameAction(s,x.seller.c,'transfer');requireGameAction(s,buyer.c,'pay');
};
export function createNegotiationService({store,signed,now,uuid}){
  async function context(tx,s,n,at,book){
    const p=await tx.get(`sessions/${s.id}/marketListings/${n.listingId}`),x=p?await marketState(tx,s,p,at):{status:'UNAVAILABLE'};
    return {p,x,...await negotiationState(tx,s,p,x,n,at),trade:p?commodityTrade(book,p.item):{blocked:false,effects:[]}};
  }
  function project(s,c,n,x){
    const active=['OPEN','ACCEPTED'].includes(x.status),ready=active&&s.stage==='EN_JEU'&&s.economyRules?.enabled===true&&!x.trade.blocked&&canGameAction(s,x.x.seller.c,'transfer')&&canGameAction(s,x.buyer.c,'pay');
    return {...negotiationView(n),status:x.status,listing:x.p?marketView(x.p):null,trade:x.trade,confirmation:negotiationProof(n),
      canReply:!!ready&&x.status==='OPEN'&&c.id!==n.authorId,canBuy:!!ready&&x.status==='ACCEPTED'&&c.id===n.buyerId,
      canClose:['OPEN','ACCEPTED'].includes(n.status),ownOffer:c.id===n.authorId};
  }
  async function prepare(tx,ctx,input,at){
    const {s,c,version}=ctx,base=`sessions/${s.id}`;
    const p=await tx.get(`${base}/marketListings/${documentId(input.listingId)}`);requireThat(p,'NOT_FOUND');
    const x=await marketState(tx,s,p,at),trade=commodityTrade(await readPriceBook(tx,s,at),p.item);
    let n,buyer,status,minutes=null;
    if(input.negotiationId){
      n=await tx.get(`${base}/marketNegotiations/${documentId(input.negotiationId)}`);
      requireThat(n&&n.listingId===p.id&&[n.sellerId,n.buyerId].includes(c.id),'FORBIDDEN');
      ({buyer,status}=await negotiationState(tx,s,p,x,n,at));requireThat(status==='OPEN','NEGOTIATION_CLOSED');requireThat(n.authorId!==c.id,'NEGOTIATION_TURN');
    }else{
      requireThat(c.id!==p.sellerId,'FORBIDDEN');buyer={active:true,c,version};
      n=await tx.get(`${base}/marketNegotiations/${negotiationId(p.id,c.id)}`);
      if(n){({status}=await negotiationState(tx,s,p,x,n,at));requireThat(!['OPEN','ACCEPTED'].includes(status),'NEGOTIATION_EXISTS');}
      minutes=whole(input.minutes,'INVALID_SALE');requireThat(minutes>=1&&minutes<=10080,'INVALID_SALE');
    }
    live(s,x,buyer,trade);
    const amount=amountInput(input.amount),message=messageInput(input.message??'');
    const result={listing:marketView(p),amount,message,minutes,expiresAt:input.negotiationId?n.expiresAt:null,
      recipient:{id:c.id===p.sellerId?buyer.c.id:p.sellerId,name:c.id===p.sellerId?buyer.c.public.displayName:p.sellerName},trade};
    return {p,n,buyer,result:{...result,confirmation:hash(JSON.stringify([s.id,version,buyer.version,x.seller.version,s.healthRules,n?negotiationProof(n):null,result]))}};
  }
  return async(action,actor,input)=>{
    signed(actor);const at=now(),id=uuid();return store.runTransaction(async tx=>{
      const ctx=await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
      requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
      if(action==='myMarketNegotiations'){
        const rows=[...await tx.list(`${base}/marketNegotiations`,['buyerId',c.id]),...await tx.list(`${base}/marketNegotiations`,['sellerId',c.id])].sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
        const book=rows.length?await readPriceBook(tx,s,at):null,negotiations=[];let closed=0;
        for(const n of rows){const x=await context(tx,s,n,at,book);if(!['OPEN','ACCEPTED'].includes(x.status)&&closed++>=30)continue;negotiations.push(project(s,c,n,x));}
        return {session:{id:s.id},negotiations};
      }
      if(action==='prepareMarketOffer')return (await prepare(tx,ctx,input,at)).result;
      let n;
      if(action!=='sendMarketOffer'){
        n=await tx.get(`${base}/marketNegotiations/${documentId(input.negotiationId)}`);requireThat(n&&[n.sellerId,n.buyerId].includes(c.id),'FORBIDDEN');
        if(action==='marketNegotiation'){
          const x=await context(tx,s,n,at,await readPriceBook(tx,s,at));
          const history=(await tx.list(`${base}/marketNegotiations/${n.id}/history`,null,{orderBy:'revision',direction:'desc',limit:50})).map(e=>({revision:e.revision,at:e.at,kind:e.kind,author:e.author,amount:e.amount,message:e.message})).reverse();
          return {...project(s,c,n,x),history};
        }
      }
      const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
      if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.guard===version,'FORBIDDEN');return previous.result;}
      let next,kind;
      if(action==='sendMarketOffer'){
        const prepared=await prepare(tx,ctx,input,at);requireThat(input.confirmation===prepared.result.confirmation,'STALE_REVISION');
        const {p,buyer,result:r}=prepared;n=prepared.n;const counter=!!input.negotiationId;kind=counter?'COUNTER':'OFFER';
        next={id:counter?n.id:negotiationId(p.id,c.id),listingId:p.id,listingRevision:p.revision,status:'OPEN',revision:(n?.revision??0)+1,
          sellerId:p.sellerId,sellerName:p.sellerName,buyerId:buyer.c.id,buyerName:buyer.c.public.displayName,buyerVersion:buyer.version,
          authorId:c.id,amount:r.amount,message:r.message,createdAt:counter?n.createdAt:at,updatedAt:at,expiresAt:counter?n.expiresAt:Math.min(p.expiresAt,at+r.minutes*60000)};
      }else{
        requireThat(input.confirmation===negotiationProof(n),'STALE_REVISION');
        requireThat(['OPEN','ACCEPTED'].includes(n.status),'NEGOTIATION_CLOSED');
        if(action==='acceptMarketOffer'){
          const x=await context(tx,s,n,at,await readPriceBook(tx,s,at));requireThat(x.status==='OPEN','NEGOTIATION_CLOSED');requireThat(c.id!==n.authorId,'NEGOTIATION_TURN');live(s,x.x,x.buyer,x.trade);kind='ACCEPT';
          next={...n,status:'ACCEPTED',acceptedAt:at};
        }else{kind='CLOSE';next={...n,status:'CLOSED',closedAt:at};}
        next={...next,revision:n.revision+1,updatedAt:at};
      }
      const event={id,revision:next.revision,at,kind,author:{id:c.id,name:c.public.displayName},amount:next.amount,message:kind==='OFFER'||kind==='COUNTER'?next.message:''};
      tx.set(`${base}/marketNegotiations/${next.id}`,next);tx.set(`${base}/marketNegotiations/${next.id}/history/${id}`,event);
      tx.set(`${base}/audit/${id}`,{...event,action,actorUid:actor.uid,listingId:next.listingId,negotiationId:next.id});
      const result={id:next.id,status:next.status};tx.set(op,{fingerprint,result,guard:version,at});return result;
    });
  };
}
