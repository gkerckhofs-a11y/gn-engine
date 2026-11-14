import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {navigationSkill,hasSoNavigation,soRoute} from './space-outlaws-navigation-state.mjs';
import {flightShip} from './space-module-flight.mjs';
import {towingFlightContext,towingRoute} from './space-towing-flight.mjs';
import {routeFuelRequired} from './space-outlaws-voyages.mjs';
import {shipCrewAccess,nativeShipReader,shipPilot} from './ship-crew-state.mjs';
import {gameTime} from './clock.mjs';
import {spaceDistances,spaceRisks} from '../shared/space-outlaws-navigation.mjs';
import {mapItineraries} from './galactic-map-planning.mjs';

export const galacticMapCommands=['galacticMap','galacticMapAdmin'];
export function knownMapNetwork(ports,routes,portIds,analyzed,codes){
 const known=new Set(portIds),byRoute=new Map(),accepted=new Set();
 for(const [id] of analyzed){const r=routes.find(r=>r.id===id);if(r){known.add(r.fromPort);known.add(r.toPort);byRoute.set(r.id,{route:r,code:null,analyzed:true});}}
 // A supplied destination code identifies that destination, not every incoming
 // secret origin. A supplied route code identifies only an unambiguous route.
 for(const code of codes){
  const ps=ports.filter(p=>p.navigationCode===code),rs=routes.filter(r=>r.navigationCode===code);
  if(ps.length===1){known.add(ps[0].id);accepted.add(code);}
  if(rs.length===1){const r=rs[0],matches=routes.filter(x=>x.fromPort===r.fromPort&&(x.navigationCode===code||ports.find(p=>p.id===x.toPort)?.navigationCode===code));if(matches.length===1){known.add(r.fromPort);known.add(r.toPort);accepted.add(code);}}
 }
 for(const from of known)for(const code of accepted){
  const candidates=routes.filter(r=>r.fromPort===from&&(r.navigationCode===code||ports.find(p=>p.id===r.toPort)?.navigationCode===code));
  if(candidates.length===1&&known.has(candidates[0].toPort)){const r=candidates[0];byRoute.set(r.id,{route:r,code,analyzed:analyzed.has(r.id)});}
 }
 return {ports:ports.filter(p=>known.has(p.id)),routes:[...byRoute.values()],unavailableCodes:codes.filter(c=>!accepted.has(c))};
}
export function createGalacticMapService({store,signed,checkSession,now}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId','shipId','codes','destinationId']);const admin=action==='galacticMapAdmin';
  const codes=input.codes??[];requireThat(Array.isArray(codes)&&codes.length<=20&&codes.every(c=>typeof c==='string'&&c.trim()&&c.length<=80),'INVALID_MAP_CODES');
  return store.runTransaction(async tx=>{
   const ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c}=ctx,base=`sessions/${s.id}`,at=now(),time=gameTime(s.clock,at);
   requireThat(hasSoNavigation(s)&&s.stage!=='ARCHIVED','SO_GAMEPLAY_NOT_OPEN');
   const level=admin?5:navigationSkill(c,'PIL-01'),canNavigate=admin||level>=1;requireThat(!codes.length||canNavigate,'MAP_SKILL_REQUIRED');
   const allPorts=(await tx.list(`${base}/ports`)).filter(p=>p.versionId===s.versionId),allRoutes=(await tx.list(`${base}/routes`)).filter(r=>r.versionId===s.versionId&&allPorts.some(p=>p.id===r.fromPort)&&allPorts.some(p=>p.id===r.toPort));
   const ownPort=admin?null:c.spacePortId??s.transportRules?.homePort,ships=[];let chosen=null,chosenNative=null;
   for(const raw of await tx.list(`${base}/ships`)){
    if(!raw.soProfile)continue;
    const crew=admin?null:await shipCrewAccess(tx,s,raw,c,at),native=admin?null:await nativeShipReader(tx,s,raw,c,at);
    if(!admin&&!crew.active&&!crew.departing&&!native.read)continue;
    const ship=flightShip(s,raw,time);ships.push({id:ship.id,name:ship.name,profile:ship.soProfile.label,portId:ship.portId,fuel:ship.fuel,tankCapacity:ship.navigation?.tankCapacity??0});
    if(raw.id===input.shipId){chosen=ship;chosenNative=native;}
   }
   if(input.shipId)requireThat(chosen,'FORBIDDEN');
   if(!input.shipId&&ships.length){chosen=flightShip(s,await tx.get(`${base}/ships/${ships[0].id}`),time);chosenNative=admin?null:await nativeShipReader(tx,s,chosen,c,at);}
   const origin=chosen?.portId??ownPort,analyzed=new Map();
   if(canNavigate&&!admin)for(const a of await tx.list(`${base}/fieldActions`,['characterId',c.id])){
    const b=a.routeAnalysis,r=b&&allRoutes.find(r=>r.id===b.routeId);
    if(r&&['SUCCEEDED','FAILED'].includes(a.status)&&a.profile?.skillId==='PIL-01'&&b.versionId===s.versionId&&b.revision===r.revision)analyzed.set(r.id,Math.max(analyzed.get(r.id)??0,Math.min(level,a.level)));
   }
   const publicPorts=(await tx.list(`${base}/planetMarkets`)).filter(m=>m.enabled).map(m=>m.portId);
   const network=admin?{ports:allPorts,routes:allRoutes.map(route=>({route,code:null,analyzed:true})),unavailableCodes:[]}:knownMapNetwork(allPorts,allRoutes,[...publicPorts,ownPort,origin].filter(Boolean),canNavigate?analyzed:new Map(),[...new Set(codes.map(c=>c.trim()))]);
   const tow=chosen?await towingFlightContext(tx,s,chosen,'shipNavigation',time):null,rows=[];
   for(const x of network.routes){
    const r=x.route;let quote=null,blocked=null;
    if(chosen)try{quote=towingRoute(soRoute(r,chosen),tow,s);}catch(e){if(e.code!=='TOWING_ROUTE_NOT_OPEN')throw e;blocked='Ce trajet n’est pas autorisé pour cet attelage.';}
    const cost=quote?.fuelCost??null,minimumDepartureFuel=quote?routeFuelRequired(chosen,quote):null,available=!!quote&&minimumDepartureFuel<=chosen.navigation.tankCapacity&&(chosen.ownerType!=='GROUP'||r.riskId==='SECURED')&&chosen.towingAttachment?.role!=='WRECK';
    const riskKnown=admin||(analyzed.get(r.id)??0)>=3;
    rows.push({id:r.id,name:r.name,fromPort:r.fromPort,toPort:r.toPort,distance:spaceDistances.find(d=>d.id===r.distanceId)?.label??'À vérifier',durationSeconds:quote?.durationSeconds??spaceDistances.find(d=>d.id===r.distanceId)?.durationSeconds??null,fuelCost:cost,minimumDepartureFuel,available,blocked:blocked??(chosen&&minimumDepartureFuel>chosen.navigation.tankCapacity?'Ce tronçon dépasse la capacité du réservoir.':chosen?.ownerType==='GROUP'&&r.riskId!=='SECURED'?'Le pilotage collectif actuel exige une liaison sécurisée.':null),risk:riskKnown?spaceRisks.find(v=>v.id===r.riskId)?.label??null:null,analysisAvailable:!admin&&level>0&&s.spaceOutlaws.routeAnalysisVersion===1&&!!r.analysisTargetId,...(x.code?{navigationCode:x.code}:{})});
   }
   const ports=network.ports.map(p=>({id:p.id,name:p.name,current:p.id===origin,market:publicPorts.includes(p.id)})),destinationId=input.destinationId==null?null:documentId(input.destinationId);
   requireThat(!destinationId||ports.some(p=>p.id===destinationId),'MAP_DESTINATION_UNAVAILABLE');
   return {session:{id:s.id,stage:s.stage},admin,canNavigate,ships,shipId:chosen?.id??null,origin:origin??null,destinationId,ports,routes:rows,unavailableCodes:network.unavailableCodes,canOpenFlight:!admin&&!!chosenNative?.read&&chosenNative.pilot&&shipPilot(chosen)===c.id&&!chosenNative.continuation&&navigationSkill(c,'PIL-02')>=1,canAnalyze:!admin&&level>0&&s.spaceOutlaws.routeAnalysisVersion===1,itineraries:mapItineraries(rows,origin,destinationId,chosen?{fuel:chosen.fuel,tankCapacity:chosen.navigation.tankCapacity}:null),operation:chosen?.journey?'Voyage en cours : les commandes restent dans le cockpit et le suivi de vol.':chosen?.operation?'Préparation ou intervention en cours : ses engagements sont conservés.':chosen?.towingAttachment?.role==='WRECK'?'Épave remorquée : consultez le remorqueur pour préparer un trajet.':s.safetyStop?.active?'STOP SÉCURITÉ : consultation uniquement.':s.stage!=='EN_JEU'?'Consultation et simulation uniquement pendant cette phase.':null};
  });
 };
}
