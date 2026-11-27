import test from 'node:test';
import assert from 'node:assert/strict';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {convoyFixture} from './space-convoy-suite.mjs';
import {trainingHtml,hazardHtml} from '../../web/flight-activities.mjs';
import {terminalItems} from '../../web/player-terminal.mjs';

const enable=(f,settings={})=>f.cmd('configureStarfighter',{revision:0,stationCount:0,combat:false,flightRisks:true,...settings},f.owner);
async function command(f,action,patch={},actor=f.player,shipId='ship'){
 const {confirmation}=await f.navigation(shipId,actor);
 return f.cmd(action,{shipId,confirmation,...patch},actor);
}

export function flightActivitiesSuite(makeStore){
test('Poste affecté, jet avant départ, reprise après annulation, collision, esquive et pause',async()=>{
 const f=await soVoyagesFixture(makeStore);
 await enable(f,{stationCount:1});await f.refuel(4);await f.startFlight();
 const station=()=>f.read('cockpitStation',{stationId:'cockpit-1'});
 async function cockpit(command,fields={}){
  const view=await station();
  return f.cmd('cockpitCommand',{stationId:'cockpit-1',command,payload:{sessionId:f.sid,shipId:'ship',confirmation:view.confirmation,...fields}});
 }
 f.advance(180000);
 await assert.rejects(cockpit('finishSoPreparation',{present:true}),{code:'FLIGHT_ROLL_REQUIRED'});
 f.setDie(1);const die=await cockpit('rollFlightRisk');assert.equal(die.roll,1);
 await command(f,'cancelSoNavigation',{reason:'Replanification'});
 f.setDie(6);await f.startFlight();assert.equal((await station()).ship.operation.risk.roll,1);
 await assert.rejects(f.cmd('rollFlightRisk',{shipId:'ship',confirmation:(await station()).confirmation},f.other),{code:'FORBIDDEN'});
 f.advance(180000);f.setDice([6,4,1,1]);await cockpit('finishSoPreparation',{present:true});
 const j=(await f.ship()).journey;
 assert.equal(j.event.roll,1);assert.equal(j.event.hazard.kind,'ASTEROIDS');assert.equal(j.event.delaySeconds,180);
 await assert.rejects(cockpit('steerFlightHazard',{wave:0,choice:'PORT'}),{code:'FLIGHT_WINDOW_CLOSED'});
 f.advance(30000);let radar=(await station()).ship.radar;
 assert.equal(radar.phase,'ACTIVE');
 await assert.rejects(cockpit('steerFlightHazard',{wave:0,trace:[27,0,45,0,0,-1,273,0,0,0,0,-1]}),{code:'FLIGHT_WINDOW_CLOSED'});
 f.advance(15000);
 await assert.rejects(cockpit('steerFlightHazard',{wave:0,choice:'PORT'}),{code:'INVALID_INPUT'});
 const first={sessionId:f.sid,shipId:'ship',wave:0,trace:[27,0,45,0,0,-1,273,0,0,0,0,-1],confirmation:(await station()).confirmation};
 const packet={stationId:'cockpit-1',command:'steerFlightHazard',requestId:'same-maneuver',payload:first};
 await f.cmd('cockpitCommand',packet);await f.cmd('cockpitCommand',packet);
 assert.equal((await f.ship()).journey.event.delaySeconds,120);
 await assert.rejects(cockpit('steerFlightHazard',{wave:0,choice:'PORT'}),{code:'FLIGHT_WINDOW_CLOSED'});
 f.advance(20000);await f.stage('PAUSE');f.advance(600000);
 radar=(await station()).ship.radar;assert.equal(radar.wave,1);
 await assert.rejects(cockpit('steerFlightHazard',{wave:1,choice:radar.clearLane}),{code:'SESSION_NOT_RUNNING'});
 await f.stage('EN_JEU');await cockpit('steerFlightHazard',{wave:1,trace:[300,0,0,0,0,-1]});
 assert.match((await station()).ship.radar.lastResult,/Collision/);
 f.advance(40000);assert.equal((await station()).ship.radar.phase,'DONE');
 const after=(await f.ship()).journey;
 assert.equal(after.arrivesAtGameMs,j.arrivesAtGameMs-60000);assert.equal((await f.ship()).fuel,2);
 assert.equal((await f.store.get('sessions/'+f.sid+'/voyages/'+j.id)).event.delaySeconds,120);
});

test('Avarie en vol : mécano embarqué, réparation atomique, esquive suivante et traversée sans mécano',async()=>{
 const f=await soVoyagesFixture(makeStore),base='sessions/'+f.sid;
 await f.store.runTransaction(async tx=>{
  const path=base+'/characters/'+f.otherId,ch=await tx.get(path);
  tx.set(path,{...ch,abilityProfile:{...ch.abilityProfile,skills:[...ch.abilityProfile.skills.filter(s=>s.id!=='MEC-02'),{id:'MEC-02',level:1}]}});
 });
 const station=async actor=>(await f.read('flightEngineering',{},actor)).station;
 assert.equal(await station(f.other),null);
 await enable(f);await f.refuel(4);await f.startFlight({passengerCodes:[f.otherId]});
 f.setDie(1);await command(f,'rollFlightRisk');f.advance(180000);f.setDice([6,4,1,1]);await f.navCommand('finishSoPreparation');
 const before=await f.ship(),j=before.journey;
 assert.equal(await station(f.player),null);
 assert.deepEqual((await station(f.other)).pending,[]);
 const repair=(patch,actor=f.other)=>f.cmd('repairFlightImpact',{journeyId:j.id,wave:0,system:'THRUST',...patch},actor);
 await assert.rejects(repair({}),{code:'FLIGHT_REPAIR_CLOSED'});
 // Ignore the first wave, then repair while the pilot tackles the second.
 f.advance(51000);const fault=(await station(f.other)).pending[0];assert.equal(fault.wave,0);
 await assert.rejects(repair({system:'UNKNOWN'}),{code:'FLIGHT_REPAIR_SYSTEM'});
 await assert.rejects(repair({},f.player),{code:'FORBIDDEN'});
 await f.stage('PAUSE');await assert.rejects(repair({}),{code:'FLIGHT_REPAIR_CLOSED'});await f.stage('EN_JEU');
 const receipt={requestId:'impact-repair',system:fault.system};
 assert.equal((await repair(receipt)).recoveredSeconds,30);await repair(receipt);
 await assert.rejects(repair({system:fault.system}),{code:'FLIGHT_REPAIR_CLOSED'});
 f.advance(15000);const wave=(await f.navigation()).ship.radar;
 await command(f,'steerFlightHazard',{wave:1,trace:[27,0,45,0,0,-1,273,0,0,0,0,-1]});
 assert.equal((await f.ship()).journey.event.delaySeconds,90);
 f.advance(25000);
 const remaining=await station(f.other);assert.deepEqual(remaining.pending.map(f=>f.wave),[2]);
 const after=await f.ship();assert.equal(after.shield,before.shield);assert.equal(after.hull,before.hull);
 f.advance(600000);await command(f,'arriveShip');
 assert.equal(await station(f.other),null);await assert.rejects(repair(receipt),{code:'FORBIDDEN'});
});
test('Un convoi partage le dé du meneur, le contact pirate et sa résolution',async()=>{
 const f=await convoyFixture(makeStore);
 await enable(f);await f.startFlight();await f.startFlight({shipId:'escort'},f.other);
 await assert.rejects(command(f,'rollFlightRisk',{},f.other,'escort'),{code:'SO_DETOUR_LEADER'});
 f.setDie(1);await command(f,'rollFlightRisk');
 f.advance(180000);await f.navCommand('finishSoPreparation');f.setDie(6);
 await f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);
 const j=(await f.ship()).journey;assert.equal(j.event.hazard.kind,'PIRATES');assert.equal(j.suspended,false);
 assert.equal((await f.get('ships/escort')).journey.event.roll,1);
 f.advance(30000);await command(f,'steerFlightHazard',{wave:0,choice:'HAIL'});
 for(const id of ['ship','escort'])assert.match((await f.get('ships/'+id)).journey.event.hazard.lastResult,/capitaine pirate/);
});

