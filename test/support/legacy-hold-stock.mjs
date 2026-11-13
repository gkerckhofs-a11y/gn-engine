import {randomUUID} from 'node:crypto';
// Synthetic pre-existing hold stock for compatibility tests. This is intentionally
// not a playable bag-to-hold path: personal objects can no longer be loaded.
export async function legacyHoldStock(store,sid,lotId,quantity,chunks=null){
 const ids=[];await store.runTransaction(async tx=>{
  const base=`sessions/${sid}/inventory`,l=await tx.get(`${base}/${lotId}`);
  if(!l||quantity>l.quantity)throw Error('Insufficient fixture stock');
  const amounts=chunks??Array.from({length:Math.ceil(quantity/5)},(_,i)=>Math.min(5,quantity-i*5));
  if(amounts.reduce((a,b)=>a+b,0)!==quantity)throw Error('Invalid fixture split');
  tx.set(`${base}/${lotId}`,{...l,quantity:l.quantity-quantity,status:l.quantity===quantity?'CONSUMED':'AVAILABLE',revision:l.revision+1});
  for(const amount of amounts){const id=randomUUID();ids.push(id);tx.set(`${base}/${id}`,{...l,id,quantity:amount,revision:1,location:{kind:'HOLD',id:'ship'},origin:{kind:'TEST_LEGACY_HOLD',parentLotId:lotId}});}
 });return ids;
}
