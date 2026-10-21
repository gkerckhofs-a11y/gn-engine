import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';

export const negotiationId=(listingId,buyerId)=>hash(`negotiation:${listingId}:${buyerId}`);
export const negotiationView=n=>({id:n.id,listingId:n.listingId,revision:n.revision,status:n.status,amount:n.amount,
  seller:{id:n.sellerId,name:n.sellerName},buyer:{id:n.buyerId,name:n.buyerName},authorId:n.authorId,
  message:n.message,createdAt:n.createdAt,updatedAt:n.updatedAt,expiresAt:n.expiresAt,saleId:n.saleId??null});
export const negotiationProof=n=>hash(JSON.stringify(negotiationView(n)));
export async function negotiationState(tx,s,p,x,n,at){
  const buyer=await inventoryParty(tx,s.id,n.buyerId);
  let status=n.status;
  if(['OPEN','ACCEPTED'].includes(status)){
    if(at>=n.expiresAt)status='EXPIRED';
    else if(!p||x.status!=='ACTIVE'||p.revision!==n.listingRevision)status='UNAVAILABLE';
    else if(!buyer.active||buyer.version!==n.buyerVersion)status='STALE';
  }
  return {buyer,status};
}
