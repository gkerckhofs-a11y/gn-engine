import {flightActivitiesSuite} from './support/flight-activities-suite.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {riskFaces,voyageEvent} from '../src/core/flight-hazards.mjs';
import {soRoute} from '../src/core/space-outlaws-navigation-state.mjs';
import {hazardHtml} from '../web/flight-activities.mjs';

test('Les neuf liaisons augmentent le risque avec la distance et gardent les effets de table',()=>{
 for(const [index,riskId] of ['SECURED','DANGEROUS','HOSTILE'].entries()){
  for(const [distance,distanceId] of ['SHORT','MEDIUM','LONG'].entries()){
   const route=soRoute({riskId,distanceId},{soProfile:{size:1}});
   assert.equal(riskFaces(route),1+index+distance);
   for(let die=1;die<=6;die++){
    const event=voyageEvent(route,[die,4,1,1],2,null,true);
    assert.equal(event.hazard?.kind,die<=1+index+distance?'ASTEROIDS':undefined);
   }
   assert.equal(voyageEvent(route,[1,6,2,4],2,null,true).hazard?.kind,'PIRATES');
   assert.equal(voyageEvent(route,[1,2,2,4],2,null,true).needsMJ,true);
   assert.equal(voyageEvent(route,[1,6,2,4],2,null,false).hazard,undefined);
  }
 }
});

test('Le radar donne priorité à une interception et réserve les commandes au pilote',()=>{
 const ship={shipId:'x',radar:{kind:'PIRATES',phase:'OVERRIDDEN'}},view={ship,session:{id:'s'},canAct:true};
 assert.doesNotMatch(hazardHtml(view,()=>'<button>action</button>'),/<button>/);
 ship.radar.phase='ACTIVE';ship.radar.wave=0;
 assert.doesNotMatch(hazardHtml({...view,canAct:false},()=>'<button>action</button>'),/<button>/);
 assert.match(hazardHtml(view,()=>'<button>action</button>'),/<button>/);
});

flightActivitiesSuite(()=>new MemoryStore());

test('Le cockpit et le serveur rejouent les quatre axes à 50 ms et testent le volume balayé',async()=>{
 const {asteroidRun,recordFlight,replayFlight,FLIGHT_TICKS}=await import('../src/shared/starfighter-asteroids.mjs');
 const straight=replayFlight(997,[FLIGHT_TICKS,0,0,0,0,-1]);
 assert.equal(straight.hit,true);
 const flight=asteroidRun(997);
 for(let i=0;i<FLIGHT_TICKS;i++)recordFlight(flight,i<27?{pitch:.45,roll:.1,throttle:.25}:{targetSpeed:86});
 const replay=replayFlight(997,flight.trace);
 assert.equal(flight.hit,false);assert.equal(replay.hit,flight.hit);
 assert.deepEqual(replay.ship,flight.ship);assert.notEqual(flight.ship.bank,0);assert.notEqual(flight.ship.y,0);assert.equal(flight.ship.speed,86);
 for(const trace of [[],[301,0,0,0,0,-1],[299,0,0,0,0,-1],[300,101,0,0,0,-1],[300,0,0,0,0,121]])assert.equal(replayFlight(997,trace),null);
});
