import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralKitFixture,centralTestKit} from './central-class-kits-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {centralCharacterRow} from './central-character-import-suite.mjs';
import {reviewGrant} from './central-review-suite.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';
import {admissionClasses} from '../../src/shared/admission-rules.mjs';

export const plannedCharacter=(patch={})=>({...centralTestCharacter,relations:[],creationPlan:{classId:'MED',speciesId:'species-test',secondaryId:'COM-03'},...patch});
export async function initialCoherenceFixture(makeStore,complete=false){
 const f=await centralKitFixture(makeStore);await f.configure();await f.saveCharacter({draftRevision:1,character:plannedCharacter()});
 if(complete){await f.models(2);await f.saveKit({draftRevision:6});}
 return f;
}
const entry=(r,id='MED')=>r.initialPreparation.classes.find(c=>c.classId===id);
const kitCodes=r=>r.diagnostics.filter(d=>d.code.startsWith('CLASS_KIT_')).map(d=>d.code);
export function centralInitialCoherenceSuite(makeStore,prefix='Cohérence initiale C2f'){
 test(`${prefix} : classe principale requise, initiation sans second kit`,async()=>{
  const f=await initialCoherenceFixture(makeStore),r=await f.check(2);
  assert.deepEqual(kitCodes(r),['CLASS_KIT_MISSING']);assert.equal(r.status,'CORRECTIONS_REQUIRED');assert.equal(r.initialPreparation.requiredClasses,1);
  assert.deepEqual(entry(r).characterIds,['character']);assert.equal(entry(r,'COM').plannedCharacters,0);
  const edge=r.edges.find(e=>e.to.type==='classKit');assert.equal(edge.to.id,'MED');assert.equal(edge.to.workshop,'M1');assert.equal(edge.status,'MISSING');assert.equal(edge.field,'creationPlan.classId');
  assert.equal(r.diagnostics[0].entityType,'character');assert.equal(r.diagnostics[0].referenceType,'classKit');assert.equal(r.diagnostics[0].draftRevision,2);
 });
 test(`${prefix} : références complètes sans ressources ni certification des effets`,async()=>{
  const f=await initialCoherenceFixture(makeStore,true),r=await f.check(7);
  assert.deepEqual(r.diagnostics,[]);assert.equal(entry(r).kitStatus,'REFERENCES_CHECKED');assert.equal(r.publicationAvailable,false);
  assert.ok(r.remainingChecks.some(c=>c.code==='RULE_PROFILE_PENDING'));assert.equal(r.initialPreparation.scope,'CLASS_KIT_REFERENCES');
  for(const kind of ['characters','inventory','accounts','ledger','actionPoints','registrations'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[]);
  assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);
 });
 test(`${prefix} : huit classes et deux natures, aucun quota déduit des définitions`,async()=>{
  const f=await centralKitFixture(makeStore);await f.configure();await f.save({draftRevision:1,itemId:'shared',item:{...centralTestItem,consumable:true}});let revision=2;
  for(const c of admissionClasses){
   await f.saveKit({classKitId:c.id,draftRevision:revision++,classKit:{bindings:initialClassKit(c.id).slots.map(s=>({slotId:s.id,itemId:'shared'}))}});
   for(const nature of ['HUMANOID','DROID'])await f.saveCharacter({characterId:`${c.id}-${nature}`,draftRevision:revision++,character:plannedCharacter({nature,creationPlan:{classId:c.id,speciesId:nature==='DROID'?'droid-test':'species-test',secondaryId:c.id==='MED'?'COM-03':'MED-02'}})});
  }
  const r=await f.check(revision);assert.deepEqual(r.diagnostics,[]);assert.equal(r.initialPreparation.plannedCharacters,16);assert.equal(r.initialPreparation.requiredClasses,8);
  assert.ok(r.initialPreparation.classes.every(c=>c.plannedCharacters===2&&c.kitStatus==='REFERENCES_CHECKED'));assert.equal(r.edges.filter(e=>e.to.type==='classKit').length,16);
  assert.doesNotMatch(JSON.stringify(r.initialPreparation),/quota|participant|assignedUid|abilityProfile/);
 });
 test(`${prefix} : fiches narratives, plan retiré et archives ne requièrent aucun kit`,async()=>{
  const f=await initialCoherenceFixture(makeStore);await f.saveCharacter({characterId:'narrative',draftRevision:2,character:{...centralTestCharacter,relations:[]}});
  await f.saveCharacter({characterId:'no-plan',draftRevision:3,character:plannedCharacter({creationPlan:null})});await f.archiveCharacter({draftRevision:4});
  const r=await f.check(5),p=r.initialPreparation;assert.equal(p.plannedCharacters,0);assert.equal(p.narrativeOnlyCharacters,2);assert.equal(p.archivedCharacters,1);assert.equal(p.requiredClasses,0);assert.deepEqual(r.diagnostics,[]);assert.equal(r.edges.length,0);
 });
 test(`${prefix} : archive puis restauration du kit recalculent toutes les fiches concernées`,async()=>{
  const f=await initialCoherenceFixture(makeStore,true);await f.saveCharacter({characterId:'second',draftRevision:7,character:plannedCharacter()});
  const character=await f.store.get(`${f.base}/changes/character_character`);await f.archiveKit({draftRevision:8});let r=await f.check(9);
  assert.deepEqual(kitCodes(r),['CLASS_KIT_ARCHIVED','CLASS_KIT_ARCHIVED']);assert.equal(entry(r).plannedCharacters,2);assert.equal(entry(r).kitStatus,'ARCHIVED');
  await f.saveKit({draftRevision:9,classKitRevision:2});r=await f.check(10);assert.deepEqual(r.diagnostics,[]);assert.deepEqual(await f.store.get(`${f.base}/changes/character_character`),character);
 });
 test(`${prefix} : kit incomplet, modèle absent, archivé, invalide ou non consommable`,async()=>{
  const f=await initialCoherenceFixture(makeStore);await f.saveKit({draftRevision:2,classKit:{bindings:[]}});let r=await f.check(3);assert.deepEqual(kitCodes(r),['CLASS_KIT_INCOMPLETE']);assert.equal(r.diagnostics.filter(d=>d.code==='REFERENCE_REQUIRED').length,4);
  await f.saveKit({draftRevision:3,classKitRevision:1});r=await f.check(4);assert.equal(entry(r).kitStatus,'INCOMPLETE');assert.equal(r.diagnostics.filter(d=>d.code==='REFERENCE_MISSING').length,4);
  await f.models(4);await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'supplies',draftRevision:8,itemRevision:1,reason:'Essai transitoire'});r=await f.check(9);assert.deepEqual(kitCodes(r),['CLASS_KIT_INCOMPLETE']);assert.ok(r.diagnostics.some(d=>d.code==='REFERENCE_ARCHIVED'));
  await f.save({itemId:'supplies',draftRevision:9,itemRevision:2,item:{...centralTestItem,consumable:false}});r=await f.check(10);assert.equal(entry(r).kitStatus,'INCOMPLETE');assert.ok(r.diagnostics.some(d=>d.code==='KIT_CONSUMABLE_REQUIRED'));
  const model=await f.store.get(`${f.base}/changes/item_supplies`);await f.inject(model.id,{data:{...model.data,consumable:'invalid'}});r=await f.check(10);assert.equal(entry(r).kitStatus,'INCOMPLETE');assert.ok(r.diagnostics.some(d=>d.code==='REFERENCE_INVALID'&&d.reference==='supplies'));
 });
 test(`${prefix} : kit incohérent ne se résout pas par un objet homonyme`,async()=>{
  const f=await initialCoherenceFixture(makeStore,true);await f.save({itemId:'MED',draftRevision:7});const kit=await f.store.get(`${f.base}/changes/classKit_MED`);
  await f.inject(kit.id,{data:{...kit.data,credits:999}});const r=await f.check(8);assert.equal(entry(r).kitStatus,'INVALID');assert.deepEqual(kitCodes(r),['CLASS_KIT_INVALID']);assert.equal(r.edges.find(e=>e.to.type==='classKit').status,'INVALID');assert.equal(r.totals.invalid,1);
 });
 test(`${prefix} : changement de classe et retrait explicite sans réécriture de kit`,async()=>{
  const f=await initialCoherenceFixture(makeStore,true),kit=await f.store.get(`${f.base}/changes/classKit_MED`);
  await f.saveCharacter({draftRevision:7,characterRevision:1,character:plannedCharacter({creationPlan:{classId:'ROG',speciesId:'species-test',secondaryId:'MED-02'}})});let r=await f.check(8);assert.equal(entry(r).plannedCharacters,0);assert.deepEqual(entry(r,'ROG').characterIds,['character']);assert.equal(r.diagnostics[0].reference,'ROG');
  await f.saveCharacter({draftRevision:8,characterRevision:2,character:plannedCharacter({creationPlan:null})});r=await f.check(9);assert.equal(r.initialPreparation.narrativeOnlyCharacters,1);assert.equal(r.initialPreparation.requiredClasses,0);assert.deepEqual(r.diagnostics,[]);assert.deepEqual(await f.store.get(`${f.base}/changes/classKit_MED`),kit);
 });
 test(`${prefix} : provenance Excel localisée sur la colonne de classe`,async()=>{
  const f=await centralKitFixture(makeStore);await f.configure();const e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M2',ids:[]});e.sheets.Personnages=[{...centralCharacterRow,relations_json:'[]'}];
  const input={campaignId:f.cid,workshop:'M2',fileName:'Fiches.xlsx',sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);assert.deepEqual(p.errors,[]);await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Fiches de recette'});
  const r=await f.check(2),d=r.diagnostics.find(d=>d.code==='CLASS_KIT_MISSING');assert.equal(d.fileName,'Fiches.xlsx');assert.equal(d.sheet,'Personnages');assert.equal(d.row,2);assert.equal(d.column,'classe_id');assert.equal(d.reference,'COM');assert.equal(d.batchId,e.sheets.Meta[0].import_batch_id);
 });
 test(`${prefix} : réparation par import M1 sans toucher aux fiches ni aux kits`,async()=>{
  const f=await initialCoherenceFixture(makeStore);await f.saveKit({draftRevision:2});const kit=await f.store.get(`${f.base}/changes/classKit_MED`),character=await f.store.get(`${f.base}/changes/character_character`);
  const e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M1',ids:[]});e.sheets.Objets=centralTestKit.bindings.map(b=>({id:b.itemId,operation:'CREER',revision:0,nom:`Objet ${b.itemId}`,type:'STACKABLE',consommable:b.itemId==='supplies'?'OUI':'NON'}));
  const input={campaignId:f.cid,workshop:'M1',fileName:'Objets.xlsx',sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);assert.deepEqual(p.errors,[]);await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Réparer les références'});
  const r=await f.check(4);assert.deepEqual(r.diagnostics,[]);assert.equal(entry(r).kitStatus,'REFERENCES_CHECKED');assert.deepEqual(await f.store.get(`${f.base}/changes/classKit_MED`),kit);assert.deepEqual(await f.store.get(`${f.base}/changes/character_character`),character);
 });
 test(`${prefix} : droits M2 isolés, contrôle délégué et révocation avant lecture`,async()=>{
  const f=await initialCoherenceFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:[]});assert.deepEqual((await f.view('M2',f.mj)).diagnostics,[]);await assert.rejects(f.check(2,f.mj),{code:'FORBIDDEN'});
  await f.grant({...reviewGrant,revision:1});assert.deepEqual((await f.check(2,f.mj)).initialPreparation,(await f.check(2)).initialPreparation);
  await f.grant({...reviewGrant,revision:2,checkCentral:false});const run=f.store.runTransaction.bind(f.store);f.store.runTransaction=fn=>run(tx=>fn({...tx,list:()=>assert.fail('Aucune lecture après révocation')}));await assert.rejects(f.check(2,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : édition concurrente du kit, aucun rapport mélangeant les révisions`,async()=>{
  const f=await initialCoherenceFixture(makeStore,true),before=await f.check(7);
  const [read,write]=await Promise.allSettled([f.check(7),f.archiveKit({draftRevision:7})]);assert.equal(write.status,'fulfilled');
  if(read.status==='fulfilled'){assert.deepEqual(read.value.initialPreparation,before.initialPreparation);assert.equal(read.value.fingerprint,before.fingerprint);}else assert.equal(read.reason.code,'STALE_REVISION');
  const next=await f.check(8);assert.equal(entry(next).kitStatus,'ARCHIVED');assert.notEqual(next.fingerprint,before.fingerprint);
 });
 test(`${prefix} : lecture sans politique, admission, état de jeu ni écriture`,async()=>{
  const f=await initialCoherenceFixture(makeStore,true),run=f.store.runTransaction.bind(f.store),reads=[];
  f.store.runTransaction=fn=>run(tx=>fn({...tx,get:async p=>{reads.push(p);return tx.get(p);},list:async(p,...args)=>{reads.push(p);return tx.list(p,...args);},set:()=>assert.fail('Contrôle en lecture seule')}));
  const a=await f.check(7),b=await f.check(7);assert.deepEqual(a,b);assert.ok(reads.every(p=>[f.base,`${f.base}/changes`,`campaigns/${f.cid}`,`sessions/${f.sid}`].includes(p)));
  assert.doesNotMatch(JSON.stringify(a),/Secret de fiction|Biographie fictive|Note M2 privée|Préparation privée du kit|invitationHash|firstName|email/);
 });
 test(`${prefix} : kit voisin et objets de session ignorés`,async()=>{
  const f=await initialCoherenceFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.saveKit({campaignId:other.campaignId});
  await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/inventory/MED`,{id:'MED',name:'Kit joué à ignorer'}));const r=await f.check(2);assert.deepEqual(kitCodes(r),['CLASS_KIT_MISSING']);assert.equal(entry(r).kitStatus,'MISSING');assert.doesNotMatch(JSON.stringify(r),/Kit joué à ignorer/);
 });
}
