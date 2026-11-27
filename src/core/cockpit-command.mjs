import {createGalacticMapService} from './galactic-map.mjs';
import {createSoVoyageService} from './space-outlaws-voyages.mjs';
import {createSpaceCombatService} from './space-combat.mjs';
import {admissionKeys} from './admission-state.mjs';
import {randomInt} from 'node:crypto';
import {requireThat} from './validation.mjs';

const flight=new Set(['starfighterFrame','starfighterSignal']);
const navigation=new Set(['rollFlightRisk','steerFlightHazard','finishSoPreparation','arriveShip']);
const planning=new Set(['galacticMap','prepareVoyage','departShip']);
const ambush=new Set(['armSpaceAmbush','cancelSpaceAmbush']);
const combat=new Set(['submitSpaceOrder','resolveSpaceRound','consentSpacePeace','spaceBreakaway','spaceEscortInterpose','dropTowedWreck']);
// The station check and native command share one transaction: a concurrent
// revocation retries the whole command, without impersonating the pilot.
export function createCockpitCommandService(deps){
 return async(actor,input)=>{
  deps.signed(actor);admissionKeys(input,['sessionId','stationId','command','payload','requestId']);
  requireThat(flight.has(input.command)||navigation.has(input.command)||planning.has(input.command)||input.command==='starfighterPulse'||combat.has(input.command)||ambush.has(input.command),'COCKPIT_COMMAND');
  requireThat(input.payload&&typeof input.payload==='object'&&!Array.isArray(input.payload),'COCKPIT_COMMAND');
  const at=deps.now(),id=deps.uuid(),dice=[],ambushChoices=new Map();
  const chooseAmbush=(key,size)=>{if(!ambushChoices.has(key))ambushChoices.set(key,randomInt(size));return ambushChoices.get(key);};
  return deps.store.runTransaction(async tx=>{
   const store={get:path=>tx.get(path),runTransaction:callback=>callback(tx)};
   let index=0;const stable={...deps,store,chooseAmbush,now:()=>at,uuid:()=>id,rollD6:()=>{const n=index++;return dice[n]??(dice[n]=deps.rollD6?deps.rollD6():randomInt(1,7));}};
   if(flight.has(input.command)){
    requireThat(input.sessionId===input.payload.sessionId,'COCKPIT_COMMAND');
    return createSpaceCombatService(stable)(input.command,actor,{...input.payload,stationId:input.stationId},true);
   }
   const voyage=createSoVoyageService(stable);
   const view=await voyage('cockpitStation',actor,{sessionId:input.sessionId,stationId:input.stationId});
   requireThat(input.payload.shipId===view.ship.shipId&&input.payload.sessionId===input.sessionId,'COCKPIT_COMMAND');
   if(input.command==='starfighterPulse'){
    admissionKeys(input.payload,['sessionId','shipId','confirmation','combatId','roundConfirmation']);
    requireThat(view.starfighter?.combat&&view.canAct&&input.payload.confirmation===view.confirmation,'COCKPIT_COMMAND');
    const service=createSpaceCombatService(stable);
    const payload={sessionId:input.sessionId,shipId:view.ship.shipId,requestId:input.requestId};
    if(view.ship.combatId){
     requireThat(input.payload.combatId===view.ship.combatId,'COCKPIT_COMMAND');
     const d=(await service('spaceCombat',actor,{sessionId:input.sessionId,combatId:view.ship.combatId})).combat;
     requireThat(d.ownShipId===view.ship.shipId&&d.canOrder&&input.payload.roundConfirmation===d.confirmation,'STALE_REVISION');
     const round={...payload,combatId:d.id,confirmation:d.confirmation};
     if(d.status==='ENCOUNTER'&&d.negotiationSeconds===0)return service('startSpaceCombat',actor,{...round,reason:'Fin de la négociation automatique',briefed:true},true);
     if(d.status==='ROUND'&&d.remainingSeconds===0)return service('resolveSpaceRound',actor,round);
     return {status:'WAIT'};
    }
    const j=view.ship.journey;
    requireThat(!input.payload.combatId&&j&&!j.suspended&&!j.intercepted&&!j.interceptionCovered&&j.remainingSeconds>0,'COCKPIT_COMMAND');
    return service('triggerSpaceInterception',actor,{...payload,reason:'Interception automatique sur une liaison admissible'},true);
   }
   if(planning.has(input.command)){
    requireThat(view.starfighter?.navigation,'COCKPIT_COMMAND');
    const {payload}=input;
    if(input.command==='galacticMap'){
     const map=await createGalacticMapService(stable)('galacticMap',actor,payload);
     return {ports:map.ports,routes:map.routes,origin:map.origin,destinationId:map.destinationId,itineraries:map.itineraries,shipId:map.shipId};
    }
    requireThat(view.canAct && !view.ship.operation && !view.ship.journey,'SHIP_UNAVAILABLE');
    return input.command==='prepareVoyage'?voyage('prepareVoyage',actor,payload):voyage('departShip',actor,{...payload,cockpit:true,requestId:input.requestId});
   }
   if(combat.has(input.command))requireThat(input.payload.combatId===view.ship.combatId,'COCKPIT_COMMAND');
   const payload={...input.payload,requestId:input.requestId};
   if(input.command==='finishSoPreparation')payload.stationId=input.stationId;
   return navigation.has(input.command)?voyage(input.command,actor,payload):createSpaceCombatService(stable)(input.command,actor,payload);
  });
 };
}
