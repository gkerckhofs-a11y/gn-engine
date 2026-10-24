import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralFixture} from './central-master-suite.mjs';
import {centralLimits} from '../../src/core/central-master.mjs';
import {characterInput} from '../../src/core/character-state.mjs';

export const centralTestCharacter={displayName:'Voyageuse synthétique',profession:'Courtière fictive',description:'Présentation de fiction',nature:'HUMANOID',biography:'Biographie fictive',roleplay:'Consigne narrative',playerSecrets:'Secret de fiction',gmNotes:'Note M2 privée',
 objectives:[{id:'goal',title:'Récupérer une information',description:'Objectif fictif',gmNotes:'Objectif réservé',steps:[{id:'step',title:'Rencontrer le contact',description:'Étape fictive'}]}],
 relations:[{id:'contact',title:'Un alias',description:'Relation privée orientée',gmNotes:'Identité à préserver',targetId:'target'}]};
export async function centralCharactersFixture(makeStore){
 const f=await centralFixture(makeStore);
 const saveCharacter=(extra={},actor=f.owner)=>f.cmd('saveCentralCharacter',{campaignId:f.cid,characterId:'character',draftRevision:0,characterRevision:0,character:centralTestCharacter,reason:'Préparer une fiction',...extra},actor);
 const archiveCharacter=(extra={},actor=f.owner)=>f.cmd('archiveCentralCharacter',{campaignId:f.cid,characterId:'character',draftRevision:1,characterRevision:1,reason:'Archiver la définition',...extra},actor);
 return {...f,saveCharacter,archiveCharacter};
}
export function centralCharactersSuite(makeStore,prefix='Personnages centraux C1e'){
 test(`${prefix} : lecture M2 sans initialisation et délégation explicite`,async()=>{
  const f=await centralCharactersFixture(makeStore),d=await f.view('M2');assert.equal(d.draft.revision,0);assert.deepEqual(d.changes,[]);assert.deepEqual(d.references.characters,[]);assert.equal(d.publicationAvailable,false);assert.equal(await f.store.get(f.base),null);
  await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});assert.ok((await f.view('M2',f.mj)).workshops.find(w=>w.id==='M2').canEdit);await assert.rejects(f.grant({revision:1,readWorkshops:['M1'],editWorkshops:['M2']}),{code:'INVALID_CENTRAL_GRANT'});
 });
 test(`${prefix} : définition native privée sans instance, compte ni dotation`,async()=>{
  const f=await centralCharactersFixture(makeStore),before=await f.store.get(`sessions/${f.sid}`),r=await f.saveCharacter();assert.equal(r.characterRevision,1);assert.equal(r.draftRevision,1);
  const d=await f.view('M2'),c=d.changes[0],v=centralTestCharacter;
  const expected={...characterInput({...v,publicationState:'DRAFT',objectives:v.objectives.map(o=>({...o,published:false,steps:o.steps.map(s=>({...s,published:false}))})),relations:v.relations.map(r=>({...r,published:false}))},'character'),masterArchived:false};
  assert.deepEqual(c.data,expected);assert.equal(c.source,'WEB');assert.ok(c.requestId);assert.equal(c.workshop,'M2');assert.equal(c.data.hp,null);assert.equal(c.data.maxHp,null);assert.equal('assignedUid' in c.data,false);assert.equal('publicCode' in c.data,false);assert.equal('revision' in c.data,false);assert.equal(d.history[0].before,null);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const kind of ['characters','registrations','groups','inventory','accounts','ledger','actionPoints','knowledge'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[],kind);
  assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);await assert.rejects(f.read('publicBadge',null,{sessionId:f.sid,characterId:'character'}),{code:'NOT_FOUND'});
 });
 test(`${prefix} : relations différées, nature manquante et résolution dans le même brouillon`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.saveCharacter({character:{...centralTestCharacter,nature:null}});let d=await f.view('M2');assert.deepEqual(d.diagnostics.map(x=>x.code),['NATURE_REQUIRED','REFERENCE_MISSING']);assert.equal(d.diagnostics[1].field,'relations.contact.targetId');assert.equal(d.diagnostics[1].reference,'target');
  await f.saveCharacter({characterId:'target',draftRevision:1,character:{...centralTestCharacter,displayName:'Autre personnage',relations:[]}});d=await f.view('M2');assert.equal(d.diagnostics.some(x=>x.code==='REFERENCE_MISSING'),false);assert.equal(d.changes.find(c=>c.entityId==='target').data.relations.length,0);
  await f.saveCharacter({draftRevision:2,characterRevision:1});d=await f.view('M2');assert.deepEqual(d.diagnostics,[]);assert.equal(d.references.characters.length,2);assert.doesNotMatch(JSON.stringify(d.references),/Biographie fictive|Secret de fiction|Note M2 privée/);
 });
 test(`${prefix} : liens réciproques préparables, cible libre et aucune notification`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.saveCharacter();await f.saveCharacter({characterId:'target',draftRevision:1,character:{...centralTestCharacter,relations:[{...centralTestCharacter.relations[0],targetId:'character'}]}});assert.deepEqual((await f.view('M2')).diagnostics,[]);
  await f.saveCharacter({draftRevision:2,characterRevision:1,character:{...centralTestCharacter,relations:[{...centralTestCharacter.relations[0],targetId:null}]}});const d=await f.view('M2');assert.equal(d.changes.find(c=>c.entityId==='target').data.contentRevision,1);assert.equal(d.changes.find(c=>c.entityId==='character').data.relations[0].targetId,null);assert.deepEqual(await f.store.list(`sessions/${f.sid}/updates`),[]);
 });
 test(`${prefix} : cible d’une autre campagne jamais résolue implicitement`,async()=>{
  const f=await centralCharactersFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.saveCharacter({campaignId:other.campaignId,characterId:'target',character:{...centralTestCharacter,relations:[]}});await f.saveCharacter();const d=await f.view('M2');assert.equal(d.diagnostics[0].code,'REFERENCE_MISSING');assert.equal(d.references.characters.length,1);
 });
 test(`${prefix} : M2 narratif et catalogue des espèces partagent révision et historique séparé`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.configure();const species=await f.store.get(`${f.base}/changes/speciesCatalogue_player`),privateHistory=await f.store.get(`${f.base}/history/1`);await f.saveCharacter({draftRevision:1});
  assert.deepEqual(await f.store.get(`${f.base}/changes/speciesCatalogue_player`),species);assert.deepEqual(await f.store.get(`${f.base}/history/1`),privateHistory);
  await f.store.runTransaction(async tx=>{const event=await tx.get(`${f.base}/history/2`);tx.set(`${f.base}/history/2`,{...event,privateAuditDetail:'Extra confidentiel'});tx.set(`${f.base}/history/annotated-species`,{...privateHistory,id:'annotated-species',revision:0,workshop:'M2'});});
  const d=await f.view('M2');assert.equal(d.draft.revision,2);assert.equal(d.changes.length,2);assert.equal(d.history.length,1);assert.equal(d.history[0].change.type,'character');assert.doesNotMatch(JSON.stringify(d),/admissionPolicy|Notice fictive|Règles fictives|quotas|invitationHash|Extra confidentiel|privateAuditDetail/);
  assert.equal((await f.read('admissionAdmin',f.owner,{sessionId:f.sid})).draftRevision,2);
 });
 test(`${prefix} : concurrence avec les espèces, refus explicite puis reprise`,async()=>{
  const f=await centralCharactersFixture(makeStore),r=await Promise.allSettled([f.saveCharacter(),f.configure()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  if(r[0].status==='rejected')await f.saveCharacter({draftRevision:1});else await f.configure(1);assert.equal((await f.view('M2')).changes.length,2);assert.equal((await f.view('M2')).draft.revision,2);
 });
 test(`${prefix} : concurrence avec M1, aucun écrasement d’atelier`,async()=>{
  const f=await centralCharactersFixture(makeStore),r=await Promise.allSettled([f.saveCharacter(),f.save()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  if(r[0].status==='rejected')await f.saveCharacter({draftRevision:1});else await f.save({draftRevision:1});assert.equal((await f.view('M1')).changes.length,1);assert.equal((await f.view('M2')).changes.length,1);assert.equal((await f.view('M2')).draft.revision,2);
 });
 test(`${prefix} : rôles de session distincts et aucun accès implicite aux candidatures`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});await f.saveCharacter({},f.mj);
  await assert.rejects(f.read('session',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await assert.rejects(f.cmd('saveAdmissionSettings',{sessionId:f.sid,policyRevision:0,draftRevision:1},f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,active:false});await f.cmd('setStaff',{sessionId:f.sid,revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Droit session seulement'});await assert.rejects(f.saveCharacter({draftRevision:1,characterRevision:1},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : lecture seule, authentification et ateliers filtrés sans fuite`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.save();await f.saveCharacter({draftRevision:1});await f.grant({readWorkshops:['M2'],editWorkshops:[]});const d=await f.view('M2',f.mj);assert.equal(d.changes.length,1);assert.deepEqual(d.staff,[]);assert.doesNotMatch(JSON.stringify(d),/Note M1 privée|Ingrédient synthétique/);await assert.rejects(f.saveCharacter({draftRevision:2,characterRevision:1},f.mj),{code:'FORBIDDEN'});await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});
  for(const actor of [null,{...f.owner,emailVerified:false},{...f.owner,provider:'password'}])await assert.rejects(f.saveCharacter({draftRevision:2,characterRevision:1},actor),{code:'LOGIN_REQUIRED'});await assert.rejects(f.saveCharacter({},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : M2 ne consulte pas les admissions ni les instances pour résoudre ses liens`,async()=>{
  const base=makeStore();let guarded=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(tx=>cb({...tx,list:async(path,...args)=>{if(guarded){assert.doesNotMatch(path,/\/registrations|\/admission|\/characters$/);if(path.endsWith('/changes'))assert.deepEqual(args[0],['workshop','M2']);}return tx.list(path,...args);},get:async path=>{if(guarded)assert.doesNotMatch(path,/\/registrations\/|\/admission\/|\/characters\//);return tx.get(path);}}))};
  const f=await centralCharactersFixture(()=>store);await f.configure();await f.saveCharacter({draftRevision:1});await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});guarded=true;const d=await f.view('M2',f.mj);assert.equal(d.diagnostics[0].code,'REFERENCE_MISSING');assert.doesNotMatch(JSON.stringify(d),/admissionPolicy|quotas/);
 });
 test(`${prefix} : réessai stable, reçu révoqué et requestId divergent refusé`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.grant({readWorkshops:['M2'],editWorkshops:['M2']});const input={requestId:randomUUID()},r=await f.saveCharacter(input,f.mj);assert.deepEqual(await f.saveCharacter(input,f.mj),r);await assert.rejects(f.saveCharacter({...input,character:{...centralTestCharacter,displayName:'Autre'}},f.mj),{code:'REQUEST_ID_REUSED'});
  await f.grant({revision:1,active:false});await assert.rejects(f.saveCharacter(input,f.mj),{code:'FORBIDDEN'});await f.grant({revision:2,readWorkshops:['M2'],editWorkshops:['M2']});assert.deepEqual(await f.saveCharacter(input,f.mj),r);assert.equal((await f.view('M2')).history.length,1);
 });
 test(`${prefix} : éditions concurrentes, révisions de contenu et aucune fiche hybride`,async()=>{
  const f=await centralCharactersFixture(makeStore),r=await Promise.allSettled([f.saveCharacter(),f.saveCharacter({character:{...centralTestCharacter,displayName:'Deuxième',gmNotes:'Deuxième note'}})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  const d=await f.view('M2'),c=d.changes[0].data;assert.equal(c.gmNotes,c.public.displayName==='Deuxième'?'Deuxième note':centralTestCharacter.gmNotes);assert.equal(d.history.length,1);await assert.rejects(f.saveCharacter({draftRevision:1,characterRevision:0}),{code:'STALE_REVISION'});
 });
 test(`${prefix} : archive, relation signalée et restauration auditée sans copie`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.saveCharacter();await f.saveCharacter({characterId:'target',draftRevision:1,character:{...centralTestCharacter,relations:[]}});const input={characterId:'target',draftRevision:2,characterRevision:1,requestId:randomUUID()},r=await f.archiveCharacter(input);assert.deepEqual(await f.archiveCharacter(input),r);
  let d=await f.view('M2');assert.equal(d.diagnostics[0].code,'REFERENCE_ARCHIVED');assert.equal(d.references.characters.find(x=>x.id==='target').archived,true);const archived=d.changes.find(x=>x.entityId==='target');assert.equal(archived.data.masterArchived,true);assert.equal(archived.data.contentRevision,2);
  await f.saveCharacter({characterId:'target',draftRevision:3,characterRevision:2,character:{...centralTestCharacter,relations:[]}});d=await f.view('M2');assert.deepEqual(d.diagnostics,[]);assert.equal(d.changes.length,2);assert.equal(d.history[0].before.operation,'ARCHIVE');assert.equal(d.changes.find(x=>x.entityId==='target').data.contentRevision,3);
 });
 test(`${prefix} : conservation des identifiants et étapes lors d’une modification`,async()=>{
  const f=await centralCharactersFixture(makeStore);await f.saveCharacter();const c=(await f.view('M2')).changes[0].data;await f.saveCharacter({draftRevision:1,characterRevision:1,character:{...centralTestCharacter,description:'Description corrigée'}});const next=(await f.view('M2')).changes[0].data;assert.deepEqual(next.objectives,c.objectives);assert.deepEqual(next.relations,c.relations);assert.equal(next.contentRevision,2);assert.equal(next.public.description,'Description corrigée');
 });
 test(`${prefix} : publication, ressources, données civiles et privilèges injectés refusés`,async()=>{
  const f=await centralCharactersFixture(makeStore);for(const patch of [{publicationState:'PUBLISHED'},{public:{publicationState:'PUBLISHED'}},{assignedUid:'player'},{email:'person@example.invalid'},{admission:{}},{speciesCatalogue:[]},{abilityProfile:{}},{startingInventory:[]},{startingCredits:200},{hp:3},{maxHp:3},{mediaImages:{}},{globalLevel:1},{npcForce:{}}])await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,...patch}}),{code:'INVALID_CENTRAL_CHARACTER'});
  await assert.rejects(f.saveCharacter({sessionId:f.sid}),{code:'INVALID_CENTRAL_MASTER'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : contrôles imbriqués, doublons, auto-relation et nature inconnue`,async()=>{
  const f=await centralCharactersFixture(makeStore),o=centralTestCharacter.objectives[0],r=centralTestCharacter.relations[0];
  for(const patch of [{nature:'FORCE'},{objectives:[{...o,published:true}]},{relations:[{...r,published:false}]},{objectives:[{...o,steps:[{...o.steps[0],reward:200}]}]},{relations:[{...r,targetId:'character'}]}])await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,...patch}}),{code:'INVALID_CENTRAL_CHARACTER'});
  for(const patch of [{objectives:[o,o]},{relations:[r,r]},{objectives:[{...o,steps:[o.steps[0],o.steps[0]]}]}])await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,...patch}}),{code:'DUPLICATE_NARRATIVE'});
  for(const patch of [{objectives:Array.from({length:61},(_,i)=>({...o,id:`o${i}`}))},{relations:Array.from({length:61},(_,i)=>({...r,id:`r${i}`}))},{objectives:[{...o,steps:Array.from({length:41},(_,i)=>({...o.steps[0],id:`s${i}`}))}]}])await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,...patch}}),{code:'INVALID_NARRATIVE'});
  await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,relations:[{...r,targetId:'../other'}]}}),{code:'INVALID_ID'});await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,displayName:''}}),{code:'INVALID_TEXT'});await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,objectives:undefined}}),{code:'INVALID_CENTRAL_CHARACTER'});
 });
 test(`${prefix} : bornes de contenu et nombre de définitions, archives comprises`,async()=>{
  const f=await centralCharactersFixture(makeStore);await assert.rejects(f.saveCharacter({character:{...centralTestCharacter,biography:'b'.repeat(20000),playerSecrets:'s'.repeat(20000),gmNotes:'n'.repeat(20000),roleplay:'r'.repeat(10000),objectives:Array.from({length:4},(_,i)=>({id:`o${i}`,title:'Objectif',description:'d'.repeat(10000),gmNotes:'',steps:[]}))}}),{code:'CENTRAL_CHARACTER_SIZE'});
  await f.saveCharacter();const c=(await f.view('M2')).changes[0];await f.store.runTransaction(async tx=>{for(let i=1;i<centralLimits.characters;i++)tx.set(`${f.base}/changes/character_limit${i}`,{...c,id:`character_limit${i}`,entityId:`limit${i}`,operation:'ARCHIVE',data:{...c.data,id:`limit${i}`,masterArchived:true}});});
  await assert.rejects(f.saveCharacter({characterId:'overflow',draftRevision:1}),{code:'CENTRAL_LIMIT'});await f.saveCharacter({draftRevision:1,characterRevision:1});assert.equal((await f.view('M2')).changes.length,100);
 });
 test(`${prefix} : interruption transactionnelle, puis reprise sans fiche ni reçu partiels`,async()=>{
  const base=makeStore();let fail=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})},f=await centralCharactersFixture(()=>store),input={requestId:randomUUID()};fail=true;await assert.rejects(f.saveCharacter(input),/INTERRUPTION/);fail=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/changes`),[]);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.saveCharacter(input);assert.equal((await f.view('M2')).history.length,1);
 });
 test(`${prefix} : cycle publié ou figé refusé avant restitution du reçu`,async()=>{
  const f=await centralCharactersFixture(makeStore),input={requestId:randomUUID()};await f.saveCharacter(input);const c=await f.store.get(`campaigns/${f.cid}`),d=await f.store.get(f.base);await f.store.runTransaction(async tx=>tx.set(f.base,{...d,status:'FROZEN'}));await assert.rejects(f.saveCharacter(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});await f.store.runTransaction(async tx=>{tx.set(f.base,d);tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,activeVersionId:'version'}});});await assert.rejects(f.view('M2'),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
}
