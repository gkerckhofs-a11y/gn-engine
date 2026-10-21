import {requireThat,whole} from './validation.mjs';
import {groupVisible,memberFor} from './groups.mjs';

export function warehouseInput(input,id,old={}){
  const positive=v=>{whole(v,'INVALID_WAREHOUSE');requireThat(v>0,'INVALID_WAREHOUSE');return v;};
  const name=input.name,description=input.description??'';
  requireThat(typeof name==='string'&&name.trim()&&name.length<=150&&typeof description==='string'&&description.length<=4000&&typeof input.enabled==='boolean','INVALID_WAREHOUSE');
  const periodMinutes=positive(input.periodMinutes);whole(periodMinutes*60000,'INVALID_WAREHOUSE');
  return {id,name:name.trim(),description:description.trim(),capacity:positive(input.capacity),rent:whole(input.rent,'INVALID_WAREHOUSE'),periodMinutes,enabled:input.enabled,rentAccountId:input.rentAccountId??null,revision:(old.revision??0)+1};
}
export const stockPermissions=['readStock','depositStock','withdrawStock','manageStorage'];
export function storageGroups(s,groups,cid){
  return s.modules?.groups===true?groups.filter(g=>groupVisible(g,cid)).map(g=>({id:g.id,name:g.name,revision:g.revision,permissions:Object.fromEntries(stockPermissions.map(k=>[k,memberFor(g,cid).permissions[k]===true]))})):[];
}
export function warehouseAccess(w,cid,groups){
  if(!w.tenantId)return {access:false,read:false,deposit:false,withdraw:false,manage:false,group:null};
  if(w.tenantType!=='GROUP'){const own=w.tenantId===cid;return {access:own,read:own,deposit:own,withdraw:own,manage:own,group:null};}
  const group=groups.find(g=>g.id===w.tenantId),p=group?.permissions??{};
  return {access:stockPermissions.some(k=>p[k]),read:!!p.readStock,deposit:!!p.depositStock,withdraw:!!p.readStock&&!!p.withdrawStock,manage:!!p.manageStorage,group};
}

export const storedIn=(lot,id,kind='WAREHOUSE')=>lot.location?.kind===kind&&lot.location.id===id;
export async function warehouseStock(tx,sid,id,kind='WAREHOUSE'){
  return (await tx.list(`sessions/${sid}/inventory`)).filter(l=>storedIn(l,id,kind)&&l.quantity>0&&!['CONSUMED','DESTROYED'].includes(l.status));
}
export async function incomingTransfers(tx,sid,id,kind='WAREHOUSE'){
  return (await tx.list(`sessions/${sid}/cargoTransfers`)).filter(t=>t.status==='LOADING'&&t.destination.kind===kind&&t.destination.id===id);
}
export async function incomingVolume(tx,sid,id,kind='WAREHOUSE'){
  return (await incomingTransfers(tx,sid,id,kind)).reduce((n,t)=>whole(n+t.volume,'STORAGE_OVERFLOW'),0);
}
export function stockVolume(lots){
  return lots.reduce((total,l)=>{
    requireThat(Number.isSafeInteger(l.item.unitVolume)&&l.item.unitVolume>=0,'VOLUME_REQUIRED');
    return whole(total+whole(l.quantity*l.item.unitVolume,'STORAGE_OVERFLOW'),'STORAGE_OVERFLOW');
  },0);
}
export async function checkStoredCorrection(tx,sid,lot,next){
  if(!['WAREHOUSE','HOLD'].includes(lot.location?.kind))return;
  const kind=lot.location.kind,collection=kind==='HOLD'?'ships':'warehouses';
  const w=await tx.get(`sessions/${sid}/${collection}/${lot.location.id}`);requireThat(w,'WAREHOUSE_UNAVAILABLE');
  const stock=await warehouseStock(tx,sid,w.id,kind),updated=stock.filter(l=>l.id!==lot.id);
  if(next.quantity>0&&next.status!=='DESTROYED')updated.push(next);
  requireThat(stockVolume(updated)+await incomingVolume(tx,sid,w.id,kind)<=w.capacity,'WAREHOUSE_FULL');
  tx.set(`sessions/${sid}/${collection}/${w.id}`,{...w,revision:w.revision+1});
}
