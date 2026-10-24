import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralCheckFixture} from './central-check-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {importFixture} from './central-import-suite.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';

export const centralTestKit={bindings:[{slotId:'communicator',itemId:'communicator'},{slotId:'weapon',itemId:'weapon'},{slotId:'medical-tool',itemId:'tool'},{slotId:'medical-supplies',itemId:'supplies'}],gmNotes:'Préparation privée du kit'};
export async function centralKitFixture(makeStore){
 const f=await centralCheckFixture(makeStore);
 const saveKit=(extra={},actor=f.owner)=>f.cmd('saveCentralClassKit',{campaignId:f.cid,classKitId:'MED',classKitRevision:0,draftRevision:0,classKit:centralTestKit,reason:'Préparer une dotation fictive',...extra},actor);
 const archiveKit=(extra={},actor=f.owner)=>f.cmd('archiveCentralClassKit',{campaignId:f.cid,classKitId:'MED',classKitRevision:1,draftRevision:1,reason:'Retirer la préparation',...extra},actor);
 const models=async(revision=0)=>{for(const b of centralTestKit.bindings)await f.save({itemId:b.itemId,draftRevision:revision++,item:{...centralTestItem,name:`Modèle ${b.itemId}`,consumable:b.itemId==='supplies',pillable:true}});return revision;};
 return {...f,saveKit,archiveKit,models};
}
export function centralClassKitsSuite(makeStore,prefix='Kits initiaux C2e'){
 test(`${prefix} : lecture M1 sans création implicite, préparation native sans dotation`,async()=>{
  const f=await centralKitFixture(makeStore);assert.deepEqual((await f.view()).kitPlans,[]);assert.equal(await f.store.get(f.base),null);const before=await f.store.get(`sessions/${f.sid}`);await f.saveKit();const d=await f.view(),c=d.changes[0];assert.equal(c.type,'classKit');assert.equal(c.entityId,'MED');assert.equal(c.data.revision,1);assert.equal(c.data.publicationState,'DRAFT');assert.equal(c.data.ruleProfile,'SPACE_OUTLAWS_V07');assert.equal(c.data.schemaVersion,1);assert.equal(d.kitPlans[0].slots.at(-1).quantity,2);assert.equal(d.kitPlans[0].startingCredits,200);assert.equal(d.kitPlans[0].activationAvailable,false);assert.equal(d.history[0].change.type,'classKit');
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const k of ['characters','registrations','accounts','inventory','ledger','actionPoints','updates'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[]);assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);assert.equal((await f.check(1)).totals.invalid,0);
 });
 test(`${prefix} : huit classes fixes et un seul identifiant de kit par classe`,async()=>{
  const f=await centralKitFixture(makeStore);let revision=0;for(const id of ['COM','ROG','TRA','MED','MEC','PIL','COU','INF'])await f.saveKit({classKitId:id,draftRevision:revision++,classKit:{bindings:[]}});
  assert.equal((await f.view()).kitPlans.length,8);assert.equal((await f.check(8)).totals.invalid,0);await assert.rejects(f.saveKit({classKitId:'extra',draftRevision:8,classKit:{bindings:[]}}),{code:'CENTRAL_LIMIT'});await assert.rejects(f.saveKit({draftRevision:8}),{code:'STALE_REVISION'});assert.equal((await f.view()).changes.length,8);
 });
 test(`${prefix} : Force, quantités libres, effets et champs étrangers refusés atomiquement`,async()=>{
  const f=await centralKitFixture(makeStore);for(const id of ['FOR','PNJ_FORCE_SENSITIVE','other'])await assert.rejects(f.saveKit({classKitId:id}),{code:'INVALID_CENTRAL_KIT'});
  for(const patch of [{credits:200},{pillable:false},{resellable:false},{classId:'COM'},{name:'Libre'},{publicationState:'PUBLISHED'},{abilityProfile:{}},{schemaVersion:1},{gmNotes:'x'.repeat(4001)},{bindings:[{slotId:'supplies',itemId:'supplies'}]},{bindings:[{slotId:'medical-supplies',itemId:'supplies',quantity:3}]},{bindings:[...centralTestKit.bindings,centralTestKit.bindings[0]]}])await assert.rejects(f.saveKit({classKit:{...centralTestKit,...patch}}),{code:'INVALID_CENTRAL_KIT'});
  await assert.rejects(f.saveKit({classKit:{bindings:[{slotId:'weapon',itemId:'foreign/path'}]}}),{code:'INVALID_ID'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : références manquantes puis résolution depuis les seuls modèles M1`,async()=>{
  const f=await centralKitFixture(makeStore);await f.saveKit();let d=await f.view();assert.equal(d.diagnostics.length,4);assert.ok(d.diagnostics.every(x=>x.code==='REFERENCE_MISSING'));const original=await f.store.get(`${f.base}/changes/classKit_MED`);await f.models(1);d=await f.view();assert.deepEqual(d.diagnostics,[]);assert.equal(d.kitPlans[0].slots.at(-1).itemName,'Modèle supplies');assert.deepEqual(await f.store.get(`${f.base}/changes/classKit_MED`),original);const r=await f.check(5);assert.deepEqual(r.diagnostics,[]);assert.equal(r.edges.length,4);assert.ok(r.edges.every(e=>e.status==='RESOLVED'&&e.from.type==='classKit'&&e.to.type==='item'));
 });
 test(`${prefix} : références partielles enregistrables et retrait explicite audité`,async()=>{
  const f=await centralKitFixture(makeStore);await f.saveKit({classKit:{bindings:[]}});assert.equal((await f.view()).diagnostics.filter(x=>x.code==='REFERENCE_REQUIRED').length,4);await f.saveKit({draftRevision:1,classKitRevision:1});assert.equal((await f.view()).diagnostics.filter(x=>x.code==='REFERENCE_MISSING').length,4);await f.saveKit({draftRevision:2,classKitRevision:2,classKit:{bindings:[]}});const h=(await f.view()).history[0];assert.equal(h.before.data.bindings.length,4);assert.deepEqual(h.change.data.bindings,[]);
 });
 test(`${prefix} : consommable requis sans modifier les attributs ordinaires du modèle`,async()=>{
  const f=await centralKitFixture(makeStore);await f.models();await f.saveKit({draftRevision:4});const before=await f.store.get(`${f.base}/changes/item_supplies`);assert.equal(before.data.pillable,true);assert.deepEqual((await f.view()).diagnostics,[]);assert.equal((await f.view()).kitPlans[0].pillable,false);assert.equal((await f.view()).kitPlans[0].resellable,false);assert.deepEqual(await f.store.get(`${f.base}/changes/item_supplies`),before);
  await f.save({itemId:'supplies',draftRevision:5,itemRevision:1,item:{...centralTestItem,consumable:false}});const r=await f.check(6);assert.equal(r.diagnostics[0].code,'KIT_CONSUMABLE_REQUIRED');assert.equal(r.diagnostics[0].field,'bindings.medical-supplies.itemId');assert.equal(r.edges.find(e=>e.to.id==='supplies').status,'RESOLVED');
 });
 test(`${prefix} : archive de modèle détectée puis restauration sans réécrire le kit`,async()=>{
  const f=await centralKitFixture(makeStore);await f.models();await f.saveKit({draftRevision:4});await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'supplies',draftRevision:5,itemRevision:1,reason:'Retirer le modèle'});assert.equal((await f.view()).diagnostics[0].code,'REFERENCE_ARCHIVED');assert.equal((await f.check(6)).edges.find(e=>e.to.id==='supplies').status,'ARCHIVED');await f.save({itemId:'supplies',draftRevision:6,itemRevision:2});assert.deepEqual((await f.view()).diagnostics,[]);assert.equal((await f.view()).changes.find(c=>c.type==='classKit').data.revision,1);
 });
 test(`${prefix} : archive et restauration du kit sans retrait ni nouvelle dotation`,async()=>{
  const f=await centralKitFixture(makeStore);await f.saveKit();await f.archiveKit();let d=await f.view();assert.deepEqual(d.kitPlans,[]);assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes[0].data.masterArchived,true);assert.equal((await f.check(2)).diff[0].operation,'EXCLUDED');await f.saveKit({draftRevision:2,classKitRevision:2});d=await f.view();assert.equal(d.changes[0].data.masterArchived,false);assert.equal(d.changes[0].data.revision,3);assert.equal(d.history[0].before.operation,'ARCHIVE');assert.equal(d.history.length,3);
 });
 test(`${prefix} : réessai et requestId stable, aucun retour à une ancienne préparation`,async()=>{
  const f=await centralKitFixture(makeStore),input={requestId:randomUUID()},r=await f.saveKit(input);assert.deepEqual(await f.saveKit(input),r);await f.archiveKit();assert.deepEqual(await f.saveKit(input),r);assert.equal((await f.view()).changes[0].operation,'ARCHIVE');await assert.rejects(f.saveKit({...input,classKit:{bindings:[]}}),{code:'REQUEST_ID_REUSED'});assert.equal((await f.view()).history.length,2);
 });
 test(`${prefix} : édition M1 seule, lecture seule et révocation avant reçu`,async()=>{
  const f=await centralKitFixture(makeStore);await f.grant({readWorkshops:['M1'],editWorkshops:[]});await assert.rejects(f.saveKit({},f.mj),{code:'FORBIDDEN'});await f.grant({revision:1});const input={requestId:randomUUID()};await f.saveKit(input,f.mj);assert.equal((await f.view('M1',f.mj)).kitPlans.length,1);await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await assert.rejects(f.view('M2',f.mj),{code:'FORBIDDEN'});await f.grant({revision:2,active:false});await assert.rejects(f.saveKit(input,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : édition M2 ou rôle MJ de session ne donne aucun accès aux kits`,async()=>{
  const f=await centralKitFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});await assert.rejects(f.saveKit({},f.mj),{code:'FORBIDDEN'});await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});await f.grant({revision:1,active:false});await f.cmd('setStaff',{sessionId:f.sid,revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Session uniquement'});await assert.rejects(f.saveKit({},f.mj),{code:'FORBIDDEN'});await assert.rejects(f.saveKit({},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : concurrence kit, modèles et espèces dans la même révision centrale`,async()=>{
  for(const other of ['kit','item','species']){const f=await centralKitFixture(makeStore),r=await Promise.allSettled([f.saveKit(),other==='kit'?f.saveKit({classKit:{bindings:[],gmNotes:'Autre'}}):other==='item'?f.save():f.configure()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.view()).draft.revision,1);}
 });
 test(`${prefix} : modèle et kit de même ID distincts dans diagnostics et contrôle`,async()=>{
  const f=await centralKitFixture(makeStore);await f.save({itemId:'MED'});await f.saveKit({draftRevision:1});const r=await f.check(2);assert.equal(r.diff.length,2);assert.ok(r.diagnostics.every(d=>d.entityType==='classKit'&&d.draftRevision===2&&d.field.startsWith('bindings.')));assert.equal(r.totals.invalid,0);
 });
 test(`${prefix} : catalogue étranger ou instance ne résout aucune référence`,async()=>{
  const f=await centralKitFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.save({campaignId:other.campaignId,itemId:'supplies'});await f.saveKit();assert.equal((await f.view()).diagnostics.length,4);assert.equal((await f.check(1)).edges.find(e=>e.to.id==='supplies').status,'MISSING');
 });
 test(`${prefix} : contrôle refuse les kits stockés altérés et les cibles incohérentes`,async()=>{
  const f=await centralKitFixture(makeStore);await f.models();await f.saveKit({draftRevision:4});const c=await f.store.get(`${f.base}/changes/classKit_MED`);
  for(const patch of [{schemaVersion:2},{ruleProfile:'other'},{credits:200},{name:'Libre'},{bindings:[{...centralTestKit.bindings[0],quantity:8}]}]){await f.inject(c.id,{data:{...c.data,...patch}});assert.equal((await f.check(5)).totals.invalid,1);}
  await f.inject(c.id,{data:c.data});const item=await f.store.get(`${f.base}/changes/item_supplies`);await f.inject(item.id,{data:{...item.data,consumable:'yes'}});const r=await f.check(5);assert.equal(r.edges.find(e=>e.to.id==='supplies').status,'INVALID');assert.ok(r.diagnostics.some(d=>d.code==='REFERENCE_INVALID'&&d.reference==='supplies'));
 });
 test(`${prefix} : imports M1 conservent les kits et recalculent leurs diagnostics`,async()=>{
  const f=await importFixture(makeStore);await f.cmd('saveCentralClassKit',{campaignId:f.cid,classKitId:'MED',classKitRevision:0,draftRevision:0,classKit:centralTestKit,reason:'Kit synthétique'});const before=await f.store.get(`${f.base}/changes/classKit_MED`);
  const input=await f.file('M1',[{id:'MED',operation:'CREER',revision:0,nom:'Modèle distinct',type:'STACKABLE',consommable:'NON'}]),p=await f.prepare(input);assert.deepEqual(p.errors,[]);assert.equal(p.diagnostics.length,4);await f.apply(input,p);assert.deepEqual(await f.store.get(`${f.base}/changes/classKit_MED`),before);const e=await f.exportFile('M1',['MED']);assert.equal(e.sheets.Objets[0].nom,'Modèle distinct');
  const empty=await f.file('M1',[]);await f.apply(empty,await f.prepare(empty));assert.deepEqual(await f.store.get(`${f.base}/changes/classKit_MED`),before);
 });
 test(`${prefix} : projection M1 sans lire candidatures, personnages ou politiques`,async()=>{
  const base=makeStore();let guarded=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(tx=>cb({...tx,get:async p=>{if(guarded)assert.doesNotMatch(p,/\/admission\/|\/registrations\/|\/characters\//);return tx.get(p);},list:async(p,...args)=>{if(guarded&&p.endsWith('/changes'))assert.deepEqual(args[0],['workshop','M1']);return tx.list(p,...args);}}))};const f=await centralKitFixture(()=>store);await f.grant();await f.saveKit();guarded=true;const d=await f.view('M1',f.mj);assert.equal(d.kitPlans.length,1);assert.doesNotMatch(JSON.stringify(d),/admissionPolicy|quotas|invitationHash/);
 });
 test(`${prefix} : cycle incompatible bloque un reçu déjà acquis`,async()=>{
  const f=await centralKitFixture(makeStore),input={requestId:randomUUID()};await f.saveKit(input);const d=await f.store.get(f.base);await f.store.runTransaction(async tx=>tx.set(f.base,{...d,status:'FROZEN'}));await assert.rejects(f.saveKit(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
 test(`${prefix} : interruption transactionnelle puis reprise sans kit partiel`,async()=>{
  const base=makeStore();let stop=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(stop)throw new Error('INTERRUPTION');return r;})};const f=await centralKitFixture(()=>store);stop=true;await assert.rejects(f.saveKit(),/INTERRUPTION/);stop=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.saveKit();assert.equal((await f.view()).history.length,1);
 });
}