test('Régie et terminal : créneau à venir, accès sans vaisseau, pause, fermeture et annulation',async()=>{
 const f=await soVoyagesFixture(makeStore),read=()=>f.read('flightTraining',{},f.other);
 const initial=await read(),start=initial.serverNow+30000,end=start+60000,input={revision:0,kind:'DUEL',start,end,requestId:'training-slot'};
 await assert.rejects(f.cmd('scheduleFlightTraining',input),{code:'FORBIDDEN'});
 await assert.rejects(f.cmd('scheduleFlightTraining',{...input,end:start},f.owner),{code:'INVALID_TRAINING_SLOT'});
 await f.cmd('scheduleFlightTraining',input,f.owner);await f.cmd('scheduleFlightTraining',input,f.owner);
 const future=await read();assert.equal(future.slots.length,1);assert.equal(future.slots[0].active,false);
 assert.doesNotMatch(trainingHtml(future,f.sid),/Prendre les commandes/);
 assert.equal(terminalItems({session:{id:f.sid,spaceOutlaws:{navigationVersion:1}}},{training:future}).some(x=>x.id==='flight-training'),true);
 await enable(f);assert.equal((await f.read('spaceportAdmin',{},f.owner)).training.slots.length,1);
 f.advance(30000);assert.match(trainingHtml(await read(),f.sid),/exercise-duel\.html/);
 await f.stage('PAUSE');assert.equal((await read()).slots[0].active,false);await f.stage('EN_JEU');
 await assert.rejects(f.cmd('cancelFlightTraining',{revision:0,slotId:future.slots[0].id},f.owner),{code:'STALE_REVISION'});
 await f.cmd('cancelFlightTraining',{revision:1,slotId:future.slots[0].id},f.owner);assert.deepEqual((await read()).slots,[]);
 await f.cmd('scheduleFlightTraining',{revision:2,kind:'ASTEROIDS',start,end},f.owner);
 f.advance(60000);assert.deepEqual((await read()).slots,[]);
 await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(read(),{code:'FORBIDDEN'});
});

}
