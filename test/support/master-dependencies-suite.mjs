import test from 'node:test';
import assert from 'node:assert/strict';
import {customsMasterExample} from '../../src/shared/master-examples.mjs';
import {masterDependencies} from '../../src/shared/master-dependencies.mjs';
import {moduleBundleSheets} from '../../web/master-module-export.mjs';
const view=(f,extra={},actor=f.owner)=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'spatioport',bundle:true,...extra},actor);
export function masterDependenciesSuite(fixture,prefix){
 test(`${prefix} : dépendances exportées depuis les catalogues de la destination, lecture sans écriture`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const base=`scenarios/${f.scenarioId}`,before=await f.store.get(base),rows=await f.store.list(`${base}/masterRows`);
  const w=await view(f),refs=masterDependencies(moduleBundleSheets(w),w.referenceIndex);assert.ok(refs.some(r=>r.targetSheet==='Objets'&&r.presence==='PRESENT'&&r.scope==='EXTERNAL'));assert.ok(refs.some(r=>r.targetSheet==='Groupes'&&r.presence==='PRESENT'));
  for(const entries of Object.values(w.referenceIndex))for(const row of entries)assert.deepEqual(Object.keys(row).sort(),['archived','id']);
  assert.deepEqual(await f.store.get(base),before);assert.deepEqual(await f.store.list(`${base}/masterRows`),rows);await assert.rejects(view(f,{},f.player),{code:'FORBIDDEN'});
  const ship=(await f.store.list(`${base}/ships`))[0];await f.store.runTransaction(async tx=>tx.set(`${base}/ships/${ship.id}`,{...ship,navigation:{...ship.navigation,fuelItemId:'introuvable'}}));
  const changed=await view(f),missing=masterDependencies(moduleBundleSheets(changed),changed.referenceIndex);assert.ok(missing.some(r=>r.targetId==='introuvable'&&r.presence==='MISSING'));assert.ok(!masterDependencies(moduleBundleSheets(w),w.referenceIndex).some(r=>r.presence==='MISSING'));
 });
 test(`${prefix} : dépendances de session isolées du scénario et lecture après lancement sans redistribution`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  const accounts=await f.store.list(`${base}/accounts`),inventory=await f.store.list(`${base}/inventory`),item=(await f.store.list(`scenarios/${f.scenarioId}/items`)).find(i=>i.id==='carburant-demo');
  await f.store.runTransaction(async tx=>tx.set(`scenarios/${f.scenarioId}/items/${item.id}`,{...item,masterArchived:true}));
  const scenario=await view(f);assert.equal(scenario.referenceIndex.Objets.find(r=>r.id===item.id).archived,true);
  await f.cmd('setStage',{sessionId:s.id,revision:(await f.read('session',{sessionId:s.id})).revision,stage:'BRIEFING'});
  const w=await view(f,extra);assert.equal(w.editable,false);assert.equal(w.referenceIndex.Objets.find(r=>r.id===item.id).archived,false);assert.ok(masterDependencies(moduleBundleSheets(w),w.referenceIndex).some(r=>r.targetId===item.id&&r.presence==='PRESENT'));
  await assert.rejects(view(f,extra,f.player),{code:'FORBIDDEN'});assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);
 });
}
