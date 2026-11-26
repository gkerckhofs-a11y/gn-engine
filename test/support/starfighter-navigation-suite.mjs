import test from 'node:test';
import assert from 'node:assert/strict';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
export function starfighterNavigationSuite(makeStore){
test('Attribution automatique : droits, double départ, pause et escale',async()=>{
 const f=await soVoyagesFixture(makeStore);
 const settings={stationCount:1,combat:true,revision:0};
 await assert.rejects(f.cmd('configureStarfighter',settings),{code:'FORBIDDEN'});
 await f.cmd('configureStarfighter',settings,f.owner);
 await f.refuel(4);await f.startFlight();
 const read=()=>f.read('cockpitStation',{stationId:'cockpit-1'});
 const ready=await read();assert.equal(ready.starfighter.navigation,true);assert.equal(ready.ship.operation.kind,'PREPARE');
 await assert.rejects(f.read('cockpitStation',{stationId:'cockpit-1'},f.other),{code:'FORBIDDEN'});
 f.advance(180000);const d=await read();
 const cmd={stationId:'cockpit-1',command:'finishSoPreparation',requestId:'auto-launch',payload:{sessionId:f.sid,shipId:'ship',confirmation:d.confirmation,present:true}};
 await f.cmd('cockpitCommand',cmd);const fuel=(await f.ship()).fuel;
 await f.cmd('cockpitCommand',cmd);assert.equal((await f.ship()).fuel,fuel);
 await f.stage('PAUSE');assert.equal((await read()).canAct,false);
 await f.stage('EN_JEU');f.advance(900000);
 const arrived=await read();
 await f.cmd('cockpitCommand',{stationId:'cockpit-1',command:'arriveShip',payload:{sessionId:f.sid,shipId:'ship',confirmation:arrived.confirmation}});
 assert.equal((await f.ship()).journey,null);assert.equal((await f.ship()).operation,null);
});
test('Carte du poste privé et deuxième préparation avec vérification du code et du carburant',async()=>{
 const f=await soVoyagesFixture(makeStore);
 await f.cmd('configureStarfighter',{stationCount:1,combat:false,revision:0},f.owner);
 await f.refuel(4);await f.startFlight();
 const read=()=>f.read('cockpitStation',{stationId:'cockpit-1'});
 const call=(command,fields,actor=f.player)=>f.cmd('cockpitCommand',{stationId:'cockpit-1',command,payload:{sessionId:f.sid,shipId:'ship',...fields}},actor);
 const hidden=await call('galacticMap',{codes:[]});assert.deepEqual(hidden.routes,[]);
 await assert.rejects(call('galacticMap',{codes:['AWAY-CODE']},f.other));
 const map=await call('galacticMap',{codes:['AWAY-CODE'],destinationId:'away'});
 assert.equal(map.itineraries[0].fuelCost,2);assert.doesNotMatch(JSON.stringify(map),/BACK-SECRET|SECRET_PORT|SECRET_ROUTE/);
 f.advance(180000);await call('finishSoPreparation',{confirmation:(await read()).confirmation,present:true});
 f.advance(300000);await call('arriveShip',{confirmation:(await read()).confirmation});
 const request={navigationCode:'HOME-CODE',passengerCodes:[]};
 await assert.rejects(call('prepareVoyage',{...request,navigationCode:'inconnu'}),{code:'ROUTE_UNAVAILABLE'});
 const preview=await call('prepareVoyage',request);
 await call('departShip',{...request,confirmation:preview.confirmation,present:true});
 assert.equal((await read()).ship.operation.kind,'PREPARE');assert.equal((await f.ship()).fuel,2);
});
test('Deux préparations simultanées pour un seul poste libre : une seule réservation',async()=>{
 const f=await soVoyagesFixture(makeStore);await f.refuel(4);
 await f.provision({shipId:'second',ownerId:f.otherId,pilotId:f.otherId});
 await f.store.runTransaction(async tx=>{const path='sessions/'+f.sid+'/ships/second';const sh=await tx.get(path);tx.set(path,{...sh,fuel:4});});
 await f.cmd('configureStarfighter',{stationCount:1,combat:true,revision:0},f.owner);
 const r=await Promise.allSettled([f.startFlight(),f.startFlight({shipId:'second'},f.other)]);
 assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'COCKPIT_OCCUPIED');
 const ids=['ship','second'];const ships=await Promise.all(ids.map(id=>f.store.get('sessions/'+f.sid+'/ships/'+id)));
 assert.equal(ships.filter(sh=>sh.operation?.kind==='PREPARE').length,1);assert.ok(ships.every(sh=>sh.fuel===4));
});
}
