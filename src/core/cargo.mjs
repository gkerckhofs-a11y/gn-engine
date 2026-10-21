import {shipInput,seedShip,shipAccess,localShip,validateNavigationReferences} from './navigation-state.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,readLot,publicLot,itemQuantity} from './inventory-state.mjs';
import {warehouseAccess,storageGroups,stockVolume,warehouseStock,incomingVolume} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {moneyText} from './economy-state.mjs';

const writes=['saveShip','startCargoTransfer','receiveCargoTransfer','cancelCargoTransfer','cancelCargoTransferAdmin'];
export const cargoCommands=[...writes,'cargoAdmin','myCargo','cargoLot','shipHold','prepareCargoTransfer','cargoTransfer'];
export const cargoAction=a=>cargoCommands.includes(a);
const same=(a,b)=>a.kind===b.kind&&a.id===b.id;
const ownerOf=l=>({type:l.ownerType??'CHARACTER',id:l.ownerId});
const sameOwner=(a,b)=>a.type===b.type&&a.id===b.id;
const state=l=>({quantity:l.quantity,status:l.status,revision:l.revision,ownerType:l.ownerType??'CHARACTER',ownerId:l.ownerId,holderId:l.holderId,location:l.location});
const locationInput=v=>{requireThat(v&&['CHARACTER','WAREHOUSE','HOLD'].includes(v.kind),'INVALID_DESTINATION');return {kind:v.kind,id:documentId(v.id)};};
const publicTransfer=t=>Object.fromEntries(['id','status','revision','lotId','name','quantity','volume','source','destination','sourceName','destinationName','at','closedAt'].filter(k=>t[k]!==undefined).map(k=>[k,t[k]]));

