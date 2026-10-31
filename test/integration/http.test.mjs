import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {spaceMissionsFixture} from '../support/space-missions-suite.mjs';
import {soVoyagesFixture} from '../support/space-outlaws-voyages-suite.mjs';
import {firestoreStore} from '../../src/adapters/firestore.mjs';
import {getFirestore} from 'firebase-admin/firestore';
import {fieldImportRow} from '../support/central-field-import-suite.mjs';
import {centralTestInstallation} from '../support/central-field-targets-suite.mjs';
import {centralModelRow,centralPortRow,centralRouteRow} from '../support/central-space-import-suite.mjs';
import {centralShopRow,centralOfferRow} from '../support/central-shop-import-suite.mjs';
import {centralKnowledgeRow,centralMissionRow} from '../support/central-story-import-suite.mjs';
import {centralTestShipModel,centralTestPort,centralTestRoute} from '../support/central-space-suite.mjs';
import {centralTestMission} from '../support/central-missions-suite.mjs';
import {centralTestKnowledge} from '../support/central-knowledge-suite.mjs';
import {centralTestShop,centralTestOffer} from '../support/central-shops-suite.mjs';
import {centralTestKit} from '../support/central-class-kits-suite.mjs';
import {centralCharacterRow} from '../support/central-character-import-suite.mjs';
import {centralTestCharacter} from '../support/central-characters-suite.mjs';
import {centralTestGroup} from '../support/central-groups-suite.mjs';
import {centralItemRow} from '../support/central-import-suite.mjs';
import {readCentralXlsx,writeCentralXlsx} from '../../web/central-xlsx.mjs';
import {rosterMembership} from '../support/group-management-suite.mjs';
import {centralTestItem} from '../support/central-master-suite.mjs';
import {centralTestRecipe} from '../support/central-recipes-suite.mjs';
import {admissionTestSettings,admissionTestProposal} from '../support/admissions-suite.mjs';
import {personCommands} from '../../src/core/person-actions.mjs';
import {fieldCommands} from '../../src/core/field-actions.mjs';
import {masterCommands} from '../../src/core/masters.mjs';
import {masterExample,terrainMasterExample} from '../../src/shared/master-examples.mjs';
import {campaignCommands} from '../../src/core/campaigns.mjs';
import {actionPointCommands} from '../../src/core/action-points.mjs';
import {sampleImage} from '../support/media-suite.mjs';
import {archiveCommands} from '../../src/core/scenario-archives.mjs';
import {getStorage} from 'firebase-admin/storage';
import {mediaCommands} from '../../src/core/media.mjs';
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {hash} from '../../src/core/workflow.mjs';
import {mediaHash} from '../../src/core/media-state.mjs';
import express from 'express';
if(!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Auth emulator required');
process.env.MEDIA_BUCKET='demo-gn-engine-media';
process.env.OWNER_EMAIL='gkerckhofs@gmail.com';
const {api}=await import('../../src/server/index.mjs');
// The actual exported HTTP handler is mounted in Express; Firebase Auth and
// Firestore use their emulators. No Functions runtime socket needed locally.
const app=express();app.use(express.json({limit:'24mb'}));app.post('/api',api);
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
after(()=>new Promise(resolve=>server.close(resolve)));
const endpoint=`http://127.0.0.1:${server.address().port}/api`;
const request=async(action,input={},token)=>{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,input})});
  return {status:response.status,...await response.json()};
};

test('HTTP + Auth : groupes centraux M2, références privées, archive et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`central-group-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Groupes M2 HTTP',title:'Préparation synthétique',capacity:2,privacy:'Notice fictive'});
 const input={campaignId,groupId:'group',groupRevision:0,draftRevision:0,group:centralTestGroup,reason:'Groupe fictif',requestId:randomUUID()};assert.equal((await request('saveCentralGroup',input)).status,401);assert.equal((await request('saveCentralGroup',input,editor)).status,403);
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:[],revision:0,reason:'Lecture M2'};await cmd('setCentralStaff',grant);assert.equal((await request('saveCentralGroup',input,editor)).status,403);await cmd('setCentralStaff',{...grant,editWorkshops:['M2'],revision:1});const out=await cmd('saveCentralGroup',input,editor);assert.deepEqual(await cmd('saveCentralGroup',input,editor),out);
 let d=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.equal(d.diagnostics[0].code,'REFERENCE_MISSING');assert.equal(d.changes[0].data.publicationState,'DRAFT');assert.equal(d.changes[0].data.members[0].permissions.payWallet,false);assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);
 await cmd('saveCentralCharacter',{campaignId,characterId:'character',characterRevision:0,draftRevision:1,character:{...centralTestCharacter,relations:[]},reason:'Cible M2'},editor);assert.deepEqual((await call('checkCentralDraft',{campaignId,draftRevision:2})).diagnostics,[]);
 await cmd('archiveCentralGroup',{campaignId,groupId:'group',groupRevision:1,draftRevision:2,reason:'Exclusion explicite'},editor);d=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.equal(d.changes.find(c=>c.type==='group').operation,'ARCHIVE');
 await cmd('setCentralStaff',{...grant,active:false,revision:2});assert.equal((await request('saveCentralGroup',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M2'},editor)).status,403);
 const s=await call('session',{sessionId});for(const k of ['characters','groups','accounts','inventory'])assert.deepEqual(s[k],[]);assert.equal(s.versionId,null);
});

test('HTTP + Auth : instantané central privé, capture idempotente et relecture révoquée',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`snapshot-${randomUUID()}@example.invalid`,reader=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Instantané central HTTP',title:'Préparation synthétique',capacity:2,privacy:'Notice fictive'});
 const input={campaignId,characterId:'fiction',characterRevision:0,draftRevision:0,character:{...centralTestCharacter,biography:'Récit privé figé',relations:[]},reason:'Fiction de test'};
 await cmd('saveCentralCharacter',input);const read={campaignId,draftRevision:1};assert.equal((await request('previewCentralSnapshot',read)).status,401);
 const grant={campaignId,email,active:true,readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:[],revision:0,reason:'Contrôle global privé'};
 await cmd('setCentralStaff',grant);assert.equal((await request('listCentralSnapshots',{campaignId},reader)).status,403);
 await cmd('setCentralStaff',{...grant,revision:1,checkCentral:true});assert.equal((await request('previewCentralSnapshot',read,reader)).status,403);
 const p=await call('previewCentralSnapshot',read),capture={...read,confirmation:p.confirmation,reason:'Copie historique HTTP',requestId:randomUUID()};
 assert.equal((await request('captureCentralSnapshot',capture,reader)).status,403);const out=await cmd('captureCentralSnapshot',capture);
 await cmd('saveCentralCharacter',{...input,draftRevision:1,characterRevision:1,character:{...input.character,biography:'Récit actuel'}});
 assert.deepEqual(await cmd('captureCentralSnapshot',capture),out);assert.equal((await call('listCentralSnapshots',{campaignId},reader)).snapshots.length,1);
 const d=await call('centralSnapshot',{campaignId,snapshotId:out.id},reader);assert.equal(d.sourceIsCurrentRevision,false);assert.equal(d.changes[0].data.biography,'Récit privé figé');assert.equal(d.report.draft.revision,1);assert.equal(d.publicationAvailable,false);
 assert.equal((await request('admissionAdmin',{sessionId},reader)).status,403);assert.equal((await request('centralSnapshot',{campaignId,snapshotId:out.id})).status,401);
 await cmd('setCentralStaff',{...grant,revision:2,checkCentral:false});assert.equal((await request('centralSnapshot',{campaignId,snapshotId:out.id},reader)).status,403);
 const s=await call('session',{sessionId});assert.equal(s.versionId,null);for(const k of ['characters','accounts','inventory'])assert.deepEqual(s[k],[]);
});

test('HTTP + Auth : contrôle privé des dossiers M2, lecture seule et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`check-m2-${randomUUID()}@example.invalid`,reader=await googleTestAccount(email),playerEmail=`check-m2-player-${randomUUID()}@example.invalid`,player=await googleTestAccount(playerEmail);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Contrôle privé M2 HTTP',title:'Préparation synthétique',capacity:2,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Catalogue synthétique'});
 const token=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{sessionId,tokenHash:hash(token),hours:1,maxUses:1,label:'Invitation synthétique'});
 await cmd('beginAdmission',{sessionId,token,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true},player);
 await cmd('saveAdmissionProposal',{sessionId,revision:1,sessionRevision:1,policyRevision:1,draftRevision:1,proposal:admissionTestProposal,submit:true,consent:true},player);
 const uid=(await call('admissionAdmin',{sessionId})).registrations[0].uid;
 await cmd('reviewAdmission',{sessionId,uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation synthétique'});
 assert.equal((await request('checkAdmissionM2',{sessionId})).status,401);assert.equal((await request('checkAdmissionM2',{sessionId},player)).status,403);
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:[],revision:0,reason:'Lecture préparatoire M2'};await cmd('setCentralStaff',grant);assert.equal((await request('checkAdmissionM2',{sessionId},reader)).status,403);
 await cmd('setStaff',{sessionId,email,active:true,role:'MJ',revision:(await call('session',{sessionId})).revision,reason:'Dossiers privés'});
 let d=await call('checkAdmissionM2',{sessionId},reader);assert.equal(d.rows[0].blockers[0],'ADMISSION_M2_NOT_PREPARED');assert.equal(d.publicationAvailable,false);
 const p=await call('previewAdmissionM2',{sessionId,uid});await cmd('prepareAdmissionM2',{sessionId,uid,confirmation:p.confirmation,reason:'Préparation fictive'});
 d=await call('checkAdmissionM2',{sessionId},reader);assert.equal(d.totals.matched,1);assert.equal(d.birthAvailable,false);assert.ok(!JSON.stringify(d).includes(playerEmail));assert.ok(!JSON.stringify(d).includes(admissionTestProposal.background));assert.ok(!JSON.stringify(d).includes(admissionTestProposal.friends));assert.equal((await request('previewAdmissionM2Reconciliation',{sessionId,uid},reader)).status,403);
 const current=await call('myAdmission',{sessionId},player);await cmd('withdrawAdmission',{sessionId,revision:current.revision,reason:'Retrait explicite'},player);
 const after=await call('checkAdmissionM2',{sessionId},reader);assert.equal(after.totals.approved,0);assert.deepEqual(after.rows[0].blockers,['UNAPPROVED_M2_ACTIVE']);assert.notEqual(after.fingerprint,d.fingerprint);
 assert.equal((await request('checkAdmissionM2',{sessionId,confirmation:d.fingerprint},reader)).error,'INVALID_ADMISSION');
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('checkAdmissionM2',{sessionId},reader)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.accepted,0);for(const kind of ['characters','inventory','accounts'])assert.deepEqual(session[kind],[]);
});

test('HTTP + Auth : rapprochement M2, texte MJ conservé, blocage et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`reconcile-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email),playerEmail=`reconcile-player-${randomUUID()}@example.invalid`,player=await googleTestAccount(playerEmail);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Rapprochement M2 HTTP',title:'Préparation synthétique',capacity:2,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Catalogue synthétique'});
 const invitation=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{sessionId,tokenHash:hash(invitation),hours:1,maxUses:1,label:'Invitation synthétique'});
 await cmd('beginAdmission',{sessionId,token:invitation,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true},player);
 await cmd('saveAdmissionProposal',{sessionId,revision:1,sessionRevision:1,policyRevision:1,draftRevision:1,proposal:admissionTestProposal,submit:true,consent:true},player);
 const uid=(await call('admissionAdmin',{sessionId})).registrations[0].uid;
 await cmd('reviewAdmission',{sessionId,uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation synthétique'});
 const initialPreview=await call('previewAdmissionM2',{sessionId,uid}),initial=await cmd('prepareAdmissionM2',{sessionId,uid,confirmation:initialPreview.confirmation,reason:'Première copie'});
 await cmd('saveCentralCharacter',{campaignId,characterId:initial.characterId,characterRevision:1,draftRevision:2,character:{...centralTestCharacter,biography:'Biographie MJ HTTP',relations:[]},reason:'Écriture MJ'});
 assert.equal((await request('previewAdmissionM2Reconciliation',{sessionId,uid})).status,401);assert.equal((await request('previewAdmissionM2Reconciliation',{sessionId,uid},player)).status,403);
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:['M2'],revision:0,reason:'Rapprocher M2'};await cmd('setCentralStaff',grant);assert.equal((await request('previewAdmissionM2Reconciliation',{sessionId,uid},editor)).status,403);
 await cmd('setStaff',{sessionId,email,active:true,role:'MJ',revision:(await call('session',{sessionId})).revision,reason:'Décisions privées'});
 const admin=await call('admissionAdmin',{sessionId});await cmd('reviewAdmission',{sessionId,uid,revision:admin.registrations[0].admission.revision,policyRevision:admin.policyRevision,draftRevision:admin.draftRevision,decision:'CHANGE_CLASS',classId:'ROG',secondaryId:'MED-02',reason:'Classe approuvée'});
 const p=await call('previewAdmissionM2Reconciliation',{sessionId,uid},editor),input={sessionId,uid,biographyMode:'KEEP',confirmation:p.confirmations.KEEP,reason:'Aligner les choix et conserver le récit',requestId:randomUUID()};assert.ok(p.differences.includes('classId'));assert.equal((await request('reconcileAdmissionM2',input,player)).status,403);assert.equal((await request('reconcileAdmissionM2',{...input,biographyMode:'PROPOSAL'},editor)).error,'ADMISSION_M2_STALE');
 const saved=await cmd('reconcileAdmissionM2',input,editor);assert.equal(saved.characterChanged,true);assert.deepEqual(await cmd('reconcileAdmissionM2',input,editor),saved);assert.deepEqual(await cmd('reconcileAdmissionM2',{...input,requestId:randomUUID()},editor),saved);
 const view=await call('centralMaster',{campaignId,workshop:'M2'},editor),c=view.changes.find(c=>c.type==='character');assert.equal(c.data.biography,'Biographie MJ HTTP');assert.equal(c.data.public.displayName,'Ari Test');assert.equal(c.data.creationPlan.classId,'ROG');assert.equal(c.data.contentRevision,3);assert.ok(!JSON.stringify(view).includes(playerEmail));assert.ok(!JSON.stringify(view).includes(uid));assert.doesNotMatch(JSON.stringify(view),/m2Reconciliation|biographyMode/);
 const own=await call('myAdmission',{sessionId},player);assert.doesNotMatch(JSON.stringify(own),/m2Reconciliation|m2Preparation/);await cmd('withdrawAdmission',{sessionId,revision:own.revision,reason:'Retrait'},player);const blocked=await call('previewAdmissionM2Reconciliation',{sessionId,uid},editor);assert.deepEqual(blocked.blockers,['ADMISSION_NOT_APPROVED']);assert.equal(blocked.confirmations,null);assert.deepEqual(await cmd('reconcileAdmissionM2',input,editor),saved);
 const s=await call('session',{sessionId});assert.equal(s.accepted,0);for(const kind of ['characters','inventory','accounts'])assert.deepEqual(s[kind],[]);assert.equal((await call('checkCentralDraft',{campaignId,draftRevision:4})).publicationAvailable,false);
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('reconcileAdmissionM2',input,editor)).status,403);assert.equal((await request('previewAdmissionM2Reconciliation',{sessionId,uid},editor)).status,403);
});

test('HTTP + Auth : admission vers M2, double autorité, réessai et retrait sans activation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`admission-m2-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email),playerEmail=`admission-m2-player-${randomUUID()}@example.invalid`,player=await googleTestAccount(playerEmail);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Admission vers M2 HTTP',title:'Préparation synthétique',capacity:2,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Catalogue synthétique'});
 const token=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{sessionId,tokenHash:hash(token),hours:1,maxUses:1,label:'Invitation synthétique'});
 await cmd('beginAdmission',{sessionId,token,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true},player);
 await cmd('saveAdmissionProposal',{sessionId,revision:1,sessionRevision:1,policyRevision:1,draftRevision:1,proposal:admissionTestProposal,submit:true,consent:true},player);
 const uid=(await call('admissionAdmin',{sessionId})).registrations[0].uid;
 await cmd('reviewAdmission',{sessionId,uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation synthétique'});
 assert.equal((await request('previewAdmissionM2',{sessionId,uid})).status,401);assert.equal((await request('previewAdmissionM2',{sessionId,uid},player)).status,403);
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:['M2'],revision:0,reason:'Préparer M2'};await cmd('setCentralStaff',grant);
 assert.equal((await request('previewAdmissionM2',{sessionId,uid},editor)).status,403);
 await cmd('setStaff',{sessionId,email,active:true,role:'MJ',revision:(await call('session',{sessionId})).revision,reason:'Examiner les dossiers'});
 assert.equal((await call('admissionAdmin',{sessionId},editor)).canPrepareM2,true);
 const p=await call('previewAdmissionM2',{sessionId,uid},editor),input={sessionId,uid,confirmation:p.confirmation,reason:'Préparation fiction approuvée',requestId:randomUUID()};
 assert.equal((await request('prepareAdmissionM2',input,player)).status,403);
 const saved=await cmd('prepareAdmissionM2',input,editor);assert.deepEqual(await cmd('prepareAdmissionM2',input,editor),saved);assert.deepEqual(await cmd('prepareAdmissionM2',{...input,requestId:randomUUID()},editor),saved);
 const central=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.equal(central.changes.filter(c=>c.type==='character').length,1);assert.equal(central.history.length,1);assert.ok(!JSON.stringify(central).includes(playerEmail));assert.ok(!JSON.stringify(central).includes(uid));assert.ok(!JSON.stringify(central).includes(admissionTestProposal.friends));
 const own=await call('myAdmission',{sessionId},player);assert.doesNotMatch(JSON.stringify(own),/m2Preparation|preparedAt/);assert.equal(own.status,'APPROVED');
 await cmd('withdrawAdmission',{sessionId,revision:own.revision,reason:'Retrait synthétique'},player);
 assert.deepEqual(await cmd('prepareAdmissionM2',input,editor),saved);const current=await call('previewAdmissionM2',{sessionId,uid},editor);assert.equal(current.state.approved,false);assert.equal(current.state.changedSincePreparation,true);
 const s=await call('session',{sessionId});assert.equal(s.accepted,0);for(const kind of ['characters','inventory','accounts'])assert.deepEqual(s[kind],[]);assert.equal(s.versionId,null);
 assert.equal((await call('checkCentralDraft',{campaignId,draftRevision:2})).publicationAvailable,false);
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('prepareAdmissionM2',input,editor)).status,403);assert.equal((await request('previewAdmissionM2',{sessionId,uid},editor)).status,403);
});

