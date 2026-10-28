import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admissionFixture,admissionTestSettings,admissionTestProposal} from './admissions-suite.mjs';
import {hash} from '../../src/core/workflow.mjs';
import {admissionIdentity} from '../../src/core/admission-state.mjs';

const reg=(f,actor=f.player)=>`sessions/${f.sid}/registrations/${hash(actor.uid)}`;
const record=(f,actor)=>f.store.get(reg(f,actor));
async function submit(f,actor=f.player,patch={}){
 const token=await f.issue(),view=await f.read('admissionInvitation',actor,{token});
 await f.begin(token,actor,{sessionRevision:view.sessionRevision,policyRevision:view.policyRevision,draftRevision:view.draftRevision});
 const own=await f.read('myAdmission',actor);
 await f.save({revision:own.revision,sessionRevision:own.sessionRevision,policyRevision:own.policyRevision,draftRevision:own.draftRevision,proposal:{...admissionTestProposal,...patch}},actor);
}
async function review(f,actor=f.player,decision='APPROVE',extra={},mj=f.owner){
 const [r,admin]=await Promise.all([record(f,actor),f.read('admissionAdmin')]);
 return f.cmd('reviewAdmission',{uid:actor.uid,revision:r.admission.revision,policyRevision:admin.policyRevision,draftRevision:admin.draftRevision,decision,reason:'Décision de recette',...extra},mj);
}
async function withdraw(f,actor=f.player,extra={}){const r=await record(f,actor);return f.cmd('withdrawAdmission',{revision:r.admission.revision,reason:'Retrait de recette',...extra},actor);}
async function setup(makeStore,quotas={}){const f=await admissionFixture(makeStore);await f.configure({...admissionTestSettings,quotas:{...admissionTestSettings.quotas,...quotas}});return f;}
async function capacity(f,n){const s=await f.read('session');return f.cmd('saveSpaceOutlawsPreparation',{...Object.fromEntries(['title','summary','date','time','place','practical','privacy'].map(k=>[k,s[k]])),revision:s.revision,capacity:n,reason:'Capacité de recette'});}
async function counts(f,total,patch={}){const admin=await f.read('admissionAdmin');assert.equal(admin.accepted,total);assert.equal(Object.values(admin.byClass).reduce((a,b)=>a+b,0),total);for(const [c,n] of Object.entries(patch))assert.equal(admin.byClass[c],n);}

