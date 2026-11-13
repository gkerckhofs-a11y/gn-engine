import test from 'node:test';
import assert from 'node:assert/strict';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {analysisTarget} from './space-outlaws-actions-suite.mjs';
export async function spatialTracesFixture(makeStore,{level=3}={}){
 const f=await soVoyagesFixture(makeStore,{distanceId:'MEDIUM',prepareExtra:async f=>{for(const id of ['beacon','own-beacon'])await f.cc('saveCentralFieldTarget',{fieldTargetId:id,fieldTargetRevision:0,draftRevision:(await f.view()).draft.revision,fieldTarget:analysisTarget('COM-03',{tracePolicy:{minLevel:1,actions:['DEPARTURE'],falseLeads:[],routes:[{routeId:'out',nextSegment:'Couloir balisé',arrivalWindow:'Fenêtre préparée par le scénario'}]}}),reason:'Balise de départ préparée'});}});
 const base=`sessions/${f.sid}`,skills=async(cid,fil,eff)=>f.store.runTransaction(async tx=>{const c=await tx.get(base+'/characters/'+cid);tx.set(base+'/characters/'+cid,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(x=>!['FIL-01','EFF-01'].includes(x.id)),{id:'FIL-01',kind:'PASSIVE',level:fil},{id:'EFF-01',kind:'PASSIVE',level:eff}]}});});await skills(f.cid,level,level);await skills(f.otherId,level,level);
 await f.cmd('bindShipTracePoint',{shipId:'ship',targetId:'beacon',reason:'Signature du vaisseau préparé'},f.owner);
 const start=async(mode='TRACK',actor=f.other,extra={})=>{const i={traceTargetId:'beacon',traceMode:mode,kind:'ANALYZE',...extra},p=await f.read('prepareFieldAction',i,actor);return f.cmd('startFieldAction',{...i,confirmation:p.confirmation,present:true},actor);};
 const finish=(a,actor=f.other)=>f.cmd('finishFieldAction',{actionId:a.id,present:true},actor);
 return {...f,base,skills,traceStart:start,traceFinish:finish};
}
async function pair(f){
 await f.provision({shipId:'pursuer',name:'Poursuivant',ownerId:f.otherId,pilotId:f.otherId});await f.refuel(8);
 await f.provision({shipId:'spare',name:'Sans voyage',ownerId:f.otherId,pilotId:f.otherId});
 await f.actionCmd('bindShipTracePoint',{shipId:'pursuer',targetId:'own-beacon',reason:'Balise préparée'},f.owner);
 const provision={provisionId:'pursuit-fuel',source:'Dotation de test',shopId:'counter',offerId:'fuel',quantity:8,restricted:true,reason:'Carburant préparé'},q=await f.read('prepareShopProvision',provision,f.owner);await f.cmd('provisionShop',{...provision,confirmation:q.confirmation},f.owner);
 const sale=await f.buy({offerId:'fuel',quantity:8},f.other);await f.pickup(sale,f.other);const inv=await f.read('myInventory',{},f.other),lot=inv.lots.find(l=>l.id===sale.purchasedLotId),i={shipId:'pursuer',lotId:lot.id,quantity:8},p=await f.read('prepareRefuel',i,f.other);await f.cmd('refuelShip',{...i,confirmation:p.confirmation,present:true},f.other);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'pursuer'},f.other);
 await f.startFlight();await f.startFlight({shipId:'pursuer'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');await f.navCommand('finishSoPreparation',{shipId:'pursuer'},f.other);
}
export function spatialTracesSuite(makeStore,prefix='Traces spatiales'){
 test(prefix+' : N3 retrouve le départ natif et N2 ne peut pas consulter sa signature',async()=>{
  const f=await spatialTracesFixture(makeStore);await f.refuel(8);await f.fly();const a=await f.traceStart();f.advance(90000);const r=await f.traceFinish(a);assert.equal(r.result.departure.shipName,'Nom du vaisseau');assert.equal(r.result.departure.fromPort,'home');assert.equal(r.result.departure.toPort,undefined);assert.equal(r.result.pursuit,undefined);assert.equal((await f.store.list(f.base+'/fictionalTraces')).length,1);
  await f.skills(f.otherId,2,2);await assert.rejects(f.traceStart(),{code:'FIELD_SKILL_REQUIRED'});
 });
 test(prefix+' : EFF N4 autorisé à bord, sans altération du voyage ou du carburant',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:4});await f.refuel(8);await f.fly();const ship=await f.ship(),a=await f.traceStart('ERASE',f.player);f.advance(75000);await f.traceFinish(a,f.player);assert.deepEqual(await f.ship(),ship);const rows=await f.store.list(f.base+'/fictionalTraceMasks');assert.equal(rows.length,1);assert.equal(rows[0].level,4);await assert.rejects(f.traceStart('ERASE',f.other),{code:'SO_TRACE_CONSENT'});
 });
 test(prefix+' : filature refusée sans embarquement et voyage réellement consommé',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:4});await f.refuel(8);await f.fly();await assert.rejects(f.traceStart('TRACK',f.other,{pursuitShipId:'ship'}),{code:'SO_TRACE_PURSUIT'});assert.equal((await f.points(f.other)).available,5);
 });
 test(prefix+' : N4 opposé, égalité favorable au pilote suivi, sans carburant ou combat artificiel',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:4});await pair(f);const before=await f.store.get(f.base+'/ships/pursuer'),pilot=await f.store.get(f.base+'/characters/'+f.cid),level=pilot.abilityProfile.skills.find(k=>k.id==='PIL-01').level;f.setDice([1,5-level]);const rolls=f.rollCount(),a=await f.traceStart('TRACK',f.other,{pursuitShipId:'pursuer'});f.advance(75000);const r=await f.traceFinish(a);assert.equal(r.result.pursuit.success,false);assert.equal(f.rollCount(),rolls+2);assert.equal((await f.store.get(f.base+'/ships/pursuer')).fuel,before.fuel);assert.equal((await f.store.list(f.base+'/spaceCombats')).length,0);assert.equal((await f.read('myFieldActions')).alerts.length,0);
 });
 test(prefix+' : N5 révèle seulement les données préparées, alerte anonyme et continuité de route',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:5});await pair(f);f.setDice([6,1]);const a=await f.traceStart('TRACK',f.other,{pursuitShipId:'pursuer'});f.advance(60000);const r=await f.traceFinish(a);assert.equal(r.result.pursuit.success,true);assert.equal(r.result.pursuit.nextSegment,'Couloir balisé');assert.equal((await f.read('myFieldActions',{},f.other)).actions.find(x=>x.id===a.id).result.pursuit.current,true);
  // A new route is a distinct native journey state, never silently followed.
  await f.store.runTransaction(async tx=>{const sh=await tx.get(f.base+'/ships/ship');tx.set(f.base+'/ships/ship',{...sh,journey:{...sh.journey,routeId:'back'}});});assert.equal((await f.read('myFieldActions',{},f.other)).actions.find(x=>x.id===a.id).result.pursuit.current,false);
  const g=await spatialTracesFixture(makeStore,{level:4});await pair(g);g.setDice([1,6]);const b=await g.traceStart('TRACK',g.other,{pursuitShipId:'pursuer'});g.advance(75000);await g.traceFinish(b);const alerts=(await g.read('myFieldActions')).alerts;assert.equal(alerts.length,1);assert.match(alerts[0].message,/signature suspecte/);assert.doesNotMatch(JSON.stringify(alerts),/Poursuivant|recipientId|characterId|uid/);
 });

 test(prefix+' : route modifiée avant résolution, aucun jet ni débit supplémentaire, annulation possible',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:4});await pair(f);const points=await f.points(f.other),a=await f.traceStart('TRACK',f.other,{pursuitShipId:'pursuer'}),rolls=f.rollCount();f.advance(75000);
  await f.store.runTransaction(async tx=>{const sh=await tx.get(f.base+'/ships/ship');tx.set(f.base+'/ships/ship',{...sh,journey:{...sh.journey,routeId:'back'}});});await assert.rejects(f.traceFinish(a),{code:'SO_TRACE_PURSUIT'});assert.equal(f.rollCount(),rolls);await f.cmd('cancelFieldAction',{actionId:a.id,reason:'La piste a changé'},f.other);assert.equal((await f.points(f.other)).available,points.available);
 });
 test(prefix+' : résolution concurrente ne rejoue pas le test et visibilité limitée au vaisseau embarqué',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:4});await pair(f);const options=await f.read('tracePursuitOptions',{},f.other);assert.deepEqual(options.ships.map(s=>s.id),['pursuer']);f.setDice([6,1]);const a=await f.traceStart('TRACK',f.other,{pursuitShipId:'pursuer'});f.advance(75000);const before=f.rollCount(),rs=await Promise.all([f.traceFinish(a),f.traceFinish(a)]);assert.deepEqual(rs[0],rs[1]);assert.equal((await f.store.list(f.base+'/fictionalPursuits')).length,1);assert.equal((await f.points(f.other)).reserved,0);assert.ok(f.rollCount()>=before+2);assert.equal(rs[0].result.pursuit.nextSegment,undefined);
 });
 test(prefix+' : autorisation du pilote révoquée pendant la recherche, refus sans résultat ni avantage',async()=>{
  const f=await spatialTracesFixture(makeStore,{level:4});await pair(f);const a=await f.traceStart('TRACK',f.other,{pursuitShipId:'pursuer'});f.advance(75000);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.traceFinish(a),{code:'INVALID_RECIPIENT'});assert.equal((await f.store.list(f.base+'/fictionalPursuits')).length,0);await f.cmd('cancelFieldAction',{actionId:a.id,reason:'Pilote suivi indisponible'},f.other);assert.equal((await f.points(f.other)).reserved,0);
 });

}