test('HTTP + Auth : M3 canonique, ports différés, archives et révocation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`space-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'M3 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M3'],editWorkshops:['M3'],revision:0,reason:'Préparer M3'};await cmd('setCentralStaff',grant);
 const input={campaignId,routeId:'route',routeRevision:0,draftRevision:0,route:centralTestRoute,reason:'Route synthétique',requestId:randomUUID()};assert.equal((await request('saveCentralRoute',input)).status,401);assert.equal((await request('saveCentralRoute',{...input,route:{...centralTestRoute,fuelCost:1}},editor)).status,400);
 const saved=await call('saveCentralRoute',input,editor);assert.deepEqual(await call('saveCentralRoute',input,editor),saved);let d=await call('centralMaster',{campaignId,workshop:'M3'},editor);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_MISSING').length,2);assert.equal(d.changes[0].data.durationSeconds,300);
 await cmd('saveCentralShipModel',{campaignId,shipModelId:'model',shipModelRevision:0,draftRevision:1,shipModel:centralTestShipModel,reason:'Famille canonique'},editor);
 await cmd('saveCentralPort',{campaignId,portId:'origin',portRevision:0,draftRevision:2,port:centralTestPort,reason:'Départ'},editor);await cmd('saveCentralPort',{campaignId,portId:'destination',portRevision:0,draftRevision:3,port:{...centralTestPort,navigationCode:'OTHER-CODE'},reason:'Arrivée'},editor);
 d=await call('centralMaster',{campaignId,workshop:'M3'},editor);assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes.find(c=>c.type==='shipModel').data.cargoCapacity,0);assert.equal(d.history.length,4);assert.doesNotMatch(JSON.stringify(d.references),/SECRET-CODE|Description privée|Secret port/);
 await cmd('archiveCentralPort',{campaignId,portId:'origin',portRevision:1,draftRevision:4,reason:'Essai archive'},editor);let r=await call('checkCentralDraft',{campaignId,draftRevision:5});assert.equal(r.edges.find(e=>e.field==='fromPort').status,'ARCHIVED');await cmd('saveCentralPort',{campaignId,portId:'origin',portRevision:2,draftRevision:5,port:centralTestPort,reason:'Restaurer'},editor);r=await call('checkCentralDraft',{campaignId,draftRevision:6});assert.ok(r.edges.every(e=>e.status==='RESOLVED'));assert.equal(r.totals.invalid,0);assert.equal(r.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(r),/SECRET-CODE|Description privée|Secret port/);
 await cmd('setCentralStaff',{...grant,revision:1,editWorkshops:[]});assert.equal((await request('saveCentralRoute',input,editor)).status,403);await cmd('setCentralStaff',{...grant,revision:2,active:false});assert.equal((await request('centralMaster',{campaignId,workshop:'M3'},editor)).status,403);assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','inventory','accounts','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : missions M7, dépendances privées, archives et révocation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`mission-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Missions HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M7'],editWorkshops:['M7'],revision:0,reason:'Préparer M7'};await cmd('setCentralStaff',grant);
 const input={campaignId,missionId:'mission',missionRevision:0,draftRevision:0,mission:centralTestMission,reason:'Mission synthétique',requestId:randomUUID()};assert.equal((await request('saveCentralMission',input)).status,401);assert.equal((await request('saveCentralMission',{...input,mission:{...centralTestMission,xp:3}},editor)).status,400);
 const saved=await call('saveCentralMission',input,editor);assert.deepEqual(await call('saveCentralMission',input,editor),saved);let d=await call('centralMaster',{campaignId,workshop:'M7'},editor);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').map(x=>x.referenceType).sort(),['character','item','knowledge']);assert.deepEqual(d.references.knowledge,[]);
 await cmd('saveCentralItem',{campaignId,itemId:'ingredient',itemRevision:0,draftRevision:1,item:centralTestItem,reason:'Objet proposé'});await cmd('saveCentralCharacter',{campaignId,characterId:'character',characterRevision:0,draftRevision:2,character:{...centralTestCharacter,relations:[]},reason:'Donneur fictif'});await cmd('saveCentralKnowledge',{campaignId,knowledgeId:'knowledge-test',knowledgeRevision:0,draftRevision:3,knowledge:centralTestKnowledge,reason:'Prérequis fictif'});
 await cmd('setCentralStaff',{...grant,revision:1,readWorkshops:['M1','M2','M6','M7']});d=await call('centralMaster',{campaignId,workshop:'M7'},editor);assert.deepEqual(d.diagnostics.map(x=>x.code),['REWARD_SOURCE_PENDING']);assert.equal(d.references.knowledge[0].id,'knowledge-test');assert.doesNotMatch(JSON.stringify(d.references),/Texte confidentiel M6|Vérité réservée M6|initialCharacterIds|qrCharacterIds|gmNotes|playerSecrets/);
 await cmd('archiveCentralKnowledge',{campaignId,knowledgeId:'knowledge-test',knowledgeRevision:1,draftRevision:4,reason:'Essai archive'});let r=await call('checkCentralDraft',{campaignId,draftRevision:5});assert.equal(r.edges.find(e=>e.from.type==='mission'&&e.to.type==='knowledge').status,'ARCHIVED');await cmd('saveCentralKnowledge',{campaignId,knowledgeId:'knowledge-test',knowledgeRevision:2,draftRevision:5,knowledge:centralTestKnowledge,reason:'Restaurer'});r=await call('checkCentralDraft',{campaignId,draftRevision:6});assert.equal(r.edges.find(e=>e.from.type==='mission'&&e.to.type==='knowledge').status,'RESOLVED');assert.equal(r.totals.invalid,0);assert.equal(r.publicationAvailable,false);
 await cmd('archiveCentralMission',{campaignId,missionId:'mission',missionRevision:1,draftRevision:6,reason:'Essai archive'},editor);assert.equal((await call('centralMaster',{campaignId,workshop:'M7'},editor)).changes[0].operation,'ARCHIVE');await cmd('saveCentralMission',{...input,requestId:randomUUID(),missionRevision:2,draftRevision:7},editor);
 await cmd('setCentralStaff',{...grant,revision:2,readWorkshops:['M7'],editWorkshops:[]});d=await call('centralMaster',{campaignId,workshop:'M7'},editor);assert.deepEqual(d.references.items,[]);assert.deepEqual(d.references.characters,[]);assert.deepEqual(d.references.knowledge,[]);assert.equal((await request('saveCentralMission',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M6'},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','knowledge','inventory','accounts','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : informations M6, destinataires proposés, référence M4 et révocation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`knowledge-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Informations HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M6'],editWorkshops:['M6'],revision:0,reason:'Préparer M6'};await cmd('setCentralStaff',grant);
 const input={campaignId,knowledgeId:'knowledge-test',knowledgeRevision:0,draftRevision:0,knowledge:centralTestKnowledge,reason:'Information synthétique',requestId:randomUUID()};assert.equal((await request('saveCentralKnowledge',input)).status,401);assert.equal((await request('saveCentralKnowledge',{...input,knowledge:{...centralTestKnowledge,publicationState:'PUBLISHED'}},editor)).status,400);
 const saved=await call('saveCentralKnowledge',input,editor);assert.deepEqual(await call('saveCentralKnowledge',input,editor),saved);let d=await call('centralMaster',{campaignId,workshop:'M6'},editor);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').length,2);assert.deepEqual(d.references.characters,[]);
 await cmd('saveCentralCharacter',{campaignId,characterId:'character',characterRevision:0,draftRevision:1,character:{...centralTestCharacter,relations:[]},reason:'Fiche fictive'});await cmd('saveCentralRecipe',{campaignId,recipeId:'formula',recipeRevision:0,draftRevision:2,recipe:centralTestRecipe,reason:'Formule fictive'});
 await cmd('setCentralStaff',{...grant,revision:1,readWorkshops:['M2','M4','M6']});d=await call('centralMaster',{campaignId,workshop:'M6'},editor);assert.deepEqual(d.diagnostics,[]);assert.equal(d.references.characters[0].id,'character');d=await call('centralMaster',{campaignId,workshop:'M4'},editor);assert.equal(d.references.knowledge[0].id,'knowledge-test');assert.doesNotMatch(JSON.stringify(d),/Texte confidentiel M6|Vérité réservée M6|initialCharacterIds|qrCharacterIds/);
 await cmd('archiveCentralKnowledge',{campaignId,knowledgeId:'knowledge-test',knowledgeRevision:1,draftRevision:3,reason:'Essai archive'},editor);let report=await call('checkCentralDraft',{campaignId,draftRevision:4});assert.equal(report.edges.find(e=>e.to.type==='knowledge').status,'ARCHIVED');await cmd('saveCentralKnowledge',{...input,requestId:randomUUID(),knowledgeRevision:2,draftRevision:4},editor);report=await call('checkCentralDraft',{campaignId,draftRevision:5});assert.equal(report.edges.find(e=>e.to.type==='knowledge').status,'RESOLVED');assert.equal(report.publicationAvailable,false);assert.equal(report.totals.invalid,0);
 await cmd('setCentralStaff',{...grant,revision:2,readWorkshops:['M4'],editWorkshops:[]});d=await call('centralMaster',{campaignId,workshop:'M4'},editor);assert.deepEqual(d.references.knowledge,[]);assert.ok(d.diagnostics.some(x=>x.referenceType==='knowledge'&&x.code==='REFERENCE_NOT_CHECKED'));assert.equal((await request('saveCentralKnowledge',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M6'},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','knowledge','inventory','accounts','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : boutiques M5, références privées, archives et révocation avant reçu',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`shop-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Boutiques HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M5'],editWorkshops:['M5'],revision:0,reason:'Préparer M5'};await cmd('setCentralStaff',grant);
 const input={campaignId,shopId:'shop',shopRevision:0,draftRevision:0,shop:centralTestShop,reason:'Boutique synthétique',requestId:randomUUID()};
 assert.equal((await request('saveCentralShop',input)).status,401);assert.equal((await request('saveCentralShop',{...input,shop:{...centralTestShop,stock:20}},editor)).status,400);const r=await call('saveCentralShop',input,editor);assert.deepEqual(await call('saveCentralShop',input,editor),r);
 await cmd('saveCentralOffer',{campaignId,offerId:'offer',offerRevision:0,draftRevision:1,offer:centralTestOffer,reason:'Offre synthétique'},editor);
 await cmd('saveCentralItem',{campaignId,itemId:'ingredient',itemRevision:0,draftRevision:2,item:centralTestItem,reason:'Modèle synthétique'});await cmd('saveCentralCharacter',{campaignId,characterId:'character',characterRevision:0,draftRevision:3,character:{...centralTestCharacter,relations:[]},reason:'Vendeur de fiction'});
 let d=await call('centralMaster',{campaignId,workshop:'M5'},editor);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').length,3);assert.deepEqual(d.references.items,[]);assert.deepEqual(d.references.characters,[]);assert.doesNotMatch(JSON.stringify(d),/Ingrédient synthétique|Voyageuse synthétique/);
 await cmd('setCentralStaff',{...grant,revision:1,readWorkshops:['M1','M2','M5']});d=await call('centralMaster',{campaignId,workshop:'M5'},editor);assert.equal(d.references.items.length,1);assert.equal(d.references.characters.length,1);assert.doesNotMatch(JSON.stringify(d),/Note M1 privée|Secret de fiction|Note M2 privée/);
 await cmd('archiveCentralShop',{campaignId,shopId:'shop',shopRevision:1,draftRevision:4,reason:'Essai archive'},editor);d=await call('centralMaster',{campaignId,workshop:'M5'},editor);assert.ok(d.diagnostics.some(x=>x.referenceType==='shop'&&x.code==='REFERENCE_ARCHIVED'));
 await cmd('saveCentralShop',{...input,requestId:randomUUID(),shopRevision:2,draftRevision:5},editor);const report=await call('checkCentralDraft',{campaignId,draftRevision:6});assert.equal(report.totals.invalid,0);assert.equal(report.publicationAvailable,false);assert.equal(report.edges.filter(e=>e.status==='RESOLVED').length,3);
 await cmd('setCentralStaff',{...grant,revision:2,active:false});assert.equal((await request('saveCentralShop',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M5'},editor)).status,403);assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','inventory','accounts','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : cohérence M2 vers kit M1, réparation et révocation du contrôle',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`coherence-${randomUUID()}@example.invalid`,reviewer=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Cohérence HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Espèces synthétiques'});
 await cmd('saveCentralCharacter',{campaignId,characterId:'person',draftRevision:1,characterRevision:0,reason:'Fiche synthétique',character:{...centralTestCharacter,relations:[],creationPlan:{classId:'MED',speciesId:'species-test',secondaryId:'COM-03'}}});
 const grant={campaignId,email,active:true,readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:[],checkCentral:true,revision:0,reason:'Relecture explicite'};await cmd('setCentralStaff',grant);
 assert.equal((await request('checkCentralDraft',{campaignId,draftRevision:2})).status,401);
 let r=await call('checkCentralDraft',{campaignId,draftRevision:2},reviewer);assert.equal(r.diagnostics[0].code,'CLASS_KIT_MISSING');assert.equal(r.initialPreparation.plannedCharacters,1);
 await cmd('saveCentralClassKit',{campaignId,classKitId:'MED',classKitRevision:0,draftRevision:2,classKit:centralTestKit,reason:'Kit synthétique'});
 let revision=3;for(const b of centralTestKit.bindings)await cmd('saveCentralItem',{campaignId,itemId:b.itemId,itemRevision:0,draftRevision:revision++,item:{...centralTestItem,consumable:b.itemId==='supplies'},reason:'Modèle synthétique'});
 assert.equal((await request('checkCentralDraft',{campaignId,draftRevision:2},reviewer)).status,400);
 r=await call('checkCentralDraft',{campaignId,draftRevision:7},reviewer);assert.deepEqual(r.diagnostics,[]);assert.equal(r.initialPreparation.classes.find(c=>c.classId==='MED').kitStatus,'REFERENCES_CHECKED');assert.equal(r.publicationAvailable,false);
 await cmd('setCentralStaff',{...grant,revision:1,checkCentral:false});assert.equal((await request('checkCentralDraft',{campaignId,draftRevision:7},reviewer)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','inventory','accounts','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : kits M1 canoniques, références et révocation sans dotation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`kits-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Kits M1 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M1'],editWorkshops:['M1'],revision:0,reason:'Préparer les kits'};await cmd('setCentralStaff',grant);
 const input={campaignId,classKitId:'MED',classKitRevision:0,draftRevision:0,classKit:centralTestKit,reason:'Kit synthétique',requestId:randomUUID()};
 assert.equal((await request('saveCentralClassKit',input)).status,401);assert.equal((await request('saveCentralClassKit',{...input,classKit:{...centralTestKit,credits:999}},editor)).status,400);const r=await call('saveCentralClassKit',input,editor);assert.equal(r.classKitRevision,1);assert.deepEqual(await call('saveCentralClassKit',input,editor),r);
 let d=await call('centralMaster',{campaignId,workshop:'M1'},editor);assert.equal(d.diagnostics.length,4);assert.equal(d.kitPlans[0].slots.at(-1).quantity,2);assert.equal(d.kitPlans[0].activationAvailable,false);
 let revision=1;for(const b of centralTestKit.bindings)await cmd('saveCentralItem',{campaignId,itemId:b.itemId,itemRevision:0,draftRevision:revision++,item:{...centralTestItem,consumable:b.itemId==='supplies',pillable:true},reason:'Modèle synthétique'},editor);
 d=await call('centralMaster',{campaignId,workshop:'M1'},editor);assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes.find(c=>c.type==='item').data.pillable,true);const report=await call('checkCentralDraft',{campaignId,draftRevision:5});assert.deepEqual(report.diagnostics,[]);assert.equal(report.edges.length,4);assert.equal(report.publicationAvailable,false);
 assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('saveCentralClassKit',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M1'},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : Excel M2, aperçu, provenance, réessai et révocation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`excel-m2-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Excel M2 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Espèces synthétiques'});
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:['M2'],revision:0,reason:'Importer la fiction'};await cmd('setCentralStaff',grant);
 const e=await call('exportCentralDraft',{campaignId,workshop:'M2',ids:[]},editor);e.sheets.Personnages=[{...centralCharacterRow,relations_json:'[]'}];
 const input={campaignId,workshop:'M2',fileName:'Personnages.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};
 assert.equal((await request('prepareCentralImport',input)).status,401);const p=await call('prepareCentralImport',input,editor);assert.deepEqual(p.errors,[]);assert.deepEqual(p.diagnostics,[]);
 const apply={...input,confirmation:p.confirmation,reason:'Fiches fictives',requestId:randomUUID()},r=await call('applyCentralImport',apply,editor);assert.equal(r.changed,1);assert.deepEqual(await call('applyCentralImport',apply,editor),r);
 const exported=await call('exportCentralDraft',{campaignId,workshop:'M2',ids:['person']},editor);assert.equal(exported.sheets.Personnages[0].revision,1);assert.equal(exported.sheets.Personnages[0].classe_id,'COM');
 const report=await call('checkCentralDraft',{campaignId,draftRevision:2});assert.equal(report.totals.invalid,0);assert.equal(report.diff.find(x=>x.type==='character').location.sheet,'Personnages');assert.equal(report.publicationAvailable,false);
 assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('applyCentralImport',apply,editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M2',ids:['person']},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : plan initial M2 canonique, références et révocation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`plan-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Profils HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:['M2'],revision:0,reason:'Préparer M2'};await cmd('setCentralStaff',grant);
 const creationPlan={classId:'COM',speciesId:'species-test',secondaryId:'MED-02'},input={campaignId,characterId:'person',draftRevision:0,characterRevision:0,reason:'Profil initial synthétique',character:{...centralTestCharacter,relations:[],creationPlan},requestId:randomUUID()};
 assert.equal((await request('saveCentralCharacter',{...input,character:{...input.character,creationPlan:{...creationPlan,secondaryId:'FOR-01'}}},editor)).status,400);
 assert.equal((await request('saveCentralCharacter',input)).status,401);await call('saveCentralCharacter',input,editor);let d=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.equal(d.diagnostics[0].code,'REFERENCE_MISSING');assert.equal(d.creationProfiles[0].skills.length,4);assert.equal(d.changes[0].data.abilityProfile,undefined);
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:1,settings:admissionTestSettings,reason:'Espèces synthétiques'});const report=await call('checkCentralDraft',{campaignId,draftRevision:2});assert.deepEqual(report.diagnostics.map(d=>d.code),['CLASS_KIT_MISSING']);assert.equal(report.edges[0].status,'RESOLVED');assert.equal(report.publicationAvailable,false);
 await cmd('saveCentralCharacter',{...input,requestId:randomUUID(),draftRevision:2,characterRevision:1,character:{...centralTestCharacter,relations:[]}},editor);d=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.deepEqual(d.changes.find(c=>c.type==='character').data.creationPlan,{schemaVersion:1,ruleProfile:'SPACE_OUTLAWS_V07',...creationPlan});
 assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('saveCentralCharacter',input,editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : contrôle explicitement délégué puis révoqué, sans rôle de session',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`review-${randomUUID()}@example.invalid`,reviewer=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Relecture HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:[],revision:0,reason:'Relecture indépendante'},input={campaignId,draftRevision:0};
 await cmd('setCentralStaff',grant);assert.equal((await request('checkCentralDraft',input,reviewer)).status,403);
 const authorized={...grant,checkCentral:true,revision:1,requestId:randomUUID()};await cmd('setCentralStaff',authorized);
 const report=await call('checkCentralDraft',input,reviewer);assert.deepEqual(report.authority,{kind:'DELEGATED',revision:2});assert.equal(report.publicationAvailable,false);
 assert.equal((await call('centralMaster',{campaignId,workshop:'M2'},reviewer)).rights.checkCentral,true);
 for(const action of ['session','admissionAdmin'])assert.equal((await request(action,{sessionId},reviewer)).status,403);
 assert.equal((await request('saveCentralItem',{campaignId,itemId:'ingredient',item:centralTestItem,draftRevision:0,itemRevision:0,reason:'Interdit',requestId:randomUUID()},reviewer)).status,403);
 assert.equal((await request('setCentralStaff',{...authorized,email:'other@example.invalid',requestId:randomUUID()},reviewer)).status,403);
 const omitted=await request('setCentralStaff',{...grant,revision:2,requestId:randomUUID()},owner);assert.equal(omitted.status,400);
 assert.equal((await request('setCentralStaff',{...grant,checkCentral:true,readWorkshops:['M1'],revision:2,requestId:randomUUID()},owner)).status,400);
 await cmd('setCentralStaff',{...grant,checkCentral:false,revision:2});assert.equal((await request('checkCentralDraft',input,reviewer)).status,403);
 await cmd('setCentralStaff',authorized);assert.equal((await request('checkCentralDraft',input,reviewer)).status,403);
 const s=await call('session',{sessionId});assert.equal(s.versionId,null);for(const k of ['characters','registrations','inventory','accounts'])assert.deepEqual(s[k],[]);
});

test('HTTP + Auth : contrôle central propriétaire, révision et absence de publication',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`check-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={})=>call(action,{requestId:randomUUID(),...input});
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Contrôle global HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const input={campaignId,draftRevision:0};assert.equal((await request('checkCentralDraft',input)).status,401);
 await cmd('setCentralStaff',{campaignId,email,active:true,readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:['M1','M2','M4'],revision:0,reason:'Ateliers'});
 assert.equal((await request('checkCentralDraft',input,editor)).status,403);
 const empty=await call('checkCentralDraft',input);assert.equal(empty.publicationAvailable,false);assert.equal(empty.workshops.length,7);
 await cmd('saveCentralCharacter',{campaignId,characterId:'fiction',character:centralTestCharacter,draftRevision:0,characterRevision:0,reason:'Fiche synthétique'});
 assert.equal((await request('checkCentralDraft',input,owner)).status,400);
 const report=await call('checkCentralDraft',{...input,draftRevision:1});assert.equal(report.diagnostics[0].code,'REFERENCE_MISSING');assert.equal(report.edges[0].status,'MISSING');assert.equal(report.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(report),/Secret de fiction|Biographie fictive/);
 const repeat=await call('checkCentralDraft',{...input,draftRevision:1});assert.equal(repeat.fingerprint,report.fingerprint);assert.equal((await request('checkCentralDraft',{...input,draftRevision:1,publish:true},owner)).status,400);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const kind of ['characters','inventory','accounts','registrations'])assert.deepEqual(session[kind],[]);
});

test('HTTP + Auth : fiches centrales M2, relations différées et admissions isolées',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`m2-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Fiches M2 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M2'],editWorkshops:['M2'],revision:0,reason:'Fiction M2'};await cmd('setCentralStaff',grant);
 const input={campaignId,characterId:'person',character:centralTestCharacter,draftRevision:0,characterRevision:0,reason:'Fiche fictive HTTP',requestId:randomUUID()};assert.equal((await request('saveCentralCharacter',input)).status,401);
 const r=await cmd('saveCentralCharacter',input,editor);assert.equal(r.characterRevision,1);assert.deepEqual(await cmd('saveCentralCharacter',input,editor),r);let d=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.equal(d.diagnostics[0].code,'REFERENCE_MISSING');assert.equal(d.changes[0].data.publicationState,'DRAFT');assert.equal(d.changes[0].data.objectives[0].published,false);
 assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M1'},editor)).status,403);assert.equal((await request('saveCentralCharacter',{...input,requestId:randomUUID(),draftRevision:1,characterRevision:1,character:{...centralTestCharacter,assignedUid:'player'}},editor)).status,400);
 await cmd('saveCentralCharacter',{campaignId,characterId:'target',character:{...centralTestCharacter,relations:[]},draftRevision:1,characterRevision:0,reason:'Cible fictive'},editor);d=await call('centralMaster',{campaignId,workshop:'M2'},editor);assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes.length,2);
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('saveCentralCharacter',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M2'},editor)).status,403);
 const s=await call('session',{sessionId});for(const k of ['characters','registrations','inventory','accounts'])assert.deepEqual(s[k],[]);assert.equal(s.versionId,null);
});

test('HTTP + Auth : XLSX central, aperçu volumineux, confirmation et révocation avant reçu',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`xlsx-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Excel HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M1'],editWorkshops:['M1'],revision:0,reason:'Import M1'};await cmd('setCentralStaff',grant);
 const e=await call('exportCentralDraft',{campaignId,workshop:'M1',ids:[]},editor);e.sheets.Objets=Array.from({length:15},(_,i)=>({...centralItemRow,id:`x${i}`,notes_mj:'x'.repeat(10000)}));
 const input={campaignId,workshop:'M1',fileName:'synthétique.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.ok(JSON.stringify(input).length>128000);assert.equal((await request('prepareCentralImport',input)).status,401);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M4',ids:[]},editor)).status,403);
 const p=await call('prepareCentralImport',input,editor);assert.deepEqual(p.errors,[]);assert.equal((await call('centralMaster',{campaignId},editor)).draft.revision,0);
 const apply={...input,confirmation:p.confirmation,reason:'Import HTTP synthétique',requestId:randomUUID()},r=await cmd('applyCentralImport',apply,editor);assert.equal(r.changed,15);assert.deepEqual(await cmd('applyCentralImport',apply,editor),r);
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('applyCentralImport',apply,editor)).status,403);assert.equal((await request('prepareCentralImport',input,editor)).status,403);
 const s=await call('session',{sessionId});for(const k of ['characters','inventory','accounts'])assert.deepEqual(s[k],[]);assert.equal(s.versionId,null);
});

test('HTTP + Auth : recettes centrales, liens différés et droits M4 indépendants',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`recipe-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Recettes HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M4'],editWorkshops:['M4'],revision:0,reason:'Atelier M4'};await cmd('setCentralStaff',grant);
 const input={campaignId,recipeId:'formula',recipe:centralTestRecipe,draftRevision:0,recipeRevision:0,reason:'Formule fictive',requestId:randomUUID()};
 assert.equal((await request('saveCentralRecipe',input)).status,401);
 const saved=await cmd('saveCentralRecipe',input,editor);assert.deepEqual(await cmd('saveCentralRecipe',input,editor),saved);
 let d=await call('centralMaster',{campaignId,workshop:'M4'},editor);assert.deepEqual(d.references.items,[]);assert.deepEqual(d.references.knowledge,[]);assert.equal(d.references.knowledgeReadable,false);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').map(x=>x.field).sort(),['components.0.itemId','laboratoryTargetId','productItemId','unlockKnowledgeId']);
 assert.equal((await request('centralMaster',{campaignId,workshop:'M1'},editor)).status,403);
 assert.equal((await request('saveCentralItem',{campaignId,itemId:'ingredient',item:centralTestItem,draftRevision:1,itemRevision:0,reason:'Interdit',requestId:randomUUID()},editor)).status,403);
 await cmd('saveCentralItem',{campaignId,itemId:'ingredient',item:centralTestItem,draftRevision:1,itemRevision:0,reason:'Compléter M1'});
 await cmd('setCentralStaff',{...grant,readWorkshops:['M1','M4'],revision:1});
 d=await call('centralMaster',{campaignId,workshop:'M4'},editor);assert.equal(d.references.items.length,1);assert.equal(d.diagnostics.some(x=>x.reference==='ingredient'),false);assert.deepEqual(d.references.knowledge,[]);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').map(x=>x.field),['unlockKnowledgeId','laboratoryTargetId']);assert.equal(d.publicationAvailable,false);
 await cmd('setCentralStaff',{...grant,active:false,revision:2});assert.equal((await request('saveCentralRecipe',input,editor)).status,403);
 const s=await call('session',{sessionId});for(const kind of ['characters','inventory','accounts'])assert.deepEqual(s[kind],[]);assert.equal(s.versionId,null);
});

