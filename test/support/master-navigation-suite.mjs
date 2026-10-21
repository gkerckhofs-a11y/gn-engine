import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationMasterExample,navigationSessionMasterExample} from '../../src/shared/master-examples.mjs';
import {cleanScenarioSnapshot,scenarioCollections} from '../../src/core/scenario-package.mjs';
export function masterNavigationSuite(fixture,prefix){
 test(`${prefix} : vaisseaux, routes et pilote importés, versions et export sans état joué`,async()=>{
  const f=await fixture(),sheets=navigationMasterExample();assert.deepEqual((await f.prepare(sheets)).errors,[]);await f.apply(sheets);assert.equal((await f.apply(sheets)).unchanged,true);
  const records=Object.fromEntries(await Promise.all(scenarioCollections.map(async k=>[k,await f.store.list(`scenarios/${f.scenarioId}/${k}`)])));
  const snapshot=cleanScenarioSnapshot({scenario:await f.read('scenario',{scenarioId:f.scenarioId}),records:{...records,ships:records.ships.map(s=>({...s,fuel:999,portId:'secret',journey:{id:'secret'}}))}});
  assert.equal(snapshot.scenario.transportRules.homePort,'port-demo');assert.equal(snapshot.records.groups[0].members[0].permissions.pilotShip,true);assert.equal(snapshot.records.ships[0].fuel,undefined);assert.equal(snapshot.records.ships[0].journey,undefined);assert.equal(snapshot.records.routes.length,2);
  const episode=await f.session(),base=`sessions/${episode.id}`;assert.equal((await f.store.get(base)).transportRules.homePort,'port-demo');assert.equal((await f.store.get(`${base}/ships/cargo-demo`)).fuel,0);assert.equal((await f.store.list(`${base}/routes`)).length,2);
 });
 test(`${prefix} : complément de navigation préserve carburant, position et cargaison de campagne`,async()=>{
  const f=await fixture();await f.apply(navigationMasterExample());const episode=await f.session(),base=`sessions/${episode.id}`,extra={scenarioId:undefined,sessionId:episode.id},sheets=navigationSessionMasterExample();sheets.Meta[0].campaign_id=episode.campaignId;
  await f.store.runTransaction(async tx=>{const sh=await tx.get(`${base}/ships/cargo-demo`);tx.set(`${base}/ships/cargo-demo`,{...sh,fuel:7,portId:'relais-demo'});});
  await f.apply(sheets,extra);const sh=await f.store.get(`${base}/ships/cargo-demo`);assert.equal(sh.fuel,7);assert.equal(sh.portId,'relais-demo');assert.equal(sh.navigation.tankCapacity,25);assert.equal((await f.store.get(`${base}/routes/retour-demo`)).fuelCost,4);
  const change={Meta:sheets.Meta,Vaisseaux:[{id:'cargo-demo',operation:'MODIFIER',version:'3',carburant_initial:'24',port_initial:'ailleurs'}]};await f.apply(change,extra);const next=await f.store.get(`${base}/ships/cargo-demo`);assert.equal(next.fuel,7);assert.equal(next.portId,'relais-demo');
  change.Vaisseaux[0]={id:'cargo-demo',operation:'MODIFIER',version:'4',capacite_reservoir:'6',carburant_initial:'0'};assert.equal((await f.prepare(change,extra)).canApply,false);
  await f.apply({Meta:sheets.Meta,Vaisseaux:[{id:'cargo-demo',operation:'ARCHIVER',version:'4'}]},extra);assert.equal((await f.store.get(`${base}/ships/cargo-demo`)).enabled,false);assert.equal((await f.store.get(`${base}/ships/cargo-demo`)).fuel,7);
 });
 test(`${prefix} : références de carburant, ports et paramètres invalides bloquent tout import`,async()=>{
  const f=await fixture();for(const change of [s=>s.Vaisseaux[0].proprietaire_id='absent',s=>s.Vaisseaux[0].carburant_objet_id='recharge-demo',s=>s.Vaisseaux[0].capacite_reservoir='-1',s=>s.Routes[0].arrivee_port=s.Routes[0].depart_port,s=>s.Routes[0].duree_secondes='0',s=>s.Routes[0].carburant_cout='-1',s=>s.Parametres.push({cle:'astroport_id',valeur:'double'})]){const sheets=navigationMasterExample();change(sheets);assert.equal((await f.prepare(sheets)).canApply,false);}
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/ships`)).length,0);
 });
}
