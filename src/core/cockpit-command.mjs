import {createSoVoyageService} from './space-outlaws-voyages.mjs';
import {createSpaceCombatService} from './space-combat.mjs';
import {admissionKeys} from './admission-state.mjs';
import {randomInt} from 'node:crypto';
import {requireThat} from './validation.mjs';

const navigation=new Set(['finishSoPreparation','arriveShip']);
const ambush=new Set(['armSpaceAmbush','cancelSpaceAmbush']);
const combat=new Set(['submitSpaceOrder','resolveSpaceRound','consentSpacePeace','spaceBreakaway','spaceEscortInterpose','dropTowedWreck']);
// The station check and native command share one transaction: a concurrent
// revocation retries the whole command, without impersonating the pilot.
export function createCockpitCommandService(deps){
 return async(actor,input)=>{
  deps.signed(actor);admissionKeys(input,['sessionId','stationId','command','payload','requestId']);
  requireThat(navigation.has(input.command)||combat.has(input.command)||ambush.has(input.command),'COCKPIT_COMMAND');
  requireThat(input.payload&&typeof input.payload==='object'&&!Array.isArray(input.payload),'COCKPIT_COMMAND');
  const at=deps.now(),id=deps.uuid(),dice=[];
  return deps.store.runTransaction(async tx=>{
   const store={get:path=>tx.get(path),runTransaction:callback=>callback(tx)};
   let index=0;const stable={...deps,store,now:()=>at,uuid:()=>id,rollD6:()=>{const n=index++;return dice[n]??(dice[n]=deps.rollD6?deps.rollD6():randomInt(1,7));}};
   const voyage=createSoVoyageService(stable);
   const view=await voyage('cockpitStation',actor,{sessionId:input.sessionId,stationId:input.stationId});
   requireThat(input.payload.shipId===view.ship.shipId&&input.payload.sessionId===input.sessionId,'COCKPIT_COMMAND');
   if(combat.has(input.command))requireThat(input.payload.combatId===view.ship.combatId,'COCKPIT_COMMAND');
   const payload={...input.payload,requestId:input.requestId};
   if(input.command==='finishSoPreparation')payload.stationId=input.stationId;
   return navigation.has(input.command)?voyage(input.command,actor,payload):createSpaceCombatService(stable)(input.command,actor,payload);
  });
 };
}
