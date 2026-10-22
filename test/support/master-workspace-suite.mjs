import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {customsMasterExample} from '../../src/shared/master-examples.mjs';
import {workshopModules} from '../../src/shared/workshop-modules.mjs';
import {tariffSheets,tariffFormRow} from '../../web/workshop.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
export function masterWorkspaceSuite(fixture,prefix){
 const workspace=(f,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,...extra});
 test(`${prefix} : atelier propriétaire, six modules et aucune donnée jouée dans l’export`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId},f.player),{code:'FORBIDDEN'});
  const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id};
  const prior=await f.store.list(`sessions/${s.id}/masterImports`),w=await workspace(f,extra);
  assert.equal(w.modules.length,6);assert.equal(w.editable,true);assert.equal(w.tariffs.length,2);assert.equal(w.meta[0].destination_id,s.id);assert.equal(w.meta[0].campaign_id,s.campaignId);
  assert.deepEqual(await f.store.list(`sessions/${s.id}/masterImports`),prior);
  const exported=JSON.stringify(tariffSheets(w));for(const key of ['accounts','balance','inventory','assignedUid','playerSecrets','token','gmNotes'])assert.equal(exported.includes(`"${key}"`),false);
  await f.cmd('setStaff',{sessionId:s.id,email:f.player.email,role:'MJ',active:true,reason:'Test de délégation',revision:(await f.read('session',{sessionId:s.id})).revision});
  await assert.rejects(f.read('masterWorkspace',{sessionId:s.id},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : imports cloisonnés, paramètres et module déclaré vérifiés par le serveur`,async()=>{
  const f=await fixture(),Meta=customsMasterExample().Meta;
  for(const module of workshopModules){
   const badSheet=module.id==='magasins'?'Personnages':'Objets';
   const p=await f.prepare({Meta,[badSheet]:[{id:'intrus',operation:'CREER',version:'1',nom:'Intrus'}]},{module:module.id});
   assert.equal(p.canApply,false);assert.ok(p.errors.some(e=>e.sheet===badSheet&&e.message.includes('ne relève pas')));
  }
  for(const sheets of [{Meta,Parametres:[{cle:'titre',valeur:'Intrus'}]},{Meta:[{...Meta[0],module:'magasins'}]}]){
   const p=await f.prepare(sheets,{module:'economie'});assert.equal(p.canApply,false);
   await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,module:'economie',sheets,reason:'Test',confirmation:p.confirmation}),{code:'INVALID_MASTER'});
  }
  assert.equal((await f.prepare({Meta},{module:'inconnu'})).canApply,false);
  assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/items`),[]);
  await f.apply(customsMasterExample()); // The full multi-domain file remains supported.
 });
 test(`${prefix} : Master modulaire trois lignes, références réelles et import atomique`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const w=await workspace(f),row=w.tariffs[0].row;
  const sheets={Meta:w.meta,Tarifs:[1,2,3].map(n=>({...row,id:`nouveau-${n}`,operation:'CREER',version:'1'}))};
  sheets.Tarifs[2].objet_id='absent';let p=await f.prepare(sheets,{module:'economie'});assert.equal(p.canApply,false);
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/cargoTariffs`)).length,2);
  sheets.Tarifs[2].objet_id='!EFFACER';await f.apply(sheets,{module:'economie'});
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/cargoTariffs`)).length,5);
  assert.equal((await f.apply(sheets,{module:'economie'})).unchanged,true);
  const history=await f.read('masterImportHistory',{scenarioId:f.scenarioId});assert.equal(history.imports[0].module,'economie');
 });
 test(`${prefix} : aller-retour XLSX, version attribuée, modification et réimport sans doublon`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const w=await workspace(f);
  const sheets=readMasterXlsx(writeMasterXlsx(tariffSheets(w)));sheets.Tarifs[0].montant_fixe='17';
  const p=await f.prepare(sheets,{module:'economie'});assert.deepEqual(p.errors,[]);assert.equal(p.changes[0].status,'UPDATE');
  await f.apply(sheets,{module:'economie'});assert.equal((await f.apply(sheets,{module:'economie'})).unchanged,true);
  const next=await workspace(f);assert.equal(next.tariffs[0].row.montant_fixe,'17');assert.equal(Number(next.tariffs[0].row.version),Number(w.tariffs[0].row.version)+1);
 });
 test(`${prefix} : mauvaise destination ou révision et autre module n’écrivent rien`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const w=await workspace(f),sheets=tariffSheets(w),before=await f.store.list(`scenarios/${f.scenarioId}/cargoTariffs`);
  const other=(await f.cmd('createScenario',{title:'Autre'})).id;
  assert.equal((await f.prepare(sheets,{scenarioId:other})).canApply,false);
  const s=await f.session();assert.equal((await f.prepare(sheets,{scenarioId:undefined,sessionId:s.id})).canApply,false);
  const p=await f.prepare(sheets,{module:'economie'});
  await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,module:'personnages',sheets,reason:'Import de test',confirmation:p.confirmation}),{code:'INVALID_MASTER'});
  await f.apply({Meta:customsMasterExample().Meta,Objets:[{id:'annexe',operation:'CREER',version:'1',nom:'Annexe'}]});
  assert.equal((await f.prepare(sheets)).canApply,false);
  assert.deepEqual(await f.store.list(`scenarios/${f.scenarioId}/cargoTariffs`),before);
 });
 test(`${prefix} : édition en ligne, archivage, concurrence et reprise réseau`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());let w=await workspace(f);
  const row=tariffFormRow(w,'',false,{titre:'Tarif neuf',description:'',nature:'CUSTOMS',mouvement:'LOAD',objet_id:'!EFFACER',montant_fixe:'0',montant_unitaire:'0',beneficiary:'SINK',actif:'NON'});
  assert.equal(row.id,w.newTariff.id);const sheets={Meta:w.meta,Tarifs:[row]},payload={scenarioId:f.scenarioId,sheets,module:'economie',reason:'Import de test'},p=await f.prepare(sheets,{module:'economie'}),requestId=randomUUID();
  const command={...payload,confirmation:p.confirmation,requestId},first=await f.cmd('applyMasterImport',command);assert.deepEqual(await f.cmd('applyMasterImport',command),first);
  w=await workspace(f);const one=structuredClone(w),two=structuredClone(w);one.tariffs.find(t=>t.row.id===row.id).row.montant_fixe='5';two.tariffs.find(t=>t.row.id===row.id).row.montant_fixe='9';
  const a=tariffSheets(one),b=tariffSheets(two),previewB=await f.prepare(b,{module:'economie'});await f.apply(a,{module:'economie'});
  await assert.rejects(f.cmd('applyMasterImport',{...payload,sheets:b,confirmation:previewB.confirmation}),{code:'INVALID_MASTER'});
  w=await workspace(f);await f.apply({Meta:w.meta,Tarifs:[tariffFormRow(w,row.id,true,{})]},{module:'economie'});
  w=await workspace(f);assert.equal(w.tariffs.find(t=>t.row.id===row.id).archived,true);
  await f.apply(readMasterXlsx(writeMasterXlsx(tariffSheets(w))),{module:'economie'});
  assert.equal((await f.store.get(`scenarios/${f.scenarioId}/cargoTariffs/${row.id}`)).masterArchived,true);
 });
 test(`${prefix} : session conserve stocks et comptes, Master fermé au lancement`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  const before=await Promise.all(['accounts','inventory','ships','fieldStates'].map(c=>f.store.list(`${base}/${c}`))),w=await workspace(f,extra),sheets=tariffSheets(w);sheets.Tarifs[0].montant_fixe='11';await f.apply(sheets,extra);
  assert.deepEqual(await Promise.all(['accounts','inventory','ships','fieldStates'].map(c=>f.store.list(`${base}/${c}`))),before);
  let session=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:session.revision,stage:'BRIEFING'});
  assert.equal((await workspace(f,extra)).editable,false);
  await assert.rejects(f.prepare(tariffSheets(await workspace(f,extra)),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
}