export function admissionReviewsSuite(makeStore,prefix='Décisions SO'){
 test(`${prefix} : approbation idempotente, identité réservée et aucune dotation`,async()=>{
  const f=await setup(makeStore);await submit(f);const requestId=randomUUID(),input={uid:f.player.uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation',requestId};
  const [a,b]=await Promise.all([f.cmd('reviewAdmission',input),f.cmd('reviewAdmission',input)]);assert.deepEqual(a,b);assert.equal(a.status,'APPROVED');
  await assert.rejects(f.cmd('reviewAdmission',{...input,requestId:randomUUID()}),{code:'STALE_REVISION'});
  await assert.rejects(review(f),{code:'ADMISSION_LOCKED'});await counts(f,1,{COM:1});
  const r=await record(f);assert.equal(r.status,'RECEIVED');assert.equal(r.characterId,null);assert.equal(r.accessActive,false);assert.equal(r.admission.confirmation.exception,false);
  for(const type of ['characters','inventory','accounts','groups','actionPoints','knowledge','ledger'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${type}`),[]);
  assert.equal((await f.store.list(`campaigns/${f.campaignId}/masterDrafts/initial/changes`)).length,1);
  assert.equal((await f.store.list(`${reg(f)}/history`)).length,2);assert.equal((await f.read('myAdmission',f.player)).editable,false);
 });
 test(`${prefix} : deux MJ et dernière place de classe donnent un confirmé et une attente`,async()=>{
  const f=await setup(makeStore,{COM:1});await f.cmd('setStaff',{revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Test'});
  await submit(f);await submit(f,f.other,{firstName:'Bela'});
  const results=await Promise.all([review(f),review(f,f.other,'APPROVE',{},f.mj)]);assert.deepEqual(results.map(r=>r.status).sort(),['APPROVED','WAITLISTED']);
  assert.equal(results.find(r=>r.status==='WAITLISTED').waitReason,'CLASS_FULL');await counts(f,1,{COM:1});
  assert.equal((await f.store.list(`sessions/${f.sid}/admissionIdentities`)).filter(x=>x.active).length,1);
 });
 test(`${prefix} : dernière place globale contrôlée entre classes différentes`,async()=>{
  const f=await setup(makeStore);await capacity(f,2);await submit(f);await submit(f,f.other,{classId:'ROG',firstName:'Bela'});await capacity(f,1);
  const results=await Promise.all([review(f),review(f,f.other)]);assert.deepEqual(results.map(r=>r.status).sort(),['APPROVED','WAITLISTED']);assert.equal(results.find(r=>r.status==='WAITLISTED').waitReason,'SESSION_FULL');await counts(f,1);
 });
 test(`${prefix} : identité fictive normalisée unique, collision concurrente sans fuite au joueur`,async()=>{
  const f=await setup(makeStore);await submit(f,f.player,{firstName:'Éli',lastName:'D’Arc'});await submit(f,f.other,{firstName:'  ELI ',lastName:"D'Arc"});
  assert.ok((await f.read('admissionAdmin')).registrations.every(r=>r.identityConflict));
  const results=await Promise.allSettled([review(f),review(f,f.other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'ADMISSION_IDENTITY_TAKEN');
  await counts(f,1);const mine=JSON.stringify(await f.read('myAdmission',f.player));assert.ok(!mine.includes(f.other.uid)&&!mine.includes(f.other.email));
  assert.equal(admissionIdentity({firstName:'Anne–Lee',lastName:' Test '}),admissionIdentity({firstName:'Anne-Lee',lastName:'Test'}));
 });
 test(`${prefix} : retrait expiré libère une seule place et promotion uniquement explicite`,async()=>{
  const f=await setup(makeStore,{COM:1});await submit(f);await submit(f,f.other,{firstName:'Bela'});await review(f);await review(f,f.other);
  f.time(4600000);const r=await record(f),requestId=randomUUID(),input={revision:r.admission.revision,reason:'Retrait',requestId};
  const a=await f.cmd('withdrawAdmission',input,f.player);assert.deepEqual(await f.cmd('withdrawAdmission',input,f.player),a);await withdraw(f);await counts(f,0,{COM:0});
  assert.equal((await record(f,f.other)).admission.status,'WAITLISTED');await review(f,f.other);await counts(f,1,{COM:1});
 });
 test(`${prefix} : correction et refus conservent versions, resoumission du même participant`,async()=>{
  const f=await setup(makeStore);await submit(f);await review(f,f.player,'CORRECT');await assert.rejects(review(f),{code:'ADMISSION_LOCKED'});
  await submit(f,f.player,{background:'Correction privée'});await review(f,f.player,'REFUSE');await submit(f,f.player,{background:'Nouvelle proposition'});await review(f);await counts(f,1);
  const history=await f.read('admissionHistory',f.player);assert.deepEqual(history.versions.map(v=>v.status),['SUBMITTED','CORRECTION','SUBMITTED','REFUSED','SUBMITTED','APPROVED']);
  assert.equal(history.versions[0].proposal.background,admissionTestProposal.background);assert.equal((await f.store.list(`sessions/${f.sid}/registrations`)).length,1);
 });
 test(`${prefix} : dossier confirmé verrouillé, retrait puis nouvelle proposition sans réservation`,async()=>{
  const f=await setup(makeStore);await submit(f);await review(f);const own=await f.read('myAdmission',f.player);
  await assert.rejects(f.save({revision:own.revision,sessionRevision:own.sessionRevision}),{code:'ADMISSION_LOCKED'});
  const token=await f.issue();await assert.rejects(f.begin(token,f.player,{sessionRevision:own.sessionRevision}),{code:'ADMISSION_LOCKED'});
  await withdraw(f);await submit(f,f.player,{firstName:'Nouveau'});await counts(f,0);await review(f);await counts(f,1);
 });
 test(`${prefix} : changement de classe atomique, quota plein sans perte de confirmation`,async()=>{
  const f=await setup(makeStore,{COM:1,ROG:1});await submit(f);await submit(f,f.other,{firstName:'Bela',classId:'ROG'});await review(f);await review(f,f.other);
  await assert.rejects(review(f,f.player,'CHANGE_CLASS',{classId:'ROG',secondaryId:'MED-02'}),{code:'ADMISSION_QUOTA_FULL'});await counts(f,2,{COM:1,ROG:1});assert.equal((await record(f)).admission.proposal.classId,'COM');
  await withdraw(f,f.other);await review(f,f.player,'CHANGE_CLASS',{classId:'ROG',secondaryId:'MED-02'});await counts(f,1,{COM:0,ROG:1});assert.equal((await record(f)).admission.proposal.classId,'ROG');
 });
 test(`${prefix} : exceptions explicites motivées, sans ouvrir classe fermée ni pouvoirs PNJ`,async()=>{
  const f=await setup(makeStore,{COM:1,ROG:1,PIL:0});await submit(f);await submit(f,f.other,{firstName:'Bela'});await capacity(f,1);await review(f);
  await assert.rejects(review(f,f.other,'OVERRIDE_APPROVE',{reason:' '}),{code:'INVALID_ADMISSION'});
  await review(f,f.other,'OVERRIDE_APPROVE',{reason:'Exception documentée'});await counts(f,2,{COM:2});assert.equal((await record(f,f.other)).admission.confirmation.exceptionReason,'Exception documentée');
  for(const cl of ['PIL','PNJ_FORCE_SENSITIVE','JEDI','SITH'])await assert.rejects(review(f,f.player,'OVERRIDE_CHANGE_CLASS',{classId:cl,secondaryId:'MED-02'}),e=>['INVALID_ADMISSION','INVALID_ADMISSION_CHOICE'].includes(e.code));
  await review(f,f.player,'OVERRIDE_CHANGE_CLASS',{classId:'ROG',secondaryId:'MED-02'});await counts(f,2,{COM:1,ROG:1});
  // Unchanged limits remain editable after an explicit overbooking.
  await f.configure({...admissionTestSettings,quotas:{...admissionTestSettings.quotas,COM:1,ROG:1,PIL:0}},1,1);await capacity(f,1);
 });
 test(`${prefix} : baisse de maxima sous confirmations refusée sans altérer les paramètres`,async()=>{
  const f=await setup(makeStore);await submit(f);await submit(f,f.other,{firstName:'Bela'});await review(f);await review(f,f.other);
  await assert.rejects(f.configure({...admissionTestSettings,quotas:{...admissionTestSettings.quotas,COM:1}},1,1),{code:'ADMISSION_QUOTA_BELOW_CONFIRMED'});
  await assert.rejects(capacity(f,1),{code:'ADMISSION_QUOTA_BELOW_CONFIRMED'});await counts(f,2,{COM:2});assert.equal((await f.read('admissionAdmin')).settings.quotas.COM,2);
 });
 test(`${prefix} : course quota/approbation reste cohérente et exige actualisation du MJ`,async()=>{
  const f=await setup(makeStore);await submit(f);const payload={uid:f.player.uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Test'};
  const results=await Promise.allSettled([f.cmd('reviewAdmission',payload),f.configure({...admissionTestSettings,quotas:{...admissionTestSettings.quotas,COM:0}},1,1)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.ok(['STALE_REVISION','ADMISSION_QUOTA_BELOW_CONFIRMED'].includes(results.find(x=>x.status==='rejected').reason.code));
  const a=await f.read('admissionAdmin');assert.ok(a.byClass.COM<=a.settings.quotas.COM);
 });
 test(`${prefix} : consignes et espèces courantes revérifiées, ancien consentement jamais inventé`,async()=>{
  const f=await setup(makeStore);await submit(f);await f.configure({...admissionTestSettings,instructions:'Nouvelles consignes'},1,1);
  await assert.rejects(review(f),{code:'ADMISSION_CONSENT_STALE'});await submit(f);await f.configure({...admissionTestSettings,instructions:'Nouvelles consignes',species:admissionTestSettings.species.map(s=>({...s,available:s.id!=='species-test'}))},2,2);
  await assert.rejects(review(f),{code:'INVALID_ADMISSION_CHOICE'});await counts(f,0);
  await f.configure({...admissionTestSettings,instructions:'Nouvelles consignes'},3,3);
  await f.store.runTransaction(async tx=>{const r=await tx.get(reg(f));delete r.admission.consentHash;tx.set(reg(f),r);});
  await assert.rejects(review(f),{code:'ADMISSION_CONSENT_STALE'});await submit(f);await review(f);await counts(f,1);
 });
 test(`${prefix} : rôles courants, révocation avant reçu et aucun accès à un autre dossier`,async()=>{
  const f=await setup(makeStore);await submit(f);await f.cmd('setStaff',{revision:1,email:f.mj.email,role:'RECEPTION',active:true,reason:'Test'});
  for(const actor of [f.player,f.other,f.mj]){await assert.rejects(review(f,f.player,'APPROVE',{},actor),{code:'FORBIDDEN'});await assert.rejects(f.read('admissionHistory',actor,{uid:f.player.uid}),{code:'FORBIDDEN'});}
  await assert.rejects(f.cmd('withdrawAdmission',{revision:2,reason:'Autre'},f.other),{code:'FORBIDDEN'});
  await f.cmd('setStaff',{revision:2,email:f.mj.email,role:'MJ',active:true,reason:'Test'});
  const input={uid:f.player.uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation',requestId:randomUUID()};await f.cmd('reviewAdmission',input,f.mj);
  await f.cmd('setStaff',{revision:4,email:f.mj.email,role:'MJ',active:false,reason:'Retrait'});
  await assert.rejects(f.cmd('reviewAdmission',input,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : interruption avant commit puis réponse perdue, aucune version partielle`,async()=>{
  const raw=makeStore();let fail=false;const f=await setup(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail){fail=false;throw Error('TEST_INTERRUPTION');}return result;})}));
  await submit(f);const payload={uid:f.player.uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Test',requestId:randomUUID()};fail=true;
  await assert.rejects(f.cmd('reviewAdmission',payload),/TEST_INTERRUPTION/);await counts(f,0);assert.equal((await record(f)).admission.status,'SUBMITTED');assert.deepEqual(await raw.list(`sessions/${f.sid}/admissionIdentities`),[]);
  const result=await f.cmd('reviewAdmission',payload);assert.deepEqual(await f.cmd('reviewAdmission',payload),result);await counts(f,1);assert.equal((await raw.list(`${reg(f)}/history`)).length,2);
 });
 test(`${prefix} : ancien reçu rejoué après retrait ne confirme pas de nouveau`,async()=>{
  const f=await setup(makeStore);await submit(f);const payload={uid:f.player.uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Test',requestId:randomUUID()};const old=await f.cmd('reviewAdmission',payload);await withdraw(f);
  assert.deepEqual(await f.cmd('reviewAdmission',payload),old);await counts(f,0);assert.equal((await record(f)).admission.status,'WITHDRAWN');
 });
 test(`${prefix} : notification et historique personnels sans empreinte de lien ni identité MJ`,async()=>{
  const f=await setup(makeStore);await submit(f);await review(f,f.player,'CORRECT',{reason:'Compléter le récit'});
  let own=await f.read('myAdmission',f.player);assert.equal(own.decision.reason,'Compléter le récit');assert.equal(own.decisionReadRevision,0);
  const req={noticeRevision:own.decision.revision,requestId:randomUUID()};await f.cmd('acknowledgeAdmissionDecision',req,f.player);await f.cmd('acknowledgeAdmissionDecision',req,f.player);
  own=await f.read('myAdmission',f.player);assert.equal(own.decisionReadRevision,own.decision.revision);assert.equal(own.revision,3);
  const h=await f.read('admissionHistory',f.player);assert.doesNotMatch(JSON.stringify(h),/actorUid|invitationHash|identityKey|consentHash|exceptionReason/);assert.ok(!JSON.stringify(h).includes(f.owner.uid));
  assert.equal((await f.read('admissionHistory',f.owner,{uid:f.player.uid})).versions[1].actorUid,f.owner.uid);
  await assert.rejects(f.cmd('acknowledgeAdmissionDecision',{noticeRevision:2},f.player),{code:'STALE_REVISION'});
 });
 test(`${prefix} : injections et comptage corrompu échouent sans mutation`,async()=>{
  const f=await setup(makeStore);await submit(f);
  for(const extra of [{credits:200},{override:true},{classId:'COM'},{characterId:'fake'},{decision:'FORCE_APPROVE'}])await assert.rejects(review(f,f.player,'APPROVE',extra),{code:'INVALID_ADMISSION'});
  await f.store.runTransaction(async tx=>{const s=await tx.get(`sessions/${f.sid}`);tx.set(`sessions/${f.sid}`,{...s,accepted:1});});
  await assert.rejects(f.cmd('reviewAdmission',{uid:f.player.uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Test'}),{code:'ADMISSION_ACCOUNTING_CONFLICT'});assert.equal((await record(f)).admission.status,'SUBMITTED');
 });
 test(`${prefix} : libération de l’identité, correction et isolation entre sessions`,async()=>{
  const f=await setup(makeStore);await submit(f);await submit(f,f.other);await review(f);await review(f,f.player,'CORRECT');await counts(f,0);await review(f,f.other);await counts(f,1);
  const other=await setup(makeStore);await submit(other);await review(other);await counts(other,1);
 });
}
