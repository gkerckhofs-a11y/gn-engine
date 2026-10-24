import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {preparationFixture} from './preparations-suite.mjs';
import {admissionTestSettings} from './admissions-suite.mjs';
import {centralStaffPath,centralLimits} from '../../src/core/central-master.mjs';
import {itemInput} from '../../src/core/inventory-state.mjs';

export const centralTestItem={name:'Ingrédient synthétique',description:'Exemple non canonique',category:'Ingrédient',unit:'unité',kind:'STACKABLE',consumable:true,unitVolume:1,legality:'UNSPECIFIED',pillable:false,gmNotes:'Note M1 privée'};
export async function centralFixture(makeStore){
 const f=preparationFixture(makeStore),created=await f.create(),cid=created.campaignId,sid=created.id;
 const view=(workshop='M1',actor=f.owner)=>f.read('centralMaster',actor,{campaignId:cid,workshop});
 const save=(extra={},actor=f.owner)=>f.cmd('saveCentralItem',{campaignId:cid,itemId:'ingredient',draftRevision:0,itemRevision:0,item:centralTestItem,reason:'Préparer un modèle',...extra},actor);
 const grant=(extra={})=>f.cmd('setCentralStaff',{campaignId:cid,email:f.mj.email,active:true,readWorkshops:['M1'],editWorkshops:['M1'],revision:0,reason:'Atelier M1',...extra});
 const configure=(draftRevision=0)=>f.cmd('saveAdmissionSettings',{sessionId:sid,policyRevision:0,draftRevision,settings:admissionTestSettings,reason:'Espèces narratives'});
 return {...f,cid,sid,view,save,grant,configure,base:`campaigns/${cid}/masterDrafts/initial`};
}
export function centralMasterSuite(makeStore,prefix='Master central C1b'){
 test(`${prefix} : lecture sans initialisation, sept ateliers et six domaines`,async()=>{
  const f=await centralFixture(makeStore),d=await f.view();assert.equal(d.draft.revision,0);assert.deepEqual(d.changes,[]);assert.equal(d.workshops.length,7);assert.equal(new Set(d.workshops.map(w=>w.domain)).size,6);
  assert.equal(await f.store.get(f.base),null);assert.equal((await f.store.get(`campaigns/${f.cid}`)).master,undefined);
  const legacy=await f.cmd('createScenario',{title:'Historique intact'});await assert.rejects(f.read('centralMaster',f.owner,{campaignId:legacy.id}),{code:'FORBIDDEN'});
  assert.equal((await f.read('dashboard')).centralCampaigns[0].id,f.cid);
 });
 test(`${prefix} : modèle natif en brouillon, aucun stock, crédit, QR ou version`,async()=>{
  const f=await centralFixture(makeStore),before=await f.store.get(`sessions/${f.sid}`),r=await f.save();assert.equal(r.draftRevision,1);
  const d=await f.view(),change=d.changes[0];assert.deepEqual(change.data,itemInput({...centralTestItem,publicationState:'DRAFT'},'ingredient'));assert.equal(change.source,'WEB');assert.equal(change.operation,'UPSERT');
  assert.equal(d.history.length,1);assert.equal(d.history[0].before,null);assert.equal(d.history[0].actorUid,f.owner.uid);
  const c=await f.store.get(`campaigns/${f.cid}`);assert.deepEqual(c.master,{schemaVersion:1,activeVersionId:null,pointerRevision:0,openDraftId:'initial'});assert.equal(c.scenarioId,null);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);
  for(const kind of ['items','characters','groups','inventory','accounts','ledger','actionPoints','knowledge','ships','fieldTargets'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[],kind);
  assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
 });
 test(`${prefix} : M1 puis inscriptions M2 partagent le même brouillon sans copie`,async()=>{
  const f=await centralFixture(makeStore);await f.save();await f.configure(1);
  const a=await f.view('M1'),b=await f.view('M2');assert.equal(a.draft.revision,2);assert.equal(b.draft.revision,2);assert.equal(a.changes.length,1);assert.equal(b.changes.length,1);
  assert.deepEqual(b.changes[0].data,admissionTestSettings.species);assert.equal('species' in await f.store.get(`sessions/${f.sid}/admission/settings`),false);
  const admin=await f.read('admissionAdmin',f.owner,{sessionId:f.sid});assert.equal(admin.draftRevision,2);assert.deepEqual(admin.settings.species,b.changes[0].data);
  assert.equal(a.history.length,1);assert.doesNotMatch(JSON.stringify(a),/Règles fictives|Notice fictive|species-test/);
 });
 test(`${prefix} : inscriptions M2 puis M1 préservent le catalogue et son historique`,async()=>{
  const f=await centralFixture(makeStore);await f.configure();const species=await f.store.get(`${f.base}/changes/speciesCatalogue_player`),history=await f.store.get(`${f.base}/history/1`);
  await f.save({draftRevision:1});assert.deepEqual(await f.store.get(`${f.base}/changes/speciesCatalogue_player`),species);assert.deepEqual(await f.store.get(`${f.base}/history/1`),history);
  assert.equal((await f.read('admissionAdmin',f.owner,{sessionId:f.sid})).draftRevision,2);
 });
 test(`${prefix} : concurrence M1 et M2, refus du perdant puis reprise explicite`,async()=>{
  const f=await centralFixture(makeStore),r=await Promise.allSettled([f.save(),f.configure()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  if(r[0].status==='rejected')await f.save({draftRevision:1});else await f.configure(1);
  assert.equal((await f.view()).draft.revision,2);assert.equal((await f.store.list(`${f.base}/changes`)).length,2);assert.equal((await f.store.list(`${f.base}/history`)).length,2);
 });
 test(`${prefix} : MJ et Accueil de session sans droit central implicite`,async()=>{
  const f=await centralFixture(makeStore);await f.cmd('setStaff',{sessionId:f.sid,revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Session seulement'});
  await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.save({},f.mj),{code:'FORBIDDEN'});
  await f.cmd('setStaff',{sessionId:f.sid,revision:2,email:f.mj.email,role:'RECEPTION',active:true,reason:'Accueil'});await assert.rejects(f.view('M2',f.mj),{code:'FORBIDDEN'});
  for(const actor of [null,{...f.owner,emailVerified:false},{...f.owner,provider:'password'}])await assert.rejects(f.view('M1',actor),{code:'LOGIN_REQUIRED'});
  await assert.rejects(f.view('M1',{...f.owner,uid:randomUUID()}),{code:'FORBIDDEN'});await assert.rejects(f.view('M1',f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : délégation M1 filtrée et visible au tableau de bord sans accès session`,async()=>{
  const f=await centralFixture(makeStore);await f.configure();await f.grant();await f.save({draftRevision:1},f.mj);
  const d=await f.view('M1',f.mj);assert.equal(d.changes.length,1);assert.deepEqual(d.staff,[]);assert.equal(d.rights.manageStaff,false);assert.equal(d.workshops.find(w=>w.id==='M2').canRead,false);assert.doesNotMatch(JSON.stringify(d),/species-test|Règles fictives/);
  await assert.rejects(f.view('M2',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.read('session',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});
  const dash=await f.read('dashboard',f.mj);assert.deepEqual(dash.sessions,[]);assert.deepEqual(dash.campaigns,[]);assert.deepEqual(dash.scenarios,[]);assert.equal(dash.centralCampaigns[0].id,f.cid);assert.equal((await f.read('identity',f.mj)).organizer,true);
  const other=await f.create({creationId:randomUUID()});await assert.rejects(f.read('centralMaster',f.mj,{campaignId:other.campaignId}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : lecture seule sans édition ni délégation ni pouvoir de publication`,async()=>{
  const f=await centralFixture(makeStore);await f.grant({readWorkshops:['M2','M1'],editWorkshops:[]});await f.configure();assert.equal((await f.view('M2',f.mj)).changes.length,1);
  await assert.rejects(f.save({draftRevision:1},f.mj),{code:'FORBIDDEN'});
  await assert.rejects(f.cmd('setCentralStaff',{campaignId:f.cid,email:f.player.email},f.mj),{code:'FORBIDDEN'});
  await assert.rejects(f.grant({revision:1,publish:true}),{code:'INVALID_CENTRAL_MASTER'});
  await assert.rejects(f.grant({revision:1,editWorkshops:['M3'],readWorkshops:['M3']}),{code:'INVALID_CENTRAL_GRANT'});
 });
 test(`${prefix} : révocation avant lecture et avant réessai du reçu`,async()=>{
  const f=await centralFixture(makeStore);await f.grant();const input={requestId:randomUUID()},r=await f.save(input,f.mj);await f.grant({revision:1,active:false});
  await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.save(input,f.mj),{code:'FORBIDDEN'});assert.equal((await f.read('identity',f.mj)).organizer,false);await assert.rejects(f.read('dashboard',f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:2});assert.deepEqual(await f.save(input,f.mj),r);assert.equal((await f.view()).history.length,1);
 });
 test(`${prefix} : délégations concurrentes, normalisation, motif et audit`,async()=>{
  const f=await centralFixture(makeStore),r=await Promise.allSettled([f.grant({email:f.mj.email.toUpperCase()}),f.grant({editWorkshops:[]})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  const g=await f.store.get(centralStaffPath(f.cid,f.mj.email));assert.equal(g.email,f.mj.email);assert.equal(g.revision,1);
  assert.equal((await f.store.list(`campaigns/${f.cid}/history`)).filter(x=>x.action==='setCentralStaff').length,1);
  await assert.rejects(f.grant({email:f.owner.email}),{code:'INVALID_CENTRAL_GRANT'});await assert.rejects(f.grant({revision:1,reason:''}),{code:'INVALID_CENTRAL_MASTER'});
  await assert.rejects(f.grant({revision:1,readWorkshops:['M1','M1']}),{code:'INVALID_CENTRAL_GRANT'});
 });
 test(`${prefix} : concurrence entre deux modèles, aucune version hybride`,async()=>{
  const f=await centralFixture(makeStore),r=await Promise.allSettled([f.save(),f.save({item:{...centralTestItem,name:'Autre modèle',gmNotes:'Autre note'}})]);
  assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');const d=await f.view();assert.equal(d.history.length,1);
  assert.equal(d.changes[0].data.gmNotes,d.changes[0].data.name==='Autre modèle'?'Autre note':centralTestItem.gmNotes);
 });
 test(`${prefix} : double clic et réponse perdue, un changement et un reçu`,async()=>{
  const f=await centralFixture(makeStore),input={requestId:randomUUID()},r=await Promise.all([f.save(input),f.save(input)]);assert.deepEqual(r[0],r[1]);assert.deepEqual(await f.save(input),r[0]);assert.equal((await f.view()).history.length,1);
  await assert.rejects(f.save({...input,item:{...centralTestItem,name:'Mutation du reçu'}}),{code:'REQUEST_ID_REUSED'});await assert.rejects(f.save(),{code:'STALE_REVISION'});
 });
 test(`${prefix} : interruption avant commit puis reprise sans brouillon partiel`,async()=>{
  const base=makeStore();let fail=false;const guarded={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})};
  const f=await centralFixture(()=>guarded),input={requestId:randomUUID()};fail=true;await assert.rejects(f.save(input),/INTERRUPTION/);fail=false;
  assert.equal(await base.get(f.base),null);assert.equal((await base.get(`campaigns/${f.cid}`)).master,undefined);assert.deepEqual(await base.list(`${f.base}/changes`),[]);
  await f.save(input);assert.equal((await f.view()).history.length,1);
 });
 test(`${prefix} : archive puis restauration par contre-opération auditée`,async()=>{
  const f=await centralFixture(makeStore);await f.save();const archive={campaignId:f.cid,itemId:'ingredient',draftRevision:1,itemRevision:1,reason:'Retirer de la préparation',requestId:randomUUID()};
  const r=await f.cmd('archiveCentralItem',archive);assert.deepEqual(await f.cmd('archiveCentralItem',archive),r);assert.equal((await f.view()).changes[0].operation,'ARCHIVE');
  await f.save({draftRevision:2,itemRevision:2});const d=await f.view();assert.equal(d.changes[0].operation,'UPSERT');assert.equal(d.changes[0].data.revision,3);assert.equal(d.history.length,3);assert.equal(d.history[0].before.operation,'ARCHIVE');assert.equal(d.history.at(-1).before,null);
  await assert.rejects(f.read('publicBadge',null,{sessionId:f.sid,characterId:'ingredient'}),{code:'NOT_FOUND'});
 });
 test(`${prefix} : refus des dotations, effets, médias et champs étrangers`,async()=>{
  const f=await centralFixture(makeStore);
  for(const patch of [{stock:10},{credits:200},{effect:{id:'FOR-01'}},{publicationState:'PUBLISHED'},{mediaImages:{illustration:{id:'x',version:1}}},{laserRecharge:{pelletsPerUnit:2,forged:true}}])await assert.rejects(f.save({item:{...centralTestItem,...patch}}),{code:'INVALID_CENTRAL_MASTER'});
  await assert.rejects(f.save({item:{...centralTestItem,unitVolume:-1}}),{code:'INVALID_ITEM'});await assert.rejects(f.save({itemId:'../foreign'}),{code:'INVALID_ID'});await assert.rejects(f.save({sessionId:f.sid}),{code:'INVALID_CENTRAL_MASTER'});
  assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : refus d’un cycle publié, rebasé ou incohérent avant reçu`,async()=>{
  const f=await centralFixture(makeStore),input={requestId:randomUUID()};await f.save(input);const c=await f.store.get(`campaigns/${f.cid}`),d=await f.store.get(f.base);
  for(const patch of [{activeVersionId:'published'},{pointerRevision:1},{openDraftId:'other'}]){
   await f.store.runTransaction(async tx=>tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,...patch}}));await assert.rejects(f.save(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
  }
  await f.store.runTransaction(async tx=>{tx.set(`campaigns/${f.cid}`,c);tx.set(f.base,{...d,status:'FROZEN'});});await assert.rejects(f.view(),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
  await f.store.runTransaction(async tx=>{tx.set(f.base,d);tx.set(`campaigns/${f.cid}`,{...c,scenarioId:'historical'});});await assert.rejects(f.view(),{code:'CENTRAL_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : bornes du brouillon sans effacement des définitions archivées`,async()=>{
  const f=await centralFixture(makeStore);await f.save();const item=(await f.view()).changes[0];
  await f.store.runTransaction(async tx=>{for(let i=1;i<centralLimits.items;i++)tx.set(`${f.base}/changes/item_limit${i}`,{...item,id:`item_limit${i}`,entityId:`limit${i}`,operation:'ARCHIVE',data:{...item.data,id:`limit${i}`}});});
  await assert.rejects(f.save({draftRevision:1,itemId:'overflow'}),{code:'CENTRAL_LIMIT'});await f.save({draftRevision:1,itemRevision:1});assert.equal((await f.store.list(`${f.base}/changes`)).length,centralLimits.items);
 });
}
