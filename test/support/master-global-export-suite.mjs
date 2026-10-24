import test from 'node:test';
import assert from 'node:assert/strict';
import {customsMasterExample} from '../../src/shared/master-examples.mjs';
import {globalMasterSheets} from '../../web/master-global-export.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,extra={},actor=f.owner)=>f.read('masterWorkspace',{scenarioId:f.scenarioId,bundle:true,...extra},actor);
const file=w=>readMasterXlsx(writeMasterXlsx(globalMasterSheets(w)));
export function masterGlobalExportSuite(fixture,prefix){
 test(`${prefix} : catalogue global, six vues cohérentes et réimport XLSX idempotent`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  const before=await f.store.get(`scenarios/${f.scenarioId}`),w=await view(f),sheets=file(w);
  assert.deepEqual(await f.store.get(`scenarios/${f.scenarioId}`),before);
  assert.equal(w.bundles.length,6);assert.equal(sheets.Meta[0].module,'');
  for(const sheet of ['Personnages','Classes','Competences','Objets','Vaisseaux','Routes','Tarifs','Lieux','ActionsTerrain','Recompenses'])assert.ok(sheets[sheet].length,sheet);
  assert.equal(new Set(sheets.Parametres.map(r=>r.cle)).size,sheets.Parametres.length);
  assert.ok(!sheets.Dotations);assert.deepEqual((await f.prepare(sheets)).errors,[]);
  await f.apply(sheets);assert.equal((await f.apply(sheets)).unchanged,true);
 });
 test(`${prefix} : catalogue global réservé au propriétaire, révision périmée et référence absente refusées`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  await assert.rejects(view(f,{},f.player),{code:'FORBIDDEN'});
  for(const extra of [{sheet:'Objets'},{bundle:'true'},{module:null}])await assert.rejects(view(f,extra),{code:'INVALID_MASTER_MODULE'});
  const original=file(await view(f)),invalid=structuredClone(original);invalid.Vaisseaux[0].carburant_objet_id='absent';
  const before=await f.store.list(`scenarios/${f.scenarioId}/ships`);
  assert.equal((await f.prepare(invalid)).canApply,false);assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/ships`),before);
  await f.apply({Meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE'}],Routes:[{id:original.Routes[0].id,operation:'MODIFIER',version:original.Routes[0].version,nom:'Nouvelle route'}]});
  assert.equal((await f.prepare(original)).canApply,false);
 });
 test(`${prefix} : catalogue global de session ne réinitialise ni dotations, profils, santé, carburant ou stocks`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  await f.store.runTransaction(async tx=>{const characters=await tx.list(`${base}/characters`),ships=await tx.list(`${base}/ships`);for(const c of characters)tx.set(`${base}/characters/${c.id}`,{...c,hp:1,maxHp:3,outOfCombat:false});for(const ship of ships)tx.set(`${base}/ships/${ship.id}`,{...ship,fuel:0});});
  const collections=['accounts','inventory','characters','ships','fieldStates'],before=Object.fromEntries(await Promise.all(collections.map(async c=>[c,await f.store.list(`${base}/${c}`)])));
  const sheets=file(await view(f,extra));assert.ok(!sheets.Dotations&&!sheets.Attributions);
  assert.ok(!sheets.Parametres.some(r=>['sante_active','pv_max_defaut','monnaie_nom','monnaie_unite','economie_active'].includes(r.cle)));
  await f.apply(sheets,extra);assert.equal((await f.apply(sheets,extra)).unchanged,true);
  for(const c of ['accounts','inventory','fieldStates'])assert.deepEqual(await f.store.list(`${base}/${c}`),before[c],c);
  for(const c of await f.store.list(`${base}/characters`)){const old=before.characters.find(x=>x.id===c.id);for(const key of ['hp','maxHp','outOfCombat','abilityProfile','startingCredits','startingInventory','assignedUid'])assert.deepEqual(c[key],old[key],key);}
  for(const ship of await f.store.list(`${base}/ships`)){const old=before.ships.find(x=>x.id===ship.id);for(const key of ['navigation','fuel','portId','journey'])assert.deepEqual(ship[key],old[key],key);}
 });
 test(`${prefix} : catalogue global encore lisible après lancement, aucun import hors préparation`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id};
  await f.cmd('setStage',{sessionId:s.id,revision:(await f.read('session',{sessionId:s.id})).revision,stage:'BRIEFING'});
  const w=await view(f,extra);assert.equal(w.editable,false);
  await assert.rejects(f.prepare(file(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
}