export function createCargoService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),base=`sessions/${sid}`,at=now(),eventId=uuid();
  return store.runTransaction(async tx=>{
   const admin=['cargoAdmin','saveShip','cancelCargoTransferAdmin'].includes(action);
   const ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,{sessionId:sid});
   const {s,c}=ctx;requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const allGroups=await tx.list(`${base}/groups`),groups=admin?[]:storageGroups(s,allGroups,c.id);
   const guard=admin?null:hash(JSON.stringify([ctx.version,s.modules?.groups===true,groups]));
   let op,fingerprint;
   if(writes.includes(action)){
    op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([action,input]));const old=await tx.get(op);
    if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===guard,'FORBIDDEN');return old.result;}
   }
   const audit=(result,event)=>{tx.set(`${base}/logisticsHistory/${eventId}`,event);tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard,result,at});return result;};
   const time=gameTime(s.clock,at),canMove=!admin&&s.stage==='EN_JEU'&&canGameAction(s,c,'transfer');
   async function place(loc){
    loc=locationInput(loc);
    if(loc.kind==='CHARACTER'){
     const ch=admin?await tx.get(`${base}/characters/${loc.id}`):c;requireThat(ch&&(admin||loc.id===c.id),'FORBIDDEN');return {location:loc,name:admin?ch.public.displayName:'Mon sac',owner:{type:'CHARACTER',id:ch.id},read:true,withdraw:true,deposit:true,revision:ch.contentRevision??0,record:null,capacity:null,used:0,incoming:0};
    }
    const collection=loc.kind==='HOLD'?'ships':'warehouses',r=await tx.get(`${base}/${collection}/${loc.id}`);requireThat(r,'CARGO_UNAVAILABLE');
    const owner=loc.kind==='HOLD'?ownerOf(r):{type:r.tenantType??'CHARACTER',id:r.tenantId};
    const access=admin?{access:true,read:true,withdraw:true,deposit:true}:loc.kind==='HOLD'?shipAccess(r,c.id,groups):warehouseAccess({tenantType:owner.type,tenantId:owner.id},c.id,groups);
    const deposit=access.deposit&&r.enabled&&(loc.kind==='HOLD'?localShip(s,r):!!r.tenantId&&time<r.expiresAtGameMs);
    const stock=access.access?await warehouseStock(tx,sid,r.id,loc.kind):[];
    return {location:loc,name:r.name,owner,read:access.read,pilot:access.pilot===true,withdraw:access.withdraw&&(loc.kind!=='HOLD'||localShip(s,r)),deposit:!!deposit,revision:r.revision,record:r,collection,capacity:r.capacity,used:stockVolume(stock),incoming:access.access?await incomingVolume(tx,sid,r.id,loc.kind):0,stock};
   }
   const viewPlace=p=>({location:p.location,name:p.name,capacity:p.capacity,used:p.used,incoming:p.incoming,canDeposit:p.deposit,canWithdraw:p.withdraw,canPilot:p.pilot===true});
   const bump=p=>{if(p.record)tx.set(`${base}/${p.collection}/${p.record.id}`,{...p.record,revision:p.record.revision+1});};
   const visibleLot=async lot=>{
    requireThat(lot,'CARGO_UNAVAILABLE');const p=await place(lot.location);
    requireThat(p.read&&sameOwner(ownerOf(lot),p.owner),'FORBIDDEN');return p;
   };
   async function destinations(lot){
    const locs=[{kind:'CHARACTER',id:c.id},...(await tx.list(`${base}/warehouses`)).map(w=>({kind:'WAREHOUSE',id:w.id})),...(await tx.list(`${base}/ships`)).map(w=>({kind:'HOLD',id:w.id}))],list=[];
    for(const loc of locs){const p=await place(loc);if(p.deposit&&sameOwner(p.owner,ownerOf(lot))&&!same(loc,lot.location))list.push(viewPlace(p));}return list;
   }
   if(action==='cargoAdmin'){
    const characters=await tx.list(`${base}/characters`),ships=await tx.list(`${base}/ships`),rows=[];
    for(const ship of ships){const p=await place({kind:'HOLD',id:ship.id});rows.push({...ship,used:p.used,incoming:p.incoming});}
    return {session:{id:sid,revision:s.revision,stage:s.stage},ships:rows,transportRules:s.transportRules??null,items:await tx.list(`${base}/items`),routes:await tx.list(`${base}/routes`),owners:[...characters.map(c=>({type:'CHARACTER',id:c.id,name:c.public.displayName})),...allGroups.map(g=>({type:'GROUP',id:g.id,name:g.name}))],transfers:(await tx.list(`${base}/cargoTransfers`)).filter(t=>t.status==='LOADING').map(publicTransfer)};
   }
   if(action==='saveShip'){
    requireThat(input.revision===s.revision,'STALE_REVISION');const id=input.shipId?documentId(input.shipId):eventId,old=await tx.get(`${base}/ships/${id}`);
    if(input.shipId)requireThat(old&&old.revision===input.shipRevision,'STALE_REVISION');
    const config=shipInput({...old,...input},id,old??{}),ownerId=config.ownerId;
    validateNavigationReferences(config,{characters:await tx.list(`${base}/characters`),groups:allGroups,items:await tx.list(`${base}/items`)});
    requireThat(!old?.journey,'VOYAGES_OPEN');
    if(old?.navigation){requireThat(config.navigation,'NAVIGATION_LOCKED');requireThat(config.navigation.tankCapacity>=old.fuel,'TANK_FULL');if(config.navigation.fuelItemId!==old.navigation.fuelItemId)requireThat(old.fuel===0,'FUEL_TYPE_LOCKED');}
    const stock=await warehouseStock(tx,sid,id,'HOLD'),incoming=await incomingVolume(tx,sid,id,'HOLD'),active=(await tx.list(`${base}/cargoTransfers`)).filter(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===id));
    requireThat(stockVolume(stock)+incoming<=config.capacity,'WAREHOUSE_FULL');
    if(old&&!sameOwner(ownerOf(old),{type:config.ownerType,id:ownerId}))requireThat(stock.length===0&&active.length===0,'SHIP_NOT_EMPTY');
    if(!config.docked)requireThat(active.length===0,'CARGO_TRANSFERS_OPEN');
    const next=old?{...old,...config,...(!old.navigation&&config.navigation?{fuel:config.navigation.initialFuel,portId:config.navigation.initialPort,journey:null}:{})}:seedShip(config),reason=moneyText(input.reason);
    if(active.length&&config.navigation)requireThat(localShip(s,next),'CARGO_TRANSFERS_OPEN');
    tx.set(`${base}/ships/${id}`,next);tx.set(base,{...s,revision:s.revision+1});
    return audit({id,revision:next.revision},{id:eventId,kind:'SHIP_CONFIGURE',at,actorUid:actor.uid,reason,before:old,after:next});
   }
   if(action==='myCargo'){
    const holds=[];for(const ship of await tx.list(`${base}/ships`)){const p=await place({kind:'HOLD',id:ship.id});if(p.read||p.deposit||p.withdraw||p.pilot)holds.push({...viewPlace(p),docked:ship.docked,enabled:ship.enabled,portId:ship.portId??null,inTransit:!!ship.journey,local:localShip(s,ship)});}
    const transfers=[];for(const t of await tx.list(`${base}/cargoTransfers`)){if(t.status!=='LOADING'||t.destination.kind==='CHARACTER'&&t.destination.id!==c.id)continue;const p=await place(t.destination);if(p.read)transfers.push(publicTransfer(t));}
    return {session:{id:sid,stage:s.stage},holds,transfers};
   }
   if(action==='shipHold'){
    const p=await place({kind:'HOLD',id:documentId(input.shipId)});requireThat(p.read||p.deposit||p.withdraw||p.pilot,'FORBIDDEN');
    return {session:{id:sid,stage:s.stage},hold:{...viewPlace(p),description:p.record.description,docked:p.record.docked,enabled:p.record.enabled,local:localShip(s,p.record),portId:p.record.portId??null,inTransit:!!p.record.journey},stock:p.read?p.stock.map(publicLot):[],canRead:p.read};
   }
   if(action==='cargoLot'){
    const lot=await readLot(tx,sid,documentId(input.lotId),at),p=await visibleLot(lot);
    return {session:{id:sid,stage:s.stage},lot:publicLot(lot),source:viewPlace(p),owner:{...ownerOf(lot),name:lot.ownerType==='GROUP'?groups.find(g=>g.id===lot.ownerId)?.name??'Bande':c.public.displayName},canMove:canMove&&p.withdraw&&lot.status==='AVAILABLE'&&lot.quantity>0,destinations:await destinations(lot)};
   }
   if(['prepareCargoTransfer','startCargoTransfer'].includes(action)){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
    const lot=await readLot(tx,sid,documentId(input.lotId),at),source=await visibleLot(lot),dest=await place(input.destination);
    requireThat(source.withdraw&&dest.deposit,'FORBIDDEN');requireThat(sameOwner(ownerOf(lot),dest.owner),'CARGO_OWNER_MISMATCH');requireThat(!same(source.location,dest.location),'INVALID_DESTINATION');
    requireThat(lot.status==='AVAILABLE','INSUFFICIENT_STOCK');const quantity=itemQuantity(lot.item,input.quantity);requireThat(quantity<=lot.quantity,'INSUFFICIENT_STOCK');
    const volume=stockVolume([{...lot,quantity}]);if(dest.capacity!==null)requireThat(whole(dest.used+dest.incoming+volume,'STORAGE_OVERFLOW')<=dest.capacity,'WAREHOUSE_FULL');
    const view={lotId:lot.id,name:lot.item.name,quantity,volume,source:viewPlace(source),destination:viewPlace(dest),remaining:lot.quantity-quantity};
    const confirmation=hash(JSON.stringify([sid,guard,lot,source.record,dest.record,view,s.healthRules]));
    if(action==='prepareCargoTransfer')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const entire=quantity===lot.quantity,id=entire?lot.id:eventId,reserved={...lot,id,quantity,status:'CARGO_RESERVED',cargoTransferId:eventId,revision:entire?lot.revision+1:1,...(!entire?{createdAt:at,origin:{kind:'CARGO_SPLIT',parentLotId:lot.id,rootLotId:lot.origin?.rootLotId??lot.id}}:{})};
    const remaining=entire?reserved:{...lot,quantity:lot.quantity-quantity,revision:lot.revision+1};
    const transfer={id:eventId,status:'LOADING',revision:1,lotId:id,originalLotId:lot.id,name:lot.item.name,quantity,volume,source:source.location,destination:dest.location,sourceName:source.name,destinationName:dest.name,owner:ownerOf(lot),at,actorUid:actor.uid,characterId:c.id};
    const event={id:eventId,kind:'CARGO_LOADING',at,actorUid:actor.uid,name:lot.item.name,quantity,transferId:eventId,before:state(lot),after:state(remaining),movedLotId:id,reserved:state(reserved)};
    tx.set(`${base}/inventory/${lot.id}`,remaining);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);
    if(!entire){tx.set(`${base}/inventory/${id}`,reserved);tx.set(`${base}/inventory/${id}/history/${eventId}`,{...event,before:null,after:state(reserved)});}
    tx.set(`${base}/cargoTransfers/${eventId}`,transfer);bump(source);bump(dest);return audit({id:eventId,lotId:id,status:'LOADING'},event);
   }
   const t=await tx.get(`${base}/cargoTransfers/${documentId(input.transferId)}`);requireThat(t,'CARGO_UNAVAILABLE');
   const source=await place(t.source),dest=await place(t.destination),lot=await readLot(tx,sid,t.lotId,at);
   requireThat(admin||dest.read,'FORBIDDEN');
   const confirmation=hash(JSON.stringify([sid,guard,t,lot,source.record,dest.record,s.healthRules]));
   const canReceive=canMove&&t.status==='LOADING'&&dest.deposit&&dest.read&&sameOwner(dest.owner,t.owner);
   const canCancel=t.status==='LOADING'&&(admin||source.read&&source.withdraw&&sameOwner(source.owner,t.owner));
   if(action==='cargoTransfer')return {session:{id:sid,stage:s.stage},transfer:publicTransfer(t),confirmation,canReceive,canCancel};
   requireThat(t.status==='LOADING'&&lot?.status==='CARGO_RESERVED'&&lot.cargoTransferId===t.id&&lot.quantity===t.quantity&&same(lot.location,t.source)&&sameOwner(ownerOf(lot),t.owner),'CARGO_TRANSFER_CLOSED');
   if(!admin)requireThat(input.confirmation===confirmation,'STALE_REVISION');
   const receive=action==='receiveCargoTransfer';
   if(receive){requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');requireThat(canReceive,'FORBIDDEN');requireThat(input.received===true,'CARGO_RECEIPT_REQUIRED');if(dest.capacity!==null)requireThat(dest.used+dest.incoming<=dest.capacity,'WAREHOUSE_FULL');}
   else {requireThat(canCancel,'FORBIDDEN');if(admin)requireThat(input.transferRevision===t.revision,'STALE_REVISION');}
   const next={...lot,status:'AVAILABLE',cargoTransferId:null,location:receive?dest.location:source.location,revision:lot.revision+1};
   const closed={...t,status:receive?'RECEIVED':'CANCELLED',closedAt:at,closedBy:actor.uid,revision:t.revision+1};
   const reason=admin?moneyText(input.reason):receive?'Réception à destination confirmée':'Chargement annulé ; biens conservés à la source';
   const event={id:eventId,kind:receive?'CARGO_RECEIVED':'CARGO_CANCELLED',at,actorUid:actor.uid,name:t.name,quantity:t.quantity,transferId:t.id,before:state(lot),after:state(next),reason};
   tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);tx.set(`${base}/cargoTransfers/${t.id}`,closed);bump(source);bump(dest);
   return audit({id:t.id,lotId:lot.id,status:closed.status},event);
  });
 };
}
