import {documentId,requireThat,whole} from './validation.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {inventoryHash as hash,readLot,publicLot,itemQuantity,personalLot} from './inventory-state.mjs';
import {storageGroups,warehouseStock} from './storage-state.mjs';
import {transportRulesInput,routeInput,localShip,shipAccess,navigationView} from './navigation-state.mjs';
import {gameTime} from './clock.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {moneyText} from './economy-state.mjs';

const writes=['saveTransportRules','saveRoute','refuelShip','departShip','arriveShip','resolveVoyageAdmin'];
const admins=['saveTransportRules','saveRoute','resolveVoyageAdmin'];
export const voyageCommands=[...writes,'shipNavigation','prepareRefuel','prepareVoyage'];
export const voyageAction=a=>voyageCommands.includes(a);
export function createVoyageService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),base=`sessions/${sid}`,at=now(),eventId=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.includes(action),ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,{sessionId:sid}),{s,c}=ctx;
   requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   const groups=admin?[]:storageGroups(s,await tx.list(`${base}/groups`),c.id),guard=admin?null:hash(JSON.stringify([ctx.version,s.modules?.groups===true,groups]));
   let op,fingerprint,replay;
   if(writes.includes(action)){
    op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`;fingerprint=hash(JSON.stringify([action,input]));const old=await tx.get(op);
    if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===guard,'FORBIDDEN');if(admin)return old.result;replay=old;}
   }
   const audit=(result,event)=>{tx.set(`${base}/logisticsHistory/${eventId}`,event);tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard,result,at});return result;};
   const time=gameTime(s.clock,at);
   if(action==='saveTransportRules'){
    requireThat(input.revision===s.revision,'STALE_REVISION');const rules=transportRulesInput(input),ships=await tx.list(`${base}/ships`);
    // Moving the real playing site must never teleport ships or strand open loads.
    if(s.transportRules?.homePort!==rules.homePort){requireThat(!ships.some(x=>x.journey),'VOYAGES_OPEN');requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'),'CARGO_TRANSFERS_OPEN');}
    const reason=moneyText(input.reason);tx.set(base,{...s,transportRules:rules,revision:s.revision+1});return audit({id:sid},{id:eventId,kind:'TRANSPORT_CONFIGURE',at,actorUid:actor.uid,reason,before:s.transportRules??null,after:rules});
   }
   if(action==='saveRoute'){
    requireThat(input.revision===s.revision,'STALE_REVISION');const id=input.routeId?documentId(input.routeId):eventId,old=await tx.get(`${base}/routes/${id}`);
    if(input.routeId)requireThat(old&&old.revision===input.routeRevision,'STALE_REVISION');
    const next=routeInput(input,id,old??{}),reason=moneyText(input.reason);tx.set(`${base}/routes/${id}`,next);tx.set(base,{...s,revision:s.revision+1});return audit({id},{id:eventId,kind:'ROUTE_CONFIGURE',at,actorUid:actor.uid,reason,before:old,after:next});
   }
   const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(ship,'CARGO_UNAVAILABLE');
   const access=admin?{access:true,pilot:true,withdraw:true}:shipAccess(ship,c.id,groups);requireThat(access.access,'FORBIDDEN');
   if(replay){requireThat(access.pilot,'FORBIDDEN');return replay.result;}
   const allowed=!admin&&access.pilot&&s.stage==='EN_JEU'&&canGameAction(s,c,'transfer');
   const view=navigationView(s,ship,time),confirmation=hash(JSON.stringify([sid,guard,ship,s.transportRules,s.healthRules]));
   const fuelItem=ship.navigation?await tx.get(`${base}/items/${ship.navigation.fuelItemId}`):null;
   const fuelAllowed=lot=>lot.status==='AVAILABLE'&&lot.quantity>0&&lot.item.id===ship.navigation?.fuelItemId&&lot.item.consumable===true&&lot.item.kind==='STACKABLE'&&!lot.item.laserRecharge&&(
    lot.location?.kind==='CHARACTER'&&personalLot(lot,c.id)||access.withdraw&&lot.location?.kind==='HOLD'&&lot.location.id===ship.id&&(lot.ownerType??'CHARACTER')===ship.ownerType&&lot.ownerId===ship.ownerId);
   if(action==='shipNavigation'){
    const routes=(await tx.list(`${base}/routes`)).filter(r=>r.enabled&&r.fromPort===ship.portId);
    const lots=allowed&&localShip(s,ship)&&ship.navigation?(await tx.list(`${base}/inventory`)).filter(fuelAllowed).map(publicLot):[];
    return {session:{id:sid,stage:s.stage},ship:view,canPilot:access.pilot,canAct:allowed,confirmation,fuelName:fuelItem?.name??null,fuelUnit:fuelItem?.unit??null,lots,routes:routes.map(r=>({...r,affordable:ship.fuel>=r.fuelCost})),canArrive:allowed&&!!ship.journey&&time>=ship.journey.arrivesAtGameMs};
   }
   if(action==='resolveVoyageAdmin'){
    requireThat(input.shipRevision===ship.revision,'STALE_REVISION');requireThat(ship.journey,'VOYAGE_CLOSED');requireThat(['ARRIVE','RETURN'].includes(input.outcome),'INVALID_NAVIGATION');
    const reason=moneyText(input.reason),j=ship.journey,next={...ship,journey:null,portId:input.outcome==='ARRIVE'?j.toPort:j.fromPort,docked:true,revision:ship.revision+1};
    const event={id:eventId,kind:'VOYAGE_RESOLVED',at,actorUid:actor.uid,reason,shipId:ship.id,journeyId:j.id,before:ship,after:next,outcome:input.outcome};
    tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...j,shipId:ship.id,status:input.outcome==='ARRIVE'?'ARRIVED':'RETURNED',closedAt:at,resolvedBy:actor.uid,reason});return audit({id:j.id,status:input.outcome==='ARRIVE'?'ARRIVED':'RETURNED'},event);
   }
   requireThat(access.pilot,'FORBIDDEN');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'transfer');
   requireThat(ship.navigation&&s.transportRules?.homePort,'NAVIGATION_REQUIRED');
   if(['prepareRefuel','refuelShip'].includes(action)){
    requireThat(localShip(s,ship),'SHIP_NOT_LOCAL');const lot=await readLot(tx,sid,documentId(input.lotId),at);requireThat(lot&&fuelAllowed(lot),'INVALID_FUEL');
    const quantity=itemQuantity(lot.item,input.quantity);requireThat(quantity<=lot.quantity,'INSUFFICIENT_STOCK');const fuel=whole(ship.fuel+quantity,'INVALID_NAVIGATION');requireThat(fuel<=ship.navigation.tankCapacity,'TANK_FULL');
    const consent=hash(JSON.stringify([confirmation,lot,quantity]));
    if(action==='prepareRefuel')return {shipName:ship.name,quantity,fuelName:lot.item.name,fuelUnit:lot.item.unit,before:ship.fuel,after:fuel,capacity:ship.navigation.tankCapacity,fromPersonalBag:lot.location.kind==='CHARACTER',confirmation:consent};
    requireThat(input.confirmation===consent,'STALE_REVISION');const remaining=lot.quantity-quantity,nextLot={...lot,quantity:remaining,status:remaining?'AVAILABLE':'CONSUMED',revision:lot.revision+1},next={...ship,fuel,revision:ship.revision+1};
    const event={id:eventId,kind:'SHIP_REFUEL',at,actorUid:actor.uid,shipId:ship.id,lotId:lot.id,quantity,before:{fuel:ship.fuel,lotQuantity:lot.quantity},after:{fuel,lotQuantity:remaining}};
    tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${eventId}`,event);tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,fuel},event);
   }
   if(['prepareVoyage','departShip'].includes(action)){
    requireThat(!ship.journey&&ship.docked&&ship.enabled,'SHIP_UNAVAILABLE');
    const route=await tx.get(`${base}/routes/${documentId(input.routeId)}`);requireThat(route?.enabled&&route.fromPort===ship.portId,'ROUTE_UNAVAILABLE');
    requireThat(ship.fuel>=route.fuelCost,'INSUFFICIENT_FUEL');
    const loads=(await tx.list(`${base}/cargoTransfers`)).filter(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===ship.id));requireThat(!loads.length,'CARGO_TRANSFERS_OPEN');
    const stock=await warehouseStock(tx,sid,ship.id,'HOLD');requireThat(stock.every(l=>l.status==='AVAILABLE'||l.status==='SEIZED'),'CARGO_TRANSFERS_OPEN');
    const consent=hash(JSON.stringify([confirmation,route,stock,loads]));
    if(action==='prepareVoyage')return {shipName:ship.name,route,remainingFuel:ship.fuel-route.fuelCost,confirmation:consent};
    requireThat(input.confirmation===consent,'STALE_REVISION');const j={id:eventId,routeId:route.id,name:route.name,fromPort:route.fromPort,toPort:route.toPort,fuelCost:route.fuelCost,durationSeconds:route.durationSeconds,departedAt:at,departedAtGameMs:time,arrivesAtGameMs:whole(time+route.durationSeconds*1000,'INVALID_NAVIGATION')};
    const next={...ship,fuel:ship.fuel-route.fuelCost,docked:false,journey:j,revision:ship.revision+1};
    tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...j,shipId:ship.id,status:'IN_TRANSIT',actorUid:actor.uid});return audit({id:j.id,status:'IN_TRANSIT'},{id:eventId,kind:'SHIP_DEPARTED',at,actorUid:actor.uid,before:ship,after:next});
   }
   requireThat(action==='arriveShip'&&ship.journey,'VOYAGE_CLOSED');requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(time>=ship.journey.arrivesAtGameMs,'VOYAGE_NOT_READY');
   const j=ship.journey,next={...ship,docked:true,portId:j.toPort,journey:null,revision:ship.revision+1};
   tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...j,shipId:ship.id,status:'ARRIVED',closedAt:at,closedBy:actor.uid});return audit({id:j.id,status:'ARRIVED'},{id:eventId,kind:'SHIP_ARRIVED',at,actorUid:actor.uid,before:ship,after:next});
  });
 };
}
