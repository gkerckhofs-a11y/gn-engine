import {resumeSpaceJourney} from './space-combat-state.mjs';
import {requireThat,documentId} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {navigationSkill,soRoute,soVoyageEvent} from './space-outlaws-navigation-state.mjs';
import {actionPointPath,actionPointState,resolveActionPoints} from './action-point-state.mjs';
import {transportDeparture} from './space-transport.mjs';
import {gameTime} from './clock.mjs';

export const hasSoConvoy=s=>s.spaceOutlaws?.convoyVersion===1;
export const convoyFields={prepareSoConvoy:['shipId','escortShipId','navigationCode'],proposeSoConvoy:['shipId','escortShipId','navigationCode','confirmation'],acceptSoConvoy:['shipId','leaderShipId','confirmation'],leaveSoConvoy:['shipId','confirmation','reason'],leaveSoConvoyAdmin:['shipId','confirmation','reason']};
const idle=x=>x?.soProfile&&x.enabled&&x.docked&&!x.journey&&!x.operation&&!x.combatId&&!x.rescueId&&!x.maintenanceId&&x.hull>0&&!x.revisionRequired;
const publicOffer=(x,confirmation)=>({id:x.id,leaderShipId:x.leaderShipId,escortShipId:x.escortShipId,leaderName:x.leaderName,escortName:x.escortName,routeName:x.routeName,fromPort:x.fromPort,toPort:x.toPort,confirmation});
export async function convoyInvitations(tx,s,c){
 if(!hasSoConvoy(s)||!c)return [];
 const all=await tx.list(`sessions/${s.id}/ships`),out=[];
 for(const leader of all){const o=leader.convoyOffer;if(!o||o.escortPilotId!==c.id)continue;const escort=all.find(x=>x.id===o.escortShipId);if(escort?.pilotId===c.id)out.push(publicOffer(o,hash(JSON.stringify([s.revision,leader,escort]))));}
 return out;
}
export async function convoyCommand(tx,s,ship,c,version,input,action,id,at){
 requireThat(hasSoConvoy(s),'SO_GAMEPLAY_NOT_OPEN');const base=`sessions/${s.id}`,time=gameTime(s.clock,at);
 if(action.startsWith('leaveSoConvoy')){
  const g=ship.convoy;
  if(!g){requireThat(ship.convoyOffer,'SO_CONVOY_CLOSED');requireThat(!ship.operation&&!ship.journey,'SPACE_SHIP_BUSY');tx.set(`${base}/ships/${ship.id}`,{...ship,convoyOffer:null,revision:ship.revision+1});return {id:ship.id,status:'CANCELLED'};}
  const rows=[];for(const sid of g.shipIds)rows.push(await tx.get(`${base}/ships/${sid}`));
  requireThat(rows.every(x=>x?.convoy?.id===g.id&&!x.operation&&!x.combatId&&!x.rescueId&&!x.maintenanceId),'SPACE_SHIP_BUSY');
  // A separation preserves the event, current remaining travel and interception receipt.
  for(const x of rows){const released=x.journey?.suspended?resumeSpaceJourney({...x,convoy:null},time):x;const j=released.journey?{...released.journey,convoySeparated:true}:null;tx.set(`${base}/ships/${x.id}`,{...released,convoy:null,...(j?{journey:j}:{}),revision:x.revision+1});if(j)tx.set(`${base}/voyages/${j.id}`,{...j,shipId:x.id,status:j.suspended?'SUSPENDED':'IN_TRANSIT'});}
  return {id:g.id,status:'SEPARATED'};
 }
 if(action==='acceptSoConvoy'){
  const leader=await tx.get(`${base}/ships/${documentId(input.leaderShipId)}`),o=leader?.convoyOffer,p=o?await inventoryParty(tx,s.id,o.leaderPilotId):null;
  requireThat(o&&o.escortShipId===ship.id&&o.escortPilotId===c.id&&p?.active&&p.version===o.leaderPilotVersion&&leader.pilotId===o.leaderPilotId,'SO_CONVOY_CLOSED');
  requireThat(idle(leader)&&idle(ship)&&!leader.convoy&&!ship.convoy&&!ship.convoyOffer&&leader.portId===ship.portId,'SPACE_SHIP_BUSY');
  requireThat(input.confirmation===hash(JSON.stringify([s.revision,leader,ship])),'STALE_REVISION');
  const route=await tx.get(`${base}/routes/${o.routeId}`);requireThat(route?.revision===o.routeRevision,'STALE_REVISION');
  const g={id:o.id,leaderShipId:leader.id,shipIds:[leader.id,ship.id],shipNames:[leader.name,ship.name],routeId:o.routeId,routeName:o.routeName,fromPort:o.fromPort,toPort:o.toPort,navigationCode:o.navigationCode,pilots:[{id:p.c.id,version:p.version},{id:c.id,version}],createdAt:at};
  for(const x of [leader,ship])tx.set(`${base}/ships/${x.id}`,{...x,convoy:g,convoyOffer:null,revision:x.revision+1});return {id:g.id,status:'FORMED'};
 }
 requireThat(idle(ship)&&ship.capacity>0&&!ship.convoy&&!ship.convoyOffer,'SPACE_SHIP_BUSY');
 const escort=await tx.get(`${base}/ships/${documentId(input.escortShipId)}`);requireThat(idle(escort)&&escort.id!==ship.id&&escort.pilotId!==c.id&&!escort.convoy&&!escort.convoyOffer&&escort.portId===ship.portId,'SO_CONVOY_UNAVAILABLE');
 const p=await inventoryParty(tx,s.id,escort.pilotId);requireThat(p.active&&navigationSkill(p.c,'PIL-02')>=1,'SO_CONVOY_UNAVAILABLE');
 const code=input.navigationCode;requireThat(typeof code==='string'&&code.length>0&&code.length<=80,'ROUTE_UNAVAILABLE');
 const ports=await tx.list(`${base}/ports`),routes=(await tx.list(`${base}/routes`)).filter(r=>r.fromPort===ship.portId&&(r.navigationCode===code||ports.find(p=>p.id===r.toPort)?.navigationCode===code));requireThat(routes.length===1,'ROUTE_UNAVAILABLE');const route=routes[0];soRoute(route,ship);soRoute(route,escort);
 const confirmation=hash(JSON.stringify([s.revision,ship,escort,route,version,p.version])),o={id,leaderShipId:ship.id,escortShipId:escort.id,leaderName:ship.name,escortName:escort.name,leaderPilotId:c.id,leaderPilotVersion:version,escortPilotId:escort.pilotId,routeId:route.id,routeRevision:route.revision,routeName:route.name,fromPort:route.fromPort,toPort:route.toPort,navigationCode:code,createdAt:at};
 if(action==='prepareSoConvoy')return publicOffer(o,confirmation);
 requireThat(input.confirmation===confirmation,'STALE_REVISION');tx.set(`${base}/ships/${ship.id}`,{...ship,convoyOffer:o,revision:ship.revision+1});return {id,status:'INVITED'};
}
export async function convoyFleet(tx,s,ship){
 const g=ship.convoy;if(!g)return [ship];requireThat(hasSoConvoy(s),'SO_GAMEPLAY_NOT_OPEN');const rows=[];
 for(const sid of g.shipIds){const x=sid===ship.id?ship:await tx.get(`sessions/${s.id}/ships/${sid}`);requireThat(x?.convoy?.id===g.id,'SO_CONVOY_CLOSED');rows.push(x);}return rows;
}
export async function finishConvoy(tx,s,ship,at,id,dice,available){
 const base=`sessions/${s.id}`,time=gameTime(s.clock,at),rows=await convoyFleet(tx,s,ship),g=ship.convoy;
 requireThat(rows.length===2&&ship.operation?.kind==='PREPARE'&&ship.operation.convoyId===g.id,'SO_CONVOY_CLOSED');
 const own=ship.operation;requireThat(time>=own.readyAtGameMs,'VOYAGE_NOT_READY');
 if(!rows.every(x=>x.id===ship.id||x.operation?.convoyReady===true)){
  tx.set(`${base}/ships/${ship.id}`,{...ship,operation:{...own,convoyReady:true},revision:ship.revision+1});return {id:ship.id,status:'WAITING_CONVOY'};
 }
 const passengers=new Set(),all=[];
 for(const x of rows){const a=x.operation;requireThat(a?.kind==='PREPARE'&&a.convoyId===g.id&&a.route.id===g.routeId&&time>=a.readyAtGameMs&&x.hull>0&&!x.revisionRequired&&x.fuel>=a.route.fuelCost&&!x.combatId&&!x.rescueId&&!x.maintenanceId,'SO_CONVOY_NOT_READY');
  const manifest=[];for(const m of a.manifest){const p=await inventoryParty(tx,s.id,m.id);requireThat(p.active&&p.version===m.version&&p.c.activeNavigationId===a.id&&!p.c.activeVoyageId&&available(s,p.c,time)&&!passengers.has(m.id),'INVALID_MANIFEST');passengers.add(m.id);manifest.push(p.c);}
  const pilot=manifest.find(c=>c.id===a.pilotId);requireThat(x.pilotId===a.pilotId&&pilot&&navigationSkill(pilot,'PIL-02')>=a.level&&g.pilots.some(p=>p.id===a.pilotId&&p.version===a.pilotVersion),'INVALID_MANIFEST');
  const points=actionPointState(s,pilot,await tx.get(actionPointPath(s.id,pilot.id)),at),transportManifest=await transportDeparture(tx,s,x,a.route,`${id}_${all.length}`,at);all.push({x,a,manifest,pilot,points,transportManifest});
 }
 const selected=(dice[2]-1)%2,chosen=all[selected],event=soVoyageEvent(chosen.a.route,dice[0],dice[1],chosen.x.fuel-chosen.a.route.fuelCost),suspended=event.needsMJ||event.fuelDebt>0,duration=chosen.a.route.durationSeconds+event.delaySeconds;
 for(let i=0;i<all.length;i++){const {x,a,manifest,pilot,points,transportManifest}=all[i],jid=`${id}_${i}`,e={...event,fuelCost:i===selected?event.fuelCost:0,fuelDebt:i===selected?event.fuelDebt:0,affectedShipId:chosen.x.id,selectionRoll:dice[2]},j={...a.route,id:jid,routeId:a.route.id,convoyId:g.id,convoyShipIds:g.shipIds,convoyLeaderId:g.leaderShipId,manifest:a.manifest.map(({id,name})=>({id,name})),missionManifest:a.manifest.map(({id,version})=>({id,version})),...(transportManifest.length?{transportManifest}:{}),pilotId:a.pilotId,departedAt:at,departedAtGameMs:time,arrivesAtGameMs:time+duration*1000,event:e,suspended,remainingMs:suspended?duration*1000:null};
  tx.set(`${base}/ships/${x.id}`,{...x,operation:null,docked:false,fuel:x.fuel-a.route.fuelCost-e.fuelCost,journey:j,revision:x.revision+1});tx.set(`${base}/voyages/${jid}`,{...j,shipId:x.id,status:suspended?'SUSPENDED':'IN_TRANSIT'});tx.set(actionPointPath(s.id,pilot.id),resolveActionPoints(points,1));for(const m of manifest)tx.set(`${base}/characters/${m.id}`,{...m,activeNavigationId:null,activeVoyageId:jid});
 }
 return {id:g.id,status:'DEPARTED'};
}