test('HTTP + Auth : Master central, délégation M1, révocation et aucun accès aux inscriptions',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`central-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email),player=await googleTestAccount(`central-player-${randomUUID()}@example.invalid`);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Master central HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice synthétique'});
 assert.equal((await request('centralMaster',{campaignId})).status,401);assert.equal((await request('centralMaster',{campaignId},player)).status,403);
 const grant={campaignId,email,active:true,readWorkshops:['M1'],editWorkshops:['M1'],revision:0,reason:'Préparer M1'};await cmd('setCentralStaff',grant);
 assert.equal((await call('dashboard',{},editor)).centralCampaigns[0].id,campaignId);
 const input={campaignId,itemId:'ingredient-http',item:centralTestItem,draftRevision:0,itemRevision:0,reason:'Modèle HTTP',requestId:randomUUID()},saved=await cmd('saveCentralItem',input,editor);assert.deepEqual(await cmd('saveCentralItem',input,editor),saved);
 assert.equal((await call('centralMaster',{campaignId,workshop:'M1'},editor)).changes.length,1);
 assert.equal((await request('centralMaster',{campaignId,workshop:'M2'},editor)).status,403);assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:1,settings:admissionTestSettings,reason:'Catalogue narratif'});
 assert.equal((await call('centralMaster',{campaignId,workshop:'M2'})).changes.length,1);
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('saveCentralItem',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId},editor)).status,403);
 const s=await call('session',{sessionId});for(const kind of ['characters','inventory','accounts'])assert.deepEqual(s[kind],[]);assert.equal(s.versionId,null);
});

test('HTTP + Auth : régie MJ, transfert idempotent et aucune création de patrimoine',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`roster-${randomUUID()}@example.invalid`);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const cmd=(action,input={})=>call(action,{requestId:randomUUID(),...input});
 const {id:scenarioId}=await cmd('createScenario',{title:'Régie HTTP synthétique'});
 const {id:characterId}=await cmd('saveCharacter',{scenarioId,revision:1,displayName:'Personnage HTTP',publicationState:'PUBLISHED'});
 const {id:versionId}=await cmd('publishScenario',{scenarioId,revision:2});const {id:sessionId}=await cmd('createSession',{scenarioId,versionId,title:'Session HTTP synthétique',capacity:1,privacy:'Notice fictive'});
 const before=await call('session',{sessionId});
 for(const groupId of ['a','b'])await cmd('saveGroupRoster',{sessionId,groupId,groupRevision:0,name:groupId,visibility:'SECRET',publicationState:'PUBLISHED',kind:'TEAM',capacity:1,leaderId:null,reason:'Configuration HTTP'});
 assert.equal((await request('groupManagement',{sessionId})).status,401);assert.equal((await request('groupManagement',{sessionId},player)).status,403);
 const input={sessionId,characterId,sourceGroupId:null,targetGroupId:'a',membership:rosterMembership(),authorizePermissions:false,reason:'Affectation HTTP'};
 let p=await call('prepareGroupMembership',input);await cmd('applyGroupMembership',{...input,confirmation:p.confirmation});
 const transfer={...input,sourceGroupId:'a',targetGroupId:'b'};p=await call('prepareGroupMembership',transfer);const apply={...transfer,confirmation:p.confirmation,requestId:randomUUID()};assert.equal((await request('applyGroupMembership',apply,player)).status,403);
 const r=await cmd('applyGroupMembership',apply);assert.deepEqual(await cmd('applyGroupMembership',apply),r);
 const d=await call('groupManagement',{sessionId});assert.equal(d.groups.find(g=>g.id==='a').members[0].active,false);assert.equal(d.groups.find(g=>g.id==='b').members[0].active,true);
 const after=await call('session',{sessionId});for(const key of ['accounts','inventory','characters'])assert.deepEqual(after[key],before[key]);
});

test('HTTP + Auth : invitation SO, dossier privé, consentement et refus des pouvoirs PNJ',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`admit-${randomUUID()}@example.invalid`),other=await googleTestAccount(`other-admit-${randomUUID()}@example.invalid`);
 const cmd=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const {id:sessionId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Admissions HTTP',title:'Préparation fictive',capacity:5,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Test HTTP'});
 const token=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{sessionId,tokenHash:hash(token),hours:1,maxUses:2,label:'Test'});
 assert.equal((await request('admissionInvitation',{sessionId,token})).status,401);
 const view=await request('admissionInvitation',{sessionId,token},player);assert.equal(view.status,200);assert.equal(view.result.classes.length,8);
 const begin={sessionId,token,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true,requestId:randomUUID()};const opened=await request('beginAdmission',begin,player);assert.equal(opened.status,200);assert.deepEqual(await request('beginAdmission',begin,player),opened);
 assert.equal((await request('admissionAdmin',{sessionId},player)).status,403);assert.equal((await request('myAdmission',{sessionId},other)).status,403);
 const save={sessionId,sessionRevision:1,revision:1,policyRevision:1,draftRevision:1,proposal:admissionTestProposal,submit:true,consent:true};
 assert.equal((await request('saveAdmissionProposal',{...save,requestId:randomUUID(),proposal:{...admissionTestProposal,secondaryId:'FOR-01'}},player)).error,'INVALID_ADMISSION_CHOICE');
 await cmd('saveAdmissionProposal',save,player);const dossier=await request('myAdmission',{sessionId},player);assert.equal(dossier.result.status,'SUBMITTED');
 await cmd('revokeAdmissionInvitation',{sessionId,invitationId:hash(token),reason:'Fin de test'});
 assert.equal((await request('myAdmission',{sessionId},player)).result.editable,false);
 assert.equal((await request('session',{sessionId},owner)).result.characters.length,0);
});

test('HTTP + Auth : décision MJ, dernière place, historique privé et retrait sans double confirmation',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`review-${randomUUID()}@example.invalid`),other=await googleTestAccount(`review-other-${randomUUID()}@example.invalid`);
 const cmd=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const {id:sessionId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Décisions HTTP',title:'Préparation fictive',capacity:2,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:{...admissionTestSettings,quotas:{...admissionTestSettings.quotas,COM:1}},reason:'Test HTTP'});
 const token=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{sessionId,tokenHash:hash(token),hours:1,maxUses:2,label:'Test'});
 for(const [who,firstName] of [[player,'Ari'],[other,'Bela']]){
  await cmd('beginAdmission',{sessionId,token,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true},who);
  await cmd('saveAdmissionProposal',{sessionId,revision:1,sessionRevision:1,policyRevision:1,draftRevision:1,proposal:{...admissionTestProposal,firstName},submit:true,consent:true},who);
 }
 const admin=await cmd('admissionAdmin',{sessionId}),uid=admin.registrations.find(r=>r.admission.proposal.firstName==='Ari').uid,otherUid=admin.registrations.find(r=>r.uid!==uid).uid;
 const decision={sessionId,uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation HTTP',requestId:randomUUID()};
 assert.equal((await request('reviewAdmission',decision,player)).status,403);
 const result=await cmd('reviewAdmission',decision);assert.equal(result.status,'APPROVED');assert.deepEqual(await cmd('reviewAdmission',decision),result);
 assert.equal((await cmd('reviewAdmission',{...decision,uid:otherUid,requestId:randomUUID()})).status,'WAITLISTED');
 assert.equal((await request('admissionHistory',{sessionId,uid},other)).status,403);
 const historyResponse=await request('admissionHistory',{sessionId},player);assert.equal(historyResponse.status,200);const history=historyResponse.result;assert.equal(history.versions.length,2);assert.doesNotMatch(JSON.stringify(history),/actorUid|invitationHash|identityKey/);
 await cmd('revokeAdmissionInvitation',{sessionId,invitationId:hash(token),reason:'Fin du lien'});
 const withdraw={sessionId,revision:3,reason:'Retrait HTTP',requestId:randomUUID()};await cmd('withdrawAdmission',withdraw,player);await cmd('withdrawAdmission',withdraw,player);
 await cmd('reviewAdmission',decision);const state=(await request('session',{sessionId},owner)).result;assert.equal(state.accepted,0);assert.equal(state.characters.length,0);assert.equal(state.accounts.length,0);
 assert.equal((await cmd('myAdmission',{sessionId},player)).status,'WITHDRAWN');
});

test('HTTP + Auth : préparation SO privée, création unique et aucune ressource de jeu',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`prep-${randomUUID()}@example.invalid`);
 const input={creationId:randomUUID(),campaignTitle:'SO HTTP fictif',title:'Préparation HTTP',capacity:60,privacy:'Notice fictive',requestId:randomUUID()};
 assert.equal((await request('createSpaceOutlawsPreparation',input)).status,401);
 assert.equal((await request('createSpaceOutlawsPreparation',input,player)).status,403);
 const first=await request('createSpaceOutlawsPreparation',input,owner);assert.equal(first.status,200,JSON.stringify(first));
 assert.deepEqual(await request('createSpaceOutlawsPreparation',{...input,requestId:randomUUID()},owner),first);
 const sessionId=first.result.id;
 const view=await request('session',{sessionId},owner);assert.equal(view.status,200);assert.equal(view.result.preparationKind,'SPACE_OUTLAWS_V07');
 for(const kind of ['characters','accounts','inventory','registrations'])assert.deepEqual(view.result[kind],[]);
 assert.equal((await request('session',{sessionId},player)).status,403);
 assert.equal((await request('publicSession',{sessionId})).error,'NOT_FOUND');
 const denied=await request('setRegistrationOpen',{sessionId,revision:1,open:true,requestId:randomUUID()},owner);assert.equal(denied.error,'PREPARATION_ONLY');
 const edit={sessionId,revision:1,title:'Lieu corrigé',capacity:60,privacy:'Notice fictive',reason:'Correction',requestId:randomUUID()};
 assert.equal((await request('saveSpaceOutlawsPreparation',edit,player)).status,403);
 const saved=await request('saveSpaceOutlawsPreparation',edit,owner);assert.equal(saved.status,200);assert.deepEqual(await request('saveSpaceOutlawsPreparation',edit,owner),saved);
 assert.equal((await request('session',{sessionId},owner)).result.revision,2);
});

test('HTTP + Auth : QR de lieu privé, action confirmée et récompense unique',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`field-${randomUUID()}@example.invalid`);
 const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const {id:scenarioId}=await command('createScenario',{title:'Terrain HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
 const targetId='cache-http',sheets=masterExample();sheets.Lieux=[{id:targetId,operation:'CREER',version:'1',titre:'Cachette HTTP',type:'SEARCH',publication:'PUBLISHED',notes_mj:'RESERVE_PRIVEE_HTTP'}];sheets.ActionsTerrain=[{id:'fouille-http',operation:'CREER',version:'1',lieu_id:targetId,type:'SEARCH',duree_secondes:'0',test:'AUTO'}];sheets.Recompenses=[{id:'credits-http',operation:'CREER',version:'1',lieu_id:targetId,type:'CREDITS',quantite:'7',stock_initial:'1',limite_personnage:'1'}];
 const master={scenarioId,sheets,reason:'Données synthétiques'},mp=await command('prepareMasterImport',master);await command('applyMasterImport',{...master,confirmation:mp.confirmation});
 const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Terrain HTTP',capacity:1,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
 await command('setRegistrationOpen',{sessionId,revision:1,open:true});await command('register',{sessionId,name:'Test'},player);const uid=(await command('identity',{},player)).uid;await command('assign',{sessionId,uid,characterId:'pilote'});
 const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});await command('redeem',{sessionId,token:invitation},player);for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
 for(const action of fieldCommands)assert.equal((await request(action,{sessionId,targetId,requestId:randomUUID()})).status,401);assert.equal((await request('fieldAdmin',{sessionId},player)).status,403);
 const target=await command('fieldTarget',{sessionId,targetId},player);assert.equal(JSON.stringify(target).includes('RESERVE_PRIVEE_HTTP'),false);assert.equal('rewards' in target.target,false);
 const input={sessionId,targetId,kind:'SEARCH'},preview=await command('prepareFieldAction',input,player),started=await command('startFieldAction',{...input,confirmation:preview.confirmation,present:true},player);
 const payload={sessionId,actionId:started.id,present:true,requestId:randomUUID()},finished=await request('finishFieldAction',payload,player);assert.equal(finished.status,200,JSON.stringify(finished));assert.equal(finished.result.result.reward.quantity,7);assert.deepEqual(await request('finishFieldAction',payload,player),finished);
 assert.equal((await command('myWallet',{sessionId},player)).account.balance,107);await command('revokeAccess',{sessionId,uid});assert.equal((await request('finishFieldAction',payload,player)).status,403);
});

test('HTTP + Auth : master validé, refus des accès étrangers et import atomique',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),visitor=await googleTestAccount(`masters-${randomUUID()}@example.invalid`);
 const initial=await request('createScenario',{title:'Master HTTP',requestId:randomUUID()},owner);assert.equal(initial.status,200);const scenarioId=initial.result.id;
 const payload={scenarioId,sheets:terrainMasterExample(),reason:'Validation HTTP',filename:'Exemple test.xlsx'};
 for(const action of masterCommands){assert.equal((await request(action,{...payload,requestId:randomUUID()})).status,401);assert.equal((await request(action,{...payload,requestId:randomUUID()},visitor)).status,403);}
 const preview=await request('prepareMasterImport',payload,owner);assert.equal(preview.status,200);assert.deepEqual(preview.result.errors,[]);
 const command={...payload,confirmation:preview.result.confirmation,requestId:randomUUID()},saved=await request('applyMasterImport',command,owner);assert.equal(saved.status,200);assert.deepEqual(await request('applyMasterImport',command,owner),saved);
 const scenario=await request('scenario',{scenarioId},owner);assert.equal(scenario.result.characters.length,1);assert.equal(scenario.result.characters[0].startingCredits.amount,100);
 const field=await request('fieldAdmin',{scenarioId},owner);assert.equal(field.result.fieldTargets.length,2);const people=await request('personAdmin',{scenarioId},owner);assert.equal(people.result.personProfiles.length,5);
 const changed=structuredClone(payload);changed.sheets.Personnages[0].nom='Autre nom sans changer la version';const denied=await request('prepareMasterImport',changed,owner);assert.equal(denied.result.canApply,false);assert.ok(denied.result.errors.some(e=>e.sheet==='Personnages'&&e.column==='version'));
 const history=await request('masterImportHistory',{scenarioId},owner);assert.equal(history.result.imports.length,1);
});

test('HTTP + Auth : PV privés, dégât personnel et soin confirmé avec usage unique',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),healer=await googleTestAccount(`heal-${randomUUID()}@example.invalid`),patient=await googleTestAccount(`patient-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'PV HTTP'}),characters=[];
  const scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
  for(const name of ['Soignant','Patient'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName:name,publicationState:'PUBLISHED'})).id);
  const {id:skillId}=await command('saveSkill',{scenarioId,revision:(await scenario()).revision,name:'Soin HTTP',kind:'ACTIVE_TARGET',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:1,cooldownSeconds:0},gmNotes:'SECRET_HTTP_SOIN'});
  const profile={scenarioId,revision:(await scenario()).revision,characterId:characters[0],classId:null,overrides:[{skillId,level:1}],published:true};
  const prepared=await request('prepareAbilityProfile',profile,owner);assert.equal(prepared.status,200);await command('setAbilityProfile',{...profile,confirmation:prepared.result.confirmation});
  await command('saveScenarioHealth',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Soins HTTP',capacity:2,privacy:'Fictif'});
  const session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});
  for(const [i,token] of [healer,patient].entries()){
    const uid=(await request('identity',{},token)).result.uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});
    const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);
  }
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['myHealth','prepareDamage','applyDamage','prepareTreatment','applyTreatment','correctHealth','healthHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  for(const action of actionPointCommands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const apInput={sessionId,revision:(await session()).revision,reason:'Règles HTTP',rules:{enabled:true,maxByLevel:{1:5,2:8},renewalMinutes:300,cost:1,cooldownSeconds:600,patientCooldownSeconds:600}};
  const apPrepared=await request('prepareActionPointRules',apInput,owner);assert.equal(apPrepared.status,200);
  assert.equal((await request('saveActionPointRules',{...apInput,confirmation:apPrepared.result.confirmation,requestId:randomUUID()},patient)).status,403);
  await command('saveActionPointRules',{...apInput,confirmation:apPrepared.result.confirmation});
  const damage={sessionId,amount:5,characterId:characters[0]},dp=await request('prepareDamage',damage,patient);assert.equal(dp.result.characterName,'Patient');await command('applyDamage',{...damage,confirmation:dp.result.confirmation},patient);
  assert.equal((await request('myHealth',{sessionId},healer)).result.health.hp,10);
  assert.equal((await request('myHealth',{sessionId,characterId:characters[0]},patient)).result.health.hp,5);
  assert.equal((await request('correctHealth',{sessionId,requestId:randomUUID(),admin:true},patient)).status,403);
  const input={sessionId,skillId,targetId:characters[1]},p=await request('prepareTreatment',input,healer);assert.equal(p.status,200);
  assert.equal((await request('prepareTreatment',{sessionId,skillId,targetId:characters[0]},patient)).status,403);
  const confirmed={...input,requestId:randomUUID(),confirmation:p.result.confirmation},a=await request('applyTreatment',confirmed,healer);assert.equal(a.status,200);assert.deepEqual(await request('applyTreatment',confirmed,healer),a);
  const own=await request('myHealth',{sessionId},healer);assert.equal(own.result.actionPoints.available,4);assert.equal(own.result.skills[0].remaining,0);assert.equal(JSON.stringify(own).includes('SECRET_HTTP_SOIN'),false);
  assert.equal((await request('myHealth',{sessionId},patient)).result.health.hp,8);
  const denied=await request('prepareTreatment',input,healer);assert.equal(denied.error,'NO_USES_LEFT');
  for(const action of personCommands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  assert.equal((await request('personAdmin',{sessionId},patient)).status,403);
  const expert=await command('saveSessionSkill',{sessionId,revision:(await session()).revision,name:'Expertise soin temporisé',kind:'PASSIVE',publicationState:'PUBLISHED',reason:'Test'});
  const ability={sessionId,revision:(await session()).revision,characterId:characters[0],classId:null,overrides:[{skillId:expert.id,level:2}],published:true,reason:'Test'};
  const ap=await command('prepareAbilityProfile',ability);await command('setAbilityProfile',{...ability,confirmation:ap.confirmation});
  const protocol=await command('savePersonProfile',{sessionId,reason:'Test de soin temporisé',profile:{kind:'FIELD_CARE',name:'Protocole HTTP',publicationState:'PUBLISHED',skillId:expert.id,minLevel:1,durationSeconds:0}});
  const personInput={sessionId,targetId:characters[1],profileId:protocol.id},personPreview=await command('preparePersonAction',personInput,healer),started=await command('startPersonAction',{...personInput,confirmation:personPreview.confirmation,present:true},healer);
  assert.equal((await request('finishPersonAction',{sessionId,actionId:started.id,present:true,requestId:randomUUID()},patient)).status,403);
  const resolution={sessionId,actionId:started.id,present:true,requestId:randomUUID()},finished=await request('finishPersonAction',resolution,healer);assert.equal(finished.status,200,JSON.stringify(finished));assert.equal(finished.result.result.hp,9);assert.deepEqual(await request('finishPersonAction',resolution,healer),finished);
  assert.equal((await request('myHealth',{sessionId},healer)).result.actionPoints.available,3);
  assert.equal((await request('preparePersonAction',personInput,healer)).error,'PATIENT_COOLDOWN_ACTIVE');
});
async function googleTestAccount(email){
  // Only Auth Emulator accepts these unsigned synthetic Google assertions.
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const jwt=`${enc({alg:'none',typ:'JWT'})}.${enc({sub:randomUUID(),email,email_verified:true,name:'Test isolé'})}.`;
  const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-key`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',postBody:`id_token=${jwt}&providerId=google.com`,returnSecureToken:true})});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data.idToken;
}
test('HTTP + Auth : sac privé et consommable retiré une seule fois avec le soin confirmé',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`stock-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Inventaire HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
  const {id:characterId}=await command('saveCharacter',{scenarioId,revision:1,displayName:'Soignant HTTP',publicationState:'PUBLISHED'});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Injecteur HTTP',kind:'STACKABLE',consumable:true,publicationState:'PUBLISHED',gmNotes:'SECRET_STOCK_HTTP'});
  const seed={scenarioId,revision:(await scenario()).revision,characterId,items:[{itemId,quantity:1}]},sp=await request('prepareStartingInventory',seed,owner);assert.equal(sp.status,200);await command('setStartingInventory',{...seed,confirmation:sp.result.confirmation});
  const {id:skillId}=await command('saveSkill',{scenarioId,revision:(await scenario()).revision,name:'Auto-soin HTTP',kind:'ACTIVE_SELF',publicationState:'PUBLISHED',healing:{effect:'HEAL_HP',amount:3,uses:1,cooldownSeconds:0,consumable:{itemId,quantity:1}}});
  const profile={scenarioId,revision:(await scenario()).revision,characterId,classId:null,overrides:[{skillId,level:1}],published:true},pp=await request('prepareAbilityProfile',profile,owner);assert.equal(pp.status,200);await command('setAbilityProfile',{...profile,confirmation:pp.result.confirmation});
  await command('saveScenarioHealth',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,defaultMaxHp:10,returnMode:'MJ',allowed:{}}});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Stock de test',capacity:1,privacy:'Fictif'});
  const session=async()=>(await request('session',{sessionId},owner)).result;await command('setRegistrationOpen',{sessionId,revision:1,open:true});await command('register',{sessionId,name:'Test'},player);
  const uid=(await request('identity',{},player)).result.uid;await command('assign',{sessionId,uid,characterId});const token=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(token),hours:1});assert.equal((await request('redeem',{sessionId,token},player)).status,200);
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['myInventory','previewInventory','saveItem','saveSessionItem','prepareStartingInventory','setStartingInventory','prepareGrantItem','grantItem','correctLot','itemHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  for(const action of ['previewInventory','grantItem','correctLot','itemHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID(),characterId,admin:true},player)).status,403);
  const bag=(await request('myInventory',{sessionId,characterId:'forged'},player)).result;assert.equal(bag.lots.length,1);assert.equal(bag.character.id,characterId);assert.equal(JSON.stringify(bag).includes('SECRET_STOCK_HTTP'),false);
  const damage={sessionId,amount:6},dp=await request('prepareDamage',damage,player);await command('applyDamage',{...damage,confirmation:dp.result.confirmation},player);
  const input={sessionId,skillId,targetId:characterId,lotId:bag.lots[0].id},prepared=await request('prepareTreatment',input,player);assert.equal(prepared.status,200);assert.equal(prepared.result.consumable.quantity,1);
  assert.equal((await request('myInventory',{sessionId},player)).result.lots[0].quantity,1);
  const confirmed={...input,requestId:randomUUID(),confirmation:prepared.result.confirmation},applied=await request('applyTreatment',confirmed,player);assert.equal(applied.status,200);assert.deepEqual(await request('applyTreatment',confirmed,player),applied);
  const after=(await request('myInventory',{sessionId},player)).result.lots[0];assert.equal(after.quantity,0);assert.equal(after.status,'CONSUMED');assert.equal((await request('myHealth',{sessionId},player)).result.health.hp,7);
  await command('revokeAccess',{sessionId,uid});assert.equal((await request('myInventory',{sessionId},player)).status,403);assert.equal((await request('applyTreatment',confirmed,player)).status,403);
});
test('HTTP + Auth : le jeton vérifié détermine le rôle, jamais le JSON ou un en-tête Sites',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`${randomUUID()}@example.invalid`);
  assert.equal((await request('identity',{},owner)).result.admin,true);
  assert.equal((await request('identity',{email:'gkerckhofs@gmail.com',admin:true},player)).result.admin,false);
  assert.equal((await request('dashboard',{},player)).status,403);
  assert.equal((await request('dashboard')).status,401);
  assert.equal((await request('dashboard',{},'forged')).status,401);
  const spoof=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'owner'},body:JSON.stringify({action:'dashboard'})});
  assert.equal(spoof.status,401);
  const created=await request('createScenario',{requestId:randomUUID(),title:'API intégrée'},owner);assert.equal(created.status,200);assert.ok(created.result.id);
});
test('HTTP + Auth : délégation enregistrée, projection accueil et révocation immédiate',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),email=`staff-${randomUUID()}@example.invalid`,staff=await googleTestAccount(email);
  const command=(action,input={},token=owner)=>request(action,{requestId:randomUUID(),...input},token);
  const scenario=await command('createScenario',{title:'Test équipe HTTP'}),scenarioId=scenario.result.id;
  const character=await command('saveCharacter',{scenarioId,revision:1,displayName:'Contact',publicationState:'PUBLISHED',playerSecrets:'SECRET_HTTP',gmNotes:'MJ_HTTP'});
  const group=await command('saveGroup',{scenarioId,revision:2,name:'GROUPE_SECRET_HTTP',visibility:'SECRET',publicationState:'PUBLISHED',briefing:'BRIEFING_HTTP',gmNotes:'VERITE_HTTP',members:[]});
  assert.equal(group.status,200);
  const knowledge=await command('saveKnowledge',{scenarioId,revision:3,title:'CONNAISSANCE_HTTP',body:'TEXTE_PRIVE_HTTP',gmTruth:'VERITE_CONNAISSANCE_HTTP',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'COPY',qrAudience:'SELECTED',initialCharacterIds:[character.result.id]});
  assert.equal(knowledge.status,200);
  const version=await command('publishScenario',{scenarioId,revision:4});
  const created=await command('createSession',{scenarioId,versionId:version.result.id,title:'Session HTTP',capacity:2,privacy:'Données fictives'}),sessionId=created.result.id;
  assert.equal((await request('session',{sessionId,role:'OWNER'},staff)).status,403);
  assert.equal((await command('setStaff',{sessionId,revision:1,email,role:'RECEPTION',active:true,reason:'Accueil de test'})).status,200);
  const view=await request('session',{sessionId},staff);assert.equal(view.status,200);assert.equal(view.result.role,'RECEPTION');
  assert.equal('groups' in view.result,false);
  assert.equal('knowledge' in view.result,false);assert.equal(JSON.stringify(view.result).includes('CONNAISSANCE_HTTP'),false);
  for(const action of ['knowledgeHistory','knowledgeRecipients','previewKnowledge','previewKnowledgeDetail'])assert.equal((await request(action,{sessionId,knowledgeId:knowledge.result.id,characterId:character.result.id},staff)).status,403);
  for(const action of ['myKnowledge','knowledgeDetail','discoverKnowledge','shareKnowledge'])assert.equal((await request(action,{sessionId,knowledgeId:knowledge.result.id,requestId:randomUUID()})).status,401);
  assert.equal((await request('knowledgeHistory',{sessionId,knowledgeId:knowledge.result.id},owner)).status,200);
  assert.equal(JSON.stringify(view.result).includes('GROUPE_SECRET_HTTP'),false);
  assert.equal((await request('groupHistory',{sessionId,groupId:group.result.id},staff)).status,403);
  assert.equal((await request('myGroup',{sessionId,groupId:group.result.id})).status,401);
  assert.equal((await request('previewGroup',{sessionId,groupId:group.result.id,characterId:character.result.id},staff)).status,403);
  assert.equal(JSON.stringify(view.result).includes('SECRET_HTTP'),false);assert.equal(JSON.stringify(view.result).includes('MJ_HTTP'),false);
  assert.equal((await request('preview',{sessionId,characterId:character.result.id},staff)).status,403);
  assert.equal((await request('dashboard',{},staff)).result.sessions.length,1);
  assert.equal((await command('setStaff',{sessionId,revision:2,email,role:'RECEPTION',active:false,reason:'Fin de test'})).status,200);
  assert.equal((await request('session',{sessionId},staff)).status,403);
});

test('HTTP + Auth : carnet privé absent des accès MJ et copie uniquement après confirmation explicite',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),alice=await googleTestAccount(`notes-a-${randomUUID()}@example.invalid`),bob=await googleTestAccount(`notes-b-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Carnet HTTP'}),characters=[];
  for(const [i,name] of ['Auteur','Contact'].entries())characters.push((await command('saveCharacter',{scenarioId,revision:i+1,displayName:name,publicationState:'PUBLISHED'})).id);
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:3});
  const {id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Notes HTTP',capacity:2,privacy:'Fictif'});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});
  for(const [i,token] of [alice,bob].entries()){
    const uid=(await request('identity',{},token)).result.uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});
    const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);
  }
  const stage=async value=>command('setStage',{sessionId,revision:(await request('session',{sessionId},owner)).result.revision,stage:value});
  await stage('BRIEFING');const note=await command('saveNote',{sessionId,revision:0,title:'PRIVE_HTTP_CARNET',body:'TEXTE_HTTP_CARNET'},alice);
  const detail=await request('noteDetail',{sessionId,noteId:note.id},alice);assert.equal(detail.status,200);assert.equal(detail.result.note.body,'TEXTE_HTTP_CARNET');
  for(const token of [owner,bob])assert.equal((await request('noteDetail',{sessionId,noteId:note.id,uid:(await request('identity',{},alice)).result.uid,admin:true},token)).status,403);
  assert.equal(JSON.stringify(await request('session',{sessionId},owner)).includes('PRIVE_HTTP_CARNET'),false);
  for(const action of ['myNotes','noteDetail','saveNote','prepareNoteShare','shareNote'])assert.equal((await request(action,{sessionId,noteId:note.id,requestId:randomUUID()})).status,401);
  await stage('EN_JEU');const input={sessionId,noteId:note.id,revision:1,authorCharacterId:characters[0],authorName:'Auteur',recipientId:characters[1],shareMode:'SHOW'};
  const preview=await request('prepareNoteShare',input,alice);assert.equal(preview.status,200);
  assert.deepEqual((await request('myKnowledge',{sessionId},bob)).result.items,[]);
  const shared=await command('shareNote',{...input,recipientVersion:preview.result.recipientVersion},alice);
  assert.equal((await request('knowledgeDetail',{sessionId,knowledgeId:shared.id},bob)).result.knowledge.body,'TEXTE_HTTP_CARNET');
  assert.equal((await request('noteDetail',{sessionId,noteId:note.id},owner)).status,403);
});

test('HTTP + Auth : profil confirmé par MJ, compétence publiée et découverte conditionnelle sans usurpation',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),player=await googleTestAccount(`skills-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Compétences HTTP'});
  const {id:characterId}=await command('saveCharacter',{scenarioId,revision:1,displayName:'Lecteur',publicationState:'PUBLISHED'});
  const {id:skillId}=await command('saveSkill',{scenarioId,revision:2,name:'Écriture ancienne',kind:'PASSIVE',publicationState:'PUBLISHED',gmNotes:'SECRET_EXPERTISE_HTTP'});
  const {id:classId}=await command('saveClass',{scenarioId,revision:3,name:'Lettré',skills:[{skillId,level:2}],publicationState:'PUBLISHED'});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:4});
  const {id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Expertise HTTP',capacity:1,privacy:'Synthétique'});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});await command('register',{sessionId,name:'Test'},player);
  const uid=(await request('identity',{},player)).result.uid;await command('assign',{sessionId,characterId,uid});
  const token=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(token),hours:1});assert.equal((await request('redeem',{sessionId,token},player)).status,200);
  const current=async()=>(await request('session',{sessionId},owner)).result;
  await command('setStage',{sessionId,revision:(await current()).revision,stage:'BRIEFING'});
  const {id:knowledgeId}=await command('saveSessionKnowledge',{sessionId,revision:(await current()).revision,title:'SECRET_CIBLE_HTTP',body:'Texte ancien',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'SHOW',qrEnabled:true,qrAudience:'ALL_PLAYERS',qrSkillId:skillId,qrSkillLevel:2,reason:'Épreuve'});
  await command('setStage',{sessionId,revision:(await current()).revision,stage:'EN_JEU'});
  const payload={sessionId,revision:(await current()).revision,characterId,classId,overrides:[],published:true,reason:'Attribution'};
  for(const action of ['prepareAbilityProfile','setAbilityProfile','saveSessionSkill','abilityHistory']){
    assert.equal((await request(action,{...payload,requestId:randomUUID(),kind:'characters',id:characterId})).status,401);
    assert.equal((await request(action,{...payload,requestId:randomUUID(),kind:'characters',id:characterId,admin:true},player)).status,403);
  }
  const prepared=await request('prepareAbilityProfile',payload,owner);assert.equal(prepared.status,200);
  assert.equal((await request('discoverKnowledge',{sessionId,knowledgeId,requestId:randomUUID(),level:99,characterId},player)).status,403);
  await command('setAbilityProfile',{...payload,confirmation:prepared.result.confirmation});
  const own=await request('mySession',{sessionId},player);assert.equal(own.result.character.abilities.skills[0].level,2);assert.equal(JSON.stringify(own).includes('SECRET_EXPERTISE_HTTP'),false);
  await command('discoverKnowledge',{sessionId,knowledgeId},player);
  assert.equal((await request('knowledgeDetail',{sessionId,knowledgeId},player)).result.knowledge.body,'Texte ancien');
});

