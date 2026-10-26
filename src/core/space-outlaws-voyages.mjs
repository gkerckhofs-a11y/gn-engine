import {transportDeparture} from './space-transport.mjs';
import {mediaFields} from './media-state.mjs';
import {publicJourney} from './navigation-state.mjs';
import {randomInt} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash,personalLot,publicLot,itemQuantity,lotState} from './inventory-state.mjs';
import {shipInput,seedShip,shipAccess,navigationView} from './navigation-state.mjs';
import {warehouseStock,stockVolume} from './storage-state.mjs';
import {gameTime} from './clock.mjs';
import {moneyText} from './economy-state.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,resolveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {hasSoNavigation,navigationSkill,soRoute,soShipProfile,soVoyageEvent} from './space-outlaws-navigation-state.mjs';

const admins=new Set(['spaceportAdmin','prepareSoShip','provisionSoShip','cancelSoNavigationAdmin','continueSoVoyage','arriveSoShipAdmin']);
const reads=new Set(['spaceportAdmin','mySpaceport','prepareSoShip','shipNavigation','prepareRefuel','prepareVoyage']);
const provisionFields=['shipId','modelId','name','ownerId','pilotId','homePort','fuelItemId','source','reason'];
const flightFields=['shipId','navigationCode','passengerCodes'];
const fields={spaceportAdmin:[],mySpaceport:[],prepareSoShip:provisionFields,provisionSoShip:[...provisionFields,'confirmation'],shipNavigation:['shipId'],prepareRefuel:['shipId','lotId','quantity'],refuelShip:['shipId','lotId','quantity','confirmation','present'],finishSoRefuel:['shipId','confirmation','present'],prepareVoyage:flightFields,departShip:[...flightFields,'confirmation','present'],finishSoPreparation:['shipId','confirmation','present'],cancelSoNavigation:['shipId','confirmation','reason'],cancelSoNavigationAdmin:['shipId','confirmation','reason'],arriveShip:['shipId','confirmation'],arriveSoShipAdmin:['shipId','confirmation','reason'],continueSoVoyage:['shipId','confirmation','reason']};
export const soVoyageCommands=Object.keys(fields);
const active=s=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const available=(s,c,time)=>c.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!(c.convalescentUntilGameMs>time);
const characterPort=(s,c)=>c.spacePortId??s.transportRules?.homePort;
const receipt=(s,ship,version)=>hash(JSON.stringify([s.id,s.revision,ship,version??null]));
export const safeSoShip=(s,ship,time)=>({...mediaFields(ship,['illustration']),...navigationView(s,ship,time),...(ship.journey?.suspended?{journey:{...publicJourney(ship.journey),remainingSeconds:Math.ceil(ship.journey.remainingMs/1000)}}:{}),maintenanceId:ship.maintenanceId??null,combatId:ship.combatId??null,rescueId:ship.rescueId??null,ambushId:ship.ambushId??null,revision:ship.revision,profile:ship.soProfile,ownerId:ship.ownerId,pilotId:ship.pilotId,hull:ship.hull,shield:ship.shield,revisionRequired:ship.revisionRequired,operation:ship.operation?{id:ship.operation.id,kind:ship.operation.kind,remainingSeconds:Math.max(0,Math.ceil((ship.operation.readyAtGameMs-time)/1000)),manifest:ship.operation.manifest?.map(m=>({id:m.id,name:m.name}))??[],route:ship.operation.route??null}:null});

