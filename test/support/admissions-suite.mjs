import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {preparationFixture} from './preparations-suite.mjs';
import {createWorkflow,hash} from '../../src/core/workflow.mjs';
import {admissionClasses} from '../../src/shared/admission-rules.mjs';

export const admissionTestSettings={open:true,instructions:'Règles fictives de recette',quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,2])),species:[{id:'species-test',label:'Espèce synthétique',description:'Aucun bonus',nature:'HUMANOID',available:true},{id:'droid-test',label:'Droïde de test',description:'Aucun bonus',nature:'DROID',available:true}]};
export const admissionTestProposal={firstName:'Ari',lastName:'Test',speciesId:'species-test',classId:'COM',secondaryId:'MED-02',background:'Récit fictif privé',friends:'Souhait privé sans mandat'};
export async function admissionFixture(makeStore){
 const f=preparationFixture(makeStore),created=await f.create();let at=1000000;
 const workflow=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>at});
 const read=(action,actor=f.owner,input={})=>workflow.dispatch(action,actor,{sessionId:created.id,...input});
 const cmd=(action,input={},actor=f.owner)=>read(action,actor,{requestId:randomUUID(),...input});
 const configure=(settings=admissionTestSettings,policyRevision=0,draftRevision=0,actor=f.owner)=>cmd('saveAdmissionSettings',{settings,policyRevision,draftRevision,reason:'Paramétrage fictif'},actor);
 const issue=async(maxUses=2)=>{const token=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{tokenHash:hash(token),hours:1,maxUses,label:'Recette'});return token;};
 const begin=(token,actor=f.player,extra={})=>cmd('beginAdmission',{token,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true,...extra},actor);
 const save=(extra={},actor=f.player)=>cmd('saveAdmissionProposal',{revision:1,sessionRevision:1,policyRevision:1,draftRevision:1,proposal:admissionTestProposal,submit:true,consent:true,...extra},actor);
 const other={...f.player,uid:randomUUID(),email:`other-${randomUUID()}@example.invalid`};
 return {...f,...created,sid:created.id,read,cmd,configure,issue,begin,save,other,time:value=>{at=value;}};
}
export function admissionsSuite(makeStore,prefix='Admissions SO'){
 test(`${prefix} : configuration centrale, proposition privée et zéro ressource créée`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();
  const context=await f.read('admissionInvitation',f.player,{token});assert.equal(context.classes.length,8);assert.equal(context.secondaryChoices.length,8);assert.equal(context.proposal,null);
  assert.doesNotMatch(JSON.stringify(context),/FOR-01|JEDI|SITH|PNJ_FORCE/);
  await f.begin(token);const result=await f.save();assert.equal(result.status,'SUBMITTED');
  const own=await f.read('myAdmission',f.player);assert.equal(own.proposal.nature,'HUMANOID');assert.equal(own.proposal.secondaryLevel,1);
  const reg=await f.store.get(`sessions/${f.sid}/registrations/${hash(f.player.uid)}`);assert.equal(reg.status,'RECEIVED');assert.equal(reg.characterId,null);assert.equal(reg.accessActive,false);
  const session=await f.read('session');assert.equal(session.accepted,0);assert.equal(session.registrationOpen,false);assert.equal(session.versionId,null);
  for(const type of ['characters','inventory','accounts','groups','actionPoints','knowledge','ledger'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${type}`),[]);
  const c=await f.store.get(`campaigns/${f.campaignId}`);assert.equal(c.master.activeVersionId,null);assert.equal(c.episodeCount,0);
  assert.deepEqual((await f.store.get(`campaigns/${f.campaignId}/masterDrafts/initial/changes/speciesCatalogue_player`)).data,admissionTestSettings.species);
  assert.equal('species' in await f.store.get(`sessions/${f.sid}/admission/settings`),false);
 });
 test(`${prefix} : authentification, cloisonnement des UID et accueil sans dossier`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);await f.save();
  await assert.rejects(f.read('admissionInvitation',null,{token}),{code:'LOGIN_REQUIRED'});
  await assert.rejects(f.read('admissionInvitation',{...f.player,emailVerified:false},{token}),{code:'LOGIN_REQUIRED'});
  await assert.rejects(f.read('myAdmission',f.other,{uid:f.player.uid}),{code:'FORBIDDEN'});
  await assert.rejects(f.read('admissionAdmin',f.player),{code:'FORBIDDEN'});
  await f.cmd('setStaff',{revision:1,email:f.mj.email,role:'RECEPTION',active:true,reason:'Test'});
  assert.deepEqual((await f.read('session',f.mj)).registrations,[]);await assert.rejects(f.read('admissionAdmin',f.mj),{code:'FORBIDDEN'});
  assert.equal((await f.read('admissionAdmin')).registrations[0].admission.proposal.friends,admissionTestProposal.friends);
  await assert.rejects(f.read('publicSession',null),{code:'NOT_FOUND'});await assert.rejects(f.read('mySession',f.player),{code:'NOT_FOUND'});
 });
 test(`${prefix} : dernier usage atomique entre deux comptes, réessais du gagnant sans doublon`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue(1);
  const outcomes=await Promise.allSettled([f.begin(token,f.player),f.begin(token,f.other)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'ADMISSION_LINK_FULL');
  const winner=outcomes[0].status==='fulfilled'?f.player:f.other;await Promise.all([f.begin(token,winner),f.begin(token,winner)]);
  assert.equal((await f.store.get(`invitations/${hash(token)}`)).uses,1);assert.equal((await f.store.list(`sessions/${f.sid}/registrations`)).length,1);
 });
 test(`${prefix} : réponse perdue après enregistrement, mêmes reçus et historique unique`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);
  const payload={requestId:randomUUID()},a=await f.save(payload);assert.deepEqual(await f.save(payload),a);
  assert.equal((await f.store.list(`sessions/${f.sid}/registrations/${hash(f.player.uid)}/history`)).length,1);
  await assert.rejects(f.save({...payload,proposal:{...admissionTestProposal,lastName:'Autre'}}),{code:'REQUEST_ID_REUSED'});
 });
 test(`${prefix} : modifications concurrentes sans mélange des dossiers ou paramètres`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);
  const outcomes=await Promise.allSettled([f.save(),f.save({proposal:{...admissionTestProposal,firstName:'Deux',background:'Deux'}})]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  const p=(await f.read('myAdmission',f.player)).proposal;assert.ok(p.firstName==='Ari'?p.background===admissionTestProposal.background:p.background==='Deux');
  const configs=await Promise.allSettled([f.configure({...admissionTestSettings,instructions:'A'},1,1),f.configure({...admissionTestSettings,instructions:'B'},1,1)]);
  assert.equal(configs.filter(x=>x.status==='fulfilled').length,1);assert.equal(configs.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  await assert.rejects(f.save({revision:2}),{code:'STALE_REVISION'});
 });
 test(`${prefix} : expiration et révocation bloquent nouveaux usages et modifications, dossier conservé`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);const req={requestId:randomUUID()};await f.save(req);
  f.time(4600000);await assert.rejects(f.begin(token),{code:'INVITATION_EXPIRED_OR_USED'});await assert.rejects(f.save(req),{code:'ADMISSION_CLOSED'});assert.equal((await f.read('myAdmission',f.player)).editable,false);
  const next=await f.issue();await f.begin(next);assert.equal((await f.read('myAdmission',f.player)).editable,true);
  await f.cmd('revokeAdmissionInvitation',{invitationId:hash(next),reason:'Retrait de lien'});await assert.rejects(f.begin(next,f.other),{code:'INVITATION_EXPIRED_OR_USED'});
  assert.equal((await f.read('myAdmission',f.player)).status,'SUBMITTED');assert.equal((await f.store.list(`sessions/${f.sid}/registrations`)).length,1);
 });
 test(`${prefix} : MJ courant autorisé, révocation vérifiée avant résultat idempotent`,async()=>{
  const f=await admissionFixture(makeStore);await f.cmd('setStaff',{revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Test'});
  await f.configure(admissionTestSettings,0,0,f.mj);const token=randomBytes(32).toString('base64url');
  const p={requestId:randomUUID(),tokenHash:hash(token),hours:1,maxUses:1,label:'MJ'};await f.cmd('issueAdmissionInvitation',p,f.mj);
  await f.cmd('setStaff',{revision:2,email:f.mj.email,role:'MJ',active:false,reason:'Retrait'});await assert.rejects(f.cmd('issueAdmissionInvitation',p,f.mj),{code:'FORBIDDEN'});
  await assert.rejects(f.configure(admissionTestSettings,1,1,f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : Force, initiation de même classe, nature et ressources injectées refusées`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);
  for(const patch of [{classId:'PNJ_FORCE_SENSITIVE'},{classId:'JEDI'},{secondaryId:'FOR-01'},{secondaryId:'LAS-01'},{secondaryId:'COM-03'},{speciesId:'unknown'},{nature:'DROID'},{credits:200},{role:'MJ'},{secondaryLevel:5}])await assert.rejects(f.save({proposal:{...admissionTestProposal,...patch}}));
  assert.equal((await f.read('myAdmission',f.player)).revision,1);
  const droid=await f.save({proposal:{...admissionTestProposal,speciesId:'droid-test',classId:'MED',secondaryId:'COM-03'}});assert.equal(droid.status,'SUBMITTED');
  assert.equal((await f.read('myAdmission',f.player)).proposal.nature,'DROID');
 });
 test(`${prefix} : fermeture, quota nul et espèces désactivées contrôlés côté serveur`,async()=>{
  const f=await admissionFixture(makeStore);await assert.rejects(f.issue(),{code:'ADMISSION_CLOSED'});
  await assert.rejects(f.configure({...admissionTestSettings,quotas:{COM:2}}),{code:'INVALID_ADMISSION'});
  await f.configure();const token=await f.issue();await f.begin(token);
  await f.configure({...admissionTestSettings,quotas:{...admissionTestSettings.quotas,COM:0}},1,1);
  await assert.rejects(f.save({policyRevision:2,draftRevision:2}),{code:'INVALID_ADMISSION_CHOICE'});
  await assert.rejects(f.configure({...admissionTestSettings,species:[]},2,2));
  await assert.rejects(f.configure({...admissionTestSettings,species:admissionTestSettings.species.map(s=>({...s,nature:'DROID'}))},2,2),{code:'ADMISSION_SPECIES_IDENTITY'});
  await f.configure({...admissionTestSettings,open:false},2,2);await assert.rejects(f.begin(token),{code:'ADMISSION_CLOSED'});
 });
 test(`${prefix} : invitation liée à sa campagne, finalité privée distincte et aucune réutilisation de hash`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();
  const other=await f.create({creationId:randomUUID()});
  await assert.rejects(f.read('admissionInvitation',f.player,{sessionId:other.id,token}),{code:'INVALID_INVITATION'});
  await assert.rejects(f.cmd('redeem',{token},f.player),{code:'INVALID_INVITATION'});
  await assert.rejects(f.cmd('issueAdmissionInvitation',{tokenHash:hash(token),hours:1,maxUses:1,label:'Copie'}),{code:'INVALID_INVITATION'});
  const privateToken=randomBytes(32).toString('base64url');await f.store.runTransaction(async tx=>tx.set(`invitations/${hash(privateToken)}`,{purpose:'PRIVATE_ACCESS',sessionId:f.sid,campaignId:f.campaignId,status:'ACTIVE',expiresAt:5000000}));
  await assert.rejects(f.read('admissionInvitation',f.player,{token:privateToken}),{code:'INVALID_INVITATION'});
 });
 test(`${prefix} : brouillon incomplet, consentement explicite et conservation des versions soumises`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await assert.rejects(f.begin(token,f.player,{consent:false}),{code:'ADMISSION_CONSENT_REQUIRED'});await f.begin(token);
  await f.save({submit:false,proposal:{firstName:'Début'}});await assert.rejects(f.save({revision:2,proposal:{firstName:'Début'}}),{code:'INVALID_ADMISSION'});
  await f.save({revision:2});await f.save({revision:3,submit:false,proposal:{...admissionTestProposal,background:'Correction'}});
  const history=await f.store.list(`sessions/${f.sid}/registrations/${hash(f.player.uid)}/history`);assert.equal(history.length,3);assert.equal(history.find(x=>x.id==='3').admission.status,'SUBMITTED');
 });
 test(`${prefix} : aucun passage par les commandes historiques d’affectation et de publication`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);await f.save();
  for(const action of ['assign','setRegistrationStatus','setRegistrationOpen','issueInvitation'])await assert.rejects(f.cmd(action,{uid:f.player.uid,characterId:'fake',status:'ACCEPTED',revision:1,open:true}),{code:'PREPARATION_ONLY'});
  await assert.rejects(f.cmd('register',{name:'Fictif'},f.other));
  assert.equal((await f.read('session')).accepted,0);
 });
 test(`${prefix} : interruption avant commit annule usage et dossier, puis reprise unique`,async()=>{
  const raw=makeStore();let fail=false;
  const f=await admissionFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail){fail=false;throw Error('TEST_INTERRUPTION');}return result;})}));
  await f.configure();const token=await f.issue();fail=true;await assert.rejects(f.begin(token),/TEST_INTERRUPTION/);
  assert.equal((await raw.get(`invitations/${hash(token)}`)).uses,0);assert.deepEqual(await raw.list(`sessions/${f.sid}/registrations`),[]);
  await f.begin(token);fail=true;await assert.rejects(f.save(),/TEST_INTERRUPTION/);assert.equal((await f.read('myAdmission',f.player)).revision,1);
  await f.save();assert.equal((await f.read('myAdmission',f.player)).revision,2);
 });
 test(`${prefix} : notice modifiée entre affichage et consentement exige une nouvelle lecture`,async()=>{
  const f=await admissionFixture(makeStore);await f.configure();const token=await f.issue();await f.begin(token);
  await f.cmd('saveSpaceOutlawsPreparation',{revision:1,title:'Informations modifiées',capacity:60,privacy:'Nouvelle notice',reason:'Correction'});
  await assert.rejects(f.save(),{code:'STALE_REVISION'});await assert.rejects(f.begin(token),{code:'STALE_REVISION'});
  await f.save({sessionRevision:2});assert.equal((await f.read('myAdmission',f.player)).status,'SUBMITTED');
 });

}
