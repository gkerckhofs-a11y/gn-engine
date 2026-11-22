import test from 'node:test';
import assert from 'node:assert/strict';
import {allianceDuelFixture} from './space-alliance-duels-suite.mjs';

export function starfighterFleetSuite(makeStore){
test('Quatre postes simultanés : même rencontre native, identité et deux cibles propres à chaque équipage',async()=>{
 const f=await allianceDuelFixture(makeStore,{intercept:false});
 await f.cmd('configureStarfighter',{stationCount:4,combat:true,revision:0},f.owner);
 const pilots=[[f.player,'ship'],[f.other,'escort'],[f.pirate,'pirate'],[f.support,'pirate_second']];
 for(const [actor,id] of pilots){
  await f.edit('ships/'+id,s=>({...s,cockpit:{status:'ASSIGNED',starfighter:true,pilotId:s.pilotId,operationId:id,stationId:id}}));
  await f.edit('cockpitStations/'+id,()=>({id,shipId:id,operationId:id}));
 }
 const d=await f.read('cockpitStation',{stationId:'ship'});
 await f.cmd('cockpitCommand',{stationId:'ship',command:'starfighterPulse',payload:{sessionId:f.sid,shipId:'ship',confirmation:d.confirmation}});
 const projections=await Promise.all(pilots.map(async([actor,id])=>{
  const view=await f.read('cockpitStation',{stationId:id},actor);
  const c=(await f.read('spaceCombat',{combatId:view.ship.combatId},actor)).combat;
  assert.equal(c.ownShipId,id);assert.equal(c.targets.length,2);
  assert.equal(c.ownOrder,null);assert.equal(c.negotiationSeconds,90);
  assert.doesNotMatch(JSON.stringify(c),/candidateIds|missionManifest|pilotVersion/);
  return c.id;
 }));
 assert.equal(new Set(projections).size,1);
});
}
