import test from 'node:test';
import assert from 'node:assert/strict';
import {customsMasterExample} from '../../src/shared/master-examples.mjs';
import {workshopModules,masterModuleErrors} from '../../src/shared/workshop-modules.mjs';
import {moduleBundleSheets} from '../../web/master-module-export.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,module,extra={},actor=f.owner)=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module,bundle:true,...extra},actor);
const file=w=>readMasterXlsx(writeMasterXlsx(moduleBundleSheets(w)));
export function masterModuleExportSuite(fixture,prefix){
 test(`${prefix} : six exports groupés cohérents, XLSX et réimport idempotent`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  for(const {id} of workshopModules){
   const before=await f.store.get(`scenarios/${f.scenarioId}`),w=await view(f,id),sheets=file(w);
   assert.deepEqual(await f.store.get(`scenarios/${f.scenarioId}`),before);assert.deepEqual(masterModuleErrors(sheets,id),[]);assert.equal(sheets.Meta[0].module,id);
   assert.ok(w.workspaces.every(p=>p.meta[0].base_revision===w.meta[0].base_revision));assert.ok(!Object.hasOwn(sheets,'Dotations'));
   if(id==='economie')assert.ok(sheets.Tarifs.length);if(id==='informations')assert.ok(sheets.ActionsTerrain.length);if(id==='spatioport')assert.ok(sheets.Vaisseaux.length);
   const p=await f.prepare(sheets,{module:id});assert.deepEqual(p.errors,[]);await f.apply(sheets,{module:id});assert.equal((await f.apply(sheets,{module:id})).unchanged,true);
  }
 });
 test(`${prefix} : export groupé soumis aux droits, références et révisions sans écriture partielle`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());await assert.rejects(view(f,'personnages',{},f.player),{code:'FORBIDDEN'});
  for(const extra of [{module:undefined},{sheet:'Personnages'},{bundle:'true'},{module:'inconnu'}])await assert.rejects(view(f,'personnages',extra),{code:'INVALID_MASTER_MODULE'});
  const w=await view(f,'spatioport'),sheets=file(w),before=await f.store.list(`scenarios/${f.scenarioId}/ships`);sheets.Vaisseaux[0].carburant_objet_id='absent';assert.equal((await f.prepare(sheets)).canApply,false);assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/ships`),before);
  const original=file(w);assert.equal((await f.prepare(original,{module:'economie'})).canApply,false);
  await f.apply(file(await view(f,'magasins')));assert.equal((await f.prepare(original)).canApply,false);
 });
 test(`${prefix} : export groupé de session préserve acquis et exclut les paramètres réservés au scénario`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  const accounts=await f.store.list(`${base}/accounts`),inventory=await f.store.list(`${base}/inventory`);
  for(const {id} of workshopModules){const w=await view(f,id,extra),sheets=file(w);assert.ok(!sheets.Dotations&&!sheets.Attributions);assert.ok(!(sheets.Parametres??[]).some(r=>r.cle.startsWith('monnaie_')||r.cle==='pv_max_defaut'||r.cle==='sante_active'));const p=await f.prepare(sheets,extra);assert.deepEqual(p.errors,[]);await f.apply(sheets,extra);}
  assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);
  await f.cmd('setStage',{sessionId:s.id,revision:(await f.read('session',{sessionId:s.id})).revision,stage:'BRIEFING'});const w=await view(f,'spatioport',extra);assert.equal(w.editable,false);await assert.rejects(f.prepare(file(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
}