test('HTTP + Auth : remise gratuite confirmée par le destinataire, 20 unités réparties en 12 et 8',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),alice=await googleTestAccount(`giver-${randomUUID()}@example.invalid`),bob=await googleTestAccount(`receiver-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Remises HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const name of ['Expéditeur','Destinataire'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName:name,publicationState:'PUBLISHED'})).id);
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Lot HTTP',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_REMISE_HTTP'});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},sp=await request('prepareStartingInventory',seed,owner);await command('setStartingInventory',{...seed,confirmation:sp.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Remises de test',capacity:2,privacy:'Fictif'});
  const session=async()=>(await request('session',{sessionId},owner)).result;await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [alice,bob].entries()){
    const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);
  }
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const bag=(token)=>request('myInventory',{sessionId},token),lot=(await bag(alice)).result.lots[0],input={sessionId,lotId:lot.id,quantity:8,recipientId:characters[1]};
  for(const action of ['prepareLotTransfer','proposeLotTransfer','lotTransferDetail','acceptLotTransfer','declineLotTransfer','cancelLotTransfer'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  assert.equal((await request('prepareLotTransfer',{...input,recipientId:characters[0],characterId:characters[0],uid:uids[0]},bob)).status,403);
  const prep=await request('prepareLotTransfer',input,alice);assert.equal(prep.status,200);const proposal=await command('proposeLotTransfer',{...input,confirmation:prep.result.confirmation},alice);
  assert.equal((await bag(alice)).result.lots[0].quantity,20);const detail=await request('lotTransferDetail',{sessionId,transferId:proposal.id},bob);assert.equal(detail.status,200);assert.equal(JSON.stringify(detail).includes('SECRET_REMISE_HTTP'),false);
  const accept={sessionId,transferId:proposal.id,confirmation:detail.result.confirmation,received:true,requestId:randomUUID()};assert.equal((await request('acceptLotTransfer',accept,alice)).status,403);assert.equal((await request('lotTransferDetail',{sessionId,transferId:proposal.id},owner)).status,403);
  const result=await request('acceptLotTransfer',accept,bob);assert.equal(result.status,200);assert.deepEqual(await request('acceptLotTransfer',accept,bob),result);
  assert.equal((await bag(alice)).result.lots[0].quantity,12);assert.equal((await bag(bob)).result.lots[0].quantity,8);assert.notEqual((await bag(bob)).result.lots[0].id,lot.id);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('acceptLotTransfer',accept,bob)).status,403);
});

test('HTTP + Auth : portefeuille privé, paiement confirmé unique et révocation immédiate',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),alice=await googleTestAccount(`pay-${randomUUID()}@example.invalid`),bob=await googleTestAccount(`receive-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Crédits HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Payeur','Bénéficiaire'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},sp=await request('prepareStartingCredits',seed,owner);assert.equal(sp.status,200);await command('setStartingCredits',{...seed,confirmation:sp.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Paiement HTTP',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [alice,bob].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['myWallet','previewWallet','preparePayment','payCredits','saveScenarioEconomy','saveSessionEconomy','prepareStartingCredits','setStartingCredits','prepareCreditAdjustment','applyCreditAdjustment','walletHistory'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  for(const action of ['previewWallet','prepareCreditAdjustment','applyCreditAdjustment','walletHistory'])assert.equal((await request(action,{sessionId,characterId:characters[0],requestId:randomUUID(),admin:true},bob)).status,403);
  assert.equal((await request('myWallet',{sessionId,characterId:characters[0]},bob)).result.account.balance,0);
  const input={sessionId,recipientId:characters[1],amount:80,memo:'Paiement de jeu',fromAccountId:'forged'},p=await request('preparePayment',input,alice);assert.equal(p.status,200);assert.equal(p.result.before.balance,100);assert.deepEqual(Object.keys(p.result.recipient).sort(),['id','name']);assert.equal((await request('myWallet',{sessionId},alice)).result.account.balance,100);
  const confirmed={...input,requestId:randomUUID(),confirmation:p.result.confirmation},r=await request('payCredits',confirmed,alice);assert.equal(r.status,200);assert.deepEqual(await request('payCredits',confirmed,alice),r);assert.equal((await request('myWallet',{sessionId},alice)).result.account.balance,20);
  const w=(await request('myWallet',{sessionId},bob)).result;assert.equal(w.account.balance,80);assert.equal(w.entries.length,2);assert.equal(JSON.stringify(w).includes('actorUid'),false);
  await command('revokeAccess',{sessionId,uid:uids[0]});assert.equal((await request('myWallet',{sessionId},alice)).status,403);assert.equal((await request('payCredits',confirmed,alice)).status,403);
});

test('HTTP + Auth : caisse collective, lecture seule et paiement sans divulguer le solde',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),reader=await googleTestAccount(`reader-${randomUUID()}@example.invalid`),spender=await googleTestAccount(`spender-${randomUUID()}@example.invalid`),recipient=await googleTestAccount(`other-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Caisses HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Lecteur','Caissier','Bénéficiaire'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const {id:groupId}=await command('saveGroup',{scenarioId,revision:(await scenario()).revision,name:'SECRET_HTTP_CAISSE',visibility:'SECRET',publicationState:'PUBLISHED',members:[{characterId:characters[0],active:true,revealed:true,permissions:{readWallet:true}},{characterId:characters[1],active:true,revealed:true,permissions:{payWallet:true}}]});
  const configure={scenarioId,revision:(await scenario()).revision,groupId,label:'Comptoir HTTP',amount:100},cp=await request('prepareGroupWallet',configure,owner);assert.equal(cp.status,200);await command('setGroupWallet',{...configure,confirmation:cp.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Compte partagé HTTP',capacity:3,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});for(const [i,token] of [reader,spender,recipient].entries()){const uid=(await request('identity',{},token)).result.uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const list=(await request('myAccounts',{sessionId},reader)).result,accountId=list.accounts.find(a=>a.kind==='GROUP').id,readInput={sessionId,accountId},payment={sessionId,fromAccountId:accountId,recipientId:characters[2],amount:80,memo:'Paiement HTTP collectif'};
  assert.equal((await request('readAccount',readInput,reader)).result.balances.balance,100);assert.equal((await request('prepareAccountPayment',payment,reader)).status,403);assert.equal((await request('readAccount',readInput,recipient)).status,403);
  const d=(await request('readAccount',readInput,spender)).result;assert.equal('balances' in d,false);assert.equal('entries' in d,false);const p=await request('prepareAccountPayment',payment,spender);assert.equal(p.status,200);assert.equal('before' in p.result,false);assert.equal('after' in p.result,false);
  const confirmed={...payment,confirmation:p.result.confirmation,requestId:randomUUID()},r=await request('payFromAccount',confirmed,spender);assert.equal(r.status,200);assert.deepEqual(await request('payFromAccount',confirmed,spender),r);assert.equal('account' in r.result,false);
  assert.equal((await request('readAccount',readInput,reader)).result.balances.balance,20);const w=(await request('myWallet',{sessionId},recipient)).result;assert.equal(w.account.balance,80);assert.equal(w.entries.find(e=>e.id===r.result.id).counterparty.name,'Comptoir HTTP');assert.equal(JSON.stringify(w).includes('SECRET_HTTP_CAISSE'),false);
  const s=await session(),g=s.groups.find(g=>g.id===groupId);await command('saveSessionGroup',{...g,sessionId,groupId,revision:s.revision,members:g.members.map(m=>({...m,permissions:{readWallet:true,payWallet:false}})),reason:'Retrait du droit de payer'});assert.equal((await request('payFromAccount',confirmed,spender)).status,403);
  for(const action of ['prepareGroupWallet','setGroupWallet','myAccounts','readAccount','previewAccount','prepareAccountPayment','payFromAccount'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
});


test('HTTP + Auth : vente privée payée une fois, propriété puis retrait physique distinct',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),seller=await googleTestAccount(`seller-${randomUUID()}@example.invalid`),buyer=await googleTestAccount(`buyer-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Ventes HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Vendeur','Acheteur'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[1],amount:100},cp=await request('prepareStartingCredits',seed,owner);await command('setStartingCredits',{...seed,confirmation:cp.result.confirmation});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Caisses fictives',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_VENTE_HTTP'});
  const inventory={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},ip=await request('prepareStartingInventory',inventory,owner);await command('setStartingInventory',{...inventory,confirmation:ip.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Ventes test',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [seller,buyer].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['prepareLotSale','proposeLotSale','lotSaleDetail','prepareLotPurchase','buyLot','declineLotSale','cancelLotSale','offerSalePickup','confirmSalePickup'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const bag=async token=>(await request('myInventory',{sessionId},token)).result,wallet=async token=>(await request('myWallet',{sessionId},token)).result,lot=(await bag(seller)).lots[0];
  const proposal={sessionId,lotId:lot.id,buyerId:characters[1],quantity:8,amount:40,minutes:60,pickupPlace:'Quai fictif',conditions:'Remise physique'};
  assert.equal((await request('prepareLotSale',{...proposal,buyerId:characters[0],uid:uids[0]},buyer)).status,403);
  const p=await request('prepareLotSale',proposal,seller);assert.equal(p.status,200);const {id:saleId}=await command('proposeLotSale',{...proposal,confirmation:p.result.confirmation},seller);
  const detail=async token=>(await request('lotSaleDetail',{sessionId,saleId},token)).result;assert.equal(JSON.stringify(await detail(buyer)).includes('SECRET_VENTE_HTTP'),false);assert.equal((await request('lotSaleDetail',{sessionId,saleId},owner)).status,403);
  const input={sessionId,saleId,fromAccountId:(await request('myAccounts',{sessionId},buyer)).result.accounts[0].id},pp=await request('prepareLotPurchase',input,buyer);assert.equal(pp.status,200);
  const confirmed={...input,confirmation:pp.result.confirmation,requestId:randomUUID()};assert.equal((await request('buyLot',confirmed,seller)).status,403);const paid=await request('buyLot',confirmed,buyer);assert.equal(paid.status,200);assert.deepEqual(await request('buyLot',confirmed,buyer),paid);
  assert.equal((await wallet(buyer)).account.balance,60);assert.equal((await wallet(seller)).account.balance,40);const b=await bag(buyer);assert.equal(b.lots.length,0);assert.equal(b.ownedElsewhere[0].quantity,8);assert.equal(b.ownedElsewhere[0].holderId,characters[0]);assert.equal((await bag(seller)).lots[0].quantity,12);assert.equal((await bag(seller)).heldForOthers[0].quantity,8);
  await command('offerSalePickup',{sessionId,saleId,confirmation:(await detail(seller)).pickupConfirmation},seller);
  const pickup={sessionId,saleId,confirmation:(await detail(buyer)).pickupConfirmation,received:true,requestId:randomUUID()};assert.equal((await request('confirmSalePickup',{...pickup,received:false},buyer)).error,'HANDOVER_REQUIRED');const collected=await request('confirmSalePickup',pickup,buyer);assert.equal(collected.status,200);assert.deepEqual(await request('confirmSalePickup',pickup,buyer),collected);
  assert.equal((await bag(buyer)).lots[0].quantity,8);assert.equal((await bag(buyer)).ownedElsewhere.length,0);assert.equal((await wallet(buyer)).account.balance,60);assert.equal((await wallet(buyer)).entries.filter(e=>e.kind==='SALE').length,1);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('buyLot',confirmed,buyer)).status,403);assert.equal((await request('confirmSalePickup',pickup,buyer)).status,403);
});

test('HTTP + Auth : marché réservé, accès privés et achat à prix confirmé',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),seller=await googleTestAccount(`seller-${randomUUID()}@example.invalid`),buyer=await googleTestAccount(`buyer-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Marché HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Vendeur','Acheteur'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[1],amount:100},cp=await request('prepareStartingCredits',seed,owner);await command('setStartingCredits',{...seed,confirmation:cp.result.confirmation});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Caisses fictives',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_VENTE_HTTP'});
  const inventory={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},ip=await request('prepareStartingInventory',inventory,owner);await command('setStartingInventory',{...inventory,confirmation:ip.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Marché test',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [seller,buyer].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  for(const action of ['market','marketListing','prepareMarketListing','publishMarketListing','prepareMarketPurchase','buyMarketListing','withdrawMarketListing','sessionMarket','withdrawSessionListing'])assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const bag=async token=>(await request('myInventory',{sessionId},token)).result,lot=(await bag(seller)).lots[0];
  const input={sessionId,lotId:lot.id,quantity:8,amount:40,minutes:60,pickupPlace:'Quai fictif',conditions:'Retrait physique après achat'};
  assert.equal((await request('prepareMarketListing',input,buyer)).status,403);const p=await request('prepareMarketListing',input,seller);assert.equal(p.status,200);assert.equal((await request('publishMarketListing',{...input,amount:1,confirmation:p.result.confirmation,requestId:randomUUID()},seller)).error,'STALE_REVISION');
  const r=await command('publishMarketListing',{...input,confirmation:p.result.confirmation},seller),m=await request('market',{sessionId},buyer);assert.equal(m.status,200);assert.equal(m.result.listings.length,1);assert.equal(m.result.listings[0].amount,40);assert.equal(JSON.stringify(m).includes('SECRET_VENTE_HTTP'),false);assert.equal((await bag(seller)).lots.find(l=>l.id===r.lotId).status,'RESERVED');
  const d=(await request('marketListing',{sessionId,listingId:r.id},seller)).result;assert.equal((await request('withdrawMarketListing',{sessionId,listingId:r.id,confirmation:d.confirmation,requestId:randomUUID()},buyer)).status,403);assert.equal((await request('sessionMarket',{sessionId,admin:true},buyer)).status,403);
  const pay={sessionId,listingId:r.id,fromAccountId:(await request('myAccounts',{sessionId},buyer)).result.accounts[0].id},pp=await request('prepareMarketPurchase',pay,buyer);assert.equal(pp.status,200);const confirmed={...pay,confirmation:pp.result.confirmation,requestId:randomUUID()},paid=await request('buyMarketListing',confirmed,buyer);assert.equal(paid.status,200);assert.deepEqual(await request('buyMarketListing',confirmed,buyer),paid);assert.equal((await request('myWallet',{sessionId},buyer)).result.account.balance,60);assert.equal((await bag(buyer)).ownedElsewhere[0].quantity,8);assert.equal((await request('market',{sessionId},buyer)).result.listings.length,0);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('buyMarketListing',confirmed,buyer)).status,403);assert.equal((await request('market',{sessionId},buyer)).status,403);
});

test('HTTP + Auth : petites annonces, candidature privée et réponse organisateur',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),seller=await googleTestAccount(`seller-${randomUUID()}@example.invalid`),buyer=await googleTestAccount(`buyer-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Missions HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result,characters=[];
  for(const displayName of ['Vendeur','Acheteur'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[1],amount:100},cp=await request('prepareStartingCredits',seed,owner);await command('setStartingCredits',{...seed,confirmation:cp.result.confirmation});
  const {id:itemId}=await command('saveItem',{scenarioId,revision:(await scenario()).revision,name:'Caisses fictives',kind:'STACKABLE',consumable:false,publicationState:'PUBLISHED',gmNotes:'SECRET_VENTE_HTTP'});
  const inventory={scenarioId,revision:(await scenario()).revision,characterId:characters[0],items:[{itemId,quantity:20}]},ip=await request('prepareStartingInventory',inventory,owner);await command('setStartingInventory',{...inventory,confirmation:ip.result.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Missions test',capacity:2,privacy:'Fictif'}),session=async()=>(await request('session',{sessionId},owner)).result;
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [seller,buyer].entries()){const uid=(await request('identity',{},token)).result.uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});assert.equal((await request('redeem',{sessionId,token:invitation},token)).status,200);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const commands=['sessionAnnouncements','prepareAnnouncement','saveAnnouncement','announcementHistory','sessionApplications','sessionApplication','prepareApplicationReply','replyApplication','announcements','announcementDetail','myApplications','applicationDetail','prepareAnnouncementResponse','respondAnnouncement','withdrawApplication','markApplicationRead'];
  for(const action of commands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const now=Date.now(),input={sessionId,revision:0,title:'Escorte synthétique',category:'ESCORT',mode:'ASSIGNMENT',sponsorKind:'NPC',sponsorName:'Comptoir anonyme',description:'Mission HTTP fictive',rewardType:'NEGOTIABLE',rewardText:'Crédits de jeu à discuter',places:1,conditions:'Conditions',proofExpected:'Validation MJ',briefing:'SECRET_BRIEFING_HTTP',gmNotes:'SECRET_ORGA_HTTP',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'TARGETED',characterIds:[characters[1]],groupIds:[]},reason:'Préparation'};
  assert.equal((await request('prepareAnnouncement',{...input,admin:true},buyer)).status,403);const p=await request('prepareAnnouncement',input,owner);assert.equal(p.status,200);const {id:announcementId}=await command('saveAnnouncement',{...input,confirmation:p.result.confirmation});
  assert.equal((await request('announcements',{sessionId},seller)).result.announcements.length,0);const board=(await request('announcements',{sessionId},buyer)).result;assert.equal(board.announcements.length,1);assert.equal(JSON.stringify(board).includes('SECRET_'),false);assert.equal((await request('announcementDetail',{sessionId,announcementId},seller)).status,403);
  const response={sessionId,announcementId,intent:'APPLICATION',body:'CANDIDATURE_HTTP_PRIVEE',proposedReward:'40 crédits fictifs'},rp=await request('prepareAnnouncementResponse',response,buyer);assert.equal(rp.status,200);const confirmed={...response,confirmation:rp.result.confirmation,requestId:randomUUID()},sent=await request('respondAnnouncement',confirmed,buyer);assert.equal(sent.status,200);assert.deepEqual(await request('respondAnnouncement',confirmed,buyer),sent);const applicationId=sent.result.id;
  assert.equal((await request('applicationDetail',{sessionId,applicationId},seller)).status,403);assert.equal((await request('sessionApplication',{sessionId,applicationId},buyer)).status,403);const reply={sessionId,applicationId,body:'REPONSE_ORGA_PRIVEE',status:'DISCUSSION'},pp=await request('prepareApplicationReply',reply,owner);await command('replyApplication',{...reply,confirmation:pp.result.confirmation});
  const d=(await request('applicationDetail',{sessionId,applicationId},buyer)).result;assert.equal(d.messages.length,2);assert.equal(d.messages[1].authorName,'Comptoir anonyme');assert.equal(d.application.unread,true);assert.equal(JSON.stringify(d).includes('SECRET_'),false);assert.equal(JSON.stringify(d).includes('authorUid'),false);
  await command('markApplicationRead',{sessionId,applicationId,revision:d.application.revision,announcementRevision:d.announcement.revision},buyer);assert.equal((await request('myApplications',{sessionId},buyer)).result.applications[0].unread,false);assert.equal((await request('myWallet',{sessionId},buyer)).result.account.balance,100);
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('applicationDetail',{sessionId,applicationId},buyer)).status,403);assert.equal((await request('respondAnnouncement',confirmed,buyer)).status,403);
});

