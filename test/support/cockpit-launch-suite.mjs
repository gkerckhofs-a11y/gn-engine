import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {encountersFixture,order} from './space-encounters-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
export function cockpitLaunchSuite(makeStore,prefix='Postes cockpit'){
 const prepared=async()=>{const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.startFlight({cockpit:true});f.advance(180000);return f;};
 const send=async(f,action,patch={},actor=f.player)=>{const d=actor===f.owner?(await f.read('spaceportAdmin',{},actor)).ships.find(x=>x.shipId===(patch.shipId??'ship')):await f.navigation(patch.shipId??'ship',actor);return f.cmd(action,{shipId:patch.shipId??'ship',confirmation:d.confirmation,...(action==='requestSoLaunch'?{present:true}:{}),...patch},actor);};
 const assign=async(f,stationId='cockpit-1')=>{await send(f,'requestSoLaunch');return send(f,'assignSoCockpit',{stationId},f.owner);};
 test(`${prefix} : demande, activation MJ, pilote et départ unique`,async()=>{
  const f=await prepared();const before=await f.ship();await assert.rejects(f.navCommand('finishSoPreparation'),{code:'COCKPIT_REQUIRED'});
  await send(f,'requestSoLaunch');assert.equal((await f.ship()).fuel,before.fuel);assert.equal((await f.points()).reserved,1);
  assert.equal((await f.read('spaceportAdmin',{},f.owner)).ships[0].cockpit.status,'WAITING');
  await assert.rejects(send(f,'assignSoCockpit',{stationId:'cockpit-1'}),{code:'FORBIDDEN'});
  await send(f,'assignSoCockpit',{stationId:'cockpit-1'},f.owner);
  await assert.rejects(f.read('cockpitStation',{stationId:'cockpit-1'},f.other),{code:'FORBIDDEN'});
  const d=await f.read('cockpitStation',{stationId:'cockpit-1'});assert.equal(d.ship.shipId,'ship');assert.equal(d.pilotName,(await f.navigation()).ship.operation.manifest[0].name);assert.equal(d.lots,undefined);assert.doesNotMatch(JSON.stringify(d),/SECRET_|assignedUid|actorUid/);
  const input={shipId:'ship',stationId:'cockpit-1',confirmation:d.confirmation,present:true,requestId:randomUUID()};
  await f.cmd('finishSoPreparation',input);const after=await f.ship();assert.equal(after.journey.pilotId,f.cid);assert.equal(after.fuel,before.fuel-before.operation.route.fuelCost-after.journey.event.fuelCost);
  await f.cmd('finishSoPreparation',input);assert.equal((await f.ship()).fuel,after.fuel);assert.equal((await f.points()).reserved,0);
 });
 test(`${prefix} : préparation incomplète, pause et révocation bloquent`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.startFlight({cockpit:true});await assert.rejects(send(f,'requestSoLaunch'),{code:'VOYAGE_NOT_READY'});f.advance(180000);
  await assign(f);await send(f,'revokeSoCockpit',{},f.owner);
  await assert.rejects(f.read('cockpitStation',{stationId:'cockpit-1'}),{code:'COCKPIT_UNAVAILABLE'});
  await assert.rejects(f.navCommand('finishSoPreparation',{stationId:'cockpit-1'}),{code:'COCKPIT_REQUIRED'});
  await send(f,'assignSoCockpit',{stationId:'cockpit-2'},f.owner);await f.stage('PAUSE');
  assert.equal((await f.read('cockpitStation',{stationId:'cockpit-2'})).canAct,false);
  await assert.rejects(f.navCommand('finishSoPreparation',{stationId:'cockpit-2'}),{code:'SESSION_NOT_RUNNING'});
 });
 test(`${prefix} : annulation libère PA et invalide l’ancien poste`,async()=>{
  const f=await prepared();await assign(f);await send(f,'cancelSoNavigation',{reason:'Équipage absent'});
  assert.equal((await f.points()).reserved,0);assert.equal((await f.ship()).fuel,4);
  await assert.rejects(f.read('cockpitStation',{stationId:'cockpit-1'}),{code:'COCKPIT_UNAVAILABLE'});
  await f.startFlight({cockpit:true});f.advance(180000);await assign(f,'cockpit-2');
  await assert.rejects(f.read('cockpitStation',{stationId:'cockpit-1'}),{code:'COCKPIT_UNAVAILABLE'});
 });
 test(`${prefix} : changement de conditions après la demande refuse le départ`,async()=>{
  const f=await prepared();await assign(f);
  await f.store.runTransaction(async tx=>{const s=await tx.get(`sessions/${f.sid}/ships/ship`);tx.set(`sessions/${f.sid}/ships/ship`,{...s,fuel:0});});
  await assert.rejects(f.navCommand('finishSoPreparation',{stationId:'cockpit-1'}),{code:'SHIP_UNAVAILABLE'});
  assert.equal((await f.points()).reserved,1);assert.equal((await f.ship()).journey,null);
 });
 test(`${prefix} : commande du poste atomique, refus de détournement et réessai`,async()=>{
  const f=await prepared();await assign(f);const d=await f.read('cockpitStation',{stationId:'cockpit-1'});
  const input={stationId:'cockpit-1',command:'finishSoPreparation',payload:{sessionId:f.sid,shipId:'ship',confirmation:d.confirmation,present:true},requestId:randomUUID()};
  await assert.rejects(f.cmd('cockpitCommand',{...input,payload:{...input.payload,shipId:'foreign'}}),{code:'COCKPIT_COMMAND'});
  await f.cmd('cockpitCommand',input);const fuel=(await f.ship()).fuel;await f.cmd('cockpitCommand',input);assert.equal((await f.ship()).fuel,fuel);
  await send(f,'revokeSoCockpit',{},f.owner);await assert.rejects(f.cmd('cockpitCommand',input),{code:'COCKPIT_UNAVAILABLE'});
 });
 test(`${prefix} : deux pilotes, poste exclusif et vols parallèles`,async()=>{
  const f=await prepared();await f.provision({shipId:'second',ownerId:f.otherId,pilotId:f.otherId});
  await f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}/ships/second`,s=await tx.get(p);tx.set(p,{...s,fuel:4});});
  await f.startFlight({shipId:'second',cockpit:true},f.other);f.advance(180000);
  await send(f,'requestSoLaunch');await send(f,'requestSoLaunch',{shipId:'second'},f.other);
  const race=await Promise.allSettled([send(f,'assignSoCockpit',{stationId:'cockpit-1'},f.owner),send(f,'assignSoCockpit',{shipId:'second',stationId:'cockpit-1'},f.owner)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.code,'COCKPIT_OCCUPIED');
  const first=await f.store.get(`sessions/${f.sid}/cockpitStations/cockpit-1`),other=first.shipId==='ship'?'second':'ship';
  await send(f,'assignSoCockpit',{shipId:other,stationId:'cockpit-2'},f.owner);
  for(const [shipId,actor] of [['ship',f.player],['second',f.other]]){const stationId=first.shipId===shipId?'cockpit-1':'cockpit-2',d=await f.read('cockpitStation',{stationId},actor);await f.cmd('cockpitCommand',{stationId,command:'finishSoPreparation',payload:{sessionId:f.sid,shipId,confirmation:d.confirmation,present:true}},actor);}
  assert.ok((await f.ship()).journey);assert.ok((await f.store.get(`sessions/${f.sid}/ships/second`)).journey);
 });

 test(`${prefix} : ordres de combat natifs, révocation et réactivation en vol`,async()=>{
  const f=await encountersFixture(makeStore);await f.begin();
  // Bind an already flying fixture to a station; combat rules remain native.
  await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}/ships/ship`,ship=await tx.get(path);tx.set(path,{...ship,cockpit:{status:'ASSIGNED',stationId:'cockpit-1',operationId:'prepared-flight',pilotId:f.cid}});tx.set(`sessions/${f.sid}/cockpitStations/cockpit-1`,{id:'cockpit-1',shipId:'ship',operationId:'prepared-flight'});});
  const d=await f.detail(),input={stationId:'cockpit-1',command:'submitSpaceOrder',payload:{sessionId:f.sid,shipId:'ship',combatId:d.id,confirmation:d.confirmation,order:order('DEFEND')}};
  await f.cmd('cockpitCommand',input);assert.equal((await f.detail()).ownOrder.kind,'DEFEND');assert.equal((await f.detail(f.other)).ownOrder,null);
  await send(f,'revokeSoCockpit',{},f.owner);await assert.rejects(f.cmd('cockpitCommand',input),{code:'COCKPIT_UNAVAILABLE'});
  await send(f,'assignSoCockpit',{stationId:'cockpit-2'},f.owner);assert.equal((await f.read('cockpitStation',{stationId:'cockpit-2'})).ship.combatId,d.id);
 });

 test(`${prefix} : activation MJ obligatoire côté serveur, même avec un ancien client`,async()=>{
  const f=await soVoyagesFixture(makeStore);await assert.rejects(f.cmd('enableSoCockpits'),{code:'FORBIDDEN'});
  await f.cmd('enableSoCockpits',{},f.owner);await f.cmd('enableSoCockpits',{},f.owner);
  assert.equal((await f.read('spaceportAdmin',{},f.owner)).session.cockpitEnabled,true);
  await f.refuel(4);await f.startFlight({cockpit:false});f.advance(180000);
  assert.equal((await f.ship()).operation.cockpit,true);await assert.rejects(f.navCommand('finishSoPreparation'),{code:'COCKPIT_REQUIRED'});
 });

}
