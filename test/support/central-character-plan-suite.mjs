import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralCheckFixture} from './central-check-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {admissionTestSettings} from './admissions-suite.mjs';
import {abilityLevel} from '../../src/core/abilities.mjs';

export const centralTestPlan={classId:'COM',speciesId:'species-test',secondaryId:'MED-02'};
const character=(patch={})=>({...centralTestCharacter,relations:[],creationPlan:centralTestPlan,...patch});
export function centralCharacterPlanSuite(makeStore,prefix='Plan initial C2c'){
 test(`${prefix} : plan privé versionné, socle dérivé sans profil actif ni ressources`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.configure();const before=await f.store.get(`sessions/${f.sid}`);await f.saveCharacter({draftRevision:1,character:character()});
  const d=await f.view('M2'),c=d.changes.find(x=>x.type==='character'),p=d.creationProfiles[0];assert.equal(c.data.creationPlan.ruleProfile,'SPACE_OUTLAWS_V07');assert.equal(c.data.creationPlan.schemaVersion,1);assert.deepEqual(d.diagnostics,[]);
  assert.deepEqual(p.skills.map(x=>[x.id,x.level]),[['COM-01',null],['COM-02',null],['COM-03',2],['MED-02',1]]);assert.equal(c.data.abilityProfile,undefined);assert.equal(abilityLevel(c.data,'MED-02'),0);assert.equal(c.data.hp,null);assert.equal(c.data.maxHp,null);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const k of ['characters','accounts','inventory','ledger','skills','classes','registrations','actionPoints'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[]);
  const r=await f.check(2);assert.equal(r.totals.invalid,0);assert.deepEqual(r.diagnostics.map(d=>d.code),['CLASS_KIT_MISSING']);assert.equal(r.publicationAvailable,false);assert.equal(r.edges[0].to.type,'species');assert.equal(r.edges[0].status,'RESOLVED');assert.ok(r.diff.find(x=>x.type==='character').privateFields.includes('creationPlan'));
 });
 test(`${prefix} : huit classes accessibles aux deux natures sans bonus d’espèce`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.configure();let revision=1;
  for(const nature of ['HUMANOID','DROID'])for(const classId of ['COM','ROG','TRA','MED','MEC','PIL','COU','INF']){
   const creationPlan={classId,speciesId:nature==='DROID'?'droid-test':'species-test',secondaryId:classId==='MED'?'COM-03':'MED-02'};
   await f.saveCharacter({characterId:`${nature}-${classId}`,draftRevision:revision++,character:character({nature,creationPlan})});
  }
  const d=await f.view('M2');assert.deepEqual(d.diagnostics,[]);assert.equal(d.creationProfiles.length,16);assert.ok(d.creationProfiles.every(p=>p.skills.length===4));assert.equal((await f.check(17)).totals.invalid,0);
 });
 test(`${prefix} : classe Force, initiation propre ou non autorisée et champs injectés refusés`,async()=>{
  const f=await centralCheckFixture(makeStore);
  const bad=[{classId:'PNJ_FORCE_SENSITIVE'},{classId:'JEDI'},{classId:'SITH'},{classId:'custom'},{secondaryId:'COM-03'},{secondaryId:'FOR-01'},{secondaryId:'LAS-01'},{secondaryId:'COM-01'},{secondaryId:'ROG-01'},{secondaryId:'TOXI-01'},{secondaryId:'MED-03'},{secondaryId:''},{level:5},{skills:[]},{credits:200},{ruleProfile:'SPACE_OUTLAWS_V07'},{schemaVersion:1}];
  for(const patch of bad)await assert.rejects(f.saveCharacter({character:character({creationPlan:{...centralTestPlan,...patch}})}),{code:'INVALID_CENTRAL_PROFILE'});
  for(const creationPlan of [false,[],42,'COM'])await assert.rejects(f.saveCharacter({character:character({creationPlan})}),{code:'INVALID_CENTRAL_PROFILE'});
  assert.equal(await f.store.get(f.base),null);assert.deepEqual(await f.store.list(`${f.base}/changes`),[]);
 });
 test(`${prefix} : espèce absente différée puis résolue depuis le catalogue partagé`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter({character:character()});let d=await f.view('M2');assert.equal(d.diagnostics[0].field,'creationPlan.speciesId');assert.equal(d.diagnostics[0].code,'REFERENCE_MISSING');
  const original=await f.store.get(`${f.base}/changes/character_character`),r=await f.check(1);assert.equal(r.edges[0].status,'MISSING');assert.equal(r.diagnostics[0].source,'WEB');await f.configure(1);
  d=await f.view('M2');assert.deepEqual(d.diagnostics,[]);assert.equal(d.creationProfiles[0].speciesLabel,'Espèce synthétique');assert.deepEqual(await f.store.get(`${f.base}/changes/character_character`),original);assert.equal((await f.check(2)).edges[0].status,'RESOLVED');
 });
 test(`${prefix} : incohérence de nature signalée sans modifier la fiche ni l’espèce`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.configure();await f.saveCharacter({draftRevision:1,character:character({nature:'DROID'})});let r=await f.check(2);assert.equal(r.diagnostics[0].code,'SPECIES_NATURE_MISMATCH');assert.equal(r.status,'CORRECTIONS_REQUIRED');assert.equal(r.edges[0].status,'RESOLVED');
  await f.saveCharacter({draftRevision:2,characterRevision:1,character:character({nature:'DROID',creationPlan:{...centralTestPlan,speciesId:'droid-test'}})});assert.deepEqual((await f.check(3)).diagnostics.map(d=>d.code),['CLASS_KIT_MISSING']);
 });
 test(`${prefix} : fermer une espèce aux candidatures ne supprime pas une référence M2`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.cmd('saveAdmissionSettings',{sessionId:f.sid,policyRevision:0,draftRevision:0,settings:{...admissionTestSettings,species:admissionTestSettings.species.map(s=>({...s,available:false})),open:false},reason:'Fermer les choix'});
  await f.saveCharacter({draftRevision:1,character:character()});const d=await f.view('M2');assert.equal(d.references.species[0].available,false);assert.deepEqual(d.diagnostics,[]);assert.deepEqual((await f.check(2)).diagnostics.map(d=>d.code),['CLASS_KIT_MISSING']);
 });
 test(`${prefix} : édition avec ancien client conserve le plan ; retrait explicite et restauration audités`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter({character:character()});const first=(await f.view('M2')).changes[0].data.creationPlan;
  await f.saveCharacter({draftRevision:1,characterRevision:1,character:{...centralTestCharacter,relations:[],biography:'Texte modifié'}});assert.deepEqual((await f.view('M2')).changes[0].data.creationPlan,first);
  await f.saveCharacter({draftRevision:2,characterRevision:2,character:character({creationPlan:null})});let d=await f.view('M2');assert.equal(d.changes[0].data.creationPlan,null);assert.deepEqual(d.creationProfiles,[]);assert.equal(d.history[0].before.data.creationPlan.classId,'COM');assert.equal(d.history[0].change.data.creationPlan,null);
  await f.saveCharacter({draftRevision:3,characterRevision:3,character:character()});assert.deepEqual((await f.view('M2')).changes[0].data.creationPlan,first);assert.equal((await f.check(4)).totals.invalid,0);
 });
 test(`${prefix} : ancienne fiche narrative sans plan conserve sa forme et aucun choix implicite`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter({character:{...centralTestCharacter,relations:[]}});const d=await f.view('M2');assert.equal(Object.hasOwn(d.changes[0].data,'creationPlan'),false);assert.deepEqual(d.creationProfiles,[]);assert.deepEqual(d.diagnostics,[]);assert.equal((await f.check(1)).totals.invalid,0);
 });
 test(`${prefix} : réessai et archive ne créent ni seconde définition ni activation`,async()=>{
  const f=await centralCheckFixture(makeStore),input={character:character(),requestId:randomUUID()};const first=await f.saveCharacter(input);assert.deepEqual(await f.saveCharacter(input),first);
  await f.archiveCharacter();let d=await f.view('M2');assert.deepEqual(d.creationProfiles,[]);assert.equal(d.changes.length,1);assert.equal(d.changes[0].data.creationPlan.classId,'COM');assert.equal((await f.check(2)).diff[0].operation,'EXCLUDED');
  assert.deepEqual(await f.saveCharacter(input),first);assert.equal((await f.view('M2')).changes[0].operation,'ARCHIVE');
  await f.saveCharacter({draftRevision:2,characterRevision:2,character:{...centralTestCharacter,relations:[]}});d=await f.view('M2');assert.equal(d.creationProfiles.length,1);assert.equal(d.changes[0].data.abilityProfile,undefined);assert.equal(d.history.length,3);
 });
 test(`${prefix} : M2 délégué, lecture seule et révocation avant réessai`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:[]});const input={character:character(),requestId:randomUUID()};await assert.rejects(f.saveCharacter(input,f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M2'],editWorkshops:['M2']});await f.saveCharacter(input,f.mj);assert.equal((await f.view('M2',f.mj)).creationProfiles[0].classId,'COM');await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});
  await f.grant({active:false,revision:2,readWorkshops:['M2'],editWorkshops:['M2']});await assert.rejects(f.saveCharacter(input,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.view('M2',f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : deux éditions concurrentes ne mélangent pas narration et choix de création`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter({character:character()});const outcomes=await Promise.allSettled([
   f.saveCharacter({draftRevision:1,characterRevision:1,character:character({biography:'Choix A',creationPlan:{...centralTestPlan,classId:'ROG'}})}),
   f.saveCharacter({draftRevision:1,characterRevision:1,character:character({biography:'Choix B',creationPlan:{...centralTestPlan,classId:'MEC'}})})]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');const c=(await f.view('M2')).changes[0];assert.equal(c.data.creationPlan.classId,c.data.biography==='Choix A'?'ROG':'MEC');assert.equal(c.data.contentRevision,2);
 });
 test(`${prefix} : catalogue et choix concurrents partagent la révision centrale`,async()=>{
  const f=await centralCheckFixture(makeStore);const outcomes=await Promise.allSettled([f.configure(),f.saveCharacter({character:character()})]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.view('M2')).draft.revision,1);
 });
 test(`${prefix} : catalogue étranger et historique ne résolvent pas l’espèce`,async()=>{
  const f=await centralCheckFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.cmd('saveAdmissionSettings',{sessionId:other.id,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Autre contexte'});
  await f.saveCharacter({character:character()});const r=await f.check(1);assert.equal(r.edges[0].status,'MISSING');assert.equal(r.diagnostics[0].reference,'species-test');
 });
 test(`${prefix} : plan stocké altéré et catalogue invalide bloqués par le contrôle commun`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.configure();await f.saveCharacter({draftRevision:1,character:character()});const c=await f.store.get(`${f.base}/changes/character_character`);
  for(const patch of [{schemaVersion:2},{ruleProfile:'other'},{classId:'PNJ_FORCE_SENSITIVE'},{secondaryId:'COM-03'},{level:5},{speciesId:'bad/path'}]){
   await f.inject(c.id,{data:{...c.data,creationPlan:{...c.data.creationPlan,...patch}}});const r=await f.check(2);assert.equal(r.totals.invalid,1);assert.ok(r.diagnostics.some(x=>x.code==='INVALID_RECORD'));assert.equal(r.diff.some(x=>x.type==='character'),false);
  }
  await f.inject(c.id,{data:c.data});await f.inject('speciesCatalogue_player',{data:[{...admissionTestSettings.species[0],bonus:2}]});const r=await f.check(2);assert.equal(r.edges[0].status,'INVALID');assert.ok(r.diagnostics.some(x=>x.code==='REFERENCE_INVALID'&&x.field==='creationPlan.speciesId'));
 });
 test(`${prefix} : contrôle sans dossiers, politique ni écriture, empreinte sensible au plan`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.configure();await f.saveCharacter({draftRevision:1,character:character()});const first=await f.check(2);await f.saveCharacter({draftRevision:2,characterRevision:1,character:character({creationPlan:{...centralTestPlan,secondaryId:'INF-02'}})});
  const run=f.store.runTransaction.bind(f.store),reads=[];f.store.runTransaction=fn=>run(tx=>fn({...tx,get:async p=>{reads.push(p);return tx.get(p);},list:async(...args)=>{reads.push(args[0]);return tx.list(...args);},set:()=>assert.fail('Lecture seule')}));
  const r=await f.check(3);assert.notEqual(r.fingerprint,first.fingerprint);assert.equal(r.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(r),/Secret de fiction|Biographie fictive|friends|email/);assert.ok(reads.every(p=>[f.base,`${f.base}/changes`,`campaigns/${f.cid}`,`sessions/${f.sid}`].includes(p)));
 });
}
