import {centralTestShipModel,centralTestPort,centralTestRoute} from '../support/central-space-suite.mjs';
import {centralTestMission} from '../support/central-missions-suite.mjs';
import {centralTestKnowledge} from '../support/central-knowledge-suite.mjs';
import {centralTestShop,centralTestOffer} from '../support/central-shops-suite.mjs';
import {centralTestKit} from '../support/central-class-kits-suite.mjs';
import {centralCharacterRow} from '../support/central-character-import-suite.mjs';
import {centralTestCharacter} from '../support/central-characters-suite.mjs';
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
 let d=await call('centralMaster',{campaignId,workshop:'M5'},editor);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').length,2);assert.deepEqual(d.references.items,[]);assert.deepEqual(d.references.characters,[]);assert.doesNotMatch(JSON.stringify(d),/Ingrédient synthétique|Voyageuse synthétique/);
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
 let d=await call('centralMaster',{campaignId,workshop:'M4'},editor);assert.deepEqual(d.references.items,[]);assert.deepEqual(d.references.knowledge,[]);assert.equal(d.references.knowledgeReadable,false);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').map(x=>x.field).sort(),['components.0.itemId','productItemId','unlockKnowledgeId']);
 assert.equal((await request('centralMaster',{campaignId,workshop:'M1'},editor)).status,403);
 assert.equal((await request('saveCentralItem',{campaignId,itemId:'ingredient',item:centralTestItem,draftRevision:1,itemRevision:0,reason:'Interdit',requestId:randomUUID()},editor)).status,403);
 await cmd('saveCentralItem',{campaignId,itemId:'ingredient',item:centralTestItem,draftRevision:1,itemRevision:0,reason:'Compléter M1'});
 await cmd('setCentralStaff',{...grant,readWorkshops:['M1','M4'],revision:1});
 d=await call('centralMaster',{campaignId,workshop:'M4'},editor);assert.equal(d.references.items.length,1);assert.equal(d.diagnostics.some(x=>x.reference==='ingredient'),false);assert.deepEqual(d.references.knowledge,[]);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').map(x=>x.field),['unlockKnowledgeId']);assert.equal(d.publicationAvailable,false);
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