test('HTTP + Auth : contrat personnel, briefing réservé et paiement unique après preuve MJ',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),payer=await googleTestAccount(`payer-${randomUUID()}@example.invalid`),candidate=await googleTestAccount(`candidate-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const read=async(action,input,token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Contrats HTTP synthétiques'}),scenario=()=>read('scenario',{scenarioId}),characters=[];
  for(const displayName of ['Payeur','Candidat'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},cp=await read('prepareStartingCredits',seed);await command('setStartingCredits',{...seed,confirmation:cp.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Contrats test',capacity:2,privacy:'Fictif'}),session=()=>read('session',{sessionId});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [payer,candidate].entries()){const uid=(await read('identity',{},token)).uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});await read('redeem',{sessionId,token:invitation},token);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const {contractCommands}=await import('../support/contracts-suite.mjs');for(const action of contractCommands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const now=Date.now(),input={sessionId,revision:0,title:'Mission HTTP',category:'ESCORT',mode:'ASSIGNMENT',sponsorKind:'NPC',sponsorName:'Alias commanditaire',description:'Mission fictive',rewardType:'FIXED',rewardText:'40 crédits fictifs',places:1,conditions:'Conditions',proofExpected:'Récit validé par le MJ',briefing:'BRIEFING_HTTP_CONTRAT',gmNotes:'SECRET_ORGA_CONTRAT',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Préparation'};
  const p=await read('prepareAnnouncement',input),{id:announcementId}=await command('saveAnnouncement',{...input,confirmation:p.confirmation});
  const response={sessionId,announcementId,intent:'APPLICATION',body:'Candidature privée',proposedReward:''},rp=await read('prepareAnnouncementResponse',response,candidate),{id:applicationId}=await command('respondAnnouncement',{...response,confirmation:rp.confirmation},candidate);
  const source=(await read('myWallet',{sessionId},payer)).account.id,offer={sessionId,applicationId,funding:'ACCOUNT',sourceAccountId:source,amount:40,durationMinutes:30,advance:0,guarantee:0,conditions:'Accompagner le convoi',proofExpected:'Récit au MJ',confidentiality:'Briefing privé',failureTerms:'Annulation sans paiement sur décision MJ',reason:'Autorisation synthétique'};
  assert.equal((await request('prepareMissionContract',offer,candidate)).status,403);const op=await read('prepareMissionContract',offer),{id:contractId}=await command('proposeMissionContract',{...offer,confirmation:op.confirmation});assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,0);
  const pending=await read('contractDetail',{sessionId,contractId},candidate);assert.equal(JSON.stringify(pending).includes('BRIEFING_HTTP_CONTRAT'),false);assert.equal(JSON.stringify(pending).includes('SECRET_ORGA'),false);assert.equal(JSON.stringify(pending).includes(source),false);assert.equal((await request('contractDetail',{sessionId,contractId},payer)).status,403);
  const ap=await read('prepareContractAcceptance',{sessionId,contractId},candidate),accepted={sessionId,contractId,confirmation:ap.confirmation,requestId:randomUUID()},ar=await request('acceptContract',accepted,candidate);assert.equal(ar.status,200);assert.deepEqual(await request('acceptContract',accepted,candidate),ar);assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,40);assert.equal((await read('contractDetail',{sessionId,contractId},candidate)).contract.briefing,'BRIEFING_HTTP_CONTRAT');
  const proof={sessionId,contractId,body:'Arrivée du convoi décrite'},pp=await read('prepareContractProof',proof,candidate);await command('submitContractProof',{...proof,confirmation:pp.confirmation},candidate);assert.equal((await read('myWallet',{sessionId},candidate)).account.balance,0);
  const review={sessionId,contractId,decision:'PAY',reason:'Le MJ confirme la prestation'},vp=await read('prepareContractReview',review),payment={...review,confirmation:vp.confirmation,requestId:randomUUID()};assert.equal((await request('reviewContract',payment,candidate)).status,403);const paid=await request('reviewContract',payment,owner);assert.equal(paid.status,200);assert.deepEqual(await request('reviewContract',payment,owner),paid);assert.equal((await read('myWallet',{sessionId},payer)).account.balance,60);assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,0);assert.equal((await read('myWallet',{sessionId},candidate)).account.balance,40);assert.equal((await read('contractDetail',{sessionId,contractId},candidate)).contract.status,'PAID');
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('contractDetail',{sessionId,contractId},candidate)).status,403);assert.equal((await request('acceptContract',accepted,candidate)).status,403);
});


test('HTTP + Auth : prime financée, preuve privée et paiement idempotent limité au quota',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),payer=await googleTestAccount(`payer-${randomUUID()}@example.invalid`),candidate=await googleTestAccount(`candidate-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const read=async(action,input,token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Primes HTTP synthétiques'}),scenario=()=>read('scenario',{scenarioId}),characters=[];
  for(const displayName of ['Payeur','Candidat'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'crédit'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},cp=await read('prepareStartingCredits',seed);await command('setStartingCredits',{...seed,confirmation:cp.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Primes test',capacity:2,privacy:'Fictif'}),session=()=>read('session',{sessionId});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});const uids=[];
  for(const [i,token] of [payer,candidate].entries()){const uid=(await read('identity',{},token)).uid;uids.push(uid);await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});await read('redeem',{sessionId,token:invitation},token);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const {bountyCommands}=await import('../../src/core/bounties.mjs');for(const action of bountyCommands)assert.equal((await request(action,{sessionId,requestId:randomUUID()})).status,401);
  const now=Date.now(),input={sessionId,revision:0,title:'Prime HTTP',category:'BOUNTY',mode:'OPEN_BOUNTY',sponsorKind:'NPC',sponsorName:'Alias commanditaire',description:'Mission fictive',rewardType:'FIXED',rewardText:'40 crédits fictifs',places:1,conditions:'Conditions',proofExpected:'Récit validé par le MJ',briefing:'BRIEFING_HTTP_JAMAIS_PUBLIC',gmNotes:'SECRET_ORGA_PRIME',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Préparation'};
  const p=await read('prepareAnnouncement',input),{id:announcementId}=await command('saveAnnouncement',{...input,confirmation:p.confirmation});
  const source=(await read('myWallet',{sessionId},payer)).account.id,offer={sessionId,announcementId,funding:'ACCOUNT',sourceAccountId:source,amount:40,reason:'FINANCE_MJ_PRIVEE'};
  assert.equal((await request('prepareBounty',offer,candidate)).status,403);const op=await read('prepareBounty',offer),{id:bountyId}=await command('openBounty',{...offer,confirmation:op.confirmation});assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,40);
  const visible=JSON.stringify(await read('bountyDetail',{sessionId,bountyId},candidate));for(const secret of ['BRIEFING_HTTP','SECRET_ORGA','FINANCE_MJ',source])assert.equal(visible.includes(secret),false);
  const proof={sessionId,bountyId,body:'PREUVE_HTTP_PRIVEE'},pp=await read('prepareBountyClaim',proof,candidate);await command('submitBountyClaim',{...proof,confirmation:pp.confirmation},candidate);
  assert.equal(JSON.stringify(await read('bountyDetail',{sessionId,bountyId},payer)).includes('PREUVE_HTTP_PRIVEE'),false);
  const claimId=(await read('bountyDetail',{sessionId,bountyId},candidate)).claims[0].id,review={sessionId,bountyId,claimId,decision:'PAY',reason:'Preuve vérifiée'},vp=await read('prepareBountyReview',review),payment={...review,confirmation:vp.confirmation,requestId:randomUUID()};
  assert.equal((await request('reviewBounty',payment,candidate)).status,403);const paid=await request('reviewBounty',payment,owner);assert.equal(paid.status,200);assert.deepEqual(await request('reviewBounty',payment,owner),paid);
  assert.equal((await read('myWallet',{sessionId},payer)).account.balance,60);assert.equal((await read('myWallet',{sessionId},payer)).account.reserved,0);assert.equal((await read('myWallet',{sessionId},candidate)).account.balance,40);assert.equal((await read('bountyDetail',{sessionId,bountyId},candidate)).bounty.status,'EXHAUSTED');
  await command('revokeAccess',{sessionId,uid:uids[1]});assert.equal((await request('bountyDetail',{sessionId,bountyId},candidate)).status,403);
});

test('HTTP + Auth : mandat de bande, relais de représentant et paiements collectifs des missions et primes',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),payer=await googleTestAccount(`band-payer-${randomUUID()}@example.invalid`),first=await googleTestAccount(`band-first-${randomUUID()}@example.invalid`),second=await googleTestAccount(`band-second-${randomUUID()}@example.invalid`);
  const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const read=async(action,input,token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Bandes HTTP synthétiques'}),scenario=()=>read('scenario',{scenarioId}),characters=[];
  for(const displayName of ['Financeur','Premier représentant','Second représentant'])characters.push((await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName,publicationState:'PUBLISHED'})).id);
  await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédits de test',unit:'cr'}});
  const seed={scenarioId,revision:(await scenario()).revision,characterId:characters[0],amount:100},cp=await read('prepareStartingCredits',seed);await command('setStartingCredits',{...seed,confirmation:cp.confirmation});
  const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision}),{id:sessionId}=await command('createSession',{scenarioId,versionId,title:'Bandes test',capacity:3,privacy:'Fictif'}),session=()=>read('session',{sessionId});
  await command('setRegistrationOpen',{sessionId,revision:1,open:true});
  for(const [i,token] of [payer,first,second].entries()){const uid=(await read('identity',{},token)).uid;await command('register',{sessionId,name:'Test'},token);await command('assign',{sessionId,uid,characterId:characters[i]});const invitation=randomBytes(32).toString('base64url');await command('issueInvitation',{sessionId,uid,tokenHash:hash(invitation),hours:1});await read('redeem',{sessionId,token:invitation},token);}
  for(const stage of ['BRIEFING','EN_JEU'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
  const member=i=>({characterId:characters[i],active:true,revealed:true,visibleToMembers:false,publicAffiliation:false,permissions:{representMissions:true}});
  const {id:groupId}=await command('saveSessionGroup',{sessionId,revision:(await session()).revision,name:'BANDE_HTTP_SECRETE',visibility:'SECRET',publicationState:'PUBLISHED',members:[member(1),member(2)],gmNotes:'SECRET_ORGA_BANDE',reason:'Test'});
  await command('setGroupModule',{sessionId,revision:(await session()).revision,enabled:true,reason:'Test'});
  const walletInput={sessionId,groupId,revision:(await session()).revision,label:'Caisse HTTP',reason:'Test'},wp=await read('prepareGroupWallet',walletInput),wallet=await command('setGroupWallet',{...walletInput,confirmation:wp.confirmation});
  assert.equal((await request('readAccount',{sessionId,accountId:wallet.accountId},first)).status,403);
  const now=Date.now(),announce=async(mode,participation)=>{const input={sessionId,revision:0,title:'Engagement HTTP',category:'MERCENARY',mode,participation,sponsorKind:'NPC',sponsorName:'Commanditaire',description:'Prestation fictive',rewardType:'FIXED',rewardText:'37 cr',places:1,conditions:'Conditions',proofExpected:'Récit',briefing:'BRIEFING_HTTP_COLLECTIF',gmNotes:'SECRET_ORGA_ANNONCE',publication:'PUBLISHED',opensAt:now-10000,deadline:now+3600000,audience:{kind:'ALL',characterIds:[],groupIds:[]},reason:'Test'},p=await read('prepareAnnouncement',input);return (await command('saveAnnouncement',{...input,confirmation:p.confirmation})).id;};
  const announcementId=await announce('ASSIGNMENT','EITHER'),input={sessionId,announcementId,groupId,intent:'APPLICATION',body:'Notre bande candidate',proposedReward:''},ap=await read('prepareAnnouncementResponse',input,first),{id:applicationId}=await command('respondAnnouncement',{...input,confirmation:ap.confirmation},first);
  assert.equal((await read('applicationDetail',{sessionId,applicationId},second)).application.applicant.kind,'GROUP');assert.equal((await request('applicationDetail',{sessionId,applicationId},payer)).status,403);
  const sourceAccountId=(await read('myWallet',{sessionId},payer)).account.id,offer={sessionId,applicationId,funding:'ACCOUNT',sourceAccountId,amount:37,durationMinutes:30,advance:0,guarantee:0,conditions:'Prestation collective',proofExpected:'Récit',confidentiality:'Représentants habilités',failureTerms:'Clôture MJ',reason:'Test'},op=await read('prepareMissionContract',offer),{id:contractId}=await command('proposeMissionContract',{...offer,confirmation:op.confirmation});
  const accept=await read('prepareContractAcceptance',{sessionId,contractId},second);await command('acceptContract',{sessionId,contractId,confirmation:accept.confirmation},second);
  const s=await session(),g=s.groups.find(g=>g.id===groupId);await command('saveSessionGroup',{...g,sessionId,groupId,revision:s.revision,members:[member(2)],reason:'Relais'});assert.equal((await request('contractDetail',{sessionId,contractId},first)).status,403);
  assert.equal((await read('contractDetail',{sessionId,contractId},second)).contract.briefing,'BRIEFING_HTTP_COLLECTIF');
  const proof={sessionId,contractId,body:'Preuve du représentant restant'},pp=await read('prepareContractProof',proof,second);await command('submitContractProof',{...proof,confirmation:pp.confirmation},second);
  const review={sessionId,contractId,decision:'PAY',reason:'Test'},rp=await read('prepareContractReview',review);await command('reviewContract',{...review,confirmation:rp.confirmation});assert.equal((await session()).accounts.find(a=>a.id===wallet.accountId).balance,37);assert.equal((await read('myWallet',{sessionId},second)).account.balance,0);
  const bountyId=await announce('OPEN_BOUNTY','GROUP'),funding={sessionId,announcementId:bountyId,funding:'ACCOUNT',sourceAccountId,amount:37,reason:'Test'},bp=await read('prepareBounty',funding);await command('openBounty',{...funding,confirmation:bp.confirmation});
  assert.equal((await request('prepareBountyClaim',{sessionId,bountyId,body:'Sans bande'},second)).error,'PARTICIPATION_NOT_ALLOWED');const claim={sessionId,bountyId,groupId,body:'Preuve collective HTTP'},pc=await read('prepareBountyClaim',claim,second);await command('submitBountyClaim',{...claim,confirmation:pc.confirmation},second);
  const claimId=(await read('bountyDetail',{sessionId,bountyId},second)).claims[0].id,pay={sessionId,bountyId,claimId,decision:'PAY',reason:'Test'},payPreview=await read('prepareBountyReview',pay);await command('reviewBounty',{...pay,confirmation:payPreview.confirmation});
  assert.equal((await session()).accounts.find(a=>a.id===wallet.accountId).balance,74);assert.equal((await read('myWallet',{sessionId},payer)).account.balance,26);assert.equal(JSON.stringify(await read('myWallet',{sessionId},payer)).includes('BANDE_HTTP_SECRETE'),false);assert.equal((await read('myWallet',{sessionId},second)).account.balance,0);
});


test('HTTP + Auth + Storage : import réel, reprise, lecture privée et refus des liens directs',async()=>{
  assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'Storage emulator required');
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),other=await googleTestAccount(`image-${randomUUID()}@example.invalid`),bucket=getStorage().bucket('demo-gn-engine-media');
  await bucket.file('system/ready').save('ready');
  for(const action of mediaCommands){const r=await request(action,{},undefined);assert.equal(r.status,401,action);}
  const input={name:'Image HTTP',data:await sampleImage(),requestId:randomUUID(),allowDuplicate:true},uploaded=await request('mediaUpload',input,owner);assert.equal(uploaded.status,200,JSON.stringify(uploaded));
  assert.deepEqual(await request('mediaUpload',input,owner),uploaded);
  const catalog=await request('mediaCatalog',{},owner);assert.equal(catalog.result.storageConfigured,true);assert.ok(catalog.result.images.find(x=>x.id===uploaded.result.id));
  for(const variant of ['thumb','mobile','original']){
    const p={context:{mode:'library'},mediaId:uploaded.result.id,variant},r=await request('mediaRead',p,owner);assert.equal(r.status,200);assert.ok(r.result.data);assert.equal((await request('mediaRead',p,other)).status,403);
  }
  const [files]=await bucket.getFiles({prefix:`media/${uploaded.result.id}/`});assert.equal(files.length,3);
  for(const file of files){
    const url=`http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/demo-gn-engine-media/o/${encodeURIComponent(file.name)}?alt=media`;
    for(const token of [null,other]){const r=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{}});assert.equal(r.status,403);}
  }
  const bad=await request('mediaUpload',{...input,requestId:randomUUID(),data:Buffer.from('<svg/>').toString('base64')},owner);assert.equal(bad.result,undefined);assert.equal(bad.error,'INVALID_IMAGE');
  const check=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${owner}`},body:JSON.stringify({action:'mediaRead',input:{context:{mode:'library'},mediaId:uploaded.result.id}})});assert.match(check.headers.get('cache-control'),/no-store/);
});

test('HTTP + Auth + Storage : export/import de scénario, intégrité et accès propriétaire',async()=>{
  const owner=await googleTestAccount('gkerckhofs@gmail.com'),other=await googleTestAccount(`archive-${randomUUID()}@example.invalid`);
  const command=async(action,input={})=>{const r=await request(action,{requestId:randomUUID(),...input},owner);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
  const {id:scenarioId}=await command('createScenario',{title:'Scénario HTTP à conserver'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
  const {id:characterId}=await command('saveCharacter',{scenarioId,revision:1,displayName:'Personnage privé',publicationState:'PUBLISHED',playerSecrets:'SECRET_ARCHIVE_HTTP',gmNotes:'Note privée'});
  const a=await command('mediaUpload',{name:'Image de scénario HTTP',data:await sampleImage(),allowDuplicate:true}),targets=[{scope:'scenario',scopeId:scenarioId,kind:'character',id:characterId,slot:'private',mediaId:a.id}],prepared=await request('prepareMediaAssignments',{targets},owner);assert.equal(prepared.status,200);await command('assignMedia',{targets,confirmation:prepared.result.confirmation});
  const exported=await request('prepareScenarioExport',{scenarioId,revision:(await scenario()).revision},owner);assert.equal(exported.status,200);const manifest=exported.result.manifest,source=await request('mediaRead',{context:{mode:'library'},mediaId:a.id,variant:'original'},owner);assert.equal(source.status,200);manifest.images[0].source.sha256=mediaHash(Buffer.from(source.result.data,'base64'));
  const p=await request('prepareScenarioImport',{manifest,title:'Copie HTTP'},owner);assert.equal(p.status,200);const job=await command('beginScenarioImport',{manifest,title:'Copie HTTP',confirmation:p.result.confirmation});
  for(const action of archiveCommands){assert.equal((await request(action,{scenarioId,importId:job.id})).status,401);assert.equal((await request(action,{scenarioId,importId:job.id,admin:true},other)).status,403);}
  assert.equal((await request('commitScenarioImport',{importId:job.id},owner)).error,'SCENARIO_IMPORT_INCOMPLETE');
  const upload={importId:job.id,mediaId:a.id,data:source.result.data},imported=await request('scenarioImportImage',upload,owner);assert.equal(imported.status,200,JSON.stringify(imported));assert.deepEqual(await request('scenarioImportImage',upload,owner),imported);
  const result=await request('commitScenarioImport',{importId:job.id},owner);assert.equal(result.status,200,JSON.stringify(result));assert.deepEqual(await request('commitScenarioImport',{importId:job.id},owner),result);
  const copy=await request('scenario',{scenarioId:result.result.id},owner);assert.equal(copy.result.characters[0].playerSecrets,'SECRET_ARCHIVE_HTTP');assert.equal(copy.result.characters[0].mediaImages.private.id,imported.result.mediaId);assert.equal((await request('scenario',{scenarioId:result.result.id},other)).status,403);
  const read=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${owner}`},body:JSON.stringify({action:'mediaRead',input:{context:{mode:'library'},mediaId:imported.result.mediaId,variant:'original'}})});assert.equal(read.headers.get('cache-control'),'private, no-store');assert.equal((await read.json()).result.data,source.result.data);
});


test('HTTP + Auth : campagne, bilan scellé et reprise sans réinitialisation des crédits',async()=>{
 const owner=await googleTestAccount('gkerckhofs@gmail.com'),visitor=await googleTestAccount(`campaign-${randomUUID()}@example.invalid`);
 const command=async(action,input={},token=owner)=>{const r=await request(action,{requestId:randomUUID(),...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};
 const {id:scenarioId}=await command('createScenario',{title:'Campagne HTTP'}),scenario=async()=>(await request('scenario',{scenarioId},owner)).result;
 const {id:cid}=await command('saveCharacter',{scenarioId,revision:(await scenario()).revision,displayName:'Personnage durable',publicationState:'PUBLISHED'});
 await command('saveScenarioEconomy',{scenarioId,revision:(await scenario()).revision,rules:{enabled:true,name:'Crédit',unit:'crédit'}});
 const seed={scenarioId,revision:(await scenario()).revision,characterId:cid,amount:123},sp=await command('prepareStartingCredits',seed);await command('setStartingCredits',{...seed,confirmation:sp.confirmation});
 const {id:versionId}=await command('publishScenario',{scenarioId,revision:(await scenario()).revision});
 const input={scenarioId,versionId,campaignTitle:'Chronique HTTP',title:'Premier épisode',capacity:2,privacy:'Données fictives'},preview=await command('prepareCampaignStart',input);
 assert.equal((await request('startCampaign',{...input,confirmation:preview.confirmation,requestId:randomUUID()},visitor)).status,403);
 const {id:sessionId,campaignId}=await command('startCampaign',{...input,confirmation:preview.confirmation}),session=async()=>(await request('session',{sessionId},owner)).result;
 const adjust={sessionId,revision:(await session()).revision,characterId:cid,amount:23,mode:'DEBIT',memo:'Dépense',reason:'Test HTTP'},ap=await command('prepareCreditAdjustment',adjust);await command('applyCreditAdjustment',{...adjust,confirmation:ap.confirmation});
 for(const stage of ['BRIEFING','EN_JEU','PAUSE'])await command('setStage',{sessionId,revision:(await session()).revision,stage});
 for(const action of campaignCommands)assert.equal((await request(action,{sessionId,campaignId,requestId:randomUUID()})).status,401);
 assert.equal((await request('campaign',{campaignId,ownerUid:'forged'},visitor)).status,403);
 const ending={sessionId,reason:'Bilan HTTP',cancelOffers:false},ep=await command('prepareCampaignClosure',ending);assert.equal(ep.canClose,true);await command('closeCampaignSession',{...ending,confirmation:ep.confirmation});
 const next={campaignId,title:'Suite HTTP',capacity:2,privacy:'Nouvelle notice',healthPolicy:'PRESERVE',reason:'Reprise HTTP'},np=await command('prepareCampaignEpisode',next),build=await command('beginCampaignEpisode',{...next,confirmation:np.confirmation});
 assert.equal((await request('publicSession',{sessionId:build.id})).status,400);
 let result;do{result=await command('advanceCampaignEpisode',{campaignId,buildId:build.buildId});}while(result.status!=='READY');
 const copied=(await request('session',{sessionId:build.id},owner)).result;assert.equal(copied.accounts[0].balance,100);assert.equal(copied.characters[0].id,cid);assert.equal(copied.registrations.length,0);assert.equal(copied.campaignEpisode,2);
});


test('HTTP + Auth : Excel M6/M7, droits séparés, provenance, réessai et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`excel-story-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Excel M6/M7 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M6','M7'],editWorkshops:['M6','M7'],revision:0,reason:'Préparer les informations et missions'};await cmd('setCentralStaff',grant);const applied=[];
 for(const [workshop,sheet,row] of [['M6','Informations',centralKnowledgeRow],['M7','Missions',centralMissionRow]]){
  const e=await call('exportCentralDraft',{campaignId,workshop,ids:[]},editor);e.sheets[sheet]=[row];const input={campaignId,workshop,fileName:'Fiction.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.equal((await request('prepareCentralImport',input)).status,401);const p=await call('prepareCentralImport',input,editor);assert.deepEqual(p.errors,[]);assert.ok(p.diagnostics.some(d=>d.code==='REFERENCE_NOT_CHECKED'));if(workshop==='M7')assert.equal(p.diagnostics.some(d=>d.referenceType==='knowledge'&&d.code==='REFERENCE_MISSING'),false);
  const apply={...input,confirmation:p.confirmation,reason:'Fiction synthétique',requestId:randomUUID()},r=await call('applyCentralImport',apply,editor);assert.equal(r.changed,1);assert.deepEqual(await call('applyCentralImport',apply,editor),r);applied.push(apply);const exported=await call('exportCentralDraft',{campaignId,workshop,ids:[row.id]},editor);assert.equal(exported.sheets[sheet][0].revision,1);assert.equal(exported.sheets[sheet][0].titre,row.titre);
 }
 const report=await call('checkCentralDraft',{campaignId,draftRevision:2});assert.equal(report.totals.invalid,0);assert.equal(report.diff.find(x=>x.type==='knowledge').location.sheet,'Informations');assert.equal(report.diff.find(x=>x.type==='mission').location.sheet,'Missions');assert.equal(report.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(report),/Texte confidentiel M6|Secret organisateur M7/);
 assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M2',ids:[]},editor)).status,403);assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);await cmd('setCentralStaff',{...grant,active:false,revision:1});for(const apply of applied){assert.equal((await request('applyCentralImport',apply,editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:apply.workshop,ids:[]},editor)).status,403);}
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const key of ['characters','knowledge','accounts','inventory','registrations'])assert.deepEqual(session[key],[]);
});


test('HTTP + Auth : Excel M5, deux feuilles atomiques, homonymes et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`excel-m5-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Excel M5 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M5'],editWorkshops:['M5'],revision:0,reason:'Préparer boutiques et offres'};await cmd('setCentralStaff',grant);
 const e=await call('exportCentralDraft',{campaignId,workshop:'M5',ids:[]},editor);assert.deepEqual(Object.keys(e.sheets),['Meta','Boutiques','Offres']);e.sheets.Boutiques=[{...centralShopRow,id:'same'}];e.sheets.Offres=[{...centralOfferRow,id:'same',boutique_id:'same'}];const input={campaignId,workshop:'M5',fileName:'M5.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.equal((await request('prepareCentralImport',input)).status,401);
 const bad=structuredClone(input);bad.sheets.Offres[0].prix_vente_cr=0;const rejected=await call('prepareCentralImport',bad,editor);assert.equal(rejected.errors[0].column,'prix_vente_cr');assert.equal((await request('applyCentralImport',{...bad,confirmation:null,reason:'Refus',requestId:randomUUID()},editor)).status,400);assert.deepEqual((await call('centralMaster',{campaignId,workshop:'M5'},editor)).changes,[]);
 const p=await call('prepareCentralImport',input,editor);assert.deepEqual(p.errors,[]);assert.equal(p.diagnostics.filter(d=>d.code==='REFERENCE_NOT_CHECKED').length,3);assert.equal(p.diagnostics.some(d=>d.referenceType==='shop'),false);const apply={...input,confirmation:p.confirmation,reason:'Lot synthétique',requestId:randomUUID()},r=await call('applyCentralImport',apply,editor);assert.equal(r.changed,2);assert.equal(r.draftRevision,1);assert.deepEqual(await call('applyCentralImport',apply,editor),r);
 const out=await call('exportCentralDraft',{campaignId,workshop:'M5',ids:['shop_same','offer_same']},editor);assert.equal(out.sheets.Boutiques[0].id,'same');assert.equal(out.sheets.Offres[0].id,'same');const report=await call('checkCentralDraft',{campaignId,draftRevision:1});assert.equal(report.totals.invalid,0);assert.equal(report.diff.find(d=>d.type==='shop').location.sheet,'Boutiques');assert.equal(report.diff.find(d=>d.type==='offer').location.sheet,'Offres');assert.equal(report.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(report),/Note M5 boutique privée|Note M5 offre privée/);
 assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M1',ids:[]},editor)).status,403);await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('applyCentralImport',apply,editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M5',ids:['shop_same']},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const key of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[key],[]);
});

test('HTTP + Auth : Excel M3, trois feuilles atomiques, barèmes et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`excel-m3-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;};const cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Excel M3 HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M3'],editWorkshops:['M3'],revision:0,reason:'Préparer le réseau spatial'};await cmd('setCentralStaff',grant);
 const e=await call('exportCentralDraft',{campaignId,workshop:'M3',ids:[]},editor);assert.deepEqual(Object.keys(e.sheets),['Meta','Modeles','Ports','Routes']);e.sheets.Modeles=[{...centralModelRow,id:'same'}];e.sheets.Ports=[{...centralPortRow,id:'same'}];e.sheets.Routes=[{...centralRouteRow,id:'same',origine_port_id:'same'}];const input={campaignId,workshop:'M3',fileName:'M3.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.equal((await request('prepareCentralImport',input)).status,401);
 const bad=structuredClone(input);bad.sheets.Routes[0].distance_id='FREE';const rejected=await call('prepareCentralImport',bad,editor);assert.equal(rejected.errors[0].column,'distance_id');assert.equal((await request('applyCentralImport',{...bad,confirmation:null,reason:'Refus',requestId:randomUUID()},editor)).status,400);assert.deepEqual((await call('centralMaster',{campaignId,workshop:'M3'},editor)).changes,[]);
 const p=await call('prepareCentralImport',input,editor);assert.deepEqual(p.errors,[]);assert.ok(p.diagnostics.some(d=>d.code==='REFERENCE_MISSING'&&d.column==='destination_port_id'));assert.equal(p.diagnostics.some(d=>d.field==='fromPort'),false);const apply={...input,confirmation:p.confirmation,reason:'Lot synthétique',requestId:randomUUID()},r=await call('applyCentralImport',apply,editor);assert.equal(r.changed,3);assert.equal(r.draftRevision,1);assert.deepEqual(await call('applyCentralImport',apply,editor),r);
 const out=await call('exportCentralDraft',{campaignId,workshop:'M3',ids:['shipModel_same','port_same','route_same']},editor);for(const sheet of ['Modeles','Ports','Routes'])assert.equal(out.sheets[sheet][0].id,'same');const d=await call('centralMaster',{campaignId,workshop:'M3'},editor);assert.equal(d.changes.find(c=>c.type==='shipModel').data.cargoCapacity,0);assert.equal(d.changes.find(c=>c.type==='route').data.durationSeconds,300);
 const report=await call('checkCentralDraft',{campaignId,draftRevision:1});assert.equal(report.totals.invalid,0);for(const [type,sheet] of [['shipModel','Modeles'],['port','Ports'],['route','Routes']])assert.equal(report.diff.find(d=>d.type===type).location.sheet,sheet);assert.equal(report.diagnostics.find(d=>d.code==='REFERENCE_MISSING'&&d.field==='toPort').column,'destination_port_id');assert.equal(report.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(report),/Secret (modèle|port|route) Excel|SECRET-ORIGIN|SECRET-ROUTE/);
 assert.equal((await request('admissionAdmin',{sessionId},editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M2',ids:[]},editor)).status,403);await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('applyCentralImport',apply,editor)).status,403);assert.equal((await request('applyCentralImport',{...apply,requestId:randomUUID()},editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M3',ids:['port_same']},editor)).status,403);
 const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const key of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[key],[]);
});


test('HTTP + Auth : lieux centraux M6, références M3 privées, archive et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`terrain-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email),readerEmail=`port-${randomUUID()}@example.invalid`,reader=await googleTestAccount(readerEmail);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Terrain HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'});
 const grant={campaignId,email,active:true,readWorkshops:['M6'],editWorkshops:['M6'],revision:0,reason:'Préparer les lieux'};await cmd('setCentralStaff',grant);await cmd('setCentralStaff',{...grant,email:readerEmail,readWorkshops:['M3'],editWorkshops:['M3']});
 const input={campaignId,fieldTargetId:'place',fieldTargetRevision:0,draftRevision:0,fieldTarget:centralTestInstallation,reason:'Lieu privé',requestId:randomUUID()};assert.equal((await request('saveCentralFieldTarget',input)).status,401);assert.equal((await request('saveCentralFieldTarget',input,reader)).status,403);const saved=await call('saveCentralFieldTarget',input,editor);assert.deepEqual(await call('saveCentralFieldTarget',input,editor),saved);
 await cmd('saveCentralPort',{campaignId,portId:'port',portRevision:0,draftRevision:1,port:{name:'Port synthétique',navigationCode:'CODE-PRIVATE',locationTargetId:'place'},reason:'Référence de lieu'},reader);let d=await call('centralMaster',{campaignId,workshop:'M3'},reader);assert.deepEqual(d.references.locations,[]);assert.equal(d.diagnostics[0].code,'REFERENCE_NOT_CHECKED');assert.doesNotMatch(JSON.stringify(d),/Secret MJ terrain|Instruction privée terrain/);
 await cmd('setCentralStaff',{...grant,email:readerEmail,revision:1,readWorkshops:['M3','M6'],editWorkshops:['M3']});d=await call('centralMaster',{campaignId,workshop:'M3'},reader);assert.equal(d.references.locations[0].id,'place');assert.deepEqual(d.diagnostics,[]);assert.doesNotMatch(JSON.stringify(d),/Secret MJ terrain|Instruction privée terrain/);
 await cmd('archiveCentralFieldTarget',{campaignId,fieldTargetId:'place',fieldTargetRevision:1,draftRevision:2,reason:'Archive synthétique'},editor);assert.equal((await call('centralMaster',{campaignId,workshop:'M3'},reader)).diagnostics[0].code,'REFERENCE_ARCHIVED');const report=await call('checkCentralDraft',{campaignId,draftRevision:3});assert.equal(report.totals.invalid,0);assert.equal(report.edges[0].status,'ARCHIVED');assert.equal(report.publicationAvailable,false);
 await cmd('setCentralStaff',{...grant,active:false,revision:1});assert.equal((await request('saveCentralFieldTarget',input,editor)).status,403);assert.equal((await request('centralMaster',{campaignId,workshop:'M6'},editor)).status,403);assert.equal((await request('admissionAdmin',{sessionId},reader)).status,403);const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const k of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[k],[]);
});

