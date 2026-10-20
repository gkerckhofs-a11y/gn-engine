import {requireThat,whole} from './validation.mjs';

export const storedIn=(lot,id)=>lot.location?.kind==='WAREHOUSE'&&lot.location.id===id;
export async function warehouseStock(tx,sid,id){
  return (await tx.list(`sessions/${sid}/inventory`)).filter(l=>storedIn(l,id)&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status));
}
export function stockVolume(lots){
  return lots.reduce((total,l)=>{
    requireThat(Number.isSafeInteger(l.item.unitVolume)&&l.item.unitVolume>=0,'VOLUME_REQUIRED');
    return whole(total+whole(l.quantity*l.item.unitVolume,'STORAGE_OVERFLOW'),'STORAGE_OVERFLOW');
  },0);
}
export async function checkStoredCorrection(tx,sid,lot,next){
  if(lot.location?.kind!=='WAREHOUSE')return;
  const w=await tx.get(`sessions/${sid}/warehouses/${lot.location.id}`);requireThat(w,'WAREHOUSE_UNAVAILABLE');
  const stock=await warehouseStock(tx,sid,w.id),updated=stock.filter(l=>l.id!==lot.id);
  if(next.quantity>0&&next.status!=='DESTROYED')updated.push(next);
  requireThat(stockVolume(updated)<=w.capacity,'WAREHOUSE_FULL');
  tx.set(`sessions/${sid}/warehouses/${w.id}`,{...w,revision:w.revision+1});
}
