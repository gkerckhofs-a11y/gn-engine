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