test('HTTP + Auth : Excel M6 versionné, lot informations et lieux, réessais et révocation',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`terrain-excel-${randomUUID()}@example.invalid`,editor=await googleTestAccount(email),foreign=await googleTestAccount(`foreign-${randomUUID()}@example.invalid`);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Excel terrain HTTP',title:'Préparation synthétique',capacity:4,privacy:'Notice fictive'}),grant={campaignId,email,active:true,readWorkshops:['M6'],editWorkshops:['M6'],revision:0,reason:'Préparer M6'};await cmd('setCentralStaff',grant);
 const e=await call('exportCentralDraft',{campaignId,workshop:'M6',ids:[],schemaVersion:2},editor);assert.equal(e.sheets.Meta[0].schema_version,2);e.sheets.Lieux=[fieldImportRow('same',centralTestInstallation)];e.sheets.Informations=[{...centralKnowledgeRow,id:'same',destinataires_initiaux_json:'[]',destinataires_qr_json:'[]'}];const input={campaignId,workshop:'M6',fileName:'Terrain.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.equal((await request('prepareCentralImport',input)).status,401);assert.equal((await request('prepareCentralImport',input,foreign)).status,403);
 const p=await call('prepareCentralImport',input,editor);assert.deepEqual(p.errors,[]);const apply={...input,confirmation:p.confirmation,reason:'Deux définitions',requestId:randomUUID()},saved=await call('applyCentralImport',apply,editor);assert.equal(saved.changed,2);assert.equal(saved.draftRevision,1);assert.deepEqual(await call('applyCentralImport',apply,editor),saved);assert.deepEqual(await call('applyCentralImport',{...apply,requestId:randomUUID()},editor),saved);
 const out=await call('exportCentralDraft',{campaignId,workshop:'M6',ids:['knowledge_same','fieldTarget_same'],schemaVersion:2},editor);assert.equal(out.sheets.Informations[0].id,'same');assert.equal(out.sheets.Lieux[0].id,'same');const old=await call('exportCentralDraft',{campaignId,workshop:'M6',ids:['same']},editor);assert.equal(old.sheets.Meta[0].schema_version,1);assert.equal(old.sheets.Lieux,undefined);const report=await call('checkCentralDraft',{campaignId,draftRevision:1});assert.equal(report.totals.invalid,0);assert.equal(report.diff.find(d=>d.type==='fieldTarget').location.sheet,'Lieux');assert.equal(report.publicationAvailable,false);assert.doesNotMatch(JSON.stringify(report),/Secret MJ terrain|Instruction privée terrain/);
 await cmd('setCentralStaff',{...grant,revision:1,active:false});for(const requestId of [apply.requestId,randomUUID()])assert.equal((await request('applyCentralImport',{...apply,requestId},editor)).status,403);assert.equal((await request('exportCentralDraft',{campaignId,workshop:'M6',schemaVersion:2,ids:[]},editor)).status,403);assert.equal((await request('admissionAdmin',{sessionId},foreign)).status,403);const session=await call('session',{sessionId});assert.equal(session.versionId,null);for(const key of ['characters','accounts','inventory','registrations'])assert.deepEqual(session[key],[]);
});

test('HTTP + Auth : candidature, naissance, QR, soins, sécurité, boutique et retrait',async()=>{
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`entry-${randomUUID()}@example.invalid`),other=await googleTestAccount(`other-entry-${randomUUID()}@example.invalid`);
 const call=async(action,input={},token=owner)=>{const r=await request(action,input,token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const {id:sessionId,campaignId}=await cmd('createSpaceOutlawsPreparation',{creationId:randomUUID(),campaignTitle:'Entrée complète HTTP',title:'Session synthétique',capacity:2,privacy:'Notice fictive'});
 await cmd('saveAdmissionSettings',{sessionId,policyRevision:0,draftRevision:0,settings:admissionTestSettings,reason:'Catalogue synthétique'});
 const token=randomBytes(32).toString('base64url');await cmd('issueAdmissionInvitation',{sessionId,tokenHash:hash(token),hours:1,maxUses:1,label:'Invitation fictive'});
 await cmd('beginAdmission',{sessionId,token,sessionRevision:1,policyRevision:1,draftRevision:1,consent:true},player);
 await cmd('saveAdmissionProposal',{sessionId,revision:1,sessionRevision:1,policyRevision:1,draftRevision:1,proposal:{...admissionTestProposal,classId:'MED',secondaryId:'COM-03'},submit:true,consent:true},player);
 const uid=(await call('admissionAdmin',{sessionId})).registrations[0].uid;
 await cmd('reviewAdmission',{sessionId,uid,revision:2,policyRevision:1,draftRevision:1,decision:'APPROVE',reason:'Validation fictive'});
 const m2=await call('previewAdmissionM2',{sessionId,uid});await cmd('prepareAdmissionM2',{sessionId,uid,confirmation:m2.confirmation,reason:'Fiction approuvée'});
 let draftRevision=2;const bindings=[];
 for(const slotId of ['communicator','weapon','medical-tool','medical-supplies']){bindings.push({slotId,itemId:slotId});await cmd('saveCentralItem',{campaignId,itemId:slotId,itemRevision:0,draftRevision:draftRevision++,item:{...centralTestItem,...(slotId==='medical-supplies'?{kind:'STACKABLE',consumable:true}:{})},reason:'Modèle fictif'});}
 await cmd('saveCentralClassKit',{campaignId,classKitId:'MED',classKitRevision:0,draftRevision,classKit:{bindings,gmNotes:''},reason:'Kit fictif'});
 draftRevision++;
 await cmd('saveCentralKnowledge',{campaignId,knowledgeId:'intel',knowledgeRevision:0,draftRevision:draftRevision++,knowledge:{...centralTestKnowledge,title:'Repli',body:'RENSEIGNEMENT_HTTP_PRIVE',initialCharacterIds:[],qrEnabled:false,qrCharacterIds:[],qrSkillId:null,qrSkillLevel:null},reason:'Information de scène'});
 await cmd('saveCentralFieldTarget',{campaignId,fieldTargetId:'point',fieldTargetRevision:0,draftRevision:draftRevision++,fieldTarget:{kind:'ANALYSIS',title:'Point balisé',description:'Public',gmNotes:'SECRET_HTTP_MJ',profiles:{ANALYZE:analysisProfile('COM-03')},rewards:[{id:'intel',kind:'KNOWLEDGE',knowledgeId:'intel',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false}]},reason:'Analyse tactique'});
 await cmd('saveCentralCharacter',{campaignId,characterId:'merchant',characterRevision:0,draftRevision:draftRevision++,character:{...centralTestCharacter,relations:[],objectives:[]},reason:'Comptoir PNJ'});
 await cmd('saveCentralShop',{campaignId,shopId:'counter',shopRevision:0,draftRevision:draftRevision++,shop:{name:'Dispensaire',description:'Fournitures de terrain',sellerCharacterId:'merchant',locationTargetId:'point',gmNotes:'SECRET_BOUTIQUE_HTTP'},reason:'Boutique PNJ'});
 await cmd('saveCentralOffer',{campaignId,offerId:'supply',offerRevision:0,draftRevision:draftRevision++,offer:{name:'Trousse',shopId:'counter',itemId:'medical-supplies',unitPrice:30,buybackPrice:null,conditions:'Retrait physique au comptoir',gmNotes:'SECRET_OFFRE_HTTP'},reason:'Offre PNJ'});
 assert.equal((await request('previewSpaceOutlawsRelease',{sessionId})).status,401);assert.equal((await request('previewSpaceOutlawsRelease',{sessionId},player)).status,403);
 const p=await call('previewSpaceOutlawsRelease',{sessionId});assert.deepEqual(p.blockers,[]);await cmd('releaseSpaceOutlaws',{sessionId,confirmation:p.confirmation,reason:'Version de test'});
 const options={weaponApplicable:true,startingInformation:''},b=await call('previewSpaceOutlawsBirth',{sessionId,uid,options});
 const birth={sessionId,uid,options,confirmation:b.confirmation,reason:'Entrée de test',requestId:randomUUID()};assert.equal((await request('birthSpaceOutlaws',birth,player)).status,403);
 const born=await cmd('birthSpaceOutlaws',birth);assert.deepEqual(await cmd('birthSpaceOutlaws',birth),born);
 const own=await call('mySession',{sessionId},player);assert.equal(own.character.id,born.characterId);assert.equal(own.actionPoints.available,5);assert.equal(own.character.hp,3);assert.equal((await call('mySession',{sessionId},other)).character,null);
 assert.equal((await request('mySpaceOutlawsEntry',{sessionId},other)).status,403);const badge=await call('publicBadge',{sessionId,characterId:born.characterId},null);assert.doesNotMatch(JSON.stringify(badge),/biography|email|uid|secrets/);
 assert.equal((await call('myWallet',{sessionId},player)).account.protectedCredits,200);assert.equal((await call('myInventory',{sessionId},player)).lots.length,4);
 const session=await call('session',{sessionId});await cmd('setStage',{sessionId,revision:session.revision,stage:'EN_JEU'});
 assert.equal((await request('fieldTarget',{sessionId,targetId:'point'})).status,401);
 assert.equal((await request('fieldTarget',{sessionId,targetId:'point'},other)).status,403);
 const scan=await call('fieldTarget',{sessionId,targetId:'point'},player);assert.doesNotMatch(JSON.stringify(scan),/RENSEIGNEMENT_HTTP_PRIVE|SECRET_HTTP_MJ/);
 const preview=await call('prepareFieldAction',{sessionId,targetId:'point',kind:'ANALYZE'},player),input={sessionId,targetId:'point',kind:'ANALYZE',present:true,confirmation:preview.confirmation,requestId:randomUUID()};
 const action=await cmd('startFieldAction',input,player);assert.deepEqual(await cmd('startFieldAction',input,player),action);
 assert.equal((await call('mySession',{sessionId},player)).actionPoints.reserved,1);
 assert.equal((await request('finishFieldAction',{sessionId,actionId:action.id,present:true,requestId:randomUUID()},player)).error,'FIELD_TOO_EARLY');
 const paused=await call('session',{sessionId});await cmd('setStage',{sessionId,revision:paused.revision,stage:'PAUSE'});
 // Synthetic emulator clock only: do not wait 120 wall seconds in the HTTP suite.
 const ref=getFirestore().doc(`sessions/${sessionId}`),stored=(await ref.get()).data();await ref.update({clock:{...stored.clock,elapsedMs:stored.clock.elapsedMs+120000}});
 const resumed=await call('session',{sessionId});await cmd('setStage',{sessionId,revision:resumed.revision,stage:'EN_JEU'});
 const finish={sessionId,actionId:action.id,present:true,requestId:randomUUID()},result=await cmd('finishFieldAction',finish,player);assert.equal(result.result.roll,null);assert.equal(result.status,'SUCCEEDED');assert.deepEqual(await cmd('finishFieldAction',finish,player),result);
 assert.equal((await call('mySession',{sessionId},player)).actionPoints.available,4);
 assert.equal((await call('knowledgeDetail',{sessionId,knowledgeId:'intel'},player)).knowledge.body,'RENSEIGNEMENT_HTTP_PRIVE');
 assert.equal((await request('knowledgeDetail',{sessionId,knowledgeId:'intel'},other)).status,403);

 const damageInput={sessionId,amount:1,damageKind:'ORDINARY',counted:true,secondsSinceDown:0},damage=await call('prepareDamage',damageInput,player);
 await cmd('applyDamage',{...damageInput,reportedAt:damage.reportedAt,confirmation:damage.confirmation},player);
 assert.equal((await call('myHealth',{sessionId},player)).health.hp,2);
 const person=await call('personTarget',{sessionId,targetId:born.characterId},player),care=person.profiles.find(p=>p.id==='SO-MED-02'),lot=person.lots.find(l=>l.item.id==='medical-supplies');
 assert.ok(care);assert.equal(lot.quantity,2);
 const careInput={sessionId,targetId:born.characterId,profileId:care.id,supplyLots:{'medical-supplies':lot.id}},cp=await call('preparePersonAction',careInput,player);
 const treatment=await cmd('startPersonAction',{...careInput,confirmation:cp.confirmation,present:true},player);
 assert.equal((await request('finishPersonAction',{sessionId,actionId:treatment.id,present:true,requestId:randomUUID()},player)).error,'FIELD_TOO_EARLY');
 await cmd('stopSafety',{sessionId,reason:'Essai sécurité synthétique'},player);
 assert.equal((await call('myHealth',{sessionId},player)).health.safetyStopped,true);
 const safety=await call('session',{sessionId});assert.equal((await request('resumeSafety',{sessionId,revision:safety.revision,reason:'Reprise interdite',requestId:randomUUID()},player)).status,403);
 await cmd('resumeSafety',{sessionId,revision:safety.revision,reason:'Reprise MJ synthétique'});
 const pauseCare=await call('session',{sessionId});await cmd('setStage',{sessionId,revision:pauseCare.revision,stage:'PAUSE'});
 const careClock=(await ref.get()).data();await ref.update({clock:{...careClock.clock,elapsedMs:careClock.clock.elapsedMs+105000}});
 const resumeCare=await call('session',{sessionId});await cmd('setStage',{sessionId,revision:resumeCare.revision,stage:'EN_JEU'});
 const careFinish={sessionId,actionId:treatment.id,present:true,requestId:randomUUID()},healed=await cmd('finishPersonAction',careFinish,player);
 assert.equal(healed.result.restored,1);assert.deepEqual(await cmd('finishPersonAction',careFinish,player),healed);
 assert.equal((await call('myHealth',{sessionId},player)).health.hp,3);
 assert.equal((await call('mySession',{sessionId},player)).actionPoints.available,3);
 assert.equal((await call('myInventory',{sessionId},player)).lots.find(l=>l.id===lot.id).quantity,1);
 assert.equal((await call('myWallet',{sessionId},player)).account.protectedCredits,200);
 const provision={sessionId,shopId:'counter',offerId:'supply',provisionId:'initial-counter',quantity:2,restricted:true,source:'Dotation du scénario : réserve PNJ',reason:'Fournitures disponibles'};
 assert.equal((await request('prepareShopProvision',provision,player)).status,403);assert.equal((await request('shops',{sessionId})).status,401);assert.equal((await request('shops',{sessionId},other)).status,403);
 const pp=await call('prepareShopProvision',provision),stock=await cmd('provisionShop',{...provision,confirmation:pp.confirmation});assert.deepEqual(await cmd('provisionShop',{...provision,confirmation:pp.confirmation}),stock);
 const shop=await call('shop',{sessionId,shopId:'counter'},player);assert.equal(shop.shops[0].offers[0].stock,2);assert.doesNotMatch(JSON.stringify(shop),/SECRET_|gmNotes|Dotation du scénario/);
 const shopInput={sessionId,shopId:'counter',offerId:'supply',quantity:1,useProtected:true},quote=await call('prepareShopPurchase',shopInput,player),purchase={...shopInput,quoteAt:quote.quoteAt,confirmation:quote.confirmation,requestId:randomUUID()},sale=await cmd('buyShopOffer',purchase,player);assert.deepEqual(await cmd('buyShopOffer',purchase,player),sale);
 assert.equal((await call('myWallet',{sessionId},player)).account.protectedCredits,170);assert.equal((await call('shopAdmin',{sessionId})).shops[0].account.balance,30);assert.equal((await call('myInventory',{sessionId},player)).ownedElsewhere[0].id,sale.purchasedLotId);
 const pending=(await call('shopAdmin',{sessionId})).orders[0];assert.equal((await request('offerShopPickup',{sessionId,saleId:sale.id,confirmation:pending.confirmation,requestId:randomUUID()},player)).status,403);await cmd('offerShopPickup',{sessionId,saleId:sale.id,confirmation:pending.confirmation});
 const ready=(await call('shops',{sessionId},player)).orders[0],pickup={sessionId,saleId:sale.id,confirmation:ready.confirmation,received:true,requestId:randomUUID()},received=await cmd('confirmShopPickup',pickup,player);assert.deepEqual(await cmd('confirmShopPickup',pickup,player),received);const acquired=(await call('myInventory',{sessionId},player)).lots.find(l=>l.id===sale.purchasedLotId);assert.equal(acquired.quantity,1);assert.equal(acquired.transferable,false);assert.equal(acquired.resellable,false);assert.equal((await call('myWallet',{sessionId},player)).account.protectedCredits,170);
 await cmd('revokeAccess',{sessionId,uid});assert.equal((await call('mySession',{sessionId},player)).character,null);assert.equal((await request('finishFieldAction',finish,player)).status,403);assert.equal((await request('buyShopOffer',purchase,player)).status,403);assert.equal((await request('birthSpaceOutlaws',{...birth,requestId:randomUUID()},owner)).error,'SO_ENTRY_CLOSED');
});

test('HTTP + Auth : vaisseau privé, plein, préparation PIL-02 et révocation du pilote',async()=>{
 const f=await soVoyagesFixture(()=>firestoreStore(getFirestore())),owner=await googleTestAccount(process.env.OWNER_EMAIL),email=`pilot-${randomUUID()}@example.invalid`,player=await googleTestAccount(email),outsider=await googleTestAccount(`outsider-${randomUUID()}@example.invalid`);
 const uid=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub,playerUid=uid(player),ownerUid=uid(owner),sessionId=f.sid,db=getFirestore(),base=`sessions/${sessionId}`;
 // Bind the canonical service fixture to real Auth Emulator identities. No production data.
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();
 await db.doc(base).update({ownerUid,clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid});
 await db.doc(`${base}/registrations/${hash(playerUid)}`).set({...registration,uid:playerUid,email,minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:playerUid});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token);
 assert.equal((await request('mySpaceport',{sessionId})).status,401);assert.equal((await request('shipNavigation',{sessionId,shipId:'ship'},outsider)).status,403);assert.equal((await request('spaceportAdmin',{sessionId},player)).status,403);
 const view=await call('shipNavigation',{shipId:'ship'});assert.equal(view.canPilot,true);assert.doesNotMatch(JSON.stringify(view),/SECRET_|OUT-SECRET|AWAY-CODE/);
 const lot=(await call('myInventory')).lots.find(l=>l.item.id==='propellant'),input={shipId:'ship',lotId:lot.id,quantity:4},p=await call('prepareRefuel',input),start={...input,present:true,confirmation:p.confirmation,requestId:randomUUID()},result=await cmd('refuelShip',start);assert.deepEqual(await cmd('refuelShip',start),result);
 let n=await call('shipNavigation',{shipId:'ship'});assert.equal((await request('finishSoRefuel',{sessionId,shipId:'ship',confirmation:n.confirmation,present:true,requestId:randomUUID()},player)).error,'VOYAGE_NOT_READY');
 const clock=(await db.doc(base).get()).data().clock;await db.doc(base).update({clock:{...clock,elapsedMs:clock.elapsedMs+120000}});n=await call('shipNavigation',{shipId:'ship'});await cmd('finishSoRefuel',{shipId:'ship',confirmation:n.confirmation,present:true});assert.equal((await call('shipNavigation',{shipId:'ship'})).ship.fuel,4);
 const flight={shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[]},q=await call('prepareVoyage',flight),depart={...flight,confirmation:q.confirmation,present:true,requestId:randomUUID()};await cmd('departShip',depart);assert.equal((await call('mySession')).actionPoints.reserved,1);
 await cmd('revokeAccess',{uid:playerUid},owner);assert.equal((await request('departShip',{sessionId,...depart},player)).status,403);n=(await call('spaceportAdmin',{},owner)).ships[0];await cmd('cancelSoNavigationAdmin',{shipId:'ship',confirmation:n.confirmation,reason:'Pilote révoqué'},owner);assert.equal((await db.doc(`${base}/ships/ship`).get()).data().fuel,4);assert.equal((await db.doc(`${base}/characters/${f.cid}/resources/actionPoints`).get()).data().reserved,0);
 const replacement=await googleTestAccount(`replacement-${randomUUID()}@example.invalid`),replacementUid=uid(replacement),replacementRegistration=(await db.doc(`${base}/registrations/${hash(f.other.uid)}`).get()).data();
 await db.doc(`${base}/registrations/${hash(replacementUid)}`).set({...replacementRegistration,uid:replacementUid,minAuthTime:0});await db.doc(`${base}/characters/${f.otherId}`).update({assignedUid:replacementUid});
 const handover={shipId:'ship',pilotId:f.otherId,reason:'Relève MJ après révocation, mandat vérifié'};
 assert.equal((await request('prepareSoPilot',{sessionId,...handover})).status,401);assert.equal((await request('prepareSoPilot',{sessionId,...handover},replacement)).status,403);
 const h=await call('prepareSoPilot',handover,owner),change={...handover,confirmation:h.confirmation,present:true,requestId:randomUUID()};
 assert.equal((await request('changeSoPilot',{sessionId,...change},replacement)).status,403);
 const changed=await cmd('changeSoPilot',change,owner);assert.deepEqual(await cmd('changeSoPilot',change,owner),changed);const newView=await call('shipNavigation',{shipId:'ship'},replacement);assert.equal(newView.canPilot,true);assert.equal(newView.ship.ownerId,f.cid);assert.equal(newView.ship.fuel,4);assert.doesNotMatch(JSON.stringify(newView),/mandat vérifié|actorUid/);

});

test('HTTP + Auth : duel privé, réservation PIL-03, révocation et résolution MJ',async()=>{
 const {encountersFixture,order}=await import('../support/space-encounters-suite.mjs');
 const f=await encountersFixture(()=>firestoreStore(getFirestore())),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`duel-${randomUUID()}@example.invalid`),other=await googleTestAccount(`pirate-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`outside-${randomUUID()}@example.invalid`),db=getFirestore(),sessionId=f.sid,base=`sessions/${sessionId}`;
 const uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub;
 await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 for(const [actor,cid,token] of [[f.player,f.cid,player],[f.other,f.otherId,other]]){const r=(await db.doc(`${base}/registrations/${hash(actor.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(uid(token))}`).set({...r,uid:uid(token),minAuthTime:0});await db.doc(`${base}/characters/${cid}`).update({assignedUid:uid(token)});}
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),combatId=f.combatId();
 assert.equal((await request('spaceCombats',{sessionId})).status,401);assert.equal((await request('spaceCombat',{sessionId,combatId},outsider)).status,403);assert.equal((await request('spaceCombatAdmin',{sessionId},player)).status,403);
 const admin=(await call('spaceCombatAdmin',{},owner)).combats[0];await cmd('startSpaceCombat',{combatId,confirmation:admin.confirmation,reason:'Briefing sur place',briefed:true},owner);
 const d=(await call('spaceCombat',{combatId})).combat,submission={combatId,shipId:'ship',confirmation:d.confirmation,order:order('PIL03_2'),requestId:randomUUID()};const saved=await cmd('submitSpaceOrder',submission);assert.deepEqual(await cmd('submitSpaceOrder',submission),saved);assert.equal((await call('mySession')).actionPoints.reserved,1);assert.equal((await call('spaceCombat',{combatId},other)).combat.ownOrder,null);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('submitSpaceOrder',{sessionId,...submission},player)).status,403);await db.doc(`${base}/spaceCombats/${combatId}`).update({deadline:0});const latest=(await call('spaceCombatAdmin',{},owner)).combats[0];await cmd('resolveSpaceRoundAdmin',{combatId,confirmation:latest.confirmation},owner);assert.equal((await db.doc(`${base}/characters/${f.cid}/resources/actionPoints`).get()).data().reserved,0);
});

test('HTTP + Auth : entretien sur stock réel, progression puis fret chronométré',async()=>{
 const {spaceLogisticsFixture}=await import('../support/space-logistics-suite.mjs'),f=await spaceLogisticsFixture(()=>firestoreStore(getFirestore())),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`workshop-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`workshop-outside-${randomUUID()}@example.invalid`),db=getFirestore(),sessionId=f.sid,base=`sessions/${sessionId}`,uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub;
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});await db.doc(`${base}/ships/ship`).update({hull:1});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),advance=async ms=>{const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+ms}});};
 assert.equal((await request('spaceMaintenance',{sessionId})).status,401);assert.equal((await request('spaceMaintenanceAdmin',{sessionId},player)).status,403);assert.equal((await request('myCargo',{sessionId},outsider)).status,403);
 const p=f.offersInput(),q=await call('prepareSpaceMaintenanceOffer',p,owner),r=await cmd('offerSpaceMaintenance',{...p,confirmation:q.confirmation},owner),quote=await call('prepareSpaceMaintenance',{maintenanceId:r.id});await cmd('acceptSpaceMaintenance',{maintenanceId:r.id,confirmation:quote.confirmation,present:true});let j=(await call('spaceMaintenance')).jobs[0];assert.equal((await request('finishSpaceMaintenancePoint',{sessionId,maintenanceId:r.id,confirmation:j.confirmation,performed:true,requestId:randomUUID()},player)).error,'MAINTENANCE_NOT_READY');await advance(300000);j=(await call('spaceMaintenance')).jobs[0];const complete={maintenanceId:r.id,confirmation:j.confirmation,performed:true,requestId:randomUUID()},done=await cmd('finishSpaceMaintenancePoint',complete);assert.deepEqual(await cmd('finishSpaceMaintenancePoint',complete),done);assert.equal((await db.doc(`${base}/ships/ship`).get()).data().hull,2);j=(await call('spaceMaintenance')).jobs[0];await cmd('cancelSpaceMaintenance',{maintenanceId:r.id,confirmation:j.confirmation,reason:'Un point suffit ici'});assert.equal((await call('myWallet')).account.balance,5450);
 const lot=(await call('myInventory')).lots.find(l=>l.item.id==='propellant'),cargo={lotId:lot.id,quantity:5,destination:{kind:'HOLD',id:'ship'}},preview=await call('prepareCargoTransfer',cargo),t=await cmd('startCargoTransfer',{...cargo,confirmation:preview.confirmation,present:true});let d=await call('cargoTransfer',{transferId:t.id});assert.equal(d.canReceive,false);await advance(180000);d=await call('cargoTransfer',{transferId:t.id});await cmd('receiveCargoTransfer',{transferId:t.id,confirmation:d.confirmation,received:true});assert.equal((await call('shipHold',{shipId:'ship'})).hold.used,5);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('finishSpaceMaintenancePoint',{sessionId,...complete},player)).status,403);
});

