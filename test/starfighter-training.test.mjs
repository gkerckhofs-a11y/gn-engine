import test from 'node:test';
import assert from 'node:assert/strict';
import {training,itinerary,advance,refuel} from '../web/cockpit/flight.mjs';
test('Deux escales exigent trois préparations, trois départs et trois amarrages',()=>{
 let s={...training(),economy:true};
 assert.equal(itinerary(0,3,true).length,3);
 for(let port=1;port<=3;port++){
  for(const phase of ['ready','launch','hyperspace','contact','combat','approach','map']){
   s=advance(s);assert.equal(s.phase,phase);
  }
  assert.equal(s.port,port);
 }
 assert.equal(s.fuel,4);assert.equal(advance(s),s);
});
test('Trajet rapide et réserve de départ distincte du coût',()=>{
 const s=training(6);assert.equal(itinerary(0,3,false).length,1);assert.equal(advance(s),s);
 const full=refuel(s);assert.equal(full.stock[0],3);assert.equal(advance(advance(full)).fuel,1);
 assert.equal(refuel({...s,stock:[0,0,0,0]}).fuel,6);
});
