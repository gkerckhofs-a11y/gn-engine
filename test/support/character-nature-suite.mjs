import test from 'node:test';
import assert from 'node:assert/strict';
import {masterFixture,masterExample} from './masters-suite.mjs';
import {healthFixture} from './health-suite.mjs';
import {personFixture} from './person-suite.mjs';
import {cleanScenarioSnapshot} from '../../src/core/scenario-package.mjs';
import {participantCharacter,publicCharacter} from '../../src/core/projections.mjs';
import {moduleMasterSheets} from '../../web/master-editor.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {terrainMasterExample} from '../../src/shared/master-examples.mjs';

// Isolated, synthetic fixture data only; production changes use the authenticated APIs.
const seedNature=(store,path,nature)=>store.runTransaction(async tx=>{
 const c=await tx.get(path);tx.set(path,{...c,nature});
});
export function characterNatureSuite(makeStore,prefix='SO-01a natures'){
 test(`${prefix} : filtres des protocoles importés, exportés et archivés sans altérer le pillage`,async()=>{
  const f=await masterFixture(makeStore),sheets=terrainMasterExample();
  sheets.Competences[0].nature_patient='HUMANOID';sheets.Interactions[0].nature_patient='DROID';await f.apply(sheets);
  for(const sheet of ['Competences','Interactions']){
   const w=await f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet});
   const roundtrip=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));
   assert.equal(roundtrip[sheet].find(r=>r.id===sheets[sheet][0].id).nature_patient,sheets[sheet][0].nature_patient);await f.apply(roundtrip);
  }
  const parent=await f.read('scenario',{scenarioId:f.scenarioId}),records={};
  for(const k of ['characters','groups','knowledge','skills','classes','items','fieldTargets','personProfiles'])records[k]=await f.store.list(`scenarios/${f.scenarioId}/${k}`);
  const clean=cleanScenarioSnapshot({scenario:parent,records});assert.equal(clean.records.skills.find(s=>s.id==='medecine').healing.patientNature,'HUMANOID');
  assert.equal(clean.records.personProfiles.find(p=>p.id==='soin-terrain').patientNature,'DROID');
  const bad={Meta:sheets.Meta,Interactions:[{id:'pillage-ordinaire',operation:'MODIFIER',version:'20',nature_patient:'DROID'}]};
  assert.equal((await f.prepare(bad)).canApply,false);
  const clear={Meta:sheets.Meta,Interactions:[{id:'soin-terrain',operation:'MODIFIER',version:'21',nature_patient:'!EFFACER'}]};await f.apply(clear);
  assert.equal((await f.store.get(`scenarios/${f.scenarioId}/personProfiles/soin-terrain`)).patientNature,null);
 });
 test(`${prefix} : ancien client conserve la restriction lors d’une édition de protocole`,async()=>{
  const f=await personFixture(makeStore),p=await f.savePerson('FIELD_CARE',{patientNature:'DROID'}),old=await f.store.get(`sessions/${f.sid}/personProfiles/${p.id}`);
  const {patientNature,...legacy}=old;
  await f.q('savePersonProfile',{profileId:p.id,revision:old.revision,profile:{...legacy,name:'Libellé ajusté'},reason:'Client historique'},f.owner);
  assert.equal((await f.store.get(`sessions/${f.sid}/personProfiles/${p.id}`)).patientNature,'DROID');
  await assert.rejects(f.q('savePersonProfile',{profile:{...old,patientNature:'FORCE'},reason:'Invalide'},f.owner),{code:'INVALID_CHARACTER_NATURE'});
  await assert.rejects(f.q('savePersonProfile',{profile:old,reason:'Usurpation'},f.alice),{code:'FORBIDDEN'});
 });
 test(`${prefix} : création, publication et XLSX préservent la nature sans changer les anciens Masters`,async()=>{
  const f=await masterFixture(makeStore),sheets=masterExample();
  sheets.Personnages[0].nature='DROID';await f.apply(sheets);assert.equal((await f.apply(sheets)).unchanged,true);
  const id=sheets.Personnages[0].id,view=await f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages'});
  const exported=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(view)));
  assert.equal(exported.Personnages.find(c=>c.id===id).nature,'DROID');await f.apply(exported);
  const s=await f.session(),c=await f.store.get(`sessions/${s.id}/characters/${id}`);
  assert.equal(c.nature,'DROID');assert.equal(Object.hasOwn(publicCharacter(c),'nature'),false);
  assert.equal(participantCharacter(c,{active:true,uid:'synthetic',characterId:id,sessionId:s.id},'synthetic').nature,'DROID');
  const row={id,operation:'MODIFIER',version:'9',nature:'HUMANOID'};
  const meta=[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:s.campaignId}];
  const p=await f.read('prepareMasterImport',{sessionId:s.id,sheets:{Meta:meta,Personnages:[row]},reason:'Test de conservation'});
  assert.equal(p.canApply,false);assert.ok(p.errors.some(e=>e.message==='CHARACTER_NATURE_LOCKED'));
  assert.equal((await f.store.get(`sessions/${s.id}/characters/${id}`)).nature,'DROID');
 });
 test(`${prefix} : valeur absente historique conservée, colonne vide compatible avec le reçu ancien`,async()=>{
  const f=await masterFixture(makeStore),sheets=masterExample();await f.apply(sheets);
  sheets.Personnages.forEach(c=>c.nature='');sheets.Competences.forEach(c=>c.nature_patient='');
  assert.equal((await f.apply(sheets)).unchanged,true);
  for(const c of await f.store.list(`scenarios/${f.scenarioId}/characters`))assert.equal(Object.hasOwn(c,'nature'),false);
  sheets.Personnages[0].nature='JEDI';sheets.Personnages[0].version='2';
  assert.equal((await f.prepare(sheets)).canApply,false);
 });
 test(`${prefix} : édition autorisée du scénario, session figée, archive et historique privés`,async()=>{
  const f=await masterFixture(makeStore);
  const save=async(nature,who=f.owner)=>f.cmd('saveCharacter',{scenarioId:f.scenarioId,revision:(await f.read('scenario',{scenarioId:f.scenarioId})).revision,displayName:'Couverture',publicationState:'PUBLISHED',nature},who);
  await assert.rejects(save('DROID',f.player),{code:'FORBIDDEN'});
  for(const value of ['SITH',['DROID'],{},42])await assert.rejects(save(value),{code:'INVALID_CHARACTER_NATURE'});
  const {id}=await save('HUMANOID'),sc=await f.read('scenario',{scenarioId:f.scenarioId});
  const records=Object.fromEntries(['characters','groups','knowledge','skills','classes','items','personProfiles'].map(k=>[k,sc[k]??[]]));
  assert.equal(cleanScenarioSnapshot({scenario:sc,records}).records.characters[0].nature,'HUMANOID');
  const s=await f.session();await assert.rejects(f.cmd('saveSessionCharacter',{sessionId:s.id,characterId:id,revision:1,displayName:'Couverture',publicationState:'PUBLISHED',nature:'DROID',reason:'Changer'}),{code:'CHARACTER_NATURE_LOCKED'});
  const history=await f.read('characterHistory',{sessionId:s.id,characterId:id});assert.equal(history.versions[0].character.nature,'HUMANOID');
 });
 test(`${prefix} : soins temporisés refusés avant réserve pour nature incompatible ou inconnue`,async()=>{
  const f=await personFixture(makeStore),p=await f.savePerson('FIELD_CARE',{patientNature:'HUMANOID'});
  for(const nature of [null,'DROID']){
   await seedNature(f.store,`sessions/${f.sid}/characters/${f.characters[1]}`,nature);
   const lots=await f.lot(f.kl.id),points=await f.personPoints(0);
   assert.ok(!(await f.r('personTarget',{targetId:f.characters[1]})).profiles.some(x=>x.id===p.id));
   await assert.rejects(f.startPerson(p,{patientNature:'HUMANOID',nature:'HUMANOID'}),{code:'PATIENT_NATURE_MISMATCH'});
   assert.deepEqual(await f.lot(f.kl.id),lots);assert.deepEqual(await f.personPoints(0),points);
  }
 });
 test(`${prefix} : praticien droïde, patient humanoïde, concurrence et consommation uniques`,async()=>{
  const f=await personFixture(makeStore),p=await f.savePerson('FIELD_CARE',{patientNature:'HUMANOID'});
  await seedNature(f.store,`sessions/${f.sid}/characters/${f.characters[0]}`,'DROID');
  await seedNature(f.store,`sessions/${f.sid}/characters/${f.characters[1]}`,'HUMANOID');
  const plan=await f.preparePerson(p),input={profileId:p.id,targetId:f.characters[1],supplyLots:f.supplyLots,confirmation:plan.confirmation,present:true};
  const starts=await Promise.allSettled([f.q('startPersonAction',input),f.q('startPersonAction',input)]);
  assert.equal(starts.filter(x=>x.status==='fulfilled').length,1);const a=starts.find(x=>x.status==='fulfilled').value;
  f.advance(10000);const result=await f.finishPerson(a,{requestId:'nature-finish'});
  assert.deepEqual(await f.finishPerson(a,{requestId:'nature-finish'}),result);
  assert.equal((await f.char(1)).hp,1);assert.equal((await f.lot(f.kl.id)).quantity,4);assert.equal((await f.personPoints(0)).available,4);
  await f.close();await f.resume(await f.begin());assert.equal((await f.char(0)).nature,'DROID');assert.equal((await f.char(1)).nature,'HUMANOID');
  assert.equal((await f.store.get(`sessions/${f.sid}/personProfiles/${p.id}`)).patientNature,'HUMANOID');
 });
 test(`${prefix} : clinique de droïde utilise le protocole réservé, l’action garde sa version`,async()=>{
  const f=await personFixture(makeStore),p=await f.savePerson('CLINIC_SAFE',{patientNature:'DROID'});
  await seedNature(f.store,`sessions/${f.sid}/characters/${f.characters[1]}`,'DROID');const a=await f.startPerson(p);
  const old=await f.store.get(`sessions/${f.sid}/personProfiles/${p.id}`);
  await f.q('savePersonProfile',{profileId:p.id,revision:old.revision,profile:{...old,patientNature:'HUMANOID'},reason:'Prochaine version'},f.owner);
  f.advance(10000);await f.finishPerson(a);assert.equal((await f.char(1)).hp,10);
  assert.equal((await f.store.get(`sessions/${f.sid}/personActions/${a.id}`)).profile.patientNature,'DROID');
 });
 test(`${prefix} : soins instantanés contrôlés côté serveur et profil publié indépendant du catalogue`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(f.bob,6);
  const saved=(await f.session()).skills.find(s=>s.id===f.skills[0]);
  await f.cmd('saveSessionSkill',f.owner,{...saved,id:saved.id,sessionId:f.sessionId,revision:(await f.session()).revision,healing:{...saved.healing,patientNature:'DROID'},reason:'Réparation'});
  await f.republish(f.characters[0]);
  await assert.rejects(f.prepare(f.alice,f.characters[1],f.skills[0],{patientNature:'DROID',nature:'DROID'}),{code:'PATIENT_NATURE_MISMATCH'});
  await seedNature(f.store,`sessions/${f.sessionId}/characters/${f.characters[1]}`,'HUMANOID');
  await assert.rejects(f.prepare(),{code:'PATIENT_NATURE_MISMATCH'});
  await seedNature(f.store,`sessions/${f.sessionId}/characters/${f.characters[1]}`,'DROID');
  const p=await f.prepare(),done=await f.treat(p,f.alice,{requestId:'repair-once'});
  assert.deepEqual(await f.treat(p,f.alice,{requestId:'repair-once'}),done);assert.equal((await f.view(f.bob)).health.hp,7);
  const badge=await f.read('publicBadge',null,{sessionId:f.sessionId,characterId:f.characters[1]});assert.equal(Object.hasOwn(badge,'nature'),false);
 });
 test(`${prefix} : patient retesté à la résolution, correction anormale n’entraîne aucun débit`,async()=>{
  const f=await personFixture(makeStore),p=await f.savePerson('FIELD_CARE',{patientNature:'DROID'});
  await seedNature(f.store,`sessions/${f.sid}/characters/${f.characters[1]}`,'DROID');const a=await f.startPerson(p);f.advance(10000);
  await seedNature(f.store,`sessions/${f.sid}/characters/${f.characters[1]}`,'HUMANOID');
  await assert.rejects(f.finishPerson(a),{code:'PATIENT_NATURE_MISMATCH'});assert.equal((await f.lot(f.kl.id)).quantity,5);
  await f.cancelPerson(a);assert.equal((await f.personPoints(0)).reserved,0);assert.equal((await f.char(1)).hp,0);
 });
}