test('HTTP + Auth : pièces personnelles et accord Mécano sans second paiement',async()=>{
 const {personalSuppliesFixture}=await import('../support/space-logistics-suite.mjs'),f=await personalSuppliesFixture(()=>firestoreStore(getFirestore())),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`parts-owner-${randomUUID()}@example.invalid`),tech=await googleTestAccount(`parts-mech-${randomUUID()}@example.invalid`),db=getFirestore(),sessionId=f.sid,base=`sessions/${sessionId}`,uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub;
 await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 for(const [old,token,cid] of [[f.player,player,f.cid],[f.other,tech,f.otherId]]){const r=(await db.doc(`${base}/registrations/${hash(old.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(uid(token))}`).set({...r,uid:uid(token),minAuthTime:0});await db.doc(`${base}/characters/${cid}`).update({assignedUid:uid(token)});}
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),advance=async ms=>{const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+ms}});};
 const before=(await call('myWallet')).account,p=f.offersInput({supplyLotId:f.partsId,technicianId:f.otherId});assert.equal((await request('prepareSpaceMaintenanceOffer',{sessionId,...p},player)).status,403);assert.equal((await request('prepareSpaceMaintenanceOffer',{sessionId,...p})).status,401);
 const q=await call('prepareSpaceMaintenanceOffer',p,owner),r=await cmd('offerSpaceMaintenance',{...p,confirmation:q.confirmation},owner),a=await call('prepareSpaceMaintenance',{maintenanceId:r.id});assert.equal(a.amount,0);assert.equal(a.before,null);assert.equal(a.units,20);await cmd('acceptSpaceMaintenance',{maintenanceId:r.id,confirmation:a.confirmation,present:true});let j=(await call('spaceMaintenance',{},tech)).jobs.find(j=>j.id===r.id);const payerJob=(await call('spaceMaintenance')).jobs.find(j=>j.id===r.id);assert.equal((await request('startSpaceMaintenance',{sessionId,maintenanceId:r.id,confirmation:payerJob.confirmation,present:true,requestId:randomUUID()},player)).status,403);await cmd('startSpaceMaintenance',{maintenanceId:r.id,confirmation:j.confirmation,present:true},tech);
 let last;for(let n=0;n<2;n++){await advance(300000);j=(await call('spaceMaintenance',{},tech)).jobs.find(j=>j.id===r.id);last={maintenanceId:r.id,confirmation:j.confirmation,performed:true,requestId:randomUUID()};const out=await cmd('finishSpaceMaintenancePoint',last,tech);assert.deepEqual(await cmd('finishSpaceMaintenancePoint',last,tech),out);}
 assert.deepEqual((await call('myWallet')).account,before);const lot=(await db.doc(`${base}/inventory/${f.partsId}`).get()).data();assert.equal(lot.quantity,0);assert.equal(lot.status,'CONSUMED');assert.equal((await db.doc(`${base}/ships/ship`).get()).data().hull,3);assert.doesNotMatch(JSON.stringify(await call('spaceMaintenance')),/SECRET_|actorUid|Stock de pièces préparé/);await cmd('revokeAccess',{uid:uid(tech)},owner);assert.equal((await request('finishSpaceMaintenancePoint',{sessionId,...last},tech)).status,403);
});

test('HTTP + Auth : mission M7, caisse PNJ réservée, preuve et paiement après contestation',async()=>{
 const {spaceMissionsFixture}=await import('../support/space-missions-suite.mjs'),f=await spaceMissionsFixture(()=>firestoreStore(getFirestore())),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`mission-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`mission-outside-${randomUUID()}@example.invalid`),db=getFirestore(),sessionId=f.sid,base=`sessions/${sessionId}`,uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub;
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);};
 assert.equal((await request('announcements',{sessionId})).status,401);assert.equal((await request('announcements',{sessionId},outsider)).status,403);assert.equal((await request('sessionAnnouncements',{sessionId},player)).status,403);
 const a=await confirm('prepareAnnouncement','saveAnnouncement',f.announcementInput()),t=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Je candidate'},player),c=await confirm('prepareMissionContract','proposeMissionContract',f.offerInput(t));assert.doesNotMatch(JSON.stringify(await call('contractDetail',{contractId:c.id})),/SECRET_/);
 await confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},player);await confirm('prepareContractProof','submitContractProof',{contractId:c.id,body:'Message rapporté au commanditaire',completedStepIds:['meet','report']},player);await confirm('prepareContractReview','reviewContract',{contractId:c.id,decision:'PAY',reason:'Preuve contrôlée'});assert.equal((await call('myWallet')).account.balance,0);
 assert.equal((await request('sessionContracts',{sessionId})).status,401);assert.equal((await request('sessionContracts',{sessionId,admin:true},player)).status,403);const registry=await call('sessionContracts',{},owner);assert.equal(registry.obligationsReady,true);assert.equal(registry.contracts[0].obligations.salaryReserved,100);assert.ok(registry.contracts[0].obligations.tasks.some(t=>t.kind==='SETTLEMENT'&&t.remainingMs>0));assert.equal((await call('myContracts',{admin:true})).contracts[0].obligations,undefined);assert.doesNotMatch(JSON.stringify(registry),/SECRET_|sourceAccountId|applicantUid|confirmation/);
 const p={contractId:c.id,reason:'Délai écoulé'};assert.equal((await request('prepareContractSettlement',{sessionId,...p},owner)).error,'SO_CONTEST_OPEN');const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+600000}});const q=await call('prepareContractSettlement',p,owner),input={...p,confirmation:q.confirmation,requestId:randomUUID()},paid=await cmd('settleContract',input,owner);assert.deepEqual(await cmd('settleContract',input,owner),paid);assert.equal((await call('myWallet')).account.balance,100);assert.equal((await call('myWallet')).account.protectedCredits,50);
 assert.equal((await call('sessionContracts',{},owner)).contracts[0].obligations.pending,false);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('contractDetail',{sessionId,contractId:c.id},player)).status,403);
});

test('HTTP + Auth : preuve terrain, récompense privée au QR comptoir et remise physique unique',async()=>{
 const {missionExecutionFixture}=await import('../support/mission-execution-suite.mjs'),f=await missionExecutionFixture(()=>firestoreStore(getFirestore())),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`reward-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`reward-outside-${randomUUID()}@example.invalid`),db=getFirestore(),sessionId=f.sid,base=`sessions/${sessionId}`,uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub;
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);},advance=async ms=>{const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+ms}});};
 const a=await confirm('prepareAnnouncement','saveAnnouncement',f.announcementInput()),t=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Je candidate'},player),options=await call('sessionApplication',{applicationId:t.id},owner);assert.equal(options.missionExecution.rewards.length,1);assert.equal((await request('sessionApplication',{sessionId,applicationId:t.id},player)).status,403);
 const c=await confirm('prepareMissionContract','proposeMissionContract',f.offerInput(t));assert.doesNotMatch(JSON.stringify(await call('contractDetail',{contractId:c.id})),/SECRET_|stepEvidence|targetId/);await confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},player);const proof={contractId:c.id,body:'Analyse et message remis',completedStepIds:['meet','report']};assert.equal((await request('prepareContractProof',{sessionId,...proof},player)).error,'SO_MISSION_EVIDENCE_REQUIRED');
 const q=await call('prepareFieldAction',{targetId:'scene',kind:'ANALYZE'}),field=await cmd('startFieldAction',{targetId:'scene',kind:'ANALYZE',present:true,confirmation:q.confirmation});await advance(q.durationSeconds*1000);await cmd('finishFieldAction',{actionId:field.id,present:true});await confirm('prepareContractProof','submitContractProof',proof,player);await confirm('prepareContractReview','reviewContract',{contractId:c.id,decision:'PAY',reason:'Réalisation vérifiée'});await advance(600000);await confirm('prepareContractSettlement','settleContract',{contractId:c.id,reason:'Contestation close'});
 const obligations=(await call('sessionContracts',{},owner)).contracts.find(x=>x.id===c.id).obligations;assert.equal(obligations.pending,true);assert.equal(obligations.pickups[0].quantity,3);assert.equal(obligations.salaryReserved,0);
 assert.equal((await request('shop',{sessionId,shopId:'counter'})).status,401);assert.equal((await request('shop',{sessionId,shopId:'counter'},outsider)).status,403);const counter=await call('shop',{shopId:'counter'});assert.equal(counter.missionRewards[0].contractId,c.id);assert.equal(counter.missionRewards[0].canReceive,false);assert.doesNotMatch(JSON.stringify(counter.missionRewards),/SECRET_|briefing|proof|applicantUid|sourceAccount/);let p=(await call('shopAdmin',{},owner)).missionRewards[0];assert.equal(p.confirmation,(await call('sessionContract',{contractId:c.id},owner)).rewardPickups[0].confirmation);assert.equal((await request('offerContractRewardPickup',{sessionId,contractId:c.id,pickupId:p.id,confirmation:p.confirmation,present:true,requestId:randomUUID()},player)).status,403);await cmd('offerContractRewardPickup',{contractId:c.id,pickupId:p.id,confirmation:p.confirmation,present:true},owner);p=(await call('shop',{shopId:'counter'})).missionRewards[0];assert.equal(p.canReceive,true);assert.equal(p.confirmation,(await call('contractDetail',{contractId:c.id})).rewardPickups[0].confirmation);const input={contractId:c.id,pickupId:p.id,confirmation:p.confirmation,received:true,requestId:randomUUID()};assert.equal((await request('confirmContractRewardPickup',{sessionId,...input},outsider)).status,403);assert.equal((await request('confirmContractRewardPickup',{sessionId,...input,quantity:999},player)).status,400);const done=await cmd('confirmContractRewardPickup',input);assert.deepEqual(await cmd('confirmContractRewardPickup',input),done);assert.equal((await call('myInventory')).lots.find(l=>l.id===p.id).quantity,3);assert.equal((await call('myWallet')).account.balance,100);assert.equal((await call('shop',{shopId:'counter'})).missionRewards[0].pickupStatus,'RECEIVED');assert.equal((await call('sessionContracts',{},owner)).contracts.find(x=>x.id===c.id).obligations.pending,false);await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('shop',{sessionId,shopId:'counter'},player)).status,403);assert.equal((await request('confirmContractRewardPickup',{sessionId,...input},player)).status,403);
});

test('HTTP + Auth : clôture SO, pages invisibles, reprise privée et révocation sur ancien lien',async()=>{
 const db=getFirestore(),f=await spaceMissionsFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`episode-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`episode-outside-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,first=f.sid;
 let sessionId=first;const registration=(await db.doc(`sessions/${first}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(`sessions/${first}`).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`sessions/${first}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`sessions/${first}/registrations/${hash(uid(player))}`).set({...registration,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`sessions/${first}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=owner)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token);
 const confirm=async(prep,action,input,token=owner)=>{const q=await call(prep,input,token);return cmd(action,{...input,confirmation:q.confirmation},token);},a=await confirm('prepareAnnouncement','saveAnnouncement',f.announcementInput()),application=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Mission à poursuivre'},player),contract=await confirm('prepareMissionContract','proposeMissionContract',f.offerInput(application));await confirm('prepareContractAcceptance','acceptContract',{contractId:contract.id},player);
 await cmd('setStage',{stage:'PAUSE',revision:(await call('session')).revision});const input={reason:'Fin de partie HTTP',participantUids:[uid(player)]},p=await call('prepareCampaignClosure',input);assert.equal(p.summary.continuity.contracts.find(c=>c.id===contract.id).obligations.salaryReserved,100);assert.equal((await request('prepareCampaignClosure',{sessionId,...input},player)).status,403);await cmd('closeCampaignSession',{...input,confirmation:p.confirmation});assert.equal((await call('mySession',{},player)).continuation,null);
 const next={campaignId:f.campaignId,title:'Épisode suivant HTTP',capacity:20,privacy:'Accès privés de campagne',healthPolicy:'PRESERVE',fields:[],reason:'Reprise'},q=await call('prepareCampaignEpisode',next),b=await cmd('beginCampaignEpisode',{...next,confirmation:q.confirmation});await cmd('advanceCampaignEpisode',{campaignId:f.campaignId,buildId:b.buildId});assert.equal((await db.doc(`sessions/${b.id}`).get()).exists,false);assert.equal((await request('mySession',{sessionId:b.id},player)).error,'NOT_FOUND');
 let r=b;while(r.status!=='READY')r=await cmd('advanceCampaignEpisode',{campaignId:f.campaignId,buildId:b.buildId});assert.equal((await call('mySession',{},player)).continuation.id,b.id);sessionId=b.id;assert.equal((await call('mySession',{},player)).character.id,f.cid);assert.equal((await call('mySession',{},player)).progression.xp,3);assert.equal((await call('myWallet',{},player)).account.balance,50);assert.equal((await request('myWallet',{sessionId},outsider)).status,403);
 assert.equal((await call('sessionContracts')).contracts.find(c=>c.id===contract.id).obligations.salaryReserved,100);
 await cmd('revokeAccess',{uid:uid(player)});assert.equal((await call('mySession',{sessionId:first},player)).continuation,null);assert.equal((await call('mySession',{},player)).character,null);
});

test('HTTP + Auth : V3.6 QR universel, D12 serveur, prise réelle et réessai après reconnexion',async()=>{
 const {searchFixture,searchDefinition}=await import('../support/space-search-suite.mjs'),definition=searchDefinition();definition.search.difficulty=1;
 const db=getFirestore(),f=await searchFixture(()=>firestoreStore(db),{definition}),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`search-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`search-outside-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token);
 const scan=await call('fieldTarget',{targetId:'cache'});assert.equal(scan.profiles[0].test,'D12');assert.doesNotMatch(JSON.stringify(scan),/Gravure|Datapad|Cache de crédits|SECRET/);assert.equal((await request('fieldAdmin',{sessionId},player)).status,403);
 const p=await call('prepareFieldAction',{targetId:'cache',kind:'SEARCH'}),a=await cmd('startFieldAction',{targetId:'cache',kind:'SEARCH',present:true,confirmation:p.confirmation});assert.equal((await request('finishFieldAction',{sessionId,actionId:a.id,present:true,requestId:randomUUID()},player)).error,'FIELD_TOO_EARLY');
 const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:60000}});const result=await cmd('finishFieldAction',{actionId:a.id,present:true,die:99});assert.ok(result.result.roll>=1&&result.result.roll<=12);assert.equal(result.result.discoveries.length,4);
 const input={actionId:a.id,findId:'cash',present:true,requestId:randomUUID()};assert.equal((await request('takeFieldFind',{sessionId,...input},outsider)).status,403);const receipt=await cmd('takeFieldFind',input);assert.deepEqual(await cmd('takeFieldFind',input),receipt);assert.equal((await call('myWallet')).account.balance,30);assert.equal((await call('myFieldActions')).actions[0].result.discoveries.find(d=>d.id==='cash').status,'TAKEN');const admin=await call('fieldAdmin',{},owner);assert.equal(admin.states.find(s=>s.id==='cache').finds.cash.status,'TAKEN');await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('takeFieldFind',{sessionId,...input},player)).status,403);
});

test('HTTP + Auth : succession proposée, validée par MJ, nouveau QR et dotation unique',async()=>{
 const {successionFixture,successorProposal}=await import('../support/space-succession-suite.mjs'),db=getFirestore(),f=await successionFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`successor-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`successor-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token);
 assert.equal((await request('mySpaceOutlawsSuccession',{sessionId})).status,401);assert.equal((await request('spaceOutlawsSuccession',{sessionId},player)).status,403);assert.equal((await request('mySpaceOutlawsSuccession',{sessionId},outsider)).status,403);
 const open={uid:uid(player),predecessorId:f.cid,revision:0,reason:'Votre nouvelle proposition'};assert.equal((await request('openSpaceOutlawsSuccession',{sessionId,...open,requestId:randomUUID()},player)).status,403);await cmd('openSpaceOutlawsSuccession',open,owner);
 let d=await call('mySpaceOutlawsSuccession');assert.equal(d.dossier.status,'OPEN');assert.doesNotMatch(JSON.stringify(d),/Dana Réserve|gmNotes|actorUid/);await cmd('submitSpaceOutlawsSuccessor',{predecessorId:f.cid,revision:d.dossier.revision,proposal:successorProposal});
 const p={uid:uid(player),predecessorId:f.cid,source:'PROPOSAL',options:f.options},q=await call('prepareSpaceOutlawsSuccession',p,owner),input={...p,confirmation:q.confirmation,reason:'Naissance validée en régie',requestId:randomUUID()};assert.equal((await request('succeedSpaceOutlawsCharacter',{sessionId,...input},player)).status,403);const result=await cmd('succeedSpaceOutlawsCharacter',input,owner);assert.deepEqual(await cmd('succeedSpaceOutlawsCharacter',input,owner),result);
 const me=await call('mySession');assert.equal(me.character.id,result.characterId);assert.notEqual(me.character.id,f.cid);assert.equal(me.actionPoints.available,5);assert.equal((await call('myWallet')).account.protectedCredits,200);assert.deepEqual((await call('myKnowledge')).items,[]);assert.equal((await request('mediaRead',{sessionId,slot:'portrait',context:{mode:'player',scope:'session',scopeId:sessionId,kind:'character',id:f.cid}},player)).status,403);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('mySpaceOutlawsSuccession',{sessionId},player)).status,403);assert.equal((await request('succeedSpaceOutlawsCharacter',{sessionId,...input},owner)).status,403);
});

test('HTTP + Auth : apprentissage privé entre épisodes, XP débités une fois et accès révoqué',async()=>{
 const {learningFixture}=await import('../support/space-learning-suite.mjs'),db=getFirestore(),f=await learningFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`learning-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`learning-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.e.sid,base=`sessions/${sessionId}`;
 const registration=(await db.doc(`${base}/registrations/${hash(f.f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner)});await db.doc(`campaigns/${f.e.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(f.f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token);
 assert.equal((await request('mySoLearning',{sessionId})).status,401);assert.equal((await request('mySoLearning',{sessionId},outsider)).status,403);assert.equal((await request('soLearningAdmin',{sessionId},player)).status,403);
 assert.equal((await request('authorizeSoLearning',{sessionId,uid:uid(player),characterId:f.cid,skillId:'SABOTAGE',kind:'RARE',reason:'Sans droit',requestId:randomUUID()},player)).status,403);
 const q=await call('prepareSoLearning',{characterId:f.cid,skillId:'TRA-01'}),input={characterId:f.cid,skillId:'TRA-01',confirmation:q.confirmation,requestId:randomUUID()},result=await cmd('learnSoSkill',input);assert.deepEqual(await cmd('learnSoSkill',input),result);assert.equal((await call('mySession')).progression.xp,1);assert.equal((await call('mySoLearning')).blocked,'SO_LEARNING_USED');assert.doesNotMatch(JSON.stringify(await call('mySoLearning')),/actorUid|gmNotes|VERITE_MJ/);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('learnSoSkill',{sessionId,...input},player)).status,403);
});

test('HTTP + Auth : transport confié, cargaison native, voyage, preuve MJ et règlement',async()=>{
 const {transportFixture}=await import('../support/space-transport-suite.mjs'),db=getFirestore(),f=await transportFixture(()=>firestoreStore(db),{quantity:5});await f.close();
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`transport-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`transport-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const registration=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});await db.doc(`${base}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...registration,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);},advance=async ms=>{const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+ms}});};
 assert.equal((await request('cargoPort',{sessionId,portId:'away'})).status,401);assert.equal((await request('cargoPortAdmin',{sessionId,portId:'away'},player)).status,403);assert.equal((await request('cargoPort',{sessionId,portId:'away'},outsider)).status,403);
 assert.equal((await request('myContracts',{sessionId})).status,401);assert.equal((await request('sessionContracts',{sessionId},player)).status,403);
 const moneyBefore=(await call('myWallet')).account;
 const a=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:f.a.id,intent:'APPLICATION',body:'Je transporte le fret'},player),c=await confirm('prepareMissionContract','proposeMissionContract',{...f.input,applicationId:a.id});await confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},player);let d=await call('contractDetail',{contractId:c.id});const lotId=d.transport.lots[0].id;assert.equal((await request('cargoLot',{sessionId,lotId},outsider)).status,403);
 const move=async destination=>{const context=destination.kind==='PORT'?{portId:destination.id}:{},p={lotId,quantity:5,destination,...context},q=await call('prepareCargoTransfer',p),t=await cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true});await advance(180000);const receipt=await call('prepareCargoReceipt',{transferId:t.id,...context}),input={...context,transferId:t.id,confirmation:receipt.confirmation,received:true,requestId:randomUUID()},done=await cmd('receiveCargoTransfer',input);assert.deepEqual(await cmd('receiveCargoTransfer',input),done);return input;};
 await move({kind:'HOLD',id:'ship'});const p={shipId:'ship',navigationCode:'AWAY-CODE',passengerCodes:[]},q=await call('prepareVoyage',p);await cmd('departShip',{...p,confirmation:q.confirmation,present:true});await advance(180000);let n=await call('shipNavigation',{shipId:'ship'});await cmd('finishSoPreparation',{shipId:'ship',confirmation:n.confirmation,present:true});n=await call('shipNavigation',{shipId:'ship'});
 if(n.ship.journey.suspended){const m=(await call('spaceportAdmin',{},owner)).ships.find(x=>x.shipId==='ship');await cmd('continueSoVoyage',{shipId:'ship',confirmation:m.confirmation,reason:'Rencontre synthétique résolue'},owner);}await advance(1000000);n=await call('shipNavigation',{shipId:'ship'});await cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});const port=await call('cargoPort',{portId:'away'});assert.equal(port.contracts.length,1);assert.equal(port.contracts[0].lots[0].canMove,true);assert.doesNotMatch(JSON.stringify(port),/SECRET_|AWAY-CODE|navigationCode/);assert.equal((await request('cargoPort',{sessionId,portId:'home'},player)).status,403);assert.equal((await call('cargoPortAdmin',{portId:'away'},owner)).contracts.length,1);const receipt=await move({kind:'PORT',id:'away'});assert.equal((await call('cargoPort',{portId:'away'})).contracts[0].complete,true);assert.equal((await call('contractDetail',{contractId:c.id})).contract.status,'ACTIVE');
 await confirm('prepareContractProof','submitContractProof',{contractId:c.id,body:'Livraison complète remise au destinataire',completedStepIds:['delivery']},player);await confirm('prepareContractReview','reviewContract',{contractId:c.id,decision:'PAY',reason:'Lots et réception vérifiés'});await advance(600000);await confirm('prepareContractSettlement','settleContract',{contractId:c.id,reason:'Contestation close'});const moneyAfter=(await call('myWallet')).account;assert.equal(moneyAfter.balance+(moneyAfter.protectedCredits??0),moneyBefore.balance+(moneyBefore.protectedCredits??0)+100);assert.equal((await db.doc(`${base}/inventory/${lotId}`).get()).data().ownerType,'SHOP');
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('receiveCargoTransfer',{sessionId,...receipt},player)).status,403);assert.equal((await request('cargoPort',{sessionId,portId:'away'},player)).status,403);
});

