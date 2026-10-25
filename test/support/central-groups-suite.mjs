import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {centralCheckFixture} from './central-check-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {importFixture} from './central-import-suite.mjs';
import {centralCharacterRow} from './central-character-import-suite.mjs';
import {reconciliationFixture} from './admission-m2-reconciliation-suite.mjs';
import {groupInput,groupPermissions,publicAffiliations,groupVisible} from '../../src/core/groups.mjs';
import {centralLimits} from '../../src/core/central-master.mjs';
import {centralCheckLimits} from '../../src/core/central-check.mjs';
export const centralTestGroup={name:'Équipage synthétique',description:'Présentation fictive',briefing:'Briefing privé M2',gmNotes:'Secret de faction M2',visibility:'SECRET',members:[{characterId:'character',role:'Contact',active:true,permissions:{readBriefing:true}}]};
export async function centralGroupsFixture(makeStore){
 const f=await centralCheckFixture(makeStore);
 const group=(extra={},actor=f.owner)=>f.cmd('saveCentralGroup',{campaignId:f.cid,groupId:'group',groupRevision:0,draftRevision:0,group:centralTestGroup,reason:'Préparer une faction',...extra},actor);
 const archive=(extra={},actor=f.owner)=>f.cmd('archiveCentralGroup',{campaignId:f.cid,groupId:'group',groupRevision:1,draftRevision:1,reason:'Exclure la proposition',...extra},actor);
 const character=(extra={})=>f.saveCharacter({character:{...centralTestCharacter,relations:[]},...extra});
 return {...f,group,archive,character};
}
export function centralGroupsSuite(makeStore,prefix='Groupes centraux C2o'){
 test(`${prefix} : définition native privée, audit et aucune instance`,async()=>{
  const f=await centralGroupsFixture(makeStore),before=await f.store.get(`sessions/${f.sid}`);assert.equal(await f.store.get(f.base),null);assert.deepEqual((await f.view('M2')).references.groups,[]);assert.equal(await f.store.get(f.base),null);
  const out=await f.group(),d=await f.view('M2'),g=d.changes[0];assert.equal(out.groupRevision,1);assert.equal(out.draftRevision,1);assert.deepEqual(g.data,{...groupInput({...centralTestGroup,publicationState:'DRAFT'},'group'),masterArchived:false});assert.equal(d.history[0].change.type,'group');assert.equal(d.history[0].reason,'Préparer une faction');assert.equal(d.publicationAvailable,false);assert.equal(groupVisible(g.data,'character'),false);assert.deepEqual(publicAffiliations([g.data],'character'),[]);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const k of ['groups','characters','accounts','inventory','ledger','registrations','updates'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[]);assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
 });
 test(`${prefix} : permissions indépendantes, aucun droit implicite au membre`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group({group:{...centralTestGroup,members:[{characterId:'character',active:true}]}});const g=(await f.view('M2')).changes[0].data,m=g.members[0];assert.equal(m.revealed,false);assert.equal(m.visibleToMembers,false);assert.equal(m.publicAffiliation,false);assert.ok(groupPermissions.every(k=>m.permissions[k]===false));assert.equal(g.roster,undefined);assert.equal(g.walletConfig,undefined);
 });
 test(`${prefix} : références différées, archive et restauration de la fiche cible`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group();let r=await f.check(1);assert.equal(r.edges[0].status,'MISSING');assert.equal(r.diagnostics[0].field,'members.0.characterId');assert.equal(r.diagnostics[0].entityType,'group');await f.character({draftRevision:1});r=await f.check(2);assert.deepEqual(r.diagnostics,[]);assert.equal(r.edges[0].status,'RESOLVED');await f.archiveCharacter({draftRevision:2});r=await f.check(3);assert.equal(r.edges[0].status,'ARCHIVED');assert.equal(r.diagnostics[0].code,'REFERENCE_ARCHIVED');await f.character({draftRevision:3,characterRevision:2});assert.deepEqual((await f.check(4)).diagnostics,[]);
 });
 test(`${prefix} : appartenance inactive conserve une référence vérifiable`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group({group:{...centralTestGroup,members:[{characterId:'missing',active:false}]}});assert.equal((await f.check(1)).diagnostics[0].code,'REFERENCE_MISSING');await f.archive();const r=await f.check(2);assert.deepEqual(r.diagnostics,[]);assert.deepEqual(r.edges,[]);assert.equal(r.diff[0].operation,'EXCLUDED');
 });
 test(`${prefix} : affiliation publique exige groupe public et révélation explicite`,async()=>{
  const f=await centralGroupsFixture(makeStore),m={characterId:'character',active:true,publicAffiliation:true};await assert.rejects(f.group({group:{...centralTestGroup,members:[m]}}),{code:'INVALID_PUBLIC_AFFILIATION'});await assert.rejects(f.group({group:{...centralTestGroup,visibility:'PUBLIC',members:[m]}}),{code:'INVALID_PUBLIC_AFFILIATION'});await f.group({group:{...centralTestGroup,visibility:'PUBLIC',members:[{...m,revealed:true}]}});const g=(await f.view('M2')).changes[0].data;assert.deepEqual(publicAffiliations([g],'character'),[]);assert.ok(groupPermissions.every(k=>!g.members[0].permissions[k]));
 });
 test(`${prefix} : champs injectés, droits inconnus et booléens ambigus refusés`,async()=>{
  const f=await centralGroupsFixture(makeStore);for(const patch of [{publicationState:'PUBLISHED'},{roster:{}},{walletConfig:{}},{ownerUid:'other'},{members:[{characterId:'c',assignedUid:'user'}]},{members:[{characterId:'c',permissions:{admin:true}}]},{members:[{characterId:'c',permissions:{payWallet:'true'}}]},{members:[{characterId:'c',active:1}]},{members:[{characterId:'c',permissions:[]}]}])await assert.rejects(f.group({group:{...centralTestGroup,...patch}}),{code:'INVALID_CENTRAL_GROUP'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : identités et doublons de membres stricts`,async()=>{
  const f=await centralGroupsFixture(makeStore);await assert.rejects(f.group({group:{...centralTestGroup,members:[{characterId:'c'},{characterId:'c'}]}}),{code:'DUPLICATE_MEMBER'});await assert.rejects(f.group({group:{...centralTestGroup,members:[{characterId:'../private'}]}}),{code:'INVALID_ID'});await assert.rejects(f.group({group:{...centralTestGroup,members:Array.from({length:101},(_,i)=>({characterId:`c${i}`}))}}),{code:'INVALID_CENTRAL_GROUP'});
 });
 test(`${prefix} : délégation M2, lecture seule et rôle MJ séparés`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:[]});await f.group();assert.equal((await f.view('M2',f.mj)).changes[0].type,'group');await assert.rejects(f.group({draftRevision:1,groupRevision:1},f.mj),{code:'FORBIDDEN'});await f.grant({revision:1,readWorkshops:['M2'],editWorkshops:['M2']});await f.group({draftRevision:1,groupRevision:1},f.mj);await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await assert.rejects(f.read('session',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});for(const actor of [f.player,null])await assert.rejects(f.group({draftRevision:2,groupRevision:2},actor));
 });
 test(`${prefix} : M2 ne lit ni dossiers privés ni groupes de session`,async()=>{
  const raw=makeStore();let guard=false;const f=await centralGroupsFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:fn=>raw.runTransaction(tx=>fn({...tx,list:async(path,...args)=>{if(guard){assert.doesNotMatch(path,/registrations|\/groups$|admission/);if(path.endsWith('/changes'))assert.deepEqual(args[0],['workshop','M2']);}return tx.list(path,...args);}}))}));await f.configure();await f.group({draftRevision:1});await f.grant({readWorkshops:['M2'],editWorkshops:[]});guard=true;const d=await f.view('M2',f.mj);assert.doesNotMatch(JSON.stringify(d),/admissionPolicy|invitationHash|quotas|Notice fictive/);
 });
 test(`${prefix} : réessai historique, contenu divergent et révocation avant reçu`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});const requestId=randomUUID(),out=await f.group({requestId},f.mj);await f.group({draftRevision:1,groupRevision:1,group:{...centralTestGroup,name:'Retouche'}});assert.deepEqual(await f.group({requestId},f.mj),out);assert.equal((await f.view('M2')).changes[0].data.name,'Retouche');await assert.rejects(f.group({requestId,reason:'Autre motif'},f.mj),{code:'REQUEST_ID_REUSED'});await f.grant({revision:1,active:false});await assert.rejects(f.group({requestId},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : éditions concurrentes sans groupe hybride`,async()=>{
  const f=await centralGroupsFixture(makeStore),r=await Promise.allSettled([f.group(),f.group({group:{...centralTestGroup,name:'Autre',briefing:'Autre texte'}})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');const g=(await f.view('M2')).changes[0].data;assert.equal(g.briefing,g.name==='Autre'?'Autre texte':centralTestGroup.briefing);assert.equal(g.revision,1);
 });
 test(`${prefix} : concurrence M1 ou espèces respecte la révision commune`,async()=>{
  for(const other of ['save','configure']){const f=await centralGroupsFixture(makeStore),r=await Promise.allSettled([f.group(),f[other]()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');if(r[0].status==='rejected')await f.group({draftRevision:1});else await f[other](other==='save'?{draftRevision:1}:1);assert.equal((await f.view('M2')).draft.revision,2);}
 });
 test(`${prefix} : archive et restauration auditées sans mandat actif`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group();await f.archive();let d=await f.view('M2');assert.equal(d.changes[0].operation,'ARCHIVE');assert.equal(d.changes[0].data.masterArchived,true);assert.equal(d.history[0].before.data.briefing,centralTestGroup.briefing);await assert.rejects(f.archive({draftRevision:2,groupRevision:2}),{code:'CENTRAL_GROUP_UNAVAILABLE'});await f.group({draftRevision:2,groupRevision:2});d=await f.view('M2');assert.equal(d.changes[0].operation,'UPSERT');assert.equal(d.changes[0].data.revision,3);assert.equal(d.history.length,3);assert.deepEqual(await f.store.list(`sessions/${f.sid}/groups`),[]);
 });
 test(`${prefix} : groupe et personnage homonymes restent typés`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group({groupId:'character'});await f.character({draftRevision:1});const d=await f.view('M2'),r=await f.check(2);assert.equal(d.changes.length,2);assert.equal(r.totals.invalid,0);assert.equal(r.edges[0].from.type,'group');assert.equal(r.edges[0].to.type,'character');assert.equal(r.edges[0].status,'RESOLVED');assert.equal(r.diff.find(x=>x.type==='group').contentRevision,1);
 });
 test(`${prefix} : limites de groupes et taille sans troncature`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group({group:{...centralTestGroup,members:[]}});const c=(await f.view('M2')).changes[0];await f.store.runTransaction(async tx=>{for(let i=1;i<centralLimits.groups;i++){const id=`g${i}`;tx.set(`${f.base}/changes/group_${id}`,{...c,id:`group_${id}`,entityId:id,operation:'ARCHIVE',data:{...c.data,id,masterArchived:true}});}});await assert.rejects(f.group({groupId:'overflow',draftRevision:1}),{code:'CENTRAL_LIMIT'});await f.group({draftRevision:1,groupRevision:1,group:{...centralTestGroup,members:[]}});assert.equal((await f.check(2)).totals.valid,50);assert.equal(centralCheckLimits.records,1709);
  const members=Array.from({length:100},(_,i)=>({characterId:`c${i}`.padEnd(128,'x'),role:'r'.repeat(150),active:true,revealed:true,visibleToMembers:true,publicAffiliation:false,permissions:Object.fromEntries(groupPermissions.map(k=>[k,true]))}));await assert.rejects(f.group({draftRevision:2,groupRevision:2,group:{...centralTestGroup,briefing:'b'.repeat(20000),gmNotes:'n'.repeat(20000),members}}),{code:'CENTRAL_GROUP_SIZE'});
 });
 test(`${prefix} : provenance corrompue et cible invalide signalées sans secret dans le rapport`,async()=>{
  const f=await centralGroupsFixture(makeStore);await f.group();await f.character({draftRevision:1});await f.inject('character_character',{source:'FORGED'});let r=await f.check(2);assert.equal(r.edges[0].status,'INVALID');assert.equal(r.diagnostics.find(d=>d.entityType==='group').code,'REFERENCE_INVALID');assert.doesNotMatch(JSON.stringify(r),/Briefing privé M2|Secret de faction M2/);await f.inject('group_group',{source:'XLSX',provenance:{schemaVersion:1,batchId:'forged',fileName:'Groupes.xlsx',sheet:'Groupes',row:2}});r=await f.check(2);assert.equal(r.totals.invalid,2);
 });
 test(`${prefix} : instantanés avec groupes et ancienne capture conservés`,async()=>{
  const f=await centralGroupsFixture(makeStore),preview=revision=>f.read('previewCentralSnapshot',f.owner,{campaignId:f.cid,draftRevision:revision}),capture=p=>f.cmd('captureCentralSnapshot',{campaignId:f.cid,draftRevision:p.draftRevision,confirmation:p.confirmation,reason:'Capture synthétique'});const old=await capture(await preview(0));await f.group();const now=await capture(await preview(1));await f.group({draftRevision:1,groupRevision:1,group:{...centralTestGroup,briefing:'Retouché'}});const d=await f.read('centralSnapshot',f.owner,{campaignId:f.cid,snapshotId:now.id});assert.equal(d.changes[0].data.briefing,centralTestGroup.briefing);assert.equal(d.report.diff[0].type,'group');assert.equal((await f.read('centralSnapshot',f.owner,{campaignId:f.cid,snapshotId:old.id})).changes.length,0);
 });
 test(`${prefix} : import personnage homonyme conserve le groupe et recalcule ses liens`,async()=>{
  const f=await importFixture(makeStore);await f.cmd('saveCentralGroup',{campaignId:f.cid,groupId:'person',draftRevision:0,groupRevision:0,group:{...centralTestGroup,members:[{characterId:'person',active:true}]},reason:'Préparer le groupe'});const before=await f.store.get(`${f.base}/changes/group_person`),row={...centralCharacterRow,profil_initial:'SANS',classe_id:'',espece_id:'',initiation_id:'',relations_json:'[]'},input=await f.file('M2',[row]),p=await f.prepare(input);assert.deepEqual(p.errors,[]);assert.deepEqual(p.diagnostics,[]);await f.apply(input,p);assert.deepEqual(await f.store.get(`${f.base}/changes/group_person`),before);assert.equal((await f.exportFile('M2',['person'])).sheets.Personnages[0].nom,row.nom);
  const archived=await f.file('M2',[{id:'person',operation:'ARCHIVER',revision:1}]),a=await f.prepare(archived);assert.equal(a.diagnostics.find(d=>d.entityType==='group').code,'REFERENCE_ARCHIVED');await f.apply(archived,a);assert.deepEqual(await f.store.get(`${f.base}/changes/group_person`),before);assert.equal((await f.view('M2')).diagnostics[0].code,'REFERENCE_ARCHIVED');
 });
 test(`${prefix} : interruption transactionnelle ne laisse ni groupe ni reçu`,async()=>{
  const raw=makeStore();let fail=false;const f=await centralGroupsFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:fn=>raw.runTransaction(async tx=>{const out=await fn(tx);if(fail)throw Error('INTERRUPTION');return out;})})),requestId=randomUUID();fail=true;await assert.rejects(f.group({requestId}),/INTERRUPTION/);fail=false;assert.equal(await f.store.get(f.base),null);assert.deepEqual(await f.store.list(`${f.base}/changes`),[]);await f.group({requestId});assert.equal((await f.view('M2')).history.length,1);
 });
 test(`${prefix} : cycle courant vérifié avant un ancien reçu`,async()=>{
  const f=await centralGroupsFixture(makeStore),requestId=randomUUID();await f.group({requestId});const d=await f.store.get(f.base);await f.store.runTransaction(async tx=>tx.set(f.base,{...d,status:'BUILDING'}));await assert.rejects(f.group({requestId}),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
 test(`${prefix} : contrôle des admissions accepte les groupes sans accorder leurs propositions`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.cc('saveCentralGroup',{groupId:'group',draftRevision:2,groupRevision:0,group:centralTestGroup,reason:'Proposition indépendante'});const d=await f.read('checkAdmissionM2');assert.equal(d.totals.matched,1);assert.equal(d.status,'NO_DETECTED_ERROR');assert.doesNotMatch(JSON.stringify(d),/Briefing privé M2|Secret de faction M2|payWallet|Contact/);assert.deepEqual(await f.store.list(`sessions/${f.sid}/groups`),[]);
 });
 test(`${prefix} : cent fiches et cinquante groupes ne tronquent pas le contrôle privé`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.cc('saveCentralGroup',{groupId:'group',draftRevision:2,groupRevision:0,group:{...centralTestGroup,members:[]},reason:'Proposition indépendante'});const base=f.base,g=await f.store.get(`${base}/changes/group_group`),original=await f.character(),{provenance,...character}=original;
  await f.store.runTransaction(async tx=>{for(let i=1;i<50;i++){const id=`group${i}`;tx.set(`${base}/changes/group_${id}`,{...g,id:`group_${id}`,entityId:id,data:{...g.data,id}});}for(let i=1;i<100;i++){const id=`fiction${i}`;tx.set(`${base}/changes/character_${id}`,{...character,id:`character_${id}`,entityId:id,source:'WEB',data:{...character.data,id}});}});
  const d=await f.read('checkAdmissionM2');assert.equal(d.status,'NO_DETECTED_ERROR');assert.equal(d.totals.matched,1);await f.store.runTransaction(async tx=>tx.set(`${base}/changes/group_overflow`,{...g,id:'group_overflow',entityId:'overflow',data:{...g.data,id:'overflow'}}));await assert.rejects(f.read('checkAdmissionM2'),{code:'ADMISSION_M2_CHECK_LIMIT'});
 });
 test(`${prefix} : véritable capture C2n relue sans recalcul du rapport historique`,async()=>{
  const fixture=JSON.parse(readFileSync(new URL('../fixtures/central-snapshot-c2n.json',import.meta.url),'utf8')),store=makeStore();await store.runTransaction(async tx=>{for(const [path,value] of fixture.entries)tx.set(path,value);});const workflow=createWorkflow({store,ownerEmail:fixture.actor.email,now:()=>2000000}),d=await workflow.dispatch('centralSnapshot',fixture.actor,{campaignId:fixture.campaignId,snapshotId:fixture.snapshotId});assert.equal(d.changes.length,8);assert.equal(d.report.checkedAt,1000000);assert.equal(d.report.fingerprint,d.header.reportFingerprint);assert.equal(d.snapshot.draftRevision,8);assert.equal(d.report.publicationAvailable,false);for(const [path,value] of fixture.entries)assert.deepEqual(await store.get(path),value);
 });
}
