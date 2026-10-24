import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralShopsFixture} from './central-shops-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {centralRecipeRow} from './central-import-suite.mjs';
import {centralCharacterRow} from './central-character-import-suite.mjs';
import {knowledgeInput} from '../../src/core/knowledge.mjs';
import {centralLimits} from '../../src/core/central-master.mjs';

export const centralTestKnowledge={kind:'DOCUMENT',title:'Document synthétique',body:'Texte confidentiel M6',origin:'Origine fictive',shareMode:'SHOW',gmTruth:'Vérité réservée M6',gmNotes:'Note privée M6',initialCharacterIds:['character'],qrEnabled:true,qrAudience:'SELECTED',qrCharacterIds:['character'],qrSkillId:null,qrSkillLevel:null};
export async function centralKnowledgeFixture(makeStore){
 const f=await centralShopsFixture(makeStore);
 const saveKnowledge=(extra={},actor=f.owner)=>f.cmd('saveCentralKnowledge',{campaignId:f.cid,knowledgeId:'knowledge-test',draftRevision:0,knowledgeRevision:0,knowledge:centralTestKnowledge,reason:'Préparer une information',...extra},actor);
 const archiveKnowledge=(extra={},actor=f.owner)=>f.cmd('archiveCentralKnowledge',{campaignId:f.cid,knowledgeId:'knowledge-test',draftRevision:1,knowledgeRevision:1,reason:'Archiver une information',...extra},actor);
 return {...f,saveKnowledge,archiveKnowledge};
}
const diag=(d,type)=>d.diagnostics.filter(x=>x.referenceType===type);
export function centralKnowledgeSuite(makeStore,prefix='Informations centrales C2h'){
 test(`${prefix} : lecture vide sans écriture, édition M6 déléguée explicitement`,async()=>{
  const f=await centralKnowledgeFixture(makeStore),d=await f.view('M6');assert.equal(d.draft.revision,0);assert.deepEqual(d.changes,[]);assert.equal(await f.store.get(f.base),null);assert.equal(d.publicationAvailable,false);
  await f.grant({readWorkshops:['M6'],editWorkshops:[]});await f.view('M6',f.mj);await assert.rejects(f.saveKnowledge({},f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M6'],editWorkshops:['M6']});await f.saveKnowledge({},f.mj);await assert.rejects(f.grant({revision:2,readWorkshops:['M1'],editWorkshops:['M6']}),{code:'INVALID_CENTRAL_GRANT'});
 });
 test(`${prefix} : format natif privé, aucun reçu, QR, accès ou ressource créé`,async()=>{
  const f=await centralKnowledgeFixture(makeStore),session=await f.store.get(`sessions/${f.sid}`);await f.saveKnowledge();const d=await f.view('M6'),c=d.changes[0];
  assert.deepEqual(c.data,{...knowledgeInput({...centralTestKnowledge,publicationState:'DRAFT'},'knowledge-test'),masterArchived:false});assert.equal(c.source,'WEB');assert.equal(c.workshop,'M6');assert.equal(d.history[0].before,null);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),session);for(const k of ['characters','knowledge','registrations','inventory','accounts','ledger','actionPoints','fieldTargets','fieldStates'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[]);
  assert.deepEqual(await f.store.list(`sessions/${f.sid}/characters/character/knowledge`),[]);assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
  await assert.rejects(f.cmd('discoverKnowledge',{sessionId:f.sid,knowledgeId:'knowledge-test'},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : documents, indices et informations dans une seule collection`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);let revision=0;for(const kind of ['DOCUMENT','CLUE','KNOWLEDGE'])await f.saveKnowledge({knowledgeId:kind,draftRevision:revision++,knowledge:{...centralTestKnowledge,kind,shareMode:kind==='CLUE'?'COPY':'SHOW'}});
  const d=await f.view('M6');assert.equal(d.changes.length,3);assert.equal(d.history.length,3);assert.equal(d.changes.find(c=>c.entityId==='CLUE').data.shareMode,'COPY');assert.ok(d.changes.every(c=>c.type==='knowledge'));
 });
 test(`${prefix} : destinataires différés puis résolus sans réécriture ni attribution`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();const old=await f.store.get(`${f.base}/changes/knowledge_knowledge-test`);assert.equal(diag(await f.view('M6'),'character').filter(x=>x.code==='REFERENCE_MISSING').length,2);
  await f.saveCharacter({draftRevision:1,character:{...centralTestCharacter,relations:[]}});const d=await f.view('M6');assert.deepEqual(d.diagnostics,[]);assert.deepEqual(await f.store.get(`${f.base}/changes/knowledge_knowledge-test`),old);
  assert.deepEqual(Object.keys(d.references.characters[0]).sort(),['archived','id','name','revision','source']);assert.doesNotMatch(JSON.stringify(d),/Secret de fiction|Note M2 privée|Biographie fictive|playerSecrets|creationPlan/);assert.deepEqual(await f.store.list(`sessions/${f.sid}/characters/character/knowledge`),[]);
 });
 test(`${prefix} : M6 seul ne consulte pas M2 ni les admissions`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveCharacter();await f.configure(1);await f.saveKnowledge({draftRevision:2});await f.grant({readWorkshops:['M6'],editWorkshops:['M6']});
  const reads=[],run=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>run(tx=>cb({...tx,get:async p=>{reads.push([p]);return tx.get(p);},list:async(...args)=>{reads.push(args);return tx.list(...args);}}));
  const d=await f.view('M6',f.mj);assert.deepEqual(reads.filter(([p])=>p===`${f.base}/changes`).map(x=>x[1]),[['workshop','M6']]);assert.ok(reads.every(([p])=>!p.includes('/admission/')&&!p.includes('/registrations')));
  assert.deepEqual(d.references,{charactersReadable:false,characters:[]});assert.ok(d.diagnostics.every(x=>x.code==='REFERENCE_NOT_CHECKED'));assert.doesNotMatch(JSON.stringify(d),/Voyageuse synthétique|species-test|Règles fictives|Note M2 privée/);assert.equal(d.history.length,1);
  await assert.rejects(f.view('M2',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await assert.rejects(f.check(3,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : existence et archives M2 ne sont pas révélées sans lecture`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();await f.grant({readWorkshops:['M6'],editWorkshops:[]});const before=(await f.view('M6',f.mj)).diagnostics;await f.saveCharacter({draftRevision:1});await f.archiveCharacter({draftRevision:2});
  assert.deepEqual((await f.view('M6',f.mj)).diagnostics,before);await f.grant({revision:1,readWorkshops:['M2','M6'],editWorkshops:[]});let d=await f.view('M6',f.mj);assert.ok(d.diagnostics.every(x=>x.code==='REFERENCE_ARCHIVED'));
  await f.grant({revision:2,readWorkshops:['M6'],editWorkshops:[]});d=await f.view('M6',f.mj);assert.deepEqual(d.references.characters,[]);assert.doesNotMatch(JSON.stringify(d),/Voyageuse synthétique/);
 });
 test(`${prefix} : recette M4 résolue vers M6 sans texte, vérité ni destinataires`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.recipe();let d=await f.view('M4');assert.equal(diag(d,'knowledge')[0].code,'REFERENCE_MISSING');const recipe=await f.store.get(`${f.base}/changes/recipe_formula`);
  await f.saveKnowledge({draftRevision:1});d=await f.view('M4');assert.deepEqual(diag(d,'knowledge'),[]);assert.deepEqual(Object.keys(d.references.knowledge[0]).sort(),['archived','id','kind','revision','source','title']);
  assert.doesNotMatch(JSON.stringify(d),/Texte confidentiel M6|Vérité réservée M6|Note privée M6|initialCharacterIds|qrCharacterIds/);assert.deepEqual(await f.store.get(`${f.base}/changes/recipe_formula`),recipe);
  const r=await f.check(2);assert.equal(r.edges.find(e=>e.to.type==='knowledge').status,'RESOLVED');assert.equal(r.edges.find(e=>e.to.type==='knowledge').to.workshop,'M6');assert.equal(r.publicationAvailable,false);
 });
 test(`${prefix} : lecture M4 isolée ne révèle ni titre, existence ou archive M6`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.recipe();await f.grant({readWorkshops:['M4'],editWorkshops:['M4']});const reads=[],run=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>run(tx=>cb({...tx,list:async(...args)=>{reads.push(args);return tx.list(...args);}}));
  const first=await f.view('M4',f.mj);assert.deepEqual(reads.filter(([p])=>p===`${f.base}/changes`).map(x=>x[1]),[['workshop','M4']]);assert.equal(diag(first,'knowledge')[0].code,'REFERENCE_NOT_CHECKED');await f.saveKnowledge({draftRevision:1});await f.archiveKnowledge({draftRevision:2});const after=await f.view('M4',f.mj);
  assert.deepEqual(diag(after,'knowledge'),diag(first,'knowledge'));assert.deepEqual(after.references.knowledge,[]);assert.equal(after.references.knowledgeReadable,false);assert.doesNotMatch(JSON.stringify(after),/Document synthétique|Texte confidentiel M6|Vérité réservée M6/);
  await f.grant({revision:1,readWorkshops:['M4','M6'],editWorkshops:['M4']});assert.equal(diag(await f.view('M4',f.mj),'knowledge')[0].code,'REFERENCE_ARCHIVED');await f.grant({revision:2,readWorkshops:['M4'],editWorkshops:['M4']});assert.deepEqual((await f.view('M4',f.mj)).references.knowledge,[]);
 });
 test(`${prefix} : archive et restauration M6 recalculent M4, historique conservé`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();await f.recipe(1);const input={draftRevision:2,requestId:randomUUID()},r=await f.archiveKnowledge(input);assert.deepEqual(await f.archiveKnowledge(input),r);let d=await f.view('M6');assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes[0].data.masterArchived,true);assert.equal(diag(await f.view('M4'),'knowledge')[0].code,'REFERENCE_ARCHIVED');
  await f.saveKnowledge({draftRevision:3,knowledgeRevision:2});d=await f.view('M6');assert.equal(d.changes[0].data.revision,3);assert.equal(d.history[0].before.operation,'ARCHIVE');assert.deepEqual(diag(await f.view('M4'),'knowledge'),[]);assert.equal(d.changes.length,1);
 });
 test(`${prefix} : sélection QR vide signalée, aucune audience élargie implicitement`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge({knowledge:{...centralTestKnowledge,initialCharacterIds:[],qrCharacterIds:[]}});assert.equal((await f.view('M6')).diagnostics[0].code,'RECIPIENTS_REQUIRED');
  await f.saveKnowledge({draftRevision:1,knowledgeRevision:1,knowledge:{...centralTestKnowledge,initialCharacterIds:[],qrCharacterIds:[],qrEnabled:false}});let d=await f.view('M6');assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes[0].data.qrAudience,'SELECTED');
  await f.saveKnowledge({draftRevision:2,knowledgeRevision:2,knowledge:{...centralTestKnowledge,initialCharacterIds:[],qrAudience:'ALL_PLAYERS'}});d=await f.view('M6');assert.deepEqual(d.changes[0].data.qrCharacterIds,['character']);assert.equal(d.changes[0].data.publicationState,'DRAFT');
 });
 test(`${prefix} : compétence conditionnelle conservée, contrôle canonique encore différé`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge({knowledge:{...centralTestKnowledge,initialCharacterIds:[],qrCharacterIds:[],qrEnabled:false,qrSkillId:'skill',qrSkillLevel:3}});const d=await f.view('M6');assert.equal(d.diagnostics[0].code,'REFERENCE_PENDING');assert.equal(d.diagnostics[0].referenceType,'skill');const r=await f.check(1);assert.equal(r.edges[0].status,'NOT_CHECKED');assert.equal(d.changes[0].data.qrSkillLevel,3);
 });
 test(`${prefix} : privilèges, données de jeu et champs inconnus refusés`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);for(const patch of [{publicationState:'PUBLISHED'},{masterArchived:true},{id:'forged'},{revision:1},{mediaImages:{}},{receipt:{}},{assignedUid:'uid'},{secret:true},{stock:10},{schemaVersion:2},{qrEnabled:'yes'}])await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,...patch}}),{code:'INVALID_CENTRAL_KNOWLEDGE'});
  await assert.rejects(f.saveKnowledge({sessionId:f.sid}),{code:'INVALID_CENTRAL_MASTER'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : listes bornées, doublons et références malformées refusés`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);for(const key of ['initialCharacterIds','qrCharacterIds']){
   await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,[key]:['a','a']}}),{code:'DUPLICATE_MEMBER'});await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,[key]:Array.from({length:101},(_,i)=>`c${i}`)}}),{code:'INVALID_CENTRAL_KNOWLEDGE'});await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,[key]:['../a']}}),{code:'INVALID_ID'});await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,[key]:'a'}}),{code:'INVALID_CENTRAL_KNOWLEDGE'});
  }
  for(const patch of [{qrSkillId:'skill',qrSkillLevel:null},{qrSkillId:'skill',qrSkillLevel:0},{qrSkillId:'skill',qrSkillLevel:6},{qrSkillId:'skill',qrSkillLevel:1.5},{qrSkillId:null,qrSkillLevel:1}])await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,...patch}}),{code:'INVALID_CENTRAL_KNOWLEDGE'});
 });
 test(`${prefix} : validation native du texte et limites en octets`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);for(const patch of [{title:''},{body:''},{title:'t'.repeat(151)},{body:'b'.repeat(20001)},{origin:'o'.repeat(301)},{gmTruth:'t'.repeat(10001)},{gmNotes:'n'.repeat(10001)},{kind:'SECRET'},{shareMode:'ALL'},{qrAudience:'PUBLIC'}])await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,...patch}}),{code:'INVALID_KNOWLEDGE'});
  await assert.rejects(f.saveKnowledge({knowledge:{...centralTestKnowledge,body:'界'.repeat(20000),gmTruth:'界'.repeat(10000),gmNotes:'界'.repeat(10000)}}),{code:'CENTRAL_KNOWLEDGE_SIZE'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : réessai stable, contenu modifié et retrait de droits avant reçu`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.grant({readWorkshops:['M6'],editWorkshops:['M6']});const input={requestId:randomUUID()},r=await f.saveKnowledge(input,f.mj);assert.deepEqual(await f.saveKnowledge(input,f.mj),r);await assert.rejects(f.saveKnowledge({...input,knowledge:{...centralTestKnowledge,title:'Autre'}},f.mj),{code:'REQUEST_ID_REUSED'});
  await f.grant({revision:1,readWorkshops:['M6'],editWorkshops:[]});await assert.rejects(f.saveKnowledge(input,f.mj),{code:'FORBIDDEN'});await f.grant({revision:2,readWorkshops:['M6'],editWorkshops:['M6']});assert.deepEqual(await f.saveKnowledge(input,f.mj),r);await f.grant({revision:3,active:false,readWorkshops:['M6'],editWorkshops:[]});await assert.rejects(f.view('M6',f.mj),{code:'FORBIDDEN'});assert.equal((await f.view('M6')).history.length,1);
 });
 test(`${prefix} : concurrence M6 avec M2, M4 et M5 sans écrasement`,async()=>{
  for(const other of ['character','recipe','shop']){const f=await centralKnowledgeFixture(makeStore),save=rev=>other==='character'?f.saveCharacter({draftRevision:rev}):other==='recipe'?f.recipe(rev):f.saveShop({draftRevision:rev}),r=await Promise.allSettled([f.saveKnowledge(),save(0)]);
   assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');if(r[0].status==='rejected')await f.saveKnowledge({draftRevision:1});else await save(1);assert.equal((await f.view('M6')).draft.revision,2);assert.equal((await f.store.list(`${f.base}/changes`)).length,2);
  }
 });
 test(`${prefix} : deux éditeurs M6 gardent ensemble texte, vérité et destinataires`,async()=>{
  const f=await centralKnowledgeFixture(makeStore),r=await Promise.allSettled([f.saveKnowledge(),f.saveKnowledge({knowledge:{...centralTestKnowledge,body:'Autre texte',gmTruth:'Autre vérité',initialCharacterIds:['other']}})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');const d=await f.view('M6'),v=d.changes[0].data;
  assert.equal(v.gmTruth,v.body==='Autre texte'?'Autre vérité':centralTestKnowledge.gmTruth);assert.deepEqual(v.initialCharacterIds,v.body==='Autre texte'?['other']:['character']);await assert.rejects(f.saveKnowledge({draftRevision:1}),{code:'STALE_REVISION'});assert.equal(d.history.length,1);
 });
 test(`${prefix} : types homonymes et définitions incohérentes correctement identifiés`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();await f.save({itemId:'knowledge-test',draftRevision:1});await f.recipe(2);const k=await f.store.get(`${f.base}/changes/knowledge_knowledge-test`);await f.inject(k.id,{data:{...k.data,publicationState:'PUBLISHED'}});let r=await f.check(3);
  assert.equal(r.totals.invalid,1);assert.equal(r.edges.find(e=>e.to.type==='knowledge').status,'INVALID');assert.ok(r.diagnostics.some(d=>d.referenceType==='knowledge'&&d.code==='REFERENCE_INVALID'));assert.ok(r.diff.some(d=>d.type==='item'&&d.id==='knowledge-test'));
  await f.inject(k.id,k);await f.saveCharacter({draftRevision:3});const c=await f.store.get(`${f.base}/changes/character_character`);await f.inject(c.id,{data:{...c.data,nature:'INVALID'}});r=await f.check(4);assert.equal(diag(r,'character').filter(d=>d.code==='REFERENCE_INVALID').length,2);
 });
 test(`${prefix} : provenance M6 Excel refusée et résumé global sans contenu secret`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();let r=await f.check(1);assert.equal(r.workshops.find(w=>w.id==='M6').coverage,'PARTIAL');assert.doesNotMatch(JSON.stringify(r),/Texte confidentiel M6|Vérité réservée M6|Note privée M6/);assert.equal(r.diff[0].name,centralTestKnowledge.title);assert.ok(r.diff[0].privateFields.includes('body'));
  await f.inject('knowledge_knowledge-test',{source:'XLSX',provenance:{schemaVersion:1,batchId:'batch',fileName:'M6.xlsx',sheet:'Documents',row:2}});r=await f.check(1);assert.equal(r.totals.invalid,1);assert.deepEqual(r.edges,[]);
 });
 test(`${prefix} : borne de 250 informations incluant archives, édition conservée`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();const c=(await f.view('M6')).changes[0];await f.store.runTransaction(async tx=>{for(let i=1;i<centralLimits.knowledge;i++)tx.set(`${f.base}/changes/knowledge_limit${i}`,{...c,id:`knowledge_limit${i}`,entityId:`limit${i}`,operation:'ARCHIVE',data:{...c.data,id:`limit${i}`,masterArchived:true}});});
  await assert.rejects(f.saveKnowledge({knowledgeId:'overflow',draftRevision:1}),{code:'CENTRAL_LIMIT'});await f.saveKnowledge({draftRevision:1,knowledgeRevision:1});assert.equal((await f.check(2)).totals.valid,250);
 });
 test(`${prefix} : import M4 recalcule M6, aperçu périmé refusé et provenance localisée`,async()=>{
  const f=await centralKnowledgeFixture(makeStore),e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M4',ids:[]});e.sheets.Recettes=[{...centralRecipeRow,connaissance_id:'knowledge-test'}];let input={campaignId:f.cid,workshop:'M4',fileName:'Recettes.xlsx',sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);
  let k=diag(p,'knowledge')[0];assert.equal(k.code,'REFERENCE_MISSING');assert.equal(k.sheet,'Recettes');assert.equal(k.row,2);assert.equal(k.column,'connaissance_id');
  await f.saveKnowledge();const before=await f.store.get(`${f.base}/changes/knowledge_knowledge-test`);await assert.rejects(f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Aperçu ancien'}),{code:'STALE_REVISION'});input.sheets.Meta[0].draft_revision='1';p=await f.read('prepareCentralImport',f.owner,input);assert.deepEqual(diag(p,'knowledge'),[]);await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Formule corrigée'});assert.deepEqual(await f.store.get(`${f.base}/changes/knowledge_knowledge-test`),before);
  await f.archiveKnowledge({draftRevision:2});k=diag(await f.check(3),'knowledge')[0];assert.equal(k.code,'REFERENCE_ARCHIVED');assert.equal(k.column,'connaissance_id');assert.equal(k.fileName,'Recettes.xlsx');
 });
 test(`${prefix} : import M4 sans M6 ne lit ni ne projette les secrets`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();await f.grant({readWorkshops:['M4'],editWorkshops:['M4']});const e=await f.read('exportCentralDraft',f.mj,{campaignId:f.cid,workshop:'M4',ids:[]});e.sheets.Recettes=[{...centralRecipeRow,connaissance_id:'knowledge-test'}];const reads=[],run=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>run(tx=>cb({...tx,list:async(...args)=>{reads.push(args);return tx.list(...args);}}));
  const p=await f.read('prepareCentralImport',f.mj,{campaignId:f.cid,workshop:'M4',fileName:'M4.xlsx',sheets:e.sheets});assert.ok(reads.every(([,filter])=>filter?.[1]!=='M6'));assert.equal(diag(p,'knowledge')[0].code,'REFERENCE_NOT_CHECKED');assert.doesNotMatch(JSON.stringify(p),/Document synthétique|Texte confidentiel M6|Vérité réservée M6/);
 });
 test(`${prefix} : import M2 résout les destinataires, Excel M6 indisponible`,async()=>{
  const f=await centralKnowledgeFixture(makeStore);await f.saveKnowledge();const before=await f.store.get(`${f.base}/changes/knowledge_knowledge-test`),e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M2',ids:[]});e.sheets.Personnages=[{...centralCharacterRow,id:'character',relations_json:'[]'}];const input={campaignId:f.cid,workshop:'M2',fileName:'M2.xlsx',sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Destinataire'});
  const d=await f.view('M6');assert.deepEqual(d.diagnostics,[]);assert.equal(d.references.characters[0].source,'XLSX');assert.deepEqual(await f.store.get(`${f.base}/changes/knowledge_knowledge-test`),before);await assert.rejects(f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M6',ids:[]}),{code:'INVALID_CENTRAL_IMPORT'});await assert.rejects(f.read('prepareCentralImport',f.owner,{campaignId:f.cid,workshop:'M6',fileName:'M6.xlsx',sheets:{}}),{code:'INVALID_CENTRAL_IMPORT'});
 });
 test(`${prefix} : autre campagne et instances de session ne résolvent aucun lien`,async()=>{
  const f=await centralKnowledgeFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.saveKnowledge({campaignId:other.campaignId});await f.saveCharacter({campaignId:other.campaignId,draftRevision:1});await f.store.runTransaction(async tx=>{tx.set(`sessions/${f.sid}/knowledge/knowledge-test`,{id:'knowledge-test',title:'Instance'});tx.set(`sessions/${f.sid}/characters/character`,{id:'character',public:{displayName:'Instance'}});});
  await f.recipe();assert.equal(diag(await f.view('M4'),'knowledge')[0].code,'REFERENCE_MISSING');await f.saveKnowledge({draftRevision:1});assert.equal(diag(await f.view('M6'),'character').filter(x=>x.code==='REFERENCE_MISSING').length,2);
 });
 test(`${prefix} : interruption et reprise sans connaissance ni reçu partiels`,async()=>{
  const base=makeStore();let fail=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})},f=await centralKnowledgeFixture(()=>store),input={requestId:randomUUID()};fail=true;await assert.rejects(f.saveKnowledge(input),/INTERRUPTION/);fail=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/changes`),[]);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.saveKnowledge(input);assert.equal((await f.view('M6')).history.length,1);
 });
 test(`${prefix} : garde de préparation, gel et publication avant tout réessai`,async()=>{
  const f=await centralKnowledgeFixture(makeStore),input={requestId:randomUUID()};await f.saveKnowledge(input);const d=await f.store.get(f.base),c=await f.store.get(`campaigns/${f.cid}`),s=await f.store.get(`sessions/${f.sid}`);await f.store.runTransaction(async tx=>tx.set(f.base,{...d,status:'FROZEN'}));await assert.rejects(f.saveKnowledge(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
  await f.store.runTransaction(async tx=>{tx.set(f.base,d);tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,activeVersionId:'version'}});});await assert.rejects(f.saveKnowledge(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});await f.store.runTransaction(async tx=>{tx.set(`campaigns/${f.cid}`,c);tx.set(`sessions/${f.sid}`,{...s,preparationKind:null});});await assert.rejects(f.saveKnowledge(input),{code:'CENTRAL_PREPARATION_REQUIRED'});
 });
}