test('HTTP + Auth : convoi consenti, deux préparations, événement commun et arrivée atomique',async()=>{
 const {convoyFixture}=await import('../support/space-convoy-suite.mjs'),db=getFirestore(),f=await convoyFixture(()=>firestoreStore(db),{form:false});
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`convoy-${randomUUID()}@example.invalid`),escort=await googleTestAccount(`escort-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 for(const [actor,token,cid] of [[f.player,player,f.cid],[f.other,escort,f.otherId]]){const old=(await db.doc(`${base}/registrations/${hash(actor.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(actor.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(token))}`).set({...old,id:hash(uid(token)),uid:uid(token),minAuthTime:0});await db.doc(`${base}/characters/${cid}`).update({assignedUid:uid(token)});}
 await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),advance=async ms=>{const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+ms}});};
 assert.equal((await request('shipNavigation',{sessionId,shipId:'ship'},escort)).status,403);assert.equal((await request('prepareSoConvoy',{sessionId,shipId:'ship',escortShipId:'escort',navigationCode:'AWAY-CODE'})).status,401);
 const p={shipId:'ship',escortShipId:'escort',navigationCode:'AWAY-CODE'},q=await call('prepareSoConvoy',p);await cmd('proposeSoConvoy',{...p,confirmation:q.confirmation});const invitation=(await call('shipNavigation',{shipId:'escort'},escort)).invitations[0],accept={shipId:'escort',leaderShipId:'ship',confirmation:invitation.confirmation,requestId:randomUUID()},formed=await cmd('acceptSoConvoy',accept,escort);assert.deepEqual(await cmd('acceptSoConvoy',accept,escort),formed);
 for(const [shipId,token] of [['ship',player],['escort',escort]]){const p={shipId,navigationCode:'AWAY-CODE',passengerCodes:[]},q=await call('prepareVoyage',p,token);await cmd('departShip',{...p,confirmation:q.confirmation,present:true},token);}await advance(180000);
 const a=await call('shipNavigation',{shipId:'ship'});assert.equal((await cmd('finishSoPreparation',{shipId:'ship',confirmation:a.confirmation,present:true})).status,'WAITING_CONVOY');const b=await call('shipNavigation',{shipId:'escort'},escort);await cmd('finishSoPreparation',{shipId:'escort',confirmation:b.confirmation,present:true},escort);
 let n=await call('shipNavigation',{shipId:'ship'});const other=await call('shipNavigation',{shipId:'escort'},escort);assert.equal(n.ship.journey.convoyId,other.ship.journey.convoyId);assert.equal(n.ship.journey.event.roll,other.ship.journey.event.roll);
 if(n.ship.journey.suspended){const m=(await call('spaceportAdmin',{},owner)).ships.find(x=>x.shipId==='ship');await cmd('continueSoVoyage',{shipId:'ship',confirmation:m.confirmation,reason:'Rencontre commune terminée'},owner);}await advance(1000000);n=await call('shipNavigation',{shipId:'ship'});await cmd('arriveShip',{shipId:'ship',confirmation:n.confirmation});assert.equal((await call('shipNavigation',{shipId:'escort'},escort)).ship.portId,'away');assert.equal((await db.doc(`${base}/characters/${f.otherId}`).get()).data().activeVoyageId,null);
 await cmd('revokeAccess',{uid:uid(escort)},owner);assert.equal((await request('acceptSoConvoy',{sessionId,...accept},escort)).status,403);
});

test('HTTP + Auth : ESC-01, ordres privés, PA réservé puis consommé et révocation avant reçu',async()=>{
 const {escortManeuversFixture}=await import('../support/space-escort-maneuvers-suite.mjs'),db=getFirestore(),f=await escortManeuversFixture(()=>firestoreStore(db),{level:3});
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),cargo=await googleTestAccount(`esc01-cargo-${randomUUID()}@example.invalid`),escort=await googleTestAccount(`esc01-escort-${randomUUID()}@example.invalid`),pirate=await googleTestAccount(`esc01-pirate-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`esc01-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 for(const [actor,token,cid] of [[f.player,cargo,f.cid],[f.other,escort,f.otherId],[f.pirate,pirate,f.pirateId]]){const old=(await db.doc(`${base}/registrations/${hash(actor.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(actor.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(token))}`).set({...old,id:hash(uid(token)),uid:uid(token),minAuthTime:0});await db.doc(`${base}/characters/${cid}`).update({assignedUid:uid(token)});}
 await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=escort)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=escort)=>call(action,{requestId:randomUUID(),...input},token),detail=async token=>(await call('spaceCombat',{combatId:f.combatId},token)).combat;
 assert.equal((await request('spaceCombat',{sessionId,combatId:f.combatId})).status,401);assert.equal((await request('spaceCombat',{sessionId,combatId:f.combatId},outsider)).status,403);
 const pre={sessionId,combatId:f.combatId,shipId:'escort',confirmation:(await detail(escort)).confirmation,requestId:randomUUID()};assert.equal((await request('spaceEscortInterpose',pre)).status,401);assert.equal((await request('spaceEscortInterpose',pre,cargo)).status,403);
 let a=(await call('spaceCombatAdmin',{},owner)).combats.find(x=>x.id===f.combatId);await cmd('startSpaceCombat',{combatId:f.combatId,confirmation:a.confirmation,briefed:true,reason:'Briefing des trois pilotes'},owner);
 const points=(await call('mySession')).actionPoints;
 for(const [token,shipId,kind,targetId] of [[cargo,'ship','FLEE','pirate'],[pirate,'pirate','PURSUE','ship']]){const d=await detail(token);await cmd('submitSpaceOrder',{combatId:f.combatId,shipId,confirmation:d.confirmation,order:{kind,targetId,defenseIds:[],fallback:'PASSIVE',acceptSurrender:false,ceasefire:false}},token);}
 const d=await detail(escort);assert.equal(d.escortManeuver.observations[0].category,'CARGO');assert.doesNotMatch(JSON.stringify(d),/"kind":"PURSUE"|actorVersion|SECRET_/);
 const input={combatId:f.combatId,shipId:'escort',confirmation:d.confirmation,order:{kind:'ESC01',targetId:'ship',defenseIds:[],fallback:'PASSIVE',acceptSurrender:false,ceasefire:false},requestId:randomUUID()};assert.equal((await request('submitSpaceOrder',{sessionId,...input},cargo)).status,403);const r=await cmd('submitSpaceOrder',input);assert.deepEqual(await cmd('submitSpaceOrder',input),r);assert.equal((await call('mySession')).actionPoints.reserved,1);
 const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+90000}});a=(await call('spaceCombatAdmin',{},owner)).combats.find(x=>x.id===f.combatId);const done=await cmd('resolveSpaceRoundAdmin',{combatId:f.combatId,confirmation:a.confirmation},owner);assert.equal(done.result.rolls.filter(x=>x.kind==='INTERPOSE').length,1);assert.equal(done.result.rolls.filter(x=>x.kind==='PURSUIT').length,1);assert.equal((await call('mySession')).actionPoints.available,points.available-1);assert.equal((await call('mySession')).actionPoints.reserved,0);
 await cmd('revokeAccess',{uid:uid(escort)},owner);assert.equal((await request('submitSpaceOrder',{sessionId,...input},escort)).status,403);
});

test('HTTP + Auth : avenant de détour, deux comptes authentifiés, réserve unique et confidentialité',async()=>{
 const {amendmentFixture}=await import('../support/space-escort-amendments-suite.mjs'),{inventoryParty}=await import('../../src/core/inventory-transfers.mjs'),db=getFirestore(),store=firestoreStore(db),f=await amendmentFixture(()=>store);
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),cargo=await googleTestAccount(`detour-cargo-${randomUUID()}@example.invalid`),escort=await googleTestAccount(`detour-escort-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`detour-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 // Bind the two already-signed synthetic fixture identities to real emulator Auth accounts.
 for(const [actor,token,cid,contract] of [[f.player,cargo,f.cid,f.c],[f.other,escort,f.otherId,f.ec]]){
  const old=(await db.doc(`${base}/registrations/${hash(actor.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(actor.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(token))}`).set({...old,id:hash(uid(token)),uid:uid(token),minAuthTime:0});await db.doc(`${base}/characters/${cid}`).update({assignedUid:uid(token)});
  const party=await store.runTransaction(tx=>inventoryParty(tx,sessionId,cid));await db.doc(`${base}/contracts/${contract.id}`).update({applicantUid:uid(token),applicantVersion:party.version});
 }
 await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=owner)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=owner)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);};
 assert.equal((await request('prepareEscortAmendmentAdmin',{sessionId,...f.input})).status,401);assert.equal((await request('prepareEscortAmendmentAdmin',{sessionId,...f.input},escort)).status,403);
 await confirm('prepareEscortAmendmentAdmin','proposeEscortAmendmentAdmin',f.input);assert.equal((await request('contractDetail',{sessionId,contractId:f.ec.id},outsider)).status,403);
 const d=await call('contractDetail',{contractId:f.c.id},cargo);assert.equal(d.amendment.canRespond,true);assert.equal(d.amendment.proposal.newSalary,undefined);assert.doesNotMatch(JSON.stringify(d),/SECRET_ESCORT|SECRET_MJ|contextGuard|routeGuard/);
 const response={contractId:f.ec.id,decision:'ACCEPT',reason:'Détour accepté'};assert.equal((await request('prepareEscortAmendmentResponse',{sessionId,...response},cargo)).status,403);
 await confirm('prepareTransportAmendmentResponse','respondTransportAmendment',{...response,contractId:f.c.id},cargo);assert.equal((await db.doc(`${base}/accounts/${f.ep.sourceAccountId}`).get()).data().reserved,300);
 const q=await call('prepareEscortAmendmentResponse',response,escort),input={...response,confirmation:q.confirmation,requestId:randomUUID()},r=await cmd('respondEscortAmendment',input,escort);assert.deepEqual(await cmd('respondEscortAmendment',input,escort),r);assert.equal((await db.doc(`${base}/accounts/${f.ep.sourceAccountId}`).get()).data().reserved,375);assert.equal((await call('contractDetail',{contractId:f.ec.id},escort)).contract.terms.amount,125);
 await cmd('revokeAccess',{uid:uid(escort)});assert.equal((await request('respondEscortAmendment',{sessionId,...input},escort)).status,403);
});

test('HTTP + Auth : escorte financée, plein natif, restitution distincte et droits avant reçu',async()=>{
 const {escortFixture}=await import('../support/space-escort-suite.mjs'),db=getFirestore(),f=await escortFixture(()=>firestoreStore(db));await f.closeEscort();
 const owner=await googleTestAccount(process.env.OWNER_EMAIL),escort=await googleTestAccount(`paid-escort-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`paid-escort-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const registration=(await db.doc(`${base}/registrations/${hash(f.other.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(f.other.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(escort))}`).set({...registration,id:hash(uid(escort)),uid:uid(escort),minAuthTime:0});await db.doc(`${base}/characters/${f.otherId}`).update({assignedUid:uid(escort)});await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=escort)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=escort)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);},advance=async ms=>{const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+ms}});};
 assert.equal((await request('prepareEscortRefuel',{sessionId,contractId:f.ec.id})).status,401);assert.equal((await request('sessionContract',{sessionId,contractId:f.ec.id},escort)).status,403);
 const a=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:f.ea.id,intent:'APPLICATION',body:'Je propose de protéger le fret'},escort),c=await confirm('prepareMissionContract','proposeMissionContract',{...f.ep,applicationId:a.id});await confirm('prepareContractAcceptance','acceptContract',{contractId:c.id},escort);assert.equal((await db.doc(`${base}/accounts/${f.ep.sourceAccountId}`).get()).data().reserved,300);
 const p={contractId:c.id,shopId:'counter',offerId:'fuel',quantity:2},q=await call('prepareEscortRefuel',p),input={...p,confirmation:q.confirmation,present:true,requestId:randomUUID()},r=await cmd('startEscortRefuel',input);assert.deepEqual(await cmd('startEscortRefuel',input),r);assert.equal((await request('prepareEscortFuelReleaseAdmin',{sessionId,contractId:c.id,reason:'Sans mandat'},escort)).status,403);assert.equal((await request('contractDetail',{sessionId,contractId:c.id},outsider)).status,403);
 await advance(120000);const n=await call('shipNavigation',{shipId:'escort'});await cmd('finishSoRefuel',{shipId:'escort',confirmation:n.confirmation,present:true});assert.equal((await call('shipNavigation',{shipId:'escort'})).ship.fuel,2);assert.equal((await call('contractDetail',{contractId:c.id})).escort.fuel.remaining,50);
 const obligations=(await call('sessionContracts',{},owner)).contracts.find(x=>x.id===c.id).obligations;assert.equal(obligations.salaryReserved,100);assert.equal(obligations.fuelReserved,50);assert.equal(obligations.reserved,150);
 await confirm('prepareEscortFuelRelease','releaseEscortFuel',{contractId:c.id,reason:'Retour couvert par réserve personnelle ; restituer le reliquat'},escort);assert.equal((await db.doc(`${base}/accounts/${f.ep.sourceAccountId}`).get()).data().reserved,200);assert.equal((await call('shipNavigation',{shipId:'escort'})).ship.fuel,2);
 assert.equal((await call('sessionContracts',{},owner)).contracts.find(x=>x.id===c.id).obligations.fuelReserved,0);
 await cmd('revokeAccess',{uid:uid(escort)},owner);assert.equal((await request('startEscortRefuel',{sessionId,...input},escort)).status,403);
});

test('HTTP + Auth : détour PIL-01, confirmation, coût unique, secrets et révocation',async()=>{
 const {detoursFixture}=await import('../support/space-detours-suite.mjs'),db=getFirestore(),f=await detoursFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),pilot=await googleTestAccount(`pil01-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`pil01-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const reg=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(pilot))}`).set({...reg,id:hash(uid(pilot)),uid:uid(pilot),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(pilot)});await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:300000,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=pilot)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=pilot)=>call(action,{requestId:randomUUID(),...input},token),input={shipId:'ship',navigationCode:'ALTERNATE-CODE'};
 assert.equal((await request('prepareSoDetour',{sessionId,...input})).status,401);assert.equal((await request('prepareSoDetour',{sessionId,...input},outsider)).status,403);assert.equal((await request('prepareSoDetour',{sessionId,...input,roll:6},pilot)).status,400);
 const q=await call('prepareSoDetour',input),before=(await db.doc(`${base}/ships/ship`).get()).data(),points=(await call('mySession')).actionPoints;assert.equal(q.canPay,true);assert.doesNotMatch(JSON.stringify(q),/SECRET_|missionManifest|transportManifest|pilotGuard|SIDE-CODE/);const p={...input,confirmation:q.confirmation,requestId:randomUUID()};assert.equal((await request('attemptSoDetour',{sessionId,...p})).status,401);assert.equal((await request('attemptSoDetour',{sessionId,...p},outsider)).status,403);
 const result=await cmd('attemptSoDetour',p);assert.deepEqual(await cmd('attemptSoDetour',p),result);assert.equal(result.total,result.roll+2);assert.equal(result.success,result.total>=7);const ship=(await db.doc(`${base}/ships/ship`).get()).data();assert.equal(ship.fuel,before.fuel-2-(result.success?2:0));assert.deepEqual(ship.journey.event,before.journey.event);assert.equal(ship.journey.id,before.journey.id);assert.equal((await call('mySession')).actionPoints.available,points.available-1);assert.equal((await call('shipNavigation',{shipId:'ship'})).detour.used,true);
 await cmd('revokeAccess',{uid:uid(pilot)},owner);assert.equal((await request('attemptSoDetour',{sessionId,...p},pilot)).status,403);
});

test('HTTP + Auth : dossier PIL-01 par code, scène native, garanties, reçu et accès révoqué',async()=>{
 const {routeAnalysisFixture}=await import('../support/space-route-analysis-suite.mjs'),db=getFirestore(),f=await routeAnalysisFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),pilot=await googleTestAccount(`nav-analysis-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`nav-analysis-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const reg=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(pilot))}`).set({...reg,id:hash(uid(pilot)),uid:uid(pilot),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(pilot)});await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:300000,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=pilot)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=pilot)=>call(action,{requestId:randomUUID(),...input},token),input={navigationCode:'OUT-SECRET',targetId:'nav',kind:'ANALYZE'};
 assert.equal((await request('fieldTarget',{sessionId,navigationCode:'OUT-SECRET'})).status,401);assert.equal((await request('fieldTarget',{sessionId,navigationCode:'OUT-SECRET'},outsider)).status,403);assert.equal((await request('fieldTarget',{sessionId,targetId:'nav'},pilot)).error,'SO_ROUTE_DOSSIER_UNAVAILABLE');
 const d=await call('fieldTarget',{navigationCode:'OUT-SECRET'});assert.equal(d.target.id,'nav');assert.doesNotMatch(JSON.stringify(d),/PREPARED_PRIVATE|SECRET_TRUTH|OUT-SECRET|navbonus/);const q=await call('prepareFieldAction',input),a=await cmd('startFieldAction',{...input,confirmation:q.confirmation,present:true});assert.equal((await request('finishFieldAction',{sessionId,actionId:a.id,present:true,requestId:randomUUID()},pilot)).error,'FIELD_TOO_EARLY');
 const stored=(await db.doc(`${base}/fieldActions/${a.id}`).get()).data();await db.doc(base).update({clock:{elapsedMs:stored.readyAtGameMs+1000,runningSince:Date.now()}});const finish={actionId:a.id,present:true,requestId:randomUUID()},r=await cmd('finishFieldAction',finish);assert.deepEqual(r.result.information.filter(k=>!k.bonus).map(k=>k.id),['nav1','nav2']);assert.equal(r.result.total,r.result.roll+2);assert.equal(r.result.bonusSuccess,r.result.total>=6);assert.deepEqual(await cmd('finishFieldAction',finish),r);assert.equal((await call('mySession')).actionPoints.available,4);assert.equal((await call('knowledgeDetail',{knowledgeId:'nav1'})).knowledge.body,'PREPARED_PRIVATE_nav1');
 await cmd('revokeAccess',{uid:uid(pilot)},owner);assert.equal((await request('finishFieldAction',{sessionId,...finish},pilot)).status,403);assert.equal((await request('knowledgeDetail',{sessionId,knowledgeId:'nav1'},pilot)).status,403);
});

test('HTTP + Auth : recours financier, créance sans débit, restitution consentie et révocation',async()=>{
 const db=getFirestore(),f=await spaceMissionsFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`appeal-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`appeal-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const reg=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...reg,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);};
 const a=await confirm('prepareAnnouncement','saveAnnouncement',f.announcementInput()),t=await confirm('prepareAnnouncementResponse','respondAnnouncement',{announcementId:a.id,intent:'APPLICATION',body:'Je candidate'},player),c=await confirm('prepareMissionContract','proposeMissionContract',f.offerInput(t)),contractId=c.id;
 await confirm('prepareContractAcceptance','acceptContract',{contractId},player);await confirm('prepareContractProof','submitContractProof',{contractId,body:'Message remis',completedStepIds:['meet','report']},player);await confirm('prepareContractReview','reviewContract',{contractId,decision:'PAY',reason:'Preuve contrôlée'});const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+600000}});await confirm('prepareContractSettlement','settleContract',{contractId,reason:'Délai écoulé'});
 await confirm('prepareContractAppeal','appealContract',{contractId,reason:'Erreur matérielle',newEvidence:'Rapport rectifié'},player);const adjustment={contractId,basis:'MATERIAL_ERROR',adjustedAmount:40,reason:'Correction de la rémunération'};
 assert.equal((await request('prepareContractAppealAdjustment',{sessionId,...adjustment})).status,401);assert.equal((await request('prepareContractAppealAdjustment',{sessionId,...adjustment},player)).status,403);assert.equal((await request('contractDetail',{sessionId,contractId},outsider)).status,403);
 await confirm('prepareContractAppealAdjustment','adjustContractAppeal',adjustment);assert.equal((await call('myWallet')).account.balance,100);assert.equal((await call('contractDetail',{contractId})).appealFinance.balance.remaining,60);const payment={contractId,amount:25,reason:'Restitution partielle',consent:true};assert.equal((await request('prepareContractAppealPaymentAdmin',{sessionId,contractId,amount:25,reason:'Débit forcé'},owner)).status,403);assert.equal((await request('prepareContractAppealPayment',{sessionId,...payment,consent:false},player)).error,'SO_APPEAL_CONSENT_REQUIRED');
 const obligations=(await call('sessionContracts',{},owner)).contracts[0].obligations;assert.equal(obligations.reserved,0);assert.equal(obligations.appealBalance.remaining,60);assert.equal(obligations.appealBalance.direction,'TO_SPONSOR');
 const q=await call('prepareContractAppealPayment',payment),input={...payment,confirmation:q.confirmation,requestId:randomUUID()},paid=await cmd('payContractAppeal',input);assert.deepEqual(await cmd('payContractAppeal',input),paid);const w=(await call('myWallet')).account;assert.equal(w.balance,75);assert.equal(w.protectedCredits,50);assert.equal((await call('contractDetail',{contractId})).appealFinance.balance.remaining,35);
 assert.equal((await call('sessionContracts',{},owner)).contracts[0].obligations.appealBalance.remaining,35);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('payContractAppeal',{sessionId,...input},player)).status,403);assert.equal((await call('sessionContract',{contractId},owner)).appealFinance.balance.remaining,35);assert.ok((await call('sessionContracts',{},owner)).contracts[0].obligations.alerts.includes('ACCESS_CHANGED'));
});

test('HTTP + Auth : prime PNJ préfinancée, attribution sans débit puis contrat contestable et révocation',async()=>{
 const db=getFirestore(),f=await spaceMissionsFixture(()=>firestoreStore(db)),owner=await googleTestAccount(process.env.OWNER_EMAIL),player=await googleTestAccount(`bounty-so-${randomUUID()}@example.invalid`),outsider=await googleTestAccount(`bounty-so-other-${randomUUID()}@example.invalid`),uid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()).sub,sessionId=f.sid,base=`sessions/${sessionId}`;
 const reg=(await db.doc(`${base}/registrations/${hash(f.player.uid)}`).get()).data();await db.doc(`${base}/registrations/${hash(f.player.uid)}`).delete();await db.doc(`${base}/registrations/${hash(uid(player))}`).set({...reg,id:hash(uid(player)),uid:uid(player),minAuthTime:0});await db.doc(`${base}/characters/${f.cid}`).update({assignedUid:uid(player)});await db.doc(base).update({ownerUid:uid(owner),clock:{elapsedMs:0,runningSince:Date.now()}});await db.doc(`campaigns/${f.campaignId}`).update({ownerUid:uid(owner)});
 const call=async(action,input={},token=player)=>{const r=await request(action,{sessionId,...input},token);assert.equal(r.status,200,JSON.stringify(r));return r.result;},cmd=(action,input={},token=player)=>call(action,{requestId:randomUUID(),...input},token),confirm=async(prep,action,p,token=owner)=>{const q=await call(prep,p,token);return cmd(action,{...p,confirmation:q.confirmation},token);};
 assert.equal((await request('bounties',{sessionId})).status,401);assert.equal((await request('bounties',{sessionId},outsider)).status,403);const a=await confirm('prepareAnnouncement','saveAnnouncement',f.announcementInput({mode:'OPEN_BOUNTY',category:'BOUNTY',places:2})),bountyId=a.id,sourceAccountId=(await f.till()).id;await confirm('prepareBounty','openBounty',{announcementId:a.id,amount:50,funding:'ACCOUNT',sourceAccountId,reason:'Cagnotte PNJ réelle'});assert.equal((await db.doc(`${base}/accounts/${sourceAccountId}`).get()).data().reserved,100);
 const claim={bountyId,body:'Preuve personnelle reçue',consent:true};assert.equal((await request('prepareBountyClaim',{sessionId,...claim,consent:false},player)).error,'SO_BOUNTY_CONSENT_REQUIRED');await confirm('prepareBountyClaim','submitBountyClaim',claim,player);const d=await call('bountyDetail',{bountyId});assert.doesNotMatch(JSON.stringify(d),/SECRET_|sourceAccountId/);const p={bountyId,claimId:d.claims[0].id,decision:'PAY',reason:'Attribution vérifiée'};assert.equal((await request('prepareBountyReview',{sessionId,...p},player)).status,403);const q=await call('prepareBountyReview',p,owner);assert.equal(q.deferred,true);assert.equal(q.paid,0);const input={...p,confirmation:q.confirmation,requestId:randomUUID()},r=await cmd('reviewBounty',input,owner);assert.deepEqual(await cmd('reviewBounty',input,owner),r);assert.equal((await call('myWallet')).account.balance,0);
 const contractId=(await call('bountyDetail',{bountyId})).claims[0].contractId;assert.equal((await request('prepareContractSettlement',{sessionId,contractId,reason:'Trop tôt'},owner)).error,'SO_CONTEST_OPEN');await confirm('prepareBountyClosure','closeBounty',{bountyId,reason:'Fin des nouvelles attributions'});assert.equal((await db.doc(`${base}/accounts/${sourceAccountId}`).get()).data().reserved,50);const s=(await db.doc(base).get()).data();await db.doc(base).update({clock:{...s.clock,elapsedMs:s.clock.elapsedMs+600000}});await confirm('prepareContractSettlement','settleContract',{contractId,reason:'Délai écoulé'});assert.equal((await call('myWallet')).account.balance,50);assert.equal((await call('myWallet')).account.protectedCredits,50);assert.equal((await db.doc(`${base}/accounts/${sourceAccountId}`).get()).data().reserved,0);
 await cmd('revokeAccess',{uid:uid(player)},owner);assert.equal((await request('bountyDetail',{sessionId,bountyId},player)).status,403);assert.equal((await request('contractDetail',{sessionId,contractId},player)).status,403);
});

test('HTTP + Auth : scénario de recette local par commandes natives, rôles et réserves réelles',async()=>{
 const {seedMissionScenario}=await import('../../scripts/recette/scenario.mjs'),{createRecetteIdentities}=await import('../../scripts/recette/auth.mjs');
 const previousOwner=process.env.OWNER_EMAIL;process.env.OWNER_EMAIL='owner@recette.example.invalid';
 try{
 const {tokens,uids}=await createRecetteIdentities(process.env);
 const call=async(action,input={},role='owner')=>{const r=await request(action,input,tokens[role]);assert.equal(r.status,200,`${action}: ${JSON.stringify(r)}`);return r.result;};
 const s=await seedMissionScenario(call,uids),input={sessionId:s.sessionId},registry=await call('sessionContracts',input);assert.equal(registry.session.stage,'PAUSE');assert.equal(registry.contracts[0].obligations.salaryReserved,100);assert.equal(registry.contracts[0].obligations.rewards[0].remaining,3);assert.equal((await call('myWallet',input,'player')).account.protectedCredits,50);assert.equal((await call('myWallet',input,'other')).account.protectedCredits,200);assert.equal((await call('shops',input,'player')).shops[0].offers[0].stock,2);
 assert.equal((await request('sessionContracts',input)).status,401);assert.equal((await call('sessionContracts',input,'mj')).contracts.length,1);for(const role of ['reception','player','other','outsider'])assert.equal((await request('sessionContracts',input,tokens[role])).status,403);
 assert.match(JSON.stringify(await call('contractDetail',{...input,contractId:s.contractId},'player')),/SECRET_RECETTE_BRIEFING/);assert.equal((await request('contractDetail',{...input,contractId:s.contractId},tokens.other)).status,403);assert.equal((await request('session',{sessionId:s.otherSessionId},tokens.mj)).status,403);
 const session=await call('session',input),till=session.accounts.find(a=>a.ownerType==='SHOP');assert.equal(till.balance,150);assert.equal(till.reserved,100);assert.doesNotMatch(JSON.stringify(s),/idToken|SECRET_|email/);assert.equal(s.humanAcceptance,'NOT_EXECUTED');
 }finally{process.env.OWNER_EMAIL=previousOwner;}
});