// Canonical constraints on the native ships, voyages, inventory, PA and clocks.
// No second fleet, wallet, cargo engine or arbitrary route generator.
export function createSoVoyageService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 return async(action,actor,input)=>{
  signed(actor);requireThat(fields[action],'SO_GAMEPLAY_NOT_OPEN');admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);
  const at=now(),id=uuid(),dice=action==='finishSoPreparation'?[rollD6(),rollD6()]:null;
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasSoNavigation(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(s.stage!=='ARCHIVED','SESSION_CLOSED');
   if(action==='spaceportAdmin'||action==='mySpaceport'){
    const ships=(await tx.list(`${base}/ships`)).filter(x=>x.soProfile&&(admin||shipAccess(x,c.id,[]).access||(x.journey?.manifest??x.operation?.manifest??[]).some(m=>m.id===c.id)));
    return {session:{id:s.id,stage:s.stage,logisticsReady:s.spaceOutlaws.logisticsVersion===1,combatReady:s.spaceOutlaws.combatVersion===1},admin,ships:ships.map(x=>({...safeSoShip(s,x,time),confirmation:receipt(s,x,version)})),...(admin?{models:await tx.list(`${base}/shipModels`),ports:await tx.list(`${base}/ports`),items:(await tx.list(`${base}/items`)).filter(i=>i.consumable&&i.kind==='STACKABLE'&&!i.laserRecharge),characters:(await tx.list(`${base}/characters`)).filter(c=>c.birth).map(c=>({id:c.id,name:c.public.displayName})),homePort:s.transportRules?.homePort??null}:{} )};
   }
   let ship=input.shipId?await tx.get(`${base}/ships/${documentId(input.shipId)}`):null;
   const provisioning=['prepareSoShip','provisionSoShip'].includes(action);
   if(!provisioning){requireThat(ship?.soProfile,'CARGO_UNAVAILABLE');if(!admin)requireThat(shipAccess(ship,c.id,[]).access||action==='shipNavigation'&&(ship.journey?.manifest??ship.operation?.manifest??[]).some(m=>m.id===c.id),'FORBIDDEN');}
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version&&ship.pilotId===c.id,'FORBIDDEN');return old.result;}}
   const audit=(result,before,after,extra={})=>{authorizeSpaceOutlaws(tx,s,'NAVIGATION');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,...extra});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(provisioning){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
    const source=moneyText(input.source),reason=moneyText(input.reason),model=await tx.get(`${base}/shipModels/${documentId(input.modelId)}`),port=await tx.get(`${base}/ports/${documentId(input.homePort)}`),fuel=await tx.get(`${base}/items/${documentId(input.fuelItemId)}`);
    const owner=await inventoryParty(tx,s.id,documentId(input.ownerId)),pilot=await inventoryParty(tx,s.id,documentId(input.pilotId));requireThat(owner.active&&pilot.active,'INVALID_RECIPIENT');requireThat(navigationSkill(pilot.c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');
    requireThat(model?.versionId===s.versionId&&port?.versionId===s.versionId,'INVALID_SHIP');requireThat(fuel?.consumable&&fuel.kind==='STACKABLE'&&!fuel.laserRecharge,'INVALID_FUEL');
    requireThat(!s.transportRules||s.transportRules.homePort===port.id,'SHIP_NOT_LOCAL');
    const offers=[];for(const shop of await tx.list(`${base}/shops`))offers.push(...await tx.list(`${base}/shops/${shop.id}/offers`));requireThat(offers.some(o=>o.item.id===fuel.id&&o.unitPrice===25)&&offers.filter(o=>o.item.id===fuel.id).every(o=>o.unitPrice===25),'SO_FUEL_OFFER_REQUIRED');
    const profile=soShipProfile(model),intent=hash(JSON.stringify([input.shipId,model.id,input.name,owner.c.id,pilot.c.id,port.id,fuel.id,source,reason]));
    if(ship){requireThat(ship.provisionIntent===intent,'SHIP_EXISTS');return action==='provisionSoShip'?audit({id:ship.id},null,null):{exists:true,ship:safeSoShip(s,ship,time),confirmation:ship.provisionIntent};}
    const config=shipInput({name:input.name,description:model.description,capacity:profile.cargoCapacity,ownerType:'CHARACTER',ownerId:owner.c.id,docked:true,enabled:true,navigation:{fuelItemId:fuel.id,tankCapacity:profile.tankCapacity,initialFuel:0,initialPort:port.id}},documentId(input.shipId),{},true);
    const next={...seedShip(config),soProfile:profile,pilotId:pilot.c.id,hull:profile.hullMax,shield:profile.shieldMax,revisionRequired:false,operation:null,modules:[],transponder:config.id,provisionIntent:intent,versionId:s.versionId};
    const confirmation=hash(JSON.stringify([s.revision,next,owner.version,pilot.version,source,reason]));
    if(action==='prepareSoShip')return {ship:safeSoShip(s,next,time),ownerName:owner.c.public.displayName,pilotName:pilot.c.public.displayName,fuelName:fuel.name,source,reason,confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');if(!s.transportRules){authorizeSpaceOutlaws(tx,s,'NAVIGATION_CONFIG');tx.set(base,{...s,transportRules:{homePort:port.id},revision:s.revision+1});}
    tx.set(`${base}/ships/${next.id}`,next);return audit({id:next.id},null,next,{source,reason});
   }
   const confirmation=receipt(s,ship,version),isPilot=!admin&&ship.pilotId===c.id;
   const fuelAllowed=l=>personalLot(l,c?.id)&&l.status==='AVAILABLE'&&l.quantity>0&&l.item.id===ship.navigation.fuelItemId&&(l.transferable!==false||ship.ownerId===c.id);
   if(action==='shipNavigation')return {session:{id:s.id,stage:s.stage},spaceOutlaws:true,logisticsReady:s.spaceOutlaws.logisticsVersion===1,combatReady:s.spaceOutlaws.combatVersion===1,ship:safeSoShip(s,ship,time),canPilot:isPilot,canAct:isPilot&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&available(s,c,time),confirmation,lots:isPilot?(await tx.list(`${base}/inventory`)).filter(fuelAllowed).map(publicLot):[]};
   if(!admin)requireThat(isPilot,'FORBIDDEN');
   requireThat(!ship.combatId&&!ship.rescueId&&!ship.maintenanceId,'SPACE_SHIP_BUSY');
   const cancelling=['cancelSoNavigation','cancelSoNavigationAdmin'].includes(action);
   if(cancelling){requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');}else active(s);
   if(!admin&&!cancelling)requireThat(available(s,c,time),'OUT_OF_COMBAT');
   if(['finishSoRefuel','finishSoPreparation',...['cancelSoNavigation','cancelSoNavigationAdmin']].includes(action)){
    requireThat(input.confirmation===confirmation,'STALE_REVISION');const a=ship.operation;requireThat(a,'NAVIGATION_OPERATION_CLOSED');
    const pilot=await inventoryParty(tx,s.id,a.pilotId),members=[];for(const m of a.manifest??[])members.push(await inventoryParty(tx,s.id,m.id));
    const pilotCharacter=pilot.c;requireThat(pilotCharacter?.activeNavigationId===a.id,'NAVIGATION_OPERATION_CLOSED');
    if(!cancelling){requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(pilot.active&&pilot.version===a.pilotVersion,'INVALID_RECIPIENT');requireThat(time>=a.readyAtGameMs,'VOYAGE_NOT_READY');}
    const clear={...pilotCharacter,activeNavigationId:null};let next={...ship,operation:null,revision:ship.revision+1};
    if(a.kind==='REFUEL'){
     requireThat(cancelling||action==='finishSoRefuel','NAVIGATION_OPERATION_CLOSED');const lot=await tx.get(`${base}/inventory/${a.lotId}`);requireThat(lot?.status==='FIELD_RESERVED'&&lot.fieldActionId===a.id,'INVALID_FUEL');
     const quantity=lot.quantity-(cancelling?0:a.quantity);requireThat(quantity>=0,'INSUFFICIENT_STOCK');const nextLot={...lot,quantity,status:quantity?'AVAILABLE':'CONSUMED',fieldActionId:null,revision:lot.revision+1};
     if(!cancelling){requireThat(ship.docked&&!ship.journey&&characterPort(s,pilotCharacter)===ship.portId,'SHIP_NOT_LOCAL');next.fuel=whole(ship.fuel+a.quantity,'INVALID_FUEL');requireThat(next.fuel<=ship.navigation.tankCapacity,'TANK_FULL');}
     tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,at,kind:action,before:lotState(lot),after:lotState(nextLot)});tx.set(`${base}/characters/${pilotCharacter.id}`,clear);
    }else{
     requireThat(a.kind==='PREPARE'&&(cancelling||action==='finishSoPreparation'),'NAVIGATION_OPERATION_CLOSED');
     const points=actionPointState(s,pilotCharacter,await tx.get(actionPointPath(s.id,pilotCharacter.id)),at);
     if(!cancelling){requireThat(members.every((m,i)=>m.active&&m.version===a.manifest[i].version&&m.c.activeNavigationId===a.id&&!m.c.activeVoyageId&&available(s,m.c,time)),'INVALID_MANIFEST');requireThat(ship.hull>=1&&!ship.revisionRequired&&ship.fuel>=a.route.fuelCost,'SHIP_UNAVAILABLE');requireThat(navigationSkill(pilotCharacter,'PIL-02')>=a.level,'FIELD_SKILL_REQUIRED');}
     let j=null;
     if(!cancelling){const event=soVoyageEvent(a.route,...dice,ship.fuel-a.route.fuelCost),duration=a.route.durationSeconds+event.delaySeconds,suspended=event.needsMJ||event.fuelDebt>0;
      const transportManifest=await transportDeparture(tx,s,ship,a.route,id,at);
      j={...(transportManifest.length?{transportManifest}:{}),...a.route,routeId:a.route.id,id,manifest:a.manifest.map(m=>({id:m.id,name:m.name})),...(s.spaceOutlaws.missionExecutionVersion===1?{missionManifest:a.manifest.map(m=>({id:m.id,version:m.version}))}:{}),pilotId:a.pilotId,departedAt:at,departedAtGameMs:time,arrivesAtGameMs:time+duration*1000,event,suspended,remainingMs:suspended?duration*1000:null};
      next={...next,fuel:ship.fuel-a.route.fuelCost-event.fuelCost,docked:false,journey:j};tx.set(`${base}/voyages/${id}`,{...j,shipId:ship.id,status:suspended?'SUSPENDED':'IN_TRANSIT'});
     }
     for(const m of members){requireThat(m.c&&m.c.activeNavigationId===a.id,'INVALID_MANIFEST');tx.set(`${base}/characters/${m.c.id}`,{...m.c,activeNavigationId:null,...(j?{activeVoyageId:j.id}:{} )});}
     tx.set(actionPointPath(s.id,pilotCharacter.id),cancelling?releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,pilotCharacter)):resolveActionPoints(points,1));
    }
    tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,status:cancelling?'CANCELLED':next.journey?'DEPARTED':'REFUELED'},ship,next,cancelling?{reason:moneyText(input.reason)}:{});
   }
   if(['prepareRefuel','refuelShip'].includes(action)){
    requireThat(ship.docked&&!ship.journey&&!ship.operation&&characterPort(s,c)===ship.portId&&!c.activeNavigationId&&!c.activeVoyageId,'SHIP_NOT_LOCAL');
    const lot=await tx.get(`${base}/inventory/${documentId(input.lotId)}`);requireThat(lot&&fuelAllowed(lot),'INVALID_FUEL');const quantity=itemQuantity(lot.item,input.quantity);requireThat(quantity<=lot.quantity,'INSUFFICIENT_STOCK');requireThat(ship.fuel+quantity<=ship.navigation.tankCapacity,'TANK_FULL');
    const consent=hash(JSON.stringify([confirmation,lot,quantity])),result={shipName:ship.name,quantity,fuelName:lot.item.name,before:ship.fuel,after:ship.fuel+quantity,capacity:ship.navigation.tankCapacity,durationSeconds:120,confirmation:consent};
    if(action==='prepareRefuel')return result;requireThat(input.confirmation===consent,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const operation={id,kind:'REFUEL',pilotId:c.id,pilotVersion:version,lotId:lot.id,quantity,readyAtGameMs:time+120000},next={...ship,operation,revision:ship.revision+1};
    tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/inventory/${lot.id}`,{...lot,status:'FIELD_RESERVED',fieldActionId:id,revision:lot.revision+1});tx.set(`${base}/characters/${c.id}`,{...c,activeNavigationId:id});return audit({id:ship.id,status:'REFUELING'},ship,next);
   }
   if(['prepareVoyage','departShip'].includes(action)){
    requireThat(ship.docked&&ship.enabled&&!ship.journey&&!ship.operation&&ship.hull>=1&&!ship.revisionRequired,'SHIP_UNAVAILABLE');requireThat(characterPort(s,c)===ship.portId,'SHIP_NOT_LOCAL');
    const code=admissionText(input.navigationCode,80,true),routes=await tx.list(`${base}/routes`),ports=await tx.list(`${base}/ports`);
    const candidates=routes.filter(r=>r.fromPort===ship.portId&&(r.navigationCode===code||ports.find(p=>p.id===r.toPort)?.navigationCode===code));requireThat(candidates.length===1,'ROUTE_UNAVAILABLE');const route=soRoute(candidates[0],ship);
    const level=navigationSkill(c,'PIL-02');requireThat(level>=1&&level<=5,'FIELD_SKILL_REQUIRED');
    requireThat(Array.isArray(input.passengerCodes)&&input.passengerCodes.length<ship.soProfile.seats&&input.passengerCodes.every(x=>typeof x==='string'&&x.length<=128),'INVALID_MANIFEST');
    const characters=await tx.list(`${base}/characters`),ids=[c.id,...input.passengerCodes.map(code=>characters.find(x=>x.publicCode===code||x.id===code)?.id)];requireThat(ids.every(Boolean)&&new Set(ids).size===ids.length,'INVALID_MANIFEST');
    const manifest=[];for(const cid of ids){const p=await inventoryParty(tx,s.id,cid);requireThat(p.active&&!p.c.activeVoyageId&&!p.c.activeNavigationId&&!p.c.activeFieldActionId&&!p.c.activePersonActionId&&!p.c.activeAidId&&available(s,p.c,time)&&characterPort(s,p.c)===ship.portId,'INVALID_MANIFEST');manifest.push({id:cid,name:p.c.public.displayName,version:p.version,character:p.c});}
    requireThat(ship.fuel>=route.fuelCost,'INSUFFICIENT_FUEL');await transportDeparture(tx,s,ship,route,null,at);const stock=await warehouseStock(tx,s.id,ship.id,'HOLD');requireThat(stockVolume(stock)<=ship.capacity&&stock.every(l=>l.status==='AVAILABLE'||l.status==='SEIZED'),'CARGO_TRANSFERS_OPEN');requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    const points=actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at);requireThat(points.available>=1,'NOT_ENOUGH_ACTION_POINTS');
    const consent=hash(JSON.stringify([confirmation,manifest,route,stock,points])),durationSeconds=[0,180,150,120,90,60][level];
    if(action==='prepareVoyage')return {shipName:ship.name,route,manifest:manifest.map(m=>({id:m.id,name:m.name})),remainingFuel:ship.fuel-route.fuelCost,durationSeconds,cost:1,confirmation:consent};
    requireThat(input.confirmation===consent,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const operation={id,kind:'PREPARE',pilotId:c.id,pilotVersion:version,level,route,manifest:manifest.map(({character,...m})=>m),readyAtGameMs:time+durationSeconds*1000},next={...ship,operation,revision:ship.revision+1};
    for(const m of manifest)tx.set(`${base}/characters/${m.id}`,{...m.character,activeNavigationId:id});tx.set(actionPointPath(s.id,c.id),reserveActionPoints(points,1));tx.set(`${base}/ships/${ship.id}`,next);return audit({id:ship.id,status:'PREPARING'},ship,next);
   }
   requireThat(input.confirmation===confirmation,'STALE_REVISION');const j=ship.journey;requireThat(j,'VOYAGE_CLOSED');
   if(action==='continueSoVoyage'){
    requireThat(ship.hull>0&&j.suspended&&j.event.needsMJ&&j.event.fuelDebt===0,'VOYAGE_SUSPENDED');const reason=moneyText(input.reason),nextJourney={...j,suspended:false,remainingMs:null,arrivesAtGameMs:time+j.remainingMs,event:{...j.event,needsMJ:false,resolvedAt:at}};
    const next={...ship,journey:nextJourney,revision:ship.revision+1};tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...nextJourney,shipId:ship.id,status:'IN_TRANSIT'});return audit({id:ship.id},ship,next,{reason});
   }
   requireThat(['arriveShip','arriveSoShipAdmin'].includes(action)&&!j.suspended&&ship.hull>0,'VOYAGE_SUSPENDED');requireThat(time>=j.arrivesAtGameMs,'VOYAGE_NOT_READY');
   const members=[];for(const m of j.manifest){const ch=await tx.get(`${base}/characters/${m.id}`);requireThat(ch?.activeVoyageId===j.id,'INVALID_MANIFEST');members.push(ch);}
   if(ship.ambushId){const ambush=await tx.get(`${base}/spaceAmbushes/${ship.ambushId}`);requireThat(s.spaceOutlaws.combatVersion===1&&ambush?.journeyId===j.id,'SPACE_SHIP_BUSY');authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');tx.set(`${base}/spaceAmbushes/${ambush.id}`,{...ambush,status:'EXPIRED',closedAt:at});}
   for(const m of members)tx.set(`${base}/characters/${m.id}`,{...m,activeVoyageId:null,spacePortId:j.toPort});const next={...ship,docked:true,portId:j.toPort,journey:null,ambushId:null,revision:ship.revision+1};
   tx.set(`${base}/ships/${ship.id}`,next);tx.set(`${base}/voyages/${j.id}`,{...j,shipId:ship.id,status:'ARRIVED',closedAt:at});return audit({id:j.id,status:'ARRIVED'},ship,next,admin?{reason:moneyText(input.reason)}:{});
  });
 };
}
